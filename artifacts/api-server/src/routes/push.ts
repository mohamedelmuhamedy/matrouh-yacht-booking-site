import "../loadEnv";
import { Router, Request, Response } from "express";
import webpush from "web-push";
import { db, pushSubscriptions, appSecrets, bookings } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { userHasPermission } from "../lib/adminPermissions";

async function resolveBookingIdFromTicketToken(token: unknown): Promise<number | null> {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (trimmed.length < 16 || trimmed.length > 128) return null;
  const [b] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.ticketToken, trimmed));
  if (!b) return null;
  if (b.status === "cancelled") return null;
  return b.id;
}

const router = Router();

type PushPayload = { title: string; body: string; url?: string };

function pushPayload(input: PushPayload): string {
  return JSON.stringify({ title: input.title, body: input.body, url: input.url || "/" });
}

async function sendToSubscriptions(
  subs: typeof pushSubscriptions.$inferSelect[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; total: number }> {
  if (subs.length === 0) return { sent: 0, failed: 0, total: 0 };
  if (!(await getVapidConfig())) return { sent: 0, failed: subs.length, total: subs.length };

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];
  const body = pushPayload(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 86400, urgency: "high" },
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 410 || err?.statusCode === 404) expired.push(sub.endpoint);
      }
    }),
  );

  for (const endpoint of expired) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  return { sent, failed, total: subs.length };
}

export async function sendPushToAdmins(payload: PushPayload): Promise<{ sent: number; failed: number; total: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.audience, "admin"));
  const allowed: typeof pushSubscriptions.$inferSelect[] = [];
  for (const sub of subs) {
    if (!sub.adminUserId) continue;
    if (await userHasPermission(sub.adminUserId, "payment_gateway.view")) allowed.push(sub);
  }
  return sendToSubscriptions(allowed, payload);
}

export async function sendPushToBooking(
  bookingId: number,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; total: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.audience, "customer"), eq(pushSubscriptions.bookingId, bookingId)));
  return sendToSubscriptions(subs, payload);
}

let configuredVapidPair = "";
let warnedAboutMissingVapid = false;
let warnedAboutSecretStoreRead = false;
let warnedAboutInvalidEnvVapid = false;
let warnedAboutInvalidStoredVapid = false;

async function getStoredSecret(key: string): Promise<string> {
  try {
    const [row] = await db
      .select({ value: appSecrets.value })
      .from(appSecrets)
      .where(eq(appSecrets.key, key))
      .limit(1);

    return row?.value?.trim() ?? "";
  } catch (error) {
    if (!warnedAboutSecretStoreRead) {
      warnedAboutSecretStoreRead = true;
      console.warn("[push] secret store lookup failed; falling back to env only");
      console.warn(error);
    }
    return "";
  }
}

function tryConfigureVapid(
  publicKey: string,
  privateKey: string,
  source: "env" | "secret_store",
): boolean {
  const nextPair = `${publicKey}:${privateKey}`;
  if (configuredVapidPair === nextPair) return true;

  try {
    webpush.setVapidDetails("mailto:admin@drtravel.eg", publicKey, privateKey);
    configuredVapidPair = nextPair;
    warnedAboutMissingVapid = false;
    if (source === "env") warnedAboutInvalidEnvVapid = false;
    if (source === "secret_store") warnedAboutInvalidStoredVapid = false;
    console.log("[push] VAPID configured, public key prefix:", publicKey.slice(0, 20));
    return true;
  } catch (error) {
    const alreadyWarned =
      source === "env" ? warnedAboutInvalidEnvVapid : warnedAboutInvalidStoredVapid;

    if (!alreadyWarned) {
      console.warn(`[push] invalid VAPID keys from ${source}; ignoring this source`);
      console.warn(error);
      if (source === "env") warnedAboutInvalidEnvVapid = true;
      if (source === "secret_store") warnedAboutInvalidStoredVapid = true;
    }

    return false;
  }
}

export async function getVapidConfig(): Promise<{ publicKey: string; privateKey: string } | null> {
  const envPublicKey = process.env["VAPID_PUBLIC_KEY"]?.trim() ?? "";
  const envPrivateKey = process.env["VAPID_PRIVATE_KEY"]?.trim() ?? "";
  if (
    envPublicKey &&
    envPrivateKey &&
    tryConfigureVapid(envPublicKey, envPrivateKey, "env")
  ) {
    return { publicKey: envPublicKey, privateKey: envPrivateKey };
  }

  const storedPublicKey = await getStoredSecret("vapid_public_key");
  const storedPrivateKey = await getStoredSecret("vapid_private_key");
  if (
    storedPublicKey &&
    storedPrivateKey &&
    tryConfigureVapid(storedPublicKey, storedPrivateKey, "secret_store")
  ) {
    return { publicKey: storedPublicKey, privateKey: storedPrivateKey };
  }

  if (!envPublicKey && !envPrivateKey && !storedPublicKey && !storedPrivateKey) {
    if (!warnedAboutMissingVapid) {
      console.warn("[push] VAPID keys missing — push will not work");
      warnedAboutMissingVapid = true;
    }
  }
  return null;
}

