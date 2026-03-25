import { Router } from "express";
import { db, packages } from "@workspace/db";
import { eq, asc, ne } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const VALID_STATUSES = ["draft", "published", "archived"];

function validatePackage(data: any) {
  const errors: string[] = [];
  if (!data.titleAr?.trim()) errors.push("Arabic title is required");
  if (!data.titleEn?.trim()) errors.push("English title is required");
  if (!data.slug?.trim()) errors.push("Slug is required");
  if (!/^[a-z0-9-]+$/.test(data.slug || "")) errors.push("Slug must contain only lowercase letters, numbers and hyphens");
  if (!data.descriptionAr?.trim()) errors.push("Arabic description is required");
  if (!data.descriptionEn?.trim()) errors.push("English description is required");
  if (data.priceEGP === undefined || data.priceEGP === null) errors.push("Price (EGP) is required");
  if (typeof data.priceEGP === "number" && data.priceEGP < 0) errors.push("Price cannot be negative");
  if (typeof data.rating === "number" && (data.rating < 0 || data.rating > 5)) errors.push("Rating must be between 0 and 5");
  if (typeof data.reviewCount === "number" && data.reviewCount < 0) errors.push("Review count cannot be negative");
  if (data.status && !VALID_STATUSES.includes(data.status)) errors.push(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
  return errors;
}

router.get("/admin/packages", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder));
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch packages" });
  }
});

router.get("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    return res.json(pkg);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch package" });
  }
});

router.post("/admin/packages", authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const errors = validatePackage(data);
    if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

    const [slugConflict] = await db.select({ id: packages.id }).from(packages)
      .where(eq(packages.slug, data.slug));
    if (slugConflict) return res.status(400).json({ error: `Slug '${data.slug}' is already in use` });

    const [created] = await db.insert(packages).values({
      ...data,
      status: data.status || "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create package" });
  }
});

router.put("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const data = req.body;
    const errors = validatePackage(data);
    if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

    const [slugConflict] = await db.select({ id: packages.id }).from(packages)
      .where(eq(packages.slug, data.slug));
    if (slugConflict && slugConflict.id !== id) {
      return res.status(400).json({ error: `Slug '${data.slug}' is already in use by another package` });
    }

    const { id: _id, createdAt: _ca, ...updateData } = data;
    const [updated] = await db.update(packages)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(packages.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Package not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update package" });
  }
});

router.post("/admin/packages/:id/duplicate", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [original] = await db.select().from(packages).where(eq(packages.id, id));
    if (!original) return res.status(404).json({ error: "Package not found" });

    const baseSlug = `${original.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const [conflict] = await db.select({ id: packages.id }).from(packages).where(eq(packages.slug, slug));
      if (!conflict) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = original;
    const [created] = await db.insert(packages).values({
      ...rest,
      slug,
      titleEn: `${original.titleEn} (Copy)`,
      titleAr: `${original.titleAr} (نسخة)`,
      status: "draft",
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to duplicate package" });
  }
});

router.delete("/admin/packages/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { force } = req.query;

    if (force === "true") {
      const [deleted] = await db.delete(packages).where(eq(packages.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Package not found" });
      return res.json({ success: true, action: "deleted" });
    } else {
      const [archived] = await db.update(packages)
        .set({ status: "archived", active: false, updatedAt: new Date() })
        .where(eq(packages.id, id))
        .returning();
      if (!archived) return res.status(404).json({ error: "Package not found" });
      return res.json({ success: true, action: "archived", package: archived });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete package" });
  }
});

export default router;
