/* LIVLOCH · wardrobe (0.23): things worn or carried, earned by playing.

   DESIGN
   - Roadmap phase 1, "rewards you can see": stars, goals and Cabinet secrets open things the player's own hero wears or
     carries, in five slots: a trail (what it leaves in the air), a footfall (what each step kicks up), a ring (the light it
     stands in), a light (what rides at its shoulder) and a dash (the afterimage when it hurries). Presentation and saved
     progress only: nothing here writes to the match (W), and no rule or number in the simulation changes.
   - The catalogue is data (WD.ITEMS), in ladder order: the first opens during the first match (the first goal), the next
     when that match ends, then something every match or two for the first ten. First Rains finished carry the ladder
     for anyone who keeps playing (1, 3, 5, 7, 9); stars all told and goals put more on it for anyone who plays well. Unlock rules are pure functions of the
     saved settings (LL.cfg): First Rain stars all told, First Rains finished, goals ever done, Cabinet secrets, lights
     brought back in Ever Fallen, livelock wins per difficulty. tools/test.js runs them under Node.
   - Counting follows the Cabinet: only a person earns things (not "Watch it run", not Dreamwalk; Lean Back counts).
   - Earning: when something opens mid-match, one line in the feed, and the first thing in an empty slot is put on at once.
     The end screen shows what is new, worn by a small painted figure, and the next locked thing and what earns it.
   - Drawing: its own small systems, never gfx.js's particle pool: three instanced quads (light, paper, marks on the
     ground) sharing one atlas of eight shapes, a ring decal under the hero, a light that follows on a spring. No
     allocation per frame. Every material is flagged (lk, bl, solid; meshes rt) so a look's colour map leaves it alone;
     colours are chosen here per look (PAL), so each thing is drawn on purpose in every view. Calm under reduced motion,
     half rate under Lighter graphics. The wardrobe screen and the end screen draw the same shapes in 2D.
   - Hooks, all marked "0.23 wardrobe": gfx.js R.build (WD.build), the top of the hero loop (WD.hero, the player only),
     ghost() (WD.ghost); main.js after loading settings (WD.adopt) and after each event (WD.fx); ui.js exposes feed and
     show; index.html loads this file before gfx.js, plus css/wardrobe.css, the title button and the screen.
   - Saved fields (LL.cfg, localStorage): starsTotal, rains, goalsEver, lightsTotal, winsBy, wear, wardSeen. Old saves get
     defaults and are credited what they can prove (a best star count means a First Rain was finished; Cabinet secrets).
   - The hidden "Cabinet: everything open" switch (five taps on Settings) opens the wardrobe too. It is for testing. */
