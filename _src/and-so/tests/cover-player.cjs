// Model tests only: mocked DOM/media, not browser playback verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let checks=0;
function ok(x,label){assert.ok(x,label);checks++}
function events(){const map=new Map;return {map,addEventListener(k,f){if(!map.has(k))map.set(k,new Set);map.get(k).add(f)},removeEventListener(k,f){map.get(k)?.delete(f)},emit(k){for(const f of map.get(k)||[])f()}}}
async function main(){
 const document=events(),window=events(),made=[],revoked=[];
 document.onvisibilitychange=()=>{};window.onpagehide=()=>{};
 const priorD=document.onvisibilitychange,priorW=window.onpagehide;
 const context=vm.createContext({document,window,URL:{createObjectURL(f){const u='blob:test-'+made.length;made.push(u);return u},revokeObjectURL(u){revoked.push(u)}}});
 vm.runInContext(fs.readFileSync(path.join(root,'src/z-cover-gate.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/z-cover-player.js'),'utf8'),context);
 const els={};for(const k of ['media','file','rights','play','pause','reveal','status'])els[k]={disabled:false,hidden:false};
 const m=els.media;m.paused=true;m.pause=()=>{m.paused=true};m.load=()=>{};m.removeAttribute=k=>{delete m[k]};m.play=()=>{m.paused=false;return Promise.resolve()};
 const r={querySelector:s=>els[s.match(/data-(\w+)/)[1]]};
 let eligible=false,throwing=false;
 const player=context.mountCoverPlayer(r,()=>{if(throwing)throw Error('test');return eligible});
 ok(context.mountCoverPlayer(r)===player,'repeated mount reuses instance');
 ok(document.map.get('visibilitychange').size===1&&window.map.get('pagehide').size===1,'no duplicate lifecycle listeners');
 ok(document.onvisibilitychange===priorD&&window.onpagehide===priorW,'existing global handlers preserved');
 ok(m.paused&&m.hidden&&!m.src&&els.file.disabled,'inactive by default');
 els.rights.checked=true;els.rights.onchange();ok(!els.file.disabled,'acknowledgment enables chooser');
 const select=(type='video/webm')=>{els.file.files=[{name:'fixture',type}];els.file.onchange()};
 select();ok(m.src&&m.hidden&&m.paused,'selection does not play or reveal');
 els.reveal.onclick();ok(m.hidden&&/Requirements/.test(els.status.textContent),'unknown requirements visibly locked');
 els.play.onclick();await Promise.resolve();ok(!m.paused&&m.hidden,'manual audio');
 els.pause.onclick();ok(m.paused,'manual pause');
 eligible=true;player.check();ok(m.hidden,'eligibility never auto reveals');
 els.reveal.onclick();ok(!m.hidden,'manual reveal');
 throwing=true;player.check();ok(m.hidden,'throwing predicate relocks');throwing=false;
 const old=m.src;select();ok(revoked.includes(old)&&m.paused&&m.hidden,'replacement revokes pauses resets');
 m.play=()=>{throw Error('sync failure')};els.play.onclick();ok(m.paused&&/sync failure/.test(els.status.textContent),'sync play failure handled');
 m.play=()=>Promise.reject(Error('async failure'));els.play.onclick();await Promise.resolve();ok(m.paused&&/async failure/.test(els.status.textContent),'async rejection handled');
 let reject;m.play=()=>new Promise((a,b)=>{reject=b});els.play.onclick();select();const status=els.status.textContent;reject(Error('stale'));await Promise.resolve();ok(els.status.textContent===status&&m.paused,'stale rejection cannot mutate replacement');
 m.play=()=>{m.paused=false;return Promise.resolve()};els.play.onclick();document.hidden=true;document.emit('visibilitychange');ok(m.paused,'hidden page pauses');
 document.hidden=false;document.emit('visibilitychange');ok(m.paused,'return does not autoplay');
 els.rights.checked=false;els.rights.onchange();ok(!m.src&&m.hidden&&m.paused&&els.play.disabled,'rights revocation clears');
 els.rights.checked=true;els.rights.onchange();select('text/plain');ok(!m.src&&els.play.disabled,'unsupported type rejected');
 select('audio/wav');ok(els.reveal.disabled,'audio-only file cannot reveal');
 window.emit('pagehide');ok(!m.src&&m.paused&&m.hidden,'pagehide clears media');
 ok(made.every(u=>revoked.includes(u)),'every created URL revoked');
 player.destroy();ok(!r._coverPlayer&&document.map.get('visibilitychange').size===0&&window.map.get('pagehide').size===0,'destroy removes listeners');
 ok(!els.play.onclick&&!els.file.onchange,'destroy removes owned handlers');
 const def=context.mountCoverPlayer(r);select();els.reveal.onclick();ok(m.hidden,'omitted predicate locks');def.destroy();
 console.log(JSON.stringify({status:'pass',checks,scope:'mock DOM/media model only; browser and full AndSo integration unverified'}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
