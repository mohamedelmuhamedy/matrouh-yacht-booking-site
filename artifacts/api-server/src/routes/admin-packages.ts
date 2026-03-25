import { Router } from "express";
import { db, packages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/packages", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.get("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    return res.json(pkg);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch package" });
  }
});

router.post("/admin/packages", authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const [created] = await db.insert(packages).values(data).returning();
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create package" });
  }
});

router.put("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = { ...req.body, updatedAt: new Date() };
    delete data.id;
    delete data.createdAt;
    const [updated] = await db.update(packages).set(data).where(eq(packages.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Package not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update package" });
  }
});

router.delete("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(packages).where(eq(packages.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Package not found" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete package" });
  }
});

export default router;
