// DR Travel Service Worker — v3
// FIX: skipWaiting + clients.claim called IMMEDIATELY, not inside cache promises
// so push handler is always active even if caching fails

const CACHE = "dr-travel-v3";
const STATIC = ["/", "/trips", "/manifest.json"];

// ── Install: activate immediately, cache opportunistically ────────────
self.addEventListener("install", e => {
  // CRITICAL: call skipWaiting first, unconditionally
  // do NOT put it inside .then() — caches.addAll can fail in proxy envs
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .catch(() => { /* caching failure must not block activation */ })
  );
});

// ── Activate: claim all clients immediately ────────────────────────────
self.addEventListener("activate", e => {
  // CRITICAL: claim first, then clean old caches
  self.clients.claim();
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .catch(() => {})
  );
});

// ── Fetch: network-first with cache fallback ───────────────────────────
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never intercept API calls
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Message handler (e.g. force-update from page) ─────────────────────
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Push notification received ─────────────────────────────────────────
self.addEventListener("push", e => {
  let payload = { title: "DR Travel", body: "لديك رسالة جديدة", url: "/" };
  try {
    if (e.data) {
      const parsed = e.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (_) {
    // If JSON parse fails, use defaults
    try {
      if (e.data) payload.body = e.data.text() || payload.body;
    } catch (_2) {}
  }

  const showPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/logo.jpg",
    badge: "/logo.jpg",
    tag: "dr-travel-push",
    requireInteraction: false,
    data: { url: payload.url },
    vibrate: [200, 100, 200],
  });

  e.waitUntil(showPromise);
});

// ── Notification click: open or focus the app ──────────────────────────
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || "/";

  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(list => {
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          if (c.url.includes(self.location.origin) && "focus" in c) {
            if ("navigate" in c) c.navigate(targetUrl);
            return c.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
