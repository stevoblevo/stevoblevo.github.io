/* LIVLOCH · sim: the whole match, headless. Reads LL.core, writes LL.sim.W. No DOM, no THREE.

   DESIGN
   - This file is the game. It never reads the look, the renderer or the DOM (tools/test.js enforces that), so any
     rule here holds in every look and can be played to the end under Node.
   - The premise: paper troopers march three threads and cancel exactly. That stalemate is the puzzle. Each system below
     is one asymmetry the player can use to break it, most of them never explained in the game:
       souls and orbs   half a kill's worth is banked, half floats up as an orb you shoot to secure (or deny)
       the fold         a crease under a stray or under the Ness folds two threads together for 45 s
       the Ness         a loch boss; the last hit gives the whole side the Greatness for 90 s
       fruit            lemon = quick feet, rose hips = mending, Verde Limon = sour shots, and one big lime for everyone
   - The Hush has no heroes. It has hollows (one heavy unit per thread, respawning), thieves (take souls or a guardian's
     light and run for the gate), and red rain every 300 s. This is Reignfawn's Hush, not a mirror team.
   - Pacing borrowed from Knight Side: Last Breath (once per life under 30% health) and Mercy (the Hush eases off when
     the Reign is two structures behind).
   - The sim talks to the outside only through W.fx, a list of plain event objects drained every frame by gfx, audio
     and ui. Nothing outside may write to W except the player's hero controls (hero.ctl).
   - Bots and the human drive heroes through the same hero.ctl, so "Watch it run" is the same code path as play.
   - Not deterministic: Math.random is used for small timing jitter. Do not build replay on it without fixing that. */