(function (G) {
'use strict';
const LL = G.LL || (G.LL = {});
const WD = LL.wardrobe = {};
const DIFF = ['Gentle', 'Even', 'Cruel'];

/* ---------- the catalogue ---------- */
WD.SLOTS = [
  { id: 'trail', name: 'Trail', line: 'What you leave in the air behind you', plain: 'Nothing follows you' },
  { id: 'step', name: 'Footfall', line: 'What each step kicks up', plain: 'The valley\'s own dust' },
  { id: 'ring', name: 'Ring', line: 'The light you stand in', plain: 'Your side\'s colour' },
  { id: 'lamp', name: 'Light', line: 'What rides at your shoulder', plain: 'Your hands are your own' },
  { id: 'ghost', name: 'Dash', line: 'The copy you leave when you hurry or ride a thread', plain: 'Your side\'s colour' }
];
/* Ladder order. rule: goal (done once), rains (First Rains finished), stars (First Rain stars all told), cab (a Cabinet
   secret), lights (lights brought back in Ever Fallen, all told), best (stars in one First Rain), win (a livelock won on
   that difficulty). */
WD.ITEMS = [
  { id: 'motes', slot: 'trail', name: 'Lantern motes', line: 'Sparks off a lantern nobody is carrying. They follow you anyway.', rule: { goal: 'orbs' } },
  { id: 'halo', slot: 'ring', name: 'Lantern halo', line: 'A ring of warm light to stand in. The snow under it never quite settles.', rule: { rains: 1 } },
  { id: 'powder', slot: 'step', name: 'Snow powder', line: 'Each step throws a little snow. The valley keeps count.', rule: { stars: 2 } },
  { id: 'lantern', slot: 'lamp', name: 'Paper lantern', line: 'You took a light back from the Hush. This one rides at your shoulder.', rule: { cab: 'snuff' } },
  { id: 'ink', slot: 'ghost', name: 'Ink double', line: 'When you hurry, a stain of you hurries after.', rule: { rains: 3 } },
  { id: 'petals', slot: 'trail', name: 'Petals', line: 'Somebody up the valley is pleased you came. They will not say who.', rule: { stars: 5 } },
  { id: 'moon', slot: 'ghost', name: 'Moonlight double', line: 'A pale copy keeps up for a quarter of a second, then thinks better of it.', rule: { goal: 'echo' } },
  { id: 'fireflies', slot: 'trail', name: 'Fireflies', line: 'They answered the mood before you did, and were too polite to say.', rule: { cab: 'plates' } },
  { id: 'moth', slot: 'lamp', name: 'Moth light', line: 'A small light with wings. It has opinions about lanterns.', rule: { rains: 5 } },
  { id: 'leaf', slot: 'step', name: 'Gold leaf', line: 'A flake of gold under every step. Nobody is sure whose.', rule: { rains: 7 } },
  { id: 'confetti', slot: 'trail', name: 'Folded confetti', line: 'Squares of the valley fall off you as you go. It has plenty.', rule: { stars: 12 } },
  { id: 'compass', slot: 'ring', name: 'Compass rose', line: 'You keep coming back. Here is something to find the way with.', rule: { rains: 9 } },
  { id: 'crane', slot: 'ring', name: 'Crane circle', line: 'Paper cranes, folded from the corners the valley had spare.', rule: { cab: 'knight' } },
  { id: 'jade', slot: 'lamp', name: 'Jade light', line: 'A little of the loch came with you. It hums in a low key.', rule: { cab: 'peachball' } },
  { id: 'splat', slot: 'step', name: 'Ink splats', line: 'You walked back into a fallen valley. It shows.', rule: { lights: 5 } },
  { id: 'moons', slot: 'ring', name: 'Five moons', line: 'Five moons under your feet, all of them full. The rain found nothing.', rule: { best: 5 } },
  { id: 'gilt', slot: 'ghost', name: 'Gilt double', line: 'Cruel, and you won anyway. Your shadow has gone gold about it.', rule: { win: 2 } }
];
const ITEMS = WD.ITEMS, BY = WD.BY = {};
ITEMS.forEach(function (it, i) { it.rank = i; BY[it.id] = it; });
const SLOT = {}; WD.SLOTS.forEach(function (s) { SLOT[s.id] = s; });

/* ---------- saved progress: pure functions of cfg ---------- */
WD.DEFAULTS = { starsTotal: 0, rains: 0, goalsEver: {}, lightsTotal: 0, winsBy: [0, 0, 0], wear: {}, wardSeen: {} };
const nat = function (v) { v = Math.floor(+v); return isFinite(v) && v > 0 ? v : 0; };
const obj = function (v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
/* Repair types and credit an old save with what it can prove. Idempotent. */
WD.fix = function (cfg) {
  cfg.starsTotal = nat(cfg.starsTotal); cfg.rains = nat(cfg.rains); cfg.lightsTotal = nat(cfg.lightsTotal);
  cfg.goalsEver = obj(cfg.goalsEver); cfg.wardSeen = obj(cfg.wardSeen); cfg.unl = obj(cfg.unl);
  const w = Array.isArray(cfg.winsBy) ? cfg.winsBy : []; cfg.winsBy = [nat(w[0]), nat(w[1]), nat(w[2])];
  const wear = obj(cfg.wear), clean = {};
  WD.SLOTS.forEach(function (s) { const v = wear[s.id]; if (v === '') clean[s.id] = ''; else if (typeof v === 'string' && BY[v] && BY[v].slot === s.id) clean[s.id] = v; });
  cfg.wear = clean;
  const best = nat(cfg.bestStars); cfg.starsTotal = Math.max(cfg.starsTotal, best); if (best > 0) cfg.rains = Math.max(cfg.rains, 1);
  return cfg;
};
let saveFn = null;
/* main.js calls this once, after it has read its own settings: the wardrobe's fields get defaults, then the saved values
   (src: the localStorage key, or a parsed save object in tests), then repair. */
WD.adopt = function (cfg, src, save) {
  for (const k in WD.DEFAULTS) if (!(k in cfg)) cfg[k] = JSON.parse(JSON.stringify(WD.DEFAULTS[k]));
  let s = src;
  if (typeof src === 'string') { s = null; try { s = JSON.parse(G.localStorage.getItem(src) || 'null'); } catch (e) {} }
  if (s && typeof s === 'object') for (const k in WD.DEFAULTS) if (k in s) cfg[k] = s[k];
  if (save) saveFn = save;
  return WD.fix(cfg);
};
function prog(cfg, r) {
  if (r.stars) return [nat(cfg.starsTotal), r.stars];
  if (r.rains) return [nat(cfg.rains), r.rains];
  if (r.lights) return [nat(cfg.lightsTotal), r.lights];
  if (r.best) return [nat(cfg.bestStars), r.best];
  if (r.win != null) return [Array.isArray(cfg.winsBy) ? nat(cfg.winsBy[r.win]) : 0, 1];
  if (r.goal) return [cfg.goalsEver && cfg.goalsEver[r.goal] ? 1 : 0, 1];
  if (r.cab) return [cfg.unl && cfg.unl[r.cab] ? 1 : 0, 1];
  return [0, 1];
}
WD.has = function (cfg, it) { if (typeof it === 'string') it = BY[it]; if (!it || !cfg) return false; if (cfg.all) return true; const p = prog(cfg, it.rule); return p[0] >= p[1]; };
WD.progress = function (cfg, it) { const p = prog(cfg, it.rule); return { have: Math.min(p[0], p[1]), want: p[1] }; };
WD.how = function (it) {
  const r = it.rule;
  if (r.goal) { const g = (LL.GOALS || []).find(function (x) { return x.id === r.goal; }); return g ? g.line : r.goal; }
  if (r.cab) { const c = (LL.CABINET || []).find(function (x) { return x.id === r.cab; }); return c && c.feat ? c.feat : 'Open ' + r.cab + ' in the Cabinet'; }
  if (r.rains) return r.rains === 1 ? 'Finish a First Rain' : 'Finish ' + r.rains + ' First Rains';
  if (r.stars) return 'Earn ' + r.stars + ' stars in First Rains, all told';
  if (r.best) return 'Five stars in one First Rain';
  if (r.lights) return 'Bring back ' + r.lights + ' lights in Ever Fallen, all told';
  if (r.win != null) return 'Win the livelock on ' + DIFF[r.win];
  return '';
};
/* "3 of 5" for counted rules, '' for the ones that are done or not done. */
WD.count1 = function (cfg, it) { const p = WD.progress(cfg, it); return p.want > 1 ? p.have + ' of ' + p.want : ''; };
WD.open = function (cfg) { return ITEMS.filter(function (it) { return WD.has(cfg, it); }).map(function (it) { return it.id; }); };
WD.next = function (cfg, n) { const out = []; for (let i = 0; i < ITEMS.length && out.length < (n || 1); i++) if (!WD.has(cfg, ITEMS[i])) out.push(ITEMS[i]); return out; };
/* What is worn in a slot: an item that is still open, or null. */
WD.worn = function (cfg, slot) { const id = cfg && cfg.wear ? cfg.wear[slot] : null, it = id ? BY[id] : null; return it && it.slot === slot && WD.has(cfg, it) ? it : null; };
/* Put an open item on (true), or take a slot off with id ''. A locked item cannot be worn. */
WD.equip = function (cfg, id, slot) {
  if (!cfg.wear) cfg.wear = {};
  if (id === '' || id == null) { if (!SLOT[slot]) return false; cfg.wear[slot] = ''; return true; }
  const it = BY[id]; if (!it || !WD.has(cfg, it)) return false; cfg.wear[it.slot] = id; return true;
};
/* One event of a match a person played: count what the rules read. Returns true if anything changed. */
WD.count = function (cfg, e, W) {
  switch (e.k) {
    case 'goal': if (e.id && !cfg.goalsEver[e.id]) { cfg.goalsEver[e.id] = 1; return true; } return false;
    case 'relit': if (e.recovered) { cfg.lightsTotal++; return true; } return false;
    case 'over':
      if (e.short) { cfg.rains++; cfg.starsTotal += nat(e.n); return true; }
      if (!e.fallen && e.winner === 0 && W && !W.lean) { const d = Math.max(0, Math.min(2, (W.diff == null ? 1 : W.diff) | 0)); cfg.winsBy[d]++; return true; }
      return false;
  }
  return false;
};
/* Items open now that are not in `known`: mark them known, put the first of each never-chosen slot on, push to `out`. */
WD.settle = function (cfg, known, out) {
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i]; if (known[it.id] || !WD.has(cfg, it)) continue;
    known[it.id] = 1; if (cfg.wear[it.slot] === undefined) cfg.wear[it.slot] = it.id; if (out) out.push(it);
  }
  return out;
};
WD.known = function (cfg) { const k = {}; ITEMS.forEach(function (it) { if (WD.has(cfg, it)) k[it.id] = 1; }); return k; };

/* ---------- what each thing looks like: shared by the 3D hero and the 2D previews ---------- */
/* Atlas shapes: 0 soft dot, 1 petal, 2 folded square, 3 puff, 4 ink splat, 5 firefly, 6 gold flake, 7 four-point glint. */
const FX = WD.FX = {
  motes: { mesh: 'glow', k: 0, alt: 7, altP: 0.18, every: 0.3, idle: 2.2, y: [0.5, 1.5], back: 0.25, spread: 0.35, size: [0.1, 0.17], end: 0.4, life: [1.1, 1.8], vx: 0.25, vy: [0.25, 0.7], grav: -0.25, drag: 1.5, flut: 0.35, spin: 0, blink: 0.35 },
  petals: { mesh: 'paper', k: 1, every: 0.34, idle: 1.3, y: [1.5, 2.2], back: 0.2, spread: 0.5, size: [0.19, 0.27], end: 1, life: [2.2, 3.0], vx: 0.4, vy: [0, 0.3], grav: 0.7, drag: 2.0, flut: 0.9, spin: 3, blink: 0 },
  fireflies: { mesh: 'glow', k: 5, every: 0.55, idle: 1.6, y: [0.3, 1.9], back: 0.4, spread: 0.9, size: [0.2, 0.3], end: 0.8, life: [2.5, 3.8], vx: 0.5, vy: [-0.1, 0.3], grav: 0, drag: 0.6, flut: 0.7, spin: 0, blink: 1 },
  confetti: { mesh: 'paper', k: 2, every: 0.3, idle: 0.5, y: [1.3, 1.9], back: 0.2, spread: 0.4, size: [0.11, 0.16], end: 1, life: [1.8, 2.4], vx: 0.9, vy: [0.6, 1.4], grav: 2.2, drag: 1.6, flut: 0.6, spin: 9, blink: 0 },
  powder: { step: true, mesh: 'paper', k: 3, n: 4, size: [0.18, 0.28], end: 2.1, life: [0.5, 0.8], vx: 0.9, vy: [0.2, 0.6], grav: -0.1, drag: 3.5, spin: 0.6, glint: 1 },
  leaf: { step: true, mesh: 'paper', k: 6, n: 4, size: [0.13, 0.18], end: 1, life: [1.3, 1.8], vx: 1.0, vy: [1.4, 2.4], grav: 5, drag: 0.8, spin: 10, flut: 0.4, glint: 1 },
  splat: { step: true, mesh: 'flat', k: 4, n: 1, size: [0.5, 0.64], end: 1.08, life: [2.4, 2.8], vx: 0, vy: [0, 0], grav: 0, drag: 0, spin: 0, drops: 2 }
};
/* Colours per look. d is the default for the dark looks; origami is daylight paper, where light cannot glow, so its
   colours are inks and folded papers instead. Ghost entries are [colour, additive]. */
const PAL = WD.PAL = {
  motes: { snow: [0xffd88a, 0xffb8d8], lantern: [0xffc060, 0xff9a4a], origami: [0xc8902e, 0xb8311a], ink: [0xffb347, 0xffd890], d: [0xffd27a, 0xfff0b0] },
  petals: { snow: [0xffc2da, 0xffe6f0, 0xff9ac8], lantern: [0xff9a8a, 0xffc4a0, 0xffe0c8], origami: [0xd0402a, 0xf2c2b4, 0xe07a6a], d: [0xffb0c8, 0xffe0ea] },
  fireflies: { snow: [0xd8ff8a, 0xfff2a0], lantern: [0xe0ff7a, 0xfff0a0], origami: [0x4a7a1a, 0x7a8a12], d: [0xd8ff7a] },
  confetti: { snow: [0xff9ac8, 0xffd27a, 0xb8b4ff, 0xffffff], origami: [0xb8311a, 0x2a4c86, 0xc8902e, 0xffffff], d: [0xff6a4d, 0xffc060, 0x5fe6b6, 0xf4e8d6] },
  powder: { snow: [0xeef0ff, 0xffffff], lantern: [0xfff0dc, 0xffffff], origami: [0xb4c2dc, 0x8fa8d0], d: [0xf0f0ff, 0xffffff] },
  leaf: { origami: [0xc8902e, 0xa8741e], d: [0xf0c060, 0xffd890] },
  splat: { snow: [0x100a26, 0x1a1238], lantern: [0x140b1c, 0x241530], ink: [0x9a7cff, 0x7a5cff], glow: [0xff4faa, 0x62e6ff], origami: [0x242f3b, 0x2a3a4a], d: [0x161020, 0x221830] },
  halo: { snow: [0xffd27a], lantern: [0xffb050], origami: [0xb8311a], d: [0xffc860] },
  crane: { snow: [0xffe2f0], lantern: [0xffe6b0], origami: [0x2a4c86], d: [0xfff0e0] },
  moons: { snow: [0xffe08a], origami: [0x8c5a2b], d: [0xffd36a] },
  compass: { snow: [0xc8d4ff], lantern: [0xf4dcb0], origami: [0x242f3b], d: [0xf4e8d6] },
  lantern: { snow: [0xffc878, 0xffd890], lantern: [0xffb04a, 0xffc060], origami: [0xd0402a, 0xf0c060], d: [0xffb860, 0xffd27a] },
  moth: { lantern: [0xfff0d0, 0xffe8b0], origami: [0x2a4c86, 0x8fa8d0], d: [0xeee8ff, 0xd8e0ff] },
  jade: { origami: [0x1f8a66, 0x2fa07a], d: [0x4fe8b8, 0x9fffe0] },
  ink: { ink: [0xa78bff, 1], glow: [0x62e6ff, 1], origami: [0x242f3b, 0], d: [0x150d24, 0] },
  moon: { origami: [0x2a4c86, 0], d: [0xbfe0ff, 1] },
  gilt: { origami: [0xa8741e, 0], d: [0xffc04a, 1] }
};
const pal = WD.pal = function (id, look) { const p = PAL[id]; return p ? (p[look] || p.d) : [0xffffff]; };
const LIGHT_LOOKS = { origami: 1 }; // looks drawn with normal blending, where light cannot glow

/* Shapes, white with grey shading, drawn centred at 0,0 inside a cell of half-size r. The 3D atlas and the 2D previews
   both use these, so the screen and the valley agree. */
function seeded(n) { let a = n * 9301 + 49297; return function () { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }
function drawShape(g, k, r) {
  g.save();
  const rad = function (r0, stops) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r0); stops.forEach(function (s) { gr.addColorStop(s[0], 'rgba(255,255,255,' + s[1] + ')'); }); return gr; };
  if (k === 0) { g.fillStyle = rad(r, [[0, 1], [0.22, 0.85], [0.5, 0.25], [1, 0]]); g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill(); }
  else if (k === 1) { // petal with a crease
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d4d4d4'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -r * 0.88); g.bezierCurveTo(r * 0.78, -r * 0.42, r * 0.5, r * 0.62, 0, r * 0.88); g.bezierCurveTo(-r * 0.5, r * 0.62, -r * 0.78, -r * 0.42, 0, -r * 0.88); g.fill();
    g.strokeStyle = 'rgba(170,170,170,0.9)'; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(0, -r * 0.55); g.quadraticCurveTo(r * 0.08, 0, 0, r * 0.6); g.stroke();
  } else if (k === 2) { // a square folded on its diagonal
    const s = r * 0.66; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-s, -s); g.lineTo(s, -s); g.lineTo(-s, s); g.fill();
    g.fillStyle = '#bdbdbd'; g.beginPath(); g.moveTo(s, -s); g.lineTo(s, s); g.lineTo(-s, s); g.fill();
  } else if (k === 3) { // a puff of powder
    [[0, 0.1, 0.62], [-0.32, -0.12, 0.42], [0.34, -0.08, 0.44], [0.05, -0.36, 0.38]].forEach(function (c) { g.save(); g.translate(c[0] * r, c[1] * r); g.fillStyle = rad(c[2] * r, [[0, 0.95], [0.55, 0.6], [1, 0]]); g.beginPath(); g.arc(0, 0, c[2] * r, 0, 6.2832); g.fill(); g.restore(); });
  } else if (k === 4) { // an ink splat: a ragged blob and a few drops
    const rnd = seeded(7); g.fillStyle = '#ffffff'; g.beginPath();
    for (let i = 0; i <= 18; i++) { const a = i / 18 * 6.2832, rr = r * (0.42 + rnd() * 0.16 + (i % 5 === 0 ? 0.14 : 0)); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.fill(); for (let i = 0; i < 6; i++) { const a = rnd() * 6.2832, d = r * (0.66 + rnd() * 0.24); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.05 + rnd() * 0.07), 0, 6.2832); g.fill(); }
  } else if (k === 5) { // a firefly: a hard bright point in a wide faint halo
    g.fillStyle = rad(r, [[0, 1], [0.12, 1], [0.2, 0.45], [0.5, 0.12], [1, 0]]); g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill();
  } else if (k === 6) { // a flake of gold leaf, crinkled
    const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cfcfcf'); gr.addColorStop(1, '#f4f4f4'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * 0.62, -r * 0.3); g.lineTo(r * 0.1, -r * 0.7); g.lineTo(r * 0.68, -r * 0.1); g.lineTo(r * 0.25, r * 0.62); g.lineTo(-r * 0.5, r * 0.4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(150,150,150,0.8)'; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(-r * 0.4, -r * 0.1); g.lineTo(r * 0.1, r * 0.05); g.lineTo(r * 0.45, -r * 0.2); g.stroke();
  } else if (k === 7) { // a four-point glint
    g.fillStyle = rad(r * 0.5, [[0, 0.9], [1, 0]]); g.beginPath(); g.arc(0, 0, r * 0.5, 0, 6.2832); g.fill(); g.fillStyle = '#ffffff';
    [0, 1].forEach(function (q) { g.save(); g.rotate(q * Math.PI / 2); g.beginPath(); g.moveTo(0, -r * 0.95); g.lineTo(r * 0.11, 0); g.lineTo(0, r * 0.95); g.lineTo(-r * 0.11, 0); g.fill(); g.restore(); });
  }
  g.restore();
}
/* Rings, white on a 256 square: radius 128 is one metre. crisp: for looks where light cannot glow (lines, no haze). */
function crane(g, s) { // a paper crane, flying toward +x
  g.beginPath(); g.moveTo(-10 * s, 0); g.lineTo(0, -3 * s); g.lineTo(12 * s, -1 * s); g.lineTo(0, 3 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-3 * s, -2 * s); g.lineTo(7 * s, -17 * s); g.lineTo(5 * s, -2 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-9 * s, 0); g.lineTo(-19 * s, -7 * s); g.lineTo(-8 * s, 2 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(10 * s, -1 * s); g.lineTo(17 * s, -10 * s); g.lineTo(19 * s, -9 * s); g.lineTo(13 * s, 1 * s); g.closePath(); g.fill();
}
function drawRing(g, id, crisp) {
  g.save(); g.translate(128, 128);
  const glow = function (r0, r1, a) { const gr = g.createRadialGradient(0, 0, r0, 0, 0, r1); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r1, 0, 6.2832); g.fill(); };
  const dotGlow = function (x, y, r) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
  g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  if (id === 'halo') {
    if (!crisp) glow(56, 124, 0.32);
    g.lineWidth = crisp ? 5 : 3.5; g.beginPath(); g.arc(0, 0, 100, 0, 6.2832); g.stroke();
    if (crisp) { g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 88, 0, 6.2832); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832, x = Math.cos(a) * 100, y = Math.sin(a) * 100;
      if (crisp) { g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-7, -5, 14, 10); g.restore(); } else { dotGlow(x, y, 15); g.fillStyle = '#fff'; g.fillRect(x - 3.5, y - 4.5, 7, 9); } }
  } else if (id === 'crane') {
    if (!crisp) glow(70, 126, 0.18);
    g.lineWidth = crisp ? 3 : 2; g.beginPath(); g.arc(0, 0, 116, 0, 6.2832); g.stroke(); g.setLineDash([6, 7]); g.beginPath(); g.arc(0, 0, 92, 0, 6.2832); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832; g.save(); g.rotate(a); g.translate(104, 0); g.rotate(Math.PI / 2); g.fillStyle = '#fff'; crane(g, 1.05); g.restore(); }
  } else if (id === 'compass') { // a rose of eight points, north filled; it turns with the hero, so it points where you face
    if (!crisp) glow(40, 122, 0.16);
    g.lineWidth = crisp ? 3 : 2; g.beginPath(); g.arc(0, 0, 108, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, 0, 100, 0, 6.2832); g.stroke();
    for (let i = 0; i < 72; i++) { const a = i / 72 * 6.2832, l = i % 9 === 0 ? 10 : 4; g.beginPath(); g.moveTo(Math.cos(a) * 100, Math.sin(a) * 100); g.lineTo(Math.cos(a) * (100 - l), Math.sin(a) * (100 - l)); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 - Math.PI / 2, long = i % 2 === 0, L = long ? 96 : 58, w = long ? 13 : 9; g.save(); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.moveTo(0, -L); g.lineTo(w, -w); g.lineTo(0, 0); g.lineTo(-w, -w); g.closePath(); if (i === 0) g.fill(); else { g.lineWidth = crisp ? 2.5 : 2; g.stroke(); g.beginPath(); g.moveTo(0, -L); g.lineTo(-w, -w); g.lineTo(0, 0); g.closePath(); g.fill(); } g.restore(); }
  } else if (id === 'moons') {
    if (!crisp) glow(60, 124, 0.22);
    g.lineWidth = crisp ? 3.5 : 2.5;
    for (let i = 0; i < 5; i++) { const a0 = i / 5 * 6.2832 - Math.PI / 2; g.beginPath(); g.arc(0, 0, 102, a0 + 0.19, a0 + 6.2832 / 5 - 0.19); g.stroke(); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.2832 - Math.PI / 2, x = Math.cos(a) * 102, y = Math.sin(a) * 102; if (!crisp) dotGlow(x, y, 26); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 13, 0, 6.2832); g.fill(); }
  }
  g.restore();
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const isLight = function (look) { return !!LIGHT_LOOKS[look]; };
const rnd = Math.random, rr = function (a) { return a[0] + (a[1] - a[0]) * rnd(); };
const DROP = { mesh: 'paper', k: 4, size: [0.06, 0.09], end: 0.8, life: [0.5, 0.7], grav: 9, drag: 0.5, spin: 0 }, GLINT = { life: [0.45, 0.45], size: [0.16, 0.16], end: 0.3, grav: 0, drag: 2 };

