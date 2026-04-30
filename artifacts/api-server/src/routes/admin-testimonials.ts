import { Router } from "express";
import { db, testimonials } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/testimonials", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.post("/admin/testimonials", authMiddleware, async (req, res) => {
  try {
    const [created] = await db.insert(testimonials).values(req.body).returning();
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
    const [updated] = await db.update(testimonials).set(data).where(eq(testimonials.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update" });
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
