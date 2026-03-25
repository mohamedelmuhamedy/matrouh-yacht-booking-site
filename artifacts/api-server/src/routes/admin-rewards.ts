import { Router } from "express";
import { db } from "@workspace/db";
import { referralCodes, referralRewards, siteSettings, bookings } from "@workspace/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DRT-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    const [existing] = await db.select({ id: referralCodes.id }).from(referralCodes).where(eq(referralCodes.code, code));
    if (!existing) return code;
  }
  return `DRT-${Date.now().toString(36).toUpperCase()}`;
}

/* ── Reward Settings ─────────────────────────────────────── */

router.get("/admin/reward-settings", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettings)
      .where(sql`${siteSettings.key} LIKE 'reward_%'`);
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    return res.json({
      rewards_enabled: settings["reward_enabled"] || "false",
      reward_type: settings["reward_type"] || "fixed",
      reward_value: settings["reward_value"] || "200",
      reward_after_x: settings["reward_after_x"] || "1",
      reward_description_ar: settings["reward_description_ar"] || "",
      reward_description_en: settings["reward_description_en"] || "",
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch reward settings" });
  }
});

router.put("/admin/reward-settings", authMiddleware, async (req, res) => {
  try {
    const { rewards_enabled, reward_type, reward_value, reward_after_x, reward_description_ar, reward_description_en } = req.body;
    const updates = [
      { key: "reward_enabled", value: rewards_enabled || "false" },
      { key: "reward_type", value: reward_type || "fixed" },
      { key: "reward_value", value: String(reward_value || "200") },
      { key: "reward_after_x", value: String(reward_after_x || "1") },
      { key: "reward_description_ar", value: reward_description_ar || "" },
      { key: "reward_description_en", value: reward_description_en || "" },
    ];
    for (const { key, value } of updates) {
      await db.insert(siteSettings).values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to save reward settings" });
  }
});

/* ── Referral Codes ──────────────────────────────────────── */

router.get("/admin/referral-codes", authMiddleware, async (_req, res) => {
  try {
    const codes = await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
    return res.json(codes);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch referral codes" });
  }
});

router.post("/admin/referral-codes", authMiddleware, async (req, res) => {
  try {
    const { nameAr, nameEn, phone, email, notes, code: customCode } = req.body;
    if (!nameAr?.trim()) return res.status(400).json({ error: "الاسم (عربي) مطلوب" });
    const code = customCode?.trim() || await uniqueCode();
    const [existing] = await db.select({ id: referralCodes.id }).from(referralCodes).where(eq(referralCodes.code, code));
    if (existing) return res.status(400).json({ error: `الكود '${code}' مستخدم مسبقاً` });
    const [created] = await db.insert(referralCodes).values({
      code, nameAr: nameAr.trim(), nameEn: nameEn?.trim() || "", phone: phone?.trim() || "",
      email: email?.trim() || "", notes: notes?.trim() || "", isActive: true, usedCount: 0, approvedCount: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create referral code" });
  }
});

router.put("/admin/referral-codes/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { nameAr, nameEn, phone, email, notes, isActive } = req.body;
    const [updated] = await db.update(referralCodes).set({
      nameAr: nameAr?.trim(), nameEn: nameEn?.trim() || "", phone: phone?.trim() || "",
      email: email?.trim() || "", notes: notes?.trim() || "",
      isActive: isActive !== false, updatedAt: new Date(),
    }).where(eq(referralCodes.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update" });
  }
});

router.delete("/admin/referral-codes/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(referralCodes).where(eq(referralCodes.id, id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

/* ── Referral Rewards ────────────────────────────────────── */

router.get("/admin/referral-rewards", authMiddleware, async (_req, res) => {
  try {
    const rewards = await db.select().from(referralRewards).orderBy(desc(referralRewards.createdAt));
    return res.json(rewards);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

router.put("/admin/referral-rewards/:id/approve", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { adminNotes } = req.body;
    const [updated] = await db.update(referralRewards).set({
      status: "approved", adminNotes: adminNotes || "", reviewedAt: new Date(), updatedAt: new Date(),
    }).where(eq(referralRewards.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    await db.update(referralCodes)
      .set({ approvedCount: sql`${referralCodes.approvedCount} + 1`, updatedAt: new Date() })
      .where(eq(referralCodes.code, updated.referralCode));
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to approve" });
  }
});

router.put("/admin/referral-rewards/:id/reject", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { adminNotes } = req.body;
    const [updated] = await db.update(referralRewards).set({
      status: "rejected", adminNotes: adminNotes || "", reviewedAt: new Date(), updatedAt: new Date(),
    }).where(eq(referralRewards.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to reject" });
  }
});

/* ── Public: verify referral code ───────────────────────── */

router.get("/referral/verify", async (req, res) => {
  try {
    const code = (req.query.code as string || "").toUpperCase().trim();
    if (!code) return res.status(400).json({ error: "Code required" });
    const [found] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    if (!found || !found.isActive) return res.status(404).json({ valid: false });
    return res.json({ valid: true, code: found.code, nameAr: found.nameAr, nameEn: found.nameEn, usedCount: found.usedCount, approvedCount: found.approvedCount, isActive: found.isActive });
  } catch (err: any) {
    return res.status(500).json({ error: "Server error" });
  }
});

/* ── Public: register referral code (self-register) ────── */
router.post("/referral/register", async (req, res) => {
  try {
    const { nameAr, nameEn, phone } = req.body;
    if (!nameAr?.trim()) return res.status(400).json({ error: "الاسم مطلوب" });
    const code = await uniqueCode();
    const [created] = await db.insert(referralCodes).values({
      code, nameAr: nameAr.trim(), nameEn: nameEn?.trim() || "", phone: phone?.trim() || "",
      email: "", notes: "تسجيل ذاتي", isActive: true, usedCount: 0, approvedCount: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return res.status(201).json({ code: created.code, nameAr: created.nameAr });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to register" });
  }
});

/* ── Internal: create reward when booking made ──────────── */
export async function createReferralRewardIfNeeded(bookingId: number, referralCode: string, bookingName: string, bookingPackage: string) {
  if (!referralCode) return;
  try {
    const [codeRow] = await db.select().from(referralCodes).where(eq(referralCodes.code, referralCode));
    if (!codeRow || !codeRow.isActive) return;

    const rewardSettings = await db.select().from(siteSettings)
      .where(sql`${siteSettings.key} LIKE 'reward_%'`);
    const settings: Record<string, string> = {};
    for (const r of rewardSettings) settings[r.key] = r.value;

    if (settings["reward_enabled"] !== "true") return;

    await db.insert(referralRewards).values({
      referralCodeId: codeRow.id,
      referralCode: codeRow.code,
      bookingId,
      bookingName,
      bookingPackage,
      rewardType: settings["reward_type"] || "fixed",
      rewardValue: settings["reward_value"] || "200",
      status: "pending",
      adminNotes: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.update(referralCodes)
      .set({ usedCount: sql`${referralCodes.usedCount} + 1`, updatedAt: new Date() })
      .where(eq(referralCodes.id, codeRow.id));
  } catch (err) {
    console.error("Failed to create referral reward:", err);
  }
}

export default router;
