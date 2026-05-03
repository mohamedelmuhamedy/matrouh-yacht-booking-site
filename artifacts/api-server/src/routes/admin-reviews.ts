import { Router } from "express";
import { db, bookingReviews, bookings, testimonials } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

router.get("/admin/reviews", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(bookingReviews).orderBy(desc(bookingReviews.createdAt));
    return res.json(rows);
  } catch (err) {
    console.error("[reviews] list:", err);
    return res.status(500).json({ error: "Failed to list reviews" });
  }
});

router.put("/admin/reviews/:id", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string" && ["pending", "approved", "rejected"].includes(b.status)) patch.status = b.status;
    if (typeof b.adminNotes === "string") patch.adminNotes = b.adminNotes.slice(0, 500);
    const [row] = await db.update(bookingReviews).set(patch).where(eq(bookingReviews.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[reviews] update:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

// Promote approved review to public testimonial
router.post("/admin/reviews/:id/publish", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const [r] = await db.select().from(bookingReviews).where(eq(bookingReviews.id, id));
    if (!r) return res.status(404).json({ error: "Not found" });
    if (r.status !== "approved") return res.status(400).json({ error: "Approve review first" });
    if (r.publishedAsTestimonial) return res.json({ success: true, testimonialId: r.publishedAsTestimonial });

    const name = r.customerName || "ضيف";
    const [t] = await db.insert(testimonials).values({
      name,
      message: r.comment,
      rating: r.rating,
      status: "approved",
    } as any).returning();

    await db.update(bookingReviews).set({ publishedAsTestimonial: t.id, updatedAt: new Date() }).where(eq(bookingReviews.id, id));
    return res.json({ success: true, testimonialId: t.id });
  } catch (err) {
    console.error("[reviews] publish:", err);
    return res.status(500).json({ error: "Failed to publish" });
  }
});

router.delete("/admin/reviews/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(bookingReviews).where(eq(bookingReviews.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Public: lookup booking by token (so user knows what they're reviewing)
router.get("/reviews/by-token/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim().slice(0, 200);
    if (!token) return res.status(400).json({ error: "Token required" });
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });
    const [existing] = await db.select().from(bookingReviews).where(eq(bookingReviews.bookingId, b.id));
    // Mask PII: only return first name initial + first letter, not full name
    const fullName = b.name || "";
    const firstName = fullName.trim().split(/\s+/)[0] || "";
    const maskedName = firstName ? firstName[0] + "***" : "";
    return res.json({
      bookingId: b.id,
      customerName: maskedName,
      packageName: b.packageNameAr || b.packageName,
      date: b.date,
      alreadyReviewed: !!existing,
      review: existing ? { id: existing.id, status: existing.status, rating: existing.rating } : null,
    });
  } catch (err) {
    console.error("[reviews] lookup:", err);
    return res.status(500).json({ error: "Lookup failed" });
  }
});

// Public: submit review using ticket token
router.post("/reviews/submit", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim().slice(0, 200);
    if (!token) return res.status(400).json({ error: "Token required" });
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });

    const existing = await db.select().from(bookingReviews).where(eq(bookingReviews.bookingId, b.id));
    if (existing.length > 0) return res.status(409).json({ error: "تم تقييم هذا الحجز بالفعل" });

    const rating = clampInt(req.body?.rating, 1, 5, 5);
    const comment = String(req.body?.comment ?? "").trim().slice(0, 2000);
    const customerName = String(req.body?.customerName ?? b.name).trim().slice(0, 200);
    const photoUrls = Array.isArray(req.body?.photoUrls)
      ? (req.body.photoUrls as unknown[])
          .filter(u => typeof u === "string")
          .slice(0, 6)
          .map(u => String(u).slice(0, 500))
      : [];

    const [row] = await db.insert(bookingReviews).values({
      bookingId: b.id,
      rating,
      comment,
      customerName,
      photoUrls,
      status: "pending",
    }).returning();

    return res.status(201).json({ success: true, review: row });
  } catch (err) {
    console.error("[reviews] submit:", err);
    return res.status(500).json({ error: "Submit failed" });
  }
});

export default router;
