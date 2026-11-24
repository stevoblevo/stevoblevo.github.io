/* LIVLOCH · heroes3d (0.24): the four heroes as small 3D figures with a skeleton, posed every frame from the motion rig.

   DESIGN
   - Why. The owner, playing over the shoulder: the painted cards "wander around and look really terrible" and "it just looks
     dumb". A card can only slide, flip and shear; seen from behind in a valley that is now 3D, it reads as paper. These are
     figurines that run: legs that plant and push, arms that pump, cloth and hair that follow.
   - Built by code from Three.js primitives, like props.js and the fox. One skinned mesh per hero (one draw call; Myra's
     wings are a second, see-through one). Vertex colours, plus one small canvas atlas for what needs drawing (faces, Dora's
     stag, trims, patches). Smooth Phong-lit shading with a lift so a figure reads in a night valley, the view's light as a
     rim on the silhouette (the paper had it on its cut edge), and feet that darken toward the ground.
   - The rig: hips, spine, chest, neck, head; shoulders, elbows, hands; hips, knees, feet; plus cloth panels, a braid,
     pendulums (lantern, hat, yarn, spools) and wings where a hero has them. Driven every frame from LL.paperMotion.pose():
     its phase is distance walked, so a foot lands when the dust puffs and the footstep plays. What only a 3D body needs
     comes from the unit: which way it is actually moving relative to where it faces (strafe, back-pedal), and its aim pitch.
   - Legs: each foot follows a planted-then-swing path along the direction of travel, and two-bone IK bends the knee. A foot
     stays planted for as long as the leg can reach, so the stride is a run at speed and a walk when slow, and a planted
     foot does not skate (the stride length per speed is passed back to the rig as sc.cyc). The hips turn toward the way the
     legs run, up to about 35 degrees; the chest turns back to the aim, so a strafe is a sideways run, not a sliding card.
   - Arms pump against the legs; the gun arm comes up to the aim (the hero's pitch) by IK; Anna winds up and throws.
     Ability poses (stomp, brace, throw), landing squash, the jump, a dash, riding a thread and the fall come from the rig.
   - Cloth: hinged panels around the body that trail on springs (and swing past when you stop) and are pushed out by the
     knees and shins, so legs do not go through skirts. The braid is a verlet chain that keeps off the back. The lantern,
     the hat, yarn and spools are damped pendulums driven by how their anchor accelerates.
   - Looks: colours are authored for the night valley and kept (the view's own drawing pass does the rest, as it did for
     the painted cards); each view sets the lift, saturation, a tint and the rim colour (LOOKP). Hypermetapunk gets a neon
     rim in the side's colour.
   - Presentation only: reads the unit and the pose it is handed, never writes either. Reduced motion: a still figure
     that still turns and aims.
   - Hooks, all marked "0.24 heroes3d": gfx.js heroModel (a figure in place of the paper), the hero loop (stride, pose,
     fall), heroDust (dust under the real foot, afterimages), the Echo (a pale figure), R.setHeroes3d; main.js, ui.js and index.html for the setting
     (LL.cfg.heroes3d, on by default; painted paper stays one click away); motion.js takes sc.cyc. */
(function (G) {
'use strict';
const LL = G.LL;
const H3 = LL.heroes3d = {};
let T = null;
let _v, _v2, _v3, _q, _q2, _q3, _m4, _m4b, _m3, _iv, _ip, _iu, _iy, _iz, _ix, _im, _e, ONE, X_AX, Y_AX, Z_AX, DOWN, I4;
function init(t) {
  if (T === t) return; T = t;
  _v = new T.Vector3(); _v2 = new T.Vector3(); _v3 = new T.Vector3(); _q = new T.Quaternion(); _q2 = new T.Quaternion(); _q3 = new T.Quaternion();
  _m4 = new T.Matrix4(); _m4b = new T.Matrix4(); _m3 = new T.Matrix3(); _iv = new T.Vector3(); _ip = new T.Vector3(); _iu = new T.Vector3();
  _iy = new T.Vector3(); _iz = new T.Vector3(); _ix = new T.Vector3(); _im = new T.Matrix4(); _e = new T.Euler();
  ONE = new T.Vector3(1, 1, 1); X_AX = new T.Vector3(1, 0, 0); Y_AX = new T.Vector3(0, 1, 0); Z_AX = new T.Vector3(0, 0, 1); DOWN = new T.Vector3(0, -1, 0); I4 = new T.Matrix4();
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (k, dt) => 1 - Math.exp(-dt * k);
const frac = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;
const CC = {};
function cl(h) { if (h && h.isColor) return h; let c = CC[h]; if (!c) c = CC[h] = new T.Color(h); return c; }
function mix3(a, b, k) { return _cm.copy(cl(a)).lerp(cl(b), k); }
let _cm = null;

/* ---------- the rig: named bones at bind positions (model space, metres, +z forward, +x the hero's left) ---------- */
function Rig() { this.n = []; this.p = []; this.a = []; this.i = {}; }
Rig.prototype.b = function (name, parent, x, y, z) { this.i[name] = this.n.length; this.n.push(name); this.p.push(parent ? this.i[parent] : -1); this.a.push([x, y, z]); return this; };
function humanoid(P) {
  const r = new Rig();
  r.b('hips', null, 0, P.pelv, 0).b('spine', 'hips', 0, P.spine, 0).b('chest', 'spine', 0, P.chest, 0).b('neck', 'chest', 0, P.neck, 0).b('head', 'neck', 0, P.head, 0);
  [['L', 1], ['R', -1]].forEach(function (s) {
    const k = s[1], n = s[0];
    r.b('thigh' + n, 'hips', k * P.hipW, P.hip, 0).b('shin' + n, 'thigh' + n, k * P.hipW, P.knee, 0).b('foot' + n, 'shin' + n, k * P.hipW, P.ankle, 0);
    r.b('arm' + n, 'chest', k * P.shX, P.shY, 0).b('fore' + n, 'arm' + n, k * P.shX, P.shY - P.upper, 0).b('hand' + n, 'fore' + n, k * P.shX, P.shY - P.upper - P.fore, 0);
  });
  return r;
}

/* ---------- the body: triangles with colour, atlas uv, bone weights, glow and height ---------- */
let WHITE = [0.875, 0.125];
function Body(rig, H) { this.rig = rig; this.H = H; this.P = []; this.N = []; this.C = []; this.U = []; this.SI = []; this.SW = []; this.E = []; this.HH = []; }
Body.prototype.wt = function (spec, x, y, z) {
  let L = typeof spec === 'function' ? spec(x, y, z) : spec;
  if (typeof L === 'string') L = [[L, 1]];
  const arr = [];
  for (let k = 0; k < L.length; k++) { const e = L[k]; if (!(e[1] > 1e-4)) continue; const bi = this.rig.i[e[0]]; if (bi == null) throw new Error('heroes3d: no bone ' + e[0]);
    let f = null; for (let j = 0; j < arr.length; j++) if (arr[j][0] === bi) f = arr[j]; if (f) f[1] += e[1]; else arr.push([bi, e[1]]); }
  arr.sort(function (p, q) { return q[1] - p[1]; }); if (arr.length > 4) arr.length = 4; if (!arr.length) arr.push([0, 1]);
  let s = 0; for (let k = 0; k < arr.length; k++) s += arr[k][1];
  for (let k = 0; k < 4; k++) { const q = arr[k]; this.SI.push(q ? q[0] : 0); this.SW.push(q ? q[1] / s : 0); }
};
/* add a geometry placed by matrix m. col: hex or fn(lx, ly, lz, wx, wy, wz, u, v) -> hex or Color. w: bone name, list or fn(wx, wy, wz).
   o.uv: an atlas rect [u0, v0, u1, v1] for the geometry's own uv (decals); o.em: glow 0..1 (or fn). */
Body.prototype.add = function (geo, m, col, w, o) {
  o = o || {}; m = m || I4;
  const g = geo.index ? geo.toNonIndexed() : geo; if (!g.attributes.normal) g.computeVertexNormals();
  const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, flip = m.determinant() < 0;
  _m3.getNormalMatrix(m);
  const fc = typeof col === 'function' ? null : cl(col);
  for (let t0 = 0; t0 < pa.count; t0 += 3) for (let j = 0; j < 3; j++) {
    const i = t0 + (flip ? [0, 2, 1][j] : j);
    _v.fromBufferAttribute(pa, i); const lx = _v.x, ly = _v.y, lz = _v.z; _v.applyMatrix4(m);
    _v2.fromBufferAttribute(na, i).applyMatrix3(_m3).normalize();
    this.P.push(_v.x, _v.y, _v.z); this.N.push(_v2.x, _v2.y, _v2.z);
    const u = ua ? ua.getX(i) : 0, v = ua ? ua.getY(i) : 0;
    const c = fc || cl(col(lx, ly, lz, _v.x, _v.y, _v.z, u, v)); this.C.push(c.r, c.g, c.b);
    if (o.uv && ua) this.U.push(o.uv[0] + u * (o.uv[2] - o.uv[0]), o.uv[1] + v * (o.uv[3] - o.uv[1])); else this.U.push(WHITE[0], WHITE[1]);
    this.wt(w, _v.x, _v.y, _v.z);
    this.E.push(typeof o.em === 'function' ? o.em(lx, ly, lz) : (o.em || 0)); this.HH.push(_v.y / this.H);
  }
  return this;
};
Body.prototype.build = function () {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(this.P, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(this.C, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(this.U, 2));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(this.SI, 4));
  g.setAttribute('skinWeight', new T.Float32BufferAttribute(this.SW, 4));
  g.setAttribute('aEm', new T.Float32BufferAttribute(this.E, 1));
  g.setAttribute('aH', new T.Float32BufferAttribute(this.HH, 1));
  g.boundingSphere = new T.Sphere(new T.Vector3(0, this.H / 2, 0), this.H);
  g.userData.lk = true;
  return g;
};

/* ---------- shapes ---------- */
function M(x, y, z, rx, ry, rz, sx, sy, sz) { _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _v3.set(x || 0, y || 0, z || 0); _v2.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz); return new T.Matrix4().compose(_v3, _q, _v2); }
function sph(ws, hs) { return new T.SphereGeometry(1, Math.min(ws || 10, 10), Math.min(hs || 7, 7)); }
/* a tapered capsule from p to q (radii r0 at p, r1 at q), baked */
function capG(p, q, r0, r1, seg, rings) {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], L = Math.hypot(dx, dy, dz) || 1e-3, n = rings || 2, pts = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, r1 * Math.cos(a)), -L + r1 * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(1e-4, r0 * Math.cos(a)), r0 * Math.sin(a))); }
  const g = new T.LatheGeometry(pts, Math.min(seg || 8, 8));
  _v.set(dx / L, dy / L, dz / L); _q.setFromUnitVectors(DOWN, _v);
  g.applyMatrix4(new T.Matrix4().compose(_v3.set(p[0], p[1], p[2]), _q, ONE));
  return g;
}
/* a shell of rings (cloth, a torso, a hat): rows [[y, rx, rz, cz, cx]] from top to bottom, azimuth a0..a1 measured from +z
   toward +x. Smooth normals (closed rings are averaged across the seam). o.tile: columns per repeat of a decal band. */
function shellG(rows, seg, a0, a1, o) {
  o = o || {}; const nr = rows.length, nc = seg + 1, pos = [], uv = [], idx = [], cid = [];
  for (let r = 0; r < nr; r++) for (let k = 0; k < nc; k++) {
    const R = rows[r], A0 = typeof a0 === 'function' ? a0(R[0]) : a0, A1 = typeof a1 === 'function' ? a1(R[0]) : a1, a = A0 + (A1 - A0) * k / seg; // 0.24.1: a0/a1 may vary by row (y), for a vent
    pos.push((R[4] || 0) + R[1] * Math.sin(a), R[0], (R[3] || 0) + R[2] * Math.cos(a)); uv.push(k / seg, 1 - r / Math.max(1, nr - 1)); cid.push(k);
  }
  for (let r = 0; r < nr - 1; r++) for (let k = 0; k < seg; k++) { const A = r * nc + k, B = A + 1, Cc = A + nc, D = Cc + 1; idx.push(A, Cc, B, B, Cc, D); }
  let g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('cid', new T.Float32BufferAttribute(cid, 1)); g.setIndex(idx); g.computeVertexNormals();
  if (typeof a0 !== 'function' && typeof a1 !== 'function' && Math.abs(a1 - a0 - TAU) < 1e-3) { const n = g.attributes.normal; for (let r = 0; r < nr; r++) { const i0 = r * nc, i1 = r * nc + seg; _v.fromBufferAttribute(n, i0).add(_v2.fromBufferAttribute(n, i1)).normalize(); n.setXYZ(i0, _v.x, _v.y, _v.z); n.setXYZ(i1, _v.x, _v.y, _v.z); } }
  if (o.tile) { g = g.toNonIndexed(); const U = g.attributes.uv, Cd = g.attributes.cid;
    for (let t = 0; t < U.count; t += 3) { const k0 = Math.min(Cd.getX(t), Cd.getX(t + 1), Cd.getX(t + 2)), base = Math.floor(k0 / o.tile) * o.tile;
      for (let j = 0; j < 3; j++) U.setX(t + j, (Cd.getX(t + j) - base) / o.tile); } }
  return g;
}
/* radius of a shell profile at height y along azimuth a (for decals and for keeping cloth off the legs) */
function shellR(rows, y, a) {
  let i = 0; while (i < rows.length - 2 && rows[i + 1][0] > y) i++;
  const A = rows[i], B = rows[i + 1], k = clamp((A[0] - y) / ((A[0] - B[0]) || 1), 0, 1);
  const rx = A[1] + (B[1] - A[1]) * k, rz = A[2] + (B[2] - A[2]) * k, cz = (A[3] || 0) + ((B[3] || 0) - (A[3] || 0)) * k;
  return { x: rx * Math.sin(a), z: cz + rz * Math.cos(a), r: Math.hypot(rx * Math.sin(a), rz * Math.cos(a)), cz: cz };
}
/* rows offset outward by d (for a band or decal lying on a shell) */
function shellOut(rows, d, y0, y1, n) { const out = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n, A = shellR(rows, y, 0), B = shellR(rows, y, Math.PI / 2); out.push([y, B.r + d, A.r - A.cz + d, A.cz]); } return out; }

