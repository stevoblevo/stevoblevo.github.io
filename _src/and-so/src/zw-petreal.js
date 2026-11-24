// ===== AND SO 10.4 · Velvet: the pet, closer to real =====
// Bleve asked for her to look like something you want to touch: real bunny fur when the bunny is in her, velvet on the
// antlers, and the butterfly and the octopus wilder and closer to life. These replace the plain ellipses and lines
// drawPet used for those parts; her shape, poses and the five weights that grow each part are unchanged. Everything is
// seeded once (PETFX) so the coat does not crawl from frame to frame. Also here: Swizzle, AND SO's own little pet, a
// swift who conducts with a swizzle stick. She comes to the hills when you name your first tune in the Book's chapter
// with its names filed off. She is an original character, not a likeness of anyone.
const PETFX = { fur: null, rim: null, hair: null, spark: null, res: 2 };
function petSeed() {
  if (PETFX.fur) return;
  let s = 20261124; const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  PETFX.fur = []; for (let i = 0; i < 250; i++) { const q = r(), tone = q < 0.38 ? 0 : q < 0.74 ? 1 : 2;
    // shadow hairs gather low and right, highlights high and left: the light comes from the upper left
    const a = tone === 2 ? Math.PI * (0.95 + 0.75 * r()) : tone === 0 ? Math.PI * (-0.25 + 0.95 * r()) : TAU * r();
    PETFX.fur.push({ a, u: Math.sqrt(r()) * (tone === 2 ? 0.86 : 0.98), l: 2.2 + 2.6 * r(), j: (r() - 0.5) * 0.7, tone }); }
  PETFX.rim = []; for (let i = 0; i < 84; i++) PETFX.rim.push({ a: (i / 84) * TAU + (r() - 0.5) * 0.05, l: 1.3 + 2.4 * r(), j: (r() - 0.5) * 0.6 });
  PETFX.hair = []; for (let i = 0; i < 40; i++) PETFX.hair.push({ u: r(), side: r() < 0.5 ? -1 : 1, l: 0.8 + 0.9 * r(), j: (r() - 0.5) * 0.8 });
  PETFX.spark = []; for (let i = 0; i < 14; i++) PETFX.spark.push({ x: 6 + 30 * r(), y: -28 + 50 * r(), p: r() * TAU, v: 2 + 3 * r() });
}
// She is drawn a little larger since 10.5, and on her own canvas at the device's full resolution (drawPetFace).
const PET_SC = () => S * (phone ? 1.12 : 1.42);
// A coat of fur over an ellipse, close to a real rabbit's: a dense short undercoat, a coat of fine hairs each shaded
// from a dark root to a pale tip and laid from the bottom row up so the upper hairs lie over the lower, and a few long
// thin guard hairs that make the outline wispy. The strands are painted once per shape, without colour, into a sprite
// at device resolution (furGrey); her colour is laid over that sprite (furSprite), which is cheap, so a coat whose
// colour drifts does not have to be combed again. One drawImage a frame. 10.4 drew faint strokes over a flat fill,
// which read as blur.
const FURS = new Map();
function furGrey(rx, ry, sc, kq, dens, res) {
  const m = 6 * sc, w = Math.ceil((rx + m) * 2 * res), h = Math.ceil((ry + m) * 2 * res), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); c.setTransform(res, 0, 0, res, (rx + m) * res, (ry + m) * res); c.lineCap = 'round';
  let sd = 7919 + Math.round(rx * 13 + ry * 7); const r = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
  const hair = 0.75 / res, area = (rx * ry) / (sc * sc), gy = v => { v = Math.round(clamp(v, 0, 1) * 255); return `rgb(${v},${v},${v})`; };
  // the skin under the coat: dark, so the gaps between hairs read as depth
  c.fillStyle = gy(0.3); c.beginPath(); c.ellipse(0, 0, rx * 0.96, ry * 0.96, 0, 0, TAU); c.fill();
  // which way the coat lies: down and out from the crown, in soft locks
  const flow = (x, y) => Math.atan2((y / ry) * 0.55 + 0.85, (x / rx) * 0.9) + 0.2 * Math.sin(x * 0.42 / sc + 1.3) * Math.cos(y * 0.36 / sc + 0.4) + 0.1 * Math.sin((x + y) * 1.3 / sc);
  // 1 the undercoat: short, thick, dim, everywhere
  for (let i = 0, N = Math.round(area * 26 * dens); i < N; i++) { const u = Math.sqrt(r()) * 0.98, a = TAU * r(), x = Math.cos(a) * u * rx, y = Math.sin(a) * u * ry, d = flow(x, y) + (r() - 0.5) * 0.5, L = (1.1 + 0.8 * r()) * sc;
    c.strokeStyle = gy(0.42 + 0.2 * r()); c.lineWidth = Math.max(hair, 0.34 * sc); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(d) * L, y + Math.sin(d) * L); c.stroke(); }
  // 2 the coat: fine hairs, root to tip
  const st = []; for (let i = 0, N = Math.round(area * 46 * dens); i < N; i++) { const u = Math.sqrt(r()), a = TAU * r(); st.push([Math.cos(a) * u * rx, Math.sin(a) * u * ry, u, r(), r(), r()]); }
  st.sort((p, q) => q[1] - p[1]);
  for (const [x, y, u, r1, r2, r3] of st) {
    const d = flow(x, y) + (r1 - 0.5) * 0.3, L = (1.7 + 1.5 * r2) * sc * (0.65 + 0.4 * kq) * (u > 0.9 ? 1.2 : 1), bend = (r3 - 0.5) * 0.6;
    const x1 = x + Math.cos(d) * L, y1 = y + Math.sin(d) * L, tone = 0.74 + 0.2 * r3, gr = c.createLinearGradient(x, y, x1, y1);
    gr.addColorStop(0, gy(tone * 0.5)); gr.addColorStop(0.5, gy(tone)); gr.addColorStop(1, gy(tone + 0.16));
    c.strokeStyle = gr; c.lineWidth = Math.max(hair, (0.1 + 0.1 * r2) * sc); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(d + bend) * L * 0.55, y + Math.sin(d + bend) * L * 0.55, x1, y1); c.stroke();
  }
  // 3 guard hairs: few, long, thin and pale; they break the outline the way a real coat does
  c.globalAlpha = 0.75;
  for (let i = 0, N = Math.round(area * 5 * dens); i < N; i++) { const u = 0.35 + 0.65 * Math.sqrt(r()), a = TAU * r(), x = Math.cos(a) * u * rx, y = Math.sin(a) * u * ry, d = flow(x, y) + (r() - 0.5) * 0.45, L = (2.6 + 2.2 * r()) * sc * (0.7 + 0.35 * kq), bend = (r() - 0.5) * 0.8;
    c.strokeStyle = gy(0.9 + 0.1 * r()); c.lineWidth = Math.max(hair * 0.8, 0.065 * sc); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(d + bend) * L * 0.5, y + Math.sin(d + bend) * L * 0.5, x + Math.cos(d) * L, y + Math.sin(d) * L); c.stroke(); }
  c.globalAlpha = 1;
  // form: lit from the upper left, falling into shade low and right, with a soft sheen where the light lands
  c.globalCompositeOperation = 'source-atop';
  const sh = c.createLinearGradient(-rx, -ry, rx, ry); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.4)');
  c.fillStyle = sh; c.fillRect(-rx - m, -ry - m, (rx + m) * 2, (ry + m) * 2);
  const hl = c.createRadialGradient(-rx * 0.38, -ry * 0.42, 0, -rx * 0.38, -ry * 0.42, Math.max(rx, ry) * 0.85); hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl; c.fillRect(-rx - m, -ry - m, (rx + m) * 2, (ry + m) * 2);
  return cv;
}
function furSprite(rx, ry, sc, lp, ink, base, kq, dens, res) {
  const key = [rx.toFixed(1), ry.toFixed(1), kq, dens, res].join('|'), q = v => Math.round(v / 6) * 6;
  let sp = FURS.get(key);
  if (!sp) { if (FURS.size > 14) FURS.clear(); const grey = furGrey(rx, ry, sc, kq, dens, res), cv = document.createElement('canvas'); cv.width = grey.width; cv.height = grey.height; sp = { grey, cv, c: cv.getContext('2d'), m: 6 * sc, tint: '' }; FURS.set(key, sp); }
  const L = (lp ? HIDE.coatL : base).map(q), R = (lp ? HIDE.coatR : base).map(q), tint = L.join('.') + '/' + R.join('.') + (lp ? 'p' : '');
  if (sp.tint !== tint) {   // her colour over the strands: the tips come out paler than she is, the roots darker
    const c = sp.c, w = sp.cv.width, h = sp.cv.height, pale = col => rgba(mix(col, [255, 255, 255], lp ? 0.5 : 0.42), 1);
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h); c.drawImage(sp.grey, 0, 0);
    c.globalCompositeOperation = 'multiply'; const gr = c.createLinearGradient(w * 0.46, 0, w * 0.54, 0); gr.addColorStop(0, pale(L)); gr.addColorStop(1, pale(R)); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = lp ? rgba(mix(ink, [255, 255, 255], 0.94), 1) : 'rgb(255,246,250)'; c.fillRect(0, 0, w, h);   // roots lean to the ink on paper, to plum elsewhere
    c.globalCompositeOperation = 'destination-in'; c.drawImage(sp.grey, 0, 0); c.globalCompositeOperation = 'source-over';
    sp.tint = tint;
  }
  return sp;
}
function petFur(g, cx, cy, rx, ry, sc, lp, ink, base, wl, skip) {
  const k = clamp(wl * 1.7, 0, 1); if (k < 0.05) return;   // the fur comes with the bunny in her
  const sp = furSprite(rx, ry, sc, lp, ink, base, Math.round(k * 4) / 4, skip ? 0.85 : 1, PETFX.res || 2);
  g.save(); g.globalAlpha *= Math.min(1, k * 1.4); g.drawImage(sp.cv, cx - rx - sp.m, cy - ry - sp.m, (rx + sp.m) * 2, (ry + sp.m) * 2); g.restore();
}
// a furred limb: the same coat on a thin capsule, laid along the limb
function petFurLimb(g, x0, y0, x1, y1, wd, sc, lp, ink, base, wl) {
  const len = Math.hypot(x1 - x0, y1 - y0), half = Math.max(2, Math.round(len / sc)) * sc / 2;
  g.save(); g.translate((x0 + x1) / 2, (y0 + y1) / 2); g.rotate(Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2); petFur(g, 0, 0, wd, half, sc, lp, ink, base, wl, 2); g.restore();
}
const petQ = (p0, c, p1, u) => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * c[1] + u * u * p1[1]];
// antlers in velvet: a dark core, a lit side, a soft pile standing off the beam, and rounded tips still growing
function petAntlers(g, sc, wm, lp) {
  petSeed(); const al = Math.min(1, wm * 1.8), L = (8 + 17 * wm) * sc;
  const vel = lp ? [[70, 46, 34], [126, 90, 64], [200, 164, 132]] : [[96, 66, 56], [160, 120, 96], [238, 208, 180]];
  g.save(); g.globalAlpha *= al; g.lineCap = 'round'; g.lineJoin = 'round';
  [-1, 1].forEach(s => {
    const b = [s * 3.2 * sc, -11.5 * sc], tip = [s * (6 * sc + L * 0.42), -12 * sc - L], c = [s * (1.5 * sc + L * 0.02), -12 * sc - L * 0.55];
    const j1 = petQ(b, c, tip, 0.2), j2 = petQ(b, c, tip, 0.56);
    const br = [[b, c, tip, 3.4], [j1, [j1[0] + s * L * 0.2, j1[1] - L * 0.02], [j1[0] + s * L * 0.34, j1[1] - L * 0.2], 2.2], [j2, [j2[0] + s * L * 0.26, j2[1] - L * 0.04], [j2[0] + s * L * 0.4, j2[1] - L * 0.3], 2.5]];
    for (const [p0, cc, p1, w0] of br) {   // the pile: a soft halo that makes the beam look thick with velvet
      g.strokeStyle = rgba(vel[2], 0.12); g.lineWidth = w0 * 1.35 * sc; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(cc[0], cc[1], p1[0], p1[1]); g.stroke();
    }
    [[vel[0], 1, 0, 1], [vel[1], 0.66, -0.45, 1], [vel[2], 0.24, -0.9, 0.75]].forEach(([col, wk, off, a]) => {
      g.strokeStyle = rgba(col, a);
      for (const [p0, cc, p1, w0] of br) for (let i = 0; i < 8; i++) { const u0 = i / 8, u1 = (i + 1) / 8, A = petQ(p0, cc, p1, u0), B = petQ(p0, cc, p1, u1);
        g.lineWidth = Math.max(0.5, w0 * wk * (1 - 0.5 * u1)) * sc; g.beginPath(); g.moveTo(A[0] + off * sc * 0.5, A[1] + off * sc * 0.5); g.lineTo(B[0] + off * sc * 0.5, B[1] + off * sc * 0.5); g.stroke(); }
    });
    g.strokeStyle = rgba(vel[2], 0.6); g.lineWidth = 0.45 * sc; g.beginPath();
    br.forEach(([p0, cc, p1, w0], bi) => { for (let i = bi; i < PETFX.hair.length; i += 3) { const h = PETFX.hair[i], P = petQ(p0, cc, p1, h.u), Q = petQ(p0, cc, p1, Math.min(1, h.u + 0.05));
      const nx = -(Q[1] - P[1]), ny = Q[0] - P[0], n = Math.hypot(nx, ny) || 1, r0 = w0 * (1 - 0.5 * h.u) * 0.5 * sc, len = (r0 + h.l * sc);
      g.moveTo(P[0] + (nx / n) * h.side * r0 * 0.7, P[1] + (ny / n) * h.side * r0 * 0.7); g.lineTo(P[0] + (nx / n) * h.side * len + h.j * sc * 0.4, P[1] + (ny / n) * h.side * len - 0.3 * sc); } });
    g.stroke();
    for (const [, , p1, w0] of br) {   // the blunt, rounded tips of antlers in velvet
      const rr = w0 * 0.42 * sc, tg = g.createRadialGradient(p1[0] - rr * 0.4, p1[1] - rr * 0.4, 0, p1[0], p1[1], rr * 1.3);
      tg.addColorStop(0, rgba(vel[2], 1)); tg.addColorStop(0.6, rgba(vel[1], 1)); tg.addColorStop(1, rgba(vel[0], 1));
      g.fillStyle = tg; g.beginPath(); g.arc(p1[0], p1[1], rr * 1.25, 0, TAU); g.fill();
    }
    g.fillStyle = rgba(lp ? [62, 140, 64] : [140, 210, 120], 0.95); g.beginPath(); g.ellipse(tip[0] + s * 2.2 * sc, tip[1] - 1.2 * sc, 2.4 * sc, 1.3 * sc, s * 0.6, 0, TAU); g.fill();   // she is part tree: one leaf
  });
  g.restore();
}
// butterfly wings with veins, a dark margin with pale dots, an eyespot, and scales that catch the light
function petWings(g, sc, sy, wd, lp, acc, ink) {
  petSeed(); const still = reduceMotion ? 0.25 : 1, fl = Math.sin(t * (4 + rhy.bpm / 30)) * still, u = (0.6 + 0.78 * wd) * sc, hue = (t * 22) % 360;
  const edge = lp ? ink : [18, 10, 30];
  [-1, 1].forEach(s => {
    g.save(); g.translate(0, -6 * sc + sy); g.rotate(s * (0.16 + 0.13 * fl)); g.scale(s * (1 - 0.4 * (0.5 + 0.5 * fl)), 1); g.globalAlpha *= Math.min(1, wd * 1.8) * (lp ? 0.97 : 0.93);
    const fore = () => { g.beginPath(); g.moveTo(1 * u, -1 * u); g.bezierCurveTo(8 * u, -20 * u, 26 * u, -34 * u, 40 * u, -30 * u); g.bezierCurveTo(44 * u, -22 * u, 38 * u, -8 * u, 24 * u, -1 * u); g.bezierCurveTo(14 * u, 2 * u, 5 * u, 1 * u, 1 * u, -1 * u); g.closePath(); };
    const hind = () => { g.beginPath(); g.moveTo(1 * u, 1 * u); g.bezierCurveTo(14 * u, 0, 28 * u, 4 * u, 30 * u, 14 * u); g.bezierCurveTo(31 * u, 24 * u, 22 * u, 30 * u, 14 * u, 27 * u); g.bezierCurveTo(12 * u, 34 * u, 9 * u, 36 * u, 8 * u, 31 * u); g.bezierCurveTo(4 * u, 22 * u, 1 * u, 10 * u, 1 * u, 1 * u); g.closePath(); };
    const side = s < 0 ? 'warm' : 'cool', gr = g.createRadialGradient(0, 0, 1, 0, 0, 46 * u);
    if (lp) { gr.addColorStop(0, rgba(mix(s < 0 ? HIDE.coatL : HIDE.coatR, [255, 255, 255], 0.3), 1)); gr.addColorStop(0.45, rgba(hideCol(side, 5), 1)); gr.addColorStop(0.82, rgba(mix(hideCol(side, 7), ink, 0.25), 1)); gr.addColorStop(1, rgba(ink, 1)); }
    else { gr.addColorStop(0, 'rgba(255,244,214,1)'); gr.addColorStop(0.22, rgba(mix(acc, [255, 255, 255], 0.2), 1)); gr.addColorStop(0.55, `hsl(${(hue + 200) % 360},92%,62%)`); gr.addColorStop(0.82, `hsl(${(hue + 262) % 360},86%,44%)`); gr.addColorStop(1, 'rgb(18,10,30)'); }
    [hind, fore].forEach((path, wi) => {
      path(); g.fillStyle = gr; g.fill();
      g.save(); path(); g.clip();
      g.strokeStyle = rgba(edge, 0.9); g.lineWidth = 4.2 * u; path(); g.stroke();   // the dark margin, inside the wing
      g.strokeStyle = rgba(edge, lp ? 0.5 : 0.42); g.lineWidth = 0.55 * u; g.beginPath();
      (wi ? [[40, -30], [43, -22], [39, -12], [31, -4], [22, -26], [12, -20]] : [[30, 14], [26, 25], [15, 27], [9, 32], [22, 6]]).forEach(([x, y]) => { g.moveTo(2 * u, (wi ? -1 : 1) * u); g.quadraticCurveTo(x * 0.5 * u, y * 0.42 * u + (wi ? -2 : 2) * u, x * u, y * u); });
      g.stroke();
      g.fillStyle = lp ? 'rgba(255,255,255,0.92)' : 'rgba(255,250,235,0.95)';
      (wi ? [[38.6, -27], [40.2, -21.5], [38.6, -15.5], [34.6, -9.6], [29, -5]] : [[27.6, 13], [26.6, 20], [21.6, 25.4], [15, 24.6]]).forEach(([x, y]) => { g.beginPath(); g.arc(x * u, y * u, 0.95 * u, 0, TAU); g.fill(); });
      if (!wi) {   // the eyespot
        const ex = 19 * u, ey = 14.5 * u; g.fillStyle = rgba(edge, 1); g.beginPath(); g.arc(ex, ey, 4.4 * u, 0, TAU); g.fill();
        g.fillStyle = lp ? rgba(hideCol('cool', 6), 1) : `hsl(${(hue + 170) % 360},95%,60%)`; g.beginPath(); g.arc(ex, ey, 3.1 * u, 0, TAU); g.fill();
        g.fillStyle = lp ? rgba(hideCol('warm', 5), 1) : 'rgb(255,214,120)'; g.beginPath(); g.arc(ex, ey, 2 * u, 0, TAU); g.fill();
        g.fillStyle = rgba(edge, 1); g.beginPath(); g.arc(ex, ey, 1.2 * u, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ex - 0.6 * u, ey - 0.7 * u, 0.5 * u, 0, TAU); g.fill();
      } else { g.fillStyle = lp ? rgba(hideCol('warm', 6), 0.9) : 'rgba(255,170,80,0.9)'; g.beginPath(); g.ellipse(17 * u, -15 * u, 3.4 * u, 1.3 * u, -0.7, 0, TAU); g.fill(); }
      if (!lp) {   // scales catching the light: a band of sheen that travels, and a few that glint
        g.globalCompositeOperation = 'lighter'; const p = 0.5 + 0.5 * Math.sin(t * 1.7 * still + s), sh = g.createLinearGradient(0, -30 * u, 40 * u, 16 * u);
        sh.addColorStop(clamp(p - 0.16, 0, 1), 'rgba(160,255,245,0)'); sh.addColorStop(clamp(p, 0.01, 0.99), 'rgba(170,255,245,0.42)'); sh.addColorStop(clamp(p + 0.16, 0, 1), 'rgba(160,255,245,0)');
        g.fillStyle = sh; g.fillRect(0, -36 * u, 46 * u, 74 * u);
        g.fillStyle = 'rgba(255,255,255,0.9)'; for (const q of PETFX.spark) { const tw = Math.max(0, Math.sin(t * q.v * still + q.p)); if (tw > 0.72) { g.beginPath(); g.arc(q.x * u, q.y * u, (tw - 0.7) * 2.2 * u, 0, TAU); g.fill(); } }
      }
      g.restore();
      if (lp) { g.strokeStyle = rgba(ink, 0.9); g.lineWidth = Math.max(1, 1.05 * sc); path(); g.stroke(); }
    });
    g.restore();
  });
}
// octopus arms: tapered and wet, a paler underside with suckers, tips that curl and glow
function petArms(g, sc, sy, wc, lp, acc, ink, dark, E) {
  const al = Math.min(1, wc * 1.7), still = reduceMotion ? 0.25 : 1, N = 12, L = (13 + 30 * wc + 9 * E) * sc;
  g.save(); g.globalAlpha *= al; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const dirS = i < 3 ? -1 : 1, ox = (i - 2.5) * 4.2 * sc, spread = (i - 2.5) * 6.5 * sc * wc, ph = i * 1.3, curl = (Rs > 0.55 ? 0.8 : 0.35) + 0.25 * Math.sin(t * 1.1 * still + i);
    const col = lp ? mix(hideCol(i < 3 ? 'warm' : 'cool', 7 + i), ink, 0.28) : mix(mix(acc, [150, 70, 190], 0.5), dark, 0.25), hi = lp ? mix(col, [255, 255, 255], 0.45) : mix(col, [255, 235, 250], 0.55);
    const pts = []; for (let k = 0; k <= N; k++) { const f = k / N; pts.push([ox + spread * f * f + Math.sin(f * 4.2 - t * 2.4 * still + ph) * 5 * sc * f + dirS * curl * f * f * f * 9 * sc, 12 * sc + sy + f * L * 0.9 - f * f * f * L * 0.34 * curl, (4.8 - 4.1 * f) * sc * (0.6 + 0.5 * wc)]); }
    for (let k = 0; k < N; k++) { g.strokeStyle = rgba(col, 1); g.lineWidth = pts[k][2]; g.beginPath(); g.moveTo(pts[k][0], pts[k][1]); g.lineTo(pts[k + 1][0], pts[k + 1][1]); g.stroke(); }
    for (let k = 0; k < N; k++) { g.strokeStyle = rgba(hi, 0.7); g.lineWidth = pts[k][2] * 0.34; g.beginPath(); g.moveTo(pts[k][0] - dirS * pts[k][2] * 0.2, pts[k][1] - pts[k][2] * 0.16); g.lineTo(pts[k + 1][0] - dirS * pts[k + 1][2] * 0.2, pts[k + 1][1] - pts[k + 1][2] * 0.16); g.stroke(); }
    for (let k = 1; k < N - 1; k++) {   // suckers along the inner side
      const [x, y, w] = pts[k], dx = pts[k + 1][0] - x, dy = pts[k + 1][1] - y, n = Math.hypot(dx, dy) || 1, r0 = Math.max(0.5, w * 0.27), sxp = x + (-dy / n) * dirS * w * 0.3, syp = y + (dx / n) * dirS * w * 0.3;
      g.fillStyle = lp ? 'rgba(255,255,255,0.95)' : 'rgba(255,220,232,0.95)'; g.beginPath(); g.arc(sxp, syp, r0, 0, TAU); g.fill();
      g.fillStyle = rgba(lp ? ink : [120, 50, 110], 0.55); g.beginPath(); g.arc(sxp, syp, r0 * 0.42, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(pts[2][0] - dirS * pts[2][2] * 0.22, pts[2][1], pts[2][2] * 0.12, pts[2][2] * 0.3, 0, 0, TAU); g.fill();   // a wet glint
    if (!lp) { const [x, y] = pts[N], R = (3.2 + 3 * beatPulse) * sc, tg = g.createRadialGradient(x, y, 0, x, y, R); g.globalCompositeOperation = 'lighter';
      tg.addColorStop(0, rgba(mix(acc, [255, 255, 255], 0.5), 0.85)); tg.addColorStop(1, rgba(acc, 0)); g.fillStyle = tg; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
  }
  g.restore();
}
// ---------- Swizzle: AND SO's own pet ----------
const SO_PETS = { kit: 'so', list: [{ id: 'swizzle', name: 'Swizzle', line: 'a swift with a swizzle stick. she conducts whatever you are playing.', how: 'name a tune in the book’s chapter with its names filed off.', where: '' }],
  draw(c, id, o) {
    const sz = o.size || 40, k = sz / 40, tt = o.still ? 0 : o.t || 0, beat = o.still ? 0 : (o.beat || 0), bob = -beat * 4 * k, flap = o.still ? 0.2 : Math.sin(tt * 9) * 0.35 + beat * 0.5;
    c.save(); c.translate(o.x, o.y + bob); c.globalAlpha *= o.alpha == null ? 1 : o.alpha; c.lineJoin = 'round'; c.lineCap = 'round';
    const ink = '#1c2333', slate = '#40527a', deep = '#2b3856', cream = '#f6ead2';
    const shape = (fill, lw) => {   // sickle wings behind, forked tail, body, head
      [-1, 1].forEach(s => { c.save(); c.translate(s * 5 * k, -2 * k); c.rotate(s * (0.5 + flap)); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 14 * k, -16 * k, s * 22 * k, -7 * k); c.quadraticCurveTo(s * 12 * k, -8 * k, 0, 5 * k); c.closePath(); if (fill) { c.fillStyle = deep; c.fill(); } else { c.lineWidth = lw; c.stroke(); } c.restore(); });
      c.beginPath(); c.moveTo(-3 * k, 9 * k); c.lineTo(-7 * k, 19 * k); c.lineTo(0, 13 * k); c.lineTo(7 * k, 19 * k); c.lineTo(3 * k, 9 * k); c.closePath(); if (fill) { c.fillStyle = deep; c.fill(); } else { c.lineWidth = lw; c.stroke(); }
      c.beginPath(); c.ellipse(0, 3 * k, 8 * k, 10 * k, 0, 0, TAU); if (fill) { c.fillStyle = slate; c.fill(); } else { c.lineWidth = lw; c.stroke(); }
      c.beginPath(); c.arc(0, -9 * k, 8.5 * k, 0, TAU); if (fill) { c.fillStyle = slate; c.fill(); } else { c.lineWidth = lw; c.stroke(); }
    };
    c.strokeStyle = 'rgba(255,255,255,0.7)'; shape(false, 4.2 * k); c.strokeStyle = ink; shape(false, 2.2 * k); shape(true);
    c.fillStyle = cream; c.beginPath(); c.ellipse(0, 4.5 * k, 4.6 * k, 6.4 * k, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -4.6 * k, 4.4 * k, 2.6 * k, 0, 0, TAU); c.fill();
    const blink = !o.still && (tt % 3.7) > 3.55;
    [-1, 1].forEach(s => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(s * 3.5 * k, -10 * k, 2.9 * k, blink ? 0.5 * k : 3.3 * k, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 0.8 * k; c.stroke();
      if (!blink) { c.fillStyle = ink; c.beginPath(); c.arc(s * 3.5 * k + 0.6 * k, -9.6 * k, 1.5 * k, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 3.5 * k + 0.1 * k, -10.4 * k, 0.55 * k, 0, TAU); c.fill(); } });
    c.fillStyle = '#f2b23a'; c.strokeStyle = ink; c.lineWidth = 0.8 * k; c.beginPath(); c.moveTo(-1.6 * k, -7 * k); c.lineTo(0, -4.6 * k); c.lineTo(1.6 * k, -7 * k); c.closePath(); c.fill(); c.stroke();
    // the swizzle stick, a conductor's baton with a ball on top: it ticks with the beat
    const a = -0.9 + (o.still ? 0 : Math.sin(tt * 4.5) * 0.25) - beat * 0.7, bx = 9 * k, by = 1 * k, ex = bx + Math.cos(a) * 15 * k, ey = by + Math.sin(a) * 15 * k;
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3 * k; c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = '#e2456f'; c.lineWidth = 1.5 * k; c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = '#ffd36a'; c.strokeStyle = ink; c.lineWidth = 0.8 * k; c.beginPath(); c.arc(ex, ey, 2.3 * k, 0, TAU); c.fill(); c.stroke();
    if (beat > 0.35) { c.fillStyle = `rgba(255,236,170,${beat})`; [[5, -4], [-4, -6], [2, 6]].forEach(([dx, dy]) => { c.beginPath(); c.arc(ex + dx * k * (1.4 - beat), ey + dy * k * (1.4 - beat), 0.9 * k, 0, TAU); c.fill(); }); }
    c.restore(); return true;
  } };
