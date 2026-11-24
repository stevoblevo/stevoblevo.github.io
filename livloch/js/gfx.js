/* LIVLOCH · gfx: WebGL scene over the sim. Three.js r128.

   DESIGN
   - Read-only view of sim state. It may draw anything the model knows; it may never decide anything.
   - Art target is the concept plate (art/title.jpg): folded paper lit by lanterns on a snow night. Everything is
     flat-shaded primitives on purpose; "paper" is the excuse for low-poly.
   - Looks: every object is built once in the Lantern colours, then each look's `map` re-colours it by hue bucket. Big
     surfaces (sky, ground, light, fog) take the look's colours directly. Things whose colour is their meaning are
     exempt (own / hm / FIXED): heroes, the Ness, fruit, creases, cue colours.
   - Crowds are InstancedMesh (troopers, hush, bars, projectiles, orbs, cue dashes). Three r128 sizes instanceColor
     from .count at first use, so initColor() allocates it at capacity. Skipping that made bullets invisible for six versions.
   - Semiotics, kept across looks: warm = Reign and protected light, cold = Hush, gold = creases and souls, jade = the Ness.
     In Inkblot Noir: violet = unknown threat, amber = protected light, copper = a connection you can still recover.
   - Bloom is a hand-rolled bright-pass and blur, off for the light look and for "Lighter graphics". */
(function () {
'use strict';
const LL = window.LL, C = LL.C, S = LL.sim, U = LL.U;
const R = LL.gfx = { ok: false, low: false };
const SH = LL.shots || null; // 0.26 shots: js/shots.js, a look per gun (null: the old white tracer for every shot)
const SCN = LL.scenery || null; // js/scenery.js: trees, the loch, pools of light, plants, moon, mist, fireflies, petals (null: the old cone trees and flat loch)
let T, renderer, scene, camera, W = null, glowTex, time = 0;
let dummy, tmpC, v1, v2, v3;
let world, dyn, sky, stars;
let tr = [null, null], hushEyes, trHat, barBg, barFill, projMesh, orbMesh, parts, staticGlow;
let nessM = null, nessY = -11, creaseM = [], cueDash = null, cueRings = [], fruitM = [], groundTex = null, petM = null, petThread = null, fovKick = 0, pivotY = null, camBtS = 1;
R.petEnabled = false;
R.reduced = false; try { R.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
let heroM = [], structM = [], strayM = [], knotPool = [], fawnPool = [], zonePool = [], rings = [];
let shake = 0, camPos = { x: 0, y: 30, z: -60 }, camDir = { x: 0, y: 0, z: 1 }, camDist = 5.4;
const PN_MAX = 1400; let PN = PN_MAX, pPos, pCol, pVel, pLife, pMax, pBase, pCur = 0;
let mats = {};
const SRC_TEAM = [0xff6a4d, 0x5fe6b6];
const HS = { h: 0, s: 0, l: 0 };
/* Looks. Each one is drawn from a Saelion style kit. Big surfaces (sky, ground, light) take the kit's colours directly;
   everything else is built in the Lantern colours and passed through the look's map. */
const LOOKS = R.LOOKS = {
  snow: { name: 'Cobalt Snow', kit: 'your concept plate, on the Cobalt Snow valley', add: true, wire: false, snowcaps: true, weather: 'snow', bloom: 0.5,
    clear: 0x1b1840, fog: [0x4a3f86, 55, 300], sky: [0x15123a, 0x3a2f78, 0xd07aa8], sun: [0xffe0b0, 0xfff6e0], star: 1,
    hemi: [0xb8b4ff, 0x3a2f5a, 0.8], dir: [0xffd0e0, 0.45], ground: { a: 0x545890, b: 0x6e6cac, lane: 0x3d355e, laneC: 0x54477a, rock: 0x3a3668, water: 0x18a595 },
    crease: [0xffb347, 0x9fd8ff, 0.45], team: [0xff9a3c, 0x9fb4ff], css: ['#ffab4a', '#a9b8ff'], hush: 0x161230, ui: { line: 'rgba(240,220,255,0.2)', me: '#fff6ea', edge: '#1b1840' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (s < 0.12) { h = 0.68; s = 0.22; l = Math.min(1, l * 1.05); }
      else if ((h < 0.06 || h > 0.93) && s < 0.62) { h = 0.93; s = 0.85; l = Math.max(0.62, l + 0.2); }
      else if (h < 0.11 || h > 0.93) { h = 0.075; }
      else if (h < 0.2) { /* gold stays */ }
      else if (h > 0.38 && h < 0.6) { if (l < 0.42) { h = 0.005; s = 0.62; l = l * 1.25; } else { h = 0.63; s = 0.9; l = Math.max(0.72, l); } }
      else if (h >= 0.6 && h < 0.72) { h = 0.66; }
      else { s *= 0.9; }
      c.setHSL(h, Math.min(1, s), l); } },
  /* Gen XV. Presentation only: violet = unknown threat, amber = protected light, copper = recoverable connection. */
  ink: { name: 'Inkblot Noir', kit: 'Gen XV, Skeptic Noir', add: true, wire: false, weather: 'rain', bloom: 0.35, cues: true,
    clear: 0x0b0a14, fog: [0x14122a, 45, 240], sky: [0x05050c, 0x14122a, 0x3a2f6a], sun: [0xd8d0ff, 0xffffff], star: 0.4,
    hemi: [0xc8c4e8, 0x1a1830, 0.9], dir: [0xe8e0ff, 0.5], ground: { a: 0x15142a, b: 0x1e1b38, lane: 0x2a2648, laneC: 0x3a3560, rock: 0x0b0a14, water: 0x0c3a44 },
    crease: [0xc8703a, 0x8fb4ff, 0.55], team: [0xffb347, 0x9a7cff], css: ['#ffb347', '#a78bff'], hush: 0x1a1430, hushEm: 0x9a7cff, hushEmI: 0.6, ui: { line: 'rgba(235,230,218,0.2)', me: '#ebe6da', edge: '#0b0a14' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (s < 0.2) { if (l > 0.5) { h = 0.11; s = 0.2; l = Math.min(0.9, l); } else { h = 0.68; s = 0.25; l = l * 0.6; } }
      else if (h < 0.2 || h > 0.93) { h = 0.095; s = Math.min(1, s * 1.05); }
      else if (h > 0.38 && h < 0.6) { if (l < 0.42) { h = 0.66; s = 0.3; l = l * 0.55; } else { h = 0.5; s = 0.9; l = Math.max(0.62, l); } }
      else if (h >= 0.6 && h < 0.9) { h = 0.72; s = Math.min(1, s * 1.1); }
      c.setHSL(h, s, l); } },
  lantern: { name: 'Lantern Night', kit: 'Reignfawn, Gold Lantern valley', add: true, wire: false, map: null, bloom: 0.45,
    clear: 0x140f1c, fog: [0x2a1d38, 60, 290], sky: [0x0c0916, 0x2b1c40, 0x7a3344], sun: [0xffd9a0, 0xfff4dc], star: 0.8,
    hemi: [0xa99ad6, 0x2a1c2c, 0.95], dir: [0xffdcb8, 0.75], ground: { a: 0x1c3037, b: 0x2c2440, lane: 0x77605c, laneC: 0x93786a, rock: 0x3a2f47, water: 0x17505e },
    crease: [0xff8a5c, 0x8fb4ff, 0.32], team: [0xff6a4d, 0x5fe6b6], css: ['#ff7a5c', '#6fe8c0'], ui: { line: 'rgba(244,232,214,0.16)', me: '#fff6ea', edge: '#140f1c' } },
  knight: { name: 'Knight Night', kit: 'Storeybrook, cobalt paper theatre', add: true, wire: false, bloom: 0.4,
    clear: 0x1c2838, fog: [0x263a57, 55, 270], sky: [0x0e1726, 0x1c2838, 0x3d6a8c], sun: [0xf0c75e, 0xfff2c8], star: 1,
    hemi: [0x9fc0ee, 0x1a2434, 1.0], dir: [0xf4efe6, 0.7], ground: { a: 0x2f4a6e, b: 0x2c4a3d, lane: 0x9c9482, laneC: 0xd9d2c2, rock: 0x1c2838, water: 0x3d6a8c },
    crease: [0xf0c75e, 0x8fb4e8, 0.4], team: [0xf0c75e, 0x8fb4e8], css: ['#f0c75e', '#8fb4e8'], ui: { line: 'rgba(244,239,230,0.18)', me: '#f4efe6', edge: '#1c2838' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (s < 0.12) { h = 0.6; s = 0.16; }
      else if (h < 0.2 || h > 0.93) { h = 0.125; }
      else if (h < 0.72) { h = 0.6; s *= 0.8; }
      else if (l > 0.55) { h = 0.94; s *= 0.7; }
      else { h = 0.61; s *= 0.75; }
      c.setHSL(h, Math.min(1, s), l); } },
  origami: { name: 'Origami', kit: 'Storeybrook Origami with Foldlight fold', add: false, wire: false, emis: 0.3,
    clear: 0xe3eadc, fog: [0xe3eadc, 70, 310], sky: [0xb9c8de, 0xdfe6e8, 0xf6f8f3], sun: [0xf0cf78, 0xffffff], star: 0,
    hemi: [0xffffff, 0x7f8eaa, 0.62], dir: [0xfff3d8, 0.62], ground: { a: 0xcfd9c8, b: 0xb9d3a2, lane: 0xe9ede2, laneC: 0xf6f8f3, rock: 0x8d9bb4, water: 0x8cc2e6 },
    crease: [0x9e2a1f, 0x2f4090, 0.95], team: [0xb8311a, 0x2a4c86], css: ['#b8311a', '#2a4c86'], ui: { line: 'rgba(36,47,59,0.22)', me: '#242f3b', edge: '#ffffff' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if ((h < 0.11 || h > 0.93) && s > 0.4) { h = 0.024; s = 0.75; l = U.clamp(l * 0.72, 0.3, 0.48); }
      else if (h >= 0.11 && h < 0.2 && s > 0.4) { h = 0.115; s = 0.82; l = U.clamp(l * 0.7, 0.42, 0.56); }
      else if (h > 0.38 && h < 0.58 && s > 0.45 && l > 0.4) { h = 0.605; s = 0.55; l = 0.36; }
      else if (h > 0.68 && l > 0.55) { h = 0.27; s = 0.45; l = 0.34; }
      else { h = 0.6; s = 0.14; l = 0.95 - l * 0.78; }
      c.setHSL(h, s, l); } },
  glow: { name: 'Hypermetapunk', kit: 'Foldlight glow, neon over a pitch floor', add: true, wire: true, grid: true, bloom: 0.7,
    clear: 0x0b060c, fog: [0x0b060c, 45, 230], sky: [0x060308, 0x1a0e1d, 0x4a3150], sun: [0xffd64a, 0xffffff], star: 0.5,
    hemi: [0xffffff, 0x3a2347, 1.3], dir: [0xffffff, 0.4], ground: { a: 0x120a14, b: 0x1a0e1d, lane: 0x2a1730, laneC: 0x3b2347, rock: 0x0b060c, water: 0x10202a },
    crease: [0xff7ab8, 0x62e6ff, 0.75], team: [0xff4faa, 0x62e6ff], css: ['#ff4faa', '#62e6ff'], ui: { line: 'rgba(243,230,218,0.2)', me: '#ffd64a', edge: '#0b060c' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (s < 0.15 && l > 0.6) { /* paper stays */ }
      else if ((h < 0.11 || h > 0.9) && s > 0.35) { h = 0.925; s = 1; l = Math.max(0.6, l); }
      else if (h < 0.2 && s > 0.35) { h = 0.13; s = 1; l = Math.max(0.6, l); }
      else if (h > 0.38 && h < 0.6 && s > 0.35) { h = 0.525; s = 1; l = Math.max(0.6, l); }
      else if (h > 0.68 && l > 0.5) { h = 0.73; s = 1; l = 0.74; }
      else { h = 0.83; s = 0.4; l = 0.3 + l * 0.5; }
      c.setHSL(h, s, l); } },
  /* Rainwake: the red rain worn on purpose. In the model, souls are worth half again while the rain is red. */
  rain: { name: 'Rainwake', kit: 'mode 12 on the plates, the red rain worn on purpose', add: true, wire: false, weather: 'rain', bloom: 0.45,
    clear: 0x1a0a10, fog: [0x4a1420, 50, 260], sky: [0x12060a, 0x3a0f1a, 0x8a2a2a], sun: [0xff8a70, 0xffd0c0], star: 0.2,
    hemi: [0xd09090, 0x2a1014, 0.9], dir: [0xffb0a0, 0.6], ground: { a: 0x3a1c24, b: 0x4a2228, lane: 0x24121a, laneC: 0x3a1a22, rock: 0x2a141c, water: 0x145a5a },
    crease: [0xffb347, 0x7fe0d0, 0.4], team: [0xffc070, 0x6fe0d0], css: ['#ffc070', '#6fe0d0'], ui: { line: 'rgba(255,220,210,0.18)', me: '#fff0e6', edge: '#1a0a10' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (s < 0.12) { h = 0.98; s = 0.18; }
      else if (h < 0.2 || h > 0.9) { /* warm stays warm */ }
      else if (h < 0.62) { h = 0.48; s *= 0.8; }
      else { h = 0.96; s *= 0.6; l *= 0.9; }
      c.setHSL(h, Math.min(1, s), l); } },
  /* Memory: echo overlays. Small ones and hollows leave ten seconds of trail. In the model, light holds longer and souls are worth half. */
  memory: { name: 'Memory', kit: 'mode 13 on the plates, echo overlays', add: true, wire: false, bloom: 0.3, echo: true,
    clear: 0x2a2520, fog: [0x6a5f50, 45, 240], sky: [0x2a2520, 0x5a4f40, 0xb09a78], sun: [0xf0e0c0, 0xfff8e8], star: 0,
    hemi: [0xe0d4bc, 0x3a3228, 0.95], dir: [0xfff0d8, 0.5], ground: { a: 0x5a5044, b: 0x6a5e4e, lane: 0x3e362c, laneC: 0x52483a, rock: 0x4a4036, water: 0x4a5a58 },
    crease: [0xd9a860, 0x9ab0b8, 0.35], team: [0xe8b060, 0x8aa8c0], css: ['#e8b060', '#8aa8c0'], ui: { line: 'rgba(240,228,204,0.2)', me: '#fff8e8', edge: '#2a2520' },
    map: function (c) { c.getHSL(HS); let h = HS.h, s = HS.s, l = HS.l;
      if (h < 0.2 || h > 0.9) { h = 0.09; s *= 0.5; } else { h = 0.58; s *= 0.28; }
      c.setHSL(h, Math.min(1, s), l); } }
};
LOOKS.snow.post = 0; LOOKS.ink.post = 1; LOOKS.origami.post = 2; LOOKS.knight.post = 3; LOOKS.glow.post = 4; LOOKS.lantern.post = 5; LOOKS.memory.post = 6; LOOKS.rain.post = 7;
const trails = new WeakMap(); let trailT = 0;
let LK = LOOKS.snow; R.look = LK;
let tcCache = {};
function mapC(c) { const hex = c.getHex(); if (hex === SRC_TEAM[0]) c.setHex(LK.team[0]); else if (hex === SRC_TEAM[1]) c.setHex(LK.team[1]); else if (LK.map) LK.map(c); return c; }
const FIXED = { 0xffe14d: 1, 0xe0452c: 1, 0x7ad03a: 1, 0x8fdc50: 1, 0xf0624a: 1 }; // fruit colours read the same in every look
function tc(hex) { let c = tcCache[hex]; if (!c) c = tcCache[hex] = FIXED[hex] ? new T.Color(hex) : mapC(new T.Color(hex)); return c; }
function own2(m) { m.userData.lk = true; return m; }
function own(o) { if (o.material) { o.material.userData.lk = true; o.material.userData.solid = true; } if (o.geometry) o.geometry.userData.lk = true; return o; }
function applyLook() {
  scene.traverse(function (o) {
    const m = o.material; if (!m || !m.userData) return;
    if (!m.userData.bl) {
      m.userData.bl = true;
      if (!LK.add && m.blending === T.AdditiveBlending) { m.blending = T.NormalBlending; m.transparent = true; m.opacity = m.opacity * 0.85; }
      if (LK.wire && m.isMeshLambertMaterial && !m.userData.solid) m.wireframe = true;
      if (LK.emis != null && m.emissiveIntensity) m.emissiveIntensity *= LK.emis;
      m.needsUpdate = true;
    }
    if (!m.userData.lk) {
      m.userData.lk = true;
      if (m.color && !m.vertexColors && m.color.getHex() !== 0xffffff) mapC(m.color);
      if (m.emissive && m.emissive.getHex() !== 0) mapC(m.emissive);
    }
    if (o.userData.rt) return;
    const g = o.geometry, ca = g && g.attributes ? g.attributes.color : null;
    if (ca && !g.userData.lk) { g.userData.lk = true; for (let i = 0; i < ca.count; i++) { tmpC.setRGB(ca.getX(i), ca.getY(i), ca.getZ(i)); mapC(tmpC); ca.setXYZ(i, tmpC.r, tmpC.g, tmpC.b); } ca.needsUpdate = true; }
    if (o.isInstancedMesh && o.instanceColor && !o.userData.ilk) { o.userData.ilk = true; const ic = o.instanceColor; for (let i = 0; i < ic.count; i++) { tmpC.setRGB(ic.getX(i), ic.getY(i), ic.getZ(i)); mapC(tmpC); ic.setXYZ(i, tmpC.r, tmpC.g, tmpC.b); } ic.needsUpdate = true; }
  });
}
function construct() {
  if (scene) scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
  mats = {}; tcCache = {}; fruitM = []; cueDash = null; cueRings = []; creaseM = []; heroM = []; echoM = null; petM = null; petThread = null; pivotY = null; camBtS = 1; structM = []; strayM = []; knotPool = []; fawnPool = []; zonePool = []; rings = []; nessM = null; R.decor = false;
  renderer.setClearColor(LK.clear);
  scene = new T.Scene(); scene.fog = new T.Fog(LK.fog[0], LK.fog[1], LK.fog[2]);
  scene.add(new T.HemisphereLight(LK.hemi[0], LK.hemi[1], LK.hemi[2]));
  const moon = new T.DirectionalLight(LK.dir[0], LK.dir[1]); moon.position.set(-40, 80, 60); scene.add(moon);
  world = new T.Group(); scene.add(world); dyn = new T.Group(); scene.add(dyn);
  if (SCN) SCN.begin(scx()); // scenery: this look's palette, before the ground is tinted
  buildSky(); buildGround(); buildThreads(); buildInstanced(); buildParticles(); buildPuffs(); buildFeel(); buildPools(); buildCreaseArt();
  if (SCN) SCN.build(scx()); // scenery: the loch, moon, mist and stars (the trees wait for the world, in R.build)
  applyLook();
}
function scx() { let id = 'snow'; for (const k in LOOKS) if (LOOKS[k] === LK) id = k; return { T: T, scene: scene, world: world, sky: sky, renderer: renderer, LK: LK, id: id, R: R, groundH: groundH, ground: groundM }; }
function nsx() { return { T: T, world: world, dyn: dyn, LK: LK, R: R, renderer: renderer, glowTex: glowTex, emit: emit, ring: ring, puff: puff, near: dist2cam, shake: function (v) { if (v > shake) shake = v; } }; } // 0.26 ness: what js/ness.js is handed
R.setLook = function (id) {
  if (!LOOKS[id] || !R.ok) return;
  LK = LOOKS[id]; R.look = LK; C.TEAM_CSS = LK.css;
  construct(); if (W) R.build(W);
};

function mat(col, em) {
  const k = col + '_' + (em || 0);
  if (!mats[k]) mats[k] = new T.MeshLambertMaterial({ color: col, emissive: em ? col : 0x000000, emissiveIntensity: em || 0 });
  return mats[k];
}
function flat(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }
function mesh(g, m, x, y, z, parent) { const o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(o); return o; }
function box(w, h, d) { return flat(new T.BoxGeometry(w, h, d)); }
function cyl(rt, rb, h, seg) { return flat(new T.CylinderGeometry(rt, rb, h, seg || 6)); }
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return U.lerp(U.lerp(h(xi, zi), h(xi + 1, zi), u), U.lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
function makeGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
/* A soft contact shadow: black in the middle, gone at the edge. Painted cutouts float without one. */
function makeShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
let shadowTex = null, shadowI = null, shadowN = 0;
function shadowMat(op) { const m = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: op, color: 0x0b0814, polygonOffset: true, polygonOffsetFactor: -2 }); m.userData.lk = true; m.userData.solid = true; return m; }
function shadowBlob(r) { const m = new T.Mesh(new T.PlaneGeometry(2 * r, 2 * r), shadowMat(0.5)); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; return m; }
function shadowPut(x, z, r, k) { if (!shadowI || shadowN >= shadowI.userData.cap) return; dummy.position.set(x, 0.035, z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(r * (k || 1), r * (k || 1) * 0.7, 1); dummy.updateMatrix(); shadowI.setMatrixAt(shadowN++, dummy.matrix); }
function glowSprite(col, size, parent, x, y, z) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, 1); s.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(s); return s;
}

/* ---------- init ---------- */
R.init = function (canvas) {
  T = window.THREE; if (!T) return false;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return false; }
  camera = new T.PerspectiveCamera(64, 1, 0.15, 1400);
  dummy = new T.Object3D(); dummy.rotation.order = 'YXZ'; /* tilt and roll in the unit's own frame, after its facing */ tmpC = new T.Color(); v1 = new T.Vector3(); v2 = new T.Vector3(); v3 = new T.Vector3();
  glowTex = makeGlow(); shadowTex = makeShadow();
  R.ok = true; construct();
  R.resize(); return true;
};
R.setQuality = function (low) {
  R.low = low; PN = low ? 500 : PN_MAX;
  if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2)); R.resize(); }
};
R.resize = function () {
  if (!renderer) return;
  const c = renderer.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; R.w = w; R.h = h; R.portrait = h > w;
  camera.updateProjectionMatrix(); sizeBloom();
};
function buildSky() {
  const g = new T.SphereGeometry(1000, 24, 14), p = g.attributes.position, cols = new Float32Array(p.count * 3);
  const a = new T.Color(LK.sky[0]), b = new T.Color(LK.sky[1]), h = new T.Color(LK.sky[2]), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 1000;
    if (y > 0.25) c.copy(b).lerp(a, Math.min(1, (y - 0.25) / 0.6)); else c.copy(h).lerp(b, U.clamp((y + 0.05) / 0.3, 0, 1));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  sky = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  own(sky); scene.add(sky);
  if (LK !== LOOKS.origami) flatLoad('backdrop', function (t) { // the far ridge: one wide painting wrapped round the valley, mirrored so the seam never shows
    t.wrapS = T.MirroredRepeatWrapping; t.repeat.x = 4; t.needsUpdate = true; // four mirrored copies round the valley keep the mountains near their painted proportions
    // opaque and depth-writing, so the sky dome behind it cannot paint over it. Tinted toward each view's horizon, because the painting is a blue night
    const mt = new T.MeshBasicMaterial({ map: t, side: T.BackSide, fog: false }); mt.userData.lk = true; mt.userData.solid = true; mt.userData.bl = true;
    if (LK !== LOOKS.snow) mt.color.set(0xffffff).lerp(new T.Color(LK.sky[2]), 0.55).multiplyScalar(1.15);
    // proportions from the Ford study: the painted peaks sit just above the lowered valley walls
    const c = new T.Mesh(new T.CylinderGeometry(500, 500, 370, 56, 1, true), mt); c.position.y = 98; c.rotation.y = Math.PI / 2.5; c.scale.x = -1; scene.add(c);
  });
  const n = 420, sp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(0.08 + Math.random() * 0.92);
    sp[i * 3] = Math.sin(ph) * Math.cos(th) * 940; sp[i * 3 + 1] = Math.cos(ph) * 940; sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 940;
  }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  stars = new T.Points(sg, new T.PointsMaterial({ color: 0xf4e8d6, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: LK.star, depthWrite: false }));
  own(stars); stars.visible = LK.star > 0; sky.add(stars);
  if (LK.star > 0 && !LK.wire) {
    const mk = function (w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); draw(g); return new T.CanvasTexture(c); };
    const moons = mk(1024, 160, function (g) {
      for (let i = 0; i < 7; i++) { const x = 90 + i * 140, r = i === 3 ? 46 : 30, ph = 1 - Math.abs(i - 3) / 3.4;
        g.fillStyle = '#f2dcae'; g.beginPath(); g.arc(x, 80, r, 0, 6.3); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(x + (i < 3 ? 1 : -1) * r * 2 * ph, 80, r * 1.02, 0, 6.3); if (i !== 3) g.fill(); }
    });
    const stag = mk(512, 512, function (g) {
      const L = [[.30,.55,.62,.52],[.62,.52,.68,.62],[.68,.62,.66,.90],[.68,.62,.36,.66],[.36,.66,.34,.92],[.36,.66,.30,.55],[.30,.55,.22,.34],[.22,.34,.12,.38],[.22,.34,.20,.14],[.20,.14,.12,.06],[.20,.14,.28,.04],[.22,.34,.32,.18],[.32,.18,.40,.10],[.32,.18,.30,.06],[.62,.52,.70,.48],[.60,.64,.58,.90],[.40,.66,.42,.90]];
      g.strokeStyle = 'rgba(200,190,255,0.5)'; g.lineWidth = 2; g.beginPath(); L.forEach(function (q) { g.moveTo(q[0] * 512, q[1] * 512); g.lineTo(q[2] * 512, q[3] * 512); }); g.stroke();
      L.forEach(function (q) { [[q[0], q[1]], [q[2], q[3]]].forEach(function (p) { const gr = g.createRadialGradient(p[0] * 512, p[1] * 512, 0, p[0] * 512, p[1] * 512, 9); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(180,170,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p[0] * 512, p[1] * 512, 9, 0, 6.3); g.fill(); }); });
    });
    const plane = function (tex, w, h, x, y, z) { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, fog: false, depthWrite: false })); m.material.userData.lk = true; m.material.userData.bl = true; m.position.set(x, y, z); m.lookAt(0, 0, 0); sky.add(m); };
    plane(moons, 420, 66, 0, 470, 800); plane(stag, 300, 300, 380, 400, 780);
  }
  const sun = glowSprite(LK.sun[0], 260, sky, 0, 210, 900); sun.material.fog = false; sun.material.userData.lk = true;
  const core = glowSprite(LK.sun[1], 90, sky, 0, 210, 895); core.material.fog = false; core.material.userData.lk = true;
}
let wallK = 1, groundM = null;
/* Height of the valley floor: flat in the field, rising to the walls outside it. Scenery stands trees on it. */
function groundH(x, z) {
  const ox = Math.max(0, Math.abs(x) - C.HALF_X), oz = Math.max(0, Math.abs(z) - C.HALF_Z), out = Math.hypot(ox, oz); if (out <= 0) return 0;
  return (Math.pow(out, 1.3) * 0.5 * (0.55 + noise(x * 0.06, z * 0.06) * 1.1) + noise(x * 0.31 + 9, z * 0.31) * 1.5) * wallK;
}
function buildGround() {
  const sx = 2 * C.HALF_X + 190, sz = 2 * C.HALF_Z + 190;
  let g = new T.PlaneGeometry(sx, sz, 100, 150); g.rotateX(-Math.PI / 2);
  wallK = FLATS.backdrop && !R.noPaper && LK !== LOOKS.origami ? 0.24 : 1; // with a painted backdrop the valley walls drop to foothills so the painting shows (Origami is daylight: no night ridge)
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), q = { s: 0, d: 0 };
  const G = LK.ground, jungA = new T.Color(G.a), jungB = new T.Color(G.b), lane = new T.Color(G.lane), laneC = new T.Color(G.laneC);
  const ember = new T.Color(LK.team[0]), mint = new T.Color(LK.team[1]), rock = new T.Color(G.rock), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let d = 1e9; for (let l = 0; l < 3; l++) { LL.laneNearest(l, x, z, q); if (q.d < d) d = q.d; }
    const ox = Math.max(0, Math.abs(x) - C.HALF_X), oz = Math.max(0, Math.abs(z) - C.HALF_Z), out = Math.hypot(ox, oz);
    const n = noise(x * 0.06, z * 0.06), n2 = noise(x * 0.31 + 9, z * 0.31);
    p.setY(i, groundH(x, z));
    c.copy(jungA).lerp(jungB, n);
    const base = Math.min(Math.hypot(x, z + C.SPAWN_Z), Math.hypot(x, z - C.SPAWN_Z));
    const lt = Math.max(U.clamp((9.5 - d) / 4.5, 0, 1), U.clamp((30 - base) / 8, 0, 1));
    if (lt > 0) { c.lerp(lane, lt); c.lerp(laneC, lt * U.clamp((4 - d) / 4, 0, 1) * 0.7); }
    c.lerp(z < 0 ? ember : mint, 0.05 + 0.1 * U.clamp((Math.abs(z) - 70) / 60, 0, 1));
    if (out > 0) c.lerp(rock, U.clamp(out / 14, 0, 1));
    const ld = Math.hypot(x - C.LOCH.x, z - C.LOCH.z); if (ld < 14) c.lerp(rock, U.clamp((14 - ld) / 4, 0, 1) * 0.75);
    if (SCN) SCN.groundTint(c, x, z, d, lt, out, n); // scenery: darker, cooler floor away from the threads
    const j = 0.9 + n2 * 0.22;
    cols[i * 3] = c.r * j; cols[i * 3 + 1] = c.g * j; cols[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  g = g.toNonIndexed(); g.computeVertexNormals();
  // a painted grain multiplied over the vertex colours (0.8 to 1.0), so the snow is not one flat sheet; from the Ford study's snow texture
  const gm = new T.MeshLambertMaterial({ vertexColors: true });
  if (!R.noPaper && LK !== LOOKS.origami) { if (!groundTex) { groundTex = new T.TextureLoader().load('art/ground-detail.webp'); groundTex.wrapS = groundTex.wrapT = T.MirroredRepeatWrapping; groundTex.repeat.set(26, 36); } gm.map = groundTex; }
  world.add(groundM = own(new T.Mesh(g, gm)));
  if (LK.grid) { const gh = new T.GridHelper(360, 90, LK.team[0], 0x4a3150); gh.position.y = 0.05; gh.material.transparent = true; gh.material.opacity = 0.5; world.add(own(gh)); }
  // fountains
  for (let t = 0; t < 2; t++) {
    const ring = new T.Mesh(new T.RingGeometry(C.FOUNT_R - 0.5, C.FOUNT_R, 48), new T.MeshBasicMaterial({ color: SRC_TEAM[t], transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.06, (t ? 1 : -1) * C.SPAWN_Z); world.add(ring);
  }
  // the loch (scenery draws its own shader water)
  if (!SCN) {
  const water = new T.Mesh(new T.CircleGeometry(C.LOCH.r, 44), new T.MeshBasicMaterial({ color: LK.ground.water, transparent: true, opacity: 0.88, depthWrite: false }));
  own(water); water.rotation.x = -Math.PI / 2; water.position.set(C.LOCH.x, 0.07, C.LOCH.z); world.add(water);
  const shore = new T.Mesh(new T.RingGeometry(C.LOCH.r - 0.35, C.LOCH.r + 0.25, 48), new T.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(C.LOCH.x, 0.08, C.LOCH.z); world.add(shore);
  }
  // camp rings
  C.CAMPS.forEach(function (cp) {
    const ring = new T.Mesh(new T.RingGeometry(4.6, 5, 32), new T.MeshBasicMaterial({ color: 0xc9a0ff, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(cp[0], 0.05, cp[1]); world.add(ring);
  });
}
function buildThreads() {
  // the thread lies on the ground: a lit path you walk, and ride
  const gl = [], gc = [], P = { x: 0, z: 0, dx: 0, dz: 0 };
  for (let l = 0; l < 3; l++) {
    const L = LL.lanes[l], pts = [];
    for (let s = 0; s <= L.len; s += 3) { LL.lanePoint(l, s, P); pts.push(new T.Vector3(P.x + Math.sin(s * 0.11 + l * 2) * 1.1, 0.13, P.z)); }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), Math.floor(L.len / 1.5), 0.15, 5, false);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), a = new T.Color(0xff8a5c), m = new T.Color(0xffe2a0), b = new T.Color(0x6fe8c0), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const t = U.clamp((p.getZ(i) + 104) / 208, 0, 1);
      if (t < 0.5) c.copy(a).lerp(m, t * 2); else c.copy(m).lerp(b, (t - 0.5) * 2);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    world.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, fog: false })));
    for (let s = 0; s <= L.len; s += 2.6) {
      LL.lanePoint(l, s, P); const t = s / L.len; tmpC.setHex(t < 0.5 ? 0xffb070 : 0x8ff5d4).multiplyScalar(0.42);
      gl.push(P.x + Math.sin(s * 0.11 + l * 2) * 1.1, 0.3, P.z); gc.push(tmpC.r, tmpC.g, tmpC.b);
    }
    for (let s = 10; s < L.len; s += 20) {
      LL.lanePoint(l, s, P); const side = (Math.round(s / 20) % 2) ? 1 : -1;
      const t = s / L.len; tmpC.setHex(t < 0.5 ? 0xffb070 : 0x8ff5d4).multiplyScalar(0.9);
      gl.push(P.x - P.dz * 7.2 * side, 0.9, P.z + P.dx * 7.2 * side); gc.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(gl, 3)); g.setAttribute('color', new T.Float32BufferAttribute(gc, 3));
  staticGlow = new T.Points(g, new T.PointsMaterial({ map: glowTex, size: 2.4, vertexColors: true, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
  world.add(staticGlow);
}
/* r128 sizes instanceColor from .count at first setColorAt, so allocate it at full capacity up front. */
function initColor(m, cap) { const a = new Float32Array(cap * 3).fill(1); m.instanceColor = new T.BufferAttribute(a, 3); }
function buildInstanced() {
  shadowI = new T.InstancedMesh(new T.PlaneGeometry(1, 1), shadowMat(0.42), 320); shadowI.userData.cap = 320; shadowI.frustumCulled = false; shadowI.count = 0; shadowI.renderOrder = 1; dyn.add(shadowI);
  bd = { trooper: new Boards('trooper', 90), hush: new Boards('hush', 110), hollow: new Boards('hollow', 40), thief: new Boards('thief', 40), pines: new Boards('pines', 400), rocks: new Boards('rocks', 400) };
  /* 0.20 props (js/props.js): Reign lantern bearers (body with hat; trHat now holds the lit lantern core), Hush tissue
     wraiths with lilac eyes. Hollows and the lantern glow points are built and driven inside props. */
  { const PG = LL.props.troopers(T, LK, dyn, glowTex, tc, own); tr[0] = PG.reign; trHat = PG.lantern; tr[1] = PG.hush; hushEyes = PG.eyes; }
  dyn.add(hushEyes); dyn.add(tr[0]); dyn.add(tr[1]); dyn.add(trHat);
  const pg = new T.PlaneGeometry(1, 1);
  barBg = new T.InstancedMesh(pg, new T.MeshBasicMaterial({ color: 0x120c18, transparent: true, opacity: 0.75, depthWrite: false, fog: false }), 170);
  barFill = new T.InstancedMesh(pg, new T.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, fog: false, transparent: true }), 170);
  barBg.userData.rt = barFill.userData.rt = true; barBg.frustumCulled = barFill.frustumCulled = false; barBg.renderOrder = 8; barFill.renderOrder = 9; initColor(barFill, 170); barBg.count = barFill.count = 0;
  dyn.add(barBg); dyn.add(barFill);
  projMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }), 340);
  projMesh.userData.rt = true; projMesh.frustumCulled = false; initColor(projMesh, 340); projMesh.count = 0; dyn.add(projMesh);
  orbMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false, fog: false }), 90);
  orbMesh.userData.rt = true; orbMesh.frustumCulled = false; initColor(orbMesh, 90); orbMesh.count = 0; dyn.add(orbMesh);
  if (SH) SH.build({ T: T, dyn: dyn, tc: tc, initColor: initColor, glowTex: glowTex, emit: emit, puff: puff, camera: function () { return camera; }, low: function () { return R.low; }, reduced: function () { return R.reduced; }, dist: dist2cam }); // 0.26 shots
}
function buildParticles() {
  pPos = new Float32Array(PN_MAX * 3); pCol = new Float32Array(PN_MAX * 3); pBase = new Float32Array(PN_MAX * 3); pVel = new Float32Array(PN_MAX * 4);
  pLife = new Float32Array(PN_MAX); pMax = new Float32Array(PN_MAX);
  for (let i = 0; i < PN_MAX; i++) pPos[i * 3 + 1] = -999;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pPos, 3)); g.setAttribute('color', new T.BufferAttribute(pCol, 3));
  parts = new T.Points(g, new T.PointsMaterial({ map: glowTex, size: 0.85, vertexColors: true, blending: T.AdditiveBlending, transparent: true, depthWrite: false }));
  parts.userData.rt = true; parts.frustumCulled = false; dyn.add(parts);
}
function emit(x, y, z, n, col, speed, life, up, grav) {
  tmpC.copy(tc(col));
  for (let k = 0; k < n; k++) {
    const i = pCur; pCur = (pCur + 1) % PN;
    const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 2 - 1), sp = speed * (0.35 + Math.random() * 0.65);
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 4] = Math.sin(ph) * Math.cos(th) * sp; pVel[i * 4 + 1] = Math.cos(ph) * sp + (up || 0); pVel[i * 4 + 2] = Math.sin(ph) * Math.sin(th) * sp; pVel[i * 4 + 3] = grav == null ? 9 : grav;
    pBase[i * 3] = tmpC.r; pBase[i * 3 + 1] = tmpC.g; pBase[i * 3 + 2] = tmpC.b;
    pLife[i] = pMax[i] = life * (0.6 + Math.random() * 0.4);
  }
}
R.emit = emit;
function stepParticles(dt) {
  for (let i = 0; i < PN_MAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    if (pLife[i] <= 0) { pPos[i * 3 + 1] = -999; continue; }
    pVel[i * 4 + 1] -= pVel[i * 4 + 3] * dt;
    pPos[i * 3] += pVel[i * 4] * dt; pPos[i * 3 + 1] += pVel[i * 4 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 4 + 2] * dt;
    if (pPos[i * 3 + 1] < 0.05) { pPos[i * 3 + 1] = 0.05; pVel[i * 4 + 1] *= -0.3; }
    const f = pLife[i] / pMax[i];
    pCol[i * 3] = pBase[i * 3] * f; pCol[i * 3 + 1] = pBase[i * 3 + 1] * f; pCol[i * 3 + 2] = pBase[i * 3 + 2] * f;
  }
  parts.geometry.attributes.position.needsUpdate = true; parts.geometry.attributes.color.needsUpdate = true;
}
function ringMesh(col) {
  const g = new T.Group();
  const r = new T.Mesh(new T.RingGeometry(0.9, 1, 56), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
  const d = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
  r.rotation.x = d.rotation.x = -Math.PI / 2; g.add(r); g.add(d); g.ring = r; g.disc = d; g.visible = false; dyn.add(g); return g;
}
function buildPools() {
  for (let i = 0; i < 8; i++) zonePool.push(ringMesh(0xffffff));
  for (let i = 0; i < 10; i++) rings.push({ m: ringMesh(0xffffff), t: 0, life: 0, r0: 0, r1: 1 });
  for (let i = 0; i < 4; i++) {
    const g = new T.Group();
    mesh(cyl(0.1, 0.16, 1.4, 5), mat(0x3a2a3c), 0, 0.7, 0, g);
    g.knot = mesh(new T.TorusKnotGeometry(0.5, 0.15, 40, 6), new T.MeshLambertMaterial({ color: 0xc9a0ff, emissive: 0xc9a0ff, emissiveIntensity: 0.6 }), 0, 1.8, 0, g);
    g.ring = new T.Mesh(new T.RingGeometry(0.9, 1.1, 20), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false }));
    g.ring.rotation.x = -Math.PI / 2; g.ring.position.y = 0.06; g.add(g.ring);
    glowSprite(0xc9a0ff, 3, g, 0, 1.8, 0); g.visible = false; dyn.add(g); knotPool.push(g);
  }
  for (let i = 0; i < 2; i++) {
    const g = new T.Group(), m = new T.MeshLambertMaterial({ color: 0xf4d9b8, emissive: 0xffc890, emissiveIntensity: 0.55 });
    mesh(box(0.7, 0.8, 1.9), m, 0, 1.5, 0, g); mesh(box(0.4, 1.0, 0.45), m, 0, 2.2, 0.95, g).rotation.x = 0.5; mesh(box(0.42, 0.42, 0.75), m, 0, 2.7, 1.4, g);
    g.legs = [];
    [[-0.25, 0.7], [0.25, 0.7], [-0.25, -0.7], [0.25, -0.7]].forEach(function (p) { const l = new T.Group(); l.position.set(p[0], 1.15, p[1]); mesh(box(0.16, 1.15, 0.16), m, 0, -0.57, 0, l); g.add(l); g.legs.push(l); });
    glowSprite(0xffc890, 9, g, 0, 1.6, 0); g.scale.set(1.5, 1.5, 1.5); g.visible = false; dyn.add(g); fawnPool.push(g);
  }
}

