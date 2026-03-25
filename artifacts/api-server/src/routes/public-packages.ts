import { Router } from "express";
import { db, packages, testimonials, siteSettings } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";

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
    const rows = await db.select().from(testimonials)
      .where(eq(testimonials.isVisible, true))
      .orderBy(asc(testimonials.sortOrder));
    return res.json(rows);
  } catch {
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
