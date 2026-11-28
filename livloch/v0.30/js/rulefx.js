/* LIVLOCH · rulefx: the four 0.28 rules, seen from the play camera (0.29 feel).

   DESIGN
   - Presentation only. It reads the unit, the structure and W that gfx.js hands it and writes nothing to the model.
     It joins gfx.js at lines marked `0.29 feel`: RF.thread (each thread's mesh, in buildThreads), RF.build (once per
     look, in construct), RF.fx (every event, in R.fx), RF.troop (a caught or pinned trooper's pose, in the trooper loop),
     RF.frame (after the rings, before particles step) and RF.dip (the camera's landing dip).
   - Cheap on draw calls. Nothing is drawn while no rule is in play. At most six draws are added, each one instanced
     or one Points object: the carried lanterns, their staffs, all the glows (lanterns and bright houses), the bright
     houses' rings, the pinning paper (bands and threads in one mesh) and the veil under a thread (below). The thread itself does the rest in its own
     shader (the slack thread's tremble, sag, drained colour and ride cue; the arrival's run along the thread; the snap
     when it pulls tight), so those cost nothing. Particles, rings and puffs are gfx.js's own pools.
   - Every look: colours go through the look's tc(), so a cue keeps its meaning (warm = Reign and protected light, gold
     = creases and threads, cold = Hush). Glows blend additively where the look does, normally in Origami.
   - Reduced motion: the thread does not tremble or ripple (its colour still drains and the ride cue stands still),
     the lantern does not swing, no camera kick or dip, fewer particles. Lighter graphics: fewer particles, no rising
     motes, no aura rings; the lanterns, the pinning paper and the thread cues stay, because they say what is happening.

   THE RULES, AS DRAWN
   - Arrival (`arrive`): a ring as wide as the strike and a bright inner ring, dust thrown out in a ring, sparks off the
     thread, and a band of light that runs `reach` metres on along the thread from the landing. The local hero's
     camera is kicked back and dips with a spring.
   - The fold catches (`caught`, death with `creased`, `pinned`): a caught small one crumples where it stands, flattens,
     twists and is drawn sideways into the crease, shedding paper; it goes with a fold of paper and a gold glint on the
     crease. A pinned hollow is bound by two folded paper bands and three gold threads staked to the ground on the crease's side; it
     strains against them (shakes, crouches) and the threads shiver. While a crease holds, its dashed line burns.
   - A light from home (`ember`, `mended`, `brightend`): a hero carrying a light has a paper lantern hanging from a staff
     over the left shoulder, lit, swinging with the hero's movement, readable from behind. The house it mends flares
     (rings, a burst, a line of light from hero to house); while it burns bright (s.brightT) it glows larger, flickers,
     lies in a warm ring, sheds rising motes, and each of its shots throws a spark at the roof.
   - The slack thread (`slackwarn`, `slack`, `slackend`, W.slack): in the warning the thread trembles harder and its
     colour drains as the moment comes, and the path under it darkens; while slack it sags into slow loose waves, stays
     drained, its houses go dim, and gold chevrons run along its path toward the far side, which is where it will carry
     a rider; when it ends it snaps tight with a bright ringing run of light along thread and path. */