/* ---------- the atlas: faces, the stag, trims, patches (4 x 4 cells of 128 px; cell 15 is plain white) ---------- */
let ATLAS = null;
function cellUV(k, pad) { const cx = k % 4, cy = Math.floor(k / 4), p = pad == null ? 0.004 : pad; return [cx / 4 + p, 1 - (cy + 1) / 4 + p, (cx + 1) / 4 - p, 1 - cy / 4 - p]; }
function atlas() {
  if (ATLAS) return ATLAS;
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const at = function (k, fn) { g.save(); g.translate((k % 4) * 128, Math.floor(k / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); fn(g); g.restore(); };
  at(15, function (g) { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); });
  const eye = function (g, x, y, rx, ry, iris, lash) { g.fillStyle = '#fff8f0'; g.beginPath(); g.ellipse(x, y, rx * 1.05, ry, 0, 0, TAU); g.fill(); g.fillStyle = iris; g.beginPath(); g.ellipse(x, y + ry * 0.12, rx * 0.86, ry * 0.86, 0, 0, TAU); g.fill();
    g.fillStyle = '#1a0f12'; g.beginPath(); g.ellipse(x, y + ry * 0.18, rx * 0.45, ry * 0.5, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - rx * 0.3, y - ry * 0.3, rx * 0.28, 0, TAU); g.fill();
    if (lash) { g.strokeStyle = lash; g.lineWidth = 1.8; g.beginPath(); g.ellipse(x, y - ry * 0.05, rx * 1.12, ry * 1.1, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } };
  const blush = function (g, x, y, r, c) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(255,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const smile = function (g, x, y, w, c, lw) { g.strokeStyle = c; g.lineWidth = lw || 2.2; g.lineCap = 'round'; g.beginPath(); g.arc(x, y - w * 0.6, w, Math.PI * 0.3, Math.PI * 0.7); g.stroke(); };
  // 1 Dora's face: brown eyes, soft brows, a small smile
  at(1, function (g) { eye(g, 36, 62, 13, 16, '#5a2e1a', '#2a160f'); eye(g, 92, 62, 13, 16, '#5a2e1a', '#2a160f'); g.strokeStyle = '#4a2c20'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 38); g.quadraticCurveTo(36, 32, 48, 38); g.moveTo(80, 38); g.quadraticCurveTo(92, 32, 104, 38); g.stroke();
    blush(g, 20, 84, 13, 'rgba(240,110,100,0.6)'); blush(g, 108, 84, 13, 'rgba(240,110,100,0.6)'); smile(g, 64, 98, 10, '#8a3a2a', 3); });
  // 2 Anna's face: green eyes, freckles
  at(2, function (g) { eye(g, 36, 62, 12, 15, '#2f6a3a', '#3a1a10'); eye(g, 92, 62, 12, 15, '#2f6a3a', '#3a1a10'); g.strokeStyle = '#a8461f'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, 40); g.quadraticCurveTo(36, 34, 48, 40); g.moveTo(80, 40); g.quadraticCurveTo(92, 34, 104, 40); g.stroke();
    g.fillStyle = 'rgba(160,80,40,0.8)'; [[24, 82], [31, 86], [19, 88], [104, 82], [97, 86], [109, 88], [27, 78], [101, 78]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 2, 0, TAU); g.fill(); });
    blush(g, 22, 86, 12, 'rgba(240,110,100,0.45)'); blush(g, 106, 86, 12, 'rgba(240,110,100,0.45)'); smile(g, 64, 98, 10, '#8a3a2a', 3); });
  // 3 Myra's face: round dark eyes, a big smile, pink cheeks
  at(3, function (g) { eye(g, 36, 62, 13, 15, '#2a0f1e', '#2a1020'); eye(g, 92, 62, 13, 15, '#2a0f1e', '#2a1020'); blush(g, 18, 86, 16, 'rgba(240,100,150,0.65)'); blush(g, 110, 86, 16, 'rgba(240,100,150,0.65)'); smile(g, 64, 96, 13, '#6a2040', 3.4); });
  // 4 the Skein Doll's face: button eyes, a stitched smile, a seam down the middle
  at(4, function (g) { [[36, 60], [92, 60]].forEach(function (p) { g.fillStyle = '#4a2814'; g.beginPath(); g.arc(p[0], p[1], 15, 0, TAU); g.fill(); g.fillStyle = '#6e4024'; g.beginPath(); g.arc(p[0], p[1], 11, 0, TAU); g.fill();
      g.strokeStyle = '#f2e6cc'; g.lineWidth = 3; g.beginPath(); g.moveTo(p[0] - 5, p[1] - 5); g.lineTo(p[0] + 5, p[1] + 5); g.moveTo(p[0] + 5, p[1] - 5); g.lineTo(p[0] - 5, p[1] + 5); g.stroke(); });
    g.strokeStyle = 'rgba(150,110,80,0.8)'; g.lineWidth = 1.6; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.stroke(); g.setLineDash([]);
    blush(g, 24, 78, 10, 'rgba(230,130,100,0.5)'); blush(g, 104, 78, 10, 'rgba(230,130,100,0.5)');
    g.strokeStyle = '#5a2e18'; g.lineWidth = 3; g.beginPath(); g.arc(64, 84, 15, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    for (let k = 0; k < 5; k++) { const a = Math.PI * (0.25 + k * 0.125), x = 64 + Math.cos(a) * 15, y = 84 + Math.sin(a) * 15; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.stroke(); } });
  // 0 Dora's stag, gold, front-facing, antlers spread (drawn for a patch about 1.25 times as tall as wide)
  at(0, function (g) { g.fillStyle = '#f0b84e'; g.strokeStyle = '#f0b84e'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.save(); g.translate(64, 0); g.scale(1, 1);
    g.beginPath(); g.ellipse(0, 86, 15, 12, 0, 0, TAU); g.fill(); // body
    g.lineWidth = 5; [[-10, 92, -12, 124], [-4, 94, -5, 124], [4, 94, 5, 124], [10, 92, 12, 124]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); });
    g.beginPath(); g.moveTo(-7, 80); g.lineTo(-5, 56); g.lineTo(5, 56); g.lineTo(7, 80); g.closePath(); g.fill(); // neck
    g.beginPath(); g.ellipse(0, 50, 8, 11, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-9, 44, 6, 2.6, -0.5, 0, TAU); g.ellipse(9, 44, 6, 2.6, 0.5, 0, TAU); g.fill(); // head, ears
    g.lineWidth = 3.4; [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 4, 41); g.quadraticCurveTo(s * 16, 26, s * 30, 6); g.stroke();
      [[s * 10, 32, s * 4, 16], [s * 17, 24, s * 13, 6], [s * 23, 16, s * 34, 18], [s * 15, 28, s * 30, 30]].forEach(function (b) { g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[2], b[3]); g.stroke(); }); });
    g.restore(); });
  // 5 Myra's chest: a spool and an infinity knot, gold, with cross stitches either side
  at(5, function (g) { g.fillStyle = '#eab24a'; g.strokeStyle = '#eab24a'; g.lineWidth = 3; g.fillRect(44, 20, 40, 7); g.fillRect(44, 58, 40, 7); g.fillRect(50, 27, 28, 31);
    g.strokeStyle = '#c4882a'; g.lineWidth = 1.5; for (let y = 31; y < 56; y += 4) { g.beginPath(); g.moveTo(50, y); g.lineTo(78, y); g.stroke(); }
    g.strokeStyle = '#eab24a'; g.lineWidth = 3.2; g.beginPath(); g.ellipse(52, 84, 12, 8, 0, 0, TAU); g.ellipse(76, 84, 12, 8, 0, 0, TAU); g.stroke();
    g.lineWidth = 2.6; [18, 110].forEach(function (x) { for (let y = 16; y < 120; y += 18) { g.beginPath(); g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.moveTo(x + 5, y - 5); g.lineTo(x - 5, y + 5); g.stroke(); } }); });
  // 6 Dora's hem: gold scrollwork, tiles left to right
  at(6, function (g) { g.strokeStyle = '#f0b84e'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 112); g.lineTo(128, 112); g.stroke(); g.lineWidth = 4;
    g.beginPath(); for (let x = 0; x <= 128; x += 2) { const y = 66 + Math.sin(x / 128 * TAU) * 22; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    [[32, 44, 1], [96, 88, -1]].forEach(function (c) { g.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU * 1.2, r = 16 - k * 0.32; const x = c[0] + Math.cos(a) * r * c[2], y = c[1] + Math.sin(a) * r; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); });
    g.fillStyle = '#f0b84e'; [[64, 66], [0, 66], [128, 66]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] - 16); g.lineTo(p[0] + 6, p[1]); g.lineTo(p[0], p[1] + 16); g.lineTo(p[0] - 6, p[1]); g.closePath(); g.fill(); }); });
  // 7 dashed stitching across the middle, gold (Myra)
  at(7, function (g) { g.strokeStyle = '#f2b84a'; g.lineWidth = 16; g.beginPath(); [[6, 38], [70, 102]].forEach(function (d) { g.moveTo(d[0], 64); g.lineTo(d[1], 64); }); g.stroke(); });
  // 8 Anna's hem: gold hills, tiles
  at(8, function (g) { g.strokeStyle = '#e2b04a'; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= 128; x += 2) { const y = 76 - Math.abs(Math.sin(x / 128 * Math.PI * 2)) * 34; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    g.lineWidth = 3.5; g.beginPath(); for (let x = 0; x <= 128; x += 2) { const y = 100 - Math.abs(Math.sin(x / 128 * Math.PI * 2 + 1.2)) * 22; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); });
  // 9 pale dashed stitching (the Skein Doll)
  at(9, function (g) { g.strokeStyle = '#f6ead2'; g.lineWidth = 14; g.beginPath(); [[8, 40], [72, 104]].forEach(function (d) { g.moveTo(d[0], 64); g.lineTo(d[1], 64); }); g.stroke(); });
  // 10 Dora's front panels: a gold tree
  at(10, function (g) { g.strokeStyle = '#f0b84e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 124); g.lineTo(64, 10); g.stroke(); g.lineWidth = 3.5;
    for (let k = 0; k < 6; k++) { const y = 100 - k * 16, w = 36 - k * 4; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 - w * 0.5, y - 6, 64 - w, y - 18); g.moveTo(64, y); g.quadraticCurveTo(64 + w * 0.5, y - 6, 64 + w, y - 18); g.stroke(); } });
  // 11 a patch, sewn on (the Skein Doll)
  at(11, function (g) { g.fillStyle = '#b08a58'; g.fillRect(10, 10, 108, 108); g.fillStyle = 'rgba(80,50,30,0.25)'; for (let k = 0; k < 40; k++) g.fillRect((k * 37) % 100 + 14, (k * 53) % 100 + 14, 6, 2);
    g.strokeStyle = '#f6ead2'; g.lineWidth = 4; g.setLineDash([9, 7]); g.strokeRect(18, 18, 92, 92); g.setLineDash([]); });
  // 12 Anna's buttons and buckle: a gold disc
  at(12, function (g) { g.fillStyle = '#e2b04a'; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.fill(); g.fillStyle = '#b8862e'; g.beginPath(); g.arc(64, 64, 30, 0, TAU); g.fill(); });
  // 13 straw: woven panels and rings, pale so the vertex colour tints it
  at(13, function (g) { g.fillStyle = '#f4eee4'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(120,80,40,0.10)'; for (let k = 0; k < 90; k++) g.fillRect((k * 53) % 128, (k * 29) % 128, 9, 2);
    g.strokeStyle = 'rgba(120,80,35,0.42)'; g.lineWidth = 1.4; for (let x = 0; x <= 128; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
    g.strokeStyle = 'rgba(120,80,35,0.24)'; g.lineWidth = 1.1; for (let y = 6; y < 128; y += 13) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    g.fillStyle = 'rgba(90,50,20,0.7)'; g.fillRect(0, 118, 128, 10); });
  ATLAS = new T.CanvasTexture(cv); ATLAS.anisotropy = 4;
  return ATLAS;
}
/* a patch lying on a sphere (a face): same matrix as the sphere, r slightly larger, centred on +z */
function facePatch(w, h, down, seg) { return new T.SphereGeometry(1.012, seg || 9, seg || 7, Math.PI / 2 - w / 2, w, Math.PI / 2 - h / 2 + (down || 0), h); }

/* ---------- materials ---------- */
/* Per view (by its drawing pass index): lift, light gain, saturation, tint, rim strength. */
const LOOKP = {
  0: { lift: 0.26, gain: 0.62, key: 0.52, sat: 0.94, tint: [1, 1, 1], rimK: 0.6 },          // Cobalt Snow (its pass adds saturation)
  1: { lift: 0.34, gain: 0.55, key: 0.55, sat: 0.85, tint: [1, 1, 1], rimK: 0.45 },         // Inkblot Noir (its pass turns this to tone)
  2: { lift: 0.2, gain: 0.66, key: 0.35, sat: 0.95, tint: [1, 1, 1], rimK: 0.15 },          // Origami, daylight
  3: { lift: 0.28, gain: 0.6, key: 0.5, sat: 0.92, tint: [0.96, 0.98, 1.04], rimK: 0.5 },   // Knight Night
  4: { lift: 0.18, gain: 0.55, key: 0.4, sat: 1.1, tint: [1, 1, 1], rimK: 1.25, team: true }, // Hypermetapunk: a neon rim in the side's colour
  5: { lift: 0.28, gain: 0.66, key: 0.5, sat: 1.0, tint: [1, 1, 1], rimK: 0.55 },           // Lantern Night
  6: { lift: 0.3, gain: 0.6, key: 0.5, sat: 0.72, tint: [1.03, 1.0, 0.94], rimK: 0.4 },     // Memory
  7: { lift: 0.28, gain: 0.62, key: 0.5, sat: 0.95, tint: [1.04, 0.96, 0.95], rimK: 0.55 }  // Rainwake
};
function lookP(LK, team) {
  const p = LOOKP[LK && LK.post != null ? LK.post : 0] || LOOKP[0];
  const rim = new T.Color(p.team ? LK.team[team || 0] : (LK.rim != null ? LK.rim : (LK.sun ? LK.sun[0] : 0xffe0b0)));
  return { lift: p.lift, gain: p.gain, key: p.key, sat: p.sat, tint: new T.Vector3(p.tint[0], p.tint[1], p.tint[2]), rim: rim, rimK: p.rimK, emK: 1.6 };
}
function heroMat(lp) {
  const m = new T.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, map: atlas(), alphaTest: 0.5, side: T.DoubleSide, skinning: true, shininess: 2, specular: 0x000000 });
  const U = { uRim: { value: lp.rim }, uRimK: { value: lp.rimK }, uLift: { value: lp.lift }, uGain: { value: lp.gain }, uSat: { value: lp.sat }, uTint: { value: lp.tint }, uEmK: { value: lp.emK }, uKey: { value: lp.key } };
  m.onBeforeCompile = function (sh) {
    for (const k in U) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEm;\nattribute float aH;\nvarying float vEm;\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEm = aEm; vH = aH;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform float uLift; uniform float uGain; uniform float uSat; uniform vec3 uTint; uniform float uEmK; uniform float uKey;\nvarying float vEm;\nvarying float vH;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat) * uTint;')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;', [
        'vec3 outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * uGain + diffuseColor.rgb * uLift;',
        'outgoingLight += diffuseColor.rgb * uKey * max(dot(normal, normalize(vec3(-0.75, 0.5, 0.45))), 0.0);', // a key light from the camera's upper left, so a back seen from behind still has form
        'if (!gl_FrontFacing) outgoingLight *= 0.62;', // the inside of cloth and hats
        'outgoingLight *= mix(0.58, 1.0, smoothstep(0.0, 0.17, vH));', // contact darkness toward the ground
        'vec3 hv = normalize(vViewPosition); float fr = 1.0 - clamp(abs(dot(normal, hv)), 0.0, 1.0);',
        'float rim = smoothstep(0.52, 0.96, fr) * clamp(normal.y * 0.65 + 0.55, 0.0, 1.0);',
        'outgoingLight += uRim * rim * uRimK * (0.3 + 0.7 * smoothstep(0.2, 0.75, vH));',
        'outgoingLight += diffuseColor.rgb * vEm * uEmK;'].join('\n'));
  };
  m.customProgramCacheKey = function () { return 'hero3d1'; };
  m.userData.lk = m.userData.bl = m.userData.solid = true;
  return m;
}

