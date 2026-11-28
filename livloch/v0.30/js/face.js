/* LIVLOCH · face (0.28): the first minute. The title's painting, the live valley behind it, and the walk in.

   DESIGN
   - The title opens on the painting (#plate, art/title.jpg). Behind it main.js keeps a bot world (S.newWorld auto) and,
     while this module says so, steps it and draws it through the 0.20 trailer camera (gfx attractCam). After HOLD seconds
     of the painting the valley starts drawing under it, and after LIVE seconds the painting dissolves over FADE seconds.
   - The painting stays when: reduced motion is on (a still title is calmer than any camera move), Lighter graphics is on
     (chosen, or turned on by itself in a match that struggled: the device needs the help, so the menu should not
     spend it on a trailer), or the title is slow:
     if the median of the last 30 frames is slower than SLOW_MS, the painting comes back
     and stays for the session. The frames drawn under the painting before it fades are measured too: if they are slow
     (or fewer than 8 come in 1.2 s), it never fades. LL.faceForce (set by capture tools only) keeps the valley regardless.
   - Walk in: the painting comes back over the valley and the menu fades (VEIL ms, so the build of the match world and
     its first shader compile happen under the painting), then the match starts and the painting dissolves into it while
     the camera settles from a crane above and behind the chosen hero down to the play camera (SETTLE s, gfx calls
     LL.face.cam from its play camera). The music already crossfades title to valley over about 2.5 s (audio.js), which
     spans the same moment. Reduced motion: no crane, a short fade.
   - Presentation only. Nothing here reads or changes a rule; the attract world never reaches the player's match, the
     Cabinet or the wardrobe (main.js only hands its events to the renderer). */
