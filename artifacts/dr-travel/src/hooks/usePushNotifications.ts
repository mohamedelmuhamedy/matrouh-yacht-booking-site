// Push subscription management — DR Travel

import { apiFetch } from "../lib/api";

const fallbackVapidPublicKey =
  typeof import.meta.env.VITE_VAPID_PUBLIC_KEY === "string"
    ? import.meta.env.VITE_VAPID_PUBLIC_KEY.trim()
    : "";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const r = await apiFetch("/api/push/vapid-public");
    if (!r.ok) return fallbackVapidPublicKey || null;
    const d = await r.json();
    const publicKey =
      typeof d.publicKey === "string" ? d.publicKey.trim() : "";
    return publicKey || fallbackVapidPublicKey || null;
  } catch {
    return fallbackVapidPublicKey || null;
  }
}

// Ensure the service worker is registered, updated, and active
async function ensureSwActive(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });

    await reg.update().catch(() => {});

    // If a new SW is waiting, tell it to take over
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      await new Promise(r => setTimeout(r, 600));
    }

    // Wait for an active SW
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(r => setTimeout(() => r(null), 5000)),
    ]);

    return ready as ServiceWorkerRegistration | null;
  } catch {
    return null;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err ?? "");
}

function friendlyError(err: unknown): string {
  const msg = errorMessage(err);
  const lower = msg.toLowerCase();

  if (lower.includes("push service error") || lower.includes("registration failed")) {
    return "push_service_error";
  }
  if (lower.includes("permission") || lower.includes("denied")) {
    return "permission_denied";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "network_error";
  }
  if (lower.includes("not supported") || lower.includes("pushmanager")) {
    return "not_supported";
  }
  return "unknown";
}

export async function subscribeToPush(opts?: { ticketToken?: string }): Promise<{ ok: boolean; errorCode?: string; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, errorCode: "not_supported" };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === "denied") return { ok: false, errorCode: "permission_denied" };
    if (perm !== "granted") return { ok: false, errorCode: "permission_dismissed" };

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return { ok: false, errorCode: "server_error" };

    const reg = await ensureSwActive();
    if (!reg) return { ok: false, errorCode: "sw_error" };

    // Try to reuse an existing valid subscription first
    let sub = await reg.pushManager.getSubscription();

    if (sub) {
      const json = sub.toJSON();
      const hasKeys = !!(json.keys?.p256dh && json.keys?.auth);

      if (hasKeys) {
        // Check if this subscription uses our current VAPID key
        let sameKey = false;
        try {
          const akBuf = sub.options?.applicationServerKey;
          if (akBuf) {
            const existingKey = btoa(String.fromCharCode(...new Uint8Array(akBuf)))
              .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
            const wantKey = publicKey.replace(/=/g, "");
            sameKey = existingKey === wantKey;
          }
        } catch {
          // options.applicationServerKey unavailable in this browser —
          // assume it's the same key to avoid breaking valid subscriptions
          sameKey = true;
        }

        if (sameKey) {
          // Valid subscription with correct VAPID key — just resend to server
          await sendSubToServer(sub, opts?.ticketToken);
          await linkStoredTicketsToSubscription(sub.endpoint);
          return { ok: true };
        }
      }

      // Wrong/missing key — unsubscribe and get a fresh one
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }

    // Create a new subscription with our VAPID key
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      return { ok: false, errorCode: friendlyError(err), error: errorMessage(err) };
    }

    await sendSubToServer(sub, opts?.ticketToken);
    await linkStoredTicketsToSubscription(sub.endpoint);
    return { ok: true };
  } catch (err) {
    console.warn("Push subscribe error:", err);
    return { ok: false, errorCode: friendlyError(err), error: errorMessage(err) };
  }
}

async function ensureSubscriptionForChannel(): Promise<{ sub?: PushSubscription; errorCode?: string; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { errorCode: "not_supported" };
  }
  const perm = await Notification.requestPermission();
  if (perm === "denied") return { errorCode: "permission_denied" };
  if (perm !== "granted") return { errorCode: "permission_dismissed" };

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return { errorCode: "server_error" };
  const reg = await ensureSwActive();
  if (!reg) return { errorCode: "sw_error" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      return { errorCode: friendlyError(err), error: errorMessage(err) };
    }
  }
  return { sub };
}

async function postSubscription(path: string, sub: PushSubscription, headers?: Record<string, string>): Promise<void> {
  const json = sub.toJSON();
  const r = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    }),
  });
  if (!r.ok) throw new Error(`server_rejected:${r.status}`);
}

export async function subscribeToPaymentPortalUpdates(token: string): Promise<{ ok: boolean; errorCode?: string; error?: string }> {
  if (!token || token.length < 16) return { ok: false, errorCode: "unknown" };
  try {
    const result = await ensureSubscriptionForChannel();
    if (!result.sub) return { ok: false, errorCode: result.errorCode, error: result.error };
    await postSubscription(`/api/payments/portal/${encodeURIComponent(token)}/subscribe`, result.sub);
    return { ok: true };
  } catch (err) {
    return { ok: false, errorCode: friendlyError(err), error: errorMessage(err) };
  }
}

export async function subscribeToAdminPush(): Promise<{ ok: boolean; errorCode?: string; error?: string }> {
  try {
    const result = await ensureSubscriptionForChannel();
    if (!result.sub) return { ok: false, errorCode: result.errorCode, error: result.error };
    const token = localStorage.getItem("admin_token") || "";
    await postSubscription(
      "/api/admin/push/subscribe-admin",
      result.sub,
      token ? { Authorization: `Bearer ${token}` } : undefined,
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, errorCode: friendlyError(err), error: errorMessage(err) };
  }
}

// After a successful subscribe, link any tickets the user has previously
// opened on this device so that pre-trip reminders can target this
// subscription. Each call uses the ticket token as proof of ownership;
// the server validates the token and derives the booking id.
async function linkStoredTicketsToSubscription(endpoint: string): Promise<void> {
  try {
    const { readStoredTickets } = await import("../lib/myTickets");
    const stored = readStoredTickets();
    if (stored.length === 0) return;
    await Promise.allSettled(
      stored.map((t) =>
        apiFetch("/api/push/link-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, ticketToken: t.token }),
        }),
      ),
    );
  } catch {
    /* best-effort */
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await apiFetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch (err) {
    console.warn("Push unsubscribe error:", err);
  }
}

async function sendSubToServer(sub: PushSubscription, ticketToken?: string): Promise<void> {
  const json = sub.toJSON();
  const r = await apiFetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      ticketToken: typeof ticketToken === "string" && ticketToken.length >= 16 ? ticketToken : undefined,
    }),
  });
  if (!r.ok) throw new Error(`server_rejected:${r.status}`);
}

// Link an existing push subscription to a booking by presenting the ticket
// token (the same secret required to view the ticket). The server validates
// the token and never trusts a raw bookingId from the client.
export async function linkPushSubscriptionToTicket(ticketToken: string): Promise<boolean> {
  if (!ticketToken || ticketToken.length < 16) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    const r = await apiFetch("/api/push/link-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, ticketToken }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
