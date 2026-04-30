import { Router } from "express";
import { db, bookings } from "@workspace/db";
import { eq, desc, or, ilike } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/bookings/new-count", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.status, "new"));
    return res.json({ count: rows.length, ids: rows.map(r => r.id) });
  } catch {
    return res.status(500).json({ count: 0, ids: [] });
  }
});

router.get("/admin/bookings", authMiddleware, async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = db.select().from(bookings).$dynamic();

    if (status && status !== "all") {
      query = query.where(eq(bookings.status, status as string));
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.where(or(
        ilike(bookings.name, term),
        ilike(bookings.phone, term),
        ilike(bookings.packageName, term),
      ));
    }

    const rows = await query.orderBy(desc(bookings.createdAt));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.put("/admin/bookings/:id/status", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { status } = req.body;
    const validStatuses = ["new", "contacted", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db.update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Booking not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update" });
  }
});

router.put("/admin/bookings/:id/notes", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { adminNotes } = req.body;
    const [updated] = await db.update(bookings)
      .set({ adminNotes: adminNotes || "", updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Booking not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update notes" });
  }
});

router.get("/admin/bookings/export/csv", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const headers = ["ID", "Name", "Phone", "Package", "Date", "Adults", "Children", "Infants", "Currency", "Price", "Status", "Notes", "Admin Notes", "Created At"];
    const csvRows = [
      headers.join(","),
      ...rows.map(b => [
        b.id,
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.phone}"`,
        `"${b.packageName.replace(/"/g, '""')}"`,
        `"${b.date}"`,
        b.adults,
        b.children,
        b.infants,
        b.currency,
        b.priceAtBooking || "",
        b.status,
        `"${(b.notes || "").replace(/"/g, '""')}"`,
        `"${(b.adminNotes || "").replace(/"/g, '""')}"`,
        new Date(b.createdAt).toISOString(),
      ].join(","))
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-${new Date().toISOString().split("T")[0]}.csv"`);
    return res.send("\uFEFF" + csvRows.join("\n"));
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to export bookings" });
  }
});

router.delete("/admin/bookings/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [deleted] = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete" });
  }
});

export default router;
