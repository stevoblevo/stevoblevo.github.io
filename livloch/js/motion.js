/* LIVLOCH · motion: how a painted body moves. Presentation only; it reads a unit and never writes one.

   DESIGN
   - Started from the shared paper-motion rig on the Lantern Ford study branch (work/lantern-ford-foldlight,
     js/ford-motion.js, by the owner's other agent). Kept: stride driven by distance walked, a stride length per hero,
     smoothed aim, a landing dip, recoil. Added for 0.19: turn rate, air stretch, a squash value for landings, and
     the same rig for the fox. Added for 0.20: springs for follow-through (cloak, hem flare, head, landing rebound),
     a run bounce, knee folds, and foot contacts for dust. Added for 0.21: a gait per hero (GAITS), a braid that swings
     as its own pendulum, coat halves kicked by the knees, a thrown gun (wind-up, throw, follow-through), poses for
     abilities (cast), and an idle that is not a frozen card.
   - Stride is distance, not time: feet should not slide, and a hero slowed by a hollow should step slower.
   - Everything eases with exp(-dt * k) or a spring stepped at a fixed 1/120 s, so a dropped frame changes nothing but
     smoothness.
   - Runs in the browser (LL.paperMotion) and under Node (module.exports) so tools/test.js can check it.
   - 0.25 air: clocks and envelopes for the air poses (pose().airs, from airStep): take-off, rise, top, fall, a second
     jump and the hover, read from the unit (vy, onGround, jumps, hoverT). The 3D figures pose from them.
   - 0.29 look: paper life (sc.paper), a breath, a sway and a stirring cloak for the painted cards; see pose(). */