/* ---------- per-match models ---------- */
function hm(col, em) { const m = new T.MeshLambertMaterial({ color: col, emissive: em ? col : 0x000000, emissiveIntensity: em || 0 }); m.userData.lk = true; return m; }
/* SLOTS FOR PAINTED ART. Everything in the valley can be a painted cutout, not only the heroes. Each slot below names a
   picture; if the picture is listed in FLATS it replaces the built shapes, and if it is missing or fails to load the built
   shapes stay. Pictures are rows of equal cells with a transparent background, made by tools/sheet.py.
     house    3 cells: small, medium, large      Reign guardian, warden, patron
     tower    3 cells: small, medium, large      Hush guardian, warden, patron
     trooper  2 cells: front, back               Reign trooper
     hush     2 cells: front, back               Hush trooper
     hollow   2 cells: front, back               the big ones
     thief    2 cells: front, back               the small ones
     ness     1 cell:  side view, facing left    the Ness
     pines    3 cells: three trees               scenery
     rocks    3 cells: three rocks               scenery
     backdrop one wide painting (jpg)            the far ridge and sky line, wrapped round the valley
   To switch one on, add a line:  FLATS.house = { src: 'art/flats/house.png', cells: 3 };  See art/flats/README.md. */
const FLATS = R.FLATS = {};
FLATS.house = { src: 'art/flats/house.png', cells: 3 };
/* The far ridge: painted for the Lantern Ford study by the owner's other agent (art/ford-ridge.webp there, described as an original generated backdrop). */
FLATS.backdrop = { src: 'art/backdrop-ridge.webp', cells: 1 };
R.info = function () { // for the frame-rate report
  let gpu = 'unknown'; try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) {}
  return { gpu: String(gpu).slice(0, 90), w: R.w, h: R.h, pr: renderer ? renderer.getPixelRatio() : 1, low: !!R.low, look: LK.name, gl2: !!(renderer && renderer.capabilities.isWebGL2) };
};
R._heroes = function () { return heroM; }; // for tools
R._phase = function (ph) { heroM.forEach(function (m) { m.phase = ph; }); }; // for tools: pose the walk
R._flats = function () { return Object.keys(flatTex).map(function (k) { return k + ':' + (flatTex[k].t ? 'loaded' : 'no'); }).join(' '); }; // for tools
const flatTex = {}; let echoM = null, bd = null, decorPrims = [], decorTrees = [], decorRocks = [], decorHidden = false;
function flatLoad(name, cb) {
  const F = FLATS[name]; if (!F || R.noPaper) return;
  let e = flatTex[name];
  if (e) { if (e.t) cb(e.t, F); else e.wait.push(cb); return; }
  e = flatTex[name] = { t: null, wait: [cb] };
  new T.TextureLoader().load(F.src, function (t) { t.minFilter = T.LinearFilter; t.generateMipmaps = false; e.t = t; e.wait.forEach(function (f) { f(t, F); }); e.wait = []; }, undefined, function () { e.wait = []; });
}
function cellGeo(cells, i) { const g = new T.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i) / cells); return g; }
function flatMat(t) { const m = new T.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.45, side: T.DoubleSide }); m.userData.lk = true; m.userData.solid = true; m.userData.bl = true; return m; }
function flatAspect(t, cells) { return (t.image.width / cells) / t.image.height; }
/* One standing cutout that replaces a built model: hides `hide`, adds the picture to g, remembers it as g.flat. */
function standFlat(g, name, cell, h, hide) {
  flatLoad(name, function (t, F) {
    const m = new T.Mesh(cellGeo(F.cells, Math.min(cell, F.cells - 1)), flatMat(t)); m.scale.set(h * flatAspect(t, F.cells), h, 1); m.userData.w = h * flatAspect(t, F.cells);
    hide().forEach(function (o) { o.visible = false; }); g.add(m); g.flat = m;
  });
}
/* A crowd of cutouts: one instanced mesh per cell, every one turned to the camera each frame. */
function Boards(name, cap) { this.name = name; this.cap = cap; this.m = null; this.n = []; this.asked = false; }
Boards.prototype.begin = function () {
  if (!this.m) {
    if (!this.asked && FLATS[this.name]) { this.asked = true; const self = this, home = dyn;
      flatLoad(this.name, function (t, F) {
        self.a = flatAspect(t, F.cells); const mt = flatMat(t), ms = [];
        for (let i = 0; i < F.cells; i++) { const im = new T.InstancedMesh(cellGeo(F.cells, i), mt, self.cap); im.frustumCulled = false; im.count = 0; home.add(im); ms.push(im); }
        self.m = ms;
      }); }
    return false;
  }
  for (let i = 0; i < this.m.length; i++) this.n[i] = 0; return true;
};
Boards.prototype.put = function (cell, x, y, z, h, flip, tilt) {
  const c = cell % this.m.length, k = this.n[c]; if (k >= this.cap) return;
  dummy.position.set(x, y, z); dummy.rotation.set(0, Math.atan2(camPos.x - x, camPos.z - z), tilt || 0); dummy.scale.set(h * this.a * (flip ? -1 : 1), h, 1); dummy.updateMatrix();
  this.m[c].setMatrixAt(k, dummy.matrix); this.n[c] = k + 1;
};
Boards.prototype.end = function () { if (!this.m) return; for (let i = 0; i < this.m.length; i++) { this.m[i].count = this.n[i]; this.m[i].instanceMatrix.needsUpdate = true; } };
/* PAPER HEROES. The valley is paper, so a hero can be a paper cutout: four painted views on one sheet (front, left
   side, back, three-quarter), made by tools/sheet.py from a turnaround drawing. The cutout always turns its face to the
   camera and shows the view that matches where the camera stands, mirrored for the other side. A hero with no sheet,
   or whose sheet fails to load, keeps the built shapes below. Add a hero by adding a line here. */
const PAPER = R.PAPER = { // h: height in metres. hem: where the legs start (0 to 1). motion: the seven-figure sheet. arms: shoulder height, half shoulder width, arm length, all as fractions of h
  dora: { src: 'art/heroes/dora.png', h: 2.45, hem: 0.2, legs: 0.165, motion: 'art/heroes/dora-motion.png' }, // her cloak hides her arms; they appear only when she aims
  anna: { src: 'art/heroes/anna.png', h: 2.4, hem: 0.3, motion: 'art/heroes/anna-motion.png', arms: { y: 0.685, x: 0.105, len: 0.367 },
    /* 0.21: a finer body grid (columns, rows) for the coat halves; the coat's centre slit runs from the hem up to v 0.4 in
       the front and back cells; and the braid, cut out of the motion sheet so it can swing (see braidSheets). In each
       motion cell that shows it: p, where it hangs from (cell u, v), and poly, its outline (u, v pairs), measured from the
       sheet's hair colours by a script (docs/prompts/anna-motion-sheet-v2.md asks for a painted braid layer instead). */
    grid: [8, 18], slit: 0.4, legs: 0.262, // legs: where the leg strips are cut, below the hem, so they carry no coat
    braid: { cells: {
      1: { p: [0.652, 0.753], poly: [0.574,0.753,0.598,0.728,0.621,0.703,0.637,0.678,0.648,0.653,0.656,0.628,0.668,0.603,0.637,0.578,0.645,0.553,0.664,0.528,0.66,0.503,0.645,0.478,0.668,0.453,0.676,0.441,0.695,0.425,0.715,0.441,0.73,0.453,0.746,0.478,0.723,0.503,0.723,0.528,0.734,0.553,0.746,0.578,0.75,0.603,0.742,0.628,0.75,0.653,0.738,0.678,0.746,0.703,0.734,0.728,0.73,0.753] },
      2: { p: [0.5, 0.753], poly: [0.398,0.753,0.418,0.728,0.422,0.703,0.418,0.678,0.43,0.653,0.422,0.628,0.43,0.603,0.441,0.578,0.441,0.553,0.465,0.528,0.457,0.503,0.434,0.478,0.453,0.453,0.469,0.441,0.5,0.422,0.531,0.441,0.547,0.453,0.566,0.478,0.539,0.503,0.539,0.528,0.547,0.553,0.562,0.578,0.574,0.603,0.562,0.628,0.582,0.653,0.566,0.678,0.586,0.703,0.59,0.728,0.602,0.753] },
      5: { p: [0.508, 0.769], poly: [0.363,0.769,0.402,0.744,0.422,0.719,0.43,0.694,0.422,0.669,0.426,0.644,0.438,0.619,0.434,0.594,0.453,0.569,0.449,0.544,0.484,0.519,0.453,0.494,0.438,0.469,0.473,0.444,0.48,0.431,0.5,0.414,0.52,0.431,0.539,0.444,0.574,0.469,0.555,0.494,0.543,0.519,0.551,0.544,0.562,0.569,0.559,0.594,0.578,0.619,0.574,0.644,0.578,0.669,0.582,0.694,0.578,0.719,0.602,0.744,0.652,0.769] },
      6: { p: [0.83, 0.775], poly: [0.723,0.775,0.754,0.75,0.781,0.725,0.812,0.7,0.82,0.675,0.832,0.65,0.836,0.625,0.848,0.6,0.82,0.575,0.828,0.55,0.852,0.525,0.832,0.5,0.844,0.475,0.871,0.45,0.895,0.434,0.918,0.45,0.941,0.475,0.918,0.5,0.906,0.525,0.918,0.55,0.934,0.575,0.93,0.6,0.93,0.625,0.934,0.65,0.922,0.675,0.934,0.7,0.914,0.725,0.918,0.75,0.938,0.775] } } } },
  myra: { src: 'art/heroes/myra.png', h: 1.95, hem: 0.22, legs: 0.168, motion: 'art/heroes/myra-motion.png', arms: { y: 0.6, x: 0.19, len: 0.356 } },
  skein: { src: 'art/heroes/skein.png', h: 2.2, hem: 0.27, motion: 'art/heroes/skein-motion.png', arms: { y: 0.66, x: 0.13, len: 0.352 } },
  rook: { src: 'art/heroes/wick-aviator.svg', h: 2.42, hem: 0.28 } // 0.25 rook: his turnaround from the Lantern Ford study (work/lantern-ford-wick-aviator); no motion sheet yet, so no separate arms
};
const paperTex = {}, PAPER_FLIP = -1;
/* HERO PAPER SHADER (0.20). The cutouts are unlit, so on their own they sit on the valley like stickers. Two cheap things
   seat them in it: the feet darken toward the ground (the colour of a contact shadow, from the bottom of the figure up a
   quarter of its height), and the cut edge catches a thin rim of the view's light, stronger on edges that face up, like
   the lantern-and-moon rim in the key art. The edge is found by sampling the picture's alpha a couple of texels away in
   four directions; nothing outside the figure is drawn. */
function heroize(m, img, cells) {
  const rim = { value: new T.Color(LK.rim != null ? LK.rim : LK.sun[0]).multiplyScalar(LK.rimK != null ? LK.rimK : 0.5) }, tx = { value: new T.Vector2(2 / (img.width || 1024), 2 / (img.height || 1024)) };
  m.onBeforeCompile = function (sh) {
    sh.uniforms.rimC = rim; sh.uniforms.tx = tx;
    sh.fragmentShader = 'uniform vec3 rimC; uniform vec2 tx;\n' + sh.fragmentShader.replace('#include <map_fragment>', [
      '#include <map_fragment>',
      '#ifdef USE_MAP',
      'float aN = texture2D(map, vUv + vec2(0.0, tx.y)).a, aS = texture2D(map, vUv - vec2(0.0, tx.y)).a;',
      'float aE = texture2D(map, vUv + vec2(tx.x, 0.0)).a, aW = texture2D(map, vUv - vec2(tx.x, 0.0)).a;',
      'float edge = smoothstep(0.25, 0.95, 1.0 - min(min(aN, aS), min(aE, aW)));',
      'float up = clamp((aS - aN) * 1.4 + 0.35, 0.0, 1.0);',
      'diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.26, vUv.y));',
      'diffuseColor.rgb += rimC * edge * up * (0.3 + 0.7 * smoothstep(0.25, 0.9, vUv.y));',
      '#endif'].join('\n'));
  };
  m.customProgramCacheKey = function () { return 'paperHero1'; };
  return m;
}
const ss01 = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/* Bend the body: q = { bend, head, cloak (screen-right fractions of height), flare, bulge, breath, wave, wph, inv, and
   0.21: slit, panL, panR }, inv turns screen-right into the piece's own x (it is mirrored and widened by its parent's
   scale). bodyAt is the bend at one rest point of the body, so a piece laid on the body (the braid) can follow it. */