(function (G) {
'use strict';
const LL = G.LL, C = LL.C, U = LL.U, lanes = LL.lanes;
const S = LL.sim = {};
let W = null;
const P = { x: 0, z: 0, dx: 0, dz: 0 }, Q = { s: 0, d: 0 };
const rel = (team, lane, s) => team === 0 ? s : lanes[lane].len - s;
S.rel = rel;
function fx(o) { if (W.fx.length < 500) W.fx.push(o); }
const hyp = Math.hypot;

/* ---------- geometry ---------- */
function segCyl(ax, ay, az, bx, by, bz, cx, cz, R, y0, y1) {
  const dx = bx - ax, dz = bz - az, fx_ = ax - cx, fz = az - cz;
  const a = dx * dx + dz * dz, c = fx_ * fx_ + fz * fz - R * R;
  let t;
  if (c <= 0) t = 0;
  else {
    if (a < 1e-9) return -1;
    const b = fx_ * dx + fz * dz; if (b >= 0) return -1;
    const disc = b * b - a * c; if (disc < 0) return -1;
    t = (-b - Math.sqrt(disc)) / a; if (t > 1) return -1;
  }
  const y = ay + (by - ay) * t;
  if (y < y0 || y > y1) {
    const dy = by - ay; if (Math.abs(dy) < 1e-9) return -1;
    const ty = ((y < y0 ? y0 : y1) - ay) / dy;
    if (ty < t || ty > 1) return -1;
    const px = ax + dx * ty - cx, pz = az + dz * ty - cz;
    if (px * px + pz * pz > R * R) return -1;
    return ty;
  }
  return t;
}
S.segCyl = segCyl;
function losClear(ax, az, bx, bz) {
  const obs = W.obstacles, dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    const t = U.clamp(((o.x - ax) * dx + (o.z - az) * dz) / l2, 0, 1);
    const px = ax + dx * t - o.x, pz = az + dz * t - o.z;
    if (px * px + pz * pz < o.r * o.r) return false;
  }
  return true;
}

/* ---------- world ---------- */
function mk(kind, team, x, z, r, h, hp) {
  const u = { id: W.nextId++, kind: kind, team: team, x: x, y: 0, z: z, vx: 0, vy: 0, vz: 0, yaw: team === 1 ? Math.PI : 0,
    r: r, h: h, hp: hp, maxHp: hp, alive: true, struct: false, flash: 0, slowT: 0, slowAmt: 0,
    dotT: 0, dotDps: 0, dotSrc: null, dotAcc: 0, atkT: 0, tgt: null, tgtT: Math.random() * 0.3, lastHurt: -99, owner: null };
  W.units.push(u); return u;
}
function spawnPos(team, slot) { return { x: (slot - 1) * 4.5, z: (team === 0 ? -1 : 1) * C.SPAWN_Z }; }
S.spawnPos = spawnPos;

S.newWorld = function (o) {
  W = S.W = {
    t: 0, over: false, winner: -1, rng: LL.rng(o.seed || 7), diff: o.difficulty == null ? 1 : o.difficulty,
    units: [], heroes: [], structs: [], troopers: [], strays: [], knots: [],
    projs: [], orbs: [], zones: [], obstacles: [], fx: [], st: [[], []], patron: [null, null],
    waveT: 4, waveN: 0, nextId: 1, player: null, kills: [0, 0], fray: false, front: [[0, 0, 0], [0, 0, 0]],
    coordT: 0, cleanT: 0, auto: !!o.auto, tune: o.tune || {}, calm: 0, warned: false, thieves: [], thiefT: 150, red: 0, redNext: C.RED_EVERY, hollowT: [38, 44, 50], mercy: false, great: [0, 0], rush: [0, 0], rushAll: [false, false], rushNext: [0, 0], gutter: false, ness: null
  };
  buildObstacles(); buildStructs(); buildStrays(); buildNess(); buildCreases(); buildFruit(); buildHeroes(o);
  coordinate();
  return W;
};

function buildObstacles() {
  const r = LL.rng(9917), obs = W.obstacles;
  let tries = 0;
  while (obs.length < 56 && tries++ < 4000) {
    const x = (r() * 2 - 1) * 73, z = -(3 + r() * 93);
    const tree = r() < 0.45;
    const rad = tree ? 0.8 : 1.3 + r() * 1.9, h = tree ? 9 : 1.4 + r() * 2.4;
    let ok = true;
    for (let i = 0; i < 3 && ok; i++) { LL.laneNearest(i, x, z, Q); if (Q.d < 8.5 + rad) ok = false; }
    for (let i = 0; i < C.CAMPS.length && ok; i++) if (hyp(x - C.CAMPS[i][0], z - C.CAMPS[i][1]) < 8 + rad) ok = false;
    for (let i = 0; i < obs.length && ok; i++) if (hyp(x - obs[i].x, z - obs[i].z) < rad + obs[i].r + 3.2) ok = false;
    if (hyp(x, z + C.SPAWN_Z) < 34) ok = false;
    for (let i = 0; i < C.FRUIT.length && ok; i++) { const f = C.FRUIT[i]; if (hyp(x - f.x, z - f.z) < 4.5 + rad || hyp(-x - f.x, -z - f.z) < 4.5 + rad) ok = false; }
    if (hyp(x - C.LOCH.x, z - C.LOCH.z) < 13 + rad || hyp(-x - C.LOCH.x, -z - C.LOCH.z) < 13 + rad) ok = false;
    if (Math.abs(z) < rad + 2.5) ok = false;
    if (!ok) continue;
    const seed = r();
    obs.push({ x: x, z: z, r: rad, h: h, tree: tree, seed: seed });
    obs.push({ x: -x, z: -z, r: rad, h: h, tree: tree, seed: seed });
  }
}
function buildStructs() {
  for (let team = 0; team < 2; team++) {
    for (let lane = 0; lane < 3; lane++) {
      const L = lanes[lane];
      const mkS = (kind, f, r, h, hp) => {
        const s = team === 0 ? L.len * f : L.len * (1 - f);
        LL.lanePoint(lane, s, P);
        const u = mk(kind, team, P.x, P.z, r, h, hp);
        u.struct = true; u.lane = lane; u.s = s; u.pressed = false; u.scanT = Math.random() * 0.25; u.ramp = 0; u.lastTgt = null; u.immuneFx = 0;
        W.structs.push(u); return u;
      };
      const outer = mkS('guardian', 0.37, 2.4, 9, 2600); outer.range = 20; outer.rate = 0.9; outer.dmgT = 70; outer.dmgH = 46;
      const inner = mkS('warden', 0.2, 3, 11, 3600); inner.range = 21; inner.rate = 0.8; inner.dmgT = 85; inner.dmgH = 58;
      W.st[team][lane] = { outer: outer, inner: inner };
    }
    const p = mk('patron', team, 0, (team === 0 ? -1 : 1) * C.PATRON_Z, 4, 12, 6500);
    p.struct = true; p.lane = 1; p.s = team === 0 ? 0 : lanes[1].len; p.pressed = false; p.scanT = 0; p.ramp = 0; p.lastTgt = null; p.immuneFx = 0;
    p.range = 24; p.rate = 0.7; p.dmgT = 110; p.dmgH = 80;
    W.structs.push(p); W.patron[team] = p;
  }
  // the Hush has no heroes to defend with, so what it builds is heavier
  const k = [1.2, 1.5, 1.8][W.diff], kd = [1, 1.25, 1.5][W.diff];
  W.structs.forEach(function (s) { if (s.team === 1) { s.hp = s.maxHp = s.maxHp * k; s.dmgH *= kd; } });
}
function buildStrays() {
  C.CAMPS.forEach(function (c) {
    const u = mk('stray', 2, c[0], c[1], 1.3, 2.6, 900);
    u.hx = c[0]; u.hz = c[1]; u.aggro = null; u.respT = 0;
    W.strays.push(u);
  });
}
/* Creases: the valley is paper. Each crease sits under something (a stray, the Ness) and folds two threads together. */
function buildCreases() {
  const west = W.strays.find(s => s.hx === C.CREASE_X[0] && s.hz === 0);
  W.creases = [
    { x: C.CREASE_X[0], z: 0, a: 1, b: 0, guard: west, t: 0, cd: 0, team: -1, from: -1, to: -1, n: 0 },
    { x: C.CREASE_X[1], z: 0, a: 1, b: 2, guard: W.ness, t: 0, cd: 0, team: -1, from: -1, to: -1, n: 0 }
  ];
}
S.creaseFor = function (h) {
  if (!h.alive || h.zip) return -1;
  for (let i = 0; i < W.creases.length; i++) { const c = W.creases[i]; if (c.t <= 0 && c.cd <= 0 && !c.guard.alive && hyp(h.x - c.x, h.z - c.z) < 4.5) return i; }
  return -1;
};
S.fold = function (h, i) {
  const c = W.creases[i]; if (!c || S.creaseFor(h) !== i) return false;
  const toMid = Math.sin(h.yaw) * (0 - c.x) > 0;
  c.from = toMid ? c.b : c.a; c.to = toMid ? c.a : c.b; c.t = C.FOLD_T; c.team = h.team; c.n++; h.folds = (h.folds || 0) + 1;
  fx({ k: 'fold', i: i, from: c.from, to: c.to, team: h.team, p: h.isPlayer, x: c.x, z: c.z });
  return true;
};
function foldTrooper(u, c) {
  const x0 = u.x, z0 = u.z;
  u.lane = c.to; LL.laneNearest(c.to, C.LANE_X[c.to], u.z, Q); u.s = Q.s; LL.lanePoint(c.to, u.s, P);
  u.x = P.x - P.dz * u.lat; u.z = P.z + P.dx * u.lat; u.folded = true; u.tgt = null;
  fx({ k: 'blink', x0: x0, z0: z0, x: u.x, y: 0, z: u.z, col: 0xf4e8d6 });
}
/* ---------- fruit: lemons (quick feet), rose hips (mending), Verde Limón little and big (sour shots) ---------- */
function buildFruit() {
  W.fruit = C.FRUIT.map(function (f, i) { return { i: i, k: f.k, x: f.x, z: f.z, ripe: false, t: f.k === 'biglime' ? 120 : 18 + i * 5 }; });
  W.pull = [0, 0];
}
function eat(h, f) {
  const info = C.FRUIT_INFO[f.k], T = info.t;
  f.ripe = false; f.t = info.grow; h.fruit++;
  if (f.k === 'lemon') h.zestT = T;
  else if (f.k === 'hips') { h.hipsT = T; h.slowT = 0; h.dotT = 0; }
  else if (f.k === 'lime') h.furyT = T;
  else {
    for (let i = 0; i < W.heroes.length; i++) { const o = W.heroes[i]; if (o.alive && o.team === h.team) { o.furyT = Math.max(o.furyT, T); o.zestT = Math.max(o.zestT, T); } }
    W.pull[h.team] = T;
    for (let i = 0; i < W.troopers.length; i++) { const u = W.troopers[i]; if (!u.alive || u.team === h.team) continue; const dx = u.x - h.x, dz = u.z - h.z, d = hyp(dx, dz); if (d < 9) { const n = d || 1; u.x += dx / n * 3; u.z += dz / n * 3; applySlow(u, 0.5, 2); } }
  }
  fx({ k: 'fruit', kind: f.k, u: h, p: h.isPlayer, x: f.x, z: f.z, t: T });
}
function fruitStep(dt) {
  for (let t = 0; t < 2; t++) if (W.pull[t] > 0) W.pull[t] -= dt;
  for (let i = 0; i < W.fruit.length; i++) {
    const f = W.fruit[i];
    if (!f.ripe) { f.t -= dt; if (f.t <= 0) { f.ripe = true; fx({ k: 'fruitripe', kind: f.k, x: f.x, z: f.z }); } continue; }
    const reach = f.k === 'biglime' ? 3.2 : 2.2;
    for (let j = 0; j < W.heroes.length; j++) { const h = W.heroes[j]; if (h.alive && h.y < 2.5 && hyp(h.x - f.x, h.z - f.z) < reach) { eat(h, f); break; } }
  }
}
function buildNess() {
  const n = mk('ness', 2, C.LOCH.x, C.LOCH.z, 2.6, 7, 5200);
  n.alive = false; n.respT = 180; n.aggro = null; n.count = 0; n.spitT = 0; n.slamT = 0; n.rise = 0;
  W.ness = n;
}
function nessStep(n, dt) {
  if (!n.alive) {
    n.respT -= dt;
    if (n.respT <= 0) { n.alive = true; n.count++; n.maxHp = 3400 + 800 * n.count + (W.t / 60) * 110; n.hp = n.maxHp; n.aggro = null; n.rise = 0; n.lastHurt = -99; n.upT = W.t; W.rushNext[0] = W.t + 10 + W.rng() * 30; W.rushNext[1] = W.t + 10 + W.rng() * 30; fx({ k: 'nessup', x: n.x, z: n.z }); }
    return;
  }
  n.rise = Math.min(1, n.rise + dt * 0.5); if (n.slowT > 0) n.slowT -= dt; n.spitT -= dt; n.slamT -= dt;
  let a = n.aggro;
  if (a && (!a.alive || hyp(a.x - n.x, a.z - n.z) > 32 || W.t - n.lastHurt > 8)) a = n.aggro = null;
  if (!a) { if (W.t - n.lastHurt > 5) heal(n, n.maxHp * 0.06 * dt); n.yaw += dt * 0.3; return; }
  const dx = a.x - n.x, dz = a.z - n.z, d = hyp(dx, dz) || 1, min = W.t / 60;
  n.yaw += U.angDiff(Math.atan2(dx, dz), n.yaw) * Math.min(1, dt * 4);
  if (n.spitT <= 0) {
    n.spitT = 1.5;
    const ox = n.x + Math.sin(n.yaw) * 2.6, oy = 6.4, oz = n.z + Math.cos(n.yaw) * 2.6, sp = 38, lead = d / sp * 0.7;
    let vx = a.x + a.vx * lead - ox, vy = a.y + 1 - oy, vz = a.z + a.vz * lead - oz; const m = hyp(vx, vy, vz) || 1;
    spawnProj({ x: ox, y: oy, z: oz, vx: vx / m * sp, vy: vy / m * sp, vz: vz / m * sp, grav: 0, life: 1.6, dmg: 62 + 6 * min, aoe: 3.5, team: 2, owner: n, r: 0.6, kind: 'orb', size: 0.85, col: 0x7fe0ff, dot: 0, dotT: 0, slow: 0.2, slowT: 1.5 });
    fx({ k: 'nessspit', x: ox, z: oz });
  }
  if (n.slamT <= 0) {
    let close = false; for (let i = 0; i < W.heroes.length; i++) { const h = W.heroes[i]; if (h.alive && hyp(h.x - n.x, h.z - n.z) < 9) close = true; }
    if (close) { n.slamT = 6; W.zones.push({ x: n.x, z: n.z, r: 10.5, life: 0.5, delay: 1.1, team: 2, owner: n, dps: 0, heal: 0, burst: 150 + 10 * min, t: 0, tick: 0, done: false, fx: 'toll', col: 0x7fe0ff, follow: null }); fx({ k: 'nesswind', x: n.x, z: n.z }); }
  }
}
function buildHeroes(o) {
  const r = W.rng, n = LL.HEROES.length;
  const pick = o.heroPick == null ? Math.floor(r() * n) : o.heroPick;
  const rest = []; for (let i = 0; i < n; i++) if (i !== pick) rest.push(i);
  rest.sort(() => r() - 0.5);
  const t0 = [rest[0], pick, rest[1]];
  const all = [0, 1, 2, 3].sort(() => r() - 0.5).slice(0, 3);
  for (let s = 0; s < 3; s++) mkHero(t0[s], 0, s, s === 1);
}
function mkHero(defIdx, team, slot, isPlayer) {
  const d = LL.HEROES[defIdx], sp = spawnPos(team, slot);
  const h = mk('hero', team, sp.x, sp.z, 0.6, 1.9, d.hp);
  const diff = W.diff;
  Object.assign(h, {
    def: d, defIdx: defIdx, slot: slot, isPlayer: isPlayer, name: d.name, useAI: !isPlayer || W.auto,
    souls: 0, total: 0, level: 1, items: [], ammo: d.gun.mag, magSize: d.gun.mag, reloadT: 0, fireT: 0, cds: [0, 0, 0], cdMax: [1, 1, 1],
    stamina: 3, stamT: 0, onGround: true, jumps: 0, dashT: 0, dashX: 0, dashZ: 0, zip: null, respT: 0,
    kills: 0, deaths: 0, assists: 0, dmgDealt: 0, secured: 0, denied: 0, shield: 0, shieldT: 0, pitch: 0, hurtBy: {},
    lastShotT: -9, lastDmgHeroT: -9, incomeAcc: 0, breath: false, zestT: 0, furyT: 0, hipsT: 0, fruit: 0,
    botMul: isPlayer ? 1 : 0.78,
    ctl: { mx: 0, mz: 0, ax: sp.x, ay: 1.5, az: sp.z + (team === 0 ? 20 : -20), fire: false, jump: false, dash: false, ab: [false, false, false], reload: false, zip: false, zipDir: 0 },
    ai: { thinkT: Math.random() * 0.2, lane: slot, mode: 'lane', gx: sp.x, gz: sp.z, target: null, wantFire: false, orb: null, orbT: 0,
      ax: sp.x, ay: 1.5, az: sp.z, strafeT: Math.random() * 9, phase: Math.random() * 6, lat: (Math.random() * 2 - 1) * 3,
      jit: team === 1 ? [1.5, 0.9, 0.4][diff] : 0.9, track: team === 1 ? [5, 8, 12][diff] : 8, buildI: 0, standS: 10 }
  });
  recompute(h); h.hp = h.maxHp;
  W.heroes.push(h); if (isPlayer) W.player = h;
  return h;
}
function recompute(h) {
  const d = h.def;
  const st = { dmg: 1 + 0.035 * (h.level - 1), rate: 1, mag: 1, hp: d.hp + 34 * (h.level - 1), regen: 2, speed: 1, resist: 0,
    ap: 1 + 0.04 * (h.level - 1), cdr: 0, steal: 0, pierce: 0, stam: 3, slowOnAb: 0, ultCdr: 0 };
  for (let i = 0; i < h.items.length; i++) { const m = LL.ITEMS[h.items[i]].mod; for (const k in m) st[k] += m[k]; }
  st.resist = Math.min(0.6, st.resist); st.cdr = Math.min(0.5, st.cdr);
  const grow = st.hp - h.maxHp; h.maxHp = st.hp; if (grow > 0 && h.alive) h.hp += grow; if (h.hp > h.maxHp) h.hp = h.maxHp;
  h.st = st; h.magSize = Math.round(d.gun.mag * st.mag);
}
function give(h, n) {
  h.souls += n; h.total += n;
  const lv = Math.min(20, 1 + Math.floor(h.total / 650));
  if (lv > h.level) { h.level = lv; recompute(h); fx({ k: 'level', u: h, lv: lv }); }
}
S.buy = function (h, idx) {
  const it = LL.ITEMS[idx];
  if (!it || h.items.indexOf(idx) >= 0 || h.souls < it.cost) return false;
  h.souls -= it.cost; h.items.push(idx); recompute(h);
  fx({ k: 'buy', u: h, item: idx }); return true;
};
S.setAuto = function (on) { W.auto = on; if (W.player) { W.player.useAI = on; W.player.botMul = 1; } };

/* ---------- vulnerability ---------- */
S.vuln = function (st) {
  if (st.kind === 'guardian') return true;
  if (st.kind === 'warden') return !W.st[st.team][st.lane].outer.alive;
  if (st.kind === 'patron') { for (let l = 0; l < 3; l++) if (!W.st[st.team][l].inner.alive) return true; return false; }
  return true;
};
function zipEnd(team, lane) {
  const mine = W.st[team][lane], theirs = W.st[1 - team][lane];
  let f = 0.46;
  if (!mine.inner.alive) f = 0.12; else if (!mine.outer.alive) f = 0.28;
  else { if (!theirs.outer.alive) f = 0.66; if (!theirs.inner.alive) f = 0.84; }
  return lanes[lane].len * f;
}
S.zipEnd = zipEnd;
S.canZip = function (h) {
  if (!h.alive || h.zip) return -1;
  for (let i = 0; i < 3; i++) {
    LL.laneNearest(i, h.x, h.z, Q);
    if (Q.d < 6) { const ts = rel(h.team, i, Q.s); if (ts > 1 && ts < zipEnd(h.team, i) - 1) return i; }
  }
  return -1;
};

/* ---------- damage ----------
   One door for all harm. Structure immunity, backdoor protection (structures shrug off 70% unless enemy troopers are
   near), shields, lifesteal, Last Breath and kill credit all happen here, so no caller can skip them. */
function heal(u, n) { if (u.alive) u.hp = Math.min(u.maxHp, u.hp + n); }
function applySlow(u, amt, t) { if (u.struct) return; if (amt > u.slowAmt || u.slowT <= 0) u.slowAmt = amt; if (t > u.slowT) u.slowT = t; }
function damage(t, amt, src, kind, crit) {
  if (!t.alive || W.over) return 0;
  const hero = src ? (src.kind === 'hero' ? src : (src.owner && src.owner.kind === 'hero' ? src.owner : null)) : null;
  if (t.struct) {
    if (!S.vuln(t)) { if (W.t - t.immuneFx > 0.6) { t.immuneFx = W.t; fx({ k: 'immune', u: t, p: hero && hero.isPlayer }); } return 0; }
    if (W.fray) amt *= 1.4; else if (!t.pressed) amt *= 0.3;
    if (src && src.team < 2 && W.great[src.team] > 0) amt *= 1.4;
    if (kind === 'ab') amt *= 0.5;
  }
  if (t.kind === 'hero') {
    amt *= (1 - t.st.resist);
    if (t.shield > 0) { const a = Math.min(t.shield, amt); t.shield -= a; amt -= a; }
    t.lastHurt = W.t;
    if (hero) { t.hurtBy[hero.id] = W.t; hero.lastDmgHeroT = W.t; }
    if (!t.breath && t.hp - amt > 0 && (t.hp - amt) / t.maxHp <= 0.3) lastBreath(t);
  } else if (t.kind === 'stray') {
    t.lastHurt = W.t; if (src && (src.kind === 'hero' || src.kind === 'knot')) t.aggro = src;
  } else if (t.kind === 'ness') { t.lastHurt = W.t; if (hero) t.aggro = hero; }
  t.hp -= amt; t.flash = 0.12;
  if (hero) {
    hero.dmgDealt += amt;
    if (kind === 'gun' && hero.st.steal > 0) heal(hero, amt * hero.st.steal * (t.kind === 'hero' ? 1 : 0.4));
  }
  if (kind !== 'dot') {
    const pl = W.player, p = hero && hero === pl ? 1 : (t === pl ? 2 : 0);
    fx({ k: 'hit', x: t.x, y: t.y + t.h * 0.7, z: t.z, amt: amt, crit: !!crit, p: p, kind: kind, tk: t.kind });
  }
  if (t.hp <= 0) { t.hp = 0; kill(t, src, hero); }
  return amt;
}
/* Knight Side's last breath: the first time a hero drops under 30% in a life, the valley gives a little. */
function lastBreath(h) {
  h.breath = true; h.shield = Math.max(h.shield, 170); h.shieldT = 3.5;
  for (let i = 0; i < W.troopers.length; i++) {
    const u = W.troopers[i]; if (!u.alive || u.team === h.team) continue;
    const dx = u.x - h.x, dz = u.z - h.z, d = hyp(dx, dz); if (d > 7.5) continue;
    const n = d || 1; u.x += dx / n * 2.5; u.z += dz / n * 2.5; applySlow(u, 0.5, 1.6);
  }
  fx({ k: 'lastbreath', u: h, x: h.x, y: h.y, z: h.z });
}
function heroesNear(team, x, z, r) {
  const out = [];
  for (let i = 0; i < W.heroes.length; i++) { const h = W.heroes[i]; if (h.alive && h.team === team && hyp(h.x - x, h.z - z) < r) out.push(h); }
  return out;
}
function kill(t, src, hero) {
  t.alive = false;
  const kt = hero ? hero.team : (src ? src.team : -1);
  const min = W.t / 60;
  fx({ k: 'death', u: t, x: t.x, y: t.y, z: t.z, team: t.team, kind: t.kind });
  if (t.kind === 'trooper') {
    if (t.big && !t.extra) W.hollowT[t.lane0] = [30, 24, 18][W.diff];
    if (kt === 0 || kt === 1) {
      const val = (t.big ? 170 : 36) + Math.floor(min) * 2.5;
      const near = heroesNear(kt, t.x, t.z, 28);
      if (near.length) {
        let g = hero && hero.alive ? hero : near[0], bd = 1e9;
        if (!(hero && hero.alive)) for (let i = 0; i < near.length; i++) { const d = hyp(near[i].x - t.x, near[i].z - t.z); if (d < bd) { bd = d; g = near[i]; } }
        give(g, val * 0.5);
        if (g.isPlayer) fx({ k: 'soul', kind: 'half', val: val * 0.5 });
        W.orbs.push({ x: t.x, y: 1.2, z: t.z, val: val * 0.5, team: kt, t: 0, dead: false });
      }
    }
  } else if (t.kind === 'hero') {
    t.deaths++; t.zip = null; t.shield = 0; t.dotT = 0; t.slowT = 0;
    t.respT = Math.min(45, 7 + 1.6 * t.level + min * 0.8);
    if (kt === 0 || kt === 1) W.kills[kt]++;
    let assists = 0;
    for (const id in t.hurtBy) {
      if (W.t - t.hurtBy[id] > 10) continue;
      const a = W.heroes.find(h => h.id === +id);
      if (a && a !== hero && a.team !== t.team) { a.assists++; assists++; give(a, 90 + 10 * t.level); }
    }
    t.hurtBy = {};
    if (hero) { hero.kills++; give(hero, 200 + 25 * t.level); }
    fx({ k: 'herokill', victim: t, killer: hero, src: src });
  } else if (t.kind === 'thief') {
    if (t.carry) { t.carry.dark = false; t.carry.darkT = 0; }
    if (t.victim && t.loot) give(t.victim, t.loot);
    if (hero) give(hero, 70 + Math.floor(min) * 5);
    fx({ k: 'thiefdown', x: t.x, z: t.z, loot: t.loot || 0, carry: t.carry, p: !!(hero && hero.isPlayer), vp: !!(t.victim && t.victim.isPlayer) });
  } else if (t.kind === 'stray') {
    t.respT = 80; t.aggro = null;
    if (hero) { give(hero, 120 + Math.floor(min) * 8); if (hero.isPlayer) fx({ k: 'soul', kind: 'stray', val: 120 + Math.floor(min) * 8 }); }
  } else if (t.kind === 'ness') {
    t.respT = 240; t.aggro = null;
    if (hero) {
      W.great[hero.team] = C.GREAT_T;
      for (let i = 0; i < W.heroes.length; i++) if (W.heroes[i].team === hero.team) give(W.heroes[i], 350);
    }
    fx({ k: 'nessdown', team: hero ? hero.team : -1, hero: hero, x: t.x, z: t.z });
  } else if (t.kind === 'guardian' || t.kind === 'warden') {
    const b = t.kind === 'guardian' ? 350 : 600;
    for (let i = 0; i < W.heroes.length; i++) if (W.heroes[i].team !== t.team) give(W.heroes[i], b);
    fx({ k: 'structdown', u: t, bounty: b });
  } else if (t.kind === 'patron') {
    W.over = true; W.winner = 1 - t.team;
    fx({ k: 'over', winner: W.winner });
  }
}
function aoeDamage(x, y, z, r, dmg, src, o) {
  const us = W.units, team = src.team;
  const slowOnAb = src.st && src.st.slowOnAb;
  for (let i = 0; i < us.length; i++) {
    const u = us[i]; if (!u.alive || u.team === team) continue;
    const dx = u.x - x, dz = u.z - z, d = hyp(dx, dz);
    if (d - u.r > r || Math.abs(u.y - y) > r + 3) continue;
    damage(u, dmg, src, 'ab');
    if (!u.alive) continue;
    if (o && o.slow) applySlow(u, o.slow, o.slowT || 2);
    if (slowOnAb) applySlow(u, 0.25, 1.5);
    if (o && o.knock && !u.struct) {
      const n = d || 1;
      if (u.kind === 'hero') { u.vx += dx / n * o.knock; u.vz += dz / n * o.knock; u.vy = Math.max(u.vy, 4); u.onGround = false; }
      else { u.x += dx / n * o.knock * 0.18; u.z += dz / n * o.knock * 0.18; }
    }
  }
}

/* ---------- projectiles ---------- */
function spawnProj(o) { if (W.projs.length < 320) W.projs.push(o); return o; }
function tracer(ax, ay, az, bx, by, bz, team, big) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = hyp(dx, dy, dz) || 1, sp = 110;
  spawnProj({ cos: true, x: ax, y: ay, z: az, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: d / sp, t: 0, team: team, size: big ? 0.3 : 0.12, kind: 'bullet' });
}
function fireGun(h) {
  const g = h.def.gun, st = h.st, c = h.ctl;
  h.fireT = 1 / (g.rate * st.rate); h.ammo--; h.lastShotT = W.t;
  const sy = Math.sin(h.yaw), cy = Math.cos(h.yaw);
  const mx = h.x + sy * 0.6 - cy * 0.35, my = h.y + 1.35, mz = h.z + cy * 0.6 + sy * 0.35;
  let dx = c.ax - mx, dy = c.ay - my, dz = c.az - mz, d = hyp(dx, dy, dz);
  if (d < 2.5) { dx = sy * Math.cos(h.pitch); dy = Math.sin(h.pitch); dz = cy * Math.cos(h.pitch); d = 1; }
  dx /= d; dy /= d; dz /= d;
  for (let i = 0; i < g.pellets; i++) {
    let px = dx + (W.rng() - 0.5) * 2 * g.spread, py = dy + (W.rng() - 0.5) * 2 * g.spread, pz = dz + (W.rng() - 0.5) * 2 * g.spread;
    const n = hyp(px, py, pz); px /= n; py /= n; pz /= n;
    spawnProj({ x: mx, y: my, z: mz, vx: px * g.speed, vy: py * g.speed, vz: pz * g.speed, life: g.range / g.speed,
      dmg: g.dmg * st.dmg * h.botMul * (W.great[h.team] > 0 ? 1.25 : 1) * (h.furyT > 0 ? 1.4 : 1), team: h.team, owner: h, r: 0.18, kind: 'bullet', gun: true, pierce: st.pierce, hit: null, size: g.size });
  }
  fx({ k: 'shot', u: h, x: mx, y: my, z: mz });
}
function cast(h, i) {
  const a = h.def.ab[i], c = h.ctl, st = h.st;
  let cd = a.cd * (1 - st.cdr); if (a.ult) cd *= (1 - st.ultCdr);
  h.cds[i] = cd; h.cdMax[i] = cd;
  const ap = st.ap * h.botMul * (W.great[h.team] > 0 ? 1.25 : 1) * (h.furyT > 0 ? 1.3 : 1);
  const ex = h.x, ey = h.y + 1.5, ez = h.z;
  let dx = c.ax - ex, dy = c.ay - ey, dz = c.az - ez, d = hyp(dx, dy, dz) || 1; dx /= d; dy /= d; dz /= d;
  let hx = dx, hz = dz; const hd = hyp(hx, hz) || 1; hx /= hd; hz /= hd;
  const mm = hyp(c.mx, c.mz); let mvx = hx, mvz = hz; if (mm > 0.3) { mvx = c.mx / mm; mvz = c.mz / mm; }
  switch (a.kind) {
    case 'orb': {
      if (a.grav) { dy += 0.16; const n = hyp(dx, dy, dz); dx /= n; dy /= n; dz /= n; }
      spawnProj({ x: ex + hx * 0.6, y: ey, z: ez + hz * 0.6, vx: dx * a.speed, vy: dy * a.speed, vz: dz * a.speed, grav: a.grav || 0, life: a.grav ? 4 : a.range / a.speed,
        dmg: a.dmg * ap, aoe: a.aoe || 0, team: h.team, owner: h, r: 0.5, kind: 'orb', size: 0.55,
        dot: a.dot ? a.dot * ap : 0, dotT: a.dotT || 0, slow: a.slow || 0, slowT: a.slowT || 0, col: h.def.col });
      break;
    }
    case 'line': {
      let vx = dx, vy = dy, vz = dz, y0 = ey;
      if (a.flat) { vx = hx; vy = 0; vz = hz; y0 = h.y + 1.1; }
      spawnProj({ x: ex + hx * 0.8, y: y0, z: ez + hz * 0.8, vx: vx * a.speed, vy: vy * a.speed, vz: vz * a.speed, life: a.range / a.speed,
        dmg: a.dmg * ap, team: h.team, owner: h, r: a.r, kind: 'line', hit: [], knock: a.knock || 0, vis: a.vis || '', size: a.r * 0.6, col: h.def.col, flat: !!a.flat });
      break;
    }
    case 'nova':
      aoeDamage(h.x, h.y + 1, h.z, a.r, a.dmg * ap, h, a);
      fx({ k: 'nova', x: h.x, y: h.y, z: h.z, r: a.r, col: h.def.col });
      break;
    case 'dash':
      h.dashX = mvx * (a.dist / 0.3); h.dashZ = mvz * (a.dist / 0.3); h.dashT = 0.3; h.zip = null;
      h.shield = a.shield * ap; h.shieldT = 4;
      break;
    case 'blink': {
      const fx0 = h.x, fz0 = h.z; let bx = h.x, bz = h.z; h.zip = null;
      for (let s = 1; s <= a.dist; s++) {
        const tx = h.x + mvx * s, tz = h.z + mvz * s;
        if (Math.abs(tx) > C.HALF_X - 1.5 || Math.abs(tz) > C.HALF_Z - 1.5) break;
        if (pointFree(tx, tz, h.r + 0.2)) { bx = tx; bz = tz; }
      }
      h.x = bx; h.z = bz; h.vx = mvx * 4; h.vz = mvz * 4;
      fx({ k: 'blink', x0: fx0, z0: fz0, x: bx, y: h.y, z: bz, col: h.def.col });
      break;
    }
    case 'zone': {
      let zx = h.x, zz = h.z;
      if (a.range) { zx = c.ax; zz = c.az; const dd = hyp(zx - h.x, zz - h.z); if (dd > a.range) { zx = h.x + (zx - h.x) / dd * a.range; zz = h.z + (zz - h.z) / dd * a.range; } }
      W.zones.push({ x: zx, z: zz, r: a.r, life: a.life || 0.5, delay: a.delay || 0, team: h.team, owner: h, dps: (a.dps || 0) * ap, heal: (a.heal || 0) * ap,
        burst: (a.burst || 0) * ap, t: 0, tick: 0, done: false, fx: a.fx || '', col: h.def.col, follow: a.delay ? h : null });
      break;
    }
    case 'turret': {
      let tx = h.x + hx * 2.2, tz = h.z + hz * 2.2; if (!pointFree(tx, tz, 1)) { tx = h.x; tz = h.z; }
      const k = mk('knot', h.team, tx, tz, 0.9, 2.2, 480 + 60 * h.level);
      k.owner = h; k.life = a.life; k.dmg = a.dmg * ap; k.range = 18; k.rate = 0.33; k.st = h.st;
      W.knots.push(k);
      break;
    }
  }
  fx({ k: 'cast', u: h, i: i, kind: a.kind });
}
function pointFree(x, z, r) {
  const obs = W.obstacles;
  for (let i = 0; i < obs.length; i++) { const o = obs[i]; if (hyp(x - o.x, z - o.z) < o.r + r) return false; }
  for (let i = 0; i < W.structs.length; i++) { const s = W.structs[i]; if (s.alive && hyp(x - s.x, z - s.z) < s.r + r) return false; }
  return true;
}
function explode(p, direct) {
  if (p.aoe > 0) aoeDamage(p.x, p.y, p.z, p.aoe, p.dmg, p.owner, p);
  else if (direct) {
    damage(direct, p.dmg, p.owner, 'ab');
    if (direct.alive) {
      if (p.dot) { direct.dotT = p.dotT; direct.dotDps = p.dot; direct.dotSrc = p.owner; }
      if (p.slow) applySlow(direct, p.slow, p.slowT);
    }
  }
  fx({ k: 'explode', x: p.x, y: p.y, z: p.z, r: p.aoe || 1.5, col: p.col });
}
function claimOrb(o, h) {
  o.dead = true;
  if (h.team === o.team) { give(h, o.val); h.secured++; fx({ k: 'soul', kind: 'secured', val: o.val, x: o.x, y: o.y, z: o.z, p: h.isPlayer, team: o.team }); }
  else { give(h, o.val * 0.3); h.denied++; fx({ k: 'soul', kind: 'denied', val: o.val * 0.3, x: o.x, y: o.y, z: o.z, p: h.isPlayer, team: o.team, vsPlayer: o.team === 0 }); }
}
function stepProjs(dt) {
  const ps = W.projs, us = W.units, obs = W.obstacles, orbs = W.orbs;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (p.cos) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.t >= p.life) ps.splice(i, 1); continue; }
    const ax = p.x, ay = p.y, az = p.z;
    if (p.grav) p.vy -= p.grav * dt;
    const bx = ax + p.vx * dt, by = ay + p.vy * dt, bz = az + p.vz * dt;
    const reach = hyp(bx - ax, bz - az) + p.r + 1;
    let bt = 2, hu = null, ho = null, world = false;
    if (by <= 0.05 && ay > by) { bt = U.clamp((ay - 0.05) / (ay - by), 0, 1); world = true; }
    if (!p.flat) for (let j = 0; j < obs.length; j++) {
      const o = obs[j]; if (Math.abs(o.x - ax) > reach + o.r || Math.abs(o.z - az) > reach + o.r) continue;
      const t = segCyl(ax, ay, az, bx, by, bz, o.x, o.z, o.r, -1, o.h);
      if (t >= 0 && t < bt) { bt = t; world = true; hu = null; }
    }
    for (let j = 0; j < us.length; j++) {
      const u = us[j]; if (!u.alive || u.team === p.team) continue;
      if (Math.abs(u.x - ax) > reach + u.r || Math.abs(u.z - az) > reach + u.r) continue;
      if (p.hit && p.hit.indexOf(u.id) >= 0) continue;
      const t = segCyl(ax, ay, az, bx, by, bz, u.x, u.z, u.r + p.r, u.y - 0.15, u.y + u.h + 0.25);
      if (t >= 0 && t < bt) { bt = t; hu = u; world = false; }
    }
    if (p.gun && p.owner.kind === 'hero') for (let j = 0; j < orbs.length; j++) {
      const o = orbs[j]; if (o.dead || Math.abs(o.x - ax) > reach + 1 || Math.abs(o.z - az) > reach + 1) continue;
      const t = segCyl(ax, ay, az, bx, by, bz, o.x, o.z, 0.95, o.y - 0.95, o.y + 0.95);
      if (t >= 0 && t < bt) { bt = t; ho = o; hu = null; world = false; }
    }
    if (bt <= 1) {
      p.x = ax + (bx - ax) * bt; p.y = ay + (by - ay) * bt; p.z = az + (bz - az) * bt;
      if (ho) { claimOrb(ho, p.owner); ps.splice(i, 1); continue; }
      if (hu) {
        if (p.kind === 'bullet') {
          const crit = (hu.kind === 'hero' || hu.kind === 'trooper' || hu.kind === 'stray' || hu.kind === 'thief') && p.y > hu.y + hu.h * 0.78;
          damage(hu, p.dmg * (crit ? 1.5 : 1), p.owner, 'gun', crit);
          if (p.pierce > 0) { p.pierce--; (p.hit || (p.hit = [])).push(hu.id); p.life -= dt; continue; }
          ps.splice(i, 1); continue;
        } else if (p.kind === 'orb') { explode(p, hu); ps.splice(i, 1); continue; }
        else {
          damage(hu, p.dmg, p.owner, 'ab'); p.hit.push(hu.id);
          if (hu.alive && p.knock && !hu.struct) {
            const n = hyp(p.vx, p.vz) || 1;
            if (hu.kind === 'hero') { hu.vx += p.vx / n * p.knock; hu.vz += p.vz / n * p.knock; hu.vy = Math.max(hu.vy, 5); hu.onGround = false; }
            else { hu.x += -p.vz / n * 2 * (W.rng() < 0.5 ? 1 : -1); hu.z += p.vx / n * 2; applySlow(hu, 0.5, 1.5); }
          }
          if (p.owner.st && p.owner.st.slowOnAb && hu.alive) applySlow(hu, 0.25, 1.5);
          p.x = bx; p.y = by; p.z = bz; p.life -= dt; if (p.life <= 0) ps.splice(i, 1);
          continue;
        }
      }
      if (p.kind === 'orb') explode(p, null); else fx({ k: 'impact', x: p.x, y: p.y, z: p.z, team: p.team });
      ps.splice(i, 1); continue;
    }
    p.x = bx; p.y = by; p.z = bz; p.life -= dt;
    if (p.life <= 0) { if (p.kind === 'orb' && p.aoe) explode(p, null); ps.splice(i, 1); }
  }
}

