'use strict';
// Isolated service-worker fixtures, not native-browser or deployment evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../anewgam-for-steven-cockpit/sw.js'), 'utf8');
const origin = 'https://fixture.invalid';
const home = origin + '/anewgam-for-steven-cockpit/';
function fixture(options = {}) {
  const events = {}, calls = [], stored = new Map(options.stored || []);
  const cache = {
    addAll: async paths => {calls.push(['addAll', ...paths]); if (options.installFail) throw Error('fixture install failure');},
    put: async (request, response) => {calls.push(['put', request.url]); stored.set(request.url, response);},
    match: async request => stored.get(typeof request === 'string' ? request : request.url)
  };
  const context = vm.createContext({URL, Response,
    self: {location: {href: home + 'sw.js'}, addEventListener: (name, handler) => {events[name] = handler;},
      skipWaiting: () => calls.push(['skipWaiting']), clients: {claim: () => calls.push(['claim'])}},
    caches: {open: async name => {calls.push(['open', name]); return cache;},
      keys: async () => options.keys || [], delete: async name => {calls.push(['delete', name]); return true;}},
    fetch: async (request, init) => {calls.push(['fetch', request.url, init.cache]);
      if (options.offline) throw Error('fixture offline');
      return new Response('network', {status: options.status || 200});}
  });
  vm.runInContext(source, context, {timeout: 1000});
  const shell = Array.from(vm.runInContext('SHELL', context));
  const name = vm.runInContext('CACHE', context);
  return {shell, name, calls, stored,
    lifecycle: event => {let pending; events[event]({waitUntil: p => {pending = p;}}); return pending;},
    request: (url, options = {}) => {let pending;
      events.fetch({request: {url: new URL(url, home).href, method: options.method || 'GET', mode: options.mode || 'cors'},
        respondWith: p => {pending = p;}}); return pending;}
  };
}

test('combined shell retains art, Magwena and shared continuity with a fresh cache name', () => {
  const f = fixture();
  for (const item of ['./art-arrival.js', './art-links.js', './art-arrival-preview.webp',
    '../shared/magwena-postcard.js', './magwena/', './magwena/index.html', './magwena/view.js',
    './magwena/view.css', './magwena/touch.css', '../shared/ingress.js', './advanced.js', './doors.js'])
    assert.ok(f.shell.includes(item), 'missing shell entry: ' + item);
  assert.equal(new Set(f.shell).size, f.shell.length);
  assert.equal(f.name, 'steven-anewgam-v11-art-home-continuity');
  assert.ok(f.shell.every(item => !/api|\.worktrees|source\/|original\.png/.test(item)));
});
test('installation precaches the complete union before skipWaiting', async () => {
  const f = fixture(); await f.lifecycle('install');
  assert.deepEqual(f.calls, [['open', f.name], ['addAll', ...f.shell], ['skipWaiting']]);
});
test('failed precache rejects installation without skipWaiting', async () => {
  const f = fixture({installFail: true});
  await assert.rejects(f.lifecycle('install'), /fixture install failure/);
  assert.ok(!f.calls.some(call => call[0] === 'skipWaiting'));
});
test('activation retires old cockpit versions but leaves other worlds and the new cache intact', async () => {
  const f = fixture({keys: ['steven-anewgam-v8-art-arrival', 'steven-anewgam-v10-lossless-thread-restore',
    'steven-anewgam-v11-art-home-continuity', 'peachfall-v1', 'goober-v1', 'unrelated']});
  await f.lifecycle('activate');
  assert.deepEqual(f.calls.filter(call => call[0] === 'delete'),
    [['delete', 'steven-anewgam-v8-art-arrival'], ['delete', 'steven-anewgam-v10-lossless-thread-restore']]);
  assert.deepEqual(f.calls.at(-1), ['claim']);
});
test('non-GET, query, cross-origin and non-allowlisted requests are not intercepted', () => {
  const f = fixture();
  for (const [url, options] of [['./art-links.js', {method: 'POST'}], ['./art-links.js?secret=fixture', {}],
    ['https://other.invalid/art-links.js', {}], ['/api/work', {}], ['/.worktrees/peachfall/secret', {}],
    ['/peachfall/', {}], ['./private.json', {}]]) assert.equal(f.request(url, options), undefined);
  assert.deepEqual(f.calls, []);
});
test('allowlisted art fetch revalidates the network and caches only its successful response', async () => {
  const f = fixture(); const response = await f.request('./art-links.js');
  assert.equal(await response.text(), 'network');
  assert.deepEqual(f.calls, [['open', f.name], ['fetch', home + 'art-links.js', 'no-cache'], ['put', home + 'art-links.js']]);
  assert.equal(await f.stored.get(home + 'art-links.js').text(), 'network');
});
test('an HTTP failure is returned honestly rather than cached as a successful shell', async () => {
  const f = fixture({status: 503}); assert.equal((await f.request('./art-links.js')).status, 503);
  assert.ok(!f.calls.some(call => call[0] === 'put'));
});
test('offline art requests use their exact cached asset', async () => {
  const f = fixture({offline: true, stored: [[home + 'art-links.js', new Response('cached art')]]});
  assert.equal(await (await f.request('./art-links.js')).text(), 'cached art');
});
test('offline navigation fallback remains scoped; a missing script is an error, not HTML', async () => {
  const f = fixture({offline: true, stored: [[home + 'index.html', new Response('cached cockpit')]]});
  assert.equal(await (await f.request('./', {mode: 'navigate'})).text(), 'cached cockpit');
  assert.equal((await f.request('./art-links.js')).type, 'error');
  assert.equal(f.request('/api/work', {mode: 'navigate'}), undefined);
});
test('the reconciled read-only workflow retains every existing and art browser suite', () => {
  const text = fs.readFileSync(path.join(__dirname, '../.github/workflows/saelion-one.yml'), 'utf8');
  for (const suite of ['browser.py', 'browser_talk_door.py', 'browser_skein_restore.py', 'art_browser.py'])
    assert.ok(text.includes('python tests/' + suite), 'missing browser suite: ' + suite);
  assert.ok(text.includes('run: npm run check'));
  assert.match(text, /permissions:\s*\n\s+contents: read/);
  assert.match(text, /persist-credentials: false/);
  assert.ok(text.includes('test-results/art-browser'));
});
