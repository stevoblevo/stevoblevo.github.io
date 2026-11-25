/* LIVLOCH · props: the Hush towers, the troopers on both sides, and the rocks. Three.js r128, built by code, no pictures.

   DESIGN
   - Read-only, like gfx.js: shapes and materials only. gfx.js calls in here from a few marked hook lines; nothing in here
     reads the sim except the unit passed to it.
   - Lore drives the shapes. Reign = warm lantern light: a trooper is a small cloaked lantern bearer in a straw hat like the
     heroine's, and (0.25) a cape in the team's colour down the back like hers, because the player spends most of a match
     behind their own troopers. The Hush = torn tissue paper, the coldest thing on screen, pale lilac eyes, and they steal
     light: a small one is a tissue wraith with a ragged hem, a hollow is a big hunched one (0.25: with a rift of the cold
     light it hoards torn down its back, a crest of shards, and tears on its flanks, so it reads from behind and the side),
     a thief carries the light it took, and a Hush tower is a crooked spire of layered torn tissue clutching a cold hoard of
     light at its top.
   - Cheap: each tower is two meshes (tissue, light) plus its glow sprite and ward; troopers stay instanced; every lantern,
     stolen light and hollow's eyes and rift share one Points draw; a hollow's rift and tears are in its eyes mesh. Sway is
     done on the GPU from one time uniform.
   - One shader trick, used everywhere here: geometry carries `glw` (how much this vertex glows: torn edges, scarves) and
     `sway` (how much it moves in the wind: strips, hems). Emissive = material emissive x glw (x vertex colour for Reign).
   - Looks: Reign troopers are authored in Lantern colours and pass through each look's map like the rest of the valley
     (cloak near-neutral so no map turns it pink). The Hush keep their own cold colours in every look (own), taking the
     look's `hush` / `hushEm` where it has them. Rocks are hand-coloured in Cobalt Snow (the map would turn slate red) and
     mapped in the other looks.
   - Reduced motion: sway amplitude 0, lantern flicker off. */
(function () {
'use strict';
const LL = window.LL;
const P = LL.props = {};
let T = null, _v, _q, _m, _e, _s, _p, _c, _c2;
const U_T = { value: 0 }, U_AMP = { value: 1 }, U_H = { value: 720 };
function init(t) { if (T === t) return; T = t; _v = new T.Vector3(); _q = new T.Quaternion(); _m = new T.Matrix4(); _e = new T.Euler(); _s = new T.Vector3(); _p = new T.Vector3(); _c = new T.Color(); _c2 = new T.Color(); }
function rng(seed) { let a = (seed * 2654435761) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mtx(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); return new T.Matrix4().compose(_p, _q, _s); }
function hex(c) { return c && c.isColor ? c : new T.Color(c); }

/* ---------- a triangle soup with colour, glow and sway per vertex ---------- */
function Soup() { this.p = []; this.c = []; this.g = []; this.s = []; }
Soup.prototype.v = function (x, y, z, col, glw, sway) { this.p.push(x, y, z); this.c.push(col.r, col.g, col.b); this.g.push(glw || 0); this.s.push(sway || 0); };
Soup.prototype.tri = function (a, b, c, ca, cb, cc) { // a, b, c: [x, y, z, glw, sway]; colours per corner
  this.v(a[0], a[1], a[2], ca, a[3], a[4]); this.v(b[0], b[1], b[2], cb || ca, b[3], b[4]); this.v(c[0], c[1], c[2], cc || ca, c[3], c[4]);
};
/* add a three.js geometry, moved by m, coloured by col (hex, Color or fn(localX, localY, localZ) -> Color) */
Soup.prototype.geo = function (geo, m, col, glw, sway) {
  const g = geo.index ? geo.toNonIndexed() : geo, pa = g.attributes.position, fixed = typeof col === 'function' ? null : hex(col);
  for (let i = 0; i < pa.count; i++) {
    _v.fromBufferAttribute(pa, i); const lx = _v.x, ly = _v.y, lz = _v.z; if (m) _v.applyMatrix4(m);
    const cc = fixed || col(lx, ly, lz);
    this.v(_v.x, _v.y, _v.z, cc, typeof glw === 'function' ? glw(lx, ly, lz) : glw, typeof sway === 'function' ? sway(lx, ly, lz) : sway);
  }
  return this;
};
/* a tapered rod from p to q (a claw, a pole, a shard) */
Soup.prototype.rod = function (p, q, r0, r1, sides, col, glw0, glw1, sw0, sw1) {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new T.CylinderGeometry(r1, r0, len, sides || 4, 1, false); g.translate(0, len / 2, 0);
  _v.set(dx / len, dy / len, dz / len); _q.setFromUnitVectors(new T.Vector3(0, 1, 0), _v);
  const m = new T.Matrix4().compose(new T.Vector3(p[0], p[1], p[2]), _q, new T.Vector3(1, 1, 1));
  return this.geo(g, m, col, function (x, y) { return glw0 + (glw1 - glw0) * (y / len); }, function (x, y) { return (sw0 || 0) + ((sw1 || 0) - (sw0 || 0)) * (y / len); });
};
/* A torn strip hanging from point a: k segments down `down` (unit vector), lying across `side` (unit vector), with ragged edges
   that narrow to a point. Sway grows toward the tip; so does the glow of the torn edge. */
Soup.prototype.strip = function (r, a, down, side, out, L, w, k, colTop, colTip, swayK, glwK, curl) {
  const rows = [];
  for (let j = 0; j <= k; j++) {
    const f = j / k, hw = w * 0.5 * Math.pow(1 - f, 0.6) * (j === k ? 0 : (0.7 + r() * 0.6)), bend = (curl || 0) * f * f * L;
    const cx = a[0] + down[0] * L * f + out[0] * bend, cy = a[1] + down[1] * L * f + out[1] * bend, cz = a[2] + down[2] * L * f + out[2] * bend;
    const sh = (r() - 0.5) * w * 0.3 * f; // edges tear a little off centre
    rows.push([[cx - side[0] * (hw - sh), cy - side[1] * hw, cz - side[2] * (hw - sh), f], [cx + side[0] * (hw + sh), cy + side[1] * hw, cz + side[2] * (hw + sh), f]]);
  }
  for (let j = 0; j < k; j++) {
    const A = rows[j][0], B = rows[j][1], C = rows[j + 1][0], D = rows[j + 1][1];
    const ca = _c.copy(colTop).lerp(colTip, A[3]).clone(), cc = _c.copy(colTop).lerp(colTip, C[3]).clone();
    const sa = Math.pow(A[3], 1.3) * swayK, sc = Math.pow(C[3], 1.3) * swayK, ga = 0.15 + A[3] * glwK, gc = 0.15 + C[3] * glwK;
    this.tri([A[0], A[1], A[2], ga, sa], [C[0], C[1], C[2], gc, sc], [B[0], B[1], B[2], ga, sa], ca, cc, ca);
    if (j < k - 1) this.tri([B[0], B[1], B[2], ga, sa], [C[0], C[1], C[2], gc, sc], [D[0], D[1], D[2], gc, sc], ca, cc, cc);
  }
  return this;
};
/* A torn skirt: a ring from (yTop, rTop) to a zigzag hem at yBot. Every other hem vertex is a tongue torn long, the ones
   between are notches. cx/cz: centre; rot: twist. */
Soup.prototype.skirt = function (r, o) {
  const seg = o.seg, rows = [], hem = [];
  for (let k = 0; k < seg; k++) {
    const a = o.rot + k / seg * Math.PI * 2, jt = 1 + (r() - 0.5) * 0.14, jm = 1 + (r() - 0.5) * 0.2;
    rows.push([[o.cx + Math.cos(a) * o.rTop * jt, o.yTop, o.cz + Math.sin(a) * o.rTop * jt], [o.cx + Math.cos(a) * o.rMid * jm, o.yMid, o.cz + Math.sin(a) * o.rMid * jm]]);
  }
  for (let k = 0; k < seg * 2; k++) {
    const a = o.rot + k / (seg * 2) * Math.PI * 2, tongue = k % 2 === 0, rr = o.rBot * (1 + (r() - 0.5) * 0.22) * (tongue ? 1.04 : 0.96);
    const drop = tongue ? r() * o.tear : -r() * o.notch;
    hem.push([o.cx + Math.cos(a) * rr, o.yBot - drop, o.cz + Math.sin(a) * rr, tongue ? o.glwHem : o.glwHem * 0.6, tongue ? o.swayHem : o.swayHem * 0.4]);
  }
  const cT = o.colTop, cM = o.colMid || _c2.copy(o.colTop).lerp(o.colHem, 0.35).clone(), cH = o.colHem;
  for (let k = 0; k < seg; k++) {
    const k1 = (k + 1) % seg, T0 = rows[k][0], T1 = rows[k1][0], M0 = rows[k][1], M1 = rows[k1][1];
    const t0 = [T0[0], T0[1], T0[2], o.glwTop, 0], t1 = [T1[0], T1[1], T1[2], o.glwTop, 0], m0 = [M0[0], M0[1], M0[2], o.glwMid, 0], m1 = [M1[0], M1[1], M1[2], o.glwMid, 0];
    this.tri(t0, m0, t1, cT, cM, cT); this.tri(t1, m0, m1, cT, cM, cM);
    const b0 = hem[2 * k], b1 = hem[2 * k + 1], b2 = hem[(2 * k + 2) % (seg * 2)];
    this.tri(m0, b0, b1, cM, cH, cH); this.tri(m0, b1, m1, cM, cH, cM); this.tri(m1, b1, b2, cM, cH, cH);
  }
  return this;
};
Soup.prototype.build = function () {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
  g.setAttribute('glw', new T.Float32BufferAttribute(this.g, 1));
  g.setAttribute('sway', new T.Float32BufferAttribute(this.s, 1));
  g.computeVertexNormals(); return g;
};

/* ---------- the shared material: Lambert + vertex colour + glow mask + GPU sway ---------- */
/* emV 1: emissive is tinted by the vertex colour (Reign: the scarf glows its own colour). sw: sway in metres at sway = 1.
   gp: the glow mask is raised to this power, so on the Hush only the torn edge itself glows, not the cloth above it. */
function propMat(o) {
  const m = new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, emissive: o.em == null ? 0xffffff : o.em, emissiveIntensity: o.emI == null ? 1 : o.emI, side: o.side || T.FrontSide });
  const uSw = { value: o.sw || 0 }, uEmV = { value: o.emV ? 1 : 0 }, uGp = { value: o.gp || 1 };
  m.onBeforeCompile = function (sh) {
    sh.uniforms.uT = U_T; sh.uniforms.uAmp = U_AMP; sh.uniforms.uSw = uSw; sh.uniforms.uEmV = uEmV; sh.uniforms.uGp = uGp;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float glw;\nattribute float sway;\nvarying float vGlw;\nuniform float uT;\nuniform float uAmp;\nuniform float uSw;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlw = glw;\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;\n#else\nfloat ph = modelMatrix[3].x * 0.37 + modelMatrix[3].z * 0.23;\n#endif\nfloat sw = sway * uAmp * uSw;\ntransformed.x += sin(uT * 1.9 + ph + position.y * 0.9 + position.z * 1.3) * sw;\ntransformed.z += cos(uT * 1.5 + ph * 1.3 + position.y * 0.7 + position.x * 1.1) * sw * 0.8;\ntransformed.y += sin(uT * 2.3 + ph + position.x * 2.0) * sw * 0.15;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlw;\nuniform float uEmV;\nuniform float uGp;')
      .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * pow(max(vGlw, 0.0), uGp);\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= mix(vec3(1.0), vColor, uEmV);\n#endif');
  };
  m.customProgramCacheKey = function () { return 'llprops'; };
  return m;
}
function own(o) { if (o.material) { o.material.userData.lk = true; o.material.userData.solid = true; } if (o.geometry) o.geometry.userData.lk = true; return o; }
/* Colours of the Hush for the look in use: the body, its torn edge, and how its edges glow. */
function hushCols(LK) {
  const body = new T.Color(LK.hush || 0x1c1426), edge = body.clone().lerp(new T.Color(LK.wire ? LK.team[1] : 0x8c80c8), LK.wire ? 0.25 : 0.3);
  const em = new T.Color(LK.hushEm || (LK.wire ? LK.team[1] : 0x7a6cc0)), emI = LK.wire ? 1.1 : (LK.hushEmI || 0.42);
  return { body: body, edge: edge, em: em, emI: emI };
}