// GET /api/push/vapid-public — return public key for frontend subscription
router.get("/push/vapid-public", async (_req: Request, res: Response) => {
  return res.json({ publicKey: (await getVapidConfig())?.publicKey ?? "" });
});

// POST /api/push/subscribe — save or update a push subscription.
// Optional `ticketToken` proves ownership of a specific booking; the server
// derives the bookingId. We never trust a bookingId sent directly by the
// client (would let anyone subscribe to another customer's reminders).
router.post("/push/subscribe", async (req: Request, res: Response) => {
  try {
    const { endpoint, keys, ticketToken } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }

    const linkedBookingId = await resolveBookingIdFromTicketToken(ticketToken);

    // Atomic upsert keyed on the unique endpoint — eliminates the race
    // between the SELECT and the INSERT/UPDATE that previously could create
    // duplicate rows or 23505 errors under concurrent requests.
    const updateSet: { p256dh: string; auth: string; bookingId?: number } = {
      p256dh: keys.p256dh,
      auth: keys.auth,
    };
    if (linkedBookingId !== null) updateSet.bookingId = linkedBookingId;

    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        bookingId: linkedBookingId ?? undefined,
        audience: "customer",
        adminUserId: null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { ...updateSet, audience: "customer", adminUserId: null },
      });

    return res.json({ ok: true, linked: linkedBookingId !== null });
  } catch (err) {
    console.error("[push] subscribe error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/admin/push/subscribe-admin", authMiddleware, async (req: Request, res: Response) => {
  try {
    const admin = (req as unknown as { admin?: { userId?: number } }).admin;
    if (!admin?.userId || !(await userHasPermission(admin.userId, "payment_gateway.view"))) {
      return res.status(403).json({ error: "Insufficient permissions", requiredPermission: "payment_gateway.view" });
    }
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Missing subscription fields" });
    }
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        bookingId: null,
        audience: "admin",
        adminUserId: admin.userId,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          bookingId: null,
          audience: "admin",
          adminUserId: admin.userId,
        },
      });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[push] admin subscribe error:", err);
    return res.status(500).json({ error: "Failed to save admin subscription" });
  }
});

// POST /api/push/link-booking — link an existing subscription to a booking
// by presenting the ticket token (the same secret used to view the ticket).
router.post("/push/link-booking", async (req: Request, res: Response) => {
  try {
    const { endpoint, ticketToken } = req.body ?? {};
    if (!endpoint || typeof ticketToken !== "string") {
      return res.status(400).json({ error: "endpoint and ticketToken required" });
    }
    const bookingId = await resolveBookingIdFromTicketToken(ticketToken);
    if (bookingId === null) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const result = await db
      .update(pushSubscriptions)
      .set({ bookingId })
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning({ id: pushSubscriptions.id });
    if (result.length === 0) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("[push] link-booking error:", err);
    return res.status(500).json({ error: "Failed to link booking" });
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

// POST /api/admin/push/trigger-reminders — manually run reminder sweep (admin only)
router.post("/admin/push/trigger-reminders", authMiddleware, requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const { runReminderSweep } = await import("../lib/tripReminders");
    const result = await runReminderSweep(getVapidConfig);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[push] trigger-reminders error:", err);
    return res.status(500).json({ error: "Failed to run reminder sweep" });
  }
});

// GET /api/admin/push/stats — subscriber count (admin only)
router.get("/admin/push/stats", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions);
    return res.json({ count: rows.length, vapidConfigured: !!(await getVapidConfig()) });
  } catch {
    return res.status(500).json({ count: 0, vapidConfigured: false });
  }
});

// POST /api/admin/push/send — broadcast a push notification (admin only)
router.post("/admin/push/send", authMiddleware, requireRole("admin"), async (req: Request, res: Response) => {
  if (!(await getVapidConfig())) {
    return res.status(503).json({ error: "Push not configured — VAPID keys missing" });
  }

  const { title, body, url } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "title and body required" });
  }

    const payload = JSON.stringify({ title, body, url: url || "/" });

  try {
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.audience, "customer"));
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