function bodyAt(x0, y0, q, H, hw, o) {
  const f = 1 + y0 / H, lo = 1 - f, lo2 = lo * lo, u = x0 / hw;
  const sx = (q.bend * f * f + q.head * ss01(0.68, 1, f) + q.cloak * lo2 * lo) * H * q.inv;
  const wide = q.flare * lo2 * 1.7 + q.bulge * 4 * f * lo * (0.5 + 0.5 * lo) + q.breath * Math.max(0, 1 - Math.abs(f - 0.6) / 0.22);
  let dy = (q.flare * 0.1 * lo2 + q.wave * Math.sin(q.wph + u * 2.7) * lo2 * lo) * H, dx = 0; // the hem lifts only a little: the legs hang from just under it
  /* 0.21: the two halves of a slit coat, each lifted at the hem by its own knee; most at the slit, where the cloth is free,
     blended across the centre column (the halves share it, so the slit itself cannot open). */
  if (q.slit > 0 && f < q.slit && (q.panL > 0.001 || q.panR > 0.001)) { const w = ss01(q.slit, 0, f), k = ss01(-0.14, 0.14, u), pan = q.panL * (1 - k) + q.panR * k, au = Math.abs(u);
    dy += pan * w * H * 0.045 * (1 - 0.55 * Math.min(1, au / 0.6)); dx = u * pan * w * H * 0.06; }
  o.x = x0 + sx + x0 * wide + dx; o.y = y0 + dy;
}
const bo = { x: 0, y: 0 };
function bendBody(ms, q, inv) {
  const g = ms.geometry, a = g.attributes.position, b = g.userData.base, H = g.userData.H, hw = g.userData.W / 2; q.inv = inv;
  for (let i = 0; i < a.count; i++) { bodyAt(b[i * 3], b[i * 3 + 1], q, H, hw, bo); a.setXY(i, bo.x, bo.y); }
  a.needsUpdate = true;
}
/* The braid (0.21) hangs from its pivot as a short chain: each row of the strip turns by an angle that grows down its
   length (the root lies on the nape, the tip is free), a = the pendulum, tip = the lower half's lag; lift shortens the
   lower half (trailing toward the camera). The result is then carried by the body's own bend, as if painted on it. */
function bendBraid(ms, body, q, a, tip, lift) {
  const g = ms.geometry, A = g.attributes.position, b = g.userData.base, n = g.userData.rows, cols = g.userData.cols, L = g.userData.H, px = g.userData.px, oy = ms.position.y;
  const bg = body.geometry, H = bg.userData.H, hw = bg.userData.W / 2;
  let cx = px, cy = 0;
  for (let j = 0; j <= n; j++) {
    const s = j / n;
    if (j > 0) { const sm = (j - 0.5) / n, tm = a * Math.min(1, sm / 0.4) + tip * sm * sm, seg = L / n * (1 - lift * sm); cx += Math.sin(tm) * seg; cy -= Math.cos(tm) * seg; }
    const th = a * Math.min(1, s / 0.4) + tip * s * s, c = Math.cos(th), sn = Math.sin(th);
    for (let k = 0; k <= cols; k++) { const i = j * (cols + 1) + k, ox = b[i * 3] - px; bodyAt(cx + ox * c, cy + ox * sn + oy, q, H, hw, bo); A.setXY(i, bo.x, bo.y - oy); }
  }
  A.needsUpdate = true;
}
/* Cut the braid out of a motion sheet (0.21). Returns two canvases the size of the sheet: braid (only the pixels inside
   the outlines) and body (the sheet with those pixels filled from either side: mirrored from the cloth beside it so its
   weave and the belt carry across, or left empty where the braid hung over the background). If the browser will not let
   a page read its own picture (opened as a file), returns null and the painted braid stays painted on. */
function braidSheets(img, B) {
  try {
    const w = img.width, h = img.height, cw = w / 7, mk = function () { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const body = mk(), braid = mk(), mask = mk(), bx = body.getContext('2d'), rx = braid.getContext('2d'), mx = mask.getContext('2d');
    bx.drawImage(img, 0, 0); mx.fillStyle = mx.strokeStyle = '#fff'; mx.lineWidth = 2; mx.lineJoin = 'round';
    const box = [];
    for (const key in B.cells) { const c = +key, P = B.cells[key].poly; let x0 = w, x1 = 0, y0 = h, y1 = 0; mx.beginPath();
      for (let i = 0; i < P.length; i += 2) { const x = (c + P[i]) * cw, y = (1 - P[i + 1]) * h; if (i) mx.lineTo(x, y); else mx.moveTo(x, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      mx.closePath(); mx.fill(); mx.stroke(); box.push([Math.max(c * cw, Math.floor(x0) - 3), Math.min((c + 1) * cw - 1, Math.ceil(x1) + 3), Math.max(0, Math.floor(y0) - 3), Math.min(h - 1, Math.ceil(y1) + 3), c * cw, (c + 1) * cw - 1]); }
    rx.drawImage(img, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.drawImage(mask, 0, 0);
    const D = bx.getImageData(0, 0, w, h), d = D.data, M = mx.getImageData(0, 0, w, h).data, O = Uint8ClampedArray.from(d);
    const on = function (x, y) { return O[(y * w + x) * 4 + 3] >= 128; }, inM = function (x, y) { return M[(y * w + x) * 4 + 3] >= 128; };
    box.forEach(function (bb) {
      for (let y = bb[2]; y <= bb[3]; y++) for (let x = bb[0]; x <= bb[1]; x++) {
        if (!inM(x, y) || !on(x, y)) continue;
        let b2 = x; while (b2 + 1 <= bb[1] && inM(b2 + 1, y) && on(b2 + 1, y)) b2++;
        const a = x, L = a - 1, Rr = b2 + 1, lo = L >= bb[4] && on(L, y) && !inM(L, y), ro = Rr <= bb[5] && on(Rr, y) && !inM(Rr, y);
        const pick = function (xm, xs) { return xm >= bb[4] && xm <= bb[5] && on(xm, y) && !inM(xm, y) ? xm : xs; };
        for (let xx = a; xx <= b2; xx++) {
          const o = (y * w + xx) * 4, t = (xx - a + 1) / (b2 - a + 2), pl = pick(2 * a - 1 - xx, L), pr = pick(2 * b2 + 1 - xx, Rr);
          let wl = lo ? 1 - t : 0, wr = ro ? t : 0;
          if (lo && !ro) wl = xx - a < 3 ? 1 : 0; else if (ro && !lo) wr = b2 - xx < 3 ? 1 : 0;
          const sw = wl + wr; if (sw <= 0) { d[o + 3] = 0; continue; }
          const ol = (y * w + pl) * 4, or = (y * w + pr) * 4;
          for (let ch = 0; ch < 3; ch++) d[o + ch] = ((lo ? O[ol + ch] : 0) * wl + (ro ? O[or + ch] : 0) * wr) / sw;
          d[o + 3] = 255;
        }
        x = b2;
      }
    });
    bx.putImageData(D, 0, 0);
    return { body: body, braid: braid };
  } catch (e) { return null; }
}
/* Fold a hanging strip at a joint `at` of the way down (knee, elbow) by angle al (+ swings the lower part toward +x). */
function bendJoint(ms, al, at) {
  const g = ms.geometry; if (g.userData.al === al) return; g.userData.al = al;
  const a = g.attributes.position, b = g.userData.base, L = g.userData.H, kd = L * at, kx = g.userData.cx;
  for (let i = 0; i < a.count; i++) {
    const x0 = b[i * 3], y0 = b[i * 3 + 1], w = ss01(kd - 0.14 * L, kd + 0.1 * L, -y0);
    if (w <= 0) { a.setXY(i, x0, y0); continue; }
    const c = Math.cos(al * w), s = Math.sin(al * w), rx = x0 - kx, ry = y0 + kd;
    a.setXY(i, kx + rx * c - ry * s, -kd + rx * s + ry * c);
  }
  a.needsUpdate = true;
}
function paperFor(g, id) {
  const P = PAPER[id]; if (!P || R.noPaper) return;
  const put = function (base) {
    const tex = base.clone(); tex.needsUpdate = true; tex.repeat.set(0.25, 1);
    const mt = heroize(new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: T.DoubleSide }), base.image, 4); mt.userData.lk = true; mt.userData.solid = true; mt.userData.bl = true;
    /* A paper puppet, cut from the one picture: the body from the hem up, and the legs below it as separate pieces hinged at
       the hem. Front, back and three-quarter views use a left and a right leg; the side view uses the whole leg strip twice,
       one swinging forward and one back. P.hem is how far up the figure the hem is (0 to 1). */
    const wd = P.h * (base.image.width / 4) / base.image.height, hf = P.hem || 0.2, pp = new T.Group();
    /* 0.20: every piece is a grid of small quads that remembers its rest shape, so it can bend: the body curves, its hem
       trails and flares, the head lags, knees and elbows fold (paperBend, below). sx, sy: columns and rows. */
    const part = function (u0, u1, v0, v1, m2, sx, sy) {
      const gq = new T.PlaneGeometry(wd * (u1 - u0), P.h * (v1 - v0), sx || 1, sy || 1), cx = ((u0 + u1) / 2 - 0.5) * wd; gq.translate(cx, -P.h * (v1 - v0) / 2, 0);
      const uv = gq.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
      gq.userData.base = Float32Array.from(gq.attributes.position.array); gq.userData.H = P.h * (v1 - v0); gq.userData.W = wd * (u1 - u0); gq.userData.cx = cx;
      gq.boundingSphere = new T.Sphere(new T.Vector3(cx, -gq.userData.H / 2, 0), P.h);
      const ms = new T.Mesh(gq, m2 || mt); pp.add(ms); return ms;
    };
    const gr = P.grid || [6, 14], lt = P.legs || hf, vb = Math.max(0, Math.min(hf - 0.035, lt - 0.005));
    const P_ = pp.parts = { body: part(0, 1, vb, 1, null, gr[0], gr[1]), legL: part(0, 0.5, 0, lt, null, 1, 6), legR: part(0.5, 1, 0, lt, null, 1, 6), legA: part(0, 1, 0, lt, null, 1, 8), legB: part(0, 1, 0, lt, null, 1, 8) };
    P_.body.position.set(0, P.h, 0.03); P_.legB.position.z = -0.02; pp.material = mt; pp.rotation.order = 'YXZ'; /* so a fall tips the card away from the camera */ pp.h = P.h; pp.hem = lt * P.h; g.add(pp);
    pp.slitF = P.slit ? (P.slit - vb) / (1 - vb) : 0; // where the coat's slit ends, as a fraction of the body piece from its bottom
    /* The motion sheet, when there is one: bodies drawn without arms (front, side, back), one arm from the side and one from
       the front, and an aiming pose from behind and from the side. The body pieces switch to this picture for those views;
       the arms hang from the shoulders and swing; while the hero is firing the aiming pose is shown. */
    if (P.motion) new T.TextureLoader().load(P.motion, function (t2) {
      t2.minFilter = T.LinearFilter; t2.generateMipmaps = false; t2.repeat.set(1 / 7, 1);
      /* 0.21: a braid is cut out of the sheet and hung as its own piece, one strip per cell that shows it, all sharing one
         material whose cell is set each frame; the body then draws from the copy with the braid filled in behind. */
      const cut = P.braid && !R.reduced ? braidSheets(t2.image, P.braid) : null; let tb = t2;
      if (cut) { tb = new T.CanvasTexture(cut.body); tb.minFilter = T.LinearFilter; tb.generateMipmaps = false; tb.repeat.set(1 / 7, 1);
        const tr = new T.CanvasTexture(cut.braid); tr.minFilter = T.LinearFilter; tr.generateMipmaps = false; tr.repeat.set(1 / 7, 1);
        pp.matB = flatMat(tr); P_.braids = {};
        for (const key in P.braid.cells) { const B = P.braid.cells[key], Q = B.poly; let u0 = 1, u1 = 0, v0 = 1;
          for (let i = 0; i < Q.length; i += 2) { u0 = Math.min(u0, Q[i]); u1 = Math.max(u1, Q[i]); v0 = Math.min(v0, Q[i + 1]); }
          const v1 = B.p[1], br = part(Math.max(0, u0 - 0.012), Math.min(1, u1 + 0.012), Math.max(0, v0 - 0.01), v1, pp.matB, 2, 16);
          br.geometry.userData.rows = 16; br.geometry.userData.cols = 2; br.geometry.userData.px = (B.p[0] - 0.5) * wd;
          P_.body.add(br); br.position.set(0, -(1 - v1) * P.h, 0.006); br.renderOrder = 1; br.visible = false; P_.braids[key] = br; }
      }
      pp.mat1 = mt; pp.mat2 = heroize(flatMat(tb), tb.image, 7); pp.r2 = ((t2.image.width / 7) / t2.image.height * P.h) / wd; // how much wider a motion cell is than a turnaround cell
      if (P.arms) { const ta = t2.clone(); ta.needsUpdate = true; ta.repeat.set(1 / 7, 1); const ma = heroize(flatMat(ta), t2.image, 7); pp.matA = ma;
        P_.armL = part(0, 1, 1 - P.arms.len, 1, ma, 1, 6); P_.armR = part(0, 1, 1 - P.arms.len, 1, ma, 1, 6); P_.armR.scale.x = -1;
        /* 0.21: the far arm, seen from the side, swings behind the body: the side arm picture, a shade darker. */
        if (LL.paperMotion.gaitOf(id).far) { pp.matF = heroize(flatMat(ta), t2.image, 7); pp.matF.color.setRGB(0.68, 0.66, 0.72); } } // shares the arms' texture (and its cell)
    }, undefined, function () {});
    g.paper = pp; g.body.visible = false; g.legL.visible = false; g.legR.visible = false;
  };
  if (paperTex[id]) { put(paperTex[id]); return; }
  new T.TextureLoader().load(P.src, function (t) { t.minFilter = T.LinearFilter; t.generateMipmaps = false; paperTex[id] = t; if (g.parent) put(t); }, undefined, function () {});
}
/* GUARDIAN FOX. From PR #6 (feature/guardian-fox-v011, the owner's other agent): earned by bringing back a stolen light,
   toggled in Settings, follows the hero and draws a thread to the nearest Hush thief carrying light. Visual guidance only:
   no hitbox, no attack, nothing in the model. 0.19 kept its rules and shapes and gave it motion: it trots by distance on
   the shared rig, follows on a spring instead of a straight slide, turns smoothly, wags with speed and sits when you stop. */
function buildPet() {
  if (petM && petM.parent) petM.parent.remove(petM); if (petThread && petThread.parent) petThread.parent.remove(petThread); // one fox, even when the valley is rebuilt
  const g = new T.Group(), body = new T.Group(); g.add(body); g.body = body;
  const gold = new T.MeshLambertMaterial({ color: 0xffc778, emissive: 0xffa440, emissiveIntensity: 0.35 });
  const pale = new T.MeshLambertMaterial({ color: 0xffecc1, emissive: 0xffdca0, emissiveIntensity: 0.25 });
  const ink = new T.MeshLambertMaterial({ color: 0x443046 });
  [gold, pale, ink].forEach(m => { m.userData.lk = true; m.userData.solid = true; });
  mesh(flat(new T.IcosahedronGeometry(0.47, 0)), gold, 0, 0.66, 0, body).scale.set(1.25, 0.7, 1.6);
  const head = new T.Group(); head.position.set(0, 1.05, 0.62); body.add(head); g.head = head;
  mesh(flat(new T.IcosahedronGeometry(0.36, 0)), pale, 0, 0, 0, head).scale.set(1.05, 0.85, 1.15);
  mesh(flat(new T.ConeGeometry(0.11, 0.42, 4)), pale, 0, -0.06, 0.36, head).rotation.x = Math.PI / 2; // muzzle
  mesh(flat(new T.ConeGeometry(0.18, 0.58, 4)), gold, -0.24, 0.42, -0.06, head).rotation.z = 0.22;
  mesh(flat(new T.ConeGeometry(0.18, 0.58, 4)), gold, 0.24, 0.42, -0.06, head).rotation.z = -0.22;
  mesh(flat(new T.IcosahedronGeometry(0.075, 0)), ink, -0.17, 0.06, 0.3, head);
  mesh(flat(new T.IcosahedronGeometry(0.075, 0)), ink, 0.17, 0.06, 0.3, head);
  const legs = []; [[-0.28, 0.42], [0.28, 0.42], [-0.28, -0.42], [0.28, -0.42]].forEach(function (q, k) { const l = new T.Group(); l.position.set(q[0], 0.52, q[1]); mesh(flat(new T.ConeGeometry(0.1, 0.52, 4)), k < 2 ? pale : gold, 0, -0.26, 0, l).rotation.x = Math.PI; body.add(l); legs.push(l); }); g.legs = legs;
  const tail = new T.Group(); tail.position.set(0, 0.78, -0.62);
  mesh(flat(new T.ConeGeometry(0.3, 1.25, 5)), gold, 0, 0, -0.55, tail).rotation.x = -1.2;
  mesh(flat(new T.ConeGeometry(0.2, 0.5, 5)), pale, 0, 0.18, -1.12, tail).rotation.x = -1.2;
  body.add(tail); g.tail = tail;
  const halo = glowSprite(0xffd890, 3.6, g, 0, 1.0, 0); halo.material.userData.lk = true; g.halo = halo;
  g.shadow = shadowBlob(0.7); g.add(g.shadow);
  g.scale.setScalar(0.72); g.visible = R.petEnabled; g.rig = LL.paperMotion.create(); g.vel = { x: 0, z: 0 }; g.face = 0; g.sit = 0;
  dyn.add(g); petM = g;
  const line = new T.BufferGeometry(); line.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
  const lm = new T.LineBasicMaterial({ color: 0xffcf85, transparent: true, opacity: 0.6, depthWrite: false, fog: false }); lm.userData.lk = true;
  petThread = new T.Line(line, lm); petThread.visible = false; petThread.frustumCulled = false; dyn.add(petThread);
}
/* 0.24 heroes3d: 3D figures (default) or painted paper. Rebuilds only the heroes. */
R.heroes3d = true;
R.setHeroes3d = function (on) { on = !!on; if (on === R.heroes3d) return; R.heroes3d = on; if (!R.ok || !W || !dyn) return; heroM.forEach(function (g) { dyn.remove(g); }); heroM = W.heroes.map(heroModel); if (echoM) { dyn.remove(echoM); echoM = null; } applyLook(); };
R.setPet = function (on) { R.petEnabled = !!on; if (petM) petM.visible = R.petEnabled; if (petThread) petThread.visible = false; };
function petStep(dt) {
  if (!petM) return;
  const h = W.player, pm = petM; pm.visible = !!(R.petEnabled && h && h.alive && (!W.auto || W.lean));
  if (!pm.visible) { if (petThread) petThread.visible = false; return; }
  // a place to the hero's right as the camera sees it, a little further from the camera, so it is never between the camera and
  // the hero whichever way the hero faces; a spring pulls the fox toward it
  let fx = camDir.x, fz = camDir.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  const tx = h.x + fx * 0.9 - fz * 1.9, tz = h.z + fz * 0.9 + fx * 1.9;
  if (!pm.userData.arrived || Math.hypot(tx - pm.position.x, tz - pm.position.z) > 14) { pm.position.set(tx, 0, tz); pm.vel.x = pm.vel.z = 0; pm.userData.arrived = true; }
  const k = 38, c = 11; pm.vel.x += ((tx - pm.position.x) * k - pm.vel.x * c) * dt; pm.vel.z += ((tz - pm.position.z) * k - pm.vel.z * c) * dt;
  pm.position.x += pm.vel.x * dt; pm.position.z += pm.vel.z * dt;
  const sp = Math.hypot(pm.vel.x, pm.vel.z);
  let target = null, dist = 40;
  for (const t of W.thieves) { if (!t.alive || t.state !== 1 || !t.carry) continue; const dd = Math.hypot(t.x - h.x, t.z - h.z); if (dd < dist) { dist = dd; target = t; } }
  const want = target ? Math.atan2(target.x - pm.position.x, target.z - pm.position.z) : (sp > 0.6 ? Math.atan2(pm.vel.x, pm.vel.z) : h.yaw);
  let dy = want - pm.face; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); pm.face += dy * (1 - Math.exp(-dt * 8)); pm.rotation.y = pm.face;
  const st = LL.paperMotion.pose(pm.rig, { x: pm.position.x, z: pm.position.z, yaw: pm.face, onGround: true, rig: 'fox' }, dt, W.t, R.reduced);
  const trot = R.reduced ? 0 : Math.sin(st.phase * 2) * st.mix;
  pm.body.position.y = R.reduced ? 0 : Math.abs(Math.sin(st.phase * 2)) * 0.12 * st.mix;
  pm.body.rotation.x = R.reduced ? 0 : -0.06 * st.mix + Math.sin(st.phase * 2) * 0.04 * st.mix;
  pm.body.rotation.z = R.reduced ? 0 : Math.max(-0.2, Math.min(0.2, -st.turn * 0.05));
  pm.legs.forEach(function (l, j) { l.rotation.x = (j === 0 || j === 3 ? 1 : -1) * trot * 0.7; });
  // sitting: when the hero stands still for a moment the fox sits and looks up
  pm.sit += ((sp < 0.3 && !target ? 1 : 0) - pm.sit) * (1 - Math.exp(-dt * 3)); pm.body.rotation.x -= pm.sit * 0.35; pm.body.position.y -= pm.sit * 0.12;
  pm.head.rotation.x = -pm.sit * 0.25 + (target ? 0.1 : 0);
  pm.tail.rotation.y = R.reduced ? 0 : Math.sin(time * (5 + st.mix * 6)) * (0.18 + st.mix * 0.35 + (target ? 0.25 : 0));
  pm.tail.rotation.x = 0.15 + pm.sit * 0.4;
  pm.halo.material.opacity = 0.65 + (target ? 0.3 * Math.abs(Math.sin(time * 6)) : 0);
  petThread.visible = !!target;
  if (target) { const a = petThread.geometry.attributes.position; a.setXYZ(0, pm.position.x, 0.8, pm.position.z); a.setXYZ(1, target.x, 1.4, target.z); a.needsUpdate = true; }
}
function heroModel(h) {
  const d = h.def, g = new T.Group(), body = new T.Group(); g.add(body);
  const skin = hm(0xe8c4a0), dark = hm(0x2b1b2f), tc = SRC_TEAM[h.team];
  const legL = new T.Group(), legR = new T.Group(); legL.position.set(-0.16, 0.55, 0); legR.position.set(0.16, 0.55, 0);
  mesh(box(0.17, 0.55, 0.2), dark, 0, -0.27, 0, legL); mesh(box(0.17, 0.55, 0.2), dark, 0, -0.27, 0, legR); g.add(legL); g.add(legR);
  const arm = new T.Group(); arm.position.set(-0.3, 1.3, 0.1); body.add(arm);
  let gun;
  if (d.id === 'dora') {
    mesh(cyl(0.24, 0.5, 0.95, 7), hm(0x8a5a3c), 0, 0.98, 0, body);
    mesh(new T.SphereGeometry(0.26, 8, 6), skin, 0, 1.62, 0, body);
    mesh(flat(new T.ConeGeometry(0.6, 0.34, 8)), hm(0xe9b44c), 0, 1.9, 0, body);
    gun = mesh(box(0.12, 0.14, 0.7), dark, 0, 0, 0.4, arm);
    mesh(box(0.22, 0.3, 0.22), new T.MeshBasicMaterial({ color: 0xffd28a }), 0.36, 1.0, 0.3, body); glowSprite(0xffc46b, 2.4, body, 0.36, 1.0, 0.3);
  } else if (d.id === 'anna') {
    mesh(cyl(0.26, 0.42, 0.95, 6), hm(0x2f8f98), 0, 0.98, 0, body);
    mesh(new T.SphereGeometry(0.26, 8, 6), skin, 0, 1.62, 0, body);
    mesh(new T.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hm(0xc4403a), 0, 1.66, -0.02, body);
    const br = mesh(cyl(0.09, 0.05, 0.8, 5), hm(0xc4403a), 0, 1.25, -0.3, body); br.rotation.x = 0.35;
    gun = mesh(box(0.1, 0.1, 0.95), hm(0x6a4a34), 0, 0, 0.45, arm); mesh(box(0.34, 0.2, 0.2), hm(0x8a8690), 0, 0, 0.95, arm);
  } else if (d.id === 'myra') {
    mesh(new T.SphereGeometry(0.62, 10, 8), hm(0x9a6fd0), 0, 1.02, 0, body);
    const wgl = mesh(flat(new T.ConeGeometry(0.3, 0.9, 3)), hm(0xe9dcff, 0.4), 0.42, 1.5, -0.42, body); wgl.rotation.set(0.5, 0, -1.0);
    const wgr = mesh(flat(new T.ConeGeometry(0.3, 0.9, 3)), hm(0xe9dcff, 0.4), -0.42, 1.5, -0.42, body); wgr.rotation.set(0.5, 0, 1.0);
    mesh(cyl(0.2, 0.2, 0.34, 8), hm(0xe9b44c, 0.3), 0.5, 1.0, 0.36, body).rotation.z = Math.PI / 2;
    mesh(new T.SphereGeometry(0.24, 8, 6), skin, 0, 1.72, 0, body);
    mesh(new T.SphereGeometry(0.12, 6, 5), hm(0xe9b44c, 0.4), 0, 2.0, 0, body);
    gun = mesh(cyl(0.16, 0.1, 0.6, 7), hm(0xe9b44c, 0.25), 0, 0, 0.4, arm); gun.rotation.x = Math.PI / 2;
  } else if (d.id === 'rook') { // 0.25 rook: the built shapes under his paper, from the Lantern Ford study
    mesh(cyl(0.27, 0.49, 0.96, 7), hm(0x3d5a7f), 0, 1.03, 0, body);
    mesh(new T.SphereGeometry(0.3, 9, 7), hm(0xd5d5b7), 0, 1.74, 0, body);
    mesh(box(0.47, 0.14, 0.09), hm(0x86e6c9, 0.45), 0, 1.76, 0.26, body);
    mesh(box(0.52, 0.53, 0.25), hm(0xa77353), 0, 1.25, -0.31, body);
    mesh(new T.OctahedronGeometry(0.22), hm(0x98f2ce, 0.5), 0, 1.28, -0.46, body);
    gun = mesh(box(0.12, 0.12, 0.48), hm(0xe3ba83), 0, 0, 0.3, arm);
  } else {
    mesh(cyl(0.16, 0.3, 0.95, 5), hm(0x8fd8c0), 0, 0.98, 0, body);
    mesh(flat(new T.IcosahedronGeometry(0.32, 0)), hm(0xe8c4a0), 0, 1.68, 0, body);
    const b1 = mesh(cyl(0.08, 0.05, 0.7, 5), hm(0xc8703a, 0.25), 0.3, 1.4, -0.08, body); b1.rotation.z = -0.25;
    const b2 = mesh(cyl(0.08, 0.05, 0.7, 5), hm(0xc8703a, 0.25), -0.3, 1.4, -0.08, body); b2.rotation.z = 0.25;
    const n1 = mesh(cyl(0.02, 0.02, 0.9, 4), hm(0xf4e8d6), 0.1, 1.85, 0, body); n1.rotation.z = 0.7;
    const n2 = mesh(cyl(0.02, 0.02, 0.9, 4), hm(0xf4e8d6), -0.1, 1.85, 0, body); n2.rotation.z = -0.7;
    gun = mesh(box(0.08, 0.08, 0.6), hm(0xf4e8d6), 0, 0, 0.35, arm);
  }
  mesh(new T.TorusGeometry(0.3, 0.07, 5, 10), mat(tc, 0.7), 0, 1.42, 0, body).rotation.x = Math.PI / 2;
  const ring = new T.Mesh(new T.RingGeometry(0.62, 0.8, 24), new T.MeshBasicMaterial({ color: tc, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const shield = new T.Mesh(new T.SphereGeometry(1.25, 12, 8), new T.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false }));
  shield.position.y = 1; shield.visible = false; g.add(shield);
  g.body = body; g.legL = legL; g.legR = legR; g.arm = arm; g.ring = ring; g.shield = shield; g.phase = 0; g.recoil = 0; g.unit = h;
  g.rig = LL.paperMotion.create(); g.lean = 0; g.shadow = shadowBlob(0.62); g.add(g.shadow);
  dyn.add(g);
  if (R.heroes3d && LL.heroes3d) { const fig = LL.heroes3d.build(T, h, { LK: LK, glow: glowSprite }); // 0.24 heroes3d: a figure with a skeleton in place of the paper (js/heroes3d.js)
    if (fig) { g.fig = fig; g.add(fig.root); g.body.visible = g.legL.visible = g.legR.visible = false; return g; } }
  paperFor(g, d.id); return g;
}
let deerT = null;
function deerTex() {
  if (deerT) return deerT;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 140, 20, 128, 128, 190); gr.addColorStop(0, '#fff3d0'); gr.addColorStop(1, '#e9a860'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#4a2a1c';
  g.beginPath(); g.ellipse(132, 150, 46, 22, 0, 0, 6.3); g.fill();
  [[100, 0], [116, 0], [152, 0], [166, 0]].forEach(function (p) { g.fillRect(p[0], 160, 7, 56); });
  g.beginPath(); g.moveTo(96, 140); g.lineTo(78, 92); g.lineTo(94, 88); g.lineTo(116, 134); g.fill();
  g.beginPath(); g.ellipse(76, 88, 18, 10, -0.3, 0, 6.3); g.fill();
  g.strokeStyle = '#4a2a1c'; g.lineWidth = 5; g.lineCap = 'round';
  [[84, 80, 76, 40], [76, 40, 60, 24], [76, 52, 92, 30], [92, 82, 108, 44], [108, 44, 124, 30], [108, 56, 98, 30]].forEach(function (q) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.stroke(); });
  g.strokeStyle = '#5a3520'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250); g.lineWidth = 3; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 60); g.moveTo(0, 60); g.lineTo(256, 60); g.moveTo(0, 222); g.lineTo(256, 222); g.stroke();
  deerT = new T.CanvasTexture(c); return deerT;
}
function structModel(s) {
  const g = new T.Group(), lit = new T.Group(), tc = SRC_TEAM[s.team];
  const stone = mat(0x4a3d52), dark = mat(0x2b1b2f);
  let paper = new T.MeshLambertMaterial({ color: tc, emissive: tc, emissiveIntensity: 0.65 });
  if (s.team === 0 && s.kind !== 'patron') {
    // a lantern house: paper screens with a stag on them
    const big = s.kind === 'warden', w = big ? 4.2 : 3.6, bh = big ? 3.4 : 3.0;
    paper = new T.MeshLambertMaterial({ color: 0x3a2418, emissive: 0xffc98a, emissiveMap: deerTex(), emissiveIntensity: 0.9 }); paper.userData.lk = true;
    mesh(box(w + 0.9, 1, w + 0.9), stone, 0, 0.5, 0, g);
    mesh(new T.BoxGeometry(w, bh, w), paper, 0, 1 + bh / 2, 0, lit);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) { mesh(box(0.26, bh, 0.26), dark, c[0] * w / 2, 1 + bh / 2, c[1] * w / 2, lit); });
    mesh(box(w + 1.5, 0.2, w + 1.5), dark, 0, 1 + bh + 0.1, 0, lit);
    let top = 1 + bh + 0.2;
    if (big) { mesh(new T.BoxGeometry(w * 0.58, 2.1, w * 0.58), paper, 0, top + 1.05, 0, lit); mesh(box(w * 0.58 + 1.2, 0.18, w * 0.58 + 1.2), dark, 0, top + 2.2, 0, lit); top += 2.3; }
    const rw = big ? w * 0.62 : w * 0.98;
    const roof = mesh(flat(new T.ConeGeometry(rw, 1.9, 4)), own2(new T.MeshLambertMaterial({ color: 0x9a3328 })), 0, top + 0.95, 0, lit); roof.rotation.y = Math.PI / 4;
    if (LK.snowcaps) { const cap = mesh(flat(new T.ConeGeometry(rw * 0.62, 1.0, 4)), mat(0xc8ccf0), 0, top + 1.5, 0, lit); cap.rotation.y = Math.PI / 4; }
    g.glow = glowSprite(0xffc98a, big ? 12 : 9.5, lit, 0, 1 + bh / 2, 0);
  } else if (s.kind === 'patron') {
    mesh(cyl(4, 4.6, 1.6, 8), stone, 0, 0.8, 0, g); mesh(cyl(2.4, 3.2, 1.6, 8), stone, 0, 2.4, 0, g);
    g.spin = mesh(flat(new T.OctahedronGeometry(3, 0)), paper, 0, 7.2, 0, lit);
    g.halo = mesh(new T.TorusGeometry(4.4, 0.14, 5, 28), new T.MeshBasicMaterial({ color: tc }), 0, 7.2, 0, lit);
    g.glow = glowSprite(tc, 22, lit, 0, 7.2, 0);
  } else { // 0.20 props (js/props.js): a crooked spire of torn tissue clutching a hoard of cold light
    const ht = LL.props.hushTower(T, s, g, lit, { glowSprite: glowSprite, teamCol: tc, LK: LK }); g.glow = ht.glow; paper = ht.paper;
  }
  g.add(lit); g.house = s.team === 0 && s.kind !== 'patron';
  const rub = new T.Group(); mesh(flat(new T.IcosahedronGeometry(1.4, 0)), stone, 0.6, 0.5, 0.3, rub); mesh(flat(new T.IcosahedronGeometry(1, 0)), dark, -0.9, 0.4, -0.5, rub); mesh(box(1.6, 0.4, 1.2), stone, 0, 0.2, 1.1, rub).rotation.y = 0.5; rub.visible = false; g.add(rub);
  const ward = new T.Mesh(new T.CylinderGeometry(s.r + 1.4, s.r + 1.4, s.h + 1, 14, 1, true), new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.13, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
  ward.position.y = (s.h + 1) / 2; g.add(ward);
  const wr = new T.Mesh(new T.RingGeometry(s.r + 1.1, s.r + 1.6, 40), new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  wr.material.userData.lk = true; wr.rotation.x = -Math.PI / 2; wr.position.y = 0.06; wr.visible = false; g.add(wr); g.wardRing = wr;
  if (s.team === 1 && s.kind !== 'patron') { LL.props.hushWard(T, ward); LL.props.hushRuin(T, rub, s, LK); } // 0.20 props: a curtain of cold light for a ward, torn tissue for a ruin
  g.lit = lit; g.rub = rub; g.ward = ward; g.unit = s; g.paper = paper; g.position.set(s.x, 0, s.z); dyn.add(g);
  standFlat(lit, s.team === 0 ? 'house' : 'tower', s.kind === 'patron' ? 2 : (s.kind === 'warden' ? 1 : 0), 14.5, // the sheet draws the three sizes to scale in equal cells, so every cell gets the same height
    function () { return lit.children.filter(function (c) { return c !== g.glow; }).concat(g.children.filter(function (c) { return c.isMesh && c !== ward && c !== wr; })); });
  return g;
}
function strayModel(s) {
  const g = new T.Group(), m = mat(0x5a4a78);
  mesh(flat(new T.IcosahedronGeometry(1.25, 0)), m, 0, 1.4, 0, g);
  const h1 = mesh(flat(new T.ConeGeometry(0.22, 1, 4)), mat(0xf4e8d6), 0.55, 2.6, 0.2, g); h1.rotation.z = -0.4;
  const h2 = mesh(flat(new T.ConeGeometry(0.22, 1, 4)), mat(0xf4e8d6), -0.55, 2.6, 0.2, g); h2.rotation.z = 0.4;
  glowSprite(0xc9a0ff, 0.9, g, 0.4, 1.7, 1.1); glowSprite(0xc9a0ff, 0.9, g, -0.4, 1.7, 1.1);
  g.unit = s; dyn.add(g); return g;
}
function nessModel() {
  const g = new T.Group(), skin = new T.MeshLambertMaterial({ color: 0x27b89e, emissive: 0x128a76, emissiveIntensity: 0.75 }), pale = new T.MeshLambertMaterial({ color: 0xc8f2e0, emissive: 0x6fd8c0, emissiveIntensity: 0.3 });
  const gold = new T.LineBasicMaterial({ color: 0xf2c868, transparent: true, opacity: 0.95 });
  [skin, pale, gold].forEach(function (m) { m.userData.lk = true; m.userData.solid = true; });
  const edged = function (geo, m, x, y, z, parent) { const o = mesh(geo, m, x, y, z, parent); o.add(new T.LineSegments(new T.EdgesGeometry(geo, 8), gold)); return o; };
  [[-1.4, 2.5], [-4.6, 1.8], [-7.1, 1.15]].forEach(function (p) { const m = edged(flat(new T.IcosahedronGeometry(p[1], 0)), skin, 0, 0.15, p[0], g); m.scale.y = 0.8; edged(flat(new T.ConeGeometry(p[1] * 0.35, p[1] * 0.9, 4)), pale, 0, p[1] * 0.85, p[0], g); });
  let parent = g; g.neck = [];
  for (let i = 0; i < 6; i++) {
    const seg = new T.Group(); seg.position.set(0, i === 0 ? 0.5 : 1.15, i === 0 ? 0.8 : 0); seg.baseX = i < 3 ? 0.05 : 0.2; seg.rotation.x = seg.baseX;
    edged(cyl(0.74 - i * 0.07, 0.9 - i * 0.07, 1.35, 5), skin, 0, 0.6, 0, seg); parent.add(seg); parent = seg; g.neck.push(seg);
  }
  const head = new T.Group(); head.position.set(0, 1.35, 0.1); head.rotation.x = -0.5; parent.add(head);
  edged(box(1.15, 0.8, 2), skin, 0, 0.1, 0.55, head); edged(box(0.95, 0.28, 1.5), pale, 0, -0.42, 0.7, head);
  edged(flat(new T.ConeGeometry(0.16, 0.9, 4)), pale, 0.35, 0.8, -0.2, head).rotation.x = -0.5; edged(flat(new T.ConeGeometry(0.16, 0.9, 4)), pale, -0.35, 0.8, -0.2, head).rotation.x = -0.5;
  glowSprite(0x9ff5e0, 1.2, head, 0.5, 0.25, 0.95); glowSprite(0x9ff5e0, 1.2, head, -0.5, 0.25, 0.95);
  glowSprite(0x2fe0c0, 14, g, 0, 2.5, -2);
  g.head = head; g.visible = false; dyn.add(g);
  standFlat(g, 'ness', 0, 9.5, function () { return g.children.slice(); });
  return g;
}
/* Foldlight: mountain creases are dash-dot, valley creases are dashed, never swapped. West is the mountain fold, east the valley fold. */
function buildCreaseArt() {
  const cols = LK.crease || [0xff8a5c, 0x8fb4ff, 0.32];
  C.CREASE_X.forEach(function (cx, i) {
    const pat = i === 0 ? [1.4, 0.6, 0.35, 0.6] : [1.4, 0.9], dashes = [];
    let z = -13, k = 0; while (z < 13) { const len = pat[k % pat.length]; if (k % 2 === 0) dashes.push([z + len / 2, len]); z += len; k++; }
    const im = new T.InstancedMesh(new T.PlaneGeometry(0.34, 1), new T.MeshBasicMaterial({ color: cols[i], transparent: true, opacity: cols[2], side: T.DoubleSide, depthWrite: false }), dashes.length);
    dashes.forEach(function (d, j) { dummy.position.set(cx, 0.11, d[0]); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, d[1], 1); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); });
    dummy.rotation.set(0, 0, 0); own(im); world.add(im);
    // the fold itself: the strip between two threads lifts into a ridge
    const sgn = cx < 0 ? -1 : 1, xa = sgn * 7, xb = sgn * 41, L = 13;
    const pos = new Float32Array([xa, 0, -L, cx, 0, -L, cx, 0, L, xa, 0, -L, cx, 0, L, xa, 0, L, cx, 0, -L, xb, 0, -L, xb, 0, L, cx, 0, -L, xb, 0, L, cx, 0, L]);
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(pos, 3)); rg.computeVertexNormals();
    const ridge = new T.Mesh(rg, new T.MeshLambertMaterial({ color: 0xe9e2d0, side: T.DoubleSide, transparent: true, opacity: 0.62, depthWrite: false })); own(ridge); ridge.visible = false; ridge.frustumCulled = false; dyn.add(ridge);
    // a paper crane marks a crease that is ready
    const crane = new T.Group(), pm = new T.MeshLambertMaterial({ color: 0xf4e8d6, emissive: 0xf4e8d6, emissiveIntensity: 0.45, side: T.DoubleSide }); pm.userData.lk = true; pm.userData.solid = true;
    const tri = function (a, b, c) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(a.concat(b, c)), 3)); g.computeVertexNormals(); return g; };
    mesh(tri([0, 0, 0.9], [0, 0.45, -0.2], [0, -0.1, -0.9]), pm, 0, 0, 0, crane);
    mesh(tri([0, 0.2, 0.9], [0, 0.75, 1.25], [0, 0, 0.6]), pm, 0, 0, 0, crane);
    const wl = new T.Group(), wr = new T.Group(); mesh(tri([0, 0, 0.5], [1.2, 0.1, -0.1], [0, 0, -0.5]), pm, 0, 0, 0, wl); mesh(tri([0, 0, 0.5], [-1.2, 0.1, -0.1], [0, 0, -0.5]), pm, 0, 0, 0, wr);
    wl.position.y = wr.position.y = 0.2; crane.add(wl); crane.add(wr); crane.wl = wl; crane.wr = wr;
    glowSprite(0xffe9a8, 3.2, crane, 0, 0.2, 0); crane.position.set(cx, 2.4, 0); crane.visible = false; dyn.add(crane);
    creaseM.push({ ridge: ridge, crane: crane, f: 0, cx: cx });
  });
}
/* Fruit. Colours are the fruit's own in every look, because the colour is how you tell them apart:
   yellow lemon = quick feet, red rose hips = mending, green lime = sour shots, and the big lime is simply big. */