/* ---------- heroes ---------- */
function collide(h) {
  h.x = U.clamp(h.x, -C.HALF_X + 1, C.HALF_X - 1); h.z = U.clamp(h.z, -C.HALF_Z + 1, C.HALF_Z - 1);
  const obs = W.obstacles;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i], dx = h.x - o.x, dz = h.z - o.z, m = o.r + h.r;
    if (dx > m || dx < -m || dz > m || dz < -m || h.y > o.h) continue;
    const d = hyp(dx, dz); if (d < m) { const n = d || 0.001; h.x = o.x + dx / n * m; h.z = o.z + dz / n * m; }
  }
  for (let i = 0; i < W.structs.length; i++) {
    const o = W.structs[i]; if (!o.alive) continue;
    const dx = h.x - o.x, dz = h.z - o.z, m = o.r + h.r, d = hyp(dx, dz);
    if (d < m && h.y < o.h) { const n = d || 0.001; h.x = o.x + dx / n * m; h.z = o.z + dz / n * m; }
  }
  const ns = W.ness;
  if (ns && ns.alive) { const dx = h.x - ns.x, dz = h.z - ns.z, m = ns.r + h.r, d = hyp(dx, dz); if (d < m && h.y < ns.h) { const n = d || 0.001; h.x = ns.x + dx / n * m; h.z = ns.z + dz / n * m; } }
}
function tryZip(h) {
  if (h.zip) { h.zip = null; h.vy = 3; h.onGround = false; return; }
  const lane = S.canZip(h); if (lane < 0) return;
  let dir = h.ctl.zipDir;
  if (!dir) {
    LL.laneNearest(lane, h.x, h.z, Q); LL.lanePoint(lane, Q.s, P);
    const f = (Math.sin(h.yaw) * P.dx + Math.cos(h.yaw) * P.dz) * (h.team === 0 ? 1 : -1);
    dir = f >= 0 ? 1 : -1;
  }
  LL.laneNearest(lane, h.x, h.z, Q);
  h.zip = { lane: lane, dir: dir, s: Q.s }; h.dashT = 0; h.onGround = false;
  fx({ k: 'zip', u: h });
}
function heroStep(h, dt) {
  const c = h.ctl, st = h.st, d = h.def;
  h.fireT -= dt; for (let i = 0; i < 3; i++) if (h.cds[i] > 0) h.cds[i] -= dt;
  if (h.shieldT > 0) { h.shieldT -= dt; if (h.shieldT <= 0) h.shield = 0; }
  if (h.slowT > 0) h.slowT -= dt;
  if (h.zestT > 0) h.zestT -= dt; if (h.furyT > 0) h.furyT -= dt;
  if (h.hipsT > 0) { h.hipsT -= dt; heal(h, h.maxHp * 0.07 * dt); }
  heal(h, (st.regen * (W.t - h.lastHurt > 6 ? 3 : 1) + (W.great[h.team] > 0 ? 8 : 0)) * dt);
  h.incomeAcc += dt * 1.5; if (h.incomeAcc >= 1) { const n = Math.floor(h.incomeAcc); h.incomeAcc -= n; give(h, n); }
  const sgn = h.team === 0 ? -1 : 1;
  const fd = hyp(h.x, h.z - sgn * C.SPAWN_Z);
  if (fd < C.FOUNT_R) heal(h, h.maxHp * 0.14 * dt);
  if (hyp(h.x, h.z + sgn * C.SPAWN_Z) < C.FOUNT_R) damage(h, 160 * dt, null, 'dot');
  if (!h.alive) return;
  const sp = d.speed * st.speed * (h.slowT > 0 ? 1 - h.slowAmt : 1) * (h.zestT > 0 ? 1.3 : 1);
  if (h.zip) {
    const zp = h.zip, L = lanes[zp.lane];
    zp.s += zp.dir * (h.team === 0 ? 1 : -1) * C.ZIP_SPEED * dt;
    const ts = rel(h.team, zp.lane, zp.s);
    LL.lanePoint(zp.lane, zp.s, P);
    h.x = P.x; h.z = P.z; h.y += (C.ZIP_Y - h.y) * Math.min(1, 6 * dt);
    const m = zp.dir * (h.team === 0 ? 1 : -1) * C.ZIP_SPEED; h.vx = P.dx * m; h.vz = P.dz * m; h.vy = 0;
    if (ts >= zipEnd(h.team, zp.lane) || ts <= 2 || zp.s <= 0 || zp.s >= L.len) { h.zip = null; h.vy = 2; h.vx *= 0.4; h.vz *= 0.4; }
    else if (c.jump) { h.zip = null; h.vy = 8; h.jumps = 1; h.vx *= 0.5; h.vz *= 0.5; }
  } else {
    let mx = c.mx, mz = c.mz; const m = hyp(mx, mz); if (m > 1) { mx /= m; mz /= m; }
    if (h.dashT > 0) { h.dashT -= dt; h.vx = h.dashX; h.vz = h.dashZ; if (h.dashT <= 0) { h.vx *= 0.35; h.vz *= 0.35; } }
    else { const f = 1 - Math.exp(-(h.onGround ? 14 : 3.5) * dt); h.vx += (mx * sp - h.vx) * f; h.vz += (mz * sp - h.vz) * f; }
    if (c.jump) {
      if (h.onGround) { h.vy = 9.6; h.onGround = false; h.jumps = 1; fx({ k: 'jump', u: h }); }
      else if (h.jumps < 2 && h.stamina >= 1) { h.vy = 9.2; h.jumps = 2; h.stamina--; fx({ k: 'jump', u: h, dbl: true }); }
    }
    if (c.dash && h.dashT <= 0 && h.stamina >= 1) {
      let ddx = mx, ddz = mz; if (m < 0.2) { ddx = Math.sin(h.yaw); ddz = Math.cos(h.yaw); } else { ddx = mx / Math.min(1, m) ; ddz = mz / Math.min(1, m); const n = hyp(ddx, ddz); ddx /= n; ddz /= n; }
      h.dashX = ddx * 24; h.dashZ = ddz * 24; h.dashT = 0.2; h.stamina--; fx({ k: 'dash', u: h });
    }
    if (!h.onGround) h.vy -= C.GRAV * dt;
    h.x += h.vx * dt; h.z += h.vz * dt; h.y += h.vy * dt;
    if (h.y <= 0) { h.y = 0; h.vy = 0; h.onGround = true; h.jumps = 0; }
    collide(h);
  }
  if (h.stamina < st.stam) { h.stamT += dt * (h.zestT > 0 ? 3 : 1); if (h.stamT >= 2.6) { h.stamT = 0; h.stamina++; } } else h.stamT = 0;
  const adx = c.ax - h.x, adz = c.az - h.z, ad = hyp(adx, adz);
  if (ad > 0.5) { h.yaw = Math.atan2(adx, adz); h.pitch = Math.atan2(c.ay - (h.y + 1.5), ad); }
  if (h.reloadT > 0) { h.reloadT -= dt; if (h.reloadT <= 0) h.ammo = h.magSize; }
  else if ((c.reload && h.ammo < h.magSize) || h.ammo <= 0) { h.reloadT = d.gun.reload; fx({ k: 'reload', u: h }); }
  if (c.fire && h.reloadT <= 0 && h.ammo > 0 && h.fireT <= 0) fireGun(h);
  for (let i = 0; i < 3; i++) if (c.ab[i] && h.cds[i] <= 0 && (i < 2 || h.level >= C.ULT_LEVEL)) cast(h, i);
  if (c.zip) tryZip(h);
  c.jump = c.dash = c.zip = c.reload = false; c.ab[0] = c.ab[1] = c.ab[2] = false; c.zipDir = 0;
}
function respawn(h) {
  const sp = spawnPos(h.team, h.slot);
  h.alive = true; h.hp = h.maxHp; h.x = sp.x; h.z = sp.z; h.y = 0; h.vx = h.vy = h.vz = 0; h.onGround = true;
  h.ammo = h.magSize; h.reloadT = 0; h.shield = 0; h.slowT = 0; h.dotT = 0; h.stamina = h.st.stam; h.zip = null; h.lastHurt = -99;
  h.ai.mode = 'lane'; h.breath = false; h.zestT = h.furyT = h.hipsT = 0;
  fx({ k: 'respawn', u: h });
}

