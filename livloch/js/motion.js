/* LIVLOCH · motion: how a painted body moves. Presentation only; it reads a unit and never writes one.

   DESIGN
   - Started from the shared paper-motion rig on the Lantern Ford study branch (work/lantern-ford-foldlight,
     js/ford-motion.js, by the owner's other agent). Kept: stride driven by distance walked, a stride length per hero,
     smoothed aim, a landing dip, recoil. Added for 0.19: turn rate, air stretch, a squash value for landings, and
     the same rig for the fox.
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
function create() { return { x: null, z: null, yaw: null, phase: 0, mix: 0, aim: 0, ground: true, land: 0, turn: 0, air: 0 }; }
function pose(m, u, dt, t, still) {
  dt = clamp(dt || 0, 0, 0.1);
  const r = RIGS[(u.def && u.def.id) || u.rig] || RIGS.dora;
  const step = m.x == null ? 0 : Math.hypot(u.x - m.x, u.z - m.z), teleport = step >= 2.5;
  m.x = u.x; m.z = u.z;
  // how much of a walk this is, 0 standing to 1 striding
  const moving = !teleport && dt > 0 ? clamp(step / (dt * 5.4), 0, 1) : 0;
  m.mix += (moving * (u.onGround !== false ? 1 : 0.24) - m.mix) * ease(moving > m.mix ? 17 : 21, dt);
  if (!teleport && u.onGround !== false) m.phase = (m.phase + step / r.cycle * 2 * Math.PI) % (2 * Math.PI);
  // landing and air
  if (u.onGround !== false && !m.ground) m.land = clamp(0.55 + Math.abs(u.vyLand || 0) * 0.04, 0, 1);
  m.ground = u.onGround !== false; m.land *= Math.exp(-dt * 11);
  const vy = u.vy || 0; m.air += ((m.ground ? 0 : clamp(vy * 0.08, -0.6, 1)) - m.air) * ease(14, dt);
  // turning: how fast the facing changes, smoothed
  if (m.yaw == null) m.yaw = u.yaw || 0;
  let dy = (u.yaw || 0) - m.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.yaw = u.yaw || 0;
  m.turn += ((dt > 0 ? clamp(dy / dt, -6, 6) : 0) - m.turn) * ease(8, dt);
  // aiming: in fast, out slower, so a burst holds the pose
  const age = Math.max(0, t - (u.lastShotT == null ? -99 : u.lastShotT)), shooting = age < 0.25;
  m.aim += ((shooting ? 1 : 0) - m.aim) * ease(shooting ? 34 : 9, dt);
  const s = Math.sin(m.phase) * m.mix, sway = still ? 0 : s;
  const recoil = still ? 0 : Math.exp(-age * 30) * clamp(m.aim + 0.3, 0, 1);
  return {
    sway, phase: m.phase, mix: m.mix, aim: m.aim, hem: r.hem,
    liftL: Math.max(0, sway) * 0.21, liftR: Math.max(0, -sway) * 0.21,
    body: still ? 0 : 0.03 * Math.abs(sway) - 0.05 * m.land,
    roll: still ? 0 : sway * 0.03 + clamp(-m.turn * 0.02, -0.06, 0.06) + (u.dashT > 0 ? 0.045 : 0),
    squash: still ? 0 : m.land, stretch: still ? 0 : m.air, recoil, air: !m.ground, turn: m.turn
  };
}
const api = { create, pose, RIGS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LL.paperMotion = api;
})(typeof window === 'undefined' ? globalThis : window);
