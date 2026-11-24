/* LIVLOCH · shots: what each gun's shot looks like in flight, and at the muzzle (0.26). Three.js r128.

   DESIGN
   - Presentation only. Reads the projectiles the model already has (p.owner.def.id, p.team, p.cos, p.gun, p.echo, p.vx..)
     and never changes one. Damage, speed, size and counts are the sim's and stay as they were.
   - Before 0.26 every projectile was one stretched, additive, white box. Now each gun has its own shape:
       Dora    lantern bolt  : a small warm orb with a short soft halo; your own get a faint, thin streak
       Anna    rock hammer   : a small stone-headed hammer tumbling end over end; solid, no tracer
       Myra    spool shot    : a small spinning spool; about a third of the pellets trail a thin thread
       Skye    needle        : a thin silver needle, fast, a glint now and then; one needle in four has a faint streak
       Rook    wick spark    : a copper chip that flickers copper and teal (copper sulfate) with a small halo
       troopers, towers, hollows (p.cos): a short team-coloured dart, dimmer than any hero shot
     Abilities (kind 'line' and 'orb') are not drawn here; gfx.js still draws them as before.
   - Cost: one InstancedMesh per shape (lamp, ember, hammer, spool, needle, dart) plus one for halos and one for streaks and
     threads, plus one for muzzle sparks; a mesh with no instances this frame is hidden and costs no draw call. No per-shot
     objects, no lights. Counts are in LL.shots.stats().
   - Looks: solid shapes take their colours through the look's colour map once, when the scene is built (R.setLook rebuilds
     it, so this runs again); additive ones follow the existing rule, so in the light looks they become normal blended.
     Lighter graphics (R.low) keeps the shapes and drops halos, streaks, threads and spark lines.
   - Muzzle flashes: LL.shots.muzzle(e, mine) returns true when it drew this gun's own; gfx.js then skips its generic flash. */