function buildFruitArt() {
  fruitM.forEach(function (m) { dyn.remove(m); }); fruitM = [];
  const leaf = hm(0x2f5a3a), stem = hm(0x4a3a2a);
  W.fruit.forEach(function (f) {
    const info = C.FRUIT_INFO[f.k], big = !!info.big, g = new T.Group(), fm = hm(info.col, 0.55);
    mesh(flat(new T.IcosahedronGeometry(big ? 1.1 : 0.8, 0)), leaf, 0, big ? 0.6 : 0.45, 0, g).scale.y = 0.6;
    mesh(cyl(0.06, 0.09, big ? 2.2 : 1.3, 4), stem, 0, big ? 1.6 : 1.1, 0, g);
    const fr = new T.Group(); fr.position.y = big ? 3.1 : 1.9; g.add(fr);
    if (f.k === 'hips' || f.k === 'bighips') { if (big) fr.scale.set(1, 1, 1); const hs = big ? 2.6 : 1; [[0, 0, 0], [0.24, -0.1, 0.1], [-0.2, -0.14, -0.12], [0.02, -0.22, 0.2]].forEach(function (p) { mesh(new T.SphereGeometry(0.17 * hs, 8, 6), fm, p[0] * hs, p[1] * hs, p[2] * hs, fr); }); }
    else { const s = mesh(new T.SphereGeometry(big ? 0.95 : 0.34, 12, 8), fm, 0, 0, 0, fr); if (f.k === 'lemon' || f.k === 'biglemon') s.scale.set(1.35, 1, 1); mesh(flat(new T.ConeGeometry(big ? 0.3 : 0.11, big ? 0.5 : 0.2, 4)), leaf, 0, big ? 1.05 : 0.38, 0, fr); }
    const glow = glowSprite(info.col, big ? 9 : 3.4, fr, 0, 0, 0); glow.material.userData.lk = true;
    g.position.set(f.x, 0, f.z); g.fr = fr; g.glow = glow; g.unit = f; g.big = big; dyn.add(g); fruitM.push(g);
  });
}
/* Inkblot cues. They draw what the model already knows (a thief's route, which structures can be hurt). They change nothing. */
function buildCues() {
  cueRings.forEach(function (r) { dyn.remove(r); }); cueRings = [];
  if (cueDash) { dyn.remove(cueDash); cueDash = null; }
  if (!LK.cues && !LK.echo) return;
  cueDash = new T.InstancedMesh(new T.PlaneGeometry(0.28, 1.3), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, fog: false }), 240);
  cueDash.userData.rt = true; cueDash.frustumCulled = false; initColor(cueDash, 240); cueDash.count = 0; cueDash.material.userData.lk = true; dyn.add(cueDash);
  if (LK.cues) W.structs.forEach(function (s) {
    const r = new T.Mesh(new T.RingGeometry(s.r + 1.9, s.r + 2.3, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false, fog: false }));
    r.material.userData.lk = true; r.rotation.x = -Math.PI / 2; r.position.set(s.x, 0.1, s.z); r.unit = s; dyn.add(r); cueRings.push(r);
  });
}
const CUE = { threat: 0x9a7cff, amber: 0xffb347, copper: 0xd9824a };
R._cue = function () { return { dash: cueDash ? { n: cueDash.count, col: cueDash.instanceColor ? Array.from(cueDash.instanceColor.array.slice(0, 6)) : null, mat: cueDash.material.color.getHex(), vis: cueDash.visible, parent: !!cueDash.parent } : null, rings: cueRings.map(function (r) { return [r.visible, r.material.color.getHex(), +r.material.opacity.toFixed(2), !!r.parent]; }).slice(0, 4), look: LK.name }; };
function drawCues() {
  if (!cueDash) return;
  let n = 0;
  if (LK.echo) { // Memory: where the small ones and the hollows were over the last ten seconds
    const samp = time - trailT > 0.5; if (samp) trailT = time;
    const echo = function (u, col) {
      let tr = trails.get(u); if (!tr) { tr = []; trails.set(u, tr); }
      if (samp) { tr.push(u.x, u.z); if (tr.length > 40) tr.splice(0, 2); }
      for (let k = 0; k < tr.length && n < 240; k += 2) {
        const age = 1 - k / 40; dummy.position.set(tr[k], 0.18, tr[k + 1]); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1.6 - age, 0.5 - age * 0.25, 1); dummy.updateMatrix();
        cueDash.setMatrixAt(n, dummy.matrix); cueDash.setColorAt(n++, tmpC.setHex(col));
      }
    };
    for (let i = 0; i < W.thieves.length; i++) if (W.thieves[i].alive) echo(W.thieves[i], 0xfff0d0);
    for (let i = 0; i < W.troopers.length; i++) { const u = W.troopers[i]; if (u.alive && u.big) echo(u, 0x8aa8c0); }
  }
  for (let i = 0; LK.cues && i < W.thieves.length; i++) {
    const t = W.thieves[i]; if (!t.alive) continue;
    let gx = 0, gz = C.PATRON_Z - 6; if (t.state === 0 && t.mark) { gx = t.mark.x; gz = t.mark.z; }
    const dx = gx - t.x, dz = gz - t.z, d = Math.hypot(dx, dz) || 1, yaw = Math.atan2(dx, dz), col = t.state === 1 ? CUE.copper : CUE.threat;
    for (let s = 1.5 + (R.reduced ? 0 : (time * 4) % 2.6); s < d && n < 240; s += 2.6) {
      dummy.position.set(t.x + dx / d * s, 0.16, t.z + dz / d * s); dummy.rotation.set(-Math.PI / 2, 0, -yaw); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      cueDash.setMatrixAt(n, dummy.matrix); cueDash.setColorAt(n++, tmpC.setHex(col));
    }
  }
  dummy.rotation.set(0, 0, 0);
  cueDash.count = n; cueDash.instanceMatrix.needsUpdate = true; if (cueDash.instanceColor) cueDash.instanceColor.needsUpdate = true;
  for (let i = 0; i < cueRings.length; i++) {
    const r = cueRings[i], s = r.unit;
    if (!s.alive) { r.visible = false; continue; }
    if (s.team === 0) { r.visible = true; r.material.color.setHex(s.dark ? CUE.threat : CUE.amber); r.material.opacity = s.dark ? (R.reduced ? 0.9 : 0.55 + Math.sin(time * 6) * 0.35) : 0.5; }
    else { r.visible = S.vuln(s); r.material.color.setHex(CUE.copper); r.material.opacity = 0.75; }
  }
}
function buildDecor() {
  if (R.decor) return;
  R.decor = true;
  const obs = W.obstacles, rocks = obs.filter(o => !o.tree), trees = obs.filter(o => o.tree);
  const rm = LL.props.rocks(T, rocks, LK, dummy); // 0.20 props (js/props.js): faceted boulders, snow or moss baked in (no separate caps)
  world.add(rm); decorPrims = [rm]; decorTrees = trees; decorRocks = rocks; decorHidden = false;
  const tg = cyl(0.3, 0.55, 3, 5); tg.translate(0, 1.5, 0);
  const c1 = flat(new T.ConeGeometry(2.6, 4.2, 6)); c1.translate(0, 4.6, 0);
  const c2 = flat(new T.ConeGeometry(1.9, 3.6, 6)); c2.translate(0, 7.2, 0);
  /* In Cobalt Snow the trees take the painted ridge's night pines (navy and slate) with a few in cherry blossom, as in the
     key art, instead of the palette's magenta. Other views recolour them as before. */
  const night = LK === LOOKS.snow;
  const tm = new T.InstancedMesh(tg, mat(0x3a2a3c), Math.max(1, trees.length));
  const m1 = new T.InstancedMesh(c1, new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, trees.length));
  const m2 = new T.InstancedMesh(c2, new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, trees.length));
  trees.forEach(function (o, i) {
    const sc = 0.85 + o.seed * 0.5;
    dummy.position.set(o.x, 0, o.z); dummy.rotation.set(0, o.seed * 6, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
    tm.setMatrixAt(i, dummy.matrix); m1.setMatrixAt(i, dummy.matrix); m2.setMatrixAt(i, dummy.matrix);
    const rose = o.seed > 0.72;
    if (night) { m1.setColorAt(i, tmpC.setHex(rose ? 0xc0508a : [0x1d2d43, 0x22344d, 0x1a283d][i % 3])); m2.setColorAt(i, tmpC.setHex(rose ? 0xf08ab8 : [0x2c4462, 0x34506f, 0x2a3f5b][i % 3])); }
    else { m1.setColorAt(i, tmpC.setHex(rose ? 0x9a3f4a : 0x24505a)); m2.setColorAt(i, tmpC.setHex(rose ? 0xc4605a : 0x2f6a6a)); }
  });
  if (night) { m1.userData.ilk = m2.userData.ilk = true; } // kept as painted: the Snow palette would turn these red
  world.add(tm); world.add(m1); world.add(m2); [tm, m1, m2].forEach(function (o) { o.userData.tree = true; decorPrims.push(o); });
  if (LK.snowcaps) {
    const cg = flat(new T.ConeGeometry(1.25, 1.7, 6)); cg.translate(0, 8.35, 0);
    const c3 = flat(new T.ConeGeometry(2.0, 0.9, 6)); c3.translate(0, 6.1, 0);
    const cm = new T.InstancedMesh(cg, mat(0xc8ccf0), Math.max(1, trees.length)), cm2 = new T.InstancedMesh(c3, mat(0xc8ccf0), Math.max(1, trees.length));
    trees.forEach(function (o, i) { const sc = 0.85 + o.seed * 0.5; dummy.position.set(o.x, 0, o.z); dummy.rotation.set(0, o.seed * 6, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); cm2.setMatrixAt(i, dummy.matrix); });
    world.add(cm); world.add(cm2); [cm, cm2].forEach(function (o) { o.userData.tree = true; decorPrims.push(o); });
  }
  dummy.rotation.set(0, 0, 0);
}
/* Scenery: blossom and pine trees replace the cones buildDecor made (their geometry is freed; materials are shared). */
function sceneryTrees() {
  decorPrims = decorPrims.filter(function (o) { if (!o.userData.tree) return true; world.remove(o); o.geometry.dispose(); return false; });
  SCN.trees(W, decorTrees).forEach(function (o) { o.userData.tree = true; decorPrims.push(o); });
}
R.build = function (w) {
  W = w;
  heroM.concat(structM, strayM).forEach(function (g) { dyn.remove(g); });
  if (!nessM) nessM = LL.ness ? LL.ness.build(nsx()) : nessModel(); nessY = -11; // 0.26 ness: the creature and the flood (js/ness.js); without it, the painted card
  heroM = W.heroes.map(heroModel); structM = W.structs.map(structModel); strayM = W.strays.map(strayModel);
  const freshDecor = !R.decor;
  buildDecor(); buildCues(); buildFruitArt(); buildPet();
  if (SCN && freshDecor) sceneryTrees();
  if (SCN) SCN.world(W); // scenery: pools of light for this match's structures
  for (let i = 0; i < PN_MAX; i++) { pLife[i] = 0; pPos[i * 3 + 1] = -999; }
  rings.forEach(r => { r.life = 0; r.m.visible = false; });
  if (LL.wardrobe) LL.wardrobe.build(scx()); // 0.23 wardrobe: the player's trail, footfall, ring and light, drawn for this look
  applyLook();
};

