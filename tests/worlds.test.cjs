const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('every local world resolves to actual source; every playable game has Watch and the common way home', async () => {
  const {validateWorlds, prepareWorlds} = await import('../tools/worlds.mjs');
  const workspace = JSON.parse(fs.readFileSync(path.join(root, 'saelion.workspace.json')));
  validateWorlds(workspace.worlds);
  const projected = await prepareWorlds(root);
  for (const world of projected) {
    assert.equal('repository' in world, false);
    if (!world.href?.startsWith('/')) continue;
    let file = new URL(world.href, 'https://example.invalid').pathname.slice(1);
    if (file.endsWith('/')) file += 'index.html';
    assert.ok(fs.existsSync(path.join(root, file)), world.id + ': route missing');
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /shared\/ways.js/, world.id + ': common way home missing');
    if (world.kind === 'game') {
      assert.equal(world.watch, true, world.id + ': Watch missing');
      for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
        const script = src.startsWith('/') ? src.slice(1) : path.posix.join(path.posix.dirname(file), src);
        assert.ok(fs.existsSync(path.join(root, script.split('?')[0])), world.id + ': script missing ' + src);
      }
    }
  }
  const projectedContext = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'shared/worlds.js'),'utf8'), {window:projectedContext});
  assert.deepEqual(JSON.parse(JSON.stringify(projectedContext.__saeWorlds)), projected);
});

test('unsafe routes, duplicate identities and fake Watch on unavailable worlds are rejected', async () => {
  const {validateWorlds} = await import('../tools/worlds.mjs');
  const home = {id:'cockpit',title:'Home',kind:'home',href:'/anewgam-for-steven-cockpit/',note:'Home'};
  for (const href of ['javascript:alert(1)','//outside.example/','http://private.local/']) assert.throws(() => validateWorlds([home,{...home,id:'other',href}]));
  assert.throws(() => validateWorlds([home,home]));
  assert.throws(() => validateWorlds([home,{...home,id:'seed',kind:'seed',watch:true}]));
});

test('watchable Nougat paths reach both endings without a remote provider', () => {
  const api = require('../anewgam-for-steven-cockpit/chapters/nougat/nougat.js');
  for (const path of [['weave','light','gift','handoff','cross','share'],['light','handoff','cross','rest']]) {
    const state = api.replay(path.map(type=>({type})));
    assert.equal(state.ended, true);
    assert.equal(state.crossed, true);
    assert.equal(state.gift, path.includes('gift'));
  }
});
