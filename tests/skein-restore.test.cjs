'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ingress = require('../shared/ingress.js');
const at = '2026-09-19T11:00:00.000Z';
const thread = (id, changes = {}) => ({id, source: `original ${id}`, heldAt: at, updatedAt: at, status: 'held-local', proof: '', authorityEffect: 'none', ...changes});
const backup = threads => ({format: 'sae.anewgam.skein', version: 3, authorityEffect: 'none', state: {threads}});
function store(state = {threads: [], receipts: [], blooms: 7, fruit: 'rose-gold Peach'}) {
  let raw = JSON.stringify(state), writes = 0;
  return {getItem: () => raw, setItem(key, value) {assert.equal(key, ingress.KEY); raw = value; writes++;}, get raw() {return raw;}, get writes() {return writes;}};
}
function unchangedOnError(state, input, message) {
  const s = store(state), before = s.raw, inputBefore = JSON.stringify(input);
  assert.throws(() => ingress.restore(s, input), message);
  assert.equal(s.raw, before); assert.equal(s.writes, 0); assert.equal(JSON.stringify(input), inputBefore);
}

test('capacity overflow rejects the entire restore instead of evicting an old thread', () => {
  const threads = Array.from({length: 250}, (_, i) => thread(`keep-${i}`));
  unchangedOnError({threads}, backup([thread('new')]), /exceed 250/);
});
test('a 249-thread loom accepts exactly one new thread and preserves all originals', () => {
  const threads = Array.from({length: 249}, (_, i) => thread(`keep-${i}`));
  const s = store({threads, theme: 'light', fluidScene: {place: 'meadow'}, receipts: []});
  const result = ingress.restore(s, backup([thread('new')]));
  assert.equal(result.added, 1); assert.equal(result.state.threads.length, 250);
  assert.deepEqual(result.state.threads.slice(0, 249), threads);
  assert.equal(result.state.theme, 'light'); assert.deepEqual(result.state.fluidScene, {place: 'meadow'});
});
test('identical backup is idempotent even when the loom is full', () => {
  const threads = Array.from({length: 250}, (_, i) => thread(`keep-${i}`));
  const s = store({threads, receipts: []}), before = s.raw;
  const result = ingress.restore(s, backup(threads));
  assert.equal(result.added, 0); assert.equal(result.duplicates, 250);
  assert.equal(s.writes, 0); assert.equal(s.raw, before);
});
test('duplicates inside a backup are added once and replay makes no new receipt', () => {
  const s = store(), input = backup([thread('a'), thread('a')]);
  const first = ingress.restore(s, input); assert.equal(first.added, 1); assert.equal(first.duplicates, 1);
  const before = s.raw; ingress.restore(s, input); assert.equal(s.raw, before); assert.equal(s.writes, 1);
});
for (const [field, value] of [['source','different words'], ['world','peachfall'], ['proof','new outcome'], ['status','proven'], ['updatedAt','2026-09-20T11:00:00.000Z']]) {
  test(`same-ID ${field} disagreement is a conflict, not silent overwrite or discard`, () => {
    unchangedOnError({threads:[thread('a')]}, backup([thread('b'), thread('a', {[field]:value})]), /conflicts/);
  });
}
test('conflicting IDs inside a backup fail before any write', () => {
  unchangedOnError({threads:[]}, backup([thread('a'),thread('a',{source:'other'})]), /conflicts/);
});
test('key order and omitted default fields do not create false conflicts', () => {
  const minimal = {updatedAt:at,heldAt:at,source:'original a',id:'a'};
  const s=store({threads:[minimal]}); const result=ingress.restore(s,backup([thread('a')]));
  assert.equal(result.added,0); assert.equal(s.writes,0);
});
test('source whitespace, Unicode, scene, outcome and extra provenance survive byte-for-byte', () => {
  const source='  .\nsae 🍑\t\u200b e\u0301 é <script>nothing executes</script>  ';
  const item=thread('a',{source,world:'peachfall',ingress:'device-local',proof:'  exact proof  ',provenance:{scene:'gate',tokens:['🍑','🧶']}});
  const input=backup([item]), original=JSON.stringify(input), s=store();
  const result=ingress.restore(s,input);assert.deepEqual(result.state.threads[0],item);
  assert.deepEqual(JSON.parse(s.raw).threads[0],item); assert.equal(JSON.stringify(input),original);
});
for (const [name, item] of [
  ['oversized words',thread('a',{source:'x'.repeat(4001)})],
  ['oversized proof',thread('a',{proof:'x'.repeat(2001)})],
  ['missing identity',{source:'words'}],
  ['blank source',thread('a',{source:'  \n'})],
  ['invalid timestamp',thread('a',{updatedAt:'not a date'})],
  ['unknown scene',thread('a',{world:'private-owner'})],
  ['execution claim',thread('a',{authorityEffect:'execute'})],
  ['unknown status',thread('a',{status:'worker-running'})]
]) test(`${name} fails without shortening, guessing or partial import`,()=>unchangedOnError({threads:[]},backup([thread('valid'),item]),/invalid or oversized/));
test('unsupported format and version fail without writing',()=>{
  for(const changes of [{version:99},{format:'other'},{authorityEffect:'execute'},{state:[]}]) unchangedOnError({threads:[]},{...backup([]),...changes},/version 3/);
});
test('over-limit source file fails rather than slicing its first 250 threads',()=>{
  unchangedOnError({threads:[]},backup(Array.from({length:251},(_,i)=>thread(String(i)))),/exceeds 250/);
});
test('malformed existing JSON is not overwritten',()=>{
  let writes=0;assert.throws(()=>ingress.restore({getItem:()=>'{broken',setItem(){writes++;}},backup([thread('a')])),/could not be read/);assert.equal(writes,0);
});
test('duplicate IDs already in storage block restore',()=>{
  unchangedOnError({threads:[thread('a'),thread('a')]},backup([thread('b')]),/existing loom has duplicate/);
});
test('denied/quota write keeps existing stored bytes and input unchanged',()=>{
  const s=store({threads:[thread('kept')]}), before=s.raw, input=backup([thread('new')]);
  const fail={getItem:s.getItem,setItem(){throw new Error('QuotaExceededError');}};
  assert.throws(()=>ingress.restore(fail,input),/Storage refused/);
  assert.equal(s.raw,before);assert.equal(input.state.threads.length,1);
});
test('restore reads the current storage, preserving a thread from another tab',()=>{
  const s=store({threads:[thread('latest-other-tab')]});
  const result=ingress.restore(s,backup([thread('incoming')]));
  assert.deepEqual(result.state.threads.map(t=>t.id),['latest-other-tab','incoming']);
});