(function () {
'use strict';
const LL = window.LL, C = LL.C, S = LL.sim;
const RF = LL.rulefx = { on: true };
let X = null, T = null, LK = null, W = null;
let pend = [], th = [];
let lampM = null, staffM = null, glowP = null, gA = null, auraM = null, bindM = null, veil = null;
let colM = null, ptr = null, colTex = null; const COL_N = 24, cols = []; /* 0.30 feel: the fold's columns and pointer */
const LAMP_N = 12, GLOW_N = 48, AURA_N = 16, BIND_N = 72;
let dip = 0, dipV = 0, time = 0, GK = 1, GC = null;
const sw = [];
const Q = { s: 0, d: 0 }, P = { x: 0, z: 0, dx: 0, dz: 0 };
const out = { x: 0, y: 0, z: 0, sx: 1, sy: 1, rz: 0, rx: 0 };

/* the thread's own material: its vertex colours, displaced and recoloured by the rule state */
const TVS = [
  'attribute float aS; uniform float uT, uM, uSlack, uWarn, uSnap; varying vec3 vC; varying float vS;',
  'void main() { vC = color; vS = aS; vec3 p = position;',
  '  float tr = uWarn * (sin(aS * 2.3 + uM * 47.0) * 0.6 + sin(aS * 5.1 - uM * 61.0) * 0.4) * 0.09;',
  '  float wv = sin(aS * 0.8 - uM * 1.7), w2 = sin(aS * 0.29 + uM * 0.6);',
  '  p.x += tr + uSlack * (wv * 0.42 + w2 * 0.3) + uSnap * sin(aS * 1.6 - uM * 34.0) * 0.14;',
  '  p.y += uSlack * (0.07 + 0.11 * (0.5 + 0.5 * sin(aS * 0.8 - uM * 1.7 + 1.4))) + uWarn * 0.03 * sin(aS * 3.0 + uM * 40.0);',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }'].join('\n');
const TFS = [
  'uniform float uT, uM, uSlack, uWarn, uDrain, uSnap, uRide, uDir, uArrS, uArrF, uArrA, uArrD, uLight; uniform vec3 uGold, uDim; varying vec3 vC; varying float vS;',
  'void main() { vec3 c = vC; float l = dot(c, vec3(0.299, 0.587, 0.114));',
  '  c = mix(c, uDim * (0.35 + l), uDrain); c *= 1.0 - uWarn * 0.22 * (0.5 + 0.5 * sin(uM * 21.0 + vS * 0.37));',
  '  float ph = fract(vS * uDir / 8.0 - uM * 1.6); float dash = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.16, 0.3, ph));',
  '  c = mix(c, uGold, dash * uRide * 0.85);',
  '  float d = (vS - uArrS) * uArrD; float band = exp(-pow((d - uArrF) / 1.8, 2.0)) * step(-2.0, d);',
  '  c += uGold * (band * 1.5 + step(0.0, d) * step(d, uArrF) * 0.35) * uArrA * uLight;',
  '  c = mix(c, uGold, uSnap * (0.45 + 0.35 * sin(vS * 0.45 - uT * 22.0)));',
  '  gl_FragColor = vec4(c, 1.0); }'].join('\n');

/* the veil: a band of ground under each thread, as wide as the worn path, that carries what the thin thread cannot from
   the play camera: a slack thread's path goes dark (premultiplied, so it darkens every look's own ground), gold
   chevrons run along it toward the far side while it can be ridden, the snap runs along it when it pulls tight, and an
   arrival's band of light runs along it ahead of the landing. One mesh for the three threads; drawn only while one of
   them has something to say. */
const VVS = 'attribute vec3 aV; varying vec3 vV; void main() { vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const VFS = [
  'uniform float uT, uM, uDir; uniform vec3 uDrain, uRide, uSnap, uWarn, uArrS, uArrF, uArrA, uArrD; uniform vec3 uGold; uniform float uK; varying vec3 vV;',
  'float pick(vec3 v, float l) { return l < 0.5 ? v.x : (l < 1.5 ? v.y : v.z); }',
  'void main() { float o = abs(vV.x), s = vV.y, l = vV.z; float f = 1.0 - smoothstep(2.2, 4.2, o);',
  '  float dr = pick(uDrain, l), ri = pick(uRide, l), sn = pick(uSnap, l), wa = pick(uWarn, l);',
  '  float shade = dr * 0.68 * f * (1.0 - wa * 0.25 * (0.5 + 0.5 * sin(uM * 21.0 + s * 0.37)));',
  '  float u = s * uDir - o * 0.9; float ph = fract(u / 7.0 - uM * 1.5); float chev = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.12, 0.2, ph)) * (1.0 - smoothstep(1.4, 2.0, o));',
  '  vec3 g = uGold * (chev * ri * 0.9);',
  '  g += uGold * sn * (0.25 + 0.25 * sin(s * 0.45 - uT * 22.0)) * (1.0 - smoothstep(1.0, 3.0, o));',
  '  float d = (s - pick(uArrS, l)) * pick(uArrD, l), fr = pick(uArrF, l); float band = exp(-pow((d - fr) / 2.2, 2.0)) * step(-2.0, d);',
  '  g += uGold * (band * 0.9 + step(0.0, d) * step(d, fr) * 0.22) * pick(uArrA, l) * (1.0 - smoothstep(0.8, 3.6, o));',
  '  g *= uK; float a = clamp(shade, 0.0, 1.0); if (a < 0.002 && g.r + g.g + g.b < 0.004) discard;',
  '  gl_FragColor = vec4(g, a); }'].join('\n');
function veilMesh() {
  const pos = [], av = [], idx = [], offs = [-4.2, -2.4, -1, 0, 1, 2.4, 4.2], nc = offs.length, P0 = {}, P1 = {};
  const ctr = function (l, s, o) { LL.lanePoint(l, s, o); o.x += Math.sin(s * 0.11 + l * 2) * 1.1; return o; };
  for (let l = 0; l < 3; l++) { const L = LL.lanes[l], step = 1.5, n = Math.floor(L.len / step);
    for (let i = 0; i <= n; i++) { const s = Math.min(L.len, i * step), cx = ctr(l, s, P0).x, cz = P0.z; ctr(l, s - 4, P0); ctr(l, s + 4, P1); let tx = P1.x - P0.x, tz = P1.z - P0.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      for (let j = 0; j < nc; j++) { const o = offs[j]; pos.push(cx - tz * o, 0.05, cz + tx * o); av.push(o, s, l); }
      if (i > 0) { const b = pos.length / 3 - nc * 2; for (let j = 0; j < nc - 1; j++) { const a0 = b + j, a1 = a0 + 1, c0 = a0 + nc, c1 = c0 + 1; idx.push(a0, a1, c0, a1, c1, c0); } } } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aV', new T.Float32BufferAttribute(av, 3)); g.setIndex(idx);
  const v3 = function () { return { value: new T.Vector3() }; };
  const m = new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uM: { value: 0 }, uDir: { value: 1 }, uK: { value: LK.add === false ? 0.75 : 1 }, uGold: { value: X.tc(0xffd060).clone() }, uDrain: v3(), uRide: v3(), uSnap: v3(), uWarn: v3(), uArrS: v3(), uArrF: v3(), uArrA: v3(), uArrD: { value: new T.Vector3(1, 1, 1) } },
    vertexShader: VVS, fragmentShader: VFS, transparent: true, depthWrite: false, fog: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  m.userData.lk = m.userData.bl = true;
  const o = new T.Mesh(g, m); o.renderOrder = 2; o.frustumCulled = false; o.visible = false; o.userData.rt = true; X.dyn.add(o); return o;
}
RF.thread = function (l, mesh) { pend[l] = mesh; };

/* [geometry, hex colour] pairs into one non-indexed geometry with vertex colours */
function merge(parts) {
  const pos = [], col = [], c = new T.Color();
  parts.forEach(function (p) { const g = p[0].index ? p[0].toNonIndexed() : p[0], a = g.attributes.position; c.setHex(p[1]);
    for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); col.push(c.r, c.g, c.b); } });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
function inst(geo, mat, cap) { const m = new T.InstancedMesh(geo, mat, cap); m.count = 0; m.frustumCulled = false; m.visible = false; m.userData.rt = true; X.dyn.add(m); return m; }