if (typeof document !== 'undefined') browser();
function browser() {
/* ---------- in the valley (three.js) ---------- */
let T = null, R = null, scene = null, look = 'snow', add = true, atlasTex = null, glowTex = null, ribTex = null, wingTex = null, ringGeo = null, ringMats = {}, ringTex = {};
let PG = null, PP = null, PD = null, lamp = null, lampId = null, lampV = { x: 0, y: 0, z: 0 }, lampSnap = true, lampT = 0;
const Q = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, s0: 0.1, s1: 0.1, rot: 0, spin: 0, grav: 0, drag: 0, flut: 0, col: 0xffffff, a: 1, k: 0, blink: 0, floor: 0.04 };
const VB = 'attribute float aA; attribute vec3 aC; attribute float aK; attribute float aR; varying float vA; varying vec3 vC; varying vec2 vU; void main(){ vC = aC; vU = vec2((uv.x + aK) / 8.0, uv.y); vec2 q = position.xy; float c = cos(aR), s = sin(aR); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y); vec4 p = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0); float sc = length(instanceMatrix[0].xyz); p.xy += q * sc; vA = aA * smoothstep(0.9, 2.6, -p.z); gl_Position = projectionMatrix * p; }';
const VF = 'attribute float aA; attribute vec3 aC; attribute float aK; attribute float aR; varying float vA; varying vec3 vC; varying vec2 vU; void main(){ vC = aC; vA = aA; vU = vec2((uv.x + aK) / 8.0, uv.y); vec2 q = position.xy; float c = cos(aR), s = sin(aR); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y); float sc = length(instanceMatrix[0].xyz); vec3 p = instanceMatrix[3].xyz + vec3(q.x, 0.0, -q.y) * sc; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }';
const FR = 'uniform sampler2D map; varying float vA; varying vec3 vC; varying vec2 vU; void main(){ vec4 t = texture2D(map, vU); float a = t.a * vA; if (a < 0.008) discard; gl_FragColor = vec4(vC * t.rgb, a); }';
function flag(m) { m.userData.lk = m.userData.bl = m.userData.solid = true; return m; }
function atlas() { const c = canvas(512, 64), g = c.getContext('2d'); for (let k = 0; k < 8; k++) { g.save(); g.translate(32 + 64 * k, 32); drawShape(g, k, 29); g.restore(); } return c; }
function tex(c) { const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; t.generateMipmaps = false; return t; }
/* One instanced system of camera-facing (or ground-flat) quads with a fade, a colour, an atlas cell and a turn per quad. */
function Pool(cap, kind) {
  const g = new T.PlaneGeometry(1, 1);
  this.aA = new T.InstancedBufferAttribute(new Float32Array(cap), 1); this.aC = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  this.aK = new T.InstancedBufferAttribute(new Float32Array(cap), 1); this.aR = new T.InstancedBufferAttribute(new Float32Array(cap), 1);
  g.setAttribute('aA', this.aA); g.setAttribute('aC', this.aC); g.setAttribute('aK', this.aK); g.setAttribute('aR', this.aR);
  const glow = kind === 'glow' && add;
  const mt = flag(new T.ShaderMaterial({ uniforms: { map: { value: atlasTex } }, vertexShader: kind === 'flat' ? VF : VB, fragmentShader: FR, transparent: true, depthWrite: false, blending: glow ? T.AdditiveBlending : T.NormalBlending }));
  const m = new T.InstancedMesh(g, mt, cap); m.count = 0; m.frustumCulled = false; m.userData.rt = true; m.renderOrder = kind === 'flat' ? 1 : 3; scene.add(m);
  this.m = m; this.cap = cap; this.k = 0; this.flat = kind === 'flat';
  const F = function () { return new Float32Array(cap); };
  this.x = F(); this.y = F(); this.z = F(); this.vx = F(); this.vy = F(); this.vz = F(); this.life = F(); this.max = F(); this.s0 = F(); this.s1 = F();
  this.rot = F(); this.spin = F(); this.grav = F(); this.drag = F(); this.flut = F(); this.ph = F(); this.r = F(); this.g = F(); this.b = F(); this.a = F(); this.kk = F(); this.blink = F(); this.floor = F();
}
const tmpRGB = { r: 0, g: 0, b: 0 };
function rgb(hex) { tmpRGB.r = (hex >> 16 & 255) / 255; tmpRGB.g = (hex >> 8 & 255) / 255; tmpRGB.b = (hex & 255) / 255; return tmpRGB; }
Pool.prototype.put = function (q) {
  const i = this.k; this.k = (this.k + 1) % this.cap;
  this.x[i] = q.x; this.y[i] = q.y; this.z[i] = q.z; this.vx[i] = q.vx; this.vy[i] = q.vy; this.vz[i] = q.vz; this.life[i] = this.max[i] = q.life;
  this.s0[i] = q.s0; this.s1[i] = q.s1; this.rot[i] = q.rot; this.spin[i] = q.spin; this.grav[i] = q.grav; this.drag[i] = q.drag; this.flut[i] = q.flut; this.ph[i] = rnd() * 6.283;
  const c = rgb(q.col); this.r[i] = c.r; this.g[i] = c.g; this.b[i] = c.b; this.a[i] = q.a; this.kk[i] = q.k; this.blink[i] = q.blink; this.floor[i] = q.floor;
};
Pool.prototype.clear = function () { this.life.fill(0); this.m.count = 0; };
Pool.prototype.step = function (dt, t) {
  let n = 0; const M = this.m.instanceMatrix.array, A = this.aA.array, Cc = this.aC.array, K = this.aK.array, Rt = this.aR.array;
  for (let i = 0; i < this.cap; i++) {
    if (this.life[i] <= 0) continue;
    this.life[i] -= dt; if (this.life[i] <= 0) continue;
    const dm = Math.exp(-this.drag[i] * dt), fl = this.flut[i];
    this.vx[i] *= dm; this.vz[i] *= dm; this.vy[i] = this.vy[i] * dm - this.grav[i] * dt;
    this.x[i] += (this.vx[i] + (fl ? Math.sin(t * 3.1 + this.ph[i]) * fl : 0)) * dt; this.z[i] += (this.vz[i] + (fl ? Math.cos(t * 2.3 + this.ph[i] * 1.7) * fl : 0)) * dt; this.y[i] += this.vy[i] * dt;
    if (this.y[i] < this.floor[i]) { this.y[i] = this.floor[i]; this.vy[i] = 0; this.vx[i] *= 0.4; this.vz[i] *= 0.4; this.spin[i] *= 0.3; this.flut[i] = 0; }
    this.rot[i] += this.spin[i] * dt;
    const age = this.max[i] - this.life[i], f = 1 - this.life[i] / this.max[i], s = this.s0[i] + (this.s1[i] - this.s0[i]) * f;
    let a = this.a[i] * Math.min(1, age * 10) * Math.pow(1 - f, 1.3);
    if (this.blink[i]) a *= 1 - this.blink[i] * (0.5 + 0.5 * Math.sin(t * 7 + this.ph[i] * 3));
    const o = n * 16; M[o] = s; M[o + 1] = 0; M[o + 2] = 0; M[o + 3] = 0; M[o + 4] = 0; M[o + 5] = s; M[o + 6] = 0; M[o + 7] = 0; M[o + 8] = 0; M[o + 9] = 0; M[o + 10] = s; M[o + 11] = 0;
    M[o + 12] = this.x[i]; M[o + 13] = this.y[i]; M[o + 14] = this.z[i]; M[o + 15] = 1;
    A[n] = a; Cc[n * 3] = this.r[i]; Cc[n * 3 + 1] = this.g[i]; Cc[n * 3 + 2] = this.b[i]; K[n] = this.kk[i]; Rt[n] = this.rot[i]; n++;
  }
  this.m.count = n; this.m.instanceMatrix.needsUpdate = true; this.aA.needsUpdate = this.aC.needsUpdate = this.aK.needsUpdate = this.aR.needsUpdate = true;
};
const PL = []; // the three pools, for the per-frame loop without an array per frame
function poolOf(mesh) { return mesh === 'glow' ? PG : (mesh === 'flat' ? PD : PP); }
/* Built with each look (gfx.js R.build). A new match in the same scene keeps everything and clears what was flying. */
WD.build = function (x) {
  T = x.T; R = x.R; look = x.id; add = !!(x.LK && x.LK.add) && !isLight(look);
  if (!atlasTex) { atlasTex = tex(atlas()); const g0 = canvas(64, 64), gg = g0.getContext('2d'); gg.translate(32, 32); drawShape(gg, 0, 31); glowTex = tex(g0); ribTex = tex(ribs()); wingTex = tex(wings()); }
  if (scene !== x.scene) {
    scene = x.scene; ringMats = {}; lamp = null; lampId = null;
    PG = new Pool(140, 'glow'); PP = new Pool(150, 'paper'); PD = new Pool(28, 'flat'); PL.length = 0; PL.push(PG, PP, PD);
    ringGeo = new T.PlaneGeometry(2, 2); ringGeo.rotateX(-Math.PI / 2);
  }
  PL.forEach(function (p) { p.clear(); }); lampSnap = true;
  const cfg = cfgNow(); if (cfg && LL.sim && LL.sim.W !== curW) { curW = LL.sim.W; known = WD.known(cfg); gained = []; said = 0; } // a new match: what is open before it starts
};
function ringMat(id) {
  if (ringMats[id]) return ringMats[id];
  const crisp = isLight(look), key = id + (crisp ? 'c' : 'g');
  if (!ringTex[key]) { const c = canvas(256, 256); drawRing(c.getContext('2d'), id, crisp); ringTex[key] = tex(c); }
  const m = flag(new T.MeshBasicMaterial({ map: ringTex[key], color: pal(id, look)[0], transparent: true, opacity: crisp ? 0.9 : 0.85, depthWrite: false, side: T.DoubleSide, blending: add ? T.AdditiveBlending : T.NormalBlending, polygonOffset: true, polygonOffsetFactor: -3 }));
  return (ringMats[id] = m);
}
/* the paper lantern's ribs and the moth's wings, white, tinted per look */
function ribs() { const c = canvas(64, 64), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#c8c8c8'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#c8c8c8'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(120,120,120,0.55)'; for (let y = 6; y < 64; y += 9) g.fillRect(0, y, 64, 2); return c; }
function wings() { const c = canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(2, 34); g.bezierCurveTo(14, 2, 54, 0, 62, 18); g.bezierCurveTo(60, 34, 40, 40, 2, 34); g.fill(); g.beginPath(); g.moveTo(2, 34); g.bezierCurveTo(20, 40, 44, 50, 40, 62); g.bezierCurveTo(24, 62, 10, 52, 2, 34); g.fill(); g.fillStyle = 'rgba(150,150,150,0.7)'; g.beginPath(); g.arc(40, 18, 5, 0, 6.283); g.fill(); return c; }
function basic(col, o) { return flag(new T.MeshBasicMaterial(Object.assign({ color: col }, o || {}))); }
function sprite(col, size, op) { const s = new T.Sprite(flag(new T.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, opacity: op }))); s.scale.set(size, size, 1); return s; }
function buildLamp(id) {
  const g = new T.Group(), p = pal(id, look), light = isLight(look);
  if (id === 'lantern') {
    const body = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.25, 10, 1, true), basic(p[0], { map: ribTex, side: T.DoubleSide })); g.add(body);
    const dark = basic(light ? 0x242f3b : 0x2a1a14); [0.14, -0.14].forEach(function (y) { const c = new T.Mesh(new T.CylinderGeometry(0.085, 0.1, 0.035, 10), dark); c.position.y = y; g.add(c); });
    const str = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.22, 4), dark); str.position.y = 0.27; g.add(str);
    const tass = new T.Mesh(new T.ConeGeometry(0.03, 0.1, 5), basic(light ? 0xb8311a : 0xd0402a)); tass.position.y = -0.21; tass.rotation.x = Math.PI; g.add(tass);
    if (!light) g.add(sprite(p[1], 1.25, 0.85)); else { const s = sprite(p[1], 0.7, 0.35); g.add(s); }
  } else if (id === 'moth') {
    g.add(sprite(p[0], light ? 0.35 : 0.75, light ? 0.3 : 0.9));
    const body = new T.Mesh(new T.SphereGeometry(0.028, 6, 4), basic(light ? 0x242f3b : 0xffffff)); body.scale.y = 1.8; g.add(body);
    const wm = basic(p[0], { map: wingTex, transparent: true, side: T.DoubleSide, depthWrite: false, opacity: light ? 1 : 0.9 });
    g.wings = [-1, 1].map(function (sd) { const piv = new T.Group(), w = new T.Mesh(new T.PlaneGeometry(0.17, 0.17), wm); w.position.x = 0.085 * sd; w.scale.x = sd; piv.add(w); g.add(piv); return piv; });
  } else if (id === 'jade') {
    const gem = new T.Mesh(new T.IcosahedronGeometry(0.1, 0), basic(p[0])); g.add(gem); g.gem = gem;
    const core = new T.Mesh(new T.IcosahedronGeometry(0.055, 0), basic(light ? 0xffffff : p[1], { transparent: true, opacity: 0.8 })); g.add(core);
    if (!light) g.add(sprite(p[0], 1.05, 0.8));
  }
  g.traverse(function (o) { if (o.isMesh) o.userData.rt = true; o.frustumCulled = false; });
  scene.add(g); return g;
}
function dropLamp() { if (!lamp) return; scene.remove(lamp); lamp.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); lamp = null; lampId = null; }
const cfgNow = function () { return LL.cfg || null; };
/* a trail or footfall particle from a spec */
function spawn(F, it, x, y, z, vx, vy, vz, sizeK, k) {
  const P = poolOf(F.mesh), c = pal(it.id, look);
  Q.x = x; Q.y = y; Q.z = z; Q.vx = vx; Q.vy = vy; Q.vz = vz; Q.life = rr(F.life); const s = rr(F.size) * (sizeK || 1); Q.s0 = s; Q.s1 = s * F.end;
  Q.rot = rnd() * 6.283; Q.spin = (rnd() - 0.5) * 2 * (F.spin || 0) * (R.reduced ? 0.2 : 1); Q.grav = F.grav; Q.drag = F.drag; Q.flut = R.reduced ? 0 : (F.flut || 0);
  Q.col = c[Math.floor(rnd() * c.length)]; Q.a = 1; Q.k = k == null ? F.k : k; Q.blink = R.reduced ? 0 : (F.blink || 0); Q.floor = F.mesh === 'flat' ? 0.045 : 0.04 + Q.s0 * 0.2;
  P.put(Q);
}
function glint(x, y, z, col, s) { Q.x = x; Q.y = y; Q.z = z; Q.vx = 0; Q.vy = 0.5; Q.vz = 0; Q.life = 0.45; Q.s0 = s; Q.s1 = s * 0.3; Q.rot = rnd(); Q.spin = R.reduced ? 0 : 2; Q.grav = 0; Q.drag = 2; Q.flut = 0; Q.col = col; Q.a = 1; Q.k = 7; Q.blink = 0; Q.floor = 0; PG.put(Q); }
function dot(x, y, z, vx, vy, vz, col, s, life, k) { Q.x = x; Q.y = y; Q.z = z; Q.vx = vx; Q.vy = vy; Q.vz = vz; Q.life = life; Q.s0 = s; Q.s1 = s * 0.4; Q.rot = rnd() * 6; Q.spin = 0; Q.grav = -0.2; Q.drag = 1.5; Q.flut = R.reduced ? 0 : 0.2; Q.col = col; Q.a = 1; Q.k = k || 0; Q.blink = 0; Q.floor = 0.04; PG.put(Q); }
function footfall(it, x, z, fx, fz, big) {
  const F = FX[it.id], c = pal(it.id, look), n = Math.max(1, Math.round(F.n * (R.low ? 0.6 : 1) * (big ? 3 : 1)));
  for (let k = 0; k < n; k++) {
    const a = big ? k / n * 6.283 : rnd() * 6.283, sp = F.vx * (big ? 1.6 : (0.4 + rnd() * 0.6));
    if (F.mesh === 'flat') { if (big || k === 0) spawn(F, it, x + (big ? Math.cos(a) * 0.4 : 0), 0, z + (big ? Math.sin(a) * 0.4 : 0), 0, 0, 0, big ? 0.7 : 1); }
    else spawn(F, it, x + (rnd() - 0.5) * 0.15, 0.1, z + (rnd() - 0.5) * 0.15, Math.cos(a) * sp - fx * 0.3, rr(F.vy), Math.sin(a) * sp - fz * 0.3);
  }
  if (F.drops) for (let k = 0; k < F.drops; k++) { const a = rnd() * 6.283; spawn(DROP, it, x, 0.12, z, Math.cos(a) * 1.2, 1 + rnd(), Math.sin(a) * 1.2); }
  if (F.glint && !R.reduced) glint(x + (rnd() - 0.5) * 0.3, 0.2 + rnd() * 0.2, z + (rnd() - 0.5) * 0.3, it.id === 'leaf' ? (isLight(look) ? 0xc8902e : 0xfff0c0) : (isLight(look) ? 0x8fa8d0 : 0xffffff), it.id === 'leaf' ? 0.24 : 0.16);
}
/* The player's hero, once a frame, from the top of gfx.js's hero loop: the last frame's pose (one frame late, unseen). */
WD.hero = function (m, h, dt, t, cam) {
  if (!PG) return; const cfg = cfgNow(); if (!cfg) return;
  const alive = h.alive, red = R.reduced ? 1 : 0, rate = (R.low ? 0.5 : 1) * (R.reduced ? 0.35 : 1);
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  // ring: a decal of our own under the hero; the team ring's material is hidden while one is worn
  const ri = WD.worn(cfg, 'ring');
  if (ri || m.wdRing) {
    if (!m.wdRing) { m.wdRing = new T.Mesh(ringGeo, ringMat(ri.id)); m.wdRing.renderOrder = 2; m.wdRing.userData.rt = true; m.wdRing.rotation.y = Math.PI; m.add(m.wdRing); } // turned so the rose's north is the hero's facing
    const d = m.wdRing; m.ring.material.visible = !ri;
    if (ri) { const mt = ringMat(ri.id); if (d.material !== mt) d.material = mt; d.visible = alive && m.ring.visible; d.position.y = m.ring.position.y + 0.012;
      if (!red) d.rotation.y += dt * (ri.id === 'crane' ? 0.35 : (ri.id === 'halo' ? -0.12 : (ri.id === 'compass' ? 0 : 0.06)));
      if (ri.id === 'compass') d.rotation.y = Math.PI;
      mt.opacity = (isLight(look) ? 0.9 : 0.8) + (red ? 0 : 0.12 * Math.sin(t * 2.2)); }
    else d.visible = false;
  }
  // trail: by distance walked, plus a slow trickle standing still
  const tr = WD.worn(cfg, 'trail'), st = WD.worn(cfg, 'step');
  const dx = h.x - (m.wdX == null ? h.x : m.wdX), dz = h.z - (m.wdZ == null ? h.z : m.wdZ); let dist = Math.hypot(dx, dz); if (dist > 3) dist = 0; m.wdX = h.x; m.wdZ = h.z;
  if (tr && alive) {
    const F = FX[tr.id]; m.wdAcc = (m.wdAcc || 0) + (dist / F.every + dt * F.idle) * rate; if (m.wdAcc > 6) m.wdAcc = 6;
    let n = 0;
    while (m.wdAcc >= 1 && n < 4) { m.wdAcc -= 1; n++;
      const lat = (rnd() - 0.5) * 2 * F.spread, bx = h.x - fx * F.back + fz * lat, bz = h.z - fz * F.back - fx * lat, k = F.alt && rnd() < F.altP ? F.alt : F.k;
      const kick = tr.id === 'confetti' ? 0.8 : 0;
      spawn(F, tr, bx, h.y + rr(F.y), bz, (rnd() - 0.5) * 2 * F.vx - fx * kick, rr(F.vy), (rnd() - 0.5) * 2 * F.vx - fz * kick, 1, k); }
  } else m.wdAcc = 0;
  // footfall: a foot comes down when the rig's contact index changes (see motion.js); a landing throws a ring of them
  const rg = m.rig || {};
  if (st && alive && !red) {
    if (m.wdCi != null && rg.ci !== m.wdCi && rg.mix > 0.45 && h.onGround && !h.zip) { const sd = rg.ci ? -1 : 1; footfall(st, h.x - fx * 0.15 + fz * 0.18 * sd, h.z - fz * 0.15 - fx * 0.18 * sd, fx, fz, false); }
    if (h.onGround && m.wdAir && !h.zip) footfall(st, h.x, h.z, fx, fz, true);
  }
  m.wdCi = rg.ci; m.wdAir = !h.onGround;
  // the light at the shoulder: on the hero's screen-left (away from the crosshair), a little toward the camera, on a spring
  const li = WD.worn(cfg, 'lamp');
  if (li && lampId !== li.id) { dropLamp(); lamp = buildLamp(li.id); lampId = li.id; lampSnap = true; }
  else if (!li && lamp) dropLamp();
  if (lamp) {
    lamp.visible = alive && m.visible !== false;
    let ux = h.x - cam.x, uz = h.z - cam.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; // camera to hero
    const lx = uz, lz = -ux; // screen-left of the hero
    lampT += dt; const bob = red ? 0 : Math.sin(lampT * 2.3) * 0.07, mo = li.id === 'moth' && !red;
    const tx = h.x + lx * (0.62 + (mo ? Math.sin(lampT * 3.1) * 0.16 : 0)) - ux * 0.12, ty = h.y + 2.0 + bob + (mo ? Math.sin(lampT * 6.2) * 0.08 : 0), tz = h.z + lz * (0.62 + (mo ? Math.sin(lampT * 3.1) * 0.16 : 0)) - uz * 0.12;
    if (lampSnap || !alive || Math.hypot(tx - lamp.position.x, tz - lamp.position.z) > 6) { lamp.position.set(tx, ty, tz); lampV.x = lampV.y = lampV.z = 0; lampSnap = false; }
    const k = red ? 140 : 62, c = red ? 24 : 12.5, dd = Math.min(dt, 0.05);
    lampV.x += ((tx - lamp.position.x) * k - lampV.x * c) * dd; lampV.y += ((ty - lamp.position.y) * k - lampV.y * c) * dd; lampV.z += ((tz - lamp.position.z) * k - lampV.z * c) * dd;
    lamp.position.x += lampV.x * dd; lamp.position.y += lampV.y * dd; lamp.position.z += lampV.z * dd;
    const side = lampV.x * -uz + lampV.z * ux; // velocity across the screen
    lamp.rotation.y = Math.atan2(ux, uz); lamp.rotation.z = red ? 0 : Math.max(-0.45, Math.min(0.45, side * 0.07));
    if (lamp.wings) { const fl = red ? 0.5 : 0.35 + 0.95 * Math.abs(Math.sin(lampT * 17)); lamp.wings[0].rotation.y = fl; lamp.wings[1].rotation.y = -fl; }
    if (lamp.gem && !red) { lamp.gem.rotation.y += dt * 1.6; lamp.gem.rotation.x += dt * 0.7; }
    if (alive && !red && rnd() < dt * (li.id === 'moth' ? 3 : 4) * (R.low ? 0.5 : 1)) { const p = pal(li.id, look); dot(lamp.position.x, lamp.position.y - 0.1, lamp.position.z, (rnd() - 0.5) * 0.3, li.id === 'moth' ? -0.2 : 0.35, (rnd() - 0.5) * 0.3, p[1] || p[0], li.id === 'jade' ? 0.09 : 0.07, 1.1, li.id === 'moth' ? 3 : 0); }
  }
  for (let i = 0; i < PL.length; i++) PL[i].step(dt, t);
};
/* A dash or thread-ride afterimage, from the end of gfx.js's ghost(): recolour the player's; put the others back. */
WD.ghost = function (gh, h, lookAdd) {
  if (!T) return; const mt = gh.material, cfg = cfgNow(), it = h && h.isPlayer && cfg ? WD.worn(cfg, 'ghost') : null;
  if (!it) { if (mt.userData.wd) { mt.blending = lookAdd ? T.AdditiveBlending : T.NormalBlending; mt.userData.wd = 0; } gh.userData.op = 0; return; }
  const p = pal(it.id, look); mt.color.setHex(p[0]); if (p[1] && lookAdd) { mt.blending = T.AdditiveBlending; mt.color.multiplyScalar(0.7); gh.userData.op = 0; } else { mt.blending = T.NormalBlending; gh.userData.op = 1.6; } mt.userData.wd = 1; // ink must be dense to read as ink: over 1, it stays solid for the first part of its fade
  if (!PG || R.reduced) return;
  if (it.id === 'ink') { const P = PP; Q.x = h.x + (rnd() - 0.5) * 0.4; Q.y = 0.6 + rnd() * 1.2; Q.z = h.z + (rnd() - 0.5) * 0.4; Q.vx = Q.vz = 0; Q.vy = -0.5; Q.life = 0.7; Q.s0 = 0.09; Q.s1 = 0.07; Q.rot = rnd() * 6; Q.spin = 0; Q.grav = 9; Q.drag = 0.4; Q.flut = 0; Q.col = isLight(look) || !p[1] ? p[0] : 0x3a2a70; Q.a = 1; Q.k = 4; Q.blink = 0; Q.floor = 0.05; P.put(Q); }
  else if (it.id === 'moon') glint(h.x + (rnd() - 0.5) * 0.6, 0.5 + rnd() * 1.6, h.z + (rnd() - 0.5) * 0.6, isLight(look) ? 0x2a4c86 : 0xe8f4ff, 0.22);
  else dot(h.x + (rnd() - 0.5) * 0.6, 0.4 + rnd() * 1.6, h.z + (rnd() - 0.5) * 0.6, 0, 0.6, 0, isLight(look) ? 0xa8741e : 0xffd27a, 0.12, 0.9, rnd() < 0.3 ? 7 : 0);
};
WD._dbg = function () { return { pools: [PG, PP, PD].map(function (p) { return p ? p.m.count : -1; }), lamp: lampId, look: look }; }; // for tools

