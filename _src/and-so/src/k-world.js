// ===== the world around the sound box =====
// two new looks remixed from the Mint Glasshouse and Peachfall Crossing artifacts (ridges that lean when you do, light shafts,
// weather that follows the music, the Sae-wink eye, three hidden spores), obsidian that cracks under a held dissonance
// (the NIC.LAN reel's "Crack" shot), and a 31-EDO hex floor (its "Lattice" shot)
const WX = {
  w: [1, 0, 0, 0], force: null, parts: [], rip: [], tens: 0, tensT: 0, heat: 0, seen: [0, 0, 0, 0], ptrT: -99, mx: 0.5, my: 0.4,
  eye: { open: 1, cyc: 0, forced: 0, x: -999, y: -999, r: 0, a: 0 },
  spores: [{ u: 0.86, v: 0.62, L: 1 }, { u: 0.1, v: 0.72, L: 2 }, { u: 0.3, v: 0.16, L: 0 }].map(s => Object.assign(s, { f: false, g: 0, x: null, y: null })),
  crack: { grow: 0, heat: 0, hotT: -99, segs: null, roots: null, key: '', all: null, paths: null, tips: [] },
  floor: { hit: new Float32Array(31), z: 0 }
};
const WXP = Array.from({ length: 512 }, () => Math.random());
const wxNoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return WXP[i & 511] * (1 - u) + WXP[(i + 1) & 511] * u; };
// Peachfall's four weathers, darkened a touch at the horizon so the light ink of the instrument still reads
const WXK = [
  { name: 'peach fall', sky: [[38, 26, 44], [196, 112, 98]], sun: [255, 200, 160], ridge: [[60, 34, 52], [86, 44, 58], [120, 60, 64]], rim: [255, 180, 138] },
  { name: 'red rain', sky: [[22, 14, 24], [124, 34, 46]], sun: [255, 110, 110], ridge: [[40, 18, 28], [58, 22, 32], [80, 28, 38]], rim: [255, 107, 107] },
  { name: 'mint clearing', sky: [[10, 26, 28], [38, 116, 98]], sun: [200, 255, 230], ridge: [[14, 46, 42], [18, 66, 56], [30, 96, 80]], rim: [94, 242, 184] },
  { name: 'night garden', sky: [[10, 14, 26], [34, 48, 80]], sun: [201, 230, 255], ridge: [[18, 24, 40], [24, 32, 52], [32, 42, 66]], rim: [201, 230, 255] }
];
const WXG = { name: 'glasshouse', sky: [[8, 28, 26], [30, 88, 76]], sun: [201, 255, 230], ridge: [[14, 50, 42], [20, 72, 58], [34, 100, 82]], rim: [94, 242, 184] };
const wxWorld = () => skin === 'glasshouse' || skin === 'peachfall';
function wxPal() {
  if (skin === 'glasshouse') return WXG;
  const w = WX.w, mixN = f => { const o = [0, 0, 0]; for (let k = 0; k < 4; k++) { const c = f(WXK[k]); o[0] += c[0] * w[k]; o[1] += c[1] * w[k]; o[2] += c[2] * w[k]; } return o; };
  return { sky: [mixN(k => k.sky[0]), mixN(k => k.sky[1])], sun: mixN(k => k.sun), ridge: [0, 1, 2].map(i => mixN(k => k.ridge[i])), rim: mixN(k => k.rim) };
}
function wxName() { let b = 0; for (let k = 1; k < 4; k++) if (WX.w[k] > WX.w[b]) b = k; return WXK[b].name; }
function wxRidgeY(L, x) {
  const sh = Math.max(80, LT - TOPH), f = [0.0015, 0.0023, 0.0033][L] * (phone ? 1.6 : 1), a = [0.15, 0.12, 0.1][L] * sh, base = LT - [0.3, 0.17, 0.05][L] * sh;
  const par = (WX.mx - 0.5) * [16, 34, 60][L] + MO.px * [14, 30, 52][L];
  return base - a * (wxNoise((x + par) * f + L * 40 + t * 0.015) * 1.2 + wxNoise((x + par) * f * 3 + L * 9) * 0.35) + MO.py * [4, 9, 16][L];
}
function wxEyePos() { const x = (phone ? 0.84 : 0.16) * W, r = Math.min(W, H) * (phone ? 0.05 : 0.04); return { x, y: wxRidgeY(2, x) - r * 1.25, r }; }
function wxSporePos(s) { const x = s.u * W, sh = Math.max(80, LT - TOPH); return { x, y: Math.min(wxRidgeY(s.L, x) - 24, TOPH + s.v * sh) }; }

