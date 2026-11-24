/* LIVLOCH · core: constants, lanes, heroes, items, fruit. No DOM, no THREE.

   DESIGN
   - The map is one valley on the z axis: Reign at -z, Hush at +z. Three lanes ("threads") are polylines that leave each
     base together, spread to x = -48, 0, +48, and meet again. A position along a thread is `s`, metres from the Reign end.
   - Everything a designer would tune lives here as data: hero kits, items, fruit, timings. Rules live in sim.js.
   - Hero abilities are described by `kind` (orb, line, nova, dash, blink, zone, turret) plus numbers, so a new hero is
     a new table row, not new code.
   - 0.25 air: each hero's move in the air is data too, `air` on the hero's row (rules in sim.js, heroJump):
       jumps   how many jumps one airtime allows: 1 a single jump, 2 a double jump (the second costs `cost` stamina, 1)
       hover   a short hanging flight instead of a second jump: { t: most seconds, sink: m/s while hanging, lift: the
               first wing beat's push up in m/s, grip: how fast the hang takes hold (1/s), cost: stamina }
     A row without `air` keeps the jump of 0.24 and before: a jump, then a double jump for one stamina.
   - 0.26 guard: what a second jump does in a fight, and what a thread gives it (rules in sim.js, "0.26 guard"):
       guard   a short defensive window that opens with the second jump and costs nothing more than its stamina:
               { kind: 'aegis', t, arc, knock }  Anna: a bronze shield toward the aim; hits from within `arc` degrees of
                                                 her aim are blocked for t seconds, and a melee attacker is shoved `knock` m
               { kind: 'bubble', t, hp }         Dora: a bubble of light that soaks up to hp damage for t seconds, then pops
               { kind: 'fray', t }               Skye: she comes apart into thread for t seconds and every hit passes through
       hat     Dora: { need, dmg, out, speed, back, r }. `need` thread boosts charge her straw hat; thrown (G, pad R3) it
               flies `out` metres at `speed`, comes back at `back` m/s, and cuts each enemy it passes once each way for dmg
       boon    Myra Belle: { heal, r }. A hover that a thread boosted and that ends still on the thread mends her and her
               side within r metres by heal
     C.TBOOST is the thread boost: a second jump or a hover begun within r metres of a thread while moving along it
     (|cos| >= align, at least minSp m/s) gets vy m/s more lift and speed along the thread (sp times the run speed), which
     carries for t seconds; a boosted hover sinks at sinkK of its usual rate.
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
    { k: 'lime', x: 12, z: 24 }, { k: 'lime', x: -30, z: -46 },
    // Big fruit is the rare tier. Each one ripens out of sight and can be seen and eaten only through one view.
    { k: 'biglime', x: 24, z: 28, lens: 'glow' }, { k: 'biglemon', x: -60, z: -10, lens: 'origami' }, { k: 'bighips', x: 60, z: 14, lens: 'knight' }],
  FRUIT_INFO: {
    lemon: { name: 'Lemon', line: 'quick feet', t: 9, grow: 55, col: 0xffe14d, css: '#ffe14d' },
    hips: { name: 'Rose hips', line: 'mending', t: 5, grow: 50, col: 0xe0452c, css: '#f0624a' },
    lime: { name: 'Verde Limón', line: 'sour shots', t: 9, grow: 70, col: 0x7ad03a, css: '#8fdc50' },
    biglime: { name: 'Big Verde Limón', line: 'the whole side, sour and quick', t: 12, grow: 180, col: 0x7ad03a, css: '#8fdc50', big: 'lime' },
    biglemon: { name: 'Big Lemon', line: 'the whole side, quick', t: 16, grow: 160, col: 0xffe14d, css: '#ffe14d', big: 'lemon' },
    bighips: { name: 'Big Rose hips', line: 'the whole side, mended', t: 6, grow: 170, col: 0xe0452c, css: '#f0624a', big: 'hips' }
  },
  /* Views. The view the player is wearing is model state (W.lens), set by the player like any other action.
     Before each red rain the valley sets a mood; one view fits it. Wear that view before the rain and the rain comes thin. */
  LENSES: ['snow', 'ink', 'lantern', 'knight', 'origami', 'glow', 'rain', 'memory'],
  MOODS: [
    { lens: 'rain', line: 'It smells of iron. Face the weather.' }, { lens: 'memory', line: 'You have stood here before. About ten seconds ago.' },
    { lens: 'knight', line: 'A paper theatre. Someone has lit the footlights.' },
    { lens: 'origami', line: 'There is daylight folded under the snow.' },
    { lens: 'glow', line: 'The valley hums in wire. Follow the lines.' },
    { lens: 'ink', line: 'A stain that might be a stag. Doubt it.' },
    { lens: 'lantern', line: 'Old gold. The first valley, before the snow.' }
  ],
  /* Ever Fallen: the valley is already lost. LIT_T is how long a recovered light holds; the rain comes twice as often. */
  /* Echo: your last few seconds, replayed beside you. ECHO_T seconds normally, ECHO_MEM in the Memory view. */
  ECHO_T: 6, ECHO_MEM: 10, ECHO_CD: 45, ECHO_CD_MEM: 25, ECHO_DMG: 0.7,
  LIT_T: 80, FALLEN_RED_EVERY: 150,
  RED_WARN: 30, MOOD_GUESSES: 3,
  ULT_LEVEL: 3, MAX_ITEMS: 15,
  TBOOST: { r: 2.4, align: 0.7, minSp: 3, vy: 2.2, sp: 1.6, t: 0.7, sinkK: 0.4 } // 0.26 guard: the thread boost (see the DESIGN note above)
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