/* ---------- on paper (2D): the wardrobe screen and the end screen ---------- */
const heroImg = {};
function heroPic(id) { let im = heroImg[id]; if (!im) { im = heroImg[id] = new Image(); const PP = LL.gfx && LL.gfx.PAPER && LL.gfx.PAPER[id]; im.src = (PP && PP.src) || 'art/heroes/' + id + '.png'; /* 0.25 rook: his sheet is an SVG, so take the paper's own path */ } return im.complete && im.naturalWidth ? im : null; }
const tints = {};
/* a shape (or a ring, or the hero) tinted to a colour, cached */
function tinted(kind, key, hex, src) {
  const id = kind + key + ':' + hex; let c = tints[id]; if (c) return c;
  c = canvas(src.width, src.height); const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#' + ('00000' + hex.toString(16)).slice(-6); g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0); return (tints[id] = c);
}
const shapeSrc = [], ringSrc = {};
function shapeCanvas(k) { if (!shapeSrc[k]) { const c = canvas(64, 64), g = c.getContext('2d'); g.translate(32, 32); drawShape(g, k, 29); shapeSrc[k] = c; } return shapeSrc[k]; }
function ringCanvas(id, crisp) { const key = id + (crisp ? 'c' : 'g'); if (!ringSrc[key]) { const c = canvas(256, 256); drawRing(c.getContext('2d'), id, crisp); ringSrc[key] = c; } return ringSrc[key]; }
function cssVar(n, d) { try { const v = getComputedStyle(document.body).getPropertyValue(n).trim(); return v || d; } catch (e) { return d; } }
/* A small painted figure walking on the spot, wearing `wear` (slot -> item). sil: drawn as a shadow (locked). */
function Prev(cv, o) { this.cv = cv; this.g = cv.getContext('2d'); this.o = o || {}; this.t = rnd() * 4; this.P = []; for (let i = 0; i < 90; i++) this.P.push({ l: 0 }); this.acc = 0; this.ph = 0; this.ci = 0; this.gh = []; this.ghT = 0; this.layer = null; }
Prev.prototype.set = function (o) { this.o = o; for (let i = 0; i < this.P.length; i++) this.P[i].l = 0; this.gh.length = 0; };
Prev.prototype.put = function (x, y, vx, vy, F, col, k, s0, glow) {
  let p = null; for (let i = 0; i < this.P.length; i++) if (this.P[i].l <= 0) { p = this.P[i]; break; } if (!p) return;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.l = p.m = rr(F.life); p.s0 = s0 || rr(F.size); p.s1 = p.s0 * F.end; p.r = rnd() * 6.28; p.sp = (rnd() - 0.5) * 2 * (F.spin || 0); p.gr = F.grav; p.dr = F.drag; p.fl = F.flut || 0; p.ph = rnd() * 6.28; p.c = col; p.k = k; p.bl = F.blink || 0; p.glow = glow; p.flat = F.mesh === 'flat';
};
Prev.prototype.tick = function (dt) {
  const cv = this.cv, g = this.g, W = cv.width, H = cv.height, o = this.o, cfg = cfgNow() || {}, lk = cfg.look || 'snow', light = isLight(lk), red = !!(R && R.reduced);
  this.t += dt; const t = this.t, K = H * (o.small ? 0.74 : 0.68) / 2.45, gy = H * 0.88, x0 = W * (o.small ? 0.36 : 0.4), SZ = o.small ? 1.8 : 1.45, speed = o.small ? 2.6 : 3.4, dash = !!o.wear.ghost && (t % (o.small ? 2.2 : 3.2)) < 0.42, v = speed * (dash ? 2.6 : 1);
  const X = function (m) { return x0 + m * K; }, Y = function (m) { return gy - m * K; };
  // background: the look's night and its ground
  const L = LL.gfx && LL.gfx.LOOKS ? LL.gfx.LOOKS[lk] : null, hx = function (n) { return '#' + ('00000' + n.toString(16)).slice(-6); };
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, L ? hx(L.sky[0]) : '#15123a'); bg.addColorStop(0.75, L ? hx(L.sky[1]) : '#3a2f78'); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = L ? hx(L.ground.a) : '#545890'; g.fillRect(0, gy - 2, W, H - gy + 2); g.fillStyle = L ? hx(L.ground.lane) : '#3d355e'; g.globalAlpha = 0.6;
  const off = ((t * speed * K * 0.6) % 26); for (let x = -26 + off; x < W; x += 26) g.fillRect(x, gy + 4, 12, 2); g.globalAlpha = 1;
  this.ph += dt * v / 1.3 * Math.PI;
  const sil = !!o.sil, ctx = sil ? (this.layer || (this.layer = canvas(W, H))).getContext('2d') : g; if (sil) ctx.clearRect(0, 0, W, H);
  const A = !light && !sil; // additive light in dark looks
  // the ring, flattened under the feet
  const ri = o.wear.ring;
  if (ri) { const rc = tinted('r', ri.id + (light ? 'c' : 'g'), pal(ri.id, lk)[0], ringCanvas(ri.id, light)), rad = 0.95 * K; ctx.save(); ctx.translate(x0, gy); ctx.scale(1, 0.3); ctx.rotate(ri.id === 'compass' ? -Math.PI / 2 : (red ? 0 : t * (ri.id === 'crane' ? 0.35 : 0.12))); ctx.globalCompositeOperation = A ? 'lighter' : 'source-over'; ctx.globalAlpha = 0.9; ctx.drawImage(rc, -rad, -rad, rad * 2, rad * 2); ctx.restore(); }
  // emit: trail by distance, footfall on each foot
  const tr = o.wear.trail, st = o.wear.step;
  if (tr) { const F = FX[tr.id], c = pal(tr.id, lk); this.acc += dt * (v / F.every + F.idle) * (red ? 0.35 : 1);
    while (this.acc >= 1) { this.acc -= 1; const k = F.alt && rnd() < F.altP ? F.alt : F.k; this.put(0.25 + (rnd() - 0.5) * F.spread, rr(F.y), v + (rnd() - 0.5) * 2 * F.vx + (tr.id === 'confetti' ? 0.8 : 0), rr(F.vy), F, c[Math.floor(rnd() * c.length)], k, 0, F.mesh === 'glow'); } }
  const ci = Math.floor(this.ph / Math.PI) % 2;
  if (st && ci !== this.ci && !red) { const F = FX[st.id], c = pal(st.id, lk), fx = ci ? -0.12 : 0.1;
    for (let k = 0; k < F.n; k++) { const a = rnd() * 6.28; this.put(fx, F.mesh === 'flat' ? 0 : 0.06, v + Math.cos(a) * F.vx * 0.7 + 0.3, F.mesh === 'flat' ? 0 : rr(F.vy), F, c[Math.floor(rnd() * c.length)], F.k, 0, false); }
    if (F.glint) this.put(fx, 0.2, v, 0.4, GLINT, st.id === 'leaf' ? (light ? 0xc8902e : 0xfff0c0) : (light ? 0x8fa8d0 : 0xffffff), 7, 0, true);
    if (F.drops) for (let k = 0; k < 2; k++) this.put(fx, 0.1, v + (rnd() - 0.5) * 2, 1 + rnd(), DROP, c[0], 4, 0, false); }
  this.ci = ci;
  // particles: the world slides right under a figure walking left
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < this.P.length; i++) { const p = this.P[i]; if (p.l <= 0 || p.flat !== (pass === 0)) continue; // marks on the ground first
    { p.l -= dt; const dm = Math.exp(-p.dr * dt); p.vx = (p.vx - v) * dm + v; p.vy = p.vy * dm - p.gr * dt; p.x += (p.vx + (p.fl && !red ? Math.sin(t * 3.1 + p.ph) * p.fl : 0)) * dt; p.y += p.vy * dt; if (p.y < 0.02 && !p.flat) { p.y = 0.02; p.vy = 0; p.vx = v; p.sp *= 0.3; } p.r += p.sp * dt; }
    if (p.l <= 0) continue; const f = 1 - p.l / p.m, s = (p.s0 + (p.s1 - p.s0) * f) * K * SZ, a = Math.min(1, (p.m - p.l) * 10) * Math.pow(1 - f, 1.3) * (p.bl && !red ? 1 - p.bl * (0.5 + 0.5 * Math.sin(t * 7 + p.ph * 3)) : 1);
    const img = tinted('s', p.k, p.c, shapeCanvas(p.k)); ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = p.glow && A ? 'lighter' : 'source-over'; ctx.translate(X(p.x), Y(p.y)); if (p.flat) ctx.scale(1, 0.32); ctx.rotate(p.r); ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore(); }
  // the figure, its dash copies behind it
  const pic = heroPic(o.hero || 'dora'), P = LL.gfx && LL.gfx.PAPER ? LL.gfx.PAPER[o.hero || 'dora'] : null, hh = (P ? P.h : 2.4) * K;
  if (pic) { const cw = pic.naturalWidth / 4, ch = pic.naturalHeight, ww = hh * cw / ch, bob = Math.abs(Math.sin(this.ph)) * 0.05 * K * (red ? 0 : 1);
    if (!this.cell || this.cellId !== (o.hero || 'dora')) { this.cellId = o.hero || 'dora'; this.cell = canvas(Math.round(cw / 2), Math.round(ch / 2)); this.cell.getContext('2d').drawImage(pic, cw, 0, cw, ch, 0, 0, this.cell.width, this.cell.height); }
    const gi = o.wear.ghost;
    if (gi) { if (dash) { this.ghT -= dt; if (this.ghT <= 0) { this.ghT = 0.035; this.gh.push({ x: 0, t: 0 }); } }
      const gp = pal(gi.id, lk), gimg = tinted('h', (o.hero || 'dora'), gp[0], this.cell);
      for (let i = this.gh.length - 1; i >= 0; i--) { const q = this.gh[i]; q.t += dt; q.x += v * dt; if (q.t > 0.24) { this.gh.splice(i, 1); continue; } const f = q.t / 0.24;
        ctx.save(); ctx.globalAlpha = (gp[1] && A ? 0.7 : 0.6) * (1 - f) * (1 - f); ctx.globalCompositeOperation = gp[1] && A ? 'lighter' : 'source-over'; ctx.drawImage(gimg, X(q.x) - ww / 2, gy - hh - bob, ww, hh); ctx.restore(); } }
    ctx.drawImage(this.cell, x0 - ww / 2, gy - hh - bob, ww, hh);
  }
  // the light at the shoulder (behind it, as it walks)
  const li = o.wear.lamp;
  if (li) { const p = pal(li.id, lk), lx = X(0.5 + (li.id === 'moth' && !red ? Math.sin(t * 3.1) * 0.15 : 0)), ly = Y(2.0 + (red ? 0 : Math.sin(t * 2.3) * 0.07)), r = 0.13 * K * Math.min(SZ, 1.5);
    if (A) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tinted('g', 'l', p[1] || p[0], glowCanvas()), lx - r * 5, ly - r * 5, r * 10, r * 10); ctx.restore(); }
    ctx.save(); ctx.translate(lx, ly); const hx2 = function (n) { return '#' + ('00000' + n.toString(16)).slice(-6); };
    if (li.id === 'lantern') { ctx.fillStyle = light ? '#242f3b' : '#2a1a14'; ctx.fillRect(-0.5, -r * 2.6, 1, r * 1.4); ctx.fillRect(-r * 0.75, -r * 1.25, r * 1.5, r * 0.3); ctx.fillRect(-r * 0.75, r * 0.95, r * 1.5, r * 0.3); ctx.fillStyle = hx2(p[0]); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 1.05, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = -2; y <= 2; y++) ctx.fillRect(-r * 0.9, y * r * 0.4, r * 1.8, 1); }
    else if (li.id === 'moth') { const fl = red ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 17)); ctx.fillStyle = hx2(p[0]); [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(sd * r * 0.9 * fl, -r * 0.2, r * 0.95 * fl, r * 0.7, sd * 0.4, 0, 6.28); ctx.fill(); }); ctx.fillStyle = light ? '#242f3b' : '#ffffff'; ctx.fillRect(-1, -r * 0.6, 2, r * 1.2); }
    else { ctx.rotate(red ? 0 : t * 1.2); ctx.fillStyle = hx2(p[0]); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(r, 0); } ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.35, 0, 6.28); ctx.fill(); }
    ctx.restore(); }
  if (sil) { ctx.save(); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = cssVar('--paper', '#f4e8d6'); ctx.fillRect(0, 0, W, H); ctx.restore(); g.save(); g.globalAlpha = 0.32; g.drawImage(this.layer, 0, 0); g.restore(); }
};
let glowC = null; function glowCanvas() { if (!glowC) { glowC = canvas(64, 64); const g = glowC.getContext('2d'); g.translate(32, 32); drawShape(g, 0, 31); } return glowC; }
/* previews in view are ticked by one loop that runs only while one is showing */
const live = []; let looping = false, lastT = 0, wakeT = 0;
function watch(p) { if (live.indexOf(p) < 0) live.push(p); wakeT = performance.now(); if (!looping) { looping = true; lastT = wakeT; requestAnimationFrame(loop); } }
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now; let any = false;
  for (let i = live.length - 1; i >= 0; i--) { const p = live[i]; if (!p.cv.isConnected) { live.splice(i, 1); continue; } if (p.cv.offsetParent === null) continue; any = true; p.tick(dt); }
  if (any || (live.length && now - wakeT < 6000)) requestAnimationFrame(loop); else looping = false; // the end screen's previews are made 2.6 s before it shows
}
function wearOf(cfg, extra) { const w = {}; WD.SLOTS.forEach(function (s) { const it = WD.worn(cfg, s.id); if (it) w[s.id] = it; }); if (extra && extra.slot) w[extra.slot] = extra; return w; }
const heroId = function () { const c = cfgNow(); return LL.HEROES && c ? LL.HEROES[c.hero | 0].id : 'dora'; };
const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
const $ = function (id) { return document.getElementById(id); };
function save() { if (saveFn) saveFn(); }
function sound(k) { try { LL.audio.init(); LL.audio.ui(k); } catch (e) {} }

