const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

function galleryHarness() {
  const nodes = new Map(), events = {}, requests = [], timers = new Map();
  let clock = 0;
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      handlers: {}, style: {}, dataset: {}, attrs: {}, isConnected: true,
      addEventListener(k, f) { this.handlers[k] = f; },
      setAttribute(k, v) { this.attrs[k] = v; },
      focus() { doc.activeElement = this; },
      showModal() { this.open = true; },
      close() { this.open = false; this.handlers.close?.(); },
    });
    return nodes.get(selector);
  }
  const classes = new Set();
  const doc = { querySelector: node, activeElement: node('opener'), body: { classList: {
    add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
  } }, documentElement: { dataset: {} } };
  const location = { hash: '#library' };
  const history = { state: null,
    pushState(s, _, h) { this.state = s; location.hash = h; },
    replaceState(s, _, h) { this.state = s; location.hash = h; },
    back() { location.hash = '#library'; this.state = null; events.popstate(); },
  };
  const items = ['a', 'b', 'c'].map(id => ({ id, title: id, image: '/' + id + '.png', width: 1200, height: 1600, bytes: 1000 }));
  const context = { document: doc, location, history, Map, CustomEvent: class {},
    window: { __libraryItems: items, addEventListener: (k, f) => events[k] = f, dispatchEvent() {} },
    Image: class { constructor() { requests.push(this); } },
    setTimeout: (fn, delay) => { const id = ++clock; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(read('gallery.js'), context);
  return { node, requests, timers, context, open: id => context.window.__openGallery(id), click: id => node(id).handlers.click() };
}

test('a successful original arriving after 20 seconds recovers from the timeout', () => {
  const h = galleryHarness(); h.open('a');
  const timeout = [...h.timers.values()][0]; assert.equal(timeout.delay, 20000); timeout.fn();
  assert.equal(h.node('#ya-img').hidden, true); assert.equal(h.node('#ya-error').hidden, false);
  h.requests[0].onload();
  assert.equal(h.node('#ya-img').src, '/a.png'); assert.equal(h.node('#ya-img').hidden, false);
  assert.equal(h.node('#ya-error').hidden, true); assert.equal(h.node('#ya-img').attrs['aria-busy'], 'false');
});

test('retry, rapid next/back and close ignore stale success and error callbacks', () => {
  const h = galleryHarness(); h.open('a');
  const lateLoad = h.requests[0].onload, lateError = h.requests[0].onerror;
  h.requests[0].onerror(); h.click('#ya-retry');
  h.requests[1].onload(); assert.equal(h.node('#ya-img').src, '/a.png');
  lateError(); assert.equal(h.node('#ya-error').hidden, true);
  h.click('#ya-next'); const bLoad = h.requests[2].onload;
  h.click('#ya-prev'); h.requests[3].onload();
  bLoad(); lateLoad(); assert.equal(h.node('#ya-img').src, '/a.png');
  const afterClose = h.requests[3].onerror; h.click('#ya-close'); afterClose();
  assert.equal(h.node('#ya-stage').open, false); assert.equal(h.node('#ya-error').hidden, true);
  assert.equal(h.node('#ya-img').attrs['aria-busy'], 'false');
});

test('spatial navigation includes summaries and reads Quiet and OS motion preferences on every move', () => {
  const source = read('vendor/storeybrook.js');
  let quiet = false, osReduced = false, selector, scrollBehavior;
  const details = { open: false, querySelector: () => summary };
  const make = (left, top) => ({
    getBoundingClientRect: () => ({ left, top, width: 100, height: 48 }),
    closest: s => s === 'details[open]' && details.open ? details : null,
    focus() { doc.activeElement = this; },
    scrollIntoView(o) { scrollBehavior = o.behavior; },
  });
  const start = make(0, 0), summary = make(0, 100);
  summary.click = () => { details.open = !details.open; };
  const doc = { body: { classList: { contains: () => quiet } }, activeElement: start,
    querySelector: () => null, addEventListener() {} };
  const c = { d: doc, w: { matchMedia: () => ({ matches: osReduced }) },
    look: () => 'daylight', $: () => null, $$: s => { selector = s; return [start, summary]; },
    getComputedStyle: () => ({ visibility: 'visible' }), emit() {},
  };
  const reduced = source.match(/  function reduced\(\).*\n/)[0];
  const section = source.slice(source.indexOf('  var FOCUSABLE'), source.indexOf('  /* ---------- read aloud'));
  vm.runInNewContext(reduced + section, c);
  c.nav.move('down'); assert.ok(selector.includes('summary')); assert.equal(doc.activeElement, summary);
  assert.equal(scrollBehavior, 'smooth'); summary.click(); assert.equal(details.open, true);
  assert.equal(c.nav.back(), true); assert.equal(details.open, false); assert.equal(doc.activeElement, summary);
  quiet = true; doc.activeElement = start; c.nav.move('down'); assert.equal(scrollBehavior, 'auto');
  quiet = false; osReduced = true; doc.activeElement = start; c.nav.move('down'); assert.equal(scrollBehavior, 'auto');
  osReduced = false; doc.activeElement = start; c.nav.move('down'); assert.equal(scrollBehavior, 'smooth');
});

test('cockpit Back integration lets shared disclosures and dialogs close before returning to garden', () => {
  const match = read('world.js').match(/nav.back=\(\)=>\{.*?\};/)[0];
  let handled = true;
  const c = { nav: {}, originalBack: () => handled, location: { hash: '#workshop' } };
  vm.runInNewContext(match, c);
  assert.equal(c.nav.back(), true); assert.equal(c.location.hash, '#workshop');
  handled = false; assert.equal(c.nav.back(), true); assert.equal(c.location.hash, '#garden');
});

function webpSize(file) {
  const b = fs.readFileSync(file), kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; }
  assert.equal(kind, 'VP8 '); return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
test('Peachfall srcset widths match every WebP file; Goober discovery retains full-frame originals', () => {
  const items = JSON.parse(read('art-inventory.json')).items;
  for (const item of items.filter(x => x.display)) {
    for (const key of ['thumbnail', 'display']) {
      assert.deepEqual([item[key + 'Width'], item[key + 'Height']], webpSize(path.join(__dirname, '..', item[key])), item.id + ' ' + key);
    }
  }
  for (const id of ['orig-crossing', 'orig-garden', 'orig-sanctuary']) {
    const item = items.find(x => x.id === id); assert.equal(item.thumbnail, item.image);
  }
});

test('turning Quiet or reduced motion on during a visit cancels running movement', () => {
  const source = read('world.js');
  let listener, cancelled = 0, stopped = 0;
  const pref = { matches: false, addEventListener: (kind, cb) => { assert.equal(kind, 'change'); listener = cb; } };
  const classes = new Set(), toggle = (key, on) => on ? classes.add(key) : classes.delete(key);
  const c = { matchMedia: () => pref, root: { classList: { toggle } },
    document: { body: { classList: { toggle } }, getAnimations: () => [{ cancel: () => cancelled++ }] },
    window: { scrollX: 2, scrollY: 9, scrollTo: opts => { assert.equal(opts.behavior, 'instant'); assert.equal(opts.top, 9); stopped++; } },
    $: () => ({ setAttribute() {} }),
  };
  vm.runInNewContext(source.slice(source.indexOf('  const motionPreference'), source.indexOf('  quiet(!!state')), c);
  c.quiet(true); assert.ok(classes.has('quiet')); assert.equal(cancelled, 1); assert.equal(stopped, 1);
  c.quiet(false); assert.ok(!classes.has('quiet'));
  pref.matches = true; listener(); assert.equal(cancelled, 2); assert.equal(stopped, 2);
  pref.matches = false; listener(); assert.equal(cancelled, 2);
});
