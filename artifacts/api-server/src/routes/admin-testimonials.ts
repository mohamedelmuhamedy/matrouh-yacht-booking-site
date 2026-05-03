import { Router } from "express";
import { db, testimonials } from "@workspace/db";
import { eq, asc, desc, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/testimonials", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(testimonials)
      .orderBy(asc(testimonials.status), asc(testimonials.sortOrder), desc(testimonials.createdAt));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.get("/admin/testimonials/pending-count", authMiddleware, async (_req, res) => {
  try {
    const [row] = await db.select({ count: sql<number>`count(*)::int` })
      .from(testimonials)
      .where(eq(testimonials.status, "pending"));
    return res.json({ count: row?.count ?? 0 });
  } catch {
    return res.status(500).json({ count: 0 });
  }
});

router.post("/admin/testimonials", authMiddleware, async (req, res) => {
  try {
    const body = { ...req.body };
    const payload = {
      nameAr: body.nameAr || "",
      nameEn: body.nameEn || "",
      textAr: body.textAr || "",
      textEn: body.textEn || "",
      rating: Math.max(1, Math.min(5, parseInt(body.rating) || 5)),
      packageName: body.packageName || "",
      avatar: body.avatar || "",
      imageUrl: body.imageUrl || "",
      status: body.status || "approved",
      source: body.source || "admin",
      isVisible: body.isVisible !== false,
      sortOrder: parseInt(body.sortOrder) || 0,
    };
    const [created] = await db.insert(testimonials).values(payload).returning();
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create" });
  }
});

router.put("/admin/testimonials/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };
    delete data.id;
    delete data.createdAt;
    delete data.source;
    const [updated] = await db.update(testimonials).set(data).where(eq(testimonials.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update" });
  }
});

router.post("/admin/testimonials/:id/approve", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(testimonials)
      .set({ status: "approved", isVisible: true })
      .where(eq(testimonials.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to approve" });
  }
});

router.post("/admin/testimonials/:id/reject", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(testimonials)
      .set({ status: "rejected", isVisible: false })
      .where(eq(testimonials.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reject" });
  }
});

router.delete("/admin/testimonials/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete" });
  }
});

export default router;
