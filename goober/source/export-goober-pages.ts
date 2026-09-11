/** Export the existing Goober app into /goober/ without changing its game/log behavior. */
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
const ROOT=resolve(import.meta.dir,'..'),OUT='/home/user/goober-public-staging/goober',BASE='/goober/';
await mkdir(OUT,{recursive:true});
await cp(ROOT+'/public',OUT,{recursive:true});
const moved=(s:string)=>s.replace(/(["'])\/(assets\/|receipts\/|saedow\/|sw\.js|manifest\.webmanifest|relay\.json|#setup)/g,(_,q,path)=>q+BASE+path).replaceAll('href="/"','href="/goober/"');
function plugin(generic=false){return {name:'goober-static-mount',setup(build:any){build.onLoad({filter:/\.(tsx?|json)$/},async(args:any)=>{
 if(!args.path.startsWith(ROOT+'/src/'))return;
 let content=await readFile(args.path,'utf8');
 if(args.path.endsWith('/routes/index.tsx')){
  content=content.replace("import { createFileRoute } from '@tanstack/react-router';\n",'').replace("export const Route=createFileRoute('/')({component:Home});\n",'').replace('function Home(){','export function Home(){');
  content=content.replace('<a href="/receipts/README.md">Build notes & known limits ↗</a>','<a href="/receipts/README.md">Build notes & known limits ↗</a><a href="/receipts/public-delivery.json">Public-link delivery receipt ↗</a>');
 }
 if(generic&&args.path.endsWith('/lib/saedow.ts'))content=content.replace("const DB = 'anewgam-goober-v1';","const DB = 'anewgam-fieldlog-v1';");
 if(args.path.endsWith('/lib/art.json')){
  const images=JSON.parse(content);for(const image of images){image.original=BASE+image.original.slice(1);image.display=BASE+image.display.slice(1);}content=JSON.stringify(images);
 }else content=moved(content);
 return {contents:content,loader:extname(args.path).slice(1)};
 });}};}
const entry=ROOT+'/scripts/.goober-pages-entry.tsx';
await writeFile(entry,"import {createRoot} from 'react-dom/client';import {Home} from '../src/routes/index';createRoot(document.getElementById('app')!).render(<Home/>);\n");
for(const [file,target,generic] of [[entry,OUT+'/app.js',false],[ROOT+'/src/anewgam/FieldlogApp.tsx',OUT+'/saedow/app.js',true]] as const){
 const result=await Bun.build({entrypoints:[file],outfile:target,target:'browser',format:'esm',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[plugin(generic)]});if(!result.success)throw new Error(result.logs.join('\n'));if(result.outputs.length!==1)throw Error('Expected one self-contained JavaScript bundle');await writeFile(target,new Uint8Array(await result.outputs[0].arrayBuffer()));
}
await writeFile(OUT+'/style.css',await readFile(ROOT+'/src/anewgam.css','utf8'));
const m=JSON.parse(await readFile(ROOT+'/public/manifest.webmanifest','utf8'));m.id=BASE;m.start_url=BASE;m.scope=BASE;for(const icon of m.icons)icon.src=BASE+icon.src.slice(1);for(const link of m.shortcuts)link.url=BASE+link.url.slice(1);await writeFile(OUT+'/manifest.webmanifest',JSON.stringify(m,null,2));
for(const name of ['index.html','manifest.webmanifest']){const file=OUT+'/saedow/'+name;await writeFile(file,moved(await readFile(file,'utf8')));}
const index=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#17141f"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Anewgam"><title>Anewgam · Goober | The Crossing</title><meta name="description" content="Find your line. Make it yours. A world, a field log, and your next good run."><meta property="og:title" content="Anewgam · Goober"><meta property="og:description" content="Find your line. Make it yours."><meta property="og:image" content="https://stevoblevo.github.io/goober/assets/goober-cover.jpg"><link rel="manifest" href="/goober/manifest.webmanifest"><link rel="icon" href="/goober/assets/icon-192.png"><link rel="apple-touch-icon" href="/goober/assets/icon-180.png"><link rel="stylesheet" href="/goober/style.css"></head><body><div id="app"></div><noscript><h1>Anewgam · Goober</h1><p>Enable JavaScript to open your world and browser-local field log. No login required.</p></noscript><script type="module" src="/goober/app.js"></script></body></html>`;
await writeFile(OUT+'/index.html',index);
await writeFile(OUT+'/sw.js',`const CACHE='goober-pages-shell-v1';const BASE='/goober/';
const CORE=['','app.js','style.css','manifest.webmanifest','assets/crossing.webp','assets/garden.webp','assets/sanctuary.webp','assets/icon-192.png','assets/icon-512.png'].map(p=>BASE+p);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('goober-pages-shell-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE)||u.pathname.startsWith(BASE+'saedow/')||e.request.cache==='no-store')return;
if(e.request.mode==='navigate'&&u.pathname===BASE){e.respondWith(fetch(e.request).then(async r=>{if(r.ok)(await caches.open(CACHE)).put(BASE,r.clone());return r;}).catch(()=>caches.match(BASE)));return;}
if(!CORE.includes(u.pathname))return;e.respondWith(fetch(e.request).then(async r=>{if(r.ok)(await caches.open(CACHE)).put(e.request,r.clone());return r;}).catch(()=>caches.match(e.request)));});`);
let sw=await readFile(ROOT+'/public/saedow/sw.js','utf8');sw=moved(sw).replaceAll('saedow-fieldlog-','goober-pages-fieldlog-');await writeFile(OUT+'/saedow/sw.js',sw);
for(const alias of ['setup','$','>']){await mkdir(OUT+'/'+alias,{recursive:true});await writeFile(OUT+'/'+alias+'/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/goober/#setup"><title>Anewgam PC workbench</title><a href="/goober/#setup">Open the PC workbench</a></html>');}
const assets=JSON.parse(await readFile(ROOT+'/public/assets/asset-provenance.json','utf8'));for(const a of assets){a.original=BASE+a.original.slice(1);a.display=BASE+a.display.slice(1);}await writeFile(OUT+'/assets/asset-provenance.json',JSON.stringify(assets,null,2));
const receipt={schema:'saelion.public-mount/0.1',source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT}).toString().trim(),target_url:'https://stevoblevo.github.io/goober/',source_owner:'existing owner-requested Goober application',adaptation:'Same React app component, client entry instead of Worker SSR; root-relative runtime paths mounted under /goober/. Gameplay, local record format, source image bytes and existing hash trail unchanged.',live_status:'pending-deployment-verification',privacy:'Public app shell; notes and local MP4 are browser-local, unencrypted, not synchronized. Other pages at this host are not private security boundaries.',skein_acceptance:'not-submitted',evidence:['/goober/receipts/trail.json','/goober/assets/asset-provenance.json'],no_account_required:true};await writeFile(OUT+'/receipts/public-delivery.json',JSON.stringify(receipt,null,2));
await writeFile(OUT+'/.nojekyll','');
console.log('Exported unchanged app behavior into',OUT);