/* ---------- HUSH TOWER ---------- */
/* Builds into lit (everything that is the tower) and g (the footing). Returns { glow, paper }.
   H: { glowSprite(col, size, parent, x, y, z), teamCol (look colour of the Hush), LK } */
P.hushTower = function (t, s, g, lit, H) {
  init(t);
  const LK = H.LK, big = s.kind === 'warden', r = rng(Math.round(s.x * 131 + s.z * 17 + 7)), hc = hushCols(LK);
  const R0 = s.r * (big ? 1.0 : 1.05), top = big ? 10.6 : 8.6, N = big ? 7 : 6, y0 = 1.0;
  const tis = new Soup(), lite = new Soup();
  const dark = hc.body, edge = hc.edge, deep = dark.clone().multiplyScalar(0.62), stone = new T.Color(0x1d1830).lerp(dark, 0.4), seep = new T.Color(0xa286ff), leak = new T.Color(0x3c2c86);
  // the footing: a low dark plinth and a crown of shards leaning out
  tis.geo(new T.CylinderGeometry(R0 * 0.95, R0 * 1.12, 0.5, 9), mtx(0, 0.25, 0), stone, 0.05, 0);
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + r() * 0.4, rr = R0 * (0.78 + r() * 0.22), h = 0.9 + r() * 1.3;
    const bx = Math.cos(a) * rr, bz = Math.sin(a) * rr, lean = 0.25 + r() * 0.3;
    tis.rod([bx, 0.2, bz], [bx + Math.cos(a) * h * lean, 0.2 + h, bz + Math.sin(a) * h * lean], 0.32 + r() * 0.12, 0.02, 4, stone, 0.05, 0.5, 0, 0);
  }
  // the spire: layered torn skirts, each smaller, drifting to one side as it climbs, twisting a little
  const la = r() * Math.PI * 2, lean = (big ? 2.0 : 1.6) * (0.75 + r() * 0.5), lx = Math.cos(la), lz = Math.sin(la);
  const step = (top - 1.6 - y0) / N, cen = [];
  for (let i = 0; i <= N; i++) { const f = i / N, j = i > 0 && i < N ? 0.18 : 0; cen.push([lx * lean * f * f + (r() - 0.5) * j, lz * lean * f * f + (r() - 0.5) * j]); }
  const wob = []; for (let i = 0; i <= N; i++) wob.push(0.88 + r() * 0.26);
  const rad = function (f) { return R0 * 0.72 * (1 - f * 0.74) * wob[Math.min(N, Math.round(f * N))]; };
  const ie = Math.floor(N * 0.45), front = -Math.PI / 2; // the tier that carries the big eyes, and which way they look (down the valley, at the Reign)
  for (let i = 0; i < N; i++) {
    const f0 = i / N, f1 = (i + 1) / N, yb = y0 + i * step, yt = yb + step * 1.55, c0 = cen[i], c1 = cen[i + 1];
    const cx = (c0[0] + c1[0]) / 2, cz = (c0[1] + c1[1]) / 2;
    // the core, so nothing shows through between skirts
    tis.geo(new T.CylinderGeometry(rad(f1) * 0.62, rad(f0) * 0.68, step * 1.2, 7, 1, true), mtx(cx, yb + step * 0.6, cz, 0, r() * 3, 0), deep, 0.3, 0);
    tis.skirt(r, { seg: big ? 11 : 10, rot: r() * 6.28, cx: cx, cz: cz, yTop: yt, rTop: rad(f1) * 0.62, yMid: yb + step * 0.55, rMid: rad(f0) * 0.98, yBot: yb, rBot: rad(f0) * 1.3,
      tear: step * (i === ie + 1 ? 0.3 : 0.7 + 0.3 * (1 - f0)), notch: step * 0.25, colTop: edge, colMid: dark, colHem: edge, glwTop: 0.5, glwMid: 0.05, glwHem: 1.0, swayHem: 0.1 });
    // light leaking out from under the next tier's eave: a thin band, seen between its torn tongues
    if (i < N - 1) { const ry = 0.98 * rad(f0) + 0.45 * (0.62 * rad(f1) - 0.98 * rad(f0)) + 0.05;
      lite.geo(new T.CylinderGeometry(ry * 0.97, ry, step * 0.32, 10, 1, true), mtx(cx, yb + step * 0.93, cz), function (x, y) { return y > 0 ? seep : leak; }, 0, 0); }
    // ragged strips hanging from the hem; more and longer low down
    const ns = Math.round((big ? 7 : 6) * (1 - f0 * 0.6));
    for (let k = 0; k < ns; k++) {
      const a = r() * Math.PI * 2, rr = rad(f0) * 1.12, ax = cx + Math.cos(a) * rr, az = cz + Math.sin(a) * rr;
      const L = (0.8 + r() * 1.6) * (1.25 - f0 * 0.6) * (big ? 1.15 : 1), w = 0.22 + r() * 0.22;
      tis.strip(r, [ax, yb + 0.25, az], [Math.cos(a) * 0.12, -1, Math.sin(a) * 0.12], [-Math.sin(a), 0, Math.cos(a)], [Math.cos(a), 0, Math.sin(a)], L, w, 4, dark, edge, 1, 0.9, 0.12);
    }
  }
  // the crown: claws curling in round the hoard
  const ct = cen[N], yTop = y0 + N * step + step * 0.4, rT = rad(1) * 0.9, hoardY = yTop + (big ? 1.1 : 0.95), nc = big ? 6 : 5;
  for (let k = 0; k < nc; k++) {
    const a = k / nc * Math.PI * 2 + r() * 0.3, bx = ct[0] + Math.cos(a) * rT, bz = ct[1] + Math.sin(a) * rT, h = (big ? 1.9 : 1.6) * (0.85 + r() * 0.3);
    const mx = ct[0] + Math.cos(a) * rT * 2.1, mz = ct[1] + Math.sin(a) * rT * 2.1, tx = ct[0] + Math.cos(a) * rT * 0.75, tz = ct[1] + Math.sin(a) * rT * 0.75;
    tis.rod([bx, yTop - 0.5, bz], [mx, yTop + h * 0.5, mz], 0.2, 0.12, 4, dark, 0.1, 0.4, 0, 0.05);
    tis.rod([mx, yTop + h * 0.5, mz], [tx, yTop + h, tz], 0.12, 0.01, 4, edge, 0.4, 1.0, 0.05, 0.2);
  }
  // the light they hoard: a cold lilac stone held in the crown; slit eyes and windows down the spire
  const pale = new T.Color(0xf4ecff), lil = new T.Color(0xc8b4ff), dim = new T.Color(0x9c88e0);
  lite.geo(new T.OctahedronGeometry(big ? 0.62 : 0.52, 0), mtx(ct[0], hoardY, ct[1], 0.3, r() * 3, 0.2, 1, 1.35, 1), function (x, y) { return y > 0 ? pale : lil; }, 0, 0);
  const onSkirt = function (i, a, yk) { // a point just outside the visible flare of skirt i, at angle a and height fraction yk (0 hem, 1 mid ring)
    const c0 = cen[i], c1 = cen[i + 1], cx = (c0[0] + c1[0]) / 2, cz = (c0[1] + c1[1]) / 2, f0 = i / N;
    const rr = rad(f0) * (1.3 * 1.12 + (0.98 - 1.3 * 1.12) * yk) + 0.16, y = y0 + i * step + step * 0.55 * yk; // past the hem's widest tear, so nothing buries it
    return [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
  };
  const slit = function (p, a, w, h, tilt, col) { // a thin diamond lying on the surface, facing out
    const nx = Math.cos(a), nz = Math.sin(a), sx = -nz, sz = nx, ct2 = Math.cos(tilt), st = Math.sin(tilt);
    const ux = sx * ct2, uy = st, uz = sz * ct2, vx = -sx * st, vy = ct2, vz = -sz * st, d = 0.05;
    const L = [p[0] - ux * w / 2, p[1] - uy * w / 2, p[2] - uz * w / 2], Rr = [p[0] + ux * w / 2, p[1] + uy * w / 2, p[2] + uz * w / 2];
    const Tp = [p[0] + vx * h / 2, p[1] + vy * h / 2, p[2] + vz * h / 2], B = [p[0] - vx * h / 2, p[1] - vy * h / 2, p[2] - vz * h / 2], F = [p[0] + nx * d, p[1], p[2] + nz * d];
    lite.tri(L, F, Tp, col); lite.tri(Tp, F, Rr, col); lite.tri(Rr, F, B, col); lite.tri(B, F, L, col);
  };
  // eyes: a big pair looking down the valley at the Reign (toward -z), smaller pairs round the sides
  const ew = big ? 1.2 : 1.05, eh = big ? 0.34 : 0.3;
  [[ie, front, 1], [ie + 1, front + Math.PI * 0.62, 0.7], [ie + 1, front - Math.PI * 0.62, 0.7], [ie + 2, front + Math.PI, 0.6]].forEach(function (E) {
    const i = Math.min(N - 1, E[0]), sp = 0.62 * E[2] / Math.max(0.5, rad(i / N));
    slit(onSkirt(i, E[1] - sp, 0.58), E[1] - sp, ew * E[2], eh * E[2], -0.36, pale);
    slit(onSkirt(i, E[1] + sp, 0.58), E[1] + sp, ew * E[2], eh * E[2], 0.36, pale);
  });
  // windows: thin vertical slits scattered on the lower skirts, dimmer
  for (let k = 0; k < (big ? 9 : 7); k++) { const i = Math.floor(r() * Math.max(1, ie)), a = r() * Math.PI * 2; slit(onSkirt(i, a, 0.5 + r() * 0.3), a, 0.1, 0.3 + r() * 0.25, (r() - 0.5) * 0.3, r() < 0.5 ? lil : dim); }
  const paper = propMat({ em: hc.em, emI: hc.emI * 1.6, gp: 2.5, sw: 0.28, side: T.DoubleSide });
  const tm = own(new T.Mesh(tis.build(), paper)); lit.add(tm);
  const lm = new T.MeshBasicMaterial({ vertexColors: true, fog: false, side: T.DoubleSide }), lmesh = own(new T.Mesh(lite.build(), lm)); lit.add(lmesh);
  const glow = H.glowSprite(H.teamCol, big ? 13 : 10, lit, ct[0], hoardY, ct[1]); glow.material.opacity = 0.62;
  // a faint second halo low on the spire, where the eyes are, so the tower reads as cold light from far off
  const ep = onSkirt(ie, front, 0.58), eyeGlow = H.glowSprite(0xc8b8ff, big ? 4.2 : 3.6, lit, ep[0], ep[1], ep[2] - 0.6); eyeGlow.material.opacity = 0.55; eyeGlow.material.userData.lk = true;
  return { glow: glow, paper: paper };
};
/* A ward for a Hush tower: a curtain of cold light rising from the ground and fading upward, in place of a glass box. */
let wardTex = null;
P.hushWard = function (t, ward) {
  init(t);
  if (!wardTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'), r = rng(5);
    for (let x = 0; x < 128; x++) { const k = 0.08 + 0.92 * Math.pow(r(), 5), top = 128 * (0.25 + r() * 0.6);
      const gr = g.createLinearGradient(0, 128, 0, top); gr.addColorStop(0, 'rgba(255,255,255,' + (0.95 * k).toFixed(3) + ')'); gr.addColorStop(0.35, 'rgba(255,255,255,' + (0.35 * k).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x, 0, 1, 128); }
    wardTex = new T.CanvasTexture(c); wardTex.wrapS = T.RepeatWrapping; wardTex.repeat.x = 3;
  }
  const m = ward.material; m.map = wardTex; m.opacity = 0.5; m.needsUpdate = true;
};
/* What is left of a Hush tower: a heap of torn tissue and a dead hoard, replacing the generic stones. */
P.hushRuin = function (t, rub, s, LK) {
  init(t);
  const r = rng(Math.round(s.x * 7 + s.z * 3)), hc = hushCols(LK), tis = new Soup(), R0 = s.r;
  for (let i = rub.children.length - 1; i >= 0; i--) rub.remove(rub.children[i]);
  tis.skirt(r, { seg: 9, rot: 0, cx: 0, cz: 0, yTop: 1.1, rTop: R0 * 0.35, yMid: 0.55, rMid: R0 * 0.85, yBot: 0.05, rBot: R0 * 1.25, tear: 0.0, notch: 0.4, colTop: hc.body, colHem: hc.edge, glwTop: 0.02, glwMid: 0.1, glwHem: 0.3, swayHem: 0 });
  for (let k = 0; k < 7; k++) { const a = r() * 6.28, d = R0 * (0.6 + r() * 0.9); tis.rod([Math.cos(a) * d, 0.1, Math.sin(a) * d], [Math.cos(a) * d * 1.15, 0.5 + r() * 1.1, Math.sin(a) * d * 1.15 + (r() - 0.5)], 0.3, 0.02, 4, hc.body, 0.05, 0.3, 0, 0); }
  for (let k = 0; k < 6; k++) { const a = r() * 6.28, d = R0 * (1.0 + r() * 0.6); tis.strip(r, [Math.cos(a) * d, 0.08, Math.sin(a) * d], [Math.cos(a + 1.2), 0.02, Math.sin(a + 1.2)], [Math.cos(a), 0.0, Math.sin(a)], [0, 1, 0], 1.2 + r(), 0.3, 3, hc.body, hc.edge, 0.3, 0.4, 0); }
  tis.geo(new T.OctahedronGeometry(0.4, 0), mtx(0.3, 0.45, -0.2, 0.6, 0.3, 0.9), new T.Color(0x3a3250), 0.2, 0);
  rub.add(own(new T.Mesh(tis.build(), propMat({ em: hc.em, emI: hc.emI, gp: 2.5, sw: 0.1, side: T.DoubleSide }))));
};

