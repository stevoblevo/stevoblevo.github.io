/* LIVLOCH · heroes3d (0.24): the heroes (four in 0.24; Rook Vale joined in 0.25, see HERO.rook) as small 3D figures with a skeleton, posed every frame from the motion rig.

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
   - 0.25 air: each hero has its own air (see the "0.25 air" section): take-off, rise, top, fall and landing for all; Anna's
     rock-hop and the Skein Doll's spinning tuck for their second jumps; Myra Belle's hover with fast wings; Dora's hat.
   - 0.26 guard: the guards on the second jump (Anna's aegis, Dora's astral bubble, Skye's fray), Dora's thrown hat and
     Rook's barrel roll (see the "0.26 guard" section); gfx hands the guard events on through H3.guardEvent.
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
let _eY = null;
function MY(x, y, z, tilt, a, roll, sx, sy, sz) { _eY = _eY || new T.Euler(); _eY.set(tilt || 0, a || 0, roll || 0, 'YXZ'); _q.setFromEuler(_eY); _v3.set(x, y, z); _v2.set(sx, sy, sz); return new T.Matrix4().compose(_v3, _q, _v2); } // 0.24.1: for hair locks
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
  // 14 Rook Vale's face (0.25 rook): grey-teal eyes, level brows, a small sideways smile, wind in the cheeks
  at(14, function (g) { eye(g, 36, 64, 12, 14, '#3a6a70', '#1c2634'); eye(g, 92, 64, 12, 14, '#3a6a70', '#1c2634'); g.strokeStyle = '#2a3446'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(23, 43); g.lineTo(48, 41); g.moveTo(80, 41); g.lineTo(105, 43); g.stroke();
    blush(g, 20, 86, 13, 'rgba(240,120,100,0.5)'); blush(g, 108, 86, 13, 'rgba(240,120,100,0.5)'); g.strokeStyle = '#7a3a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(54, 100); g.quadraticCurveTo(66, 106, 78, 97); g.stroke(); });
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
  const U = { uRim: { value: lp.rim }, uRimK: { value: lp.rimK }, uLift: { value: lp.lift }, uGain: { value: lp.gain }, uSat: { value: lp.sat }, uTint: { value: lp.tint }, uEmK: { value: lp.emK }, uKey: { value: lp.key },
    uFray: { value: 0 }, uFT: { value: 0 }, uFrayC: { value: new T.Color(0x5fe8c8) } }; // 0.26 guard: the fray (Skye's guard), 0 for everyone else
  m.onBeforeCompile = function (sh) {
    for (const k in U) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEm;\nattribute float aH;\nvarying float vEm;\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEm = aEm; vH = aH;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK; uniform float uLift; uniform float uGain; uniform float uSat; uniform vec3 uTint; uniform float uEmK; uniform float uKey; uniform float uFray; uniform float uFT; uniform vec3 uFrayC;\nvarying float vEm;\nvarying float vH;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, uSat) * uTint;')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;', [
        'vec3 outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * uGain + diffuseColor.rgb * uLift;',
        'outgoingLight += diffuseColor.rgb * uKey * max(dot(normal, normalize(vec3(-0.75, 0.5, 0.45))), 0.0);', // a key light from the camera's upper left, so a back seen from behind still has form
        'if (!gl_FrontFacing) outgoingLight *= 0.62;', // the inside of cloth and hats
        'outgoingLight *= mix(0.58, 1.0, smoothstep(0.0, 0.17, vH));', // contact darkness toward the ground
        'vec3 hv = normalize(vViewPosition); float fr = 1.0 - clamp(abs(dot(normal, hv)), 0.0, 1.0);',
        'float rim = smoothstep(0.52, 0.96, fr) * clamp(normal.y * 0.65 + 0.55, 0.0, 1.0);',
        'outgoingLight += uRim * rim * uRimK * (0.3 + 0.7 * smoothstep(0.2, 0.75, vH));',
        'outgoingLight += diffuseColor.rgb * vEm * uEmK;',
        // 0.26 guard: the fray. The body comes apart in level bands (threads) that slide up; what is left glows at its edges
        'if (uFray > 0.001) { float bd = fract(vH * 31.0 - uFT * 1.6 + 0.12 * sin(vH * 9.0 + uFT * 2.7)); float cut = uFray * 0.66; if (bd < cut) discard;',
        '  float ed = 1.0 - smoothstep(cut, cut + 0.16, bd); outgoingLight = mix(outgoingLight, uFrayC * 0.9, uFray * 0.2) + uFrayC * ed * uFray * 0.75; }'].join('\n'));
  };
  m.customProgramCacheKey = function () { return 'hero3d2'; }; // 0.26 guard: the fray changed the shader
  m.userData.U = U; // 0.25 rook: a figure may turn its own glow up (Rook's lantern in a lift)
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
    /* 0.24.1 hair, after the turnaround: a tousled wavy bob wider than the head, a fringe swept to one side, locks that flip
       out at the jaw, a few lifted over the crown; shaded light on top and dark underneath instead of stripes (which read as a
       raspberry from behind). The curl on top stays on its own bone. */
    const hairL = 0xa04a82, R = P.headR, C = P.headC;
    const hcol = function (lx, ly) { return ly < -0.35 ? hairD : (ly > 0.6 ? hairL : hair); }, lcol = function (lx, ly) { return ly < -0.35 ? hairD : hair; };
    B.add(new T.SphereGeometry(1, 16, 10, Math.PI / 2 + 0.85, TAU - 1.7, 0, 2.05), M(0, C + 0.03, -0.03, 0, 0, 0, R * 1.18, R * 1.13, R * 1.17), hcol, 'head'); // the volume, open at the face
    B.add(new T.SphereGeometry(1, 14, 5, 0, TAU, 0, 1.1), M(0, C + 0.05, -0.005, 0.2, 0, 0, R * 1.17, R * 1.11, R * 1.15), hcol, 'head'); // over the crown and the forehead
    const lock = function (a, y, rr, tilt, roll, w, h, d, col) { B.add(sph(7, 5), MY(Math.sin(a) * rr, y, Math.cos(a) * rr - 0.03, tilt, a, roll, w, h, d), col, 'head'); };
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.6 + i / 6 * Math.PI * 0.8, k = i % 2; lock(a, C - 0.12 - k * 0.04, R * 1.0, -0.5 - k * 0.15, k ? 0.3 : -0.25, 0.115, 0.15 + k * 0.025, 0.07, lcol); } // the hem, flipping out
    [[-0.55, 0.1], [-0.2, 0.14], [0.15, 0.15], [0.48, 0.11]].forEach(function (f) { lock(f[0], C + f[1], R * 1.05, 0.45, 0.55, 0.08, 0.115, 0.045, 0x8e3c72); }); // the fringe, swept (a shade lighter: it faces down into shadow)
    [[0.8, 0.2], [1.05, 0.25], [1.3, 0.21]].forEach(function (c) { lock(Math.PI * c[0], C + c[1], R * 0.98, -1.15, 0.3 * (c[0] - 1.05) * 4, 0.1, 0.13, 0.05, hair); }); // lifted over the crown
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

/* ROOK VALE, the Wick Aviator (0.25 rook). The fifth hero. He comes from the Lantern Ford study branch
   (work/lantern-ford-wick-aviator: WICK-AVIATOR.md and the turnaround art/heroes/wick-aviator.svg); this figure is built after
   that turnaround. A loch courier: a cobalt wool coat to the knee with pale stitching, tan straps, a pale ceramic hood with a
   mint visor pushed up on the brow, a mint kite scarf whose tail is a kite's tail (bows down its length, a verlet chain), and
   on his back the lantern-kite: a wood frame, two swept kite fins hinged at its sides, and a faceted wick lantern held
   between them. Original design: no film likeness, no logo, no finned helmet.
   The back is the silhouette, because the play camera sits behind him: frame, fins above the shoulders, the lantern glowing
   in the middle, the scarf tail down one side of it. His gun (Wick sparks) is a brass wick-striker in the right hand.
   pose() is his own layer over the shared pose (one hook in H3.pose): on the ground the fins fold back and tick with the
   stride; in a Lantern Lift (the unit's liftT and glide, read only) the body tips into the flight and banks with a turn, the
   legs trail, the free arm goes out, the fins spread and the lantern burns brighter while he is rising. */
