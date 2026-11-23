/* LIVLOCH · motion: how a painted body moves. Presentation only; it reads a unit and never writes one.

   DESIGN
   - Started from the shared paper-motion rig on the Lantern Ford study branch (work/lantern-ford-foldlight,
     js/ford-motion.js, by the owner's other agent). Kept: stride driven by distance walked, a stride length per hero,
     smoothed aim, a landing dip, recoil. Added for 0.19: turn rate, air stretch, a squash value for landings, and
     the same rig for the fox. Added for 0.20: springs for follow-through (cloak, hem flare, head, landing rebound),
     a run bounce, knee folds, and foot contacts for dust.
   - Stride is distance, not time: feet should not slide, and a hero slowed by a hollow should step slower.
   - Everything eases with exp(-dt * k), so a dropped frame changes nothing but smoothness.
   - Runs in the browser (LL.paperMotion) and under Node (module.exports) so tools/test.js can check it. */
(function (root) {
'use strict';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ease = (k, dt) => 1 - Math.exp(-dt * k);
/* cycle: metres walked per full stride (two steps). hem: where the legs start, as a fraction of height. */
const RIGS = {
  dora: { cycle: 3.75, hem: 0.20 }, anna: { cycle: 3.25, hem: 0.30 }, myra: { cycle: 2.95, hem: 0.22 }, skein: { cycle: 3.6, hem: 0.27 },
  fox: { cycle: 1.6, hem: 0.3 }
};
function create() { return { x: null, z: null, yaw: null, phase: 0, mix: 0, aim: 0, ground: true, land: 0, turn: 0, air: 0, ci: null,
  s: { cx: 0, cv: 0, fx: 0, fv: 0, hx: 0, hv: 0, q: 0, qv: 0, lr: 0 } }; }
/* One damped spring, stepped semi-implicitly at a fixed 1/120 s so it behaves the same at any frame rate. */
function spring(S, x, v, target, k, c, dt) {
  for (let h = Math.min(dt, 1 / 120), left = dt; left > 1e-6; left -= h, h = Math.min(h, left)) { S[v] += (-k * (S[x] - target) - c * S[v]) * h; S[x] += S[v] * h; }
}
/* sc (optional): how the unit moves on screen. r: speed to the right of the screen, f: speed away from the camera. */
function pose(m, u, dt, t, still, sc) {
  dt = clamp(dt || 0, 0, 0.1);
  const r = RIGS[(u.def && u.def.id) || u.rig] || RIGS.dora;
  const step = m.x == null ? 0 : Math.hypot(u.x - m.x, u.z - m.z), teleport = step >= 2.5;
  m.x = u.x; m.z = u.z;
  // how much of a walk this is, 0 standing to 1 striding
  const moving = !teleport && dt > 0 ? clamp(step / (dt * 5.4), 0, 1) : 0;
  m.mix += (moving * (u.onGround !== false ? 1 : 0.24) - m.mix) * ease(moving > m.mix ? 17 : 21, dt);
  if (!teleport && u.onGround !== false) m.phase = (m.phase + step / r.cycle * 2 * Math.PI) % (2 * Math.PI);
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
  // aiming: in fast, out slower, so a burst holds the pose
  const age = Math.max(0, t - (u.lastShotT == null ? -99 : u.lastShotT)), shooting = age < 0.25;
  m.aim += ((shooting ? 1 : 0) - m.aim) * ease(shooting ? 34 : 9, dt);
  const s = Math.sin(m.phase) * m.mix, sway = still ? 0 : s, lift = Math.abs(Math.sin(m.phase)) * m.mix;
  const recoil = still ? 0 : Math.exp(-age * 30) * clamp(m.aim + 0.3, 0, 1);
  /* FOLLOW-THROUGH (0.20). Springs on how the body moves across the screen, so cloth and hair carry on after the body
     stops: the cloak trails the motion and swings past when you stop, the hem flares with speed and lifts in the air,
     the head kicks against a change of speed, and a landing squashes and rebounds once instead of easing flat. All in
     fractions of the figure's height; the renderer turns them into bends of the paper. */
  const sr = sc && !still ? sc.r : 0, sf = sc && !still ? sc.f : 0, sp = Math.hypot(sr, sf);
  if (dt > 0 && !still) S.hv -= clamp((sr - S.lr) * 0.045, -0.5, 0.5);
  S.lr = sr;
  spring(S, 'cx', 'cv', still ? 0 : clamp(-sr * 0.032, -0.22, 0.22) + sway * 0.05 * (1 - clamp(Math.abs(sr) / 4, 0, 1)), 70, 6.5, dt);
  spring(S, 'fx', 'fv', still ? 0 : clamp(sp * 0.014, 0, 0.1) + (m.ground ? 0 : 0.035) + lift * 0.02, 46, 8, dt);
  spring(S, 'hx', 'hv', 0, 130, 10, dt);
  spring(S, 'q', 'qv', 0, 170, 9, dt);
  /* Landing squash = the hit at once (land) plus the spring's give and one rebound (q). A run, not a walk: the body is highest in the stride's flight (legs apart) and lowest at mid-stance (legs passing). */
  const bob = still ? 0 : 0.062 * lift - 0.024 * m.mix;
  /* Knees: a leg folds most while it swings forward under the body, a little while it carries weight. The side view's
     two legs are A (angle +sway) and B (angle -sway); fold is 0 to 1 and the renderer picks the direction from facing. */
  const c = Math.cos(m.phase);
  return {
    sway, phase: m.phase, mix: m.mix, aim: m.aim, hem: r.hem,
    liftL: Math.max(0, sway) * 0.21, liftR: Math.max(0, -sway) * 0.21,
    body: still ? 0 : bob - 0.05 * m.land,
    roll: still ? 0 : sway * 0.03 + clamp(-m.turn * 0.02, -0.06, 0.06) + (u.dashT > 0 ? 0.045 : 0),
    squash: still ? 0 : clamp(m.land * 0.7 - S.q, -0.6, 1.2), stretch: still ? 0 : m.air, recoil, air: !m.ground, turn: m.turn,
    run: still ? 0 : (0.5 - lift) * m.mix, // + at mid-stance (legs passing: compress), - in flight (stretch)
    kneeA: still ? 0 : m.mix * (0.14 + 0.9 * Math.pow(Math.max(0, c), 1.4)), kneeB: still ? 0 : m.mix * (0.14 + 0.9 * Math.pow(Math.max(0, -c), 1.4)),
    cloak: S.cx, flare: Math.max(0, S.fx), head: clamp(S.hx, -0.12, 0.12), wave: still ? 0 : 0.012 + 0.03 * m.mix + (m.ground ? 0 : 0.03),
    contact, landed
  };
}
const api = { create, pose, spring, RIGS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LL.paperMotion = api;
})(typeof window === 'undefined' ? globalThis : window);