/* ---------- TROOPERS ---------- */
const REIGN = { cloak: 0x2f2b35, team: 0xff6a4d, straw: 0xe8b850, strawD: 0xb8823a, ink: 0x221f24, frame: 0x2b2927, trim: 0xf0c060 }; // darks kept near neutral: the Snow map turns low-saturation reds cherry pink
/* The lantern hangs from the crook of a staff, just past the hat's brim on the right, so it shows from behind as well as in
   front and a column of troopers reads as a procession of lights. Shared by the geometry and the glow. */
const LANT = { x: 0.58, y: 1.56, z: 0.16 };
/* 0.25 world (#31): the back of a Reign trooper, which is what the player looks at most of a match. A cape in the exact team
   colour (REIGN.team, so every look swaps it) hangs from under the capelet to below the knee across the back, like the
   heroine's red cape in the key art, with a gold band on its torn hem and a gold lantern mark high on it. From 20 to 40 m
   behind, a column then reads as warm and as ours rather than as dark shapes with hats. It stands just outside the cloak's
   bell (cloakR follows the skirt in reignGeo), sways more toward the hem, and is self-lit through glw, because a trooper
   walking toward the Hush turns its back away from the moon. About 70 triangles; still one instanced draw. */
function reignCape(S, r, team, trim) {
  const cloakR = function (y) { return y > 0.6 ? 0.19 + 0.17 * (1.16 - y) / 0.56 : 0.36 + 0.08 * (0.6 - y) / 0.4; };
  const nc = 7, th = 1.2, ys = [1.2, 0.98, 0.76, 0.56], rows = [];
  // pl: pleats, every other fold a little in, deeper toward the hem, so the cloth has light and shade across it
  const at = function (a, y, f, g, sw, pl) { const rr = (cloakR(y) * 1.12 + 0.035 + 0.06 * f) * (1 + (pl || 0) * f); return [Math.sin(a) * rr, y, -Math.cos(a) * rr, g, sw]; };
  for (let i = 0; i < ys.length; i++) { const f = i / (ys.length - 1), row = [];
    for (let j = 0; j < nc; j++) row.push(at(-th + 2 * th * j / (nc - 1), ys[i], f, 0.26 + 0.14 * f, 0.06 + 0.5 * f * f, j % 2 ? -0.07 : 0.03));
    rows.push(row); }
  // the hem: a gold band, then a torn edge whose tongues hang lower than its notches
  const band = [], hem = [];
  for (let j = 0; j < nc; j++) { const a = -th + 2 * th * j / (nc - 1), drop = j % 2 === 0 ? 0.06 + r() * 0.07 : -0.01;
    band.push(at(a, 0.47, 1.12, 0.55, 0.62, j % 2 ? -0.07 : 0.03)); hem.push(at(a, 0.4 - drop, 1.25, 0.65, 0.75, j % 2 ? -0.07 : 0.03)); }
  const quad = function (A, B, Cc, D, ct, cb) { S.tri(A, B, Cc, ct, ct, cb); S.tri(B, D, Cc, ct, cb, cb); }; // A B on top, Cc D below; faces out (-z)
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < nc - 1; j++) quad(rows[i][j], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1], team, team);
  for (let j = 0; j < nc - 1; j++) { quad(rows[3][j], rows[3][j + 1], band[j], band[j + 1], team, team); quad(band[j], band[j + 1], hem[j], hem[j + 1], trim, trim); }
  // the lantern mark: a raised gold diamond on the upper back, lying on the cape (which leans out toward the hem)
  const y = 0.9, rr = cloakR(y) * 1.12 + 0.035 + 0.06 * ((1.2 - y) / 0.64) + 0.012, sl = 0.085 / 0.22, ul = Math.hypot(1, sl), ux = 0, uy = 1 / ul, uz = sl / ul;
  const c = [0, y, -rr], w = 0.075, h = 0.12, F = [c[0], c[1] + 0.36 * 0.012, c[2] - 0.93 * 0.012, 0.9, 0.1];
  const L = [c[0] - w, c[1], c[2], 0.9, 0.1], Rt = [c[0] + w, c[1], c[2], 0.9, 0.1], Tp = [c[0] + ux * h, c[1] + uy * h, c[2] + uz * h, 0.9, 0.1], B = [c[0] - ux * h, c[1] - uy * h, c[2] - uz * h, 0.9, 0.1];
  S.tri(L, Tp, F, trim); S.tri(Tp, Rt, F, trim); S.tri(Rt, B, F, trim); S.tri(B, L, F, trim);
}
function reignGeo() {
  const S = new Soup(), r = rng(11), C = function (h) { return new T.Color(h); };
  const cloak = C(REIGN.cloak), team = C(REIGN.team), straw = C(REIGN.straw), strawD = C(REIGN.strawD), ink = C(REIGN.ink), frame = C(REIGN.frame), trim = C(REIGN.trim);
  // boots
  S.geo(new T.BoxGeometry(0.13, 0.24, 0.2), mtx(-0.11, 0.12, 0.02), ink, 0, 0); S.geo(new T.BoxGeometry(0.13, 0.24, 0.2), mtx(0.11, 0.12, 0.02), ink, 0, 0);
  // the cloak: a dark bell with a scalloped paper hem in gold (0.25: brighter, so it shows below the cape from behind)
  S.skirt(r, { seg: 9, rot: 0.2, cx: 0, cz: 0, yTop: 1.16, rTop: 0.19, yMid: 0.6, rMid: 0.36, yBot: 0.2, rBot: 0.44, tear: 0.07, notch: 0.04, colTop: cloak, colHem: trim.clone().lerp(cloak, 0.3), glwTop: 0.05, glwMid: 0.05, glwHem: 0.4, swayHem: 0.35 });
  S.geo(new T.CylinderGeometry(0.205, 0.19, 0.5, 9, 1, false), mtx(0, 0.92, 0), cloak, 0.05, 0); // fills the cloak's top
  // the mantle and scarf: the team's colour, so a crowd reads warm from far off
  S.skirt(r, { seg: 7, rot: 0.25, cx: 0, cz: 0, yTop: 1.37, rTop: 0.12, yMid: 1.25, rMid: 0.25, yBot: 1.1, rBot: 0.33, tear: 0.12, notch: 0.03, colTop: team, colMid: team, colHem: team, glwTop: 0.7, glwMid: 0.6, glwHem: 0.5, swayHem: 0.4 }); // a torn capelet
  reignCape(S, r, team, trim);
  // scarf tails streaming behind, in the exact team colour so every look swaps it; they show from behind, where the player stands
  S.strip(r, [-0.1, 1.3, -0.15], [-0.25, -0.62, -0.74], [0.94, 0, -0.3], [0, 0.35, -1], 0.82, 0.24, 4, team, team, 1.2, 0.5, 0.25);
  S.strip(r, [0.07, 1.28, -0.16], [0.08, -0.8, -0.6], [1, 0, 0.1], [0, 0.3, -1], 0.62, 0.19, 3, team, team, 1, 0.4, 0.15);
  // head, then the wide straw hat with a dark band
  S.geo(new T.IcosahedronGeometry(0.14, 0), mtx(0, 1.43, 0.02), ink, 0, 0);
  S.geo(new T.ConeGeometry(0.52, 0.3, 12, 1, false), mtx(0, 1.66, 0, 0, 0.13, 0), function (x, y) { return y > -0.1 ? straw : strawD; }, 0.12, 0);
  S.geo(new T.CylinderGeometry(0.2, 0.22, 0.05, 10, 1, true), mtx(0, 1.55, 0), ink, 0, 0);
  // the lantern arm: sleeve, staff with a crook, a cord, the frame (the glowing core is its own mesh, so it can shine through fog and bloom)
  S.rod([0.2, 1.12, 0.02], [0.32, 0.95, 0.16], 0.08, 0.06, 4, cloak, 0.05, 0.05);
  S.rod([0.34, 0.45, 0.14], [0.42, 2.02, 0.16], 0.024, 0.02, 4, frame, 0, 0);
  S.rod([0.42, 2.0, 0.16], [LANT.x, 1.94, LANT.z], 0.02, 0.016, 4, frame, 0, 0);
  S.rod([LANT.x, 1.94, LANT.z], [LANT.x, LANT.y + 0.17, LANT.z], 0.008, 0.008, 3, frame, 0, 0);
  S.geo(new T.ConeGeometry(0.12, 0.08, 4), mtx(LANT.x, LANT.y + 0.15, LANT.z, 0, Math.PI / 4, 0), frame, 0, 0);
  S.geo(new T.CylinderGeometry(0.1, 0.08, 0.04, 4), mtx(LANT.x, LANT.y - 0.13, LANT.z, 0, Math.PI / 4, 0), frame, 0, 0);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) { S.geo(new T.BoxGeometry(0.018, 0.24, 0.018), mtx(LANT.x + q[0] * 0.07, LANT.y, LANT.z + q[1] * 0.07), frame, 0, 0); });
  return S.build();
}
function lanternGeo() { const g = new T.BoxGeometry(0.15, 0.24, 0.15); g.translate(LANT.x, LANT.y, LANT.z); return g; }
/* A small one: a tissue wraith, hooded, hunched forward, with a long ragged hem, torn sleeves reaching ahead, and tatters
   streaming behind. About 1.75 m to the hood's tip. */
