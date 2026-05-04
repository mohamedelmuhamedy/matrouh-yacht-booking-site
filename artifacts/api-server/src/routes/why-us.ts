import { Router } from "express";
import { db, whyUsCards, type WhyUsBullet, type WhyUsStat } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function cleanSlug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeBullets(v: unknown): WhyUsBullet[] {
  if (!Array.isArray(v)) return [];
  const out: WhyUsBullet[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const titleAr = String(o.titleAr ?? "").trim();
    const titleEn = String(o.titleEn ?? "").trim();
    if (!titleAr && !titleEn) continue;
    out.push({
      icon: String(o.icon ?? "✨").slice(0, 8) || "✨",
      titleAr,
      titleEn,
      descAr: String(o.descAr ?? "").trim().slice(0, 600),
      descEn: String(o.descEn ?? "").trim().slice(0, 600),
    });
  }
  return out.slice(0, 12);
}

function normalizeStats(v: unknown): WhyUsStat[] {
  if (!Array.isArray(v)) return [];
  const out: WhyUsStat[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const value = String(o.value ?? "").trim();
    if (!value) continue;
    out.push({
      icon: String(o.icon ?? "✨").slice(0, 8) || "✨",
      value: value.slice(0, 20),
      labelAr: String(o.labelAr ?? "").trim().slice(0, 60),
      labelEn: String(o.labelEn ?? "").trim().slice(0, 60),
    });
  }
  return out.slice(0, 6);
}

function normalizeGallery(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => String(x).trim().slice(0, 2048))
    .slice(0, 12);
}

function buildPayload(b: any) {
  const titleAr = String(b.titleAr || "").trim();
  return {
    icon: String(b.icon || "✨").slice(0, 8) || "✨",
    color: HEX.test(String(b.color || "")) ? String(b.color) : "#00AAFF",
    titleAr,
    titleEn: String(b.titleEn || "").trim(),
    shortDescAr: String(b.shortDescAr || "").trim(),
    shortDescEn: String(b.shortDescEn || "").trim(),
    heroImageUrl: b.heroImageUrl ? String(b.heroImageUrl).trim() : null,
    accentImageUrl: b.accentImageUrl ? String(b.accentImageUrl).trim() : null,
    introAr: String(b.introAr || "").trim(),
    introEn: String(b.introEn || "").trim(),
    bodyAr: String(b.bodyAr || "").trim(),
    bodyEn: String(b.bodyEn || "").trim(),
    bullets: normalizeBullets(b.bullets),
    stats: normalizeStats(b.stats),
    galleryImages: normalizeGallery(b.galleryImages),
    ctaTextAr: String(b.ctaTextAr || "احجز رحلتك الآن").trim(),
    ctaTextEn: String(b.ctaTextEn || "Book Your Trip Now").trim(),
    ctaLink: String(b.ctaLink || "/trips").trim(),
    sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : 0,
    isActive: b.isActive !== false,
  };
}

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
router.get("/why-us", async (_req, res) => {
  try {
    const rows = await db.select().from(whyUsCards).where(eq(whyUsCards.isActive, true)).orderBy(asc(whyUsCards.sortOrder), asc(whyUsCards.id));
    return res.json(rows);
  } catch (err) {
    console.error("GET /why-us error:", err);
    return res.status(500).json({ error: "Failed to fetch why-us cards" });
  }
});

router.get("/why-us/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slug) return res.status(400).json({ error: "Slug required" });
    const [row] = await db.select().from(whyUsCards).where(eq(whyUsCards.slug, slug)).limit(1);
    if (!row || !row.isActive) return res.status(404).json({ error: "Card not found" });
    return res.json(row);
  } catch (err) {
    console.error("GET /why-us/:slug error:", err);
    return res.status(500).json({ error: "Failed to fetch card" });
  }
});

// ─── ADMIN ──────────────────────────────────────────────────────────────────
router.get("/admin/why-us", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(whyUsCards).orderBy(asc(whyUsCards.sortOrder), asc(whyUsCards.id));
    return res.json(rows);
  } catch (err) {
    console.error("GET /admin/why-us error:", err);
    return res.status(500).json({ error: "Failed to fetch cards" });
  }
});

router.get("/admin/why-us/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(whyUsCards).where(eq(whyUsCards.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Card not found" });
    return res.json(row);
  } catch (err) {
    console.error("GET /admin/why-us/:id error:", err);
    return res.status(500).json({ error: "Failed to fetch card" });
  }
});

router.post("/admin/why-us", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const b = req.body || {};
    const slug = cleanSlug(String(b.slug || ""));
    const titleAr = String(b.titleAr || "").trim();
    if (!slug || !titleAr) return res.status(400).json({ error: "slug and titleAr are required" });
    const payload = buildPayload(b);
    const [row] = await db.insert(whyUsCards).values({ slug, ...payload }).returning();
    return res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error("POST /admin/why-us error:", err);
    return res.status(500).json({ error: "Failed to create card" });
  }
});

router.put("/admin/why-us/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body || {};
    if (!String(b.titleAr || "").trim()) return res.status(400).json({ error: "titleAr is required" });
    const payload = buildPayload(b);
    const updateData: Record<string, unknown> = { ...payload, updatedAt: new Date() };
    if (typeof b.slug === "string" && b.slug.trim()) updateData.slug = cleanSlug(b.slug);
    const [row] = await db.update(whyUsCards).set(updateData).where(eq(whyUsCards.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Card not found" });
    return res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    console.error("PUT /admin/why-us/:id error:", err);
    return res.status(500).json({ error: "Failed to update card" });
  }
});

router.delete("/admin/why-us/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.delete(whyUsCards).where(eq(whyUsCards.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Card not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /admin/why-us/:id error:", err);
    return res.status(500).json({ error: "Failed to delete card" });
  }
});

export default router;
