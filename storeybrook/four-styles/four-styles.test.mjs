import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const code=fs.readFileSync(path.join(dir,'four-styles.js'),'utf8');
const {MODES,STORAGE_KEY,preferences,resolveTheme,assetMap,mount}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('untrusted stored preferences normalize; style and appearance are independent',()=>{
  assert.deepEqual(preferences(null),preferences());
  assert.equal(preferences({style:'unknown',theme:'gen4',quiet:'false'}).style,'gen4');
  for(const style of MODES)for(const theme of ['system','light','dark'])assert.deepEqual(preferences({style,theme}).style,style);
  assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');
  assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');
});
test('asset map accepts authorized same-origin/local files and rejects remote or executable URLs',()=>{
  const map=assetMap({gen4:{scene:'/assets/gen4-scene.png',column:'https://other.test/private.png',symbols:'javascript:alert(1)'},gen2:{scene:'blob:https://local.test/123'}},'https://local.test/demo/');
  assert.equal(map.gen4.scene,'https://local.test/assets/gen4-scene.png');assert.equal(map.gen4.column,undefined);assert.equal(map.gen4.symbols,undefined);assert.equal(map.gen2.scene,'blob:https://local.test/123');
});
class Element {
  constructor(doc){this.ownerDocument=doc;this.dataset={};this.attributes={};this.events={};this.hidden=false;this.children=[];this.textContent='';this.value='';this.checked=false;}
  addEventListener(name,fn){(this.events[name]||=[]).push(fn);}
  fire(name,event={}){for(const fn of this.events[name]||[])fn({target:this,...event});}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  removeAttribute(k){delete this.attributes[k];if(k==='src')this.src=undefined;}
  toggleAttribute(k,on){on?this.setAttribute(k,''):this.removeAttribute(k);}
  focus(){this.ownerDocument.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.fire('close');}
  dispatchEvent(){}
  getAnimations(){return[];}
  scrollIntoView(value){this.lastScroll=value;}
  closest(){return null;}
  contains(el){return this===el||this.children.includes(el);}
}
function fixture({saved,blocked=false,input=false}={}){
  const data=new Map(),requests=[],scrolls=[],media={};if(saved)data.set(STORAGE_KEY,JSON.stringify(saved));
  const doc={baseURI:'https://local.test/demo/',activeElement:null};
  const win={scrollX:0,scrollY:420,Image:class{constructor(){requests.push(this);}},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>{if(blocked)throw Error('blocked');data.set(k,v);},removeItem:k=>{if(blocked)throw Error('blocked');data.delete(k);}},
    matchMedia:q=>media[q]||=(Object.assign(new Element(doc),{matches:false})),scrollTo:o=>scrolls.push(o),URL,};doc.defaultView=win;
  const root=new Element(doc),nodes=new Map();
  const node=s=>{if(!nodes.has(s))nodes.set(s,new Element(doc));return nodes.get(s);};
  const modes=MODES.map(mode=>Object.assign(new Element(doc),{dataset:{fsMode:mode}}));
  const views=['scene','keyframes','symbols'].map(view=>Object.assign(new Element(doc),{dataset:{fsView:view}}));
  const summary=new Element(doc),details=new Element(doc);details.open=false;details.querySelector=()=>summary;
  summary.closest=s=>s==='details[open]'&&details.open?details:null;
  summary.addEventListener('click',()=>{details.open=!details.open;});
  summary.getBoundingClientRect=()=>({left:0,top:110,width:300,height:64});
  modes.forEach((el,i)=>{el.getBoundingClientRect=()=>({left:i*110,top:0,width:100,height:64});});
  win.navigator={getGamepads:()=>[]};win.addEventListener=()=>{};win.cancelAnimationFrame=()=>{};
  root.querySelector=s=>s==='dialog[open]'?(node('[data-fs-settings]').open?node('[data-fs-settings]'):null):s.startsWith('[data-fs-mode="')?modes.find(b=>s.includes('"'+b.dataset.fsMode+'"')):node(s);
  root.querySelectorAll=s=>s==='[data-fs-mode]'?modes:s==='[data-fs-view]'?views:s==='summary'?[summary]:[];
  root.children=[...nodes.values(),...modes,...views];
  const assets=Object.fromEntries(MODES.map(mode=>[mode,{scene:'/assets/'+mode+'.png',symbols:'/assets/'+mode+'-symbols.png'}]));
  const oldEvent=globalThis.CustomEvent;globalThis.CustomEvent=class{};
  root.contains=el=>el===root||el===details||el===summary||modes.includes(el)||[...nodes.values()].includes(el);
  const api=mount(root,{assets,...(input?{storeybrook:{nav:{candidates:()=>[...modes,summary]},mountIcons(){}}}:{})});globalThis.CustomEvent=oldEvent||class{};
  return{api,root,node,modes,views,requests,data,scrolls,media,win,doc,summary,details};
}
test('four modes keep semantic nodes, note, bookmark, focus and scroll position',()=>{
  const f=fixture();const story=f.node('[data-story-text]'),note=f.node('#story-note'),bookmark=f.node('[data-bookmark]');
  story.textContent='One shared story';note.value='  Keep this exact thought.\n';bookmark.setAttribute('aria-pressed','true');
  for(const mode of MODES){f.modes.find(b=>b.dataset.fsMode===mode).focus();const active=f.doc.activeElement;f.api.setStyle(mode);assert.equal(f.api.getState().style,mode);assert.equal(f.node('#story-note'),note);assert.equal(note.value,'  Keep this exact thought.\n');assert.equal(story.textContent,'One shared story');assert.equal(bookmark.getAttribute('aria-pressed'),'true');assert.equal(f.doc.activeElement,active);}
  assert.ok(f.scrolls.every(o=>o.top===420&&o.behavior==='instant'));
});
test('keyboard style changes are reversible and leave the current artwork view intact',()=>{
  const f=fixture();let prevented=false,stopped=false;
  f.views[2].fire('click');f.modes[0].fire('keydown',{key:'ArrowRight',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(f.api.getState().style,'gen2');assert.equal(f.api.getState().view,'symbols');assert.equal(f.doc.activeElement,f.modes[1]);assert.ok(prevented&&stopped);
  f.modes[1].fire('keydown',{key:'Home',preventDefault(){},stopPropagation(){}});assert.equal(f.api.getState().style,'gen4');
});
test('preference persistence is opt-in; disabling it removes only this key',()=>{
  const f=fixture();f.api.setStyle('skeptic');assert.equal(f.data.has(STORAGE_KEY),false);
  const remember=f.node('[data-fs-remember]');remember.checked=true;remember.fire('change');
  const saved=JSON.parse(f.data.get(STORAGE_KEY));assert.equal(saved.style,'skeptic');assert.equal(saved.remember,true);
  const next=fixture({saved});assert.equal(next.api.getState().style,'skeptic');
  remember.checked=false;remember.fire('change');assert.equal(f.data.has(STORAGE_KEY),false);
  const blocked=fixture({blocked:true});blocked.api.setStyle('gen2');assert.equal(blocked.api.getState().style,'gen2');
});
test('system appearance and reduced motion respond during a visit; Quiet is independent',()=>{
  const f=fixture(),dark=f.media['(prefers-color-scheme: dark)'],motion=f.media['(prefers-reduced-motion: reduce)'];
  dark.matches=true;dark.fire('change');assert.equal(f.root.dataset.fsTheme,'dark');
  let cancelled=0;f.root.getAnimations=()=>[{cancel(){cancelled++;}}];motion.matches=true;motion.fire('change');assert.equal(f.root.dataset.fsReduced,'true');assert.equal(cancelled,1);
  motion.matches=false;motion.fire('change');assert.equal(f.root.dataset.fsReduced,'false');f.node('[data-fs-quiet]').fire('click');assert.equal(f.root.dataset.fsQuiet,'true');assert.equal(f.root.dataset.fsReduced,'true');
  const theme=f.node('[data-fs-theme]');theme.value='light';theme.fire('change');assert.equal(f.root.dataset.fsTheme,'light');assert.equal(f.api.getState().style,'gen4');
});
test('a stale source cannot replace current art; failures leave shared story controls usable',()=>{
  const f=fixture(),old=f.requests[0].onload;f.api.setStyle('semiotic');f.requests[1].onload();const img=f.node('[data-fs-image]');assert.ok(img.src.endsWith('/semiotic.png'));old();assert.ok(img.src.endsWith('/semiotic.png'));
  f.api.setStyle('gen2');f.requests[2].onerror();assert.equal(img.hidden,true);assert.equal(f.node('[data-fs-empty]').hidden,false);assert.equal(img.getAttribute('aria-busy'),'false');
  f.node('[data-fs-retry]').fire('click');f.requests[3].onload();assert.equal(img.hidden,false);
});
test('public package has no artwork or private reference identifiers; local dependencies resolve',()=>{
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
  for(const file of walk(dir)){assert.ok(!/\.(png|webp|jpe?g|zip)$/i.test(file),file);const text=fs.readFileSync(file,'utf8');if(!file.endsWith('.test.mjs')){assert.doesNotMatch(text,/libfile_[a-f0-9]{20,}/);assert.doesNotMatch(text,/\/home\/bleve\//);}}
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');for(const[,ref]of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(ref.startsWith('#'))continue;assert.ok(fs.existsSync(path.resolve(dir,ref)),ref);}
  const css=fs.readFileSync(path.join(dir,'vendor/depthfield-tokens.css'),'utf8');assert.doesNotMatch(css,/:root|\[data-theme=/);assert.match(css,/\[data-df="day"\]/);
});

test('TV spatial input reaches summaries, respects Quiet and returns from disclosures',()=>{
  const f=fixture({input:true});f.node('[data-fs-density]').fire('click');f.node('[data-fs-quiet]').fire('click');f.modes[0].focus();
  f.root.fire('keydown',{target:f.modes[0],key:'ArrowDown',preventDefault(){},stopPropagation(){}});
  assert.equal(f.doc.activeElement,f.summary);assert.equal(f.summary.lastScroll.behavior,'instant');
  f.summary.fire('click');assert.equal(f.details.open,true);
  f.root.fire('keydown',{target:f.summary,key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(f.details.open,false);assert.equal(f.doc.activeElement,f.summary);assert.equal(f.root.dataset.density,'tv');
});
