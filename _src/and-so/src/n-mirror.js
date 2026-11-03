// ===== the mirror: AND SO opened inside AND SO, to any depth; devices simulated to the pixel; 6.1 kept as it was =====
// Each window is a sandboxed frame with its own origin, so a copy can never write over your save: it is seeded with
// your progress by message, plays muted until you give it the sound, and sends what it finds back up the chain.
// The copies are the real page (its own source, read before anything changed it), so they can open windows too.
const MIR = { depth: 0, look: '', wins: [], deep: 0, z: 30, open: false, n: 0, v61: null, seeded: false, wasMuted: null };
try { const m = /^andso-mirror:(\d)(?::([a-z0-9-]+))?$/.exec(window.name || ''); if (m) { MIR.depth = +m[1]; MIR.look = m[2] || ''; } } catch (e) {}
const MIR_MAX = 3;
// Current copies are opaque sandbox origins. The creator records its actual serialized origin in srcdoc.
const MIR_PARENT_ORIGIN = document.documentElement.getAttribute('data-andso-parent-origin');
const MIR_MUTES = new Map(), MIR_PARENT_MUTES = new Map();
let mirMuteSerial = 0;
const DEVICES = {
  phone: { name: 'phone', w: 390, h: 844, r: 46 },
  fold: { name: 'foldable, open', w: 768, h: 840, r: 26 },
  tablet: { name: 'tablet', w: 820, h: 1180, r: 22 },
  laptop: { name: 'laptop', w: 1440, h: 900, r: 8 },
  eink: { name: '4:3 e-paper', w: 1024, h: 768, r: 6 },
  tv: { name: '53L TV', w: 1920, h: 1080, r: 4 }
};
const MLOOKS = ['sb-comix', 'sb-knight', 'sb-origami', 'sb-inkblot', 'sb-skein', 'glasshouse', 'sb-daylight', 'peachfall'];
const V61 = ['v6.1.html', 'v6.1/', 'https://stevoblevo.github.io/and-so/v6.1/'];
var dreamBypass = () => false;
const mirAllowed = () => MIR.depth > 0 || stoneOpen(STONE.get('mirror')) || dreamBypass();
const mirUp = msg => { try { if (MIR.depth > 0 && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {} };
const mirPost = (w, msg) => { try { if (w.frame && w.frame.contentWindow) w.frame.contentWindow.postMessage(msg, '*'); } catch (e) {} };

function mirSrc() {
  const S = SELF_SRC; if (!S) return null;
  const q = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;'), end = '<' + '/script>';
  return '<!doctype html><html lang="en" data-andso-parent-origin="' + q(window.origin) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    (S.fonts ? '<link rel="stylesheet" href="' + q(S.fonts) + '">' : '') + '<style id="andso-css">' + S.css + '</style></head><body>' + S.app +
    '<script id="sb-js">' + S.sbj + end + '<script id="andso-js">' + S.js + end + '</body></html>';
}
async function mir61() {
  if (MIR.v61) return MIR.v61;
  for (const u of V61) {
    try { const r = await fetch(u, { cache: 'force-cache' }); if (!r.ok) continue; const s = await r.text(); if (s.length > 40000 && s.includes('AND SO')) { MIR.v61 = s; return s; } } catch (e) {}
  }
  return null;
}

// ---------- the table ----------
function mirrorTable(on) {
  if (on === undefined) on = !MIR.open;
  if (on && !mirAllowed()) { const st = STONE.get('mirror'); caption(`the mirror opens at ${st.need} nougats. the jar has ${GAME.nougats}.`, 2800); return; }
  if (on === MIR.open) { if (on && !MIR.wins.length) mirOpen('self', 'phone'); return; }
  MIR.open = on; const el = $('mirror'); el.classList.toggle('on', on); el.setAttribute('aria-hidden', String(!on));
  if (on) {
    if (!MIR.wins.length) mirOpen('self', phone ? 'phone' : 'phone');
    if (UNL.pet && MIR.depth === 0) { pet.say = 'i can see the other window from here.'; pet.sayUntil = t + 5; }
    jlog('opened the mirror');
  } else { mirCloseAll(); jlog('closed the mirror'); }
  syncUI();
}
function mirOpen(kind, dev, look) {
  if (kind === 'self' && MIR.depth >= MIR_MAX) { caption("that's as deep as the mirror goes. three windows down, the copy stops copying.", 3200); return null; }
  const lim = MIR.depth ? 2 : phone ? 1 : 4;
  if (MIR.wins.length >= lim) { caption(lim === 1 ? 'one window at a time on a screen this size.' : `${lim} windows at a time. close one to open another.`, 2600); return null; }
  const D = DEVICES[dev] || DEVICES.phone, id = ++MIR.n;
  look = look || MLOOKS[(id - 1 + MIR.depth * 3) % MLOOKS.length];
  const el = document.createElement('div'); el.className = 'mw'; el.dataset.dev = dev; el.setAttribute('role', 'group');
  el.setAttribute('aria-label', `${kind === '61' ? 'AND SO 6.1' : 'AND SO, inside AND SO'}, as a ${D.name}`);
  const fit = Math.min((W * (phone ? 0.84 : 0.34)) / D.w, ((H - 120) * (phone ? 0.7 : 0.72)) / D.h, 1);
  const w = { id, kind, dev, look, el, k: fit, rot: 0, x: 0, y: 0, min: false, frame: null, ready: false, sound: false, deep: 0, tilt: rand(-1.4, 1.4) };
  el.innerHTML = '<div class="mw-bar"><span class="mw-dev" aria-hidden="true"></span><span class="mw-name"></span>' +
    (kind === 'self' && MIR.depth + 1 < MIR_MAX ? '<button class="mw-b" data-a="deeper" title="open a window inside this one" aria-label="open a window inside this one">⧉</button>' : '') +
    '<button class="mw-b" data-a="snd" aria-pressed="false" title="hear this window" aria-label="hear this window">♪</button>' +
    '<button class="mw-b" data-a="rot" title="turn it to face someone else" aria-label="turn the window">⟳</button>' +
    '<button class="mw-b" data-a="min" title="fold it away" aria-label="fold the window away">–</button>' +
    '<button class="mw-b" data-a="close" title="close" aria-label="close the window">×</button></div><div class="mw-screen"></div><div class="mw-grip" aria-hidden="true"></div>';
  el.querySelector('.mw-name').textContent = kind === '61' ? `AND SO 6.1 · ${D.name}` : `AND SO ${ANDSO_VERSION} · ${D.name} · ${SB_NAMES[look] || look}`;
  const n = MIR.wins.length;
  w.x = clamp((phone ? 12 : W * 0.06 + n * W * 0.22) + rand(-10, 10), 8, Math.max(8, W - D.w * fit - 16));
  w.y = clamp((phone ? 70 : 76 + (n % 2) * 40) + rand(-6, 6), 56, Math.max(56, H - D.h * fit - 60));
  MIR.wins.push(w); $('mirTable').appendChild(el); mirLayout(w); mirFront(w); mirWire(w);
  const scr = el.querySelector('.mw-screen'), f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');   // its own opaque origin: it cannot read or write your save
  f.setAttribute('allow', 'autoplay'); f.setAttribute('title', el.getAttribute('aria-label'));
  f.style.width = D.w + 'px'; f.style.height = D.h + 'px';
  w.frame = f; mirLayout(w);
  if (kind === 'self') {
    const src = mirSrc();
    if (!src) { scr.innerHTML = '<p class="mw-note">this copy of AND SO can’t read its own source.</p>'; return w; }
    f.name = `andso-mirror:${MIR.depth + 1}:${look}`; f.srcdoc = src; scr.appendChild(f);
  } else {
    scr.innerHTML = '<p class="mw-note">fetching 6.1…</p>';
    mir61().then(html => {
      if (!w.el.isConnected) return;
      if (!html) { scr.innerHTML = '<p class="mw-note">6.1 lives at its own address: <a href="https://stevoblevo.github.io/and-so/v6.1/" target="_blank" rel="noopener">stevoblevo.github.io/and-so/v6.1</a></p>'; return; }
      scr.textContent = ''; f.name = 'andso-61'; f.srcdoc = html; scr.appendChild(f); discover('x-61');
    });
  }
  discover('x-device'); if (dev === 'tv' || dev === 'eink') discover('x-table');
  jlog(`mirror: ${kind === '61' ? '6.1' : 'a copy'} as a ${D.name}`);
  return w;
}
function mirLayout(w) {
  const D = DEVICES[w.dev], el = w.el, sw = Math.round(D.w * w.k), sh = Math.round(D.h * w.k);
  el.style.left = Math.round(w.x) + 'px'; el.style.top = Math.round(w.y) + 'px'; el.style.width = sw + 16 + 'px';
  el.style.transform = `rotate(${w.rot + (w.rot ? 0 : w.tilt)}deg)`;
  el.classList.toggle('min', w.min);
  const scr = el.querySelector('.mw-screen'); scr.style.width = sw + 'px'; scr.style.height = w.min ? '0px' : sh + 'px'; scr.style.borderRadius = Math.round(D.r * w.k + 4) + 'px';
  if (w.frame) w.frame.style.transform = `scale(${w.k})`;
}
function mirFront(w) { w.el.style.zIndex = String(++MIR.z); }
function mirWire(w) {
  const el = w.el, bar = el.querySelector('.mw-bar'), grip = el.querySelector('.mw-grip');
  let drag = null, rs = null;
  el.addEventListener('pointerdown', () => mirFront(w), true);
  bar.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: w.x, y0: w.y }; try { bar.setPointerCapture(e.pointerId); } catch (er) {} });
  bar.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; w.x = clamp(drag.x0 + e.clientX - drag.x, -w.el.offsetWidth + 80, W - 60); w.y = clamp(drag.y0 + e.clientY - drag.y, 0, H - 40); mirLayout(w); });
  ['pointerup', 'pointercancel'].forEach(n => bar.addEventListener(n, e => { if (drag && e.pointerId === drag.id) drag = null; }));
  grip.addEventListener('pointerdown', e => { e.stopPropagation(); rs = { id: e.pointerId, x: e.clientX, k0: w.k }; try { grip.setPointerCapture(e.pointerId); } catch (er) {} });
  grip.addEventListener('pointermove', e => { if (!rs || e.pointerId !== rs.id) return; const D = DEVICES[w.dev]; w.k = clamp((D.w * rs.k0 + e.clientX - rs.x) / D.w, 0.1, 1.25); mirLayout(w); });
  ['pointerup', 'pointercancel'].forEach(n => grip.addEventListener(n, e => { if (rs && e.pointerId === rs.id) rs = null; }));
  bar.addEventListener('dblclick', e => { if (!e.target.closest('button')) { w.min = !w.min; mirLayout(w); mirPost(w, { andso: 'pause', v: w.min }); } });
  el.querySelectorAll('.mw-b').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'close') mirClose(w);
    else if (a === 'rot') { w.rot = (w.rot + 90) % 360; mirLayout(w); }
    else if (a === 'min') { w.min = !w.min; b.textContent = w.min ? '+' : '–'; mirLayout(w); mirPost(w, { andso: 'pause', v: w.min }); }
    else if (a === 'snd') mirSound(w, !w.sound);
    else if (a === 'deeper') { mirPost(w, { andso: 'deeper' }); discover('x-mirror'); }
  }));
}
function mirSound(w, on) {
  if (w.kind !== 'self') { caption('6.1 makes its own sound once you press Enter inside it.', 2600); return; }
  if (on) {
    MIR.wins.forEach(o => { if (o !== w && o.sound) { o.sound = false; mirPost(o, { andso: 'mute', v: true }); o.el.querySelector('[data-a="snd"]').setAttribute('aria-pressed', 'false'); } });
    if (MIR.wasMuted === null) MIR.wasMuted = muted;
    muted = true; audio.applyMix();
  } else if (MIR.wasMuted !== null) { muted = MIR.wasMuted; MIR.wasMuted = null; audio.applyMix(); }
  w.sound = on; mirPost(w, { andso: 'mute', v: !on }); w.el.querySelector('[data-a="snd"]').setAttribute('aria-pressed', String(on)); syncUI();
}
// Full-output mute travels only down owned current-version frames; acknowledgements travel up one edge.
function mirMuteAll() {
  const targets = MIR.wins.filter(w => w.kind === 'self' && w.frame && w.frame.isConnected);
  MIR.wasMuted = null; // Closing a previously audible mirror must not restore pre-mute sound.
  if (!targets.length) return Promise.resolve({ ok: true, count: 0 });
  const id = String(++mirMuteSerial);
  return new Promise(resolve => {
    const request = { waiting: new Set(targets), results: [], timer: null, finish: null };
    request.finish = () => {
      clearTimeout(request.timer); MIR_MUTES.delete(id);
      for (const w of targets) {
        const busy = [...MIR_MUTES.values()].some(r => r.waiting.has(w));
        const button = w.el.querySelector('[data-a="snd"]');
        button.disabled = busy; button.setAttribute('aria-busy', String(busy));
      }
      resolve({ ok: request.waiting.size === 0 && request.results.every(r => r.ok),
        count: request.results.reduce((n, r) => n + (r.ok ? 1 + r.count : 0), 0) });
    };
    MIR_MUTES.set(id, request);
    request.timer = setTimeout(request.finish, 4000);
    for (const w of targets) {
      w.sound = false;
      const button = w.el.querySelector('[data-a="snd"]');
      button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-busy', 'true'); button.disabled = true;
      if (w.ready) mirPost(w, { andso: 'mute-all', id });
    }
  });
}
function mirMuteClosed(w) {
  // A removed frame has no remaining outputs; don't wait for a message from its destroyed document.
  for (const request of MIR_MUTES.values()) if (request.waiting.delete(w)) {
    request.results.push({ ok: true, count: 0 });
    if (!request.waiting.size) request.finish();
  }
}
function mirMuteMessage(e, d, w) {
  if (d.andso !== 'mute-all' && d.andso !== 'muted-all') return false;
  if (typeof d.id !== 'string' || !/^[1-9][0-9]{0,8}$/.test(d.id)) return true;
  if (d.andso === 'muted-all') {
    const request = MIR_MUTES.get(d.id);
    if (!w || w.kind !== 'self' || !w.frame.isConnected || e.origin !== 'null' || !request || !request.waiting.has(w)) return true;
    if (typeof d.ok !== 'boolean' || !Number.isInteger(d.count) || d.count < 0 || d.count > 64) return true;
    request.waiting.delete(w); request.results.push({ ok: d.ok, count: d.count });
    if (!request.waiting.size) request.finish();
  } else if (MIR.depth > 0 && MIR_PARENT_ORIGIN !== null && e.source === window.parent && e.origin === MIR_PARENT_ORIGIN) {
    // Repeated delivery acknowledges the same operation; it never starts another downward broadcast.
    if (!MIR_PARENT_MUTES.has(d.id)) {
      MIR_PARENT_MUTES.set(d.id, muteAllHere());
      if (MIR_PARENT_MUTES.size > 16) MIR_PARENT_MUTES.delete(MIR_PARENT_MUTES.keys().next().value);
    }
    MIR_PARENT_MUTES.get(d.id).then(result => {
      window.parent.postMessage({ andso: 'muted-all', id: d.id, ok: result.ok, count: result.count }, MIR_PARENT_ORIGIN === 'null' ? '*' : MIR_PARENT_ORIGIN);
    }).catch(() => { /* parent will report an unconfirmed mirror, never success */ });
  }
  return true;
}

