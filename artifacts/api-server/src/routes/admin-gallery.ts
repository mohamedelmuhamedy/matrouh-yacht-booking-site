import { Router } from "express";
import { db, galleryAlbums, galleryItems } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── Albums ──────────────────────────────────────────────────────────────────

router.get("/admin/gallery/albums", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(galleryAlbums).orderBy(asc(galleryAlbums.sortOrder));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch albums" });
  }
});

router.get("/admin/gallery/albums/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, id));
    if (!album) return res.status(404).json({ error: "Album not found" });
    const items = await db.select().from(galleryItems).where(eq(galleryItems.albumId, id)).orderBy(asc(galleryItems.sortOrder));
    return res.json({ ...album, items });
  } catch {
    return res.status(500).json({ error: "Failed to fetch album" });
  }
});

router.post("/admin/gallery/albums", authMiddleware, async (req, res) => {
  try {
    const { titleAr, titleEn, slug, descriptionAr, descriptionEn, coverImage, isVisible, sortOrder } = req.body;
    if (!titleAr?.trim()) return res.status(400).json({ error: "Arabic title is required" });
    if (!titleEn?.trim()) return res.status(400).json({ error: "English title is required" });
    if (!slug?.trim()) return res.status(400).json({ error: "Slug is required" });
    if (!/^[a-z0-9-]+$/.test(slug)) return res.status(400).json({ error: "Slug must be lowercase letters, numbers and hyphens only" });
    const [album] = await db.insert(galleryAlbums).values({
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim(),
      slug: slug.trim(),
      descriptionAr: descriptionAr?.trim() || "",
      descriptionEn: descriptionEn?.trim() || "",
      coverImage: coverImage?.trim() || "",
      isVisible: isVisible !== false,
      sortOrder: Number(sortOrder) || 0,
    }).returning();
    return res.status(201).json(album);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    return res.status(500).json({ error: "Failed to create album" });
  }
});

router.put("/admin/gallery/albums/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { titleAr, titleEn, slug, descriptionAr, descriptionEn, coverImage, isVisible, sortOrder } = req.body;
    if (!titleAr?.trim()) return res.status(400).json({ error: "Arabic title is required" });
    if (!titleEn?.trim()) return res.status(400).json({ error: "English title is required" });
    if (!slug?.trim()) return res.status(400).json({ error: "Slug is required" });
    const [updated] = await db.update(galleryAlbums).set({
      titleAr: titleAr.trim(),
      titleEn: titleEn.trim(),
      slug: slug.trim(),
      descriptionAr: descriptionAr?.trim() || "",
      descriptionEn: descriptionEn?.trim() || "",
      coverImage: coverImage?.trim() || "",
      isVisible: isVisible !== false,
      sortOrder: Number(sortOrder) || 0,
      updatedAt: new Date(),
    }).where(eq(galleryAlbums.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Album not found" });
    return res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    return res.status(500).json({ error: "Failed to update album" });
  }
});

router.delete("/admin/gallery/albums/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(galleryItems).where(eq(galleryItems.albumId, id));
    await db.delete(galleryAlbums).where(eq(galleryAlbums.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete album" });
  }
});

// ── Items ────────────────────────────────────────────────────────────────────

router.get("/admin/gallery/albums/:albumId/items", authMiddleware, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId);
    if (isNaN(albumId)) return res.status(400).json({ error: "Invalid album ID" });
    const items = await db.select().from(galleryItems).where(eq(galleryItems.albumId, albumId)).orderBy(asc(galleryItems.sortOrder));
    return res.json(items);
  } catch {
    return res.status(500).json({ error: "Failed to fetch items" });
  }
});

router.post("/admin/gallery/albums/:albumId/items", authMiddleware, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId);
    if (isNaN(albumId)) return res.status(400).json({ error: "Invalid album ID" });
    const { url, type, caption, size, sortOrder } = req.body;
    if (!url?.trim()) return res.status(400).json({ error: "URL is required" });
    const VALID_SIZES = ["normal", "wide", "square", "large"];
    const [item] = await db.insert(galleryItems).values({
      albumId,
      url: url.trim(),
      type: type === "video" ? "video" : "image",
      caption: caption?.trim() || "",
      size: VALID_SIZES.includes(size) ? size : "normal",
      sortOrder: Number(sortOrder) || 0,
    }).returning();
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: "Failed to add item" });
  }
});

router.put("/admin/gallery/items/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { caption, size, sortOrder } = req.body;
    const VALID_SIZES = ["normal", "wide", "square", "large"];
    const [updated] = await db.update(galleryItems).set({
      caption: caption?.trim() || "",
      size: VALID_SIZES.includes(size) ? size : "normal",
      sortOrder: Number(sortOrder) || 0,
    }).where(eq(galleryItems.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/admin/gallery/items/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(galleryItems).where(eq(galleryItems.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