/* ---------- the wardrobe screen ---------- */
let big = null, focusIt = null, openedAt = 0;
function unseen(cfg) { let n = 0; ITEMS.forEach(function (it) { if (WD.has(cfg, it) && !cfg.wardSeen[it.id]) n++; }); return cfg.all ? 0 : n; }
WD.badge = function () { const b = $('bWard'), cfg = cfgNow(); if (!b || !cfg) return; const n = unseen(cfg); b.innerHTML = 'Wardrobe' + (n ? ' <i class="wdot">' + n + ' new</i>' : ''); b.setAttribute('aria-label', 'Wardrobe' + (n ? ', ' + n + ' new' : '')); };
function info(it, plainSlot) {
  const cfg = cfgNow(), el = $('wardInfo'); if (!el) return;
  if (!it) { const s = SLOT[plainSlot]; el.innerHTML = '<span class="sl">' + esc(s.name) + '</span><b>Plain</b><p>' + esc(s.plain) + '.</p>'; big.set({ wear: wearOf(cfg, null), hero: heroId() }); delete big.o.wear[plainSlot]; return; }
  const open = WD.has(cfg, it), worn = WD.worn(cfg, it.slot) === it, c1 = WD.count1(cfg, it);
  el.innerHTML = '<span class="sl">' + esc(SLOT[it.slot].name) + (worn ? ' · worn' : '') + '</span><b>' + esc(it.name) + '</b><p>' + esc(it.line) + '</p>' +
    (open ? '' : '<p class="how">' + esc(WD.how(it)) + (c1 ? ' · ' + c1 : '') + '</p>');
  big.set({ wear: open ? wearOf(cfg, it) : (function () { const w = {}; w[it.slot] = it; return w; })(), hero: heroId(), sil: !open });
}
/* the pane when nothing is chosen: what is worn, and what comes next */
function infoWorn() {
  const cfg = cfgNow(), el = $('wardInfo'); if (!el) return; const w = wearOf(cfg, null), names = []; WD.SLOTS.forEach(function (s) { if (w[s.id]) names.push(w[s.id].name); });
  const nx = WD.next(cfg, 1)[0], c1 = nx ? WD.count1(cfg, nx) : '';
  el.innerHTML = '<span class="sl">On you now</span><b>' + (names.length ? esc(names.join(', ')) : 'Nothing yet') + '</b><p>' + (names.length ? 'Choose a card to put it on. Choose it again to take it off.' : 'Play a First Rain. The first thing comes with the first goal.') + '</p>' +
    (nx ? '<p class="how">Next: ' + esc(nx.name) + ' · ' + esc(WD.how(nx)) + (c1 ? ' · ' + c1 : '') + '</p>' : '<p class="how">Everything here is yours.</p>');
  big.set({ wear: w, hero: heroId() });
}
function card(it, slot) {
  const cfg = cfgNow(), b = document.createElement('button'), open = it ? WD.has(cfg, it) : true, worn = it ? WD.worn(cfg, slot) === it : !WD.worn(cfg, slot);
  b.className = 'wcard' + (open ? '' : ' shut'); b.setAttribute('aria-pressed', String(worn)); b.dataset.id = it ? it.id : ''; b.dataset.slot = slot;
  const c1 = it && !open ? WD.count1(cfg, it) : '';
  b.innerHTML = '<canvas width="132" height="99"></canvas><b>' + esc(it ? it.name : 'Plain') + '</b><small>' + esc(it ? (open ? it.line : WD.how(it) + (c1 ? ' · ' + c1 : '')) : SLOT[slot].plain) + '</small>' + (it && open && !cfg.wardSeen[it.id] && !cfg.all ? '<i class="nw">NEW</i>' : '');
  b.setAttribute('aria-label', (it ? it.name : 'Plain ' + SLOT[slot].name) + (open ? (worn ? ', worn' : '') : ', locked: ' + WD.how(it)));
  const w = {}; if (it) w[slot] = it; const p = new Prev(b.querySelector('canvas'), { wear: w, hero: heroId(), small: true, sil: !open }); watch(p);
  const show = function () { focusIt = it; info(it, slot); };
  b.addEventListener('focus', show); b.addEventListener('pointerenter', function () { if (performance.now() - openedAt > 450) show(); }); // not the card that happens to open under the pointer
  b.addEventListener('click', function () {
    if (it && !open) { sound('no'); show(); return; }
    WD.equip(cfg, it ? (worn ? '' : it.id) : '', slot); save(); sound('ok'); draw(b.dataset.slot, b.dataset.id);
  });
  return b;
}
function draw(fSlot, fId) {
  const cfg = cfgNow(), L = $('wardSlots'); if (!L || !cfg) return; L.innerHTML = '';
  WD.SLOTS.forEach(function (s) {
    const sec = document.createElement('div'); sec.className = 'wSlot'; sec.innerHTML = '<h3>' + esc(s.name) + '<small>' + esc(s.line) + '</small></h3>';
    const row = document.createElement('div'); row.className = 'wRow'; row.appendChild(card(null, s.id)); ITEMS.forEach(function (it) { if (it.slot === s.id) row.appendChild(card(it, s.id)); });
    sec.appendChild(row); L.appendChild(sec);
  });
  const n = WD.open(cfg).length;
  $('wardSub').textContent = (cfg.all ? 'Everything is open: the hidden switch in Settings is on. ' : n + ' of ' + ITEMS.length + ' found. ') + (cfg.starsTotal || 0) + ' stars and ' + (cfg.rains || 0) + ' First Rains so far. Each thing is earned by playing; the locked ones say how.';
  const f = fSlot != null ? L.querySelector('.wcard[data-slot="' + fSlot + '"][data-id="' + (fId || '') + '"]') : null;
  if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  if (f) info(focusIt, fSlot); else infoWorn();
}
WD.openScreen = function () {
  const UI = LL.ui, cfg = cfgNow(); if (!UI || !UI.show || !cfg) return;
  if (!big) { big = new Prev($('wardPrev'), { wear: {}, hero: heroId() }); }
  sound();
  openedAt = performance.now(); UI.show('ward'); $('ward').hidden = false; $('ward').scrollTop = 0; draw(null, null); watch(big);
  if (LL.input && LL.input.device !== 'touch') { const b = $('bWardClose'); try { b.focus({ preventScroll: true }); } catch (e) {} }
  ITEMS.forEach(function (it) { if (WD.has(cfg, it)) cfg.wardSeen[it.id] = 1; }); save(); WD.badge();
};
WD.closeScreen = function () { const UI = LL.ui; $('ward').hidden = true; if (UI && UI.show) UI.show('title'); sound(); WD.badge(); };