/* ---------- body parts shared by everyone ---------- */
function torsoW(P) { return function (x, y) { const a = ss(P.pelv - 0.02, P.spine + 0.05, y), b = ss(P.spine + 0.02, P.chest + 0.06, y), c = ss(P.neck - 0.06, P.neck + 0.02, y);
  return [['hips', 1 - a], ['spine', a * (1 - b)], ['chest', a * b * (1 - c)], ['neck', a * b * c]]; }; }
function legs(B, P, o) {
  [1, -1].forEach(function (k) {
    const s = k > 0 ? 'L' : 'R', x = k * P.hipW;
    B.add(capG([x, P.hip + 0.05, 0], [x, P.knee, 0], o.thighR, o.kneeR, 10, 3), null, o.thigh, 'thigh' + s);
    B.add(capG([x, P.knee, 0], [x, P.ankle + 0.02, 0], o.kneeR, o.ankleR, 10, 3), null, function (lx, ly, lz, wx, wy, wz) { return wy < o.bootTop ? o.boot : o.shin; }, 'shin' + s);
    if (o.bootTop > P.ankle + 0.05) { // the boot shaft, a little wider, with laces or a cuff
      B.add(capG([x, o.bootTop, 0], [x, P.ankle + 0.03, 0], o.bootR, o.ankleR + 0.012, 10, 2), null, function (lx, ly, lz, wx, wy, wz) {
        const a = Math.atan2(wx - x, wz);
        if (o.cuff && wy > o.bootTop - o.cuff) return o.bootCuff || o.boot;
        if (o.lace && Math.abs(a) < 0.9) { const f = frac((wy - P.ankle) * 13 + Math.abs(a) * 0.9); if (f < 0.22) return o.lace; }
        if (o.laceBack && Math.abs(Math.abs(a) - Math.PI) < 0.8) { const f = frac((wy - P.ankle) * 13 + Math.abs(Math.abs(a) - Math.PI) * 0.9); if (f < 0.2) return o.laceBack; }
        return o.boot; }, 'shin' + s);
    }
    // the foot: a boot toe pointing forward, flat soled
    B.add(sph(12, 8), M(x, P.ankle - 0.025, P.foot * 0.38, 0, 0, 0, o.footW, o.footH || 0.06, P.foot * 0.85), function (lx, ly) { return ly < -0.55 ? (o.sole || 0x2a1a14) : o.boot; }, 'foot' + s);
  });
}
function arms(B, P, o) {
  [1, -1].forEach(function (k) {
    const s = k > 0 ? 'L' : 'R', x = k * P.shX, eY = P.shY - P.upper, wY = eY - P.fore;
    if (o.puff) B.add(sph(12, 9), M(x + k * 0.01, P.shY - P.upper * 0.48, 0, 0, 0, 0, o.puff, P.upper * 0.62, o.puff * 0.95), o.upper, function (wx, wy) { return wy > P.shY - 0.03 ? [['arm' + s, 0.8], ['chest', 0.2]] : 'arm' + s; });
    else B.add(capG([x, P.shY + 0.02, 0], [x, eY, 0], o.upperR, o.elbowR, 10, 3), null, o.upper, 'arm' + s);
    B.add(capG([x, eY + 0.02, 0], [x, wY, 0], o.elbowR, o.wristR, 10, 3), null, function (lx, ly, lz, wx, wy) { return o.cuff && wy < wY + o.cuffH ? o.cuff : (o.foreTop && wy > eY - o.foreTopH ? o.foreTop : o.fore); }, 'fore' + s);
    B.add(sph(8, 6), M(x, wY - o.handR * 0.75, 0.01, 0, 0, 0, o.handR * 0.9, o.handR * 1.1, o.handR), o.hand, 'hand' + s);
    if (o.cuffRing) B.add(new T.TorusGeometry(o.wristR + 0.008, 0.016, 4, 9), M(x, wY + 0.02, 0, Math.PI / 2), o.cuffRing, 'fore' + s);
  });
}
function headBall(B, P, o) {
  B.add(capG([0, P.neck + 0.02, 0], [0, P.head + 0.04, 0.0], o.neckR || 0.06, o.neckR || 0.06, 8, 2), null, o.skin, [['neck', 0.6], ['head', 0.4]]);
  const S = o.shape || [1, 0.96, 0.95];
  B.add(new T.SphereGeometry(1, 14, 10), M(0, P.headC, 0.01, 0, 0, 0, P.headR * S[0], P.headR * S[1], P.headR * S[2]), o.skin, 'head');
  if (o.face != null) B.add(facePatch(o.fw || 1.5, o.fh || 1.0, o.fd || 0.12), M(0, P.headC, 0.01, 0, 0, 0, P.headR * S[0], P.headR * S[1], P.headR * S[2]), 0xffffff, 'head', { uv: cellUV(o.face) });
}

/* ---------- cloth panels: hinged around the body, trailing on springs, pushed out by the legs ---------- */
/* spec: name, parent (bone), rows (the cloth's shell profile, for radii), pivot (y of the hinge ring), mid (y of a second hinge
   for long cloth, or null), hem (y), groups: [{ lo, hi, az: [..] (ascending, radians from +z toward +x), wrap }]. */
function addPanels(rig, P, sp) {
  sp.list = [];
  sp.groups.forEach(function (gr) { gr.idx = gr.az.map(function (a) {
    const i = sp.list.length, p = shellR(sp.rows, sp.pivot, a), pa = rig.a[rig.i[sp.parent]];
    rig.b(sp.name + i, sp.parent, p.x * 0.92, sp.pivot, p.z * 0.92 + (1 - 0.92) * p.cz);
    let m = null; if (sp.mid != null) { const q = shellR(sp.rows, sp.mid, a); rig.b(sp.name + i + 'b', sp.name + i, q.x, sp.mid, q.z); m = sp.name + i + 'b'; }
    sp.list.push({ a: a, top: sp.name + i, low: m, rx: Math.sin(a), rz: Math.cos(a), pa: pa });
    return i; }); });
}
function panelW(sp, topBone) {
  return function (x, y, z) {
    let a = Math.atan2(x, z - (sp.cz || 0)); if (a < 0) a += TAU;
    let gr = null; for (const g of sp.groups) if (a >= g.lo && a <= g.hi) gr = g; if (!gr) gr = sp.groups[0];
    const L = gr.az.map(function (q) { return q < 0 ? q + TAU : q; }), n = L.length; let i0 = 0, i1 = 0, f = 0;
    if (gr.wrap) { for (let i = 0; i < n; i++) { const j = (i + 1) % n, a0 = L[i], a1 = j ? L[j] : L[j] + TAU, aa = a < a0 ? a + TAU : a; if (aa >= a0 && aa <= a1) { i0 = i; i1 = j; f = (aa - a0) / (a1 - a0); } } }
    else if (a <= L[0]) { i0 = i1 = 0; } else if (a >= L[n - 1]) { i0 = i1 = n - 1; } else { for (let i = 0; i < n - 1; i++) if (a >= L[i] && a <= L[i + 1]) { i0 = i; i1 = i + 1; f = (a - L[i]) / (L[i + 1] - L[i]); } }
    const A = sp.list[gr.idx[i0]], Bp = sp.list[gr.idx[i1]], h = clamp((sp.top - y) / (sp.top - sp.hem), 0, 1.2);
    const s1 = ss(0, sp.firm || 0.3, h), s2 = sp.mid != null ? ss(0.42, 0.85, h) : 0;
    const out = [[topBone, 1 - s1]];
    out.push([A.top, s1 * (1 - s2) * (1 - f)], [Bp.top, s1 * (1 - s2) * f]);
    if (A.low) out.push([A.low, s1 * s2 * (1 - f)], [Bp.low, s1 * s2 * f]);
    return out;
  };
}

/* ---------- the four ---------- */
const HERO = {};
/* DORA. The key art: a wide conical straw hat, a long red cloak with a gold stag on the back, a lantern, laced boots. The
   lantern is her gun (Lantern bolts), carried in the right hand, so it shows over the shoulder the camera looks past. */
