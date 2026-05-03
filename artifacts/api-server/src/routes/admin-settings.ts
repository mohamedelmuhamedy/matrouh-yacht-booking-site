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
    const updates = req.body;
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).json({ error: "Invalid settings payload" });
    }
    const entries = Object.entries(updates as Record<string, unknown>);
    if (entries.length === 0) return res.json({ success: true });
    if (entries.length > 500) {
      return res.status(413).json({ error: "Too many settings in one request" });
    }

    let aiSettingsTouched = false;
    await db.transaction(async (tx) => {
      for (const [key, rawValue] of entries) {
        if (typeof key !== "string" || key.length === 0 || key.length > 128) {
          throw new Error(`Invalid setting key: ${String(key).slice(0, 32)}`);
        }
        const value = rawValue == null ? "" : String(rawValue);
        if (value.length > 200_000) {
          throw new Error(`Setting "${key}" exceeds maximum size`);
        }
        await tx
          .insert(siteSettings)
          .values({ key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value, updatedAt: new Date() },
          });
        if (AI_SETTING_KEYS.has(key)) aiSettingsTouched = true;
      }
    });
    if (aiSettingsTouched) invalidateAiContextCache();
    return res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update settings";
    return res.status(500).json({ error: msg });
  }
});

export default router;