/* ---------- fx from the sim ---------- */
function ring(x, y, z, r0, r1, col, life) {
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i]; if (r.life > 0) continue;
    r.life = life; r.t = 0; r.r0 = r0; r.r1 = r1; r.m.visible = true; r.m.position.set(x, y + 0.08, z);
    r.m.ring.material.color.copy(tc(col)); r.m.disc.material.color.copy(tc(col)); return;
  }
}
R.fx = function (e) {
  if (LL.ness) LL.ness.fx(e, W); // 0.26 ness: the tell, the bite, the flood
  switch (e.k) {
    case 'echo': case 'echoend': for (let k = 0; k < 14; k++) emit(e.x, 0.4 + Math.random() * 1.6, e.z, 1, 0x9fd0ff, 2.2, 0.6, 1.5, 0); break;
    case 'echoshot': emit(e.x, e.y, e.z, 2, 0x9fd0ff, 1.5, 0.25, 0, 0); if (echoM && echoM.u) echoM.u.lastShotT = W.t; /* 0.24 heroes3d: the echo raises its aim */ break;
    case 'hit': {
      const col = e.tk === 'hero' ? 0xfff0d0 : (e.tk === 'trooper' ? 0xffc890 : 0xbfd0ff);
      if (e.kind === 'gun') emit(e.x, e.y, e.z, e.crit ? 5 : 2, e.crit ? 0xffe070 : col, 4, 0.3, 1);
      else if (e.kind === 'ab') emit(e.x, e.y, e.z, 6, 0xffffff, 5, 0.4, 2);
      if (e.p === 2) shake = Math.min(0.5, shake + Math.min(0.3, e.amt / 250));
      if (e.p === 1 || dist2cam(e.x, e.z) < 40) hitBits(e); // 0.23 feel
      break;
    }
    case 'shot': {
      const shd = SH && SH.muzzle(e, e.u === W.player); // 0.26 shots: this gun's own muzzle (true) or the generic flash
      if (!shd) emit(e.x, e.y, e.z, 2, e.u.def.col, 2.5, 0.12, 0, 0); // 0.26 shots
      const m = heroM[W.heroes.indexOf(e.u)]; if (m) m.recoil = 1;
      if (!shd) flash(e, e.u === W.player); else if (e.u === W.player) kickSide = Math.random() < 0.5 ? -1 : 1; // 0.26 shots if (e.u === W.player && !R.reduced) kick = Math.min(1.6, kick + (KICK[e.u.def.id] || 0.8)); // 0.23 feel
      break;
    }
    case 'impact': emit(e.x, e.y, e.z, 2, 0xd0c0b0, 3, 0.25, 1.5); bits(e.x, e.y, e.z, 2, 0, 1.4, BIT_DUST); break;
    case 'immune': if (e.u) { const h = e.u.h || 6; ring(e.u.x, h * 0.45, e.u.z, (e.u.r || 2) * 0.9, (e.u.r || 2) * 1.6, 0xbfd8ff, 0.35); emit(e.u.x, h * 0.55, e.u.z, 6, 0xbfd8ff, 2, 0.35, 0, 0); } break;
    case 'cast': { /* 0.21: an ability has a pose (LL.paperMotion.cast); a stomp also shakes dust and grit off the ground around the feet */
      const m = heroM[W.heroes.indexOf(e.u)], a = e.u.def.ab[e.i]; if (!m || !m.rig || R.reduced) break;
      const what = LL.paperMotion.cast(m.rig, e.kind, a && a.ult);
      if (what === 'stomp' && m.paper) { const u = e.u;
        for (let k = 0; k < 16; k++) { const q = k / 16 * 6.283 + Math.random() * 0.25, v = 3.6 + Math.random() * 1.6; puff(u.x + Math.cos(q) * 0.45, 0.14, u.z + Math.sin(q) * 0.45, Math.cos(q) * v, 0.25 + Math.random() * 0.3, Math.sin(q) * v, 0.32, 1.15, 0.7, 0.44); }
        for (let k = 0; k < 10; k++) { const q = Math.random() * 6.283, v = 1.5 + Math.random() * 2.5; puff(u.x + Math.cos(q) * 0.3, 0.12, u.z + Math.sin(q) * 0.3, Math.cos(q) * v, 3 + Math.random() * 2.5, Math.sin(q) * v, 0.08, 0.07, 0.8, 0.9, true); }
        if (u === W.player) shake = Math.max(shake, 0.22); }
      break;
    }
    case 'death': {
      const col = e.team === 2 ? 0xc9a0ff : SRC_TEAM[e.team];
      if (e.kind === 'trooper') { emit(e.x, 1, e.z, e.u && e.u.team === 1 ? 6 : 10, col, 6, 0.7, 3); killBits(e); }
      else if (e.kind === 'hero') { emit(e.x, e.y + 1, e.z, 60, col, 9, 1.2, 4); emit(e.x, e.y + 1, e.z, 30, 0xf4e8d6, 5, 1.6, 5, 4); ring(e.x, 0, e.z, 0.5, 6, col, 0.6); }
      else if (e.kind === 'stray' || e.kind === 'knot') emit(e.x, 1.4, e.z, 30, 0xc9a0ff, 7, 0.9, 3);
      else { emit(e.x, 4, e.z, 160, col, 16, 1.8, 6); emit(e.x, 2, e.z, 80, 0xf4e8d6, 9, 2.2, 8, 5); ring(e.x, 0, e.z, 1, 22, col, 1.1); if (dist2cam(e.x, e.z) < 70) shake = 0.8; }
      break;
    }
    case 'explode': emit(e.x, e.y + 0.3, e.z, 28, e.col || 0xffffff, 9, 0.6, 2); ring(e.x, 0, e.z, 0.4, e.r, e.col || 0xffffff, 0.35); break;
    case 'nova': ring(e.x, e.y, e.z, 0.5, e.r, e.col, 0.4); emit(e.x, e.y + 0.5, e.z, 30, e.col, 12, 0.5, 1); break;
    case 'toll': ring(e.x, 0, e.z, 1, e.r, e.col, 0.6); ring(e.x, 0, e.z, 0.5, e.r * 0.6, 0xffffff, 0.45); emit(e.x, 1.5, e.z, 120, e.col, 18, 1, 3); if (dist2cam(e.x, e.z) < 50) shake = 0.7; break;
    case 'blink': for (let i = 0; i <= 8; i++) emit(U.lerp(e.x0, e.x, i / 8), e.y + 1, U.lerp(e.z0, e.z, i / 8), 4, e.col, 2, 0.5, 0.5, 0); break;
    case 'soul': if (e.kind === 'secured') emit(e.x, e.y, e.z, 16, 0xffe9a8, 5, 0.6, 3, 0); else if (e.kind === 'denied') emit(e.x, e.y, e.z, 16, 0x8a8690, 6, 0.5, 0); break;
    case 'respawn': ring(e.u.x, 0, e.u.z, 3, 0.4, SRC_TEAM[e.u.team], 0.6); emit(e.u.x, 1, e.u.z, 30, 0xf4e8d6, 4, 0.9, 5, 0); break;
    case 'jump': case 'hover': case 'hoverend': airFx(e); break; // 0.25 air: an effect per hero (airFx, after heroDust)
    case 'guard': case 'guarded': case 'guardend': case 'tboost': case 'hatready': case 'hatthrow': case 'hatcut': case 'hatturn': case 'hatback': case 'boon': case 'roll': guardFx(e); break; // 0.26 guard (guardFx, after airDust)
    case 'dash': emit(e.u.x, e.u.y + 0.8, e.u.z, 10, 0xf4e8d6, 3, 0.35, 0, 0); break;
    /* 0.25 rook: Lantern Lift. Sparks and a ring where he leaves the ground, a brighter knot of them where a thread catches
       him, a breath of them when the glide begins, dust and a small ring where he lands. */
    case 'lift': if (!R.reduced) { emit(e.x, e.y + 0.4, e.z, 16, e.col, 5, 0.52, 1.8); for (let k = 0; k < 8; k++) { const q = k / 8 * 6.283; puff(e.x + Math.cos(q) * 0.3, 0.12, e.z + Math.sin(q) * 0.3, Math.cos(q) * 2.6, 0.3, Math.sin(q) * 2.6, 0.26, 0.9, 0.55, 0.4); } } ring(e.x, 0, e.z, 0.4, 2.4, e.col, 0.35); if (e.u === W.player && !R.reduced) kick = Math.min(1.6, kick + 0.5); break;
    case 'liftthread': ring(e.x, e.y + 0.6, e.z, 0.3, 2.2, 0xffe2a0, 0.4); if (!R.reduced) emit(e.x, e.y + 1, e.z, 14, 0xffe2a0, 4, 0.6, 2.5, 0); break;
    case 'glide': if (!R.reduced) emit(e.x, e.y + 1.2, e.z, 8, e.col, 2.5, 0.6, 0.5, 0); break;
    case 'liftland': ring(e.x, 0, e.z, 0.3, 1.7, e.col, 0.28); if (!R.reduced) for (let k = 0; k < 8; k++) { const q = k / 8 * 6.283 + Math.random() * 0.3; puff(e.x + Math.cos(q) * 0.25, 0.12, e.z + Math.sin(q) * 0.25, Math.cos(q) * 2.2, 0.35, Math.sin(q) * 2.2, 0.24, 0.8, 0.5, 0.4); } break;
    case 'level': ring(e.u.x, e.u.y, e.u.z, 0.4, 3, 0xffe9a8, 0.5); break;
    case 'fruit': { const fc = C.FRUIT_INFO[e.kind].col, big = !!C.FRUIT_INFO[e.kind].big; emit(e.x, big ? 3 : 1.8, e.z, big ? 90 : 26, fc, big ? 11 : 6, 0.9, 4, 3); ring(e.x, 0.05, e.z, 0.4, big ? 12 : 3.5, fc, big ? 0.8 : 0.45); break; }
    case 'moodsolved': if (W.player) { ring(W.player.x, 0.05, W.player.z, 1, 30, 0xffe9a8, 1.2); emit(W.player.x, 2, W.player.z, 60, 0xffe9a8, 9, 1.2, 5, 2); } break;
    case 'fruitripe': if (e.lens && e.lens === W.lens) ring(e.x, 0.05, e.z, 6, 0.6, C.FRUIT_INFO.biglime.col, 1.0); break;
    case 'slam': ring(e.x, 0.05, e.z, 0.4, 3.2, 0xb8a0ff, 0.3); emit(e.x, 0.5, e.z, 8, 0xb8a0ff, 5, 0.4, 2); break;
    case 'theft': emit(e.u.x, e.u.y + 1.2, e.u.z, 26, 0xffe9a8, 6, 0.8, 3); if (e.p) shake = Math.max(shake, 0.4); break;
    case 'snuff': emit(e.u.x, e.u.h * 0.6, e.u.z, 50, 0x8a78c8, 8, 1, 2); ring(e.u.x, 0.05, e.u.z, 6, 0.5, 0x8a78c8, 0.7); break;
    case 'thiefdown': emit(e.x, 1, e.z, 34, 0xffe9a8, 7, 0.9, 4, 3); break;
    case 'lastbreath': ring(e.x, e.y + 0.05, e.z, 0.5, 7.5, 0xffffff, 0.45); emit(e.x, e.y + 1, e.z, 30, 0xfff0d0, 9, 0.5, 1); break;
    case 'relit': emit(e.u.x, e.u.h * 0.6, e.u.z, 30, 0xffd28a, 5, 0.9, 3, 0); break;
    case 'fold': ring(e.x, 0.05, e.z, 1, 26, 0xf4e8d6, 1.1); for (let k = -12; k <= 12; k += 2) emit(e.x, 0.4, k, 8, 0xf4e8d6, 5, 1.1, 6, 4); if (dist2cam(e.x, e.z) < 80) shake = 0.5; break;
    case 'nessup': ring(e.x, 0.05, e.z, 1, 13, 0x7fe0ff, 1.3); emit(e.x, 0.6, e.z, 110, 0x9fe8ff, 11, 1.5, 11); if (dist2cam(e.x, e.z) < 70) shake = 0.6; break;
    case 'nessdown': ring(e.x, 0.05, e.z, 1, 24, 0xffe08a, 1.4); emit(e.x, 4, e.z, 220, 0xffe08a, 15, 2, 8, 4); emit(e.x, 1, e.z, 90, 0x9fe8ff, 10, 1.5, 9); if (dist2cam(e.x, e.z) < 70) shake = 0.8; break;
    case 'nessspit': emit(e.x, 6.4, e.z, 8, 0x9fe8ff, 3, 0.4, 0, 0); break;
    case 'zip': emit(e.u.x, e.u.y + 2, e.u.z, 10, 0xffe2a0, 3, 0.4, 2, 0); break;
  }
};
/* A small bloom: bright pass at quarter size, two blurs, added back. Lanterns should glow. */
let rtScene = null, rtA = null, rtB = null, qScene = null, qCam = null, quad = null, mBright, mBlur, mComp, bloomOK = true;
function sizeBloom() {
  if (!bloomOK || !renderer) return;
  try {
    if (!qScene) {
      qCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); qScene = new T.Scene(); quad = new T.Mesh(new T.PlaneGeometry(2, 2), null); quad.frustumCulled = false; qScene.add(quad);
      const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', o = { depthTest: false, depthWrite: false };
      mBright = new T.ShaderMaterial(Object.assign({ uniforms: { t: { value: null }, th: { value: 0.74 } }, vertexShader: vs, fragmentShader: 'uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(th, th + 0.3, l), 1.0); }' }, o));
      mBlur = new T.ShaderMaterial(Object.assign({ uniforms: { t: { value: null }, d: { value: new T.Vector2() } }, vertexShader: vs, fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227; c += (texture2D(t, vUv + d * 1.385).rgb + texture2D(t, vUv - d * 1.385).rgb) * 0.316; c += (texture2D(t, vUv + d * 3.231).rgb + texture2D(t, vUv - d * 3.231).rgb) * 0.0703; gl_FragColor = vec4(c, 1.0); }' }, o));
      /* The last pass also DRAWS each view its own way, so a view is a way of drawing and not only a palette. m picks the hand:
         0 painted (Snow), 1 ink: three tones, hatching, heavy line on paper (Skeptic Noir), 2 origami: flat posterised paper with
         drawn folds, 3 bedtime book: watercolour wash inside a deckled page (Storeybrook), 4 zine neon: split channels, line
         glow, scanlines, halftone (Hypermetapunk), 5 lantern: pools of light in the dark (Depthfield night), 6 memory: sepia
         ledger with a double exposure, 7 rainwake: wet glass and red streaks.
         0.20: hand 0 (Snow, the default) gets a film grade: a diorama blur toward the top and bottom of the frame (the play
         band in the middle stays sharp), saturation up, violet lifted into the shadows, warm highlights, a soft S-curve,
         vignette and a little grain, after the key art. */
      mComp = new T.ShaderMaterial(Object.assign({ uniforms: { t: { value: null }, b: { value: null }, k: { value: 0.8 }, m: { value: 0 }, tm: { value: 0 }, px: { value: new T.Vector2(1, 1) } }, vertexShader: vs, fragmentShader: ' uniform sampler2D t; uniform sampler2D b; uniform float k; uniform float m; uniform float tm; uniform vec2 px; varying vec2 vUv; float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); } float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); } float edge(vec2 uv, float w){   vec2 d = px * w;   float a = lum(texture2D(t, uv + vec2(-d.x, -d.y)).rgb), bb = lum(texture2D(t, uv + vec2(0.0, -d.y)).rgb), c = lum(texture2D(t, uv + vec2(d.x, -d.y)).rgb);   float e = lum(texture2D(t, uv + vec2(-d.x, 0.0)).rgb), g = lum(texture2D(t, uv + vec2(d.x, 0.0)).rgb);   float h = lum(texture2D(t, uv + vec2(-d.x, d.y)).rgb), i = lum(texture2D(t, uv + vec2(0.0, d.y)).rgb), j = lum(texture2D(t, uv + vec2(d.x, d.y)).rgb);   float gx = -a - 2.0 * e - h + c + 2.0 * g + j, gy = -a - 2.0 * bb - c + h + 2.0 * i + j; return sqrt(gx * gx + gy * gy); } void main(){   vec2 uv = vUv; vec2 fc = vUv / px; vec2 q = vUv - 0.5; float vig = dot(q, q);   if (m > 6.5) { uv.x += (noise(vec2(uv.x * 60.0, uv.y * 8.0 + tm * 3.0)) - 0.5) * 0.004; uv.y += (noise(uv * 40.0 + tm) - 0.5) * 0.003; }   vec3 c = texture2D(t, uv).rgb + texture2D(b, uv).rgb * k;   if (m < 0.5) {     float band = smoothstep(0.27, 0.5, abs(vUv.y - 0.5));     if (band > 0.01) { vec3 acc = c; float r = band * 7.0;       acc += texture2D(t, uv + vec2( 0.9,  0.2) * px * r).rgb; acc += texture2D(t, uv + vec2(-0.7,  0.6) * px * r).rgb;       acc += texture2D(t, uv + vec2( 0.1, -0.95) * px * r).rgb; acc += texture2D(t, uv + vec2(-0.5, -0.5) * px * r).rgb;       acc += texture2D(t, uv + vec2( 0.45, 0.85) * px * r * 0.6).rgb; acc += texture2D(t, uv + vec2(-0.95, -0.1) * px * r * 0.6).rgb;       acc += texture2D(t, uv + vec2( 0.6, -0.6) * px * r * 0.5).rgb; acc += texture2D(t, uv + vec2(-0.2,  0.4) * px * r * 0.4).rgb;       c = mix(c, acc / 9.0 + texture2D(b, uv).rgb * k * (8.0 / 9.0), band); }     float l = lum(c);     c = max(mix(vec3(l), c, 1.2), 0.0);     c += vec3(0.075, 0.035, 0.15) * (1.0 - smoothstep(0.0, 0.42, l));     c *= mix(vec3(1.0), vec3(1.07, 0.97, 0.86), smoothstep(0.42, 1.0, l));     vec3 cc = clamp(c, 0.0, 1.0); c = mix(c, cc * cc * (3.0 - 2.0 * cc), 0.3);     c *= 1.0 - smoothstep(0.08, 0.5, vig) * 0.42;     c += (hash(fc + fract(tm * 7.0) * 91.0) - 0.5) * 0.022;   }   else if (m < 1.5) {     float l = lum(c); float e = smoothstep(0.16, 0.45, edge(uv, 1.5));     float h1 = step(0.5, fract((fc.x + fc.y) / 7.0)), h2 = step(0.5, fract((fc.x - fc.y) / 7.0));     float tone = 0.07; if (l > 0.52) tone = 1.0; else if (l > 0.3) tone = mix(0.6, 1.0, h1); else if (l > 0.13) tone = mix(0.22, 0.7, h1 * h2);     vec3 paper = vec3(0.93, 0.90, 0.84) * (0.93 + 0.07 * noise(fc * 0.7));     vec3 tint = clamp(c / max(l, 0.08), 0.0, 2.0);     c = paper * tone * mix(vec3(1.0), tint, 0.42);     c = mix(c, vec3(0.06, 0.05, 0.09), e);   } else if (m < 2.5) {     float e = smoothstep(0.10, 0.30, edge(uv, 1.0));     c = floor(c * 5.0 + 0.5) / 5.0; c *= 0.955 + 0.045 * noise(fc * 0.5);     c = mix(c, c * 0.42, e);   } else if (m < 3.5) {     float e = smoothstep(0.22, 0.55, edge(uv, 2.0));     c = mix(c, floor(c * 7.0 + 0.5) / 7.0, 0.45); c += (noise(fc * 0.22) - 0.5) * 0.05; c = mix(c, c * 0.55, e * 0.65);     float r = length(q * vec2(1.0, 1.12)), dk = (noise(vec2(atan(q.y, q.x) * 7.0, 3.0)) - 0.5) * 0.035;     float page = smoothstep(0.585 + dk, 0.615 + dk, r);     c = mix(c, vec3(0.95, 0.92, 0.84) * (0.94 + 0.06 * noise(fc * 0.6)), page);     c = mix(c, vec3(0.35, 0.27, 0.2), page * (1.0 - smoothstep(0.615 + dk, 0.63 + dk, r)) * 0.6);   } else if (m < 4.5) {     float e = edge(uv, 1.2), off = 0.003;     vec3 ca = vec3(texture2D(t, uv + vec2(off, 0.0)).r, c.g, texture2D(t, uv - vec2(off, 0.0)).b);     c = ca * 0.55 + clamp(c / max(lum(c), 0.1), 0.0, 2.5) * smoothstep(0.15, 0.7, e) * 0.9;     c *= 0.82 + 0.18 * step(0.5, fract(fc.y / 3.0));     float dots = smoothstep(0.35, 0.45, length(fract(fc / 7.0) - 0.5)); c = mix(c, c * 0.7, (1.0 - dots) * smoothstep(0.25, 0.0, lum(c)));   } else if (m < 5.5) {     float l = lum(c); c *= smoothstep(-0.05, 0.45, l) * 1.2; c = mix(c, c * vec3(1.12, 0.9, 0.66), 0.45);     c *= clamp(1.0 - vig * 1.9, 0.0, 1.0); c += texture2D(b, uv).rgb * 0.55;   } else if (m < 6.5) {     c = mix(c, texture2D(t, uv + vec2(0.007, 0.004)).rgb, 0.32);     float l = lum(c); c = mix(vec3(l) * vec3(1.08, 0.96, 0.78), c, 0.22);     c *= 0.9 + 0.1 * step(0.07, fract(fc.y / 30.0)); c += (hash(fc + tm) - 0.5) * 0.07; c *= clamp(1.0 - vig * 1.3, 0.0, 1.0);   } else {     float s = step(0.988, hash(vec2(floor(fc.x / 2.0), floor((fc.y + tm * 900.0) / 46.0))));     c += vec3(0.55, 0.18, 0.18) * s * 0.5; c = mix(c, c * vec3(1.15, 0.78, 0.8), 0.4); c *= clamp(1.0 - vig, 0.0, 1.0);   }   gl_FragColor = vec4(c, 1.0); }' }, o));
    }
    [rtScene, rtA, rtB].forEach(function (r) { if (r) r.dispose(); });
    const pr = renderer.getPixelRatio(), w = Math.max(4, Math.floor(R.w * pr)), h = Math.max(4, Math.floor(R.h * pr));
    rtScene = (renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget) ? new T.WebGLMultisampleRenderTarget(w, h) : new T.WebGLRenderTarget(w, h);
    const q = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false };
    rtA = new T.WebGLRenderTarget(w >> 2, h >> 2, q); rtB = new T.WebGLRenderTarget(w >> 2, h >> 2, q);
  } catch (e) { bloomOK = false; }
}
function draw() {
  const fx = !R.low && bloomOK && rtScene, k = fx ? (LK.bloom || 0) : 0, post = fx && !R.noPost ? (LK.post || 0) : 0;
  if (k <= 0 && !post) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  mComp.uniforms.m.value = post; mComp.uniforms.tm.value = time % 1000; mComp.uniforms.px.value.set(1 / rtScene.width, 1 / rtScene.height);
  if (k <= 0) { quad.material = mComp; mComp.uniforms.t.value = rtScene.texture; mComp.uniforms.b.value = rtA.texture; mComp.uniforms.k.value = 0; renderer.setRenderTarget(null); renderer.render(qScene, qCam); return; }
  quad.material = mBright; mBright.uniforms.t.value = rtScene.texture; renderer.setRenderTarget(rtA); renderer.render(qScene, qCam);
  quad.material = mBlur;
  for (let i = 0; i < 2; i++) {
    mBlur.uniforms.t.value = rtA.texture; mBlur.uniforms.d.value.set((1 + i) / rtA.width, 0); renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
    mBlur.uniforms.t.value = rtB.texture; mBlur.uniforms.d.value.set(0, (1 + i) / rtA.height); renderer.setRenderTarget(rtA); renderer.render(qScene, qCam);
  }
  quad.material = mComp; mComp.uniforms.t.value = rtScene.texture; mComp.uniforms.b.value = rtA.texture; mComp.uniforms.k.value = k;
  renderer.setRenderTarget(null); renderer.render(qScene, qCam);
}
function dist2cam(x, z) { return Math.hypot(x - camPos.x, z - camPos.z); }

/* ---------- camera ---------- */
R.camPose = function (h, yaw, pitch, zoom, out) {
  const cp = Math.cos(pitch), fx = Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = Math.cos(yaw) * cp;
  const rx = -Math.cos(yaw), rz = Math.sin(yaw);
  const px = h.x, py = (W && h === W.player && pivotY != null ? pivotY : h.y) + 1.65, pz = h.z; // the follow height is smoothed in R.frame
  const dist = U.lerp(R.portrait ? 6.4 : 5.4, 3.3, zoom), side = 0.85 * (1 - zoom * 0.3);
  let cx = px - fx * dist + rx * side, cy = py - fy * dist + 0.35, cz = pz - fz * dist + rz * side;
  if (cy < 0.35) cy = 0.35;
  let bt = 1; const obs = W.obstacles;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i]; if (Math.abs(o.x - px) > 9 || Math.abs(o.z - pz) > 9) continue;
    const t = S.segCyl(px, py, pz, cx, cy, cz, o.x, o.z, o.r + 0.3, -1, o.h + 0.3); if (t >= 0 && t < bt) bt = t;
  }
  for (let i = 0; i < W.structs.length; i++) {
    const o = W.structs[i]; if (!o.alive || Math.abs(o.x - px) > 12 || Math.abs(o.z - pz) > 12) continue;
    const t = S.segCyl(px, py, pz, cx, cy, cz, o.x, o.z, o.r + 0.3, -1, o.h); if (t >= 0 && t < bt) bt = t;
  }
  if (W && h === W.player) { R._btRaw = bt; if (bt > camBtS) bt = camBtS; } // pulled in at once by a wall, eased back out in R.frame
  if (bt < 1) { bt = Math.max(0.12, bt - 0.06); cx = px + (cx - px) * bt; cy = py + (cy - py) * bt; cz = pz + (cz - pz) * bt; }
  out.x = cx; out.y = cy; out.z = cz; out.dx = fx; out.dy = fy; out.dz = fz; out.dist = dist * bt; return out;
};
R.project = function (x, y, z, out) {
  v1.set(x, y, z).project(camera);
  out.vis = v1.z < 1 && v1.z > -1 && Math.abs(v1.x) < 1.1 && Math.abs(v1.y) < 1.1;
  out.x = (v1.x * 0.5 + 0.5) * R.w; out.y = (-v1.y * 0.5 + 0.5) * R.h; return out;
};
R.shake = function (a) { shake = Math.max(shake, a); };

/* ---------- frame ---------- */
const cp = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1, dist: 5 }, scr = { r: 0, f: 0 }, bq = {};
/* DUST AND AFTERIMAGES (0.20). Soft puffs where a foot comes down, a ring of them on landing, a burst when a dash starts;
   pale fading copies of the figure while dashing or riding a thread. Puffs are normal-blended (dust is not light), so
   they are their own little instanced system with a fade per puff, not the glow particles. */