function hushGeo(LK, hollow) {
  const S = new Soup(), r = rng(hollow ? 29 : 23), hc = hushCols(LK);
  let body = hollow ? hc.body.clone().multiplyScalar(0.72) : hc.body, edge = hollow ? hc.edge.clone().lerp(hc.body, 0.35) : hc.edge;
  if (hollow && LK.cues) { body = new T.Color(0x5b4f96); edge = new T.Color(0xb4a6f0); } // 0.28 world: Inkblot Noir's three-tone post turns anything that dark to flat black; a hollow side-on was a black cut-out (0.25 note), so its cloth is lifted into the hatched tones
  const deep = body.clone().multiplyScalar(0.55);
  if (!hollow) {
    S.skirt(r, { seg: 9, rot: 0.3, cx: 0, cz: 0.05, yTop: 1.3, rTop: 0.15, yMid: 0.86, rMid: 0.3, yBot: 0.4, rBot: 0.47, tear: 0.36, notch: 0.1, colTop: body, colMid: body, colHem: edge, glwTop: 0.02, glwMid: 0.06, glwHem: 0.9, swayHem: 1.0 });
    // the head deep in a big hood whose point folds back and down
    S.geo(new T.IcosahedronGeometry(0.17, 0), mtx(0, 1.36, 0.1), deep, 0, 0);
    S.geo(new T.ConeGeometry(0.27, 0.5, 8, 1, true), mtx(0, 1.48, 0.06, -0.25, 0, 0), function (x, y) { return y < -0.15 ? edge : body; }, function (x, y) { return y < -0.15 ? 0.45 : 0.05; }, 0);
    S.rod([0, 1.62, -0.04], [0, 1.66, -0.38], 0.1, 0.01, 4, body, 0.05, 0.3, 0.1, 0.6);
    // sleeves reaching forward, tatters streaming back
    [-1, 1].forEach(function (sd) {
      S.strip(r, [sd * 0.2, 1.2, 0.08], [sd * 0.25, -0.55, 0.8], [0, 0, 1], [sd, 0, 0], 0.75, 0.24, 4, body, edge, 0.8, 0.8, 0.1);
      S.strip(r, [sd * 0.14, 0.95, -0.22], [sd * 0.1, -0.62, -0.78], [1, 0, 0], [0, 0, -1], 0.82, 0.18, 4, body, edge, 1.3, 0.8, 0.15);
    });
    S.strip(r, [0, 1.15, -0.2], [0, -0.55, -0.83], [1, 0, 0], [0, 0, -1], 1.0, 0.2, 4, body, edge, 1.4, 0.8, 0.2);
    return S.build();
  }
  // a hollow: hunched, broad-shouldered, the head low and forward, long torn arms to the ground, shards on its shoulders.
  // Authored at unit size; the frame loop scales hollows 2.1 wide and 2.3 tall.
  S.skirt(r, { seg: 12, rot: 0.1, cx: 0, cz: 0.0, yTop: 1.02, rTop: 0.3, yMid: 0.62, rMid: 0.5, yBot: 0.3, rBot: 0.62, tear: 0.28, notch: 0.1, colTop: body, colHem: edge, glwTop: 0.04, glwMid: 0.12, glwHem: 0.8, swayHem: 0.5 });
  S.skirt(r, { seg: 11, rot: 0.4, cx: 0, cz: 0.08, yTop: 1.12, rTop: 0.16, yMid: 0.98, rMid: 0.42, yBot: 0.74, rBot: 0.56, tear: 0.2, notch: 0.06, colTop: body, colHem: edge, glwTop: 0.04, glwMid: 0.15, glwHem: 0.7, swayHem: 0.3 });
  S.geo(new T.IcosahedronGeometry(0.3, 1), mtx(0, 0.95, -0.02, 0.3, 0, 0, 1.55, 0.85, 1.25), body, 0.03, 0); // shoulders and a hunched back
  S.geo(new T.IcosahedronGeometry(0.15, 0), mtx(0, 1.0, 0.3), deep, 0, 0);
  S.geo(new T.ConeGeometry(0.2, 0.42, 7, 1, true), mtx(0, 1.08, 0.24, 1.0, 0, 0), function (x, y) { return y < -0.1 ? edge : body; }, function (x, y) { return y < -0.1 ? 0.45 : 0.08; }, 0);
  [-1, 1].forEach(function (sd) {
    for (let j = 0; j < 2; j++) { const bx = sd * (0.3 + j * 0.14); S.rod([bx, 1.0, -0.06 + j * 0.08], [bx + sd * (0.1 + r() * 0.06), 1.24 + r() * 0.1 - j * 0.08, -0.14 + r() * 0.08], 0.07, 0.005, 4, body, 0.05, 0.7, 0, 0.1); }
    // the arm, torn into three fingers near the ground
    S.strip(r, [sd * 0.46, 0.98, 0.12], [sd * 0.18, -0.9, 0.4], [0, 0, 1], [sd, 0, 0], 0.6, 0.24, 3, body, body, 0.4, 0.3, 0.05);
    for (let j = -1; j <= 1; j++) S.strip(r, [sd * (0.56 + j * 0.02), 0.44, 0.38 + j * 0.06], [sd * 0.1 + j * 0.15, -0.95, 0.3], [0, 0, 1], [sd, 0, 0], 0.4, 0.09, 3, body, edge, 0.9, 1.0, 0.1);
  });
  // 0.25 world (#32): the back. The tatters part at the spine (the middle one is gone) so the rift of cold light in
  // hollowLightGeo shows down it, and their torn edges glow brighter; a crest of shards flanks the rift, leaning back and up,
  // so the silhouette breaks from behind and from the side. Before, a hollow from behind was a dark lump.
  const tip = hc.edge.clone().lerp(new T.Color(LK.wire ? LK.team[1] : 0xb4a4ff), 0.35);
  [-0.38, -0.2, 0.2, 0.38].forEach(function (x) { const j = x / 0.19; S.strip(r, [x, 1.06 - Math.abs(j) * 0.04, -0.31], [j * 0.08, -0.92, -0.38], [1, 0, 0], [0, 0, -1], 0.82 + r() * 0.25, 0.25, 4, body, tip, 1.0, 1.0, 0.05); });
  HOLLOW_BACK.forEach(function (b, k) { if (k > 2) return; [-1, 1].forEach(function (sd) {
    const x = sd * (0.1 + k * 0.015), y = b[0], z = b[1] + 0.03, L = 0.42 - k * 0.08;
    S.rod([x, y, z], [x + sd * (0.07 + r() * 0.04), y + L * 0.78, z - L * 0.62], 0.075 - k * 0.01, 0.006, 4, body, 0.08, 1.0, 0, 0.12); }); });
  return S.build();
}
/* Where a hollow's back is, as [height, z] down the spine (unit size, before the frame loop's 2.1 x 2.3): the hump, then the
   upper skirt's hem. The rift lies just outside it and the crest roots just inside it. */