RF.build = function (ctx) {
  X = ctx; T = ctx.T; LK = ctx.LK; th = [];
  /* a look with strong bloom (Hypermetapunk): fewer sparks and a gentler boost (GK). (0.29 also drew its glows an
     unmapped orange, because its post clipped stacked warm light to a sour green; 0.30 fixed the post instead.) */
  GC = new T.Color();
  GK = (LK.bloom || 0) >= 0.6 ? 0.6 : 1; /* 0.30 feel: 0.3 before its post was fixed (gfx.js, hand 4: bloom now in all three channels, warm kept gold) */
  if (GK < 1) { const em = ctx.emit; X.emit = function (x, y, z, n, col, sp, life, up, grav) { em(x, y, z, Math.max(1, Math.round(n * GK)), col, sp, life, up, grav); }; }
  const gold = ctx.tc(0xffd060), dim = new T.Color(LK.add === false ? 0x9c94a8 : 0x6c6888);
  for (let l = 0; l < pend.length; l++) {
    const m = pend[l]; if (!m) continue; const L = LL.lanes[l], g = m.geometry, n = g.attributes.position.count;
    const ring = (g.parameters && g.parameters.radialSegments || 5) + 1, segs = g.parameters && g.parameters.tubularSegments || Math.floor(L.len / 1.5), aS = new Float32Array(n);
    for (let i = 0; i < n; i++) aS[i] = Math.floor(i / ring) / segs * L.len;
    g.setAttribute('aS', new T.BufferAttribute(aS, 1));
    const u = { uT: { value: 0 }, uM: { value: 0 }, uSlack: { value: 0 }, uWarn: { value: 0 }, uDrain: { value: 0 }, uSnap: { value: 0 }, uRide: { value: 0 }, uDir: { value: 1 },
      uArrS: { value: 0 }, uArrF: { value: 0 }, uArrA: { value: 0 }, uArrD: { value: 1 }, uLight: { value: LK.add === false ? 0.6 : 1 }, uGold: { value: gold.clone() }, uDim: { value: dim } };
    const mt = new T.ShaderMaterial({ uniforms: u, vertexShader: TVS, fragmentShader: TFS, vertexColors: true, fog: false });
    mt.userData.lk = mt.userData.bl = true; m.material = mt; m.frustumCulled = false;
    th[l] = { m: m, u: u, arrW: -99, arrT: -1, arrR: 24, snapW: -99, snap: 0, slack: 0, warn: 0, drain: 0 };
  }
  pend = [];
  /* a paper lantern: a lit body of eight panes between dark caps, and a ring to hang it by */
  const lampG = merge([[new T.CylinderGeometry(0.12, 0.12, 0.22, 8), 0xffe08c], [new T.CylinderGeometry(0.075, 0.13, 0.05, 8).translate(0, 0.135, 0), 0x3a2418], [new T.CylinderGeometry(0.13, 0.09, 0.04, 8).translate(0, -0.13, 0), 0x3a2418],
    [new T.TorusGeometry(0.035, 0.008, 4, 10).translate(0, 0.19, 0), 0x3a2418], [new T.CylinderGeometry(0.004, 0.004, 0.16, 3).translate(0, 0.28, 0), 0x2a1a12]]);
  lampM = inst(lampG, new T.MeshBasicMaterial({ vertexColors: true }), LAMP_N);
  /* the staff: up the back from the waist, bent over the left shoulder; local frame x right, y up, z forward */
  const staffG = merge([[new T.CylinderGeometry(0.018, 0.022, 1.55, 5).translate(0, 0.775, 0), 0x4a3424], [new T.CylinderGeometry(0.014, 0.014, 0.3, 4).rotateZ(Math.PI / 2).translate(-0.15, 1.55, 0), 0x4a3424]]);
  staffM = inst(staffG, new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x1a1008 }), LAMP_N); staffM.material.userData.solid = true;
  /* glows: one Points object, a size and colour per point, sized in metres */
  const gg = new T.BufferGeometry(); gA = { p: new Float32Array(GLOW_N * 3), c: new Float32Array(GLOW_N * 3), s: new Float32Array(GLOW_N) };
  gg.setAttribute('position', new T.BufferAttribute(gA.p, 3)); gg.setAttribute('aC', new T.BufferAttribute(gA.c, 3)); gg.setAttribute('aSz', new T.BufferAttribute(gA.s, 1));
  const add = LK.add !== false;
  glowP = new T.Points(gg, new T.ShaderMaterial({ uniforms: { uH: { value: 600 } }, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, fog: false,
    vertexShader: 'attribute vec3 aC; attribute float aSz; uniform float uH; varying vec3 vC; void main() { vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSz * projectionMatrix[1][1] * uH * 0.5 / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: add ? 'varying vec3 vC; void main() { vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; float a = exp(-r * 4.0) * (1.0 - r); if (a < 0.003) discard; gl_FragColor = vec4(vC * a, 1.0); }'
      : 'varying vec3 vC; void main() { vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0; float a = exp(-r * 5.0) * (1.0 - r) * 0.55; if (a < 0.003) discard; gl_FragColor = vec4(vC, a); }' }));
  glowP.material.userData.lk = glowP.material.userData.bl = true; glowP.frustumCulled = false; glowP.visible = false; glowP.userData.rt = true; glowP.renderOrder = 4; X.dyn.add(glowP);
  /* a bright house's ring of light on the ground */
  const ag = new T.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  auraM = inst(ag, new T.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.55, blending: add ? T.AdditiveBlending : T.NormalBlending, depthWrite: false, side: T.DoubleSide }), AURA_N);
  auraM.material.userData.bl = true; auraM.renderOrder = 2;
  /* the pinning paper: a folded band (zigzag strip round a ring) and a thread, one geometry each instance picks by scale:
     both are in one mesh as instances of a unit band; the thread is the band squeezed to a line (see bind()) */
  const bandG = (function () { const pos = [], col = [], N = 18, cc = new T.Color(0xf1e6cc), ce = new T.Color(0xe0a84a);
    for (let i = 0; i < N; i++) { const a0 = i / N * 6.283, a1 = (i + 1) / N * 6.283, r0 = i % 2 ? 1 : 0.9, r1 = (i + 1) % 2 ? 1 : 0.9;
      const p = [[Math.cos(a0) * r0, -0.5, Math.sin(a0) * r0], [Math.cos(a1) * r1, -0.5, Math.sin(a1) * r1], [Math.cos(a1) * r1, 0.5, Math.sin(a1) * r1], [Math.cos(a0) * r0, 0.5, Math.sin(a0) * r0]];
      [0, 1, 2, 0, 2, 3].forEach(function (k) { pos.push(p[k][0], p[k][1], p[k][2]); const e = Math.abs(p[k][1]) > 0.4 ? ce : cc, sh = i % 2 ? 1 : 0.82; col.push(e.r * sh, e.g * sh, e.b * sh); }); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return g; })();
  veil = veilMesh();
  bindM = inst(bandG, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }), BIND_N);
  /* 0.30 feel: a column of folded paper light over each thing the fold has caught or pinned, tall enough to read over
     the hero's shoulder from across the valley: an open tube 9 m tall, its texture gold chevrons (paper folded zigzag)
     rising, bright at the foot and gone at the top; a colour per instance carries its strength */
  if (!colTex) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const g2 = cv.getContext('2d');
    for (let y = 0; y < 256; y++) { const f = 1 - y / 256, a = Math.pow(f, 1.6); for (let x = 0; x < 64; x++) { const ph = ((y + Math.abs(x - 32) * 0.9) % 32) / 32, band = ph < 0.42 ? 0.55 + 0.45 * Math.sin(ph / 0.42 * Math.PI) : 0.18, edge = 1 - Math.pow(Math.abs(x - 32) / 32, 3);
      const v = Math.round(255 * Math.min(1, band * edge)); g2.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (a * Math.min(1, band * edge + 0.15)).toFixed(3) + ')'; g2.fillRect(x, 255 - y, 1, 1); } }
    colTex = new T.CanvasTexture(cv); colTex.wrapS = T.RepeatWrapping; colTex.wrapT = T.ClampToEdgeWrapping; }
  const ct = colTex.clone(); ct.needsUpdate = true; ct.wrapS = T.RepeatWrapping; ct.repeat.set(3, 1);
  const cg = new T.CylinderGeometry(1.35, 0.8, 9.5, 16, 1, true).translate(0, 4.75, 0);
  colM = inst(cg, new T.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false, blending: add ? T.AdditiveBlending : T.NormalBlending, opacity: add ? 1 : 0.85 }), COL_N);
  colM.material.userData.bl = colM.material.userData.lk = true; colM.renderOrder = 3;
  colM.instanceColor = new T.InstancedBufferAttribute(new Float32Array(COL_N * 3), 3); colM.instanceColor.setUsage(T.DynamicDrawUsage); /* sized here: setColorAt would size it to count, which inst() set to 0 */
  cols.length = 0;
  if (!ptr) { ptr = document.createElement('div'); ptr.id = 'foldPtr'; ptr.innerHTML = '<i></i><span>caught</span>'; (document.getElementById('hud') || document.body).appendChild(ptr); }
};

