// ===== drawing, part two: the terrain, the scale strip, round pegs, Saelion, the rail, the frame =====
const sx = s => PX0 + (s / (NS - 1)) * PW + VIEW.rubber;
function valleyLabels(A0) {
  valleyHits.length = 0;
  const hN = s => hgt(A0.disp[s], A0), win = Math.max(6, Math.round(NS * 0.025)), cands = [];
  for (let s = 2; s < NS - 2; s++) {
    const h0 = hN(s);
    if (!(h0 < hN(s - 1) && h0 <= hN(s + 1))) continue;
    let ml = h0, mr = h0;
    for (let k = 1; k <= win; k++) { if (s - k >= 0) ml = Math.max(ml, hN(s - k)); if (s + k < NS) mr = Math.max(mr, hN(s + k)); }
    const prom = Math.min(ml, mr) - h0;
    if (prom < 0.03) continue;
    const vl = valleyLab(relCents(FS[s]));
    if (!vl) continue;
    cands.push({ prom, vl, X: sx(s), Y: LB - h0 * (LB - LT) * 0.92 });
  }
  cands.sort((a, b) => b.prom - a.prom);
  const placed = [], gap = phone ? 30 : 36;
  ctx.textAlign = 'center';
  for (const c of cands) {
    if (placed.some(p => Math.abs(p - c.X) < gap)) continue;
    placed.push(c.X);
    valleyHits.push({ X: c.X, Y: c.Y, lab: c.vl.lab, cents: c.vl.cents });
    const e = CAT.find(x => x.mode === M.key && x.kind === 'iv' && x.key === c.vl.lab), unseen = e && !found.has(e.id), al = clamp(c.prom * 6, 0.35, 0.9);
    ctx.fillStyle = unseen ? `rgba(246,195,95,${al})` : `rgba(246,232,206,${al})`; ctx.font = fnt(phone ? 12 : 13, 's', 'italic');
    ctx.fillText(c.vl.lab + (unseen ? ' ?' : ''), c.X, c.Y - 12);
    if (!phone) { ctx.fillStyle = `rgba(234,220,198,${al * 0.55})`; ctx.font = fnt(9, 'm'); ctx.fillText(`${Math.round(c.vl.cents)}¢`, c.X, c.Y - 25); }
  }
}
function drawPegs() {
  if (!round) return;
  const show = round.revealed || round.done, near = round.xs.map((x, i) => [x, i]).filter(([, i]) => !round.covered[i]);
  ctx.save();
  round.xs.forEach((x, i) => {
    if (x < VIEW.x0 || x > VIEW.x1) return;
    const X = xToS(x), cov = round.covered[i], yT = LT - 14, yD = LT + (LB - LT) * 0.18;
    if (!show) return;
    const pulse = cov ? 1 : 0.55 + 0.45 * Math.sin(t * 5 + i), hint = !cov && t > round.hintAt && near.length && near[0][1] === i;
    ctx.setLineDash([3, 5]); ctx.strokeStyle = cov ? 'rgba(126,224,195,0.7)' : `rgba(246,195,95,${0.35 + 0.3 * pulse})`; ctx.lineWidth = hint ? 2 : 1.2;
    ctx.beginPath(); ctx.moveTo(X, yT); ctx.lineTo(X, LB); ctx.stroke(); ctx.setLineDash([]);
    const r = (cov ? 8 : 7 + (hint ? 3 * pulse : 0)) * S;
    ctx.beginPath(); ctx.moveTo(X, yD - r); ctx.lineTo(X + r, yD); ctx.lineTo(X, yD + r); ctx.lineTo(X - r, yD); ctx.closePath();
    ctx.fillStyle = cov ? 'rgba(126,224,195,0.85)' : 'rgba(246,195,95,0.12)'; ctx.fill();
    ctx.strokeStyle = cov ? 'rgba(160,240,215,1)' : `rgba(246,195,95,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 1.6; ctx.stroke();
  });
  ctx.restore();
}
function drawConstellation() {
  if (!round) return;
  const n = round.xs.length, pts = round.xs.map((x, i) => { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5; return [MX + Math.cos(a) * MR * 1.62, MY + Math.sin(a) * MR * 1.62]; });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = round.done ? 'rgba(160,240,215,0.6)' : 'rgba(246,195,95,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  pts.forEach((p, i) => {
    const cov = round.covered[i] || round.done, r = (cov ? 6 : 3.5) * S, g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 4);
    g.addColorStop(0, cov ? 'rgba(200,255,235,0.95)' : 'rgba(246,215,160,0.6)'); g.addColorStop(1, 'rgba(200,255,235,0)'); ctx.fillStyle = g; ctx.fillRect(p[0] - r * 4, p[1] - r * 4, r * 8, r * 8);
  });
  ctx.restore();
}
function drawScale() {
  const y0 = LB, y1 = LB + SH, w = VIEW.x1 - VIEW.x0, ppc = PW / w, pxSemi = ppc * 100, acc = ACC[M.key] || ACC.just;
  let dropping = false, scaleHeld = false;
  for (const v of voices) if (v.dropping) dropping = true;
  for (const p of PTR.values()) if (p.role === 'scale' || (pinch && pinch.kind === 'scale')) scaleHeld = true;
  ctx.save();
  ctx.fillStyle = dropping ? 'rgba(255,90,90,0.16)' : scaleHeld ? 'rgba(246,195,95,0.08)' : 'rgba(234,220,198,0.035)';
  roundRect(ctx, PX0 - 6, y0 + 1, PW + 12, SH - 2, 8); ctx.fill();
  ctx.strokeStyle = dropping ? 'rgba(255,120,120,0.6)' : 'rgba(234,220,198,0.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.rect(PX0 - 6, y0, PW + 12, SH); ctx.clip();
  if (dropping) { ctx.fillStyle = 'rgba(255,170,170,0.95)'; ctx.font = fnt(13, 's', 'italic'); ctx.textAlign = 'center'; ctx.fillText('release to drop this voice', PX0 + PW / 2, y0 + SH * 0.62); ctx.restore(); return; }
  ctx.font = fnt(phone ? 10.5 : 10, 'm'); ctx.textAlign = 'center';
  for (let k = Math.ceil(VIEW.x0 / 100); k <= Math.floor(VIEW.x1 / 100); k++) {
    const X = xToS(k * 100), nm = GN[((k % 12) + 12) % 12], natural = nm.length === 1, oct = 3 + Math.floor((k + 7) / 12);
    ctx.strokeStyle = `rgba(234,220,198,${natural ? 0.28 : 0.14})`; ctx.beginPath(); ctx.moveTo(X, y0 + 2); ctx.lineTo(X, y0 + (natural ? 9 : 6)); ctx.stroke();
    if (pxSemi >= 30 || (pxSemi >= 15 ? natural : nm === 'C' || nm === 'G')) { ctx.fillStyle = `rgba(234,220,198,${natural ? 0.55 : 0.32})`; ctx.fillText(nm + (natural ? oct : ''), X, y0 + 21); }
  }
  if (ppc > 2) { const st = ppc > 6 ? 5 : 10; ctx.strokeStyle = 'rgba(234,220,198,0.2)'; ctx.beginPath(); for (let c = Math.ceil(VIEW.x0 / st) * st; c <= VIEW.x1; c += st) { if (c % 100 === 0) continue; const X = xToS(c); ctx.moveTo(X, y0 + 2); ctx.lineTo(X, y0 + (c % 50 === 0 ? 7 : 4)); } ctx.stroke(); }
  const degs = M.key === 'just' || M.easy ? [1, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 7 / 5, 3 / 2, 5 / 3, 7 / 4, 15 / 8] : M.key === 'bp' ? [1, 9 / 7, 7 / 5, 5 / 3, 9 / 5, 7 / 3] : Array.from({ length: M.n }, (_, k) => Math.pow(2, k / M.n));
  ctx.fillStyle = rgba(acc, 0.7);
  for (let m = -4; m <= 6; m++) for (const r of degs) { const x = xOf(fRoot * r * Math.pow(M.eq, m)); if (x < VIEW.x0 || x > VIEW.x1) continue; const X = xToS(x); ctx.beginPath(); ctx.arc(X, y1 - 9, r === 1 ? 3 : 1.8, 0, TAU); ctx.fill(); }
  for (const v of voices) { if (v.w < 0.05 || v.x < VIEW.x0 || v.x > VIEW.x1) continue; const X = xToS(v.x); ctx.fillStyle = rgba(v.col, 0.95 * v.w); ctx.beginPath(); ctx.moveTo(X, y0 + 1); ctx.lineTo(X - 5, y0 + 9); ctx.lineTo(X + 5, y0 + 9); ctx.closePath(); ctx.fill(); }
  if (scaleMark && scaleMark.life > 0 && scaleMark.x >= VIEW.x0 && scaleMark.x <= VIEW.x1) { const X = xToS(scaleMark.x), k = scaleMark.life; ctx.strokeStyle = `rgba(255,236,190,${0.8 * k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, y0 + SH / 2, (1 - k) * 26 + 4, 0, TAU); ctx.stroke(); ctx.fillStyle = `rgba(255,236,190,${k})`; ctx.font = fnt(11, 's', 'italic'); ctx.fillText(nearestLab(relCents(fOf(scaleMark.x))).lab, X, y0 - 6); }
  const z = zoomLevel();
  if (z > 1.01) {
    const ty = y1 - 3, f0 = VIEW.x0 / XMAX, f1 = VIEW.x1 / XMAX;
    ctx.fillStyle = 'rgba(234,220,198,0.14)'; ctx.fillRect(PX0, ty - 1, PW, 2);
    ctx.fillStyle = 'rgba(246,195,95,0.85)'; ctx.fillRect(PX0 + f0 * PW, ty - 2, Math.max(6, (f1 - f0) * PW), 3);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(246,215,160,0.8)'; ctx.font = fnt(10, 'm'); ctx.fillText(`${z.toFixed(1)}×`, PX0 + PW - 2, y0 + 12);
  } else if (phone && t < 30 && !scaleHeld) { ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(234,220,198,0.35)'; ctx.font = fnt(9.5, 'm'); ctx.fillText('tap · drag up · pinch', PX0 + PW - 2, y0 + 12); }
  ctx.restore();
}
function drawLandscape() {
  const A0 = act;
  const cy = (val, v) => LB - hgt(val, v) * (LB - LT) * 0.92;
  const curvePath = (arr, v) => { ctx.beginPath(); for (let s = 0; s < NS; s++) { const X = sx(s), Y = cy(arr[s], v); if (s) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } };
  ctx.save();
  ctx.strokeStyle = 'rgba(234,220,198,0.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PX0, LB + 0.5); ctx.lineTo(PX0 + PW, LB + 0.5); ctx.stroke();
  for (let k = Math.ceil(VIEW.x0 / 100); k <= Math.floor(VIEW.x1 / 100); k++) { const X = xToS(k * 100), natural = GN[((k % 12) + 12) % 12].length === 1; ctx.strokeStyle = `rgba(234,220,198,${natural ? 0.055 : 0.03})`; ctx.beginPath(); ctx.moveTo(X, LT - 6); ctx.lineTo(X, LB); ctx.stroke(); }
  ctx.setLineDash([3, 4]);
  for (let m = 1; m <= 27; m *= M.eq) { const f = fRoot * m; if (f < FLO || f > fOf(XMAX)) continue; const xx = xOf(f); if (xx < VIEW.x0 || xx > VIEW.x1) continue; const X = xToS(xx); ctx.strokeStyle = `rgba(255,226,170,${0.25 + 0.4 * rootFlash})`; ctx.beginPath(); ctx.moveTo(X, LT - 8); ctx.lineTo(X, LB); ctx.stroke(); }
  ctx.setLineDash([]);
  if (!A0) { curvePath(CR); ctx.strokeStyle = 'rgba(234,220,198,0.22)'; ctx.lineWidth = 1.2; ctx.stroke(); valleyHits.length = 0; }
  for (const v of voices) { if (v === A0 || v.w < 0.02) continue; curvePath(v.disp, v); ctx.strokeStyle = rgba(v.col, 0.24 * v.w); ctx.lineWidth = 1; ctx.stroke(); }
  if (A0) {
    curvePath(A0.disp, A0); ctx.lineTo(PX0 + PW + VIEW.rubber, LB); ctx.lineTo(PX0 + VIEW.rubber, LB); ctx.closePath();
    const fg = ctx.createLinearGradient(0, LT, 0, LB); fg.addColorStop(0, rgba(A0.col, 0.1 * A0.w)); fg.addColorStop(1, rgba(A0.col, 0.01)); ctx.fillStyle = fg; ctx.fill();
    if (aurora > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const off = (t * 0.35) % 1, ag = ctx.createLinearGradient(PX0, 0, PX0 + PW, 0); for (let k = 0; k < 4; k++) ag.addColorStop((k / 4 + off) % 1, rgba(COLORS[k], 0.24 * aurora)); ctx.fillStyle = ag; ctx.fill(); ctx.restore(); }
    curvePath(A0.disp, A0); ctx.strokeStyle = rgba(A0.col, 0.22 * A0.w); ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = rgba(A0.col, 0.95 * A0.w); ctx.lineWidth = 1.6; ctx.stroke();
    if (!round || round.revealed || round.done) valleyLabels(A0); else valleyHits.length = 0;
  }
  drawPegs();
  if (fires.length) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; for (const f of fires) { const k = f.life / 1.6; [LB - 4, LB + 4].forEach(y => { ctx.strokeStyle = `rgba(255,${(120 + 100 * k) | 0},40,${0.75 * k})`; ctx.lineWidth = (2 + 3 * k + Math.random() * 2) * S; ctx.beginPath(); ctx.moveTo(f.x0, y); ctx.lineTo(f.x1, y); ctx.stroke(); }); } ctx.restore(); }
  const mph = new Map(); for (const p of PTR.values()) if (p.role === 'voice') mph.set(p.v, p.mph);
  for (const v of voices) {
    if (v.w < 0.02) continue;
    const bp = ballPos(v);
    if (bp.off) { const dir = v.x < VIEW.x0 ? -1 : 1; ctx.fillStyle = rgba(v.col, 0.85 * v.w); ctx.beginPath(); ctx.moveTo(bp.X + dir * 9, bp.Y); ctx.lineTo(bp.X - dir * 5, bp.Y - 8); ctx.lineTo(bp.X - dir * 5, bp.Y + 8); ctx.closePath(); ctx.fill(); continue; }
    let X = bp.X, Y = bp.Y;
    if ((t < v.pinUntil || (hole.on && v.hz > 0.2)) && !reduceMotion) { X += (Math.random() - 0.5) * 2.4; Y += (Math.random() - 0.5) * 2.4; }
    if (MO.on && MO.lean && !v.dragging && !v.glide) { X += MO.lean * 4 * S; if (Math.abs(MO.lean) > 0.6 && !reduceMotion) Y += (Math.random() - 0.5) * 1.6 * Math.abs(MO.lean); }
    Y -= 12 * S * Math.sin(Math.PI * (1 - v.bounce)) * v.bounce;
    const al = v.w * (v.dropping ? 0.45 : 1), held = !!v.dragging, gr = BR * (4.2 + 2.2 * v.flash + (held ? 1.4 : 0)), br = BR * (1 + 0.18 * v.bounce + (held ? 0.2 : 0));
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(X, Y, 0, X, Y, gr); gl.addColorStop(0, rgba(v.col, Math.min(1, 0.45 + 0.35 * v.flash + (held ? 0.2 : 0)) * al)); gl.addColorStop(1, rgba(v.col, 0));
    ctx.fillStyle = gl; ctx.fillRect(X - gr, Y - gr, gr * 2, gr * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(mix(v.col, [255, 255, 255], 0.25), al); ctx.beginPath(); ctx.arc(X, Y, br, 0, TAU); ctx.fill();
    if (v.locked) { ctx.strokeStyle = rgba(v.col, 0.75 * al); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(X, Y, br + 4, 0, TAU); ctx.stroke(); }
    if (held) { ctx.strokeStyle = rgba(v.col, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y + br); ctx.lineTo(X, LB); ctx.stroke(); }
    const ad = Math.abs(v.dev);
    let dv = ad < 0.5 ? 'just' : `${v.dev > 0 ? '+' : '−'}${ad.toFixed(ad < 10 ? 1 : 0)}¢`;
    if (M.easy && v.jl) dv = `${v.ji > 0 ? '+' : '−'}${Math.abs(v.ji).toFixed(1)}¢ vs ${v.jl}`;
    else if (!(M.key === 'just' || M.key === 'bp') && ad < 0.5) dv = 'on grid';
    const hideLab = round && round.ear && !round.revealed && !round.done;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(v.col, 0.95 * al); ctx.font = fnt(phone ? 13 : 14, 's', 'italic'); ctx.fillText(hideLab ? '?' : t < v.pinUntil ? v.lab + ' …' : v.lab, X, Y - br - 20);
    ctx.fillStyle = `rgba(234,220,198,${0.6 * al})`; ctx.font = fnt(phone ? 9.5 : 10, 'm'); if (!hideLab) ctx.fillText(v.dropping ? 'drop' : dv, X, Y - br - 8);
    const m = mph.get(v); if (m > 12 && !v.dropping) { const hot = m >= 88; ctx.fillStyle = hot ? 'rgba(255,170,60,0.98)' : 'rgba(234,220,198,0.7)'; ctx.font = fnt(11, 'm', hot ? 'bold' : ''); ctx.fillText(`${Math.round(m)} mph`, X, Y - br - 34); }
  }
  ctx.restore();
  drawScale();
  if (!phone) { ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(234,220,198,0.36)'; ctx.font = fnt(10, 'm'); ctx.fillText(`sensory dissonance (Plomp–Levelt, Sethares) of this exact tone against the root and the other voices · valleys are where partials line up · ${M.title}`, PX0, LB + SH + 14); ctx.restore(); }
}

// ---------- light: a beam over every voice at rest, a low sun when the chord settles ----------
function drawLight() {
  if (!LIGHT() || !entered) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const span = (LB - LT) * 0.95;
  for (const v of voices) {
    if (v.w < 0.05) continue;
    const b = ballPos(v); if (b.off) continue;
    const k = v.w * (v.locked ? 1 : 0.3) * (0.82 + 0.18 * Math.sin(t * 1.3 + v.id)), top = Math.max(LT - 30, b.Y - span), wb = 22 * S, wt = 4 * S;
    const c = mix(v.col, [255, 236, 190], 0.5), g = ctx.createLinearGradient(0, b.Y, 0, top);
    g.addColorStop(0, rgba(c, 0.15 * k)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.X - wb, b.Y); ctx.lineTo(b.X - wt, top); ctx.lineTo(b.X + wt, top); ctx.lineTo(b.X + wb, b.Y); ctx.closePath(); ctx.fill();
  }
  if (chordNow) {
    const cx = PX0 + PW / 2, r = PW * 0.55, g = ctx.createRadialGradient(cx, LB, 0, cx, LB, r);
    g.addColorStop(0, `rgba(255,214,150,${0.07 + 0.1 * bloomFlash})`); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(PX0, LB - r, PW, r);
  }
  ctx.restore();
}

// ---------- saelion ----------
function drawPet(g) {
  if (!entered || !pet.placed) return;
  const sc = S * (phone ? 1 : 1.15);
  g.save(); g.translate(pet.x, pet.y);
  if (MO.on) g.rotate(-MO.px * 0.35);
  if (hole.on) { const dx = hole.x - pet.x, dy = hole.y - pet.y, d = Math.hypot(dx, dy), lim = 170 * S; if (d < lim) { const a = Math.atan2(dy, dx), k = (1 - d / lim) * 0.55; g.rotate(a); g.scale(1 + k, 1 - k * 0.45); g.rotate(-a); } }
  if (!UNL.pet || pet.hatch > 0) {
    g.rotate(UNL.pet ? Math.sin(t * 22) * 0.12 * (1 - pet.hatch / 1.8) : Math.sin(t * 2.2) * 0.06);
    const eg = g.createRadialGradient(-4 * sc, -6 * sc, 2, 0, 0, 20 * sc); eg.addColorStop(0, '#fff7ec'); eg.addColorStop(1, '#d9c3e6');
    g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, 13 * sc, 17 * sc, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(184,162,255,0.6)'; [[-5, -6, 2], [4, 2, 2.5], [-2, 8, 1.8], [6, -9, 1.5]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a * sc, b * sc, r * sc, 0, TAU); g.fill(); });
    if (UNL.pet) { g.strokeStyle = 'rgba(90,60,90,0.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10 * sc, -2 * sc); g.lineTo(-5 * sc, 2 * sc); g.lineTo(-1 * sc, -3 * sc); g.lineTo(4 * sc, 2 * sc); g.lineTo(9 * sc, -2 * sc); g.stroke(); }
    g.restore(); return;
  }
  const [wm, wg, wl, wd, wc] = pet.w.map(v => clamp(v, 0, 1)), acc = ACC[M.key] || ACC.just, base = mix([238, 210, 226], acc, 0.28), dark = mix(base, [60, 40, 70], 0.4), pose = pet.pose, sy = pose === 2 ? 6 * sc : 0;
  if (wd > 0.04) {
    const fl = Math.sin(t * (4 + rhy.bpm / 30)) * 0.35 * (reduceMotion ? 0.3 : 1), s2 = 0.5 + wd;
    [-1, 1].forEach(s => {
      g.save(); g.translate(0, -6 * sc + sy); g.rotate(s * (0.5 + fl)); g.globalAlpha = 0.7 * wd;
      const wgr = g.createLinearGradient(0, 0, s * 30 * sc, -20 * sc); wgr.addColorStop(0, rgba(mix(acc, [255, 255, 255], 0.4), 0.9)); wgr.addColorStop(1, 'rgba(184,162,255,0.5)');
      g.fillStyle = wgr; g.beginPath(); g.ellipse(s * 16 * sc * s2, -10 * sc, 15 * sc * s2, 10 * sc * s2, -s * 0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(s * 12 * sc * s2, 6 * sc, 9 * sc * s2, 7 * sc * s2, s * 0.4, 0, TAU); g.fill(); g.restore();
    });
  }
  if (wc > 0.04) {
    g.strokeStyle = rgba(dark, Math.min(1, wc * 1.6)); g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const ox = (i - 2.5) * 4.2 * sc, L = (10 + 22 * wc) * sc, curl = Math.sin(t * 2.4 + i) * 0.6 + (Rs > 0.55 ? 0.8 : 0); g.lineWidth = 3.2 * sc * (0.6 + 0.4 * wc); g.beginPath(); g.moveTo(ox, 12 * sc + sy); for (let k = 1; k <= 6; k++) { const f = k / 6; g.lineTo(ox + Math.sin(f * 3 + t * 2 + i) * 4 * sc * f + curl * f * f * 6 * sc * (i < 3 ? -1 : 1), 12 * sc + sy + f * L); } g.stroke(); }
  }
  if (wg > 0.06) { g.strokeStyle = rgba(dark, Math.min(1, wg * 1.7)); g.lineWidth = 3 * sc; g.lineCap = 'round'; const kk = Math.sin(t * 8) * 4 * pet.jump * sc, out = pose === 2 ? 8 * sc : 0; g.beginPath(); g.moveTo(-5 * sc, 12 * sc + sy); g.lineTo(-7 * sc - out, 24 * sc + sy - kk); g.moveTo(5 * sc, 12 * sc + sy); g.lineTo(7 * sc + out, 24 * sc + sy + kk); g.stroke(); }
  const bg = g.createRadialGradient(-5 * sc, -2 * sc + sy, 2, 0, 2 * sc + sy, 20 * sc); bg.addColorStop(0, rgba(mix(base, [255, 255, 255], 0.35), 1)); bg.addColorStop(1, rgba(base, 1));
  g.fillStyle = bg; g.beginPath(); g.ellipse(0, 2 * sc + sy, 13 * sc, 15 * sc, 0, 0, TAU); g.fill();
  g.setLineDash([2, 2.5]); g.strokeStyle = rgba(dark, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(0, -11 * sc + sy); g.lineTo(0, 15 * sc + sy); g.stroke(); g.setLineDash([]);
  { const hx = 6 * sc, hy = 4 * sc + sy, hs = 2.4 * sc; g.fillStyle = rgba(mix(acc, [255, 120, 150], 0.5), 0.8); g.beginPath(); g.moveTo(hx, hy + hs); g.bezierCurveTo(hx - hs * 2, hy - hs * 0.5, hx - hs * 0.6, hy - hs * 2, hx, hy - hs * 0.6); g.bezierCurveTo(hx + hs * 0.6, hy - hs * 2, hx + hs * 2, hy - hs * 0.5, hx, hy + hs); g.fill(); }
  if (wg > 0.06) { const up = pose === 1 || pet.jump > 0.3; g.strokeStyle = rgba(dark, Math.min(1, wg * 1.7)); g.lineWidth = 2.8 * sc; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 11 * sc, -2 * sc + sy); if (pose === 3) g.lineTo(s * 9 * sc, -20 * sc + sy); else g.lineTo(s * (up ? 20 : 18) * sc, (up ? -12 : 6) * sc + sy - pet.jump * 6 * sc); g.stroke(); }); }
  g.save(); g.translate(0, -22 * sc + sy); g.rotate(pose === 3 ? 0.18 : Math.sin(t * 0.7) * 0.06);
  if (wl > 0.04) [-1, 1].forEach(s => { g.save(); g.translate(s * 6 * sc, -10 * sc); g.rotate(s * (0.18 + Math.sin(t * 1.1 + s) * 0.06) + (Rs > 0.55 ? s * 0.5 : 0)); const L = (6 + 18 * wl) * sc; g.globalAlpha = Math.min(1, wl * 1.8); g.fillStyle = rgba(base, 1); g.beginPath(); g.ellipse(0, -L / 2, 4.2 * sc, L / 2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,170,190,0.75)'; g.beginPath(); g.ellipse(0, -L / 2, 2 * sc, Math.max(1, L / 2 - 2 * sc), 0, 0, TAU); g.fill(); g.restore(); });
  if (wm > 0.04) [-1, 1].forEach(s => { const L = (5 + 12 * wm) * sc, al = Math.min(1, wm * 1.8); g.strokeStyle = rgba([120, 90, 70], al); g.lineWidth = 1.6 * sc; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 3 * sc, -12 * sc); g.lineTo(s * (5 * sc + L * 0.4), -12 * sc - L); g.moveTo(s * (4 * sc + L * 0.2), -12 * sc - L * 0.5); g.lineTo(s * (9 * sc + L * 0.5), -12 * sc - L * 0.8); g.stroke(); g.fillStyle = rgba([140, 210, 120], al); [[5 * sc + L * 0.4, -12 * sc - L], [9 * sc + L * 0.5, -12 * sc - L * 0.8]].forEach(([lx, ly]) => { g.beginPath(); g.ellipse(s * lx, ly, 2.4 * sc, 1.4 * sc, s * 0.6, 0, TAU); g.fill(); }); });
  const hg = g.createRadialGradient(-4 * sc, -4 * sc, 2, 0, 0, 16 * sc); hg.addColorStop(0, rgba(mix(base, [255, 255, 255], 0.4), 1)); hg.addColorStop(1, rgba(base, 1));
  g.fillStyle = hg; g.beginPath(); g.arc(0, 0, 13 * sc, 0, TAU); g.fill();
  const sleepy = t - lastUserT > 90 && !rhyActive(), shut = pet.blink > 0 || sleepy;
  [[-4.8, [246, 195, 95]], [4.8, [110, 200, 255]]].forEach(([ex, col]) => {
    const X = ex * sc, Y = -1 * sc;
    if (shut) { g.strokeStyle = rgba(dark, 0.9); g.lineWidth = 1.3; g.beginPath(); g.arc(X, Y, 2.6 * sc, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); return; }
    g.save(); g.translate(X, Y); g.scale(1, Rs > 0.6 ? 0.55 : 1);
    g.fillStyle = '#fffaf4'; g.beginPath(); g.arc(0, 0, 3.6 * sc, 0, TAU); g.fill();
    g.fillStyle = rgba(col, 1); g.beginPath(); g.arc(0.3 * sc, 0.4 * sc, 2.6 * sc, 0, TAU); g.fill();
    g.fillStyle = '#1b1220'; g.beginPath(); g.arc(0.4 * sc, 0.6 * sc, 1.3 * sc, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-0.8 * sc, -0.9 * sc, 0.9 * sc, 0, TAU); g.fill(); g.restore();
  });
  g.fillStyle = 'rgba(255,140,170,0.35)'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * 8.6 * sc, 3.6 * sc, 2.4 * sc, 1.4 * sc, 0, 0, TAU); g.fill(); });
  g.strokeStyle = rgba(dark, 0.9); g.fillStyle = rgba(dark, 0.85); g.lineWidth = 1.2; g.beginPath();
  if ((bird.alpha > 0.5 && t - bird.lastNote < 0.6) || pet.cheer > 0.3) { g.ellipse(0, 5.4 * sc, 1.6 * sc, 2 * sc, 0, 0, TAU); g.fill(); }
  else if (Rs > 0.6) { g.moveTo(-3 * sc, 5.5 * sc); for (let k = 1; k <= 6; k++) g.lineTo(-3 * sc + k * sc, 5.5 * sc + (k % 2 ? -0.8 : 0.8) * sc); g.stroke(); }
  else { g.arc(0, 3.6 * sc, 2.6 * sc, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
  g.restore();
  if (sleepy) { g.fillStyle = 'rgba(234,220,198,0.7)'; g.font = fnt(12 * sc, 's', 'italic'); g.fillText('z', 14 * sc, -36 * sc + Math.sin(t * 1.5) * 3); g.fillText('z', 19 * sc, -44 * sc + Math.sin(t * 1.5 + 1) * 3); }
  g.restore();
}
function drawBubble(g) {
  if (!pet.say || t > pet.sayUntil || !UNL.pet || pet.hatch > 0) return;
  g.save(); g.font = fnt(12.5, 'u');
  const w = Math.min(250, W - 24), lines = wrapText(g, pet.say, w - 18).slice(0, 7), h = 14 + lines.length * 16, x = clamp(pet.x - w / 2, 12, W - w - 12);
  let y = pet.y - 58 * S - h; if (y < TOPH + 8) y = pet.y + 44 * S;
  g.globalAlpha = Math.min(1, (pet.sayUntil - t) / 0.4); g.fillStyle = 'rgba(28,20,32,0.94)'; g.strokeStyle = rgba(ACC[M.key] || ACC.just, 0.6); g.lineWidth = 1;
  roundRect(g, x, y, w, h, 9); g.fill(); g.stroke();
  g.fillStyle = 'rgba(240,228,210,0.95)'; g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, x + 9, y + 18 + i * 16));
  g.restore();
}
function drawRail(g) {
  if (!rail) return;
  const x0 = W * (wide ? 0.32 : 0.12), x1 = W * (wide ? 0.68 : 0.88), y = phone ? TOPH + 8 : 40, n = RAIL.length, st = RAIL[Math.max(0, rail.i)];
  g.save(); g.strokeStyle = 'rgba(246,215,160,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  for (let i = 0; i < n; i++) { g.fillStyle = i <= rail.i ? 'rgba(246,195,95,0.95)' : 'rgba(234,220,198,0.3)'; g.beginPath(); g.arc(x0 + ((x1 - x0) * i) / (n - 1), y, i === rail.i ? 4.5 : 3, 0, TAU); g.fill(); }
  const pos = clamp(rail.i + (rail.i < 0 ? 0 : clamp(1 - (rail.next - t) / st.d, 0, 1)), 0, n - 1), X = x0 + ((x1 - x0) * pos) / (n - 1);
  const gr = g.createRadialGradient(X, y, 0, X, y, 14); gr.addColorStop(0, 'rgba(255,236,190,0.9)'); gr.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = gr; g.fillRect(X - 14, y - 14, 28, 28);
  g.restore();
}

// ---------- the frame ----------
function draw() {
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const hmp = skin === 'hmp';
  drawBg(); if (wxWorld()) {} else if (skin === 'fieldstone') drawMotes(); else if (skin !== 'eink' && skin !== 'bw2') drawStars();
  drawWorldMid();
  if (latticeOn) { if (M.easy) drawEasyPanel(); else if (M.key === 'just') drawLattice(); else drawRing(); }
  const vw = viewOn();
  if (hmp) { drawHmpTitle(); drawFloor(); if (vw === 'mandala') drawKnot(); else drawView(); } else if (vw === 'mandala') { if (skin === 'fieldstone') drawRosette(); drawMandala(); drawPoly(); } else drawView();
  drawLat(); drawConstellation(); drawHole(); drawBird(); drawReadout(); drawLight(); drawLandscape(); drawListen();
  if (hmp && tab !== 'resonance' && !phone) drawAnalyzer();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of sparks) { ctx.fillStyle = rgba(s.c, 0.8 * (s.life / s.max)); ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, TAU); ctx.fill(); }
  ctx.restore();
  drawGlyphs(); drawSpag(); drawHarp(); drawFloaters();
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  drawTip();
  ctx3.clearRect(0, 0, W, H); if (skin === 'story') drawStory3();
  ctx2.clearRect(0, 0, W, H); drawPet(ctx2); drawBubble(ctx2); drawRail(ctx2); drawReelFx(ctx2);
  drawPad();
}