HERO.rook = {
  P: { H: 2.42, ankle: 0.1, knee: 0.53, hip: 0.98, hipW: 0.105, pelv: 1.02, spine: 1.15, chest: 1.33, neck: 1.54, head: 1.62, headC: 1.85, headR: 0.24,
    shY: 1.46, shX: 0.225, upper: 0.27, fore: 0.24, foot: 0.145 },
  two: false, item: 'striker',
  coat: { name: 'ct', parent: 'hips', pivot: 1.2, mid: null, hem: 0.72, top: 1.22, firm: 0.35,
    rows: [[1.26, 0.21, 0.16], [1.18, 0.225, 0.175], [1.05, 0.25, 0.195], [0.92, 0.275, 0.215], [0.8, 0.295, 0.235], [0.72, 0.31, 0.245]],
    groups: [{ lo: 0, hi: Math.PI, az: [0.45, Math.PI / 2, Math.PI - 0.45] }, { lo: Math.PI, hi: TAU, az: [Math.PI + 0.45, 1.5 * Math.PI, TAU - 0.45] }] },
  /* the scarf's tail: from the nape, over the top of the pack on his left, down beside the lantern. back: the surface it must
     stay behind (the neck, then the pack's frame), as a shell profile. */
  chains: [{ pre: 'kt', n: 5, seg: 0.145, back: [[1.7, 0.14, 0.14], [1.6, 0.2, 0.2, -0.01], [1.54, 0.3, 0.315, -0.02], [0.92, 0.3, 0.315, -0.02], [0.88, 0.22, 0.18], [0.6, 0.3, 0.25]] }],
  KT: { x: 0.165, y: 1.575, z: -0.345 }, PK: { y: 1.23, z: -0.27, w: 0.26, h: 0.31, fin: 0.72 },
  rig: function (r, P) {
    const K = this.KT, PK = this.PK;
    let par = 'chest'; for (let i = 0; i < 5; i++) { r.b('kt' + i, par, K.x + i * 0.006, K.y - i * 0.145, K.z - i * 0.004); par = 'kt' + i; }
    r.b('pack', 'chest', 0, PK.y, -0.16);
    r.b('finL', 'pack', PK.w, PK.y, PK.z - 0.04).b('finR', 'pack', -PK.w, PK.y, PK.z - 0.04);
    r.b('wick', 'pack', 0, PK.y, PK.z - 0.17);
    addPanels(r, P, this.coat);
  },
  body: function (B, P) {
    /* 0.26: the owner's palette, "copper mint tea": copper and rose gold, with copper sulfate's aquamarine teal for the
       highlights (stitches, laces, scarf, the hood's strokes) and a lantern glazed like a sulfate crystal. */
    const wool = 0xb06a50, woolD = 0x7a4234, woolL = 0xe0a48a, stitch = 0x5fe0d2, tan = 0x8f5b42, tanD = 0x5f3a2b, wood = 0xc9876c, woodL = 0xf1c4ad, kite = 0xf3d6c6, cer = 0xd99a82, cerD = 0xa8705e,
      mint = 0x3fd6cc, teal = 0x1d8f9b, gold = 0xffd2b0, skin = 0xe6b592, glove = 0x5a3328, boot = 0x3e2622, brass = 0xd88c66, dark = 0x123c44;
    const K = this.KT, PK = this.PK;
    legs(B, P, { thighR: 0.09, kneeR: 0.078, ankleR: 0.062, thigh: woolD, shin: woolD, boot: boot, bootTop: 0.4, bootR: 0.086, cuff: 0.05, bootCuff: 0x2fb8b2, laceBack: 0x2fb8b2, footW: 0.08, footH: 0.064, sole: 0x241c24 });
    const tw = torsoW(P), ct = this.coat, pw = panelW(ct, 'hips');
    // the coat above the belt: cobalt wool, a pale dashed seam down the front
    B.add(shellG([[P.neck + 0.02, 0.075, 0.075], [P.shY + 0.04, 0.17, 0.13], [P.chest, 0.2, 0.152], [1.26, 0.21, 0.16], [P.pelv - 0.04, 0.2, 0.158], [P.hip - 0.02, 0.2, 0.158]], 18, 0, TAU), null,
      function (lx, ly, lz, wx, wy, wz) { return Math.abs(wx - 0.03) < 0.012 && wz > 0 && wy < P.shY && frac(wy * 16) < 0.55 ? stitch : wool; }, tw);
    // the skirt of the coat: split front and back so the stride shows, darker toward the hem, a line of pale stitches above it
    [[0.05, Math.PI - 0.07], [Math.PI + 0.07, TAU - 0.05]].forEach(function (hf) {
      B.add(shellG(ct.rows, 12, hf[0], hf[1]), null, function (lx, ly, lz, wx, wy, wz) { const a = Math.atan2(wx, wz), e = Math.min(Math.abs(a), Math.PI - Math.abs(a)); if (e < 0.085 && wy < 1.05) return woolL; return wy < 0.78 ? woolD : wool; }, pw);
      B.add(shellG(shellOut(ct.rows, 0.006, 0.83, 0.79, 1), 12, hf[0] + 0.04, hf[1] - 0.04, { tile: 2 }), null, 0xffffff, pw, { uv: cellUV(9) });
    });
    // the belt, its pouch, and the pack's straps: over each shoulder to the belt, one across the chest
    B.add(shellG([[1.27, 0.22, 0.172], [1.21, 0.22, 0.172]], 18, 0, TAU), null, tan, [['hips', 0.5], ['spine', 0.5]]);
    B.add(new T.BoxGeometry(0.06, 0.055, 0.02), M(0, 1.24, 0.175), brass, [['hips', 0.5], ['spine', 0.5]]);
    B.add(new T.BoxGeometry(0.1, 0.11, 0.06), M(0.19, 1.15, 0.1, 0, 0.9, 0), tanD, 'hips');
    [1, -1].forEach(function (k) {
      B.add(capG([k * 0.13, 1.53, 0.075], [k * 0.105, 1.27, 0.165], 0.03, 0.03, 5, 1), M(0, 0, 0.015, 0, 0, 0, 1, 1, 0.55), tan, tw);
      B.add(capG([k * 0.13, 1.54, 0.06], [k * 0.15, 1.5, -0.14], 0.03, 0.03, 5, 1), null, tan, 'chest');
    });
    B.add(new T.BoxGeometry(0.23, 0.035, 0.02), M(0, 1.39, 0.158), tan, 'chest'); B.add(sph(6, 5), M(0, 1.39, 0.17, 0, 0, 0, 0.022, 0.022, 0.012), brass, 'chest');
    arms(B, P, { upperR: 0.074, upper: wool, elbowR: 0.068, wristR: 0.06, fore: wool, cuff: glove, cuffH: 0.075, foreTop: woolL, foreTopH: 0.03, hand: glove, handR: 0.058 });
    [1, -1].forEach(function (k) { B.add(sph(8, 6), M(k * (P.shX + 0.005), P.shY + 0.005, 0, 0, 0, 0, 0.088, 0.07, 0.09), woolL, [['arm' + (k > 0 ? 'L' : 'R'), 0.6], ['chest', 0.4]]); }); // shoulder caps
    headBall(B, P, { skin: skin, face: 14, neckR: 0.062 });
    // the hood: pale glazed ceramic, open at the face, three cream strokes over the crown, a guard down the back of the neck
    const R = P.headR, C = P.headC;
    const hcol = function (lx, ly, lz) { const a = Math.atan2(lx, lz); if (ly > 0.35 && lz < 0.75 && Math.min(Math.abs(a), Math.abs(Math.abs(a) - 0.5)) < 0.085 && Math.abs(a) < 0.62) return 0x7ff0e4; if (lz < -0.2 && Math.abs(lx) < 0.1 && ly < 0.8) return cerD; return ly < -0.45 ? cerD : cer; }; // and a seam down the back
    B.add(new T.SphereGeometry(1, 16, 10, Math.PI / 2 + 0.78, TAU - 1.56, 0, 2.1), M(0, C + 0.015, -0.012, 0, 0, 0, R * 1.14, R * 1.1, R * 1.14), hcol, 'head');
    B.add(new T.SphereGeometry(1, 14, 5, 0, TAU, 0, 1.02), M(0, C + 0.03, 0.006, 0.16, 0, 0, R * 1.13, R * 1.08, R * 1.14), hcol, 'head');
    B.add(shellG([[C - 0.1, R * 1.1, R * 1.08, -0.012], [C - 0.2, R * 0.98, R * 0.98, -0.02], [C - 0.27, R * 0.9, R * 0.95, -0.03]], 10, Math.PI - 1.35, Math.PI + 1.35), null, function (lx, ly, lz, wx, wy) { return wy < C - 0.245 ? cerD : cer; }, [['head', 0.75], ['neck', 0.25]]);
    B.add(new T.TorusGeometry(R * 1.15, 0.016, 4, 16), M(0, C + 0.085, -0.008, Math.PI / 2 + 0.2, 0, 0), tanD, 'head'); // the visor's strap
    B.add(shellG([[C + 0.2, R * 1.1, R * 1.12, 0.0], [C + 0.155, R * 1.19, R * 1.22, 0.004], [C + 0.105, R * 1.16, R * 1.2, 0.004]], 8, -0.82, 0.82), null, function (lx, ly, lz, wx, wy) { return Math.abs(wx) < 0.022 ? tanD : (wy > C + 0.18 ? 0xd8fff0 : mint); }, 'head', { em: 0.22 }); // the visor, pushed up
    // the kite scarf: a mint roll round the neck (teal in the folds), the knot on his left, and the tail
    B.add(shellG([[1.685, 0.105, 0.1, 0.0], [1.645, 0.165, 0.158, -0.004], [1.59, 0.2, 0.185, -0.01], [1.535, 0.2, 0.185, -0.016], [1.5, 0.15, 0.135, -0.016]], 16, 0, TAU), null,
      function (lx, ly, lz, wx, wy, wz) { return frac(Math.atan2(wx, wz) * 1.6 + wy * 9) < 0.2 ? teal : mint; }, [['chest', 0.7], ['neck', 0.3]]);
    B.add(capG([K.x - 0.03, 1.6, -0.17], [K.x, K.y, K.z + 0.01], 0.05, 0.045, 6, 1), null, mint, 'chest'); B.add(sph(8, 6), M(K.x, K.y + 0.005, K.z + 0.012, 0, 0, 0, 0.07, 0.06, 0.055), teal, 'chest'); // the scarf's end runs back over the top of the frame to its knot
    for (let i = 0; i < 5; i++) { const y0 = K.y - i * 0.145, x0 = K.x + i * 0.006, z0 = K.z - i * 0.004 - 0.012, w = 0.125 * (1 - i * 0.11);
      B.add(new T.PlaneGeometry(w, 0.15, 1, 1), M(x0, y0 - 0.0725, z0, 0.08, 0, 0), function (lx, ly) { return i === 4 && ly < -0.01 ? gold : (i === 3 || (i === 4) ? 0x24a9b0 : mint); }, 'kt' + i, { em: i === 4 ? 0.12 : 0 });
      if (i === 1 || i === 3) [1, -1].forEach(function (k) { B.add(new T.ConeGeometry(0.05, 0.11, 3), M(x0 + k * 0.075, y0 - 0.075, z0 - 0.004, 0, 0, k * Math.PI / 2, 1, 1, 0.3), i === 1 ? gold : teal, 'kt' + i); }); } // a kite tail's bows
    // THE LANTERN-KITE. The frame: an eight-sided wooden board on the back, a dark slate panel set in it.
    B.add(new T.CylinderGeometry(1, 1, 1, 8, 1, false, Math.PI / 8), M(0, PK.y, PK.z, Math.PI / 2, 0, 0, PK.w, 0.11, PK.h), function (lx, ly, lz) { return ly < -0.45 ? wood : (lz < -0.3 ? woodL : wood); }, 'pack');
    B.add(new T.CylinderGeometry(1, 1, 1, 8, 1, false, Math.PI / 8), M(0, PK.y, PK.z - 0.058, Math.PI / 2, 0, 0, PK.w * 0.78, 0.016, PK.h * 0.8), dark, 'pack');
    [1, -1].forEach(function (k) { B.add(new T.ConeGeometry(0.07, 0.15, 3), M(k * 0.2, PK.y - PK.h - 0.03, PK.z - 0.03, Math.PI, 0, k * 0.5, 1, 1, 0.3), 0x6fe6dc, 'pack'); }); // two pale tabs at the foot of the frame
    // the two wooden arms that carry the lantern between the fins, with brass pins at the hinges
    [0.2, -0.2].forEach(function (dy) { B.add(new T.BoxGeometry(PK.w * 2 + 0.03, 0.028, 0.034), M(0, PK.y + dy, PK.z - 0.1), woodL, 'pack');
      [1, -1].forEach(function (k) { B.add(capG([k * PK.w, PK.y + dy, PK.z - 0.02], [k * PK.w, PK.y + dy, PK.z - 0.12], 0.02, 0.02, 5, 1), null, wood, 'pack'); B.add(sph(5, 4), M(k * PK.w, PK.y + dy, PK.z - 0.125, 0, 0, 0, 0.026, 0.026, 0.02), brass, 'pack'); }); });
    // the wick lantern: a faceted mint glass, brass caps top and bottom, a bright core
    const ly0 = PK.y, lz0 = PK.z - 0.17;
    B.add(new T.OctahedronGeometry(1, 0), M(0, ly0, lz0, 0, Math.PI / 4, 0, 0.125, 0.185, 0.115), function (lx, ly) { return Math.abs(ly) < 0.3 ? 0x8ff6ee : 0x2fc4c0; }, 'wick', { em: function (lx, ly) { return Math.abs(ly) < 0.3 ? 0.62 : 0.4; } });
    B.add(new T.ConeGeometry(0.05, 0.07, 6), M(0, ly0 + 0.19, lz0), brass, 'wick'); B.add(new T.ConeGeometry(0.045, 0.06, 6), M(0, ly0 - 0.185, lz0, Math.PI), brass, 'wick');
    B.add(new T.TorusGeometry(0.03, 0.007, 4, 8), M(0, ly0 + 0.235, lz0, 0, Math.PI / 2, 0), brass, 'wick');
    // the fins: swept kite vanes, cream cloth on a wooden spar, hinged at the frame's sides, folded back by this.PK.fin at rest
    const fin = new T.Shape(); [[0, 0.27], [0.15, 0.5], [0.21, 0.36], [0.2, -0.06], [0.07, -0.25], [0, -0.1]].forEach(function (q, i) { if (i) fin.lineTo(q[0], q[1]); else fin.moveTo(q[0], q[1]); });
    [1, -1].forEach(function (k) { const n = k > 0 ? 'finL' : 'finR', m = M(k * PK.w, PK.y, PK.z - 0.04, 0, k * PK.fin, 0, k, 1, 1);
      B.add(new T.ExtrudeGeometry(fin, { depth: 0.014, bevelEnabled: false }), m, function (lx, ly) { const d = Math.abs((lx - 0.0) * 0.23 - (ly - 0.27) * 0.15) / 0.2746; if (lx > 0.004 && frac((ly + 1) * 9) < 0.45 && Math.abs(lx - 0.1) < 0.012) return stitch; return ly > 0.4 || lx > 0.185 ? woodL : kite; }, n);
      B.add(capG([0, 0.27, 0.007], [0.15, 0.5, 0.007], 0.017, 0.012, 5, 1), m, wood, n); B.add(capG([0, 0.29, 0.007], [0, -0.12, 0.007], 0.019, 0.016, 5, 1), m, wood, n); B.add(capG([0.15, 0.5, 0.007], [0.2, -0.06, 0.007], 0.011, 0.009, 4, 1), m, wood, n); });
    // the wick-striker he fires with: a brass tube from the right fist, a guard ring, a lit tip
    const hx = -P.shX, hy = P.shY - P.upper - P.fore - 0.05;
    B.add(capG([hx, hy + 0.04, 0.02], [hx, hy - 0.25, 0.02], 0.027, 0.022, 6, 1), null, function (lx, ly, lz, wx, wy) { return wy > hy - 0.04 ? tanD : brass; }, 'handR');
    B.add(new T.TorusGeometry(0.034, 0.009, 4, 8), M(hx, hy - 0.06, 0.02, Math.PI / 2, 0, 0), brass, 'handR');
    B.add(sph(6, 5), M(hx, hy - 0.275, 0.02, 0, 0, 0, 0.03, 0.036, 0.03), 0xd8fff0, 'handR', { em: 0.9 });
  },
  glow: { bone: 'wick', y: 0, z: -0.06, col: 0x5ff0e2, size: 1.15 },
  pose: function (fig, st, h, c) {
    const b = fig.b, S = fig.S, dt = c.dt, red = c.red, PK = this.PK;
    const aloft = (h.liftT > 0 || h.glide) && h.alive !== false, rising = h.liftT > 0;
    S.lift = (S.lift || 0) + ((aloft ? 1 : 0) - (S.lift || 0)) * ease(aloft ? 9 : 12, dt); S.rise = (S.rise || 0) + ((rising ? 1 : 0) - (S.rise || 0)) * ease(rising ? 12 : 4, dt);
    const L = red ? (aloft ? 1 : 0) : S.lift, rs = red ? (rising ? 1 : 0) : S.rise, t = c.t, wob = red ? 0 : 1;
    // the fins: folded back on the ground (further at a run, ticking with the stride), spread wide in a lift, and they shiver in the air
    const fold = (0.1 + 0.22 * c.mix) * (1 - L) - L * 1.0 + wob * (0.04 * c.mix * Math.sin(c.ph * 2) * (1 - L) + L * 0.05 * Math.sin(t * 17));
    const dihedral = L * (0.2 + 0.1 * rs) + wob * L * 0.04 * Math.sin(t * 13 + 1);
    b.finL.rotation.set(0, PK.fin * fold, dihedral); b.finR.rotation.set(0, -PK.fin * fold, -dihedral);
    b.pack.rotation.set(wob * 0.025 * c.mix * Math.sin(c.ph * 2 + 0.6) * (1 - L), 0, wob * 0.03 * c.mix * Math.sin(c.ph) * (1 - L));
    // the lantern: steady on the ground, brighter in the glide, brightest while it is lifting him (with a flicker)
    const burn = 1 + L * 0.15 + rs * (0.3 + wob * 0.08 * Math.sin(t * 31));
    if (fig.mat.userData.U) fig.mat.userData.U.uEmK.value = (fig.emK0 || (fig.emK0 = fig.mat.userData.U.uEmK.value)) * burn;
    if (fig.glow) { const g0 = this.glow.size * (1 + 0.5 * (burn - 1)); fig.glow.scale.set(g0, g0, 1); fig.glow.material.opacity = clamp(0.45 + 0.4 * (burn - 1), 0, 0.8); }
    if (L < 0.002) return;
    // the body tips into the flight and banks with a turn; upright while it climbs, flatter in the glide
    const fwd = clamp(S.vz / 9, -0.5, 1), sideV = clamp(S.vx / 9, -1, 1);
    const tip = L * ((0.2 + 0.5 * (1 - rs)) * Math.max(0, fwd) + 0.12 * (1 - rs) + Math.min(0, fwd) * 0.3), bank = -L * sideV * 0.42;
    b.hips.rotation.x += tip; b.hips.rotation.z += bank; b.hips.rotation.y *= 1 - L;
    b.spine.rotation.x -= tip * 0.2; b.chest.rotation.x -= tip * 0.25; b.head.rotation.x -= tip * 0.5; b.head.rotation.z -= bank * 0.5;
    // legs trail: one almost straight, one knee a little bent, toes pointed, a slow scissor
    const sc = wob * 0.07 * Math.sin(t * 3.1);
    for (let k = 0; k < 2; k++) { const n = k ? 'R' : 'L', side = k ? -1 : 1, th = b['thigh' + n], sh = b['shin' + n], ft = b['foot' + n];
      const tq = Q('rkt').setFromEuler(_e.set((k ? 0.5 : 0.16) + 0.3 * (1 - rs) + (k ? sc : -sc) - Math.min(0, fwd) * 0.5, 0, side * 0.07 - bank * 0.3)); th.quaternion.slerp(tq, L);
      const bend = (k ? 0.22 : 0.62) + 0.15 * rs; sh.quaternion.slerp(Q('rks').setFromAxisAngle(X_AX, bend), L); ft.quaternion.slerp(Q('rkf').setFromAxisAngle(X_AX, 0.75), L); }
    // arms: the free one out and a little back for balance, the gun arm the same until the aim takes it (the aim IK runs next)
    for (let k = 0; k < 2; k++) { const n = k ? 'R' : 'L', side = k ? -1 : 1, A = b['arm' + n], F = b['fore' + n];
      const p = 0.35 + 0.25 * (1 - rs) + (k ? -sc : sc), ab = side * (0.95 + 0.15 * rs) - bank * 0.6, el = 0.3;
      A.rotation.set(A.rotation.x + (p - A.rotation.x) * L, 0, A.rotation.z + (ab - A.rotation.z) * L); F.rotation.x += (-el - F.rotation.x) * L; }
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
  fig.gctx = ctx || null; // 0.26 guard: guard meshes are built when first needed, with gfx's glow sprites
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

/* ---------- 0.25 air ----------
   Poses for the air, from the rig's air envelopes (st.airs, from LL.paperMotion's airStep) and the unit. Every hero: the
   take-off (legs straight, toes pointed, arms swung up, chest up, cloth kicked), the rise (one knee up, the other leg
   trailing, arms up and out), the top (knees tucked, arms wide), the fall (legs reaching down and apart, arms up for
   balance) and the landing (the rig's squash: knees give, arms come forward and down). The second jump, by hero (AIR2):
   Anna's rock-hop (one boot stamps down and back on nothing, the other knee drives up, the arms pump, the coat flares,
   the braid is whipped down) and the Skein Doll's tuck (a loose forward somersault about her middle, knees in, arms and
   yarn flung out). Myra Belle's hover: legs dangle and kick slowly, the body tilts toward where she drifts and bobs with
   each beat, the skirt bells and flutters, the curl bounces, the wings open wider and beat fast. Dora's hat presses down
   at the take-off, lifts off her head at the top and lands with her. Reduced motion: still shapes, no somersault, no beat. */
const AIR2 = { anna: 'hop', skein: 'tuck' };
const AF = { x: 0, y: 0, z: 0, p: 0 }, AA = { p: 0, ab: 0, el: 0 }, NOAIR = { tko: 0, rise: 0, apex: 0, fall: 0, dbl: 0, dblP: 1, hov: 0, tk: 9, n: 0 };
function airPrep(fig, st, h, dt, red) {
  const S = fig.S, A = st.airs || NOAIR;
  const K = S.ak || (S.ak = { n: A.n, tk: 9, flip: 0, hopE: 0, tuckE: 0, hov: 0, land: 0 });
  K.A = A; K.style = AIR2[fig.id] || 'hop';
  const p = A.dblP;
  K.hopE = K.style === 'hop' && p < 1 ? ss(0, 0.1, p) * (1 - ss(0.45, 1, p)) : 0;
  K.tuckE = K.style === 'tuck' && p < 1 ? ss(0, 0.1, p) * (1 - ss(0.78, 1, p)) : 0;
  K.flip = K.style === 'tuck' && p < 1 && !red ? TAU * (1 - Math.cos(Math.PI * p)) / 2 : 0;
  K.hov = A.hov; K.land = red ? 0 : clamp(st.squash || 0, 0, 1);
  const takeoff = A.tk < K.tk; K.tk = A.tk; // a new take-off or a new second jump: kick the cloth, the hat, the braid
  if (!red && takeoff) { S.aflv = (S.aflv || 0) + 2.4; S.hatYv = (S.hatYv || 0) - 0.9; }
  if (A.n !== K.n) { K.n = A.n; if (!red) { S.aflv = (S.aflv || 0) + (K.style === 'tuck' ? 3 : 2.6); airWhip(fig, h, K.n); } }
  return K;
}
/* Foot targets in the air (the hips' ground frame: x left, y up from the soles' plane, z forward), blended in by air. */
function airFoot(fig, K, k, side, fw, legL, air, t, red) {
  const A = K.A; let R = A.rise, Ap = A.apex, F = A.fall; if (R + Ap + F < 1e-3) Ap = 1; const w = R + Ap + F;
  let y = ((k ? 0.2 : 0.4) * R + (k ? 0.34 : 0.48) * Ap + (k ? 0.05 : 0.1) * F) / w;
  let z = ((k ? -0.24 : 0.22) * R + (k ? -0.06 : 0.2) * Ap + (k ? -0.06 : 0.1) * F) / w;
  let p = (0.55 * R + 0.4 * Ap + 0.3 * F) / w, x = side * fw * (1.05 + 0.2 * F / w);
  const tk = A.tko; y += (0 - y) * tk; z += ((k ? -0.12 : 0.04) - z) * tk; p += (1.0 - p) * tk; // take-off: straight legs, toes pointed
  if (K.hopE > 0) { const e = K.hopE; // the right boot stamps down and back on nothing; the left knee drives up
    y += ((k ? -0.08 : 0.66) - y) * e; z += ((k ? -0.38 : 0.36) - z) * e; p += ((k ? -0.15 : 0.35) - p) * e; }
  if (K.tuckE > 0) { const e = K.tuckE, l = red ? 0 : Math.sin(K.flip * 1.5 + k * 2.1) * 0.08; // knees in, loosely
    y += (0.64 + l - y) * e; z += (0.32 - l - z) * e; p += (0.5 - p) * e; x += (side * fw * 1.5 - x) * e; }
  if (K.hov > 0.001) { const e = K.hov, ph = (red ? 0 : t * 3.4) + k * Math.PI, kick = Math.max(0, Math.sin(ph)); // dangling, kicking slowly
    y += (0.08 + 0.18 * kick - y) * e; z += (0.12 * Math.sin(ph) + (k ? -0.05 : 0.05) - z) * e; p += (0.6 + 0.2 * kick - p) * e; x += (side * fw * 0.85 - x) * e; }
  AF.x += (x - AF.x) * air; AF.y += (fig.P.ankle + legL * y - AF.y) * air; AF.z += (z * legL - AF.z) * air; AF.p += (p - AF.p) * air;
}
/* Arm angles in the air (as the arm loop's p: + back, - forward and up; ab: out from the side; el: elbow bend), then the
   landing. Seen from behind (the play camera) an arm raised forward hides behind the body, so the height is in ab: the
   take-off throws both arms up and out in a V, the rise and the fall keep them up and out, the top a little lower. */
function airArm(fig, K, k, side, air, red) {
  const A = K.A; let R = A.rise, Ap = A.apex, F = A.fall; if (R + Ap + F < 1e-3) Ap = 1; const w = R + Ap + F;
  let p = (-0.6 * R - 0.3 * Ap - 0.5 * F) / w, ab = side * (1.7 * R + 1.25 * Ap + 1.6 * F) / w, el = (0.55 * R + 0.35 * Ap + 0.7 * F) / w;
  const tk = A.tko; p += (-0.55 - p) * tk; ab += (side * 2.5 - ab) * tk; el += (0.6 - el) * tk; // take-off: both arms up and out
  if (K.hopE > 0) { const e = K.hopE; p += ((k ? -1.5 : 0.75) - p) * e; ab += (side * (k ? 0.35 : 0.3) - ab) * e; el += ((k ? 0.5 : 0.35) - el) * e; } // a pump against the legs
  if (K.tuckE > 0) { const e = K.tuckE, fl = red ? 0 : Math.sin(K.flip + k * 2.4); p += (-0.5 + 0.7 * fl - p) * e; ab += (side * (1.35 + 0.2 * fl) - ab) * e; el += (0.8 + 0.4 * fl - el) * e; } // flung out, flopping
  if (K.hov > 0.001) { const e = K.hov, b = red ? 0 : Math.sin(fig.S.wph || 0); p += (-0.35 + 0.06 * b - p) * e; ab += (side * (0.6 + 0.05 * b) - ab) * e; el += (0.55 - el) * e; }
  AA.p += (p - AA.p) * air; AA.ab += (ab - AA.ab) * air; AA.el += (el - AA.el) * air;
  const ld = K.land; if (ld > 0.001) { AA.p += (-0.65 - AA.p) * ld * 0.7; AA.ab += (side * 0.4 - AA.ab) * ld * 0.5; AA.el += (0.95 - AA.el) * ld * 0.6; }
}
/* The whole figure: the somersault and the hop's lean turn it about its middle; the hover tilts it toward the drift and
   bobs it with the beat. Then the cloth flare spring (read by cloth()). */
function airRoot(fig, K, dt, red) {
  const S = fig.S, P = fig.P, r = fig.root, A = K.A;
  let rx = K.flip + 0.22 * K.hopE - 0.08 * A.tko, rz = K.groll || 0, dy = 0; // 0.26 guard: K.groll, Rook's barrel roll (guardPrep)
  if (K.hov > 0.001 && !red) { const e = K.hov; rx += clamp(S.vz * 0.035, -0.12, 0.2) * e; rz -= clamp(S.vx * 0.04, -0.2, 0.2) * e; dy += 0.03 * Math.sin((S.wph || 0) - 0.6) * e; }
  if (rx || rz) { const cy = P.pelv + 0.12, v = V('apv').set(0, cy, 0); r.rotation.set(rx, 0, rz); v.applyEuler(r.rotation); r.position.x -= v.x; r.position.y += cy - v.y; r.position.z -= v.z; }
  r.position.y += dy;
  const fT = red ? 0 : 0.14 * K.hov + 0.05 * K.hov * Math.sin((S.wph || 0) + 1.2) + 0.35 * K.tuckE + 0.12 * K.hopE + 0.1 * K.land;
  if (S.afl == null) { S.afl = 0; S.aflv = S.aflv || 0; } spring(S, 'afl', 'aflv', fT, 70, 7, dt);
}
/* A second jump whips the braid: its links are given a speed down and to one side (alternating), growing to the tip. */
function airWhip(fig, h, n2) { const c = fig.S.chbr; if (!c) return; const n = c.p.length - 1, s = n2 % 2 ? 1 : -1, lx = Math.cos(h.yaw || 0) * s, lz = -Math.sin(h.yaw || 0) * s;
  for (let i = 1; i <= n; i++) { const k = i / n; c.q[i].y = c.p[i].y + 0.03 * k; c.q[i].x = c.p[i].x - lx * 0.04 * k; c.q[i].z = c.p[i].z - lz * 0.04 * k; } }
/* After the pendulums: Dora's hat, the Skein Doll's yarn, Myra's curl and wings. */
function airAfter(fig, K, dt, red, air, dash, mix) {
  const S = fig.S, b = fig.b, A = K.A;
  if (b.hat) { if (S.hatY == null) { S.hatY = 0; S.hatYv = S.hatYv || 0; } spring(S, 'hatY', 'hatYv', red ? 0 : 0.03 * A.apex + 0.04 * A.fall - 0.03 * K.land, 110, 8, dt);
    b.hat.position.y = b.hat.userData.rest.y + S.hatY; b.hat.rotation.x += S.hatY * 1.2; }
  if (K.tuckE > 0 && b.hairL) { const e = K.tuckE * 0.9; b.hairL.rotation.z += e; b.hairR.rotation.z -= e; b.hairB.rotation.x += e * 0.8; }
  if (b.curl && K.hov > 0.001 && !red) b.curl.rotation.x += 0.35 * Math.sin((S.wph || 0) - 1.4) * K.hov;
  if (b.wingL) { // folded, they flutter as before; hovering they open wider and beat fast: swept back and forth, tips up and down
    const hv = red ? 0 : K.hov, f = red ? 0 : (air > 0.3 || dash > 0.3 ? 15 : 3 + 8 * mix) * (1 - hv) + 33 * hv, amp = red ? 0 : (0.12 + 0.3 * Math.max(mix, air)) * (1 - hv);
    S.wph = (S.wph || 0) + dt * f; const sn = Math.sin(S.wph), fl = sn * amp, sweep = hv * (0.45 + 0.4 * sn), lift = hv * 0.55 * Math.sin(S.wph + 1.2) + (red ? K.hov * 0.35 : 0);
    b.wingL.rotation.set(0.08, 0.1 + fl + sweep, lift); b.wingR.rotation.set(0.08, -0.1 - fl - sweep, -lift);
    const sc = 1 + 0.3 * K.hov; b.wingL.scale.setScalar(sc); b.wingR.scale.setScalar(sc); }
}

/* ---------- 0.26 guard ----------
   What a second jump does in a fight, drawn from the unit (guardK, guardT, guardHp, hat, hatN, rollT, rollMax, rollDir;
   read only) and from the guard events gfx hands on (H3.guardEvent). Each piece is built the first time a hero needs it.
   - Anna, the aegis: a round bronze shield (an owl over an olive sprig inside a key-pattern band; an original design, no
     coin or museum piece copied) raised on her left arm toward the aim, and round her front a faint golden arc that shows
     the 120 degrees it covers. The play camera behind her sees the arc and the shield's rim; a block flashes both.
   - Dora, the astral bubble: a shell of warm light round her, bright at its edge, with stars in it that twinkle; dimmer as
     it fills, a flare where a hit lands, and it pops (swells and fades) when it ends.
   - Skye, the fray: her body comes apart in level bands of thread (uFray in the hero shader) and seven loose strands of
     copper, mint and cream wind out round her, then back in.
   - Dora's hat: hidden on her head while it flies; a copy spins along the model's path with a warm glow. Charged, it glows
     softly on her head. When it comes home it lands with a little bounce.
   - Rook's barrel roll: one turn of the whole figure about its forward axis (guardPrep sets K.groll, airRoot applies it).
   Reduced motion: still shapes (no twinkle, no sliding bands, still strands, no spin; the roll is a lean). Lighter graphics:
   no strands. All of it is flagged so a look leaves its colours alone. */
const GOLD = 0xffd27a;
let DOT = null, AEGIS = null;
function own3(m) { m.userData.lk = m.userData.bl = m.userData.solid = true; return m; }
function dotTex() {
  if (DOT) return DOT; const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (DOT = new T.CanvasTexture(c));
}
/* the shield's face: hammered bronze, a key-pattern band, an owl with its wings folded over an olive sprig */
function aegisTex() {
  if (AEGIS) return AEGIS; const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), C0 = N / 2;
  let gr = g.createRadialGradient(C0 - 30, C0 - 34, 10, C0, C0, C0); gr.addColorStop(0, '#f2c578'); gr.addColorStop(0.55, '#c08236'); gr.addColorStop(1, '#7a4618'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 220; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * C0; g.fillStyle = Math.random() < 0.5 ? 'rgba(255,230,170,0.08)' : 'rgba(60,30,8,0.09)'; g.beginPath(); g.arc(C0 + Math.cos(a) * r, C0 + Math.sin(a) * r, 3 + Math.random() * 5, 0, TAU); g.fill(); } // hammer marks
  const ring = (r, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(C0, C0, r, 0, TAU); g.stroke(); };
  ring(124, 7, '#5a3010'); ring(116, 2, '#ffe0a0'); ring(94, 2, '#ffe0a0'); ring(90, 3, '#6a3a12');
  // the key band between r 96 and 114: a square-wave line that steps in and out, 28 times round
  g.strokeStyle = '#5a3010'; g.lineWidth = 3.2; g.beginPath(); const K = 28;
  for (let k = 0; k <= K * 2; k++) { const a = k / (K * 2) * TAU, r0 = k % 2 ? 111 : 99, r1 = k % 2 ? 99 : 111; if (!k) g.moveTo(C0 + Math.cos(a) * r0, C0 + Math.sin(a) * r0); else g.lineTo(C0 + Math.cos(a) * r0, C0 + Math.sin(a) * r0); g.lineTo(C0 + Math.cos(a) * r1, C0 + Math.sin(a) * r1); }
  g.stroke();
  // the owl, embossed: a dark line under a light one, offset
  const owl = (dx, dy, ink, fill) => {
    g.save(); g.translate(C0 + dx, C0 + 6 + dy); g.strokeStyle = ink; g.lineWidth = 3; g.fillStyle = fill;
    g.beginPath(); g.moveTo(-30, -38); g.lineTo(-18, -24); g.quadraticCurveTo(0, -32, 18, -24); g.lineTo(30, -38); g.quadraticCurveTo(38, -10, 30, 18); g.quadraticCurveTo(18, 46, 0, 50); g.quadraticCurveTo(-18, 46, -30, 18); g.quadraticCurveTo(-38, -10, -30, -38); g.closePath(); if (fill) g.fill(); g.stroke(); // head with ear tufts, the body
    [-13, 13].forEach(function (x) { g.beginPath(); g.arc(x, -10, 11, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, -10, 4.5, 0, TAU); g.fillStyle = ink; g.fill(); }); // the eyes
    g.beginPath(); g.moveTo(-4, 0); g.lineTo(0, 9); g.lineTo(4, 0); g.stroke(); // the beak
    [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 26, 2); g.quadraticCurveTo(s * 30, 30, s * 8, 44); g.stroke(); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(s * (17 - k * 3), 16 + k * 9, 6, s > 0 ? Math.PI * 0.1 : Math.PI * 0.4, s > 0 ? Math.PI * 0.6 : Math.PI * 0.9); g.stroke(); } }); // folded wings, feathers
    g.beginPath(); g.moveTo(-34, 56); g.quadraticCurveTo(0, 50, 36, 58); g.stroke(); // the sprig it stands on
    for (let k = 0; k < 6; k++) { const x = -28 + k * 12, s = k % 2 ? -1 : 1; g.beginPath(); g.ellipse(x, 56 + s * 6, 6, 2.6, s * 0.6, 0, TAU); g.stroke(); } // olive leaves
    [-7, 7].forEach(function (x) { g.beginPath(); g.moveTo(x - 4, 50); g.lineTo(x, 55); g.lineTo(x + 4, 50); g.stroke(); }); // the feet
    g.restore(); };
  owl(1.5, 1.5, 'rgba(255,232,180,0.75)', null); owl(0, 0, '#5a3010', 'rgba(150,90,30,0.35)');
  AEGIS = new T.CanvasTexture(c); return AEGIS;
}
function aegisBuild(fig) {
  const R0 = 0.33, grp = new T.Group(), tex = aegisTex();
  const cap = new T.SphereGeometry(0.6, 28, 7, 0, TAU, 0, Math.asin(R0 / 0.6)); cap.rotateX(Math.PI / 2); cap.translate(0, 0, -0.6 * Math.cos(Math.asin(R0 / 0.6)));
  const pa = cap.attributes.position, uv = cap.attributes.uv; for (let i = 0; i < pa.count; i++) uv.setXY(i, 0.5 + pa.getX(i) / (2 * R0), 0.5 + pa.getY(i) / (2 * R0));
  const face = own3(new T.MeshPhongMaterial({ map: tex, emissiveMap: tex, emissive: 0x6a4420, color: 0xd8c0a0, shininess: 46, specular: 0x8a6a40, side: T.FrontSide }));
  const back = own3(new T.MeshPhongMaterial({ color: 0x8a5a2a, emissive: 0x4a2c12, shininess: 30, specular: 0x6a4a28, side: T.BackSide }));
  grp.add(new T.Mesh(cap, face)); grp.add(new T.Mesh(cap, back));
  const rim = new T.Mesh(new T.TorusGeometry(R0, 0.024, 6, 40), own3(new T.MeshPhongMaterial({ color: 0xc89a58, emissive: 0x5a3a14, shininess: 70, specular: 0xc0a070 }))); grp.add(rim);
  const strap = new T.Mesh(new T.BoxGeometry(0.16, 0.05, 0.03), back); strap.position.set(0, 0, -0.035); grp.add(strap);
  grp.traverse(function (o) { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = 1; } });
  fig.b.chest.add(grp); grp.visible = false;
  // the arc: 120 degrees of faint gold round her front, a key band at its top and foot, bright at its ends
  const A = Math.PI / 3, arcG = new T.SphereGeometry(1.0, 28, 8, Math.PI / 2 - A, 2 * A, 0.78, 1.42);
  const arcM = own3(new T.ShaderMaterial({ uniforms: { uA: { value: 0 }, uF: { value: 0 }, uT: { value: 0 }, uC: { value: new T.Color(GOLD) } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: ['uniform float uA; uniform float uF; uniform float uT; uniform vec3 uC; varying vec2 vUv;',
      'float band(float v0) { float by = (vUv.y - v0) / 0.07; if (by < 0.0 || by > 1.0) return 0.0; float bx = fract(vUv.x * 22.0);',
      '  float l = step(abs(by - 0.12), 0.07) + step(abs(by - 0.88), 0.07); l += step(abs(bx - 0.25), 0.04) * step(by, 0.75) + step(abs(bx - 0.75), 0.04) * step(0.25, by); l += step(abs(by - 0.5), 0.06) * step(0.25, bx) * step(bx, 0.75); return min(l, 1.0); }',
      'void main(){ float ex = min(vUv.x, 1.0 - vUv.x), ey = min(vUv.y, 1.0 - vUv.y);',
      '  float edge = smoothstep(0.07, 0.0, ex) * 0.9 + smoothstep(0.05, 0.0, ey) * 0.6;',
      '  float key = band(0.86) + band(0.07);',
      '  float sheen = 0.06 + 0.05 * sin(vUv.x * 40.0 - uT * 2.0) * sin(vUv.y * 9.0);',
      '  float k = (sheen + edge + key * 0.55) * uA * (1.0 + uF * 2.6) * smoothstep(0.0, 0.1, ey);',
      '  gl_FragColor = vec4(uC * k * 0.55, 1.0); }'].join('\n') }));
  const arc = new T.Mesh(arcG, arcM); arc.frustumCulled = false; arc.renderOrder = 3; arc.position.y = 1.15; arc.visible = false; fig.root.parent.add(arc);
  return { grp: grp, face: face, rim: rim, arc: arc };
}
function aegisPose(fig, h, G, dt, t, red) {
  const S = fig.S, e = S.gK === 'aegis' ? S.gE : 0; if (e < 0.005 && !G.ae) return;
  const A = G.ae || (G.ae = aegisBuild(fig)), b = fig.b, show = e > 0.01;
  A.grp.visible = A.arc.visible = show; if (!show) return;
  // the shield: on her left forearm's side, in front of the chest, turned a little out to her left so its rim shows from behind
  const up = red ? 1 : e; A.grp.position.set(0.4, -0.02 - 0.22 * (1 - up), 0.24 + 0.06 * up); A.grp.rotation.set(-0.08 - (fig.S.gPitch || 0) * 0.5, 0.85, 0); A.grp.scale.setScalar(0.72 + 0.28 * up);
  A.face.emissiveIntensity = 0.55 + 1.1 * S.gFlash; A.rim.material.emissiveIntensity = 0.7 + 1.8 * S.gFlash;
  A.arc.material.uniforms.uA.value = e; A.arc.material.uniforms.uF.value = S.gFlash; A.arc.material.uniforms.uT.value = red ? 0 : t;
  // the arm that holds it: up and forward, the elbow bent across her front
  const aL = b.armL, fL = b.foreL; aL.rotation.x += (-1.15 - aL.rotation.x) * e; aL.rotation.y += (0.35 - aL.rotation.y) * e; aL.rotation.z += (0.42 - aL.rotation.z) * e; fL.rotation.x += (-1.05 - fL.rotation.x) * e;
}
function bubbleBuild(fig) {
  const mat = own3(new T.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 }, uFill: { value: 0 }, uHit: { value: 0 }, uHitD: { value: new T.Vector3(0, 0, 1) }, uPop: { value: 0 }, uCol: { value: new T.Color(0xffc46b) }, uCol2: { value: new T.Color(0x4a58d8) } },
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vD; void main(){ vD = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: ['uniform float uT; uniform float uA; uniform float uFill; uniform float uHit; uniform float uPop; uniform vec3 uHitD; uniform vec3 uCol; uniform vec3 uCol2; varying vec3 vN; varying vec3 vV; varying vec3 vD;',
      'float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
      'void main(){ float fr = 1.0 - abs(dot(normalize(vN), normalize(vV))), rim = pow(fr, 2.3);',
      '  vec3 q = vD * 9.0, c = floor(q), f = fract(q) - 0.5; float r = h3(c);',
      '  float star = step(0.7, r) * smoothstep(0.22, 0.0, length(f)) * (0.6 + 0.4 * sin(uT * (2.0 + r * 4.0) + r * 40.0)) * 1.5;',
      '  vec3 col = mix(uCol2, uCol, smoothstep(0.25, 0.95, fr)) * (0.05 + 0.75 * rim) + vec3(1.0, 0.92, 0.78) * star * 0.85;',
      '  col += uCol * pow(max(dot(vD, uHitD), 0.0), 9.0) * uHit * 1.3;',
      '  col *= (1.0 - 0.5 * uFill) * (1.0 + uPop * 1.6);',
      '  gl_FragColor = vec4(col * uA, 1.0); }'].join('\n') }));
  const m = new T.Mesh(new T.SphereGeometry(1, 32, 20), mat); m.frustumCulled = false; m.renderOrder = 3; m.visible = false; fig.root.parent.add(m); return m;
}
function bubblePose(fig, h, G, dt, t, red) {
  const S = fig.S, on = S.gK === 'bubble', e = on ? S.gE : 0, pop = S.gPop != null && S.gPopK === 'bubble' ? S.gPop / 0.4 : -1;
  if (e < 0.005 && pop < 0 && !G.bub) return;
  const m = G.bub || (G.bub = bubbleBuild(fig)), u = m.material.uniforms, H = (h.def.air && h.def.air.guard) || { hp: 200 };
  const vis = e > 0.01 || pop >= 0; m.visible = vis; if (!vis) return;
  const sw = pop >= 0 ? 1 + 0.4 * pop : 0.86 + 0.14 * e; m.position.set(0, 1.2, 0); m.scale.set(1.08 * sw, 1.36 * sw, 1.08 * sw);
  u.uT.value = red ? 0 : t; u.uA.value = pop >= 0 ? 0.9 * (1 - pop) * (1 - pop) : 0.9 * e; u.uFill.value = on && h.guardT > 0 ? 1 - h.guardHp / H.hp : u.uFill.value; u.uHit.value = S.gFlash; u.uPop.value = pop >= 0 ? 1 - pop : 0;
}
function hatBuild(fig) {
  const prof = [[0.0005, 2.46], [0.1, 2.37], [0.25, 2.21], [0.42, 2.07], [0.58, 1.97], [0.615, 1.945], [0.6, 1.935], [0.4, 2.04], [0.19, 2.06]].map(function (p) { return new T.Vector2(p[0], p[1] - 2.08); });
  const geo = new T.LatheGeometry(prof, 22), uv = geo.attributes.uv, c13 = cellUV(13, 0); for (let i = 0; i < uv.count; i++) uv.setXY(i, c13[0] + uv.getX(i) * (c13[2] - c13[0]), c13[1] + uv.getY(i) * (c13[3] - c13[1]));
  const grp = new T.Group(); grp.add(new T.Mesh(geo, own3(new T.MeshPhongMaterial({ map: fig.mat.map, color: 0xf0b862, emissive: 0x5a3a14, shininess: 4, side: T.DoubleSide }))));
  const band = new T.Mesh(new T.CylinderGeometry(0.205, 0.215, 0.07, 14, 1, true), own3(new T.MeshPhongMaterial({ color: 0x4a2a1c, emissive: 0x1a0e08, side: T.DoubleSide }))); band.position.y = 2.065 - 2.08; grp.add(band);
  grp.traverse(function (o) { if (o.isMesh) o.frustumCulled = false; });
  if (fig.gctx && fig.gctx.glow) { const gl = fig.gctx.glow(0xffc46b, 1.6, grp, 0, 0.04, 0); gl.material.userData.lk = true; gl.material.opacity = 0.5; }
  grp.visible = false; fig.root.parent.add(grp); return grp;
}
function hatPose(fig, h, G, dt, t, red) {
  const b = fig.b, Ht = h.def.air && h.def.air.hat; if (!b.hat || !Ht) return;
  const fly = !!h.hat && h.alive !== false; b.hat.scale.setScalar(fly ? 1e-3 : 1);
  if (fly || G.hat) { const m = G.hat || (G.hat = hatBuild(fig)); m.visible = fly;
    if (fly) { const g = fig.root.parent, v = V('ghat').set(h.hat.x, h.hat.y, h.hat.z); g.worldToLocal(v); m.position.copy(v); G.spin = (G.spin || 0) + (red ? 0 : dt * 23); m.rotation.set(0.2, G.spin, 0); } }
  const ready = !fly && (h.hatN || 0) >= Ht.need && h.alive !== false;
  if (ready && !G.hatGlow && fig.gctx && fig.gctx.glow) { G.hatGlow = fig.gctx.glow(0xffd27a, 1.5, b.hat, 0, fig.P.headC + 0.2, 0); G.hatGlow.material.userData.lk = true; }
  if (G.hatGlow) { G.hatGlow.visible = ready; if (ready) G.hatGlow.material.opacity = red ? 0.4 : 0.32 + 0.16 * Math.sin(t * 4.2); }
}
function frayBuild(fig) {
  const N = 7, M = 34, geo = new T.BufferGeometry(), pos = new Float32Array(N * M * 3), col = new Float32Array(N * M * 3);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const pts = new T.Points(geo, own3(new T.PointsMaterial({ map: dotTex(), size: 0.13, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
  pts.frustumCulled = false; pts.renderOrder = 3; pts.visible = false; fig.root.parent.add(pts); return { pts: pts, N: N, M: M, pos: pos, col: col };
}
const FRAYC = [[0.88, 0.58, 0.37], [0.37, 0.91, 0.78], [0.96, 0.9, 0.78]];
function frayPose(fig, h, G, dt, t, red) {
  const S = fig.S, e = S.gK === 'fray' ? S.gE : 0, U = fig.mat.userData.U;
  if (U && U.uFray) { U.uFray.value = e > 0.01 ? e : 0; U.uFT.value = red ? 0 : t; }
  const low = !!(LL.gfx && LL.gfx.low); if ((e < 0.01 || low) && !G.fr) return;
  const F = G.fr || (G.fr = frayBuild(fig)); F.pts.visible = e > 0.01 && !low; if (!F.pts.visible) return;
  const tt = red ? 0 : t, fl = 1 + 1.5 * S.gFlash;
  for (let s = 0, k = 0; s < F.N; s++) { const dir = s % 2 ? 1 : -1, C = FRAYC[s % 3];
    for (let j = 0; j < F.M; j++, k++) { const q = j / (F.M - 1), end = Math.pow(Math.abs(q - 0.5) * 2, 3);
      const a = s * TAU / F.N + dir * (q * 4.6 + tt * 3.1), r = 0.2 + e * (0.16 + 0.3 * (0.5 + 0.5 * Math.sin(q * 6 + s * 1.7 + tt * 2.3)) + 0.35 * end);
      F.pos[k * 3] = Math.cos(a) * r; F.pos[k * 3 + 1] = 0.12 + q * 2.08 + e * 0.12 * Math.sin(q * 9 + tt * 4 + s); F.pos[k * 3 + 2] = Math.sin(a) * r;
      const br = e * (0.45 + 0.35 * Math.sin(q * 21 + tt * 9 + s * 2)) * fl * (1 - 0.5 * end); F.col[k * 3] = C[0] * br; F.col[k * 3 + 1] = C[1] * br; F.col[k * 3 + 2] = C[2] * br; } }
  F.pts.geometry.attributes.position.needsUpdate = true; F.pts.geometry.attributes.color.needsUpdate = true;
}
function guardPrep(fig, h, K, dt, red) {
  const S = fig.S, on = h.alive !== false && h.guardT > 0 ? h.guardK : '';
  if (on) S.gK = on; S.gE = (S.gE || 0) + ((on ? 1 : 0) - (S.gE || 0)) * ease(on ? 26 : 9, dt); if (S.gE < 0.004 && !on) S.gE = 0;
  S.gFlash = Math.max(0, (S.gFlash || 0) - dt * 3.2); if (S.gPop != null) { S.gPop += dt; if (S.gPop > 0.4) S.gPop = null; }
  S.gPitch = clamp(h.pitch || 0, -0.9, 0.9);
  K.groll = 0;
  if (h.rollT > 0 && h.rollMax > 0 && h.alive !== false) { const p = clamp(1 - h.rollT / h.rollMax, 0, 1), e = p * p * (3 - 2 * p); K.groll = red ? -(h.rollDir || 1) * 0.3 * Math.sin(Math.PI * p) : -(h.rollDir || 1) * TAU * e; }
}
function guardPose(fig, h, K, dt, t, red) {
  const G = fig.G || (fig.G = {});
  if (fig.id === 'anna') aegisPose(fig, h, G, dt, t, red);
  else if (fig.id === 'dora') { bubblePose(fig, h, G, dt, t, red); hatPose(fig, h, G, dt, t, red); }
  else if (fig.id === 'skein') frayPose(fig, h, G, dt, t, red);
}
/* gfx hands on the guard events for a hero with a figure: a block, a soak or a pass flashes the guard; a soak marks where;
   the bubble's end pops it; the hat landing home bounces it on her head. */
H3.guardEvent = function (fig, e) {
  const S = fig.S;
  if (e.k === 'guarded') { S.gFlash = 1;
    if (e.how === 'absorb' && fig.G && fig.G.bub && fig.root.parent) { const v = V('gh').set(e.x, e.y, e.z); fig.root.parent.worldToLocal(v); v.y -= 1.2; v.x /= 1.08; v.y /= 1.36; v.z /= 1.08; if (v.lengthSq() > 1e-6) fig.G.bub.material.uniforms.uHitD.value.copy(v.normalize()); } }
  else if (e.k === 'guardend') { S.gPop = 0; S.gPopK = e.kind; }
  else if (e.k === 'hatback') S.hatYv = (S.hatYv || 0) - 1.4;
};

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
  S.air += ((ground ? 0 : 1) - S.air) * ease(ground ? 22 : 18, dt); // 0.25 air: in at 18 (was 10), so the take-off shows S.dash += ((h.dashT > 0 ? 1 : 0) - S.dash) * ease(h.dashT > 0 ? 30 : 8, dt); S.zip += ((zip ? 1 : 0) - S.zip) * ease(10, dt);
  const air = red ? (ground ? 0 : 1) : S.air, dash = red ? 0 : S.dash, zk = S.zip;
  const K = airPrep(fig, st, h, dt, red); // 0.25 air: where the body is in its airtime
  guardPrep(fig, h, K, dt, red); // 0.26 guard: envelopes for the guards and the roll
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
    // standing: feet a little apart, one a touch ahead; in the air: by where the body is in its airtime (0.25 air, airFoot)
    if (air > 0.001) { AF.x = gx; AF.y = gy; AF.z = gz; AF.p = pitch; airFoot(fig, K, k, side, fw, legL, air, t, red); gx = AF.x; gy = AF.y; gz = AF.z; pitch = AF.p; }
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
    AA.p = p; AA.ab = ab; AA.el = el; airArm(fig, K, k, side, air, red); p = AA.p; ab = AA.ab; el = AA.el; // 0.25 air: the air and the landing
    if (dash > 0.001) { p += (0.95 - p) * dash; ab += (side * 0.35 - ab) * dash; el += (0.25 - el) * dash; }
    if (zk > 0.001 && k === 1) { p += (-2.6 - p) * zk; ab += (-0.15 - ab) * zk; el += (0.3 - el) * zk; }
    else if (zk > 0.001) { p += (-0.4 - p) * zk; ab += (0.7 - ab) * zk; el += (0.6 - el) * zk; }
    if (stomp > 0.001) { p += (-0.3 - p) * stomp; ab += (side * 1.25 - ab) * stomp; el += (0.7 - el) * stomp; }
    A.rotation.set(p, 0, ab); F.rotation.set(-el, 0, 0); Hd.rotation.set(0, 0, 0);
  }
  if (D.pose) D.pose(fig, st, h, { dt: dt, t: t, red: red, mix: mix, runK: runK, air: air, ph: ph }); // 0.25 rook: a hero's own pose over the shared one, before the aim (Rook's lift, fins and lantern)
  // the aim: inverse kinematics toward a point ahead of the right shoulder along the aim, in the chest's frame
  const thr = D.throws ? tw : 0, aimW = clamp(Math.max(aim, Math.abs(thr) * 1.4), 0, 1) * (1 - zk) * (1 - dash * 0.7) * (1 - K.tuckE); // 0.25 air: no aim mid-somersault
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
  airRoot(fig, K, dt, red); // 0.25 air: somersault, lean, the hover's tilt and bob; the cloth flare
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
  airAfter(fig, K, dt, red, air, dash, mix); // 0.25 air: Dora's hat, the Skein Doll's yarn, Myra's curl and wings (the wings' flutter moved here)
  guardPose(fig, h, K, dt, t, red); // 0.26 guard: the aegis and Anna's shield arm, Dora's bubble and hat, Skye's fray
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
    if (S.afl) { dx += pn.rx * S.afl; dz += pn.rz * S.afl; } // 0.25 air: the cloth flares out (take-off, second jump, hover, landing)
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
  const gk = h.onGround === false && !h.zip && !(h.hoverT > 0) ? (B.braid ? 3 : 2.2) : 1; // 0.25 air: the model falls at 26 m/s2; at 11 the braid rose straight up off her head in every jump, so in the air it falls a touch faster than the body (ribbons slower: they float)
  S[key].acc += dt; let steps = 0;
  while (S[key].acc >= 1 / 90 && steps < 6) { S[key].acc -= 1 / 90; steps++; const hh = 1 / 90, dmp = B.braid ? 0.985 : 0.97;
    for (let i = 1; i <= n; i++) { const p = P0[i], q = Q0[i]; const vx = (p.x - q.x) * dmp, vy = (p.y - q.y) * dmp, vz = (p.z - q.z) * dmp; q.copy(p); p.x += vx - hvx * hh * hh * 3; p.y += vy - (B.braid ? 11 : 7) * gk * hh * hh; p.z += vz - hvz * hh * hh * 3; }
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