// ---------- the tick ----------
function wxParts() {
  const n = Math.round(clamp((W * H) / 4500, 50, 240) * Math.max(0.55, qScale));
  while (WX.parts.length < n) WX.parts.push({ x: Math.random() * W, y: TOPH + Math.random() * Math.max(10, LB - TOPH), vx: 0, vy: 0, z: Math.random(), r: Math.random() * TAU, s: Math.random() * TAU });
  if (WX.parts.length > n) WX.parts.length = n;
}
function wxRipple(x, y, a) { WX.rip.push({ x, y, r: 4, a: a || 1 }); if (WX.rip.length > 12) WX.rip.shift(); }
function wxBurst(x, y, k) { wxRipple(x, y, Math.min(1, k)); for (const o of WX.parts) { const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) + 1; o.vx += (dx / d) * 9 * k * Math.random(); o.vy += (dy / d) * 9 * k * Math.random() - 2 * k; } }
// the floor a held voice would roll down to if it let go: walk downhill until the ground rises again
function wxFloor(v, x, d0) {
  const dir = Dv(v, x + 1) < Dv(v, x - 1) ? 1 : -1; let d = d0;
  for (let k = 0; k < 120; k++) { const nx = x + dir * 2; if (nx < 0 || nx > XMAX) break; const nd = Dv(v, nx); if (nd >= d) break; x = nx; d = nd; }
  return d;
}
function wxTick(dt) {
  if (!entered) return;
  const f60 = Math.min(3, dt * 60), kk = 1 - Math.exp(-dt * 2.5);
  const ptr = t - WX.ptrT < 3 && !isTouch;
  WX.mx += ((ptr ? lastPX / Math.max(1, W) : 0.5) - WX.mx) * kk; WX.my += ((ptr ? lastPY / Math.max(1, H) : 0.4) - WX.my) * kk;
  // tension: how far the held voices (dragged, or pinned on purpose) sit above their own valley floors.
  // voices that are rolling, gliding or settling don't count: a held dissonance is the point
  WX.tensT -= dt;
  if (WX.tensT <= 0) {
    WX.tensT = 0.12; let te = 0;
    for (const v of voices) { if (v.wT === 0 || v.w < 0.4 || v.locked || v.glide || !(v.dragging || t < v.pinUntil)) continue; const d0 = Dv(v, v.x), e = (d0 - wxFloor(v, v.x, d0)) / D0; if (e > te) te = e; }
    WX.tens = te;
  }
  WX.heat += (clamp(WX.tens * 2.4, 0, 1) - WX.heat) * (1 - Math.exp(-dt / 0.5));
  // obsidian cracks grow while a dissonance is held, then cool and slowly heal
  const C = WX.crack, cracky = skin === 'obsidian' || skin === 'dawn';
  if (cracky) {
    if (!C.segs) wxBuildCracks();
    // only a held dissonance cracks the glass: the crack's own heat is slow, and it heals once things have been calm a while
    C.heat += (WX.heat - C.heat) * (1 - Math.exp(-dt / 1.2));
    if (C.heat > 0.25) { C.grow = Math.min(1.75, C.grow + dt * (0.16 + 0.8 * (C.heat - 0.25))); C.hotT = t; }
    else if (t - C.hotT > 3) C.grow = Math.max(0, C.grow - dt * 0.2);
    if (C.grow > 0.9) discover('x-crack');
  }
  // the 31 floor: lit pitch classes
  if (M.key === 'tet31') {
    const F = WX.floor, st = 1200 / 31, tgt = new Float32Array(31); tgt[0] = 0.35;
    for (const v of voices) { if (v.wT === 0 || v.w < 0.2) continue; const pc = ((Math.round(v.c / st) % 31) + 31) % 31; tgt[pc] = Math.max(tgt[pc], (v.locked ? 0.95 : 0.5) * v.w + 0.4 * v.flash); }
    for (let k = 0; k < 31; k++) F.hit[k] += (tgt[k] - F.hit[k]) * (1 - Math.exp(-dt * 6));
    F.z += dt * (reduceMotion ? 0 : 0.32);
  }
  if (!wxWorld()) { WX.rip.length = 0; return; }
  // weather follows the music: tension rains, a settled chord clears to mint, a quiet room turns to night
  let tw;
  if (WX.force) tw = WX.force;
  else {
    const idle = (t - lastUserT > 26 && !REEL.on) || paused, night = idle ? 1 : 0, rain = (1 - night) * clamp((WX.heat - 0.2) * 2.6, 0, 1), mint = (1 - night) * (1 - rain) * (chordNow ? 1 : 0);
    tw = [Math.max(0, 1 - night - rain - mint), rain, mint, night];
  }
  const kw = 1 - Math.exp(-dt / (WX.force ? 0.9 : 2.2));
  for (let k = 0; k < 4; k++) { WX.w[k] += (tw[k] - WX.w[k]) * kw; if (skin === 'peachfall' && WX.w[k] > 0.6) WX.seen[k] = 1; }
  if (WX.seen[0] + WX.seen[1] + WX.seen[2] + WX.seen[3] >= 4) discover('x-weather');
  // particles: petals, rain, motes and fireflies, falling toward the real ground when the phone tilts
  wxParts();
  const gl = skin === 'glasshouse', w = gl ? [0, 0, 1, 0] : WX.w, gxv = MO.on ? MO.gx : 0, gyv = MO.on ? MO.gy : 1, gm = Math.min(1, Math.hypot(gxv, gyv)), hx = gm > 0.04 ? gxv / gm : 0, hy = gm > 0.04 ? gyv / gm : 1;
  const near = PTR.size > 0 || (t - WX.ptrT < 1.5 && !isTouch), damp = Math.pow(0.93, f60);
  for (const o of WX.parts) {
    if (near) { const dx = o.x - lastPX, dy = o.y - lastPY, d2 = dx * dx + dy * dy; if (d2 < 16000) { const f = (16000 - d2) / 16000, d = Math.sqrt(d2 + 1); o.vx += (dx / d) * f * 1.1 * f60; o.vy += (dy / d) * f * 0.6 * f60; } }
    for (const r of WX.rip) { const rd = Math.hypot(o.x - r.x, o.y - r.y) + 0.01; if (Math.abs(rd - r.r) < 30) { o.vx += ((o.x - r.x) / rd) * 1.6 * r.a * f60; o.vy += ((o.y - r.y) / rd) * 1.6 * r.a * f60; } }
    const fall = (w[0] * (0.6 + o.z) + w[1] * (7 + o.z * 6) - w[2] * (0.4 + o.z * 0.4) - w[3] * 0.05) * (gl ? 0.6 : 1);
    if (!reduceMotion) { o.s += 0.02 * f60; o.r += 0.03 * (1 - w[1]) * f60; const sw = Math.cos(o.s) * 0.05 * (w[0] + w[3] + (gl ? 0.6 : 0)) - w[1] * 0.08; o.vx += -hy * sw * f60; o.vy += hx * sw * f60; }
    o.vx *= damp; o.vy *= damp;
    o.x += (o.vx + hx * fall * gm) * f60; o.y += (o.vy + hy * fall * gm) * f60;
    if (o.x < -14 || o.x > W + 14 || o.y < TOPH - 16 || o.y > LB + 16) {
      const up = fall >= 0 ? 1 : -1;
      if (Math.abs(hy) >= Math.abs(hx)) { o.y = hy * up > 0 ? TOPH - 12 : LB + 12; o.x = Math.random() * W; }
      else { o.x = hx * up > 0 ? -12 : W + 12; o.y = TOPH + Math.random() * Math.max(10, LB - TOPH); }
      o.vx = o.vy = 0;
    }
  }
  for (let i = WX.rip.length - 1; i >= 0; i--) { const r = WX.rip[i]; r.r += 8 * f60; r.a *= Math.pow(0.965, f60); if (r.a < 0.03) WX.rip.splice(i, 1); }
  // the eye keeps Peachfall's clock: open 2.6 s, closed 0.16 s
  const E = WX.eye; E.cyc += dt; if (E.forced > 0) E.forced -= dt;
  const ot = E.forced > 0 ? 0 : E.cyc % 2.76 < 2.6 ? 1 : 0; E.open += (ot - E.open) * (1 - Math.pow(0.55, f60));
  E.a += ((skin === 'peachfall' ? WX.w[2] : 0) - E.a) * kk;
  for (const s of WX.spores) s.g *= Math.exp(-dt * 2);
}
function wxHover(px, py) { WX.ptrT = t; if (skin !== 'glasshouse') return; for (const s of WX.spores) if (s.x != null && Math.hypot(px - s.x, py - s.y) < 90) s.g = Math.max(s.g, 1 - Math.hypot(px - s.x, py - s.y) / 90); }
// taps on the eye or a spore are caught before anything else in the sky
function wxHit(px, py) {
  if (skin === 'peachfall' && WX.eye.a > 0.35) {
    const E = WX.eye;
    if (Math.abs(px - E.x) < E.r * 1.4 && Math.abs(py - E.y) < E.r * 0.95) {
      E.forced = 0.32; wxBurst(E.x, E.y, 0.8); audio.chime(fold(fRoot * 6, 2, 600), 0.03, 0); haptic(8);
      if (!found.has('x-wink')) caption('it winked back.', 1800);
      discover('x-wink'); return true;
    }
  }
  if (skin === 'glasshouse') for (const s of WX.spores) {
    if (s.x == null || Math.hypot(px - s.x, py - s.y) > (isTouch ? 30 : 24)) continue;
    wxBurst(s.x, s.y, 0.9); s.g = 1; haptic(8);
    if (!s.f) {
      s.f = true; const n = WX.spores.filter(o => o.f).length;
      audio.chime(fold(fRoot * [3, 4, 5][n - 1], 2, 520), 0.032, 0);
      caption(n < 3 ? `a spore. ${n} of 3.` : 'all three spores. the glasshouse is yours.', 2200);
      if (n === 3) discover('x-spores');
    } else audio.chime(fold(fRoot * 4, 2, 520), 0.02, 0);
    return true;
  }
  return false;
}