HERO.dora = {
  P: { H: 2.45, ankle: 0.115, knee: 0.56, hip: 1.0, hipW: 0.115, pelv: 1.05, spine: 1.17, chest: 1.33, neck: 1.54, head: 1.62, headC: 1.84, headR: 0.245,
    shY: 1.45, shX: 0.235, upper: 0.27, fore: 0.24, foot: 0.155 },
  two: true, item: 'lantern',
  /* 0.24.1: the hem rides above the knee and the back is vented from the seat down (a riding cloak), so from behind the
     stride shows through: knees and boots, not a red bell bobbing. VY is where the vent starts, VG its half-angle at the hem. */
  cloak: { name: 'ck', parent: 'chest', pivot: 1.42, mid: 0.98, hem: 0.64, top: 1.5, firm: 0.25, VY: 0.9, VG: 0.46,
    rows: [[1.56, 0.12, 0.11, -0.01], [1.5, 0.19, 0.16, -0.02], [1.42, 0.23, 0.2, -0.03], [1.3, 0.24, 0.215, -0.04], [1.12, 0.27, 0.24, -0.05], [0.94, 0.31, 0.275, -0.06], [0.8, 0.345, 0.3, -0.07], [0.7, 0.37, 0.318, -0.08], [0.64, 0.385, 0.328, -0.08]],
    a0: 0.62, a1: TAU - 0.62, groups: [{ lo: 0, hi: TAU, az: [0.95, 1.85, Math.PI, TAU - 1.85, TAU - 0.95] }] },
  chains: [{ pre: 'sl', n: 4, seg: 0.13 }, { pre: 'sr', n: 4, seg: 0.12 }],
  rig: function (r, P) {
    r.b('hat', 'head', 0, P.headC + 0.14, 0);
    [['sl', 0.05, 0.0], ['sr', -0.04, 0.02]].forEach(function (c) { let par = 'chest'; for (let i = 0; i < 4; i++) { r.b(c[0] + i, par, c[1] + c[1] * i * 0.4, 1.5 - i * 0.125, -0.25 - c[2] - i * 0.03); par = c[0] + i; } });
    r.b('lant', 'handR', -P.shX, P.shY - P.upper - P.fore - 0.07, 0.02);
    addPanels(r, P, this.cloak); this.cloak.cz = -0.05;
    const ck = this.cloak; this.chains.forEach(function (c) { c.back = [[1.6, 0.2, 0.2, -0.02]].concat(ck.rows.slice(1)); c.trail = ck.pivot; });
  },
  body: function (B, P) {
    const red = 0x9c2028, redD = 0x741820, gold = 0xe8b04a, tunic = 0x34426a, pant = 0x4e4a62, boot = 0x8e5430, sleeve = 0xf0dcbc, cuff = 0x2e3452, skin = 0xe8b390, hair = 0x4a2c20;
    legs(B, P, { thighR: 0.1, kneeR: 0.088, ankleR: 0.07, thigh: pant, shin: pant, boot: boot, bootTop: 0.38, bootR: 0.092, lace: gold, laceBack: gold, footW: 0.088, footH: 0.068, sole: 0x3a2414, cuff: 0.035, bootCuff: 0xa86638 });
    // torso and tunic (navy, mostly under the cloak; it shows in front between the panels)
    const tw = torsoW(P);
    B.add(shellG([[P.neck + 0.03, 0.07, 0.07], [P.shY + 0.03, 0.16, 0.12], [P.chest, 0.19, 0.14], [P.spine, 0.175, 0.13], [P.pelv, 0.19, 0.145], [P.hip - 0.02, 0.2, 0.15]], 16, 0, TAU), null, tunic, tw);
    B.add(shellG([[P.hip + 0.02, 0.2, 0.15], [0.86, 0.23, 0.18], [0.74, 0.25, 0.2]], 16, 0, TAU), null, function (lx, ly, lz, wx, wy) { return wy < 0.79 ? gold : tunic; }, function (x, y, z) { const k = ss(0.95, 0.75, y); return [['hips', 1 - k * 0.6], [x > 0 ? 'thighL' : 'thighR', k * 0.6]]; });
    B.add(new T.TorusGeometry(0.195, 0.025, 4, 14), M(0, 1.12, 0, Math.PI / 2, 0, 0, 1, 0.76, 1), 0x6a4428, 'spine');
    arms(B, P, { puff: 0.095, upper: sleeve, elbowR: 0.07, wristR: 0.058, fore: sleeve, cuff: cuff, cuffH: 0.07, hand: skin, handR: 0.06, cuffRing: gold });
    headBall(B, P, { skin: skin, face: 1, neckR: 0.065 });
    // hair: a dark bob, open at the face; bangs under the brim
    B.add(new T.SphereGeometry(1, 14, 9, Math.PI / 2 + 0.95, TAU - 1.9, 0, 2.05), M(0, P.headC + 0.015, -0.005, 0, 0, 0, P.headR * 1.1, P.headR * 1.08, P.headR * 1.08), hair, 'head');
    B.add(new T.SphereGeometry(1, 12, 4, 0, TAU, 0, 1.05), M(0, P.headC + 0.03, 0.01, 0.12, 0, 0, P.headR * 1.07, P.headR * 1.04, P.headR * 1.08), hair, 'head');
    // the scarf: a thick red roll round the neck, a fold hanging down the back
    B.add(shellG([[1.68, 0.11, 0.1, 0.0], [1.64, 0.17, 0.16, -0.005], [1.58, 0.21, 0.19, -0.01], [1.52, 0.22, 0.2, -0.02], [1.47, 0.2, 0.18, -0.02], [1.45, 0.15, 0.13, -0.02]], 18, 0, TAU), null, 0xc4302e, [['chest', 0.7], ['neck', 0.3]]);
    B.add(sph(8, 6), M(0.0, 1.5, -0.22, 0, 0, 0, 0.08, 0.065, 0.06), 0xc4302e, 'chest'); // the knot at the back, and its two tails
    [['sl', 0.05, 0.0, 0.1], ['sr', -0.04, 0.02, 0.09]].forEach(function (c) { for (let i = 0; i < 4; i++) { const y0 = 1.5 - i * 0.125, y1 = y0 - 0.125, x0 = c[1] + c[1] * i * 0.4, w = c[3] * (1 - i * 0.12);
      const g = new T.PlaneGeometry(w, 0.13, 1, 1); B.add(g, M(x0 + c[1] * 0.2, (y0 + y1) / 2, -0.255 - c[2] - i * 0.03 - 0.015, 0.25, 0, 0), function (lx, ly) { return i === 3 && ly < -0.03 ? 0xe8b04a : 0xc8302c; }, c[0] + i); } });
    // the cloak: red, open at the front, gold at the hem and the front edges; weighted to its panels
    const ck = this.cloak, rows = ck.rows, pw = panelW(ck, 'chest');
    const vg = function (y) { return ck.VG * ss(ck.VY, ck.hem, y); }, vL = function (y) { return Math.PI - vg(y); }, vR = function (y) { return Math.PI + vg(y); };
    const ckCol = function (lx, ly, lz, wx, wy, wz) { const a = Math.atan2(wx, wz + 0.05), ea = Math.min(Math.abs(a - ck.a0), Math.abs(TAU + a - ck.a1), Math.abs(-a - ck.a0));
      if (wy < 0.7) return gold; if (ea < 0.1 && wy < 1.4) return gold; if (wy < ck.VY - 0.02 && Math.PI - Math.abs(a) < vg(wy) + 0.075) return gold; if (wy < 0.74) return redD; return red; };
    B.add(shellG(rows, 11, ck.a0, vL), null, ckCol, pw); B.add(shellG(rows, 11, vR, ck.a1), null, ckCol, pw); // two halves, meeting above the vent
    const sw = shellOut(rows, 0.006, 0.86, 0.745, 1); // scrollwork above the hem, either side of the vent
    B.add(shellG(sw, 10, ck.a0 + 0.2, function (y) { return vL(y) - 0.09; }, { tile: 2 }), null, 0xffffff, pw, { uv: cellUV(6) });
    B.add(shellG(sw, 10, function (y) { return vR(y) + 0.09; }, ck.a1 - 0.2, { tile: 2 }), null, 0xffffff, pw, { uv: cellUV(6) });
    // the stag, on the back between the shoulder blades and the top of the vent
    const st = [], n = 4; for (let i = 0; i <= n; i++) { const y = 1.34 - i * (0.44 / n), A = shellR(rows, y, Math.PI); st.push([y, shellR(rows, y, Math.PI / 2).r + 0.008, -A.z + A.cz + 0.008, A.cz]); }
    B.add(shellG(st, 6, Math.PI - 0.62, Math.PI + 0.62), null, 0xffffff, pw, { uv: cellUV(0) });
    // a gold tree on each front panel
    [[0.95, 1], [TAU - 0.95, -1]].forEach(function (q) { const tr = []; for (let i = 0; i <= 2; i++) { const y = 1.09 - i * 0.15, A = shellR(rows, y, 0); tr.push([y, shellR(rows, y, Math.PI / 2).r + 0.006, A.r - A.cz + 0.006, A.cz]); } B.add(shellG(tr, 3, q[0] - 0.22, q[0] + 0.22), null, 0xffffff, pw, { uv: cellUV(10) }); });
    // the mantle over the shoulders, so arms come out from under it
    B.add(shellG([[1.56, 0.13, 0.12, -0.01], [1.52, 0.22, 0.18, -0.015], [1.46, 0.31, 0.24, -0.02], [1.38, 0.35, 0.265, -0.025], [1.32, 0.36, 0.27, -0.025]], 18, 0.5, TAU - 0.5), null, function (lx, ly, lz, wx, wy) { return wy < 1.35 ? gold : red; }, 'chest');
    // the hat: wide straw cone with woven panels, a dark band, on its own bone (it bobs a little after the head)
    B.add(new T.LatheGeometry([[0.0005, 2.46], [0.1, 2.37], [0.25, 2.21], [0.42, 2.07], [0.58, 1.97], [0.615, 1.945], [0.6, 1.935], [0.4, 2.04], [0.19, 2.06]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 22), null, 0xf0b862, 'hat', { uv: cellUV(13, 0) });
    B.add(shellG([[2.1, 0.205, 0.205], [2.03, 0.215, 0.215]], 14, 0, TAU), null, 0x4a2a1c, 'hat');
    // the lantern, hanging from the right hand on its own bone: bail, cap, frame, glowing core
    const lx = -P.shX, ly = P.shY - P.upper - P.fore - 0.07, fr = 0x3a2a22, lc = ly - 0.17;
    B.add(new T.TorusGeometry(0.05, 0.008, 4, 10, Math.PI), M(lx, ly - 0.03, 0.02, 0, Math.PI / 2, Math.PI), fr, 'lant');
    B.add(new T.ConeGeometry(0.09, 0.07, 4), M(lx, lc + 0.13, 0.02, 0, Math.PI / 4, 0), fr, 'lant');
    B.add(new T.CylinderGeometry(0.075, 0.065, 0.03, 4), M(lx, lc - 0.1, 0.02, 0, Math.PI / 4, 0), fr, 'lant');
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) { B.add(new T.BoxGeometry(0.014, 0.2, 0.014), M(lx + q[0] * 0.052, lc, 0.02 + q[1] * 0.052), fr, 'lant'); });
    B.add(new T.BoxGeometry(0.09, 0.17, 0.09), M(lx, lc, 0.02), 0xffd27a, 'lant', { em: 1 });
  },
  glow: { bone: 'lant', y: -0.17, z: 0.02, col: 0xffc46b, size: 1.9 }
};
/* ANNA. Field geologist: a green knee-length coat with gold trim and a capelet, a belt, tall boots, red hair in a long braid,
   a small gold crown over goggles, a rock hammer (thrown). */
HERO.anna = {
  P: { H: 2.4, ankle: 0.1, knee: 0.52, hip: 0.96, hipW: 0.1, pelv: 1.0, spine: 1.13, chest: 1.31, neck: 1.53, head: 1.61, headC: 1.85, headR: 0.25,
    shY: 1.45, shX: 0.215, upper: 0.27, fore: 0.24, foot: 0.14 },
  two: false, item: 'hammer', throws: true,
  coat: { name: 'ct', parent: 'hips', pivot: 1.2, mid: null, hem: 0.64, top: 1.22, firm: 0.35,
    rows: [[1.27, 0.215, 0.165], [1.18, 0.23, 0.18], [1.05, 0.26, 0.2], [0.9, 0.29, 0.23], [0.76, 0.32, 0.25], [0.64, 0.34, 0.27]],
    groups: [{ lo: 0, hi: Math.PI, az: [0.45, Math.PI / 2, Math.PI - 0.45] }, { lo: Math.PI, hi: TAU, az: [Math.PI + 0.45, 1.5 * Math.PI, TAU - 0.45] }] },
  rig: function (r, P) {
    let par = 'head'; for (let i = 0; i < 5; i++) { r.b('br' + i, par, 0, 1.78 - i * 0.135, -0.23 - i * 0.01); par = 'br' + i; }
    addPanels(r, P, this.coat);
  },
  chains: [{ pre: 'br', n: 5, seg: 0.135, braid: true, back: [[1.62, 0.15, 0.14], [1.5, 0.27, 0.22, -0.015], [1.36, 0.335, 0.265, -0.02], [1.3, 0.25, 0.2], [1.27, 0.215, 0.165], [1.05, 0.26, 0.2], [0.76, 0.32, 0.25]] }],
  body: function (B, P) {
    const coat = 0x3d6a55, coatD = 0x2f5444, gold = 0xd8a845, skin = 0xebb995, hair = 0xc45a2c, hairD = 0xa8461f;
    legs(B, P, { thighR: 0.086, kneeR: 0.074, ankleR: 0.06, thigh: 0x3a3540, shin: 0x3a3540, boot: 0x8a5532, bootTop: 0.5, bootR: 0.082, cuff: 0.06, bootCuff: 0x9a6038, footW: 0.074, sole: 0x3a2214 });
    const tw = torsoW(P);
    // the coat above the belt: one piece with the torso
    B.add(shellG([[P.neck + 0.02, 0.075, 0.075], [P.shY + 0.04, 0.17, 0.13], [P.chest, 0.2, 0.155], [1.27, 0.215, 0.165], [P.pelv - 0.04, 0.2, 0.16], [P.hip - 0.02, 0.2, 0.16]], 18, 0, TAU), null,
      function (lx, ly, lz, wx, wy, wz) { return Math.abs(wx + 0.012) < 0.014 && wz > 0 && wy < P.shY ? gold : coat; }, tw);
    // the skirt of the coat, split at front and back, each half on its panels; gold edge at the hem and along the slits
    const ct = this.coat, pw = panelW(ct, 'hips');
    [[0.04, Math.PI - 0.04], [Math.PI + 0.04, TAU - 0.04]].forEach(function (hf) {
      B.add(shellG(ct.rows, 12, hf[0], hf[1]), null, function (lx, ly, lz, wx, wy, wz) { const a = Math.atan2(wx, wz), e = Math.min(Math.abs(a), Math.PI - Math.abs(a)); if (wy < 0.685) return gold; if (e < 0.07 && wy < 1.0) return gold; return wy < 0.72 ? coatD : coat; }, pw);
      B.add(shellG(shellOut(ct.rows, 0.006, 0.82, 0.69, 2), 12, hf[0] + 0.02, hf[1] - 0.02, { tile: 3 }), null, 0xffffff, pw, { uv: cellUV(8) });
    });
    // the belt with its buckle; gold buttons down the front
    B.add(shellG([[1.28, 0.225, 0.177], [1.22, 0.225, 0.177]], 18, 0, TAU), null, 0x6b4428, [['hips', 0.5], ['spine', 0.5]]);
    B.add(new T.BoxGeometry(0.07, 0.06, 0.02), M(0, 1.25, 0.18), gold, [['hips', 0.5], ['spine', 0.5]]);
    [1.44, 1.37, 1.3, 1.17, 1.06, 0.95].forEach(function (y) { const A = shellR(y > 1.25 ? [[1.5, 0.19, 0.15], [1.27, 0.215, 0.165]] : ct.rows, y, 0.12); B.add(sph(6, 5), M(A.x + 0.0, y, A.z + 0.008, 0, 0, 0, 0.018, 0.018, 0.012), gold, y > 1.25 ? 'chest' : pw); });
    // the capelet with its gold edge, and the cream collar
    B.add(shellG([[1.58, 0.15, 0.13, -0.01], [1.53, 0.24, 0.19, -0.015], [1.45, 0.31, 0.24, -0.02], [1.37, 0.33, 0.26, -0.02], [1.34, 0.335, 0.265, -0.02]], 24, 0.1, TAU - 0.1), null,
      function (lx, ly, lz, wx, wy, wz) { const a = Math.atan2(wx, wz + 0.02); return wy < 1.365 || Math.abs(a) < 0.17 ? gold : coat; }, 'chest');
    [1, -1].forEach(function (k) { B.add(new T.ConeGeometry(0.06, 0.1, 3), M(k * 0.05, P.neck - 0.02, 0.09, 1.9, 0, k * 0.5, 1, 1, 0.35), 0xf1e7cf, 'chest'); });
    arms(B, P, { upperR: 0.075, upper: coat, elbowR: 0.07, wristR: 0.062, fore: coat, cuff: gold, cuffH: 0.035, hand: skin, handR: 0.058 });
    headBall(B, P, { skin: skin, face: 2, neckR: 0.063 });
    // hair: full at the back and sides, swept, with locks by the cheeks
    B.add(new T.SphereGeometry(1, 14, 9, Math.PI / 2 + 0.85, TAU - 1.7, 0, 2.0), M(0, P.headC + 0.02, -0.01, 0, 0, 0, P.headR * 1.12, P.headR * 1.08, P.headR * 1.12), function (lx, ly, lz) { return frac(Math.atan2(lx, lz) * 2.2 + ly * 1.5) < 0.18 ? hairD : hair; }, 'head');
    B.add(new T.SphereGeometry(1, 12, 4, 0, TAU, 0, 1.0), M(0, P.headC + 0.035, 0.02, 0.2, 0, 0, P.headR * 1.08, P.headR * 1.04, P.headR * 1.1), hair, 'head');
    [1, -1].forEach(function (k) { B.add(capG([k * 0.2, P.headC + 0.05, 0.1], [k * 0.215, P.headC - 0.17, 0.08], 0.05, 0.025, 6, 2), null, hair, 'head'); });
    // goggles strapped round the head, crown on top
    B.add(new T.TorusGeometry(P.headR * 1.12, 0.022, 4, 16), M(0, P.headC + 0.1, 0.0, Math.PI / 2 + 0.25, 0, 0), 0x6a4428, 'head');
    [1, -1].forEach(function (k) { B.add(new T.CylinderGeometry(0.06, 0.06, 0.05, 12), M(k * 0.085, P.headC + 0.16, 0.2, 1.15, 0, 0), function (lx, ly) { return ly > 0.02 ? 0x5fd0c8 : 0xb8863a; }, 'head', { em: function (lx, ly) { return ly > 0.02 ? 0.25 : 0; } }); });
    const cy = P.headC + P.headR * 1.0;
    B.add(new T.CylinderGeometry(0.125, 0.12, 0.07, 10, 1, true), M(0, cy + 0.02, -0.02, -0.2), 0xe6b844, 'head');
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; B.add(new T.ConeGeometry(0.04, 0.13, 4), M(Math.sin(a) * 0.11, cy + 0.11 - Math.cos(a) * 0.022, -0.02 + Math.cos(a) * 0.11 - 0.0, -0.2, a, 0), 0xe6b844, 'head'); }
    B.add(sph(6, 5), M(0, cy + 0.04, 0.105, -0.2, 0, 0, 0.028, 0.028, 0.02), 0x4fc8c0, 'head', { em: 0.3 });
    // the braid: plaited lumps down the back, a teal tie, a tuft
    for (let i = 0; i < 5; i++) { const y0 = 1.78 - i * 0.135;
      for (let j = 0; j < 2; j++) { const y = y0 - 0.035 - j * 0.065, k = (i * 2 + j) % 2 ? 1 : -1, r = 0.062 - i * 0.006; B.add(sph(7, 5), M(k * 0.014, y, -0.24 - i * 0.01, 0, 0, k * 0.45, r, r * 1.05, r * 0.85), (i * 2 + j) % 2 ? hair : hairD, 'br' + i); } }
    B.add(capG([0, 1.78 - 4 * 0.135 - 0.1, -0.28], [0, 1.78 - 4 * 0.135 - 0.13, -0.28], 0.035, 0.035, 8, 1), null, 0x5fb8b0, 'br4');
    B.add(new T.ConeGeometry(0.045, 0.12, 7), M(0, 1.78 - 5 * 0.135 + 0.02, -0.28, Math.PI), hair, 'br4');
    // the rock hammer, held below the fist: wooden haft, grey head
    const hx = -P.shX, hy = P.shY - P.upper - P.fore - 0.06;
    B.add(capG([hx, hy + 0.04, 0.02], [hx, hy - 0.4, 0.02], 0.022, 0.02, 6, 1), null, 0x7a5634, 'handR');
    B.add(new T.BoxGeometry(0.075, 0.075, 0.22), M(hx, hy - 0.4, 0.06), function (lx, ly, lz) { return lz > 0.07 ? 0xa8a6b0 : 0x8c8a96; }, 'handR');
  }
};
/* MYRA BELLE. Round, purple, the thread-keeper: a big plum curly head with pointed ears, a burgundy smock stitched in gold
   with a spool on the chest, a rope belt hung with spools, translucent wings. Her gun is a spool (Spool shot). */
