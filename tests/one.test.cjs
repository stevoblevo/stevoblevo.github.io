const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const root = path.join(__dirname,'..');
const ingress = require('../shared/ingress.js');
const tool = () => import(pathToFileURL(path.join(root,'tools/one.mjs')).href);
function store(value=null) {return {value,getItem(){return this.value;},setItem(k,v){this.value=v;}};}
const opts = {world:'peachfall',id:'test-thread-1',now:'2026-09-17T00:00:00Z'};
test('exact original wording, whitespace and world reach the EXISTING loom', () => {
 const db=store(); const input='  sae\n gento 🌱  ';
 const r=ingress.append(db,input,opts);
 assert.equal(r.state.threads[0].source,input);assert.equal(r.state.threads[0].world,'peachfall');assert.equal(r.state.threads[0].status,'held-local');assert.equal(r.state.threads[0].authorityEffect,'none');assert.equal(ingress.KEY,'anewgam.steven.cockpit.v2');
});
test('the same submission identity cannot create a duplicate thread',()=>{
 const db=store();ingress.append(db,'peach',opts);const r=ingress.append(db,'peach',opts);assert.equal(r.duplicate,true);assert.equal(r.state.threads.length,1);
});
test('whitespace-only and oversized sources rejected without truncation or store mutation',()=>{
 for(const value of [' \n','x'.repeat(4001)]) {const db=store();assert.throws(()=>ingress.append(db,value,opts));assert.equal(db.value,null);}
});
test('corrupt or incompatible existing memory is not overwritten',()=>{
 for(const raw of ['{bad','null','[]','{"threads":{}}']) {const db=store(raw);assert.throws(()=>ingress.append(db,'hi',opts));assert.equal(db.value,raw);}
});
test('quota failures propagate; the caller cannot claim success',()=>{
 const db=store();db.setItem=()=>{throw new Error('QuotaExceeded');};assert.throws(()=>ingress.append(db,'hi',opts),/QuotaExceeded/);assert.equal(db.value,null);
});
test('unrelated scene state and existing thread are preserved',()=>{
 const db=store(JSON.stringify({threads:[{id:'previous',source:'old'}],fruit:'cyan Pear',fluidScene:{x:4},deviceChat:{pending:'hold'},receipts:[]}));
 const state=ingress.append(db,'new',opts).state;assert.equal(state.threads[1].source,'old');assert.equal(state.fruit,'cyan Pear');assert.deepEqual(state.fluidScene,{x:4});assert.deepEqual(state.deviceChat,{pending:'hold'});
});
test('thread capacity is bounded and not silently pruned',()=>{
 const raw=JSON.stringify({threads:Array.from({length:250},(_,i)=>({id:String(i)}))});const db=store(raw);assert.throws(()=>ingress.append(db,'new',opts),/250/);assert.equal(db.value,raw);
});
test('deployment allowlist rejects credentials, private checkout, scripts and traversal',async()=>{
 const {publicPath}=await tool();
 for(const p of ['.env','saelion.workspace.json','tools/one.mjs','.worktrees/peachfall/src/a.ts','peachfall/.env','peachfall/../.env','peachfall/node_modules/test.js','anewgam-for-steven-cockpit/regression.test.cjs','peachfall/assets/a.js.map','peachfall/\\secret.txt']) assert.equal(publicPath(p),false,p);
 for(const p of ['index.html','peachfall/manifest.webmanifest','shared/ingress.js','peachfall/assets/main-BPeuWIE_.js'])assert.equal(publicPath(p),true,p);
});
test('Peachfall manifest has correct identity, scope and valid existing PNG dimensions',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'peachfall/manifest.webmanifest')));const base='https://example.test/peachfall/';assert.equal(new URL(manifest.id,base).href,base);assert.equal(new URL(manifest.scope,base).href,base);
 for(const icon of manifest.icons){const data=fs.readFileSync(path.resolve(root,'peachfall',icon.src));const [w,h]=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);}
});
test('preserved engine image URLs serve identical published art without exposing other source files',async()=>{
 const {serve,publicPath}=await tool();
 const engine=fs.readFileSync(path.join(root,'peachfall/assets/main-BPeuWIE_.js'),'utf8');
 const routes=[...new Set([...engine.matchAll(/"(\/source\/[^\"]+)"/g)].map(m=>m[1]))];
 assert.equal(routes.length,3);
 const server=await serve(root,0);const base=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const route of routes){const response=await fetch(base+route);assert.equal(response.status,200,route);assert.equal(response.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(path.join(root,'peachfall',route)));}
  for(const route of ['source/private.js','source/images/anchors/unknown.png']){assert.equal(publicPath(route),false);assert.equal((await fetch(base+'/'+route)).status,404);}
 }finally{await new Promise(r=>server.close(r));}
});
function worker(){
 const handlers={},deleted=[];const context={URL,Response,fetch,self:{location:{href:'https://example.test/peachfall/sw.js'},__PEACHFALL_OFFLINE__:{version:'test',files:['./','./index.html','../shared/ingress.js']},addEventListener:(k,v)=>handlers[k]=v,clients:{claim:async()=>{}}},importScripts:()=>{},caches:{keys:async()=>['saelion-peachfall-old','steven-anewgam-v7','goober-pages-shell-v3','private-data'],delete:async k=>deleted.push(k)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'peachfall/sw.js'),'utf8'),context);return {handlers,deleted,context};
}
test('Peachfall worker removes only its own obsolete caches',async()=>{
 const {handlers,deleted}=worker();let pending;handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['saelion-peachfall-old']);
});
test('Peachfall worker does not intercept private APIs, credentials, query strings or writes',()=>{
 const {handlers}=worker();for(const [url,method] of [['https://example.test/api/work','GET'],['https://private.test/x','GET'],['https://example.test/peachfall/index.html?token=private','GET'],['https://example.test/peachfall/index.html','POST'],['https://example.test/goober/','GET']]){let hit=false;handlers.fetch({request:{url,method},respondWith:()=>hit=true});assert.equal(hit,false,url);}
});
test('failed offline install cleans the incomplete cache and rejects',async()=>{
 const {handlers,deleted,context}=worker();context.caches.open=async()=>({addAll:async()=>{throw new Error('offline');}});let pending;handlers.install({waitUntil:p=>pending=p});await assert.rejects(pending,/offline/);assert.deepEqual(deleted,['saelion-peachfall-test']);
});
test('offline version is derived deterministically from published bytes',async()=>{
 const {prepare}=await tool();const a=await prepare(),b=await prepare();assert.equal(a.version,b.version);assert.ok(a.files.includes('./assets/main-BPeuWIE_.js'));assert.ok(a.files.includes('../shared/ingress.js'));for(const file of a.files)assert.ok(fs.existsSync(path.resolve(root,'peachfall',file)),file);
});
test('all added classic scripts parse and all HTML IDs remain unique',()=>{
 for(const f of ['shared/ingress.js','peachfall/companion.js','peachfall/sw.js','peachfall/offline-files.js'])new vm.Script(fs.readFileSync(path.join(root,f),'utf8'));
 for(const f of ['index.html','peachfall/index.html','peachfall/play.html','anewgam-for-steven-cockpit/index.html']){const ids=[...fs.readFileSync(path.join(root,f),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,f);}
});
test('local development serves the same routes and rejects hidden/private paths',async()=>{
 const {serve}=await tool();const server=await serve(root,0);const base=`http://127.0.0.1:${server.address().port}`;
 try {for(const route of ['/','/peachfall/','/anewgam-for-steven-cockpit/','/shared/ingress.js'])assert.equal((await fetch(base+route)).status,200,route);for(const route of ['/.env','/saelion.workspace.json','/.worktrees/peachfall/package.json','/tools/one.mjs'])assert.ok((await fetch(base+route)).status>=400,route);assert.equal((await fetch(base+'/',{method:'POST'})).status,405);}finally{await new Promise(r=>server.close(r));}
});

test('cockpit offline shell accepts a scene fragment without widening API access',async()=>{
 const handlers={};let pending;
 const context={URL,Response,fetch:async()=>{throw Error('offline');},self:{location:{href:'https://example.test/anewgam-for-steven-cockpit/sw.js'},addEventListener:(k,v)=>handlers[k]=v},caches:{open:async()=>({match:async()=>new Response('cached cockpit')})}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'anewgam-for-steven-cockpit/sw.js'),'utf8'),context);
 handlers.fetch({request:{url:'https://example.test/anewgam-for-steven-cockpit/#loom',method:'GET',mode:'navigate'},respondWith:p=>pending=p});
 assert.ok(pending,'fragment navigation must be handled');assert.equal(await(await pending).text(),'cached cockpit');
});
test('exact-word ingress fields do not silently truncate in the browser',()=>{
 const html=fs.readFileSync(path.join(root,'anewgam-for-steven-cockpit/index.html'),'utf8');
 assert.ok(!html.match(/<textarea[^>]*id="dropInput"[^>]*maxlength/));
 assert.ok(!fs.readFileSync(path.join(root,'peachfall/companion.js'),'utf8').includes('maxlength="4000"'));
});