/* ---------- earning: the feed mid-match, the end screen ---------- */
let curW = null, known = {}, gained = [], said = 0;
const PROG = { goal: 1, thiefdown: 1, relit: 1, moodsolved: 1, fold: 1, nessdown: 1, fruit: 1, redend: 1, lens: 1, over: 1 };
/* every event of a match, from main.js, after the Cabinet has had it */
WD.fx = function (e, W) {
  const cfg = cfgNow(); if (!cfg || !W || !PROG[e.k]) return;
  if (W !== curW) { curW = W; known = WD.known(cfg); gained = []; said = 0; }
  if ((W.auto && !W.lean) || W.dream) { if (e.k === 'over') overBox(false); return; } // only a person earns things, as with the Cabinet
  const ch = WD.count(cfg, e, W), n0 = gained.length; if (!cfg.all) WD.settle(cfg, known, gained); // the hidden switch opens everything; that is not earning it
  if (ch || gained.length > n0) save();
  if (e.k !== 'over') { for (; said < gained.length; said++) { const it = gained[said], on = WD.worn(cfg, it.slot) === it; if (LL.ui && LL.ui.feed) LL.ui.feed('<b>New in the wardrobe</b> · ' + esc(it.name) + (on ? ', on you now' : '')); } }
  else { overBox(true); WD.badge(); }
};
function overEl() {
  let el = $('wardOver'); if (el) return el;
  el = document.createElement('div'); el.id = 'wardOver'; el.hidden = true;
  const st = $('stars'), pn = document.querySelector('#over .panel'); if (st && st.parentNode) st.parentNode.insertBefore(el, st.nextSibling); else if (pn) pn.insertBefore(el, $('sbOver')); return el;
}
function overBox(on) {
  const el = overEl(), cfg = cfgNow(); el.innerHTML = ''; el.hidden = !on || !cfg; if (el.hidden) return;
  let h = '';
  if (gained.length) {
    h += '<h3>New in the wardrobe</h3>';
    h += '<div class="wNewRow">'; gained.slice(0, 3).forEach(function (it) { h += '<div class="wNew"><canvas width="240" height="140"></canvas><span class="sl">' + esc(SLOT[it.slot].name) + '</span><b>' + esc(it.name) + '</b><p>' + esc(it.line) + '</p><button class="chip" data-wear="' + it.id + '"></button></div>'; }); h += '</div>';
    if (gained.length > 3) h += '<p class="sub">And ' + (gained.length - 3) + ' more in the wardrobe, on the title.</p>';
  }
  const nx = WD.next(cfg, 1)[0];
  if (nx) { const c1 = WD.count1(cfg, nx); h += '<div class="wNext"><canvas width="160" height="100"></canvas><div><small>NEXT IN THE WARDROBE</small><b>' + esc(nx.name) + '</b> <span class="sl">' + esc(SLOT[nx.slot].name) + '</span><p>' + esc(WD.how(nx)) + (c1 ? ' · ' + c1 : '') + '</p></div></div>'; }
  else h += '<p class="sub">The wardrobe is full. Everything in it is yours.</p>';
  el.innerHTML = h;
  const cvs = el.querySelectorAll('canvas'); let i = 0;
  gained.slice(0, 3).forEach(function (it) { const w = {}; w[it.slot] = it; watch(new Prev(cvs[i++], { wear: w, hero: heroId() })); });
  if (nx) { const w = {}; w[nx.slot] = nx; watch(new Prev(cvs[i++], { wear: w, hero: heroId(), small: true, sil: true })); }
  el.querySelectorAll('[data-wear]').forEach(function (b) {
    const it = BY[b.getAttribute('data-wear')], lab = function () { const on = WD.worn(cfg, it.slot) === it; b.textContent = on ? 'Wearing it · take it off' : 'Wear it'; b.setAttribute('aria-pressed', String(on)); };
    lab(); b.addEventListener('click', function () { WD.equip(cfg, WD.worn(cfg, it.slot) === it ? '' : it.id, it.slot); save(); sound('ok'); lab(); });
  });
}
/* the title button and the screen's own keys */
function init() {
  const b = $('bWard'); if (b) b.addEventListener('click', WD.openScreen);
  const c = $('bWardClose'); if (c) c.addEventListener('click', WD.closeScreen);
  document.addEventListener('keydown', function (ev) { if (ev.code === 'Escape' && $('ward') && !$('ward').hidden) { ev.preventDefault(); WD.closeScreen(); } });
  WD.badge();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
}
})(typeof window !== 'undefined' ? window : globalThis);
