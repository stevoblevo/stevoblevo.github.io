/* LIVLOCH · scenery: the world around the fight. Three.js r128, plain script, loaded before gfx.js.

   WHAT IS HERE
   - Trees: puffy cherry-blossom canopies (clustered, displaced icosahedra, vertex-coloured darker inside and below, lighter
     on top, a little self-light so they glow at night) and layered night pines (drooping star-shaped tiers, snow on the
     tiers in Cobalt Snow). The trees the model knows (W.obstacles with .tree) stand where the model says; a forest of
     scenery-only trees lines the valley walls outside the field, where nobody can walk. Four instanced draws in all.
   - The loch: one shader disc. Dark in the middle, luminous shallows, ripples, the moon's path, sparkles, a glow at the shore.
   - Pools of light: warm under the lantern houses and the Reign fountain, faint along the threads, cool lilac under the
     Hush. One instanced draw; a pool dims when its structure goes dark and goes out when it falls.
   - Ground: the floor away from the threads goes darker and cooler (a hook in buildGround), and one baked mesh carries the
     grass tufts, glowing flowers and mushrooms; another the petal drifts under the blossom trees.
   - Sky: a ringed moon with a halo in front of the painted ridge, two bands of mist at the foot of the ridge, twinkling stars.
   - Air: fireflies by the trees and the water, and blossom petals tumbling down around the camera. Both animate on the GPU.

   RULES
   - Presentation only. It reads the model (W) and never writes to it.
   - Every look gets its own palette below (PAL), so nothing here goes through the look's colour map: materials are
     flagged lk/bl/solid and geometry lk, instanced meshes ilk.
   - Instanced or baked; no per-frame allocation; nothing per frame on the CPU except the pools' dimming.
   - Lighter graphics (R.low): fewer wall trees, plants, fireflies and petals. Reduced motion: no sway, flicker or petals;
     fireflies and water move slowly. */
(function () {
'use strict';
const LL = window.LL, C = LL.C, U = LL.U;
const SC = LL.scenery = {};
let T = null, X = null, P = null, id = 'snow', LK = null, low = false, calm = false;
let dm = null, tc = null, tc2 = null, v2 = null, built = false, treesFor = null;
let pools = null, poolList = [], loch = null, moon = null;
const uni = { uTime: { value: 0 }, uWind: { value: 1 }, uPx: { value: 600 }, uCam: { value: null } };
const DEG = Math.PI / 180;
// where the moon hangs, relative to the camera: right of straight ahead (+z, toward the Hush), 17 degrees up
const MOON_DIR = [-Math.sin(27 * DEG) * Math.cos(17 * DEG), Math.sin(17 * DEG), Math.cos(27 * DEG) * Math.cos(17 * DEG)];

/* ---------- palettes, one per look ----------
   bl: blossom deep, mid, light, highlight. pine: dark, mid, light. rimB / rimP: edge light on blossoms / pines [colour, k, power].
   water: deep, shallow, glow. pool: warm, cool, [house k, hush k, thread k]. moon: disc, halo, ring, [ring on, limb glow].
   mist: low, high, alpha. fly: colour, share. petal: two colours, share. grass: base, tip. flowers: four.
   ground: far colour, how far toward it, brightness by the threads, brightness far from them (null: the floor as built). */
const PAL = {
  snow: { bl: [0x541a4c, 0xb8508a, 0xf090c0, 0xffd8ec], blGlow: 0.3, trunk: 0x2a1830, pine: [0x0c1426, 0x1a2a44, 0x2e4870], pineGlow: 0.05, snow: 0xd6dcff,
    rimB: [0xc8a8ff, 0.3, 2.8], rimP: [0x8ea8ff, 0.32, 3.0], water: [0x030b20, 0x16a8ae, 0x8af8ff], pool: [0xffa24c, 0x9a84ff, [0.85, 0.5, 0.24]],
    moon: [0xfff0e0, 0xc9a8ff, 0xffd0ec, [1, 0.25]], mist: [0x46408a, 0xb888bc, 0.4], fly: [0xffe08a, 1], petal: [0xff8fc4, 0xffd6ea, 1],
    grass: [0x23204a, 0x7a80c8], flowers: [0xff5fae, 0xb084ff, 0x6ff0ff, 0xffc870], shroom: 0x6af0ff, litter: [0xff86c0, 0.75], glint: [0xeef2ff, 0.06], ground: [0x181a38, 0.4, 0.86, 0.52] },
  lantern: { bl: [0x5a1838, 0xb8406a, 0xf07a9a, 0xffc0c8], blGlow: 0.32, trunk: 0x2a1a20, pine: [0x0f2226, 0x1c3a40, 0x2c565a], pineGlow: 0.04, snow: 0,
    rimB: [0xffb890, 0.35, 2.6], rimP: [0xffc8a0, 0.2, 3.0], water: [0x041418, 0x1a7a80, 0x7ff0d8], pool: [0xffa850, 0x5fe6b6, [0.75, 0.35, 0.22]],
    moon: [0xffe8c8, 0xffa070, 0xffd0a0, [1, 0.2]], mist: [0x3a2040, 0x8a3a50, 0.38], fly: [0xffc860, 1], petal: [0xff9ab0, 0xffd0d0, 0.8],
    grass: [0x1a2a2a, 0x46705e], flowers: [0xff8a5c, 0xffd27a, 0xff6fa0, 0x6fe8c0], shroom: 0x6fe8c0, litter: [0xff8aa0, 0.6], glint: [0xffd8a0, 0.03], ground: [0x120e18, 0.3, 0.92, 0.62] },
  knight: { bl: [0x4a3a6a, 0x9a8ac0, 0xd8c8e8, 0xf4ecf4], blGlow: 0.16, trunk: 0x1c2232, pine: [0x101c2e, 0x1c2c48, 0x2e4468], pineGlow: 0.03, snow: 0,
    rimB: [0xf0e0a0, 0.3, 2.8], rimP: [0xf0e0a0, 0.22, 3.0], water: [0x0a1830, 0x3d7aa8, 0xc0e4ff], pool: [0xf0c75e, 0x8fb4e8, [0.5, 0.38, 0.16]],
    moon: [0xfff4d8, 0xf0c75e, 0xf0d890, [1, 0.2]], mist: [0x263a57, 0x5a7aa0, 0.4], fly: [0xf0d070, 0.8], petal: [0xe8d8f0, 0xfff4e8, 0.5],
    grass: [0x1a2a3a, 0x4e7090], flowers: [0xf0c75e, 0x8fb4e8, 0xf4efe6, 0xf0c75e], shroom: 0x8fd0f0, litter: [0xe8dcf0, 0.5], glint: [0xf0e0a0, 0.03], ground: [0x18263a, 0.25, 0.92, 0.7] },
  origami: { bl: [0xe09aaa, 0xf4bcc6, 0xfcdce2, 0xfff4f6], blGlow: 0.05, blDetail: 0.25, trunk: 0x6a5a5a, pine: [0x4f7268, 0x6a8f80, 0x8fb0a0], pineGlow: 0, snow: 0,
    rimB: [0xffffff, 0.12, 3.0], rimP: [0xffffff, 0.1, 3.0], water: [0x3a78b0, 0x8cc2e6, 0xffffff], pool: null,
    moon: null, mist: [0xffffff, 0xf6f8f3, 0.32], fly: null, petal: [0xf4a8b8, 0xffe0e6, 0.7],
    grass: [0x8fae7a, 0xc8dca8], flowers: [0xb8311a, 0xf0cf78, 0x2a4c86, 0xffffff], shroom: 0xf0e0c0, litter: [0xf0a0b0, 0.55], ground: null, plantGlow: 0.2 },
  glow: { bl: [0x12060e, 0x220a1a, 0x3a1030, 0xff4faa], blGlow: 0.45, trunk: 0x0b060c, pine: [0x05080e, 0x0a1220, 0x0f1c2c], pineGlow: 0.1, snow: 0,
    rimB: [0xff4faa, 1.1, 2.2], rimP: [0x62e6ff, 0.9, 2.4], water: [0x020408, 0x0a3040, 0x62e6ff], pool: [0xff4faa, 0x62e6ff, [0.42, 0.4, 0.14]],
    moon: [0x1a0a20, 0xff4faa, 0x62e6ff, [1, 1.4]], mist: [0x1a0e1d, 0x4a1040, 0.32], fly: [0x62e6ff, 0.8], petal: null,
    grass: [0x1a0e1d, 0x62e6ff], flowers: [0xff4faa, 0x62e6ff, 0xffd64a, 0xb06aff], shroom: 0x62e6ff, litter: [0xff4faa, 0.25], glint: [0x62e6ff, 0.05], ground: null },
  ink: { bl: [0x5a5450, 0x9a9288, 0xd8d0c0, 0xf0ebe0], blGlow: 0.12, trunk: 0x0b0a14, pine: [0x07060c, 0x0f0e1a, 0x1c1a2a], pineGlow: 0, snow: 0,
    rimB: [0xebe6da, 0.3, 2.8], rimP: [0xebe6da, 0.25, 3.0], water: [0x020308, 0x14303a, 0xebe6da], pool: [0xffb347, 0x9a7cff, [0.55, 0.35, 0.14]],
    moon: [0xf4efe4, 0xd8d0ff, 0xebe6da, [1, 0.2]], mist: [0x14122a, 0x3a3650, 0.4], fly: [0xffb347, 0.4], petal: null,
    grass: [0x0e0d18, 0x3a3650], flowers: [0xffb347, 0xebe6da, 0xffb347, 0xd9824a], shroom: 0xebe6da, litter: [0xd8d0c0, 0.35], ground: [0x0b0a14, 0.2, 0.96, 0.78] },
  rain: { bl: [0x3a0a14, 0x8a2030, 0xd04a58, 0xff8a8a], blGlow: 0.25, trunk: 0x1a0a10, pine: [0x12060a, 0x24101a, 0x3a1a24], pineGlow: 0.03, snow: 0,
    rimB: [0xff8a70, 0.4, 2.6], rimP: [0xff8a70, 0.25, 3.0], water: [0x04100f, 0x146060, 0x7fe0d0], pool: [0xffc070, 0x6fe0d0, [0.55, 0.35, 0.16]],
    moon: [0xff7060, 0xff3a3a, 0xffb0a0, [0, 0.3]], mist: [0x3a0f1a, 0x8a2a2a, 0.45], fly: null, petal: null,
    grass: [0x2a1018, 0x6a3038], flowers: [0xffc070, 0x6fe0d0, 0xff6a6a, 0xffc070], shroom: 0x6fe0d0, litter: [0xb03040, 0.5], glint: [0xffb0a0, 0.06], ground: [0x140608, 0.25, 0.92, 0.66] },
  memory: { bl: [0x5a4a38, 0x9a8468, 0xd8c0a0, 0xf0e0c8], blGlow: 0.1, trunk: 0x2a2218, pine: [0x221c16, 0x342a20, 0x4a3e30], pineGlow: 0, snow: 0,
    rimB: [0xf0e0c0, 0.25, 2.8], rimP: [0xf0e0c0, 0.2, 3.0], water: [0x1a2020, 0x4a5a58, 0xd8d0b8], pool: [0xe8b060, 0x8aa8c0, [0.4, 0.3, 0.12]],
    moon: [0xfff0d8, 0xb09a78, 0xd9c8a8, [1, 0.2]], mist: [0x5a4f40, 0xb09a78, 0.4], fly: [0xf0e0c0, 0.6], petal: [0xe8d8c0, 0xfff0e0, 0.4],
    grass: [0x3a3228, 0x7a6a54], flowers: [0xe8b060, 0xf0e0c0, 0xb09a78, 0x8aa8c0], shroom: 0xf0e0c0, litter: [0xe8d8c0, 0.45], ground: [0x2a2520, 0.15, 0.96, 0.82], plantGlow: 0.5 }
};
SC.PAL = PAL;

/* ---------- small helpers ---------- */
function h3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function n3(x, y, z) { // value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), L = U.lerp;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v),
           L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w);
}
function col(hex) { return new T.Color(hex); }
function mine(o) { // keep my colours: the look map must not touch these
  const m = o.material; if (m) { m.userData.lk = true; m.userData.bl = true; m.userData.solid = true; }
  if (o.geometry) o.geometry.userData.lk = true; o.userData.ilk = true; return o;
}
function shared(m) { m.uniforms.uTime = uni.uTime; m.uniforms.uWind = uni.uWind; m.uniforms.uPx = uni.uPx; m.uniforms.uCam = uni.uCam; m.userData.lk = m.userData.bl = m.userData.solid = true; return m; }
function fogU(extra) { return T.UniformsUtils.merge([T.UniformsLib.fog, extra]); }
const GLSL_NOISE = 'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }' +
  'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }';

/* A growing bundle of non-indexed triangles with position, normal, colour and glow. */
function Bundle() { this.p = []; this.n = []; this.c = []; this.g = []; }
/* Add a geometry. f(px, py, pz, nx, ny, nz, i) returns nothing; it sets Bundle.cur (colour) and Bundle.gl (glow) for that vertex. */
Bundle.prototype.add = function (geo, f) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    f(x, y, z, nx, ny, nz, i);
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(tc.r, tc.g, tc.b); this.g.push(Bundle.gl);
  }
};
Bundle.prototype.tri = function (a, b, c, nrm, ca, cb, cc, ga, gb, gc) { // one triangle; nrm null = face normal
  let nx, ny, nz;
  if (nrm) { nx = nrm[0]; ny = nrm[1]; nz = nrm[2]; }
  else { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; }
  this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); this.g.push(ga, gb, gc);
};
Bundle.prototype.geo = function () {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3)); g.setAttribute('aGlow', new T.Float32BufferAttribute(this.g, 1));
  g.computeBoundingSphere(); g.userData.lk = true; return g;
};
Bundle.gl = 0;

