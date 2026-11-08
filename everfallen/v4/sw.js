// Everfallen v4: cache-first for this version's own files; fonts cached on first use.
const CACHE='everfallen-v4';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
// Other versions keep their own caches; nothing is deleted.
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(e.request.method!=='GET')return;
  const font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(u.origin!==location.origin&&!font)return;
  e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;
    try{const r=await fetch(e.request);if(r.ok||r.type==='opaque')c.put(e.request,r.clone());return r}catch(err){return hit||Response.error()}}));
});
