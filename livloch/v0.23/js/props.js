/* LIVLOCH · props: the Hush towers, the troopers on both sides, and the rocks. Three.js r128, built by code, no pictures.

   DESIGN
   - Read-only, like gfx.js: shapes and materials only. gfx.js calls in here from a few marked hook lines; nothing in here
     reads the sim except the unit passed to it.
   - Lore drives the shapes. Reign = warm lantern light: a trooper is a small cloaked lantern bearer in a straw hat like the
     heroine's. The Hush = torn tissue paper, the coldest thing on screen, pale lilac eyes, and they steal light: a small one
     is a tissue wraith with a ragged hem, a hollow is a big hunched one, a thief carries the light it took, and a Hush tower
     is a crooked spire of layered torn tissue clutching a cold hoard of light at its top.
   - Cheap: each tower is two meshes (tissue, light) plus its glow sprite and ward; troopers stay instanced; every lantern,
     stolen light and hollow's eyes share one Points draw. Sway is done on the GPU from one time uniform.
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
function reignGeo() {
  const S = new Soup(), r = rng(11), C = function (h) { return new T.Color(h); };
  const cloak = C(REIGN.cloak), team = C(REIGN.team), straw = C(REIGN.straw), strawD = C(REIGN.strawD), ink = C(REIGN.ink), frame = C(REIGN.frame), trim = C(REIGN.trim);
  // boots
  S.geo(new T.BoxGeometry(0.13, 0.24, 0.2), mtx(-0.11, 0.12, 0.02), ink, 0, 0); S.geo(new T.BoxGeometry(0.13, 0.24, 0.2), mtx(0.11, 0.12, 0.02), ink, 0, 0);
  // the cloak: a dark bell with a scalloped paper hem, a gold trim just above it
  S.skirt(r, { seg: 9, rot: 0.2, cx: 0, cz: 0, yTop: 1.16, rTop: 0.19, yMid: 0.6, rMid: 0.36, yBot: 0.2, rBot: 0.44, tear: 0.07, notch: 0.04, colTop: cloak, colHem: cloak.clone().lerp(trim, 0.35), glwTop: 0.05, glwMid: 0.05, glwHem: 0.25, swayHem: 0.35 });
  S.geo(new T.CylinderGeometry(0.205, 0.19, 0.5, 9, 1, false), mtx(0, 0.92, 0), cloak, 0.05, 0); // fills the cloak's top
  // the mantle and scarf: the team's colour, so a crowd reads warm from far off
  S.skirt(r, { seg: 7, rot: 0.25, cx: 0, cz: 0, yTop: 1.37, rTop: 0.12, yMid: 1.25, rMid: 0.25, yBot: 1.1, rBot: 0.33, tear: 0.12, notch: 0.03, colTop: team, colMid: team, colHem: team, glwTop: 0.7, glwMid: 0.6, glwHem: 0.5, swayHem: 0.4 }); // a torn capelet
  // scarf tails streaming behind, in the exact team colour so every look swaps it; they show from behind, where the player stands
  S.strip(r, [-0.1, 1.3, -0.15], [-0.25, -0.62, -0.74], [0.94, 0, -0.3], [0, 0.35, -1], 0.82, 0.2, 4, team, team, 1.2, 0.5, 0.25);
  S.strip(r, [0.07, 1.28, -0.16], [0.08, -0.8, -0.6], [1, 0, 0.1], [0, 0.3, -1], 0.62, 0.15, 3, team, team, 1, 0.4, 0.15);
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
  const body = hollow ? hc.body.clone().multiplyScalar(0.72) : hc.body, edge = hollow ? hc.edge.clone().lerp(hc.body, 0.35) : hc.edge, deep = body.clone().multiplyScalar(0.55);
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
  for (let j = -2; j <= 2; j++) S.strip(r, [j * 0.13, 1.08 - Math.abs(j) * 0.06, -0.3], [j * 0.1, -0.92, -0.38], [1, 0, 0], [0, 0, -1], 0.8 + r() * 0.25, 0.26, 4, body, edge, 1.0, 0.8, 0.05);
  return S.build();
}
/* Eyes: two slanted almond slits. They are their own mesh, unlit and unfogged, so pale lilac eyes read in any night. */
function eyesGeo(y, z, sep, w, h, slant) {
  const S = new Soup(), col = new T.Color(0xf2e2ff);
  [-1, 1].forEach(function (sd) {
    const cx = sd * sep, ca = Math.cos(sd * slant), sa = Math.sin(sd * slant), d = 0.04;
    const pt = function (u, v) { return [cx + u * ca - v * sa, y + u * sa + v * ca, z]; };
    const L = pt(-w / 2, 0), R_ = pt(w / 2, 0), Tp = pt(0, h / 2), B = pt(0, -h / 2), F = [cx, y, z + d];
    S.tri(L, F, Tp, col); S.tri(Tp, F, R_, col); S.tri(R_, F, B, col); S.tri(B, F, L, col);
  });
  return S.build();
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
  const hEyes = ownFn(new T.InstancedMesh(eyesGeo(1.02, 0.47, 0.075, 0.14, 0.05, 0.5), new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, fog: false, side: T.DoubleSide }), 40));
  [reign, lantern, hush, eyes, hollow, hEyes].forEach(function (m) { m.frustumCulled = false; m.count = 0; });
  parent.add(hollow); parent.add(hEyes);
  const glow = new GlowLayer(glowTex, 240, LK); parent.add(glow.mesh);
  crowd = { hollow: hollow, hEyes: hEyes, nh: 0, glow: glow, cLant: tc(0xffb050).clone(), cCarry: tc(0xffd28a).clone(), cSoul: tc(0xffe9a8).clone(), cEye: new T.Color(0x9c84ff), time: 0, reduced: false };
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
})();