/* ---------- the lit shader: trees and plants ----------
   Lambert-equivalent hemisphere + moon light from the look, self-light from aGlow, an edge light (rim) so canopies read
   against the dark, back faces darker (pine tiers are open cones seen from below), the look's fog, and wind sway above a
   pivot height. Instanced or not. */
const LIT_V = [
  'uniform float uTime; uniform float uWind; uniform vec2 uSway;',
  'attribute float aGlow;',
  'varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vG; varying vec3 vP;',
  '#include <fog_pars_vertex>',
  'void main() {',
  '  vec3 p = position; vec3 ip = position; vP = position;',
  '  #ifdef USE_INSTANCING', '  ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);', '  #endif',
  '  float ph = ip.x * 0.21 + ip.z * 0.13;',
  '  float b = max(p.y - uSway.x, 0.0); b = b * b * uSway.y * uWind;',
  '  p.x += (sin(uTime * 1.05 + ph) + 0.35 * sin(uTime * 2.6 + ph * 2.0 + p.y * 0.6)) * b;',
  '  p.z += cos(uTime * 0.83 + ph * 1.3) * b * 0.7;',
  '  vec4 w = vec4(p, 1.0); vec3 n = normal;',
  '  #ifdef USE_INSTANCING', '  w = instanceMatrix * w; n = mat3(instanceMatrix) * n;', '  #endif',
  '  w = modelMatrix * w;',
  '  vN = normalize(mat3(modelMatrix) * n); vV = cameraPosition - w.xyz;',
  '  vC = color;',
  '  #ifdef USE_INSTANCING_COLOR', '  vC *= instanceColor;', '  #endif',
  '  vG = aGlow;',
  '  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;',
  '  #include <fog_vertex>',
  '}'].join('\n');
const LIT_F = [
  'uniform vec3 uSkyC; uniform vec3 uGndC; uniform vec3 uDirC; uniform vec3 uDir; uniform vec3 uRim; uniform float uRimP; uniform float uGlow; uniform float uBack; uniform vec3 uSpeck; uniform vec2 uDetail;',
  'varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vG; varying vec3 vP;',
  'float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
  'float n31(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),',
  '             mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }',
  '#include <fog_pars_fragment>',
  'void main() {',
  '  vec3 n = normalize(vN), v = normalize(vV); float k = 1.0;',
  '  if (!gl_FrontFacing) { n = -n; k = uBack; }',
  '  vec3 base = vC;',
  // blossom detail: clusters of small flowers and dark gaps between them, in the tree's own space so they sway with it
  '  if (uDetail.x > 0.0 && vG > 0.3) { float a = n31(vP * uDetail.y), b = n31(vP * uDetail.y * 2.7 + 7.0), m = a * 0.55 + b * 0.45;',
  '    base *= mix(1.0, 0.5, (1.0 - smoothstep(0.18, 0.42, m)) * uDetail.x); base = mix(base, uSpeck, smoothstep(0.6, 0.82, m) * uDetail.x * (0.35 + 0.5 * vG)); }',
  '  vec3 hemi = mix(uGndC, uSkyC, n.y * 0.5 + 0.5);',
  '  vec3 c = base * (hemi + uDirC * max(dot(n, uDir), 0.0)) * k + base * vG * uGlow;',
  '  c += uRim * pow(1.0 - abs(dot(n, v)), uRimP) * (0.25 + 0.75 * min(vG, 1.0)) * k;',
  '  gl_FragColor = vec4(c, 1.0);',
  '  #include <fog_fragment>',
  '}'].join('\n');
function litMat(o) {
  const m = new T.ShaderMaterial({
    uniforms: fogU({ uSkyC: { value: new T.Color(LK.hemi[0]).multiplyScalar(LK.hemi[2]) }, uGndC: { value: new T.Color(LK.hemi[1]).multiplyScalar(LK.hemi[2]) },
      uDirC: { value: new T.Color(LK.dir[0]).multiplyScalar(LK.dir[1]) }, uDir: { value: new T.Vector3(-40, 80, 60).normalize() },
      uRim: { value: new T.Color(o.rim[0]).multiplyScalar(o.rim[1]) }, uRimP: { value: o.rim[2] }, uGlow: { value: o.glow }, uBack: { value: o.back == null ? 0.55 : o.back },
      uSway: { value: new T.Vector2(o.pivot, o.sway) }, uSpeck: { value: col(o.speck || 0xffffff) }, uDetail: { value: new T.Vector2(o.detail || 0, o.scale || 3) } }),
    vertexShader: LIT_V, fragmentShader: LIT_F, vertexColors: true, fog: true, side: o.side || T.FrontSide });
  return shared(m);
}

