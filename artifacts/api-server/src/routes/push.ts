import "../loadEnv";
import { Router, Request, Response } from "express";
import webpush from "web-push";
import { db, pushSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

let configuredVapidPair = "";
let warnedAboutMissingVapid = false;

function getVapidConfig(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim() ?? "";
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim() ?? "";

  if (!publicKey || !privateKey) {
    if (!warnedAboutMissingVapid) {
      console.warn("[push] VAPID keys missing — push will not work");
      warnedAboutMissingVapid = true;
    }
    return null;
  }

  const nextPair = `${publicKey}:${privateKey}`;
  if (configuredVapidPair !== nextPair) {
    webpush.setVapidDetails("mailto:admin@drtravel.eg", publicKey, privateKey);
    configuredVapidPair = nextPair;
    warnedAboutMissingVapid = false;
    console.log("[push] VAPID configured, public key prefix:", publicKey.slice(0, 20));
  }

  return { publicKey, privateKey };
}

// GET /api/push/vapid-public — return public key for frontend subscription
router.get("/push/vapid-public", (_req: Request, res: Response) => {
  return res.json({ publicKey: getVapidConfig()?.publicKey ?? "" });
});

// POST /api/push/subscribe — save or update a push subscription
router.post("/push/subscribe", async (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }

    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ p256dh: keys.p256dh, auth: keys.auth })
        .where(eq(pushSubscriptions.endpoint, endpoint));
    } else {
      await db.insert(pushSubscriptions).values({
        endpoint,
        p256dh: keys.p256dh,
        auth:   keys.auth,
      });
    }

    const total = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions);
    console.log(`[push] subscription saved. total subscribers: ${total.length}`);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[push] subscribe error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
});

// POST /api/push/unsubscribe — remove a subscription
router.post("/push/unsubscribe", async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// GET /api/admin/push/stats — subscriber count (admin only)
router.get("/admin/push/stats", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions);
    return res.json({ count: rows.length, vapidConfigured: !!getVapidConfig() });
  } catch {
    return res.status(500).json({ count: 0, vapidConfigured: false });
  }
});

// POST /api/admin/push/send — broadcast a push notification (admin only)
router.post("/admin/push/send", authMiddleware, async (req: Request, res: Response) => {
  if (!getVapidConfig()) {
    return res.status(503).json({ error: "Push not configured — VAPID keys missing" });
  }

  const { title, body, url } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "title and body required" });
  }

  const payload = JSON.stringify({ title, body, url: url || "/" });

  try {
    const subs = await db.select().from(pushSubscriptions);
    if (subs.length === 0) {
      return res.json({ sent: 0, failed: 0, total: 0, message: "No subscribers" });
    }

    let sent = 0;
    let failed = 0;
    const details: { endpoint: string; status: number | string; ok: boolean }[] = [];
    const toDelete: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        const shortEp = sub.endpoint.slice(-30);
        try {
          const result = await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400, urgency: "normal" }
          );
          console.log(`[push] ✅ sent to ...${shortEp} → status ${result.statusCode}`);
          details.push({ endpoint: shortEp, status: result.statusCode, ok: true });
          sent++;
        } catch (err: any) {
          const code = err.statusCode ?? "network_err";
          console.error(`[push] ❌ failed ...${shortEp} → ${code}: ${err.body || err.message}`);
          details.push({ endpoint: shortEp, status: code, ok: false });
          if (err.statusCode === 410 || err.statusCode === 404) {
            toDelete.push(sub.endpoint);
          }
          failed++;
        }
      })
    );

    for (const endpoint of toDelete) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      console.log(`[push] removed expired subscription ...${endpoint.slice(-30)}`);
    }

    return res.json({ sent, failed, total: subs.length, details });
  } catch (err: any) {
    console.error("[push] send error:", err);
    return res.status(500).json({ error: "Failed to send notifications" });
  }
});

export default router;
