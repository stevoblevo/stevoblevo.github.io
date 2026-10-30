// ===== drawing, part one: sky, panels, mandala, lattice, black hole, bird, overlays =====
const BOKEH = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,240,0.9)'); gr.addColorStop(0.4, 'rgba(255,250,240,0.35)'); gr.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })();
let paperPat = null, tdBuf = null, fqBuf = null;
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrapText(g, s, maxW) { const out = []; let line = ''; for (const w of s.split(' ')) { const tst = line ? line + ' ' + w : w; if (g.measureText(tst).width > maxW && line) { out.push(line); line = w; } else line = tst; } if (line) out.push(line); return out; }
function spaced(s, x, y, sp) { for (const ch of s) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + sp; } return x; }

function drawBg() {
  if (wxWorld()) { drawWorldBg(); return; }
  if (typeof paintLookArt === 'function' && paintLookArt()) return;
  // paper: the canvas stays clear so the watercolor page shows through; CSS prints what is drawn here in ink
  if (paperLook()) { ctx.clearRect(0, 0, W, H); if (era || flash55 > 0.02) { ctx.fillStyle = `rgba(120,80,30,${(era ? 0.1 : 0) + 0.2 * flash55})`; ctx.fillRect(0, 0, W, H); } return; }
  if (skin === 'sb-knight') {
    const P = paperPal(), g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(mix(P.paper, [0, 0, 0], 0.35), 1)); g.addColorStop(clamp(LT / H, 0.5, 0.95), rgba(P.paper, 1)); g.addColorStop(1, rgba(mix(P.paper, [0, 0, 0], 0.5), 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const mg = ctx.createRadialGradient(W * 0.82, H * 0.14, 0, W * 0.82, H * 0.14, Math.max(W, H) * 0.42); mg.addColorStop(0, `rgba(244,239,230,${0.16 + 0.08 * peak})`); mg.addColorStop(1, 'rgba(244,239,230,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H); return;
  }
  if (skin === 'hmp') { const g = ctx.createRadialGradient(MX, MY, 0, MX, MY, Math.max(W, H) * 0.8); g.addColorStop(0, '#2b1630'); g.addColorStop(0.55, '#1a0e1d'); g.addColorStop(1, '#0b060c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
  if (skin === 'story') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d150d'); g.addColorStop(1, '#0c0905'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
  if (skin === 'eink') { ctx.fillStyle = '#0e0e0e'; ctx.fillRect(0, 0, W, H); return; }
  if (skin === 'bw2') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  if (skin === 'fieldstone') {
    ctx.drawImage(buildFieldstone(), 0, 0, W, H);
    const hg = ctx.createRadialGradient(W / 2, LT, 0, W / 2, LT, Math.max(W, H) * 0.55); hg.addColorStop(0, `rgba(255,200,130,${0.06 + 0.1 * peak + 0.06 * bloomFlash})`); hg.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H); return;
  }
  if (skin === 'dawn') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#060a1c'); g.addColorStop(0.42, '#17122e'); g.addColorStop(clamp(LT / H, 0.5, 0.95), '#4a2236'); g.addColorStop(1, '#140a12'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const hg = ctx.createRadialGradient(W / 2, LT + 30, 0, W / 2, LT + 30, Math.max(W, H) * 0.6);
    hg.addColorStop(0, `rgba(255,150,105,${0.24 + 0.12 * peak})`); hg.addColorStop(0.5, 'rgba(255,120,120,0.06)'); hg.addColorStop(1, 'rgba(255,120,120,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  } else {
    const bc = mix(mix(M.bg, [22, 12, 32], 0.45), [27, 15, 38], clamp(Rs * 1.5 - 0.3, 0, 1)), g = ctx.createRadialGradient(MX, MY, 0, MX, MY, Math.max(W, H) * 0.9);
    g.addColorStop(0, rgba(bc, 1)); g.addColorStop(1, '#040306'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sh = ctx.createLinearGradient(0, 0, W, H); sh.addColorStop(0.35, 'rgba(160,130,255,0)'); sh.addColorStop(0.5, 'rgba(160,130,255,0.04)'); sh.addColorStop(0.65, 'rgba(160,130,255,0)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
    if (LIGHT()) { const hg = ctx.createRadialGradient(W / 2, LT + 30, 0, W / 2, LT + 30, Math.max(W, H) * 0.6); hg.addColorStop(0, `rgba(255,170,120,${0.1 + 0.08 * peak})`); hg.addColorStop(0.5, 'rgba(255,140,130,0.03)'); hg.addColorStop(1, 'rgba(255,140,130,0)'); ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H); }
  }
  if (era || flash55 > 0.02) { ctx.fillStyle = `rgba(120,80,30,${(era ? 0.18 : 0) + 0.35 * flash55})`; ctx.fillRect(0, 0, W, H); }
}
// ---------- fieldstone: a warm stone wall at golden hour, a mint floral runner under the terrain, a carved rosette ----------
let fsBuf = null, fsKey = '', roBuf = null, roKey = '';
function fsRand(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function blobPts(cx, cy, rx, ry, rnd) { const n = 12, pts = []; for (let k = 0; k < n; k++) { const a = (k / n) * TAU + rnd() * 0.22, j = 0.84 + rnd() * 0.2; pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); } return pts; }
function tracePts(g, pts, dx, dy) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy], s0 = mid(pts[n - 1], pts[0]);
  g.beginPath(); g.moveTo(s0[0], s0[1]);
  for (let k = 0; k < n; k++) { const p = pts[k], m = mid(p, pts[(k + 1) % n]); g.quadraticCurveTo(p[0] + dx, p[1] + dy, m[0], m[1]); }
  g.closePath();
}
function hemY(x, fy0) { return fy0 + Math.sin(x * 0.045) * 2.2 + Math.sin(x * 0.013 + 1) * 3; }
function buildFieldstone() {
  const key = `${W}x${H}@${DPR}:${LT}:${LB}`;
  if (fsBuf && fsKey === key) return fsBuf;
  fsKey = key; fsBuf = fsBuf || document.createElement('canvas');
  const c = fsBuf; c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR));
  const g = c.getContext('2d'), rnd = fsRand(20251022), k = clamp(Math.min(W, H) / 700, 0.75, 1.5);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.fillStyle = '#2c241e'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 90; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,240,220,0.05)' : 'rgba(0,0,0,0.12)'; g.fillRect(rnd() * W, rnd() * H, 1, 1); }
  // river stones in rough courses: no two alike, mortar between, a little shadow under each
  const PAL = [[96, 84, 72], [108, 92, 76], [86, 80, 74], [120, 102, 82], [100, 88, 80], [128, 108, 86], [80, 70, 60], [112, 98, 88], [96, 88, 70], [134, 116, 96], [104, 96, 90]];
  for (let y = -12 * k; y < H + 30;) {
    const rh = (26 + rnd() * 26) * k;
    for (let x = -24 * k - rnd() * 30 * k; x < W + 40;) {
      const sw = (34 + rnd() * 66) * k, cx = x + sw / 2, cy = y + rh / 2 + (rnd() - 0.5) * 7 * k, rx = sw / 2 - 2.4 * k, ry = rh / 2 - 2 * k + (rnd() - 0.4) * 5 * k;
      const col = PAL[(rnd() * PAL.length) | 0].map(v => v * (0.8 + rnd() * 0.32)), pts = blobPts(cx, cy, rx, Math.max(6 * k, ry), rnd);
      tracePts(g, pts, 1.4 * k, 2.2 * k); g.fillStyle = 'rgba(10,6,4,0.5)'; g.fill();
      tracePts(g, pts, 0, 0);
      const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.5, cy + ry);
      gr.addColorStop(0, rgba(mix(col, [255, 238, 206], 0.18), 1)); gr.addColorStop(0.55, rgba(col, 1)); gr.addColorStop(1, rgba(mix(col, [24, 16, 12], 0.45), 1));
      g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      const nd = ((sw * rh) / (55 * k * k)) | 0;
      for (let i = 0; i < nd; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,240,215,0.08)' : 'rgba(20,12,8,0.14)'; g.fillRect(cx + (rnd() - 0.5) * sw, cy + (rnd() - 0.5) * rh, 1.3 * k, 1.3 * k); }
      if (rnd() < 0.14) { g.fillStyle = 'rgba(205,220,120,0.09)'; g.beginPath(); g.ellipse(cx + (rnd() - 0.5) * rx, cy + (rnd() - 0.5) * ry, rx * 0.32, ry * 0.26, rnd() * 3, 0, TAU); g.fill(); }
      g.restore();
      x += sw + (0.8 + rnd() * 2.4) * k;
    }
    y += rh + (1.2 + rnd() * 2.2) * k;
  }
  // golden hour: the wall in shade, a low warm sun from the upper left
  const dusk = g.createLinearGradient(0, 0, 0, H); dusk.addColorStop(0, 'rgba(18,11,8,0.6)'); dusk.addColorStop(0.5, 'rgba(22,14,10,0.4)'); dusk.addColorStop(1, 'rgba(10,8,6,0.62)');
  g.fillStyle = dusk; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.06, H * 0.08, 0, W * 0.06, H * 0.08, Math.max(W, H) * 0.9); sun.addColorStop(0, 'rgba(255,196,120,0.2)'); sun.addColorStop(0.45, 'rgba(255,170,100,0.06)'); sun.addColorStop(1, 'rgba(255,170,100,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = sun; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  // the runner: mint cotton with small white blossoms, laid under the terrain and the scale
  const fy0 = LT - 38;
  const sh = g.createLinearGradient(0, fy0 - 20, 0, fy0 + 4); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = sh; g.fillRect(0, fy0 - 20, W, 24);
  g.save(); g.beginPath(); g.moveTo(0, H + 10); for (let x = 0; x <= W + 6; x += 6) g.lineTo(x, hemY(x, fy0)); g.lineTo(W + 6, H + 10); g.closePath(); g.clip();
  const fb = g.createLinearGradient(0, fy0, 0, H); fb.addColorStop(0, '#2f5d53'); fb.addColorStop(0.5, '#264c44'); fb.addColorStop(1, '#1a3832'); g.fillStyle = fb; g.fillRect(0, fy0 - 10, W, H - fy0 + 20);
  for (let x = 0; x < W; x += 2) { const f = Math.sin(x * 0.021 + Math.sin(x * 0.004) * 3); g.fillStyle = f > 0 ? `rgba(200,255,235,${0.04 * f})` : `rgba(0,10,8,${-0.1 * f})`; g.fillRect(x, fy0 - 10, 2, H - fy0 + 20); }
  const cell = 34 * k;
  for (let row = 0, yy = fy0 + 8; yy < H + cell; row++, yy += cell * 0.86) for (let xx = (row % 2 ? cell / 2 : 0) - cell; xx < W + cell; xx += cell) {
    const fx = xx + (rnd() - 0.5) * 9 * k, fy = yy + (rnd() - 0.5) * 7 * k, r = (2.6 + rnd() * 1.8) * k, rot = rnd() * TAU;
    // a sprig: two leaves and a stem, then a round five-petal blossom with a blush centre
    g.strokeStyle = 'rgba(150,215,170,0.2)'; g.lineWidth = 0.9 * k; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + r * 1.2, fy + r * 2, fx + r * 0.4, fy + r * 3.4); g.stroke();
    g.fillStyle = 'rgba(150,215,170,0.2)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(fx + r * 0.7 + s * r * 0.9, fy + r * 2.3, r * 0.95, r * 0.4, s * 0.7, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(240,251,245,0.36)'; for (let p = 0; p < 5; p++) { const a = rot + (p * TAU) / 5; g.beginPath(); g.arc(fx + Math.cos(a) * r * 0.82, fy + Math.sin(a) * r * 0.82, r * 0.62, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(248,184,166,0.62)'; g.beginPath(); g.arc(fx, fy, r * 0.4, 0, TAU); g.fill();
    if (rnd() < 0.55) { g.fillStyle = 'rgba(240,251,245,0.26)'; for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(fx + cell * 0.48 + q * 2.4 * k, fy + cell * 0.3 - (q % 2) * 2 * k, 1.1 * k, 0, TAU); g.fill(); } }
  }
  g.fillStyle = 'rgba(8,16,14,0.4)'; g.fillRect(0, fy0 - 10, W, H - fy0 + 20);
  g.restore();
  g.strokeStyle = 'rgba(217,236,108,0.6)'; g.lineWidth = 1.4; g.beginPath(); for (let x = 0; x <= W + 6; x += 6) { const y = hemY(x, fy0); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  return c;
}
function buildRosette() {
  const R = Math.round(MR * 1.24), key = `${R}@${DPR}`;
  if (roBuf && roKey === key) return roBuf;
  roKey = key; roBuf = roBuf || document.createElement('canvas');
  const sz = Math.ceil(R * 2 + 24), c = roBuf; c.width = Math.round(sz * DPR); c.height = Math.round(sz * DPR);
  const g = c.getContext('2d'), o = sz / 2, rnd = fsRand(1787);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14; g.shadowOffsetX = 3; g.shadowOffsetY = 6;
  const wd = g.createRadialGradient(o - R * 0.3, o - R * 0.35, R * 0.1, o, o, R); wd.addColorStop(0, '#7c5636'); wd.addColorStop(0.6, '#5b3d24'); wd.addColorStop(1, '#3a2615');
  g.fillStyle = wd; g.beginPath(); g.arc(o, o, R, 0, TAU); g.fill(); g.restore();
  g.save(); g.beginPath(); g.arc(o, o, R, 0, TAU); g.clip(); g.lineWidth = 1;
  for (let i = 0; i < 52; i++) {
    const y = o - R + (i / 52) * 2 * R + (rnd() - 0.5) * 3, ph = rnd() * 6;
    g.strokeStyle = rnd() < 0.55 ? `rgba(30,16,8,${0.07 + rnd() * 0.09})` : `rgba(170,120,76,${0.05 + rnd() * 0.07})`; g.beginPath();
    for (let x = o - R; x <= o + R + 6; x += 6) { const yy = y + Math.sin(x * 0.03 + ph) * 2.5 + Math.sin(x * 0.011 + ph * 0.7) * 4; if (x === o - R) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
  g.restore();
  const groove = (r, w) => { g.lineWidth = w; g.strokeStyle = 'rgba(20,10,4,0.6)'; g.beginPath(); g.arc(o, o, r, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,214,160,0.16)'; g.beginPath(); g.arc(o + 0.8, o + 1, r + w * 0.7, 0, TAU); g.stroke(); };
  groove(R * 0.95, 2); groove(R * 0.81, 1.4);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU, x = o + Math.cos(a) * R * 0.88, y = o + Math.sin(a) * R * 0.88, br = Math.max(1.5, R * 0.024), bg = g.createRadialGradient(x - br * 0.4, y - br * 0.4, 0, x, y, br);
    bg.addColorStop(0, 'rgba(222,172,120,0.6)'); bg.addColorStop(1, 'rgba(58,34,16,0.65)'); g.fillStyle = bg; g.beginPath(); g.arc(x, y, br, 0, TAU); g.fill();
  }
  const petal = (a, r0, r1, wid, lite) => {
    g.save(); g.translate(o, o); g.rotate(a);
    g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.3, -wid, r0 + (r1 - r0) * 0.8, -wid * 0.9, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * 0.8, wid * 0.9, r0 + (r1 - r0) * 0.3, wid, r0, 0); g.closePath();
    const pg = g.createLinearGradient(0, -wid, 0, wid); pg.addColorStop(0, `rgba(180,128,84,${lite})`); pg.addColorStop(0.5, `rgba(122,82,50,${lite})`); pg.addColorStop(1, `rgba(50,28,12,${lite})`);
    g.fillStyle = pg; g.fill(); g.strokeStyle = 'rgba(24,12,4,0.6)'; g.lineWidth = 1.1; g.stroke();
    g.strokeStyle = 'rgba(24,12,4,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(r0 + (r1 - r0) * 0.14, 0); g.lineTo(r1 - (r1 - r0) * 0.12, 0); g.stroke();
    g.restore();
  };
  for (let i = 0; i < 8; i++) petal(((i + 0.5) * TAU) / 8, R * 0.22, R * 0.62, R * 0.11, 0.9);
  for (let i = 0; i < 8; i++) petal((i * TAU) / 8, R * 0.2, R * 0.76, R * 0.16, 1);
  const cb = g.createRadialGradient(o - R * 0.06, o - R * 0.07, 0, o, o, R * 0.2); cb.addColorStop(0, '#bb8c5e'); cb.addColorStop(0.6, '#7a5232'); cb.addColorStop(1, '#3c2412');
  g.fillStyle = cb; g.beginPath(); g.arc(o, o, R * 0.2, 0, TAU); g.fill(); groove(R * 0.2, 1.2);
  return c;
}
function drawRosette() {
  const c = buildRosette(), sz = c.width / DPR;
  ctx.save(); ctx.globalAlpha = 0.72; ctx.drawImage(c, MX - sz / 2, MY - sz / 2, sz, sz); ctx.globalAlpha = 1;
  const sh = ctx.createRadialGradient(MX, MY, 0, MX, MY, MR * 1.05); sh.addColorStop(0, 'rgba(18,10,6,0.34)'); sh.addColorStop(1, 'rgba(18,10,6,0)');
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(MX, MY, MR * 1.05, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawMotes() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const n = Math.round(48 * qScale);
  for (let i = 0; i < n; i++) {
    const s = stars[i], x = ((s.x * W + t * (3 + 9 * s.z)) % (W + 40)) - 20, y = s.y * (LT - 50) + Math.sin(t * 0.4 + s.tw) * 10 * s.z, r = (2 + 5 * s.z) * S;
    ctx.globalAlpha = (0.05 + 0.11 * s.z) * (0.6 + 0.4 * Math.sin(t * (0.5 + s.c) + s.tw)); ctx.drawImage(BOKEH, x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}
// ---------- bw2: one bit per pixel, an ordered (Bayer 4×4) dither, the way e-paper badges and early Macs drew greys ----------
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) * 16);
const BWLUT = new Uint8ClampedArray(256).map((_, i) => (i < 9 ? 0 : Math.round(255 * Math.pow((i - 9) / 246, 0.8) * 1.08)));
let bwC = null, bwG = null;
function ditherBW() {
  const w = cvs.width, h = cvs.height; if (!w || !h) return;
  if (!bwC) { bwC = document.createElement('canvas'); bwG = bwC.getContext('2d', { willReadFrequently: true }); }
  if (bwC.width !== w || bwC.height !== h) { bwC.width = w; bwC.height = h; }
  let img;
  try { bwG.drawImage(cvs, 0, 0); img = bwG.getImageData(0, 0, w, h); } catch (e) { return; }
  const d = img.data;
  for (let y = 0, o = 0; y < h; y++) { const r = (y & 3) << 2; for (let x = 0; x < w; x++, o += 4) { const v = BWLUT[(d[o] * 54 + d[o + 1] * 183 + d[o + 2] * 19) >> 8] > BAYER4[r | (x & 3)] ? 255 : 0; d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255; } }
  ctx.putImageData(img, 0, 0);
}
function drawStars() {
  const bot = LT - 8, E2 = hole.on ? Math.pow(46 * S * hole.str, 2) : 0, hr = hole.on ? holeRad() * 1.1 : 0, n = Math.round(stars.length * qScale);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    let px = s.x * W + (lastPX - W / 2) * -0.012 * s.z + MO.px * 26 * s.z, py = s.y * bot + (lastPY - H / 2) * -0.01 * s.z + MO.py * 18 * s.z;
    if (hole.on) { const dx = px - hole.x, dy = py - hole.y, r2 = dx * dx + dy * dy + 1; if (r2 < hr * hr) continue; px += (dx * E2) / r2; py += (dy * E2) / r2; }
    const tw = 0.6 + 0.4 * Math.sin(t * (0.6 + s.c) + s.tw), fade = skin === 'obsidian' || skin === 'hmp' ? 1 : clamp(1.6 - s.y * 1.5, 0, 1);
    if (s.z > 0.85) { const r = (4 + (16 * (s.z - 0.85)) / 0.15) * S; ctx.globalAlpha = 0.07 * tw * fade; ctx.drawImage(BOKEH, px - r, py - r, r * 2, r * 2); }
    else { const r = (0.35 + 1.1 * s.z) * S; ctx.globalAlpha = (0.2 + 0.6 * s.z) * tw * fade; ctx.fillStyle = s.c > 0.7 ? '#cbb8ff' : s.c > 0.4 ? '#fff4e0' : '#bfe6ff'; ctx.fillRect(px - r, py - r, r * 2, r * 2); }
  }
  ctx.restore();
}
function drawRootText() {
  const L = rootLines();
  ctx.save(); ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(246,230,200,0.85)'; ctx.font = fnt(14, 's', 'italic'); ctx.fillText(L[0], 22, 262);
  ctx.fillStyle = 'rgba(234,220,198,0.5)'; ctx.font = fnt(10, 'm'); ctx.fillText(L[1], 22, 278);
  ctx.restore();
}
function drawLattice() {
  const cx = 168, cy = 156, sx = 38, sy = 32, P = (a, b) => [cx + (a - rs.a) * sx + (b - rs.b) * sx * 0.5, cy - (b - rs.b) * sy];
  ctx.save();
  ctx.fillStyle = 'rgba(234,220,198,0.4)'; ctx.font = fnt(10, 'm'); ctx.textAlign = 'left';
  ctx.fillText('5-limit lattice   → ×3/2   ↗ ×5/4', 22, 62);
  ctx.beginPath(); ctx.rect(14, 72, 312, 170); ctx.clip();
  ctx.strokeStyle = `rgba(234,220,198,${inkA(0.07)})`; ctx.lineWidth = 1; ctx.beginPath();
  for (let a = rs.a - 4; a <= rs.a + 4; a++) for (let b = rs.b - 3; b <= rs.b + 3; b++) { const p = P(a, b), q1 = P(a + 1, b), q2 = P(a, b + 1), q3 = P(a + 1, b - 1); ctx.moveTo(p[0], p[1]); ctx.lineTo(q1[0], q1[1]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q2[0], q2[1]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q3[0], q3[1]); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(246,195,95,0.5)'; ctx.lineWidth = 1.6; ctx.beginPath();
  path.forEach((n, i) => { const p = P(n.a, n.b); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
  ctx.stroke();
  ctx.textAlign = 'center';
  for (let a = rs.a - 4; a <= rs.a + 4; a++) for (let b = rs.b - 3; b <= rs.b + 3; b++) {
    const p = P(a, b), isR = a === rs.a && b === rs.b, isS = a === 0 && b === 0;
    ctx.fillStyle = isR ? 'rgba(255,226,170,1)' : `rgba(234,220,198,${inkA(0.28)})`; ctx.beginPath(); ctx.arc(p[0], p[1], isR ? 4 + 2 * rootFlash : 2, 0, TAU); ctx.fill();
    if (isS && !isR) { ctx.strokeStyle = 'rgba(255,226,170,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = isR ? 'rgba(255,232,190,0.95)' : 'rgba(234,220,198,0.34)'; ctx.font = isR ? fnt(13, 's', 'italic') : fnt(10.5, 's');
    ctx.fillText(noteName(a, b), p[0], p[1] + (isR ? 17 : 13));
  }
  for (const v of voices) {
    if (v.wT === 0) continue;
    const r = simplestWithin(JI, v.c, 6); if (!r) continue;
    const fp = fac(r.p), fq = fac(r.q); if (!fp || !fq) continue;
    const s7 = fp[3] - fq[3], p = P(rs.a + fp[1] - fq[1] + s7 * 0.45, rs.b + fp[2] - fq[2] + s7 * 0.55);
    ctx.strokeStyle = rgba(v.col, 0.95 * v.w); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, TAU); ctx.stroke();
    if (s7) { ctx.fillStyle = rgba(v.col, 0.9 * v.w); ctx.font = fnt(9, 'm'); ctx.fillText('7', p[0] + 11, p[1] - 6); }
  }
  ctx.restore(); drawRootText();
}
function drawRing() {
  const cx = 104, cy = 160, R = 62, n = M.key === 'bp' ? 13 : M.n;
  ctx.save();
  ctx.fillStyle = 'rgba(234,220,198,0.4)'; ctx.font = fnt(10, 'm'); ctx.textAlign = 'left';
  ctx.fillText(M.key === 'bp' ? 'tritave ring · 13 steps' : `octave ring · ${n} steps`, 22, 62); ctx.fillText('spectrum', 214, 62);
  ctx.strokeStyle = `rgba(234,220,198,${inkA(0.14)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = fnt(10.5, 's');
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (TAU * k) / n, c = Math.cos(a), s = Math.sin(a);
    ctx.strokeStyle = `rgba(234,220,198,${inkA(0.28)})`; ctx.beginPath(); ctx.moveTo(cx + c * (R - 4), cy + s * (R - 4)); ctx.lineTo(cx + c * (R + 4), cy + s * (R + 4)); ctx.stroke();
    ctx.fillStyle = 'rgba(234,220,198,0.38)'; ctx.fillText(M.key === 'gamelan' ? GD[k] : String(k), cx + c * (R + 15), cy + s * (R + 15) + 3);
  }
  if (M.key === 'bp') { ctx.fillStyle = 'rgba(246,195,95,0.55)'; for (const r of BP9) { if (r.h > 63 || r.c <= 0 || r.c >= M.eqC - 1e-6) continue; const a = -Math.PI / 2 + TAU * (r.c / M.eqC); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10), 1.8, 0, TAU); ctx.fill(); } }
  ctx.fillStyle = `rgba(255,226,170,${0.8 + 0.2 * rootFlash})`; ctx.beginPath(); ctx.arc(cx, cy - R, 4.5 + 3 * rootFlash, 0, TAU); ctx.fill();
  for (const v of voices) {
    if (v.w < 0.02) continue;
    const a = -Math.PI / 2 + TAU * (v.c / M.eqC), px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
    ctx.strokeStyle = rgba(v.col, 0.3 * v.w); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = rgba(v.col, 0.95 * v.w); ctx.beginPath(); ctx.arc(px, py, (v.locked ? 5 : 3.5) + 2 * v.flash, 0, TAU); ctx.fill();
  }
  const x0 = 214, x1 = 322, yb = 214, top = 84, rmax = Math.log2(PR[PK - 1] * 1.08);
  ctx.strokeStyle = `rgba(234,220,198,${inkA(0.08)})`; ctx.lineWidth = 1; ctx.beginPath();
  if (M.n) { for (let m = 0; m / M.n <= rmax; m++) { const X = x0 + (m / M.n / rmax) * (x1 - x0); ctx.moveTo(X, top); ctx.lineTo(X, yb); } }
  else { for (let hh = 1; Math.log2(hh) <= rmax; hh += 2) { const X = x0 + (Math.log2(hh) / rmax) * (x1 - x0); ctx.moveTo(X, top); ctx.lineTo(X, yb); } }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(246,215,160,0.85)'; ctx.lineWidth = 2;
  for (let k = 0; k < PK; k++) { const X = x0 + (Math.log2(PR[k]) / rmax) * (x1 - x0); ctx.beginPath(); ctx.moveTo(X, yb); ctx.lineTo(X, yb - PA[k] * (yb - top)); ctx.stroke(); }
  ctx.fillStyle = 'rgba(234,220,198,0.4)'; ctx.font = fnt(9, 'm'); ctx.textAlign = 'left'; ctx.fillText(M.n ? `partials on the ${M.n}-step grid` : 'odd partials only', x0, yb + 14);
  ctx.restore(); drawRootText();
}
function drawEasyPanel() {
  const P = PROGS[easyS.prog] || PROGS[0], acc = ACC.easy, L = P.ch.length, cur = (((easyS.i - 1) % L) + L) % L, names = P.name.split('–');
  ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(234,220,198,0.4)'; ctx.font = fnt(10, 'm'); ctx.fillText(`easy listening · ${P.name}`, 22, 62);
  P.ch.forEach(([deg, q], j) => {
    const x = 22 + j * 74, y = 82, isOn = j === cur, pc = ((Math.round(12 * Math.log2((easyS.key * Math.pow(2, deg / 12)) / 130.8128)) % 12) + 12) % 12;
    roundRect(ctx, x, y, 66, 46, 8); if (isOn) { ctx.fillStyle = rgba(acc, 0.12 + 0.15 * beatPulse); ctx.fill(); }
    ctx.strokeStyle = isOn ? rgba(acc, 0.9) : `rgba(234,220,198,${INK.on ? 0.55 : 0.18})`; ctx.lineWidth = isOn ? 1.6 : 1; ctx.stroke();   // on paper an unlit card still needs an edge you can see
    ctx.fillStyle = isOn ? '#f8e8c8' : 'rgba(234,220,198,0.55)'; ctx.font = fnt(16, 's', 'italic'); ctx.fillText(ETN[pc] + QN[q], x + 8, y + 22);
    ctx.fillStyle = 'rgba(234,220,198,0.42)'; ctx.font = fnt(9.5, 'm'); ctx.fillText(names[j] || '', x + 8, y + 37);
  });
  ctx.restore(); drawRootText();
}
function drawMandala() {
  const cr = Math.cos(mrot), sr = Math.sin(mrot);
  ctx.save();
  ctx.strokeStyle = 'rgba(234,220,198,0.06)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(MX, MY, MR * 1.36, 0, TAU); ctx.stroke();
  const ink = paperLook(), ka = ink ? 0.55 : 1;   // on paper the figure is drawn like pencil, not added up like light
  ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
  const fl = Math.max(bloomFlash, rootFlash * 0.6);
  if (fl > 0.01) { const g = ctx.createRadialGradient(MX, MY, 0, MX, MY, MR * 1.8); g.addColorStop(0, `rgba(255,214,150,${0.2 * fl})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(MX - MR * 2, MY - MR * 2, MR * 4, MR * 4); }
  const NL = Math.round(900 * qScale), SPAN = 10 * Math.PI, ob = M.ombak ? betaFor(false) : 0;
  voices.forEach((v, i) => {
    if (v.w < 0.02) return;
    const crisp = v.locked ? 1 : clamp(1 - v.beat / 9, 0, 1);
    ctx.strokeStyle = rgba(v.col, Math.min(1, (0.16 + 0.5 * crisp) * (1 + 0.6 * v.flash)) * v.w * ka); ctx.lineWidth = ink ? (v.locked ? 1.1 : 0.8) : v.locked ? 1.3 : 1.05;
    ctx.beginPath();
    for (let k = 0; k <= NL; k++) { const th = (k / NL) * SPAN, px = Math.sin(v.fa * th), py = Math.sin(v.fb * (1 + v.kap) * th + v.phi), X = MX + MR * (px * cr - py * sr), Y = MY + MR * (px * sr + py * cr); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke();
    const b = v.locked ? ob : v.beat + ob;
    const al = reduceMotion ? 0.2 : b > 0 && b < 14 ? 0.12 + 0.2 * (0.5 + 0.5 * Math.cos(TAU * b * t)) : b >= 14 ? 0.1 + 0.08 * Math.random() : 0.2;
    ctx.strokeStyle = rgba(v.col, al * v.w); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(MX, MY, MR * (1.14 + i * 0.05), 0, TAU); ctx.stroke();
  });
  for (const r of rings) { ctx.strokeStyle = rgba(r.c, 0.5 * (r.life / r.max)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(MX, MY, r.r, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,236,200,0.85)'; ctx.beginPath(); ctx.arc(MX, MY, 2 + 3 * rootFlash, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawPoly() {
  if (!rhyActive()) return;
  const n = era ? 3 : tuplet, R = MR * 1.24 * (0.97 + 0.06 * beatPulse), acc = ACC[M.key] || ACC.just, cur = stepIdx % n, pts = [];
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k * TAU) / n + mrot * 0.5; pts.push([MX + R * Math.cos(a), MY + R * Math.sin(a)]); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc, 0.16 + 0.22 * stepFlash); ctx.lineWidth = 1.2;
  ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
  pts.forEach((p, k) => { const isOn = k === cur; ctx.fillStyle = rgba(acc, isOn ? 0.35 + 0.6 * stepFlash : 0.25); ctx.beginPath(); ctx.arc(p[0], p[1], (isOn ? 3 + 3 * stepFlash : 2.2) * S, 0, TAU); ctx.fill(); });
  ctx.restore();
}
function drawKnot() {
  const pq = M.key === 'gamelan' ? [2, 5] : M.key === 'tet10' ? [3, 5] : M.key === 'bp' ? [3, 7] : [2, 3], p = pq[0], q = pq[1], N = Math.round(240 * Math.max(0.6, qScale));
  const ay = mrot * 2.2 + t * 0.12 * (0.5 + SET.shim), ax = 0.75 + 0.2 * Math.sin(t * 0.21), sc = MR * 0.34 * (1 + 0.05 * beatPulse + 0.05 * bloomFlash);
  const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax), pts = [];
  for (let i = 0; i <= N; i++) { const f = (i / N) * TAU, r = 2 + Math.cos(q * f), x = r * Math.cos(p * f), y = r * Math.sin(p * f), z = -Math.sin(q * f) * 1.2, x1 = x * ca + z * sa, z1 = -x * sa + z * ca, y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, pr = 6 / (6 + z2 * 0.6); pts.push([MX + x1 * sc * pr, MY + y1 * sc * pr, z2, f]); }
  const segs = []; for (let i = 0; i < N; i++) segs.push(i);
  segs.sort((a, b) => pts[a][2] + pts[a + 1][2] - pts[b][2] - pts[b + 1][2]);
  const mint = [126, 224, 195], peach = [245, 184, 154];
  ctx.save(); ctx.lineCap = 'round';
  for (const i of segs) { const a = pts[i], b = pts[i + 1], dz = clamp((a[2] + 3) / 6, 0, 1), col = mix(mint, peach, clamp(0.5 + 0.5 * Math.sin(a[3] * 3 + t * 0.6) * (0.4 + SET.warm), 0, 1)); ctx.strokeStyle = rgba(mix(col, [20, 12, 22], 0.55 - 0.45 * dz), 0.55 + 0.3 * dz); ctx.lineWidth = (10 + 8 * dz) * S * (0.8 + 0.4 * dyn); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const i of segs) { if (i % 3) continue; const a = pts[i], b = pts[i + 1], dz = clamp((a[2] + 3) / 6, 0, 1); ctx.strokeStyle = `rgba(255,250,240,${0.12 + 0.35 * dz * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 2))})`; ctx.lineWidth = 1.2 * S; ctx.beginPath(); ctx.moveTo(a[0] + 2, a[1] - 2); ctx.lineTo(b[0] + 2, b[1] - 2); ctx.stroke(); }
  const g = ctx.createRadialGradient(MX, MY, 0, MX, MY, MR * 1.2); g.addColorStop(0, `rgba(245,200,170,${0.1 + 0.15 * bloomFlash})`); g.addColorStop(1, 'rgba(126,224,195,0)'); ctx.fillStyle = g; ctx.fillRect(MX - MR * 1.3, MY - MR * 1.3, MR * 2.6, MR * 2.6);
  ctx.restore();
}
function drawFloor() { const fy = MY + MR * 1.32; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 5; k++) { const rx = MR * (0.9 + k * 0.38 + 0.08 * beatPulse); ctx.strokeStyle = `rgba(245,184,154,${0.16 - k * 0.028})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(MX, fy, rx, rx * 0.16, 0, 0, TAU); ctx.stroke(); } ctx.restore(); }
function drawHmpTitle() {
  if (phone) return;
  const f = Math.max(S, 0.9);
  ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(240,226,214,0.95)'; ctx.font = fnt(22 * f, 's', '300');
  const x1 = spaced('HYPERMETAPUNK', 28, 42, 6 * f);
  ctx.font = fnt(10 * f, 's'); ctx.fillStyle = 'rgba(240,226,214,0.55)'; spaced('RESONANCE PLAYER', 30, 60, 3 * f);
  ctx.strokeStyle = 'rgba(240,226,214,0.2)'; ctx.beginPath(); ctx.moveTo(x1 + 14, 24); ctx.lineTo(x1 + 14, 60); ctx.stroke();
  ctx.fillStyle = `rgba(126,224,195,${0.6 + 0.4 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(x1 + 30, 38, 3.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(240,226,214,0.7)'; ctx.font = fnt(10 * f, 's'); spaced(paused ? 'PAUSED' : 'LIVE', x1 + 40, 42, 3 * f);
  ctx.fillStyle = 'rgba(240,228,214,0.92)'; ctx.font = fnt(24 * f, 's'); ctx.fillText('5D parameter lattice', 28, 104 * f);
  ctx.fillStyle = 'rgba(240,228,214,0.6)'; ctx.font = fnt(13.5 * f, 's'); ctx.fillText('drag a node to shape the sound', 28, 104 * f + 22);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(240,228,214,0.4)'; ctx.font = fnt(10.5 * f, 's', 'italic'); ctx.fillText('colour = designed parameter mapping, not physical light frequency', W * (wide ? 0.72 : 0.96), LT - 50);
  ctx.restore();
}
function drawLat() {
  const hmp = skin === 'hmp', al = hmp ? 1 : 0.55, pts = LAT.map((_, i) => latPos(i));
  ctx.save(); ctx.lineWidth = 1;
  ctx.strokeStyle = hmp ? 'rgba(245,200,170,0.35)' : 'rgba(234,220,198,0.16)';
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = pts[i], b = pts[(i + 2) % 5]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.strokeStyle = hmp ? 'rgba(126,224,195,0.18)' : 'rgba(234,220,198,0.07)'; ctx.stroke();
  if (hmp) { ctx.beginPath(); ctx.arc(MX, MY, MR * 1.62, 0, TAU); ctx.strokeStyle = 'rgba(245,200,170,0.12)'; ctx.stroke(); }
  for (let d = 1; d <= depth; d++) {
    const s = Math.pow(0.8, d), rot = (d * Math.PI) / 5; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = (LAT[i].a * Math.PI) / 180 + rot, x = MX + Math.cos(a) * MR * 1.3 * s, y = MY + Math.sin(a) * MR * 1.3 * s; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath(); ctx.strokeStyle = `rgba(255,236,190,${0.08 + 0.04 * d})`; ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  pts.forEach(p => { const r = (hmp ? 9 : phone ? 8 : 6) * Math.max(S, 0.9), g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3); g.addColorStop(0, `rgba(240,250,245,${0.9 * al})`); g.addColorStop(0.3, `rgba(126,224,195,${0.45 * al})`); g.addColorStop(1, 'rgba(126,224,195,0)'); ctx.fillStyle = g; ctx.fillRect(p[0] - r * 3, p[1] - r * 3, r * 6, r * 6); });
  ctx.globalCompositeOperation = 'source-over';
  ctx.font = fnt((hmp ? 15 : 11.5) * Math.max(S, 0.9), 's', hmp ? 'italic' : ''); ctx.fillStyle = hmp ? 'rgba(240,228,214,0.9)' : 'rgba(234,220,198,0.5)';
  if (!phone || hmp) pts.forEach((p, i) => { const a = (LAT[i].a * Math.PI) / 180, c = Math.cos(a); ctx.textAlign = c > 0.3 ? 'left' : c < -0.3 ? 'right' : 'center'; ctx.fillText(LAT[i].n, p[0] + c * 22 * S, p[1] + Math.sin(a) * 18 * S + 4); });
  ctx.restore();
}
function drawDisk(back) {
  const r = holeRad();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(hole.x, hole.y); ctx.scale(1, 0.32); ctx.setLineDash([9, 6]);
  for (let k = 0; k < 3; k++) { ctx.lineDashOffset = -hole.spin * (40 - k * 8); ctx.strokeStyle = `rgba(${255 - k * 30},${150 + k * 20},${90 + k * 50},${(0.55 - k * 0.13) * (back ? 0.55 : 1)})`; ctx.lineWidth = (5 - k) * 1.4 * S; ctx.beginPath(); ctx.arc(0, 0, r * (1.7 + k * 0.45), back ? Math.PI : 0, back ? TAU : Math.PI); ctx.stroke(); }
  ctx.restore();
}
function drawHole() {
  if (!hole.on) return;
  const r = holeRad();
  ctx.save(); ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(200,170,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hole.x, hole.y + r * 1.5); ctx.lineTo(hole.x, LB); ctx.stroke(); ctx.restore();
  drawDisk(true);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hole.x, hole.y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,190,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hole.x, hole.y, r * 1.12, 0, TAU); ctx.stroke();
  drawDisk(false);
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,200,255,0.75)'; ctx.font = fnt(10 * Math.max(S, 0.9), 'm'); ctx.fillText(`black hole · ${hole.lab}`, hole.x, hole.y - r * 2.2); ctx.restore();
}
function drawSpag() { for (const s of spag) { const k = s.life / s.max, x = s.x + (hole.x - s.x) * (1 - k), y = s.y + (hole.y - s.y) * (1 - k); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(hole.y - s.y, hole.x - s.x)); ctx.fillStyle = rgba(s.c, 0.8 * k); ctx.beginPath(); ctx.ellipse(0, 0, (4 + 26 * (1 - k)) * S, (5 * k + 0.6) * S, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
function drawBird() {
  if (bird.alpha < 0.02 || bird.x < -50) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < bird.trail.length; i++) { ctx.strokeStyle = `rgba(255,236,190,${(i / bird.trail.length) * 0.35 * bird.alpha})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bird.trail[i - 1][0], bird.trail[i - 1][1]); ctx.lineTo(bird.trail[i][0], bird.trail[i][1]); ctx.stroke(); }
  const r = (5 + 4 * bird.flash) * S, g = ctx.createRadialGradient(bird.x, bird.y, 0, bird.x, bird.y, r * 4), pk = INK.on ? 0.3 : 1;   // every light look, or its glow prints as a dark smudge
  g.addColorStop(0, `rgba(255,240,200,${0.8 * bird.alpha * pk})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(bird.x - r * 4, bird.y - r * 4, r * 8, r * 8);
  const fl = reduceMotion ? 0.3 : Math.sin(t * 14) * 0.6;
  ctx.strokeStyle = `rgba(255,236,200,${0.75 * bird.alpha})`; ctx.lineWidth = 1.4; ctx.beginPath();
  ctx.moveTo(bird.x - 9 * S, bird.y - fl * 6 * S); ctx.quadraticCurveTo(bird.x - 4 * S, bird.y - 5 * S, bird.x, bird.y); ctx.quadraticCurveTo(bird.x + 4 * S, bird.y - 5 * S, bird.x + 9 * S, bird.y - fl * 6 * S); ctx.stroke();
  ctx.restore();
}
function drawGlyphs() {
  if (!glyphs.length) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.textAlign = 'center';
  for (const g of glyphs) { const a = Math.min(1, g.life / 0.6); ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.fillStyle = rgba(g.col, 0.9 * a); ctx.font = fnt(14 * g.s * S + 2, 's', 'italic'); ctx.fillText(g.txt, 0, 0); ctx.restore(); }
  ctx.restore();
}
function drawFloaters() {
  if (!floaters.length) return;
  ctx.save(); ctx.textAlign = 'center';
  for (const f of floaters) { const k = f.life / f.max, a = Math.min(1, k * 2.2); ctx.fillStyle = `rgba(255,226,160,${0.95 * a})`; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6; ctx.font = fnt(13 * Math.max(S, 0.95), 'm'); ctx.fillText(f.txt, f.x, f.y - (1 - k) * 46); }
  ctx.restore();
}
function drawReadout() {
  const y0 = Math.min(MY + MR * 1.36 + 28, LT - 52 - (phone ? 0 : 26));
  ctx.save(); ctx.textAlign = 'center';
  if (chordNow) {
    ctx.fillStyle = 'rgba(248,232,204,0.95)'; ctx.font = fnt(24 * S, 's', 'italic'); ctx.fillText(chordNow.str, MX, y0);
    ctx.fillStyle = 'rgba(234,220,198,0.55)'; ctx.font = fnt(10 * S + 1, 'm');
    ctx.fillText(chordNow.name + (chordNow.shimmer ? ' · shimmering on purpose' : chordNow.beatless ? ' · beatless' : ''), MX, y0 + 18 * S);
  } else if (entered) {
    const pinned = voices.some(v => v.wT > 0 && t < v.pinUntil);
    ctx.fillStyle = 'rgba(234,220,198,0.62)'; ctx.font = fnt(17 * S, 's', 'italic'); ctx.fillText(pinned ? 'suspended…' : LS.src && t - LS.lastVoicedT < 1 ? 'listening…' : LIGHT() ? 'gliding home…' : 'leaning…', MX, y0);
    const bw = 120 * S, bx = MX - bw / 2, by = y0 + 11 * S;
    ctx.fillStyle = 'rgba(234,220,198,0.1)'; ctx.fillRect(bx, by, bw, 3);
    const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0), fs = skin === 'fieldstone'; gg.addColorStop(0, fs ? 'rgba(217,236,108,0.95)' : 'rgba(246,195,95,0.9)'); gg.addColorStop(1, fs ? 'rgba(126,224,195,0.9)' : 'rgba(225,95,205,0.9)');
    ctx.fillStyle = gg; ctx.fillRect(bx, by, bw * clamp(Rs, 0.02, 1), 3);
  }
  if (entered && !phone) {
    const m = dyn < 0.55 ? 'p' : dyn < 0.7 ? 'mp' : dyn < 0.86 ? 'mf' : 'f', tr = dynTrend > 0.015 ? ' · cresc.' : dynTrend < -0.015 ? ' · dim.' : '';
    ctx.fillStyle = 'rgba(234,220,198,0.5)'; ctx.font = fnt(12.5 * S, 's', 'italic');
    ctx.fillText(m + tr + (rhyActive() ? ` · ${Math.round(rhy.bpm)} bpm · ${era ? 3 : tuplet} per beat` : '') + (skin === 'peachfall' ? ` · ${wxName()}` : ''), MX, y0 + (chordNow ? 36 * S : 32));
  }
  ctx.restore();
}
function drawHarp() { if (harpTrail.length < 2) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; for (let i = 1; i < harpTrail.length; i++) { const a = harpTrail[i - 1], b = harpTrail[i]; if (Math.hypot(a.x - b.x, a.y - b.y) > 80) continue; ctx.strokeStyle = `rgba(255,236,190,${0.5 * b.life})`; ctx.lineWidth = 3 * b.life * S; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } ctx.restore(); }
function drawTip() {
  if (!hoverTip || PTR.size) return;
  const w = 250, pad = 11;
  ctx.save(); ctx.font = fnt(12, 'u');
  const body = wrapText(ctx, hoverTip.lines[2], w - pad * 2), h = pad * 2 + 20 + 15 + body.length * 16;
  const x = clamp(hoverTip.x + 14, 8, W - w - 8), y = clamp(hoverTip.y - h - 14, 8, H - h - 8);
  ctx.fillStyle = 'rgba(22,16,26,0.92)'; ctx.strokeStyle = hoverTip.found ? 'rgba(246,195,95,0.35)' : 'rgba(246,195,95,0.7)'; ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#f8e8c8'; ctx.font = fnt(17, 's', 'italic'); ctx.fillText(hoverTip.lines[0], x + pad, y + pad + 13);
  ctx.fillStyle = 'rgba(234,220,198,0.6)'; ctx.font = fnt(10.5, 'm'); ctx.fillText(hoverTip.lines[1], x + pad, y + pad + 30);
  ctx.fillStyle = 'rgba(234,220,198,0.85)'; ctx.font = fnt(12, 'u'); body.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + 50 + i * 16));
  ctx.restore();
}
function drawAnalyzer() {
  if (!A.analyser) return;
  const x0 = PX0 - 8, y0 = LT - 6, w = PW + 16, h = LB - LT + 22, an = A.analyser;
  ctx.save(); ctx.fillStyle = 'rgba(16,9,18,0.95)'; roundRect(ctx, x0, y0, w, h, 10); ctx.fill(); ctx.strokeStyle = 'rgba(126,224,195,0.18)'; ctx.stroke();
  if (tab === 'waveform') {
    if (!tdBuf) tdBuf = new Float32Array(an.fftSize); an.getFloatTimeDomainData(tdBuf);
    ctx.beginPath(); for (let i = 0; i < tdBuf.length; i += 2) { const X = x0 + 10 + (i / tdBuf.length) * (w - 20), Y = y0 + h / 2 - tdBuf[i] * h * 1.6; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.strokeStyle = 'rgba(126,224,195,0.25)'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = 'rgba(160,240,215,0.95)'; ctx.lineWidth = 1.6; ctx.stroke();
  } else {
    if (!fqBuf) fqBuf = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(fqBuf);
    const nb = 96, ny = A.ac.sampleRate / 2;
    for (let b = 0; b < nb; b++) { const f0 = 40 * Math.pow(300, b / nb), f1 = 40 * Math.pow(300, (b + 1) / nb); let m = 0; for (let i = Math.floor((f0 / ny) * fqBuf.length); i <= Math.floor((f1 / ny) * fqBuf.length) && i < fqBuf.length; i++) m = Math.max(m, fqBuf[i]); const bh = (m / 255) * (h - 20); ctx.fillStyle = rgba(mix([126, 224, 195], [245, 184, 154], b / nb), 0.85); ctx.fillRect(x0 + 10 + (b / nb) * (w - 20), y0 + h - 10 - bh, (w - 20) / nb - 1, bh); }
  }
  ctx.restore();
}
function drawStory3() {
  const g = ctx3; g.save();
  [[0.2, 0.25, [246, 200, 170]], [0.55, 0.15, [190, 210, 235]], [0.8, 0.3, [220, 200, 235]], [0.4, 0.42, [250, 225, 190]]].forEach(([fx, fy, c], i) => { const x = fx * W + Math.sin(t * 0.05 + i) * 30, y = fy * LT + Math.cos(t * 0.04 + i) * 20, r = Math.max(W, H) * 0.22, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, 0.55)); gr.addColorStop(0.7, rgba(c, 0.18)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
  if (act && act.disp) {
    const yOf = s => LB - hgt(act.disp[s], act) * (LB - LT) * 0.92;
    g.beginPath(); for (let s = 0; s < NS; s++) { const X = PX0 + (s / (NS - 1)) * PW + VIEW.rubber; if (s) g.lineTo(X, yOf(s)); else g.moveTo(X, yOf(s)); } g.lineTo(PX0 + PW, H); g.lineTo(PX0, H); g.closePath();
    const hg = g.createLinearGradient(0, LT, 0, H); hg.addColorStop(0, 'rgba(150,190,120,0.75)'); hg.addColorStop(1, 'rgba(90,140,90,0.85)'); g.fillStyle = hg; g.fill();
    g.strokeStyle = 'rgba(70,110,60,0.55)'; g.lineWidth = 1; g.beginPath();
    for (let s = 0; s < NS; s += 3) { const X = PX0 + (s / (NS - 1)) * PW + VIEW.rubber, Y = yOf(s), hh = 5 + ((s * 37) % 7); g.moveTo(X, Y + 2); g.lineTo(X + Math.sin(t * 1.4 + s * 0.3) * 2, Y - hh); }
    g.stroke();
  }
  for (const v of voices) {
    if (v.w < 0.05) continue; const b = ballPos(v); if (b.off) continue;
    g.strokeStyle = 'rgba(70,110,60,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.X, b.Y + BR); g.lineTo(b.X, LB + 6); g.stroke();
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5 + t * 0.2; g.fillStyle = rgba(mix(v.col, [255, 255, 255], 0.2), 0.7 * v.w); g.beginPath(); g.ellipse(b.X + Math.cos(a) * 7 * S, b.Y + Math.sin(a) * 7 * S, 6 * S, 3.5 * S, a, 0, TAU); g.fill(); }
  }
  if (!paperPat) { const c = document.createElement('canvas'); c.width = c.height = 128; const pg = c.getContext('2d'), im = pg.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = 200 + Math.random() * 55; im.data[i] = v; im.data[i + 1] = v * 0.97; im.data[i + 2] = v * 0.9; im.data[i + 3] = 255; } pg.putImageData(im, 0, 0); paperPat = g.createPattern(c, 'repeat'); }
  g.globalAlpha = 0.18; g.fillStyle = paperPat; g.fillRect(0, 0, W, H);
  g.restore();
}
function drawPad() {
  if (!UNL.box || !gw.classList.contains('on') || gw.classList.contains('min') || (phone && sheet.name === 'peek')) return;
  const c = $('pad').getContext('2d'), cx = 240, cy = 212, R = 150, px = cx + BOX.x * R, py = cy + BOX.y * R;
  c.clearRect(0, 0, 480, 400);
  if (BOX.open > 0.02) { const gr = c.createRadialGradient(cx, cy, 0, cx, cy, 230); gr.addColorStop(0, `rgba(255,214,150,${0.5 * BOX.open})`); gr.addColorStop(1, 'rgba(255,214,150,0)'); c.fillStyle = gr; c.fillRect(0, 0, 480, 400); }
  [[1, 'rgba(246,195,95,0.35)'], [0.5, 'rgba(234,220,198,0.08)']].forEach(([s, col]) => { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); VERT.forEach(([vx, vy], k) => { const X = cx + vx * R * s, Y = cy + vy * R * s; if (k) c.lineTo(X, Y); else c.moveTo(X, Y); }); c.closePath(); c.stroke(); });
  c.font = fnt(22, 'u'); c.textAlign = 'center';
  VERT.forEach(([vx, vy], k) => {
    const X = cx + vx * R, Y = cy + vy * R;
    c.strokeStyle = rgba(VCOL[k], 0.15 + 0.8 * W5[k]); c.lineWidth = 1 + 7 * W5[k]; c.beginPath(); c.moveTo(px, py); c.lineTo(X, Y); c.stroke();
    c.fillStyle = rgba(VCOL[k], 0.9); c.beginPath(); c.arc(X, Y, 6 + 12 * W5[k], 0, TAU); c.fill();
    c.fillStyle = 'rgba(240,228,210,0.85)'; c.fillText(`${VNAMES[k]} ${Math.round(W5[k] * 100)}`, cx + vx * (R + 44), cy + vy * (R + 30) + 8);
  });
  const g2 = c.createRadialGradient(px, py, 0, px, py, 34); g2.addColorStop(0, 'rgba(255,240,210,0.95)'); g2.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = g2; c.fillRect(px - 34, py - 34, 68, 68);
  c.fillStyle = '#fff6e6'; c.beginPath(); c.arc(px, py, 9, 0, TAU); c.fill();
  if (BOX.auto) { c.fillStyle = 'rgba(234,220,198,0.55)'; c.font = fnt(20, 's', 'italic'); c.fillText('auto vibe: following the music', cx, 394); }
}