/* Heroes. kind: orb | line | nova | dash | blink | zone | turret | lift (0.25 rook) */
LL.HEROES = [
  { id: 'dora', name: 'Dora', title: 'Carries the little light', col: 0xffc46b, css: '#ffc46b',
    blurb: 'Coffee first. Steady bolts, a thrown light, a thread home.',
    air: { jumps: 2, guard: { kind: 'bubble', t: 1.2, hp: 200 }, hat: { need: 3, dmg: 100, out: 15, speed: 24, back: 28, r: 1.1 } }, // 0.26 guard: a second jump now, and it wraps her in an astral bubble; three thread boosts charge the hat (0.25: one jump)
    hp: 660, speed: 7.2, aiRange: 36, build: [10, 5, 11, 0, 12, 6, 13, 8, 14, 9, 1, 2, 3, 7, 4],
    gun: { name: 'Lantern bolts', dmg: 10, rate: 7.5, mag: 26, reload: 1.5, speed: 95, spread: 0.012, pellets: 1, range: 46, size: 0.16 },
    ab: [
      { key: 'Q', name: 'Little Light', kind: 'orb', cd: 9, dmg: 125, aoe: 5.5, speed: 34, grav: 14, range: 30, desc: 'Lob a lantern. It lands, and everyone near it regrets standing there.' },
      { key: 'E', name: 'Thread Home', kind: 'dash', cd: 11, dist: 13, shield: 150, desc: 'Slide along your own thread and pick up a short shield.' },
      { key: 'F', name: 'Every Valley', kind: 'zone', ult: true, cd: 70, range: 38, r: 9, dps: 135, life: 4.5, fx: 'sun', desc: 'Hang a little sun over the spot you are looking at.' }
    ] },
  { id: 'anna', name: 'Anna', title: 'Field geologist', col: 0x7fd0e0, css: '#7fd0e0',
    blurb: 'Slow, heavy, accurate. Brings a rock hammer and a fawn with opinions.',
    air: { jumps: 2, guard: { kind: 'aegis', t: 0.9, arc: 60, knock: 1.6 } }, // 0.25 air: the second jump is a rock-hop, a kick off thin air; 0.26 guard: and it raises Athena's shield
    hp: 720, speed: 6.9, aiRange: 44, build: [0, 5, 2, 1, 6, 3, 8, 4, 7, 9, 10, 11, 12, 13, 14],
    gun: { name: 'Rock hammer', dmg: 37, rate: 2.1, mag: 8, reload: 1.7, speed: 150, spread: 0.003, pellets: 1, range: 60, size: 0.22 },
    ab: [
      { key: 'Q', name: 'Core Sample', kind: 'line', cd: 8, dmg: 150, speed: 110, r: 0.9, range: 55, desc: 'One long straight hole through everything in the way.' },
      { key: 'E', name: 'Tumble', kind: 'nova', cd: 12, r: 7.5, dmg: 110, slow: 0.45, slowT: 2.5, knock: 9, desc: 'Shake the ground. Nearby enemies are hurt, shoved and slowed.' },
      { key: 'F', name: 'Fawn Charge', kind: 'line', ult: true, vis: 'fawn', cd: 75, dmg: 270, speed: 30, r: 2.6, knock: 14, range: 66, flat: true, desc: 'The fawn runs the lane. It does not go around people.' }
    ] },
  { id: 'myra', name: 'Myra Belle', title: 'Thread-keeper', col: 0xb48cf0, css: '#b48cf0',
    blurb: 'Round, purple, hard to move. Keeps the quest log and mends whoever stands near her.',
    air: { jumps: 1, hover: { t: 1.2, sink: 1.2, lift: 1.6, grip: 5, cost: 1 }, boon: { heal: 50, r: 8 } }, // 0.26 guard: boon, a hover the thread boosted that ends on it mends her side. 0.25 air: no second jump; hold jump in the air and her wings hold her up (from the top of a jump she hangs between 1.9 and 0.9 m)
    hp: 800, speed: 6.8, aiRange: 22, build: [5, 10, 6, 0, 8, 7, 12, 1, 9, 14, 11, 13, 2, 3, 4],
    gun: { name: 'Spool shot', dmg: 7.5, rate: 1.5, mag: 6, reload: 1.9, speed: 90, spread: 0.055, pellets: 7, range: 26, size: 0.14 },
    ab: [
      { key: 'Q', name: 'Snip', kind: 'nova', cd: 8, r: 8, dmg: 95, slow: 0.35, slowT: 2, knock: 4, desc: 'Cut every thread within reach. Whatever was holding on lets go.' },
      { key: 'E', name: 'Mending', kind: 'zone', cd: 16, r: 7, heal: 55, life: 6, fx: 'ward', desc: 'Lay a circle of stitches that mends you and your side while you stand in it.' },
      { key: 'F', name: 'Pull the Thread', kind: 'zone', ult: true, cd: 80, r: 13, burst: 430, delay: 1.3, life: 0.5, fx: 'toll', desc: 'Wind the spool, then pull. Everything nearby comes undone at once.' }
    ] },
  { id: 'skein', name: 'Skye', title: 'The Skein Doll', /* 0.26: the owner named her Skye; the id stays 'skein' (saves and hooks) */ col: 0xe0955f, css: '#e0955f',
    blurb: 'Every thread is hers. Fast, fragile, everywhere. Needles by the dozen and a knot that shoots.',
    air: { jumps: 2, guard: { kind: 'fray', t: 0.6 } }, // 0.25 air: the second jump is a loose spinning tuck; 0.26 guard: in it she frays into thread and hits pass through
    hp: 580, speed: 7.6, aiRange: 30, build: [1, 0, 5, 3, 6, 2, 8, 4, 9, 7, 11, 10, 12, 13, 14],
    gun: { name: 'Needles', dmg: 5.6, rate: 14, mag: 42, reload: 1.4, speed: 100, spread: 0.028, pellets: 1, range: 36, size: 0.11 },
    ab: [
      { key: 'Q', name: 'Stitch', kind: 'orb', cd: 7, dmg: 45, dot: 32, dotT: 4, slow: 0.3, slowT: 3, speed: 62, range: 34, desc: 'Sew one enemy to the spot. They bleed thread and slow down.' },
      { key: 'E', name: 'Unravel', kind: 'blink', cd: 10, dist: 14, desc: 'Come apart here, come together over there.' },
      { key: 'F', name: 'Knot', kind: 'turret', ult: true, cd: 65, dmg: 21, life: 14, desc: 'Tie a knot that shoots at whoever is closest for a while.' }
    ] },
  /* 0.25 rook: Rook Vale, the Wick Aviator, the fifth hero. He was designed on the Lantern Ford study branch
     (work/lantern-ford-wick-aviator, WICK-AVIATOR.md) as a bonus pilot for a separate chase; 0.25 brings him into normal
     matches. Kept from the study: name, colour, blurb, the three ability names, the lift's shape (a short steerable rise,
     then down; a thread catches him once). Not ported: the Ford chase, its pickups and shop, and the pack-integrity
     meter (a second resource with nothing left to refill it; the cooldown and the altitude cap already stop continuous
     flight). Appended last on purpose: saves store the hero as an index, so the first four keep theirs.
     Lantern Lift ('lift', sim.js liftCast/liftStep): rise seconds of steerable climb toward cap metres, then a glide at
     glide times gravity, sinking no faster than sink m/s; boost is the air speed multiplier he steers toward. Moving along a
     thread within threadR metres of it adds thread seconds, once per lift.
     0.26 guard: a dash while lifting or gliding is a barrel roll, a sideways flip that lasts roll seconds; while it lasts,
     shots from farther than rollNear metres miss him (sim.js rollStart). */
  { id: 'rook', name: 'Rook Vale', title: 'The Wick Aviator', col: 0xe39a90, css: '#e39a90', /* 0.26: rose gold (his coat is copper and rose gold, teal highlights) */
    blurb: 'A loch courier with a glazed lantern-kite. Take the high line, then land clean.',
    hp: 610, speed: 7.1, aiRange: 34, build: [0, 5, 3, 7, 1, 6, 10, 2, 8, 11, 4, 9, 12, 13, 14], air: { jumps: 1 },
    gun: { name: 'Wick sparks', dmg: 15.5, rate: 5, mag: 18, reload: 1.35, speed: 100, spread: 0.011, pellets: 1, range: 44, size: 0.19 },
    ab: [
      { key: 'Q', name: 'Wick Skip', kind: 'line', cd: 6.5, dmg: 85, speed: 65, r: 0.72, range: 29, desc: 'Send a slow-burning stitch along your sightline.' },
      { key: 'E', name: 'Lantern Lift', kind: 'lift', cd: 9, rise: 1.0, cap: 4.2, glide: 0.3, sink: 3.4, boost: 1.35, thread: 0.35, threadR: 2.2, roll: 0.45, rollNear: 4, desc: 'Rise and steer for a moment, then glide down. Aim and fire while aloft. A thread under you holds you up a little longer.' },
      { key: 'F', name: 'Landing Bell', kind: 'zone', ult: true, cd: 60, r: 7.5, burst: 300, delay: 0.9, life: 0.5, fx: 'toll', desc: 'Ring the bell. It tolls where you are a moment later, so ring it on the way down.' }
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
/* THE CABINET. Easter eggs. Each entry opens on a feat in play; a switch hidden in Settings opens all of them.
   Doors lead to other Saelion worlds (addresses from the public atlas). 'snuff' is a small game kept in this file's
   neighbour, ui.js. 'plates' is the concept art the game was drawn from. */
/* GOALS. The owner played and said a match was not enticing enough to finish. One small thing to do next is always on
   screen, each pays souls, and together they walk the player through the hidden systems in the order they should be
   found. Any goal completes whenever its thing happens; the screen shows the first one not yet done. */
/* FIRST RAIN: the short match. Five minutes of build-up, one minute of red rain, then it ends and counts stars.
   Each star is one of the things worth learning. */
LL.STARS = [
  { id: 'houses', line: 'Every house still standing' },
  { id: 'mood', line: 'Answered the mood' },
  { id: 'guard', line: 'Took a Hush guardian' },
  { id: 'ness', line: 'Put the Ness down' },
  { id: 'goals', line: 'Six goals done' }
];
LL.GOALS = [
  { id: 'orbs', line: 'Shoot five of your own orbs', pay: 60 },
  { id: 'thread', line: 'Ride a thread to the front', pay: 40 },
  { id: 'view', line: 'Change the view', pay: 40 },
  { id: 'thief', line: 'Catch a small one', pay: 80 },
  { id: 'guard', line: 'Drop a Hush guardian', pay: 120 },
  { id: 'echo', line: 'Fight beside yourself', pay: 60 },
  { id: 'mood', line: 'Answer the mood before the rain', pay: 100 },
  { id: 'big', line: 'Eat a big fruit', pay: 100 },
  { id: 'fold', line: 'Fold the valley', pay: 150 },
  { id: 'ness', line: 'Put the Ness down', pay: 200 },
  { id: 'gate', line: 'Shut the Hush gate', pay: 0 }
];
/* Doors that are always open, on the title: the owner's other worlds. */
LL.WORLDS = [
  { name: 'Everfallen', url: 'https://stevoblevo.github.io/everfallen/' },
  { name: 'AND SO', url: 'https://saelion.co/and-so' },
  { name: 'Reignfawn', url: 'https://saelion.co/reignfawn' },
  { name: 'kk', url: 'https://saelion.co/kk' },
  { name: 'The Peachfall', url: 'https://stevoblevo.github.io/peachfall/' }
];
LL.CABINET = [
  { id: 'animatic', name: 'The animatic', open: true, video: 'art/video/animatic.mp4', line: 'Three threads. One stalemate. Eighteen seconds.' },
  { id: 'trailer', name: 'The concept trailer', open: true, video: 'art/video/trailer.mp4', line: 'The valley as a paper diorama. Fifteen seconds.' },
  { id: 'plates', name: 'The plates', feat: 'Answer one mood', line: 'The concept art this valley was drawn from.' },
  { id: 'snuff', name: 'Snuff', feat: 'Catch a small one yourself, or recover a light', line: 'Nine houses, thirty seconds, one thumb.' },
  { id: 'kk', name: 'kk', feat: 'Sit through a whole match leaning back', line: 'A watch, not a wall.', url: 'https://saelion.co/kk' },
  { id: 'everfallen', name: 'AND SO 7 · Everfallen', feat: 'Hold eight minutes in Ever Fallen', line: 'A storybook toy tuned in 31 steps, like the sounds here.', url: 'https://stevoblevo.github.io/and-so/' },
  { id: 'redreign', name: 'Red Reign', feat: 'Stand through a red rain you thinned', line: 'Red rain, and a way home that stays open.', url: 'https://stevoblevo.github.io/red-reign/' },
  { id: 'peachfall', name: 'The Peachfall', feat: 'Eat a big fruit', line: 'Play the dream or watch it.', url: 'https://stevoblevo.github.io/peachfall/' },
  { id: 'knight', name: 'Knight Side', feat: 'Fold the valley', line: 'An isometric knight and some lanterns.', url: 'https://stevoblevo.github.io/knight-side/' },
  { id: 'foldflow', name: 'Fold / Flow', feat: 'Wear every view in one match', line: 'Bring five lanterns home.', url: 'https://saelion.co/fold-flow' },
  { id: 'peachball', name: 'Peach Ball', feat: 'Put the Ness down', line: 'A peach, a mood, and nowhere else you need to be.', url: 'https://saelion.co/peach-ball' },
  { id: 'garden', name: 'Red Rain · Night Garden', feat: 'Recover ten lights in one fall', line: 'Gather five small lights in a garden that remembers.', url: 'https://night-garden-beta.vercel.app/' }
];
LL.PLATES = [
  { f: 'art/title.jpg', name: 'The first plate', line: 'Sent with the words "some concept in game art for direction eventual". It became the title screen and the Cobalt Snow view.' },
  { f: 'art/concepts/05_original_four_looks_reference.jpg', name: 'The four looks', line: 'Livloch 0.3, before the plate: the four looks built from the Saelion style kits. Kept for reference.' },
  { f: 'art/concepts/01_gen3_storeybrook.jpg', name: 'Gen 3 · Storeybrook', line: 'The paper theatre. Knight Night and Origami come from here.' },
  { f: 'art/concepts/02_gen4_fifteen_modes.jpg', name: 'Gen 4 · fifteen modes', line: '"Playable Reality Views". This plate is why views became a mechanic in 0.9.' },
  { f: 'art/concepts/03_gen5_afterimage.jpg', name: 'Gen 5 · Afterimage', line: 'The radial toggle and the fifteenth mode. Neither is built yet.' },
  { f: 'art/concepts/07_a_living_world_poster.jpg', name: 'A Living World', line: 'The poster. It lists what the game is meant to hold: the views, Guardian Flow, Depthfield, Skein Memory, Ever Fallen, Lean Back.' },
  { f: 'art/concepts/08_threads_of_destiny.jpg', name: 'Threads of Destiny', line: 'Three moments: meeting the fox, the red rain, the Ness. All four heroes stand together in the last one.' },
  { f: 'art/concepts/09_lanterns_hush_and_the_ness.jpg', name: 'Lanterns, Hush and the Ness', line: 'The same three moments again. The small one carrying a lantern is the thief the game already has.' },
  { f: 'art/concepts/10_crown_and_knight.jpg', name: 'The crown and the knight', line: 'A girl in a crown and a small knight with blue eyes, on a balcony under a pink moon.' },
  { f: 'art/concepts/06_livloch_key_art.jpg', name: 'Livloch key art', line: 'The far castle, the Ness by the falls, a fox called Guardian Flow. Most of this is not in the game yet; it is where the game is going.' },
  { f: 'art/concepts/04_gen15_skeptic_noir.jpg', name: 'Gen XV · Skeptic Noir', line: '"Recover the light". Inkblot Noir, the small ones that carry lights, and Ever Fallen come from here.' }
];
})(typeof window !== 'undefined' ? window : globalThis);