(function (root) {
'use strict';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ease = (k, dt) => 1 - Math.exp(-dt * k);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/* cycle: metres walked per full stride (two steps). hem: where the legs start, as a fraction of height. */
const RIGS = {
  dora: { cycle: 3.75, hem: 0.20 }, anna: { cycle: 3.4, hem: 0.30 }, myra: { cycle: 2.95, hem: 0.22 }, skein: { cycle: 3.6, hem: 0.27 },
  fox: { cycle: 1.6, hem: 0.3 },
  rook: { cycle: 3.55, hem: 0.28 } // 0.25 rook
};
/* GAITS (0.21): how each hero carries themself, as multipliers on the 0.20 rig. 1 (or 0 for the additions) is the 0.20
   motion, so a hero without a line here moves as before apart from the idle.
   bob: the run bounce. shift: weight moving foot to foot, seen from front or back. roll: the body's roll with the step.
   swing: how far the legs scissor. arm: how far the arms swing. knee: knee fold. lean: extra forward lean into a run,
   as a fraction of height at full stride. stiff: follow-through springs (below 1 = heavier cloth, slower to settle).
   cloak: how far the hem trails a move across the screen.
   plant: how hard a foot comes down (a squash each step, more dust, grit). idle: weight shifts and a glance now and then
   when standing. flap: coat halves kicked up by the knees (front and back). braid: a hanging braid that swings as its
   own pendulum; len is its swinging length in metres, drag how far running trails it (radians per m/s).
   throw: the gun is thrown, not fired (a wind-up while the next shot is coming, a lunge on the shot, a follow-through).
   far: the far arm swings behind the body in the side view. */
const GAIT0 = { bob: 1, shift: 1, roll: 1, swing: 1, arm: 1, knee: 1, lean: 0, stiff: 1, cloak: 1, plant: 0, idle: 0.6, flap: 0, braid: null, throw: 0, far: 0 };
const GAITS = {
  /* Dora: her leg strips are cut below the cloak since 0.21 (PAPER legs), which shortens them; a wider scissor keeps the stride. */
  dora: { swing: 1.15 },
  /* Anna: "slow, heavy, accurate". A lower bounce and a bigger weight transfer, boots that come down hard, a forward
     lean into the run, a heavy coat that is slow to settle, a long braid, and a rock hammer that is thrown. */
  anna: { bob: 0.62, shift: 1.45, roll: 1.35, swing: 1.12, arm: 1.35, knee: 1.15, lean: 0.03, stiff: 0.72, cloak: 0.5, plant: 1, idle: 1, flap: 1, braid: { len: 0.46, drag: 0.05 }, throw: 1, far: 1 }
};
/* 0.25 rook: a courier's run, light and level under the pack: less bounce, a little forward lean, arms that work. */
GAITS.rook = { bob: 0.85, roll: 0.85, arm: 1.15, lean: 0.02, stiff: 0.9 };
const gaitCache = {};
function gaitOf(id) { return gaitCache[id] || (gaitCache[id] = Object.assign({}, GAIT0, GAITS[id] || {})); }
function create() { return { x: null, z: null, yaw: null, phase: 0, mix: 0, aim: 0, ground: true, land: 0, turn: 0, air: 0, ci: null, cue: null, hold: 0, gl: null, wind: 0, kick: 0,
  s: { cx: 0, cv: 0, fx: 0, fv: 0, hx: 0, hv: 0, q: 0, qv: 0, lr: 0 } }; }
/* AIR (0.25). Where a body is in its airtime, for the air poses, read from the unit: a take-off is leaving the ground
   upward fast (vy > 6, a jump or a jump off a thread; a knock is slower); a second jump is u.jumps rising to 2 or more
   in the air; the hover is u.hoverT > 0. Envelopes are 0 to 1: tko (the take-off, in and out within a third of a
   second), rise, apex and fall (from the smoothed vertical speed; they sum to about 1 in the air, 0 on the ground),
   dbl (a sine over the second jump's AIR_DBL seconds; dblP is how far through it, 1 when there is none), hov (the hover
   blended in fast and out slower). Clocks tk and db are seconds since the take-off and the second jump; n counts
   second jumps, so a renderer can tell a new one. */
const AIR_DBL = 0.55;
function airStep(m, u, dt) {
  const A = m.A || (m.A = { g: true, j: 0, tk: 9, db: 9, n: 0, vy: 0, tko: 0, rise: 0, apex: 0, fall: 0, dbl: 0, dblP: 1, hov: 0 });
  const g = u.onGround !== false && !u.zip, vy = u.vy || 0, j = u.jumps || 0;
  if (!g && A.g && vy > 6) A.tk = 0;
  if (!g && j > A.j && j >= 2) { A.db = 0; A.n++; }
  if (g) A.db = 9;
  A.g = g; A.j = j; A.tk += dt; A.db += dt; A.vy += (vy - A.vy) * ease(30, dt);
  const air = g ? 0 : 1, w = clamp(A.vy / 9.6, -1, 1);
  A.tko = air * ss(0, 0.05, A.tk) * (1 - ss(0.1, 0.32, A.tk));
  A.apex = air * (1 - clamp(Math.abs(w) * 2.2, 0, 1)); A.rise = air * clamp(w, 0, 1) * (1 - A.apex * 0.5); A.fall = air * clamp(-w * 1.3, 0, 1) * (1 - A.apex * 0.5);
  A.dblP = clamp(A.db / AIR_DBL, 0, 1); A.dbl = A.db < AIR_DBL ? Math.sin(Math.PI * A.dblP) : 0;
  const hv = u.hoverT > 0 && !g ? 1 : 0; A.hov += (hv - A.hov) * ease(hv ? 14 : 7, dt); if (g && A.hov < 0.01) A.hov = 0;
  return A;
}
/* One damped spring, stepped semi-implicitly at a fixed 1/120 s so it behaves the same at any frame rate. */
function spring(S, x, v, target, k, c, dt) {
  for (let h = Math.min(dt, 1 / 120), left = dt; left > 1e-6; left -= h, h = Math.min(h, left)) { S[v] += (-k * (S[x] - target) - c * S[v]) * h; S[x] += S[v] * h; }
}
/* An ability's pose, cued by the renderer when a 'cast' event arrives. The pose plays from the next pose() call.
   stomp (a nova: a hard squash and a rebound), brace (a long straight shot: a shove back, held aim), point (an ult sent
   down the lane: a lunge, held aim), lob (a thrown orb: the throw lunge), pop (anything else: a small give). */
function cast(m, kind, ult) {
  const what = kind === 'nova' ? 'stomp' : (kind === 'line' ? (ult ? 'point' : 'brace') : (kind === 'orb' ? 'lob' : (kind === 'dash' || kind === 'blink' ? null : 'pop')));
  if (what) m.cue = what; return what;
}
/* THE BRAID (0.21). A pendulum in the plane of the screen, hung from the nape: gravity, the pivot's own acceleration
   (the body shifting foot to foot, bobbing, starting and stopping), and the air as the hero runs (it trails). Angle is in
   radians, + swings the tip to the right of the screen. A second spring is the lower half catching up (the whip). */
function braidStep(S, G, dt, sc, sway, bodyY, sr, idleX) {
  const B = G.braid, L = B.len, g = 9.8, h = (sc && sc.h) || 2.3, mir = (sc && sc.m) || 1, fb = !!(sc && sc.fb);
  // where the pivot is on the screen, metres; the renderer moves the body by the same amounts
  const px = (fb ? (-sway * 0.035 * G.shift + idleX * 0.012) * h : 0) * mir, py = bodyY;
  if (S.bpx == null || Math.abs(px - S.bpx) > 0.1 || Math.abs(py - S.bpy) > 0.2 || dt <= 0) { S.bpx = px; S.bpy = py; S.bvx = 0; S.bvy = 0; S.blr = sr; }
  const vx = dt > 0 ? (px - S.bpx) / dt : 0, vy = dt > 0 ? (py - S.bpy) / dt : 0;
  let ax = dt > 0 ? (vx - S.bvx) / dt : 0, ay = dt > 0 ? (vy - S.bvy) / dt : 0;
  const kb = 0.4 + 0.6 * (sc && sc.k != null ? sc.k : 1); // 0.22.2: strafing while facing away swings it less
  ax += dt > 0 ? clamp((sr - S.blr) / dt, -22, 22) * kb : 0; // starting, stopping, changing direction on the screen
  S.bpx = px; S.bpy = py; S.bvx = vx; S.bvy = vy; S.blr = sr;
  ax = clamp(ax, -45, 45); ay = clamp(ay, -25, 25);
  const trail = clamp(-sr * B.drag * kb, -0.45, 0.45), ge = clamp(g + ay, 2, 30);
  for (let hh = Math.min(dt, 1 / 120), left = dt; left > 1e-6; left -= hh, hh = Math.min(hh, left)) {
    S.bav += (-(ge / L) * Math.sin(S.ba - trail) - (ax / L) * Math.cos(S.ba) - 3.1 * S.bav) * hh; S.ba += S.bav * hh;
    if (Math.abs(S.ba) > 0.9) { S.ba = clamp(S.ba, -0.9, 0.9); S.bav *= 0.5; }
  }
  spring(S, 'bt', 'btv', S.ba, 150, 8.5, dt);
  // seen from behind, running away trails the braid toward the camera: it looks shorter, and a hard step bounces it
  spring(S, 'bl', 'blv', clamp(((sc && sc.f) || 0) * 0.03, 0, 0.22) + clamp(-ay * 0.004, -0.06, 0.06), 60, 7, dt);
}
/* sc (optional): how the unit moves on screen. r: speed to the right of the screen, f: speed away from the camera.
   0.21 adds what the braid needs to know about the picture: fb (seen from front or back), m (1, or -1 when mirrored),
   h (height in metres). */
function pose(m, u, dt, t, still, sc) {
  dt = clamp(dt || 0, 0, 0.1);
  const id = (u.def && u.def.id) || u.rig, r = RIGS[id] || RIGS.dora, G = gaitOf(id);
  const step = m.x == null ? 0 : Math.hypot(u.x - m.x, u.z - m.z), teleport = step >= 2.5;
  m.x = u.x; m.z = u.z;
  // how much of a walk this is, 0 standing to 1 striding
  const moving = !teleport && dt > 0 ? clamp(step / (dt * 5.4), 0, 1) : 0;
  m.mix += (moving * (u.onGround !== false ? 1 : 0.24) - m.mix) * ease(moving > m.mix ? 17 : 21, dt);
  /* 0.24 heroes3d: a 3D figure shortens its stride when it moves slowly (sc.cyc, a multiplier on the cycle) so a planted foot
     does not skate; the phase is still distance walked, so feet, dust and footsteps stay in step. */
  const cyc = r.cycle * (sc && sc.cyc > 0 ? sc.cyc : 1);
  if (!teleport && u.onGround !== false) m.phase = (m.phase + step / cyc * 2 * Math.PI) % (2 * Math.PI);
  /* A foot comes down twice a stride, at the widest point of the step (phase π/2 and 3π/2). */
  const ci = Math.floor((m.phase - Math.PI / 2 + 2 * Math.PI) / Math.PI) % 2;
  let contact = 0; if (m.ci != null && ci !== m.ci && m.mix > 0.45 && u.onGround !== false && !still) contact = ci ? 2 : 1; m.ci = ci;
  // landing and air
  const S = m.s || (m.s = { cx: 0, cv: 0, fx: 0, fv: 0, hx: 0, hv: 0, q: 0, qv: 0, lr: 0 });
  let landed = 0;
  if (u.onGround !== false && !m.ground) { m.land = clamp(0.55 + Math.abs(u.vyLand || 0) * 0.04, 0, 1); landed = m.land; if (!still) S.qv -= 4 + m.land * 4; }
  m.ground = u.onGround !== false; m.land *= Math.exp(-dt * 11);
  const vy = u.vy || 0; m.air += ((m.ground ? 0 : clamp(vy * 0.08, -0.6, 1)) - m.air) * ease(14, dt);
  // turning: how fast the facing changes, smoothed
  if (m.yaw == null) m.yaw = u.yaw || 0;
  let dy = (u.yaw || 0) - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw = u.yaw || 0;
  m.turn += ((dt > 0 ? clamp(dy / dt, -6, 6) : 0) - m.turn) * ease(8, dt);
  // aiming: in fast, out slower, so a burst holds the pose. An ability can hold it too (m.hold, seconds).
  const age = Math.max(0, t - (u.lastShotT == null ? -99 : u.lastShotT)), shooting = age < 0.25 || m.hold > 0;
  m.aim += ((shooting ? 1 : 0) - m.aim) * ease(shooting ? 34 : 9, dt); m.hold = Math.max(0, (m.hold || 0) - dt);
  const s = Math.sin(m.phase) * m.mix, sway = still ? 0 : s, lift = Math.abs(Math.sin(m.phase)) * m.mix;
  const recoil = still ? 0 : Math.exp(-age * 30) * clamp(m.aim + 0.3, 0, 1);
  /* FOLLOW-THROUGH (0.20). Springs on how the body moves across the screen, so cloth and hair carry on after the body
     stops: the cloak trails the motion and swings past when you stop, the hem flares with speed and lifts in the air,
     the head kicks against a change of speed, and a landing squashes and rebounds once instead of easing flat. All in
     fractions of the figure's height; the renderer turns them into bends of the paper. 0.21: stiffness per gait. */
  const sr = sc && !still ? sc.r : 0, sf = sc && !still ? sc.f : 0, sp = Math.hypot(sr, sf), kS = G.stiff, cS = Math.sqrt(G.stiff);
  /* 0.22.2: k says how much a move across the screen should drag cloth. Running across the screen side-on, fully; strafing
     while facing away (third-person play, nearly all the time), barely: there the cloak was shearing sideways into a
     parallelogram, which the owner saw as motion getting worse. */
  const kx = sc && sc.k != null ? sc.k : 1;
  if (dt > 0 && !still) S.hv -= clamp((sr - S.lr) * 0.045 * kx, -0.5, 0.5);
  S.lr = sr;
  spring(S, 'cx', 'cv', still ? 0 : clamp(-sr * 0.032 * G.cloak * kx, -0.22, 0.22) + sway * 0.05 * (1 - clamp(Math.abs(sr) / 4, 0, 1)), 70 * kS, 6.5 * cS, dt);
  spring(S, 'fx', 'fv', still ? 0 : clamp(sp * 0.014, 0, 0.1) + (m.ground ? 0 : 0.035) + lift * 0.02, 46 * kS, 8 * cS, dt);
  spring(S, 'hx', 'hv', 0, 130, 10, dt);
  /* A heavy foot (plant): each step lands like a small landing, a quick squash that the same spring rebounds. */
  if (contact && G.plant && !still) S.qv -= G.plant * (2.6 + 2.2 * m.mix);
  spring(S, 'q', 'qv', 0, 170, 9, dt);
  /* IDLE (0.21). Standing, the weight drifts from foot to foot on two slow beats, and now and then the head turns a
     little (a glance, every five seconds or so). Fades out as the walk comes in. */
  const seed = ((u.id || 0) * 1.7) % 6.283, calm = (1 - m.mix) * (m.ground ? 1 : 0) * (still ? 0 : G.idle);
  const idleX = calm * (Math.sin(t * 0.83 + seed) * 0.62 + Math.sin(t * 0.31 + seed * 2.3) * 0.38);
  const gi = Math.floor((t + seed) / 5.3);
  if (m.gl != null && gi !== m.gl && calm > 0.5) S.hv += (Math.sin(gi * 12.9898) > 0 ? 1 : -1) * 0.55 * calm;
  m.gl = gi;
  /* COAT (0.21). The halves of a slit coat are kicked up by the knee coming through under them, each on its own spring
     (front and back views; the renderer lifts that half of the hem). */
  if (G.flap) {
    if (S.pl == null) { S.pl = S.plv = S.pr = S.prv = 0; }
    spring(S, 'pl', 'plv', still || !m.ground ? 0 : Math.max(0, sway) * G.flap, 95 * kS, 7 * cS, dt);
    spring(S, 'pr', 'prv', still || !m.ground ? 0 : Math.max(0, -sway) * G.flap, 95 * kS, 7 * cS, dt);
  }
  /* THE THROW (0.21). A hero whose gun is thrown winds up while the trigger is held and the next shot is coming (the
     last third of a second before it) and is thrown forward on the shot, easing back over a fifth of a second: - wound back,
     + thrown. Not a spring: a spring's overshoot after one throw ran into the wind-up for the next. An ability can throw
     too (kick, below), for any hero. */
  const firing = G.throw && !!(u.ctl && u.ctl.fire) && !(u.reloadT > 0) && !(u.ammo <= 0), nextIn = Math.max(0, u.fireT || 0);
  m.wind = (m.wind || 0) + ((firing && !still ? ss(0.32, 0.05, nextIn) : 0) - (m.wind || 0)) * ease(firing ? 40 : 14, dt);
  m.kick = (m.kick || 0) * Math.exp(-dt * 6);
  const thrown = G.throw ? Math.exp(-age * 7) * G.throw : 0, tw = still ? 0 : Math.max(thrown, m.kick) - 0.85 * m.wind;
  /* ABILITY POSES (0.21), from cast(). */
  if (S.st == null) { S.st = 0; S.bk = S.bkv = 0; }
  if (m.cue && !still) {
    const c = m.cue; m.cue = null;
    if (c === 'stomp') { S.qv -= 13; S.st = 1; S.hv += 0.4; m.aim = Math.min(m.aim, 0.1); m.hold = 0; }
    else if (c === 'brace') { S.bkv += 5; S.qv -= 5; m.hold = 0.5; S.hv -= 0.7; }
    else if (c === 'point') { m.kick = 1.2; S.qv -= 3; m.hold = 0.7; }
    else if (c === 'lob') { m.kick = 0.9; S.qv -= 2; }
    else if (c === 'pop') { S.qv -= 3.5; S.hv += 0.35; }
  }
  m.cue = null;
  S.st *= Math.exp(-dt * 5.5);
  spring(S, 'bk', 'bkv', 0, 120, 14, dt);
  /* Landing squash = the hit at once (land) plus the spring's give and one rebound (q). A run, not a walk: the body is highest in the stride's flight (legs apart) and lowest at mid-stance (legs passing). */
  const bob = still ? 0 : 0.062 * lift * G.bob - 0.024 * m.mix;
  const body = still ? 0 : bob - 0.05 * m.land;
  if (G.braid) {
    if (S.ba == null) { S.ba = S.bav = S.bt = S.btv = S.bl = S.blv = 0; S.bpx = null; }
    if (still) { S.ba = S.bav = S.bt = S.btv = S.bl = S.blv = 0; S.bpx = null; } else braidStep(S, G, dt, sc, sway, body - clamp(m.land * 0.7 - S.q, -0.6, 1.2) * 0.1 * ((sc && sc.h) || 2.3), sr, idleX);
  }
  /* Knees: a leg folds most while it swings forward under the body, a little while it carries weight. The side view's
     two legs are A (angle +sway) and B (angle -sway); fold is 0 to 1 and the renderer picks the direction from facing. */
  const c = Math.cos(m.phase), K = G.knee;
  /* 0.29 look: PAPER LIFE. A painted card (sc.paper: Heroes as 3D figures off, or Lighter graphics on a device that turned
     them off) stood as a still sticker, most of all Rook Vale, whose sheet has no separate arms or motion cells. On paper
     only (the 3D figures have their own idle): standing, a breath bob and a slow weight sway, the cloak and hem stirring on
     two slow beats, a small nod; walking, a deeper bob, a waddle roll with the step and a nod on each foot fall, and the
     hem fluttering. All of it scales with G.idle and fades out in reduced motion (still). Units as the rest: metres for
     body, radians for roll, fractions of height for cloak, flare, head and wave. */
  const pap = !!(sc && sc.paper) && !still, pk = pap ? Math.max(0.6, G.idle) : 0, rest = (1 - m.mix) * (m.ground ? 1 : 0);
  const pBody = pap ? (rest * 0.026 * Math.sin(t * 2.1 + seed) + m.mix * 0.035 * lift * G.bob) * pk : 0;
  const pRoll = pap ? (rest * 0.02 * Math.sin(t * 0.9 + seed) + sway * 0.035 * G.roll) * pk : 0;
  const pCloak = pap ? (rest * 0.03 * Math.sin(t * 1.7 + seed * 1.3) + m.mix * 0.02 * Math.sin(m.phase * 2 + 0.8)) * pk : 0;
  const pHead = pap ? (rest * 0.02 * Math.sin(t * 1.1 + seed * 0.7) + m.mix * 0.03 * Math.sin(m.phase * 2)) * pk : 0;
  const pWave = pap ? (0.025 * rest + 0.025 * m.mix) * pk : 0, pFlare = pap ? (0.02 * rest * (0.5 + 0.5 * Math.sin(t * 1.3 + seed)) + 0.01 * m.mix) * pk : 0;
  return {
    sway, phase: m.phase, mix: m.mix, aim: m.aim, hem: r.hem, g: G,
    liftL: Math.max(0, sway) * 0.21, liftR: Math.max(0, -sway) * 0.21,
    body: body + pBody,
    roll: pRoll + (still ? 0 : sway * 0.03 * G.roll) + clamp(-m.turn * 0.02, -0.06, 0.06) + (u.dashT > 0 ? 0.045 : 0) + idleX * 0.018,
    squash: still ? 0 : clamp(m.land * 0.7 - S.q, -0.6, 1.2), stretch: still ? 0 : m.air, recoil, air: !m.ground, turn: m.turn,
    run: still ? 0 : (0.5 - lift) * m.mix, // + at mid-stance (legs passing: compress), - in flight (stretch)
    kneeA: still ? 0 : m.mix * K * (0.14 + 0.9 * Math.pow(Math.max(0, c), 1.4)), kneeB: still ? 0 : m.mix * K * (0.14 + 0.9 * Math.pow(Math.max(0, -c), 1.4)),
    cloak: S.cx + pCloak, flare: Math.max(0, S.fx) + pFlare, head: clamp(S.hx + pHead, -0.12, 0.12), wave: still ? 0 : 0.012 + 0.03 * m.mix + (m.ground ? 0 : 0.03) + pWave,
    contact, landed, plant: contact ? G.plant * m.mix : 0,
    // 0.21
    idle: still ? 0 : idleX, lean: still ? 0 : G.lean * m.mix * (m.ground ? 1 : 0.5),
    flapL: G.flap && !still ? S.pl : 0, flapR: G.flap && !still ? S.pr : 0,
    throw: tw, stomp: still ? 0 : S.st, brace: still ? 0 : S.bk,
    braid: G.braid && !still ? S.ba : 0, braidTip: G.braid && !still ? S.bt - S.ba : 0, braidLift: G.braid && !still ? Math.max(0, S.bl) : 0,
    airs: airStep(m, u, dt) // 0.25 air
  };
}
const api = { create, pose, spring, cast, RIGS, GAITS, gaitOf, airStep, AIR_DBL };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LL.paperMotion = api;
})(typeof window === 'undefined' ? globalThis : window);