const HOLLOW_BACK = [[1.2, -0.3], [1.06, -0.37], [0.92, -0.415], [0.78, -0.46], [0.64, -0.51]];
function backZ(y) { const B = HOLLOW_BACK; if (y >= B[0][0]) return B[0][1]; for (let i = 1; i < B.length; i++) if (y >= B[i][0]) { const t = (y - B[i][0]) / (B[i - 1][0] - B[i][0]); return B[i][1] + (B[i - 1][1] - B[i][1]) * t; } return B[B.length - 1][1]; }
/* A hollow's lights, unlit and unfogged like the eyes, in the same mesh as its eyes (so no new draw call): the eyes, and a
   torn rift of cold light down its spine where the hoard it carries shows through. Pale at the core, lilac at the torn edge,
   zigzagging and widest in the middle. Seen from behind at 10 to 30 m it is the first thing that says "hollow". */
function hollowLightGeo() {
  const S = eyesSoup(1.02, 0.47, 0.075, 0.14, 0.05, 0.5), r = rng(37), core = new T.Color(0xf4ecff), rim = new T.Color(0xa08cff), fringe = new T.Color(0x3a2c8a), N = 9, rows = [];
  // the rift: rows of five across it (fringe, rim, core, rim, fringe), so the light fades into the tissue at its torn edges
  for (let k = 0; k <= N; k++) {
    const f = k / N, y = 1.19 - f * 0.55, z = backZ(y) - 0.03, cx = (k % 2 ? 0.02 : -0.02) + (r() - 0.5) * 0.012, w = 0.016 + 0.05 * Math.pow(Math.sin(Math.PI * f), 0.7) * (0.75 + r() * 0.5);
    rows.push([[cx - w * 2.3, y, z + 0.012], [cx - w, y, z + 0.004], [cx, y, z - 0.006], [cx + w, y, z + 0.004], [cx + w * 2.3, y, z + 0.012]]);
  }
  const cs = [fringe, rim, core, rim, fringe];
  for (let k = 0; k < N; k++) { const A = rows[k], B = rows[k + 1];
    for (let j = 0; j < 4; j++) { S.tri(A[j], A[j + 1], B[j], cs[j], cs[j + 1], cs[j]); S.tri(A[j + 1], B[j + 1], B[j], cs[j + 1], cs[j + 1], cs[j]); } }
  // light leaking from two small tears on each flank, so a hollow seen side on shows cold light too
  [-1, 1].forEach(function (sd) {
    [[0.86, 0.02, 0.14, 0.28], [0.69, -0.15, 0.1, 0.21]].forEach(function (t) {
      const y = t[0], z = t[1], x = sd * (Math.sqrt(Math.max(0.01, 0.53 * 0.53 - z * z)) + 0.03), h = t[3], w = t[2] * 0.5, F = [x + sd * 0.02, y, z];
      const Tp = [x, y + h / 2, z + 0.02], B = [x, y - h / 2, z - 0.02], Lf = [x, y, z - w], Rb = [x, y, z + w];
      S.tri(Lf, F, Tp, rim, core, rim); S.tri(Tp, F, Rb, rim, core, rim); S.tri(Rb, F, B, rim, core, rim); S.tri(B, F, Lf, rim, core, rim);
    });
  });
  return S.build();
}
/* Eyes: two slanted almond slits. They are their own mesh, unlit and unfogged, so pale lilac eyes read in any night. */
function eyesGeo(y, z, sep, w, h, slant) { return eyesSoup(y, z, sep, w, h, slant).build(); }
function eyesSoup(y, z, sep, w, h, slant) {
  const S = new Soup(), col = new T.Color(0xf2e2ff);
  [-1, 1].forEach(function (sd) {
    const cx = sd * sep, ca = Math.cos(sd * slant), sa = Math.sin(sd * slant), d = 0.04;
    const pt = function (u, v) { return [cx + u * ca - v * sa, y + u * sa + v * ca, z]; };
    const L = pt(-w / 2, 0), R_ = pt(w / 2, 0), Tp = pt(0, h / 2), B = pt(0, -h / 2), F = [cx, y, z + d];
    S.tri(L, F, Tp, col); S.tri(Tp, F, R_, col); S.tri(R_, F, B, col); S.tri(B, F, L, col);
  });
  return S;
}
/* Glow points: every lantern, stolen light and hollow's eyes, one draw. */
function GlowLayer(tex, cap, LK) {
  const g = new T.BufferGeometry();
  this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3); this.size = new Float32Array(cap); this.cap = cap; this.n = 0;
  g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('gcol', new T.BufferAttribute(this.col, 3)); g.setAttribute('gsize', new T.BufferAttribute(this.size, 1));
  const day = !LK.add, m = new T.ShaderMaterial({
    uniforms: { map: { value: tex }, uH: U_H, uOp: { value: day ? 0.35 : 0.88 } },
    vertexShader: 'attribute vec3 gcol; attribute float gsize; uniform float uH; varying vec3 vC; void main(){ vC = gcol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = gsize * projectionMatrix[1][1] * uH * 0.5 / max(0.2, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; uniform float uOp; varying vec3 vC; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC, a * uOp); }',
    transparent: true, depthWrite: false, blending: day ? T.NormalBlending : T.AdditiveBlending
  });
  m.userData.lk = true; m.userData.bl = true; m.userData.solid = true;
  this.mesh = new T.Points(g, m); this.mesh.frustumCulled = false; this.mesh.userData.rt = true; this.mesh.renderOrder = 2; g.setDrawRange(0, 0);
}
GlowLayer.prototype.put = function (x, y, z, s, c) { const i = this.n; if (i >= this.cap) return; this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b; this.size[i] = s; this.n = i + 1; };
GlowLayer.prototype.end = function () { const g = this.mesh.geometry; g.setDrawRange(0, this.n); g.attributes.position.needsUpdate = g.attributes.gcol.needsUpdate = g.attributes.gsize.needsUpdate = true; };

