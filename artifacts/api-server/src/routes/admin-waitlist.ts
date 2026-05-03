import { Router } from "express";
import { db, waitlist } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

function normalizePhone(raw: string): string { return raw.replace(/[\s\-().]/g, ""); }
function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^0(10|11|12|15)\d{8}$/.test(p) || /^\+?\d{8,15}$/.test(p);
}

router.get("/admin/waitlist", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to list" });
  }
});

router.put("/admin/waitlist/:id", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string" && ["pending", "notified", "converted", "cancelled"].includes(b.status)) {
      patch.status = b.status;
      if (b.status === "notified") patch.notifiedAt = new Date();
    }
    if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 500);
    const [row] = await db.update(waitlist).set(patch).where(eq(waitlist.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/waitlist/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(waitlist).where(eq(waitlist.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Public: join waitlist
router.post("/waitlist", async (req, res) => {
  try {
    const b = req.body ?? {};
    const name = String(b.name ?? "").trim().slice(0, 200);
    const phoneRaw = String(b.phone ?? "").trim().slice(0, 32);
    const date = String(b.date ?? "").trim().slice(0, 64);
    if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
    if (!isValidPhone(phoneRaw)) return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    if (!date) return res.status(400).json({ error: "التاريخ مطلوب" });
    const phone = normalizePhone(phoneRaw);
    const packageId = b.packageId ? Number.parseInt(String(b.packageId), 10) || null : null;
    const packageName = String(b.packageName ?? "").trim().slice(0, 200);
    const groupSize = Math.max(1, Math.min(50, Number.parseInt(String(b.groupSize ?? 1), 10) || 1));
    const notes = String(b.notes ?? "").trim().slice(0, 1000);

    // Dedupe: same phone + package + date already pending
    const dup = await db.select().from(waitlist).where(and(
      eq(waitlist.phone, phone),
      eq(waitlist.date, date),
      eq(waitlist.status, "pending"),
    ));
    if (dup.length > 0) return res.json({ success: true, id: dup[0].id, deduplicated: true });

    const [row] = await db.insert(waitlist).values({
      name, phone, packageId, packageName, date, groupSize, notes, status: "pending",
    }).returning();

    return res.status(201).json({ success: true, id: row.id });
  } catch (err) {
    console.error("[waitlist] submit:", err);
    return res.status(500).json({ error: "فشل التسجيل" });
  }
});

export default router;