(function () {
'use strict';
const LL = window.LL, SH = LL.shots = {};
let T = null, cx = null, D, Q, Q2, EU, Z, XA, V, TMP, TMP2, M = null, N = null, DT = 0.016, TIME = 0, camQ = null, ID = 0, lines = [], lineK = 0, sprites = [], sprK = 0, camera = null;
const INFO = new WeakMap(), LN_N = 56, SP_N = 6;
const CAP = { lamp: 200, ember: 160, hammer: 80, spool: 220, needle: 320, dart: 320, halo: 320, streak: 260, spark: LN_N };
const COPPER = 0xe0864a, TEAL = 0x3fe0c8, WARM = 0xff9d4a, COLD = 0x9fb4ff;
const TEAMS = [0xff9a5c, 0x8fb8ff, 0xc9a0ff];

function merged(parts) {
  /* parts: [geometry, [x, y, z], [sx, sy, sz], hex]. One flat-shaded geometry with a colour per vertex. */
  const pos = [], nor = [], col = [];
  parts.forEach(function (p) {
    let g = p[0]; g = g.index ? g.toNonIndexed() : g;
    V.set(p[2][0], p[2][1], p[2][2]);
    const m = new T.Matrix4().compose(new T.Vector3(p[1][0], p[1][1], p[1][2]), new T.Quaternion(), V.clone());
    g.applyMatrix4(m); g.computeVertexNormals();
    const c = cx.tc(p[3]), a = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
  });
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return out;
}
function mk(name, geo, mat, extra) {
  const m = new T.InstancedMesh(geo, mat, CAP[name]);
  m.userData.rt = true; m.frustumCulled = false; cx.initColor(m, CAP[name]); m.count = 0; m.visible = false; m.name = 'shots.' + name;
  mat.userData.lk = true; mat.userData.solid = true; if (!(mat.blending === T.AdditiveBlending)) mat.userData.bl = true;
  if (extra) m.renderOrder = extra;
  cx.dyn.add(m); return m;
}
SH.build = function (c) {
  cx = c; T = c.T;
  D = new T.Object3D(); Q = new T.Quaternion(); Q2 = new T.Quaternion(); EU = new T.Euler(); Z = new T.Vector3(0, 0, 1); XA = new T.Vector3(1, 0, 0); V = new T.Vector3(); TMP = new T.Color(); TMP2 = new T.Color();
  camera = c.camera(); SH.cam = camera;
  const basic = function (o) { return new T.MeshBasicMaterial(Object.assign({ color: 0xffffff, fog: false }, o || {})); };
  const add = { blending: T.AdditiveBlending, transparent: true, depthWrite: false };
  const lit = function (em) { return new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, emissive: em, fog: false }); };
  M = {};
  /* Dora: a small ball of lantern light. */
  M.lamp = mk('lamp', new T.IcosahedronGeometry(1, 1), basic());
  /* Rook: a copper chip (a squashed tetrahedron) that tumbles. */
  M.ember = mk('ember', new T.TetrahedronGeometry(1, 0), basic());
  /* Anna: a rock hammer. Handle along y, head across x at the top, so spinning about x swings it end over end. */
  M.hammer = mk('hammer', merged([
    [new T.BoxGeometry(0.13, 1.0, 0.13), [0, -0.05, 0], [1, 1, 1], 0xb98650],
    [new T.BoxGeometry(0.62, 0.3, 0.3), [0, 0.5, 0], [1, 1, 1], 0xe6dfd2],
    [new T.BoxGeometry(0.12, 0.2, 0.2), [0.37, 0.5, 0], [1, 1, 1], 0x7a746c]
  ]), lit(0x4a4238));
  /* Myra: a spool, axis along y. */
  M.spool = mk('spool', merged([
    [new T.CylinderGeometry(0.5, 0.5, 0.14, 8), [0, 0.42, 0], [1, 1, 1], 0xb48cf0],
    [new T.CylinderGeometry(0.5, 0.5, 0.14, 8), [0, -0.42, 0], [1, 1, 1], 0xb48cf0],
    [new T.CylinderGeometry(0.27, 0.27, 0.72, 8), [0, 0, 0], [1, 1, 1], 0xf0dfbb]
  ]), lit(0x3a3050));
  /* Skye: a needle along z: a shaft and a point. */
  M.needle = mk('needle', merged([
    [new T.CylinderGeometry(0.5, 0.5, 0.74, 4).rotateX(Math.PI / 2), [0, 0, -0.13], [1, 1, 1], 0xe8eef8],
    [new T.ConeGeometry(0.5, 0.26, 4).rotateX(Math.PI / 2), [0, 0, 0.37], [1, 1, 1], 0xffffff]
  ]), basic({ vertexColors: true }));
  /* Troopers, towers, hollows: a short faceted dart along z. */
  M.dart = mk('dart', new T.OctahedronGeometry(0.5, 0), basic(add));
  /* A soft glow that faces the camera (a plane turned to it each frame), and thin streaks and threads. */
  const hg = new T.PlaneGeometry(1, 1);
  M.halo = mk('halo', hg, basic(Object.assign({ map: c.glowTex }, add)), 5);
  M.streak = mk('streak', new T.BoxGeometry(1, 1, 1), basic(add), 4);
  M.spark = mk('spark', new T.BoxGeometry(1, 1, 1), basic(add), 6);
  N = { lamp: 0, ember: 0, hammer: 0, spool: 0, needle: 0, dart: 0, halo: 0, streak: 0, spark: 0 };
  lines = []; lineK = 0; for (let i = 0; i < LN_N; i++) lines.push({ life: 0 });
  sprites = []; sprK = 0;
  for (let i = 0; i < SP_N; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: c.glowTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); s.material.userData.lk = s.material.userData.bl = true; s.visible = false; s.life = 0; c.dyn.add(s); sprites.push(s); }
};

function info(p) { let e = INFO.get(p); if (!e) { e = { id: ++ID, age: 0 }; INFO.set(p, e); } e.age += DT; return e; }
function spawn(m, x, y, z, q, sx, sy, sz, col) {
  const i = N[m] ; if (i >= CAP[m]) return;
  N[m] = i + 1; D.position.set(x, y, z); D.quaternion.copy(q); D.scale.set(sx, sy, sz); D.updateMatrix();
  M[m].setMatrixAt(i, D.matrix); M[m].setColorAt(i, col);
}
function halo(x, y, z, size, col, k) { TMP2.copy(col).multiplyScalar(k); spawn('halo', x, y, z, camQ, size, size, 1, TMP2); }
function streak(m, x, y, z, ux, uy, uz, len, w, col, k) { Q2.setFromUnitVectors(Z, V.set(ux, uy, uz)); TMP2.copy(col).multiplyScalar(k); spawn(m, x - ux * len * 0.5, y - uy * len * 0.5, z - uz * len * 0.5, Q2, w, w, len, TMP2); }

