const SHELL = "sae-shell-7";
const MEDIA = "sae-media-7";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      cache.addAll(["/", "/4newgam/__grok/manifest.webmanifest", "/4newgam/__grok/icon-192.png", "/4newgam/__grok/icon-512.png"]).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== MEDIA).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/__vite") ||
    url.search.includes("t=")
  ) {
    return;
  }

  if (req.mode === "navigate" || url.pathname.startsWith("/assets/")) {
    event.respondWith(url.pathname.startsWith("/assets/") ? cacheFirst(SHELL, req) : networkFirst(req));
    return;
  }

  if (/\.(png|jpe?g|webp|gif|svg|mp4|mp3|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(MEDIA, req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const fresh = await fetch(req);
    if (fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(req)) || (await cache.match("/")) || new Response("offline", { status: 503 });
  }
}

async function cacheFirst(name, req) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const fresh = await fetch(req);
  if (fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone());
  return fresh;
}
