import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, mkdtemp} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const evidence=process.env.EVIDENCE_DIR;
assert(evidence,'EVIDENCE_DIR is required');
assert(process.env.PLAYWRIGHT_MODULE&&process.env.CHROME_PATH,'Use existing Playwright client and Chrome');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
await mkdir(evidence,{recursive:true});
const checks=[],pageErrors=[],failedRequests=[];
const report={kind:'real Chrome, isolated guest profiles, unchanged served source',checks,pageErrors,failedRequests,sourceHashes:{},blockedChecks:[]};
for(const p of ['peachfall/assets/main-BPeuWIE_.js','peachfall/assets/main-CVicfXhU.css','goober/run/index.html','goober/run/field.js']){
 report.sourceHashes[p]=createHash('sha256').update(await readFile(path.join(root,p))).digest('hex');
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404).end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const verifyPublic=process.env.VERIFY_PUBLIC==='1';
const origin=verifyPublic?'https://stevoblevo.github.io':'http://127.0.0.1:'+server.address().port;
report.origin=origin;
report.mode=verifyPublic?'signed-out public deployment':'isolated checkout';
let browser,chromeProcess;
let chromeStartupLog='';
const check=(name,condition)=>{assert(condition,name);checks.push(name);console.log('PASS '+name)};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function canvasHash(page,selector){
 return page.locator(selector).evaluate(canvas=>{
  const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let h=2166136261;for(let i=0;i<a.length;i+=16)h=Math.imul(h^a[i],16777619);
  return h>>>0;
 });
}
async function context(options={},existing){
 const c=existing||await browser.newContext({viewport:{width:1280,height:900},hasTouch:true,...options});
 await c.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort('blockedbyclient'));
 await c.addInitScript(()=>{
  window.__repairEvents=[];
  window.__repairKeyups=[];
  window.__repairPageShows=[];
  document.addEventListener('keyup',e=>window.__repairKeyups.push({key:e.key,trusted:e.isTrusted}));
  window.addEventListener('pageshow',e=>window.__repairPageShows.push({persisted:e.persisted,trusted:e.isTrusted}));
  document.addEventListener('visibilitychange',e=>window.__repairEvents.push({type:e.type,hidden:document.hidden,trusted:e.isTrusted}));
  document.addEventListener('pointercancel',e=>window.__repairEvents.push({type:e.type,trusted:e.isTrusted,target:e.target.id||e.target.getAttribute('data-key')||e.target.getAttribute('data-dir')}));
 });
 c.on('page',p=>{
  p.on('pageerror',e=>pageErrors.push(e.message));
  p.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
 });
 return c;
}
async function nativeCancel(page,selector){
 const el=page.locator(selector);await el.scrollIntoViewIfNeeded();
 const box=await el.boundingBox();assert(box);
 const session=await page.context().newCDPSession(page);
 await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await delay(100);
 await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await delay(100);
 await session.detach();
}
try{
 if(verifyPublic){
  // Never test an older deployed bundle and call it this release. Wait only for exact bytes.
  const targets=['peachfall/index.html','peachfall/play.html',...Object.keys(report.sourceHashes),
   'peachfall/source/images/anchors/01_gen22_page1_the_princess_who_could_not_leave_the_tower.png',
   'peachfall/source/images/anchors/02_astral_assembly_sae_and_little_princesses.png',
   'peachfall/source/images/anchors/03_gameplay_assume_her_fragments.png'];
  const expected=new Map(await Promise.all(targets.map(async p=>[p,createHash('sha256').update(await readFile(path.join(root,p))).digest('hex')])));
  const deadline=Date.now()+180000;
  do{
   report.deployedFiles=await Promise.all(targets.map(async p=>{
    try{
     const response=await fetch(origin+'/'+p,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
     const sha256=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
     return {path:p,status:response.status,expected:expected.get(p),sha256,matched:response.status===200&&sha256===expected.get(p)};
    }catch(error){return {path:p,matched:false,error:String(error)}}
   }));
   if(report.deployedFiles.every(f=>f.matched))break;
   if(Date.now()>=deadline)break;
   await delay(10000);
  }while(true);
  check('All nine public entry, runtime, style and image files match this checkout',report.deployedFiles.length===9&&report.deployedFiles.every(f=>f.matched));
 }
 // A fresh, owned Chrome profile; never attach to a user's existing browser.
 // Official noDefaults avoids Playwright's primary-session focus override.
 // Some runners export a DBUS_SESSION_BUS_ADDRESS Chrome cannot parse. Chrome
 // then stays alive and never writes DevToolsActivePort, so drop that address
 // and try one fresh profile if the first launch does not publish a port.
 const chromeEnv={...process.env};
 if(chromeEnv.DBUS_SESSION_BUS_ADDRESS && !/^(unix|tcp):/.test(chromeEnv.DBUS_SESSION_BUS_ADDRESS)) delete chromeEnv.DBUS_SESSION_BUS_ADDRESS;
 const chromeArgs=['--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--no-first-run','--no-default-browser-check','--disable-dev-shm-usage','--mute-audio','about:blank'];
 let port=0;
 for(let attempt=1;attempt<=2 && !(port>0);attempt++){
  if(chromeProcess && chromeProcess.exitCode===null)chromeProcess.kill('SIGTERM');
  const profile=await mkdtemp(path.join(process.env.RUNNER_TEMP||tmpdir(),'saelion-visibility-'));
  chromeStartupLog='';
  chromeProcess=spawn(process.env.CHROME_PATH,['--user-data-dir='+profile,...chromeArgs],{stdio:['ignore','ignore','pipe'],env:chromeEnv});
  chromeProcess.stderr.on('data',data=>{chromeStartupLog=(chromeStartupLog+data).slice(-6000)});
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
   if(chromeProcess.exitCode!==null)break;
   try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port>0)break}catch{}
   await delay(100);
  }
  if(!(port>0) && attempt===2){
   const dbus=process.env.DBUS_SESSION_BUS_ADDRESS?'dbus='+(process.env.DBUS_SESSION_BUS_ADDRESS.split(':')[0]||'empty'):'dbus=unset';
   assert(port>0,'Owned Chrome did not publish its loopback debugging port ('+dbus+'): '+chromeStartupLog);
  }
 }
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});
 report.visibilityEnvironment='fresh owned default Chrome context; Playwright noDefaults=true';
 report.browser=browser.version();
 // Real keyboard focus/visibility and native browser-generated pointercancel.
 const c=await context({},browser.contexts()[0]),p=await c.newPage();
 await p.setViewportSize({width:1280,height:900});
 await p.goto(origin+'/goober/run/');
 await p.waitForFunction(()=>!!window.__controlsTest);
 check('Goober is idle before Start',await p.locator('#start').isVisible());
 await p.locator('#start').click();
 await p.keyboard.down('ArrowRight');await delay(150);
 const firstYaw=await p.evaluate(()=>window.__controlsTest.getYaw());
 check('Goober real keyboard turns ship',Math.abs(firstYaw)>.05);
 const visibilitySession=await c.newCDPSession(p);
 await visibilitySession.send('Emulation.setFocusEmulationEnabled',{enabled:false});
 const targetInfo=(await visibilitySession.send('Target.getTargetInfo')).targetInfo;
 const browserSession=await browser.newBrowserCDPSession();
 const nextPage=c.waitForEvent('page');
 // A second OS window on the CI display loses focus but stays document.hidden=false,
 // because nothing occludes it. A foreground tab in the same window is the transition
 // that actually hides the page. Playwright focus emulation must stay off, or the
 // background tab is reported visible and this wait never completes.
 await browserSession.send('Target.createTarget',{url:'about:blank',browserContextId:targetInfo.browserContextId,newWindow:false,background:false});
 const other=await nextPage;
 const otherSession=await c.newCDPSession(other);
 report.visibilityWindows={game:await visibilitySession.send('Browser.getWindowForTarget'),other:await otherSession.send('Browser.getWindowForTarget')};
 await otherSession.send('Emulation.setFocusEmulationEnabled',{enabled:false});
 await other.bringToFront();
 try{
  // Interval polling: requestAnimationFrame never runs once the background page's frames are suspended,
  // so the default waiter would time out even after a real hide.
  await p.waitForFunction(()=>document.hidden,null,{polling:50,timeout:5000});
 }catch(error){
  const observed=await p.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus(),events:window.__repairEvents}));
  throw Error('True hidden-tab transition did not happen: '+JSON.stringify({observed,windows:report.visibilityWindows})+'\n'+(error.stack||error));
 }
 check('Goober real blur releases held key',await p.evaluate(()=>!document.hasFocus()&&keys.size===0&&paused));
 check('Goober receives a true hidden transition',await p.evaluate(()=>window.__repairEvents.some(e=>e.type==='visibilitychange'&&e.hidden&&e.trusted)));
 check('Hidden Goober clears held key',await p.evaluate(()=>keys.size===0&&paused));
 await other.keyboard.up('ArrowRight');
 await p.bringToFront();await p.waitForFunction(()=>!document.hidden,null,{polling:50});
 const resumedYaw=await p.evaluate(()=>window.__controlsTest.getYaw());await delay(250);
 check('Goober return does not retain turning',Math.abs(await p.evaluate(()=>window.__controlsTest.getYaw())-resumedYaw)<.001);
 await p.keyboard.up('ArrowRight');
 await otherSession.detach();await other.close();await visibilitySession.detach();await browserSession.detach();
 await nativeCancel(p,'.touch-controls [data-key="ArrowUp"]');
 check('Goober native pointercancel is trusted',await p.evaluate(()=>window.__repairEvents.some(e=>e.type==='pointercancel'&&e.trusted&&e.target==='ArrowUp')));
 check('Goober native cancellation releases thrust',await p.evaluate(()=>!keys.has('ArrowUp')));
 await nativeCancel(p,'#field');
 check('Goober native canvas cancellation clears target',await p.evaluate(()=>pointer===null&&window.__repairEvents.some(e=>e.type==='pointercancel'&&e.trusted&&e.target==='field')));
 await p.screenshot({path:path.join(evidence,'goober-desktop.png'),fullPage:true});
 // Hold the automation key across departure/return; release only after inspecting app state.
 report.historyHeldInput=[];
 for(let n=0;n<3;n++){
  try{
   await p.evaluate(()=>{window.__repairKeyups=[];window.__repairPageShows=[]});
   await p.keyboard.down('ArrowRight');await delay(50);
   check('Goober held key reaches application before history departure '+n,await p.evaluate(()=>keys.has('ArrowRight')));
   await p.goto(origin+'/peachfall/play.html');
   // Back-forward cache restores the document without a load event. Waiting for
   // load hangs after the URL has already committed; pageshow is the restoration signal.
   await p.goBack({waitUntil:'commit'});
   await p.waitForURL(origin+'/goober/run/',{waitUntil:'commit'});
   await p.waitForFunction(()=>document.readyState==='complete'&&!!window.__controlsTest&&window.__repairPageShows.length>0,{polling:50});
   const state=await p.evaluate(()=>({keys:[...keys],pointer,keyupEvents:window.__repairKeyups,pageShow:window.__repairPageShows.at(-1)||null}));
   report.historyHeldInput.push({roundTrip:n,harnessKeyupSentBeforeAssertion:false,...state});
   check('Goober history return clears input before automation key release '+n,state.keys.length===0&&state.pointer===null&&state.pageShow&&state.pageShow.trusted);
  }finally{
   if(!p.isClosed())await p.keyboard.up('ArrowRight');
  }
 }
 await p.close();
 for(const width of [390,1280]){
  const pc=await context({viewport:{width,height:900}}),page=await pc.newPage();
  const images=[];
  page.on('response',r=>{if(r.url().includes('/source/images/anchors/'))images.push({url:r.url(),status:r.status()})});
  for(const route of ['/peachfall/','/peachfall/play.html']){
   // Play persists the scene under peachfall-playable-v1. Leaving that save in
   // place makes the other entrance resume mid-scene, so the title gate times out.
   await page.evaluate(()=>localStorage.removeItem('peachfall-playable-v1')).catch(()=>{});
   await page.goto(origin+route);await page.waitForFunction(()=>document.body.dataset.scene==='title');
   await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/source/images/anchors/')).length>=3);
   check('Peachfall three nested image requests succeed '+width+' '+route,images.slice(-3).length===3&&images.slice(-3).every(x=>x.status===200&&x.url.includes('/peachfall/source/images/')));
   const urls=images.slice(-3).map(x=>x.url);
   check('Peachfall all anchors decode '+width+' '+route,await page.evaluate(async urls=>(await Promise.all(urls.map(url=>new Promise(resolve=>{const i=new Image;i.onload=()=>resolve(i.naturalWidth>0&&i.naturalHeight>0);i.onerror=()=>resolve(false);i.src=url})))).every(Boolean),urls));
   const before=await canvasHash(page,'#game');await delay(300);
   check('Peachfall canvas remains animated '+width+' '+route,before!==await canvasHash(page,'#game'));
   await page.locator('#btn-mute').click();await page.locator('#play-dream').click();
   await page.waitForFunction(()=>document.body.dataset.scene!=='title');
   check('Peachfall Play enters story '+width+' '+route,await page.locator('#hud').isVisible());
   if(width===390){
    check('Peachfall narrow controls do not overlap canvas',await page.evaluate(()=>{
     const a=document.querySelector('.topbar').getBoundingClientRect(),b=document.querySelector('#game').getBoundingClientRect(),d=document.querySelector('#hud').getBoundingClientRect(),e=document.querySelector('#caption').getBoundingClientRect();
     return a.bottom<=b.top&&b.bottom<=d.top&&d.bottom<=e.top&&document.documentElement.scrollWidth<=innerWidth;
    }));
   }
  }
  await page.screenshot({path:path.join(evidence,'peachfall-'+width+'.png'),fullPage:true});
  // Seed only an isolated profile with the existing public save format to exercise touch controls.
  await page.evaluate(()=>localStorage.setItem('peachfall-playable-v1',JSON.stringify({scene:'field',mode:'play',muted:true,volume:0})));
  await page.reload();await page.waitForFunction(()=>document.body.dataset.scene==='field');
  await nativeCancel(page,'[data-dir="right"]');
  check('Peachfall receives native direction cancellation '+width,await page.evaluate(()=>window.__repairEvents.some(e=>e.type==='pointercancel'&&e.trusted&&e.target==='right')));
  await nativeCancel(page,'#touch-kneel');
  check('Peachfall receives native action cancellation '+width,await page.evaluate(()=>window.__repairEvents.some(e=>e.type==='pointercancel'&&e.trusted&&e.target==='touch-kneel')));
  await pc.close();
 }
 // Deliberate genuine network failure; app JavaScript/CSS are never substituted.
 const failed=await context(),fp=await failed.newPage();let aborted=0;
 await failed.route('**/source/images/anchors/**',r=>{aborted++;return r.abort('failed')});
 await fp.goto(origin+'/peachfall/play.html');await fp.waitForFunction(()=>document.body.dataset.scene==='title');
 await delay(300);check('All three actual anchor requests aborted',aborted===3);
 check('Chrome recorded network failures',failedRequests.filter(r=>r.url.includes('/source/images/anchors/')).length===3);
 const first=await canvasHash(fp,'#game');await delay(300);
 check('Peachfall animates after literal image request aborts',first!==await canvasHash(fp,'#game'));
 await fp.locator('#btn-mute').click();await fp.locator('#play-dream').click();
 await fp.waitForFunction(()=>document.body.dataset.scene!=='title');
 const after=await canvasHash(fp,'#game');await delay(300);
 check('Peachfall Play continues after image aborts',after!==await canvasHash(fp,'#game'));
 await fp.screenshot({path:path.join(evidence,'peachfall-aborted-images.png'),fullPage:true});
 const recovered=[];fp.on('response',r=>{if(r.url().includes('/source/images/anchors/'))recovered.push(r.status())});
 await failed.unroute('**/source/images/anchors/**');
 await fp.reload();await fp.waitForFunction(()=>document.body.dataset.scene);
 await delay(500);check('Normal reload recovers after request abort',recovered.length===3&&recovered.every(s=>s===200));
 await failed.close();
 check('No uncaught page errors across tested routes',pageErrors.length===0);
 report.status=report.blockedChecks.length?'partial':'passed';
 if(report.blockedChecks.length)process.exitCode=1;
}catch(error){report.status='failed';report.error=String(error.stack||error);process.exitCode=1}
finally{
 if(browser)await browser.close();
 if(chromeProcess&&chromeProcess.exitCode===null)chromeProcess.kill('SIGTERM');
 await new Promise(resolve=>server.close(resolve));
 await writeFile(path.join(evidence,'browser.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
