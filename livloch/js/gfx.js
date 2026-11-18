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
let T, renderer, scene, camera, W = null, glowTex, time = 0;
let dummy, tmpC, v1, v2, v3;
let world, dyn, sky, stars;
let tr = [null, null], hushEyes, trHat, barBg, barFill, projMesh, orbMesh, parts, staticGlow;
let nessM = null, nessY = -11, creaseM = [], cueDash = null, cueRings = [], fruitM = [];
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
  mats = {}; tcCache = {}; fruitM = []; cueDash = null; cueRings = []; creaseM = []; heroM = []; echoM = null; structM = []; strayM = []; knotPool = []; fawnPool = []; zonePool = []; rings = []; nessM = null; R.decor = false;
  renderer.setClearColor(LK.clear);
  scene = new T.Scene(); scene.fog = new T.Fog(LK.fog[0], LK.fog[1], LK.fog[2]);
  scene.add(new T.HemisphereLight(LK.hemi[0], LK.hemi[1], LK.hemi[2]));
  const moon = new T.DirectionalLight(LK.dir[0], LK.dir[1]); moon.position.set(-40, 80, 60); scene.add(moon);
  world = new T.Group(); scene.add(world); dyn = new T.Group(); scene.add(dyn);
  buildSky(); buildGround(); buildThreads(); buildInstanced(); buildParticles(); buildPools(); buildCreaseArt();
  applyLook();
}
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
  dummy = new T.Object3D(); tmpC = new T.Color(); v1 = new T.Vector3(); v2 = new T.Vector3(); v3 = new T.Vector3();
  glowTex = makeGlow();
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
  flatLoad('backdrop', function (t) { // the far ridge: one wide painting wrapped round the valley, mirrored so the seam never shows
    t.wrapS = T.MirroredRepeatWrapping; t.repeat.x = 2; t.needsUpdate = true;
    const mt = new T.MeshBasicMaterial({ map: t, side: T.BackSide, fog: false }); // opaque and depth-writing, so the sky dome behind it cannot paint over it mt.userData.lk = true; mt.userData.solid = true; mt.userData.bl = true;
    const hgt = 2 * Math.PI * 560 / 2 * (t.image.height / t.image.width), c = new T.Mesh(new T.CylinderGeometry(560, 560, hgt, 48, 1, true), mt); c.position.y = hgt * 0.4; c.scale.x = -1; scene.add(c);
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
function buildGround() {
  const sx = 2 * C.HALF_X + 190, sz = 2 * C.HALF_Z + 190;
  let g = new T.PlaneGeometry(sx, sz, 100, 150); g.rotateX(-Math.PI / 2);
  const wallK = FLATS.backdrop && !R.noPaper ? 0.2 : 1; // with a painted backdrop the valley walls drop to foothills so the painting shows
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), q = { s: 0, d: 0 };
  const G = LK.ground, jungA = new T.Color(G.a), jungB = new T.Color(G.b), lane = new T.Color(G.lane), laneC = new T.Color(G.laneC);
  const ember = new T.Color(LK.team[0]), mint = new T.Color(LK.team[1]), rock = new T.Color(G.rock), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let d = 1e9; for (let l = 0; l < 3; l++) { LL.laneNearest(l, x, z, q); if (q.d < d) d = q.d; }
    const ox = Math.max(0, Math.abs(x) - C.HALF_X), oz = Math.max(0, Math.abs(z) - C.HALF_Z), out = Math.hypot(ox, oz);
    const n = noise(x * 0.06, z * 0.06), n2 = noise(x * 0.31 + 9, z * 0.31);
    p.setY(i, out > 0 ? (Math.pow(out, 1.3) * 0.5 * (0.55 + n * 1.1) + n2 * 1.5) * wallK : 0);
    c.copy(jungA).lerp(jungB, n);
    const base = Math.min(Math.hypot(x, z + C.SPAWN_Z), Math.hypot(x, z - C.SPAWN_Z));
    const lt = Math.max(U.clamp((9.5 - d) / 4.5, 0, 1), U.clamp((30 - base) / 8, 0, 1));
    if (lt > 0) { c.lerp(lane, lt); c.lerp(laneC, lt * U.clamp((4 - d) / 4, 0, 1) * 0.7); }
    c.lerp(z < 0 ? ember : mint, 0.05 + 0.1 * U.clamp((Math.abs(z) - 70) / 60, 0, 1));
    if (out > 0) c.lerp(rock, U.clamp(out / 14, 0, 1));
    const ld = Math.hypot(x - C.LOCH.x, z - C.LOCH.z); if (ld < 14) c.lerp(rock, U.clamp((14 - ld) / 4, 0, 1) * 0.75);
    const j = 0.9 + n2 * 0.22;
    cols[i * 3] = c.r * j; cols[i * 3 + 1] = c.g * j; cols[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  g = g.toNonIndexed(); g.computeVertexNormals();
  world.add(own(new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true }))));
  if (LK.grid) { const gh = new T.GridHelper(360, 90, LK.team[0], 0x4a3150); gh.position.y = 0.05; gh.material.transparent = true; gh.material.opacity = 0.5; world.add(own(gh)); }
  // fountains
  for (let t = 0; t < 2; t++) {
    const ring = new T.Mesh(new T.RingGeometry(C.FOUNT_R - 0.5, C.FOUNT_R, 48), new T.MeshBasicMaterial({ color: SRC_TEAM[t], transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.06, (t ? 1 : -1) * C.SPAWN_Z); world.add(ring);
  }
  // the loch
  const water = new T.Mesh(new T.CircleGeometry(C.LOCH.r, 44), new T.MeshBasicMaterial({ color: LK.ground.water, transparent: true, opacity: 0.88, depthWrite: false }));
  own(water); water.rotation.x = -Math.PI / 2; water.position.set(C.LOCH.x, 0.07, C.LOCH.z); world.add(water);
  const shore = new T.Mesh(new T.RingGeometry(C.LOCH.r - 0.35, C.LOCH.r + 0.25, 48), new T.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(C.LOCH.x, 0.08, C.LOCH.z); world.add(shore);
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
  bd = { trooper: new Boards('trooper', 90), hush: new Boards('hush', 110), hollow: new Boards('hollow', 40), thief: new Boards('thief', 40), pines: new Boards('pines', 400), rocks: new Boards('rocks', 400) };
  const bodyG = cyl(0.42, 0.52, 1.0, 6); bodyG.translate(0, 0.75, 0);
  tr[0] = new T.InstancedMesh(bodyG, new T.MeshLambertMaterial({ color: SRC_TEAM[0], emissive: SRC_TEAM[0], emissiveIntensity: 0.5 }), 90);
  // the Hush: torn tissue paper, the coldest thing on screen, with pale lilac eyes (Reignfawn)
  const hushG = new T.CylinderGeometry(0.1, 0.66, 1.4, 9, 3, true); { const hp = hushG.attributes.position; for (let i = 0; i < hp.count; i++) { const y = hp.getY(i); if (y < -0.2) { const k = (y < -0.6 ? 1 : 0.45), j = Math.sin(i * 12.9898) * 43758.5453, r = (j - Math.floor(j)) - 0.5; hp.setX(i, hp.getX(i) * (1 + r * 0.7 * k)); hp.setZ(i, hp.getZ(i) * (1 + r * 0.7 * k)); hp.setY(i, y + r * 0.42 * k); } } }
  hushG.translate(0, 0.72, 0); const hushGeo = flat(hushG);
  tr[1] = own(new T.InstancedMesh(hushGeo, new T.MeshLambertMaterial({ color: LK.hush || 0x1c1426, emissive: LK.hushEm || 0x6a5a9a, emissiveIntensity: LK.hushEmI || 0.3, side: T.DoubleSide }), 110));
  const eyeG = new T.BoxGeometry(0.5, 0.15, 0.08); eyeG.translate(0, 0.96, 0.34);
  hushEyes = own(new T.InstancedMesh(eyeG, new T.MeshBasicMaterial({ color: 0xf2e2ff, fog: false }), 110));
  hushEyes.frustumCulled = false; hushEyes.count = 0; dyn.add(hushEyes);
  for (let t = 0; t < 2; t++) { tr[t].frustumCulled = false; tr[t].count = 0; dyn.add(tr[t]); }
  const hatG = flat(new T.ConeGeometry(0.66, 0.5, 6)); hatG.translate(0, 1.5, 0);
  trHat = new T.InstancedMesh(hatG, mat(0x2b1b2f), 180); trHat.frustumCulled = false; trHat.count = 0; dyn.add(trHat);
  const pg = new T.PlaneGeometry(1, 1);
  barBg = new T.InstancedMesh(pg, new T.MeshBasicMaterial({ color: 0x120c18, transparent: true, opacity: 0.75, depthWrite: false, fog: false }), 170);
  barFill = new T.InstancedMesh(pg, new T.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, fog: false, transparent: true }), 170);
  barBg.userData.rt = barFill.userData.rt = true; barBg.frustumCulled = barFill.frustumCulled = false; barBg.renderOrder = 8; barFill.renderOrder = 9; initColor(barFill, 170); barBg.count = barFill.count = 0;
  dyn.add(barBg); dyn.add(barFill);
  projMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }), 340);
  projMesh.userData.rt = true; projMesh.frustumCulled = false; initColor(projMesh, 340); projMesh.count = 0; dyn.add(projMesh);
  orbMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false, fog: false }), 90);
  orbMesh.userData.rt = true; orbMesh.frustumCulled = false; initColor(orbMesh, 90); orbMesh.count = 0; dyn.add(orbMesh);
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
R.info = function () { // for the frame-rate report
  let gpu = 'unknown'; try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) {}
  return { gpu: String(gpu).slice(0, 90), w: R.w, h: R.h, pr: renderer ? renderer.getPixelRatio() : 1, low: !!R.low, look: LK.name, gl2: !!(renderer && renderer.capabilities.isWebGL2) };
};
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
  dora: { src: 'art/heroes/dora.png', h: 2.45, hem: 0.2, motion: 'art/heroes/dora-motion.png' }, // her cloak hides her arms; they appear only when she aims
  anna: { src: 'art/heroes/anna.png', h: 2.4, hem: 0.3, motion: 'art/heroes/anna-motion.png', arms: { y: 0.685, x: 0.105, len: 0.367 } },
  myra: { src: 'art/heroes/myra.png', h: 1.95, hem: 0.22, motion: 'art/heroes/myra-motion.png', arms: { y: 0.6, x: 0.19, len: 0.356 } },
  skein: { src: 'art/heroes/skein.png', h: 2.2, hem: 0.27, motion: 'art/heroes/skein-motion.png', arms: { y: 0.66, x: 0.13, len: 0.352 } }
};
const paperTex = {}, PAPER_FLIP = -1;
function paperFor(g, id) {
  const P = PAPER[id]; if (!P || R.noPaper) return;
  const put = function (base) {
    const tex = base.clone(); tex.needsUpdate = true; tex.repeat.set(0.25, 1);
    const mt = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.45, side: T.DoubleSide }); mt.userData.lk = true; mt.userData.solid = true; mt.userData.bl = true;
    /* A paper puppet, cut from the one picture: the body from the hem up, and the legs below it as separate pieces hinged at
       the hem. Front, back and three-quarter views use a left and a right leg; the side view uses the whole leg strip twice,
       one swinging forward and one back. P.hem is how far up the figure the hem is (0 to 1). */
    const wd = P.h * (base.image.width / 4) / base.image.height, hf = P.hem || 0.2, pp = new T.Group();
    const part = function (u0, u1, v0, v1, m2) {
      const gq = new T.PlaneGeometry(wd * (u1 - u0), P.h * (v1 - v0)); gq.translate(((u0 + u1) / 2 - 0.5) * wd, -P.h * (v1 - v0) / 2, 0);
      const uv = gq.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
      const ms = new T.Mesh(gq, m2 || mt); pp.add(ms); return ms;
    };
    const P_ = pp.parts = { body: part(0, 1, Math.max(0, hf - 0.035), 1), legL: part(0, 0.5, 0, hf), legR: part(0.5, 1, 0, hf), legA: part(0, 1, 0, hf), legB: part(0, 1, 0, hf) };
    P_.body.position.set(0, P.h, 0.03); P_.legB.position.z = -0.02; pp.material = mt; pp.h = P.h; pp.hem = hf * P.h; g.add(pp);
    /* The motion sheet, when there is one: bodies drawn without arms (front, side, back), one arm from the side and one from
       the front, and an aiming pose from behind and from the side. The body pieces switch to this picture for those views;
       the arms hang from the shoulders and swing; while the hero is firing the aiming pose is shown. */
    if (P.motion) new T.TextureLoader().load(P.motion, function (t2) {
      t2.minFilter = T.LinearFilter; t2.generateMipmaps = false; t2.repeat.set(1 / 7, 1);
      pp.mat1 = mt; pp.mat2 = flatMat(t2); pp.r2 = ((t2.image.width / 7) / t2.image.height * P.h) / wd; // how much wider a motion cell is than a turnaround cell
      if (P.arms) { const ta = t2.clone(); ta.needsUpdate = true; ta.repeat.set(1 / 7, 1); const ma = flatMat(ta); pp.matA = ma;
        P_.armL = part(0, 1, 1 - P.arms.len, 1, ma); P_.armR = part(0, 1, 1 - P.arms.len, 1, ma); P_.armR.scale.x = -1; }
    }, undefined, function () {});
    g.paper = pp; g.body.visible = false; g.legL.visible = false; g.legR.visible = false;
  };
  if (paperTex[id]) { put(paperTex[id]); return; }
  new T.TextureLoader().load(P.src, function (t) { t.minFilter = T.LinearFilter; t.generateMipmaps = false; paperTex[id] = t; if (g.parent) put(t); }, undefined, function () {});
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
  dyn.add(g); paperFor(g, d.id); return g;
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
  } else {
    const big = s.kind === 'warden', hh = big ? 7.5 : 5.5;
    mesh(cyl(s.r * 0.8, s.r, 2, 6), stone, 0, 1, 0, g);
    mesh(cyl(big ? 1.5 : 1.25, big ? 1.8 : 1.5, hh, 4), paper, 0, 2 + hh / 2, 0, lit);
    mesh(box(big ? 3.4 : 2.9, 0.3, big ? 3.4 : 2.9), dark, 0, 2 + hh * 0.5, 0, lit).rotation.y = Math.PI / 4;
    mesh(flat(new T.ConeGeometry(big ? 2.9 : 2.4, 2, 4)), dark, 0, 3 + hh, 0, lit);
    if (big) mesh(flat(new T.ConeGeometry(1.5, 1.4, 4)), dark, 0, 4.4 + hh, 0, lit);
    g.glow = glowSprite(tc, big ? 13 : 10, lit, 0, 2 + hh / 2, 0);
  }
  g.add(lit); g.house = s.team === 0 && s.kind !== 'patron';
  const rub = new T.Group(); mesh(flat(new T.IcosahedronGeometry(1.4, 0)), stone, 0.6, 0.5, 0.3, rub); mesh(flat(new T.IcosahedronGeometry(1, 0)), dark, -0.9, 0.4, -0.5, rub); mesh(box(1.6, 0.4, 1.2), stone, 0, 0.2, 1.1, rub).rotation.y = 0.5; rub.visible = false; g.add(rub);
  const ward = new T.Mesh(new T.CylinderGeometry(s.r + 1.4, s.r + 1.4, s.h + 1, 14, 1, true), new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.13, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
  ward.position.y = (s.h + 1) / 2; g.add(ward);
  g.lit = lit; g.rub = rub; g.ward = ward; g.unit = s; g.paper = paper; g.position.set(s.x, 0, s.z); dyn.add(g);
  standFlat(lit, s.team === 0 ? 'house' : 'tower', s.kind === 'patron' ? 2 : (s.kind === 'warden' ? 1 : 0), 14.5, // the sheet draws the three sizes to scale in equal cells, so every cell gets the same height
    function () { return lit.children.filter(function (c) { return c !== g.glow; }).concat(g.children.filter(function (c) { return c.isMesh && c !== ward; })); });
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
  const rm = new T.InstancedMesh(flat(new T.IcosahedronGeometry(1, 0)), new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, rocks.length));
  rocks.forEach(function (o, i) {
    dummy.position.set(o.x, o.h * 0.32, o.z); dummy.rotation.set(o.seed * 3, o.seed * 17, o.seed * 7); dummy.scale.set(o.r * 1.12, o.h * 0.75, o.r * 1.12); dummy.updateMatrix();
    rm.setMatrixAt(i, dummy.matrix); rm.setColorAt(i, tmpC.setHex(0x4a3d52).lerp(new T.Color(0x35454f), o.seed));
  });
  world.add(rm); decorPrims = [rm]; decorTrees = trees; decorRocks = rocks; decorHidden = false;
  const tg = cyl(0.3, 0.55, 3, 5); tg.translate(0, 1.5, 0);
  const c1 = flat(new T.ConeGeometry(2.6, 4.2, 6)); c1.translate(0, 4.6, 0);
  const c2 = flat(new T.ConeGeometry(1.9, 3.6, 6)); c2.translate(0, 7.2, 0);
  const tm = new T.InstancedMesh(tg, mat(0x3a2a3c), Math.max(1, trees.length));
  const m1 = new T.InstancedMesh(c1, new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, trees.length));
  const m2 = new T.InstancedMesh(c2, new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, trees.length));
  trees.forEach(function (o, i) {
    const sc = 0.85 + o.seed * 0.5;
    dummy.position.set(o.x, 0, o.z); dummy.rotation.set(0, o.seed * 6, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
    tm.setMatrixAt(i, dummy.matrix); m1.setMatrixAt(i, dummy.matrix); m2.setMatrixAt(i, dummy.matrix);
    const rose = o.seed > 0.72;
    m1.setColorAt(i, tmpC.setHex(rose ? 0x9a3f4a : 0x24505a)); m2.setColorAt(i, tmpC.setHex(rose ? 0xc4605a : 0x2f6a6a));
  });
  world.add(tm); world.add(m1); world.add(m2); [tm, m1, m2].forEach(function (o) { o.userData.tree = true; decorPrims.push(o); });
  if (LK.snowcaps) {
    const cg = flat(new T.ConeGeometry(1.25, 1.7, 6)); cg.translate(0, 8.35, 0);
    const c3 = flat(new T.ConeGeometry(2.0, 0.9, 6)); c3.translate(0, 6.1, 0);
    const cm = new T.InstancedMesh(cg, mat(0xc8ccf0), Math.max(1, trees.length)), cm2 = new T.InstancedMesh(c3, mat(0xc8ccf0), Math.max(1, trees.length));
    trees.forEach(function (o, i) { const sc = 0.85 + o.seed * 0.5; dummy.position.set(o.x, 0, o.z); dummy.rotation.set(0, o.seed * 6, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); cm2.setMatrixAt(i, dummy.matrix); });
    world.add(cm); world.add(cm2); [cm, cm2].forEach(function (o) { o.userData.tree = true; decorPrims.push(o); });
    const rs = new T.InstancedMesh(flat(new T.IcosahedronGeometry(1, 0)), mat(0xc8ccf0), Math.max(1, rocks.length));
    rocks.forEach(function (o, i) { dummy.position.set(o.x, o.h * 0.62, o.z); dummy.rotation.set(o.seed * 3, o.seed * 17, o.seed * 7); dummy.scale.set(o.r * 0.95, o.h * 0.42, o.r * 0.95); dummy.updateMatrix(); rs.setMatrixAt(i, dummy.matrix); });
    world.add(rs); decorPrims.push(rs);
  }
  dummy.rotation.set(0, 0, 0);
}
R.build = function (w) {
  W = w;
  heroM.concat(structM, strayM).forEach(function (g) { dyn.remove(g); });
  if (!nessM) nessM = nessModel(); nessY = -11;
  heroM = W.heroes.map(heroModel); structM = W.structs.map(structModel); strayM = W.strays.map(strayModel);
  buildDecor(); buildCues(); buildFruitArt();
  for (let i = 0; i < PN_MAX; i++) { pLife[i] = 0; pPos[i * 3 + 1] = -999; }
  rings.forEach(r => { r.life = 0; r.m.visible = false; });
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
  switch (e.k) {
    case 'echo': case 'echoend': for (let k = 0; k < 14; k++) emit(e.x, 0.4 + Math.random() * 1.6, e.z, 1, 0x9fd0ff, 2.2, 0.6, 1.5, 0); break;
    case 'echoshot': emit(e.x, e.y, e.z, 2, 0x9fd0ff, 1.5, 0.25, 0, 0); break;
    case 'hit': {
      const col = e.tk === 'hero' ? 0xfff0d0 : (e.tk === 'trooper' ? 0xffc890 : 0xbfd0ff);
      if (e.kind === 'gun') emit(e.x, e.y, e.z, e.crit ? 5 : 2, e.crit ? 0xffe070 : col, 4, 0.3, 1);
      else if (e.kind === 'ab') emit(e.x, e.y, e.z, 6, 0xffffff, 5, 0.4, 2);
      if (e.p === 2) shake = Math.min(0.5, shake + Math.min(0.3, e.amt / 250));
      break;
    }
    case 'shot': {
      emit(e.x, e.y, e.z, 2, e.u.def.col, 2.5, 0.12, 0, 0);
      const m = heroM[W.heroes.indexOf(e.u)]; if (m) m.recoil = 1;
      break;
    }
    case 'impact': emit(e.x, e.y, e.z, 2, 0xd0c0b0, 3, 0.25, 1.5); break;
    case 'death': {
      const col = e.team === 2 ? 0xc9a0ff : SRC_TEAM[e.team];
      if (e.kind === 'trooper') emit(e.x, 1, e.z, 14, col, 6, 0.7, 3);
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
    case 'jump': if (e.dbl) emit(e.u.x, e.u.y, e.u.z, 8, 0xf4e8d6, 3, 0.35, -1, 0); break;
    case 'dash': emit(e.u.x, e.u.y + 0.8, e.u.z, 10, 0xf4e8d6, 3, 0.35, 0, 0); break;
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
         ledger with a double exposure, 7 rainwake: wet glass and red streaks. */
      mComp = new T.ShaderMaterial(Object.assign({ uniforms: { t: { value: null }, b: { value: null }, k: { value: 0.8 }, m: { value: 0 }, tm: { value: 0 }, px: { value: new T.Vector2(1, 1) } }, vertexShader: vs, fragmentShader: ' uniform sampler2D t; uniform sampler2D b; uniform float k; uniform float m; uniform float tm; uniform vec2 px; varying vec2 vUv; float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); } float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); } float edge(vec2 uv, float w){   vec2 d = px * w;   float a = lum(texture2D(t, uv + vec2(-d.x, -d.y)).rgb), bb = lum(texture2D(t, uv + vec2(0.0, -d.y)).rgb), c = lum(texture2D(t, uv + vec2(d.x, -d.y)).rgb);   float e = lum(texture2D(t, uv + vec2(-d.x, 0.0)).rgb), g = lum(texture2D(t, uv + vec2(d.x, 0.0)).rgb);   float h = lum(texture2D(t, uv + vec2(-d.x, d.y)).rgb), i = lum(texture2D(t, uv + vec2(0.0, d.y)).rgb), j = lum(texture2D(t, uv + vec2(d.x, d.y)).rgb);   float gx = -a - 2.0 * e - h + c + 2.0 * g + j, gy = -a - 2.0 * bb - c + h + 2.0 * i + j; return sqrt(gx * gx + gy * gy); } void main(){   vec2 uv = vUv; vec2 fc = vUv / px; vec2 q = vUv - 0.5; float vig = dot(q, q);   if (m > 6.5) { uv.x += (noise(vec2(uv.x * 60.0, uv.y * 8.0 + tm * 3.0)) - 0.5) * 0.004; uv.y += (noise(uv * 40.0 + tm) - 0.5) * 0.003; }   vec3 c = texture2D(t, uv).rgb + texture2D(b, uv).rgb * k;   if (m < 0.5) { }   else if (m < 1.5) {     float l = lum(c); float e = smoothstep(0.16, 0.45, edge(uv, 1.5));     float h1 = step(0.5, fract((fc.x + fc.y) / 7.0)), h2 = step(0.5, fract((fc.x - fc.y) / 7.0));     float tone = 0.07; if (l > 0.52) tone = 1.0; else if (l > 0.3) tone = mix(0.6, 1.0, h1); else if (l > 0.13) tone = mix(0.22, 0.7, h1 * h2);     vec3 paper = vec3(0.93, 0.90, 0.84) * (0.93 + 0.07 * noise(fc * 0.7));     vec3 tint = clamp(c / max(l, 0.08), 0.0, 2.0);     c = paper * tone * mix(vec3(1.0), tint, 0.42);     c = mix(c, vec3(0.06, 0.05, 0.09), e);   } else if (m < 2.5) {     float e = smoothstep(0.10, 0.30, edge(uv, 1.0));     c = floor(c * 5.0 + 0.5) / 5.0; c *= 0.955 + 0.045 * noise(fc * 0.5);     c = mix(c, c * 0.42, e);   } else if (m < 3.5) {     float e = smoothstep(0.22, 0.55, edge(uv, 2.0));     c = mix(c, floor(c * 7.0 + 0.5) / 7.0, 0.45); c += (noise(fc * 0.22) - 0.5) * 0.05; c = mix(c, c * 0.55, e * 0.65);     float r = length(q * vec2(1.0, 1.12)), dk = (noise(vec2(atan(q.y, q.x) * 7.0, 3.0)) - 0.5) * 0.035;     float page = smoothstep(0.585 + dk, 0.615 + dk, r);     c = mix(c, vec3(0.95, 0.92, 0.84) * (0.94 + 0.06 * noise(fc * 0.6)), page);     c = mix(c, vec3(0.35, 0.27, 0.2), page * (1.0 - smoothstep(0.615 + dk, 0.63 + dk, r)) * 0.6);   } else if (m < 4.5) {     float e = edge(uv, 1.2), off = 0.003;     vec3 ca = vec3(texture2D(t, uv + vec2(off, 0.0)).r, c.g, texture2D(t, uv - vec2(off, 0.0)).b);     c = ca * 0.55 + clamp(c / max(lum(c), 0.1), 0.0, 2.5) * smoothstep(0.15, 0.7, e) * 0.9;     c *= 0.82 + 0.18 * step(0.5, fract(fc.y / 3.0));     float dots = smoothstep(0.35, 0.45, length(fract(fc / 7.0) - 0.5)); c = mix(c, c * 0.7, (1.0 - dots) * smoothstep(0.25, 0.0, lum(c)));   } else if (m < 5.5) {     float l = lum(c); c *= smoothstep(-0.05, 0.45, l) * 1.2; c = mix(c, c * vec3(1.12, 0.9, 0.66), 0.45);     c *= clamp(1.0 - vig * 1.9, 0.0, 1.0); c += texture2D(b, uv).rgb * 0.55;   } else if (m < 6.5) {     c = mix(c, texture2D(t, uv + vec2(0.007, 0.004)).rgb, 0.32);     float l = lum(c); c = mix(vec3(l) * vec3(1.08, 0.96, 0.78), c, 0.22);     c *= 0.9 + 0.1 * step(0.07, fract(fc.y / 30.0)); c += (hash(fc + tm) - 0.5) * 0.07; c *= clamp(1.0 - vig * 1.3, 0.0, 1.0);   } else {     float s = step(0.988, hash(vec2(floor(fc.x / 2.0), floor((fc.y + tm * 900.0) / 46.0))));     c += vec3(0.55, 0.18, 0.18) * s * 0.5; c = mix(c, c * vec3(1.15, 0.78, 0.8), 0.4); c *= clamp(1.0 - vig, 0.0, 1.0);   }   gl_FragColor = vec4(c, 1.0); }' }, o));
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
  const px = h.x, py = h.y + 1.65, pz = h.z;
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
const cp = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1, dist: 5 };
R.frame = function (dt, view) {
  if (!R.ok || !W) return;
  time += dt;
  let i;
  // heroes
  for (i = 0; i < heroM.length; i++) {
    const m = heroM[i], h = m.unit;
    m.visible = h.alive; if (!h.alive) continue;
    m.position.set(h.x, h.y, h.z); m.rotation.y = h.yaw;
    const sp = Math.hypot(h.vx, h.vz);
    m.phase += dt * Math.min(sp, 9) * 1.7;
    const sw = h.zip ? 0.55 : (h.onGround ? Math.sin(m.phase) * Math.min(1, sp / 5) * 0.8 : 0.5);
    m.legL.rotation.x = sw; m.legR.rotation.x = h.zip ? -0.35 : -sw;
    m.body.rotation.x = h.dashT > 0 || h.zip ? 0.45 : Math.min(0.22, sp * 0.02);
    if (h.zip && Math.random() < dt * 40) emit(h.x, 0.25, h.z, 1, 0xffe2a0, 1.5, 0.6, 1.2, 0);
    m.body.position.y = h.onGround ? Math.abs(Math.sin(m.phase)) * 0.05 * Math.min(1, sp / 5) : 0;
    if (m.recoil > 0) m.recoil = Math.max(0, m.recoil - dt * 9);
    m.arm.rotation.x = -h.pitch - m.body.rotation.x - m.recoil * 0.25;
    m.arm.position.z = 0.1 - m.recoil * 0.12;
    if (m.paper) { // face the camera; pick the painted view from the angle between the hero's facing and the camera
      const toCam = Math.atan2(camera.position.x - h.x, camera.position.z - h.z); let d = toCam - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      const ad = Math.abs(d), v = ad < 0.5 ? 0 : (ad < 1.2 ? 3 : (ad < 2.2 ? 1 : 2));
      const pp = m.paper, P_ = pp.parts, mv = Math.min(1, sp / 5), sw = h.onGround ? Math.sin(m.phase) * mv : 0.7, side = v === 1;
      const flip = (v === 1 || v === 3) && d * PAPER_FLIP > 0 ? -1 : 1, firing = W.t - h.lastShotT < 0.32;
      // which picture and which cell: the motion sheet for front, side and back once it has loaded; the aiming pose while firing
      let useM = !!pp.mat2 && v !== 3, cell = v, wide = 1;
      if (useM) { cell = v === 0 ? 0 : (v === 1 ? 1 : 2); if (firing && v === 2) cell = 5; else if (firing && v === 1) cell = 6; wide = pp.r2; }
      const mat = useM ? pp.mat2 : (pp.mat1 || pp.material);
      if (P_.body.material !== mat) { P_.body.material = P_.legL.material = P_.legR.material = P_.legA.material = P_.legB.material = mat; }
      mat.map.offset.x = useM ? cell / 7 : v * 0.25; pp.rotation.y = toCam - h.yaw;
      pp.scale.x = flip * wide;
      pp.rotation.x = h.dashT > 0 || h.zip ? -0.3 : 0;
      if (P_.armL) { const A = PAPER[h.def.id].arms, show = useM && cell < 3, sy = A.y * pp.h, sx = A.x * pp.h / wide;
        P_.armL.visible = show; P_.armR.visible = show && !side;
        if (show) { pp.matA.map.offset.x = (side ? 3 : 4) / 7;
          if (side) { P_.armL.position.set(0, sy, 0.05); P_.armL.rotation.z = -sw * 0.5; }
          else { P_.armL.position.set(-sx, sy + Math.max(0, -sw) * 0.03, -0.02); P_.armR.position.set(sx, sy + Math.max(0, sw) * 0.03, -0.02); P_.armL.rotation.z = -0.05 - sw * 0.06; P_.armR.rotation.z = 0.05 - sw * 0.06; } } }
      // walking: seen from the side the legs scissor; seen from front or back they lift in turn
      P_.legL.visible = P_.legR.visible = !side; P_.legA.visible = P_.legB.visible = side;
      if (side) { P_.legA.position.y = P_.legB.position.y = pp.hem; P_.legA.rotation.z = sw * 0.62; P_.legB.rotation.z = -sw * 0.62; }
      else { const lift = pp.hem * 0.42; P_.legL.position.y = pp.hem + Math.max(0, sw) * lift; P_.legR.position.y = pp.hem + Math.max(0, -sw) * lift; P_.legL.rotation.z = sw * 0.07; P_.legR.rotation.z = sw * 0.07; }
      // the body rides the step: up twice per stride, a little sway, a breath when standing
      P_.body.position.y = pp.h + (h.onGround ? Math.abs(Math.sin(m.phase)) * 0.07 * mv : 0.05);
      P_.body.rotation.z = Math.sin(m.phase) * 0.045 * mv; P_.body.scale.y = 1 + Math.sin(time * 2.1) * 0.008 * (1 - mv);
    }
    m.ring.visible = h.onGround || !!h.zip; m.ring.position.y = h.zip ? 0.05 - h.y : 0.05; m.shield.visible = h.shield > 0;
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
    if (e && !echoM) { const id = W.player.def.id, pt = paperTex[id]; let m;
      if (pt) { const t = pt.clone(); t.needsUpdate = true; t.repeat.set(0.25, 1); t.offset.x = 0.5; const P = PAPER[id]; m = new T.Mesh(new T.PlaneGeometry(P.h * (pt.image.width / 4) / pt.image.height, P.h), new T.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, color: 0x9fd0ff, side: T.DoubleSide, depthWrite: false })); m.userData.hy = P.h / 2; }
      else { m = new T.Mesh(new T.ConeGeometry(0.5, 2, 6), new T.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.45, depthWrite: false })); m.userData.hy = 1; }
      m.material.userData.lk = true; m.material.userData.bl = true; m.material.userData.solid = true; echoM = m; dyn.add(m); }
    if (echoM) { echoM.visible = !!e; if (e) { echoM.position.set(e.x, echoM.userData.hy + Math.sin(time * 6) * 0.05, e.z); echoM.rotation.y = Math.atan2(camPos.x - e.x, camPos.z - e.z); if (Math.random() < dt * 14) emit(e.x, 0.3 + Math.random() * 1.6, e.z, 1, 0x9fd0ff, 0.6, 0.5, 1.4, 0); } }
  }
  // troopers
  let n0 = 0, n1 = 0, nh = 0;
  const bT = bd.trooper.begin(), bH = bd.hush.begin(), bB = bd.hollow.begin(), bS = bd.thief.begin();
  const ts = W.troopers;
  for (i = 0; i < ts.length; i++) {
    const t = ts[i]; if (!t.alive) continue;
    const moving = Math.abs(t.vx) + Math.abs(t.vz) > 0.1;
    const hop = moving ? Math.abs(Math.sin(time * 9 + t.id)) * 0.2 : 0, sc = (t.flash > 0 ? 1.2 : 1) * (W.great[t.team] > 0 ? 1.2 : 1);
    const sx = t.big ? 2.1 : (t.ranged ? 0.78 : 1), sy = t.big ? 2.3 : (t.ranged ? 1.35 : 1);
    { const B = t.team === 0 ? (bT ? bd.trooper : null) : (t.big ? (bB ? bd.hollow : null) : (bH ? bd.hush : null));
      if (B) { let d = Math.atan2(camPos.x - t.x, camPos.z - t.z) - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        B.put(Math.abs(d) < 1.57 ? 0 : 1, t.x, hop, t.z, (t.big ? 4.4 : (t.ranged ? 2.2 : 1.9)) * sc, d * PAPER_FLIP > 0, moving ? Math.sin(time * 9 + t.id) * 0.06 : 0); continue; } }
    dummy.position.set(t.x, hop, t.z); dummy.rotation.set(0, t.yaw, t.team === 1 ? Math.sin(time * 5 + t.id) * 0.08 : 0); dummy.scale.set(sx * sc, sy * sc, sx * sc); dummy.updateMatrix();
    if (t.team === 0) { if (n0 < 90) tr[0].setMatrixAt(n0++, dummy.matrix); if (nh < 180) trHat.setMatrixAt(nh++, dummy.matrix); }
    else if (n1 < 110) { hushEyes.setMatrixAt(n1, dummy.matrix); tr[1].setMatrixAt(n1++, dummy.matrix); }
  }
  for (i = 0; i < W.thieves.length; i++) {
    const t = W.thieves[i]; if (!t.alive || n1 >= 110) continue;
    const sc = t.flash > 0 ? 1.05 : 0.85;
    if (bS) { let d = Math.atan2(camPos.x - t.x, camPos.z - t.z) - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); bd.thief.put(Math.abs(d) < 1.57 ? 0 : 1, t.x, Math.abs(Math.sin(time * 14 + t.id)) * 0.3, t.z, 1.5 * sc, d * PAPER_FLIP > 0, 0.12);
      if (t.state === 1 && Math.random() < dt * 30) emit(t.x, 1.1, t.z, 1, t.carry ? 0xffd28a : 0xffe9a8, 1.2, 0.6, 1.5, 0); continue; }
    dummy.position.set(t.x, Math.abs(Math.sin(time * 14 + t.id)) * 0.3, t.z); dummy.rotation.set(0.35, t.yaw, 0); dummy.scale.set(sc, sc * 0.9, sc); dummy.updateMatrix();
    hushEyes.setMatrixAt(n1, dummy.matrix); tr[1].setMatrixAt(n1++, dummy.matrix);
    if (t.state === 1 && Math.random() < dt * 30) emit(t.x, 1.1, t.z, 1, t.carry ? 0xffd28a : 0xffe9a8, 1.2, 0.6, 1.5, 0);
  }
  dummy.rotation.set(0, 0, 0);
  if (LK.weather === 'rain' && W.red <= 0 && !R.reduced) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 2 : 5); k++) emit(cx + (Math.random() - 0.5) * 46, 10 + Math.random() * 8, cz + (Math.random() - 0.5) * 46, 1, 0x6a64d8, 0.3, 0.7, -22, 26); }
  if (LK.weather === 'snow' && W.red <= 0 && !R.reduced) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 1 : 3); k++) emit(cx + (Math.random() - 0.5) * 50, 8 + Math.random() * 8, cz + (Math.random() - 0.5) * 50, 1, Math.random() < 0.16 ? 0xff9ac8 : 0xdfe6ff, 0.5, 2.4, -3.2, 1.2); }
  if (W.red > 0) { const cx = camPos.x + camDir.x * 14, cz = camPos.z + camDir.z * 14; for (let k = 0; k < (R.low ? 3 : 8); k++) emit(cx + (Math.random() - 0.5) * 44, 10 + Math.random() * 8, cz + (Math.random() - 0.5) * 44, 1, 0xff3a3a, 0.3, 0.75, -20, 26); }
  tr[0].count = n0; tr[1].count = n1; hushEyes.count = n1; trHat.count = nh;
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
    m.ward.visible = s.alive && !S.vuln(s);
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
    nessM.visible = nessY > -10.6;
    if (nessM.visible) {
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
  stepParticles(dt);
  // camera
  const pl = view.target;
  if (view.mode === 'attract' || !pl) {
    const a = time * 0.05, fz = Math.sin(time * 0.031) * 40;
    camPos.x = Math.sin(a) * 62; camPos.y = 24 + Math.sin(time * 0.07) * 6; camPos.z = fz + Math.cos(a) * 62;
    camera.position.set(camPos.x, camPos.y, camPos.z); camera.lookAt(0, 3, fz);
    camera.fov = R.portrait ? 78 : 58;
  } else {
    R.camPose(pl, view.yaw, view.pitch, view.zoom, cp);
    camPos.x = cp.x; camPos.y = cp.y; camPos.z = cp.z; camDir.x = cp.dx; camDir.y = cp.dy; camDir.z = cp.dz; camDist = cp.dist;
    if (R.reduced) shake = 0;
    let sx = 0, sy = 0; if (shake > 0) { sx = (Math.random() - 0.5) * shake * 0.5; sy = (Math.random() - 0.5) * shake * 0.5; shake = Math.max(0, shake - dt * 2.2); }
    camera.position.set(cp.x + sx, cp.y + sy, cp.z);
    camera.lookAt(cp.x + sx + cp.dx * 50, cp.y + sy + cp.dy * 50, cp.z + cp.dz * 50);
    camera.fov = (R.portrait ? 82 : 64) * (1 - view.zoom * 0.3);
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
  barBg.count = barFill.count = nb; barBg.instanceMatrix.needsUpdate = barFill.instanceMatrix.needsUpdate = true;
  if (barFill.instanceColor) barFill.instanceColor.needsUpdate = true;
  draw();
};
R.cam = function () { return camPos; };
})();
