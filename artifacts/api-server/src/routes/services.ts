import { Router } from "express";
import { db, services } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

function cleanSlug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeFeatures(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(x => typeof x === "string" && x.trim()).map(x => String(x).trim());
  return [];
}

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
router.get("/services", async (_req, res) => {
  try {
    const rows = await db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder), asc(services.id));
    return res.json(rows);
  } catch (err) {
    console.error("GET /services error:", err);
    return res.status(500).json({ error: "Failed to fetch services" });
  }
});

router.get("/services/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slug) return res.status(400).json({ error: "Slug required" });
    const [row] = await db.select().from(services).where(eq(services.slug, slug)).limit(1);
    if (!row || !row.isActive) return res.status(404).json({ error: "Service not found" });
    return res.json(row);
  } catch (err) {
    console.error("GET /services/:slug error:", err);
    return res.status(500).json({ error: "Failed to fetch service" });
  }
});

// ─── ADMIN ──────────────────────────────────────────────────────────────────
router.get("/admin/services", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));
    return res.json(rows);
  } catch (err) {
    console.error("GET /admin/services error:", err);
    return res.status(500).json({ error: "Failed to fetch services" });
  }
});

router.get("/admin/services/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Service not found" });
    return res.json(row);
  } catch (err) {
    console.error("GET /admin/services/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch service" });
  }
});

router.post("/admin/services", authMiddleware, async (req, res) => {
  try {
    const b = req.body || {};
    const slug = cleanSlug(String(b.slug || ""));
    const titleAr = String(b.titleAr || "").trim();
    if (!slug || !titleAr) {
      return res.status(400).json({ error: "slug and titleAr are required" });
    }
    const [row] = await db.insert(services).values({
      slug,
      icon: String(b.icon || "✨"),
      titleAr,
      titleEn: String(b.titleEn || "").trim(),
      descriptionAr: String(b.descriptionAr || "").trim(),
      descriptionEn: String(b.descriptionEn || "").trim(),
      longDescriptionAr: String(b.longDescriptionAr || "").trim(),
      longDescriptionEn: String(b.longDescriptionEn || "").trim(),
      imageUrl: b.imageUrl ? String(b.imageUrl).trim() : null,
      color: String(b.color || "#00AAFF"),
      featuresAr: normalizeFeatures(b.featuresAr),
      featuresEn: normalizeFeatures(b.featuresEn),
      ctaTextAr: String(b.ctaTextAr || "احجز الآن").trim(),
      ctaTextEn: String(b.ctaTextEn || "Book Now").trim(),
      ctaLink: String(b.ctaLink || "/trips").trim(),
      sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : 0,
      isActive: b.isActive !== false,
    }).returning();
    return res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Service slug already exists" });
    console.error("POST /admin/services error:", err);
    return res.status(500).json({ error: "Failed to create service" });
  }
});

router.put("/admin/services/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body || {};
    const titleAr = String(b.titleAr || "").trim();
    if (!titleAr) return res.status(400).json({ error: "titleAr is required" });

    const updateData: Record<string, unknown> = {
      icon: String(b.icon || "✨"),
      titleAr,
      titleEn: String(b.titleEn || "").trim(),
      descriptionAr: String(b.descriptionAr || "").trim(),
      descriptionEn: String(b.descriptionEn || "").trim(),
      longDescriptionAr: String(b.longDescriptionAr || "").trim(),
      longDescriptionEn: String(b.longDescriptionEn || "").trim(),
      imageUrl: b.imageUrl ? String(b.imageUrl).trim() : null,
      color: String(b.color || "#00AAFF"),
      featuresAr: normalizeFeatures(b.featuresAr),
      featuresEn: normalizeFeatures(b.featuresEn),
      ctaTextAr: String(b.ctaTextAr || "احجز الآن").trim(),
      ctaTextEn: String(b.ctaTextEn || "Book Now").trim(),
      ctaLink: String(b.ctaLink || "/trips").trim(),
      sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : 0,
      isActive: b.isActive !== false,
      updatedAt: new Date(),
    };
    if (typeof b.slug === "string" && b.slug.trim()) {
      updateData.slug = cleanSlug(b.slug);
    }

    const [row] = await db.update(services).set(updateData).where(eq(services.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Service not found" });
    return res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Service slug already exists" });
    console.error("PUT /admin/services/:id error:", err);
    return res.status(500).json({ error: "Failed to update service" });
  }
});

router.delete("/admin/services/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.delete(services).where(eq(services.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Service not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /admin/services/:id error:", err);
    return res.status(500).json({ error: "Failed to delete service" });
  }
});

export default router;
