const CACHE = 'goober-pages-shell-v4-family';
const BASE = '/goober/';
const PRECACHE = [
  '',
  'app.js',
  'style.css',
  'family.css',
  'family.js',
  'enrichment.js',
  'enrichment.css',
  'manifest.webmanifest',
  'assets/crossing.webp',
  'assets/garden.webp',
  'assets/sanctuary.webp',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/rediscovered/world-hero.webp',
  'assets/rediscovered/peachfall-02.webp',
  'assets/rediscovered/peachfall-06.webp',
  'assets/rediscovered/peachfall-09.webp',
  'hw/hw.css',
  'hw/signal-lab.html',
  'project$/',
  'project$/keep.css',
  'project$/keep.js',
  'project$/keep-core.js',
  'project$/saedow-store.js',
  'gallery/catalog.json',
  'source/anewgam-world-thread.v1.json'
].map(path => BASE + path);
const PRECACHE_PATHS = new Set(PRECACHE.map(url => new URL(url, self.location.origin).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('goober-pages-shell-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE) ||
    url.pathname.startsWith(BASE + 'saedow/') ||
    event.request.cache === 'no-store'
  ) return;

  if (event.request.mode === 'navigate' && url.pathname === BASE) {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          if (response.ok) (await caches.open(CACHE)).put(BASE, response.clone());
          return response;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }

  if (!PRECACHE_PATHS.has(url.pathname)) return;
  // Cache by pathname so version/search parameters still fall back to the installed bytes.
  const cacheKey = url.pathname;
  event.respondWith(
    fetch(event.request)
      .then(async response => {
        if (response.ok) (await caches.open(CACHE)).put(cacheKey, response.clone());
        return response;
      })
      .catch(() => caches.match(cacheKey))
  );
});
