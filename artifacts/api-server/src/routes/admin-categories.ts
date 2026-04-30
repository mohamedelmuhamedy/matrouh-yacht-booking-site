import { Router } from "express";
import { db, categories } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/categories", async (_req, res) => {
  try {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
    res.json(rows);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/admin/categories", authMiddleware, async (req, res) => {
  try {
    const { slug, nameAr, nameEn, sortOrder } = req.body;
    if (!slug || !nameAr || !nameEn) {
      return res.status(400).json({ error: "slug, nameAr and nameEn are required" });
    }
    const slugClean = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const [row] = await db.insert(categories).values({
      slug: slugClean,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    }).returning();
    return res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Category slug already exists" });
    }
    console.error("POST /admin/categories error:", err);
    return res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/admin/categories/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const { nameAr, nameEn, sortOrder } = req.body;
    if (!nameAr || !nameEn) {
      return res.status(400).json({ error: "nameAr and nameEn are required" });
    }
    const [row] = await db.update(categories)
      .set({ nameAr: nameAr.trim(), nameEn: nameEn.trim(), sortOrder: typeof sortOrder === "number" ? sortOrder : 0 })
      .where(eq(categories.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Category not found" });
    return res.json(row);
  } catch (err) {
    console.error("PUT /admin/categories/:id error:", err);
    return res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/admin/categories/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Category not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /admin/categories/:id error:", err);
    return res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
