'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const workspace = JSON.parse(read('saelion.workspace.json'));
const exact = 'https://anewgam-steven-cockpit.stevoblevo.chatgpt.site/talk?source=cockpit-talk-door';
const warning = 'Opens your private Talk site in a new tab with ChatGPT sign-in. Local drafts are not sent. Talk requires a network connection.';
function renderedDoors() {
  const nodes = new Map(), events = {};
  function element(tagName) { return {tagName, dataset:{}, style:{}, attrs:{}, children:[], setAttribute(k,v){this.attrs[k]=v;}, addEventListener(){}, replaceChildren(){this.children=[];}, append(el){this.children.push(el);}, after(el){nodes.set(el.id,el);}}; }
  const bar = element('nav'); nodes.set('doors',bar); nodes.set('door-note',element('p'));
  const window = {addEventListener:(name,fn)=>{events[name]=fn;}}, location={hash:''};
  vm.runInNewContext(read('anewgam-for-steven-cockpit/doors.js'),{window,location,document:{getElementById:id=>nodes.get(id),createElement:element}});
  return {window,location,events,nodes,bar,talk:bar.children.find(el=>el.dataset.door==='talk')};
}
test('the supplied private door is navigation only, not a new canonical home or AI backend', () => {
  const door=workspace.externalDoors.talk;
  assert.equal(door.url,exact);
  assert.equal(door.effect,'navigation-only');
  for (const key of ['localDraftTransfer','conversationVerified','sourceRepositoryVerified']) assert.equal(door[key],false);
  assert.equal(workspace.home.repository,'stevoblevo/stevoblevo.github.io');
  assert.equal(workspace.ingress.mode,'local-only');
  assert.equal(workspace.ingress.remoteAuthority,'none');
});
test('the URL carries only the fixed door marker, never a prompt or return token', () => {
  const url=new URL(workspace.externalDoors.talk.url);
  assert.equal(url.protocol,'https:');
  assert.equal(url.username+url.password+url.hash,'');
  assert.equal(url.pathname,'/talk');
  assert.deepEqual([...url.searchParams],[['source','cockpit-talk-door']]);
});
test('the static home link matches the workspace, opens separately and suppresses referrers', () => {
  const html=read('index.html'), links=html.match(/<a\b[^>]*\bdata-sae-talk\b[^>]*>/g)||[];
  assert.equal(links.length,1);
  const a=Object.fromEntries([...links[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  assert.equal(a.href,exact); assert.equal(a.target,'_blank');
  assert.deepEqual(new Set(a.rel.split(/\s+/)),new Set(['noopener','noreferrer']));
  assert.equal(a.referrerpolicy,'no-referrer'); assert.equal(a.onclick,undefined); assert.equal(a.ping,undefined);
  assert.equal(a['aria-describedby'],'talk-door-note');
  assert.ok(html.includes('id="talk-door-note">'+warning));
  assert.equal(html.split(exact).length-1,1);
});
test('the existing cockpit door renderer makes the same isolated, touch-sized anchor', () => {
  const {talk,window,nodes}=renderedDoors();
  assert.equal(talk.tagName,'a'); assert.equal(talk.href,exact);
  assert.equal(talk.target,'_blank'); assert.equal(talk.rel,'noopener noreferrer');
  assert.equal(talk.referrerPolicy,'no-referrer'); assert.equal(talk.style.minHeight,'44px');
  assert.equal(talk.attrs['aria-describedby'],'talk-door-note');
  assert.equal(nodes.get('talk-door-note').textContent,warning);
  assert.equal(window.__anewDoors.find(d=>d.id==='talk').live,false);
});
test('repainting or selecting Talk does not duplicate the note or advertise a live backend', () => {
  const {nodes,location,events,bar}=renderedDoors(), note=nodes.get('talk-door-note');
  location.hash='#talk'; events.hashchange(); events.hashchange();
  assert.equal(nodes.get('talk-door-note'),note);
  assert.equal(bar.children.filter(el=>el.dataset.door==='talk').length,1);
  assert.equal(nodes.get('door-note').textContent,'External private door: '+warning);
});
test('no eager private-site request, message form or iframe is introduced', () => {
  const home=read('index.html'), doors=read('anewgam-for-steven-cockpit/doors.js');
  assert.doesNotMatch(doors,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|postMessage)\b/);
  assert.doesNotMatch(home,/<(?:iframe|form)[^>]*(?:src|action)="https:\/\/anewgam-steven-cockpit/);
});
test('the existing capture, loom and storage identity remain available', () => {
  const html=read('anewgam-for-steven-cockpit/index.html');
  for (const id of ['dropForm','dropInput','holdBtn','loom','exportState']) assert.ok(html.includes(`id="${id}"`));
  assert.equal(workspace.ingress.storageKey,'anewgam.steven.cockpit.v2');
  assert.equal(workspace.routes.peachfall,'/peachfall/');
});
test('the cockpit worker never intercepts or caches the private Talk URL', () => {
  const listeners={};
  vm.runInNewContext(read('anewgam-for-steven-cockpit/sw.js'),{
    URL,
    self:{location:{href:'https://home.example/anewgam-for-steven-cockpit/sw.js'},addEventListener:(name,callback)=>{listeners[name]=callback;}},
    caches:{open:()=>{throw Error('Private route attempted to open a cache');}}
  });
  for (const url of [exact,'https://home.example/api/talk','https://home.example/anewgam-for-steven-cockpit/?token=test']) {
    let intercepted=false;
    listeners.fetch({request:{method:'GET',url},respondWith:()=>{intercepted=true;}});
    assert.equal(intercepted,false,url);
  }
});
test('the concurrent Magwena door and offline assets are preserved', () => {
  const {bar}=renderedDoors();
  assert.equal(bar.children.filter(el=>el.href==='./magwena/').length,1);
  assert.ok(read('index.html').includes('href="anewgam-for-steven-cockpit/magwena/"'));
  const sw=read('anewgam-for-steven-cockpit/sw.js');
  for (const file of ['../shared/magwena-postcard.js','./magwena/','./magwena/index.html','./magwena/view.js','./magwena/view.css','./magwena/touch.css']) assert.ok(sw.includes("'"+file+"'"));
});
