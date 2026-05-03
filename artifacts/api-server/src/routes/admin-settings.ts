import { Router } from "express";
import { db, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { invalidateAiContextCache } from "./ai-chat";

const router = Router();

const AI_SETTING_KEYS = new Set([
  "ai_model",
  "ai_temperature",
  "ai_max_tokens",
  "ai_system_prompt_extras",
]);

router.get("/admin/settings", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettings);
    const obj: Record<string, string> = {};
    for (const row of rows) {
      obj[row.key] = row.value;
    }
    return res.json(obj);
  } catch {
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/admin/settings", authMiddleware, async (req, res) => {
  try {
    const updates: Record<string, string> = req.body;
    let aiSettingsTouched = false;
    for (const [key, value] of Object.entries(updates)) {
      await db.insert(siteSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
      if (AI_SETTING_KEYS.has(key)) aiSettingsTouched = true;
    }
    if (aiSettingsTouched) invalidateAiContextCache();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update settings" });
  }
});

export default router;