HERO.myra = {
  P: { H: 1.95, ankle: 0.08, knee: 0.34, hip: 0.62, hipW: 0.105, pelv: 0.66, spine: 0.78, chest: 0.94, neck: 1.13, head: 1.19, headC: 1.45, headR: 0.27,
    shY: 1.07, shX: 0.235, upper: 0.2, fore: 0.18, foot: 0.12 },
  two: true, item: 'spool',
  skirt: { name: 'sk', parent: 'hips', pivot: 0.92, mid: null, hem: 0.38, top: 0.98, firm: 0.4,
    rows: [[0.98, 0.3, 0.27], [0.85, 0.36, 0.32], [0.7, 0.4, 0.35], [0.55, 0.43, 0.38], [0.42, 0.44, 0.39], [0.38, 0.43, 0.38]],
    groups: [{ lo: 0, hi: TAU, wrap: true, az: [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3] }] },
  rig: function (r, P) {
    addPanels(r, P, this.skirt);
    r.b('wingL', 'chest', 0.06, 1.0, -0.22).b('wingR', 'chest', -0.06, 1.0, -0.22);
    r.b('curl', 'head', 0, P.headC + 0.3, -0.02);
    r.b('spA', 'hips', -0.2, 0.78, 0.3).b('spB', 'hips', -0.29, 0.77, 0.22);
  },
  wings: true,
  body: function (B, P) {
    const sm = 0x7c2a4c, smD = 0x5e1f3a, gold = 0xe8b044, skin = 0xc88cb4, hair = 0x6a2a52, hairD = 0x521f40;
    legs(B, P, { thighR: 0.085, kneeR: 0.075, ankleR: 0.062, thigh: 0x4c2240, shin: 0x4c2240, boot: 0x6c2a4a, bootTop: 0.15, bootR: 0.072, footW: 0.075, footH: 0.065, lace: gold, sole: 0x3a1428 });
    const tw = torsoW(P), sk = this.skirt, pw = panelW(sk, 'hips');
    // the smock: a round bell from the collar down, with the skirt part on panels
    B.add(shellG([[1.16, 0.1, 0.1], [1.12, 0.2, 0.18], [1.05, 0.27, 0.24], [0.98, 0.3, 0.27]], 20, 0, TAU), null, sm, tw);
    B.add(shellG(sk.rows, 24, 0, TAU), null, function (lx, ly, lz, wx, wy) { return wy < 0.42 ? smD : sm; }, pw);
    B.add(shellG(shellOut(sk.rows, 0.006, 0.47, 0.43, 1), 24, 0, TAU, { tile: 2 }), null, 0xffffff, pw, { uv: cellUV(7) });
    B.add(shellG([[1.21, 0.12, 0.12], [1.17, 0.19, 0.18], [1.12, 0.22, 0.21], [1.09, 0.2, 0.19]], 20, 0, TAU), null, sm, [['chest', 0.8], ['neck', 0.2]]); // the rolled collar
    B.add(shellG(shellOut([[1.17, 0.19, 0.18], [1.12, 0.22, 0.21]], 0.006, 1.155, 1.135, 1), 20, 0, TAU, { tile: 2 }), null, 0xffffff, [['chest', 0.8], ['neck', 0.2]], { uv: cellUV(7) });
    const em = []; for (let i = 0; i <= 4; i++) { const y = 1.06 - i * 0.07, A = shellR(y > 0.98 ? [[1.05, 0.27, 0.24], [0.98, 0.3, 0.27]] : sk.rows, y, 0); em.push([y, shellR(y > 0.98 ? [[1.05, 0.27, 0.24], [0.98, 0.3, 0.27]] : sk.rows, y, Math.PI / 2).r + 0.008, A.r + 0.008, 0]); }
    B.add(shellG(em, 6, -0.62, 0.62), null, 0xffffff, function (x, y, z) { return y > 0.95 ? tw(x, y, z) : pw(x, y, z); }, { uv: cellUV(5) });
    // rope belt and its spools
    B.add(new T.TorusGeometry(0.335, 0.022, 4, 16), M(0, 0.8, 0, Math.PI / 2, 0, 0, 1, 0.88, 1), gold, 'hips');
    [['spA', -0.2, 0.3], ['spB', -0.29, 0.22]].forEach(function (s) { B.add(capG([s[1], 0.79, s[2]], [s[1], 0.68, s[2] + 0.01], 0.008, 0.008, 4, 1), null, gold, s[0]);
      B.add(new T.CylinderGeometry(0.045, 0.045, 0.1, 10), M(s[1], 0.64, s[2] + 0.015, 0, 0, Math.PI / 2), function (lx, ly) { return Math.abs(ly) > 0.035 ? 0xd8a04a : 0xe48ab0; }, s[0]); });
    arms(B, P, { puff: 0.1, upper: 0xefdcbf, elbowR: 0.062, wristR: 0.056, fore: skin, cuff: sm, cuffH: 0.04, hand: skin, handR: 0.058, cuffRing: gold });
    headBall(B, P, { skin: skin, face: 3, neckR: 0.07, shape: [1.02, 0.95, 0.96], fd: 0.15 });
    [1, -1].forEach(function (k) { B.add(new T.ConeGeometry(0.055, 0.24, 6), M(k * 0.33, P.headC + 0.04, 0.03, 0, 0, -k * 1.0, 1, 1, 0.45), skin, 'head'); });
    // curly hair: a big round cap and curls round its edge; a curl on top on its own bone
    B.add(new T.SphereGeometry(1, 14, 9, Math.PI / 2 + 0.95, TAU - 1.9, 0, 1.95), M(0, P.headC + 0.05, -0.02, 0, 0, 0, P.headR * 1.16, P.headR * 1.12, P.headR * 1.14), function (lx, ly, lz) { return frac(Math.atan2(lx, lz) * 2.6 + ly * 3) < 0.2 ? hairD : hair; }, 'head');
    B.add(new T.SphereGeometry(1, 12, 4, 0, TAU, 0, 1.05), M(0, P.headC + 0.06, 0.02, 0.22, 0, 0, P.headR * 1.16, P.headR * 1.1, P.headR * 1.16), hair, 'head');
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.62 + i / 8 * Math.PI * 0.76, r = P.headR * 1.0, lo = i % 2; B.add(sph(8, 6), M(Math.sin(a) * r, P.headC - 0.07 - lo * 0.04, Math.cos(a) * r - 0.03, 0.3, a, 0, 0.16, 0.13 + lo * 0.02, 0.1), i % 3 ? hair : hairD, 'head'); } // clumps round the back and sides
    [[0.15, 0.2, -0.17], [-0.16, 0.19, -0.16]].forEach(function (c, i) { B.add(sph(8, 6), M(c[0], P.headC + c[1] - 0.04, c[2], 0, i, 0, 0.15, 0.12, 0.13), i % 2 ? hair : hairD, 'head'); }); // and toward the crown
    B.add(new T.TorusGeometry(0.07, 0.022, 5, 12, Math.PI * 1.4), M(0, P.headC + 0.36, -0.02, 0, Math.PI / 2, 0.4), hair, 'curl');
    // the spool she shoots with, in the right hand
    const hx = -P.shX, hy = P.shY - P.upper - P.fore - 0.06;
    B.add(new T.CylinderGeometry(0.075, 0.075, 0.025, 12), M(hx - 0.07, hy, 0.04, 0, 0, Math.PI / 2), 0xe2b04a, 'handR');
    B.add(new T.CylinderGeometry(0.075, 0.075, 0.025, 12), M(hx + 0.07, hy, 0.04, 0, 0, Math.PI / 2), 0xe2b04a, 'handR');
    B.add(new T.CylinderGeometry(0.055, 0.055, 0.12, 12), M(hx, hy, 0.04, 0, 0, Math.PI / 2), 0xe58bb2, 'handR');
  },
  wingBody: function (B, P) {
    [1, -1].forEach(function (k) { const s = k > 0 ? 'wingL' : 'wingR';
      [[0.5, 0.28, 0.6, 0.12], [0.34, 0.2, -0.3, -0.08]].forEach(function (w) {
        const g = new T.CircleGeometry(1, 14); g.translate(1, 0, 0);
        B.add(g, M(k * 0.06, 1.0 + w[3], -0.25, 0, -k * 0.22, k * w[2], k * w[0] / 2, w[1] / 2, 1), function (lx, ly) { const r = Math.hypot(lx - 1, ly); return r > 0.82 ? 0xfff0ff : (frac(Math.atan2(ly, lx - 1) * 1.6) < 0.12 ? 0xc8a0e8 : 0xdcc0f0); }, s);
      }); });
  }
};
/* THE SKEIN DOLL. Fast, fragile: a rag doll with a burlap head, button eyes, a mop of copper yarn, a sage smock with buttons
   and patches, brown shorts, linen limbs wrapped in thread, little boots. Her gun is a long needle. */
