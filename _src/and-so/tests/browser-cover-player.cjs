// Local QA harness, not application implementation. Requires permitted Chromium.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..'),out=process.env.ANDSO_QA_OUTPUT||__dirname;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],env:{...process.env,HOME:'/tmp'}});
 const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[],errors=[],checks=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.abort());
 const ok=(name,value)=>{assert.ok(value,name);checks.push(name)};
 try{
 await page.setContent('<!doctype html><html><body><div id="wb" style="width:288px;overflow-y:auto"></div></body></html>');
 for(const name of ['src/z-cover-gate.js','src/z-cover-panel.js','src/z-cover-player.js'])await page.addScriptTag({content:fs.readFileSync(path.join(base,name),'utf8')});
 await page.evaluate(()=>{
   window.created=[];window.revoked=[];
   const c=URL.createObjectURL.bind(URL),r=URL.revokeObjectURL.bind(URL);
   URL.createObjectURL=f=>{const u=c(f);created.push(u);return u};URL.revokeObjectURL=u=>{revoked.push(u);r(u)};
   window.allowed=false;window.throws=false;
   window.panel=mountCoverPanel();
   // Minimal conductor correction: reference stays outside collapsed details.
   panel.after(panel.querySelector('a'));
   window.player=mountCoverPlayer(panel,()=>{if(window.throws)throw Error('fixture predicate');return window.allowed});
 });
 ok('source link visible with details collapsed',await page.locator('#wb > a').isVisible());
 ok('no autoplay or source at mount',await page.locator('[data-media]').evaluate(v=>!v.autoplay&&!v.getAttribute('src')&&v.paused));
 await page.locator('summary').click();
 ok('input initially disabled',await page.locator('[data-file]').isDisabled());
 await page.locator('[data-rights]').check();
 await page.locator('[data-file]').setInputFiles(process.env.ANDSO_QA_MEDIA||path.join(out,'synthetic.webm'));
 ok('selection alone stays paused and hidden',await page.locator('[data-media]').evaluate(v=>v.paused&&v.hidden));
 await page.locator('[data-reveal]').click();
 ok('unknown requirements remain locked',await page.locator('[data-media]').evaluate(v=>v.hidden));
 ok('unknown requirements explained',/requirements|configured/i.test(await page.locator('[data-status]').innerText()));
 await page.locator('[data-play]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-media]').paused);
 ok('manual play starts local media',true);
 await page.locator('[data-pause]').click();
 ok('manual pause stops',await page.locator('[data-media]').evaluate(v=>v.paused));
 await page.evaluate(()=>window.allowed=true);
 ok('eligibility alone never reveals',await page.locator('[data-media]').evaluate(v=>v.hidden));
 await page.locator('[data-reveal]').click();
 ok('explicit reveal after eligibility',await page.locator('[data-media]').isVisible());
 await page.evaluate(()=>{window.throws=true;player.check()});
 ok('predicate exception relocks',await page.locator('[data-media]').evaluate(v=>v.hidden));
 await page.locator('[data-file]').setInputFiles(process.env.ANDSO_QA_MEDIA||path.join(out,'synthetic.webm'));
 ok('replacement resets and revokes old URL',await page.evaluate(()=>revoked.includes(created[0])&&document.querySelector('[data-media]').paused&&document.querySelector('[data-media]').hidden));
 await page.locator('[data-media]').evaluate(v=>v.play=()=>Promise.reject(new Error('synthetic denied playback')));
 await page.locator('[data-play]').click();await page.waitForTimeout(30);
 ok('play rejection handled',errors.length===0);
 await page.locator('[data-rights]').uncheck();
 ok('revocation clears selected media',await page.locator('[data-media]').evaluate(v=>v.paused&&v.hidden&&!v.getAttribute('src')));
 ok('all object URLs revoked',await page.evaluate(()=>created.every(u=>revoked.includes(u))));
 await page.screenshot({path:path.join(out,'local-qa.png')});
 ok('no remote network/upload requests',requests.every(u=>u.startsWith('blob:')||u.startsWith('data:')));
 ok('no uncaught browser errors',errors.length===0);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'pass',scope:'isolated emitted UI/runtime; not full AndSo or deployment',checks,requests,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