(function () {
'use strict';
const LL = window.LL;
const HOLD = 1.0, LIVE = 2.0, FADE = 2.4, SLOW_MS = 55, WAIT = 9, GIVE_UP = 110, VEIL = 420, SETTLE = 2.6, REVEAL = 1.5;
const F = LL.face = { VEIL: VEIL };
const HUD_AT = 1.3, HUD_IN = 0.8;
let hudT = -1, plate = null, pl = 1, plTo = 1, plRate = 0, t = 0, fading = false, fell = false, drawn = 0, ft = [], settleT = -1, pending = 0;
let T = null, q0 = null, q1 = null, p1 = null, m4 = null, up = null, eye = null, at = null, fov1 = 60;
const reduced = function () { return !!(LL.gfx && LL.gfx.reduced); };
/* The painting's opacity is driven here, frame by frame, rather than by a CSS transition, so it stays in step with the
   valley under it (and with tools that step the clock). setPlate(on, secs): fade in or out over secs (0: at once). */
function setPlate(on, secs) { plTo = on ? 1 : 0; plRate = secs > 0 ? 1 / secs : 0; if (!plRate) pl = plTo; F.tick(0); }
F.tick = function (sec) {
  if (hudT >= 0) { hudT += sec; const k = reduced() ? 1 : Math.max(0, Math.min(1, (hudT - HUD_AT) / HUD_IN)); hudOp(k); if (k >= 1) hudT = -1; }
  if (!plate) plate = document.getElementById('plate'); if (!plate) return;
  if (pl !== plTo) pl = plRate ? (pl < plTo ? Math.min(plTo, pl + sec * plRate) : Math.max(plTo, pl - sec * plRate)) : plTo;
  const o = (pl * pl * (3 - 2 * pl)).toFixed(3); if (plate.style.opacity !== o) { plate.style.opacity = o; plate.style.visibility = pl > 0 ? 'visible' : 'hidden'; }
};
F.wantLive = function () { return !!LL.faceForce || (!reduced() && !(LL.gfx && LL.gfx.low) && !fell); };
/* The title is showing again (boot, or quit from a match): the painting, at once. */
F.title = function () { t = 0; fell = false; /* 0.28.1 face: every visit to the title tries the valley again */ fading = false; drawn = 0; ft.length = 0; settleT = -1; pending = 0; setPlate(true, 0); const ti = document.getElementById('title'); if (ti) ti.classList.remove('leaving'); };
/* Every title frame. raw: this frame's length in ms. Returns true when main.js should step and draw the attract world. */
F.titleFrame = function (dt, raw) {
  /* 0.28.1 face: the valley must come alive on ordinary machines. 0.28 gave up for the session if the first 1.2 s were
     slow, and a tab opened in the background, the first shader compiles or a 5K screen all tripped that, so the title
     stayed a still painting. Now: a hidden tab does not count; the painting waits (up to WAIT s) for any 10 frames whose
     median is under SLOW_MS, then fades; it only gives up if the valley is very slow (median over GIVE_UP ms) once shown,
     and the next visit to the title tries again. */
  if (document.hidden) { ft.length = 0; return false; }
  const sec = Math.min(0.25, raw / 1000 || 0); t += sec; /* wall time: the painting is held for the person looking at it */
  if (!F.wantLive()) { if (fading) { fading = false; setPlate(true, 0.8); } return false; }
  if (t >= HOLD) { drawn++; if (drawn > 6 && raw > 0 && raw < 1000) { ft.push(raw); if (ft.length > 30) ft.shift(); } } /* the first frames compile shaders */
  const med = function () { const s = ft.slice().sort(function (a, b) { return a - b; }); return s[s.length >> 1]; };
  if (!fading && t >= LIVE) {
    if (LL.faceForce || (ft.length >= 10 && med() <= SLOW_MS)) { fading = true; setPlate(false, FADE); }
    else if (t >= WAIT) { fell = true; return false; }
  } else if (fading && !LL.faceForce && ft.length >= 20 && med() > GIVE_UP) { fell = true; fading = false; setPlate(true, 0.8); return false; }
  return t >= HOLD;
};
/* Walk in, part one: the painting comes back over the valley and the menu fades. main.js starts the match VEIL ms later. */
F.leave = function () { setPlate(true, reduced() ? 0.2 : VEIL / 1000); const ti = document.getElementById('title'); if (ti) ti.classList.add('leaving'); };
/* Part two, called by main.js after the match world is built: reveal on the second drawn frame (after the first compile). */
F.enter = function () { pending = 2; settleT = reduced() ? -1 : 0; hudT = -1; hudOp(0); };
F.playFrame = function () { if (pending > 0 && --pending === 0) { setPlate(false, reduced() ? 0.35 : REVEAL); hudT = 0; const ti = document.getElementById('title'); if (ti) ti.classList.remove('leaving'); } };
/* A match started without the walk in (Again, from the end screen): no painting, no crane. */
F.plain = function () { pending = 0; settleT = -1; hudT = -1; hudOp(1); setPlate(false, 0); };
/* The HUD arrives as the camera lands: hidden under the painting, then faded in from HUD_AT s after the reveal. */
function hudOp(o) { const h = document.getElementById('hud'); if (h) h.style.opacity = o >= 1 ? '' : o.toFixed(3); }
/* From gfx's play camera, after it has placed the camera behind the hero: blend from a crane above and behind. */
F.cam = function (camera, hero, dt) {
  if (settleT < 0 || !hero) return;
  if (!T) { T = window.THREE; q0 = new T.Quaternion(); q1 = new T.Quaternion(); p1 = new T.Vector3(); m4 = new T.Matrix4(); up = new T.Vector3(0, 1, 0); eye = new T.Vector3(); at = new T.Vector3(); }
  if (pending > 0) dt = 0; settleT += dt;
  const u = Math.min(1, settleT / SETTLE), e = u * u * u * (u * (u * 6 - 15) + 10);
  if (u >= 1) { settleT = -1; return; }
  p1.copy(camera.position); q1.copy(camera.quaternion); fov1 = camera.fov;
  /* in polar terms round the hero: from a crane (higher, further, swung a little to one side) to where the play camera is */
  const dx = p1.x - hero.x, dz = p1.z - hero.z, r1 = Math.hypot(dx, dz) || 0.01, a1 = Math.atan2(dx, dz), h1 = p1.y - hero.y;
  const a = a1 + 0.75 * (1 - e), r = 24 + (r1 - 24) * e, h = 15 + (h1 - 15) * e;
  eye.set(hero.x + Math.sin(a) * r, hero.y + h, hero.z + Math.cos(a) * r);
  at.set(hero.x - Math.sin(a) * 8, hero.y + 1.4, hero.z - Math.cos(a) * 8);
  m4.lookAt(eye, at, up); q0.setFromRotationMatrix(m4);
  camera.position.copy(eye); camera.quaternion.copy(q0).slerp(q1, Math.pow(e, 1.4)); camera.fov = fov1 + (50 - fov1) * (1 - e);
};
F.state = function () { return { t: +t.toFixed(2), fading: fading, fell: fell, live: F.wantLive(), median: ft.length ? ft.slice().sort(function (a, b) { return a - b; })[ft.length >> 1] : null, settle: settleT }; };
})();
