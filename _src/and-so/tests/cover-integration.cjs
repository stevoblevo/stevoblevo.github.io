// Conductor wiring model/source checks. Not a real browser or audio test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');let n=0;
const ok=(x,s)=>{assert.ok(x,s);n++};let predicate,checks=0,pauses=0,moved=false;
const media={},listeners={},link={};
const panel={querySelector:()=>link,after:x=>{moved=x===link},addEventListener:(k,f)=>listeners[k]=f};
const context=vm.createContext({window:{},muted:false,paused:false,SET:{vol:.7},mountCoverPanel:()=>panel,mountCoverPlayer:(r,t)=>{predicate=t;return{media,pause:()=>pauses++,check:()=>checks++}}});
vm.runInContext(read('src/z-cover-init.js'),context);
ok(moved,'reference moved outside collapsed details');ok(media.volume===.7&&!media.muted,'initial volume/mute');ok(predicate({})===false,'unconfigured requirements false');
context.window.ANDSO_COVER_REQUIREMENTS=()=>1;ok(predicate({})===false,'strict requirement result');context.window.ANDSO_COVER_REQUIREMENTS=f=>f.pass;ok(predicate({pass:true})===true,'trusted facts callback');
context.muted=true;context.coverSync();ok(media.muted,'global mute applies to HTML media');context.muted=false;context.paused=true;context.coverSync();ok(media.muted&&pauses>0,'global pause both silences and pauses');
context.paused=false;const before=pauses;context.coverSync();ok(!media.muted&&pauses===before,'unpause does not auto-play');
context.SET.vol=.2;listeners.change();ok(media.volume===.2,'master volume mirrors');listeners.click();ok(checks>=5,'explicit actions refresh predicate');
const build=read('build.py');ok(build.includes('"z-cover-gate.js", "z-cover-panel.js", "z-cover-player.js", "g-loop.js", "z-cover-init.js"'),'exact additive order');ok(build.includes('VERSION = "8.1"'),'build version unchanged');
const audio=read('src/b-audio.js');ok(audio.includes("applyMix() {\n    if (typeof coverSync === 'function') coverSync();\n    if (!A.ac) return;"),'mute/volume before WebAudio early return');
const input=read('src/e-input.js');ok(input.split('\n').find(x=>x.startsWith("on('pbPlay'")).includes('coverSync()'),'existing pause hook');ok(input.split('\n').find(x=>x.startsWith("on('pbStop'")).includes('coverSync()'),'existing stop hook');
ok(read('src/z-cover-panel.js')===read('tests/fixtures/grok-cover-panel.js.txt'),'provider UI unmodified');
console.log(JSON.stringify({status:'pass',checks:n,scope:'wiring model and exact source anchors; no browser or deployment verification'}));
