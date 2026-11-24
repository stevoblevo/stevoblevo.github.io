/* LIVLOCH · ness: the Ness as a creature, the mark of its bite, and the flood. Three.js r128. Loaded before gfx.js.

   DESIGN
   - Presentation only. It reads W.ness, W.flood and the heroes; it never writes to the model. Every rule (the tell, the
     bite, the hold, the water's depth and what it does to movement) is in sim.js at NESS.
   - The owner judges from the play camera, low behind the hero, where the painted card of 0.25 turned edge-on and
     could not lunge. So the Ness is a body: long neck, small head, humps, flippers. It is folded paper like the rest
     of the valley, after the concept plates (art/concepts/08 and 09): jade panels cut in diamonds and leaded in gold,
     a pale belly, a cold bright eye, and a small lantern it carries on a stalk over its brow, the valley's own light.
   - ONE MESH, posed on the CPU. 592 triangles, one draw call: a tube of NR rings along a spine (the neck is a curve
     from the body to wherever the head is; the body is a chain that trails the way it swam, coiled in the loch), plus
     rigid pieces set by a matrix each (head, jaw, the lantern, four flippers). No skeleton: every frame writes the
     positions (about 1,700 vertices). Flat shading comes from screen derivatives, so no normals are written. Gold
     seams are drawn in the fragment shader from a barycentric attribute, so they cost no lines.
     A second draw call, four points, is its light: two eyes, the lantern, a glow under the water where it lies.
   - WHAT IT DOES. Idle: breathes, looks about, watches whoever hurt it. The tell: rears back, jaws wide, eye on the
     spot, and a ring on the ground at the spot that fills as the bite comes and turns from jade to gold when it stops
     following. The bite: the head goes to the spot. A catch: the head lifts with the hero in the jaws (the head goes
     where the model holds the hero). A miss: the head lies on the ground for as long as the model says it is open.
     The flood's warning: it rears and calls. In the flood: it swims, head low and forward, the body trailing its path.
   - THE FLOOD is one mesh too: rings round the loch, so the front that runs out from it is a true slope. The vertex
     shader lifts each ring to the model's depth there (the same line as S.waterAt). The fragment shader does ripples,
     the sky, foam on the front and the warm lines of the threads. Lighter graphics: fewer rings, flat colour and foam,
     no ripples. The threads get a ribbon of light just above the water, where riders ride, so the dry way reads.
     During the warning the loch stands up out of its banks.
   - Reduced motion: no breathing, no look-about, no shake, no ripples; the tell, the bite and the water still read.
   - Painted paper (Settings, heroes as 3D figures off) uses this Ness too: a card cannot lunge or swim.
   - gfx.js reaches this file at lines marked `0.26 ness`: build (R.build), fx (R.fx), frame (R.frame), bob (troopers). */