/* ---------- trees ---------- */
function grad(stops, t, out) { // a colour from evenly spaced stops
  t = U.clamp(t, 0, 1) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t));
  return out.copy(stops[i]).lerp(stops[i + 1], t - i);
}
function limb(B, a, b, r0, r1, colr, seg) { // a tapered branch from a to b
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), g = new T.CylinderGeometry(r1, r0, len, seg || 5, 1, true);
  g.translate(0, len / 2, 0);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize());
  g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q)); g.translate(a[0], a[1], a[2]);
  Bundle.gl = 0; B.add(g, function () { tc.copy(colr); });
}
/* A cherry tree: a flared, leaning trunk, four limbs, and a wide umbrella of blossom lumps: a crown, a ring, and a lower
   ring that hangs at the edge. v picks one of two shapes. */
function blossomGeo(v) {
  const B = new Bundle(), r = LL.rng(311 + v * 97), stops = P.bl.map(col), trunk = col(P.trunk), trunkD = col(P.trunk).multiplyScalar(0.55);
  const lean = v ? -0.45 : 0.55, th = 5.0;
  const tg = new T.CylinderGeometry(0.3, 0.62, th, 8, 6, true); tg.translate(0, th / 2 - 0.3, 0);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = Math.max(0, y) / th, fl = y < 0.7 ? 1 + (0.7 - y) * 0.7 : 1; p.setX(i, p.getX(i) * fl + lean * k * k * 1.4 + Math.sin(y * 1.3 + v) * 0.1); p.setZ(i, p.getZ(i) * fl); } tg.computeVertexNormals(); }
  Bundle.gl = 0; B.add(tg, function (x, y) { tc.copy(trunkD).lerp(trunk, U.clamp(y / 3.5, 0, 1)); });
  const tx = lean * 1.4, lumps = [];
  lumps.push({ c: [tx + 0.3, 8.0, 0.2], r: 2.4 }, { c: [tx - 1.1, 7.5, v ? 1.0 : -0.9], r: 2.0 });
  const n1 = 5, a0 = v * 0.6 + r();
  for (let i = 0; i < n1; i++) { const a = a0 + i / n1 * Math.PI * 2 + (r() - 0.5) * 0.4, d = 2.6 + r() * 0.6; lumps.push({ c: [tx + Math.cos(a) * d, 6.7 + r() * 0.6, Math.sin(a) * d], r: 1.8 + r() * 0.4 }); }
  for (let i = 0; i < n1; i++) { const a = a0 + (i + 0.5) / n1 * Math.PI * 2 + (r() - 0.5) * 0.5, d = 3.9 + r() * 0.6; lumps.push({ c: [tx + Math.cos(a) * d, 5.5 + r() * 0.5, Math.sin(a) * d], r: 1.1 + r() * 0.4 }); }
  for (let i = 0; i < 4; i++) { const L = lumps[2 + i]; limb(B, [tx * 0.7, th - 1.4, 0], [tx + (L.c[0] - tx) * 0.75, L.c[1] - 0.5, L.c[2] * 0.75], 0.22, 0.08, trunk, 5); }
  const yLo = 4.0, yHi = 10.4;
  lumps.forEach(function (L, li) {
    const g = new T.IcosahedronGeometry(1, 1), p = g.attributes.position, n = g.attributes.normal, off = li * 3.7 + v * 11;
    for (let i = 0; i < p.count; i++) {
      const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i);
      const k = 1 + 0.28 * (n3(dx * 1.7 + off, dy * 1.7, dz * 1.7) - 0.5) + 0.12 * (n3(dx * 4.3, dy * 4.3 + off, dz * 4.3) - 0.5);
      p.setXYZ(i, L.c[0] + dx * L.r * k, L.c[1] + dy * L.r * k * 0.8, L.c[2] + dz * L.r * k);
      const nl = Math.hypot(dx, dy + 0.15, dz); n.setXYZ(i, dx / nl, (dy + 0.15) / nl, dz / nl);
    }
    B.add(g, function (x, y, z, nx, ny) {
      const h = (y - yLo) / (yHi - yLo), t = U.clamp((0.5 + 0.5 * ny) * 0.58 + h * 0.46 - 0.06, 0, 1);
      grad(stops, Math.pow(t, 1.25), tc);
      if (ny < -0.35) tc.lerp(stops[0], 0.45);
      const s = h3(Math.round(x * 4), Math.round(y * 4), Math.round(z * 4));
      if (s > 0.76) tc.lerp(stops[3], 0.6 * (0.4 + t)); else if (s < 0.16) tc.lerp(stops[0], 0.5);
      Bundle.gl = 0.35 + 0.65 * t;
    });
  });
  return B.geo();
}
/* A night pine: five drooping tiers, star-shaped in plan, snow on the upper faces when the look has snowcaps. */
function pineGeo(v) {
  const B = new Bundle(), r = LL.rng(733 + v * 53), dark = col(P.pine[0]), mid = col(P.pine[1]), light = col(P.pine[2]), snow = P.snow ? col(P.snow) : null, trunk = col(P.trunk);
  const tg = new T.CylinderGeometry(0.16, 0.34, 3.2, 6, 1, true); tg.translate(0, 1.3, 0);
  Bundle.gl = 0; B.add(tg, function () { tc.copy(trunk); });
  const tiers = v ? 6 : 5, seg = 11;
  for (let k = 0; k < tiers; k++) {
    const f = k / tiers, rb = (v ? 2.5 : 2.8) * (1 - f * 0.78) + 0.25, h = 2.5 - f * 0.9, yb = 1.7 + k * (v ? 1.35 : 1.55), tw = r() * Math.PI;
    const g = new T.ConeGeometry(rb, h, seg, 3, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const row = Math.floor(i / (seg + 1)), c = i % (seg + 1), fr = row / 3, tip = c % 2 === 0;
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const rs = row === 0 ? 1 : (tip ? 1.04 : 0.72 + 0.12 * (1 - fr)), sag = Math.sin(fr * Math.PI) * 0.32 * rb / 2.8;
      x *= rs; z *= rs; y -= sag + (row === 3 ? (tip ? 0.42 + r() * 0.15 : 0.04) : 0);
      const ca = Math.cos(tw), sa = Math.sin(tw); p.setXYZ(i, x * ca - z * sa, y + yb + h / 2, x * sa + z * ca);
    }
    const ng = g.toNonIndexed(); ng.computeVertexNormals();
    // colour per face: darker toward the trunk and underneath, lighter at the tips; snow lies in patches on the upper faces
    const q = ng.attributes.position, cs = [];
    for (let i = 0; i < q.count; i += 3) {
      const cx = (q.getX(i) + q.getX(i + 1) + q.getX(i + 2)) / 3, cy = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3, cz = (q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3;
      const rad = Math.hypot(cx, cz) / rb, hh = h3(Math.round(cx * 7), Math.round(cy * 7) + k, Math.round(cz * 7));
      tc.copy(dark).lerp(mid, U.clamp(rad * 1.2, 0, 1)).lerp(light, U.clamp((rad - 0.55) * 1.6, 0, 1) * 0.8);
      if (hh > 0.75) tc.lerp(light, 0.35);
      if (snow && rad > 0.12 && rad < 0.8 && hh > 0.3) tc.copy(snow).multiplyScalar(0.8 + 0.2 * hh);
      cs.push(tc.r, tc.g, tc.b);
    }
    Bundle.gl = 1;
    B.add(ng, function (x, y, z, nx, ny, nz, i) { const j = Math.floor(i / 3) * 3; tc.setRGB(cs[j], cs[j + 1], cs[j + 2]); });
  }
  const top = new T.ConeGeometry(0.4, 1.6, 6, 1, true); top.translate(0, 1.7 + tiers * (v ? 1.35 : 1.55) + 0.6, 0);
  Bundle.gl = 1; B.add(top.toNonIndexed(), function () { tc.copy(snow || mid); });
  return B.geo();
}
/* Where the scenery-only forest stands: the valley walls outside the field, thicker near the edge, in clumps. */
function wallSpots(groundH) {
  const r = LL.rng(4242), out = [], step = low ? 11 : 8.2, cap = low ? 170 : 430;
  const X0 = C.HALF_X + 95, Z0 = C.HALF_Z + 95;
  for (let x = -X0 + 3; x < X0 - 3 && out.length < cap * 3; x += step) for (let z = -Z0 + 3; z < Z0 - 3; z += step) {
    const px = x + (r() - 0.5) * step * 0.8, pz = z + (r() - 0.5) * step * 0.8;
    const ox = Math.max(0, Math.abs(px) - C.HALF_X), oz = Math.max(0, Math.abs(pz) - C.HALF_Z), o = Math.hypot(ox, oz);
    if (o < 3.5 || o > 62) continue;
    const clump = n3(px * 0.035, 0, pz * 0.035), keep = (o < 22 ? 0.9 : 0.55) * U.clamp((clump - 0.22) * 2.2, 0, 1) * (oz > 0 && ox <= 0 ? 0.6 : 1);
    if (r() > keep) continue;
    out.push({ x: px, z: pz, y: groundH(px, pz), o: o, s: r(), b: n3(px * 0.02 + 7, 1, pz * 0.02) });
  }
  // nearest the field first, so a cap keeps the trees you can see
  out.sort(function (a, b) { return a.o - b.o; }); out.length = Math.min(out.length, cap);
  return out;
}
function treeMeshes(trees, groundH) {
  const geoB = [blossomGeo(0), blossomGeo(1)], geoP = [pineGeo(0), pineGeo(1)];
  const items = [[], [], [], []]; // blossom 0, blossom 1, pine 0, pine 1
  trees.forEach(function (o, i) { const bl = o.seed < 0.5, v = Math.floor(o.seed * 17) % 2; items[(bl ? 0 : 2) + v].push({ x: o.x, y: 0, z: o.z, s: 0.82 + o.seed * 0.5, rot: o.seed * 6.283, t: o.seed }); });
  wallSpots(groundH).forEach(function (w) { const bl = w.b > 0.52, v = w.s > 0.5 ? 1 : 0; items[(bl ? 0 : 2) + v].push({ x: w.x, y: w.y - 0.5, z: w.z, s: (bl ? 0.95 : 1.05) + w.s * (bl ? 0.55 : 0.85) + Math.min(0.4, w.o / 90), rot: w.s * 40, t: w.s }); });
  const mB = litMat({ rim: P.rimB, glow: P.blGlow, pivot: 2.0, sway: 0.0026, side: T.FrontSide, detail: P.blDetail == null ? 0.9 : P.blDetail, scale: 2.6, speck: P.bl[3] });
  const mP = litMat({ rim: P.rimP, glow: P.pineGlow, pivot: 2.0, sway: 0.0022, side: T.DoubleSide, back: 0.45, detail: 0.45, scale: 4.5, speck: P.snow || P.pine[2] });
  const out = [];
  items.forEach(function (list, k) {
    if (!list.length) return;
    const im = new T.InstancedMesh(k < 2 ? geoB[k] : geoP[k - 2], k < 2 ? mB : mP, list.length);
    im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach(function (it, i) {
      dm.position.set(it.x, it.y, it.z); dm.rotation.set(0, it.rot, 0); dm.scale.setScalar(it.s); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
      const b = 0.86 + it.t * 0.26; tc.setRGB(b, b, b); if (k < 2) tc.lerp(tc2.setRGB(1.05, 0.9, 1.08), (it.t * 7) % 1 * 0.5); im.setColorAt(i, tc);
    });
    im.frustumCulled = false; mine(im); X.world.add(im); out.push(im);
  });
  // where the blossom trees stand, for the petal drifts and fireflies
  treesFor = { blossom: items[0].concat(items[1]), pine: items[2].concat(items[3]) };
  return out;
}

/* ---------- ground: plants and petal drifts ---------- */
function laneD(x, z, q) { let d = 1e9; for (let l = 0; l < 3; l++) { LL.laneNearest(l, x, z, q); if (q.d < d) d = q.d; } return d; }
function clearSpot(x, z, q) { // somewhere off the threads, the bases, the camps and the loch
  if (Math.abs(x) > C.HALF_X - 2 || Math.abs(z) > C.HALF_Z - 2) return false;
  if (laneD(x, z, q) < 4.2) return false;
  if (Math.hypot(x, z + C.SPAWN_Z) < 34 || Math.hypot(x, z - C.SPAWN_Z) < 34) return false;
  if (Math.hypot(x - C.LOCH.x, z - C.LOCH.z) < C.LOCH.r + 1.2 || Math.hypot(-x - C.LOCH.x, -z - C.LOCH.z) < C.LOCH.r + 1.2) return false;
  for (let i = 0; i < C.CAMPS.length; i++) if (Math.hypot(x - C.CAMPS[i][0], z - C.CAMPS[i][1]) < 6) return false;
  for (let i = 0; i < C.FRUIT.length; i++) if (Math.hypot(x - C.FRUIT[i].x, z - C.FRUIT[i].z) < 3 || Math.hypot(-x - C.FRUIT[i].x, -z - C.FRUIT[i].z) < 3) return false;
  return true;
}
function plantMesh(W) {
  const B = new Bundle(), r = LL.rng(1777), q = {}, gA = col(P.grass[0]), gB = col(P.grass[1]), fl = P.flowers.map(col), sh = col(P.shroom), stem = col(P.grass[0]).lerp(gB, 0.3);
  const fg = P.plantGlow == null ? 1 : P.plantGlow, tmp = new T.Color(), gM = gA.clone().lerp(gB, 0.45);
  const tuft = function (x, z, s) { // a clump of fine blades, darker at the root
    const n = 7 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, w = 0.03 * s, hgt = (0.22 + r() * 0.3) * s, lean = 0.15 + r() * 0.3, ca = Math.cos(a), sa = Math.sin(a), ox = (r() - 0.5) * 0.25 * s, oz = (r() - 0.5) * 0.25 * s;
      const b0 = [x + ox - sa * w, 0.02, z + oz + ca * w], b1 = [x + ox + sa * w, 0.02, z + oz - ca * w], tp = [x + ox + ca * lean * hgt, hgt, z + oz + sa * lean * hgt];
      B.tri(b0, b1, tp, [ca * 0.3, 0.95, sa * 0.3], gA, gA, r() < 0.3 ? gB : gM, 0, 0, 0.3);
    }
  };
  const flower = function (x, z, s, c) { // a stem and a five-petal head, tipped toward a random side so it shows from low cameras
    const hgt = (0.3 + r() * 0.3) * s, w = 0.02;
    B.tri([x - w, 0.02, z], [x + w, 0.02, z], [x, hgt, z], [0, 0, 1], stem, stem, stem, 0, 0, 0);
    const pr = 0.13 * s, ta = r() * 6.283, tilt = 0.5 + r() * 0.5, ux = Math.cos(ta) * tilt, uz = Math.sin(ta) * tilt, ul = Math.hypot(ux, 1, uz);
    const nU = [ux / ul, 1 / ul, uz / ul]; // the head's normal
    // two axes in the head's plane
    const e1 = [1, -ux, 0], l1 = Math.hypot(e1[0], e1[1], e1[2]); e1[0] /= l1; e1[1] /= l1; e1[2] /= l1;
    const e2 = [nU[1] * e1[2] - nU[2] * e1[1], nU[2] * e1[0] - nU[0] * e1[2], nU[0] * e1[1] - nU[1] * e1[0]];
    const P_ = function (a, d) { return [x + (e1[0] * Math.cos(a) + e2[0] * Math.sin(a)) * d, hgt + (e1[1] * Math.cos(a) + e2[1] * Math.sin(a)) * d, z + (e1[2] * Math.cos(a) + e2[2] * Math.sin(a)) * d]; };
    const ctr = [x, hgt + 0.01, z], cc = tmp.copy(c).lerp(fl[3], 0.35).clone(), a0 = r() * 6.283;
    for (let k = 0; k < 5; k++) {
      const a = a0 + k / 5 * 6.283;
      B.tri(ctr, P_(a - 0.42, pr * 0.55), P_(a, pr), nU, cc, c, c, 1.1 * fg, 0.75 * fg, 0.75 * fg); B.tri(ctr, P_(a, pr), P_(a + 0.42, pr * 0.55), nU, cc, c, c, 1.1 * fg, 0.75 * fg, 0.75 * fg);
    }
  };
  const shroom = function (x, z, s) { // a stem and a glowing dome
    const hgt = (0.1 + r() * 0.14) * s, cr = (0.09 + r() * 0.08) * s, seg = 8, dark = tmp.copy(sh).multiplyScalar(0.3).clone(), lit = sh.clone().lerp(fl[3], 0.15);
    B.tri([x - 0.025 * s, 0, z], [x + 0.025 * s, 0, z], [x, hgt, z], [0, 0, 1], dark, dark, dark, 0.4, 0.4, 0.4);
    B.tri([x, 0, z - 0.025 * s], [x, 0, z + 0.025 * s], [x, hgt, z], [1, 0, 0], dark, dark, dark, 0.4, 0.4, 0.4);
    for (let k = 0; k < seg; k++) {
      const a = k / seg * 6.283, b = (k + 1) / seg * 6.283, mr = cr * 0.72, my = hgt + cr * 0.45;
      const p0 = [x + Math.cos(a) * cr, hgt, z + Math.sin(a) * cr], p1 = [x + Math.cos(b) * cr, hgt, z + Math.sin(b) * cr];
      const m0 = [x + Math.cos(a) * mr, my, z + Math.sin(a) * mr], m1 = [x + Math.cos(b) * mr, my, z + Math.sin(b) * mr], ap = [x, hgt + cr * 0.7, z];
      B.tri(p0, m0, p1, null, sh, lit, sh, 0.9 * fg, 1.2 * fg, 0.9 * fg); B.tri(p1, m0, m1, null, sh, lit, lit, 0.9 * fg, 1.2 * fg, 1.2 * fg);
      B.tri(m0, ap, m1, null, lit, lit, lit, 1.3 * fg, 1.6 * fg, 1.3 * fg);
      B.tri(p0, p1, [x, hgt - cr * 0.05, z], [0, -1, 0], dark, dark, dark, 0.8 * fg, 0.8 * fg, 0.8 * fg);
    }
  };
  const cluster = function (x, z, kind, m, rad) {
    for (let j = 0; j < m; j++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * rad, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (!clearSpot(px, pz, q)) continue;
      if (kind < 0.5) tuft(px, pz, 0.9 + r() * 0.7);
      else if (kind < 0.82) { if (r() < 0.55) flower(px, pz, 1 + r() * 0.5, fl[Math.floor(r() * 3)]); else tuft(px, pz, 0.8); }
      else { if (r() < 0.7) shroom(px, pz, 1 + r() * 0.8); else tuft(px, pz, 0.7); }
    }
  };
  const K = low ? 0.45 : 1;
  // at the feet of the rocks and trees the model placed, so the plants sit against something
  W.obstacles.forEach(function (o) { if (r() > 0.8 * K + 0.1) return; const a = r() * 6.283, d = o.r + 0.6 + r() * 1.5; cluster(o.x + Math.cos(a) * d, o.z + Math.sin(a) * d, o.tree ? r() * 0.9 : (r() < 0.5 ? 0.9 : r() * 0.5), 6 + Math.floor(r() * 8), 1.6); });
  // along the edges of the field, where the valley floor meets the forest
  for (let k = 0; k < 90 * K; k++) { const side = r() < 0.5 ? -1 : 1, x = side * (C.HALF_X - 2 - r() * 10), z = (r() * 2 - 1) * (C.HALF_Z - 10); cluster(x, z, r(), 8 + Math.floor(r() * 8), 2.4); }
  // and scattered over the open floor between the threads
  for (let k = 0, tries = 0; k < 160 * K && tries < 2000; tries++) { const x = (r() * 2 - 1) * (C.HALF_X - 3), z = (r() * 2 - 1) * (C.HALF_Z - 3); if (!clearSpot(x, z, q)) continue; k++; cluster(x, z, r(), 4 + Math.floor(r() * 6), 1.4 + r() * 1.6); }
  // the threads are lined with flowers and grass, like the lit paths in the key art
  { const LP = { x: 0, z: 0, dx: 0, dz: 0 };
    for (let l = 0; l < 3; l++) { const L = LL.lanes[l];
      for (let s2 = 4; s2 < L.len - 4; s2 += low ? 4.5 : 2.4) { LL.lanePoint(l, s2, LP);
        for (let side = -1; side <= 1; side += 2) { if (r() < 0.3) continue;
          const off = 4.4 + r() * 2.8, px = LP.x - LP.dz * off * side + (r() - 0.5), pz = LP.z + LP.dx * off * side + (r() - 0.5);
          if (!clearSpot(px, pz, q)) continue;
          const t = r(); if (t < 0.4) flower(px, pz, 1 + r() * 0.4, fl[Math.floor(r() * 3)]); else if (t < 0.5) shroom(px, pz, 1.1); else tuft(px, pz, 0.9 + r() * 0.5); } } } }
  // a ring of flowers and mushrooms round the loch, as in the key art
  for (let k = 0; k < 90 * K; k++) {
    const a = r() * 6.283, d = C.LOCH.r + 1.3 + r() * 3.4, px = C.LOCH.x + Math.cos(a) * d, pz = C.LOCH.z + Math.sin(a) * d;
    if (laneD(px, pz, q) < 5) continue;
    const t = r(); if (t < 0.45) flower(px, pz, 1.15, fl[Math.floor(r() * 3)]); else if (t < 0.72) shroom(px, pz, 1.5); else tuft(px, pz, 1.1);
  }
  const m = litMat({ rim: [P.grass[1], 0.25, 2.0], glow: 1, pivot: 0.05, sway: 0.5, side: T.DoubleSide, back: 0.8 });
  const o = mine(new T.Mesh(B.geo(), m)); o.frustumCulled = false; X.world.add(o); return o;
}
let litterTex = null;
function makeLitterTex() { // scattered petals with a soft blush under them, white so the material can tint it
  if (litterTex) return litterTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = LL.rng(77);
  const bl = g.createRadialGradient(128, 128, 0, 128, 128, 128); bl.addColorStop(0, 'rgba(255,255,255,0.32)'); bl.addColorStop(0.6, 'rgba(255,255,255,0.14)'); bl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = bl; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const a = r() * 6.283, d = Math.pow(r(), 0.75) * 120, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
    g.save(); g.translate(x, y); g.rotate(r() * 6.283); g.globalAlpha = (0.55 + r() * 0.45) * (1 - d / 135);
    g.fillStyle = r() < 0.3 ? '#ffffff' : '#ffe6f0'; g.beginPath(); g.ellipse(0, 0, 3.2 + r() * 2.5, 1.6 + r() * 1.2, 0, 0, 6.283); g.fill(); g.restore();
  }
  litterTex = new T.CanvasTexture(c); return litterTex;
}
function litterMesh(groundH) {
  if (!treesFor || !P.litter) return null;
  const pos = [], uv = [], r = LL.rng(919);
  const quad = function (x, z, s, a) {
    const ca = Math.cos(a) * s, sa = Math.sin(a) * s, cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], v = cs.map(function (c) { const px = x + c[0] * ca - c[1] * sa, pz = z + c[0] * sa + c[1] * ca; return [px, groundH(px, pz) + 0.05, pz]; });
    [0, 1, 2, 0, 2, 3].forEach(function (k) { pos.push(v[k][0], v[k][1], v[k][2]); uv.push(cs[k][0] * 0.5 + 0.5, cs[k][1] * 0.5 + 0.5); });
  };
  treesFor.blossom.forEach(function (t) {
    if (Math.hypot(Math.max(0, Math.abs(t.x) - C.HALF_X), Math.max(0, Math.abs(t.z) - C.HALF_Z)) > 12) return; // only near the field, where the ground is nearly flat
    quad(t.x + (r() - 0.5) * 2, t.z + (r() - 0.5) * 2, 4.2 * t.s, r() * 6.283);
    quad(t.x + (r() - 0.5) * 6, t.z + (r() - 0.5) * 6, 2.6 * t.s, r() * 6.283);
  });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  const m = new T.MeshBasicMaterial({ map: makeLitterTex(), color: P.litter[0], transparent: true, opacity: P.litter[1], depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const o = mine(new T.Mesh(g, m)); o.renderOrder = 1; o.frustumCulled = false; X.world.add(o); return o;
}

/* Glints in the floor: a few cells in a fine grid catch the light and twinkle as time passes and the camera moves.
   Added to the ground's own Lambert material, so its colours and the look's handling stay as they are. */
function groundGlints(gm) {
  if (!gm || !P.glint || !gm.isMeshLambertMaterial) return;
  const gc = col(P.glint[0]), gk = P.glint[1] * (low ? 0.6 : 1);
  gm.onBeforeCompile = function (sh) {
    // uCamP: r128 does not send cameraPosition to a Lambert material
    sh.uniforms.uGT = uni.uTime; sh.uniforms.uCamP = uni.uCam; sh.uniforms.uGlint = { value: gc }; sh.uniforms.uGlintK = { value: gk };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;').replace('#include <project_vertex>', '#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW; uniform float uGT; uniform vec3 uGlint; uniform float uGlintK; uniform vec3 uCamP;').replace('#include <fog_fragment>',
      '{ vec2 gc = floor(vGW.xz * 2.2); float gh = fract(sin(dot(gc, vec2(12.9898, 78.233))) * 43758.5453); vec3 vd = normalize(uCamP - vGW);' +
      ' float tw = 0.5 + 0.5 * sin(uGT * (1.2 + gh * 2.5) + gh * 40.0 + dot(vd.xz, vec2(23.0, 17.0))); float g = step(1.0 - uGlintK, gh) * pow(tw, 4.0);' +
      ' vec2 o = fract(vGW.xz * 2.2) - 0.5, ax = normalize(vd.xz + 1e-4); o = vec2(dot(o, vec2(-ax.y, ax.x)), dot(o, ax) * max(vd.y, 0.08));' + // round on screen, not on the ground
      ' g *= (1.0 - smoothstep(0.0, 0.075, length(o))) * (1.0 - smoothstep(10.0, 45.0, length(uCamP - vGW)));' +
      ' gl_FragColor.rgb += uGlint * g * 2.6; }\n#include <fog_fragment>');
  };
  gm.customProgramCacheKey = function () { return 'glint'; };
  gm.needsUpdate = true;
}