// ---------- drawing: the ridge world (glasshouse, peachfall) ----------
function drawWorldBg() {
  const P = wxPal(), sh = Math.max(80, LT - TOPH), gl = skin === 'glasshouse';
  const g = ctx.createLinearGradient(0, 0, 0, LT + 30); g.addColorStop(0, rgba(P.sky[0], 1)); g.addColorStop(1, rgba(P.sky[1], 1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const night = gl ? 0 : WX.w[3];
  if (night > 0.02) for (let i = 0; i < 90; i++) { const x = WXP[i] * W + MO.px * 10 * WXP[i + 200], y = TOPH + WXP[i + 100] * sh * 0.7; ctx.fillStyle = `rgba(201,230,255,${night * (0.3 + 0.5 * Math.abs(Math.sin(t + i)))})`; ctx.fillRect(x, y, 1.4, 1.4); }
  // the sun (a moon at night) follows the pointer and leans with the phone
  const sx = (0.3 + 0.4 * WX.mx + 0.12 * MO.px) * W, sy = TOPH + (0.14 + 0.08 * WX.my) * sh + MO.py * 12, R0 = Math.min(W, H);
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.55); sg.addColorStop(0, rgba(P.sun, gl ? 0.5 : 0.55)); sg.addColorStop(0.22, rgba(P.sun, 0.15)); sg.addColorStop(1, rgba(P.sun, 0));
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  if (!gl) { ctx.fillStyle = rgba(P.sun, 0.85); ctx.beginPath(); ctx.arc(sx, sy, R0 * 0.035, 0, TAU); ctx.fill(); }
  // light shafts, Glasshouse style
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const ang = -0.35 + (WX.mx - 0.5) * 0.3 + MO.px * 0.25 + i * 0.06 + Math.sin(t * 0.3 + i) * 0.02, w = 40 + wxNoise(i * 7 + t * 0.2) * 120;
    ctx.save(); ctx.translate(sx, sy - 40); ctx.rotate(ang);
    const lg = ctx.createLinearGradient(0, 0, 0, H * 1.4); lg.addColorStop(0, rgba(gl ? [160, 255, 215] : P.sun, (gl ? 0.07 : 0.05) + 0.03 * Math.sin(t + i))); lg.addColorStop(1, rgba(P.sun, 0));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-w * 0.2, 0); ctx.lineTo(w * 0.2, 0); ctx.lineTo(w * 2.4, H * 1.4); ctx.lineTo(-w * 2.4, H * 1.4); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // three ridges, the haze between them, and what lives on them
  const step = phone ? 6 : 8, bottom = LB + SH + 40;
  for (let L = 0; L < 3; L++) {
    ctx.beginPath(); ctx.moveTo(0, bottom); for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, wxRidgeY(L, x)); ctx.lineTo(W, bottom); ctx.closePath();
    const top = wxRidgeY(L, W / 2) - 80, rg = ctx.createLinearGradient(0, top, 0, bottom);
    rg.addColorStop(0, rgba(P.ridge[L].map(v => v + 26), 1)); rg.addColorStop(0.3, rgba(P.ridge[L], 1)); rg.addColorStop(1, gl ? 'rgb(7,17,15)' : 'rgb(17,23,34)');
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = rgba(P.rim, 0.3 - L * 0.07); ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = 0; x <= W + step; x += step) { const y = wxRidgeY(L, x); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    const hy = wxRidgeY(L, W / 2), hz = ctx.createLinearGradient(0, hy - 40, 0, hy + 160);
    hz.addColorStop(0, rgba(gl ? [140, 230, 195] : P.rim, 0)); hz.addColorStop(0.5, rgba(gl ? [140, 230, 195] : P.rim, gl ? 0.08 : 0.05)); hz.addColorStop(1, rgba(P.rim, 0));
    ctx.fillStyle = hz; ctx.fillRect(0, hy - 40, W, 200);
    if (gl) WX.spores.forEach((s, i) => { if (s.L === L) drawSpore(s, i); });
    if (L === 2 && !gl) drawEye();
  }
  drawWxParts(P, gl);
}
function drawSpore(s, i) {
  const q = wxSporePos(s); s.x = q.x; s.y = q.y;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i), r = 6 + s.g * 14 + pulse * 2, hal = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 5);
  hal.addColorStop(0, `rgba(${s.f ? '201,230,255' : '94,242,184'},${0.3 + s.g * 0.4})`); hal.addColorStop(1, 'rgba(94,242,184,0)');
  ctx.fillStyle = hal; ctx.beginPath(); ctx.arc(q.x, q.y, r * 5, 0, TAU); ctx.fill();
  ctx.fillStyle = s.f ? '#c9e6ff' : '#5ef2b8'; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.6, 0, TAU); ctx.fill();
  if (s.g > 0.05) { ctx.strokeStyle = `rgba(201,230,255,${s.g * 0.7})`; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + t; ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r); ctx.lineTo(q.x + Math.cos(a) * r * (1.6 + s.g), q.y + Math.sin(a) * r * (1.6 + s.g)); ctx.stroke(); } }
}
function drawEye() {
  const E = WX.eye; if (E.a < 0.02) { E.x = -999; return; }
  const p = wxEyePos(); E.x = p.x; E.y = p.y; E.r = p.r;
  const ptr = t - WX.ptrT < 3, lx = clamp(ptr ? (lastPX - p.x) / W * 2 : MO.px, -1, 1) * p.r * 0.35, ly = clamp(ptr ? (lastPY - p.y) / H * 2 : MO.py, -1, 1) * p.r * 0.25, o = Math.max(0.04, E.open);
  ctx.save(); ctx.globalAlpha = E.a;
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3); halo.addColorStop(0, 'rgba(94,242,184,0.28)'); halo.addColorStop(1, 'rgba(94,242,184,0)'); ctx.fillStyle = halo; ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
  ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.25, p.r * 0.75 * o, 0, 0, TAU); ctx.fillStyle = 'rgba(233,245,239,0.92)'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.arc(p.x + lx, p.y + ly, p.r * 0.48, 0, TAU); ctx.fillStyle = '#5ef2b8'; ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + lx, p.y + ly, p.r * 0.22, 0, TAU); ctx.fillStyle = '#07110f'; ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + lx - p.r * 0.12, p.y + ly - p.r * 0.12, p.r * 0.07, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(94,242,184,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.25, p.r * 0.75 * o, 0, 0, TAU); ctx.stroke();
  for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.32, ry = p.r * 0.75 * o; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * p.r * 1.1, p.y - ry * 0.98); ctx.lineTo(p.x + Math.cos(a) * p.r * 1.35, p.y - ry - p.r * 0.28); ctx.stroke(); }
  ctx.restore();
}
function drawWxParts(P, gl) {
  const w = gl ? [0, 0, 1, 0] : WX.w, gxv = MO.on ? MO.gx : 0, gyv = MO.on ? MO.gy : 1, gm = Math.hypot(gxv, gyv), hx = gm > 0.04 ? gxv / gm : 0, hy = gm > 0.04 ? gyv / gm : 1;
  for (const o of WX.parts) {
    const z = 0.5 + o.z;
    if (w[0] > 0.02) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.r); ctx.globalAlpha = w[0] * (0.45 + o.z * 0.5); ctx.fillStyle = o.z > 0.7 ? '#ffd2b5' : '#ffb48a'; ctx.beginPath(); ctx.ellipse(0, 0, 4 * z, 2.2 * z, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (w[1] > 0.02) { const L = 10 + o.z * 14; ctx.strokeStyle = `rgba(255,${(100 + o.z * 40) | 0},${(100 + o.z * 30) | 0},${w[1] * (0.25 + o.z * 0.5)})`; ctx.lineWidth = 0.8 + o.z; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - hx * L - o.vx, o.y - hy * L - o.vy); ctx.stroke(); }
    if (w[2] > 0.02) { ctx.fillStyle = gl && o.z > 0.8 ? `rgba(201,230,255,${w[2] * (0.3 + o.z * 0.5)})` : `rgba(160,255,215,${w[2] * (0.25 + o.z * 0.5)})`; ctx.beginPath(); ctx.arc(o.x, o.y, 0.7 + o.z * 1.8, 0, TAU); ctx.fill(); }
    if (w[3] > 0.02 && o.z > 0.6) { const fl = 0.5 + 0.5 * Math.sin(t * 3 + o.s * 4); ctx.fillStyle = `rgba(255,226,170,${w[3] * fl * 0.9})`; ctx.beginPath(); ctx.arc(o.x, o.y, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(255,226,170,${w[3] * fl * 0.15})`; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1; ctx.lineWidth = 1.5;
  for (const r of WX.rip) { ctx.strokeStyle = rgba(P.rim, r.a * 0.6); ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
}

// ---------- obsidian that cracks (the reel's fracture network, seeded so it is the same crack every time) ----------
function wxRng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function wxBuildCracks() {
  const r = wxRng(9157), segs = [], roots = [];
  function grow(x, y, a, n, depth, tt) {
    for (let k = 0; k < n; k++) {
      const st = 0.013 + 0.014 * r(); a += (r() - 0.5) * 0.5;
      const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st;
      segs.push([x, y, nx, ny, tt, depth]); tt += st; x = nx; y = ny;
      if (x * x + y * y > 2.6) return;
      if (depth < 4 && r() < 0.055 + depth * 0.012) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.7), Math.floor((n - k) * (0.35 + r() * 0.4)), depth + 1, tt);
    }
  }
  for (const [x, y, t0] of [[0.04, -0.06, 0], [-0.36, 0.16, 0.38], [0.4, 0.24, 0.62]]) { roots.push({ x, y, t: t0 }); const rays = 4 + Math.floor(r() * 3); for (let i = 0; i < rays; i++) grow(x, y, (i / rays) * TAU + r() * 0.6, 70 + Math.floor(r() * 50), 0, t0); }
  WX.crack.segs = segs; WX.crack.roots = roots;
}
function drawCracks() {
  const C = WX.crack; if (!C.segs || C.grow <= 0.003) return;
  const S2 = Math.max(W, LT) * 0.55, cx = MX + MO.px * 8, cy = MY + MO.py * 6, key = `${C.grow.toFixed(2)}|${W}|${H}|${Math.round(cx)}|${Math.round(cy)}`;
  if (key !== C.key) {
    C.key = key; C.all = new Path2D(); C.paths = [0, 1, 2, 3, 4].map(() => new Path2D()); C.tips = [];
    for (const s of C.segs) {
      if (s[4] > C.grow) continue;
      const x0 = cx + s[0] * S2, y0 = cy + s[1] * S2, x1 = cx + s[2] * S2, y1 = cy + s[3] * S2;
      C.all.moveTo(x0, y0); C.all.lineTo(x1, y1); C.paths[s[5]].moveTo(x0, y0); C.paths[s[5]].lineTo(x1, y1);
      if (C.grow - s[4] < 0.03) C.tips.push([x1, y1]);
    }
  }
  const vis = clamp(C.grow * 2, 0, 1), hot = C.heat, pulse = 0.75 + 0.45 * beatPulse;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, LT - 4); ctx.clip(); ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(0,0,0,${0.55 * vis})`; ctx.lineWidth = 2.4; ctx.stroke(C.all);
  ctx.strokeStyle = `rgba(255,236,210,${0.06 * vis})`; ctx.lineWidth = 0.8; ctx.stroke(C.all);
  if (hot > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of C.roots) { const k = clamp((C.grow - r.t) / 0.4, 0, 1); if (k <= 0) continue; const x = cx + r.x * S2, y = cy + r.y * S2, gg = ctx.createRadialGradient(x, y, 0, x, y, S2 * 0.6); gg.addColorStop(0, `rgba(255,120,40,${0.12 * k * hot * pulse})`); gg.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, LT); }
    ctx.strokeStyle = `rgba(255,110,25,${0.12 * hot * pulse})`; ctx.lineWidth = 9; ctx.stroke(C.all);
    ctx.strokeStyle = `rgba(255,165,60,${0.32 * hot * pulse})`; ctx.lineWidth = 3.2; ctx.stroke(C.all);
    const WD = [1.7, 1.2, 0.9, 0.7, 0.55];
    for (let d = 0; d < 5; d++) { ctx.strokeStyle = `rgba(255,228,172,${0.85 * hot})`; ctx.lineWidth = WD[d]; ctx.stroke(C.paths[d]); }
    if (WX.heat > 0.15) { ctx.fillStyle = `rgba(255,250,235,${0.9 * hot})`; for (const p of C.tips) { ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, TAU); ctx.fill(); } }
  }
  ctx.restore();
}