/* Builds the crowd meshes for one look. Returns the four gfx.js already drives (reign, lantern, hush, eyes); the hollows
   and the glow points are kept here and driven through P.lantern / P.hollow / P.stolen between P.begin and P.end.
   own: gfx's own(); tc: gfx's look colour of a Lantern hex; parent: where to add what is kept here. */
let crowd = null;
P.troopers = function (t, LK, parent, glowTex, tc, ownFn) {
  init(t);
  const hc = hushCols(LK);
  const rm = propMat({ em: 0xffffff, emI: 0.55, emV: true, sw: 0.09 }); rm.userData.lk = true; // the vertex colours still pass through the look
  const reign = new T.InstancedMesh(reignGeo(), rm, 90);
  const lm = new T.MeshBasicMaterial({ color: 0xffbe5c, fog: false }); // the lantern's lit core, recoloured by the look like all warm light
  const lantern = new T.InstancedMesh(lanternGeo(), lm, 180);
  const hush = ownFn(new T.InstancedMesh(hushGeo(LK, false), propMat({ em: hc.em, emI: hc.emI * 1.3, gp: 3, sw: 0.16, side: T.DoubleSide }), 110));
  const eyes = ownFn(new T.InstancedMesh(eyesGeo(1.37, 0.27, 0.085, 0.19, 0.075, 0.42), new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false, side: T.DoubleSide }), 110));
  const hollow = ownFn(new T.InstancedMesh(hushGeo(LK, true), propMat({ em: hc.em, emI: hc.emI, gp: 3, sw: 0.1, side: T.DoubleSide }), 40));
  const hEyes = ownFn(new T.InstancedMesh(hollowLightGeo(), new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false, side: T.DoubleSide }), 40)); // 0.25: the eyes and the rift down the back
  [reign, lantern, hush, eyes, hollow, hEyes].forEach(function (m) { m.frustumCulled = false; m.count = 0; });
  parent.add(hollow); parent.add(hEyes);
  const glow = new GlowLayer(glowTex, 240, LK); parent.add(glow.mesh);
  crowd = { hollow: hollow, hEyes: hEyes, nh: 0, glow: glow, cLant: tc(0xffb050).clone(), cCarry: tc(0xffd28a).clone(), cSoul: tc(0xffe9a8).clone(), cEye: new T.Color(0x9c84ff), cRift: new T.Color(0xa496ff), time: 0, reduced: false };
  return { reign: reign, lantern: lantern, hush: hush, eyes: eyes };
};
P.begin = function (time, reduced, h) { U_T.value = time; U_AMP.value = reduced ? 0 : 1; if (h) U_H.value = h; if (!crowd) return; crowd.nh = 0; crowd.glow.n = 0; crowd.time = time; crowd.reduced = reduced; };
P.lantern = function (m, u) {
  if (!crowd) return; _v.set(LANT.x, LANT.y, LANT.z).applyMatrix4(m);
  const fl = crowd.reduced ? 1 : 0.9 + 0.1 * Math.sin(crowd.time * 11 + u.id * 1.7) * Math.sin(crowd.time * 7.3 + u.id);
  crowd.glow.put(_v.x, _v.y, _v.z, (u.ranged ? 2.6 : 2.3) * fl, crowd.cLant);
};
P.hollow = function (m) {
  if (!crowd || crowd.nh >= 40) return false;
  crowd.hollow.setMatrixAt(crowd.nh, m); crowd.hEyes.setMatrixAt(crowd.nh, m); crowd.nh++;
  _v.set(0, 1.02, 0.5).applyMatrix4(m); crowd.glow.put(_v.x, _v.y, _v.z, 1.6, crowd.cEye);
  _v.set(0, 0.92, -0.5).applyMatrix4(m); crowd.glow.put(_v.x, _v.y, _v.z, 2.3, crowd.cRift); // 0.25 (#32): the rift's halo, seen from behind
  return true;
};
P.stolen = function (m, carry) {
  if (!crowd) return; _v.set(0, 1.0, 0.55).applyMatrix4(m);
  const p = crowd.reduced ? 1 : 0.85 + 0.15 * Math.sin(crowd.time * 9);
  crowd.glow.put(_v.x, _v.y, _v.z, (carry ? 2.0 : 1.5) * p, carry ? crowd.cCarry : crowd.cSoul);
};
P.end = function () {
  if (!crowd) return;
  crowd.hollow.count = crowd.hEyes.count = crowd.nh; crowd.hollow.instanceMatrix.needsUpdate = crowd.hEyes.instanceMatrix.needsUpdate = true;
  crowd.glow.end();
};

/* ---------- ROCKS ---------- */
/* Faceted boulders, two shapes, each a main stone with one or two smaller ones leaning on it, snow or moss baked into the
   faces that look up. Unit size: about 1 across, base at 0, top near 1. Returns a Group of two InstancedMeshes. */
function boulder(S, r, cx, cz, sx, sy, sz, rot, cols) {
  const g = new T.IcosahedronGeometry(1, 1), pa = g.attributes.position;
  // displace each distinct vertex by its direction so faces stay closed
  const key = function (x, y, z) { return Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000); }, off = {};
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = key(x, y, z);
    if (off[k] == null) off[k] = 0.78 + r() * 0.36;
    let f = off[k], ny = y * f; if (ny < -0.25) ny = -0.25 + (ny + 0.25) * 0.15; // a flat-ish bottom
    if (ny > 0.55) ny = 0.55 + (ny - 0.55) * 0.55; // a flattened crown, where snow can sit
    pa.setXYZ(i, x * f, ny, z * f);
  }
  g.translate(0, 0.25, 0);
  const m = mtx(cx, 0, cz, (r() - 0.5) * 0.25, rot, (r() - 0.5) * 0.25, sx, sy, sz);
  const ng = g.index ? g.toNonIndexed() : g; ng.applyMatrix4(m); ng.computeVertexNormals();
  const p = ng.attributes.position, n = ng.attributes.normal;
  for (let i = 0; i < p.count; i += 3) {
    const ny = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, j = 0.88 + r() * 0.24;
    _c.copy(cols.body).multiplyScalar(j).lerp(cols.foot, U_clamp(0.35 - cy, 0, 0.35) * 2);
    if (ny > 0.62) _c.copy(cols.top).multiplyScalar(0.94 + r() * 0.08); else if (ny > 0.38) _c.lerp(cols.top, 0.38);
    for (let q = 0; q < 3; q++) S.v(p.getX(i + q), p.getY(i + q), p.getZ(i + q), _c, 0, 0);
  }
}
function U_clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
P.rocks = function (t, rocks, LK, dummy) {
  init(t);
  const night = !!LK.snowcaps, day = !LK.add, cols = night
    ? { body: new T.Color(0x3d3c66), foot: new T.Color(0x24223f), top: new T.Color(0xe4e6ff) } // Cobalt Snow: slate indigo under lilac snow, as on the plate
    : day ? { body: new T.Color(0x8c8a9a), foot: new T.Color(0xb0aebd), top: new T.Color(0x18181c) } // Origami's map turns near-greys light for dark: authored inverted, so the tops come out white paper
    : { body: new T.Color(0x575266), foot: new T.Color(0x34303f), top: new T.Color(0x56743e) }; // others: stone and moss, recoloured by the look
  const grp = new T.Group(), shapes = [[[0, 0, 1, 1, 1], [0.78, 0.25, 0.48, 0.5, 0.5]], [[0, 0, 1.05, 0.85, 0.92], [-0.7, 0.35, 0.55, 0.62, 0.55], [0.35, -0.75, 0.38, 0.4, 0.4]]];
  shapes.forEach(function (sh, vi) {
    const list = rocks.filter(function (o) { return (o.seed * 7.13 % 1 < 0.5 ? 0 : 1) === vi; }); if (!list.length) return;
    const S = new Soup(), r = rng(41 + vi * 13);
    sh.forEach(function (b, k) { boulder(S, r, b[0], b[1], b[2], b[3] * (k ? 0.95 : 1), b[4], r() * 6.28, cols); });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(S.p, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(S.c, 3)); geo.computeVertexNormals();
    const im = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), list.length);
    list.forEach(function (o, i) {
      dummy.position.set(o.x, -0.06, o.z); dummy.rotation.set(0, o.seed * 17, 0); dummy.scale.set(o.r * 1.08, o.h * 0.95, o.r * 1.08); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    if (night) { geo.userData.lk = true; im.material.userData.lk = true; } // kept as painted: the Snow palette would turn slate red
    grp.add(im);
  });
  dummy.rotation.set(0, 0, 0);
  return grp;
};

