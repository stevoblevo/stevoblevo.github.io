import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
export const checkInterruptions=function(fieldSource,peachSource){
const results=[];const check=(name,fn)=>{try{fn();results.push({name,passed:true})}catch(e){results.push({name,passed:false,error:e.message})}};
const assert=(v,n)=>{if(!v)throw Error(n)};
function target(){const events={};return {events,addEventListener(k,f){(events[k]??=[]).push(f)},removeEventListener(k,f){events[k]=(events[k]||[]).filter(x=>x!==f)},emit(k,event={}){for(const f of events[k]||[])f({preventDefault(){},pointerId:1,clientX:20,clientY:30,...event})}}}
function goober(){
const window=target(),document=Object.assign(target(),{hidden:false}),nodes={};
const ctx=new Proxy({createRadialGradient(){return {addColorStop(){}}}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function node(id){return nodes[id]??=Object.assign(target(),{style:{},getContext:()=>ctx,focus(){},setPointerCapture(){},getAttribute:()=>id,getBoundingClientRect:()=>({left:0,top:0,width:720,height:420})})}
document.getElementById=node;document.querySelectorAll=()=>["ArrowLeft","ArrowUp","ArrowRight","ArrowDown"," ","Shift"].map(node);
const read=new Function("window","document","localStorage","requestAnimationFrame","performance",fieldSource+"\nreturn ()=>({keys:[...keys],pointer,steer,paused,running});")(window,document,{getItem:()=>null},()=>1,{now:()=>100});
node("start").emit("click");
return {window,document,node,read};
}
function peach(){
const window=target(),document=Object.assign(target(),{hidden:false}),dirs=["left","right","up","down"].map(dir=>Object.assign(target(),{dataset:{dir},setPointerCapture(){}})),buttons={};
for(const id of ["#touch-act","#touch-kneel","#touch-sit","#touch-look"])buttons[id]=Object.assign(target(),{setPointerCapture(){}});
const root={querySelectorAll:s=>s==="[data-dir]"?dirs:[],querySelector:s=>buttons[s]};
const start=peachSource.indexOf("class Ne{"),end=peachSource.indexOf("function ",start);
assert(start>=0&&end>start,"input class extraction");
const input=new Function("window","document","navigator","h",peachSource.slice(start,end)+";return new Ne();")(window,document,{getGamepads:()=>[]},(o,k,v)=>o[k]=v);
input.attach(root);return {window,document,input,dirs,buttons};
}
check("Goober hidden tab releases held keyboard input",()=>{const g=goober();g.document.emit("keydown",{key:"ArrowRight",code:"ArrowRight"});g.document.hidden=true;g.document.emit("visibilitychange");assert(g.read().keys.length===0&&g.read().paused,"held key survives hidden tab");g.document.hidden=false;g.document.emit("visibilitychange");assert(!g.read().paused&&g.read().keys.length===0,"stale key resumes")});
check("Goober blur clears pointer, keys and steering",()=>{const g=goober();g.document.emit("keydown",{key:"ArrowUp",code:"ArrowUp"});g.node("field").emit("pointerdown");g.window.__controlsTest.setSteer(2);g.window.emit("blur");const s=g.read();assert(s.keys.length===0&&s.pointer===null&&s.steer===0&&s.paused,"blur retains input");});
check("Goober pointer cancellation releases canvas target",()=>{const g=goober();g.node("field").emit("pointerdown");g.node("field").emit("pointercancel");assert(g.read().pointer===null,"cancel retains pointer");});
check("Goober capture loss releases touch control",()=>{const g=goober();g.node("ArrowUp").emit("pointerdown");g.node("ArrowUp").emit("lostpointercapture");assert(g.read().keys.length===0,"lost capture retains thrust");});
check("Goober pagehide releases controls before history return",()=>{const g=goober();g.node("ArrowUp").emit("pointerdown");g.window.emit("pagehide");assert(g.read().keys.length===0&&g.read().paused,"pagehide retains input");g.window.emit("pageshow");assert(g.read().keys.length===0&&!g.read().paused,"pageshow restores stale input");});
check("Goober restart clears previously held controls",()=>{const g=goober();g.node("ArrowUp").emit("pointerdown");g.node("start").emit("click");assert(g.read().keys.length===0,"restart retains input");});
check("Peachfall direction pointer cancellation releases movement",()=>{const p=peach();p.dirs[1].emit("pointerdown");assert(p.input.poll().x===1,"direction did not engage");p.dirs[1].emit("pointercancel");assert(p.input.poll().x===0,"cancel retains direction");});
check("Peachfall action cancellation clears held and queued action",()=>{const p=peach();p.buttons["#touch-act"].emit("pointerdown");p.buttons["#touch-act"].emit("pointercancel");const s=p.input.poll();assert(!s.action&&!s.advance,"cancel retains queued action");});
check("Peachfall capture loss releases held action but preserves normal tap",()=>{const p=peach();p.buttons["#touch-act"].emit("pointerdown");p.buttons["#touch-act"].emit("lostpointercapture");assert(p.input.poll().action,"normal tap lost");assert(!p.input.poll().action,"capture loss retains held action");});
check("Peachfall blur clears keys and queued commands",()=>{const p=peach();p.window.emit("keydown",{code:"ArrowRight"});p.window.emit("keydown",{code:"Enter"});p.window.emit("blur");const s=p.input.poll();assert(s.x===0&&!s.action&&!s.advance,"blur retains commands");});
check("Peachfall hidden tab clears controls",()=>{const p=peach();p.dirs[1].emit("pointerdown");p.document.hidden=true;p.document.emit("visibilitychange");assert(p.input.poll().x===0,"hidden tab retains direction");});
check("Peachfall pagehide clears controls before history return",()=>{const p=peach();p.buttons["#touch-kneel"].emit("pointerdown");p.window.emit("pagehide");assert(!p.input.poll().kneel,"pagehide retains kneel");});
return results;
};
const results=checkInterruptions(await readFile(new URL('goober/run/field.js',root),'utf8'),await readFile(new URL('peachfall/assets/main-BPeuWIE_.js',root),'utf8'));
console.log(JSON.stringify({kind:'source/model interrupted-input regression',results},null,2));
if(results.some(x=>!x.passed))process.exitCode=1;