const PUFF_N = 72; let puffM = null, puffA = null, puffC = null, puffs = [], puffK = 0, ghosts = [], ghostK = 0;
function buildPuffs() {
  puffs = []; ghosts = []; puffK = ghostK = 0;
  const g = new T.PlaneGeometry(1, 1); puffA = new T.InstancedBufferAttribute(new Float32Array(PUFF_N), 1); puffC = new T.InstancedBufferAttribute(new Float32Array(PUFF_N * 3), 3);
  g.setAttribute('aA', puffA); g.setAttribute('aC', puffC);
  const mtl = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: {},
    vertexShader: 'attribute float aA; attribute vec3 aC; varying float vA; varying vec3 vC; varying vec2 vU; void main(){ vU = uv; vA = aA; vC = aC; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }',
    fragmentShader: 'varying float vA; varying vec3 vC; varying vec2 vU; void main(){ vec2 q = vU - 0.5; float r = length(q) * 2.0; float a = smoothstep(1.0, 0.1, r * (0.9 + 0.1 * sin(atan(q.y, q.x) * 3.0 + vA * 7.0))) * vA; if (a < 0.004) discard; gl_FragColor = vec4(vC, a); }' });
  mtl.userData.lk = mtl.userData.bl = mtl.userData.solid = true;
  puffM = new T.InstancedMesh(g, mtl, PUFF_N); puffM.frustumCulled = false; puffM.count = 0; puffM.userData.rt = true; puffM.renderOrder = 3; dyn.add(puffM);
  for (let i = 0; i < PUFF_N; i++) puffs.push({ life: 0, t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s0: 0, s1: 0, a: 0 });
}
function puffCol() { const G = LK.ground; return tmpC.setHex(LK === LOOKS.snow ? 0xdfe0ff : (LK === LOOKS.origami ? 0xb8ab94 : G.laneC)).lerp(new T.Color(0xffffff), LK === LOOKS.snow ? 0 : 0.35); }
/* grit (0.21): a small dark chip of the ground that falls back and skids instead of drifting up. */
function puff(x, y, z, vx, vy, vz, s0, s1, life, a, grit) {
  if (!puffM) return; const p = puffs[puffK]; puffK = (puffK + 1) % PUFF_N;
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = s0; p.s1 = s1; p.life = life; p.t = 0; p.a = a; puffCol(); if (grit) tmpC.multiplyScalar(0.42); p.r = tmpC.r; p.g = tmpC.g; p.b = tmpC.b; p.grit = !!grit;
}
function stepPuffs(dt) {
  if (!puffM) return; let n = 0;
  for (let i = 0; i < PUFF_N; i++) { const p = puffs[i]; if (p.life <= 0) continue; p.t += dt; const f = p.t / p.life; if (f >= 1) { p.life = 0; continue; }
    if (p.grit) { p.vy -= 13 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.04) { p.y = 0.04; p.vy *= -0.25; p.vx *= 0.55; p.vz *= 0.55; } }
    else { const dmp = Math.exp(-dt * 4); p.vx *= dmp; p.vz *= dmp; p.vy = p.vy * dmp + 0.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    const sc = p.s0 + (p.s1 - p.s0) * (1 - (1 - f) * (1 - f)); dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
    puffM.setMatrixAt(n, dummy.matrix); puffA.setX(n, p.a * Math.pow(1 - f, 1.6) * Math.min(1, p.t * 14)); puffC.setXYZ(n, p.r, p.g, p.b); n++; }
  puffM.count = n; puffM.instanceMatrix.needsUpdate = true; puffA.needsUpdate = true; puffC.needsUpdate = true;
}
function heroDust(m, h, st, dt) {
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  /* 0.21: a heavy foot (st.plant) throws more dust, wider and lower, and flicks a few chips of grit up and back. */
  if (st.contact && h.onGround && !h.zip) { const sd = st.contact === 1 ? 1 : -1, sp = Math.hypot(h.vx, h.vz), pl = st.plant || 0, ff = m.fig ? m.fig.feet[sd > 0 ? 0 : 1] : null, fx0 = ff ? ff.x : h.x - fx * 0.15 + fz * 0.18 * sd, fz0 = ff ? ff.z : h.z - fz * 0.15 - fx * 0.18 * sd; // 0.24 heroes3d: under the foot that landed
    for (let k = 0; k < 2 + Math.round(pl * 2); k++) puff(fx0 + (Math.random() - 0.5) * (0.2 + pl * 0.25), 0.12, fz0 + (Math.random() - 0.5) * (0.2 + pl * 0.25), -h.vx * 0.12 + (Math.random() - 0.5) * (0.5 + pl * 0.9), 0.35 + Math.random() * 0.3 - pl * 0.12, -h.vz * 0.12 + (Math.random() - 0.5) * (0.5 + pl * 0.9), 0.22 + pl * 0.06, 0.6 + sp * 0.03 + pl * 0.3, 0.5 + pl * 0.15, 0.34 + pl * 0.06);
    for (let k = 0; k < Math.round(pl * 3); k++) { const a = Math.random() * 6.283; puff(fx0, 0.1, fz0, -h.vx * 0.25 + Math.cos(a) * 1.3, 2.2 + Math.random() * 1.6, -h.vz * 0.25 + Math.sin(a) * 1.3, 0.07, 0.06, 0.55, 0.85, true); } }
  if (st.landed) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283 + Math.random() * 0.3, v = 2.4 + st.landed * 2.2; puff(h.x + Math.cos(a) * 0.35, 0.12, h.z + Math.sin(a) * 0.35, Math.cos(a) * v, 0.3 + Math.random() * 0.3, Math.sin(a) * v, 0.3, 1.0, 0.62, 0.42); }
  if (h.dashT > 0 && !m.dashing) for (let k = 0; k < 7; k++) puff(h.x - fx * 0.4 + (Math.random() - 0.5) * 0.6, 0.2 + Math.random() * 0.4, h.z - fz * 0.4 + (Math.random() - 0.5) * 0.6, -fx * (2 + Math.random() * 2), 0.4, -fz * (2 + Math.random() * 2), 0.35, 1.2, 0.55, 0.4);
  m.dashing = h.dashT > 0;
  if (h.hoverT > 0) airDust(m, h, dt); // 0.25 air: the hover's trail
  // afterimages: a copy of the full painted figure every 35 ms while dashing or riding
  const P = PAPER[h.def.id], pt = paperTex[h.def.id];
  if ((h.dashT > 0 || h.zip) && m.fig) { m.ghostT = (m.ghostT || 0) - dt; if (m.ghostT <= 0) { m.ghostT = 0.035; const gh = LL.heroes3d.ghost(m.fig, dyn, LK.team[h.team], LK.add); if (LL.wardrobe) LL.wardrobe.ghost(gh, h, LK.add); } } // 0.24 heroes3d: the figure's afterimage
  if ((h.dashT > 0 || h.zip) && P && pt && m.paper) { m.ghostT = (m.ghostT || 0) - dt; if (m.ghostT <= 0) { m.ghostT = 0.035; ghost(m, h, P, pt); } }
}
/* 0.25 AIR. A small effect for each hero's air move, from the pools that exist (particles, dust puffs and grit, rings):
   any jump kicks a little dust off the ground; Dora's lifts warm motes off her lantern and a faint ring of its light;
   Anna's second jump is a rock-hop (grit bursting from under her boots, a puff and a ring of dust at her feet in the air,
   as if she kicked off a stone that is not there); the Skein Doll's second jump sheds copper and mint yarn in a ring;
   Myra's hover opens with a shimmer of lilac motes off her wings, trails a few while it lasts (airDust, from heroDust) and
   lets some fall when it ends. Reduced motion: only the small puff a second jump always had. */
const AIRV = { x: 0, y: 0, z: 0 };
function airAt(h, bone, lx, ly, lz) { // a point on the hero: a bone of its figure if it has one, else an offset from its feet (x left, z forward)
  const m = heroM[W.heroes.indexOf(h)];
  if (m && m.fig && m.fig.b[bone] && v1) { m.fig.b[bone].getWorldPosition(v1); AIRV.x = v1.x; AIRV.y = v1.y; AIRV.z = v1.z; return AIRV; }
  const c = Math.cos(h.yaw || 0), s = Math.sin(h.yaw || 0); AIRV.x = h.x + lx * c + lz * s; AIRV.y = h.y + ly; AIRV.z = h.z - lx * s + lz * c; return AIRV;
}
function airFx(e) {
  const h = e.u; if (!h || !h.def || !h.alive) return; const id = h.def.id, x = h.x, y = h.y, z = h.z;
  if (R.reduced) { if (e.k === 'jump' && e.dbl) emit(x, y, z, 8, 0xf4e8d6, 3, 0.35, -1, 0); return; }
  if (e.k === 'jump' && !e.dbl) {
    if (y < 0.6) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + Math.random(); puff(x + Math.cos(a) * 0.25, 0.1, z + Math.sin(a) * 0.25, Math.cos(a) * 1.4 + h.vx * 0.1, 0.25, Math.sin(a) * 1.4 + h.vz * 0.1, 0.22, 0.75, 0.45, 0.3); }
    if (id === 'dora') { const L = airAt(h, 'lant', -0.3, 0.75, 0.05); for (let k = 0; k < 5; k++) emit(L.x, L.y - 0.1, L.z, 1, 0x6a4a1c, 0.7, 0.8, 1.3, -0.5); ring(x, y, z, 0.25, 1.1, 0xffc46b, 0.35); }
    return;
  }
  if (e.k === 'jump') {
    if (id === 'anna') { // a rock-hop: grit from under the boots, a puff and a ring of dust where the kick met nothing
      const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
      for (let k = 0; k < 9; k++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 1.6; puff(x - fx * 0.2, y + 0.05, z - fz * 0.2, Math.cos(a) * v - fx * 1.2, -0.5 - Math.random() * 1.5, Math.sin(a) * v - fz * 1.2, 0.075, 0.06, 0.8, 0.9, true); }
      for (let k = 0; k < 4; k++) puff(x - fx * 0.2 + (Math.random() - 0.5) * 0.3, y + 0.05, z - fz * 0.2 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 1.2, -0.4, (Math.random() - 0.5) * 1.2, 0.25, 0.85, 0.5, 0.38);
      ring(x, y - 0.06, z, 0.2, 1.0, 0xd8c8a8, 0.3);
    } else if (id === 'skein') { // yarn: copper and mint strands flung round her
      for (let k = 0; k < 6; k++) emit(x, y + 1.7, z, 1, k % 3 ? 0x3a2214 : 0x1c3024, 3.6, 0.45, 0.4, 5); // from her yarn; dark, because the particles are additive and bloom
      ring(x, y + 0.85, z, 0.3, 1.2, 0xe0955f, 0.3);
    } else emit(x, y, z, 8, 0xf4e8d6, 3, 0.35, -1, 0);
  } else if (e.k === 'hover') { // the wings open: a shimmer off each
    const c = Math.cos(h.yaw || 0), sn = Math.sin(h.yaw || 0);
    for (let s = -1; s <= 1; s += 2) { const P = airAt(h, s > 0 ? 'wingL' : 'wingR', s * 0.4, 1.0, -0.3); for (let k = 0; k < 2; k++) emit(P.x + c * s * 0.35, P.y, P.z - sn * s * 0.35, 1, k ? 0x3a2850 : 0x48283e, 1.4, 0.55, 0.2, 1.2); } // out at the wingtips, dim: additive, it blooms
    ring(x, y + 0.05, z, 0.3, 1.2, 0x8a70a8, 0.35);
  } else if (e.k === 'hoverend') { const c = Math.cos(h.yaw || 0), sn = Math.sin(h.yaw || 0); for (let s = -1; s <= 1; s += 2) emit(x + c * s * 0.6, y + 1.0, z - sn * s * 0.6, 1, 0x3a2850, 0.6, 0.6, 0, 2.5); }
}
function airDust(m, h, dt) { // while hovering: lilac motes shaken off the wings, about 5 a second (additive: dark colours glow softly)
  m.airAcc = (m.airAcc || 0) + dt * 5;
  while (m.airAcc >= 1) { m.airAcc -= 1; const s = Math.random() < 0.5 ? 1 : -1, P = airAt(h, s > 0 ? 'wingL' : 'wingR', s * 0.4, 1.0, -0.3);
    const c = Math.cos(h.yaw || 0), sn = Math.sin(h.yaw || 0); emit(P.x + c * s * 0.3 + (Math.random() - 0.5) * 0.2, P.y + (Math.random() - 0.5) * 0.2, P.z - sn * s * 0.3 + (Math.random() - 0.5) * 0.2, 1, Math.random() < 0.5 ? 0x3a2850 : 0x48283e, 0.5, 0.8, -0.4, 0.6); }
}
/* 0.26 GUARD. Effects for the guards, thread boosts, Dora's hat, Myra's boon and Rook's roll, from the pools that exist
   (particles, puffs, rings); the figure's own pieces are in heroes3d.js, which gets each event too (H3.guardEvent). Colours
   are dim on purpose: the particles are additive and bloom.
   - guard: the aegis rings bronze at her chest; the bubble opens with a ring at her feet and a few violet motes; the fray
     sheds mint. guarded: a block throws bronze sparks where the hit met the shield (a melee block shakes the camera a hair
     for the player); a soak is a soft gold glint on the bubble; a pass is a few thread motes going on through. guardend:
     the bubble pops in gold and blue.
   - tboost: a pull of light from the thread up to the hero (a rising column of motes, a ring on the thread, a few motes
     running on along it); while it lasts, motes at the feet. The hat: gold where it leaves, a light along its path, cuts
     that spark, a glint where it turns and where it lands. boon: a lilac ring as wide as its reach and rose motes rising off
     everyone it mended. roll: a puff to the side he rolls from.
   Reduced motion: the rings and a few motes, nothing that travels. Lighter graphics: fewer motes. */
function guardFx(e) {
  const h = e.u, m = h ? heroM[W.heroes.indexOf(h)] : null, red = R.reduced, n = R.low ? 0.5 : 1;
  if (m && m.fig && LL.heroes3d && LL.heroes3d.guardEvent) LL.heroes3d.guardEvent(m.fig, e);
  if (!h || !h.def) return;
  const fx0 = Math.sin(h.yaw || 0), fz0 = Math.cos(h.yaw || 0);
  switch (e.k) {
    case 'guard':
      if (e.kind === 'aegis') { ring(h.x, h.y + 0.9, h.z, 0.3, 1.3, 0xffd27a, 0.3); if (!red) emit(h.x + fx0 * 0.5, h.y + 1.25, h.z + fz0 * 0.5, Math.round(8 * n), 0x8a6a30, 2.4, 0.35, 0.5, 2); }
      else if (e.kind === 'bubble') { ring(h.x, h.y + 0.05, h.z, 0.4, 1.6, 0xffc46b, 0.4); if (!red) emit(h.x, h.y + 1.2, h.z, Math.round(14 * n), 0x4a3c7a, 2.6, 0.6, 0.6, 0); }
      else if (e.kind === 'fray' && !red) emit(h.x, h.y + 1.1, h.z, Math.round(12 * n), 0x24584a, 3, 0.5, 0.4, 0);
      break;
    case 'guarded':
      if (e.how === 'block') { emit(e.x, e.y, e.z, Math.round((red ? 4 : 14) * n), 0x9a6a28, red ? 1.5 : 6.5, 0.3, 1, 9); if (!red) emit(e.x, e.y, e.z, 3, 0xd8b070, 2, 0.15, 0, 0); if (e.melee && h === W.player && !red) shake = Math.max(shake, 0.25); }
      else if (e.how === 'absorb') emit(e.x, e.y, e.z, Math.round((red ? 3 : 8) * n), 0x8a7040, red ? 0.6 : 1.8, 0.45, 0.2, 0);
      else if (!red) { for (let k = 0; k < 5 * n; k++) emit(h.x + (Math.random() - 0.5) * 0.6, h.y + 0.6 + Math.random() * 1.2, h.z + (Math.random() - 0.5) * 0.6, 1, e.how === 'roll' ? 0x3a4a4a : (k % 2 ? 0x2a5a48 : 0x5a3a24), 1.6, 0.4, 0.2, 0); }
      break;
    case 'guardend':
      if (e.kind === 'bubble') { ring(h.x, h.y + 1.0, h.z, 0.8, 2.2, 0xffe0a0, 0.3); if (!red) { emit(h.x, h.y + 1.2, h.z, Math.round(24 * n), 0x8a7040, 4.5, 0.5, 0.3, 0); emit(h.x, h.y + 1.2, h.z, Math.round(12 * n), 0x303c7a, 3.5, 0.6, 0.3, 0); } }
      break;
    case 'tboost': {
      ring(e.tx, 0.02, e.tz, 0.3, 2.1, 0xffe2a0, 0.45); if (red) break;
      for (let k = 0; k <= 16 * n; k++) { const q = k / (16 * n), bx = e.tx - e.dx * 3.2 * (1 - q), bz = e.tz - e.dz * 3.2 * (1 - q); // an arc of light from the thread behind, up into the hero
        emit(U.lerp(bx, e.x, q * q), 0.12 + (e.y + 0.9) * Math.pow(q, 1.6), U.lerp(bz, e.z, q * q), 2, 0xa8803c, 0.35, 0.45 + q * 0.3, 1.2, 0); }
      for (let k = 1; k <= 8 * n; k++) emit(e.tx + e.dx * k * 0.7, 0.2, e.tz + e.dz * k * 0.7, 1, 0x5a4420, 0.5, 0.45 + k * 0.03, 0.9, 0);
      break; }
    case 'hatready': ring(h.x, h.y + 0.05, h.z, 0.3, 1.4, 0xffd27a, 0.45); if (!red) emit(h.x, h.y + 2.3, h.z, Math.round(10 * n), 0x8a6a30, 1.6, 0.6, 1.2, 0); break;
    case 'hatthrow': if (!red) emit(e.x, e.y, e.z, Math.round(10 * n), 0x8a6a30, 2.4, 0.35, 0, 0); if (m && m.rig) LL.paperMotion.cast(m.rig, 'orb'); break;
    case 'hatcut': emit(e.x, e.y, e.z, Math.round((red ? 3 : 12) * n), 0x9a7030, red ? 1 : 5, 0.3, 0.5, 6); break;
    case 'hatturn': if (!red) emit(e.x, e.y, e.z, Math.round(6 * n), 0x6a5028, 1.4, 0.3, 0, 0); break;
    case 'hatback': ring(h.x, h.y + 2.1, h.z, 0.2, 0.9, 0xffd27a, 0.3); if (!red) emit(h.x, h.y + 2.2, h.z, Math.round(6 * n), 0x8a6a30, 1.2, 0.4, 0.5, 0); break;
    case 'boon':
      ring(e.x, 0.05, e.z, 0.5, e.r, 0xb48cf0, 0.75); ring(e.x, e.y + 0.6, e.z, 0.3, 2.6, 0xf0a0c8, 0.55); if (!red) emit(e.x, e.y + 1, e.z, Math.round(18 * n), 0x6a3a7a, 3.2, 0.6, 0.6, 0);
      for (let i = 0; i < (e.who || []).length; i++) { const u = e.who[i]; ring(u.x, 0.05, u.z, 0.3, 1.2, 0xf0a0c8, 0.5); if (!red) emit(u.x, u.y + 0.5, u.z, Math.round(12 * n), 0x6a3456, 1.1, 0.9, 2.3, 0); }
      break;
    case 'roll': if (!red) { const lx = fz0 * (e.dir || 1), lz = -fx0 * (e.dir || 1); for (let k = 0; k < 6; k++) puff(h.x - lx * 0.5, h.y + 0.9, h.z - lz * 0.5, -lx * (1.5 + Math.random() * 1.5), (Math.random() - 0.5) * 0.6, -lz * (1.5 + Math.random() * 1.5), 0.25, 0.9, 0.45, 0.35); emit(h.x, h.y + 1, h.z, Math.round(8 * n), 0x2a6a66, 2.6, 0.35, 0, 0); } break;
  }
}
function guardTrail(m, h, dt) { // the hat's light along its path; a boost's motes at the feet while it carries
  if (R.reduced) return;
  if (h.hat && Math.random() < dt * (R.low ? 25 : 55)) emit(h.hat.x, h.hat.y, h.hat.z, 1, 0x7a5a24, 0.35, 0.35, 0.1, 0);
  if (h.tbT > 0 && !h.onGround && Math.random() < dt * (R.low ? 12 : 28)) emit(h.x + (Math.random() - 0.5) * 0.4, h.y + 0.1, h.z + (Math.random() - 0.5) * 0.4, 1, 0x5a4420, 0.5, 0.45, -0.6, 0);
}
function ghost(m, h, P, pt) {
  let gh = ghosts[ghostK];
  if (!gh) { const g = new T.PlaneGeometry(1, 1); g.translate(0, 0.5, 0);
    const mt = new T.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, alphaTest: 0.05, side: T.DoubleSide, blending: LK.add ? T.AdditiveBlending : T.NormalBlending });
    mt.userData.lk = mt.userData.bl = mt.userData.solid = true; gh = ghosts[ghostK] = new T.Mesh(g, mt); gh.renderOrder = 2; dyn.add(gh); }
  ghostK = (ghostK + 1) % 10;
  if (gh.material.map !== pt) { gh.material.map = pt; gh.material.needsUpdate = true; }
  const v = m.paper.v == null ? 2 : m.paper.v, uv = gh.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (k % 2 ? 1 : 0) * 0.25 + v * 0.25); uv.needsUpdate = true;
  const wd = P.h * (pt.image.width / 4) / pt.image.height; gh.position.set(h.x, h.y, h.z); gh.rotation.set(0, Math.atan2(camPos.x - h.x, camPos.z - h.z), 0);
  gh.scale.set(wd * (m.paper.sign || 1), P.h, 1); gh.material.color.setHex(LK.team[h.team]).multiplyScalar(LK.add ? 0.55 : 1); gh.life = 0.24; gh.t = 0; gh.visible = true;
  if (LL.wardrobe) LL.wardrobe.ghost(gh, h, LK.add); // 0.23 wardrobe: the player's dash colour (and puts the pooled copy back for others)
}
function stepGhosts(dt) { for (let i = 0; i < ghosts.length; i++) { const g = ghosts[i]; if (!g || !g.visible) continue; g.t += dt; const f = g.t / g.life; if (f >= 1) { g.visible = false; continue; } g.material.opacity = (g.userData.op || (LK.add ? 0.7 : 0.35)) * (1 - f) * (1 - f); /* 0.23 wardrobe: userData.op, a dense dash colour */ g.scale.y *= 1 + dt * 0.3; } }
/* TITLE CAMERA (0.20). The title screen used to circle the valley from high up. Now it is a slow trailer: a run of
   shots, each a gentle move with eased ends — gliding low along the middle thread, craning up over the loch, circling a
   lantern house, drifting past the Hush side, then the wide view — cut together, about twelve seconds each. Reduced
   motion keeps the old wide circle, slowed. */
let shotI = 0, shotT = 0;
const cpos = { x: 0, y: 0, z: 0 }, clook = { x: 0, y: 0, z: 0 }, LP = { x: 0, z: 0, dx: 0, dz: 1 };
const SHOTS = [
  { d: 13, fov: 52, f: function (k) { const L = LL.lanes[1].len, s = L * (0.18 + 0.22 * k); LL.lanePoint(1, s, LP); cpos.x = LP.x + 4.5; cpos.y = 2.6 + k * 1.4; cpos.z = LP.z;
      LL.lanePoint(1, s + 38, LP); clook.x = LP.x; clook.y = 3.2; clook.z = LP.z; } },
  { d: 12, fov: 50, f: function (k) { const lx = C.LOCH.x, lz = C.LOCH.z, a = 2.4 + k * 0.5; cpos.x = lx + Math.cos(a) * (22 - k * 4); cpos.y = 1.6 + k * k * 15; cpos.z = lz + Math.sin(a) * (22 - k * 4);
      clook.x = lx; clook.y = 1 + k * 2; clook.z = lz; } },
  { d: 12, fov: 46, f: function (k) { const ss = W && W.structs.filter(function (o) { return o.alive && o.team === 0 && o.kind !== 'patron'; }), o = ss && ss.length ? ss[Math.floor(shotI / SHOTS.length) % ss.length] : { x: 0, z: -60 };
      const a = k * 1.1 + 0.4; cpos.x = o.x + Math.cos(a) * 17; cpos.y = 4.5 + Math.sin(k * 3.14) * 2; cpos.z = o.z + Math.sin(a) * 17; clook.x = o.x; clook.y = 4; clook.z = o.z; } },
  { d: 12, fov: 54, f: function (k) { const z0 = 40 + k * 46; cpos.x = -30 + k * 14; cpos.y = 6 + k * 3; cpos.z = z0; clook.x = 10; clook.y = 4; clook.z = z0 + 40; } },
  { d: 16, fov: 58, f: function (k) { const a = shotI * 0.7 + k * 0.6, fz = Math.sin(shotI * 1.3) * 30; cpos.x = Math.sin(a) * 66; cpos.y = 26 - k * 6; cpos.z = fz + Math.cos(a) * 66; clook.x = 0; clook.y = 3; clook.z = fz; } }
];
function attractCam(dt) {
  if (R.reduced || !LL.lanes) {
    const a = time * 0.03, fz = Math.sin(time * 0.02) * 40;
    camPos.x = Math.sin(a) * 62; camPos.y = 24; camPos.z = fz + Math.cos(a) * 62; camera.position.set(camPos.x, camPos.y, camPos.z); camera.lookAt(0, 3, fz); camera.fov = R.portrait ? 78 : 58; return;
  }
  shotT += dt; let S = SHOTS[shotI % SHOTS.length]; if (shotT >= S.d) { shotT = 0; shotI++; S = SHOTS[shotI % SHOTS.length]; }
  const u = shotT / S.d, k = u * u * (3 - 2 * u) * 0.7 + u * 0.3; // eased ends, never quite stopped
  S.f(k); camPos.x = cpos.x; camPos.y = cpos.y; camPos.z = cpos.z;
  camera.position.set(cpos.x, cpos.y, cpos.z); camera.lookAt(clook.x, clook.y, clook.z);
  const dd = Math.hypot(clook.x - cpos.x, clook.z - cpos.z) || 1; camDir.x = (clook.x - cpos.x) / dd; camDir.z = (clook.z - cpos.z) / dd;
  camera.fov = (R.portrait ? 1.35 : 1) * S.fov;
}
/* FEEL (0.23): what a shot, a hit and a kill look like. Presentation only; nothing here changes a rule or a number.
   - Shot: a muzzle flash where the shot leaves (bigger for your own), and a camera kick on your own shots (above).
   - Hit: paper bits come off what you hit and flutter down; Hush tissue drifts up like ash instead; stone chips off a
     structure; a ward shimmers when the thing can't be hurt yet ('immune').
   - Kill: a Reign trooper crumples into a burst of paper that lands and lies a moment; a Hush small one tears into
     tissue that rises; a hollow comes apart in a big tissue cloud with a ring. Your kills tick the crosshair.
   Bits are one instanced mesh (fade by shrinking); flashes are a small sprite pool. Reduced motion: fewer bits, no kick. */
