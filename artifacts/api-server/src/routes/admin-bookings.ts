import { Router } from "express";
import { db, bookings } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/bookings", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.put("/admin/bookings/:id/status", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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

router.delete("/admin/bookings/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(bookings).where(eq(bookings.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete" });
  }
});

export default router;
