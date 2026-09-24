const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const REF = 'a'.repeat(40);
const mod = import('../tools/peachfall-preview.mjs');
const serverMod = import('../tools/one.mjs');
async function tmp(t) { const p = await fs.mkdtemp(path.join(os.tmpdir(),'sae-preview-')); t.after(() => fs.rm(p,{recursive:true,force:true})); return p; }
async function write(root,name,data) { const p=path.join(root,name); await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,data); }
async function output(t) {
  const root=await tmp(t);
  await write(root,'index.html','<!doctype html><script src="/assets/game.js"></script><link rel="stylesheet" href="/assets/game.css">');
  await write(root,'assets/game.js','window.previewFixture=true;');
  await write(root,'assets/game.css','body{margin:0}');
  await write(root,'peachfall/anchors/art.png','synthetic art fixture');
  return root;
}
function git(root,args) {return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
async function checkout(t) {
  const root=await tmp(t), rel='.worktrees/peachfall', cwd=path.join(root,rel);
  await write(root,rel+'/live-slice/package.json','{"name":"peachfall-live-slice"}');
  git(cwd,['init','-q']); git(cwd,['add','.']);
  git(cwd,['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic checkout']);
  return {root,cwd,engine:{repository:'stevoblevo/peachfall-playable',sourceDirectory:rel,buildDirectory:'live-slice',selectedSourceRef:git(cwd,['rev-parse','HEAD'])}};
}
test('compiled allowlist excludes source, maps, credentials and arbitrary paths',async()=>{
  const {compiledPath}=await mod;
  for(const p of ['index.html','assets/game.js','assets/site.css','peachfall/anchors/a.png','peachfall/continuity/a.webp']) assert.equal(compiledPath(p),true,p);
  for(const p of ['.env','src/index.js','assets/.env','assets/game.js.map','assets/private.json','receipt.json','assets/../secret.js','assets\\game.js','peachfall/anchors/a.test.js','assets/report.html']) assert.equal(compiledPath(p),false,p);
});
test('exact compiled bytes get immutable routes and a bounded identity',async t=>{
  const {compiledSnapshot}=await mod, root=await output(t), snapshot=await compiledSnapshot(root,REF);
  assert.equal(Object.keys(snapshot.receipt.files).length,4);
  assert.match(snapshot.launch,/^\/peachfall\/\?preview=[a-f0-9]{20}$/);
  assert.equal(snapshot.routes.get('/assets/game.js').bytes.toString(),'window.previewFixture=true;');
  await fs.writeFile(path.join(root,'assets/game.js'),'changed after snapshot');
  assert.equal(snapshot.routes.get('/assets/game.js').bytes.toString(),'window.previewFixture=true;');
  assert.match(snapshot.routes.get('/peachfall/index.html').bytes.toString(),/Not a published or offline release/);
});
test('snapshot refuses missing or relative entry dependencies',async t=>{
  const {compiledSnapshot}=await mod, root=await output(t);
  await write(root,'index.html','<script src="/assets/missing.js"></script>');
  await assert.rejects(compiledSnapshot(root,REF),/asset layout/);
  await write(root,'index.html','<script src="https://example.invalid/game.js"></script>');
  await assert.rejects(compiledSnapshot(root,REF),/asset layout/);
});
test('snapshot refuses an invalid commit and absent entry',async t=>{
  const {compiledSnapshot}=await mod,root=await output(t);
  await assert.rejects(compiledSnapshot(root,'main'),/exact source/);
  await fs.unlink(path.join(root,'index.html')); await assert.rejects(compiledSnapshot(root,REF),/index.html missing/);
});
test('unexpected output fails instead of leaking or silently skipping it',async t=>{
  const {compiledSnapshot}=await mod,root=await output(t);
  await write(root,'assets/game.js.map','private sources');
  await assert.rejects(compiledSnapshot(root,REF),/Unexpected file/);
});
test('compiled symlinks are rejected',async t=>{
  const {compiledSnapshot}=await mod,root=await output(t),other=await tmp(t);
  await write(other,'outside.js','PRIVATE');
  await fs.symlink(path.join(other,'outside.js'),path.join(root,'assets/link.js'));
  await assert.rejects(compiledSnapshot(root,REF),/Symlink/);
});
test('oversized compiled files fail before read',async t=>{
  const {compiledSnapshot}=await mod,root=await output(t);
  const f=await fs.open(path.join(root,'assets/large.js'),'w'); await f.truncate(32*1024*1024+1); await f.close();
  await assert.rejects(compiledSnapshot(root,REF),/budget/);
});
test('home and existing cockpit links use the cache-bypassing launch without disk edits',async t=>{
  const {compiledSnapshot,homeOverlay}=await mod,root=await output(t),home=await tmp(t);
  const html='<a href="peachfall/">Play</a><a href="/peachfall/">Again</a>';
  await write(home,'index.html',html); await write(home,'anewgam-for-steven-cockpit/doors.js','const door = {href: "/peachfall/"};');
  const s=await homeOverlay(home,await compiledSnapshot(root,REF));
  assert.equal((s.routes.get('/index.html').bytes.toString().match(/\?preview=/g)||[]).length,2);
  assert.match(s.routes.get('/anewgam-for-steven-cockpit/doors.js').bytes.toString(),/\?preview=/);
  assert.equal(await fs.readFile(path.join(home,'index.html'),'utf8'),html);
});
test('real git checkout must match selected commit',async t=>{
  const {verifySelection}=await mod,f=await checkout(t);
  const plan=await verifySelection(f.root,f.engine); assert.equal(plan.checkout,f.cwd);
  await assert.rejects(verifySelection(f.root,{...f.engine,selectedSourceRef:REF}),/differs/);
  assert.equal(git(f.cwd,['rev-parse','HEAD']),f.engine.selectedSourceRef);
});
test('dirty and untracked work are refused and preserved',async t=>{
  const {verifySelection}=await mod,f=await checkout(t);
  await write(f.cwd,'live-slice/package.json','local edits');
  await assert.rejects(verifySelection(f.root,f.engine),/local changes/);
  assert.equal(await fs.readFile(path.join(f.cwd,'live-slice/package.json'),'utf8'),'local edits');
  git(f.cwd,['restore','live-slice/package.json']); // Test fixture only, never production helper.
  await write(f.cwd,'unfinished.txt','keep me');
  await assert.rejects(verifySelection(f.root,f.engine),/local changes/);
  assert.equal(await fs.readFile(path.join(f.cwd,'unfinished.txt'),'utf8'),'keep me');
});
test('private parent symlink is refused',async t=>{
  const {verifySelection}=await mod,f=await checkout(t),alias=await tmp(t);
  await fs.symlink(path.join(f.root,'.worktrees'),path.join(alias,'.worktrees'),'dir');
  await assert.rejects(verifySelection(alias,f.engine),/symlinks/);
});
test('a folder inheriting the home repository is not mistaken for a private checkout',async t=>{
  const {verifySelection}=await mod,f=await checkout(t);
  await fs.rm(path.join(f.cwd,'.git'),{recursive:true,force:true}); git(f.root,['init','-q']);
  await assert.rejects(verifySelection(f.root,f.engine),/own repository/);
});
test('same HTTP server serves selected game and home; no old-game fallback or private paths',async t=>{
  const {compiledSnapshot,homeOverlay}=await mod,{serve}=await serverMod,dist=await output(t),home=await tmp(t);
  await write(home,'index.html','<a href="peachfall/">Play</a>');
  await write(home,'anewgam-for-steven-cockpit/index.html','existing cockpit');
  await write(home,'anewgam-for-steven-cockpit/doors.js','const door={href: "/peachfall/"};');
  await write(home,'peachfall/old.js','old engine'); await write(home,'.worktrees/peachfall/secret.txt','PRIVATE');
  const snapshot=await homeOverlay(home,await compiledSnapshot(dist,REF));
  const server=await serve(home,0,snapshot); t.after(()=>new Promise(r=>server.close(r)));
  assert.equal(server.address().address,'127.0.0.1'); const base=`http://127.0.0.1:${server.address().port}`;
  assert.match(await(await fetch(base+'/')).text(),/\?preview=/);
  assert.match(await(await fetch(base+snapshot.launch)).text(),/Private preview/);
  assert.equal(await(await fetch(base+'/assets/game.js')).text(),'window.previewFixture=true;');
  assert.equal(await(await fetch(base+'/anewgam-for-steven-cockpit/')).text(),'existing cockpit');
  for(const route of ['/peachfall/old.js','/peachfall/sw.js','/assets/unknown.js','/src/a.js','/.worktrees/peachfall/secret.txt','/peachfall/%2e%2e%2fsecret.txt']) assert.ok([403,404].includes((await fetch(base+route)).status),route);
  assert.equal((await fetch(base+snapshot.launch,{method:'POST'})).status,405);
  const head=await fetch(base+'/assets/game.js',{method:'HEAD'}); assert.equal(await head.text(),''); assert.equal(head.headers.get('cache-control'),'no-store');
});