/* ---------- bot brain ----------
   Bots think every ~0.2 s: pick a place to stand behind their own troopers, pick a target by score, maybe cast.
   They retreat at 30% health and, so far, always survive. That makes every bot win rate optimistic for the Reign. */
function tryBotBuy(h) {
  const a = h.ai, b = h.def.build;
  while (a.buildI < b.length && h.items.indexOf(b[a.buildI]) >= 0) a.buildI++;
  if (a.buildI < b.length && h.souls >= LL.ITEMS[b[a.buildI]].cost) S.buy(h, b[a.buildI]);
}
function friendlyTroopersNear(team, x, z, r) {
  let n = 0; const ts = W.troopers;
  for (let i = 0; i < ts.length; i++) { const t = ts[i]; if (t.alive && t.team === team && hyp(t.x - x, t.z - z) < r) n++; }
  return n;
}
function countEnemiesNear(team, x, z, r, kind) {
  let n = 0; const us = W.units;
  for (let i = 0; i < us.length; i++) { const u = us[i]; if (u.alive && u.team === 1 - team && (!kind || u.kind === kind) && hyp(u.x - x, u.z - z) < r) n++; }
  return n;
}
function think(h) {
  const a = h.ai, c = h.ctl, en = 1 - h.team, hpF = h.hp / h.maxHp, d = h.def;
  tryBotBuy(h);
  if (a.mode === 'retreat') { if (hpF > 0.86) a.mode = 'lane'; } else if (hpF < 0.3) a.mode = 'retreat';
  const lane = a.lane, L = lanes[lane];
  LL.laneNearest(lane, h.x, h.z, Q);
  const myTs = rel(h.team, lane, Q.s), onLane = Q.d < 6;
  // nearest enemy hero
  let eh = null, ehD = 1e9;
  for (let i = 0; i < W.heroes.length; i++) { const o = W.heroes[i]; if (o.alive && o.team === en) { const dd = hyp(o.x - h.x, o.z - h.z); if (dd < ehD) { ehD = dd; eh = o; } } }
  for (let i = 0; i < W.troopers.length; i++) { const o = W.troopers[i]; if (o.alive && o.big && o.team === en) { const dd = hyp(o.x - h.x, o.z - h.z); if (dd < ehD) { ehD = dd; eh = o; } } }
  a.target = null; a.wantFire = false;
  if (a.mode === 'retreat') {
    const sp = spawnPos(h.team, h.slot); a.gx = sp.x; a.gz = sp.z;
    if (!h.zip && onLane && myTs > 30 && S.canZip(h) === lane) { c.zip = true; c.zipDir = -1; }
    if (eh && ehD < d.aiRange * 0.7 && losClear(h.x, h.z, eh.x, eh.z)) { a.target = eh; a.wantFire = true; }
    for (let i = 0; i < 2; i++) { const ab = d.ab[i]; if (h.cds[i] <= 0 && (ab.kind === 'dash' || ab.kind === 'blink') && eh && ehD < 18 && !h.zip) c.ab[i] = true; }
    if (eh && ehD < 14 && h.stamina >= 2 && W.rng() < 0.2 && !h.zip) c.dash = true;
    botAbilities(h, a.target, eh, ehD, hpF);
    return;
  }
  // where to stand
  let standS = W.front[h.team][lane] - 7;
  const ts = W.st[en][lane];
  const tower = ts.outer.alive ? ts.outer : (ts.inner.alive ? ts.inner : (lane === 1 || true ? W.patron[en] : null));
  let towerTs = tower === W.patron[en] ? L.len + 6 : rel(h.team, lane, tower.s);
  const pushing = friendlyTroopersNear(h.team, tower.x, tower.z, tower.range - 2) > 0;
  if (!pushing) standS = Math.min(standS, towerTs - tower.range - 4);
  else standS = Math.min(standS, towerTs - Math.min(d.aiRange * 0.8, 16));
  standS = U.clamp(standS, 8, L.len - 16);
  a.standS = standS;
  LL.lanePoint(lane, rel(h.team, lane, standS), P);
  a.gx = P.x - P.dz * a.lat; a.gz = P.z + P.dx * a.lat;
  const ness = W.ness; a.ness = ness.alive && W.rush[h.team] > 0 && (lane !== 0 || W.rushAll[h.team]);
  if (a.ness) { a.gx = C.LOCH.x + a.lat * 2; a.gz = C.LOCH.z + (h.team === 0 ? -15 : 15); if (h.zip && Math.abs(h.z) < 24) c.zip = true; }
  else if (h.zip) { if (h.zip.dir < 0 || rel(h.team, h.zip.lane, h.zip.s) >= standS - 5 || h.zip.lane !== lane) c.zip = true; }
  else if (onLane && standS - myTs > 45 && S.canZip(h) === lane && zipEnd(h.team, lane) - myTs > 25) { c.zip = true; c.zipDir = 1; }
  // targets
  const range = d.aiRange; let best = null, bs = -1e9;
  const us = W.units;
  for (let i = 0; i < us.length; i++) {
    const u = us[i]; if (!u.alive || u.team !== en) continue;
    const dd = hyp(u.x - h.x, u.z - h.z) - u.r; if (dd > range) continue;
    let sc;
    if (u.kind === 'hero') sc = 70 - dd + (1 - u.hp / u.maxHp) * 60 + (hpF < 0.45 ? -40 : 0);
    else if (u.kind === 'thief') sc = 95 - dd * 0.3;
    else if (u.kind === 'trooper') sc = 40 - dd * 0.5 + (1 - u.hp / u.maxHp) * 30 + (u.big ? 22 : 0);
    else if (u.kind === 'knot') sc = 45 - dd * 0.5;
    else if (u.struct) { if (!S.vuln(u) || (!u.pressed && !W.fray)) continue; sc = 28; }
    else continue;
    if (sc > bs && losClear(h.x, h.z, u.x, u.z)) { bs = sc; best = u; }
  }
  if (ness.alive && (a.ness || ness.hp < ness.maxHp * 0.985)) {
    const dd = hyp(ness.x - h.x, ness.z - h.z) - ness.r, sc = a.ness ? 55 : 26;
    if (dd < range && sc > bs && losClear(h.x, h.z, ness.x, ness.z)) { bs = sc; best = ness; }
  }
  a.target = best; a.wantFire = !!best;
  for (let i = 0; i < W.fruit.length; i++) { const f = W.fruit[i]; if (f.ripe && hyp(f.x - h.x, f.z - h.z) < 16 && (f.k !== 'hips' || hpF < 0.75)) { a.gx = f.x; a.gz = f.z; break; } }
  // orbs
  if (a.orbT <= 0 && W.orbs.length) {
    for (let i = 0; i < W.orbs.length; i++) {
      const o = W.orbs[i]; if (o.dead || o.t > 2.2 || hyp(o.x - h.x, o.z - h.z) > 26) continue;
      const mine = o.team === h.team;
      const pr = mine ? 0.5 : (h.team === 1 ? [0.12, 0.3, 0.55][W.diff] : 0.3);
      if (W.rng() < pr * 0.4 && losClear(h.x, h.z, o.x, o.z)) { a.orb = o; a.orbT = 0.7; break; }
    }
  }
  if (!best && h.ammo < h.magSize * 0.4) c.reload = true;
  if (W.t - h.lastHurt < 0.5 && h.onGround && W.rng() < 0.18) { if (W.rng() < 0.5) c.jump = true; else if (h.stamina >= 2) c.dash = true; }
  botAbilities(h, best, eh, ehD, hpF);
}
function botAbilities(h, tgt, eh, ehD, hpF) {
  const c = h.ctl, d = h.def, r = W.rng;
  for (let i = 0; i < 3; i++) {
    if (h.cds[i] > 0 || (i === 2 && h.level < C.ULT_LEVEL) || h.zip) continue;
    const ab = d.ab[i]; const heroT = tgt && (tgt.kind === 'hero' || tgt.big);
    switch (ab.kind) {
      case 'orb': case 'line': {
        const rg = Math.min(ab.range || 30, 34);
        if (heroT && ehD < rg && r() < 0.45) c.ab[i] = true;
        else if (tgt && tgt.kind === 'trooper' && !ab.ult && (ab.aoe || ab.kind === 'line') && countEnemiesNear(h.team, tgt.x, tgt.z, 6, 'trooper') >= 3 && r() < 0.2) c.ab[i] = true;
        else if (ab.ult && tgt && eh && ehD < rg && r() < 0.3) c.ab[i] = true;
        break;
      }
      case 'nova':
        if ((eh && ehD < ab.r - 1) || countEnemiesNear(h.team, h.x, h.z, ab.r, 'trooper') >= 3 && r() < 0.3) c.ab[i] = true;
        break;
      case 'dash': case 'blink':
        if (heroT && tgt.hp / tgt.maxHp < 0.25 && ehD > 12 && hpF > 0.5 && r() < 0.5) c.ab[i] = true;
        break;
      case 'zone':
        if (ab.heal) { if (hpF < 0.6 && W.t - h.lastHurt < 4) c.ab[i] = true; }
        else if (ab.burst) { if ((eh && ehD < ab.r * 0.6) || countEnemiesNear(h.team, h.x, h.z, ab.r * 0.8, 'trooper') >= 5) c.ab[i] = true; }
        else if (heroT && ehD < ab.range && r() < 0.35) c.ab[i] = true;
        else if (tgt && countEnemiesNear(h.team, tgt.x, tgt.z, ab.r, null) >= 5 && r() < 0.2) c.ab[i] = true;
        break;
      case 'turret':
        if ((heroT && ehD < 18) || (tgt && tgt.struct)) c.ab[i] = true;
        break;
    }
  }
}
function aiHero(h, dt) {
  const a = h.ai, c = h.ctl;
  a.thinkT -= dt; a.orbT -= dt;
  if (a.thinkT <= 0) { a.thinkT = 0.18 + W.rng() * 0.08; think(h); }
  if (a.target && !a.target.alive) { a.target = null; a.wantFire = false; }
  a.strafeT += dt;
  const dx = a.gx - h.x, dz = a.gz - h.z, d = hyp(dx, dz);
  let mx = 0, mz = 0; if (d > 1.2) { mx = dx / d; mz = dz / d; }
  let tg = a.target;
  if (tg && a.mode !== 'retreat') {
    const tx = tg.x - h.x, tz = tg.z - h.z, td = hyp(tx, tz) || 1, sg = Math.sin(a.strafeT * 1.7 + a.phase) > 0 ? 1 : -1;
    mx += -tz / td * 0.8 * sg; mz += tx / td * 0.8 * sg;
    if ((tg.kind === 'hero' || tg.big) && td < Math.max(9, h.def.aiRange * 0.35)) { mx -= tx / td * 0.7; mz -= tz / td * 0.7; }
  }
  const m = hyp(mx, mz); if (m > 1) { mx /= m; mz /= m; }
  c.mx = mx; c.mz = mz;
  let gx, gy, gz, shoot = false;
  if (a.orbT > 0 && a.orb && !a.orb.dead) { gx = a.orb.x; gy = a.orb.y + 0.25; gz = a.orb.z; shoot = true; }
  else if (tg) {
    const td = hyp(tg.x - h.x, tg.z - h.z), lead = td / h.def.gun.speed * 0.8;
    gx = tg.x + tg.vx * lead; gz = tg.z + tg.vz * lead; gy = tg.y + (tg.struct ? Math.min(tg.h * 0.5, 4) : tg.h * 0.62);
    shoot = a.wantFire;
  }
  if (shoot) {
    const k = Math.min(1, dt * a.track);
    a.ax += (gx - a.ax) * k; a.ay += (gy - a.ay) * k; a.az += (gz - a.az) * k;
    const t = W.t, j = a.orbT > 0 ? a.jit * 0.5 : a.jit;
    c.ax = a.ax + Math.sin(t * 2.3 + a.phase) * j; c.ay = a.ay + Math.sin(t * 3.1 + a.phase * 2) * j * 0.5; c.az = a.az + Math.cos(t * 1.9 + a.phase) * j;
    c.fire = hyp(a.ax - gx, a.az - gz) < 2.2;
  } else {
    const fxx = m > 0.1 ? mx : Math.sin(h.yaw), fzz = m > 0.1 ? mz : Math.cos(h.yaw);
    a.ax = h.x + fxx * 12; a.ay = h.y + 1.5; a.az = h.z + fzz * 12;
    c.ax = a.ax; c.ay = a.ay; c.az = a.az; c.fire = false;
  }
}
function coordinate() {
  // lane fronts
  for (let team = 0; team < 2; team++) for (let l = 0; l < 3; l++) {
    const mine = W.st[team][l];
    let f = mine.outer.alive ? rel(team, l, mine.outer.s) + 5 : (mine.inner.alive ? rel(team, l, mine.inner.s) + 5 : 18);
    W.front[team][l] = f;
  }
  for (let i = 0; i < W.troopers.length; i++) { const t = W.troopers[i]; if (!t.alive) continue; const ts = rel(t.team, t.lane, t.s); if (ts > W.front[t.team][t.lane]) W.front[t.team][t.lane] = ts; }
  // the loch
  const ns = W.ness;
  for (let team = 0; team < 2; team++) {
    if (!ns.alive) { W.rush[team] = 0; continue; }
    if (W.rush[team] > 0) W.rush[team] -= 0.5;
    const human = W.heroes.find(h => h.team === team && !h.useAI);
    W.rushAll[team] = !human;
    if (human) { if (human.alive && ns.hp < ns.maxHp && hyp(human.x - ns.x, human.z - ns.z) < 24) W.rush[team] = Math.max(W.rush[team], 6); }
    else if (W.rush[team] > 0) { if (ns.hp < ns.maxHp * 0.7 && W.rush[team] < 10) W.rush[team] = 10; }
    else if (W.t > W.rushNext[team]) {
      W.rushNext[team] = W.t + 40;
      const up = W.heroes.filter(h => h.team === team && h.alive && h.hp > h.maxHp * 0.6).length;
      const pr = team === 1 && W.heroes.some(h => h.team === 0 && !h.useAI) ? [0.2, 0.45, 0.7][W.diff] : 0.45;
      if (up >= 3 && W.rng() < pr) { W.rush[team] = 45; fx({ k: 'fishing', team: team }); }
    }
  }
  // lane assignment
  for (let team = 0; team < 2; team++) {
    const bots = W.heroes.filter(h => h.team === team && h.useAI);
    const human = W.heroes.find(h => h.team === team && !h.useAI);
    if (W.t > 600) {
      let bl = 1, bsv = 1e9;
      for (let l = 0; l < 3; l++) { const e = W.st[1 - team][l]; const v = (e.outer.alive ? e.outer.hp + 4000 : 0) + (e.inner.alive ? e.inner.hp : -3000); if (v < bsv) { bsv = v; bl = l; } }
      if (team === 0 || true) {
        // defend if an enemy hero is deep in our half
        let dl = -1; for (let i = 0; i < W.heroes.length; i++) { const e = W.heroes[i]; if (e.alive && e.team !== team && (team === 0 ? e.z < -40 : e.z > 40)) dl = LL.nearestLane(e.x, e.z); }
        if (dl >= 0) bl = dl;
      }
      bots.forEach(b => { b.ai.lane = bl; });
    } else if (human) {
      const pl = LL.nearestLane(human.x, human.z);
      const others = [0, 1, 2].filter(l => l !== pl);
      if (bots.length >= 2) {
        if (bots[0].ai.lane === others[1] || bots[1].ai.lane === others[0]) { bots[0].ai.lane = others[1]; bots[1].ai.lane = others[0]; }
        else { bots[0].ai.lane = others[0]; bots[1].ai.lane = others[1]; }
      }
    } else bots.forEach(b => { b.ai.lane = b.slot; });
  }
}