// Exercise the real UI callback with small DOM stubs; these are not browser tests.
function ui(saved, fail=false) {
  const storage=store(saved); let state=JSON.parse(storage.raw), message=''; const nodes=new Map();
  const node=()=>({style:{},classList:{toggle(){}},addEventListener(name,fn){this[name]=fn;},append(){},replaceChildren(){},setAttribute(){}});
  const document={querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},querySelectorAll(){return[];},createElement:node};
  const api={getState:()=>state,toast:s=>{message=s;},setState:s=>{state=s;},restoreThreads(payload){
    const source=fail?{getItem:storage.getItem,setItem(){throw Error('quota');}}:storage;
    const result=ingress.restore(source,payload);state=result.state;return result;
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../anewgam-for-steven-cockpit/advanced.js'),'utf8'),{
    window:{__anewgam:api,addEventListener(){}},document,navigator:{onLine:true},localStorage:{setItem(){},removeItem(){}},matchMedia:()=>({matches:false}),Date,Map,JSON,Object,Number,String,Array
  });
  return {storage,get state(){return state;},get message(){return message;},async select(input){
    document.querySelector('#importFile').change({target:{files:[{size:1000,text:async()=>JSON.stringify(input)}],value:''}});
    await new Promise(resolve=>setImmediate(resolve));
  }};
}
test('rendering does not mutate source state or strip extra thread provenance',()=>{
  const saved={threads:[thread('a',{provenance:{scene:'gate'}})],receipts:[],blooms:7};
  const app=ui(saved); assert.deepEqual(app.state,saved);
});
test('actual import UI reports capacity failure without a success toast',async()=>{
  const saved={threads:Array.from({length:250},(_,i)=>thread(String(i))),receipts:[]};
  const app=ui(saved), before=app.storage.raw;await app.select(backup([thread('new')]));
  assert.match(app.message,/exceed 250/);assert.equal(app.storage.raw,before);assert.deepEqual(app.state,saved);
});
test('actual import UI reports failed save and does not apply an unsaved snapshot',async()=>{
  const saved={threads:[thread('kept')],receipts:[]}, app=ui(saved,true);await app.select(backup([thread('new')]));
  assert.match(app.message,/Storage refused/);assert.deepEqual(app.state,saved);
});
test('actual import UI reports the committed count and safe identical replay',async()=>{
  const app=ui({threads:[],receipts:[]});await app.select(backup([thread('new')]));
  assert.match(app.message,/Restored 1 thread/);await app.select(backup([thread('new')]));
  assert.match(app.message,/already here/);assert.equal(app.storage.writes,1);
});