function mirClose(w) {
  if (w.sound) mirSound(w, false);
  try { w.frame && w.frame.remove(); } catch (e) {}
  w.el.remove(); mirMuteClosed(w); MIR.wins = MIR.wins.filter(x => x !== w); mirDeep();
  if (!MIR.wins.length && MIR.open) mirrorTable(false);
}
function mirCloseAll() { MIR.wins.slice().forEach(w => { if (w.sound) mirSound(w, false); try { w.frame && w.frame.remove(); } catch (e) {} w.el.remove(); mirMuteClosed(w); }); MIR.wins = []; mirDeep(); }
function mirDeep() {
  MIR.deep = MIR.wins.filter(w => w.kind === 'self' && w.ready).reduce((m, w) => Math.max(m, 1 + w.deep), 0);
  mirUp({ andso: 'deep', v: MIR.deep });
  if (MIR.depth + MIR.deep >= 3) discover('x-mirror3');
}

// ---------- messages, up and down the chain ----------
window.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object' || typeof d.andso !== 'string') return;
  const w = MIR.wins.find(x => x.frame && x.frame.contentWindow === e.source);
  if (mirMuteMessage(e, d, w)) return;
  if (w) {
    if (d.andso === 'ens') { if (typeof ensRecv === 'function') ensRecv(d, e.source); return; }
    if (d.andso === 'hello') { w.ready = true; mirPost(w, { andso: 'seed', save: snapshot() }); mirPost(w, { andso: 'mute', v: !w.sound }); for (const [id, request] of MIR_MUTES) if (request.waiting.has(w)) mirPost(w, { andso: 'mute-all', id }); mirDeep(); discover('x-mirror'); }
    else if (d.andso === 'deep') { w.deep = clamp(+d.v || 0, 0, 9); mirDeep(); }
    else if (d.andso === 'found' && typeof d.id === 'string' && CATI.has(d.id)) discover(d.id);
    else if (d.andso === 'nougat') { const r = w.el.getBoundingClientRect(); nougat(clamp(+d.n || 1, 1, 3), r.left + r.width / 2, r.top + 24, 'found inside the mirror'); }
    return;
  }
  if (MIR.depth > 0 && e.source === window.parent) {
    if (d.andso === 'ens') { if (typeof ensRecv === 'function') ensRecv(d, e.source); return; }
    if (d.andso === 'seed' && d.save && typeof d.save === 'object') {
      applySave(d.save, true); SET.haptics = false; SET.motion = false; MIR.seeded = true; checkUnlocks(true); renderGuide(); scoreUI(); jarPaint(false); syncQuietUI(); syncArticUI();
      if (MIR.look && SKINS.includes(MIR.look)) setSkin(MIR.look);
    } else if (d.andso === 'mute') { muted = !!d.v; audio.applyMix(); if (!muted && A.ac && A.ac.state === 'suspended') try { A.ac.resume(); } catch (er) {} syncUI(); }
    else if (d.andso === 'pause') { paused = !!d.v; try { if (A.ac) { if (paused) A.ac.suspend(); else A.ac.resume(); } } catch (er) {} }
    else if (d.andso === 'look' && SKINS.includes(d.v)) setSkin(d.v);
    else if (d.andso === 'deeper') mirrorTable(true);
  }
});
// a copy starts inside: no title page, no sound until asked, a lighter canvas, and a badge that says how deep it is
function mirBoot() {
  if (MIR.depth === 0) return;
  muted = true; dprScale = 0.85; SET.haptics = false; SET.motion = false;
  document.body.classList.add('mirrored'); document.documentElement.dataset.depth = String(MIR.depth);
  const b = $('mirBadge'); if (b) { b.classList.remove('hidden'); b.setAttribute('aria-label', `inside the mirror, ${MIR.depth} deep`); b.querySelector('b').textContent = '×' + MIR.depth; }
  setTimeout(() => { if (!entered) $('enter').click(); }, 250);
  mirUp({ andso: 'hello', ver: ANDSO_VERSION, depth: MIR.depth });
}
