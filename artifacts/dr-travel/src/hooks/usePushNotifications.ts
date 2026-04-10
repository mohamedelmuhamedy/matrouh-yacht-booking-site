// Push subscription management — DR Travel
// Always subscribes fresh with our VAPID key to avoid stale/keyless subscriptions

const API = "/api";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const r = await fetch(`${API}/push/vapid-public`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.publicKey ?? null;
  } catch {
    return null;
  }
}

// Ensure the service worker is fully updated and active before subscribing
async function ensureSwActive(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none", // never use browser cache for sw.js
    });

    // Force update check
    await reg.update().catch(() => {});

    // If there's a waiting SW, skip it so push handler is active now
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      // Give it 500ms to activate
      await new Promise(r => setTimeout(r, 500));
    }

    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Push not supported" };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return { ok: false, error: perm === "denied" ? "Permission denied" : "Permission dismissed" };
    }

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return { ok: false, error: "VAPID key unavailable" };

    const reg = await ensureSwActive();
    if (!reg) return { ok: false, error: "Service worker not available" };

    // CRITICAL: Always unsubscribe and resubscribe with our VAPID key.
    // Reusing old subscriptions (e.g. created before VAPID was configured,
    // or with a different VAPID key) causes silent FCM delivery failures
    // because the push arrives but the SW can't decrypt/handle it.
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const json = existing.toJSON();
      const hasKeys = !!(json.keys?.p256dh && json.keys?.auth);
      if (hasKeys) {
        // Subscription has VAPID keys — check if it matches our current key
        // by comparing the applicationServerKey option
        try {
          const appServerKey = existing.options?.applicationServerKey;
          if (appServerKey) {
            const existingKey = btoa(String.fromCharCode(...new Uint8Array(appServerKey)))
              .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
            const cleanPublicKey = publicKey.replace(/=/g, "");
            if (existingKey === cleanPublicKey) {
              // Same VAPID key — subscription is valid, just resend to server
              await sendSubToServer(existing);
              return { ok: true };
            }
          }
        } catch {
          // options not supported — fall through to unsubscribe
        }
      }
      // Wrong key or no keys — unsubscribe and get fresh
      await existing.unsubscribe().catch(() => {});
    }

    // Create fresh subscription with our current VAPID key
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await sendSubToServer(sub);
    return { ok: true };
  } catch (err: any) {
    console.warn("Push subscribe error:", err);
    return { ok: false, error: err?.message || "Unknown error" };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${API}/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch (err) {
    console.warn("Push unsubscribe error:", err);
  }
}

async function sendSubToServer(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const r = await fetch(`${API}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    }),
  });
  if (!r.ok) throw new Error(`Server rejected subscription: ${r.status}`);
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
