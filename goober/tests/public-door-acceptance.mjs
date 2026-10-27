import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const origin='https://stevoblevo.github.io';
const evidence=process.env.EVIDENCE_DIR;
assert(evidence&&process.env.PLAYWRIGHT_MODULE&&process.env.CHROME_PATH,'Existing CI runtime required');
await mkdir(evidence,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[],pageErrors=[],consoleErrors=[],failedRequests=[];
const report={kind:'native Chrome pageerror and public-door acceptance',origin,sourceCommit:process.env.SOURCE_COMMIT,testCommit:process.env.GITHUB_SHA,node:process.version,checks,pageErrors,consoleErrors,failedRequests,deployedFiles:[],cases:[]};
const check=(name,ok)=>{assert(ok,name);checks.push(name);console.log('PASS '+name)};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const targets=['cobalt/index.html','goober/play/index.html','peachfall/index.html',
 'peachfall/assets/main-BPeuWIE_.js','peachfall/assets/main-CVicfXhU.css',
 'peachfall/source/images/anchors/01_gen22_page1_the_princess_who_could_not_leave_the_tower.png',
 'peachfall/source/images/anchors/02_astral_assembly_sae_and_little_princesses.png',
 'peachfall/source/images/anchors/03_gameplay_assume_her_fragments.png'];
const expected=new Map(),publicBodies=new Map();
let browser;
async function canvasHash(page){
 return page.locator('#game').evaluate(canvas=>{
  const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let h=2166136261;for(let i=0;i<a.length;i+=16)h=Math.imul(h^a[i],16777619);return h>>>0;
 });
}
async function trackedPage(width,height,label){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width===390,serviceWorkers:'block'});
 const page=await context.newPage();
 const current={label,viewport:{width,height},listenerBeforeNavigation:true,states:[],responses:[]};
 const pending=[];
 page.on('pageerror',error=>pageErrors.push({label,url:page.url(),name:error.name,message:error.message,stack:error.stack}));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push({label,url:page.url(),text:message.text()})});
 page.on('requestfailed',request=>failedRequests.push({label,url:request.url(),error:request.failure()?.errorText}));
 page.on('response',response=>{
  const u=new URL(response.url());
  if(u.origin!==origin)return;
  const name=u.pathname.endsWith('/')?u.pathname.slice(1)+'index.html':u.pathname.slice(1);
  if(!expected.has(name))return;
  pending.push((async()=>{
   try{
    const digest=sha(await response.body());
    current.responses.push({path:name,url:response.url(),status:response.status(),sha256:digest,matched:response.status()===200&&digest===expected.get(name)});
   }catch(error){current.responses.push({path:name,url:response.url(),matched:false,error:String(error)})}
  })());
 });
 assert(page.listenerCount('pageerror')===1,'Native pageerror listener must precede navigation');
 report.cases.push(current);
 return {context,page,current,pending};
}
async function assertLayers(page,current,label,sheer,corn){
 await page.waitForFunction(([s,c])=>{
  const a=+getComputedStyle(document.querySelector('#sheer')).opacity,b=+getComputedStyle(document.querySelector('#cornflower')).opacity;
  return Math.abs(a-s)<.01&&Math.abs(b-c)<.01;
 },[sheer,corn]);
 const state=await page.evaluate(()=>({
  sheer:+getComputedStyle(document.querySelector('#sheer')).opacity,
  corn:+getComputedStyle(document.querySelector('#cornflower')).opacity,
  fieldOn:document.querySelector('#field').classList.contains('on'),
  sheerButton:document.querySelector('#toggleSheer').classList.contains('on'),
  cornButton:document.querySelector('#toggleCorn').classList.contains('on'),
  log:document.querySelector('#log').textContent
 }));
 current.states.push({label,...state});
 check(current.label+' '+label,state.fieldOn===!!(sheer||corn)&&state.sheerButton===!!sheer&&state.cornButton===!!corn&&
  (sheer?state.log.includes('sheer luminous'):true)&&(corn?state.log.includes('cornflower flaring'):true)&&
  (sheer||corn?true:state.log.startsWith('Quiet.')));
}
try{
 for(const name of targets){
  const local=await readFile(path.join(root,name));expected.set(name,sha(local));
  const response=await fetch(origin+'/'+name,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());publicBodies.set(name,bytes);
  const digest=sha(bytes);
  report.deployedFiles.push({path:name,status:response.status,expected:expected.get(name),sha256:digest,matched:response.status===200&&digest===expected.get(name)});
 }
 check('Eight current public files exactly match pinned source',report.deployedFiles.every(f=>f.matched));
 const cobaltHTML=publicBodies.get('cobalt/index.html').toString('utf8');
 const scripts=[...cobaltHTML.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1])).map(m=>m[2]);
 check('Exactly one Cobalt inline study script extracted',scripts.length===1);
 const scriptFile=path.join(evidence,'cobalt-inline.js');
 await writeFile(scriptFile,scripts[0]);
 const parsed=spawnSync(process.execPath,['--check',scriptFile],{encoding:'utf8',timeout:15000});
 report.nodeCheck={command:'node --check cobalt-inline.js',node:process.version,status:parsed.status,signal:parsed.signal,stdout:parsed.stdout,stderr:parsed.stderr,scriptSha256:sha(scripts[0])};
 check('Actual Node syntax check passes on extracted public script',parsed.status===0);
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--mute-audio']});
 report.browser=browser.version();
 // Prove the native event observer in a separate blank page, never in an application.
 const probe=await browser.newPage();
 const observed=probe.waitForEvent('pageerror');
 await probe.evaluate(()=>setTimeout(()=>{throw new Error('native-pageerror-observer-probe')},0));
 const probeError=await observed;report.nativeObserverProbe={name:probeError.name,message:probeError.message};
 check('Native pageerror observer receives uncaught exception',probeError.message==='native-pageerror-observer-probe');
 await probe.close();
 for(const [width,height] of [[1280,720],[390,844]]){
  const {context,page,current,pending}=await trackedPage(width,height,'Cobalt '+width);
  await page.goto(origin+'/cobalt/index.html',{waitUntil:'networkidle'});
  check(current.label+' correct public URL and title',page.url()===origin+'/cobalt/index.html'&&(await page.title())==='Cobalt Gray · color study');
  const runtime=await page.locator('script:not([src])').allTextContents();
  current.runtimeInlineHashes=runtime.map(sha);
  check(current.label+' runtime inline script equals extracted public bytes',runtime.length===1&&sha(runtime[0])===sha(scripts[0]));
  await assertLayers(page,current,'initial quiet',0,0);
  await page.screenshot({path:path.join(evidence,'cobalt-'+width+'-quiet.png'),fullPage:true});
  await page.locator('#toggleSheer').click();await assertLayers(page,current,'Sheer button',1,0);
  await page.locator('#toggleCorn').click();await assertLayers(page,current,'Cornflower button',1,1);
  await page.screenshot({path:path.join(evidence,'cobalt-'+width+'-layers.png'),fullPage:true});
  await page.locator('#reset').click();await assertLayers(page,current,'Reset',0,0);
  for(const [label,s,c] of [['field first tap',1,0],['field second tap',1,1],['field third tap',0,0]]){
   await page.locator('#field').click();await assertLayers(page,current,label,s,c);
  }
  check(current.label+' fits viewport and controls are reachable',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&
   ['toggleSheer','toggleCorn','reset'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth})));
  await Promise.all(pending);
  check(current.label+' actual navigation response matches source',current.responses.some(r=>r.path==='cobalt/index.html'&&r.matched)&&current.responses.every(r=>r.matched));
  check(current.label+' no native pageerror on load or controls',!pageErrors.some(e=>e.label===current.label));
  await context.close();
 }
 for(const [width,height] of [[1280,720],[390,844]]){
  const {context,page,current,pending}=await trackedPage(width,height,'Goober Play '+width);
  await page.goto(origin+'/goober/play/',{waitUntil:'networkidle'});
  check(current.label+' direct entrance is current link handoff',page.url()===origin+'/goober/play/'&&(await page.title())==='Play · Anewgam'&&await page.locator('canvas,script').count()===0);
  await page.screenshot({path:path.join(evidence,'goober-play-'+width+'.png'),fullPage:true});
  await page.locator('a.card[href="/peachfall/"]').click();
  await page.waitForURL(origin+'/peachfall/');
  await page.waitForFunction(()=>document.body.dataset.scene==='title');
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  const anchors=current.responses.filter(r=>r.path.includes('/source/images/anchors/'));
  check(current.label+' actual card reaches Peachfall with three successful own-page anchors',anchors.length===3&&anchors.every(r=>r.status===200&&r.matched));
  check(current.label+' anchors decode',await page.evaluate(async urls=>(await Promise.all(urls.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0&&img.naturalHeight>0);img.onerror=()=>resolve(false);img.src=src})))).every(Boolean),anchors.map(r=>r.url)));
  const before=await canvasHash(page);await delay(350);
  check(current.label+' destination canvas animates',before!==await canvasHash(page));
  await page.locator('#btn-mute').click();
  await page.locator('#watch-dream').click();
  await page.waitForFunction(()=>document.body.dataset.scene!=='title');
  current.watchState=await page.evaluate(()=>({scene:document.body.dataset.scene,caption:document.querySelector('#caption').textContent}));
  check(current.label+' Watch enters narrative',current.watchState.scene!=='title'&&current.watchState.caption.length>0);
  // Reset only the disposable test profile to exercise Play from a fresh title.
  await page.evaluate(()=>localStorage.removeItem('peachfall-playable-v1'));
  await page.reload();await page.waitForFunction(()=>document.body.dataset.scene==='title');
  await page.locator('#btn-mute').click();
  await page.locator('#play-dream').click();
  await page.waitForFunction(()=>document.body.dataset.scene!=='title');
  current.playState=await page.evaluate(()=>({scene:document.body.dataset.scene,caption:document.querySelector('#caption').textContent}));
  check(current.label+' Play enters narrative',current.playState.scene!=='title'&&await page.locator('#hud').isVisible());
  const after=await canvasHash(page);await delay(350);
  check(current.label+' canvas animates after Play',after!==await canvasHash(page));
  if(width===390)check(current.label+' controls/canvas/story do not overlap',await page.evaluate(()=>{
   const r=s=>document.querySelector(s).getBoundingClientRect(),a=r('.topbar'),b=r('#game'),c=r('#hud'),d=r('#caption');
   return a.bottom<=b.top&&b.bottom<=c.top&&c.bottom<=d.top&&document.documentElement.scrollWidth<=innerWidth;
  }));
  await page.screenshot({path:path.join(evidence,'goober-to-peachfall-'+width+'.png'),fullPage:true});
  await Promise.all(pending);
  check(current.label+' all observed entry/runtime/style/image responses match source',targets.filter(n=>n!=='cobalt/index.html').every(n=>current.responses.some(r=>r.path===n&&r.matched))&&current.responses.every(r=>r.matched));
  check(current.label+' no native pageerror through entry/Watch/Play',!pageErrors.some(e=>e.label===current.label));
  await context.close();
 }
 check('No native application pageerrors in any case',pageErrors.length===0);
 check('No failed requests in normal production acceptance',failedRequests.length===0);
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);process.exitCode=1}
finally{
 if(browser)await browser.close();
 await writeFile(path.join(evidence,'acceptance.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
