// Push subscription management for DR Travel
// Handles: permission request, subscribe/unsubscribe, VAPID key fetch

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

export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — make sure it's saved on server
      await sendSubToServer(existing);
      return true;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await sendSubToServer(sub);
    return true;
  } catch (err) {
    console.warn("Push subscribe error:", err);
    return false;
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
  await fetch(`${API}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    }),
  });
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