/* ---------- 0.28 world (#39): fruit bushes, strays, fold cranes ----------
   Built shapes in the same storybook style as the heroes and troopers: folded-paper leaves in layers, faceted bodies with
   vertex colour, glow and sway per vertex (the shared material above). Draw calls: all the fruit bushes together are one
   mesh (foliage, static, in world space), each fruit is one mesh plus its glow sprite, each stray is one mesh plus one
   sprite, each crane is three meshes (body and two wings) plus its sprite.
   Colour is meaning, so fruit (the fruit itself and its glow), the leaves and the crane's paper pass through no look's map;
   the stray's body takes the look's colour map through its vertex colours like the rest of the valley. */
function lerpCol(a, b, k) { return _c2.copy(a).lerp(b, k).clone(); }
function xfPoint(m, p) { _v.set(p[0], p[1], p[2]).applyMatrix4(m); return [_v.x, _v.y, _v.z]; }
/* A folded paper leaf from c, pointing along (yaw, pitch): a midrib arched up, the two halves drooping off it, the tip bowed down. */
function leafCard(S, m, c, yaw, pitch, len, wid, fold, c0, c1, glw, sw) {
  const cp = Math.cos(pitch), d = [cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw)], sd = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const u = [d[1] * sd[2] - d[2] * sd[1], d[2] * sd[0] - d[0] * sd[2], d[0] * sd[1] - d[1] * sd[0]];
  const pt = function (a, b, e, f) { return [c[0] + d[0] * a + sd[0] * b + u[0] * e, c[1] + d[1] * a + sd[1] * b + u[1] * e, c[2] + d[2] * a + sd[2] * b + u[2] * e, glw, sw * f]; };
  const B = pt(0, 0, 0, 0.1), M = pt(len * 0.42, 0, fold * 0.6, 0.5), L = pt(len * 0.42, -wid / 2, -fold * 0.3, 0.6), R = pt(len * 0.42, wid / 2, -fold * 0.3, 0.6), Tp = pt(len, 0, -fold * 0.7, 1);
  const cm = lerpCol(c0, c1, 0.5), cl = lerpCol(c0, c1, 0.3).multiplyScalar(0.86), cr = lerpCol(c0, c1, 0.6).multiplyScalar(1.08);
  const X = function (q) { if (!m) return q; const w = xfPoint(m, q); return [w[0], w[1], w[2], q[3], q[4]]; };
  const b = X(B), mm = X(M), l = X(L), r = X(R), t = X(Tp);
  S.tri(b, l, mm, c0, cl, cm); S.tri(mm, l, t, cm, cl, c1); S.tri(b, mm, r, c0, cm, cr); S.tri(mm, t, r, cm, c1, cr);
}
const LEAF = { lemon: [0x2e5a34, 0x86b044], hips: [0x2c523a, 0x6e9e5a], lime: [0x24563e, 0x58b064] };
function bushFoliage(S, r, m, k, big) {
  const pal = LEAF[k] || LEAF.lemon, c0 = new T.Color(pal[0]), c1 = new T.Color(pal[1]), wood = new T.Color(0x5a4228), woodT = new T.Color(0x7a5a38), sc = big ? 1.7 : 1;
  const rings = [[9, 0.28, 0.2, 0.35, 1.0, 0.5], [7, 0.16, 0.55, 0.85, 0.82, 0.42], [5, 0.08, 0.82, 1.15, 0.62, 0.36]];
  rings.forEach(function (R, ri) {
    for (let i = 0; i < R[0]; i++) {
      const a = i / R[0] * Math.PI * 2 + ri * 0.5 + (r() - 0.5) * 0.4;
      leafCard(S, m, [Math.sin(a) * R[1], R[2], Math.cos(a) * R[1]], a, R[3] + (r() - 0.5) * 0.25, R[4] * (0.85 + r() * 0.3), R[5] * (0.9 + r() * 0.2), 0.16, lerpCol(c0, c1, 0.05 * ri), lerpCol(c0, c1, 0.55 + 0.15 * ri + r() * 0.15), 0.5, 0.5);
    }
  });
  const top = big ? 2.7 : 1.62, rod = function (a, b, r0, r1, col) { const pa = xfPoint(m, a), pb = xfPoint(m, b); S.rod(pa, pb, r0 * sc, r1 * sc, 4, col, 0.15, 0.2, 0.2, 0.9); };
  rod([0, 0.4, 0], [0.04, top / sc, 0], 0.07, 0.04, wood);
  [[0.3, 0.2], [-0.28, 0.16], [0.02, -0.32]].forEach(function (f) { rod([0.04, (top - 0.18) / sc, 0], [0.04 + f[0] * 0.8, top / sc + 0.22, f[1] * 0.8], 0.035, 0.02, woodT); });
  for (let i = 0; i < 5; i++) { const a = i * 2.4 + r(), y = 0.85 + i * (top / sc - 1.0) / 5; leafCard(S, m, [0.04 * y, y, 0], a, 0.45, 0.55 * (1 - i * 0.07), 0.3, 0.12, c0, c1, 0.5, 0.5); }
  if (k === 'hips') for (let i = 0; i < 7; i++) { const y = 0.7 + r() * (top / sc - 0.9), a = r() * 6.28, q = [0.04 * y + Math.sin(a) * 0.06, y, Math.cos(a) * 0.06], tp = [q[0] + Math.sin(a) * 0.2, y + 0.07, q[2] + Math.cos(a) * 0.2]; const pq = xfPoint(m, q), pt = xfPoint(m, tp); S.rod(pq, pt, 0.035 * sc, 0.004, 3, woodT, 0.1, 0.1, 0, 0); }
}
/* the fruit itself, built around its own centre (the renderer lifts, spins and scales it): one soup in the fruit's own colour */
function fruitSoup(k, big, col) {
  const S = new Soup(), smooth = [], fc = new T.Color(col), hi = fc.clone().lerp(new T.Color(0xffffff), 0.1), lo = fc.clone().multiplyScalar(0.78), lf = new T.Color(0x3f7a3a), lf2 = new T.Color(0x5aa04a);
  const g = function (geo, m, fn) { const n0 = S.p.length / 3; S.geo(geo, m, fn, 1, 0); _v.set(0, 0, 0).applyMatrix4(m); smooth.push([n0, S.p.length / 3, _v.x, _v.y, _v.z]); }; // the fruit itself is shaded smooth, like a real one
  const shade = function (ry, rr) { return function (x, y) { return lerpCol(lo, hi, U_clamp(0.5 + y / (2 * rr), 0, 1)); }; };
  lo.multiplyScalar(1.1);
  if (k === 'hips' || k === 'bighips') {
    const hs = big ? 2.6 : 1, dark = new T.Color(0x5a1810), pos = [[0, 0, 0], [0.24, -0.1, 0.1], [-0.2, -0.14, -0.12], [0.02, -0.22, 0.2]];
    pos.forEach(function (p, i) {
      const ge = new T.SphereGeometry(0.17 * hs, 7, 5), mm = mtx(p[0] * hs, p[1] * hs, p[2] * hs, i * 0.7, i * 1.3, 0.3 * i, 0.82, 1.18, 0.82);
      g(ge, mm, shade(0, 0.17 * hs * 1.18));
      S.geo(new T.ConeGeometry(0.06 * hs, 0.09 * hs, 4), mtx(p[0] * hs, p[1] * hs + 0.2 * hs * 1.1, p[2] * hs, i * 0.7, i * 1.3, 0.3 * i), dark, 0.4, 0);
      S.geo(new T.ConeGeometry(0.03 * hs, 0.11 * hs, 3), mtx(p[0] * hs, p[1] * hs - 0.2 * hs * 1.05, p[2] * hs, Math.PI + i * 0.7, 0, 0), dark, 0.4, 0);
    });
    S.geo(new T.ConeGeometry(0.12 * hs, 0.12 * hs, 5), mtx(0, 0.3 * hs, 0, 0, 0, 0), lf, 0.5, 0);
  } else {
    const rr = big ? 0.95 : 0.34, lemon = k === 'lemon' || k === 'biglemon', ge = new T.SphereGeometry(rr, 9, 7);
    g(ge, mtx(0, 0, 0, 0, 0, 0, lemon ? 1.3 : 1, 1, 1), shade(0, rr));
    if (lemon) { S.geo(new T.ConeGeometry(rr * 0.2, rr * 0.4, 5), mtx(rr * 1.3 + rr * 0.1, 0, 0, 0, 0, -Math.PI / 2), hi, 1, 0); S.geo(new T.ConeGeometry(rr * 0.16, rr * 0.3, 5), mtx(-rr * 1.3 - rr * 0.06, 0, 0, 0, 0, Math.PI / 2), lo, 1, 0); }
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; leafCard(S, null, [Math.sin(a) * rr * 0.12, rr * 0.92, Math.cos(a) * rr * 0.12], a, 0.55, rr * 0.75, rr * 0.5, rr * 0.18, lf, lf2, 0.5, 0); }
  }
  S.smooth = smooth; return S;
}
P.fruitBushes = function (t, list, H) {
  init(t);
  const S = new Soup(), fruit = [];
  list.forEach(function (f, i) {
    const r = rng(907 + i * 31 + Math.floor(Math.abs(f.x * 7 + f.z * 3))), base = new T.Matrix4().compose(new T.Vector3(f.x, 0, f.z), new T.Quaternion().setFromEuler(new T.Euler(0, r() * 6.28, 0)), new T.Vector3(f.big ? 1.7 : 1, f.big ? 1.7 : 1, f.big ? 1.7 : 1));
    bushFoliage(S, r, base, f.k.replace('big', ''), f.big);
    const g = new T.Group(), fr = new T.Group(), fs = fruitSoup(f.k, f.big, f.col), fm = propMat({ em: 0xffffff, emI: 0.55, emV: true, sw: 0 });
    const fgeo = fs.build(), fn = fgeo.attributes.normal; fs.smooth.forEach(function (q) { for (let v = q[0]; v < q[1]; v++) { _v.set(fgeo.attributes.position.getX(v) - q[2], fgeo.attributes.position.getY(v) - q[3], fgeo.attributes.position.getZ(v) - q[4]).normalize(); fn.setXYZ(v, _v.x, _v.y, _v.z); } });
    const fo = own(new T.Mesh(fgeo, fm)); fo.frustumCulled = false; fr.add(fo); fr.position.y = f.big ? 3.1 : 1.9; g.add(fr);
    const glow = H.glowSprite(f.col, f.big ? 9 : 3.4, fr, 0, 0, 0); glow.material.userData.lk = true;
    g.fr = fr; g.glow = glow; fruit.push(g);
  });
  const fol = new T.Mesh(S.build(), propMat({ em: 0xffffff, emI: 0.1, emV: true, sw: 0.12, side: T.DoubleSide }));
  fol.frustumCulled = false; fol.material.userData.lk = true; fol.geometry.userData.lk = true; fol.userData.fruitFol = true; // leaves keep their green in every look, as the old leaves did
  return { foliage: fol, fruit: fruit };
};

