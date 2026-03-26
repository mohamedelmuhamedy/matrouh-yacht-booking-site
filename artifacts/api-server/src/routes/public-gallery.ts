import { Router } from "express";
import { db, galleryAlbums, galleryItems } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/gallery/albums", async (_req, res) => {
  try {
    const albums = await db.select().from(galleryAlbums)
      .where(eq(galleryAlbums.isVisible, true))
      .orderBy(asc(galleryAlbums.sortOrder));
    const result = await Promise.all(albums.map(async album => {
      const items = await db.select().from(galleryItems)
        .where(eq(galleryItems.albumId, album.id))
        .orderBy(asc(galleryItems.sortOrder));
      return { ...album, itemCount: items.length, previewItems: items.slice(0, 4) };
    }));
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

router.get("/gallery/albums/:slug", async (req, res) => {
  try {
    const [album] = await db.select().from(galleryAlbums)
      .where(eq(galleryAlbums.slug, req.params.slug));
    if (!album || !album.isVisible) return res.status(404).json({ error: "Album not found" });
    const items = await db.select().from(galleryItems)
      .where(eq(galleryItems.albumId, album.id))
      .orderBy(asc(galleryItems.sortOrder));
    return res.json({ ...album, items });
  } catch {
    return res.status(500).json({ error: "Failed to fetch album" });
  }
});

export default router;