/* the arrival's run along its thread, and what each event looks like */
RF.fx = function (e, w) {
  if (!X) return; W = w; const red = X.R.reduced, low = X.R.low, mine = W && e.u && e.u === W.player;
  switch (e.k) {
    case 'arrive': {
      const t = th[e.lane]; if (t) { LL.laneNearest(e.lane, e.x, e.z, Q); t.u.uArrS.value = Q.s; t.u.uArrD.value = e.u && e.u.team === 1 ? -1 : 1; t.arrW = W ? W.t : 0; t.arrR = e.reach || 24; }
      X.ring(e.x, 0.02, e.z, 0.6, e.r || 8, 0xffd060, 0.5); X.ring(e.x, 0.04, e.z, 0.3, (e.r || 8) * 0.5, 0xfff4dc, 0.32);
      const n = red ? 6 : (low ? 9 : 16);
      for (let k = 0; k < n; k++) { const q = k / n * 6.283 + Math.random() * 0.2, v = 2.6 + Math.random() * 1.6; X.puff(e.x + Math.cos(q) * 0.5, 0.12, e.z + Math.sin(q) * 0.5, Math.cos(q) * v, 0.25 + Math.random() * 0.3, Math.sin(q) * v, 0.3, 1.15, 0.65, 0.4); }
      X.emit(e.x, 0.4, e.z, red ? 10 : 26, 0xffe2a0, 7, 0.55, 3.5);
      if (!red && t) { LL.laneNearest(e.lane, e.x, e.z, Q); const d = t.u.uArrD.value; for (let s = 3; s <= t.arrR; s += low ? 6 : 3) { LL.lanePoint(e.lane, Q.s + s * d, P); X.emit(P.x, 0.3, P.z, 1, 0xffd060, 2.2, 0.35 + s / t.arrR * 0.4, 2.5, 4); } }
      if (e.n && X.bits) X.bits(e.x, 0.6, e.z, Math.min(14, 4 + e.n * 2), X.TISSUE, 3.2, X.BIT_TISSUE);
      if (mine && !red) { X.kick(1.1); dipV -= 3.4; X.shake(0.22); }
      break;
    }
    case 'caught': {
      const cx = creaseX(e.i); column(cx, e.z, 1.8, 1.7);
      X.ring(cx, 0.04, e.z, 0.2, 1.8, 0xffd060, 0.35); X.emit(cx, 0.5, e.z, red ? 4 : 9, 0xffe2a0, 2.4, 0.5, 2, 2);
      if (X.bits) X.bits(e.x, 1, e.z, red ? 2 : 5, X.PAPER, 1.2, X.BIT_PAPER);
      break;
    }
    case 'death':
      if (e.creased && e.kind === 'trooper') {
        const big = e.u && e.u.big;
        if (!big) { const cx = nearCrease(e.x); column(cx, e.z, 1.6, 2.1); X.ring(cx, 0.04, e.z, 0.3, 2.4, 0xffd060, 0.4); X.emit(cx, 0.35, e.z, red ? 5 : 12, 0xffd060, 3, 0.5, 2.6, 4); if (X.bits) X.bits(e.x, 0.6, e.z, red ? 3 : 9, X.PAPER, 1.6, X.BIT_PAPER); }
        else { X.ring(e.x, 0.04, e.z, 0.5, 5, 0xffd060, 0.6); if (X.bits) X.bits(e.x, 1.6, e.z, red ? 6 : 18, X.PAPER, 2.6, X.BIT_PAPER); }
      }
      break;
    case 'pinned': column(e.x, e.z, 2.2, 2.3); X.ring(e.x, 0.04, e.z, 0.4, 3.4, 0xffd060, 0.45); X.emit(e.x, 1.6, e.z, red ? 6 : 16, 0xffe2a0, 3, 0.6, 1.5, 2); if (X.bits) X.bits(e.x, 2.2, e.z, red ? 3 : 8, X.PAPER, 1.6, X.BIT_PAPER); break;
    case 'unpinned': if (X.bits) X.bits(e.x, 1.8, e.z, red ? 3 : 10, X.PAPER, 2.8, X.BIT_PAPER); break;
    case 'ember': { const u = e.u; if (!u) break; X.ring(u.x, 0.04, u.z, 0.3, 2.6, 0xffd060, 0.45); X.emit(u.x, 1.9, u.z, red ? 6 : 18, 0xffd060, 2.2, 0.8, 2.5, 0); break; }
    case 'mended': {
      const u = e.u, s = e.s; if (!s) break; const big = !!e.relit, hy = s.kind === 'warden' ? 5 : 3.6;
      X.ring(s.x, 0.04, s.z, 1, (s.r || 3) + (big ? 9 : 6), 0xffd060, big ? 1.1 : 0.8); X.ring(s.x, 0.06, s.z, 0.5, (s.r || 3) + 3, 0xfff4dc, 0.5);
      X.emit(s.x, hy, s.z, red ? 14 : (big ? 90 : 50), 0xffd060, big ? 9 : 6, 1.1, 4, 1.5);
      if (u && !red) for (let k = 0; k <= 10; k++) { const f = k / 10; X.emit(u.x + (s.x - u.x) * f, 2 + Math.sin(f * 3.14) * 2.5 + (hy - 2) * f, u.z + (s.z - u.z) * f, 2, 0xffe2a0, 0.8, 0.45 + f * 0.4, 0.6, 0); }
      if (mine && !red) X.shake(0.12);
      break;
    }
    case 'brightend': if (e.u) X.emit(e.u.x, 4, e.u.z, red ? 4 : 12, 0xb8a890, 1.2, 1, 1.2, 0); break;
    case 'towershot': { const s = e.u; if (s && s.brightT > 0 && s.team === 0) { const hy = s.kind === 'warden' ? 9 : 6.6; X.emit(s.x, hy, s.z, red ? 2 : 7, 0xfff0c0, 4, 0.3, 1.5, 0); } break; }
    case 'slacklast': { const u = e.u; if (u) { column(u.x, u.z, 10, 1.8, true); X.ring(u.x, 0.05, u.z, 1, (u.r || 3) + 7, 0xffb060, 0.5); } break; } /* 0.30 lead: the house the tide will take */
    case 'slacktake': { const u = e.u; if (!u) break; column(u.x, u.z, 1.8, 1.4, true); X.ring(u.x, 0.05, u.z, 1, (u.r || 3) + 10, 0xffd060, 0.8); X.emit(u.x, 4, u.z, red ? 8 : 28, 0xffe2a0, 6, 1, 3, 1.5); if (X.bits) X.bits(u.x, 3, u.z, red ? 6 : 22, X.PAPER, 4, X.BIT_PAPER); break; } /* 0.30 lead */
    case 'slackend': { const t = th[e.lane]; if (t) t.snapW = W ? W.t : 0; break; }
    case 'slack': { const t = th[e.lane]; if (t) t.snapW = -99; break; }
  }
};
/* 0.30 feel: a short-lived column where the fold took something (a pinned hollow keeps its own, drawn each frame) */
function column(x, z, life, k, noPtr) { if (!W) return; if (cols.length >= COL_N - 8) cols.shift(); cols.push({ x: x, z: z, t0: W.t, life: life, k: k }); if (!noPtr) { ptrT = W.t; ptrX = x; ptrZ = z; } } /* 0.30 lead: noPtr, the tide's columns are not a catch */
let ptrT = -99, ptrX = 0, ptrZ = 0;
const V3 = { v: null };
function creaseX(i) { return C.CREASE_X[i] != null ? C.CREASE_X[i] : 0; }
function nearCrease(x) { let b = C.CREASE_X[0]; for (let i = 1; i < C.CREASE_X.length; i++) if (Math.abs(C.CREASE_X[i] - x) < Math.abs(b - x)) b = C.CREASE_X[i]; return b; }
function pinCrease(u) { if (!W) return -1; for (let k = 0; k < W.creases.length; k++) { const c = W.creases[k]; if (c.t > 0 && c.team !== u.team && u.lane === c.from) return k; } return -1; }

