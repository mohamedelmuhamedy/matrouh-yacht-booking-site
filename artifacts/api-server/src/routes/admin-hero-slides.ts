import { Router } from "express";
import { db } from "@workspace/db";
import { heroSlides } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Public: list active slides ordered
router.get("/hero-slides", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.isActive, true))
      .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.id));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch hero slides" });
  }
});

// Admin: list all slides (including inactive)
router.get("/admin/hero-slides", authMiddleware, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(heroSlides)
      .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.id));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch hero slides" });
  }
});

// Admin: create a slide
router.post("/admin/hero-slides", authMiddleware, async (req, res) => {
  try {
    const { url, type = "image", duration = 6, sortOrder = 0 } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    const [row] = await db.insert(heroSlides).values({ url, type, duration, sortOrder, isActive: true }).returning();
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create slide" });
  }
});

// Admin: restore default slides (must be before /:id route)
router.post("/admin/hero-slides/restore-defaults", authMiddleware, async (_req, res) => {
  try {
    await db.delete(heroSlides);
    const [row] = await db.insert(heroSlides).values({
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85",
      type: "image",
      duration: 8,
      sortOrder: 0,
      isActive: true,
    }).returning();
    return res.json({ success: true, slide: row });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to restore defaults" });
  }
});

// Admin: reorder slides (must be before /:id route)
router.put("/admin/hero-slides/reorder", authMiddleware, async (req, res) => {
  try {
    const { order }: { order: { id: number; sortOrder: number }[] } = req.body;
    for (const { id, sortOrder } of order) {
      await db.update(heroSlides).set({ sortOrder }).where(eq(heroSlides.id, id));
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reorder" });
  }
});

// Admin: update a slide (duration, sortOrder, isActive)
router.put("/admin/hero-slides/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { duration, sortOrder, isActive } = req.body;
    const updates: Partial<typeof heroSlides.$inferInsert> = {};
    if (duration !== undefined) updates.duration = duration;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (isActive !== undefined) updates.isActive = isActive;
    const [row] = await db.update(heroSlides).set(updates).where(eq(heroSlides.id, id)).returning();
    return res.json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update slide" });
  }
});

// Admin: delete a slide
router.delete("/admin/hero-slides/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(heroSlides).where(eq(heroSlides.id, id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete slide" });
  }
});

export default router;