(function () {
'use strict';
const LL = window.LL, C = LL.C, S = LL.sim, U = LL.U;
const NS = LL.ness = {};
let T = null, X = null, mesh = null, pos = null, glow = null, gPos = null, mark = null, markIn = null, water = null, ribbon = null;
const NK = 12, NB = 22, NR = NK + NB, SIDES = 7, SEG = 0.8, HS = 1.6, RS = 1.25;
const tube = [], rigid = [], PARTS = { head: 0, jaw: 1, lure: 2, fl0: 3, fl1: 4, fl2: 5, fl3: 6 }, M = [];
const P = new Float32Array(NR * 3), SD = new Float32Array(NR * 3), UP = new Float32Array(NR * 3), RAD = new Float32Array(NR);
const chain = new Float32Array(NB * 2);
const st = { ok: false, hx: 0, hy: 6, hz: 0, dx: 0, dy: 0, dz: 1, jaw: 0, coil: 1, ph: 0, bx: 0, bz: 0, lunge: 9, toss: 9, rise: 0, lx: 0, ly: 0, lz: 0, lvx: 0, lvy: 0, lvz: 0, flash: 0, wake: 0, lock: 0, call: 0, tris: 0, look: 0 };
const JADE = [0x1f9e8a, 0x157a78, 0x2fc4a4, 0x176a8c, 0x1b8c7c], BELLY = 0xc8f2e0, FIN = 0x7fe8d0, GOLD = 0xf2c868, MOUTH = 0x5a1238, TOOTH = 0xfff4dc, EYE = 0xbffff2, LAMP = 0xffd27a, HORN = 0xe8d8a8;
/* Per view (by its drawing pass index): lift, light gain, key light, rim. */
const LOOKP = { 0: [0.24, 0.7, 0.55, 0.5], 1: [0.34, 0.55, 0.55, 0.4], 2: [0.16, 0.74, 0.35, 0.15], 3: [0.26, 0.64, 0.5, 0.45], 4: [0.2, 0.55, 0.4, 1.0], 5: [0.26, 0.7, 0.5, 0.5], 6: [0.3, 0.6, 0.5, 0.35], 7: [0.26, 0.66, 0.5, 0.5] };

/* ---------- building the one mesh ---------- */
let vx = [], vc = [], vb = [], ve = [], tc = null;
function colOf(hex, k) { tc.setHex(hex); if (k != null) tc.multiplyScalar(k); return [tc.r, tc.g, tc.b]; }
function vert(rec, col, em, b) { const i = vx.length / 3; vx.push(0, 0, 0); vc.push(col[0], col[1], col[2]); ve.push(em || 0); vb.push(b[0], b[1], b[2]); rec.i = i; (rec.part == null ? tube : rigid).push(rec); }
/* seams: which of the triangle's three edges are leaded in gold. Edge k is the one opposite vertex k. */
function tri(a, b, c, col, em, seams) {
  const s = seams || [1, 1, 1], B = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let k = 0; k < 3; k++) if (!s[k]) { B[0][k] = B[1][k] = B[2][k] = 1; }
  vert(a, col, em, B[0]); vert(b, col, em, B[1]); vert(c, col, em, B[2]); st.tris++;
}
const tv = (ring, ang, rho, lift) => ({ ring: ring, c: Math.cos(ang), s: Math.sin(ang), rho: rho == null ? 1 : rho, lift: lift || 0 });
const rv = (part, x, y, z) => ({ part: PARTS[part], x: x, y: y, z: z });
const cp = (o) => Object.assign({}, o);
function radius(i) { // the neck from the head down, then the body, then the tail
  if (i < NK) return RS * (0.52 + 0.48 * Math.pow(i / NK, 1.3));
  const t = (i - NK) / (NB - 1); return RS * (t < 0.2 ? 1.0 + 0.3 * Math.sin(t / 0.2 * 1.5708) : 1.3 * Math.pow(1 - (t - 0.2) / 0.8, 0.8) + 0.07);
}
function buildTube() {
  for (let i = 0; i < NR; i++) RAD[i] = radius(i);
  for (let i = 0; i < NR - 1; i++) for (let j = 0; j < SIDES; j++) {
    // side j spans angles a0..a1; angle pi/2 is the back, -pi/2 the belly (two panels wide)
    const a0 = -Math.PI / 2 - Math.PI / SIDES + j * 2 * Math.PI / SIDES, a1 = a0 + 2 * Math.PI / SIDES, belly = j === 0, k = (i * 7 + j * 3) % JADE.length;
    const col = belly ? colOf(BELLY, 0.86 + 0.14 * ((i + j) % 2)) : colOf(JADE[k], 0.9 + 0.1 * ((i * 3 + j) % 3) / 2);
    const A = tv(i, a0), B = tv(i, a1), Cc = tv(i + 1, a1), D = tv(i + 1, a0);
    // alternate the diagonal and lead only the diagonal: the panels come out as diamonds
    if ((i + j) % 2) { tri(A, Cc, B, col, 0, [0, 0, 1]); tri(cp(A), D, cp(Cc), colOf(belly ? BELLY : JADE[(k + 2) % JADE.length], 0.92), 0, [0, 1, 0]); }
    else { tri(A, D, B, col, 0, [1, 0, 0]); tri(cp(B), cp(D), Cc, colOf(belly ? BELLY : JADE[(k + 2) % JADE.length], 0.92), 0, [0, 0, 1]); }
  }
  // the fin down the back, a tooth of membrane every second ring, and the tail's blade
  const fin = colOf(FIN, 0.9), top = Math.PI / 2;
  for (let i = 1; i < NR - 6; i += 2) { const h = (i < NK ? 0.5 : 0.75) * Math.min(1, RAD[i] * 1.1); tri(tv(i, top, 1), tv(i + 2, top, 1), tv(i + 2, top, 1, h), fin, 0.15, [1, 1, 1]); }
  for (let i = NR - 6; i < NR - 1; i++) { const h0 = 0.12 + (i - (NR - 6)) * 0.11, h1 = h0 + 0.11; tri(tv(i, top, 1, h0), tv(i + 1, top, 1, h1), tv(i + 1, -top, 1, -h1 * 0.6), fin, 0.15); tri(tv(i, top, 1, h0), tv(i + 1, -top, 1, -h1 * 0.6), tv(i, -top, 1, -h0 * 0.6), fin, 0.15); }
}
/* A closed loft through sections of the same point count, for the rigid pieces. cols(seg, side) gives the colour. */
function loft(part, secs, cols, capEnd) {
  const n = secs[0].p.length, R_ = (s, k) => rv(part, secs[s].p[k][0] * HS, secs[s].p[k][1] * HS, secs[s].z * HS);
  for (let s = 0; s < secs.length - 1; s++) for (let k = 0; k < n; k++) { const k1 = (k + 1) % n, c = cols(s, k); tri(R_(s, k), R_(s + 1, k), R_(s + 1, k1), c[0], c[1] || 0); tri(R_(s, k), R_(s + 1, k1), R_(s, k1), c[0], c[1] || 0, [1, 0, 1]); }
  if (capEnd) { const s = secs.length - 1, c = cols(s - 1, 1); for (let k = 1; k < n - 1; k++) tri(R_(s, 0), R_(s, k), R_(s, k + 1), c[0], 0); }
}
function buildHead() {
  const jade = (s, k) => colOf(JADE[(s * 2 + k) % JADE.length], 0.95 + 0.08 * (k % 2)), mouth = colOf(MOUTH), pale = colOf(BELLY, 0.92);
  // the skull: bottom-left, top-left, ridge, top-right, bottom-right
  const sk = [[-0.15, 0.52, -0.02, 0.5, 0.7], [0.75, 0.66, 0.0, 0.62, 0.88], [1.55, 0.47, 0.0, 0.33, 0.47], [2.5, 0.25, 0.03, 0.15, 0.23]].map(function (q) { return { z: q[0], p: [[-q[1], q[2]], [-q[1] * 0.92, q[3]], [0, q[4]], [q[1] * 0.92, q[3]], [q[1], q[2]]] }; });
  loft('head', sk, function (s, k) { return k === 4 ? [mouth] : [jade(s, k)]; }, true);
  // the jaw: top-left, bottom-left, bottom-right, top-right, hinged at its own origin
  const jw = [[0, 0.5, -0.3], [1.1, 0.43, -0.25], [2.2, 0.22, -0.1]].map(function (q) { return { z: q[0], p: [[-q[1], 0], [-q[1] * 0.8, q[2]], [q[1] * 0.8, q[2]], [q[1], 0]] }; });
  loft('jaw', jw, function (s, k) { return k === 3 ? [mouth] : (k === 1 ? [pale] : [jade(s + 1, k)]); }, true);
  const none = [0, 0, 0], tooth = colOf(TOOTH), H = HS;
  for (let side = -1; side <= 1; side += 2) {
    // teeth: five down from the skull, four up from the jaw, each a single blade
    for (let k = 0; k < 5; k++) { const z = 0.85 + k * 0.36, w = 0.66 - (z - 0.75) * 0.235; tri(rv('head', side * w * H, 0.02 * H, (z - 0.12) * H), rv('head', side * w * H, 0.02 * H, (z + 0.12) * H), rv('head', side * w * 0.96 * H, -0.24 * H, z * H), tooth, 0.25, none); }
    for (let k = 0; k < 4; k++) { const z = 0.75 + k * 0.38, w = 0.47 - (z - 0.6) * 0.14; tri(rv('jaw', side * w * H, 0, (z - 0.11) * H), rv('jaw', side * w * H, 0, (z + 0.11) * H), rv('jaw', side * w * 0.96 * H, 0.2 * H, z * H), tooth, 0.25, none); }
    // the eye: a cold bright diamond under the brow
    const ex = side * 0.665 * H, eye = colOf(EYE);
    tri(rv('head', ex, 0.5 * H, 0.72 * H), rv('head', ex, 0.36 * H, 0.95 * H), rv('head', ex, 0.5 * H, 1.2 * H), eye, 1, none); tri(rv('head', ex, 0.5 * H, 0.72 * H), rv('head', ex, 0.5 * H, 1.2 * H), rv('head', ex * 0.96, 0.6 * H, 0.95 * H), eye, 1, none);
    // a horn swept back, and the frill behind the cheek
    const horn = colOf(HORN);
    const h0 = [side * 0.3 * H, 0.66 * H, 0.2 * H], h1 = [side * 0.52 * H, 0.6 * H, 0.05 * H], h2 = [side * 0.36 * H, 0.52 * H, -0.12 * H], ht = [side * 0.62 * H, 1.2 * H, -1.05 * H];
    [[h0, h1], [h1, h2], [h2, h0]].forEach(function (e) { tri(rv('head', e[0][0], e[0][1], e[0][2]), rv('head', e[1][0], e[1][1], e[1][2]), rv('head', ht[0], ht[1], ht[2]), horn, 0.1); });
    const fr = colOf(FIN, 0.95);
    tri(rv('head', side * 0.5 * H, 0.5 * H, 0), rv('head', side * 0.56 * H, 0.05 * H, 0.1 * H), rv('head', side * 1.25 * H, 0.62 * H, -0.75 * H), fr, 0.15); tri(rv('head', side * 0.56 * H, 0.05 * H, 0.1 * H), rv('head', side * 1.05 * H, -0.2 * H, -0.55 * H), rv('head', side * 1.25 * H, 0.62 * H, -0.75 * H), fr, 0.15);
  }
  // the stalk over the brow, and the lantern that hangs from its tip (a part of its own, on a pendulum)
  const stalk = colOf(HORN, 0.9), b0 = [0, 0.86 * H, 0.75 * H], tip = NS._tip = [0, 1.75 * H, 1.75 * H];
  [[-0.07, 0], [0.07, 0], [0, 0.1]].forEach(function (o, k, a) { const o2 = a[(k + 1) % 3]; tri(rv('head', b0[0] + o[0], b0[1], b0[2] + o[1]), rv('head', b0[0] + o2[0], b0[1], b0[2] + o2[1]), rv('head', tip[0], tip[1], tip[2]), stalk, 0.1, none); });
  const lamp = colOf(LAMP), cap = colOf(0x7a4a22), r = 0.26, hh = 0.36;
  for (let k = 0; k < 4; k++) { const a0 = k * 1.5708 + 0.785, a1 = a0 + 1.5708, p0 = [Math.cos(a0) * r, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, Math.sin(a1) * r];
    tri(rv('lure', p0[0], -hh, p0[1]), rv('lure', p1[0], -hh, p1[1]), rv('lure', 0, 0, 0), cap, 0.2, none); tri(rv('lure', p0[0], -hh, p0[1]), rv('lure', 0, -hh * 2.1, 0), rv('lure', p1[0], -hh, p1[1]), lamp, 1, [1, 0, 1]); }
}
function buildFlippers() {
  const a = colOf(JADE[1]), b = colOf(JADE[3], 0.95);
  for (let f = 0; f < 4; f++) { const p = 'fl' + f, L = f < 2 ? 2.5 : 1.9, Wd = f < 2 ? 0.85 : 0.65; // a paddle: root, front edge, tip, back edge, along +x
    tri(rv(p, 0, 0, 0.3), rv(p, L * 0.55, 0, Wd), rv(p, L, 0, 0), a, 0); tri(rv(p, 0, 0, 0.3), rv(p, L, 0, 0), rv(p, 0, 0, -0.3), b, 0, [1, 1, 0]); tri(rv(p, 0, 0, -0.3), rv(p, L, 0, 0), rv(p, L * 0.5, 0, -Wd * 0.7), a, 0); }
}
function nessMat(LK) {
  const lp = LOOKP[LK && LK.post != null ? LK.post : 0] || LOOKP[0];
  const m = new T.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, side: T.DoubleSide, shininess: 6, specular: 0x0a1a18 });
  const Un = m.userData.U = { uLift: { value: lp[0] }, uGain: { value: lp[1] }, uKey: { value: lp[2] }, uRimK: { value: lp[3] }, uRim: { value: new T.Color(0x9ff5e0) }, uGold: { value: new T.Color(GOLD) }, uSeamK: { value: 0.95 }, uEmK: { value: 1.5 }, uWaterY: { value: 0 }, uDeep: { value: new T.Color(LK.ground.water).multiplyScalar(0.45) }, uFlash: { value: 0 } };
  m.onBeforeCompile = function (sh) {
    for (const k in Un) sh.uniforms[k] = Un[k];
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aB;\nattribute float aE;\nvarying vec3 vB;\nvarying float vE;\nvarying float vWy;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvB = aB; vE = aE; vWy = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLift; uniform float uGain; uniform float uKey; uniform float uRimK; uniform vec3 uRim; uniform vec3 uGold; uniform float uSeamK; uniform float uEmK; uniform float uWaterY; uniform vec3 uDeep; uniform float uFlash;\nvarying vec3 vB;\nvarying float vE;\nvarying float vWy;')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;', [
        'float ed = min(vB.x, min(vB.y, vB.z)); float seam = 1.0 - smoothstep(0.0, max(fwidth(ed) * 1.6, 0.03), ed);',
        'vec3 outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * uGain + reflectedLight.directSpecular + diffuseColor.rgb * uLift;',
        'outgoingLight += diffuseColor.rgb * uKey * max(dot(normal, normalize(vec3(-0.75, 0.5, 0.45))), 0.0);',
        'vec3 hv = normalize(vViewPosition); float fr = 1.0 - clamp(abs(dot(normal, hv)), 0.0, 1.0);',
        'outgoingLight += uRim * smoothstep(0.5, 0.95, fr) * uRimK * 0.5;',
        'outgoingLight = mix(outgoingLight, uGold, seam * uSeamK);',
        'outgoingLight += diffuseColor.rgb * vE * uEmK;',
        'outgoingLight = mix(outgoingLight, uDeep, smoothstep(uWaterY + 0.05, uWaterY - 0.8, vWy) * 0.7);',
        'outgoingLight += vec3(uFlash);'].join('\n'));
  };
  m.customProgramCacheKey = function () { return 'ness3d1'; };
  m.userData.lk = m.userData.bl = m.userData.solid = true;
  return m;
}
const GLOW_V = 'attribute float aS; attribute vec3 aC; uniform float uPx; varying vec3 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(aS * uPx / max(-mv.z, 0.5), 130.0); }';
const GLOW_F = 'uniform sampler2D uT; uniform float uK; varying vec3 vC; void main(){ vec4 t = texture2D(uT, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb * uK, t.a * uK); }';

