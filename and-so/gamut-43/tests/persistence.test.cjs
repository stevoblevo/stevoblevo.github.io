// Run: node --test and-so/gamut-43/tests/persistence.test.cjs
// Requires Playwright and Chromium; set CHROMIUM_PATH to use another executable.
// GAMUT_HTML can point at an immutable earlier edition to reproduce the regression.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const htmlPath = process.env.GAMUT_HTML || path.join(__dirname, '..', 'index.html');
const FOUND = 'andso-field-guide-v1';
const PRESETS = 'andso-presets-v1';
const UNLOCK = 'andso-unlock-all-v1';
let server, browser, url;

test.before(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(htmlPath));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/and-so/gamut-43/`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
});
test.after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.addInitScript(({ seed, denied, quota, api, readFailure, writeFailure, nullWrite, delayed, holdReads, readHangs, writeHangs }) => {
    if (!localStorage.getItem('__gamut_test_seeded')) {
      for (const [key, value] of Object.entries(seed || {})) localStorage.setItem(key, value);
      localStorage.setItem('__gamut_test_seeded', '1');
    }
    if (api) {
      window.__storageCalls = [];
      const readsReleased = new Promise(resolve => (window.__releaseStorageReads = resolve));
      const writesReleased = new Promise(resolve => (window.__releaseStorageWrites = resolve));
      window.storage = {
        async get(key, shared) {
          window.__storageCalls.push(['get', key, shared]);
          if (holdReads || readHangs) await readsReleased;
          if (delayed) await new Promise(r => setTimeout(r, 80));
          if (readFailure) throw new DOMException('Storage denied', 'SecurityError');
          const value = localStorage.getItem('api:' + key);
          return value === null ? null : { key, value, shared };
        },
        async set(key, value, shared) {
          window.__storageCalls.push(['set', key, shared, value]);
          if (writeHangs) await writesReleased;
          if (delayed) await new Promise(r => setTimeout(r, value.includes('first') && !value.includes('second') ? 120 : 10));
          if (writeFailure) throw new DOMException('Storage full', 'QuotaExceededError');
          if (nullWrite) return null;
          localStorage.setItem('api:' + key, value);
          return { key, value, shared };
        },
      };
    }
    if (quota) {
      window.__quotaDenied = true;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (window.__quotaDenied) throw new DOMException('Storage full', 'QuotaExceededError');
        return setItem.apply(this, args);
      };
    }
    if (denied) Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
  }, options);
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'page must not raise uncaught JavaScript errors'));
  await page.goto(url);
  if (!options.holdReads) await ready(page);
  return page;
}
async function ready(page) {
  await page.waitForFunction(() => {
    const status = document.querySelector('#gSave');
    return status && status.textContent.trim() && status.dataset.state !== 'loading' && !document.querySelector('#pSave').disabled;
  });
}
async function reload(page) { await page.reload(); await ready(page); }
async function click(page, id) { await page.evaluate(id => document.getElementById(id).click(), id); }
async function discover(page) { await page.evaluate(() => { for (let i = 0; i < 4; i++) document.getElementById('zIn').click(); }); }
async function savePreset(page, name) {
  await page.evaluate(name => { document.getElementById('pName').value = name; document.getElementById('pSave').click(); }, name);
}
async function selectPreset(page, name) { await page.evaluate(name => { document.getElementById('pSel').value = 'u:' + name; }, name); }
async function raw(page, key) { return page.evaluate(key => localStorage.getItem(key), key); }
async function hasPreset(page, name) { return page.locator(`#pSel option`).evaluateAll((options, name) => options.some(o => o.value === 'u:' + name), name); }
async function sessionCaption(page) {
  await page.waitForFunction(() => /session only|not saved|could not save|couldn't save|unavailable/i.test(document.getElementById('cap').textContent));
  assert.doesNotMatch(await page.locator('#cap').textContent(), /^saved:/i);
}

test('ordinary browser reload retains discoveries, a usable preset, and unlock-all; deletion persists', async t => {
  const page = await visit(t);
  await discover(page);
  assert.equal(await page.locator('.gi.f').count(), 1);
  await page.evaluate(() => document.querySelector('#themeBtns [data-th="dawn"]').click());
  await savePreset(page, 'reload proof');
  await page.waitForFunction(() => /saved: reload proof/.test(document.getElementById('cap').textContent));
  await click(page, 'bSkip');
  await page.waitForFunction(key => localStorage.getItem(key) === '1', UNLOCK);
  assert.ok(JSON.parse(await raw(page, FOUND)).includes('x-zoom'));
  assert.equal(JSON.parse(await raw(page, PRESETS))['reload proof'].theme, 'dawn');
  await reload(page);
  assert.equal(await page.locator('.gi.f').count(), 1);
  assert.equal(await hasPreset(page, 'reload proof'), true);
  assert.equal(await page.locator('#unl b').count(), 4);
  await click(page, 'enter');
  await selectPreset(page, 'reload proof');
  await click(page, 'pLoad');
  await page.waitForFunction(() => document.body.dataset.theme === 'dawn');
  await click(page, 'pDel');
  await page.waitForFunction(key => !JSON.parse(localStorage.getItem(key))['reload proof'], PRESETS);
  await reload(page);
  assert.equal(await hasPreset(page, 'reload proof'), false);
});

test('existing v1 browser data loads unchanged and discovery count restores earned unlocks', async t => {
  const discovery = JSON.stringify(['x-first', 'x-full', 'x-fling']);
  const preset = JSON.stringify({ legacy: { mode: 'just', theme: 'dawn', set: { vol: 0.42 } } });
  const page = await visit(t, { seed: { [FOUND]: discovery, [PRESETS]: preset } });
  assert.equal(await page.locator('.gi.f').count(), 3);
  assert.equal(await page.locator('#unl b').count(), 2);
  assert.equal(await hasPreset(page, 'legacy'), true);
  assert.equal(await raw(page, FOUND), discovery);
  assert.equal(await raw(page, PRESETS), preset);
});

test('denied browser storage keeps the experience usable and reports a session-only preset', async t => {
  const page = await visit(t, { denied: true });
  await discover(page);
  await savePreset(page, 'temporary');
  await sessionCaption(page);
  assert.equal(await hasPreset(page, 'temporary'), true);
  assert.match(await page.locator('#gSave').textContent(), /session only|unavailable|not saved/i);
  await click(page, 'bSkip');
  assert.equal(await page.locator('#unl b').count(), 4);
  await reload(page);
  assert.equal(await hasPreset(page, 'temporary'), false);
  assert.equal(await page.locator('.gi.f').count(), 0);
  assert.equal(await page.locator('#unl b').count(), 0);
});

test('quota exhaustion preserves readable saves and never claims a failed write was saved', async t => {
  const old = JSON.stringify({ earlier: { mode: 'just', theme: 'dawn' } });
  const page = await visit(t, { seed: { [FOUND]: '["x-first"]', [PRESETS]: old, [UNLOCK]: '1' }, quota: true });
  assert.equal(await page.locator('.gi.f').count(), 1);
  assert.equal(await hasPreset(page, 'earlier'), true);
  assert.equal(await page.locator('#unl b').count(), 4);
  await discover(page);
  await savePreset(page, 'quota failure');
  await sessionCaption(page);
  assert.match(await page.locator('#gSave').textContent(), /session only|full|quota|not saved/i);
  assert.equal(await raw(page, PRESETS), old);
  assert.equal(await raw(page, FOUND), '["x-first"]');
  await reload(page);
  assert.equal(await hasPreset(page, 'earlier'), true);
  assert.equal(await hasPreset(page, 'quota failure'), false);
  assert.equal(await page.locator('.gi.f').count(), 1);
});

for (const [label, key, value] of [
  ['malformed discovery JSON', FOUND, '{broken'],
  ['wrong discovery schema', FOUND, '{}'],
  ['malformed preset JSON', PRESETS, '{broken'],
  ['wrong preset schema', PRESETS, '[]'],
  ['unsafe nested preset value', PRESETS, '{"bad":{"set":{"vol":"loud"},"box":[null,0]}}'],
  ['wrong unlock value', UNLOCK, 'not-a-boolean'],
]) {
  test(`${label} is reported and the original raw value is preserved`, async t => {
    const page = await visit(t, { seed: { [key]: value } });
    assert.match(await page.locator('#gSave').textContent(), /corrupt|damaged|could not read|couldn't read|unreadable|invalid/i);
    await discover(page);
    await savePreset(page, 'recovery');
    await click(page, 'bSkip');
    await page.waitForTimeout(150);
    assert.equal(await raw(page, key), value);
    await reload(page);
    assert.equal(await raw(page, key), value);
  });
}

test('existing asynchronous window.storage mode retains its v1 values and private flag across reload', async t => {
  const page = await visit(t, { api: true });
  await discover(page);
  await savePreset(page, 'api proof');
  await page.waitForFunction(() => /saved: api proof/.test(document.getElementById('cap').textContent));
  await click(page, 'bSkip');
  await page.waitForFunction(key => localStorage.getItem('api:' + key) === '1', UNLOCK);
  const calls = await page.evaluate(() => window.__storageCalls);
  for (const key of [FOUND, PRESETS, UNLOCK]) {
    assert.ok(calls.some(c => c[0] === 'get' && c[1] === key && c[2] === false), `private read for ${key}`);
    assert.ok(calls.some(c => c[0] === 'set' && c[1] === key && c[2] === false), `private write for ${key}`);
    assert.equal(await raw(page, key), null, 'API mode must not silently write an unrelated browser copy');
  }
  await reload(page);
  assert.equal(await page.locator('.gi.f').count(), 1);
  assert.equal(await hasPreset(page, 'api proof'), true);
  assert.equal(await page.locator('#unl b').count(), 4);
});

test('window.storage read rejection protects API state and does not load an unrelated browser copy', async t => {
  const old = JSON.stringify({ primary: { mode: 'just' } });
  const page = await visit(t, { api: true, readFailure: true, seed: {
    ['api:' + PRESETS]: old,
    [PRESETS]: JSON.stringify({ stale: { mode: 'just' } }),
  } });
  assert.equal(await hasPreset(page, 'stale'), false);
  await savePreset(page, 'temporary');
  await sessionCaption(page);
  assert.equal(await raw(page, 'api:' + PRESETS), old);
  assert.ok(!(await page.evaluate(() => window.__storageCalls)).some(c => c[0] === 'set'));
});

test('window.storage write rejection is handled without false saved feedback or silent fallback', async t => {
  const page = await visit(t, { api: true, writeFailure: true });
  await discover(page);
  await savePreset(page, 'rejected');
  await sessionCaption(page);
  assert.match(await page.locator('#gSave').textContent(), /session only|quota|full|not saved/i);
  assert.equal(await raw(page, PRESETS), null);
  assert.equal(await raw(page, 'api:' + PRESETS), null);
  await reload(page);
  assert.equal(await hasPreset(page, 'rejected'), false);
  assert.equal(await page.locator('.gi.f').count(), 0);
});

test('delayed API writes stay ordered so rapid preset changes survive reload', async t => {
  const page = await visit(t, { api: true, delayed: true });
  await savePreset(page, 'first');
  await savePreset(page, 'second');
  await page.waitForFunction(key => {
    const raw = localStorage.getItem('api:' + key);
    return raw && JSON.parse(raw).first && JSON.parse(raw).second;
  }, PRESETS);
  await page.waitForTimeout(180);
  const stored = JSON.parse(await raw(page, 'api:' + PRESETS));
  assert.ok(stored.first);
  assert.ok(stored.second);
  await reload(page);
  assert.equal(await hasPreset(page, 'first'), true);
  assert.equal(await hasPreset(page, 'second'), true);
});


test('an explicit guide reset persists across browser reload', async t => {
  const page = await visit(t, { seed: { [FOUND]: '["x-first","unknown-from-a-later-edition"]' } });
  assert.equal(await page.locator('.gi.f').count(), 1);
  await click(page, 'gReset');
  await page.waitForFunction(key => localStorage.getItem(key) === '[]', FOUND);
  await reload(page);
  assert.equal(await page.locator('.gi.f').count(), 0);
  assert.equal(await raw(page, FOUND), '[]');
});

test('unknown discovery IDs survive later saves without changing displayed progress', async t => {
  const page = await visit(t, { seed: { [FOUND]: '["x-first","unknown-from-a-later-edition"]' } });
  assert.equal(await page.locator('.gi.f').count(), 1);
  await discover(page);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).includes('x-zoom'), FOUND);
  assert.deepEqual(new Set(JSON.parse(await raw(page, FOUND))), new Set(['x-first', 'unknown-from-a-later-edition', 'x-zoom']));
  await reload(page);
  assert.equal(await page.locator('.gi.f').count(), 2);
});