/* ---------- the loch ---------- */
const LOCH_V = 'varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}';
const LOCH_F = [
  'uniform float uTime; uniform float uSpeed; uniform vec2 uC; uniform float uR; uniform vec3 uDeep; uniform vec3 uShal; uniform vec3 uGlow; uniform vec3 uSkyH; uniform vec3 uSkyT; uniform vec3 uMoonC; uniform vec3 uMoonDir;',
  'varying vec3 vW;', GLSL_NOISE,
  '#include <fog_pars_fragment>',
  'void main(){',
  '  vec2 d = vW.xz - uC; float cr = length(d), r = cr / uR, t = uTime * uSpeed; vec2 p = vW.xz;',
  '  vec2 g = vec2(0.8, 0.3) * cos(dot(p, vec2(0.8, 0.3)) * 1.7 + t * 1.3) * 0.05;',
  '  g += vec2(-0.4, 0.9) * cos(dot(p, vec2(-0.4, 0.9)) * 2.3 + t * 1.7) * 0.04;',
  '  g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 3.7 + t * 2.3) * 0.03;',
  '  g += (d / max(cr, 0.001)) * cos(cr * 2.4 - t * 1.6) * 0.05 * (1.0 - r);',
  '  vec2 q = p * 1.1 + vec2(t * 0.17, t * 0.13); float a0 = noise(q), ax = noise(q + vec2(0.15, 0.0)), az = noise(q + vec2(0.0, 0.15)); g += vec2(ax - a0, az - a0) * 0.9;',
  '  vec3 n = normalize(vec3(-g.x, 1.0, -g.y)), v = normalize(cameraPosition - vW);',
  '  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, v), 0.0), 5.0);',
  '  float deep = 1.0 - smoothstep(0.05, 0.95, r);',
  '  vec3 body = mix(uShal, uDeep, smoothstep(0.1, 0.8, deep));',
  '  body += uShal * 0.35 * smoothstep(0.55, 0.95, noise(p * 1.7 + vec2(t * 0.3, -t * 0.2))) * (1.0 - deep * 0.8);',
  '  vec3 rv = reflect(-v, n); float el = clamp(rv.y, 0.0, 1.0);',
  '  vec3 sky = mix(uSkyH, uSkyT, smoothstep(0.02, 0.45, el)) * 1.1;',
  '  vec3 c = mix(body, sky, clamp(fres * 0.75, 0.0, 0.6)) + uGlow * 0.16 * (1.0 - deep);',
  '  float m = max(dot(rv, uMoonDir), 0.0);',
  '  c += uMoonC * (pow(m, 220.0) * 2.2 + pow(m, 24.0) * 0.28);',
  '  vec2 cell = floor(p * 2.6); float h = hash(cell), tw = fract(h * 13.7 + t * (0.35 + h * 0.6));',
  '  c += uGlow * step(0.9, h) * smoothstep(0.0, 0.06, tw) * (1.0 - smoothstep(0.06, 0.22, tw)) * (0.4 + pow(m, 6.0) * 2.0) * smoothstep(0.35, 0.6, noise(p * 6.0 + t));',
  '  float shore = smoothstep(0.8, 0.985, r) * (1.0 - smoothstep(0.985, 1.05, r));',
  '  float foam = 0.55 + 0.45 * sin(cr * 9.0 - t * 1.8 + noise(p * 2.0) * 4.0);',
  '  c += uGlow * shore * (0.5 + 0.5 * foam);',
  '  float inside = 1.0 - smoothstep(0.995, 1.04, r);',
  '  float halo = (1.0 - smoothstep(1.0, 1.45, r)); halo = halo * halo;',
  '  vec3 outc = uGlow * 0.9; float a = mix(halo * 0.42, 0.97, inside);',
  '  c = mix(outc, c, inside);',
  '  #ifdef USE_FOG', '  float fogF = smoothstep(fogNear, fogFar, fogDepth); c = mix(c, fogColor, fogF * 0.85);', '  #endif',
  '  gl_FragColor = vec4(c, a);',
  '}'].join('\n');
