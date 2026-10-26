// ===== the sound box: mandala, cymatics (a Chladni plate), the lattice cube, and a 5D experiment =====
const VIEW_LIST = ['mandala', 'cymatics', 'cube', 'd5'];
const VIEW_NAME = { mandala: 'mandala', cymatics: 'cymatics', cube: 'cube 3D', d5: '5D' };
const viewOn = () => (!VIEW_NAME[SET.view] || (SET.view === 'd5' && !SET.x5d) ? 'mandala' : SET.view);
const VW = { yaw: 0.62, pitch: -0.42, vyaw: 0, vpitch: 0, dist: 6.5, hover: null, pick: null, pickT: -99, drag: false, last: 0, th: [0, 0, 0, 0, 0, 0], twist: 0, idle: 0 };
let mrotVel = 0;

function setViewMode(v, quiet) {
  if (!VIEW_NAME[v]) return;
  if (v === 'd5' && !SET.x5d) { caption('the 5D lattice is an experiment. switch it on under experiments first.', 3000); syncUI(); return; }
  SET.view = v; VW.hover = null; VW.pick = null;
  if (v === 'cymatics') { cymReset(); discover('x-cymatics'); }
  if (v === 'cube') discover('x-cube');
  if (v === 'd5') discover('x-5d');
  if (!quiet) caption({ mandala: 'the mandala: each voice a Lissajous figure against the root.', cymatics: 'cymatics: the chord drives a metal plate. the sand runs to wherever it is still.', cube: 'the lattice cube: fifths across, thirds up, sevenths in depth. drag to turn it, tap a node.', d5: 'five primes, five dimensions: 3, 5, 7, 11 and 13. an experiment.' }[v], 3600);
  persistSoon(); syncUI(); jlog(`sound box: ${VIEW_NAME[v]}`);
}
function cycleView() { const L = VIEW_LIST.filter(v => v !== 'd5' || SET.x5d), i = L.indexOf(viewOn()); setViewMode(L[(i + 1) % L.length]); }
function setX5d(on) { SET.x5d = !!on; if (!on && SET.view === 'd5') SET.view = 'mandala'; if (on) caption('5D experiment on. it lives in the sound box: tap the view chip until you reach it.', 3200); persistSoon(); syncUI(); }
function inSoundBox(px, py) {
  const dx = px - MX, dy = py - MY, v = viewOn();
  if (v === 'cymatics' && SET.cymShape === 'square') return Math.abs(dx) < MR * 1.1 && Math.abs(dy) < MR * 1.1;
  return Math.hypot(dx, dy) < MR * (v === 'mandala' ? 1.2 : 1.3);
}

// ---------- cymatics: a centre-driven Chladni plate ----------
// square plate, side 2L, driven at the centre: only the symmetric pair cos(nπx)cos(mπy) + cos(mπx)cos(nπy) couples to the drive,
// and a bending plate's modes rise as k², so f ∝ n² + m² (inharmonic, like a bell). the round plate uses J_m(kr)·cos(mθ) and Chladni's law f ∝ (m + 2n)².
const CY = { N: 112, xs: null, A: null, GX: null, GY: null, tmp: null, tabs: new Map(), key: '', lead: null, gp: null, gv: null, gb: null, n: 0, pp: null, np: 0, sp: 0,
  cv: null, cg: null, img: null, d32: null, cnt: null, bw: 0, glow: null, gctx: null, gimg: null, gain: 1, still: 0, motion: 1 };
