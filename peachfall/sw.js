/* Scope: Peachfall plus exact shared public dependencies. No APIs, POSTs, or private data. */
importScripts('./offline-files.js');
const BASE = new URL('./', self.location.href);
const CACHE_PREFIX = 'saelion-peachfall-';
const CACHE = CACHE_PREFIX + self.__PEACHFALL_OFFLINE__.version;
const URLS = self.__PEACHFALL_OFFLINE__.files.map(path => new URL(path, BASE).href);
const ALLOWED = new Set(URLS);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    // Installation fails atomically from the user's perspective: no 'offline ready' without every file.
    await cache.addAll(URLS);
  } catch (error) { await caches.delete(CACHE); throw error; }
})())); // No skipWaiting: a running dream keeps its current version until closed.
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.hash = '';
  if (url.origin !== BASE.origin || url.search || !ALLOWED.has(url.href)) return;
  event.respondWith((async () => {
    // Version-locked precache prevents mixing new HTML with an older game engine offline.
    const response = await (await caches.open(CACHE)).match(request);
    return response || fetch(request);
  })());
});
