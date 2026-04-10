const CACHE = "dr-travel-v2";
const STATIC = ["/", "/trips", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notification received ─────────────────────────────────────────
self.addEventListener("push", e => {
  let data = { title: "DR Travel", body: "لديك رسالة جديدة", url: "/" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo.jpg",
      badge: "/logo.jpg",
      tag: "dr-travel-push",
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click: open or focus the app ──────────────────────────
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          c.navigate(targetUrl);
          return c.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
