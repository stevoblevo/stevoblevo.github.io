// AND SO, offline. Every page and file under /and-so/ (and the fonts it draws with) comes from the network when there
// is one, and from the last copy kept here when there isn't. Nothing is fetched ahead of time, so being online always
// gets the newest build; the board's calls are POSTs to another site and never pass through here.
const CACHE = 'andso-v1';
const MINE = url => (url.origin === self.location.origin && (url.pathname.startsWith('/and-so/') || url.pathname.startsWith('/versions/')))
  || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('andso-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url); if (!MINE(url)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.status === 200 || res.type === 'opaque') e.waitUntil(cache.put(req, res.clone()).catch(() => {}));
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const home = await cache.match('/and-so/', { ignoreSearch: true }); if (home) return home; }
      throw err;
    }
  })());
});
