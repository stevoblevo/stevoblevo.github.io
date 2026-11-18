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
  dispatchEvent(event){this.fire(event.type,event);}
  click(){if(this.type==='checkbox'){this.checked=!this.checked;this.fire('change');}this.fire('click');}
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
  const fields=[['[data-fs-remember]','INPUT','checkbox'],['[data-fs-theme]','SELECT','select-one'],['#story-note','TEXTAREA','textarea']].map(([selector,tagName,type],i)=>{
    const el=node(selector);el.tagName=tagName;el.type=type;
    el.closest=s=>s==='input,textarea,select,[contenteditable=true]'?el:null;
    el.getBoundingClientRect=()=>({left:0,top:220+i*110,width:300,height:64});return el;
  });
  const modes=MODES.map(mode=>Object.assign(new Element(doc),{dataset:{fsMode:mode}}));
  const views=['scene','keyframes','symbols'].map(view=>Object.assign(new Element(doc),{dataset:{fsView:view}}));
  const summary=new Element(doc),details=new Element(doc);details.open=false;details.querySelector=()=>summary;
  summary.closest=s=>s==='details[open]'&&details.open?details:null;
  summary.addEventListener('click',()=>{details.open=!details.open;});
  summary.getBoundingClientRect=()=>({left:0,top:110,width:300,height:64});
  modes.forEach((el,i)=>{el.getBoundingClientRect=()=>({left:i*110,top:0,width:100,height:64});});
  const frames=[],windowEvents={};
  win.navigator={getGamepads:()=>[]};win.addEventListener=(name,fn)=>{windowEvents[name]=fn;};win.cancelAnimationFrame=()=>{};
  win.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  root.querySelector=s=>s==='dialog[open]'?(node('[data-fs-settings]').open?node('[data-fs-settings]'):null):s.startsWith('[data-fs-mode="')?modes.find(b=>s.includes('"'+b.dataset.fsMode+'"')):node(s);
  root.querySelectorAll=s=>s==='[data-fs-mode]'?modes:s==='[data-fs-view]'?views:s==='summary'?[summary]:[];
  root.children=[...nodes.values(),...modes,...views];
  const assets=Object.fromEntries(MODES.map(mode=>[mode,{scene:'/assets/'+mode+'.png',symbols:'/assets/'+mode+'-symbols.png'}]));
  const oldEvent=globalThis.CustomEvent;globalThis.CustomEvent=class{};
  root.contains=el=>el===root||el===details||el===summary||modes.includes(el)||[...nodes.values()].includes(el);
  const api=mount(root,{assets,...(input?{storeybrook:{nav:{candidates:()=>[...modes,summary,...fields]},mountIcons(){}}}:{})});globalThis.CustomEvent=oldEvent||class{};
  return{api,root,node,modes,views,requests,data,scrolls,media,win,doc,summary,details,fields,frames,windowEvents};
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
test('a temporary style change keeps failed save and failed removal messages visible',()=>{
  const f=fixture({saved:{style:'gen4',remember:true},blocked:true});
  f.api.setStyle('gen2');
  assert.equal(f.api.getState().style,'gen2');
  assert.equal(JSON.parse(f.data.get(STORAGE_KEY)).style,'gen4');
  assert.match(f.node('[data-fs-status]').textContent,/Gen 2\. Same story; your place is kept\..*works for this visit.*could not save it/);
  const remember=f.node('[data-fs-remember]');remember.checked=false;remember.fire('change');
  assert.match(f.node('[data-fs-status]').textContent,/could not clear its saved preferences/);
  f.api.setStyle('skeptic');
  assert.match(f.node('[data-fs-status]').textContent,/Skeptic.*could not clear its saved preferences/);
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

test('TV keyboard navigation enters and leaves checkbox, select and notes without a mouse',()=>{
  const f=fixture({input:true});f.node('[data-fs-density]').fire('click');
  const key=value=>{let prevented=false;f.root.fire('keydown',{target:f.doc.activeElement,key:value,preventDefault(){prevented=true;},stopPropagation(){}});return prevented;};
  f.summary.focus();key('ArrowDown');assert.equal(f.doc.activeElement,f.fields[0]);
  key('Enter');assert.equal(f.fields[0].checked,true);
  key('ArrowDown');assert.equal(f.doc.activeElement,f.fields[1]);
  assert.equal(key('Enter'),false); // Preserve the select's native open action.
  assert.equal(key('ArrowDown'),false); // Native selection while editing.
  assert.equal(f.doc.activeElement,f.fields[1]);
  assert.equal(key('Escape'),true);assert.equal(f.fields[1].getAttribute('data-fs-editing'),null);
  key('ArrowDown');assert.equal(f.doc.activeElement,f.fields[2]);
  f.fields[2].value='Keep my thought';assert.equal(key('Enter'),true);
  assert.equal(key('ArrowLeft'),false);assert.equal(key('Backspace'),false);
  assert.equal(key('BrowserBack'),true);assert.equal(f.fields[2].value,'Keep my thought');
  key('ArrowUp');assert.equal(f.doc.activeElement,f.fields[1]);
  key('ArrowUp');assert.equal(f.doc.activeElement,f.fields[0]);
  const dialog=f.node('[data-fs-settings]');dialog.open=true;
  assert.equal(key('Escape'),true);assert.equal(dialog.open,false);
});

test('regular form editing keeps native arrows, typing, and Backspace',()=>{
  const f=fixture({input:true});f.fields[2].focus();
  for(const key of ['ArrowLeft','ArrowDown','Enter','Backspace','x']){
    let prevented=false;f.root.fire('keydown',{target:f.fields[2],key,preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,false,key);
  }
});

test('simulated gamepad can edit a select, return with B, then navigate away',()=>{
  const f=fixture({input:true});f.node('[data-fs-density]').fire('click');
  const select=f.fields[1];select.options=[{value:'system'},{value:'light'},{value:'dark'}];let selected=0;
  Object.defineProperty(select,'selectedIndex',{get:()=>selected,set:value=>{selected=value;select.value=select.options[value].value;}});
  select.selectedIndex=0;select.focus();
  const pad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};
  f.win.navigator.getGamepads=()=>[pad];f.windowEvents.gamepadconnected();let time=0;
  const press=index=>{pad.buttons.forEach((b,i)=>{b.pressed=i===index;});f.frames.shift()(time+=300);};
  press(0);assert.equal(select.getAttribute('data-fs-editing'),'true');
  press(13);assert.equal(select.selectedIndex,1);assert.equal(f.api.getState().theme,'light');
  press(1);assert.equal(select.getAttribute('data-fs-editing'),null);assert.equal(f.doc.activeElement,select);
  press(13);assert.equal(f.doc.activeElement,f.fields[2]);
});

test('TV typography scales all formerly small rem labels with a 24px minimum',()=>{
  const css=fs.readFileSync(path.join(dir,'four-styles.css'),'utf8');
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selectors,body])=>({selectors:selectors.replace(/\/\*[\s\S]*?\*\//g,'').split(',').map(s=>s.trim()),body}));
  const scope='[data-four-styles][data-density="tv"]';
  const rule=selector=>rules.find(r=>r.selectors.includes(selector))?.body||'';
  const rootRule=rule(scope);
  for(const token of ['ui','small','story']){
    const match=rootRule.match(new RegExp('--fs-tv-'+token+':clamp\\((\\d+)px,'));
    assert.ok(match,token);assert.ok(Number(match[1])>=24,token);
  }
  assert.match(rootRule,/--fs-target:64px/);assert.match(rootRule,/--fs-ring:5px/);
  for(const selector of ['.fs-kicker','.fs-subtle','.fs-notebook label','.fs-footer','.fs-status','.fs-reference'])assert.match(rule(scope+' '+selector),/font-size:var\(--fs-tv-small\)/,selector);
  assert.match(rule(scope+' .fs-switch button'),/font-size:var\(--fs-tv-ui\)/);
  assert.match(rule(scope+' .fs-story'),/font-size:var\(--fs-tv-story\)/);
});

test('uninitialized demos hide inert controls while preserving readable story and native links',()=>{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),css=fs.readFileSync(path.join(dir,'four-styles.css'),'utf8');
  for(const selector of ['fs-header-actions','fs-switch','fs-file','fs-views','fs-status'])assert.match(html,new RegExp('class="'+selector+'" data-fs-needs-js'));
  assert.match(html,/<button[^>]*data-fs-needs-js[^>]*data-bookmark/);
  assert.match(html,/<button[^>]*data-fs-needs-js[^>]*data-fs-retry/);
  assert.match(css,/:not\(\[data-fs-ready="true"\]\) \[data-fs-needs-js\],[\s\S]*?display:none!important/);
  assert.match(html,/data-story-text>Anna waits/);assert.match(html,/<a href="#notebook"/);
  const f=fixture();assert.equal(f.root.dataset.fsReady,'true');f.api.destroy();assert.equal(f.root.dataset.fsReady,undefined);
});
