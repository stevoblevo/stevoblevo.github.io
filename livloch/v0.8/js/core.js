/* LIVLOCH · core: constants, lanes, heroes, items, fruit. No DOM, no THREE.

   DESIGN
   - The map is one valley on the z axis: Reign at -z, Hush at +z. Three lanes ("threads") are polylines that leave each
     base together, spread to x = -48, 0, +48, and meet again. A position along a thread is `s`, metres from the Reign end.
   - Everything a designer would tune lives here as data: hero kits, items, fruit, timings. Rules live in sim.js.
   - Hero abilities are described by `kind` (orb, line, nova, dash, blink, zone, turret) plus numbers, so a new hero is
     a new table row, not new code.
   - Lore is checked against the Saelion repos: Myra Belle is the round purple thread-keeper, not a bell; the Skein Doll
     has copper braids and a mint cardigan; Dora is not called a lantern keeper. Do not undo those.
   (The file says LL and "livelock" in places because the game was called Livelock until 0.4.) */
(function (G) {
'use strict';
var LL = G.LL = {};
var U = LL.U = {
  clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  angDiff: function (a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },
  fmtTime: function (t) { t = Math.max(0, Math.floor(t)); var m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
};
LL.rng = function (seed) {
  var a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

var C = LL.C = {
  HALF_X: 78, HALF_Z: 138, SPAWN_Z: 128, PATRON_Z: 114, FOUNT_R: 13,
  LANE_X: [-48, 0, 48], LANE_NAME: ['West thread', 'Middle thread', 'East thread'],
  GRAV: 26, ZIP_Y: 0.9, ZIP_SPEED: 27,
  TEAM_NAME: ['Reign', 'Hush'], RED_EVERY: 300, RED_T: 60, CREASE_X: [-24, 24], FOLD_T: 45, TEAM_COL: [0xff6a4d, 0x5fe6b6], TEAM_CSS: ['#ff7a5c', '#6fe8c0'],
  CAMPS: [[-24, 0], [-24, -50], [24, -50], [-24, 50], [24, 50]],
  LOCH: { x: 24, z: 0, r: 9.5 }, GREAT_T: 90,
  /* Fruit grows off the threads. Little ones regrow in about a minute; the big lime takes three. */
  FRUIT: [{ k: 'lemon', x: -36, z: -20 }, { k: 'lemon', x: 36, z: -20 }, { k: 'lemon', x: -12, z: 22 }, { k: 'hips', x: -12, z: -24 }, { k: 'hips', x: 30, z: -44 }, { k: 'hips', x: -36, z: 26 },
    { k: 'lime', x: 12, z: 24 }, { k: 'lime', x: -30, z: -46 }, { k: 'biglime', x: 24, z: 28 }],
  FRUIT_INFO: {
    lemon: { name: 'Lemon', line: 'quick feet', t: 9, grow: 55, col: 0xffe14d, css: '#ffe14d' },
    hips: { name: 'Rose hips', line: 'mending', t: 5, grow: 50, col: 0xe0452c, css: '#f0624a' },
    lime: { name: 'Verde Limón', line: 'sour shots', t: 9, grow: 70, col: 0x7ad03a, css: '#8fdc50' },
    biglime: { name: 'Big Verde Limón', line: 'the whole side, sour and quick', t: 12, grow: 180, col: 0x7ad03a, css: '#8fdc50' }
  },
  ULT_LEVEL: 3, MAX_ITEMS: 15
};

LL.lanes = C.LANE_X.map(function (lx) {
  var pts = [[0, -104], [lx * 0.6, -92], [lx, -70], [lx, 70], [lx * 0.6, 92], [0, 104]];
  var cum = [0], len = 0;
  for (var i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len); }
  return { pts: pts, cum: cum, len: len };
});
LL.lanePoint = function (i, s, out) {
  var L = LL.lanes[i]; s = U.clamp(s, 0, L.len);
  var k = 1; while (k < L.pts.length - 1 && L.cum[k] < s) k++;
  var a = L.pts[k - 1], b = L.pts[k], seg = L.cum[k] - L.cum[k - 1], t = (s - L.cum[k - 1]) / seg;
  out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t;
  out.dx = (b[0] - a[0]) / seg; out.dz = (b[1] - a[1]) / seg;
  return out;
};
LL.laneNearest = function (i, x, z, out) {
  var L = LL.lanes[i], best = 1e9, bs = 0;
  for (var k = 1; k < L.pts.length; k++) {
    var a = L.pts[k - 1], b = L.pts[k], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez;
    var t = U.clamp(((x - a[0]) * ex + (z - a[1]) * ez) / l2, 0, 1);
    var d = Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
    if (d < best) { best = d; bs = L.cum[k - 1] + t * Math.sqrt(l2); }
  }
  out.s = bs; out.d = best; return out;
};
LL.nearestLane = function (x, z) {
  var o = { s: 0, d: 0 }, bi = 0, bd = 1e9;
  for (var i = 0; i < 3; i++) { LL.laneNearest(i, x, z, o); if (o.d < bd) { bd = o.d; bi = i; } }
  return bi;
};

/* Heroes. kind: orb | line | nova | dash | blink | zone | turret */
LL.HEROES = [
  { id: 'dora', name: 'Dora', title: 'Carries the little light', col: 0xffc46b, css: '#ffc46b',
    blurb: 'Coffee first. Steady bolts, a thrown light, a thread home.',
    hp: 660, speed: 7.2, aiRange: 36, build: [10, 5, 11, 0, 12, 6, 13, 8, 14, 9, 1, 2, 3, 7, 4],
    gun: { name: 'Lantern bolts', dmg: 10, rate: 7.5, mag: 26, reload: 1.5, speed: 95, spread: 0.012, pellets: 1, range: 46, size: 0.16 },
    ab: [
      { key: 'Q', name: 'Little Light', kind: 'orb', cd: 9, dmg: 125, aoe: 5.5, speed: 34, grav: 14, range: 30, desc: 'Lob a lantern. It lands, and everyone near it regrets standing there.' },
      { key: 'E', name: 'Thread Home', kind: 'dash', cd: 11, dist: 13, shield: 150, desc: 'Slide along your own thread and pick up a short shield.' },
      { key: 'F', name: 'Every Valley', kind: 'zone', ult: true, cd: 70, range: 38, r: 9, dps: 135, life: 4.5, fx: 'sun', desc: 'Hang a little sun over the spot you are looking at.' }
    ] },
  { id: 'anna', name: 'Anna', title: 'Field geologist', col: 0x7fd0e0, css: '#7fd0e0',
    blurb: 'Slow, heavy, accurate. Brings a rock hammer and a fawn with opinions.',
    hp: 720, speed: 6.9, aiRange: 44, build: [0, 5, 2, 1, 6, 3, 8, 4, 7, 9, 10, 11, 12, 13, 14],
    gun: { name: 'Rock hammer', dmg: 37, rate: 2.1, mag: 8, reload: 1.7, speed: 150, spread: 0.003, pellets: 1, range: 60, size: 0.22 },
    ab: [
      { key: 'Q', name: 'Core Sample', kind: 'line', cd: 8, dmg: 150, speed: 110, r: 0.9, range: 55, desc: 'One long straight hole through everything in the way.' },
      { key: 'E', name: 'Tumble', kind: 'nova', cd: 12, r: 7.5, dmg: 110, slow: 0.45, slowT: 2.5, knock: 9, desc: 'Shake the ground. Nearby enemies are hurt, shoved and slowed.' },
      { key: 'F', name: 'Fawn Charge', kind: 'line', ult: true, vis: 'fawn', cd: 75, dmg: 270, speed: 30, r: 2.6, knock: 14, range: 66, flat: true, desc: 'The fawn runs the lane. It does not go around people.' }
    ] },
  { id: 'myra', name: 'Myra Belle', title: 'Thread-keeper', col: 0xb48cf0, css: '#b48cf0',
    blurb: 'Round, purple, hard to move. Keeps the quest log and mends whoever stands near her.',
    hp: 800, speed: 6.8, aiRange: 22, build: [5, 10, 6, 0, 8, 7, 12, 1, 9, 14, 11, 13, 2, 3, 4],
    gun: { name: 'Spool shot', dmg: 7.5, rate: 1.5, mag: 6, reload: 1.9, speed: 90, spread: 0.055, pellets: 7, range: 26, size: 0.14 },
    ab: [
      { key: 'Q', name: 'Snip', kind: 'nova', cd: 8, r: 8, dmg: 95, slow: 0.35, slowT: 2, knock: 4, desc: 'Cut every thread within reach. Whatever was holding on lets go.' },
      { key: 'E', name: 'Mending', kind: 'zone', cd: 16, r: 7, heal: 55, life: 6, fx: 'ward', desc: 'Lay a circle of stitches that mends you and your side while you stand in it.' },
      { key: 'F', name: 'Pull the Thread', kind: 'zone', ult: true, cd: 80, r: 13, burst: 430, delay: 1.3, life: 0.5, fx: 'toll', desc: 'Wind the spool, then pull. Everything nearby comes undone at once.' }
    ] },
  { id: 'skein', name: 'Skein Doll', title: 'Every thread is hers', col: 0xe0955f, css: '#e0955f',
    blurb: 'Fast, fragile, everywhere. Needles by the dozen and a knot that shoots.',
    hp: 580, speed: 7.6, aiRange: 30, build: [1, 0, 5, 3, 6, 2, 8, 4, 9, 7, 11, 10, 12, 13, 14],
    gun: { name: 'Needles', dmg: 5.6, rate: 14, mag: 42, reload: 1.4, speed: 100, spread: 0.028, pellets: 1, range: 36, size: 0.11 },
    ab: [
      { key: 'Q', name: 'Stitch', kind: 'orb', cd: 7, dmg: 45, dot: 32, dotT: 4, slow: 0.3, slowT: 3, speed: 62, range: 34, desc: 'Sew one enemy to the spot. They bleed thread and slow down.' },
      { key: 'E', name: 'Unravel', kind: 'blink', cd: 10, dist: 14, desc: 'Come apart here, come together over there.' },
      { key: 'F', name: 'Knot', kind: 'turret', ult: true, cd: 65, dmg: 21, life: 14, desc: 'Tie a knot that shoots at whoever is closest for a while.' }
    ] }
];

/* Items. mod keys are added to the hero stat block. */
LL.ITEMS = [
  { id: 'wax', cat: 0, tier: 1, cost: 500, name: 'Hot Wax', desc: '+16% gun damage', mod: { dmg: 0.16 } },
  { id: 'pockets', cat: 0, tier: 1, cost: 500, name: 'Deep Pockets', desc: '+40% ammo, +8% fire rate', mod: { mag: 0.4, rate: 0.08 } },
  { id: 'needle', cat: 0, tier: 2, cost: 1250, name: 'Needle Eye', desc: '+20% gun damage, shots pass through one target', mod: { dmg: 0.2, pierce: 1 } },
  { id: 'hands', cat: 0, tier: 2, cost: 1250, name: 'Quick Hands', desc: '+18% fire rate', mod: { rate: 0.18 } },
  { id: 'rain', cat: 0, tier: 3, cost: 3000, name: 'Red Rain', desc: '+35% gun damage, +15% fire rate', mod: { dmg: 0.35, rate: 0.15 } },
  { id: 'stitches', cat: 1, tier: 1, cost: 500, name: 'Extra Stitches', desc: '+160 health', mod: { hp: 160 } },
  { id: 'oil', cat: 1, tier: 1, cost: 500, name: 'Lantern Oil', desc: '+4 health per second', mod: { regen: 4 } },
  { id: 'hooves', cat: 1, tier: 2, cost: 1250, name: 'Fleet Hooves', desc: '+12% speed, +1 stamina', mod: { speed: 0.12, stam: 1 } },
  { id: 'bark', cat: 1, tier: 2, cost: 1250, name: 'Bark Coat', desc: '18% less damage taken, +100 health', mod: { resist: 0.18, hp: 100 } },
  { id: 'wind', cat: 1, tier: 3, cost: 3000, name: 'Second Wind', desc: '+380 health, gun hits heal you 14%', mod: { hp: 380, steal: 0.14 } },
  { id: 'idea', cat: 2, tier: 1, cost: 500, name: 'Bright Idea', desc: '+20% ability power', mod: { ap: 0.2 } },
  { id: 'fold', cat: 2, tier: 1, cost: 500, name: 'Quick Fold', desc: '14% shorter cooldowns', mod: { cdr: 0.14 } },
  { id: 'reson', cat: 2, tier: 2, cost: 1250, name: 'Resonance', desc: '+30% ability power, abilities slow', mod: { ap: 0.3, slowOnAb: 1 } },
  { id: 'now', cat: 2, tier: 2, cost: 1250, name: 'Long Now', desc: '18% shorter cooldowns, ultimate 20% sooner', mod: { cdr: 0.18, ultCdr: 0.2 } },
  { id: 'sun', cat: 2, tier: 3, cost: 3000, name: 'Little Sun', desc: '+55% ability power', mod: { ap: 0.55 } }
];
LL.CATS = ['Gun', 'Body', 'Spirit'];
})(typeof window !== 'undefined' ? window : globalThis);