/* a stray: a squat horned creature of the valley, faceted like a pebble, with a ridge of pale shards, two-pronged horns, four
   stubby feet, a lilac-tipped tail, and eyes that glow. Faces +z. Body about 2.6 wide and 2.6 tall to the horns' roots. */
P.stray = function (t, H) {
  init(t);
  const S = new Soup(), r = rng(515), body = new T.Color(0x4c3e6c), belly = new T.Color(0x7d6ca0), horn = new T.Color(0xf4e8d6), hornT = new T.Color(0xfff7ea), lil = new T.Color(0xc9a0ff), foot = new T.Color(0x2e2444), shard = new T.Color(0xb6a2e4);
  const ig = new T.IcosahedronGeometry(1, 1), pa = ig.attributes.position, off = {};
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), key = Math.round(x * 500) + ',' + Math.round(y * 500) + ',' + Math.round(z * 500); if (off[key] == null) off[key] = 0.9 + r() * 0.2; const f = off[key]; pa.setXYZ(i, x * f, y * f, z * f); }
  S.geo(ig, mtx(0, 1.38, 0, 0, 0, 0, 1.22, 1.08, 1.34), function (x, y, z) { return lerpCol(belly, body, U_clamp(0.5 + y * 0.8 + z * 0.1, 0, 1)); }, 0.1, 0);
  [[0.66, 0.7], [-0.66, 0.7], [0.62, -0.72], [-0.62, -0.72]].forEach(function (p) { S.geo(new T.CylinderGeometry(0.3, 0.36, 0.5, 5), mtx(p[0], 0.22, p[1], 0, 0, 0), foot, 0.05, 0); });
  for (let i = 0; i < 6; i++) { const f = i / 5, z = 0.75 - f * 1.75, y = 2.38 - Math.sin(f * 3.1) * 0.06 - f * 0.35, hh = 0.5 - Math.abs(f - 0.4) * 0.35; S.geo(new T.ConeGeometry(0.15, hh, 4), mtx(0, y + hh * 0.35, z, -0.3 - f * 0.4, i, 0), shard, 0.3, 0.9); }
  [-1, 1].forEach(function (sg) {
    S.rod([sg * 0.55, 2.2, 0.3], [sg * 0.82, 2.78, 0.22], 0.17, 0.12, 5, horn, 0.05, 0.1, 0, 0.5);
    S.rod([sg * 0.82, 2.78, 0.22], [sg * 0.68, 3.28, 0.3], 0.12, 0.03, 5, hornT, 0.1, 0.3, 0.5, 1);
    S.rod([sg * 0.8, 2.85, 0.22], [sg * 1.2, 3.18, 0.14], 0.08, 0.02, 4, hornT, 0.1, 0.3, 0.5, 1);
    S.tri([sg * 0.42, 1.62, 1.4, 0.7, 0], [sg * 0.74, 1.74, 1.26, 0.7, 0], [sg * 0.46, 1.5, 1.42, 0.7, 0], lil); S.tri([sg * 0.74, 1.74, 1.26, 0.7, 0], [sg * 0.78, 1.62, 1.24, 0.7, 0], [sg * 0.46, 1.5, 1.42, 0.7, 0], lil); // the eye
    S.tri([sg * 0.34, 1.0, 1.36, 0.2, 0], [sg * 0.05, 1.2, 1.46, 0.2, 0], [sg * 0.05, 0.84, 1.4, 0.2, 0], belly.clone().lerp(horn, 0.4)); // a pale cheek
  });
  S.tri([0, 1.25, 1.5, 0.2, 0], [0.18, 1.0, 1.46, 0.2, 0], [-0.18, 1.0, 1.46, 0.2, 0], horn);
  S.rod([0, 1.0, -1.25], [0, 1.45, -1.95], 0.2, 0.08, 5, body, 0.1, 0.1, 0.3, 1);
  S.geo(new T.ConeGeometry(0.28, 0.6, 5), mtx(0, 1.7, -2.12, -2.2, 0, 0), lil, 0.8, 1);
  const g = new T.Group(), mat = propMat({ em: 0xffffff, emI: 0.9, emV: true, sw: 0.1, side: T.DoubleSide });
  const mo = new T.Mesh(S.build(), mat); mo.frustumCulled = false; g.add(mo);
  H.glowSprite(0xc9a0ff, 2.2, g, 0, 1.6, 1.5);
  return g;
};

/* a fold crane, facing +z, wings out along x, pivoting at the body (g.wl is the +x wing, g.wr the -x wing; the renderer flaps them
   about z). The paper is a pale cream with a darker fold on each face; it glows a little, as the mark of a crease that is ready. */
P.crane = function (t, H) {
  init(t);
  const paper = new T.Color(0xf4e8d6), shadeC = new T.Color(0xd9c8ae), lightC = new T.Color(0xfffaf0), tipC = new T.Color(0xe6b88a);
  const body = new Soup();
  const V = function (x, y, z) { return [x, y, z, 1, 0]; };
  // the body: a folded diamond with a keel below
  const nose = V(0, 0.1, 0.55), tail = V(0, 0.28, -0.9), top = V(0, 0.3, 0), keel = V(0, -0.34, -0.05), lt = V(0.3, 0.02, -0.08), rt = V(-0.3, 0.02, -0.08);
  body.tri(nose, lt, top, paper, shadeC, lightC); body.tri(nose, top, rt, paper, lightC, shadeC);
  body.tri(top, lt, tail, lightC, shadeC, paper); body.tri(top, tail, rt, lightC, paper, shadeC);
  body.tri(nose, keel, lt, paper, shadeC, shadeC); body.tri(nose, rt, keel, paper, shadeC, shadeC);
  body.tri(keel, tail, lt, shadeC, paper, shadeC); body.tri(keel, rt, tail, shadeC, shadeC, paper);
  // the neck lifts from the front, bends, and ends in a head with a beak; the tail is a second raised point
  const n0 = V(0.07, 0.12, 0.45), n1 = V(-0.07, 0.12, 0.45), n2 = V(0.04, 0.78, 0.82), n3 = V(-0.04, 0.78, 0.82), n4 = V(0, 1.0, 1.02), beak = V(0, 0.9, 1.34);
  body.tri(n0, n1, n2, paper, paper, lightC); body.tri(n1, n3, n2, paper, lightC, lightC); body.tri(n2, n3, n4, lightC, lightC, paper);
  body.tri(n2, n4, beak, lightC, paper, tipC); body.tri(n4, n3, beak, paper, lightC, tipC);
  const t0 = V(0.06, 0.22, -0.6), t1 = V(-0.06, 0.22, -0.6), t2 = V(0, 0.72, -1.22);
  body.tri(t0, t1, t2, paper, paper, lightC);
  const mk = function (sg) { // one wing: a long folded triangle, its leading edge fold lighter, its tip bent up
    const w = new Soup(), a = V(0, 0, 0.5), b = V(0, 0.02, -0.46), c = V(sg * 0.6, 0.12, -0.08), d = V(sg * 1.3, 0.78, -0.28), e = V(sg * 1.15, 0.62, 0.12);
    w.tri(a, c, b, lightC, paper, shadeC); w.tri(c, d, b, paper, tipC, shadeC); w.tri(a, e, c, lightC, lightC, paper); w.tri(c, e, d, paper, lightC, tipC);
    return w;
  };
  const cm = propMat({ em: 0xffffff, emI: 0.3, emV: true, sw: 0, side: T.DoubleSide }), g = new T.Group();
  const mb = own(new T.Mesh(body.build(), cm)), ml = own(new T.Mesh(mk(1).build(), cm)), mr = own(new T.Mesh(mk(-1).build(), cm));
  [mb, ml, mr].forEach(function (o) { o.frustumCulled = false; });
  const wl = new T.Group(), wr = new T.Group(); wl.add(ml); wr.add(mr); wl.position.y = wr.position.y = 0.2; g.add(mb); g.add(wl); g.add(wr);
  g.wl = wl; g.wr = wr;
  H.glowSprite(0xffe9a8, 3.2, g, 0, 0.2, 0);
  return g;
};
})();
