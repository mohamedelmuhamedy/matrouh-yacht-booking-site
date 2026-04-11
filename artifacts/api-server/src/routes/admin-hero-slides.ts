import { Router } from "express";
import { db } from "@workspace/db";
import { heroSlides } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const UPLOAD_DIR = "/home/runner/workspace/data/uploads";

function deleteUploadedFile(url: string) {
  try {
    if (!url || !url.startsWith("/api/uploads/")) return;
    const filename = url.replace("/api/uploads/", "");
    if (!filename || filename.includes("/") || filename.includes("..")) return;
    const filePath = join(UPLOAD_DIR, filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch {}
}

const router = Router();

// Check if an uploaded file actually exists on disk (avoids serving broken 404 references)
function isUploadedFileReachable(url: string): boolean {
  if (!url) return false;
  // External URLs (Unsplash, etc.) are always considered reachable
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  // Local uploads must exist on disk
  if (url.startsWith("/api/uploads/")) {
    const filename = url.replace("/api/uploads/", "");
    if (!filename || filename.includes("/") || filename.includes("..")) return false;
    return existsSync(join(UPLOAD_DIR, filename));
  }
  return true;
}

// Public: list active slides ordered — skip any whose files are missing
router.get("/hero-slides", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.isActive, true))
      .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.id));

    // Filter out slides where the uploaded file no longer exists
    const valid = rows.filter(r => isUploadedFileReachable(r.url));

    // Auto-clean broken records so they don't accumulate
    const broken = rows.filter(r => !isUploadedFileReachable(r.url));
    if (broken.length > 0) {
      console.warn(`[hero-slides] removing ${broken.length} slide(s) with missing files:`, broken.map(r => r.url));
      for (const b of broken) {
        await db.delete(heroSlides).where(eq(heroSlides.id, b.id)).catch(() => {});
      }
    }

    return res.json(valid);
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
    const { url, type = "image", duration = 6, sortOrder = 0, videoStart, videoEnd } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    const [row] = await db.insert(heroSlides).values({
      url, type, duration, sortOrder, isActive: true,
      videoStart: videoStart != null ? Number(videoStart) : null,
      videoEnd: videoEnd != null ? Number(videoEnd) : null,
    }).returning();
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

// Admin: update a slide (duration, sortOrder, isActive, videoStart, videoEnd)
router.put("/admin/hero-slides/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { duration, sortOrder, isActive, videoStart, videoEnd } = req.body;
    const updates: Partial<typeof heroSlides.$inferInsert> = {};
    if (duration !== undefined) updates.duration = duration;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (isActive !== undefined) updates.isActive = isActive;
    if ("videoStart" in req.body) updates.videoStart = videoStart != null ? Number(videoStart) : null;
    if ("videoEnd" in req.body) updates.videoEnd = videoEnd != null ? Number(videoEnd) : null;
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
    const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
    if (slide) deleteUploadedFile(slide.url);
    await db.delete(heroSlides).where(eq(heroSlides.id, id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete slide" });
  }
});

export default router;