function lochMesh() {
  const L = C.LOCH, W_ = P.water, R0 = L.r;
  const m = new T.ShaderMaterial({ uniforms: fogU({ uTime: { value: 0 }, uSpeed: { value: calm ? 0.35 : 1 }, uC: { value: new T.Vector2(L.x, L.z) }, uR: { value: R0 },
      uDeep: { value: col(W_[0]) }, uShal: { value: col(W_[1]) }, uGlow: { value: col(W_[2]) }, uSkyH: { value: col(LK.sky[2]) }, uSkyT: { value: col(LK.sky[1]) },
      uMoonC: { value: col(P.moon ? P.moon[0] : LK.sun[1]) }, uMoonDir: { value: new T.Vector3(MOON_DIR[0], MOON_DIR[1], MOON_DIR[2]).normalize() } }),
    vertexShader: LOCH_V, fragmentShader: LOCH_F, transparent: true, depthWrite: false, fog: true });
  shared(m); m.uniforms.uTime = uni.uTime;
  const o = mine(new T.Mesh(new T.CircleGeometry(R0 * 1.45, 72), m)); o.rotation.x = -Math.PI / 2; o.position.set(L.x, 0.075, L.z); o.renderOrder = 1; X.world.add(o);
  // a low veil of light rising off the water, so the loch reads as luminous from across the valley
  const vm = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uGlow: { value: col(W_[2]) }, uK: { value: id === 'origami' ? 0.12 : 0.3 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: ['uniform float uTime; uniform vec3 uGlow; uniform float uK; varying vec2 vUv;', GLSL_NOISE,
      'void main(){ float n = noise(vec2(vUv.x * 28.0 + uTime * 0.05, vUv.y * 2.5 - uTime * 0.35)) * 0.7 + noise(vec2(vUv.x * 61.0 - uTime * 0.04, vUv.y * 5.0 - uTime * 0.6)) * 0.3;',
      ' float a = pow(1.0 - vUv.y, 2.2) * (0.35 + 0.9 * n) * uK; gl_FragColor = vec4(uGlow, a); }'].join('\n'),
    transparent: true, depthWrite: false, blending: id === 'origami' ? T.NormalBlending : T.AdditiveBlending, side: T.DoubleSide, fog: false });
  shared(vm); vm.uniforms.uTime = uni.uTime;
  const veil = mine(new T.Mesh(new T.CylinderGeometry(R0 * 0.98, R0 * 1.02, 2.8, 48, 1, true), vm)); veil.position.set(L.x, 1.45, L.z); veil.renderOrder = 2; X.world.add(veil);
  return o;
}