/* ---------- the flood ---------- */
const NOISE = 'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }';
const WATER_V = ['uniform vec2 uC; uniform float uReach; uniform float uEdge; uniform float uDepth; uniform float uTime; uniform float uWave;', 'varying vec3 vW; varying float vL;', '#include <fog_pars_vertex>',
  'void main(){ vec3 p = position; float d = length(p.xz - uC); float w = clamp((uReach - d) / uEdge, 0.0, 1.0); vL = w; w = w * w * (3.0 - 2.0 * w);',
  '  p.y = w * uDepth + w * uWave * (sin(p.x * 0.31 + uTime * 1.3) + sin(p.z * 0.27 - uTime * 1.1)) * 0.035;',
  '  vW = p; vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;', '#include <fog_vertex>', '}'].join('\n');
const WATER_F = ['uniform float uTime; uniform float uWave; uniform vec3 uDeep; uniform vec3 uShal; uniform vec3 uGlow; uniform vec3 uSkyH; uniform vec3 uSkyT; uniform vec3 uWarm; uniform sampler2D uLanes; uniform vec4 uField; uniform float uA;',
  'varying vec3 vW; varying float vL;', NOISE, '#include <fog_pars_fragment>',
  'void main(){',
  '  if (vL < 0.004 || abs(vW.x) > uField.x || abs(vW.z) > uField.y) discard;',
  '  float front = smoothstep(0.0, 0.1, vL) * (1.0 - smoothstep(0.1, 0.5, vL));',
  '#ifdef LOW',
  '  vec3 c = mix(uShal, uDeep, 0.6) + uGlow * front * 0.8; float a = uA * smoothstep(0.0, 0.2, vL);',
  '#else',
  '  vec2 p = vW.xz; float t = uTime * uWave;',
  '  vec2 g = vec2(0.8, 0.3) * cos(dot(p, vec2(0.8, 0.3)) * 1.3 + t * 1.4) * 0.05 + vec2(-0.4, 0.9) * cos(dot(p, vec2(-0.4, 0.9)) * 1.9 + t * 1.8) * 0.04;',
  '  vec2 q = p * 0.7 + vec2(t * 0.21, t * 0.16); float n0 = noise(q); g += vec2(noise(q + vec2(0.2, 0.0)) - n0, noise(q + vec2(0.0, 0.2)) - n0) * 0.7;',
  '  vec3 n = normalize(vec3(-g.x, 1.0, -g.y)), v = normalize(cameraPosition - vW); float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 4.0);',
  '  vec3 rv = reflect(-v, n); vec3 sky = mix(uSkyH, uSkyT, smoothstep(0.02, 0.45, clamp(rv.y, 0.0, 1.0)));',
  '  float lane = texture2D(uLanes, vec2(vW.x / (2.0 * uField.z) + 0.5, vW.z / (2.0 * uField.w) + 0.5) + g * 0.06).r;',
  '  vec3 c = mix(mix(uShal, uDeep, 0.55 + 0.25 * n0), sky, clamp(fres * 0.8, 0.0, 0.65));',
  '  c += uShal * 0.5 * smoothstep(0.62, 0.9, noise(p * 0.9 + vec2(t * 0.35, -t * 0.25)));',
  '  c += uWarm * lane * (0.55 + 0.25 * sin(t * 2.0 + p.y * 0.4 + n0 * 6.0));',
  '  float foam = front * (0.55 + 0.45 * noise(p * 1.6 + vec2(t, -t * 0.6)));',
  '  c += uGlow * foam * 1.2; float a = uA * smoothstep(0.0, 0.2, vL) * (1.0 - lane * 0.3) + foam * 0.3;',
  '#endif',
  '#ifdef USE_FOG', '  float fogF = smoothstep(fogNear, fogFar, fogDepth); c = mix(c, fogColor, fogF * 0.9);', '#endif',
  '  gl_FragColor = vec4(c, clamp(a, 0.0, 0.92));', '}'].join('\n');