// ---------- the 31-EDO floor: a generalized keyboard of hexagons, each key coloured by its pitch class ----------
function drawFloor31() {
  const top = TOPH + (LT - TOPH) * 0.6, bot = LT - 2; if (bot - top < 30) return;
  const hz = top, f = Math.max(W, H) * 0.6, camH = 1.15, camZ = WX.floor.z, cx = W / 2 + MO.px * 24, F = WX.floor;
  ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, bot - hz); ctx.clip();
  const hg = ctx.createLinearGradient(0, hz - 20, 0, hz + 40); hg.addColorStop(0, 'rgba(96,78,170,0)'); hg.addColorStop(0.4, 'rgba(96,78,170,0.22)'); hg.addColorStop(1, 'rgba(96,78,170,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, hz - 20, W, 60);
  const R = 0.5, rowH = 1.5 * R, colW = Math.sqrt(3) * R, zN = 0.8, zF = phone ? 11 : 16, r0 = Math.floor((camZ + zN) / rowH), r1 = Math.ceil((camZ + zF) / rowH), glows = [];
  const VX = [], VZ = []; for (let k = 0; k < 6; k++) { const a = ((30 + 60 * k) * Math.PI) / 180; VX.push(Math.cos(a) * R * 0.88); VZ.push(Math.sin(a) * R * 0.88); }
  const pulse = 1 + 0.6 * beatPulse;
  for (let r = r1; r >= r0; r--) {
    const Zc = r * rowH - camZ; if (Zc < zN) continue;
    const sy = hz + (f * camH) / Zc; if (sy > bot + 80) continue;
    const fade = Math.pow(clamp(1 - Zc / zF, 0, 1), 1.25), halfX = (Zc * (W / 2)) / f + colW * 2, qo = r / 2, q0 = Math.floor(-halfX / colW - qo), q1 = Math.ceil(halfX / colW - qo);
    for (let q = q0; q <= q1; q++) {
      const Xc = colW * (q + qo), pitch = (((5 * q + 3 * r) % 31) + 31) % 31, hue = (210 + (pitch / 31) * 190) % 360;
      const d = Math.hypot(Xc, Zc - 5), wave = Math.pow(0.5 + 0.5 * Math.sin(d * 0.72 - t * 2.6), 2), hit = F.hit[pitch] * pulse;
      const Lg = Math.min(66, (3 + 18 * wave + 52 * hit) * fade + 2);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const Z = Zc + VZ[k], X = Xc + VX[k], x = cx + (f * X) / Z, y = hz + (f * camH) / Z; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fillStyle = `hsl(${hue.toFixed(1)},${(38 + 30 * wave + 30 * Math.min(1, hit)).toFixed(1)}%,${Lg.toFixed(1)}%)`; ctx.fill();
      if (Zc < 7) { ctx.strokeStyle = `hsla(${hue.toFixed(1)},90%,${Math.min(92, Lg + 26).toFixed(1)}%,${(0.5 * fade).toFixed(3)})`; ctx.lineWidth = Math.max(1, (f * 0.01) / Zc); ctx.stroke(); }
      if (F.hit[pitch] > 0.3 && Zc < 14) glows.push([cx + (f * Xc) / Zc, sy, (f * R) / Zc, hue, F.hit[pitch] * fade]);
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, s, h, a] of glows) { const gg = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2); gg.addColorStop(0, `hsla(${h},100%,70%,${0.45 * a})`); gg.addColorStop(1, `hsla(${h},100%,60%,0)`); ctx.fillStyle = gg; ctx.fillRect(x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4); }
  ctx.restore();
}
function drawWorldMid() { if (skin === 'obsidian' || skin === 'dawn') { drawCracks(); if (M.key === 'tet31') drawFloor31(); } }