/* ---------- troopers, structures, strays, knots ---------- */
function spawnWave() {
  W.waveN++;
  const min = W.t / 60;
  for (let team = 0; team < 2; team++) for (let lane = 0; lane < 3; lane++) {
    const L = lanes[lane];
    const cnt = team === 0 ? 4 : [4, 4, 5][W.diff] + (W.red > 0 ? 2 : 0) - (W.mercy ? 1 : 0);
    for (let k = 0; k < cnt; k++) {
      const s = team === 0 ? 2 + k * 2.4 : L.len - 2 - k * 2.4;
      LL.lanePoint(lane, s, P);
      const ranged = k === 0;
      const lat = ranged ? 0 : ((k % 3) - 1) * 2.2 + (k > 3 ? 0.9 : 0);
      const u = mk('trooper', team, P.x - P.dz * lat, P.z + P.dx * lat, 0.7, 1.7, (ranged ? 210 : 300) + 14 * min);
      u.lane = lane; u.s = s; u.lat = lat; u.ranged = ranged; u.range = ranged ? 15 : 8.5; u.dmg = (ranged ? 17 : 9.5) + 0.5 * min; u.rate = ranged ? 1.0 : 0.7; u.speed = 5.2;
      u.atkT = Math.random() * 0.5;
      W.troopers.push(u);
    }
  }
  fx({ k: 'wave', n: W.waveN });
}
/* ---------- the Hush: no heroes. Hollows that push, thieves that take what is lit, and red rain. ---------- */
function spawnHollow(lane, extra) {
  const L = lanes[lane], min = W.t / 60, s = L.len - 3;
  LL.lanePoint(lane, s, P);
  const u = mk('trooper', 1, P.x, P.z, 1.15, 3.2, [1500, 2100, 2700][W.diff] + 110 * min);
  u.big = true; u.extra = !!extra; u.lane = lane; u.lane0 = lane; u.s = s; u.lat = 0; u.ranged = false; u.range = 3.2;
  u.dmg = [55, 72, 90][W.diff] + 2.5 * min; u.rate = 1.1; u.speed = 4.4; u.atkT = 0.6;
  W.troopers.push(u); fx({ k: 'hollow', lane: lane });
}
function pickMark() {
  let rich = null;
  for (let i = 0; i < W.heroes.length; i++) { const h = W.heroes[i]; if (h.alive && h.team === 0 && h.souls >= 150 && (!rich || h.souls > rich.souls)) rich = h; }
  if (rich && W.rng() < 0.6) return rich;
  if (W.tune.cap && W.structs.some(s => s.team === 0 && s.alive && s.dark)) return rich;
  const l0 = Math.floor(W.rng() * 3);
  for (let k = 0; k < 3; k++) { const st = W.st[0][(l0 + k) % 3]; const s = st.outer.alive ? st.outer : (st.inner.alive ? st.inner : null); if (s && !s.dark) return s; }
  return rich;
}
function spawnThief() {
  const u = mk('thief', 1, (W.rng() - 0.5) * 20, C.PATRON_Z - 8, 0.6, 1.5, 420 + 40 * (W.t / 60));
  u.speed = 8.4; u.state = 0; u.mark = pickMark(); u.loot = 0; u.victim = null; u.carry = null;
  if (!u.mark) { u.alive = false; return; }
  W.thieves.push(u); fx({ k: 'thief', mark: u.mark });
}
function thiefStep(u, dt) {
  if (u.slowT > 0) u.slowT -= dt;
  const sp = u.speed * (u.slowT > 0 ? 1 - u.slowAmt : 1), min = W.t / 60;
  let gx = 0, gz = C.PATRON_Z - 6;
  if (u.state === 0) {
    let m = u.mark;
    if (!m || !m.alive || m.dark || (m.kind === 'hero' && m.souls < 60)) m = u.mark = pickMark();
    if (!m) u.state = 1;
    else {
      gx = m.x; gz = m.z;
      if (hyp(m.x - u.x, m.z - u.z) < m.r + 1.5) {
        if (m.kind === 'hero') { const amt = Math.min(m.souls, 180 + 20 * min); m.souls -= amt; u.loot = amt; u.victim = m; fx({ k: 'theft', u: m, amt: amt, p: m.isPlayer }); }
        else { m.dark = true; m.darkT = 0; u.carry = m; fx({ k: 'snuff', u: m }); }
        u.state = 1; gx = 0; gz = C.PATRON_Z - 6;
      }
    }
  }
  if (u.state === 1 && hyp(u.x - gx, u.z - gz) < 4) {
    if (u.carry && u.carry.alive) { const s = u.carry; s.darkT = 120; s.hp = Math.max(1, s.hp - s.maxHp * 0.25); }
    fx({ k: 'thiefhome', loot: u.loot, carry: u.carry, vp: !!(u.victim && u.victim.isPlayer) });
    u.alive = false; return;
  }
  const dx = gx - u.x, dz = gz - u.z, d = hyp(dx, dz) || 1;
  u.vx = dx / d * sp; u.vz = dz / d * sp; u.x += u.vx * dt; u.z += u.vz * dt; u.yaw = Math.atan2(dx, dz);
  collide(u);
}
function hushStep(dt) {
  // red rain: every five minutes, a thick night
  if (W.red > 0) { W.red -= dt; if (W.red <= 0) { W.red = 0; W.warned = false; if (W.tune.recover) W.calm = 20; fx({ k: 'redend' }); } }
  else if (!W.warned && W.t >= W.redNext - 15) { W.warned = true; fx({ k: 'redwarn' }); }
  else if (W.t >= W.redNext) { W.redNext += C.RED_EVERY; W.red = C.RED_T; fx({ k: 'red' }); for (let l = 0; l < 3; l++) spawnHollow(l, true); }
  // mercy: when the Reign is two structures behind, the Hush eases off
  let rd = 0, hd = 0; for (let i = 0; i < W.structs.length; i++) { const s = W.structs[i]; if (!s.alive) { if (s.team === 0) rd++; else hd++; } }
  W.mercy = rd - hd >= 2;
  if (W.calm > 0) W.calm -= dt;
  for (let l = 0; l < 3; l++) { if (W.hollowT[l] > 0 && W.calm <= 0) { W.hollowT[l] -= dt; if (W.hollowT[l] <= 0) { W.hollowT[l] = 0; spawnHollow(l, false); } } }
  if (W.calm <= 0) W.thiefT -= dt * (W.red > 0 ? (W.tune.stagger ? 2 : 3.5) : 1);
  if (W.thiefT <= 0) { W.thiefT = [85, 62, 44][W.diff] * (W.mercy ? 1.6 : 1); if (W.thieves.filter(u => u.alive).length < (W.tune.stagger ? 2 : 3)) spawnThief(); }
  for (let i = 0; i < W.thieves.length; i++) { const u = W.thieves[i]; if (u.alive) { if (u.flash > 0) u.flash -= dt; thiefStep(u, dt); } }
}
function pickTarget(u, R, heroesOk) {
  const us = W.units, en = 1 - u.team; let best = null, bd = R;
  for (let i = 0; i < us.length; i++) {
    const o = us[i]; if (!o.alive || o.team !== en) continue;
    if (o.struct && !S.vuln(o)) continue;
    let d = hyp(o.x - u.x, o.z - u.z) - o.r;
    if (o.kind === 'hero') { if (!heroesOk) continue; d += 4; }
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function trooperStep(u, dt) {
  u.atkT -= dt; u.tgtT -= dt; if (u.slowT > 0) u.slowT -= dt;
  LL.lanePoint(u.lane, u.s, P);
  const px = P.x - P.dz * u.lat, pz = P.z + P.dx * u.lat;
  const offLane = hyp(u.x - px, u.z - pz);
  if (u.tgtT <= 0) { u.tgtT = 0.3 + Math.random() * 0.1; u.tgt = pickTarget(u, 13, offLane < 9); }
  let tg = u.tgt; if (tg && !tg.alive) tg = u.tgt = null;
  const sp = u.speed * (u.slowT > 0 ? 1 - u.slowAmt : 1);
  let gx = px, gz = pz, move = true;
  if (tg) {
    const d = hyp(tg.x - u.x, tg.z - u.z) - tg.r;
    u.yaw = Math.atan2(tg.x - u.x, tg.z - u.z);
    if (d <= u.range) {
      move = false;
      if (u.atkT <= 0) {
        u.atkT = u.rate;
        if (u.big) fx({ k: 'slam', x: tg.x, z: tg.z }); else tracer(u.x, 1.3, u.z, tg.x, tg.y + Math.min(tg.h * 0.6, 3), tg.z, u.team, false);
        damage(tg, u.dmg * (tg.struct ? 0.8 : 1) * (tg.kind === 'hero' ? 0.8 : 1) * (W.great[u.team] > 0 ? 1.5 : 1), u, 'unit');
      }
    } else { gx = tg.x; gz = tg.z; }
  } else if (offLane < 2.5) {
    u.s = U.clamp(u.s + (u.team === 0 ? 1 : -1) * sp * dt, 0, lanes[u.lane].len);
  }
  if (move) {
    const dx = gx - u.x, dz = gz - u.z, d = hyp(dx, dz);
    if (d > 0.3) { const st = Math.min(d, sp * dt); u.x += dx / d * st; u.z += dz / d * st; u.vx = dx / d * sp; u.vz = dz / d * sp; if (!tg) u.yaw = Math.atan2(dx, dz); }
    else { u.vx = u.vz = 0; }
  } else { u.vx = u.vz = 0; }
  const sgn = u.team === 0 ? 1 : -1;
  if (hyp(u.x, u.z - sgn * C.SPAWN_Z) < C.FOUNT_R) damage(u, 400 * dt, null, 'dot');
}
function structStep(s, dt) {
  if (s.dark) { if (s.darkT > 0) { s.darkT -= dt; if (s.darkT <= 0) { s.dark = false; fx({ k: 'relit', u: s }); } } s.tgt = null; return; }
  s.atkT -= dt; s.scanT -= dt;
  if (s.scanT <= 0) {
    s.scanT = 0.25; s.pressed = false;
    const us = W.units, en = 1 - s.team; let bt = null, btd = s.range, bh = null, bhd = s.range, focus = null;
    for (let i = 0; i < us.length; i++) {
      const o = us[i]; if (!o.alive || o.team !== en) continue;
      const d = hyp(o.x - s.x, o.z - s.z);
      if (o.kind === 'trooper') { if (d < 26) s.pressed = true; if (d < btd) { btd = d; bt = o; } }
      else if (o.kind === 'knot' || o.kind === 'thief') { if (d < btd) { btd = d; bt = o; } }
      else if (o.kind === 'hero') { if (d < s.range) { if (W.t - o.lastDmgHeroT < 2) focus = o; if (d < bhd) { bhd = d; bh = o; } } }
    }
    s.tgt = focus || bt || bh;
  }
  const tg = s.tgt;
  if (tg && tg.alive && s.atkT <= 0) {
    s.atkT = s.rate;
    if (tg === s.lastTgt && tg.kind === 'hero') s.ramp = Math.min(5, s.ramp + 1); else s.ramp = 0;
    s.lastTgt = tg;
    const dmg = tg.kind === 'hero' ? s.dmgH * (1 + 0.2 * s.ramp) : s.dmgT;
    tracer(s.x, s.h * 0.8, s.z, tg.x, tg.y + tg.h * 0.5, tg.z, s.team, true);
    fx({ k: 'towershot', u: s, tp: tg.isPlayer });
    damage(tg, dmg, s, 'tower');
  }
}
function strayStep(u, dt) {
  if (!u.alive) {
    u.respT -= dt;
    if (u.respT <= 0) { u.alive = true; u.maxHp = 900 + 70 * (W.t / 60); u.hp = u.maxHp; u.x = u.hx; u.z = u.hz; u.aggro = null; fx({ k: 'strayback', u: u }); }
    return;
  }
  u.atkT -= dt; if (u.slowT > 0) u.slowT -= dt;
  let a = u.aggro;
  if (a && (!a.alive || hyp(a.x - u.hx, a.z - u.hz) > 20 || W.t - u.lastHurt > 6)) a = u.aggro = null;
  if (!a) {
    const dx = u.hx - u.x, dz = u.hz - u.z, d = hyp(dx, dz);
    if (d > 0.4) { u.x += dx / d * 5 * dt; u.z += dz / d * 5 * dt; }
    if (W.t - u.lastHurt > 4) heal(u, u.maxHp * 0.15 * dt);
    u.yaw += dt * 0.4; return;
  }
  const dx = a.x - u.x, dz = a.z - u.z, d = hyp(dx, dz);
  u.yaw = Math.atan2(dx, dz);
  const sp = 4.2 * (u.slowT > 0 ? 1 - u.slowAmt : 1);
  if (d > 9 && hyp(u.x - u.hx, u.z - u.hz) < 10) { u.x += dx / d * sp * dt; u.z += dz / d * sp * dt; }
  if (d < 11 && u.atkT <= 0) {
    u.atkT = 1.1;
    tracer(u.x, 1.8, u.z, a.x, a.y + 1.2, a.z, 2, true);
    damage(a, 26 + 1.5 * (W.t / 60), u, 'unit');
  }
}
function knotStep(k, dt) {
  k.life -= dt; k.atkT -= dt; k.tgtT -= dt;
  if (k.life <= 0) { k.alive = false; fx({ k: 'death', u: k, x: k.x, y: 0, z: k.z, team: k.team, kind: 'knot' }); return; }
  if (k.tgtT <= 0) { k.tgtT = 0.3; k.tgt = pickTarget(k, k.range, true); }
  const tg = k.tgt;
  if (tg && tg.alive && k.atkT <= 0) {
    k.atkT = k.rate; k.yaw = Math.atan2(tg.x - k.x, tg.z - k.z);
    tracer(k.x, 1.6, k.z, tg.x, tg.y + Math.min(tg.h * 0.6, 3), tg.z, k.team, false);
    damage(tg, k.dmg * (tg.struct ? 0.5 : 1), k, 'unit');
  }
}
function stepZones(dt) {
  const zs = W.zones;
  for (let i = zs.length - 1; i >= 0; i--) {
    const z = zs[i]; z.t += dt;
    if (z.follow && !z.done) { if (!z.follow.alive) { zs.splice(i, 1); continue; } z.x = z.follow.x; z.z = z.follow.z; }
    if (z.delay > 0) {
      if (!z.done && z.t >= z.delay) { z.done = true; aoeDamage(z.x, 1, z.z, z.r, z.burst, z.owner, { knock: 8 }); fx({ k: 'toll', x: z.x, z: z.z, r: z.r, col: z.col }); }
    } else {
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.25;
        if (z.dps) aoeDamage(z.x, 1, z.z, z.r, z.dps * 0.25, z.owner, null);
        if (z.heal) for (let j = 0; j < W.heroes.length; j++) { const h = W.heroes[j]; if (h.alive && h.team === z.team && hyp(h.x - z.x, h.z - z.z) < z.r) heal(h, z.heal * 0.25); }
      }
    }
    if (z.t > z.delay + z.life) zs.splice(i, 1);
  }
}
function stepOrbs(dt) {
  const os = W.orbs;
  for (let i = os.length - 1; i >= 0; i--) {
    const o = os[i];
    if (o.dead) { os.splice(i, 1); continue; }
    o.t += dt; o.y = 1.2 + o.t * 1.3;
    if (W.pull[o.team] > 0) { let g = null, bd = 40; for (let j = 0; j < W.heroes.length; j++) { const h = W.heroes[j]; if (h.alive && h.team === o.team) { const d = hyp(h.x - o.x, h.z - o.z); if (d < bd) { bd = d; g = h; } } } if (g) { claimOrb(o, g); os.splice(i, 1); continue; } }
    if (o.t > 3.2) {
      let g = null, bd = 30;
      for (let j = 0; j < W.heroes.length; j++) { const h = W.heroes[j]; if (h.alive && h.team === o.team) { const d = hyp(h.x - o.x, h.z - o.z); if (d < bd) { bd = d; g = h; } } }
      if (g) { give(g, o.val * 0.7); fx({ k: 'soul', kind: 'drift', val: o.val * 0.7, x: o.x, y: o.y, z: o.z, p: g.isPlayer, team: o.team }); }
      os.splice(i, 1);
    }
  }
}
function separate() {
  const ts = W.troopers, n = ts.length;
  for (let i = 0; i < n; i++) {
    const a = ts[i]; if (!a.alive) continue;
    for (let j = i + 1; j < n; j++) {
      const b = ts[j]; if (!b.alive) continue;
      const dx = b.x - a.x; if (dx > 1.5 || dx < -1.5) continue;
      const dz = b.z - a.z; if (dz > 1.5 || dz < -1.5) continue;
      const d = hyp(dx, dz); if (d >= 1.5) continue;
      const n2 = d || 0.01, p = (1.5 - d) * 0.25, ox = d ? dx / n2 : 1, oz = d ? dz / n2 : 0;
      a.x -= ox * p; a.z -= oz * p; b.x += ox * p; b.z += oz * p;
    }
  }
}

/* ---------- step ----------
   Order matters: heroes act, then troopers, structures, strays, the Ness, then projectiles resolve, then zones and orbs. */
S.step = function (dt) {
  if (!W || W.over) return;
  W.t += dt;
  W.waveT -= dt; if (W.waveT <= 0) { W.waveT = 24; spawnWave(); }
  if (!W.fray && W.t > 900) { W.fray = true; fx({ k: 'fray' }); }
  if (W.t > 1200) {
    if (!W.gutter) { W.gutter = true; fx({ k: 'gutter' }); }
    for (let t = 0; t < 2 && !W.over; t++) { const p = W.patron[t]; if (p.alive) { p.hp -= 25 * dt; if (p.hp <= 0) { p.hp = 0; kill(p, null, null); } } }
    if (W.over) return;
  }
  W.coordT -= dt; if (W.coordT <= 0) { W.coordT = 0.5; coordinate(); }
  hushStep(dt); fruitStep(dt);
  let i;
  for (i = 0; i < W.heroes.length; i++) {
    const h = W.heroes[i];
    if (!h.alive) { h.respT -= dt; if (h.respT <= 0) respawn(h); continue; }
    if (h.flash > 0) h.flash -= dt;
    if (h.useAI) aiHero(h, dt);
    heroStep(h, dt);
  }
  for (i = 0; i < W.creases.length; i++) { const c = W.creases[i]; if (c.t > 0) { c.t -= dt; if (c.t <= 0) { c.t = 0; c.cd = 100; fx({ k: 'foldend', i: i, p: c.team === 0 }); } } else if (c.cd > 0) c.cd -= dt; }
  for (i = 0; i < W.troopers.length; i++) {
    const u = W.troopers[i]; if (!u.alive) continue;
    if (u.flash > 0) u.flash -= dt;
    if (!u.folded && u.z > -13 && u.z < 13) for (let k = 0; k < W.creases.length; k++) { const c = W.creases[k]; if (c.t > 0 && c.team === u.team && u.lane === c.from) { foldTrooper(u, c); break; } }
    trooperStep(u, dt);
  }
  for (i = 0; i < W.structs.length; i++) { const s = W.structs[i]; if (s.alive) { if (s.flash > 0) s.flash -= dt; structStep(s, dt); } }
  for (i = 0; i < W.strays.length; i++) { const s = W.strays[i]; if (s.flash > 0) s.flash -= dt; strayStep(s, dt); }
  if (W.ness.flash > 0) W.ness.flash -= dt; nessStep(W.ness, dt);
  for (i = 0; i < 2; i++) if (W.great[i] > 0) { W.great[i] -= dt; if (W.great[i] <= 0) { W.great[i] = 0; fx({ k: 'greatend', team: i }); } }
  for (i = 0; i < W.knots.length; i++) { const k = W.knots[i]; if (k.alive) { if (k.flash > 0) k.flash -= dt; knotStep(k, dt); } }
  // damage over time
  for (i = 0; i < W.units.length; i++) {
    const u = W.units[i];
    if (u.alive && u.dotT > 0) {
      u.dotT -= dt; u.dotAcc += u.dotDps * dt;
      if (u.dotAcc >= u.dotDps * 0.5 || u.dotT <= 0) { const a = u.dotAcc; u.dotAcc = 0; damage(u, a, u.dotSrc, 'ab'); }
    }
  }
  stepProjs(dt); stepZones(dt); stepOrbs(dt); separate();
  W.cleanT -= dt;
  if (W.cleanT <= 0) {
    W.cleanT = 1;
    W.troopers = W.troopers.filter(u => u.alive); W.knots = W.knots.filter(u => u.alive); W.thieves = W.thieves.filter(u => u.alive);
    W.units = W.units.filter(u => u.alive || u.kind === 'hero' || u.struct || u.kind === 'stray' || u.kind === 'ness');
  }
};

/* Hooks for tools/test.js. Nothing in the game calls these. */
S._t = { eat: eat, damage: damage, kill: kill, spawnThief: spawnThief, spawnHollow: spawnHollow, thiefStep: thiefStep };

/* Aim ray for the human player: first thing the crosshair is on. */
S.aimPoint = function (ox, oy, oz, dx, dy, dz, t0, team, out) {
  const D = 220, ax = ox + dx * t0, ay = oy + dy * t0, az = oz + dz * t0;
  const bx = ox + dx * D, by = oy + dy * D, bz = oz + dz * D;
  let bt = 1, unit = null, orb = null;
  if (dy < 0) { const t = (0 - ay) / (by - ay); if (t >= 0 && t < bt) bt = t; }
  const obs = W.obstacles;
  for (let i = 0; i < obs.length; i++) { const o = obs[i]; const t = segCyl(ax, ay, az, bx, by, bz, o.x, o.z, o.r, -1, o.h); if (t >= 0 && t < bt) bt = t; }
  const us = W.units;
  for (let i = 0; i < us.length; i++) {
    const u = us[i]; if (!u.alive) continue;
    const foe = u.team !== team;
    const t = segCyl(ax, ay, az, bx, by, bz, u.x, u.z, u.r + (foe ? 0.25 : 0), u.y - 0.1, u.y + u.h + 0.2);
    if (t >= 0 && t < bt) { if (!foe && !u.struct) continue; bt = t; unit = foe ? u : null; orb = null; }
  }
  for (let i = 0; i < W.orbs.length; i++) {
    const o = W.orbs[i]; if (o.dead) continue;
    const t = segCyl(ax, ay, az, bx, by, bz, o.x, o.z, 1.1, o.y - 1.1, o.y + 1.1);
    if (t >= 0 && t < bt) { bt = t; orb = o; unit = null; }
  }
  out.x = ax + (bx - ax) * bt; out.y = ay + (by - ay) * bt; out.z = az + (bz - az) * bt;
  out.unit = unit; out.orb = orb; out.dist = bt * (D - t0);
  return out;
};
})(typeof window !== 'undefined' ? window : globalThis);