test('a later successful write recovers from temporary quota exhaustion', async t => {
  const page = await visit(t, { quota: true });
  await savePreset(page, 'first attempt');
  await sessionCaption(page);
  assert.equal(await raw(page, PRESETS), null);
  await page.evaluate(() => (window.__quotaDenied = false));
  await savePreset(page, 'recovered');
  await page.waitForFunction(() => /saved: recovered/.test(document.getElementById('cap').textContent));
  assert.doesNotMatch(await page.locator('#gSave').textContent(), /session only|storage is full/);
  await reload(page);
  assert.equal(await hasPreset(page, 'first attempt'), true);
  assert.equal(await hasPreset(page, 'recovered'), true);
});

test('edits wait for delayed API reads and a discovery during loading merges with old progress', async t => {
  const old = JSON.stringify({ earlier: { mode: 'just', theme: 'dawn' } });
  const page = await visit(t, { api: true, holdReads: true, seed: {
    ['api:' + PRESETS]: old, ['api:' + FOUND]: '["x-first"]',
  } });
  const controls = ['enter', 'gReset', 'pSave', 'pDel', 'bSkip'];
  assert.deepEqual(await page.evaluate(ids => ids.map(id => document.getElementById(id).disabled), controls), controls.map(() => true));
  await savePreset(page, 'too early');
  await click(page, 'gReset');
  await click(page, 'bSkip');
  await discover(page);
  assert.ok(!(await page.evaluate(() => window.__storageCalls)).some(c => c[0] === 'set'));
  await page.evaluate(() => window.__releaseStorageReads());
  await ready(page);
  await page.waitForFunction(key => JSON.parse(localStorage.getItem('api:' + key)).includes('x-zoom'), FOUND);
  assert.equal(await hasPreset(page, 'earlier'), true);
  assert.equal(await hasPreset(page, 'too early'), false);
  assert.equal(await raw(page, 'api:' + PRESETS), old);
  assert.equal(await page.locator('.gi.f').count(), 2);
  assert.equal(await page.locator('#unl b').count(), 1);
  assert.equal(await raw(page, 'api:' + UNLOCK), null);
});