/* A caught or pinned trooper's pose this frame, or null. Offsets in metres, scales as factors, angles in radians. */
RF.troop = function (t, tm) {
  if (!(t.caught > 0) && !t.pinned) return null;
  const red = X && X.R.reduced ? 0 : 1; out.x = 0; out.y = 0; out.z = 0; out.sx = 1; out.sy = 1; out.rz = 0; out.rx = 0;
  if (t.caught > 0) {
    const f = Math.max(0, Math.min(1, 1 - t.caught / C.FOLD_CATCH)), f2 = f * f, cx = nearCrease(t.x);
    out.sy = 1 - 0.72 * Math.pow(f, 1.3); out.sx = 1 - 0.35 * f + 0.12 * Math.sin(tm * 31 + t.id) * f * red;
    out.rz = (0.35 * f + 0.22 * Math.sin(tm * 23 + t.id * 3) * f * red); out.rx = 0.5 * f2;
    out.x = Math.sign(cx - t.x) * Math.min(1.6, Math.abs(cx - t.x)) * f2; out.y = -0.15 * f;
    if (red && X && Math.random() < 0.05 + f * 0.1 && X.bits && !X.R.low) X.bits(t.x + out.x, 0.7 * out.sy, t.z, 1, X.PAPER, 0.7, X.BIT_PAPER);
  } else {
    const s = red * (0.7 + 0.3 * Math.sin(tm * 3.1 + t.id));
    out.x = Math.sin(tm * 37 + t.id) * 0.07 * s; out.z = Math.sin(tm * 29 + t.id * 2) * 0.05 * s; out.sy = 0.93 + 0.02 * Math.sin(tm * 9 + t.id) * red; out.sx = 1.04;
    out.rz = Math.sin(tm * 2.3 + t.id) * 0.05 * red;
  }
  return out;
};
RF.dip = function (dt) { if (!X || X.R.reduced) { dip = dipV = 0; return 0; } let left = dt; while (left > 1e-6) { const h = Math.min(left, 1 / 120); dipV += (-120 * dip - 16 * dipV) * h; dip += dipV * h; left -= h; } return Math.min(0, dip); };

