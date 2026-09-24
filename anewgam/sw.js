const CACHE = "porch-fight-3";
const PICTURES = ["./ring.png", "./stare.png", "./well-cry.jpg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PICTURES.map(async (url) => {
          const res = await fetch(url);
          if (res.ok && (res.headers.get("content-type") || "").startsWith("image/")) {
            await cache.put(url, res);
          }
        }),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || /\.(html|js|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(fromNetwork(req));
    return;
  }

  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(fromCache(req));
  }
});

async function fromNetwork(req) {
  try {
    const fresh = await fetch(req);
    if (!fresh.ok) return fresh;
    return fresh;
  } catch {
    const hit = await caches.match(req);
    return hit || new Response("offline", { status: 503, headers: { "content-type": "text/plain" } });
  }
}

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const fresh = await fetch(req);
  const type = fresh.headers.get("content-type") || "";
  if (fresh.ok && type.startsWith("image/")) cache.put(req, fresh.clone());
  return fresh;
}
