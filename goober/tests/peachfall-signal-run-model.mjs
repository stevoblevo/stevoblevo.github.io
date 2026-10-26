import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Script, SourceTextModule} from 'node:vm';
const root = new URL('../../', import.meta.url);
const text = p => readFile(new URL(p,root),'utf8');
const peach = await text('peachfall/assets/main-BPeuWIE_.js');
const field = await text('goober/run/field.js');
const index = await text('goober/run/index.html');
const peachCheck = function(source){
 const checks=[];const ok=(v,n)=>{if(!v)throw Error(n);checks.push(n)};
 const start=source.indexOf("function j("),end=source.indexOf("function De(",start);
 ok(start>=0&&end>start,"draw helper boundary exists");
 const draw=new Function(source.slice(start,end)+";return j")();
 function context(throws=false){return {saves:0,calls:[],save(){this.saves++},restore(){this.saves--},drawImage(...args){this.calls.push(args);if(throws)throw Error("draw failure")}}}
 for(const [label,img] of [["missing",null],["loading",{complete:false,naturalWidth:100,naturalHeight:50}],["broken",{complete:true,naturalWidth:0,naturalHeight:0}],["zero-height",{complete:true,naturalWidth:100,naturalHeight:0}],["missing-dimensions",{complete:true}]]){
 const c=context();draw(c,img,720,420);ok(c.calls.length===0&&c.saves===0,label+" image safely skipped");
 }
 const image={complete:true,naturalWidth:100,naturalHeight:50,width:0,height:0};
 const c=context();draw(c,image,720,420,.28);
 ok(c.calls.length===1,"decoded image draws even when layout dimensions are zero");
 ok(c.calls[0].slice(1).every(Number.isFinite),"draw coordinates are finite");
 ok(JSON.stringify(c.calls[0].slice(1))===JSON.stringify([-60,0,840,420]),"natural dimensions preserve cover scale");
 ok(c.globalAlpha===.28&&c.saves===0,"normal drawing restores canvas stack");
 const broken=context(true);let thrown=false;try{draw(broken,image,720,420)}catch(e){thrown=e.message==="draw failure"}
 ok(thrown&&broken.saves===0,"unexpected drawing error restores canvas state and remains visible");
 ok(!source.includes('"/source/images/anchors/'),"wrong root image literals removed");
 const names=[...source.matchAll(/new URL\("\.\.\/source\/images\/anchors\/([^"]+)",import\.meta\.url\)\.href/g)].map(m=>m[1]);
 ok(names.length===3,"all three anchors resolved relative to module");
 new Function(source.replaceAll("import.meta.url",JSON.stringify("https://example.test/peachfall/assets/main-BPeuWIE_.js")));
 checks.push("bundle parse with import.meta URL substituted for function parser");
 return checks;
};
const gooberCheck = async function(source,html){
const checks=[];function ok(v,n){if(!v)throw Error(n);checks.push(n)}
const els={},queue=[],events={},window={};let time=100;
function node(id){return els[id]??={style:{},textContent:"",className:"",events:{},addEventListener(k,f){this.events[k]=f},emit(k,v={}){this.events[k]?.({preventDefault(){},pointerId:1,...v})},focus(){this.focused=true},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:360,height:210}},getAttribute(k){return k==="data-key"?id:null}}}
const gradient={addColorStop(){}};
const ctx=new Proxy({createRadialGradient(){return gradient}}, {get(o,k){return o[k]??(()=>{})},set(o,k,v){o[k]=v;return true}});
node("field").getContext=()=>ctx;
const buttons=["ArrowLeft","ArrowUp","ArrowDown","ArrowRight"," ","Shift"].map(node);
const document={hidden:false,getElementById:node,querySelectorAll:s=>s===".touch-controls button"?buttons:[],addEventListener(k,f){events[k]=f}};
const localStorage={getItem(){throw Error("storage blocked")},setItem(){throw Error("storage blocked")}};
const indexedDB={open(){throw Error("storage blocked")}};
const state=new Function("document","window","localStorage","indexedDB","requestAnimationFrame","performance",source+"\nreturn {state:()=>({running,paused,elapsed,pointer,keys:[...keys],ghostPath:[...ghostPath]})};")(document,window,localStorage,indexedDB,fn=>{queue.push(fn);return queue.length},{now:()=>time});
function step(ms=50){time+=ms;const f=queue.shift();if(!f)throw Error("no frame");f(time)}
const pos=()=>({x:window.__controlsTest.getX(),y:window.__controlsTest.getY()});
ok(!state.state().running&&queue.length===1,"load renders idle; no run starts automatically");
for(const id of ["field","hud-score","hud-time","hud-combo","line","start","status"])ok(html.includes('id="'+id+'"'),"runtime DOM contract: "+id);
node("start").emit("click");ok(state.state().running&&node("field").focused&&node("start").style.display==="none","Start focuses canvas and starts run");
events.keydown({key:"ArrowRight",code:"ArrowRight",preventDefault(){}});const yaw=window.__controlsTest.getYaw();step();ok(window.__controlsTest.getYaw()>yaw,"right handler turns");
events.keyup({key:"ArrowRight",code:"ArrowRight"});const yaw2=window.__controlsTest.getYaw();step();ok(window.__controlsTest.getYaw()===yaw2,"keyup releases turning");
const before=pos();node("ArrowUp").emit("pointerdown");step();ok(Math.hypot(pos().x-before.x,pos().y-before.y)>0,"touch thrust handler moves");
node("ArrowUp").emit("pointercancel");ok(!state.state().keys.includes("ArrowUp"),"touch cancellation releases thrust");
node("field").emit("pointerdown",{clientX:100,clientY:50});ok(state.state().pointer.x===200&&state.state().pointer.y===100,"360px canvas pointer maps to logical coordinates");
node("field").emit("pointercancel");ok(state.state().pointer===null,"canvas pointer cancellation clears target");
document.hidden=true;events.visibilitychange();const frozen=pos();step(2000);ok(state.state().paused&&pos().x===frozen.x&&pos().y===frozen.y,"hidden running tab pauses movement");
document.hidden=false;events.visibilitychange();ok(!state.state().paused,"current authored resume behavior retained");
step(46000);await Promise.resolve();await Promise.resolve();await Promise.resolve();
ok(!state.state().running&&node("start").style.display==="inline-block","45-second finish restores restart");
ok(node("status").textContent.includes("Could not keep"),"storage denial is visible without stopping finish");
node("start").emit("click");ok(state.state().running&&state.state().elapsed===0&&window.__controlsTest.getSpeed()===0,"restart resets run state");
return checks;
};
const checks = [...peachCheck(peach), ...await gooberCheck(field,index)];
new SourceTextModule(peach); checks.push('actual module syntax parse');
new Script(field); checks.push('actual classic-script syntax parse');
assert(index.includes('<script src="./field.js?v=2"></script>')); assert(!index.includes('run.v2.js')); checks.push('entry loads existing field.js');
for(const name of [...peach.matchAll(/new URL\("\.\.\/source\/images\/anchors\/([^"]+)",import\.meta\.url\)\.href/g)].map(m=>m[1])) {
  for(const base of ['https://example.test/peachfall/assets/main.js','https://example.test/prefix/peachfall/assets/main.js']) {
    assert.equal(new URL('../source/images/anchors/'+name,base).pathname, new URL('../',base).pathname+'source/images/anchors/'+name);
  }
  assert((await readFile(new URL('peachfall/source/images/anchors/'+name,root))).length>0);
}
checks.push('module URLs at root and prefixed mounts resolve to existing images');
console.log(JSON.stringify({kind:'source/model checks, not browser acceptance',passed:checks.length,checks},null,2));
