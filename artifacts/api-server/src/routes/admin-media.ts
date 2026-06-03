import { Router } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, mediaAssets } from "@workspace/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { requirePermission } from "../lib/adminPermissions";

const router = Router();

function clean(value: unknown, max = 120): string {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, max);
}

router.get("/admin/media/assets", authMiddleware, requireRole("operator"), requirePermission("media.upload"), async (req, res) => {
  try {
    const provider = clean(req.query.provider);
    const visibility = clean(req.query.visibility);
    const category = clean(req.query.category);
    const status = clean(req.query.status);
    const search = clean(req.query.search, 200);
    const limit = Math.max(1, Math.min(500, Number.parseInt(String(req.query.limit || "100"), 10) || 100));

    const filters = [];
    if (provider) filters.push(eq(mediaAssets.provider, provider));
    if (visibility) filters.push(eq(mediaAssets.visibility, visibility));
    if (category) filters.push(eq(mediaAssets.category, category));
    if (status) filters.push(eq(mediaAssets.status, status));
    if (search) {
      const term = `%${search}%`;
      filters.push(or(
        ilike(mediaAssets.objectKey, term),
        ilike(mediaAssets.objectPath, term),
        ilike(mediaAssets.publicUrl, term),
        ilike(mediaAssets.originalFilename, term),
      ));
    }

    const rows = await db
      .select()
      .from(mediaAssets)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(limit);

    return res.json(rows);
  } catch (error) {
    console.error("[admin.media] list assets:", error);
    return res.status(500).json({ error: "Failed to list media assets" });
  }
});

router.get("/admin/media/config", authMiddleware, requireRole("operator"), requirePermission("media.upload"), async (_req, res) => {
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
  const configuredProvider = (process.env.MEDIA_PUBLIC_PROVIDER || "").trim().toLowerCase();
  const publicProvider = cloudinaryConfigured && configuredProvider !== "supabase_legacy"
    ? "cloudinary"
    : configuredProvider || "cloudinary_required";

  return res.json({
    publicProvider,
    cloudinaryConfigured,
    privateBucket: process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || "private-uploads",
    publicBucket: process.env.SUPABASE_STORAGE_BUCKET || "uploads",
  });
});

export default router;