function laneTex() { // the three threads as a soft mask, for their light on the water
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d'), q = { x: 0, z: 0, dx: 0, dz: 0 }, FX = C.HALF_X + 10, FZ = C.HALF_Z + 10;
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); g.lineCap = 'round';
  [[7, 0.35], [3, 0.6], [1.2, 1]].forEach(function (pass) {
    g.strokeStyle = 'rgba(255,255,255,' + pass[1] + ')'; g.lineWidth = pass[0];
    for (let l = 0; l < 3; l++) { const L = LL.lanes[l]; g.beginPath(); for (let s = 0; s <= L.len; s += 3) { LL.lanePoint(l, s, q); const x = ((q.x + Math.sin(s * 0.11 + l * 2) * 1.1) / (2 * FX) + 0.5) * 128, y = (q.z / (2 * FZ) + 0.5) * 256; if (s) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  });
  const t = new T.CanvasTexture(cv); t.flipY = false; return t;
}
function buildWater() {
  const low = !!X.R.low, LK = X.LK, SEGS = low ? 24 : 44, rs = [0];
  for (let r = 2; r < 18; r += low ? 4 : 2) rs.push(r); for (let r = 18; r < 215; r *= low ? 1.28 : 1.13) rs.push(r);
  const p = [], ix = [];
  for (let i = 0; i < rs.length; i++) for (let k = 0; k < SEGS; k++) { const a = k / SEGS * 6.2832; p.push(C.LOCH.x + Math.cos(a) * rs[i], 0, C.LOCH.z + Math.sin(a) * rs[i]); }
  for (let i = 0; i < rs.length - 1; i++) for (let k = 0; k < SEGS; k++) { const a = i * SEGS + k, b = i * SEGS + (k + 1) % SEGS, c = a + SEGS, d = b + SEGS; ix.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.userData.lk = true;
  const wc = new T.Color(LK.ground.water), day = !LK.add;
  const un = T.UniformsUtils.merge([T.UniformsLib.fog, { uC: { value: new T.Vector2(C.LOCH.x, C.LOCH.z) }, uReach: { value: 0 }, uEdge: { value: 14 }, uDepth: { value: 0.75 }, uTime: { value: 0 }, uWave: { value: X.R.reduced ? 0 : 1 },
    uDeep: { value: wc.clone().multiplyScalar(day ? 0.55 : 0.3) }, uShal: { value: wc.clone().multiplyScalar(day ? 0.95 : 0.7) }, uGlow: { value: wc.clone().lerp(new T.Color(0xffffff), 0.6) }, uSkyH: { value: new T.Color(LK.sky[2]) }, uSkyT: { value: new T.Color(LK.sky[1]) },
    uWarm: { value: new T.Color(0xffb070).multiplyScalar(day ? 0.25 : 0.5) }, uLanes: { value: null }, uField: { value: new T.Vector4(C.HALF_X + 6, C.HALF_Z + 6, C.HALF_X + 10, C.HALF_Z + 10) }, uA: { value: low ? 0.74 : 0.76 } }]);
  if (!low) un.uLanes.value = laneTex();
  const m = new T.ShaderMaterial({ uniforms: un, vertexShader: WATER_V, fragmentShader: WATER_F, transparent: true, depthWrite: false, fog: true, side: T.DoubleSide, defines: low ? { LOW: 1 } : {} });
  m.userData.lk = m.userData.bl = m.userData.solid = true;
  water = new T.Mesh(g, m); water.frustumCulled = false; water.renderOrder = 3; water.visible = false; X.world.add(water);
  st.waterTris = ix.length / 3;
  // the threads above the water: a flat ribbon of their own light where riders ride
  const rp = [], rc = [], ri = [], q = { x: 0, z: 0, dx: 0, dz: 0 }, a = new T.Color(0xff8a5c), mid = new T.Color(0xffe2a0), b = new T.Color(0x6fe8c0), c = new T.Color(), HW = 0.2;
  for (let l = 0; l < 3; l++) { const L = LL.lanes[l], base = rp.length / 3; let n = 0;
    for (let s = 0; s <= L.len; s += low ? 8 : 4, n++) { LL.lanePoint(l, s, q); const x = q.x + Math.sin(s * 0.11 + l * 2) * 1.1, t = U.clamp((q.z + 104) / 208, 0, 1); if (t < 0.5) c.copy(a).lerp(mid, t * 2); else c.copy(mid).lerp(b, (t - 0.5) * 2);
      rp.push(x - q.dz * HW, 0.93, q.z + q.dx * HW, x + q.dz * HW, 0.93, q.z - q.dx * HW); rc.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    for (let k = 0; k < n - 1; k++) { const o = base + k * 2; ri.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new T.Float32BufferAttribute(rc, 3)); rg.setIndex(ri); rg.userData.lk = true;
  const rm = new T.ShaderMaterial({ uniforms: { uC: un.uC, uReach: un.uReach, uEdge: un.uEdge, uK: { value: day ? 0.6 : 0.5 } },
    vertexShader: 'uniform vec2 uC; uniform float uReach; uniform float uEdge; attribute vec3 color; varying vec3 vC; varying float vL; void main(){ vC = color; vL = clamp((uReach - length(position.xz - uC)) / uEdge, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uK; varying vec3 vC; varying float vL; void main(){ if (vL < 0.02) discard; gl_FragColor = vec4(vC * uK, vL * 0.85); }',
    transparent: true, depthWrite: false, side: T.DoubleSide, blending: day ? T.NormalBlending : T.AdditiveBlending });
  rm.userData.lk = rm.userData.bl = rm.userData.solid = true;
  ribbon = new T.Mesh(rg, rm); ribbon.frustumCulled = false; ribbon.renderOrder = 4; ribbon.visible = false; X.world.add(ribbon);
}
/* What the water looks like right now: the model's front, plus the loch standing up during the warning. */
function waterState(W) {
  const F = W.flood, N = S.NESS; if (!F) return null;
  if (F.ph === 'swell') { const k = 1 - F.t / N.SWELL; return { reach: C.LOCH.r + 1 + 4 * k, edge: 5, depth: N.DEPTH * (0.25 + 0.75 * k) * k }; }
  return { reach: F.reach, edge: N.EDGE, depth: N.DEPTH };
}
let WS = null;
/* The height of the water's surface at a place, as drawn. */
NS.waterY = function (x, z) {
  if (!WS) return 0.075;
  let w = U.clamp((WS.reach - Math.hypot(x - C.LOCH.x, z - C.LOCH.z)) / WS.edge, 0, 1); w = w * w * (3 - 2 * w);
  return Math.max(0.075, w * WS.depth);
};
/* Troopers float: how far gfx lifts one this frame (0.26 ness hook in the trooper loop). */
NS.bob = function (t, time) {
  if (!WS || t.big) return 0; const w = S.waterAt(t.x, t.z); if (w <= 0) return 0;
  return w * (0.3 + (X.R.reduced ? 0 : Math.sin(time * 2.4 + t.id * 1.9) * 0.09));
};

/* ---------- build ---------- */
NS.build = function (ctx) {
  X = ctx; T = ctx.T; tc = new T.Color(); st.ok = false;
  vx = []; vc = []; vb = []; ve = []; tube.length = 0; rigid.length = 0; st.tris = 0;
  buildTube(); buildHead(); buildFlippers();
  const g = new T.BufferGeometry(); pos = new Float32Array(vx);
  g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('color', new T.Float32BufferAttribute(vc, 3)); g.setAttribute('aB', new T.Float32BufferAttribute(vb, 3)); g.setAttribute('aE', new T.Float32BufferAttribute(ve, 1));
  g.userData.lk = true;
  mesh = new T.Mesh(g, nessMat(ctx.LK)); mesh.frustumCulled = false; mesh.visible = false; mesh.isNess3d = true; ctx.dyn.add(mesh);
  for (let i = 0; i < 7; i++) M[i] = new T.Matrix4();
  // its light: two eyes, the lantern, the glow where it lies
  const gg = new T.BufferGeometry(); gPos = new Float32Array(12); const day = !ctx.LK.add;
  gg.setAttribute('position', new T.BufferAttribute(gPos, 3).setUsage(T.DynamicDrawUsage)); gg.setAttribute('aS', new T.Float32BufferAttribute([2.3, 2.3, 3.6, 13], 1));
  const ec = new T.Color(EYE).multiplyScalar(0.75), lc = new T.Color(LAMP).multiplyScalar(0.8), wc = new T.Color(0x2fe0c0).multiplyScalar(0.1);
  gg.setAttribute('aC', new T.Float32BufferAttribute([ec.r, ec.g, ec.b, ec.r, ec.g, ec.b, lc.r, lc.g, lc.b, wc.r, wc.g, wc.b], 3));
  const gm = new T.ShaderMaterial({ uniforms: { uT: { value: ctx.glowTex }, uPx: { value: 400 }, uK: { value: day ? 0.5 : 1 } }, vertexShader: GLOW_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: day ? T.NormalBlending : T.AdditiveBlending });
  gm.userData.lk = gm.userData.bl = gm.userData.solid = true;
  glow = new T.Points(gg, gm); glow.frustumCulled = false; glow.visible = false; glow.renderOrder = 5; ctx.dyn.add(glow);
  // the mark of the bite: a ring on the ground at the spot, and a disc that fills it as the bite comes
  const mm = function (geo, op) { const m = new T.MeshBasicMaterial({ color: 0x6fffd8, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, fog: false, blending: day ? T.NormalBlending : T.AdditiveBlending }); m.userData.lk = m.userData.bl = m.userData.solid = true; const o = new T.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.visible = false; o.renderOrder = 6; o.userData.rt = true; ctx.dyn.add(o); return o; };
  const BR = S.NESS.BITE_R; mark = mm(new T.RingGeometry(BR - 0.22, BR, 40), 0.9); markIn = mm(new T.CircleGeometry(BR, 40), 0.3);
  buildWater(); WS = null;
  st.coil = 1; st.rise = 0; st.lunge = st.toss = 9; st.init = false;
  st.ok = true; return mesh;
};
NS.info = function () { return { tris: st.tris, verts: pos ? pos.length / 3 : 0, draws: 2, waterTris: st.waterTris || 0, low: !!(X && X.R.low) }; };

/* ---------- events ---------- */
NS.fx = function (e, W) {
  if (!st.ok) return; const red = X.R.reduced, wy = e.x != null ? NS.waterY(e.tx != null ? e.tx : e.x, e.tz != null ? e.tz : e.z) : 0;
  switch (e.k) {
    case 'nessup': case 'nesshome': st.coil = 1; st.init = false; if (e.k === 'nesshome') { X.ring(e.x, 0.08, e.z, 1, 11, 0x9fe8ff, 1); X.emit(e.x, 0.6, e.z, 60, 0x9fe8ff, 9, 1.2, 9); } break;
    case 'nesstell': st.lock = 0; if (!red) X.emit(st.hx, st.hy, st.hz, 10, 0x9ff5e0, 3, 0.5, 1, 2); break;
    case 'nesslock': st.lock = 1; X.ring(e.tx, wy + 0.05, e.tz, S.NESS.BITE_R, S.NESS.BITE_R * 0.4, 0xfff0b0, 0.3); break;
    case 'nesschomp': st.lunge = 0; st.lx0 = e.tx; st.lz0 = e.tz;
      X.ring(e.tx, wy + 0.05, e.tz, 0.6, S.NESS.BITE_R * 1.9, e.hit ? 0xa88a50 : 0x4f9f98, 0.5); X.emit(e.tx, wy + 0.4, e.tz, red || e.p ? 14 : 46, 0x8fcfc4, e.p ? 5 : 8, 0.6, 4);
      if (!red) for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; X.puff(e.tx + Math.cos(a) * 1.2, wy + 0.2, e.tz + Math.sin(a) * 1.2, Math.cos(a) * 3.5, 1.4, Math.sin(a) * 3.5, 0.7, 2.2, 0.6, 0.4); }
      if (!red) X.shake(e.p ? 0.9 : (X.near(e.tx, e.tz) < 45 ? 0.45 : 0)); break;
    case 'nessrelease': st.toss = 0; X.emit(e.x, e.y + 0.8, e.z, red ? 8 : 26, 0xbfeee0, 6, 0.6, 3); break;
    case 'floodwarn': st.call = e.t; X.ring(e.x, 0.1, e.z, 2, 26, 0x7fe0ff, 2.2); if (!red) X.shake(X.near(e.x, e.z) < 90 ? 0.4 : 0.15); break;
    case 'flood': X.ring(e.x, 0.4, e.z, 6, 60, 0xbfeee0, 1.4); X.emit(e.x, 1, e.z, red ? 30 : 120, 0x9fe8ff, 14, 1.6, 10); if (!red) X.shake(0.5); break;
    case 'nessdive': X.ring(e.x, 0.3, e.z, 1, 9, 0x9fe8ff, 0.9); X.emit(e.x, 0.6, e.z, 50, 0x9fe8ff, 8, 1, 7); break;
    case 'nessdown': st.jawOpen = 1; break;
  }
};

/* ---------- every frame ---------- */
const ease = (a, b, k) => a + (b - a) * Math.min(1, k);
function spiral(k, n, out) { // where body ring k lies when the Ness is coiled in the loch
  const s = k * SEG, r = 1.3 + 4.5 * (1 - Math.exp(-s / 2.6)), th = Math.PI + 0.5 + s / 4.6;
  out[0] = n.hx + Math.sin(th) * r; out[1] = n.hz + Math.cos(th) * r;
}
const tmp2 = [0, 0];
NS.frame = function (W, dt, time, cam, camera) {
  if (!st.ok) return;
  const n = W.ness, N = S.NESS, red = X.R.reduced, F = W.flood;
  // the water first: everything else floats on it
  WS = waterState(W);
  if (WS) { const u = water.material.uniforms; u.uReach.value = WS.reach; u.uEdge.value = WS.edge; u.uDepth.value = WS.depth; u.uTime.value = time; water.visible = ribbon.visible = WS.reach > 0; }
  else if (water.visible) water.visible = ribbon.visible = false;
  if (WS && !red) wading(W, dt);
  // risen or sunk
  st.rise = n.alive ? Math.max(st.rise, 0) + (U.clamp(n.rise, 0, 1) - st.rise) * Math.min(1, dt * 5) : st.rise + (0 - st.rise) * Math.min(1, dt * 1.3);
  const vis = st.rise > 0.015; mesh.visible = glow.visible = vis;
  const ch = n.alive ? n.chomp : null, tell = ch && ch.ph === 'tell', hold = ch && ch.ph === 'hold';
  mark.visible = markIn.visible = !!tell;
  if (tell) { const y = NS.waterY(ch.tx, ch.tz) + 0.1, k = 1 - ch.t / N.TELL, hot = ch.locked; mark.position.set(ch.tx, y, ch.tz); markIn.position.set(ch.tx, y - 0.02, ch.tz);
    const pulse = red ? 1 : 1 + Math.sin(time * 22) * 0.04 * (hot ? 1 : 0.4); mark.scale.set(pulse, pulse, 1); markIn.scale.set(0.08 + 0.92 * k, 0.08 + 0.92 * k, 1);
    mark.material.color.setHex(hot ? 0xfff0b0 : 0x6fffd8); markIn.material.color.setHex(hot ? 0xffc860 : 0x6fffd8); markIn.material.opacity = 0.22 + 0.3 * k; }
  if (!vis) return;
  st.lunge += dt; st.toss += dt; if (st.call > 0) st.call -= dt;
  const wy = NS.waterY(n.x, n.z), sp = Math.hypot(n.vx, n.vz), r = st.rise, er = r * r * (3 - 2 * r);
  st.ph += dt * (red ? 0 : 1.1 + sp * 0.5);
  // the base of the neck: where the model has it, surging toward the spot while it bites from the loch
  let bx = n.x, bz = n.z; const yaw = n.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw);
  const open = n.openT > 0, biting = st.lunge < 0.35 || open;
  if (!n.out && (tell || biting || hold)) { const tx = tell ? ch.tx : (hold ? ch.tgt.x : n.biteX), tz = tell ? ch.tz : (hold ? ch.tgt.z : n.biteZ), d = Math.hypot(tx - n.x, tz - n.z) || 1, k = Math.min(d * 0.32, 4.2) * (tell ? 0.35 : (hold ? 0.5 : 1)); bx += (tx - n.x) / d * k; bz += (tz - n.z) / d * k; }
  if (!st.init) { st.bx = bx; st.bz = bz; }
  st.bx = ease(st.bx, bx, dt * (n.out ? 30 : 9)); st.bz = ease(st.bz, bz, dt * (n.out ? 30 : 9));
  // where the head wants to be, and which way it points
  let hx, hy, hz, dx = fx, dy = -0.12, dz = fz, jaw = 0.06, rate = 5;
  const idle = !red ? time : 0, look = red ? 0 : Math.sin(idle * 0.43) * 0.5 + Math.sin(idle * 1.1 + 2) * 0.12;
  if (hold && ch.tgt) { // the head goes where the model holds the hero
    const h = ch.tgt, sh = red ? 0 : Math.sin(time * 26) * 0.07; dy = 0.22; const m = 1.45 * HS;
    hx = h.x - fx * m + fz * sh; hy = h.y + 1.0 - dy * m; hz = h.z - fz * m - fx * sh; jaw = 0.5; rate = 22;
  } else if (st.lunge < 0.22 || open) { // the bite, or lying where it missed
    const tx = st.lx0 != null ? st.lx0 : n.biteX, tz = st.lz0 != null ? st.lz0 : n.biteZ, d = Math.hypot(tx - st.bx, tz - st.bz) || 1; dx = (tx - st.bx) / d; dz = (tz - st.bz) / d; dy = -0.3;
    const m = 1.5 * HS; hx = tx - dx * m; hz = tz - dz * m; hy = NS.waterY(tx, tz) + 0.75; jaw = st.lunge < 0.07 ? 0.9 : (open ? 0.12 + (red ? 0 : Math.sin(time * 5) * 0.04) : 0.02); rate = st.lunge < 0.22 ? 34 : 12;
  } else if (tell) { // reared back, jaws wide, eye on the spot
    const k = 1 - ch.t / N.TELL, back = 1.6 + 1.2 * k, tx = ch.tx - st.bx, tz = ch.tz - st.bz, d = Math.hypot(tx, tz) || 1, sh = red ? 0 : Math.sin(time * 38) * 0.06 * k;
    hx = st.bx - tx / d * back + tz / d * sh; hz = st.bz - tz / d * back - tx / d * sh; hy = wy + (n.out ? 6.4 : 7.6) + 0.8 * k;
    const ax = ch.tx - hx, ay = NS.waterY(ch.tx, ch.tz) + 0.8 - hy, az = ch.tz - hz, al = Math.hypot(ax, ay, az) || 1; dx = ax / al; dy = ay / al; dz = az / al; jaw = 0.25 + 0.75 * k; rate = 11;
  } else if (F && F.ph === 'swell') { // the call before the flood: up, mouth to the sky
    const tr = red ? 0 : Math.sin(time * 31) * 0.05; hx = st.bx + fx * 0.6 + fz * tr; hz = st.bz + fz * 0.6 - fx * tr; hy = wy + 9.4; dy = 0.75; jaw = 0.7 + (red ? 0 : Math.sin(time * 17) * 0.12); rate = 5;
  } else if (n.out) { // swimming: head low and forward, toward what it hunts
    const p = n.prey && n.prey.alive ? n.prey : null; let a = yaw; if (p) a = Math.atan2(p.x - n.x, p.z - n.z); const ax = Math.sin(a), az = Math.cos(a), bobb = red ? 0 : Math.sin(time * 2.3) * 0.25;
    hx = st.bx + fx * 3.6; hz = st.bz + fz * 3.6; hy = wy + 3.9 + bobb; dx = ax; dz = az; dy = -0.18; jaw = p ? 0.22 : 0.06; rate = 7;
  } else { // idle in the loch: breathing, looking about, or watching who hurt it
    const a = n.aggro && n.aggro.alive ? Math.atan2(n.aggro.x - n.x, n.aggro.z - n.z) : yaw + look, ax = Math.sin(a), az = Math.cos(a), br = red ? 0 : Math.sin(time * 1.3) * 0.22;
    hx = st.bx + ax * 4.2; hz = st.bz + az * 4.2; hy = wy + 6.1 + br; dx = ax; dz = az; dy = n.aggro ? -0.3 : -0.14 + (red ? 0 : Math.sin(idle * 0.7) * 0.06); jaw = n.spitT > 1.3 ? 0.55 : (n.aggro ? 0.14 : 0.05);
    if (st.toss < 0.4) { hy += 1.4 * Math.sin(st.toss / 0.4 * Math.PI); dy = 0.5; jaw = 0.6; rate = 12; }
  }
  hy = wy - 9 + (hy - wy + 9) * er;
  if (!st.init) { st.hx = hx; st.hy = hy; st.hz = hz; st.dx = dx; st.dy = dy; st.dz = dz; st.lx = hx; st.ly = hy; st.lz = hz; }
  const kk = dt * rate; st.hx = ease(st.hx, hx, kk); st.hy = ease(st.hy, hy, kk); st.hz = ease(st.hz, hz, kk);
  st.dx = ease(st.dx, dx, kk * 1.2); st.dy = ease(st.dy, dy, kk * 1.2); st.dz = ease(st.dz, dz, kk * 1.2); st.jaw = ease(st.jaw, jaw, dt * (jaw < st.jaw ? 40 : 14));
  const dl = Math.hypot(st.dx, st.dy, st.dz) || 1, hdx = st.dx / dl, hdy = st.dy / dl, hdz = st.dz / dl;
  // the body: a chain that trails the base, or the coil in the loch
  st.coil = ease(st.coil, n.out ? 0 : 1, dt * (n.out ? 2.5 : 1.1)); if (st.coil > 0.995) st.coil = 1;
  if (!st.init || st.coil === 1) for (let k = 0; k < NB; k++) { spiral(k, n, tmp2); chain[k * 2] = tmp2[0] + (st.bx - n.hx) * Math.exp(-k / 4); chain[k * 2 + 1] = tmp2[1] + (st.bz - n.hz) * Math.exp(-k / 4); }
  else { chain[0] = st.bx; chain[1] = st.bz; for (let k = 1; k < NB; k++) { const ax = chain[k * 2] - chain[k * 2 - 2], az = chain[k * 2 + 1] - chain[k * 2 - 1], d = Math.hypot(ax, az) || 1; chain[k * 2] = chain[k * 2 - 2] + ax / d * SEG; chain[k * 2 + 1] = chain[k * 2 - 1] + az / d * SEG; } }
  st.init = true;
  const amp = n.out ? 0.55 : 1.3, sink = n.out ? 0.2 : 1.0;
  for (let k = 0; k < NB; k++) {
    const i = NK + k, s = k * SEG; let x = chain[k * 2], z = chain[k * 2 + 1];
    if (st.coil > 0 && st.coil < 1) { spiral(k, n, tmp2); x += (tmp2[0] - x) * st.coil; z += (tmp2[1] - z) * st.coil; }
    const wyk = n.out ? NS.waterY(x, z) : wy, near = Math.min(1, k / 3);
    P[i * 3] = x; P[i * 3 + 2] = z; P[i * 3 + 1] = wyk - sink * near - 0.25 * (1 - near) + amp * near * Math.sin(s * 0.95 - st.ph) - (1 - er) * 4;
  }
  // the neck: a curve from the back of the head down to the first ring of the body
  const b0x = P[NK * 3], b0y = P[NK * 3 + 1], b0z = P[NK * 3 + 2], span = Math.hypot(st.hx - b0x, st.hy - b0y, st.hz - b0z), L0 = Math.max(1.2, span * 0.42), L1 = Math.max(1.5, span * 0.5);
  const c1x = st.hx - hdx * L0, c1y = st.hy - hdy * L0, c1z = st.hz - hdz * L0, flat = U.clamp((st.hy - b0y) / 6, 0.15, 1), fwx = (st.hx - b0x) / (span || 1), fwz = (st.hz - b0z) / (span || 1);
  const lean = 0.6 * (1 - flat) - 0.45 * flat, c2x = b0x + fwx * L1 * lean, c2y = b0y + L1 * (0.25 + 0.75 * flat), c2z = b0z + fwz * L1 * lean;
  for (let i = 0; i < NK; i++) { const t = i / NK, a = (1 - t) * (1 - t) * (1 - t), b = 3 * (1 - t) * (1 - t) * t, c = 3 * (1 - t) * t * t, d = t * t * t;
    P[i * 3] = a * st.hx + b * c1x + c * c2x + d * b0x; P[i * 3 + 1] = a * st.hy + b * c1y + c * c2y + d * b0y; P[i * 3 + 2] = a * st.hz + b * c1z + c * c2z + d * b0z; }
  // a frame at every ring: side and up
  const hl = Math.hypot(hdx, hdz) || 1, nrx = hdz / hl, nrz = -hdx / hl;
  for (let i = 0; i < NR; i++) {
    const a = Math.max(0, i - 1), b = Math.min(NR - 1, i + 1); let tx = P[b * 3] - P[a * 3], ty = P[b * 3 + 1] - P[a * 3 + 1], tz = P[b * 3 + 2] - P[a * 3 + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    if (i === 0) { tx = -hdx; ty = -hdy; tz = -hdz; }
    const th = Math.hypot(tx, tz), wB = U.clamp((i - (NK - 3)) / 5, 0, 1) * (th > 0.2 ? 1 : 0); let sx = nrx * (1 - wB) + (th > 1e-4 ? -tz / th : nrx) * wB, sz = nrz * (1 - wB) + (th > 1e-4 ? tx / th : nrz) * wB, sy = 0;
    const dt_ = sx * tx + sz * tz; sx -= tx * dt_; sy -= ty * dt_; sz -= tz * dt_; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
    SD[i * 3] = sx; SD[i * 3 + 1] = sy; SD[i * 3 + 2] = sz; UP[i * 3] = sy * tz - sz * ty; UP[i * 3 + 1] = sz * tx - sx * tz; UP[i * 3 + 2] = sx * ty - sy * tx;
  }
  for (let q = 0; q < tube.length; q++) { const v = tube[q], i = v.ring, R_ = RAD[i] * v.rho, o = v.i * 3, a = v.c * R_, b = v.s * R_ + v.lift;
    pos[o] = P[i * 3] + SD[i * 3] * a + UP[i * 3] * b; pos[o + 1] = P[i * 3 + 1] + SD[i * 3 + 1] * a + UP[i * 3 + 1] * b; pos[o + 2] = P[i * 3 + 2] + SD[i * 3 + 2] * a + UP[i * 3 + 2] * b; }
  // the rigid pieces: head, jaw, lantern, flippers
  const rx = SD[0], ry = SD[1], rz = SD[2], ux = UP[0], uy = UP[1], uz = UP[2];
  M[0].set(rx, ux, hdx, st.hx, ry, uy, hdy, st.hy, rz, uz, hdz, st.hz, 0, 0, 0, 1);
  const ja = st.jaw * 0.85, cj = Math.cos(ja), sj = Math.sin(ja), jz = 0.12 * HS; // the jaw: the head's frame turned about its side axis, at the hinge
  M[1].set(rx, ux * cj + hdx * sj, hdx * cj - ux * sj, st.hx + hdx * jz, ry, uy * cj + hdy * sj, hdy * cj - uy * sj, st.hy + hdy * jz, rz, uz * cj + hdz * sj, hdz * cj - uz * sj, st.hz + hdz * jz, 0, 0, 0, 1);
  const tp = NS._tip, ax_ = st.hx + ux * tp[1] + hdx * tp[2], ay_ = st.hy + uy * tp[1] + hdy * tp[2], az_ = st.hz + uz * tp[1] + hdz * tp[2];
  if (red) { st.lx = ax_; st.ly = ay_; st.lz = az_; }
  else { const kS = 60, kD = 7; st.lvx += ((ax_ - st.lx) * kS - st.lvx * kD) * dt; st.lvy += ((ay_ - st.ly) * kS - st.lvy * kD) * dt; st.lvz += ((az_ - st.lz) * kS - st.lvz * kD) * dt; st.lx += st.lvx * dt; st.ly += st.lvy * dt; st.lz += st.lvz * dt;
    const ox = st.lx - ax_, oy = st.ly - ay_, oz = st.lz - az_, ol = Math.hypot(ox, oy, oz); if (ol > 0.9) { st.lx = ax_ + ox / ol * 0.9; st.ly = ay_ + oy / ol * 0.9; st.lz = az_ + oz / ol * 0.9; } }
  M[2].set(1, 0, 0, st.lx, 0, 1, 0, st.ly, 0, 0, 1, st.lz, 0, 0, 0, 1);
  for (let f = 0; f < 4; f++) { const i = NK + (f < 2 ? 3 : 10), sg = f % 2 ? -1 : 1, R_ = RAD[i] * 0.9, pad = red ? 0 : Math.sin(st.ph * 1.6 + f * 1.7) * 0.5, cpd = Math.cos(-0.35 + pad), spd = Math.sin(-0.35 + pad);
    const sx = SD[i * 3] * sg, sy = SD[i * 3 + 1] * sg, sz = SD[i * 3 + 2] * sg, wx = UP[i * 3], wy_ = UP[i * 3 + 1], wz = UP[i * 3 + 2], a = Math.max(0, i - 1), b = i + 1; let tx = P[a * 3] - P[b * 3], ty = P[a * 3 + 1] - P[b * 3 + 1], tz = P[a * 3 + 2] - P[b * 3 + 2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // x: out from the body, dipped and paddling; y: its normal; z: along the body toward the head
    const xx = sx * cpd + wx * spd, xy = sy * cpd + wy_ * spd, xz = sz * cpd + wz * spd, yx = -sx * spd + wx * cpd, yy = -sy * spd + wy_ * cpd, yz = -sz * spd + wz * cpd;
    M[3 + f].set(xx, yx, tx, P[i * 3] + sx * R_ - wx * 0.35, xy, yy, ty, P[i * 3 + 1] + sy * R_ - wy_ * 0.35, xz, yz, tz, P[i * 3 + 2] + sz * R_ - wz * 0.35, 0, 0, 0, 1); }
  for (let q = 0; q < rigid.length; q++) { const v = rigid[q], e = M[v.part].elements, o = v.i * 3; pos[o] = e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12]; pos[o + 1] = e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13]; pos[o + 2] = e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]; }
  mesh.geometry.attributes.position.needsUpdate = true;
  const Un = mesh.material.userData.U; Un.uWaterY.value = wy; st.flash = n.flash > 0 ? 0.22 : ease(st.flash, 0, dt * 12); Un.uFlash.value = st.flash; Un.uEmK.value = 1.5 + (tell ? 1.2 * (1 - ch.t / N.TELL) : 0) + (open ? -0.9 : 0);
  // its light
  const e0 = M[0].elements, ex = 0.7 * HS, ey = 0.47 * HS, ez = 0.95 * HS;
  for (let k = 0; k < 2; k++) { const sg = k ? -1 : 1; gPos[k * 3] = e0[0] * ex * sg + e0[4] * ey + e0[8] * ez + e0[12]; gPos[k * 3 + 1] = e0[1] * ex * sg + e0[5] * ey + e0[9] * ez + e0[13]; gPos[k * 3 + 2] = e0[2] * ex * sg + e0[6] * ey + e0[10] * ez + e0[14]; }
  gPos[6] = st.lx; gPos[7] = st.ly - 0.4; gPos[8] = st.lz; gPos[9] = st.bx; gPos[10] = wy + 0.5; gPos[11] = st.bz;
  glow.geometry.attributes.position.needsUpdate = true;
  if (camera && X.renderer) glow.material.uniforms.uPx.value = X.renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  // rings where the neck leaves the water, a wake when it swims
  if (!red && er > 0.9) { st.wake -= dt * (1 + sp * 0.35); if (st.wake <= 0) { st.wake = 0.8; X.ring(P[NK * 3], wy + 0.03, P[NK * 3 + 2], 1.1, 3.4 + sp * 0.2, 0x9fe8ff, 1.1); if (sp > 3) X.emit(st.bx + fx * 1.5, wy + 0.3, st.bz + fz * 1.5, 10, 0xbfeee0, 4, 0.5, 2.5); } }
};
/* Heroes wading: a ring on the water as they push through it, drops when they land in it. */
let wadeT = 0;
function wading(W, dt) {
  wadeT -= dt; if (wadeT > 0) return; wadeT = 0.28;
  for (let i = 0; i < W.heroes.length; i++) { const h = W.heroes[i]; if (!h.alive || h.zip || h.held) continue; const w = S.waterAt(h.x, h.z); if (w < 0.3 || h.y > 0.6) continue;
    const sp = Math.hypot(h.vx, h.vz); if (sp > 1) { X.ring(h.x, NS.waterY(h.x, h.z) + 0.03, h.z, 0.4, 1.3 + sp * 0.12, 0xbfeee0, 0.6); if (sp > 6) X.emit(h.x, NS.waterY(h.x, h.z) + 0.2, h.z, 5, 0xbfeee0, 3, 0.4, 2); } }
}
NS._st = st; NS._P = P;
})();