HERO.skein = {
  P: { H: 2.2, ankle: 0.1, knee: 0.48, hip: 0.86, hipW: 0.1, pelv: 0.9, spine: 1.03, chest: 1.2, neck: 1.39, head: 1.45, headC: 1.73, headR: 0.29,
    shY: 1.32, shX: 0.205, upper: 0.24, fore: 0.22, foot: 0.13 },
  two: false, item: 'needle',
  skirt: { name: 'sk', parent: 'hips', pivot: 1.05, mid: null, hem: 0.82, top: 1.08, firm: 0.4,
    rows: [[1.08, 0.24, 0.18], [0.98, 0.265, 0.2], [0.9, 0.285, 0.215], [0.82, 0.3, 0.225]],
    groups: [{ lo: 0, hi: TAU, wrap: true, az: [0, Math.PI / 2, Math.PI, 1.5 * Math.PI] }] },
  rig: function (r, P) {
    addPanels(r, P, this.skirt);
    r.b('hairB', 'head', 0, P.headC - 0.02, -0.26).b('hairL', 'head', 0.25, P.headC - 0.02, -0.06).b('hairR', 'head', -0.25, P.headC - 0.02, -0.06);
  },
  body: function (B, P) {
    const sage = 0x8fa184, sageD = 0x76886c, linen = 0xe8d2ae, thread = 0xf6ead4, hair = 0xc4622c, hairD = 0xa04c22, brown = 0x6e4c30;
    const wrapC = function (base) { return function (lx, ly, lz, wx, wy, wz) { const a = Math.atan2(lx, lz) / TAU; return (frac(wy * 7 + a) < 0.12 || frac(wy * 7 - a) < 0.12) ? thread : base; }; };
    // legs: linen wrapped in thread, little boots
    [1, -1].forEach(function (k) { const s = k > 0 ? 'L' : 'R', x = k * P.hipW;
      B.add(capG([x, P.hip + 0.05, 0], [x, P.knee, 0], 0.075, 0.066, 10, 3), null, wrapC(linen), 'thigh' + s);
      B.add(capG([x, P.knee, 0], [x, P.ankle + 0.02, 0], 0.066, 0.058, 10, 3), null, function (lx, ly, lz, wx, wy, wz) { return wy < 0.27 ? 0x6a4228 : wrapC(linen)(lx, ly, lz, wx, wy, wz); }, 'shin' + s);
      B.add(capG([x, 0.27, 0], [x, P.ankle + 0.03, 0], 0.075, 0.07, 10, 2), null, function (lx, ly, lz, wx, wy) { return wy > 0.245 ? 0x7a5234 : 0x6a4228; }, 'shin' + s);
      B.add(sph(12, 8), M(x, P.ankle - 0.025, P.foot * 0.36, 0, 0, 0, 0.075, 0.062, P.foot * 0.85), function (lx, ly) { return ly < -0.55 ? 0x3a2414 : 0x6a4228; }, 'foot' + s); });
    const tw = torsoW(P), sk = this.skirt, pw = panelW(sk, 'hips');
    // shorts, then the smock over them
    B.add(shellG([[P.pelv + 0.05, 0.2, 0.15], [0.84, 0.21, 0.16], [0.76, 0.215, 0.17], [0.7, 0.2, 0.16]], 16, 0, TAU), null, function (lx, ly, lz, wx, wy) { return wy < 0.73 ? 0x5a3c24 : brown; }, function (x, y) { const k = ss(0.88, 0.72, y); return [['hips', 1 - k * 0.7], [x > 0 ? 'thighL' : 'thighR', k * 0.7]]; });
    B.add(shellG([[P.neck + 0.02, 0.07, 0.07], [P.shY + 0.04, 0.17, 0.13], [P.chest, 0.21, 0.16], [1.08, 0.24, 0.18]], 18, 0, TAU), null, sage, tw);
    B.add(shellG(sk.rows, 18, 0, TAU), null, function (lx, ly, lz, wx, wy) { return wy < 0.84 ? sageD : sage; }, pw);
    B.add(shellG(shellOut(sk.rows, 0.006, 0.87, 0.845, 1), 18, 0, TAU, { tile: 2 }), null, 0xffffff, pw, { uv: cellUV(9) });
    [1.28, 1.17, 1.06, 0.95].forEach(function (y) { const A = shellR(y > 1.08 ? [[1.3, 0.2, 0.16], [1.08, 0.24, 0.18]] : sk.rows, y, 0); B.add(new T.CylinderGeometry(0.024, 0.024, 0.012, 10), M(0, y, A.z + 0.006, Math.PI / 2), 0x6a3a22, y > 1.08 ? tw : pw); });
    const patch = function (a, y0, y1, w) { const pr = []; for (let i = 0; i <= 2; i++) { const y = y0 - (y0 - y1) * i / 2, A = shellR(sk.rows, y, 0); pr.push([y, shellR(sk.rows, y, Math.PI / 2).r + 0.007, A.r + 0.007, 0]); } B.add(shellG(pr, 3, a - w, a + w), null, 0xffffff, pw, { uv: cellUV(11) }); };
    patch(0.55, 1.0, 0.86, 0.3); patch(Math.PI + 0.45, 0.98, 0.85, 0.28);
    // short puffed sleeves, linen arms wrapped in thread, mitten hands
    [1, -1].forEach(function (k) { const s = k > 0 ? 'L' : 'R', x = k * P.shX, eY = P.shY - P.upper, wY = eY - P.fore;
      B.add(sph(12, 9), M(x + k * 0.012, P.shY - 0.07, 0, 0, 0, 0, 0.09, 0.11, 0.085), function (lx, ly) { return ly < -0.8 ? thread : sage; }, function (wx, wy) { return wy > P.shY - 0.02 ? [['arm' + s, 0.75], ['chest', 0.25]] : 'arm' + s; });
      B.add(capG([x, P.shY - 0.05, 0], [x, eY, 0], 0.058, 0.054, 10, 3), null, wrapC(linen), 'arm' + s);
      B.add(capG([x, eY + 0.02, 0], [x, wY, 0], 0.054, 0.05, 10, 3), null, function (lx, ly, lz, wx, wy, wz) { return wy < wY + 0.03 ? 0x8a5a3a : wrapC(linen)(lx, ly, lz, wx, wy, wz); }, 'fore' + s);
      B.add(sph(10, 8), M(x, wY - 0.05, 0.01, 0, 0, 0, 0.055, 0.065, 0.05), linen, 'hand' + s);
      B.add(sph(6, 5), M(x - k * 0.035, wY - 0.035, 0.035, 0, 0, 0, 0.022, 0.03, 0.022), linen, 'hand' + s); });
    headBall(B, P, { skin: 0xdcc39a, face: 4, neckR: 0.06, shape: [1.02, 0.94, 0.96] });
    // the mop of yarn: a cap over the top and back, chunky strands hanging round it on three pendulums
    B.add(new T.SphereGeometry(1, 14, 9, Math.PI / 2 + 0.9, TAU - 1.8, 0, 1.95), M(0, P.headC + 0.03, -0.01, 0, 0, 0, P.headR * 1.13, P.headR * 1.08, P.headR * 1.12), function (lx, ly, lz) { return frac(Math.atan2(lx, lz) * 3.2) < 0.25 ? hairD : hair; }, 'head');
    B.add(new T.SphereGeometry(1, 12, 4, 0, TAU, 0, 1.15), M(0, P.headC + 0.05, 0.02, 0.18, 0, 0, P.headR * 1.1, P.headR * 1.05, P.headR * 1.12), function (lx, ly, lz) { return frac(Math.atan2(lx, lz) * 3.2 + 0.5) < 0.22 ? hairD : hair; }, 'head');
    for (let i = 0; i < 12; i++) { const a = Math.PI * 0.42 + i / 11 * Math.PI * 1.16, r = P.headR * 1.08, x = Math.sin(a) * r, z = Math.cos(a) * r - 0.01, L = 0.22 + ((i * 7) % 5) * 0.035;
      const bone = Math.cos(a) < -0.5 ? 'hairB' : (x > 0 ? 'hairL' : 'hairR');
      B.add(capG([x, P.headC + 0.06, z], [x * 1.1, P.headC + 0.06 - L, z * 1.08], 0.05, 0.034, 5, 2), null, i % 3 ? hair : hairD, function (wx, wy) { const k = ss(P.headC + 0.04, P.headC - 0.1, wy); return [['head', 1 - k], [bone, k]]; }); }
    [[0.13, 0.05], [0.17, -0.01]].forEach(function (p) { B.add(new T.BoxGeometry(0.07, 0.014, 0.01), M(p[0], P.headC + 0.14 + p[1], 0.26, -0.3, 0.3, 0.7), thread, 'head'); B.add(new T.BoxGeometry(0.07, 0.014, 0.01), M(p[0], P.headC + 0.14 + p[1], 0.26, -0.3, 0.3, -0.7), thread, 'head'); });
    // the needle, long and silver, from the right fist
    const hx = -P.shX, hy = P.shY - P.upper - P.fore - 0.05;
    B.add(new T.ConeGeometry(0.018, 0.5, 6), M(hx, hy - 0.22, 0.02, Math.PI), 0xd8dce8, 'handR', { em: 0.15 });
    B.add(new T.TorusGeometry(0.02, 0.006, 4, 8), M(hx, hy + 0.05, 0.02, 0, Math.PI / 2, 0), 0xd8dce8, 'handR');
  }
};

/* ---------- build ---------- */
/* h: the unit; ctx: { LK (the look), glow (gfx's glowSprite), team }. Returns a figure, or null for an unknown hero. */
H3.build = function (t, h, ctx) {
  init(t); if (!_cm) _cm = new T.Color();
  const id = h.def && h.def.id, D = HERO[id]; if (!D) return null;
  const P = D.P, rig = humanoid(P); D.rig.call(D, rig, P);
  const B = new Body(rig, P.H); D.body.call(D, B, P);
  const geo = B.build();
  const bones = rig.n.map(function (nm) { const b = new T.Bone(); b.name = nm; return b; });
  rig.n.forEach(function (nm, i) { const p = rig.p[i], a = rig.a[i], pa = p >= 0 ? rig.a[p] : [0, 0, 0]; bones[i].position.set(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]); if (p >= 0) bones[p].add(bones[i]); });
  const lp = lookP(ctx && ctx.LK, h.team), mat = heroMat(lp);
  const mesh = new T.SkinnedMesh(geo, mat);
  rig.n.forEach(function (nm, i) { if (rig.p[i] < 0) mesh.add(bones[i]); });
  mesh.updateMatrixWorld(true);
  const skel = new T.Skeleton(bones); mesh.bind(skel, new T.Matrix4());
  mesh.frustumCulled = false; mesh.userData.h3d = true;
  const root = new T.Group(); root.add(mesh);
  const b = {}; rig.n.forEach(function (nm, i) { b[nm] = bones[i]; bones[i].userData.rest = bones[i].position.clone(); });
  let wings = null, tris = geo.attributes.position.count / 3;
  if (D.wings) { const WB = new Body(rig, P.H); D.wingBody.call(D, WB, P); const wg = WB.build();
    const wm = new T.MeshBasicMaterial({ skinning: true, vertexColors: true, transparent: true, opacity: 0.72, side: T.DoubleSide, depthWrite: false }); wm.userData.lk = wm.userData.bl = wm.userData.solid = true;
    wings = new T.SkinnedMesh(wg, wm); wings.bind(skel, new T.Matrix4()); wings.frustumCulled = false; wings.renderOrder = 1; root.add(wings); tris += wg.attributes.position.count / 3; }
  let glow = null;
  if (D.glow && ctx && ctx.glow) { glow = ctx.glow(D.glow.col, D.glow.size, b[D.glow.bone], 0, D.glow.y, D.glow.z); glow.material.userData.lk = true; glow.material.opacity = 0.75; }
  const fig = { id: id, D: D, P: P, rig: rig, b: b, bones: bones, mesh: mesh, wings: wings, root: root, skel: skel, mat: mat, glow: glow, tris: tris, draws: wings ? 2 : 1,
    cycle: ((LL.paperMotion && LL.paperMotion.RIGS[id]) || { cycle: 3.4 }).cycle, cycK: 1, legL: P.hip - P.ankle,
    feet: [{ x: h.x, z: h.z }, { x: h.x, z: h.z }], ghosts: [], gk: 0,
    S: { vx: 0, vz: 0, sp: 0, mdx: 0, mdz: 1, hy: 0, air: 0, dash: 0, zip: 0, tp: 0, tpv: 0, tr: 0, trv: 0, dn: {}, braid: null, t: 0, aimS: 0 } };
  ['hips', 'spine', 'chest', 'neck', 'head'].forEach(function (n) { b[n].rotation.order = 'YXZ'; });
  ['armL', 'armR'].forEach(function (n) { b[n].rotation.order = 'ZXY'; });
  return fig;
};
/* stride length per speed, handed to the rig before it steps the phase (sc.cyc): a long bounding run at speed, short steps slow */
H3.cyc = function (fig, h) {
  const vRef = (h.def && h.def.speed) || 7, sp = fig.S.sp;
  fig.cycK = clamp(Math.pow(clamp(sp / vRef, 0, 1.25), 0.6), 0.38, 1.1);
  return fig.cycK;
};

/* ---------- IK ---------- */
/* Two bones from root to target (both in the parent's frame), lengths a and b, bending toward pole. Sets q1 (upper) and
   returns the lower bone's angle about its x. Legs: the knee points along pole and the shin folds back (+). Arms (flip): the
   elbow points along pole and the forearm folds forward (-). */