function glow(n, x, y, z, hex, size, k) { if (n >= GLOW_N) return n; const c = X.tc(hex); gA.p[n * 3] = x; gA.p[n * 3 + 1] = y; gA.p[n * 3 + 2] = z; gA.c[n * 3] = c.r * k; gA.c[n * 3 + 1] = c.g * k; gA.c[n * 3 + 2] = c.b * k; gA.s[n] = size; return n + 1; }
const M4 = { m: null, q: null, s: null, v: null, e: null };
function mat4() { if (!M4.m) { M4.m = new T.Matrix4(); M4.q = new T.Quaternion(); M4.s = new T.Vector3(); M4.v = new T.Vector3(); M4.e = new T.Euler(0, 0, 0, 'YXZ'); } return M4; }
function put(mesh, i, x, y, z, ry, rx, rz, sx, sy, sz) { const K = mat4(); K.e.set(rx, ry, rz, 'YXZ'); K.q.setFromEuler(K.e); K.v.set(x, y, z); K.s.set(sx, sy, sz); K.m.compose(K.v, K.q, K.s); mesh.setMatrixAt(i, K.m); }
/* a thread from a to b drawn with the band mesh squeezed to a line: a unit band is 1 tall and 2 wide, so a band
   scaled (w, len, w) and turned to lie along a to b is a thin paper cord */
function cord(i, ax, ay, az, bx, by, bz, w) {
  const K = mat4(), dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) || 0.01;
  K.v.set(dx / len, dy / len, dz / len); K.q.setFromUnitVectors(M4.up || (M4.up = new T.Vector3(0, 1, 0)), K.v);
  K.s.set(w, len, w); M4.p = M4.p || new T.Vector3(); M4.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); K.m.compose(M4.p, K.q, K.s); bindM.setMatrixAt(i, K.m);
}