test('a null host save result is treated as failure', async t => {
  const page = await visit(t, { api: true, nullWrite: true });
  await savePreset(page, 'not acknowledged');
  await sessionCaption(page);
  assert.equal(await raw(page, 'api:' + PRESETS), null);
  assert.equal(await raw(page, PRESETS), null);
  await reload(page);
  assert.equal(await hasPreset(page, 'not acknowledged'), false);
});


test('a host read that never settles times out and enables usable session-only controls', async t => {
  const page = await visit(t, { api: true, readHangs: true });
  assert.equal(await page.locator('#pSave').isDisabled(), false);
  assert.match(await page.locator('#gSave').textContent(), /session only|unavailable|timeout|timed out/i);
  await savePreset(page, 'after read timeout');
  await sessionCaption(page);
  assert.equal(await hasPreset(page, 'after read timeout'), true);
  assert.ok(!(await page.evaluate(() => window.__storageCalls)).some(c => c[0] === 'set'));
});

test('an unconfirmed host write times out, blocks retries, and keeps uncertain saves labeled session-only', async t => {
  const page = await visit(t, { api: true, writeHangs: true });
  await savePreset(page, 'unconfirmed first');
  await sessionCaption(page);
  assert.match(await page.locator('#gSave').textContent(), /session only|not confirmed|timeout|timed out/i);
  await savePreset(page, 'session second');
  await sessionCaption(page);
  assert.equal((await page.evaluate(() => window.__storageCalls)).filter(c => c[0] === 'set' && c[1] === 'andso-presets-v1').length, 1);
  // The timed-out host call may still finish. It must not overwrite the warning
  // about the newer in-memory preset, and a second host write must not race it.
  await page.evaluate(() => window.__releaseStorageWrites());
  await page.waitForFunction(key => localStorage.getItem('api:' + key), PRESETS);
  assert.match(await page.locator('#gSave').textContent(), /session only|not confirmed|timeout|timed out/i);
  const late = JSON.parse(await raw(page, 'api:' + PRESETS));
  assert.ok(late['unconfirmed first']);
  assert.equal(late['session second'], undefined);
});