function ik2(root, target, a, b, pole, q1, flip) {
  _iv.subVectors(target, root); const d0 = _iv.length(), d = clamp(d0, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  if (d0 > 1e-6) _iv.multiplyScalar(1 / d0); else _iv.copy(DOWN);
  const beta = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const bend = Math.PI - Math.acos(clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  _ip.copy(pole).addScaledVector(_iv, -pole.dot(_iv)); if (_ip.lengthSq() < 1e-8) { _ip.set(0, 0, 1).addScaledVector(_iv, -_iv.z); } _ip.normalize();
  _iu.copy(_iv).multiplyScalar(Math.cos(beta)).addScaledVector(_ip, Math.sin(beta));
  _iy.copy(_iu).negate(); _iz.copy(_ip).addScaledVector(_iy, -_ip.dot(_iy)).normalize(); if (flip) _iz.negate();
  _ix.crossVectors(_iy, _iz);
  _im.makeBasis(_ix, _iy, _iz); q1.setFromRotationMatrix(_im);
  return flip ? -bend : bend;
}
/* a bone's transform relative to the figure (model space), from the bones above it */
function modelM(bone, out) {
  out.compose(bone.position, bone.quaternion, ONE); let p = bone.parent;
  while (p && p.isBone) { _m4b.compose(p.position, p.quaternion, ONE); out.premultiply(_m4b); p = p.parent; }
  return out;
}
const _tmp = {};
function V(k) { return _tmp[k] || (_tmp[k] = new T.Vector3()); }
function Q(k) { return _tmp[k] || (_tmp[k] = new T.Quaternion()); }
function Mx(k) { return _tmp[k] || (_tmp[k] = new T.Matrix4()); }

/* a damped spring on one value, stepped at 1/120 s */
function spring(S, x, v, target, k, c, dt) { for (let hh = Math.min(dt, 1 / 120), left = dt; left > 1e-6; left -= hh, hh = Math.min(hh, left)) { S[v] += (-k * (S[x] - target) - c * S[v]) * hh; S[x] += S[v] * hh; } }
/* A pendulum on a bone: it hangs along gravity minus how its anchor accelerates (grav), or leans against the acceleration
   like something sitting on top (lag). Angles are pitch (bottom back, +) and roll (bottom to +x, +) in the parent's frame. */
function dangle(fig, name, dt, o) {
  const bone = fig.b[name]; if (!bone) return; const S = fig.S.dn[name] || (fig.S.dn[name] = { p: null, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0, x: 0, xv: 0, z: 0, zv: 0 });
  bone.updateMatrixWorld(); const p = V('dp').setFromMatrixPosition(bone.matrixWorld);
  if (!S.p || dt <= 0 || S.p.distanceTo(p) > 1.5) { S.p = (S.p || new T.Vector3()).copy(p); S.vx = S.vy = S.vz = S.ax = S.ay = S.az = 0; }
  if (dt > 0) { const vx = (p.x - S.p.x) / dt, vy = (p.y - S.p.y) / dt, vz = (p.z - S.p.z) / dt, k = ease(30, dt);
    S.ax += (clamp((vx - S.vx) / dt, -60, 60) - S.ax) * k; S.ay += (clamp((vy - S.vy) / dt, -60, 60) - S.ay) * k; S.az += (clamp((vz - S.vz) / dt, -60, 60) - S.az) * k; S.vx = vx; S.vy = vy; S.vz = vz; }
  S.p.copy(p);
  bone.parent.getWorldQuaternion(Q('dq')).invert();
  let tx, tz;
  if (o.lag) { const a = V('da').set(S.ax, S.ay, S.az).applyQuaternion(Q('dq')); tx = clamp(-a.z * o.gain, -o.max, o.max); tz = clamp(a.x * o.gain, -o.max, o.max); }
  else { const g = V('da').set(-S.ax * o.gain, -9.8 - S.ay * o.gain, -S.az * o.gain).applyQuaternion(Q('dq')); tx = clamp(Math.atan2(-g.z, -g.y), -o.max, o.max); tz = clamp(Math.atan2(g.x, -g.y), -o.max, o.max); }
  spring(S, 'x', 'xv', tx, o.k, o.c, dt); spring(S, 'z', 'zv', tz, o.k, o.c, dt);
  bone.rotation.set(S.x, 0, S.z);
}

/* ---------- the pose, every frame ---------- */
/* st: LL.paperMotion.pose() for this unit this frame. h: the unit. o: { dt, t, reduced, dieT }. */
H3.pose = function (fig, st, h, o) {
  const P = fig.P, b = fig.b, S = fig.S, D = fig.D, dt = clamp(o.dt || 0, 0, 0.1), red = !!o.reduced, t = o.t || 0, Gt = st.g || {}, legL = fig.legL;
  S.t = t;
  // how the unit moves relative to where it faces (model frame: +z facing, +x its left), smoothed
  const cyw = Math.cos(h.yaw || 0), syw = Math.sin(h.yaw || 0), lvx = (h.vx || 0) * cyw - (h.vz || 0) * syw, lvz = (h.vx || 0) * syw + (h.vz || 0) * cyw;
  S.vx += (lvx - S.vx) * ease(14, dt); S.vz += (lvz - S.vz) * ease(14, dt);
  const sp = Math.hypot(S.vx, S.vz); S.sp = sp;
  if (sp > 0.35) { S.mdx = S.vx / sp; S.mdz = S.vz / sp; }
  const zip = !!h.zip, ground = h.onGround !== false && !zip, mix = red ? 0 : clamp(st.mix, 0, 1);
  S.air += ((ground ? 0 : 1) - S.air) * ease(ground ? 22 : 10, dt); S.dash += ((h.dashT > 0 ? 1 : 0) - S.dash) * ease(h.dashT > 0 ? 30 : 8, dt); S.zip += ((zip ? 1 : 0) - S.zip) * ease(10, dt);
  const air = red ? (ground ? 0 : 1) : S.air, dash = red ? 0 : S.dash, zk = S.zip;
  // where the hips face: toward the way the legs run (forward and sideways), or away from it (running backward)
  const al = Math.atan2(S.mdx, S.mdz), aa = Math.abs(al);
  let hyT = aa <= 1.75 ? clamp(al, -1.05, 1.05) * 0.6 : clamp(al - Math.sign(al) * Math.PI, -1, 1) * 0.42;
  hyT *= mix * (1 - air) * (1 - dash);
  S.hy += (hyT - S.hy) * ease(7, dt);
  const hy = red ? 0 : S.hy, chy = Math.cos(hy), shy = Math.sin(hy);
  const gdx = S.mdx * chy - S.mdz * shy, gdz = S.mdx * shy + S.mdz * chy; // travel in the hips' ground frame
  // stride: as long as the leg can reach, shorter when slow; flight phases appear as stance drops below half
  const L = fig.cycle * fig.cycK, s = clamp(0.95 * legL / L, 0.22, 0.62), Dst = L * s * mix, runK = ss(0.5, 0.32, s) * mix;
  const ph = st.phase, sinp = Math.sin(ph) * mix;
  const fw = P.hipW * (1.0 - 0.12 * runK), liftH = legL * (0.1 + 0.36 * runK) * mix;
  // body bob: compresses in stance, rises in flight (a run); highest passing over the foot (a walk)
  const tau = frac((ph - Math.PI / 2) / Math.PI), sg = 2 * s;
  let bob = sg < 1 ? (tau < sg ? -legL * 0.06 * Math.sin(Math.PI * tau / sg) : legL * 0.05 * Math.sin(Math.PI * (tau - sg) / (1 - sg))) : -legL * 0.022 * Math.cos(TAU * tau);
  bob *= mix * (Gt.bob || 1) * (1 - air);
  // ability and event poses from the rig
  const sq = red ? 0 : st.squash || 0, stomp = red ? 0 : st.stomp || 0, brace = red ? 0 : st.brace || 0, tw = red ? 0 : st.throw || 0, recoil = red ? 0 : st.recoil || 0, idle = red ? 0 : st.idle || 0;
  const breath = red ? 0 : Math.sin(t * 2.1 + (h.id || 0)) * (1 - mix);
  // --- hips
  const pelvY = P.pelv - legL * (0.03 + 0.05 * runK) - Math.max(-0.3, sq) * legL * 0.11 - stomp * legL * 0.14 + bob - dash * legL * 0.04 + air * legL * 0.02;
  const osc = -0.15 * sinp * (Gt.roll || 1) * (1 - 0.4 * runK);
  const back = gdz < -0.3 ? 1 : 0;
  const lean = ((0.05 + 0.2 * runK) * mix * (back ? 0.35 : 1) + (st.lean || 0) * 2.2) * (1 - air * 0.6) + dash * 0.42 + zk * 0.25 + stomp * 0.22 - brace * 1.2 + tw * 0.1;
  const roll = (0.05 * sinp * (1 - 0.5 * runK) * (Gt.roll || 1) + idle * 0.03) * (1 - air) - clamp(S.vx * 0.012, -0.09, 0.09) * (1 - dash); // and a lean into a strafe
  const shift = (0.42 * fw * sinp * (1 - 0.5 * runK) * (Gt.shift || 1) + idle * 0.025) * (1 - air);
  b.hips.position.set(shift * chy, pelvY, -shift * shy);
  b.hips.rotation.set(lean, hy + osc, roll);
  // --- legs: foot targets in the ground frame, then into the hips' frame for IK
  const hM = Mx('hM').compose(b.hips.position, b.hips.quaternion, ONE), hMi = Mx('hMi').copy(hM).invert(), hQi = Q('hQi').copy(b.hips.quaternion).invert();
  fig.knees = fig.knees || [new T.Vector3(), new T.Vector3()]; fig.shins = fig.shins || [new T.Vector3(), new T.Vector3()];
  for (let k = 0; k < 2; k++) {
    const side = k ? -1 : 1, n = k ? 'R' : 'L', u = frac((ph + (k ? Math.PI : 0) - Math.PI / 2) / TAU);
    let d, lift = 0, pitch = 0, up = 0, cross = 0;
    if (u < s) { const q = u / s; d = Dst * (0.5 - q); const heel = ss(0.55, 1, q); up = heel * 0.045 * mix; pitch = heel * (0.3 + 0.35 * runK) * mix - (1 - ss(0, 0.25, q)) * 0.18 * (1 - runK) * mix; }
    else { const w = (u - s) / (1 - s); d = Dst * (-0.5 + (1 - Math.cos(Math.PI * w)) / 2); lift = liftH * Math.sin(Math.PI * Math.pow(w, 0.72)); pitch = (0.95 * (1 - w) * (1 - w) * runK + 0.3 * (1 - w)) * mix - ss(0.75, 1, w) * 0.22 * mix; cross = Math.sin(Math.PI * w); }
    let gx = side * fw + gdx * d, gy = P.ankle + lift + up, gz = gdz * d + Math.abs(gdx) * 0.09 * cross * mix + (k ? -0.015 : 0.03) * (1 - mix);
    // standing: feet a little apart, one a touch ahead; in the air: one knee up, the other trailing, reaching down to land
    const fall = ss(0.1, -0.5, st.stretch || 0);
    if (air > 0.001) { const ax = side * fw * 1.05, ay = P.ankle + legL * (k ? 0.16 : 0.34) * (1 - fall * 0.7) + legL * 0.04, az = (k ? -0.26 : 0.22) * legL * (1 - fall * 0.6);
      gx += (ax - gx) * air; gy += (ay - gy) * air; gz += (az - gz) * air; pitch += (0.5 * (1 - fall) - pitch) * air; }
    if (dash > 0.001) { gx += (side * fw - gx) * dash; gy += (P.ankle + legL * (k ? 0.22 : 0.06) - gy) * dash; gz += ((k ? -0.5 : 0.28) * legL - gz) * dash; pitch += ((k ? 1.0 : 0.2) - pitch) * dash; }
    if (zk > 0.001) { gx += (side * fw * 0.8 - gx) * zk; gy += (P.ankle + legL * (k ? 0.3 : 0.22) - gy) * zk; gz += ((k ? -0.1 : 0.12) * legL - gz) * zk; pitch += (0.7 - pitch) * zk; }
    if (stomp > 0.001) { gx += (side * fw * 2.0 - gx) * stomp; }
    // ground frame -> model frame (turned by the hips' yaw) -> hips frame
    const F = V('F' + k).set(gx * chy + gz * shy, gy, -gx * shy + gz * chy);
    fig.feet[k].mx = F.x; fig.feet[k].mz = F.z;
    F.applyMatrix4(hMi);
    const th = b['thigh' + n], sh = b['shin' + n], ft = b['foot' + n], a = P.hip - P.knee, bb = P.knee - P.ankle;
    const pole = V('pole').set(side * 0.18, -0.05, 1).normalize();
    const bend = ik2(th.position, F, a, bb, pole, th.quaternion, false);
    sh.quaternion.setFromAxisAngle(X_AX, bend);
    // the foot: flat on the ground frame, toe rolling with the step
    const want = Q('fw').setFromAxisAngle(Y_AX, hy).multiply(Q('fp').setFromAxisAngle(X_AX, pitch));
    ft.quaternion.copy(th.quaternion).multiply(sh.quaternion).invert().multiply(hQi).multiply(want);
    // knee and mid-shin in the hips frame (cloth keeps off them)
    fig.knees[k].set(0, -a, 0).applyQuaternion(th.quaternion).add(th.position);
    fig.shins[k].set(0, -bb * 0.6, 0).applyQuaternion(sh.quaternion).applyQuaternion(th.quaternion).add(fig.knees[k]);
  }
  // --- spine, chest, head: turn back to the aim, counter the hips, breathe, lean into a throw
  const aim = red ? clamp(st.aim, 0, 1) : clamp(st.aim, 0, 1), pitchA = clamp(h.pitch || 0, -0.9, 0.9);
  const twist = 0.12 * sinp * (1 - 0.6 * aim) * (1 - air);
  const sP = -lean * 0.35 + breath * 0.012, cP = -lean * 0.22 - pitchA * 0.18 * aim - recoil * 0.07 + breath * 0.01 + stomp * 0.12;
  const cY = -(hy + osc) * 0.5 + twist + tw * 0.38 * (D.throws ? 1 : 0.4);
  b.spine.rotation.set(sP, -(hy + osc) * 0.5, -roll * 0.5);
  b.chest.rotation.set(cP, cY, -roll * 0.35);
  const parP = lean + sP + cP;
  b.neck.rotation.set(0, 0, 0);
  b.head.rotation.set(-parP * 0.75 - pitchA * 0.45 + stomp * 0.15, -(cY + (hy + osc) * 0.5 + twist) * 0.6 + (red ? 0 : (st.head || 0) * 3), -roll * 0.6);
  // --- arms: pump against the legs; the gun arm (and the other hand, for a two-handed hold) comes up to the aim
  const armSw = (0.32 + 0.68 * runK) * 0.95 * mix * (Gt.arm || 1) * (1 - air) * (1 - dash);
  for (let k = 0; k < 2; k++) {
    const side = k ? -1 : 1, n = k ? 'R' : 'L', A = b['arm' + n], F = b['fore' + n], Hd = b['hand' + n];
    let p = side * armSw * Math.sin(ph) + breath * 0.02, ab = (0.14 + 0.16 * runK) * side, el = 0.2 + 1.1 * runK * mix + 0.35 * Math.max(0, -p) * runK;
    if (air > 0.001) { p += (-0.5 - p) * air; ab += (side * 0.75 - ab) * air; el += (0.5 - el) * air; }
    if (dash > 0.001) { p += (0.95 - p) * dash; ab += (side * 0.35 - ab) * dash; el += (0.25 - el) * dash; }
    if (zk > 0.001 && k === 1) { p += (-2.6 - p) * zk; ab += (-0.15 - ab) * zk; el += (0.3 - el) * zk; }
    else if (zk > 0.001) { p += (-0.4 - p) * zk; ab += (0.7 - ab) * zk; el += (0.6 - el) * zk; }
    if (stomp > 0.001) { p += (-0.3 - p) * stomp; ab += (side * 1.25 - ab) * stomp; el += (0.7 - el) * stomp; }
    A.rotation.set(p, 0, ab); F.rotation.set(-el, 0, 0); Hd.rotation.set(0, 0, 0);
  }
  // the aim: inverse kinematics toward a point ahead of the right shoulder along the aim, in the chest's frame
  const thr = D.throws ? tw : 0, aimW = clamp(Math.max(aim, Math.abs(thr) * 1.4), 0, 1) * (1 - zk) * (1 - dash * 0.7);
  if (aimW > 0.002) {
    const cM = modelM(b.chest, Mx('cM')), cQi = Q('cQi').setFromRotationMatrix(cM).invert();
    const Ad = V('Ad').set(0, Math.sin(pitchA), Math.cos(pitchA)).applyQuaternion(cQi); // the aim, in the chest frame
    const shR = b.armR.position, reach = (P.upper + P.fore) * 0.9;
    const Tg = V('Tg').copy(shR).add(V('Tin').set(D.two ? 0.02 : -0.05, 0.04, 0)).addScaledVector(Ad, reach).addScaledVector(Ad, -recoil * 0.08);
    if (thr < 0) Tg.lerp(V('Tw').copy(shR).add(V('Tw2').set(-0.04, 0.3, -0.2)), clamp(-thr * 1.2, 0, 1)); // wound back over the shoulder
    else if (thr > 0) Tg.lerp(V('Tr').copy(shR).add(V('Tr2').set(0.16, -0.18, 0.4)), clamp(thr * 0.7, 0, 1)); // thrown through
    const qa = Q('qa'), elb = ik2(shR, Tg, P.upper, P.fore, V('pr').set(-0.55, -0.6, -0.55).normalize(), qa, true);
    b.armR.quaternion.slerp(qa, aimW); b.foreR.rotation.x += (elb - b.foreR.rotation.x) * aimW;
    const hq = Q('hq').setFromUnitVectors(DOWN, Ad); b.handR.quaternion.copy(b.armR.quaternion).multiply(b.foreR.quaternion).invert().multiply(hq);
    b.handR.quaternion.slerp(Q('id').identity(), 1 - aimW);
    if (D.two) { const Tl = V('Tl').copy(Tg).add(V('Tl2').set(0.15, -0.035, -0.07)), ql = Q('ql'), el2 = ik2(b.armL.position, Tl, P.upper, P.fore, V('pl').set(0.55, -0.6, -0.55).normalize(), ql, true);
      const w2 = aimW * (thr ? 0.3 : 1); b.armL.quaternion.slerp(ql, w2); b.foreL.rotation.x += (el2 - b.foreL.rotation.x) * w2; }
  }
  // --- the whole figure: squash on landing, stretch going up, a shove back from a braced shot, a lunge on a throw
  const sy = 1 - Math.max(0, sq) * 0.07 + Math.max(0, st.stretch || 0) * 0.06 * air, sx = 1 + Math.max(0, sq) * 0.035;
  fig.root.scale.set(sx, sy, sx); fig.root.position.set(0, 0, -brace * 0.8 + Math.max(0, tw) * 0.08); fig.root.rotation.set(0, 0, 0);
  // --- cloth, braid, pendulums, wings
  cloth(fig, D.cloak || D.coat || D.skirt, h, st, dt, red, runK, air, dash, zk);
  const g = fig.root.parent; if (g) g.updateMatrixWorld(true);
  if (D.chains) D.chains.forEach(function (c) { chain(fig, c, h, dt, red); });
  if (!red) {
    if (b.lant) dangle(fig, 'lant', dt, { k: 70, c: 6, gain: 1, max: 1.2 });
    if (b.hat) dangle(fig, 'hat', dt, { lag: true, k: 140, c: 9, gain: 0.006, max: 0.12 });
    if (b.curl) dangle(fig, 'curl', dt, { lag: true, k: 90, c: 5, gain: 0.02, max: 0.5 });
    ['hairB', 'hairL', 'hairR', 'spA', 'spB'].forEach(function (n) { if (b[n]) dangle(fig, n, dt, { k: 60, c: 5, gain: 0.8, max: 0.9 }); });
  } else ['lant', 'hat', 'curl', 'hairB', 'hairL', 'hairR', 'spA', 'spB'].forEach(function (n) { if (b[n]) b[n].rotation.set(0, 0, 0); });
  if (b.wingL) { const f = red ? 0 : (air > 0.3 || dash > 0.3 ? 15 : 3 + 8 * mix), amp = red ? 0 : 0.12 + 0.3 * Math.max(mix, air);
    S.wph = (S.wph || 0) + dt * f; const fl = Math.sin(S.wph) * amp;
    b.wingL.rotation.set(0.08, 0.1 + fl, 0); b.wingR.rotation.set(0.08, -0.1 - fl, 0); }
  // feet in the world, for dust under the real foot
  if (g) for (let k = 0; k < 2; k++) { const f = fig.feet[k]; _v.set(f.mx, 0, f.mz).applyMatrix4(g.matrixWorld); f.x = _v.x; f.z = _v.z; }
};
/* Cloth on hinged panels: trails the way the body moves on two springs (it swings past when you stop), flutters with the
   stride, lifts in the air, and each panel is swung out far enough to clear the knees and shins behind or in front of it. */
function cloth(fig, sp, h, st, dt, red, runK, air, dash, zk) {
  if (!sp) return; const S = fig.S, b = fig.b, P = fig.P;
  const tpT = red ? 0 : clamp(S.vz * 0.075, -0.12, 0.62) * (1 - air * 0.4) + air * 0.35 * (st.stretch < 0 ? 1.2 : 0.5) + dash * 0.8 + zk * 0.5;
  const trT = red ? 0 : clamp(-S.vx * 0.028, -0.2, 0.2);
  spring(S, 'tp', 'tpv', tpT, 55, 6.5, dt); spring(S, 'tr', 'trv', trT, 55, 6.5, dt);
  // the legs, in the panels' parent frame
  const parent = b[sp.parent], hipsFrame = sp.parent === 'hips';
  let pM = null;
  if (!hipsFrame) { pM = modelM(parent, Mx('pM')).invert().multiply(Mx('hM2').compose(b.hips.position, b.hips.quaternion, ONE)); }
  const pts = [];
  for (let k = 0; k < 2; k++) { pts.push(V('ck' + k).copy(fig.knees[k])); pts.push(V('cs' + k).copy(fig.shins[k])); }
  for (let i = 0; i < pts.length; i++) { if (pM) pts[i].applyMatrix4(pM); else pts[i].add(b.hips.position).sub(b.hips.position); }
  const L = sp.list, flut = red ? 0 : (0.03 + 0.07 * runK) * (1 - air * 0.3), ph = st.phase, tt = S.t;
  for (let i = 0; i < L.length; i++) {
    const pn = L[i], bone = b[pn.top], piv = bone.position, pivY = (hipsFrame ? P.pelv : fig.rig.a[fig.rig.i[sp.parent]][1]) + piv.y;
    let dx = S.tr, dz = -S.tp; // bottom displacement in radians: +x left, +z forward
    const fl = flut * Math.sin(ph * 2 + pn.a * 1.7 + tt * 2.3) + (red ? 0 : 0.015 * Math.sin(tt * 1.3 + pn.a * 2));
    dx += pn.rx * fl * 0.35; dz -= fl * (0.4 + 0.6 * Math.max(0, -pn.rz)); // the hem bounces along its trail, most at the back
    // keep off the legs: the cloth's radius at that height along this panel must pass outside the knee and shin
    let need = 0;
    for (let j = 0; j < pts.length; j++) { const q = pts[j], qy = (hipsFrame ? q.y + P.pelv : q.y + fig.rig.a[fig.rig.i[sp.parent]][1]); if (qy < sp.hem - 0.04 || qy > pivY - 0.05) continue;
      const along = q.x * pn.rx + (q.z - (sp.cz || 0)) * pn.rz, lat = Math.abs(-q.x * pn.rz + (q.z - (sp.cz || 0)) * pn.rx), R0 = shellR(sp.rows, qy, pn.a).r;
      if (lat > R0 * 0.75) continue;
      const dep = Math.max(0.12, pivY - qy), nd = (along + 0.1 - R0) / dep; if (nd > need) need = nd; }
    const cur = dx * pn.rx + dz * pn.rz; if (need > cur) { dx += pn.rx * (need - cur); dz += pn.rz * (need - cur); }
    bone.rotation.set(-dz, 0, dx);
    if (pn.low) { const lb = b[pn.low]; lb.rotation.set(-dz * 0.35 - S.tp * 0.25 + (red ? 0 : -pn.rz * fl * 0.8), 0, dx * 0.35 + S.tr * 0.25 + (red ? 0 : pn.rx * fl * 0.8)); }
  }
}
/* The braid: a verlet chain in the world, hung from the back of the head, kept off the back and the coat, then laid along
   its bones. */
function chain(fig, B, h, dt, red) {
  const b = fig.b, n = B.n, S = fig.S, pre = B.pre, key = 'ch' + pre;
  const b0 = b[pre + '0'], head = b0.parent;
  if (red) { for (let i = 0; i < n; i++) b[pre + i].quaternion.identity(); S[key] = null; return; }
  b0.quaternion.identity(); b0.updateMatrixWorld();
  const anc = V('ba').setFromMatrixPosition(b0.matrixWorld);
  if (!S[key] || S[key].p[0].distanceTo(anc) > 1.5) { const p = [], q = []; for (let i = 0; i <= n; i++) { p.push(new T.Vector3(anc.x, anc.y - i * B.seg, anc.z)); q.push(p[i].clone()); } S[key] = { p: p, q: q, acc: 0 }; }
  const P0 = S[key].p, Q0 = S[key].q; P0[0].copy(anc);
  const air = B.braid ? 0 : 0.6, hvx = (h.vx || 0) * air, hvz = (h.vz || 0) * air; // ribbons catch the air
  const chest = b.chest; chest.updateMatrixWorld(); const cMi = Mx('bcm').copy(chest.matrixWorld).invert(), cMw = chest.matrixWorld;
  const cY = fig.rig.a[fig.rig.i.chest][1];
  S[key].acc += dt; let steps = 0;
  while (S[key].acc >= 1 / 90 && steps < 6) { S[key].acc -= 1 / 90; steps++; const hh = 1 / 90, dmp = B.braid ? 0.985 : 0.97;
    for (let i = 1; i <= n; i++) { const p = P0[i], q = Q0[i]; const vx = (p.x - q.x) * dmp, vy = (p.y - q.y) * dmp, vz = (p.z - q.z) * dmp; q.copy(p); p.x += vx - hvx * hh * hh * 3; p.y += vy - (B.braid ? 11 : 7) * hh * hh; p.z += vz - hvz * hh * hh * 3; }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < n; i++) { const a = P0[i], c = P0[i + 1], d = V('bd').subVectors(c, a), l = d.length() || 1e-6, e = (l - B.seg) / l; if (i === 0) c.addScaledVector(d, -e); else { a.addScaledVector(d, e * 0.5); c.addScaledVector(d, -e * 0.5); } }
      // keep behind the back: in the chest's frame, z must stay behind the cloth's back surface at that height
      for (let i = 1; i <= n; i++) { const l = V('bl').copy(P0[i]).applyMatrix4(cMi), y = l.y + cY, R = shellR(B.back, y, Math.PI), back = R.z - (B.braid ? 0.05 : 0.06) - (B.trail ? Math.max(0, S.tp) * Math.max(0, B.trail - y) * 0.8 : 0);
        if (l.z > back && Math.abs(l.x) < 0.32) { l.z = back; P0[i].copy(l.applyMatrix4(cMw)); } }
    }
  }
  // lay the bones along the chain
  const pq = Q('bpq'); head.updateMatrixWorld(); head.getWorldQuaternion(pq);
  for (let i = 0; i < n; i++) { const bone = b[pre + i], nx = b[pre + (i + 1)], rest = nx ? V('brest').copy(nx.position).normalize() : DOWN, dir = V('bdir').subVectors(P0[i + 1], P0[i]).normalize().applyQuaternion(Q('bpi').copy(pq).invert());
    bone.quaternion.setFromUnitVectors(rest, dir); pq.multiply(bone.quaternion); }
}
/* The fall: knees give, then the figure tips forward onto its face, arms out to catch itself. */
H3.fall = function (fig, dieT) {
  const f = clamp(dieT / 0.7, 0, 1), e = ss(0.12, 0.85, f), b = fig.b, k = 1 - Math.exp(-0.25 * (1 + f * 6));
  fig.root.rotation.set(e * 1.45, 0, 0); fig.root.position.y = -0.02 * e;
  b.hips.position.y += (fig.P.pelv - fig.legL * 0.22 - b.hips.position.y) * k * (1 - e * 0.5);
  b.armL.rotation.x += (-1.3 - b.armL.rotation.x) * k; b.armR.rotation.x += (-1.3 - b.armR.rotation.x) * k;
  b.foreL.rotation.x += (-0.3 - b.foreL.rotation.x) * k; b.foreR.rotation.x += (-0.3 - b.foreR.rotation.x) * k;
  b.head.rotation.x += (0.4 - b.head.rotation.x) * k;
};
/* ---------- afterimages: a copy of the figure frozen in its pose, tinted, fading (gfx.js keeps the timing) ---------- */
const GHOSTS = [];
H3.ghost = function (fig, parent, col, add) {
  const i = fig.gk = (fig.gk + 1) % 8; let gh = fig.ghosts[i];
  if (!gh || gh.parent !== parent) {
    const mt = new T.MeshBasicMaterial({ skinning: true, transparent: true, depthWrite: false, color: col, blending: add ? T.AdditiveBlending : T.NormalBlending, side: T.DoubleSide });
    mt.userData.lk = mt.userData.bl = mt.userData.solid = true;
    const sk = new T.Skeleton(fig.skel.bones, fig.skel.boneInverses); sk.update = function () {};
    gh = new T.SkinnedMesh(fig.mesh.geometry, mt); gh.bindMode = 'detached'; gh.bind(sk, new T.Matrix4()); gh.bindMatrixInverse.identity();
    gh.frustumCulled = false; gh.renderOrder = 2; parent.add(gh); fig.ghosts[i] = gh;
  }
  const n = fig.bones.length * 16; gh.skeleton.boneMatrices.set(fig.skel.boneMatrices.subarray(0, n)); if (gh.skeleton.boneTexture) gh.skeleton.boneTexture.needsUpdate = true;
  gh.material.color.setHex(col).multiplyScalar(add ? 0.5 : 1); gh.material.blending = add ? T.AdditiveBlending : T.NormalBlending; gh.userData.op = 0; // a whole figure covers more than a card did: dimmer
  gh.scale.set(1, 1, 1); gh.t = 0; gh.life = 0.24; gh.visible = true; if (GHOSTS.indexOf(gh) < 0) GHOSTS.push(gh);
  return gh;
};
H3.step = function (dt, add) {
  for (let i = GHOSTS.length - 1; i >= 0; i--) { const g = GHOSTS[i]; if (!g.visible) { GHOSTS.splice(i, 1); continue; } g.t += dt; const f = g.t / g.life;
    if (f >= 1) { g.visible = false; GHOSTS.splice(i, 1); continue; } g.material.opacity = (g.userData.op || (add ? 0.4 : 0.28)) * (1 - f) * (1 - f); g.scale.y *= 1 + dt * 0.3; }
};
/* The Echo (your last seconds replayed beside you): the same figure, pale and see-through, as the painted echo was. */
H3.ghostly = function (fig, col) {
  const mk = function (vc) { const m = new T.MeshBasicMaterial({ skinning: true, vertexColors: vc, color: col || 0x9fd0ff, transparent: true, opacity: 0.5, side: T.DoubleSide, map: vc ? atlas() : null, alphaTest: vc ? 0.5 : 0 }); m.userData.lk = m.userData.bl = m.userData.solid = true; return m; };
  fig.mesh.material = mk(true); if (fig.wings) fig.wings.material = mk(true); if (fig.glow) fig.glow.visible = false;
  return fig;
};
H3.HERO = HERO;
H3._dbg = function (fig) { return { id: fig.id, tris: fig.tris, bones: fig.bones.length, draws: fig.draws }; }; // for tools
})(typeof window !== 'undefined' ? window : globalThis);
