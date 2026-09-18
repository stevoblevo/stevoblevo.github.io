const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const selected = 'dec2632cc0e9bde473b8476edd1cf1d75a5d4f69';
const config = {repository:'stevoblevo/peachfall-playable', sourceDirectory:'.worktrees/peachfall', buildDirectory:'live-slice', selectedSourceRef:selected, observedMain:'654957d583d10a5aa34ba23a6980c36b21b8348b'};
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'peachfall-source-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const mod = await import('../tools/peachfall-source.mjs');
  return {root,...mod};
}
test('source selection is the explicit live-slice candidate, never observed main',async t=>{
  const {root,enginePlan}=await fixture(t);const plan=enginePlan(root,config);
  assert.equal(plan.sourceRef,selected);assert.equal(plan.build,path.join(root,'.worktrees/peachfall/live-slice'));
});
test('wrong, traversing or unspecified engine selection is refused',async t=>{
  const {root,enginePlan}=await fixture(t);
  for(const change of [{buildDirectory:'.'},{sourceDirectory:'../peachfall'},{selectedSourceRef:undefined},{repository:'other/repo'}])
    assert.throws(()=>enginePlan(root,{...config,...change}));
});
test('a new checkout selects the exact candidate without resetting any existing branch',async t=>{
  const {root,privateEngine}=await fixture(t);const calls=[];
  await privateEngine('source',root,config,(...args)=>calls.push(args));
  assert.deepEqual(calls.map(c=>c[1].slice(0,2)),[['clone','--no-checkout'],['checkout','--detach']]);
  assert.equal(calls[1][1][2],selected);
});
test('an existing dirty checkout is preserved byte-for-byte',async t=>{
  const {root,privateEngine}=await fixture(t);const dir=path.join(root,config.sourceDirectory);
  await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'unfinished.txt'),'keep me');
  let ran=false;await assert.rejects(privateEngine('source',root,config,()=>{ran=true;}),/preserved/);
  assert.equal(ran,false);assert.equal(await fs.readFile(path.join(dir,'unfinished.txt'),'utf8'),'keep me');
});
test('build commands run only in live-slice even when the old root package exists',async t=>{
  const {root,privateEngine}=await fixture(t);const dir=path.join(root,config.sourceDirectory);const build=path.join(dir,'live-slice');
  await fs.mkdir(build,{recursive:true});await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({name:'old-root'}));
  await fs.writeFile(path.join(build,'package.json'),JSON.stringify({name:'peachfall-live-slice'}));
  const calls=[];await privateEngine('engine',root,config,(...args)=>calls.push(args),'linux');
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c[2]===build));
  assert.deepEqual(calls.map(c=>c[1]),[['test'],['run','build']]);
});
test('missing live-slice does not fall back to the older root',async t=>{
  const {root,privateEngine}=await fixture(t);const dir=path.join(root,config.sourceDirectory);
  await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({name:'old-root'}));
  let ran=false;await assert.rejects(privateEngine('engine',root,config,()=>{ran=true;}),/older root/);assert.equal(ran,false);
});
test('private source symlink is rejected rather than followed',async t=>{
  const {root,privateEngine}=await fixture(t);await fs.mkdir(path.join(root,'.worktrees'));
  await fs.symlink(root,path.join(root,config.sourceDirectory),'dir');
  await assert.rejects(privateEngine('engine',root,config,()=>{}),/symlink/);
});
test('Windows execution uses the same live-slice with fixed shell arguments',async t=>{
  const {root,privateEngine}=await fixture(t);const build=path.join(root,config.sourceDirectory,'live-slice');
  await fs.mkdir(build,{recursive:true});await fs.writeFile(path.join(build,'package.json'),JSON.stringify({name:'peachfall-live-slice'}));
  const calls=[];await privateEngine('engine',root,config,(...args)=>calls.push(args),'win32');
  assert.deepEqual(calls,[['cmd.exe',['/d','/s','/c','npm test && npm run build'],build]]);
});
