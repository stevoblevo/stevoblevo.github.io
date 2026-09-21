'use strict';
const CACHE='saelion-topiberry-v1';
const ROOT=new URL('./',self.location.href);
const ART=new URL('../../peachfall/source/images/continuity/04_sae_dream_guide_portrait.png',ROOT).href;
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('saelion-topiberry-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==ROOT.origin||(!url.href.startsWith(ROOT.href)&&url.href!==ART&&!/\/icon-(192|512)\.png$/.test(url.pathname)))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch{const saved=await cache.match(event.request);if(saved)return saved;if(event.request.mode==='navigate')return(await cache.match(new URL('./',ROOT).href))||Response.error();return Response.error();}})());});