/* ---------- pools of light ---------- */
const POOL_V = 'varying vec2 vUv; varying vec3 vC; varying float vPh;\n#include <fog_pars_vertex>\nvoid main(){ vUv = uv * 2.0 - 1.0; vec4 w = vec4(position, 1.0); vPh = 0.0; vC = vec3(1.0);\n#ifdef USE_INSTANCING\n w = instanceMatrix * w; vPh = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.61;\n#endif\n#ifdef USE_INSTANCING_COLOR\n vC = instanceColor;\n#endif\n vec4 mvPosition = modelViewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}';
const POOL_F = 'uniform float uTime; uniform float uFlick; varying vec2 vUv; varying vec3 vC; varying float vPh;\n#include <fog_pars_fragment>\nvoid main(){ float r = length(vUv); if (r > 1.0) discard; float a = max(exp(-r * r * 3.0) - 0.05 * r, 0.0) * (1.0 - r * r * 0.35); float f = 1.0 + uFlick * (0.07 * sin(uTime * 6.3 + vPh) + 0.05 * sin(uTime * 11.7 + vPh * 2.3) + 0.04 * sin(uTime * 2.1 + vPh)); vec3 c = vC * a * f;\n#ifdef USE_FOG\n c *= 1.0 - smoothstep(fogNear, fogFar, fogDepth);\n#endif\n gl_FragColor = vec4(c, 1.0); }';
function poolMesh(cap) {
  const g = new T.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
  const m = new T.ShaderMaterial({ uniforms: fogU({ uTime: { value: 0 }, uFlick: { value: calm ? 0 : 1 } }), vertexShader: POOL_V, fragmentShader: POOL_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -3 });
  shared(m); m.uniforms.uTime = uni.uTime;
  const im = new T.InstancedMesh(g, m, cap); im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.count = 0; im.frustumCulled = false; im.renderOrder = 2;
  mine(im); X.world.add(im); return im;
}
function poolAdd(x, z, rad, hex, k, s) {
  if (!pools || pools.count >= pools.instanceMatrix.count) return;
  const i = pools.count++; dm.position.set(x, 0.1, z); dm.rotation.set(0, 0, 0); dm.scale.set(rad, 1, rad); dm.updateMatrix(); pools.setMatrixAt(i, dm.matrix);
  const base = col(hex).multiplyScalar(k); pools.setColorAt(i, base); poolList.push({ i: i, s: s || null, base: base, lv: 1 });
}

