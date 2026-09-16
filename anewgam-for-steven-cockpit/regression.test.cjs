const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const dir = __dirname;
test('all local scripts parse and page IDs are unique', () => {
  const html = fs.readFileSync(path.join(dir,'index.html'),'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [,file] of html.matchAll(/<script src="([^"]+)"/g)) new vm.Script(fs.readFileSync(path.join(dir,file),'utf8'));
});
test('new cast preserves existing library and contains four assets', () => {
  const context = {window:{__libraryItems:[{id:'previous'}]}}; vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir,'gen2-art.js'),'utf8'),context);
  assert.equal(context.window.__libraryItems.length,5);
  assert.equal(context.window.__libraryItems[4].id,'previous');
  for (const art of context.window.__libraryItems.slice(0,4)) assert.ok(fs.existsSync(path.join(dir,art.image)));
});
test('service worker only removes its own obsolete caches', async () => {
  const handlers = {}, deleted = [];
  const context = {URL,Response,fetch, self:{location:{href:'https://example.test/anewgam-for-steven-cockpit/sw.js'},addEventListener:(k,v)=>handlers[k]=v,clients:{claim:async()=>{}},skipWaiting:async()=>{}},caches:{keys:async()=>['goober-pages-shell-v3','steven-anewgam-v4','private-data'],delete:async key=>deleted.push(key)}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dir,'sw.js'),'utf8'),context);
  let pending;handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.deepEqual(deleted,['steven-anewgam-v4']);
  for (const url of ['https://example.test/goober/','https://private.test/api','https://example.test/anewgam-for-steven-cockpit/api','https://example.test/anewgam-for-steven-cockpit/index.html?token=private']) {
    let intercepted=false;handlers.fetch({request:{url,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,url);
  }
});
test('the recording companion has exactly 22 shots', () => {
  const story = JSON.parse(fs.readFileSync(path.join(dir,'gen22-record.json')));assert.equal(story.shots.length,22);assert.equal(story.authorityEffect,'none');
});
test('device chat keeps transport and bridge state separate', () => {
  const source = fs.readFileSync(path.join(dir,'device-chat.js'),'utf8');
  assert.match(source,/message-stream-error/);
  assert.match(source,/bridge:'not-tested'/);
  assert.match(source,/Pending command held locally/);
  assert.doesNotMatch(source,/OP9.*failed/i);
});
