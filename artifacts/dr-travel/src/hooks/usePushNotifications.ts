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

function friendlyError(err: unknown): string {
  const msg = (err as any)?.message ?? String(err ?? "");
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

export async function subscribeToPush(): Promise<{ ok: boolean; errorCode?: string; error?: string }> {
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
          await sendSubToServer(sub);
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
      return { ok: false, errorCode: friendlyError(err), error: (err as any)?.message };
    }

    await sendSubToServer(sub);
    return { ok: true };
  } catch (err: any) {
    console.warn("Push subscribe error:", err);
    return { ok: false, errorCode: friendlyError(err), error: err?.message };
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

async function sendSubToServer(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const r = await apiFetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    }),
  });
  if (!r.ok) throw new Error(`server_rejected:${r.status}`);
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