/* ---------- sky: moon, mist, stars ---------- */
const MOON_F = [
  'uniform vec3 uDisc; uniform vec3 uHalo; uniform vec3 uRing; uniform vec2 uOpt; varying vec2 vUv;', GLSL_NOISE,
  'void main(){',
  '  vec2 p = (vUv - 0.5) * 7.0; float r = length(p);',
  '  float ca = cos(-0.38), sa = sin(-0.38); vec2 q = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);',
  '  float e = length(vec2(q.x, q.y / 0.24));',
  '  float band = smoothstep(1.55, 1.62, e) * (1.0 - smoothstep(2.05, 2.2, e)) * (0.55 + 0.45 * sin(e * 34.0)) * (0.55 + 0.45 * smoothstep(-2.4, 2.4, q.x));',
  '  band *= 1.0 - 0.8 * smoothstep(1.82, 1.85, e) * (1.0 - smoothstep(1.9, 1.93, e));',
  '  float disc = 1.0 - smoothstep(0.97, 1.0, r), z = sqrt(max(0.0, 1.0 - r * r));',
  '  float lit = clamp(dot(normalize(vec3(p, z)), normalize(vec3(-0.45, 0.35, 0.82))), 0.0, 1.0);',
  '  float cr = noise(p * 2.2 + 3.0) * 0.6 + noise(p * 5.5) * 0.4;',
  '  vec3 dc = uDisc * (0.42 + 0.46 * lit) * (0.7 + 0.36 * cr) + uHalo * pow(1.0 - z, 2.0) * uOpt.y;',
  '  float o = max(r - 1.0, 0.0), halo = (exp(-o * 1.7) * 0.55 + exp(-o * 0.5) * 0.2) * (1.0 - disc);',
  '  float front = step(q.y, 0.0), ring = band * mix(1.0 - disc, 1.0, front) * uOpt.x;',
  '  vec3 add = (uHalo * halo * 0.8 + uRing * ring * 0.32) * (1.0 - smoothstep(2.9, 3.5, r));',
  '  gl_FragColor = vec4(dc * disc + add, disc);',
  '}'].join('\n');
function moonMesh() {
  if (!P.moon || !X.sky || LK.star <= 0) return null;
  const M = P.moon, m = new T.ShaderMaterial({ uniforms: { uDisc: { value: col(M[0]) }, uHalo: { value: col(M[1]) }, uRing: { value: col(M[2]) }, uOpt: { value: new T.Vector2(M[3][0], M[3][1]) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: MOON_F,
    transparent: true, depthWrite: false, fog: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor });
  shared(m);
  const d = 300, rad = d * Math.tan(2.9 * DEG), o = mine(new T.Mesh(new T.PlaneGeometry(rad * 7, rad * 7), m));
  o.position.set(MOON_DIR[0] * d, MOON_DIR[1] * d, MOON_DIR[2] * d); o.lookAt(0, 0, 0); o.renderOrder = -1; o.frustumCulled = false; X.sky.add(o); return o;
}
const MIST_V = 'varying vec2 vUv; varying float vB; attribute float aB; void main(){ vUv = uv; vB = aB; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const MIST_F = ['uniform vec3 uLo; uniform vec3 uHi; uniform float uA; uniform float uTime; varying vec2 vUv; varying float vB;', GLSL_NOISE,
  'void main(){ float x = vUv.x * (vB > 0.5 ? 38.0 : 30.0); vec2 s = vec2(x + uTime * 0.02 * (1.0 + vB), vUv.y * 2.2 + vB * 7.0);',
  '  float n = noise(s) * 0.6 + noise(s * 2.3 + 4.0) * 0.3 + noise(s * 5.1) * 0.1;',
  '  float prof = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.35 + n * 0.3, 1.0, vUv.y));',
  '  float a = uA * prof * (0.35 + 0.9 * n) * (vB > 0.5 ? 0.8 : 1.0);',
  '  gl_FragColor = vec4(mix(uLo, uHi, clamp(vUv.y * 0.8 + vB * 0.35, 0.0, 1.0)), a); }'].join('\n');
function mistMesh() {
  if (!P.mist) return null;
  const parts = [[335, 8, 120, 0], [430, 30, 170, 1]], pos = [], uv = [], ab = [], idx = [];
  parts.forEach(function (b) {
    const g = new T.CylinderGeometry(b[0], b[0], b[2], 72, 1, true), p = g.attributes.position, u = g.attributes.uv, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i) + b[1] + b[2] / 2, p.getZ(i)); uv.push(u.getX(i), u.getY(i)); ab.push(b[3]); }
    for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
  });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('aB', new T.Float32BufferAttribute(ab, 1)); g.setIndex(idx);
  const m = new T.ShaderMaterial({ uniforms: { uLo: { value: col(P.mist[0]) }, uHi: { value: col(P.mist[1]) }, uA: { value: P.mist[2] }, uTime: { value: 0 } }, vertexShader: MIST_V, fragmentShader: MIST_F, transparent: true, depthWrite: false, fog: false, side: T.BackSide });
  shared(m); m.uniforms.uTime = uni.uTime;
  const o = mine(new T.Mesh(g, m)); o.frustumCulled = false; o.renderOrder = -1; X.scene.add(o); return o;
}
const STAR_V = 'uniform float uTime; attribute vec2 aS; varying float vA; void main(){ vA = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (0.7 + aS.y * 2.3) + aS.x * 40.0), 2.0); gl_PointSize = 1.4 + aS.y * 2.4; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const STAR_F = 'uniform vec3 uCol; uniform float uK; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.1, 0.5, length(q)); gl_FragColor = vec4(uCol * a * vA * uK, 1.0); }';
function starPoints() {
  if (!(LK.star > 0) || !X.sky) return null;
  const n = low ? 160 : 320, r = LL.rng(55), pos = [], s = [];
  for (let i = 0; i < n; i++) {
    const th = r() * 6.283, el = (9 + Math.pow(r(), 0.7) * 76) * DEG, d = 315;
    pos.push(Math.cos(el) * Math.cos(th) * d, Math.sin(el) * d, Math.cos(el) * Math.sin(th) * d); s.push(r(), r() * r());
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new T.Float32BufferAttribute(s, 2));
  const m = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uCol: { value: col(P.moon ? P.moon[0] : 0xf4e8d6) }, uK: { value: LK.star * (id === 'glow' ? 0.8 : 0.75) } }, vertexShader: STAR_V, fragmentShader: STAR_F, transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending });
  shared(m); m.uniforms.uTime = calm ? { value: 0 } : uni.uTime;
  const o = mine(new T.Points(g, m)); o.frustumCulled = false; o.renderOrder = -1; X.sky.add(o); return o;
}

/* ---------- air: fireflies and petals ---------- */
const FLY_V = ['uniform float uTime; uniform float uPx; uniform float uMove; attribute vec2 aS; varying float vA;', '#include <fog_pars_vertex>',
  'void main(){ float ph = aS.x * 6.2831, t = uTime * uMove;',
  '  vec3 p = position + vec3(sin(t * 0.37 + ph) * 1.7 + sin(t * 0.91 + ph * 2.0) * 0.5, sin(t * 0.53 + ph * 1.7) * 0.5 + 0.3 * sin(t * 1.3 + ph), cos(t * 0.41 + ph * 1.3) * 1.7 + cos(t * 0.77 + ph) * 0.5);',
  '  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;',
  '  vA = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * (0.6 + aS.y * 0.9) + ph * 3.0), 3.0);',
  '  gl_PointSize = clamp(0.32 * uPx / -mvPosition.z, 1.5, 26.0);', '#include <fog_vertex>', '}'].join('\n');
const FLY_F = ['uniform vec3 uCol; varying float vA;', '#include <fog_pars_fragment>',
  'void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float a = exp(-r * r * 5.0) * 0.7 + exp(-r * r * 40.0); vec3 c = uCol * a * vA;',
  '#ifdef USE_FOG', ' c *= 1.0 - smoothstep(fogNear, fogFar, fogDepth);', '#endif', ' gl_FragColor = vec4(c, 1.0); }'].join('\n');
