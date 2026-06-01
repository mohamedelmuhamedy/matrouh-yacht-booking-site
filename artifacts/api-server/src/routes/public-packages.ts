import { Router } from "express";
import { db, packages, testimonials, siteSettings, reviews } from "@workspace/db";
import { eq, asc, desc, and } from "drizzle-orm";

const router = Router();

router.get("/packages", async (_req, res) => {
  try {
    const rows = await db.select().from(packages)
      .where(and(
        eq(packages.status, "published"),
        eq(packages.active, true),
      ))
      .orderBy(asc(packages.sortOrder));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.get("/packages/:slug", async (req, res) => {
  try {
    const [pkg] = await db.select().from(packages)
      .where(eq(packages.slug, req.params.slug));
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    return res.json(pkg);
  } catch {
    return res.status(500).json({ error: "Failed to fetch package" });
  }
});

router.get("/testimonials", async (_req, res) => {
  try {
    const [testimonialRows, reviewRows] = await Promise.all([
      db.select().from(testimonials)
        .where(and(
          eq(testimonials.isVisible, true),
          eq(testimonials.status, "approved"),
        ))
        .orderBy(asc(testimonials.sortOrder)),
      db.select().from(reviews)
        .where(eq(reviews.status, "approved"))
        .orderBy(desc(reviews.createdAt))
        .limit(80),
    ]);
    const mappedReviews = reviewRows.map((row) => ({
      id: row.id,
      nameAr: row.customerName,
      nameEn: row.customerName,
      textAr: row.reviewText,
      textEn: row.reviewText,
      rating: row.rating,
      packageName: "",
      avatar: "",
      imageUrl: row.photos?.[0] || "",
      status: row.status,
      source: "reviews_page",
      isVisible: true,
      sortOrder: 10_000,
      createdAt: row.createdAt,
    }));
    return res.json([...testimonialRows, ...mappedReviews]);
  } catch (err: any) {
    console.error("GET /testimonials failed:", err);
    return res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

export default router;
