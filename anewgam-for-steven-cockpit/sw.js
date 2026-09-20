/* Only this cockpit's allowlisted public shell. Never other worlds or private APIs. */
const CACHE = 'steven-anewgam-v14-interwoven';
const BASE = new URL('./', self.location.href);
const SHELL = ['../shared/worlds.js', '../shared/ways.js', '../shared/ways.css', './chapters/nougat/preview.html', './chapters/nougat/nougat.js', './chapters/nougat/journey.js', '../shared/magwena-postcard.js', './magwena/', './magwena/index.html', './magwena/view.js', './magwena/view.css', './magwena/touch.css', '../shared/ingress.js', './', './index.html', './app.js', './gen2.css', './family.css', './family.js', './advanced.css', './advanced.js', './colour-language.css', './colour-language.v1.json', './sae-expression-states-v1.webp', './click-bloom.svg', './doors.js', './gallery.js', './hires.js', './gen2-art.js', './gen2-dark.webp', './gen2-light.webp', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', ...Array.from({length:10}, (_,i) => './item-'+String(i+1).padStart(2,'0')+'.js')];
const ALLOWED = new Set(SHELL.map(path => new URL(path, BASE).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('steven-anewgam-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url); url.hash = '';
  if (url.origin !== BASE.origin || url.search || !ALLOWED.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {const response = await fetch(event.request, {cache:'no-cache'});if (response.ok && response.type !== 'opaque') await cache.put(event.request, response.clone());return response;}
    catch {return await cache.match(event.request) || (event.request.mode === 'navigate' ? await cache.match(new URL('./index.html', BASE).href) : null) || Response.error();}
  })());
});