SH.begin = function (dt, time, cam) {
  if (!M) return;
  DT = dt; TIME = time; camera = cam || camera; camQ = camera.quaternion;
  for (const k in N) N[k] = 0;
};
/* Draws one projectile if it is a gun shot (or a trooper, tower or hollow shot). Returns false for anything else. */
SH.put = function (p) {
  if (!M || p.kind !== 'bullet' || !(p.cos || p.gun)) return false;
  const e = info(p), low = cx.low(), sp = Math.hypot(p.vx, p.vy, p.vz) || 1, ux = p.vx / sp, uy = p.vy / sp, uz = p.vz / sp;
  Q.setFromUnitVectors(Z, V.set(ux, uy, uz));
  if (p.cos) {
    /* The other side's shots: quiet, team-coloured, short. Reign warm, Hush cold, anything else violet. */
    const big = p.size > 0.2, L = big ? 1.7 : 0.95, w = big ? p.size * 1.15 : p.size * 1.3;
    TMP.copy(cx.tc(TEAMS[p.team] != null ? TEAMS[p.team] : TEAMS[2])).multiplyScalar(big ? 0.8 : 0.62);
    spawn('dart', p.x - ux * L * 0.5, p.y - uy * L * 0.5, p.z - uz * L * 0.5, Q, w, w, L, TMP);
    return true;
  }
  const o = p.owner, id = o && o.def ? o.def.id : '', mine = !!(o && o.isPlayer && !p.echo), cold = o && o.team === 1, ghost = !!p.echo, s = p.size;
  const a = e.age, ph = e.id * 1.713;
  switch (id) {
    case 'dora': {
      const r = s * 1.5 * (1 + Math.sin(TIME * 41 + ph) * 0.07);
      TMP.copy(cx.tc(0xffcf86)); if (ghost) TMP.lerp(cx.tc(0x9fd0ff), 0.6);
      spawn('lamp', p.x, p.y, p.z, Q, r, r, r, TMP);
      if (!low) {
        TMP.copy(cx.tc(ghost ? 0x9fd0ff : WARM)); if (cold) TMP.lerp(cx.tc(COLD), 0.45);
        /* lead, 0.26: smaller for your own bolts, and the halo grows in over its first tenth of a second, so it doesn't bloom white at the hand */
        halo(p.x, p.y, p.z, r * (mine ? 3.9 : 4.6) * (0.35 + 0.65 * Math.min(1, a * 10)) * (1 + Math.sin(TIME * 23 + ph) * 0.1), TMP, mine ? 0.4 : 0.38);
        if (mine) { TMP.copy(cx.tc(0xffc27a)); streak('streak', p.x, p.y, p.z, ux, uy, uz, Math.min(2.4, a * sp), 0.05, TMP, 0.3); }
      }
      break;
    }
    case 'anna': {
      Q2.setFromAxisAngle(XA, a * 17 + ph); Q.multiply(Q2);
      const k = s * 4.8; TMP.setRGB(1, 1, 1); if (cold) TMP.setRGB(0.8, 0.92, 1.1); if (ghost) TMP.setRGB(0.7, 0.9, 1.3);
      spawn('hammer', p.x, p.y, p.z, Q, k, k, k, TMP);
      break;
    }
    case 'myra': {
      Q2.setFromAxisAngle(XA, a * 13 + ph); Q.multiply(Q2);
      const k = s * 4.4; TMP.setRGB(1, 1, 1); if (cold) TMP.setRGB(0.8, 0.92, 1.1); if (ghost) TMP.setRGB(0.7, 0.9, 1.3);
      spawn('spool', p.x, p.y, p.z, Q, k, k, k, TMP);
      if (!low && !ghost && e.id % 3 === 0) { TMP.copy(cx.tc(0xe9dcff)); streak('streak', p.x, p.y, p.z, ux, uy, uz, Math.min(2.8, a * sp), 0.022, TMP, Math.min(0.6, a * 12)); }
      break;
    }
    case 'skein': {
      const gl = Math.sin(a * 46 + ph) > 0.92 ? 1.7 : 1, w = s * 0.62, L = 1.35;
      TMP.copy(cx.tc(ghost ? 0xbfe0ff : 0xe8eef8)).multiplyScalar(gl);
      spawn('needle', p.x - ux * L * 0.4, p.y - uy * L * 0.4, p.z - uz * L * 0.4, Q, w, w, L, TMP);
      if (!low && !ghost && e.id % 4 === 0) { TMP.copy(cx.tc(0xcfe0ff)); streak('streak', p.x, p.y, p.z, ux, uy, uz, Math.min(3.4, a * sp), 0.03, TMP, 0.34); }
      break;
    }
    case 'rook': {
      EU.set(a * 13 + ph, a * 17 + ph * 2, a * 9); Q2.setFromEuler(EU);
      const f = 0.5 + 0.5 * Math.sin(TIME * 36 + ph * 1.9), t = ghost ? 1 : Math.min(1, Math.max(0, (f - 0.55) / 0.2)), r = s * 1.5;
      TMP.copy(cx.tc(COPPER)).lerp(cx.tc(TEAL), t).multiplyScalar(1.15);
      spawn('ember', p.x, p.y, p.z, Q2, r * 0.9, r * 1.15, r * 0.8, TMP);
      if (!low) {
        TMP.copy(cx.tc(COPPER)).lerp(cx.tc(TEAL), t * 0.85);
        halo(p.x, p.y, p.z, r * (mine ? 5.6 : 4.4), TMP, 0.5);
        if (mine && Math.random() < DT * 22) cx.emit(p.x - ux * 0.4, p.y, p.z - uz * 0.4, 1, t > 0.5 ? TEAL : COPPER, 0.5, 0.4, 0, 3);
      }
      break;
    }
    default: return false;
  }
  return true;
};
SH.end = function () {
  if (!M) return;
  const names = ['lamp', 'ember', 'hammer', 'spool', 'needle', 'dart', 'halo', 'streak'];
  for (let i = 0; i < names.length; i++) { const m = M[names[i]], n = N[names[i]]; m.count = n; m.visible = n > 0; if (n > 0) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
};

/* ---- muzzle ---- */
function aim(u) { const cp = Math.cos(u.pitch || 0); return [Math.sin(u.yaw) * cp, Math.sin(u.pitch || 0), Math.cos(u.yaw) * cp]; }
function sprite(x, y, z, hex, size, life, mix) {
  const s = sprites[sprK]; sprK = (sprK + 1) % SP_N;
  s.material.color.copy(cx.tc(hex)).lerp(TMP.setRGB(1, 1, 1), mix || 0); s.position.set(x, y, z); s.base = size; s.scale.setScalar(size); s.life = s.max = life; s.visible = true;
}
function line(x, y, z, vx, vy, vz, dx, dy, dz, len, w, life, hex, k, grav) {
  const l = lines[lineK]; lineK = (lineK + 1) % LN_N;
  l.x = x; l.y = y; l.z = z; l.vx = vx; l.vy = vy; l.vz = vz; l.dx = dx; l.dy = dy; l.dz = dz; l.len = len; l.w = w; l.life = l.max = life; l.k = k; l.g = grav || 0;
  const c = cx.tc(hex); l.r = c.r; l.g2 = c.g; l.b = c.b;
}
/* Draws the muzzle of one shot. e: the model's 'shot' event. Returns true if the gun has a muzzle of its own here. */
SH.muzzle = function (e, mine) {
  if (!M || !e.u || !e.u.def) return false;
  const id = e.u.def.id;
  if (id !== 'dora' && id !== 'anna' && id !== 'myra' && id !== 'skein' && id !== 'rook') return false;
  if (!mine && cx.dist(e.x, e.z) > 45) return true;
  const low = cx.low(), red = cx.reduced(), d = aim(e.u), big = mine ? 1 : 0.65;
  const rx = Math.cos(e.u.yaw), rz = -Math.sin(e.u.yaw);
  switch (id) {
    case 'dora':
      sprite(e.x + d[0] * 0.15, e.y + d[1] * 0.15, e.z + d[2] * 0.15, 0xffb860, (mine ? 0.6 : 0.95) * big, mine ? 0.1 : 0.08, 0.12); /* lead, 0.26: a smaller puff for your own bolts */
      if (!low) cx.emit(e.x, e.y, e.z, mine ? 3 : 1, 0xffd08a, 0.7, 0.55, 1.4, 0);
      break;
    case 'anna':
      /* no flash: air pulled past the hammer as it leaves, a few pale lines slipping back and a puff of dust */
      if (!low) for (let k = 0; k < (red ? 2 : 3); k++) { const sd = (k - 1) * 0.22; line(e.x + rx * sd, e.y + (k - 1) * 0.05, e.z + rz * sd, -d[0] * 7, -d[1] * 7, -d[2] * 7, d[0], d[1], d[2], 1.0, 0.025, 0.2, 0xe4ddd0, 0.5, 0); }
      cx.puff(e.x + d[0] * 0.3, e.y, e.z + d[2] * 0.3, -d[0] * 0.8, 0.1, -d[2] * 0.8, 0.12, 0.7, 0.4, 0.2);
      break;
    case 'myra':
      /* a thread snapping: three thin pale lines flick out of the muzzle and fall away */
      if (!low) for (let k = 0; k < 3; k++) {
        const a = (k - 1) * 0.3 + (Math.random() - 0.5) * 0.12, dx = d[0] + rx * a, dy = d[1] + (Math.random() - 0.4) * 0.2, dz = d[2] + rz * a, n = Math.hypot(dx, dy, dz);
        line(e.x + dx / n * 0.55, e.y + dy / n * 0.55, e.z + dz / n * 0.55, dx / n * 2, dy / n * 2 - 1, dz / n * 2, dx / n, dy / n, dz / n, 0.95, 0.02, 0.11, 0xe9dcff, 0.7, 6);
      }
      sprite(e.x + d[0] * 0.2, e.y, e.z + d[2] * 0.2, 0xd6c4ff, 0.55 * big, 0.06, 0.4);
      break;
    case 'skein':
      /* a needle glint: a small cross of light, turned to the camera */
      if (!low) {
        camera.updateMatrixWorld(); V.set(1, 0, 0).applyQuaternion(camQ); const cxr = V.x, cyr = V.y, czr = V.z; V.set(0, 1, 0).applyQuaternion(camQ);
        const ang = Math.random() * 3.14, c1 = Math.cos(ang), s1 = Math.sin(ang), px = e.x + d[0] * 0.25, py = e.y + d[1] * 0.25, pz = e.z + d[2] * 0.25;
        line(px, py, pz, 0, 0, 0, cxr * c1 + V.x * s1, cyr * c1 + V.y * s1, czr * c1 + V.z * s1, 0.7 * big + 0.1, 0.028, 0.07, 0xffffff, 0.9, 0);
        line(px, py, pz, 0, 0, 0, cxr * -s1 + V.x * c1, cyr * -s1 + V.y * c1, czr * -s1 + V.z * c1, 0.45 * big + 0.1, 0.022, 0.07, 0xdfeaff, 0.8, 0);
      }
      sprite(e.x + d[0] * 0.2, e.y + d[1] * 0.2, e.z + d[2] * 0.2, 0xdfeaff, 0.5 * big, 0.06, 0.5);
      break;
    case 'rook': {
      /* copper sparks flung forward and down, one in three teal */
      const n = low ? 2 : (red ? 3 : (mine ? 6 : 4));
      for (let k = 0; k < n; k++) {
        const sx = (Math.random() - 0.5) * 0.7, sy = (Math.random() - 0.35) * 0.55, v = 6 + Math.random() * 7, dx = d[0] + rx * sx, dy = d[1] + sy, dz = d[2] + rz * sx, m = Math.hypot(dx, dy, dz);
        line(e.x + d[0] * 0.3, e.y, e.z + d[2] * 0.3, dx / m * v, dy / m * v, dz / m * v, 0, 0, 0, 0.32, 0.035, 0.2 + Math.random() * 0.18, k % 3 === 2 ? TEAL : COPPER, 1, 14);
      }
      sprite(e.x + d[0] * 0.2, e.y, e.z + d[2] * 0.2, COPPER, 0.9 * big, 0.05, 0.25);
      break;
    }
  }
  return true;
};
SH.step = function (dt) {
  if (!M) return;
  for (let i = 0; i < sprites.length; i++) { const s = sprites[i]; if (!s.visible) continue; s.life -= dt; if (s.life <= 0) { s.visible = false; continue; } const f = s.life / s.max; s.material.opacity = f; s.scale.setScalar(s.base * (0.75 + 0.45 * f)); }
  let n = 0;
  for (let i = 0; i < LN_N; i++) {
    const l = lines[i]; if (l.life <= 0) continue; l.life -= dt; if (l.life <= 0) continue;
    l.vy -= l.g * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    const sp = Math.hypot(l.vx, l.vy, l.vz); let ux, uy, uz; if (sp > 0.5) { ux = l.vx / sp; uy = l.vy / sp; uz = l.vz / sp; } else { ux = l.dx; uy = l.dy; uz = l.dz; }
    const f = l.life / l.max; Q2.setFromUnitVectors(Z, V.set(ux, uy, uz)); TMP2.setRGB(l.r, l.g2, l.b).multiplyScalar(l.k * f);
    if (n < CAP.spark) { D.position.set(l.x, l.y, l.z); D.quaternion.copy(Q2); D.scale.set(l.w, l.w, l.len * (0.6 + 0.4 * f)); D.updateMatrix(); M.spark.setMatrixAt(n, D.matrix); M.spark.setColorAt(n, TMP2); n++; }
  }
  M.spark.count = n; M.spark.visible = n > 0; if (n > 0) { M.spark.instanceMatrix.needsUpdate = true; if (M.spark.instanceColor) M.spark.instanceColor.needsUpdate = true; }
};
SH.stats = function () { const o = { meshes: 0, instances: 0 }; if (!M) return o; for (const k in M) if (M[k].visible) { o.meshes++; o.instances += M[k].count; o[k] = M[k].count; } return o; };
})();