const CYS = [], CYC = [];
for (let n = 0; n <= 9; n++) for (let m = n; m <= 9; m++) if (m > 0) CYS.push({ n, m, lam: n * n + m * m, key: `s${n},${m}` });
// round plate: J_m(kr)·cos(mθ) with k ≈ (n + m/2 + 1/4)π, so mode (m, n) has m diameters, n circles and a free rim;
// McMahon's correction to the Bessel zeros splits the pairs Chladni's law (m + 2n)² would make identical
for (let m = 0; m <= 8; m++) for (let n = 0; n <= 4; n++) if (m + n > 1 || (m === 0 && n === 1)) { const b = (n + m / 2 + 0.25) * Math.PI, k = b - (4 * m * m - 1) / (8 * b); CYC.push({ m, n, k, lam: k * k, key: `c${m},${n}` }); }
const CYM = new Map(); for (const o of CYS.concat(CYC)) CYM.set(o.key, o);
function besselJ(m, x) { let s = 0; const K = 40; for (let i = 0; i < K; i++) { const u = ((i + 0.5) * Math.PI) / K; s += Math.cos(m * u - x * Math.sin(u)); } return s / K; }
function cymInit() {
  if (CY.A) return;
  const N = CY.N; CY.xs = new Float32Array(N); for (let i = 0; i < N; i++) CY.xs[i] = -1 + (2 * i) / (N - 1);
  CY.A = new Float32Array(N * N); CY.GX = new Float32Array(N * N); CY.GY = new Float32Array(N * N); CY.tmp = new Float32Array(N * N);
  CY.AL = new Float32Array(N * N); CY.LX = new Float32Array(N * N); CY.LY = new Float32Array(N * N);
}
function cymTab(key) {
  let tb = CY.tabs.get(key); if (tb) return tb;
  const N = CY.N, xs = CY.xs; tb = new Float32Array(N * N);
  if (key[0] === 's') {
    const [n, m] = key.slice(1).split(',').map(Number), cn = xs.map(x => Math.cos(n * Math.PI * x)), cm = xs.map(x => Math.cos(m * Math.PI * x));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) tb[j * N + i] = cn[i] * cm[j] + cm[i] * cn[j];
  } else {
    const mo = CYM.get(key), m = mo.m, k = mo.k;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = xs[i], y = xs[j], r = Math.min(1, Math.hypot(x, y)); tb[j * N + i] = besselJ(m, k * r) * Math.cos(m * Math.atan2(y, x)); }   // held at the rim value outside, so the rim isn't a false node
  }
  if (CY.tabs.size > 160) CY.tabs.clear();
  CY.tabs.set(key, tb); return tb;
}
// a driven, damped plate: each mode answers 1/√((1−r²)² + (2ζr)²), r = f / f_mode, ζ = 0.04
function cymModes(f) {
  const sq = SET.cymShape !== 'circle', L = sq ? CYS : CYC, unit = sq ? 12.5 : 3.6, z = 0.04, out = [];
  for (const mo of L) { const r = f / (unit * mo.lam), a = 1 / Math.sqrt((1 - r * r) * (1 - r * r) + 4 * z * z * r * r); out.push([a, mo]); }
  out.sort((a, b) => b[0] - a[0]);
  const pk = out[0][0], res = [{ mo: out[0][1], a: 1 }];
  for (let i = 1; i < 3; i++) if (out[i][0] > pk * 0.3) res.push({ mo: out[i][1], a: out[i][0] / pk });
  return { res, pk };
}
function cymDrives() {
  const D = [];
  if (LS.src && t - LS.lastVoicedT < 0.6 && LS.f) D.push({ f: LS.f, w: 1.25, col: [255, 244, 220], id: 'sing', lab: 'your voice' });
  for (const v of voices) if (v.w > 0.05) D.push({ f: OUT(fOf(v.x)), w: (v.dragging ? 1.3 : v === act ? 1 : 0.8) * v.w, col: v.col, id: v.id, lab: v.lab });
  if (fRoot) D.push({ f: OUT(fRoot), w: 0.45, col: [255, 226, 170], id: 'root', lab: 'the root' });
  return D;
}
function cymField() {
  const D = cymDrives();
  // the note that rings the plate hardest leads: drive times how near it sits to a plate resonance. sticky, so the figure doesn't flicker
  let best = null, bs = -1;
  for (const d of D) { d.m = cymModes(d.f); d.s = d.w * d.m.pk; if (d.s > bs) { bs = d.s; best = d; } }
  const prev = D.find(d => d.id === CY.leadId), lead = prev && prev.s > bs * 0.75 ? prev : best;
  const key = SET.cymShape + '|' + D.map(d => d.f.toFixed(1) + ':' + d.w.toFixed(2)).join('|') + '|' + (lead ? lead.id : '');
  if (key === CY.key) return; CY.key = key; CY.leadId = lead ? lead.id : null;
  const N = CY.N, NN = N * N, A = CY.A, tmp = CY.tmp; A.fill(0);
  for (const d of D) {
    // the other notes only whisper: about a fifth of the lead's amplitude at most, so its still lines stay still
    const e = d === lead ? 1 : 0.035 * Math.min(1, d.s / Math.max(1e-6, lead.s));
    tmp.fill(0);
    for (const { mo, a } of d.m.res) { const tb = cymTab(mo.key); for (let i = 0; i < NN; i++) tmp[i] += a * tb[i]; }
    for (let i = 0; i < NN; i++) A[i] += e * tmp[i] * tmp[i];
    if (d === lead) for (let i = 0; i < NN; i++) CY.AL[i] = Math.abs(tmp[i]);
  }
  if (!lead) CY.AL.fill(0);
  const lead_ = lead ? { f: lead.f, ms: lead.m.res, col: lead.col, lab: lead.lab } : null;
  let mx = 1e-9; for (let i = 0; i < NN; i++) { A[i] = Math.sqrt(A[i]); if (A[i] > mx) mx = A[i]; }
  for (let i = 0; i < NN; i++) { A[i] /= mx; CY.AL[i] /= mx; }
  cymGrad(A, CY.GX, CY.GY); cymGrad(CY.AL, CY.LX, CY.LY);
  CY.lead = lead_; CY.glowKey = '';
}
function cymGrad(F, GX, GY) {
  const N = CY.N, h2 = (N - 1) / 4;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, l = i > 0 ? k - 1 : k, r = i < N - 1 ? k + 1 : k, u = j > 0 ? k - N : k, d = j < N - 1 ? k + N : k;
    GX[k] = (F[r] - F[l]) * h2 * (i > 0 && i < N - 1 ? 1 : 2); GY[k] = (F[d] - F[u]) * h2 * (j > 0 && j < N - 1 ? 1 : 2);
  }
}
function cymInside(x, y) { return SET.cymShape === 'circle' ? x * x + y * y < 0.95 : Math.abs(x) < 0.975 && Math.abs(y) < 0.975; }
function cymRand() { for (;;) { const x = Math.random() * 1.95 - 0.975, y = Math.random() * 1.95 - 0.975; if (cymInside(x, y)) return [x, y]; } }
function cymReset() {
  cymInit(); CY.key = '';
  const n = Math.round((phone ? 3400 : 7000) * Math.max(0.55, qScale)); CY.n = n; CY.gp = new Float32Array(n * 2); CY.gb = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const [x, y] = cymRand(); CY.gp[2 * i] = x; CY.gp[2 * i + 1] = y; CY.gb[i] = 150 + ((Math.random() * 105) | 0); }
  CY.np = 1100; CY.pp = new Float32Array(CY.np * 2); for (let i = 0; i < CY.np; i++) { const [x, y] = cymRand(); CY.pp[2 * i] = x; CY.pp[2 * i + 1] = y; }
  CY.still = 0; CY.sp = 0;
}
function cymSprinkle(u, v, k) {
  if (!CY.gp) return;
  for (let j = 0; j < k; j++) {
    const i = CY.sp++ % CY.n, a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.07;
    let x = u + Math.cos(a) * r, y = v + Math.sin(a) * r; if (!cymInside(x, y)) [x, y] = cymRand();
    CY.gp[2 * i] = x; CY.gp[2 * i + 1] = y;
  }
}
function cymTick(dt) {
  if (viewOn() !== 'cymatics' || !entered) return;
  if (!CY.gp) cymReset();
  cymField();
  if (paused || !CY.lead) return;
  const N = CY.N, A = CY.A, GX = CY.GX, GY = CY.GY, gp = CY.gp, n = CY.n, circ = SET.cymShape === 'circle';
  // a grain only hops where the plate's acceleration beats gravity: below the threshold it sits still. a harder drive lowers the threshold, so the lines get thinner
  const drive = CY.gain * clamp(0.45 + 0.8 * dyn, 0.3, 1.3), Dk = 0.42 * drive * Math.sqrt(dt), Dr = 0.08 * drive * dt, s = (N - 1) / 2, th = clamp(0.15 / drive, 0.06, 0.4), inv = 1 / (1 - th);
  let mov = 0, rest = 0;
  // tilt the phone and the plate tilts: hopping grains drift downhill, and past about 18° even resting sand starts to slide
  const tlx = MO.on ? MO.tx : 0, tly = MO.on ? MO.ty : 0, hopT = 0.6 * dt, slide = Math.hypot(tlx, tly) > 0.3 ? 0.14 * dt : 0;
  for (let i = 0; i < n; i++) {
    let x = gp[2 * i], y = gp[2 * i + 1];
    const fx = (x + 1) * s, fy = (y + 1) * s, ix = Math.min(N - 2, fx | 0), iy = Math.min(N - 2, fy | 0), tx = fx - ix, ty = fy - iy, k = iy * N + ix;
    const a = A[k] * (1 - tx) * (1 - ty) + A[k + 1] * tx * (1 - ty) + A[k + N] * (1 - tx) * ty + A[k + N + 1] * tx * ty;
    if (a <= th) {
      // below the threshold a grain no longer hops, but the plate still tilts under it: it creeps the last little way onto the still line
      rest++;
      if (slide) { const nx = x + tlx * slide, ny = y + tly * slide; if (cymInside(nx, ny)) { gp[2 * i] = nx; gp[2 * i + 1] = ny; mov += Math.abs(nx - x) + Math.abs(ny - y); } continue; }
      if (a < th * 0.45) continue;   // close enough: real sand lines have a little width
      const LX = CY.LX, LY = CY.LY, w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      const cr = Dr * 1.1 * Math.min(1, a / th), nx = x - (LX[k] * w00 + LX[k + 1] * w10 + LX[k + N] * w01 + LX[k + N + 1] * w11) * cr, ny = y - (LY[k] * w00 + LY[k + 1] * w10 + LY[k + N] * w01 + LY[k + N + 1] * w11) * cr;
      if (cymInside(nx, ny)) { gp[2 * i] = nx; gp[2 * i + 1] = ny; mov += Math.abs(nx - x) + Math.abs(ny - y); }
      continue;
    }
    const j = Dk * (a - th) * inv, ddx = gauss() * j - GX[k] * Dr + tlx * hopT, ddy = gauss() * j - GY[k] * Dr + tly * hopT;
    x += ddx; y += ddy; mov += Math.abs(ddx) + Math.abs(ddy);
    if (circ) { const r2 = x * x + y * y; if (r2 > 0.95) { const r = Math.sqrt(r2), q = (2 * 0.975 - r) / r; x *= q; y *= q; } }
    else { if (x > 0.975) x = 1.95 - x; else if (x < -0.975) x = -1.95 - x; if (y > 0.975) y = 1.95 - y; else if (y < -0.975) y = -1.95 - y; }
    gp[2 * i] = x; gp[2 * i + 1] = y;
  }
  CY.motion += (mov / Math.max(1, n) / Math.max(dt, 1e-3) - CY.motion) * (1 - Math.exp(-dt * 3)); CY.rest = rest / Math.max(1, n);
  if (CY.rest > 0.9) { CY.still += dt; if (CY.still > 2) discover('x-figure'); } else CY.still = 0;
  if (SET.cymPowder) {
    const pp = CY.pp, Dp = 0.12 * drive * Math.sqrt(dt), Up = 0.05 * drive * dt;
    for (let i = 0; i < CY.np; i++) {
      let x = pp[2 * i], y = pp[2 * i + 1];
      const ix = clamp(((x + 1) * s) | 0, 0, N - 1), iy = clamp(((y + 1) * s) | 0, 0, N - 1), k = iy * N + ix, a = A[k], j = Dp * (1.15 - a);
      x += gauss() * j + GX[k] * Up; y += gauss() * j + GY[k] * Up;
      if (!cymInside(x, y)) [x, y] = cymRand();
      pp[2 * i] = x; pp[2 * i + 1] = y;
    }
    if (CY.still > 2) discover('x-powder');
  }
}
function cymDraw() {
  if (!CY.gp) cymReset();
  const circ = SET.cymShape === 'circle', h = MR * (circ ? 1.08 : 1.03), x0 = MX - h, y0 = MY - h, side = 2 * h, eink = skin === 'eink' || skin === 'bw2';
  ctx.save();
  // the plate: anodized metal on a driver stud, with a slow sheen
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 26 * S; ctx.shadowOffsetY = 10 * S;
  const pg = ctx.createLinearGradient(x0, y0, x0 + side, y0 + side); pg.addColorStop(0, '#2e3036'); pg.addColorStop(0.45, '#18191d'); pg.addColorStop(1, '#0b0c0f');
  ctx.fillStyle = pg; ctx.beginPath(); if (circ) ctx.arc(MX, MY, h, 0, TAU); else roundRect(ctx, x0, y0, side, side, 7 * S); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.clip();
  const sh = (t * 0.035) % 1.6 - 0.3, sg = ctx.createLinearGradient(x0, y0, x0 + side, y0 + side);
  sg.addColorStop(clamp(sh - 0.12, 0, 1), 'rgba(255,255,255,0)'); sg.addColorStop(clamp(sh, 0, 1), 'rgba(255,255,255,0.05)'); sg.addColorStop(clamp(sh + 0.12, 0, 1), 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(x0, y0, side, side);
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 46; k++) { const yy = y0 + ((k * 37.3) % 46) / 46 * side; ctx.moveTo(x0, yy); ctx.lineTo(x0 + side, yy); }
  ctx.stroke();
  // grains: one bright speck per grain, piles brighten, a hairline shadow under each
  const dpr = Math.min(DPR, 2), bw = Math.max(16, Math.round(side * dpr)), blk = dpr >= 1.5 ? 2 : 1;
  if (!CY.cv || CY.bw !== bw) { CY.bw = bw; CY.cv = document.createElement('canvas'); CY.cv.width = CY.cv.height = bw; CY.cg = CY.cv.getContext('2d'); CY.img = CY.cg.createImageData(bw, bw); CY.d32 = new Uint32Array(CY.img.data.buffer); CY.cnt = new Uint8Array(bw * bw); }
  const d32 = CY.d32, cnt = CY.cnt, gp = CY.gp, n = CY.n, sc = (bw - blk - 1) / 2, sand = eink ? [255, 255, 255] : [242, 233, 214];
  d32.fill(0); cnt.fill(0);
  for (let i = 0; i < n; i++) { const X = ((gp[2 * i] + 1) * sc) | 0, Y = ((gp[2 * i + 1] + 1) * sc) | 0, q = Y * bw + X; if (cnt[q] < 250) cnt[q]++; }
  const SH = (110 << 24) | 0;
  for (let i = 0; i < n; i++) {
    const X = ((gp[2 * i] + 1) * sc) | 0, Y = ((gp[2 * i + 1] + 1) * sc) | 0, q = Y * bw + X, c = cnt[q], b = (CY.gb[i] / 255) * Math.min(1, 0.5 + 0.22 * c);
    const col = (255 << 24) | (((sand[2] * b) | 0) << 16) | (((sand[1] * b) | 0) << 8) | ((sand[0] * b) | 0);
    const qs = q + bw * blk + blk; if (qs < d32.length && !d32[qs]) d32[qs] = SH;
    d32[q] = col; if (blk === 2) { d32[q + 1] = col; d32[q + bw] = col; d32[q + bw + 1] = col; }
  }
  CY.cg.putImageData(CY.img, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(CY.cv, x0, y0, side, side); ctx.imageSmoothingEnabled = true;
  // stylized: the still lines glow faintly in the lead voice's colour
  if (SET.cymLines && CY.lead && !eink) {
    const N = CY.N;
    if (!CY.glow) { CY.glow = document.createElement('canvas'); CY.glow.width = CY.glow.height = N; CY.gctx = CY.glow.getContext('2d'); CY.gimg = CY.gctx.createImageData(N, N); }
    if (CY.glowKey !== CY.key) {
      CY.glowKey = CY.key; const d = CY.gimg.data, A = CY.A, col = mix(CY.lead.col, [255, 244, 220], 0.35);
      for (let k = 0; k < N * N; k++) { const g = Math.exp(-(A[k] / 0.05) * (A[k] / 0.05)), o = 4 * k; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = (g * 170) | 0; }
      CY.gctx.putImageData(CY.gimg, 0, 0);
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(CY.glow, x0, y0, side, side); ctx.globalAlpha = 1;
  }
  if (SET.cymPowder && CY.pp) {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = eink ? 'rgba(255,255,255,0.4)' : 'rgba(255,212,140,0.32)';
    const pp = CY.pp; for (let i = 0; i < CY.np; i++) ctx.fillRect(MX + pp[2 * i] * h - 0.8, MY + pp[2 * i + 1] * h - 0.8, 1.6, 1.6);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; ctx.beginPath(); if (circ) ctx.arc(MX, MY, h - 0.5, 0, TAU); else roundRect(ctx, x0 + 0.5, y0 + 0.5, side - 1, side - 1, 7 * S); ctx.stroke();
  const st = ctx.createRadialGradient(MX - 1.5, MY - 1.5, 0, MX, MY, 6 * S); st.addColorStop(0, '#d9d4cc'); st.addColorStop(0.5, '#6d6a66'); st.addColorStop(1, '#1d1d20');
  ctx.fillStyle = st; ctx.beginPath(); ctx.arc(MX, MY, 4.2 * S, 0, TAU); ctx.fill();
  // what it is
  if (CY.lead) {
    const mo = CY.lead.ms[0].mo, lab = circ ? `${mo.m} diameter${mo.m === 1 ? '' : 's'}, ${mo.n} circle${mo.n === 1 ? '' : 's'}` : mo.n === mo.m ? `mode (${mo.n},${mo.m})` : `mode (${mo.n},${mo.m})+(${mo.m},${mo.n})`;
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(234,220,198,0.58)'; ctx.font = fnt(10 * Math.max(S, 0.9), 'm');
    ctx.fillText(`${circ ? 'round plate' : 'square plate'} · ${lab} · ${CY.lead.f.toFixed(0)} Hz`, MX, MY + h + 14 * Math.max(S, 0.9));
    ctx.fillStyle = rgba(mix(CY.lead.col, [255, 244, 220], 0.4), 0.7); ctx.fillText(`rung by ${CY.lead.lab || 'a voice'}${CY.still > 1 ? ' · settled' : ''}`, MX, MY + h + 27 * Math.max(S, 0.9));
  }
  ctx.restore();
}

// ---------- the lattice: ratios as points, primes as axes ----------
function ratioFromExp(e) {
  const P = [3, 5, 7, 11, 13]; let p = 1, q = 1;
  e.forEach((x, i) => { if (x > 0) p *= Math.pow(P[i], x); else if (x < 0) q *= Math.pow(P[i], -x); });
  while (p / q >= 2) q *= 2; while (p / q < 1) p *= 2;
  const g = gcd(p, q); return [p / g, q / g];
}
function expOfCents(c) {
  const r = simplestWithin(JI, ((c % 1200) + 1200) % 1200, 7); if (!r) return null;
  const P = [2, 3, 5, 7, 11, 13], f = n => { const e = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 6; i++) while (n % P[i] === 0) { n /= P[i]; e[i]++; } return n === 1 ? e : null; };
  const a = f(r.p), b = f(r.q); if (!a || !b) return null;
  return { e: [a[1] - b[1], a[2] - b[2], a[3] - b[3], a[4] - b[4], a[5] - b[5]], p: r.p === 2 && r.q === 1 ? 1 : r.p, q: r.q };
}
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => (n === 1 ? '' : String(n).split('').map(d => SUP[+d]).join(''));
function factorStr(p, q) {
  const P = [2, 3, 5, 7, 11, 13], f = n => { const out = []; for (const b of P) { let k = 0; while (n % b === 0) { n /= b; k++; } if (k) out.push(b + sup(k)); } return out.join('·') || '1'; };
  return `${f(p)} / ${f(q)}`;
}
function proj3(x, y, z, sc) {
  // tilting the phone looks around the lattice a little, like a window
  const yw = VW.yaw + MO.px * 0.6, pt = clamp(VW.pitch + MO.py * 0.45, -1.45, 1.45), cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pt), sp = Math.sin(pt);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, k = VW.dist / Math.max(0.6, VW.dist - z2);
  return [MX + x1 * k * sc, MY - y1 * k * sc, z2, k];
}
const AXC = [[246, 195, 95], [126, 224, 195], [184, 162, 255], [255, 138, 112], [111, 214, 198]];
function nodeInfo(p, q) { const c = 1200 * Math.log2(p / q); return { lab: p === 1 && q === 1 ? '1/1' : `${p}/${q}`, c, h: Math.log2(p * q), fac: factorStr(p, q) }; }
function voiceAt(c, tol) { tol = tol || 6; for (const v of voices) { if (v.wT === 0) continue; let d = Math.abs(((v.c - c) % 1200 + 1800) % 1200 - 600); if (d < tol) return v; } return null; }
function cubeBuild() {
  const nodes = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const [p, q] = ratioFromExp([a, b, c, 0, 0]); nodes.push({ x: a, y: b, z: c, e: [a, b, c, 0, 0], p, q, ...nodeInfo(p, q) }); }
  for (const v of voices) {
    if (v.wT === 0) continue; const x = expOfCents(v.c); if (!x || x.e[3] || x.e[4]) continue;
    const [a, b, c] = x.e; if (Math.abs(a) <= 1 && Math.abs(b) <= 1 && Math.abs(c) <= 1) continue;
    if (!nodes.some(nd => nd.x === a && nd.y === b && nd.z === c)) { const [p, q] = ratioFromExp(x.e); nodes.push({ x: a, y: b, z: c, e: x.e, p, q, out: true, ...nodeInfo(p, q) }); }
  }
  return nodes;
}
// detective: the evidence trail from the root to a ratio, one prime step at a time, each step in its axis colour
function drawTrail(pts, cols, al) {
  ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], c = cols[i - 1];
    ctx.strokeStyle = rgba(c, 0.22 * al); ctx.lineWidth = 6 * Math.max(S, 0.85); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = rgba(mix(c, [255, 255, 255], 0.35), 0.85 * al); ctx.lineWidth = 1.8 * Math.max(S, 0.85); ctx.stroke();
  }
  ctx.restore();
}
function cubeDraw() {
  const nodes = cubeBuild(), sc = MR * 0.6, pr = nodes.map(nd => proj3(nd.x, nd.y, nd.z * 0.9, sc));
  ctx.save();
  // a faint floor shadow and the frame of the cube
  const fs = proj3(0, -1.55, 0, sc); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(fs[0], fs[1], MR * 0.95, MR * 0.22, 0, 0, TAU); ctx.fill();
  const edges = [];
  nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j <= i) return; const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z); if (d !== 1) return; const ax = a.x !== b.x ? 0 : a.y !== b.y ? 1 : 2; edges.push([i, j, ax, (pr[i][2] + pr[j][2]) / 2, a.out || b.out]); }));
  edges.sort((p, q) => p[3] - q[3]);
  ctx.lineCap = 'round';
  for (const [i, j, ax, z, out] of edges) {
    const dz = clamp((z + 1.6) / 3.2, 0, 1); ctx.strokeStyle = rgba(AXC[ax], (out ? 0.1 : 0.14) + 0.4 * dz); ctx.lineWidth = (0.8 + 1.4 * dz) * Math.max(S, 0.8);
    if (out) ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pr[i][0], pr[i][1]); ctx.lineTo(pr[j][0], pr[j][1]); ctx.stroke(); if (out) ctx.setLineDash([]);
  }
  // where the root came from (just intonation walks the 3·5 plane)
  if (M.key === 'just' && path.length > 1) {
    ctx.strokeStyle = 'rgba(255,226,170,0.42)'; ctx.lineWidth = 1.4; ctx.setLineDash([2, 4]); ctx.beginPath();
    path.slice(-8).forEach((nd, i) => { const q = proj3(nd.a - rs.a, nd.b - rs.b, 0, sc); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.setLineDash([]);
  }
  // the chord as a shape
  const occ = []; nodes.forEach((nd, i) => { const v = voiceAt(nd.c, 5); if (v || (nd.p === 1 && nd.q === 1)) occ.push([pr[i], v]); });
  if (occ.length >= 3) {
    const cx = occ.reduce((s, o) => s + o[0][0], 0) / occ.length, cyy = occ.reduce((s, o) => s + o[0][1], 0) / occ.length;
    occ.sort((a, b) => Math.atan2(a[0][1] - cyy, a[0][0] - cx) - Math.atan2(b[0][1] - cyy, b[0][0] - cx));
    ctx.fillStyle = `rgba(255,236,190,${0.07 + 0.08 * bloomFlash})`; ctx.strokeStyle = 'rgba(255,236,190,0.38)'; ctx.lineWidth = 1.2; ctx.beginPath();
    occ.forEach((o, k) => (k ? ctx.lineTo(o[0][0], o[0][1]) : ctx.moveTo(o[0][0], o[0][1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (SET.detect) for (const nd of nodes) {
    const v = voiceAt(nd.c, 5); if (!v || (nd.p === 1 && nd.q === 1)) continue;
    const pos = [0, 0, 0], pts = [proj3(0, 0, 0, sc)], cols = [];
    for (let ax = 0; ax < 3; ax++) { const s = Math.sign(nd.e[ax]); for (let k = 0; k < Math.abs(nd.e[ax]); k++) { pos[ax] += s; pts.push(proj3(pos[0], pos[1], pos[2] * 0.9, sc)); cols.push(AXC[ax]); } }
    drawTrail(pts, cols, 0.9);
  }
  const order = nodes.map((_, i) => i).sort((a, b) => pr[a][2] - pr[b][2]);
  VW.hits = [];
  for (const i of order) {
    const nd = nodes[i], [X, Y, z, k] = pr[i], dz = clamp((z + 1.6) / 3.2, 0, 1), isRoot = nd.p === 1 && nd.q === 1, v = voiceAt(nd.c, 5), r = (isRoot ? 4.2 : v ? 4 : 2.3) * k * Math.max(S, 0.85);
    VW.hits.push({ X, Y, nd, i });
    if (v || isRoot) {
      const col = v ? v.col : [255, 226, 170], gr = ctx.createRadialGradient(X, Y, 0, X, Y, r * 4.5); gr.addColorStop(0, rgba(col, 0.75)); gr.addColorStop(1, rgba(col, 0));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(X - r * 4.5, Y - r * 4.5, r * 9, r * 9); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = v ? rgba(mix(v.col, [255, 255, 255], 0.3), 1) : isRoot ? `rgba(255,232,190,${0.9 + 0.1 * rootFlash})` : `rgba(234,220,198,${0.25 + 0.55 * dz})`;
    ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
    if (v || isRoot || dz > 0.55 || (SET.detect && dz > 0.2)) {
      ctx.textAlign = 'center'; ctx.font = fnt((v || isRoot ? 12.5 : 10.5) * Math.max(S, 0.9), 's', 'italic');
      ctx.fillStyle = v ? rgba(v.col, 0.95) : isRoot ? 'rgba(255,232,190,0.95)' : `rgba(234,220,198,${0.14 + 0.5 * dz})`;
      ctx.fillText(nd.lab, X, Y - r - 5);
      if (SET.detect && v && !isRoot) { ctx.font = fnt(9 * Math.max(S, 0.9), 'm'); ctx.fillStyle = rgba(v.col, 0.7); ctx.fillText(nd.fac, X, Y + r + 11); }
    }
  }
  ctx.textAlign = 'left'; ctx.font = fnt(9.5 * Math.max(S, 0.9), 'm');
  const lg = [['→ ×3/2', AXC[0]], ['↑ ×5/4', AXC[1]], ['⊙ ×7/4', AXC[2]]], ly = MY + MR * 1.32;
  lg.forEach(([s, c], i) => { ctx.fillStyle = rgba(c, 0.75); ctx.fillText(s, MX - MR * 1.05 + i * MR * 0.75, ly); });
  ctx.restore();
  drawPick();
}
// the 5D experiment: a penteract of the primes 3, 5, 7, 11, 13 (32 ratios, 80 edges, one prime per edge)
const ND5 = [], ED5 = [];
for (let b = 0; b < 32; b++) { const e = [0, 1, 2, 3, 4].map(i => (b >> i) & 1), [p, q] = ratioFromExp(e); ND5.push({ e, b, p, q, ...nodeInfo(p, q) }); }
for (let b = 0; b < 32; b++) for (let i = 0; i < 5; i++) if (!(b & (1 << i))) ED5.push([b, b | (1 << i), i]);
const PL5 = [[0, 3, 0.23], [1, 4, 0.17], [2, 3, 0.11], [0, 4, 0.07], [1, 2, 0.05], [3, 4, 0.13]];
function d5Draw() {
  const sc = MR * 0.62, d5 = 1.8 + 3 * SET.x5dDepth, pr = [], held = [];
  for (const nd of ND5) {
    const x = nd.e.map(v => (v - 0.5) * 1.3);
    PL5.forEach(([i, j], k) => { const a = VW.th[k] + (k === 0 ? VW.twist : 0), c = Math.cos(a), s = Math.sin(a), xi = x[i], xj = x[j]; x[i] = xi * c - xj * s; x[j] = xi * s + xj * c; });
    const k5 = d5 / Math.max(0.4, d5 - x[4]); for (let i = 0; i < 4; i++) x[i] *= k5;
    const k4 = d5 / Math.max(0.4, d5 - x[3]); for (let i = 0; i < 3; i++) x[i] *= k4;
    pr.push(proj3(x[0], x[1], x[2], sc * 0.82));
  }
  ctx.save(); ctx.lineCap = 'round';
  const order = ED5.map((e, i) => i).sort((a, b) => (pr[ED5[a][0]][2] + pr[ED5[a][1]][2]) - (pr[ED5[b][0]][2] + pr[ED5[b][1]][2]));
  for (const k of order) { const [a, b, i] = ED5[k], z = (pr[a][2] + pr[b][2]) / 2, dz = clamp((z + 2) / 4, 0, 1); ctx.strokeStyle = rgba(VCOL[i], 0.08 + 0.4 * dz); ctx.lineWidth = (0.7 + 1.3 * dz) * Math.max(S, 0.8); ctx.beginPath(); ctx.moveTo(pr[a][0], pr[a][1]); ctx.lineTo(pr[b][0], pr[b][1]); ctx.stroke(); }
  if (SET.detect) ND5.forEach((nd, i) => {
    if (!i || !voiceAt(nd.c, 5)) return;
    let bb = 0; const pts = [pr[0]], cols = [];
    for (let ax = 0; ax < 5; ax++) if (nd.e[ax]) { bb |= 1 << ax; pts.push(pr[bb]); cols.push(VCOL[ax]); }
    drawTrail(pts, cols, 0.9);
  });
  VW.hits = [];
  const no = ND5.map((_, i) => i).sort((a, b) => pr[a][2] - pr[b][2]);
  for (const i of no) {
    const nd = ND5[i], [X, Y, z, k] = pr[i], dz = clamp((z + 2) / 4, 0, 1), isRoot = nd.b === 0, v = voiceAt(nd.c, 5), r = (isRoot || v ? 3.6 : 2.1) * Math.min(2.2, k) * Math.max(S, 0.85);
    VW.hits.push({ X, Y, nd, i });
    if (v || isRoot) { const col = v ? v.col : [255, 226, 170], gr = ctx.createRadialGradient(X, Y, 0, X, Y, r * 4.5); gr.addColorStop(0, rgba(col, 0.75)); gr.addColorStop(1, rgba(col, 0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(X - r * 4.5, Y - r * 4.5, r * 9, r * 9); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = v ? rgba(mix(v.col, [255, 255, 255], 0.3), 1) : isRoot ? 'rgba(255,232,190,0.95)' : `rgba(234,220,198,${0.25 + 0.55 * dz})`;
    ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
    if (v || isRoot || (SET.detect ? dz > 0.4 : dz > 0.8)) { ctx.textAlign = 'center'; ctx.font = fnt((v || isRoot ? 12 : 9.5) * Math.max(S, 0.9), 's', 'italic'); ctx.fillStyle = v ? rgba(v.col, 0.95) : isRoot ? 'rgba(255,232,190,0.95)' : `rgba(234,220,198,${0.14 + 0.45 * dz})`; ctx.fillText(nd.lab, X, Y - r - 4); }
  }
  ctx.textAlign = 'left'; ctx.font = fnt(9.5 * Math.max(S, 0.9), 'm');
  ['3', '5', '7', '11', '13'].forEach((s, i) => { ctx.fillStyle = rgba(VCOL[i], 0.8); ctx.fillText('— ×' + s, MX - MR * 1.1 + i * MR * 0.46, MY + MR * 1.36); });
  ctx.restore();
  drawPick();
}
function drawPick() {
  const pk = VW.pick && t - VW.pickT < 6 ? VW.pick : VW.hover; if (!pk) return;
  const h = VW.hits && VW.hits.find(x => x.nd.lab === pk.lab); if (!h) return;
  const nd = pk, v = voiceAt(nd.c, 5), lines = [`${nd.lab} · ${nd.c.toFixed(1)}¢`, `${nd.fac} · height ${nd.h.toFixed(1)}`, v ? `held by a voice (${v.lab})` : nd.p === 1 && nd.q === 1 ? 'the root' : nd.e ? `exponents (${nd.e.slice(0, SET.view === 'd5' ? 5 : 3).join(', ')})` : ''];
  ctx.save(); ctx.font = fnt(11.5, 'm'); const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18, hh = 16 * lines.length + 10;
  const x = clamp(h.X + 14, 8, W - w - 8), y = clamp(h.Y - hh - 10, TOPH + 6, H - hh - 8);
  ctx.fillStyle = 'rgba(16,12,20,0.9)'; ctx.strokeStyle = 'rgba(246,195,95,0.5)'; ctx.lineWidth = 1; roundRect(ctx, x, y, w, hh, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(248,232,204,0.95)'; ctx.textAlign = 'left'; lines.forEach((l, i) => { ctx.fillStyle = i ? 'rgba(234,220,198,0.72)' : 'rgba(248,232,204,0.95)'; ctx.fillText(l, x + 9, y + 18 + i * 16); });
  ctx.restore();
}
function viewPickAt(px, py) {
  if (!VW.hits) return null; let best = null, bd = phone ? 24 : 16;
  for (const h of VW.hits) { const d = Math.hypot(h.X - px, h.Y - py); if (d < bd) { bd = d; best = h.nd; } }
  return best;
}
function playNode(nd) {
  const f = fold(fRoot * (nd.p / nd.q), 2, 220);
  audio.pip(f, 0.05, 0, 1.2); VW.pick = nd; VW.pickT = t; discover('x-detective'); haptic(5);
  jlog(`inspected ${nd.lab} (${nd.c.toFixed(1)}¢, height ${nd.h.toFixed(1)})`);
}

// ---------- input and the tick ----------
function viewDown(p) {
  const v = viewOn(); p.vx0 = p.x; p.vy0 = p.y; p.vt = performance.now();
  if (v === 'cymatics') { const h = MR * (SET.cymShape === 'circle' ? 1.08 : 1.03); cymSprinkle((p.x - MX) / h, (p.y - MY) / h, 50); if (!muted && A.ac) nz(aNow() + 0.005, 0.09, 'highpass', 5200, 0.7, 0.008); }
  else { VW.drag = true; VW.vyaw = 0; VW.vpitch = 0; }
}
function viewMove(p, dx, dy, dtm, e) {
  const v = viewOn();
  if (v === 'cymatics') { if (Math.random() < 0.6) { const h = MR * (SET.cymShape === 'circle' ? 1.08 : 1.03); cymSprinkle((p.x - MX) / h, (p.y - MY) / h, 14); } return; }
  const k = 0.0085, twist = v === 'd5' && e && e.shiftKey;
  if (twist) { VW.twist += dx * k; return; }
  VW.yaw += dx * k; VW.pitch = clamp(VW.pitch + dy * k, -1.35, 1.35);
  const s = 1000 / Math.max(8, dtm); VW.vyaw = VW.vyaw * 0.5 + dx * k * s * 0.5; VW.vpitch = VW.vpitch * 0.5 + dy * k * s * 0.5;
}
function viewUp(p, now) {
  VW.drag = false;
  if (!p.moved) {
    const v = viewOn();
    if (v === 'cymatics') return;
    const nd = viewPickAt(p.x, p.y);
    if (nd) playNode(nd); else strum();
    VW.vyaw = 0; VW.vpitch = 0;
  } else if (now - p.lt > 90) { VW.vyaw = 0; VW.vpitch = 0; }
}
function viewWheel(dy) {
  const v = viewOn();
  if (v === 'mandala') return false;
  if (v === 'cymatics') { CY.gain = clamp(CY.gain * Math.exp(-dy * 0.0015), 0.25, 2.2); caption(`plate drive ${Math.round(CY.gain * 100)}%`, 900); return true; }
  VW.dist = clamp(VW.dist * Math.exp(dy * 0.0012), 3.2, 14); return true;
}
function viewHover(px, py) { const v = viewOn(); VW.hover = v === 'cube' || v === 'd5' ? viewPickAt(px, py) : null; if (VW.hover) hitEl.style.cursor = 'pointer'; }
function viewTick(dt) {
  if (mrotVel) { mrot += mrotVel * dt; mrotVel *= Math.exp(-dt * 1.7); if (Math.abs(mrotVel) < 0.01) mrotVel = 0; }
  const v = viewOn();
  if (v === 'cymatics') { cymTick(dt); return; }
  if (v !== 'cube' && v !== 'd5') return;
  if (!VW.drag) {
    VW.yaw += VW.vyaw * dt; VW.pitch = clamp(VW.pitch + VW.vpitch * dt, -1.35, 1.35);
    VW.vyaw *= Math.exp(-dt * 2.2); VW.vpitch *= Math.exp(-dt * 2.2);
    if (Math.abs(VW.vyaw) < 0.05 && !reduceMotion) VW.yaw += dt * 0.16;
  }
  if (v === 'd5' && !reduceMotion) PL5.forEach(([, , sp], k) => (VW.th[k] += dt * sp * (0.2 + 2.2 * SET.x5dSpeed)));
}
function drawView() {
  const v = viewOn();
  if (v === 'cymatics') cymDraw();
  else if (v === 'cube') cubeDraw();
  else if (v === 'd5') d5Draw();
}