RF.frame = function (dt, tm, w, cam, heroM, structM, creaseM) {
  if (!X || !w) return; W = w; time = tm; const red = X.R.reduced, low = X.R.low, M = red ? 0 : tm, K = W.slack;
  /* threads */
  for (let l = 0; l < th.length; l++) {
    const t = th[l]; if (!t) continue; const u = t.u;
    let warn = 0, slack = 0, drain = 0;
    /* all of it read from the model's clock (W.t), not eased per drawn frame, so a frame shows the same state however
       often frames are drawn: the sag comes in over 1.5 s, the snap lasts 1.3 s, the arrival's run 0.95 s */
    if (K && K.lane === l && K.t > 0) { slack = Math.min(1, (C.SLACK.t - K.t) / 1.5); drain = 0.5 + 0.28 * slack; }
    else if (K && K.lane === l && K.warned) { const k = Math.max(0, Math.min(1, 1 - (K.next - W.t) / C.SLACK.warn)); warn = 0.35 + 0.65 * k; drain = 0.3 + 0.45 * k; }
    t.slack = slack; t.warn = warn; t.drain = drain; const sa = W.t - t.snapW; t.snap = sa >= 0 && sa < 1.3 ? 1 - sa / 1.3 : 0; if (t.snap > 0) t.drain = Math.max(t.drain, 0.6 * t.snap);
    u.uT.value = tm; u.uM.value = M; u.uSlack.value = red ? 0 : t.slack; u.uWarn.value = red ? 0 : t.warn * (1 - t.slack); u.uDrain.value = t.drain; u.uRide.value = t.slack;
    u.uDir.value = W.player && W.player.team === 1 ? -1 : 1;
    u.uSnap.value = red ? Math.min(t.snap, 0.5) : t.snap * t.snap;
    t.arrT = W.t - t.arrW; if (t.arrT >= 0 && t.arrT < 0.95) { const f = Math.min(1, t.arrT / 0.45); u.uArrF.value = t.arrR * (1 - (1 - f) * (1 - f)); u.uArrA.value = t.arrT < 0.45 ? 1 : 1 - (t.arrT - 0.45) / 0.5; } else { t.arrT = -1; u.uArrA.value = 0; }
  }
  { const v = veil.material.uniforms; let any = false; const keys = ['x', 'y', 'z'];
    v.uT.value = tm; v.uM.value = M; v.uDir.value = W.player && W.player.team === 1 ? -1 : 1;
    for (let l = 0; l < 3; l++) { const t = th[l], k = keys[l]; if (!t) continue; const u = t.u;
      v.uDrain.value[k] = t.drain; v.uRide.value[k] = t.slack; v.uSnap.value[k] = u.uSnap.value; v.uWarn.value[k] = red ? 0 : t.warn;
      v.uArrS.value[k] = u.uArrS.value; v.uArrF.value[k] = u.uArrF.value; v.uArrA.value[k] = u.uArrA.value; v.uArrD.value[k] = u.uArrD.value;
      if (t.drain > 0.01 || t.slack > 0.01 || u.uSnap.value > 0.01 || u.uArrA.value > 0.01) any = true; }
    veil.visible = any; }
  let nl = 0, ng = 0;
  /* creases: the dashed line burns while a crease holds */
  if (creaseM) for (let i = 0; i < creaseM.length; i++) { const cm = creaseM[i], c = W.creases[i]; if (!cm.dash || !c) continue;
    if (cm.op0 == null) cm.op0 = cm.dash.material.opacity;
    const on = c.t > 0; cm.burn = (cm.burn || 0) + ((on ? 1 : 0) - (cm.burn || 0)) * Math.min(1, dt * 4);
    cm.dash.material.opacity = Math.min(1, cm.op0 + cm.burn * (0.5 + (red ? 0 : 0.12 * Math.sin(tm * 5 + i))));
    cm.dash.scale.x = 1 + cm.burn * 1.9; /* 0.30 feel: was 0.8, the line read thin from behind the hero */
    if (on && cm.burn > 0.3) ng = glow(ng, cm.cx, 0.4, ((tm * 7 + i * 9) % 26) - 13, 0xffd060, 2.4, 0.5 * cm.burn * GK);
    if (on && !red && !low && Math.random() < dt * 9) X.emit(cm.cx + (Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 25, 1, 0xffd060, 0.5, 0.9, 1.6, 0); }
  /* the carried lights */
  for (let i = 0; i < W.heroes.length; i++) {
    const h = W.heroes[i]; if (!h.alive || !h.ember || nl >= LAMP_N) continue;
    const m = heroM[i]; if (m && m.visible === false) continue;
    const s = sw[i] || (sw[i] = { a: 0, v: 0, b: 0, bv: 0, vx: 0, vz: 0 });
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), rx = -fz, rz = fx;
    /* the lantern swings on its ring: pushed by the hero's acceleration, sideways (a) and forward (b) */
    if (!red && dt > 0) { const ax = (h.vx - s.vx) / dt, az = (h.vz - s.vz) / dt, af = ax * fx + az * fz, ar = ax * rx + az * rz;
      s.v += (-38 * s.a - 3.2 * s.v - ar * 0.06) * dt; s.a += s.v * dt; s.bv += (-38 * s.b - 3.2 * s.bv + af * 0.06) * dt; s.b += s.bv * dt;
      s.a = Math.max(-0.7, Math.min(0.7, s.a)); s.b = Math.max(-0.7, Math.min(0.7, s.b)); }
    else { s.a = s.b = 0; }
    s.vx = h.vx; s.vz = h.vz;
    const y0 = h.y + (h.zip ? 0 : 0), back = -0.24, lx = -0.3;
    const bx = h.x + rx * lx + fx * back, bz = h.z + rz * lx + fz * back;
    put(staffM, nl, bx, y0 + 0.75, bz, h.yaw, -0.1, 0.12, 1, 1, 1);
    /* the hanging point is the staff's crook tip; the lantern hangs 0.3 below it, swung by (a, b) */
    const hx = bx + rx * -0.3, hz = bz + rz * -0.3, hy = y0 + 0.75 + 1.52;
    const L = 0.4, ox = Math.sin(s.a) * L, oz = Math.sin(s.b) * L, oy = -Math.cos(s.a) * Math.cos(s.b) * L;
    const lx2 = hx + rx * ox + fx * oz, lz2 = hz + rz * ox + fz * oz, ly2 = hy + oy;
    put(lampM, nl, lx2, ly2, lz2, h.yaw + tm * (red ? 0 : 0.4), s.b, -s.a, 1.4, 1.4, 1.4);
    const fl = red ? 1 : 0.9 + 0.1 * Math.sin(tm * 13 + i) * Math.sin(tm * 7.3);
    ng = glow(ng, lx2, ly2, lz2, 0xffd060, 1.5 * fl, 1); ng = glow(ng, lx2, ly2, lz2, 0xfff0c0, 0.45, 1);
    if (!red && !low && Math.random() < dt * 6) X.emit(lx2, ly2 - 0.1, lz2, 1, 0xffd060, 0.3, 0.6, -0.4, 0);
    nl++;
  }
  lampM.count = staffM.count = nl; lampM.visible = staffM.visible = nl > 0; if (nl) { lampM.instanceMatrix.needsUpdate = true; staffM.instanceMatrix.needsUpdate = true; }
  /* houses: dim on a slack thread, bright while a light burns in them */
  let na = 0;
  for (let i = 0; i < structM.length; i++) {
    const m = structM[i], s = m.unit; if (!s.alive) continue;
    const slack = S.slack ? S.slack(s) : false, bright = s.brightT > 0 && !s.dark;
    let warn = 0; if (K && K.warned && K.lane === s.lane && s.struct && s.kind !== 'patron') warn = 1;
    if (slack) { if (m.glow) m.glow.scale.multiplyScalar(0.35); if (m.lit.flat) m.lit.flat.material.color.setScalar(0.5); if (m.paper && m.baseEm != null) m.paper.emissiveIntensity = m.baseEm * 0.22; }
    else if (warn && !red) { const k = 0.82 + 0.18 * Math.sin(tm * 9 + i * 2); if (m.glow) m.glow.scale.multiplyScalar(k); }
    if (bright) {
      const k = Math.min(1, s.brightT / 2.5), fl = red ? 1 : 0.93 + 0.07 * Math.sin(tm * 11 + i) + 0.05 * Math.sin(tm * 4.3 + i), hy = s.kind === 'warden' ? 5.2 : 3.8;
      if (m.glow) m.glow.scale.multiplyScalar(1 + 0.6 * k * fl);
      if (m.lit.flat) m.lit.flat.material.color.setScalar(1 + 0.35 * k * fl * GK);
      if (m.paper && m.baseEm != null) m.paper.emissiveIntensity = m.baseEm * (1 + 0.8 * k * GK);
      ng = glow(ng, s.x, hy, s.z, 0xffd060, (s.kind === 'warden' ? 15 : 12) * fl * (0.6 + 0.4 * k), 0.55 * k * GK);
      if (!low && na < AURA_N) { const r = (s.r || 3) + 2.4 + (red ? 0 : 0.35 * Math.sin(tm * 2.6 + i)); put(auraM, na++, s.x, 0.07, s.z, tm * (red ? 0 : 0.2), 0, 0, r, 1, r);
        if (na < AURA_N) { const r2 = (s.r || 3) + 4.5 + (red ? 0 : ((tm * 2.2 + i) % 3)); put(auraM, na++, s.x, 0.06, s.z, 0, 0, 0, r2, 1, r2); } }
      if (!red && !low && Math.random() < dt * 12 * k) { const a = Math.random() * 6.283, rr = (s.r || 3) + Math.random() * 2; X.emit(s.x + Math.cos(a) * rr, 0.6 + Math.random() * 2, s.z + Math.sin(a) * rr, 1, 0xffd060, 0.4, 1.4, 2.2, 0); }
    }
  }
  auraM.count = na; auraM.visible = na > 0; if (na) { auraM.instanceMatrix.needsUpdate = true; auraM.material.opacity = LK.add === false ? 0.34 : 0.3; }
  /* pinned hollows: two folded paper bands and three gold cords tied down to the crease line, straining */
  let nb = 0;
  for (let i = 0; i < W.troopers.length && nb < BIND_N - 5; i++) {
    const u = W.troopers[i]; if (!u.alive || !u.pinned) continue;
    const k = pinCrease(u), cx = k >= 0 ? creaseX(k) : nearCrease(u.x), sd = cx > u.x ? 1 : -1, j = red ? 0 : 1;
    const shx = Math.sin(tm * 37 + u.id) * 0.07 * j, R0 = 1.18;
    put(bindM, nb++, u.x + shx, 1.15, u.z, tm * 0.0 + u.id, 0.08 * sd * j * Math.sin(tm * 5 + u.id), 0.12 * sd, R0 * 1.05, 0.42, R0 * 1.05);
    put(bindM, nb++, u.x + shx, 2.25, u.z, u.id * 1.7, 0, -0.1 * sd, R0 * 0.92, 0.36, R0 * 0.92);
    for (let c = -1; c <= 1; c++) {
      const ay = c === 0 ? 2.25 : 1.15, ax = u.x + shx + sd * R0 * (c === 0 ? 0.9 : 1), az = u.z + c * 0.55, bz = u.z + c * 2.2 + Math.sin(tm * 41 + c + u.id) * 0.04 * j;
      cord(nb++, ax, ay, az, u.x + sd * Math.min(4.5, Math.abs(cx - u.x)), 0.12, bz, 0.04);
    }
    if (!red && !low && Math.random() < dt * 5) X.emit(u.x, 1.2 + Math.random() * 1.4, u.z, 1, 0xffe2a0, 0.8, 0.5, 0.5, 0);
  }
  bindM.count = nb; bindM.visible = nb > 0; if (nb) bindM.instanceMatrix.needsUpdate = true;
  /* 0.30 feel: the columns: one per fresh catch (rises in 0.25 s, holds, fades), one over each pinned hollow (steady,
     breathing); the texture's chevrons climb. Then the pointer: when the newest catch is off screen or behind the
     camera, a gold mark at the screen edge points to it for three seconds. */
  let nc = 0; const gold = X.tc(0xffd060), CC = M4.c || (M4.c = new T.Color());
  for (let i = cols.length - 1; i >= 0; i--) { const c = cols[i], a = W.t - c.t0; if (a > c.life || a < -0.1) { cols.splice(i, 1); continue; }
    if (nc >= COL_N) continue; const up = Math.min(1, Math.max(0, a) / 0.25), fade = 1 - Math.max(0, (a - c.life * 0.45) / (c.life * 0.55)), h = 0.35 + 0.65 * (1 - Math.pow(1 - up, 3));
    put(colM, nc, c.x, 0.05, c.z, (red ? 0 : tm * 0.6) + i, 0, 0, 1, h, 1); CC.copy(gold).multiplyScalar(c.k * fade * (LK.add === false ? 1 : 0.9)); colM.setColorAt(nc++, CC); ng = glow(ng, c.x, 0.5, c.z, 0xffd060, 5 * h, 0.6 * fade * GK); }
  for (let i = 0; i < W.troopers.length && nc < COL_N; i++) { const u = W.troopers[i]; if (!u.alive || !u.pinned) continue;
    const br = red ? 1.3 : 1.2 + 0.25 * Math.sin(tm * 3 + u.id); ng = glow(ng, u.x, 0.6, u.z, 0xffd060, 4, 0.5 * GK); put(colM, nc, u.x, 0.05, u.z, red ? 0 : tm * 0.4, 0, 0, 1.25, 1, 1.25); CC.copy(gold).multiplyScalar(br); colM.setColorAt(nc++, CC); }
  colM.count = nc; colM.visible = nc > 0; if (nc) { colM.instanceMatrix.needsUpdate = true; colM.instanceColor.needsUpdate = true; colM.material.map.offset.x = red ? 0 : -tm * 0.08; }
  if (ptr) { let show = false; const age = W.t - ptrT;
    if (age >= 0 && age < 3 && X.cam && W.player && W.player.alive) { const cm = X.cam(); if (cm) { if (!V3.v) V3.v = new T.Vector3(); V3.v.set(ptrX, 2.5, ptrZ).project(cm);
      let px = V3.v.x, py = V3.v.y; const behind = V3.v.z > 1; if (behind) { px = -px; py = -py; }
      if (behind || Math.abs(px) > 0.92 || Math.abs(py) > 0.9) { show = true;
        /* to the side edge, between the top and bottom HUD: behind the camera it goes to the nearer side, never down */
        if (behind || Math.abs(px) < 0.3) { px = px < 0 ? -0.86 : 0.86; py = Math.max(-0.3, Math.min(0.4, py * 0.4)); } else { const m = Math.max(Math.abs(px) / 0.86, 1e-3); px /= m; py = Math.max(-0.3, Math.min(0.4, py / m)); }
        ptr.style.left = (50 + px * 50).toFixed(1) + '%'; ptr.style.top = (50 - py * 50).toFixed(1) + '%'; ptr.style.setProperty('--a', (Math.atan2(-py, px) * 180 / Math.PI).toFixed(0) + 'deg'); ptr.style.opacity = Math.min(1, (3 - age) / 0.6).toFixed(2); } } }
    ptr.classList.toggle('on', show); }
  for (let i = ng; i < GLOW_N; i++) gA.s[i] = 0;
  glowP.visible = ng > 0; if (ng) { glowP.geometry.attributes.position.needsUpdate = true; glowP.geometry.attributes.aC.needsUpdate = true; glowP.geometry.attributes.aSz.needsUpdate = true; glowP.material.uniforms.uH.value = X.height(); }
};
RF._state = function () { return { threads: th.map(function (t) { return t ? { slack: +t.slack.toFixed(2), warn: +t.warn.toFixed(2), drain: +t.drain.toFixed(2), snap: +t.snap.toFixed(2), arr: +t.arrT.toFixed(2) } : null; }), draws: [lampM, staffM, glowP, auraM, bindM, veil, colM].filter(function (o) { return o && o.visible; }).length, lamps: lampM ? lampM.count : 0, auras: auraM ? auraM.count : 0, binds: bindM ? bindM.count : 0, cols: colM ? colM.count : 0, ptr: !!(ptr && ptr.classList.contains('on')), glows: glowP && glowP.visible }; };
})();
