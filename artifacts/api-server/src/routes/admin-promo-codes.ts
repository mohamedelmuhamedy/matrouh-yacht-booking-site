import { Router } from "express";
import { db, promoCodes } from "@workspace/db";
import { and, desc, eq, gt, gte, isNull, lte, or, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

function normCode(c: string): string {
  return String(c || "").toUpperCase().replace(/\s+/g, "").slice(0, 32);
}
function parseDate(s: unknown): Date | null {
  if (!s) return null;
  const d = new Date(String(s));
  return isNaN(d.getTime()) ? null : d;
}

router.get("/admin/promo-codes", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    return res.json(rows);
  } catch (err) {
    console.error("[promo-codes] list:", err);
    return res.status(500).json({ error: "Failed to list promo codes" });
  }
});

router.post("/admin/promo-codes", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const b = req.body ?? {};
    const code = normCode(b.code);
    if (!code) return res.status(400).json({ error: "Code is required" });
    const discountType = b.discountType === "fixed" ? "fixed" : "percent";
    const discountValue = Math.max(0, Math.min(100000, Number.parseInt(String(b.discountValue ?? 0), 10) || 0));
    if (discountType === "percent" && discountValue > 100) {
      return res.status(400).json({ error: "Percent discount cannot exceed 100" });
    }
    const [row] = await db.insert(promoCodes).values({
      code,
      discountType,
      discountValue,
      maxUses: Math.max(0, Number.parseInt(String(b.maxUses ?? 0), 10) || 0),
      minBookingValue: Math.max(0, Number.parseInt(String(b.minBookingValue ?? 0), 10) || 0),
      packageId: b.packageId ? Number.parseInt(String(b.packageId), 10) || null : null,
      validFrom: parseDate(b.validFrom),
      validTo: parseDate(b.validTo),
      active: b.active !== false,
      notes: String(b.notes ?? "").slice(0, 500),
    }).returning();
    return res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Code already exists" });
    console.error("[promo-codes] create:", err);
    return res.status(500).json({ error: "Failed to create" });
  }
});

router.put("/admin/promo-codes/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.discountType === "string") patch.discountType = b.discountType === "fixed" ? "fixed" : "percent";
    if (typeof b.discountValue !== "undefined") {
      let dv = Math.max(0, Number.parseInt(String(b.discountValue), 10) || 0);
      const dt = (patch.discountType as string) ?? undefined;
      if (dt === "percent" || (!dt && dv <= 100)) dv = Math.min(100, dv);
      patch.discountValue = dv;
    }
    if (typeof b.maxUses !== "undefined") patch.maxUses = Math.max(0, Number.parseInt(String(b.maxUses), 10) || 0);
    if (typeof b.minBookingValue !== "undefined") patch.minBookingValue = Math.max(0, Number.parseInt(String(b.minBookingValue), 10) || 0);
    if ("packageId" in b) patch.packageId = b.packageId ? Number.parseInt(String(b.packageId), 10) || null : null;
    if ("validFrom" in b) patch.validFrom = parseDate(b.validFrom);
    if ("validTo" in b) patch.validTo = parseDate(b.validTo);
    if (typeof b.active === "boolean") patch.active = b.active;
    if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 500);
    const [row] = await db.update(promoCodes).set(patch).where(eq(promoCodes.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[promo-codes] update:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/promo-codes/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[promo-codes] delete:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Public: validate a code & compute discount
router.post("/promo-codes/validate", async (req, res) => {
  try {
    const code = normCode(req.body?.code);
    const packageId = req.body?.packageId ? Number.parseInt(String(req.body.packageId), 10) || null : null;
    const baseAmount = Math.max(0, Number.parseInt(String(req.body?.baseAmount ?? 0), 10) || 0);
    if (!code) return res.status(400).json({ error: "Code required", valid: false });

    const now = new Date();
    const [pc] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    if (!pc || !pc.active) return res.status(404).json({ valid: false, error: "كود غير صالح" });
    if (pc.validFrom && pc.validFrom > now) return res.json({ valid: false, error: "الكود لم يبدأ بعد" });
    if (pc.validTo && pc.validTo < now) return res.json({ valid: false, error: "الكود منتهي الصلاحية" });
    if (pc.maxUses > 0 && pc.usedCount >= pc.maxUses) return res.json({ valid: false, error: "تم استخدام الكود بالكامل" });
    if (pc.packageId && packageId && pc.packageId !== packageId) return res.json({ valid: false, error: "الكود غير صالح لهذه الباقة" });
    if (pc.minBookingValue > 0 && baseAmount < pc.minBookingValue) {
      return res.json({ valid: false, error: `الحد الأدنى للحجز ${pc.minBookingValue} ج.م` });
    }

    let discount = 0;
    if (pc.discountType === "percent") discount = Math.round((baseAmount * pc.discountValue) / 100);
    else discount = Math.min(baseAmount, pc.discountValue);

    return res.json({
      valid: true,
      code: pc.code,
      discountType: pc.discountType,
      discountValue: pc.discountValue,
      discount,
      finalAmount: Math.max(0, baseAmount - discount),
    });
  } catch (err) {
    console.error("[promo-codes] validate:", err);
    return res.status(500).json({ error: "Validation failed", valid: false });
  }
});

// Used internally by booking flow to atomically increment usage
export async function consumePromoCode(code: string, baseAmount: number, packageId: number | null): Promise<{ discount: number; codeRow: typeof promoCodes.$inferSelect } | null> {
  const c = normCode(code);
  if (!c) return null;
  const now = new Date();
  const [pc] = await db.select().from(promoCodes).where(eq(promoCodes.code, c));
  if (!pc || !pc.active) return null;
  if (pc.validFrom && pc.validFrom > now) return null;
  if (pc.validTo && pc.validTo < now) return null;
  if (pc.maxUses > 0 && pc.usedCount >= pc.maxUses) return null;
  if (pc.packageId && packageId && pc.packageId !== packageId) return null;
  if (pc.minBookingValue > 0 && baseAmount < pc.minBookingValue) return null;

  const discount = pc.discountType === "percent"
    ? Math.round((baseAmount * pc.discountValue) / 100)
    : Math.min(baseAmount, pc.discountValue);

  // Atomic increment with bound check
  const result = await db
    .update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1`, updatedAt: new Date() })
    .where(and(
      eq(promoCodes.id, pc.id),
      pc.maxUses > 0 ? lte(promoCodes.usedCount, pc.maxUses - 1) : gte(promoCodes.id, 0),
    ))
    .returning();
  if (result.length === 0) return null;
  return { discount, codeRow: pc };
}

export default router;