const KICK = { anna: 1.25, dora: 0.7, myra: 1.0, skein: 0.45, rook: 0.85 /* 0.25 rook: a spark with some weight, between Dora and Myra */ }, BIT_N = 240, BIT_PAPER = 0, BIT_TISSUE = 1, BIT_DUST = 2;
let kick = 0, kickSide = 1, bitM = null, bitL = [], bitK = 0, flashes = [], flashK = 0;
function buildFeel() {
  bitL = []; bitK = 0; flashes = []; flashK = 0;
  bitM = new T.InstancedMesh(new T.PlaneGeometry(1, 0.66), new T.MeshBasicMaterial({ side: T.DoubleSide, fog: true }), BIT_N);
  bitM.material.userData.lk = bitM.material.userData.bl = bitM.material.userData.solid = true; bitM.userData.rt = bitM.userData.ilk = true;
  initColor(bitM, BIT_N); bitM.count = 0; bitM.frustumCulled = false; dyn.add(bitM);
  for (let i = 0; i < BIT_N; i++) bitL.push({ life: 0 });
  for (let i = 0; i < 6; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); s.material.userData.lk = s.material.userData.bl = true; s.visible = false; s.life = 0; dyn.add(s); flashes.push(s); }
}
function flash(e, mine) {
  if (!flashes.length || (!mine && dist2cam(e.x, e.z) > 45)) return;
  const s = flashes[flashK]; flashK = (flashK + 1) % flashes.length;
  s.position.set(e.x, e.y, e.z); s.material.color.copy(tc(e.u.def.col)).lerp(new T.Color(0xffffff), 0.45); s.base = mine ? 1.5 : 0.9; s.scale.setScalar(s.base); s.life = s.max = mine ? 0.07 : 0.05; s.visible = true;
  if (mine) kickSide = Math.random() < 0.5 ? -1 : 1;
}
/* n bits of a kind from (x, y, z); sp: spread speed. Colours go through tc() so every view tints them its own way. */
function bits(x, y, z, n, col, sp, kind) {
  if (!bitM) return; if (R.reduced) n = Math.ceil(n / 3);
  for (let k = 0; k < n; k++) {
    const b = bitL[bitK], i = bitK; bitK = (bitK + 1) % BIT_N;
    const a = Math.random() * 6.283, v = sp * (0.4 + Math.random() * 0.8);
    b.x = x; b.y = y; b.z = z; b.vx = Math.cos(a) * v; b.vz = Math.sin(a) * v; b.vy = kind === BIT_TISSUE ? 0.6 + Math.random() * 1.2 : 1.5 + Math.random() * 2.6;
    b.rx = Math.random() * 6.3; b.ry = Math.random() * 6.3; b.rz = Math.random() * 6.3; b.wx = (Math.random() - 0.5) * 16; b.wy = (Math.random() - 0.5) * 12; b.wz = (Math.random() - 0.5) * 16;
    b.s = (kind === BIT_DUST ? 0.08 : 0.15) + Math.random() * (kind === BIT_TISSUE ? 0.22 : 0.13); b.kind = kind; b.t = 0; b.life = kind === BIT_TISSUE ? 1.1 + Math.random() * 0.8 : 1.6 + Math.random() * 0.9; b.ground = false; b.ph = Math.random() * 6.3;
    const c = Array.isArray(col) ? col[(Math.random() * col.length) | 0] : col; tmpC.copy(tc(c)); b.r = tmpC.r; b.g = tmpC.g; b.b = tmpC.b;
  }
}
const PAPER_REIGN = [0xf4e8d6, 0xf4e8d6, 0xff6a4d, 0xe9b44c], TISSUE = [0x2a1f4a, 0x3a2d6a, 0x5b4790, 0xc9a0ff], STONE = [0x8a8094, 0xb8aec4, 0x5d5468];
function hitBits(e) {
  if (e.kind === 'dot') return;
  if (e.struct) { bits(e.x, e.y, e.z, e.crit ? 5 : 3, e.team === 1 ? TISSUE : STONE, 2.4, e.team === 1 ? BIT_TISSUE : BIT_DUST); return; }
  if (e.tk === 'trooper' || e.tk === 'thief') { const hush = e.team === 1; bits(e.x, e.y, e.z, (e.crit ? 4 : 2) + (e.kind === 'ab' ? 2 : 0), hush ? TISSUE : PAPER_REIGN, hush ? 1.4 : 2.2, hush ? BIT_TISSUE : BIT_PAPER); }
  else if (e.tk === 'hero') bits(e.x, e.y, e.z, e.crit ? 4 : 2, PAPER_REIGN, 2, BIT_PAPER);
}
function killBits(e) {
  const u = e.u || {}, hush = e.team === 1, mine = e.by && e.by === W.player;
  if (u.big) { bits(e.x, 2.2, e.z, 44, TISSUE, 4.5, BIT_TISSUE); ring(e.x, 0.05, e.z, 0.6, 6, 0xc9a0ff, 0.6); puff(e.x, 0.3, e.z, 0, 0.4, 0, 1.2, 3.2, 0.9, 0.35); if (dist2cam(e.x, e.z) < 30 && !R.reduced) shake = Math.max(shake, 0.25); }
  else if (hush) { bits(e.x, 1.1, e.z, mine ? 16 : 10, TISSUE, 2.2, BIT_TISSUE); emit(e.x, 1.4, e.z, 4, 0xe6d2ff, 1.2, 0.8, 1.5, 0); }
  else { bits(e.x, 1, e.z, mine ? 16 : 11, PAPER_REIGN, 3, BIT_PAPER); puff(e.x, 0.2, e.z, 0, 0.3, 0, 0.3, 1, 0.5, 0.3); }
}
function stepFeel(dt) {
  if (SH) SH.step(dt); // 0.26 shots
  for (let i = 0; i < flashes.length; i++) { const s = flashes[i]; if (!s.visible) continue; s.life -= dt; if (s.life <= 0) { s.visible = false; continue; } const f = s.life / s.max; s.material.opacity = f; s.scale.setScalar(s.base * (0.7 + 0.5 * f)); }
  if (!bitM) return; let n = 0;
  for (let i = 0; i < BIT_N; i++) {
    const b = bitL[i]; if (b.life <= 0) continue; b.t += dt; if (b.t >= b.life) { b.life = 0; continue; }
    if (!b.ground) {
      const tis = b.kind === BIT_TISSUE, drag = Math.exp(-dt * (tis ? 1.6 : 2.4));
      b.vx = b.vx * drag + Math.sin(b.t * 9 + b.ph) * dt * (tis ? 2.2 : 1.4); b.vz = b.vz * drag + Math.cos(b.t * 7 + b.ph) * dt * (tis ? 2.2 : 1.4);
      b.vy = tis ? b.vy * Math.exp(-dt * 0.8) + dt * 0.15 : Math.max(b.vy - dt * (b.kind === BIT_DUST ? 9 : 6.5), -2.2);
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.rx += b.wx * dt; b.ry += b.wy * dt; b.rz += b.wz * dt;
      if (b.y <= 0.03 && !tis) { b.y = 0.03; b.ground = true; b.rx = -Math.PI / 2; b.rz = 0; }
    }
    const f = b.t / b.life, sc = b.s * (b.kind === BIT_TISSUE ? (1 - f) * (1 - f) : (f > 0.75 ? (1 - f) / 0.25 : 1));
    dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(b.rx, b.ry, b.rz); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); bitM.setMatrixAt(n, dummy.matrix);
    bitM.setColorAt(n, tmpC.setRGB(b.r, b.g, b.b)); n++;
  }
  bitM.count = n; bitM.instanceMatrix.needsUpdate = true; if (n) bitM.instanceColor.needsUpdate = true;
}
R.frame = function (dt, view) {
  if (!R.ok || !W) return;
  time += dt;
  let i;
  // heroes
  for (i = 0; i < heroM.length; i++) {
    const m = heroM[i], h = m.unit;
    if (h.isPlayer && LL.wardrobe) LL.wardrobe.hero(m, h, dt, time, camPos); // 0.23 wardrobe: what the player wears (reads the last frame's pose)
    /* A FALL (0.20): a hero who goes down tips over backward like a card knocked flat, with a puff of dust, instead of
       vanishing. Presentation only: the model has already removed them. */
    if (!h.alive) {
      if (m.wasAlive && (m.paper || m.fig) && !R.reduced) { m.dieT = 0; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; puff(h.x + Math.cos(a) * 0.5, 0.2, h.z + Math.sin(a) * 0.5, Math.cos(a) * 2.5, 0.5, Math.sin(a) * 2.5, 0.4, 1.3, 0.7, 0.45); } }
      m.wasAlive = false;
      if (m.dieT != null && m.dieT < 1.1 && m.fig) { m.dieT += dt; LL.heroes3d.fall(m.fig, m.dieT); m.visible = true; m.ring.visible = m.shield.visible = false; m.shadow.visible = m.dieT < 0.6; m.fig.root.visible = m.dieT < 0.95 || Math.floor(m.dieT * 30) % 2 === 0; continue; } // 0.24 heroes3d: the figure falls on its face
      if (m.dieT != null && m.dieT < 0.9 && m.paper) { m.dieT += dt; const f = Math.min(1, m.dieT / 0.45), e = f * f; m.visible = true; m.paper.rotation.x = -e * 1.5; m.paper.position.y = -0.02 * e; m.ring.visible = m.shield.visible = false; m.shadow.visible = f < 1; m.paper.visible = m.dieT < 0.8 || Math.floor(m.dieT * 30) % 2 === 0; continue; }
      m.visible = false; continue;
    }
    if (!m.wasAlive) { m.wasAlive = true; m.dieT = null; if (m.fig) m.fig.root.visible = true; /* 0.24 heroes3d */ if (m.paper) { m.paper.rotation.x = 0; m.paper.position.y = 0; m.paper.visible = true; } m.shadow.visible = true; }
    // a hit knocks the springs: the body gives and the head snaps
    if (h.flash > (m.lastFlash || 0) + 0.01 && m.rig.s && !R.reduced) { m.rig.s.qv -= 2.5; m.rig.s.hv += (Math.random() < 0.5 ? -1 : 1) * 0.9; m.rig.s.cv += (Math.random() - 0.5) * 2; }
    m.lastFlash = h.flash;
    m.position.set(h.x, h.y, h.z); m.rotation.y = h.yaw;
    const ce = camera.matrixWorld.elements; scr.r = h.vx * ce[0] + h.vz * ce[2]; scr.f = -(h.vx * ce[8] + h.vz * ce[10]);
    { const pv = m.paper ? m.paper.v : 2; scr.k = pv === 1 ? 1 : (pv === 3 ? 0.45 : 0.12); } // side view drags cloth fully; facing away or toward, barely
    { const q0 = m.paper; scr.m = q0 && q0.sign ? q0.sign : 1; scr.h = q0 ? q0.h : 2.3; scr.fb = !!(q0 && q0.v != null && !(q0.cell === 1 || q0.cell === 6 || (!q0.useM && q0.v === 1))); } // what the braid needs to know of last frame's picture
    scr.cyc = m.fig ? LL.heroes3d.cyc(m.fig, h) : 1; // 0.24 heroes3d: the figure's stride length at this speed
    const sp = Math.hypot(h.vx, h.vz), st = LL.paperMotion.pose(m.rig, h, dt, W.t, R.reduced, scr), G = st.g;
    if (m.fig) LL.heroes3d.pose(m.fig, st, h, { dt: dt, t: time, reduced: R.reduced }); // 0.24 heroes3d: legs, arms, aim, cloth, braid from the rig
    if (!R.reduced) heroDust(m, h, st, dt);
    if (h.hat || h.tbT > 0) guardTrail(m, h, dt); // 0.26 guard: the flying hat's light, the thread boost's motes
    m.phase = st.phase;
    const sw = h.zip ? 0.55 : (h.onGround ? st.sway * 0.8 : 0.5);
    m.legL.rotation.x = sw; m.legR.rotation.x = h.zip ? -0.35 : -sw;
    m.body.rotation.x = h.dashT > 0 || h.zip ? 0.45 : Math.min(0.22, sp * 0.02);
    if (h.zip && Math.random() < dt * 40) emit(h.x, 0.25, h.z, 1, 0xffe2a0, 1.5, 0.6, 1.2, 0);
    if ((h.liftT > 0 || h.glide) && !R.reduced && Math.random() < dt * (h.liftT > 0 ? 13 : 4)) emit(h.x - Math.sin(h.yaw) * 0.5, h.y + 0.95, h.z - Math.cos(h.yaw) * 0.5, 1, h.def.col, 1.4, 0.4, -1.2, 0); // 0.25 rook: the lantern sheds sparks while it lifts him
    m.body.position.y = h.onGround ? st.body : 0;
    if (m.recoil > 0) m.recoil = Math.max(0, m.recoil - dt * 9);
    m.arm.rotation.x = -h.pitch - m.body.rotation.x - m.recoil * 0.25;
    m.arm.position.z = 0.1 - m.recoil * 0.12;
    { const up = Math.max(0, h.y), k = 1 / (1 + up * 0.45); m.shadow.position.y = 0.035 - h.y; m.shadow.scale.set(k, k, k); m.shadow.material.opacity = 0.5 * k; } // the shadow stays on the ground and shrinks as the hero rises
    if (m.paper) { // face the camera; pick the painted view from the angle between the hero's facing and the camera
      const pp = m.paper, P_ = pp.parts;
      const toCam = Math.atan2(camera.position.x - h.x, camera.position.z - h.z); let d = toCam - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      const ad = Math.abs(d);
      /* Which painted view. Bands: 0 front [0, .5), 3 three-quarter [.5, 1.2), 1 side [1.2, 2.2), 2 back. A tenth of a radian of
         hysteresis, so standing on a boundary does not flicker between two pictures. */
      const raw = ad < 0.5 ? 0 : (ad < 1.2 ? 3 : (ad < 2.2 ? 1 : 2)), BAND = { 0: [-1, 0.5], 3: [0.5, 1.2], 1: [1.2, 2.2], 2: [2.2, 9] };
      let v = pp.v; if (v == null || (raw !== v && (ad < BAND[v][0] - 0.1 || ad > BAND[v][1] + 0.1))) v = raw; pp.v = v;
      const side = v === 1, sign = (v === 1 || v === 3) && d * PAPER_FLIP > 0 ? -1 : 1;
      /* 0.21: a thrown gun shows the painted aim (the release) only after the throw, not while winding up for the next. */
      pp.aiming = (pp.aiming ? st.aim > 0.2 : st.aim > 0.55) && st.throw > -0.12;
      let useM = !!pp.mat2 && v !== 3, cell = v;
      if (useM) { cell = v === 0 ? 0 : (v === 1 ? 1 : 2); if (pp.aiming && v === 2) cell = 5; else if (pp.aiming && v === 1) cell = 6; }
      const key = (useM ? 'm' : 't') + cell + (sign > 0 ? '+' : '-');
      const apply = function () {
        const mat = useM ? pp.mat2 : (pp.mat1 || pp.material);
        if (P_.body.material !== mat) { P_.body.material = P_.legL.material = P_.legR.material = P_.legA.material = P_.legB.material = mat; }
        mat.map.offset.x = useM ? cell / 7 : v * 0.25; pp.wide = useM ? pp.r2 : 1; pp.sign = sign; pp.key = key; pp.cell = cell; pp.useM = useM;
      };
      /* PAPER TURN. A change of picture is a card turning over: it narrows to an edge, the picture changes, it opens again.
         0.15 s for a change of view, 0.09 s for raising or lowering the aim. Reduced motion: an instant change. 0.21: a
         thrown gun cuts between its wind-up and its release like two drawn frames, with no turn. */
      const aimOnly = pp.key != null && pp.key.slice(0, 2) !== key.slice(0, 2) && pp.key.slice(2) === key.slice(2) && (pp.cell >= 5 || cell >= 5);
      if (pp.key == null || R.reduced || (aimOnly && pp.ft == null)) apply(); // 0.22.2: raising or lowering the aim is a cut, never a turn (the edge-on blink looked like a glitch)
      else if (key !== pp.key && pp.ft == null) { pp.ft = 0; pp.fdur = (pp.key.slice(0, 2) !== key.slice(0, 2) && (pp.cell >= 5 || cell >= 5)) ? 0.09 : 0.15; pp.swapped = false; }
      let squeeze = 1;
      if (pp.ft != null) { pp.ft += dt; const f = pp.ft / pp.fdur; if (f >= 0.5 && !pp.swapped) { apply(); pp.swapped = true; } squeeze = Math.max(0.05, Math.abs(Math.cos(Math.PI * Math.min(1, f)))); if (f >= 1) pp.ft = null; }
      // squash on landing, stretch going up, a small give when firing; 0.21: a crouch winding up a throw, a stretch on its release
      const tw = st.throw, sq = st.squash * 0.13 + st.recoil * 0.025 + (h.onGround ? st.run * 0.07 : 0) + Math.max(0, -tw) * 0.05 - Math.max(0, tw) * 0.035;
      const sx = 1 + sq * 0.45 - Math.max(0, st.stretch) * 0.04, sy = 1 - sq + Math.max(0, st.stretch) * 0.07 - Math.max(0, -st.stretch) * 0.02;
      pp.rotation.y = toCam - h.yaw;
      pp.scale.set(pp.sign * (pp.wide || 1) * squeeze * sx, sy, 1);
      pp.position.z = -st.brace + Math.max(0, st.throw) * 0.1; // a braced shot shoves the whole figure back a step, and it walks it back; a throw lunges a little forward
      /* LEAN. Paper cannot lean toward the camera, so it leans across the screen: into the direction the hero is moving
         as seen from here, more when dashing. Eased, so starting and stopping read as weight. */
      const e = camera.matrixWorld.elements, vRight = h.vx * e[0] + h.vz * e[2];
      const leanT = R.reduced ? 0 : Math.max(-0.12, Math.min(0.12, -vRight * (h.dashT > 0 ? 0.02 : 0.01) * (0.4 + 0.6 * scr.k)));
      m.lean += (leanT - m.lean) * (1 - Math.exp(-dt * 9)); pp.rotation.z = m.lean;
      // which way the figure faces: on screen (fS, +1 = right), and in its own x through the mirror (fwd)
      const fR = Math.sin(h.yaw) * e[0] + Math.cos(h.yaw) * e[2], fS = fR >= 0 ? 1 : -1, fwd = fS * pp.sign, red = R.reduced ? 0 : 1;
      const sideLegs = pp.cell === 1 || pp.cell === 6 || (!pp.useM && v === 1), sideK = sideLegs ? 1 : (v === 3 ? 0.55 : 0);
      // seen from front or back, a step moves the weight from foot to foot: the body shifts toward the planted leg and rolls more
      const fb = !sideLegs && h.onGround && !R.reduced;
      const shiftX = fb ? (-st.sway * 0.035 * G.shift + st.idle * 0.012) * pp.h : 0;
      /* ARMS: hang from the shoulders and swing against the legs; hidden while the painted aim pose is showing. 0.21: the swing
         is per gait; seen from the side the elbow bends more on the forward swing whichever way the hero faces, and the far
         arm (where the gait has one) swings behind the body; a thrown gun winds the arm up and back first; a stomp flings both
         arms out; seen from front or back, an arm swinging toward or away from the camera looks shorter. */
      // the body: where it hangs from (its top) and how far it rolls; the arms and the braid hang from it
      const bodyY = pp.h + (h.onGround ? st.body - st.recoil * 0.045 : 0.04), roll = st.roll * (fb ? 2.2 : 1), cr = Math.cos(roll), sr0 = Math.sin(roll);
      /* ARMS: hang from the shoulders and swing against the legs; hidden while the painted aim pose is showing. 0.21: the
         shoulders ride the body's shift and roll (so a rolling coat no longer swallows an arm); the swing is per gait; seen
         from the side the elbow bends more on the forward swing whichever way the hero faces, and the far arm (where the
         gait has one) swings behind the body; a thrown gun winds the arm up and back first; a stomp flings both arms out;
         seen from front or back, an arm swinging toward or away from the camera looks shorter. */
      if (P_.armL) { const A = PAPER[h.def.id].arms, show = pp.useM && pp.cell < 3, sy2 = A.y * pp.h - pp.h, sx2 = A.x * pp.h / (pp.wide || 1), asw = h.onGround ? st.sway * G.arm : -0.5;
        const sideArm = pp.cell === 1, far = sideArm && !!pp.matF, wind = Math.max(0, -tw), wA = ss01(0.06, 0.45, wind), stomp = st.stomp;
        const sh = function (ms, x, y, z) { ms.position.set(shiftX + x * cr - y * sr0, bodyY + x * sr0 + y * cr, z); };
        P_.armL.visible = show; P_.armR.visible = show && (!sideArm || far);
        if (show) { pp.matA.map.offset.x = (sideArm ? 3 : 4) / 7;
          if (sideArm) {
            sh(P_.armL, 0, sy2, 0.05); P_.armL.scale.y = 1;
            P_.armL.rotation.z = roll - asw * 0.55 * (1 - wA) - fwd * wA * 2.7 + fwd * stomp * 1.1 + fwd * Math.max(0, tw) * 0.7;
            if (far) { P_.armR.material = pp.matF; P_.armR.scale.set(1, 1, 1); sh(P_.armR, 0, sy2 + 0.01 * pp.h, -0.045); P_.armR.rotation.z = roll + asw * 0.5 + fwd * stomp * 0.7 - fwd * wA * 0.5; }
          } else {
            if (P_.armR.material !== pp.matA) P_.armR.material = pp.matA; P_.armR.scale.x = -1;
            sh(P_.armL, -sx2, sy2 + Math.max(0, -asw) * 0.03, -0.02); sh(P_.armR, sx2, sy2 + Math.max(0, asw) * 0.03, -0.02);
            const lag = G.arm > 1 ? -0.55 * shiftX / (A.len * pp.h) - asw * 0.05 : 0; // the hands hang back from the body's sway a little
            P_.armL.rotation.z = roll - 0.06 - asw * 0.07 + lag - Math.max(0, st.stretch) * 0.5 - stomp * 1.2;
            P_.armR.rotation.z = roll + 0.06 - asw * 0.07 + lag + Math.max(0, st.stretch) * 0.5 + stomp * 1.2 + wA * 2.9 - Math.max(0, tw) * 0.35;
            const fsh = G.arm > 1 ? 0.12 : 0; P_.armL.scale.y = 1 - fsh * Math.abs(asw); P_.armR.scale.y = 1 - fsh * Math.abs(asw) * (1 - wA) - Math.max(0, tw) * 0.2;
          } } }
      // legs: seen from the side they scissor; from front or back they lift in turn; in the air they tuck. 0.21: swing per gait; a stomp or a braced shot plants them wide
      const brace = Math.min(1, st.brace * 5), stance = Math.max(st.stomp, brace);
      P_.legL.visible = P_.legR.visible = !sideLegs; P_.legA.visible = P_.legB.visible = sideLegs;
      if (!h.onGround && !h.zip) { P_.legA.position.y = P_.legB.position.y = pp.hem; P_.legA.rotation.z = 0.42; P_.legB.rotation.z = -0.18; P_.legL.position.y = pp.hem + pp.hem * 0.22; P_.legR.position.y = pp.hem + pp.hem * 0.1; P_.legL.rotation.z = P_.legR.rotation.z = 0; }
      else if (sideLegs) { P_.legA.position.y = P_.legB.position.y = pp.hem; P_.legA.rotation.z = st.sway * 0.74 * G.swing * (1 - stance) + fwd * 0.32 * stance; P_.legB.rotation.z = -st.sway * 0.74 * G.swing * (1 - stance) - fwd * 0.3 * stance; }
      else { P_.legL.position.y = pp.hem + st.liftL * pp.hem * 3 * (1 - stance); P_.legR.position.y = pp.hem + st.liftR * pp.hem * 3 * (1 - stance); P_.legL.rotation.z = st.sway * 0.1 + st.liftL * 0.25 + stance * 0.12; P_.legR.rotation.z = st.sway * 0.1 - st.liftR * 0.25 - stance * 0.12; P_.legL.position.x = -st.sway * 0.012 * pp.h - stance * 0.035 * pp.h; P_.legR.position.x = -st.sway * 0.012 * pp.h + stance * 0.035 * pp.h; }
      // the body rides the step: up twice per stride, rolls with the step and the turn, breathes when standing
      P_.body.position.y = bodyY;
      P_.body.position.x = shiftX;
      P_.body.rotation.z = roll; P_.body.scale.y = 1 + (R.reduced ? 0 : Math.sin(time * 2.1 + h.id) * 0.01 * (1 - st.mix));
      /* BENDS (0.20). The body curves into its motion from the hips up, the cloak hem trails and flares and ripples, the head
         lags a change of speed, it bulges as it squashes and breathes at rest. In the side view the knees fold backward,
         most while a leg swings through, and the swinging arm bends at the elbow. Reduced motion: rest shape. 0.21: a
         forward lean into the run per gait, a lean back winding up a throw and forward on its release, a lean back from a
         braced shot; the coat halves (front and back); the braid. */
      if (pp.sign) {
        const inv = 1 / (pp.sign * (pp.wide || 1));
        bq.bend = red * Math.max(-0.14, Math.min(0.14, vRight * (h.dashT > 0 ? 0.016 : 0.01) * scr.k + fS * sideK * (st.lean + tw * 0.09 - st.brace * 0.45))); bq.head = red * st.head; bq.cloak = red * st.cloak;
        bq.flare = red * st.flare; bq.bulge = red * Math.max(0, sq) * 0.5; bq.breath = red * Math.sin(time * 2.1 + h.id) * 0.012 * (1 - st.mix);
        bq.wave = red * st.wave; bq.wph = st.phase * 2 + time * 3.1;
        const flaps = pp.slitF > 0 && pp.useM && (pp.cell === 0 || pp.cell === 2 || pp.cell === 5) && h.onGround;
        bq.slit = flaps ? pp.slitF : 0; bq.panL = flaps ? red * st.flapL : 0; bq.panR = flaps ? red * st.flapR : 0;
        bendBody(P_.body, bq, inv);
        if (sideLegs && h.onGround && !h.zip) { bendJoint(P_.legA, -st.kneeA * 0.95 * fwd * red * (1 - stance), 0.5); bendJoint(P_.legB, -st.kneeB * 0.95 * fwd * red * (1 - stance), 0.5); }
        else if (sideLegs) { bendJoint(P_.legA, -0.7 * fwd * red, 0.5); bendJoint(P_.legB, -0.35 * fwd * red, 0.5); }
        else { bendJoint(P_.legL, 0, 0.5); bendJoint(P_.legR, 0, 0.5); }
        if (P_.armL && P_.armL.visible) { const gnd = h.onGround ? 1 : 0.4, wA = ss01(0.06, 0.45, Math.max(0, -tw));
          if (pp.cell === 1) { bendJoint(P_.armL, ((0.25 + Math.max(0, -st.sway * G.arm * fwd) * 0.7) * gnd * (1 - wA) + wA * 1.3) * fwd * red, 0.48);
            if (P_.armR.visible) bendJoint(P_.armR, (0.25 + Math.max(0, st.sway * G.arm * fwd) * 0.7) * gnd * fwd * red, 0.48); }
          else { bendJoint(P_.armL, 0, 0.48); bendJoint(P_.armR, -wA * 1.2 * red, 0.48); } }
        /* THE BRAID (0.21): shown in the cells it was cut from (the body's copy has it filled in behind, so it must be). The
           pendulum is in screen terms; the piece is in the body's mirrored, rolled frame, so it is turned back to hang true
           (mostly: a braid lying on a back is held a little by it), and seen from the side it swings forward only a little,
           into the back. */
        if (P_.braids) { const bc = pp.useM ? P_.braids[pp.cell] : null;
          for (const k in P_.braids) P_.braids[k].visible = P_.braids[k] === bc;
          if (bc) { pp.matB.map.offset.x = pp.cell / 7;
            let a = pp.sign * (st.braid - 0.7 * m.lean) - 0.7 * P_.body.rotation.z, tip = pp.sign * st.braidTip;
            if (sideLegs) { const fa = a * fwd; if (fa > 0.12) a = fwd * (0.12 + (fa - 0.12) * 0.25); const ft = tip * fwd; if (ft > 0.1) tip = fwd * (0.1 + (ft - 0.1) * 0.3); }
            bendBraid(bc, P_.body, bq, red * a, red * tip, red * (sideLegs ? 0 : st.braidLift)); } }
      }
    }
    m.ring.visible = h.onGround || !!h.zip; m.ring.position.y = h.zip ? 0.05 - h.y : 0.05; m.shield.visible = h.shield > 0 || (!m.fig && h.guardT > 0 && h.guardK === 'bubble'); /* 0.26 guard: painted paper shows the bubble as the shield's sphere */
    const sc = h.flash > 0 ? 1.06 : 1; m.scale.set(sc, sc, sc);
    if (h.slowT > 0 && Math.random() < dt * 8) emit(h.x, h.y + 0.3, h.z, 1, 0x8fb0ff, 1, 0.5, 1, 0);
    if (h.dotT > 0 && Math.random() < dt * 10) emit(h.x, h.y + 1.2, h.z, 1, 0xc9a0ff, 1.5, 0.5, 1, 0);
    if (h.zestT > 0 && Math.random() < dt * 22) emit(h.x, h.y + 0.15, h.z, 1, 0xffe14d, 1.4, 0.5, 1.2, 0);
    if (h.furyT > 0 && Math.random() < dt * 22) emit(h.x + (Math.random() - 0.5) * 0.7, h.y + 1.3, h.z + (Math.random() - 0.5) * 0.7, 1, 0x8fdc50, 1.2, 0.5, 1.8, 0);
    if (h.hipsT > 0 && Math.random() < dt * 16) emit(h.x, h.y + 0.6 + Math.random(), h.z, 1, 0xf0624a, 0.6, 0.7, 1.6, 0);
    if (W.great[h.team] > 0 && Math.random() < dt * 16) emit(h.x + (Math.random() - 0.5) * 0.8, h.y + 0.3 + Math.random() * 1.6, h.z + (Math.random() - 0.5) * 0.8, 1, 0xffe08a, 0.6, 0.7, 2.2, 0);
  }
  { // the echo: a pale second self where the model says it is
    const e = W.echo;
    if (e && !echoM && R.heroes3d && LL.heroes3d) { const fig = LL.heroes3d.build(T, W.player, { LK: LK }); // 0.24 heroes3d: the echo is the figure too, pale, running its own rig
      if (fig) { LL.heroes3d.ghostly(fig); const m = new T.Group(); m.add(fig.root); m.fig = fig; m.rig = LL.paperMotion.create(); m.u = { def: W.player.def, id: -1, team: W.player.team, x: e.x, z: e.z, y: 0, vx: 0, vz: 0, vy: 0, yaw: e.yaw, pitch: 0, onGround: true, alive: true, lastShotT: -9 }; echoM = m; dyn.add(m); } }
    if (e && !echoM) { const id = W.player.def.id, pt = paperTex[id]; let m;
      if (pt) { const t = pt.clone(); t.needsUpdate = true; t.repeat.set(0.25, 1); t.offset.x = 0.5; const P = PAPER[id]; m = new T.Mesh(new T.PlaneGeometry(P.h * (pt.image.width / 4) / pt.image.height, P.h), new T.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, color: 0x9fd0ff, side: T.DoubleSide, depthWrite: false })); m.userData.hy = P.h / 2; }
      else { m = new T.Mesh(new T.ConeGeometry(0.5, 2, 6), new T.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.45, depthWrite: false })); m.userData.hy = 1; }
      m.material.userData.lk = true; m.material.userData.bl = true; m.material.userData.solid = true; echoM = m; dyn.add(m); }
    if (echoM && echoM.fig) { echoM.visible = !!e; if (e) { const u = echoM.u, k = 1 - Math.exp(-dt * 14), nx = u.x + (e.x - u.x) * k, nz = u.z + (e.z - u.z) * k; // 0.24 heroes3d
        if (Math.hypot(e.x - u.x, e.z - u.z) > 6) { u.x = e.x; u.z = e.z; u.vx = u.vz = 0; } else if (dt > 0) { u.vx = (nx - u.x) / dt; u.vz = (nz - u.z) / dt; u.x = nx; u.z = nz; }
        let dy = e.yaw - u.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); u.yaw += dy * k; echoM.position.set(u.x, 0, u.z); echoM.rotation.y = u.yaw;
        scr.cyc = LL.heroes3d.cyc(echoM.fig, u); LL.heroes3d.pose(echoM.fig, LL.paperMotion.pose(echoM.rig, u, dt, W.t, R.reduced, scr), u, { dt: dt, t: time, reduced: R.reduced });
        if (Math.random() < dt * 14) emit(u.x, 0.3 + Math.random() * 1.6, u.z, 1, 0x9fd0ff, 0.6, 0.5, 1.4, 0); } }
    else if (echoM) { echoM.visible = !!e; if (e) { echoM.position.set(e.x, echoM.userData.hy + Math.sin(time * 6) * 0.05, e.z); echoM.rotation.y = Math.atan2(camPos.x - e.x, camPos.z - e.z); if (Math.random() < dt * 14) emit(e.x, 0.3 + Math.random() * 1.6, e.z, 1, 0x9fd0ff, 0.6, 0.5, 1.4, 0); } }
  }
  petStep(dt);
  // troopers
  let n0 = 0, n1 = 0, nh = 0; shadowN = 0;
  LL.props.begin(time, R.reduced, renderer.domElement.height); // 0.20 props: sway clock, lantern glows and hollows start the frame
  for (i = 0; i < W.structs.length; i++) { const o = W.structs[i]; if (o.alive) shadowPut(o.x, o.z, o.r * 2.1, 1); }
  const bT = bd.trooper.begin(), bH = bd.hush.begin(), bB = bd.hollow.begin(), bS = bd.thief.begin();
  const ts = W.troopers;
  for (i = 0; i < ts.length; i++) {
    const t = ts[i]; if (!t.alive) continue;
    const moving = Math.abs(t.vx) + Math.abs(t.vz) > 0.1;
    /* GAITS (0.20). A Reign trooper marches: a hop per step, squashing at the bottom and waddling side to side with it.
       A Hush wraith does not step at all: it glides a hand above the snow, bobbing slowly, leaning into its way and
       swaying like cloth in water. A hollow lumbers: slow heavy steps, the weight rolling from side to side. */
    const hush = t.team === 1, rate = t.big ? 3.4 : 9, ph = time * rate + t.id, hs = Math.abs(Math.sin(ph)), red = R.reduced ? 0 : 1;
    let hop = moving ? hs * (t.big ? 0.1 : 0.2) : 0, sq = moving && !R.reduced ? (1 - hs) * (t.big ? 0.12 : 0.1) : 0, tilt = moving ? 0.08 : 0, roll = 0;
    if (hush && !t.big) { hop = 0.16 + 0.1 * Math.sin(time * 2.6 + t.id * 1.7) * red; sq = -0.035 * Math.sin(time * 3.1 + t.id) * red; tilt = moving ? 0.2 : 0.04; roll = Math.sin(time * 2.2 + t.id) * 0.1 * red; }
    else if (t.big) { roll = (moving ? Math.sin(ph) * 0.09 : Math.sin(time * 1.3 + t.id) * 0.03) * red; tilt = moving ? 0.12 : 0.03; }
    else roll = (moving ? Math.sin(ph) * 0.07 : 0) * red;
    if (t.flash > 0) tilt -= 0.25 * red; // a hit rocks it back
    if (W.flood && LL.ness) hop += LL.ness.bob(t, time); // 0.26 ness: troopers float in the flood
    const sc = (t.flash > 0 ? 1.2 : 1) * (W.great[t.team] > 0 ? 1.2 : 1);
    shadowPut(t.x, t.z, (t.big ? 2.3 : 1.15) * (1 - hop * 0.6), 1);
    const sx = t.big ? 2.1 : (t.ranged ? 0.78 : 1), sy = t.big ? 2.3 : (t.ranged ? 1.35 : 1);
    { const B = t.team === 0 ? (bT ? bd.trooper : null) : (t.big ? (bB ? bd.hollow : null) : (bH ? bd.hush : null));
      if (B) { let d = Math.atan2(camPos.x - t.x, camPos.z - t.z) - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        B.put(Math.abs(d) < 1.57 ? 0 : 1, t.x, hop, t.z, (t.big ? 4.4 : (t.ranged ? 2.2 : 1.9)) * sc, d * PAPER_FLIP > 0, moving ? Math.sin(time * 9 + t.id) * 0.06 : 0); continue; } }
    dummy.position.set(t.x, hop, t.z); dummy.rotation.set(tilt, t.yaw, roll); dummy.scale.set(sx * sc * (1 + sq * 0.6), sy * sc * (1 - sq), sx * sc * (1 + sq * 0.6)); dummy.updateMatrix();
    if (t.team === 0) { if (n0 < 90) tr[0].setMatrixAt(n0++, dummy.matrix); if (nh < 180) trHat.setMatrixAt(nh++, dummy.matrix); LL.props.lantern(dummy.matrix, t); } // 0.20 props: the lantern's glow
    else if (t.big && LL.props.hollow(dummy.matrix)) { /* 0.20 props: a hollow has its own shape */ }
    else if (n1 < 110) { hushEyes.setMatrixAt(n1, dummy.matrix); tr[1].setMatrixAt(n1++, dummy.matrix); }
  }
  for (i = 0; i < W.thieves.length; i++) {
    const t = W.thieves[i]; if (!t.alive || n1 >= 110) continue;
    const sc = t.flash > 0 ? 1.05 : 0.85; shadowPut(t.x, t.z, 0.9, 1);
    if (bS) { let d = Math.atan2(camPos.x - t.x, camPos.z - t.z) - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); bd.thief.put(Math.abs(d) < 1.57 ? 0 : 1, t.x, Math.abs(Math.sin(time * 14 + t.id)) * 0.3, t.z, 1.5 * sc, d * PAPER_FLIP > 0, 0.12);
      if (t.state === 1 && Math.random() < dt * 30) emit(t.x, 1.1, t.z, 1, t.carry ? 0xffd28a : 0xffe9a8, 1.2, 0.6, 1.5, 0); continue; }
    dummy.position.set(t.x, Math.abs(Math.sin(time * 14 + t.id)) * 0.3, t.z); dummy.rotation.set(0.35, t.yaw, 0); dummy.scale.set(sc, sc * 0.9, sc); dummy.updateMatrix();
    hushEyes.setMatrixAt(n1, dummy.matrix); tr[1].setMatrixAt(n1++, dummy.matrix);
    if (t.state === 1) LL.props.stolen(dummy.matrix, t.carry); // 0.20 props: a thief carries the light it took
    if (t.state === 1 && Math.random() < dt * 30) emit(t.x, 1.1, t.z, 1, t.carry ? 0xffd28a : 0xffe9a8, 1.2, 0.6, 1.5, 0);
  }
  dummy.rotation.set(0, 0, 0);
  if (LK.weather === 'rain' && W.red <= 0 && !R.reduced) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 2 : 5); k++) emit(cx + (Math.random() - 0.5) * 46, 10 + Math.random() * 8, cz + (Math.random() - 0.5) * 46, 1, 0x6a64d8, 0.3, 0.7, -22, 26); }
  if (LK.weather === 'snow' && W.red <= 0 && !R.reduced) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 1 : 3); k++) emit(cx + (Math.random() - 0.5) * 50, 8 + Math.random() * 8, cz + (Math.random() - 0.5) * 50, 1, Math.random() < 0.16 ? 0xff9ac8 : 0xdfe6ff, 0.5, 2.4, -3.2, 1.2); }
  if (W.red > 0) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 3 : 8); k++) emit(cx + (Math.random() - 0.5) * 44, 10 + Math.random() * 8, cz + (Math.random() - 0.5) * 44, 1, 0xff3a3a, 0.3, 0.75, -20, 26); }
  tr[0].count = n0; tr[1].count = n1; hushEyes.count = n1; trHat.count = nh; LL.props.end(); // 0.20 props
  if (shadowI) { shadowI.count = shadowN; shadowI.instanceMatrix.needsUpdate = true; }
  bd.trooper.end(); bd.hush.end(); bd.hollow.end(); bd.thief.end();
  { const bp = bd.pines.begin(), br = bd.rocks.begin(); // painted scenery, once its sheets exist
    if ((bp || br) && !decorHidden) { decorHidden = true; decorPrims.forEach(function (o) { if ((o.userData.tree && bp) || (!o.userData.tree && br)) o.visible = false; }); }
    if (bp) { for (i = 0; i < decorTrees.length; i++) { const o = decorTrees[i]; bd.pines.put(Math.floor(o.seed * 2.999), o.x, 0, o.z, 9.6 * (0.85 + o.seed * 0.5), o.seed * 7 % 1 > 0.5, 0); } bd.pines.end(); }
    if (br) { for (i = 0; i < decorRocks.length; i++) { const o = decorRocks[i]; bd.rocks.put(Math.floor(o.seed * 2.999), o.x, 0, o.z, o.h * 1.2, o.seed * 7 % 1 > 0.5, 0); } bd.rocks.end(); } }
  tr[0].instanceMatrix.needsUpdate = tr[1].instanceMatrix.needsUpdate = hushEyes.instanceMatrix.needsUpdate = trHat.instanceMatrix.needsUpdate = true;
  // structures
  for (i = 0; i < structM.length; i++) {
    const m = structM[i], s = m.unit;
    m.lit.visible = s.alive; m.rub.visible = !s.alive;
    { const on = s.alive && !S.vuln(s), flat = !!(m.lit && m.lit.flat); m.ward.visible = on && !flat; m.wardRing.visible = on && flat; // a painted house gets a ring of light on the ground, not a glass box
      if (on && flat) m.wardRing.material.opacity = 0.35 + 0.2 * Math.sin(time * 2.4 + s.x); }
    if (s.alive) {
      if (m.spin) { m.spin.rotation.y += dt * 0.7; m.spin.position.y = 7.2 + Math.sin(time * 1.3 + s.team) * 0.4; m.halo.rotation.x = Math.PI / 2 + Math.sin(time * 0.8) * 0.3; m.halo.rotation.y += dt * 0.5; }
      const pulse = 1 + Math.sin(time * 2 + i) * 0.06 + (s.flash > 0 ? 0.35 : 0);
      const b = s.kind === 'patron' ? 22 : (s.kind === 'warden' ? 13 : 10) * (m.house ? 0.95 : 1); m.glow.scale.set(b * pulse, b * pulse, 1);
      m.glow.visible = !s.dark;
      if (m.lit.flat) { m.lit.flat.rotation.y = Math.atan2(camPos.x - s.x, camPos.z - s.z) - m.rotation.y; m.lit.flat.material.color.setScalar(s.dark ? 0.38 : 1); }
      if (m.paper) { if (m.baseEm == null) m.baseEm = m.paper.emissiveIntensity; m.paper.emissiveIntensity = s.dark ? 0.03 : m.baseEm; }
    }
  }
  for (i = 0; i < strayM.length; i++) {
    const m = strayM[i], s = m.unit; m.visible = s.alive;
    if (s.alive) { m.position.set(s.x, Math.sin(time * 2 + i) * 0.12, s.z); m.rotation.y = s.yaw; const sc = s.flash > 0 ? 1.1 : 1; m.scale.set(sc, sc, sc); }
  }
  {
    const n = W.ness, tgt = n.alive ? (n.rise - 1) * 8 : -11;
    nessY += (tgt - nessY) * Math.min(1, dt * (n.alive ? 6 : 1.4));
    if (nessM.isNess3d) LL.ness.frame(W, dt, time, camPos, camera); // 0.26 ness: the creature poses itself; below is the card of 0.25
    else { nessM.visible = nessY > -10.6; }
    if (!nessM.isNess3d && nessM.visible) {
      const sc = n.flash > 0 ? 1.04 : 1; nessM.scale.set(sc, sc, sc);
      nessM.position.set(n.x, nessY, n.z); nessM.rotation.y = n.yaw;
      if (nessM.flat) { const f = nessM.flat, tc = Math.atan2(camPos.x - n.x, camPos.z - n.z); let d = tc - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); f.rotation.y = tc - n.yaw; f.scale.x = f.userData.w * (d * PAPER_FLIP > 0 ? -1 : 1); }
      for (let k = 0; k < 6; k++) { const s = nessM.neck[k]; s.rotation.z = Math.sin(time * 1.3 + k * 0.7) * 0.06; s.rotation.x = s.baseX + Math.sin(time * 0.9 + k) * 0.03 - (n.spitT > 1.25 ? 0.05 : 0); }
      if (n.alive && Math.random() < dt * 1.6) ring(n.x + (Math.random() - 0.5) * 8, 0.03, n.z + (Math.random() - 0.5) * 8, 0.3, 2 + Math.random() * 3, 0x7fe0ff, 1.3);
    }
  }
  for (i = 0; i < fruitM.length; i++) {
    const m = fruitM[i], f = m.unit, here = !f.lens || f.lens === W.lens, s = f.ripe && here ? 1 : (f.lens ? 0.001 : 0.22);
    if (f.ripe && !here && !R.reduced && Math.random() < dt * 2.5) emit(f.x + (Math.random() - 0.5) * 1.5, 0.3 + Math.random() * 2.5, f.z + (Math.random() - 0.5) * 1.5, 1, 0xf4e8d6, 0.3, 1.1, 0.8, 0); // something is here, in another light
    m.fr.scale.x += (s - m.fr.scale.x) * Math.min(1, dt * 5); m.fr.scale.y = m.fr.scale.z = m.fr.scale.x;
    m.glow.visible = f.ripe && here; m.fr.rotation.y += dt * 0.9; m.fr.position.y = (m.big ? 3.1 : 1.9) + (f.ripe && !R.reduced ? Math.sin(time * 2.2 + i) * 0.14 : 0);
  }
  for (i = 0; i < creaseM.length; i++) {
    const cm = creaseM[i], c = W.creases[i];
    cm.f += ((c.t > 0 ? 1 : 0) - cm.f) * Math.min(1, dt * 3);
    cm.ridge.visible = cm.f > 0.01;
    if (cm.ridge.visible) { const p = cm.ridge.geometry.attributes.position, H = cm.f * 9; [1, 2, 4, 6, 9, 11].forEach(function (v) { p.setY(v, H); }); p.needsUpdate = true; cm.ridge.geometry.computeVertexNormals(); }
    const ready = c.t <= 0 && c.cd <= 0 && !c.guard.alive;
    cm.crane.visible = ready;
    if (ready) { cm.crane.rotation.y += dt * 0.8; cm.crane.position.y = 2.4 + Math.sin(time * 1.7 + i) * 0.25; const fl = Math.sin(time * 6) * 0.5; cm.crane.wl.rotation.z = fl; cm.crane.wr.rotation.z = -fl; }
  }
  for (i = 0; i < knotPool.length; i++) {
    const m = knotPool[i], k = W.knots[i];
    if (k && k.alive) { m.visible = true; m.position.set(k.x, 0, k.z); m.knot.rotation.y += dt * 3; m.knot.rotation.x += dt * 1.3; m.ring.material.color.copy(tc(SRC_TEAM[k.team])); }
    else m.visible = false;
  }
  // projectiles
  let np = 0, no = 0, nf = 0;
  const ps = W.projs;
  if (SH) SH.begin(dt, time, camera); // 0.26 shots
  for (i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p.vis === 'fawn') {
      if (nf < fawnPool.length) {
        const f = fawnPool[nf++]; f.visible = true; f.position.set(p.x, 0, p.z); f.rotation.y = Math.atan2(p.vx, p.vz);
        const g = Math.sin(time * 22); f.legs[0].rotation.x = g; f.legs[1].rotation.x = -g; f.legs[2].rotation.x = -g; f.legs[3].rotation.x = g; f.position.y = Math.abs(g) * 0.25;
        if (Math.random() < dt * 60) emit(p.x, 0.4, p.z, 2, 0xffc890, 3, 0.5, 1);
      }
      continue;
    }
    if (p.kind === 'orb') {
      if (no < 90) { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); const s = p.size * (1 + Math.sin(time * 30) * 0.15); dummy.scale.set(s, s, s); dummy.updateMatrix(); orbMesh.setMatrixAt(no, dummy.matrix); orbMesh.setColorAt(no++, tc(p.col || 0xffffff)); }
      if (Math.random() < dt * 50) emit(p.x, p.y, p.z, 1, p.col || 0xffffff, 1, 0.35, 0, 0);
      continue;
    }
    if (SH && SH.put(p)) continue; // 0.26 shots: gun and trooper shots are drawn there
    if (np >= 340) continue;
    const sp = Math.hypot(p.vx, p.vy, p.vz) || 1, len = p.kind === 'line' ? 5 : Math.min(3.2, sp * 0.028), w = p.kind === 'line' ? p.size : p.size * 0.8;
    dummy.position.set(p.x - p.vx / sp * len * 0.5, p.y - p.vy / sp * len * 0.5, p.z - p.vz / sp * len * 0.5);
    v1.set(p.x + p.vx, p.y + p.vy, p.z + p.vz); dummy.lookAt(v1); dummy.scale.set(w, w, len); dummy.updateMatrix();
    projMesh.setMatrixAt(np, dummy.matrix);
    projMesh.setColorAt(np++, tc(p.col ? p.col : (p.owner && p.owner.isPlayer ? 0xfff1c8 : (p.team === 0 ? 0xff9a5c : (p.team === 1 ? 0x6fffd0 : 0xc9a0ff)))));
  }
  for (; nf < fawnPool.length; nf++) fawnPool[nf].visible = false;
  // soul orbs
  for (i = 0; i < W.orbs.length; i++) {
    const o = W.orbs[i]; if (o.dead || no >= 90) continue;
    const s = 0.55 + Math.sin(time * 9 + i) * 0.1;
    dummy.position.set(o.x, o.y, o.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, s); dummy.updateMatrix();
    orbMesh.setMatrixAt(no, dummy.matrix); orbMesh.setColorAt(no++, tc(o.team === 0 ? 0xffb86a : 0x7dffd8));
  }
  if (SH) SH.end(); // 0.26 shots
  projMesh.count = np; orbMesh.count = no;
  projMesh.instanceMatrix.needsUpdate = orbMesh.instanceMatrix.needsUpdate = true;
  if (projMesh.instanceColor) projMesh.instanceColor.needsUpdate = true;
  if (orbMesh.instanceColor) orbMesh.instanceColor.needsUpdate = true;
  // zones
  for (i = 0; i < zonePool.length; i++) {
    const m = zonePool[i], z = W.zones[i];
    if (!z) { m.visible = false; continue; }
    m.visible = true; m.position.set(z.x, 0.07, z.z); m.ring.material.color.copy(tc(z.col)); m.disc.material.color.copy(tc(z.col));
    if (z.delay > 0) {
      const f = z.done ? 1 : U.clamp(z.t / z.delay, 0, 1);
      m.ring.scale.set(z.r, z.r, 1); m.disc.scale.set(z.r * f, z.r * f, 1); m.disc.material.opacity = 0.2 + f * 0.25;
    } else {
      const pu = 1 + Math.sin(time * 6) * 0.03; m.ring.scale.set(z.r * pu, z.r * pu, 1); m.disc.scale.set(z.r, z.r, 1); m.disc.material.opacity = 0.14;
      if (z.fx === 'sun') { for (let k = 0; k < 3; k++) if (Math.random() < dt * 40) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * z.r; emit(z.x + Math.cos(a) * rr, 9 + Math.random() * 4, z.z + Math.sin(a) * rr, 1, 0xffd28a, 0.5, 0.7, -14, 30); } }
      else if (Math.random() < dt * 14) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * z.r; emit(z.x + Math.cos(a) * rr, 0.2, z.z + Math.sin(a) * rr, 1, z.col, 0.3, 1, 2.5, 0); }
    }
  }
  for (i = 0; i < rings.length; i++) {
    const r = rings[i]; if (r.life <= 0) continue;
    r.t += dt; const f = r.t / r.life;
    if (f >= 1) { r.life = 0; r.m.visible = false; continue; }
    const e = 1 - (1 - f) * (1 - f), rad = U.lerp(r.r0, r.r1, e);
    r.m.ring.scale.set(rad, rad, 1); r.m.disc.scale.set(rad, rad, 1); r.m.ring.material.opacity = 0.5 * (1 - f); r.m.disc.material.opacity = 0.08 * (1 - f);
  }
  stepParticles(dt); stepPuffs(dt); stepGhosts(dt); if (LL.heroes3d) LL.heroes3d.step(dt, LK.add); /* 0.24 heroes3d */ stepFeel(dt);
  // camera
  const pl = view.target;
  if (view.mode === 'attract' || !pl) {
    attractCam(dt);
  } else {
    /* CAMERA. Aim stays exact (yaw and pitch are never smoothed); the follow height lags a little behind jumps and landings,
       a wall pulls the camera in at once and lets it out slowly, and a dash or a thread ride widens the view a touch. */
    const inAir = pl.onGround === false && !pl.zip; // 0.25 air: in the air the height follows slowly (2.2 up, 4 down), so a jump rises on the screen and a hover hangs above the line; on the ground and on a thread as before
    if (pivotY == null || Math.abs(pl.y - pivotY) > 4 || R.reduced) pivotY = pl.y; else pivotY += (pl.y - pivotY) * (1 - Math.exp(-dt * (pl.y > pivotY ? (inAir ? 2.2 : 9) : (inAir ? 4 : 13))));
    R.camPose(pl, view.yaw, view.pitch, view.zoom, cp);
    { const raw = R._btRaw == null ? 1 : R._btRaw; camBtS = raw < camBtS ? raw : camBtS + (raw - camBtS) * (1 - Math.exp(-dt * 3.5)); }
    fovKick += (((pl.dashT > 0 || pl.zip) && !R.reduced ? 1 : 0) - fovKick) * (1 - Math.exp(-dt * 7));
    camPos.x = cp.x; camPos.y = cp.y; camPos.z = cp.z; camDir.x = cp.dx; camDir.y = cp.dy; camDir.z = cp.dz; camDist = cp.dist;
    if (R.reduced) shake = 0;
    let sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - 0.5) * shake * 0.5; sy = (Math.random() - 0.5) * shake * 0.5; shake = Math.max(0, shake - dt * 2.2); }
    /* 0.23 shot kick: the camera is pushed back along its own line of sight and rolls a hair, then springs home. Both keep
       the centre of the screen on the same ray, so the crosshair stays exactly where the shot goes. */
    kick *= Math.exp(-dt * 16); const kb = kick * 0.11;
    camera.position.set(cp.x + sx - cp.dx * kb, cp.y + sy - cp.dy * kb, cp.z - cp.dz * kb);
    camera.lookAt(cp.x + sx + cp.dx * 50, cp.y + sy + cp.dy * 50, cp.z + cp.dz * 50);
    if (kick > 0.01) camera.rotateZ(kick * 0.006 * kickSide);
    camera.fov = (R.portrait ? 82 : 64) * (1 - view.zoom * 0.3) * (1 + fovKick * 0.07) * (1 + kick * 0.006);
    heroM.forEach(m => { if (m.unit === pl && cp.dist < 1.4) m.visible = false; });
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  // bars
  let nb = 0;
  v2.setFromMatrixColumn(camera.matrixWorld, 0);
  const us = W.units, q = camera.quaternion;
  for (i = 0; i < us.length && nb < 170; i++) {
    const u = us[i]; if (!u.alive) continue;
    if (u.kind === 'trooper' && !u.big && u.hp >= u.maxHp) continue;
    if (u.kind === 'stray' && u.hp >= u.maxHp) continue;
    if (u === pl && view.mode !== 'attract') continue;
    const dx = u.x - camPos.x, dz = u.z - camPos.z, d2 = dx * dx + dz * dz; if (d2 > (u.struct || u.kind === 'ness' ? 150 * 150 : 75 * 75) || d2 < 10) continue;
    const near = u.struct ? 1 : Math.min(1, Math.max(0.4, Math.sqrt(d2) / 9));
    let w = u.big ? 2.8 : 1, hgt = u.big ? 0.22 : 0.11, y = u.y + u.h * (u.big ? 2.3 : 1) + 0.45;
    if (u.kind === 'hero') { w = 1.7; hgt = 0.2; y = u.y + u.h + 0.6; } else if (u.struct) { w = 5.5; hgt = 0.4; y = (u.team === 0 && u.kind !== 'patron') ? (u.kind === 'warden' ? 10.4 : 7.6) : u.h + 1.6; } else if (u.kind === 'stray') { w = 2.2; hgt = 0.16; y = 3.6; } else if (u.kind === 'ness') { w = 7; hgt = 0.45; y = 9; }
    w *= near; hgt *= near;
    const f = Math.max(0, u.hp / u.maxHp);
    dummy.position.set(u.x, y, u.z); dummy.quaternion.copy(q); dummy.scale.set(w + 0.08, hgt + 0.08, 1); dummy.updateMatrix(); barBg.setMatrixAt(nb, dummy.matrix);
    const off = -(1 - f) * w * 0.5;
    dummy.position.set(u.x + v2.x * off, y + v2.y * off, u.z + v2.z * off); dummy.scale.set(Math.max(0.001, w * f), hgt, 1); dummy.updateMatrix(); barFill.setMatrixAt(nb, dummy.matrix);
    barFill.setColorAt(nb, tc(u.team === 0 ? SRC_TEAM[0] : (u.team === 1 ? SRC_TEAM[1] : 0xc9a0ff)));
    nb++;
  }
  drawCues();
  if (SCN) SCN.frame(dt, time, camera); // scenery: shared time, camera and point scale; pools dim with their structures
  barBg.count = barFill.count = nb; barBg.instanceMatrix.needsUpdate = barFill.instanceMatrix.needsUpdate = true;
  if (barFill.instanceColor) barFill.instanceColor.needsUpdate = true;
  draw();
};
R.cam = function () { return camPos; };
R._calls = function () { return renderer ? renderer.info.render.calls : 0; }; // for tools: draw calls in the last pass rendered (the final post quad when post is on)
})();
