/** Loopback-only preview of the selected private engine inside the existing home.
 * Compiled bytes stay in memory. Never copies them into the public tree or dist.
 */
import {readFile, readdir, lstat, realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {enginePlan, privateEngine} from './peachfall-source.mjs';

const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm'};
const HASH = /^[a-f0-9]{40}$/;
const MAX_FILE = 32 * 1024 * 1024, MAX_TOTAL = 128 * 1024 * 1024, MAX_FILES = 512;
function git(cwd, args) { return execFileSync('git', args, {cwd, encoding:'utf8', stdio:['ignore','pipe','pipe'], timeout:15000}).trim(); }
async function noLinks(root, relative) {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Preview root must not be a symlink.');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current,part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Preview paths must not contain symlinks.');
  }
}
export async function verifySelection(root, engine) {
  const plan = enginePlan(root,engine);
  await noLinks(root, engine.sourceDirectory + '/' + engine.buildDirectory);
  const top = await realpath(git(plan.checkout,['rev-parse','--show-toplevel']));
  if (top !== await realpath(plan.checkout)) throw new Error('The private checkout is not its own repository.');
  if (git(plan.checkout,['rev-parse','HEAD']) !== plan.sourceRef) throw new Error('Private HEAD differs from selectedSourceRef. Existing work was not reset.');
  if (git(plan.checkout,['status','--porcelain','--untracked-files=all'])) throw new Error('Private checkout has local changes. Preserve/review them before an exact-source preview; nothing was reset.');
  return plan;
}
export function compiledPath(relative) {
  if (relative === 'index.html') return true;
  if (relative.includes('\\') || relative.split('/').some(p => !p || p.startsWith('.')) || /(?:\.test\.|\.spec\.|\.map$)/.test(relative)) return false;
  // This is the existing live-slice output layout, not permission to serve a repo.
  if (!/^(?:assets\/[^/]+|peachfall\/(?:anchors|continuity)\/[^/]+)$/.test(relative)) return false;
  return Boolean(TYPES[path.extname(relative).toLowerCase()]) && !relative.endsWith('.html');
}
function page(sourceRef, version) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>Peachfall · one development home</title><style>
html,body{margin:0;background:#14182a;color:#eadbd2;font:14px system-ui;height:100%;overflow:hidden}body{display:grid;grid-template-rows:auto minmax(0,1fr);height:100dvh}nav{display:flex;align-items:center;gap:.5rem;padding:0 .6rem;min-height:48px;flex-wrap:wrap;border-bottom:1px solid #ffffff20}a{display:inline-flex;align-items:center;min-height:44px;color:#f6c8af;text-decoration:none;padding:0 .55rem}a:focus-visible{outline:3px solid #a9deca;outline-offset:-3px;border-radius:8px}small{margin-left:auto;color:#baaebe;font-size:11px}iframe{width:100%;height:100%;border:0;background:#14182a}@media(max-width:430px){nav{gap:0}small{max-width:140px;text-align:right;font-size:10px}}
</style></head><body><nav aria-label="Same Saelion home"><a href="/">Sae · home</a><a href="/anewgam-for-steven-cockpit/#loom">My loom</a><small>Private preview · ${sourceRef.slice(0,7)}<br>Not a published or offline release</small></nav><iframe title="Peachfall selected game" src="/peachfall/_preview/index.html?preview=${version}" allow="gamepad; fullscreen"></iframe></body></html>`;
}
export async function compiledSnapshot(dist, sourceRef) {
  if (!HASH.test(sourceRef || '')) throw new Error('An exact source commit is required.');
  const routes = new Map(), files = {}, hash = createHash('sha256');
  let total = 0, count = 0;
  async function visit(relative = '') {
    const current = path.join(dist,relative), info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error('Symlink in compiled output. Preview refused.');
    if (info.isDirectory()) {
      if (relative && !['assets','peachfall','peachfall/anchors','peachfall/continuity'].includes(relative)) throw new Error('Unexpected directory in compiled output.');
      for (const name of (await readdir(current)).sort()) await visit(relative ? `${relative}/${name}` : name);
    } else {
      if (!info.isFile() || !compiledPath(relative)) throw new Error('Unexpected file in compiled output. Source, maps and private records are not served.');
      if (++count > MAX_FILES || info.size > MAX_FILE || (total += info.size) > MAX_TOTAL) throw new Error('Compiled preview exceeds its bounded file budget.');
      const bytes = await readFile(current);
      if (bytes.length !== info.size) throw new Error('Build changed while being read. Run preview again.');
      const digest = createHash('sha256').update(bytes).digest('hex');
      files[relative] = digest; hash.update(relative).update('\0').update(digest).update('\n');
      const route = relative === 'index.html' ? '/peachfall/_preview/index.html' : '/'+relative;
      routes.set(route,{bytes,type:TYPES[path.extname(relative).toLowerCase()]});
    }
  }
  await visit();
  const index = routes.get('/peachfall/_preview/index.html');
  if (!index) throw new Error('Compiled index.html missing.');
  // Fail a moved build layout instead of quietly dropping assets or serving old ones.
  const refs = [...index.bytes.toString('utf8').matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1]);
  if (!refs.length || refs.some(ref => !ref.startsWith('/') || ref.startsWith('//') || !routes.has(ref))) throw new Error('Compiled entry must reference the existing absolute asset layout.');
  const version = hash.digest('hex').slice(0,20);
  const receipt = {schema:'saelion-private-preview-v1',sourceRef,version,files,totalBytes:total,meaning:'Compiled snapshot in a local preview. Not deployment, reviewed acceptance, offline support, AI or Saedo execution.'};
  routes.set('/peachfall/index.html',{bytes:Buffer.from(page(sourceRef,version)),type:TYPES['.html']});
  routes.set('/peachfall/play.html',routes.get('/peachfall/index.html'));
  routes.set('/peachfall/_preview/receipt.json',{bytes:Buffer.from(JSON.stringify(receipt,null,2)+'\n'),type:'application/json'});
  return {routes,receipt,launch:`/peachfall/?preview=${version}`};
}
export async function homeOverlay(root, snapshot) {
  // Query-labelled launch bypasses any older Peachfall PWA's version-locked cache.
  // Existing caches and saves are never cleared, and no preview SW is installed.
  for (const relative of ['index.html','anewgam-for-steven-cockpit/doors.js']) {
    await noLinks(root,relative);
    let text = await readFile(path.join(root,relative),'utf8');
    text = relative === 'index.html'
      ? text.replace(/href=(["'])(?:\.\/|\/)?peachfall\/\1/g, `href="${snapshot.launch}"`)
      : text.replace(/href: (["'])\/peachfall\/\1/g, `href: "${snapshot.launch}"`);
    snapshot.routes.set('/'+relative,{bytes:Buffer.from(text),type:TYPES[path.extname(relative)]});
  }
  return snapshot;
}
export async function selectedPreview(root, engine) {
  const before = await verifySelection(root,engine);
  // Use the existing test/build command; no dependency install, checkout/reset, or deploy.
  await privateEngine('engine',root,engine);
  await verifySelection(root,engine);
  await noLinks(root,engine.sourceDirectory+'/'+engine.buildDirectory+'/dist');
  const snapshot = await compiledSnapshot(path.join(before.build,'dist'),before.sourceRef);
  await verifySelection(root,engine);
  return homeOverlay(root,snapshot);
}