function flyPoints() {
  if (!P.fly || !treesFor) return null;
  const r = LL.rng(808), pos = [], s = [], cap = Math.round((low ? 70 : 180) * P.fly[1]);
  const add = function (x, y, z) { if (pos.length / 3 < cap) { pos.push(x, y, z); s.push(r(), r()); } };
  for (let k = 0; k < (low ? 10 : 22); k++) { const a = r() * 6.283, d = C.LOCH.r * (0.4 + r() * 1.0); add(C.LOCH.x + Math.cos(a) * d, 0.6 + r() * 1.6, C.LOCH.z + Math.sin(a) * d); }
  const near = treesFor.blossom.concat(treesFor.pine).filter(function (t) { return Math.abs(t.x) < C.HALF_X + 20 && Math.abs(t.z) < C.HALF_Z + 20; });
  for (let k = 0; pos.length / 3 < cap && k < 2000; k++) { const t = near[Math.floor(r() * near.length)]; if (!t) break; const a = r() * 6.283, d = 1.5 + r() * 4; add(t.x + Math.cos(a) * d, t.y + 0.8 + r() * 3.5, t.z + Math.sin(a) * d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new T.Float32BufferAttribute(s, 2));
  const m = new T.ShaderMaterial({ uniforms: fogU({ uTime: { value: 0 }, uPx: { value: 600 }, uMove: { value: calm ? 0.2 : 1 }, uCol: { value: col(P.fly[0]).multiplyScalar(1.4) } }), vertexShader: FLY_V, fragmentShader: FLY_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true });
  shared(m); m.uniforms.uTime = uni.uTime; m.uniforms.uPx = uni.uPx;
  const o = mine(new T.Points(g, m)); o.frustumCulled = false; X.world.add(o); return o;
}
const PET_V = ['uniform float uTime; uniform float uPx; uniform vec3 uCam; uniform vec3 uBox; uniform vec3 uDrift; attribute vec2 aS; varying float vRot; varying float vFlip; varying float vA; varying float vT;', '#include <fog_pars_vertex>',
  'void main(){ float ph = aS.x * 6.2831;',
  '  vec3 d = uDrift * uTime * (0.7 + 0.6 * aS.y) + vec3(sin(uTime * 0.8 + ph) * 0.9, 0.0, cos(uTime * 0.6 + ph) * 0.9);',
  '  vec3 rel = fract(position + (d - vec3(uCam.x, 0.0, uCam.z)) / uBox);',
  '  vec3 w = vec3(uCam.x + (rel.x - 0.5) * uBox.x, rel.y * uBox.y, uCam.z + (rel.z - 0.5) * uBox.z);',
  '  vA = smoothstep(0.0, 0.1, rel.x) * (1.0 - smoothstep(0.9, 1.0, rel.x)) * smoothstep(0.0, 0.1, rel.z) * (1.0 - smoothstep(0.9, 1.0, rel.z)) * smoothstep(0.0, 0.04, rel.y) * (1.0 - smoothstep(0.85, 1.0, rel.y));',
  '  vRot = uTime * (0.6 + aS.y * 1.5) + ph; vFlip = uTime * (1.1 + aS.y * 1.7) + ph * 2.0; vT = aS.y;',
  '  vec4 mvPosition = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mvPosition;',
  '  gl_PointSize = clamp(0.2 * uPx / -mvPosition.z, 1.0, 40.0);', '#include <fog_vertex>', '}'].join('\n');
const PET_F = ['uniform vec3 uC1; uniform vec3 uC2; varying float vRot; varying float vFlip; varying float vA; varying float vT;', '#include <fog_pars_fragment>',
  'void main(){ vec2 q = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);',
  '  q.x /= max(abs(cos(vFlip)), 0.22);',
  '  float e = length(vec2(q.x * 2.5, q.y * 1.6 + q.x * q.x * 2.0)); float a = (1.0 - smoothstep(0.36, 0.5, e)) * vA; if (a < 0.03) discard;',
  '  vec3 col = mix(uC1, uC2, clamp(0.5 - q.y * 1.6 + vT * 0.3, 0.0, 1.0));',
  '#ifdef USE_FOG', ' col = mix(col, fogColor, smoothstep(fogNear, fogFar, fogDepth));', '#endif', ' gl_FragColor = vec4(col, a * 0.95); }'].join('\n');
function petalPoints() {
  if (!P.petal || calm) return null;
  const n = Math.round((low ? 160 : 460) * P.petal[2]), r = LL.rng(31), pos = [], s = [];
  for (let i = 0; i < n; i++) { pos.push(r(), r(), r()); s.push(r(), r()); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new T.Float32BufferAttribute(s, 2));
  const m = new T.ShaderMaterial({ uniforms: fogU({ uTime: { value: 0 }, uPx: { value: 600 }, uCam: { value: new T.Vector3() }, uBox: { value: new T.Vector3(46, 12, 46) }, uDrift: { value: new T.Vector3(0.9, -0.65, 0.35) }, uC1: { value: col(P.petal[0]) }, uC2: { value: col(P.petal[1]) } }),
    vertexShader: PET_V, fragmentShader: PET_F, transparent: true, depthWrite: false, fog: true });
  shared(m); m.uniforms.uTime = uni.uTime; m.uniforms.uPx = uni.uPx; m.uniforms.uCam = uni.uCam;
  const o = mine(new T.Points(g, m)); o.frustumCulled = false; X.world.add(o); return o;
}

/* ---------- the interface gfx.js calls ---------- */
/* begin: before buildGround, so the ground tint knows the palette. ctx: T, scene, world, sky, renderer, LK, id, R, groundH. */
SC.begin = function (ctx) {
  X = ctx; T = ctx.T; LK = ctx.LK; id = ctx.id; P = PAL[id] || PAL.snow; low = !!ctx.R.low; calm = !!ctx.R.reduced;
  if (!dm) { dm = new T.Object3D(); tc = new T.Color(); tc2 = new T.Color(); v2 = new T.Vector2(); uni.uCam.value = new T.Vector3(); }
  built = false; treesFor = null; pools = null; poolList = []; loch = null; moon = null;
  uni.uWind.value = calm ? 0 : 1;
};
/* The floor away from the threads goes darker and cooler. lt: how much the floor is a thread or base (0 to 1), d: metres to the nearest thread. */
SC.groundTint = function (c, x, z, d, lt, out, n) {
  const G = P && P.ground; if (!G) return;
  const f = out > 0 ? 1 : U.clamp((d - 4) / 16, 0, 1) * (1 - lt);
  c.multiplyScalar(U.lerp(G[2], G[3], f) * (0.9 + 0.2 * n));
  c.lerp(tc2.setHex(G[0]), Math.min(0.85, G[1] * f * (0.6 + 0.8 * n)));
};
/* build: after the rest of the valley is built. Things that do not need the match. */
SC.build = function (ctx) {
  X = ctx; built = true;
  if (ctx.ground) groundGlints(ctx.ground.material);
  loch = lochMesh();
  moon = moonMesh(); mistMesh(); starPoints();
};
/* trees: from buildDecor, once per valley. Returns the tree meshes so gfx can hide them when painted pines are in use. */
SC.trees = function (W, trees) {
  if (!built) return [];
  const ms = treeMeshes(trees, X.groundH);
  plantMesh(W); litterMesh(X.groundH); flyPoints(); petalPoints();
  return ms;
};
/* world: from R.build, every match. The pools follow this match's structures. */
SC.world = function (W) {
  if (!built) return;
  if (pools && pools.parent) pools.parent.remove(pools);
  pools = null; poolList = [];
  if (!P.pool) return;
  const PL = P.pool, K = PL[2]; pools = poolMesh(120);
  const q = { x: 0, z: 0, dx: 0, dz: 0 };
  W.structs.forEach(function (s) {
    if (s.kind === 'patron') poolAdd(s.x, s.z, 17, s.team === 0 ? PL[0] : PL[1], K[s.team === 0 ? 0 : 1] * 0.9, s);
    else if (s.team === 0) poolAdd(s.x, s.z, s.kind === 'warden' ? 13 : 11, PL[0], K[0], s);
    else poolAdd(s.x, s.z, s.kind === 'warden' ? 10 : 8.5, PL[1], K[1], s);
  });
  poolAdd(0, -C.SPAWN_Z, C.FOUNT_R + 5, PL[0], K[0] * 0.8, null); poolAdd(0, C.SPAWN_Z, C.FOUNT_R + 3, PL[1], K[1] * 0.8, null);
  for (let l = 0; l < 3; l++) {
    const L = LL.lanes[l];
    for (let s = 14; s < L.len - 14; s += 13) {
      LL.lanePoint(l, s, q); let near = false;
      for (let i = 0; i < W.structs.length && !near; i++) if (Math.hypot(W.structs[i].x - q.x, W.structs[i].z - q.z) < 12) near = true;
      if (near) continue;
      const t = s / L.len; poolAdd(q.x, q.z, 5 + (s * 7 % 3), t < 0.5 ? PL[0] : PL[1], K[2] * (t < 0.5 ? 1 : 0.8), null);
    }
  }
  pools.instanceMatrix.needsUpdate = true; pools.instanceColor.needsUpdate = true;
};
/* frame: every drawn frame. Shared time and camera, point size scale, pools dimming with their structures. */
SC.frame = function (dt, time, camera) {
  if (!built) return;
  uni.uTime.value = time; uni.uCam.value.copy(camera.position);
  X.renderer.getDrawingBufferSize(v2); uni.uPx.value = v2.y / (2 * Math.tan(camera.fov * DEG / 2));
  if (pools) {
    let dirty = false;
    for (let i = 0; i < poolList.length; i++) {
      const p = poolList[i]; if (!p.s) continue;
      const want = !p.s.alive ? 0 : (p.s.dark ? 0.12 : 1);
      if (Math.abs(want - p.lv) < 0.004) continue;
      p.lv += (want - p.lv) * Math.min(1, dt * 2.5); if (Math.abs(want - p.lv) < 0.004) p.lv = want;
      pools.setColorAt(p.i, tc.copy(p.base).multiplyScalar(p.lv)); dirty = true;
    }
    if (dirty) pools.instanceColor.needsUpdate = true;
  }
};
SC.moonDir = MOON_DIR;
SC._dbg = function () { return { built: built, pools: pools ? pools.count : -1, trees: treesFor ? treesFor.blossom.length + treesFor.pine.length : 0 }; }; // for tools
})();
