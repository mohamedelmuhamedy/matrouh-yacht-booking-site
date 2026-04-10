import { Router, Request, Response } from "express";
import webpush from "web-push";
import { db, pushSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const VAPID_PUBLIC  = process.env["VAPID_PUBLIC_KEY"]  ?? "";
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"] ?? "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@drtravel.eg", VAPID_PUBLIC, VAPID_PRIVATE);
}

// GET /api/push/vapid-public — return public key for frontend subscription
router.get("/push/vapid-public", (_req: Request, res: Response) => {
  return res.json({ publicKey: VAPID_PUBLIC });
});

// POST /api/push/subscribe — save or update a push subscription
router.post("/push/subscribe", async (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }

    // Upsert: if endpoint exists, update keys; else insert
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

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("push subscribe error:", err);
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
    return res.json({ count: rows.length });
  } catch {
    return res.status(500).json({ count: 0 });
  }
});

// POST /api/admin/push/send — broadcast a push notification (admin only)
router.post("/admin/push/send", authMiddleware, async (req: Request, res: Response) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: "Push not configured" });
  }

  const { title, body, url } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "title and body required" });
  }

  const payload = JSON.stringify({ title, body, url: url || "/" });

  try {
    const subs = await db.select().from(pushSubscriptions);
    let sent = 0;
    let failed = 0;
    const toDelete: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          );
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired — remove it
            toDelete.push(sub.endpoint);
          }
          failed++;
        }
      })
    );

    // Clean up expired subscriptions
    for (const endpoint of toDelete) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    }

    return res.json({ sent, failed, total: subs.length });
  } catch (err: any) {
    console.error("push send error:", err);
    return res.status(500).json({ error: "Failed to send notifications" });
  }
});

export default router;
