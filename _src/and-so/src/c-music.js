// ===== music: voices on the terrain, harmony, easy listening, 1955, rhythm, dynamics, the bird =====
function allocV(v) { v.disp = new Float32Array(NS); v.C = new Float32Array(NS); v.dispInit = false; }
function addVoice(x, o) {
  o = o || {};
  const used = voices.filter(v => v.wT > 0).map(v => v.ci);
  if (used.length >= 4) return null;
  let ci = 0; while (used.includes(ci)) ci++;
  const v = { id: ++vid, ci, col: COLORS[ci], x: clamp(x, 0, XMAX), v: 0, w: 0, wT: 1, temp: o.temp === undefined ? 0.6 : o.temp, n: 0,
    pinUntil: o.pin ? t + o.pin : 0, locked: false, lockT: 0, dragging: false, dropping: false, dragY: 0, hist: [], histT: [],
    lastChimeX: -999, lastChimeT: -99, phi: Math.random() * TAU, beat: 0, c: 0, lab: '', dev: 0, ji: 0, jl: '', pair: null, fa: 1, fb: 1, kap: 0, flash: 0, bounce: 0,
    target: null, approach: 0, approachUntil: 0, hz: 0, relT: -99, flung: false, glide: null, echo: null, base: 0 };
  allocV(v); voices.push(v); audio.addVoice(v); act = v;
  return v;
}
function dropVoice(v) {
  if (!v || voices.filter(o => o.wT > 0).length <= 1) return false;
  v.wT = 0; v.locked = false; v.dragging = false; v.dropping = false;
  if (act === v) act = voices.find(o => o.wT > 0) || null;
  return true;
}
function Dv(v, x) {
  const f = fOf(x);
  let d = dTones(f, fRoot) + holeTerm(x);
  for (const o of voices) { if (o === v || o.w < 0.001) continue; const dx = (x - o.x) / PSW; d += (dTones(f, fOf(o.x)) + PSA * Math.exp(-dx * dx)) * o.w; }
  return d;
}
const targetMode = () => !!((M.easy || era || JAM.on) && !round);
function stepVoice(v, h) {
  if (v.wT === 0 || v.locked) return;
  if (v.dragging) { v.glide = null; v.echo = null; if (v.dragX != null) v.x += (v.dragX - v.x) * (1 - Math.exp(-h * 45)); return; }
  if (v.echo != null) { v.glide = null; v.x += (v.echo - v.x) * (1 - Math.exp(-h * 16)); v.v = 0; v.n = 0; v.temp = 0; return; }
  if (v.glide) {
    const g = v.glide, k = clamp((t - g.t0) / g.dur, 0, 1), e = k * k * (3 - 2 * k);
    v.x = g.x0 + (g.x1 - g.x0) * e; v.v = 0; v.n = 0;
    if (k >= 1) { v.glide = null; v.temp = 0; lockVoice(v, g.exact); }
    return;
  }
  if (targetMode() && v.target != null) {
    const tg = t < v.approachUntil ? v.approach : v.target, tz = effTease();
    let a = -95 * (v.x - tg) - (17 - 9 * tz) * v.v;
    if (hole.on) a -= (GPULL * 0.3 * (holeTerm(v.x + 0.5) - holeTerm(v.x - 0.5))) / D0;
    v.v += clamp(a, -12000, 12000) * h; v.x = clamp(v.x + v.v * h, 0, XMAX);
    return;
  }
  if (t < v.pinUntil) return;
  const L = LIGHT(), g = (Dv(v, v.x + 0.5) - Dv(v, v.x - 0.5)) / D0;
  v.n += (-v.n / 0.25) * h + Math.sqrt(2 / 0.25) * Math.sqrt(h) * gauss();
  let a = -GPULL * g * (L ? 1.5 : 1) - GAMMA * (L ? 2.4 : 1) * v.v + v.n * NOISE * Math.sqrt(v.temp) * (L ? 0.4 : 1);
  if (v.x < 60) a += 1500 * Math.pow(1 - v.x / 60, 2);
  if (v.x > XMAX - 60) a -= 1500 * Math.pow(1 - (XMAX - v.x) / 60, 2);
  a = clamp(a, -12000, 12000);
  v.v += a * h; v.x += v.v * h;
  if (v.x < 0) { v.x = 0; v.v = Math.abs(v.v) * 0.3; }
  if (v.x > XMAX) { v.x = XMAX; v.v = -Math.abs(v.v) * 0.3; }
}
function refineMin(v, x0, r) {
  let a = Math.max(0, x0 - r), b = Math.min(XMAX, x0 + r);
  const gr = 0.6180339887;
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = Dv(v, c), fd = Dv(v, d);
  for (let k = 0; k < 24; k++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = Dv(v, c); }
    else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = Dv(v, d); }
  }
  return (a + b) / 2;
}
function ballPos(v) {
  const X = xToS(v.x);
  if (v.dropping) return { X, Y: v.dragY };
  const fs = ((v.x - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * (NS - 1);
  if (fs < 0 || fs > NS - 1) return { X: clamp(X, PX0 + 8, PX0 + PW - 8), Y: LB - 40, off: true };
  const i = clamp(Math.floor(fs), 0, NS - 2), k = fs - i, val = v.disp[i] * (1 - k) + v.disp[i + 1] * k;
  return { X, Y: LB - hgt(val, v) * (LB - LT) * 0.92 - BR };
}
function landLabel(v) {
  if (M.key === 'just' || M.key === 'bp') { const r = simplestWithin(M.key === 'just' ? JI : BPJI, v.c, 2.5); return r ? (r.p === M.eq && r.q === 1 ? '1/1' : `${r.p}/${r.q}`) : ''; }
  const st = 1200 / M.n, k = Math.round(v.c / st);
  return Math.abs(v.c - k * st) < 3 ? String(((k % M.n) + M.n) % M.n) : '';
}
// exact: a reel set this voice down on a ratio or a step on purpose, so it stays there rather than settling into the
// nearest floor (in 10-TET, say, the floors sit a few cents off the steps once other voices are sounding)
function lockVoice(v, exact) {
  if (!exact) v.x = refineMin(v, v.x, 4);
  v.v = 0; v.n = 0; v.locked = true; v.lockT = t;
  v.c = relCents(fOf(v.x));
  const fresh = Math.abs(v.x - v.lastChimeX) > 3 || t - v.lastChimeT > 6;
  if (fresh) {
    v.lastChimeX = v.x; v.lastChimeT = t; v.bounce = 1;
    audio.chime(fOf(v.x) * M.chimeR, 0.024, 0);
    if (plucky()) audio.pluck(v, 1.35, 0.75, 0);
    const b = ballPos(v);
    for (let i = 0; i < (reduceMotion ? 6 : 14) * qScale; i++) sparks.push({ x: b.X, y: b.Y, vx: rand(-40, 40), vy: rand(-110, -25), life: rand(0.6, 1.3), max: 1.3, c: v.col });
    rings.push({ r: MR * 0.95, v: 140, life: 1.2, max: 1.2, c: v.col });
    haptic(8);
  }
  discover('x-first', v);
  const lab = landLabel(v);
  if (M.key === 'just' || M.key === 'bp') { if (lab) discoverIv(lab, v); }
  else if (lab) {
    const kk = +lab;
    if (M.key === 'gamelan') { discover('g-ombak', v); if (!REEL.on) gDeg.add(kk); if (gDeg.size >= 5) discover('g-all5', v); }   // the degrees you visit, not a reel's
    else if (M.key === 'tet10') { discover('t-first', v); if (kk === 5) discover('t-5', v); }
    else if (M.key === 'tet31') { discover('w-first', v); if (kk === 10) discover('w-10', v); if (kk === 25) discover('w-25', v); }
  }
  onLand(v, fresh, lab);
}
function lockExact(v, x) { v.x = x; v.v = 0; v.n = 0; v.locked = true; v.lockT = t; if (Math.abs(v.x - v.lastChimeX) > 3) { v.lastChimeX = v.x; v.lastChimeT = t; v.bounce = 1; } }
function tease(v, s) {
  if (!v || v.dragging || v.wT === 0) return;
  if (LIGHT()) s *= 0.55;
  v.locked = false; v.pinUntil = 0; v.glide = null; v.echo = null; v.hist.length = 0; v.histT.length = 0;
  v.v += (Math.random() < 0.5 ? -1 : 1) * rand(260, 620) * s * (0.7 + 0.6 * SET.tease);
  v.temp = Math.max(v.temp, 0.8 * s); act = v;
}
function lean(s) {
  if (LIGHT() && !targetMode()) {
    const live = voices.filter(v => v.wT > 0 && !v.dragging && !v.glide).sort((a, b) => a.lockT - b.lockT);
    for (const v of live.slice(0, 2)) if (lightGlide(v)) break;
    emit('lean'); return;
  }
  for (const v of voices) if (v.wT > 0) tease(v, s * rand(0.75, 1.1)); emit('lean');
}

// ---------- light: glide from one valley floor to another instead of leaning ----------
function lightSpots(v, lo, hi) {
  const out = [], st = 6;
  lo = clamp(lo, 0, XMAX); hi = clamp(hi, 0, XMAX);
  if (hi - lo < st * 3) return out;
  let prev = Dv(v, lo), cur = Dv(v, lo + st);
  for (let x = lo + st; x < hi - st; x += st) {
    const nx = Dv(v, x + st);
    if (cur < prev && cur <= nx) { const xm = refineMin(v, x, st); out.push({ x: xm, d: Dv(v, xm) }); }
    prev = cur; cur = nx;
  }
  return out.filter(p => voices.every(o => o === v || o.wT === 0 || Math.abs(o.x - p.x) > 45)).sort((a, b) => a.d - b.d);
}
function lightGlide(v, near) {
  if (!v || v.dragging || v.wT === 0) return false;
  const c = near != null ? near : v.x, r = near != null ? 90 : 520;
  const sp = lightSpots(v, Math.max(70, c - r), Math.min(XMAX - 70, c + r)).filter(p => near != null || Math.abs(p.x - v.x) > 40).slice(0, 4);
  if (!sp.length) return false;
  const rr = Math.random(), p = near != null ? sp.sort((a, b) => Math.abs(a.x - c) - Math.abs(b.x - c))[0] : sp[Math.min(sp.length - 1, rr < 0.6 ? 0 : rr < 0.9 ? 1 : 2)];
  v.locked = false; v.pinUntil = 0; v.target = null; v.echo = null; v.hist.length = 0; v.histT.length = 0;
  v.glide = { x0: v.x, x1: p.x, t0: t, dur: 0.3 + 0.0011 * Math.abs(p.x - v.x) };
  act = v; return true;
}
function lightAdd(o) {
  const sp = lightSpots(null, 150, XMAX - 150);
  const rr = Math.random(), x = sp.length ? sp[Math.min(sp.length - 1, rr < 0.6 ? 0 : rr < 0.9 ? 1 : 2)].x : rand(300, XMAX - 300);
  return addVoice(x, Object.assign({ temp: 0 }, o || {}));
}

// ---------- harmony ----------
const RSTEPS = {
  just: [[[1, 0], 3], [[-1, 0], 3], [[0, 1], 1.2], [[0, -1], 1.2], [[1, -1], 1.5], [[-1, 1], 1.5]],
  gamelan: [[[1], 2], [[-1], 2], [[2], 2], [[-2], 2], [[3], 1], [[-3], 1]],
  tet10: [[[3], 2], [[-3], 2], [[4], 1.5], [[-4], 1.5], [[6], 1.5], [[-6], 1.5], [[7], 1], [[-7], 1]],
  tet31: [[[18], 2], [[-18], 2], [[13], 2], [[-13], 2], [[10], 1.4], [[-10], 1.4], [[8], 1], [[-8], 1]],
  bp: [[[2, 0, -1], 2], [[-2, 0, 1], 2], [[0, -1, 1], 2], [[0, 1, -1], 2], [[-1, 1, 0], 2], [[1, -1, 0], 2], [[2, -1, 0], 1], [[-2, 1, 0], 1]]
};
function stepPenalty(st) {
  if (M.key === 'just') {
    const na = rs.a + st[0], nb = rs.b + st[1], prev = path.length > 1 ? path[path.length - 2] : null;
    let w = 1; if (Math.abs(na) > 4) w *= 0.15; if (Math.abs(nb) > 2) w *= 0.15; if (prev && prev.a === na && prev.b === nb) w *= 0.35;
    return w;
  }
  if (M.key === 'bp') return (Math.abs(rs.e5 + st[1]) > 2 ? 0.15 : 1) * (Math.abs(rs.e7 + st[2]) > 2 ? 0.15 : 1);
  return Math.abs(rs.s + st[0]) > M.n ? 0.2 : 1;
}
function rootStep(st) {
  if (M.key === 'just') { rs.a += st[0]; rs.b += st[1]; path.push({ a: rs.a, b: rs.b }); if (path.length > 60) path.shift(); }
  else if (M.key === 'bp') { rs.e3 += st[0]; rs.e5 += st[1]; rs.e7 += st[2]; }
  else rs.s += st[0];
  fRoot = computeRoot(); audio.setRoot(fRoot); rootFlash = 1;
  const L = LIGHT(), lo = L ? 0.02 : 0.15 + 0.5 * SET.tease, hi = L ? 0.16 : 0.5 + 1.6 * SET.tease;
  for (const v of voices) {
    if (v.wT === 0 || v.dragging) continue;
    v.locked = false; v.glide = null; v.pinUntil = t + rand(lo, hi); v.temp = Math.max(v.temp, L ? 0.04 : 0.3); v.hist.length = 0; v.histT.length = 0;
  }
  if (M.struck) { audio.strikeRoot(1, 3.2); for (const v of voices) if (v.wT > 0) { audio.strikeVoice(v, 0.5, 1.2); v.flash = 0.5; } discover('g-gong'); emit('gong'); }
  emit('change');
}
function chooseRootStep() {
  if (M.easy) { easyAdvance(); return; }
  if (era) return;
  const L = RSTEPS[M.key]; if (!L) return;
  const ws = L.map(([st, w]) => w * stepPenalty(st) * (M.key === 'just' && st[1] === 0 ? 1 + W5[2] + (LIGHT() ? 0.8 : 0) : 1));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0;
  while (i < ws.length - 1 && r > ws[i]) { r -= ws[i]; i++; }
  rootStep(L[i][0]);
}
function startPump() {
  if (pump || !entered || M.key !== 'just' || round) return;
  pump = { steps: [[-1, 1], [-1, 0], [-1, 0], [-1, 0]], i: 0, next: t + 0.4, a0: rs.a, b0: rs.b };
  lastPumpT = t;
  caption('comma pump: I, vi, ii, V, I in just intonation. watch the root.', 4200);
}
function gamelanBeatAt(when) {
  gam.b++;
  const live = voices.filter(v => v.wT > 0).sort((a, b) => a.x - b.x);
  if (gam.b % 8 === 0) {
    if (gongDue && !round) { gongDue = false; chooseRootStep(); return; }
    audio.strikeRoot(1, 3.2, when); for (const v of live) audio.strikeVoice(v, 0.55, 1.2, when);
    rootFlash = 1; live.forEach(v => (v.flash = 0.55)); discover('g-gong'); emit('gong');
  } else if (live.length) {
    const n = live.length, per = Math.max(1, 2 * n - 2), k = gam.b % per, v = live[clamp(k < n ? k : per - k, 0, n - 1)];
    audio.strikeVoice(v, rand(0.75, 1), rand(0.8, 1.1), when); v.flash = 1;
  }
}
function gamelanClock() { if (!M.struck || rhyActive() || t < gam.next) return; gam.next = t + (1.25 - 0.6 * effPace()); gamelanBeatAt(0); }

// ---------- easy listening: familiar progressions on the piano grid ----------
const PROGS = [
  { name: 'I–V–vi–IV', bright: true, ch: [[0, 'M7'], [7, 'add9'], [9, 'm7'], [5, 'M7']] },
  { name: 'vi–IV–I–V', bright: false, ch: [[9, 'm7'], [5, 'M7'], [0, 'add9'], [7, 'sus4']] },
  { name: 'ii–V–I–vi', bright: false, ch: [[2, 'm7'], [7, '9'], [0, 'M7'], [9, 'm7']] },
  { name: 'I–vi–IV–V', bright: true, ch: [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, '7']] },
  { name: 'IV–V–iii–vi', bright: true, ch: [[5, 'M7'], [7, '7'], [4, 'm7'], [9, 'm7']] }
];
const QUAL = { M7: [4, 7, 11, 14], add9: [4, 7, 14, 12], m7: [3, 7, 10, 14], '9': [4, 10, 14, 7], '7': [4, 7, 10, 12], sus4: [5, 7, 10, 14] };
const QN = { M7: 'maj7', add9: 'add9', m7: 'm7', '9': '9', '7': '7', sus4: '7sus4' };
function pickProg() { const ws = PROGS.map(p => (p.bright ? 1 + 2 * W5[2] : 1 + W5[3])); let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0; while (i < ws.length - 1 && r > ws[i]) { r -= ws[i]; i++; } return i; }
function assignTarget(v, x) {
  v.target = x; v.locked = false; v.pinUntil = 0; v.hist.length = 0; v.histT.length = 0;
  const tz = effTease();
  v.approach = x + (Math.random() < 0.65 ? 1 : -1) * rand(35, 85) * (0.4 + tz); v.approachUntil = t + rand(0.12, 0.35) + 0.55 * tz;
}
function setChordTargets(rootF, ratios) {
  const live = voices.filter(v => v.wT > 0);
  for (let g = 0; live.length < Math.min(3, ratios.length) && g < 4; g++) { const nv = addVoice(rand(400, XMAX - 400), { temp: 0 }); if (!nv) break; live.push(nv); }
  live.sort((a, b) => a.x - b.x);
  const used = new Set();
  for (const v of live) {
    if (v.dragging) continue;
    let best = null, bd = 1e9;
    ratios.forEach((r, i) => {
      if (used.has(i) && used.size < ratios.length) return;
      for (let m = -3; m <= 4; m++) { const x = xOf(rootF * r * Math.pow(2, m)); if (x < 80 || x > XMAX - 80) continue; const d = Math.abs(x - v.x); if (d < bd) { bd = d; best = { i, x }; } }
    });
    if (best) { used.add(best.i); assignTarget(v, best.x); }
  }
}
function easyAdvance() {
  if (!M.easy || round) return;
  const P = PROGS[easyS.prog] || PROGS[0], L = P.ch.length;
  let [deg, q] = P.ch[easyS.i % L], surprise = false;
  if (easyS.i % (L * 2) === L * 2 - 1 && Math.random() < 0.2 + 0.4 * W5[4]) { [deg, q] = [[8, 'M7'], [10, 'add9'], [4, '7'], [1, 'M7']][(Math.random() * 4) | 0]; surprise = true; }
  easyS.i++;
  if (easyS.i % (L * 2) === 0) { if (P.name === 'I–vi–IV–V') discover('e-doowop'); if (Math.random() < 0.4) { easyS.prog = pickProg(); easyS.i = 0; } }
  const fr = easyS.key * Math.pow(2, deg / 12), pc = ((Math.round(12 * Math.log2(fr / 130.8128)) % 12) + 12) % 12;
  fRoot = fold(fr, 2, 98); audio.setRoot(fRoot); rootFlash = 0.6;
  setChordTargets(fr, QUAL[q].map(s => Math.pow(2, s / 12)));
  easyS.name = ETN[pc] + QN[q]; easyS.progName = P.name;
  if (surprise && surpriseN++ < 2) caption(`a surprise: ${easyS.name}. certainty first, then a turn.`, 2600);
  emit('change');
}

// ---------- 1955, by way of 1928 ----------
const FORM55 = [0, 0, 0, 0, 1, 1, 0, 0, 2, 1, 0, 2], R55 = [1, 4 / 3, 3 / 2], BLUES = [1, 7 / 6, 4 / 3, 3 / 2, 7 / 4, 2, 7 / 3, 8 / 3, 3];
function startEra() {
  if (era || !entered || round || JAM.on) return;
  era = { prev: M.key, prevRhy: rhy.on, bar: -1, ch: 0, base: 116.54, endAt: 0, cap: false };
  if (M.key !== 'just') setMode('just', true);
  rhy.on = true; rhy.nextT = 0; rhy.step = 0; flash55 = 1; peak = 0.6;
  caption('1955, by way of 1928: boogie-woogie, in just intonation.', 3200); syncUI(); jlog('88 mph. 1955.');
}
function eraBar(t0) {
  era.bar++;
  const b = era.bar;
  if (b >= 17) { if (!era.endAt) { era.endAt = t; rhy.on = false; } return; }
  if (b === 16) { for (const v of voices) if (v.wT > 0) assignTarget(v, clamp(v.x + rand(-160, 160), 80, XMAX - 80)); peak = 1; return; }
  era.ch = b < 12 ? FORM55[b] : 0;
  const fr = era.base * R55[era.ch];
  fRoot = fold(fr, 2, 98); audio.setRoot(fRoot); rootFlash = 0.8;
  setChordTargets(fr, [5 / 4, 3 / 2, 7 / 4, 2]);
  if (b >= 4) {
    const beat = 60 / 152, wild = Math.max(0, b - 11), n = wild ? 7 + wild * 2 : 5;
    let idx = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      idx = clamp(idx + [-2, -1, 1, 1, 2][(Math.random() * 5) | 0] + (wild ? ((Math.random() * 3) | 0) - 1 : 0), 0, BLUES.length - 1);
      const f1 = era.base * 4 * BLUES[idx] * Math.pow(2, (wild ? rand(-1, 1) * 45 * wild : 0) / 1200), f0 = f1 * Math.pow(2, -rand(40, 110) / 1200);
      audio.birdAt(f0, f1, rand(0.05, 0.16), wild ? 0.22 : 0.42, rand(-0.5, 0.5), wild ? 0.04 : 0.034, t0 + i * beat * (wild ? 4 / n : 0.75) + (Math.random() < 0.3 ? beat / 3 : 0));
    }
    bird.tx = rand(W * 0.2, W * 0.7); bird.ty = LT * rand(0.2, 0.55); bird.lastNote = t; if (bird.x < -50) { bird.x = bird.tx; bird.y = bird.ty; }
  }
}
function play55(i, t0, spb) {
  if (!era) return;
  const beat = (i / 3) | 0, sub = i % 3, lvl = 0.9 * clamp(dyn, 0.4, 1.1), BOOG = [1, 5 / 4, 3 / 2, 5 / 3, 7 / 4, 5 / 3, 3 / 2, 5 / 4];
  if (sub === 0) { hat(t0, 0.45 * lvl, false); if (beat % 2 === 0) kick(t0, 0.9 * lvl); else snare(t0, 0.85 * lvl); }
  if (sub === 2) hat(t0, 0.3 * lvl, false);
  if (sub !== 1) bassAt(t0, (era.base * R55[era.ch] * BOOG[(beat * 2 + (sub === 2 ? 1 : 0)) % 8]) / 2, 0.8 * lvl, spb * 1.6);
}

// ---------- rhythm: medium syncopation, repetition, then a turn ----------
const rhyActive = () => !!(A.ac && entered && !paused && (JAM.on || (rhy.on && (era || M.easy || W5[1] > 0.08))));
function makePattern(n) {
  const N = 4 * n, sync = (0.22 + 0.32 * W5[1] + 0.14 * W5[4]) * (LIGHT() ? 0.6 : 1), P = { n, k: Array(N).fill(0), s: Array(N).fill(0), h: Array(N).fill(0), o: Array(N).fill(0), a: Array(N).fill(0) };
  P.k[0] = 1; if (Math.random() < 0.65) P.k[2 * n] = 0.85;
  if (Math.random() < sync) P.k[2 * n - 1] = 0.7;
  if (Math.random() < sync * 0.6) P.k[3 * n + (n >> 1)] = 0.6;
  P.s[n] = 1; P.s[3 * n] = 1;
  for (let i = 0; i < N; i++) { if (i % n && Math.random() < sync * 0.16) P.s[i] = 0.22; P.h[i] = i % n === 0 ? 0.6 : 0.28 + 0.16 * Math.random(); }
  if (Math.random() < (LIGHT() ? 0.12 : 0.35)) { P.o[N - 1] = 0.5; P.h[N - 1] = 0; }
  const dens = 0.12 + 0.45 * W5[1] * (0.5 + 0.5 * W5[2]);
  for (let i = 0; i < N; i++) if (Math.random() < dens) P.a[i] = 0.5 + 0.5 * Math.random();
  return P;
}
function mutate(P, n) { const Q = { n, k: P.k.slice(), s: P.s.slice(), h: P.h.slice(), o: P.o.slice(), a: P.a.slice() }; for (let i = 3 * n; i < 4 * n; i++) if (Math.random() < 0.45) Q.s[i] = Math.max(Q.s[i], 0.3 + 0.4 * Math.random()); if (Math.random() < 0.5) { Q.k[2 * n] = 0; Q.k[2 * n + 1] = 0.8; } return Q; }
function playStep(i, t0, n, spb) {
  const P = rhy.pat; if (!P) return;
  const lvl = clamp(0.25 + 0.95 * W5[1], 0, 1) * clamp(dyn, 0.4, 1.1) * (M.easy ? 1 : 0.75) * (round ? 0.6 : 1) * (LIGHT() ? 0.72 : 1), hl = LIGHT() ? 0.55 : 1;
  if (M.struck) { if (i % n === 0) gamelanBeatAt(t0); if (i === 0) kick(t0, 0.45 * lvl); return; }
  if (P.k[i]) { kick(t0, P.k[i] * lvl); bassAt(t0, fRoot >= 130 ? fRoot / 2 : fRoot, P.k[i] * lvl, spb * n * 0.9); }
  if (P.s[i]) snare(t0, P.s[i] * lvl);
  if (P.h[i]) hat(t0, P.h[i] * lvl * 0.9 * hl, false);
  if (P.o[i]) hat(t0, P.o[i] * lvl * hl, true);
  if (P.a[i]) { const lv = voices.filter(v => v.wT > 0 && v.locked); if (lv.length) keysAt(t0, fOf(lv[(Math.random() * lv.length) | 0].x) * M.eq, P.a[i] * lvl * (0.5 + 0.6 * W5[2])); }
}
function onBar(t0, n) {
  rhy.bar++;
  if (JAM.on) { jamBar(t0); return; }
  if (era) { eraBar(t0); return; }
  if (!rhy.base || rhy.base.n !== n || rhy.bar % 4 === 0) rhy.base = makePattern(n);
  rhy.pat = rhy.bar % 4 === 3 ? mutate(rhy.base, n) : rhy.base;
  if (M.easy) easyAdvance();
}
function rhythmTick() {
  if (!rhyActive()) { rhy.nextT = 0; return; }
  const now = aNow();
  if (!rhy.nextT || rhy.nextT < now - 0.3) { rhy.nextT = now + 0.08; rhy.step = 0; }
  const grid = JAM.on && JAM.chart ? jamGrid() : null;
  const n = grid ? grid.n : JAM.on ? 3 : era ? 3 : tuplet, bpm = JAM.on ? JAM.bpm : era ? 152 : clamp((M.easy ? 80 : 68) + 42 * W5[1] + 16 * (effPace() - 0.45) - 10 * W5[3], 58, 132);
  rhy.bpm = bpm;
  const meter = grid ? grid.meter : 4;
  const spb = 60 / bpm / n, N = meter * n;
  let guard = 0;
  while (rhy.nextT < now + 0.15 && guard++ < 64) {
    const i = rhy.step % N;
    if (i === 0) onBar(rhy.nextT, n);
    if (!rhyActive()) break;
    if (JAM.on) jamStep(i, rhy.nextT, n, spb); else if (era) play55(i, rhy.nextT, spb); else playStep(i, rhy.nextT, n, spb);
    if (plucky() && !JAM.on) pluckStep(i, rhy.nextT, n, spb);
    visQ.push({ t: rhy.nextT, i, n });
    const sw = grid ? grid.swing : (!era && !JAM.on && n === 4 ? 0.5 + 0.1 * W5[1] + (M.easy ? 0.05 : 0) : 0.5);
    rhy.nextT += (i % 2 === 0 ? 2 * sw : 2 * (1 - sw)) * spb;
    rhy.step = (i + 1) % N;
  }
  if (visQ.length > 160) visQ.splice(0, visQ.length - 160);
}

// ---------- AND SO 7: the voices are plucked in time (a music box with a terrain under it) ----------
const PL = { i: 0, next: 0, drag: 0 };
function liveSorted() { return voices.filter(v => v.wT > 0 && v.w > 0.15).sort((a, b) => a.x - b.x); }
function pluckStep(i, t0, n, spb) {
  if (!plucky()) return;
  const live = liveSorted(); if (!live.length) return;
  const beat = (i / n) | 0, sub = i % n, lvl = clamp(0.7 + 0.5 * dyn, 0.6, 1.25) * (LIGHT() ? 0.92 : 1);
  if (sub === 0) {
    if (beat === 0 || beat === 2) live.forEach((v, k) => audio.pluck(v, (1.25 - 0.12 * k) * lvl, 0.62 + 0.25 * SET.space, t0 + k * 0.014));
    else { const v = live[PL.i++ % live.length]; audio.pluck(v, 1.05 * lvl, 0.48, t0); }
  } else if (n >= 2 && sub === (n >> 1) && Math.random() < 0.55 + 0.35 * W5[1]) {
    const v = live[(PL.i++ * 2 + 1) % live.length]; audio.pluck(v, 0.72 * lvl, 0.32, t0);
  } else if (rhy.pat && rhy.pat.a[i] && Math.random() < 0.6) {
    const v = live[PL.i++ % live.length]; audio.pluck(v, 0.6 * rhy.pat.a[i] * lvl, 0.26, t0);
  }
}
// without a beat the voices still ring in turn, slower, like wind chimes that agree
function pluckFree() {
  if (!plucky() || !A.ac || !entered || paused || rhyActive() || t < PL.next) return;
  const live = liveSorted(); if (!live.length) { PL.next = t + 0.5; return; }
  const k = PL.i++;
  if (k % 6 === 0) live.forEach((v, j) => audio.pluck(v, 1.1, 0.9, aNow() + 0.02 + j * 0.05));
  else audio.pluck(live[k % live.length], 0.95, 0.75, 0);
  PL.next = t + (0.42 + 0.5 * (1 - effPace())) * (LIGHT() ? 1.15 : 1) * (k % 6 === 5 ? 1.8 : 1);
}
// a held voice sounds while it moves, so dragging is playing
function pluckDrag(v, speed) {
  if (!plucky() || !A.ac || t < PL.drag) return;
  audio.pluck(v, 0.55 + Math.min(0.5, speed / 900), 0.22, 0); PL.drag = t + clamp(0.34 - speed / 3000, 0.11, 0.34);
}

// ---------- dynamics: swell into the lean, peak at the landing ----------
let dynLastT = 0;
function dynamicsTick(dt) {
  const live = voices.filter(v => v.wT > 0), tension = live.length ? live.filter(v => !v.locked).length / live.length : 0;
  const phrase = 0.5 + 0.5 * Math.sin((t * TAU) / (20 + 10 * W5[3]));
  let target = 0.62 + 0.14 * phrase + 0.16 * tension * (0.6 + 0.8 * W5[4]) * (LIGHT() ? 0.35 : 1) - 0.14 * W5[3] + 0.18 * peak + (era ? 0.08 : 0);
  if (era && era.endAt) target = t > era.endAt + 0.9 ? 0.06 : 1.02;
  target = clamp(target, 0.05, 1.08);
  const nd = dyn + (target - dyn) * (1 - Math.exp(-dt * (era && era.endAt ? 3 : 0.9)));
  dynTrend += ((nd - dyn) / Math.max(dt, 1e-3) - dynTrend) * (1 - Math.exp(-dt * 2));
  dyn = nd; peak *= Math.exp(-dt * 0.6); chill *= Math.exp(-dt * 1.1);
  if (A.ac) { const now = A.ac.currentTime; if (now - dynLastT > 0.08) { dynLastT = now; A.bus.gain.setTargetAtTime(0.85 * dyn, now, 0.2); A.presG.gain.setTargetAtTime(0.5 * chill, now, 0.25); } }
}

// ---------- the bird: appoggiaturas over whatever chord has settled ----------
function makePhrase(live) {
  const pcs = [0, ...live.filter(v => v.locked).map(v => v.c)], pool = [];
  for (const c of pcs) for (let k = -3; k <= 6; k++) { const f = fRoot * Math.pow(2, c / 1200) * Math.pow(M.eq, k); if (f >= 560 && f <= 1500) pool.push(f); }
  pool.sort((a, b) => a - b);
  const P = []; for (const f of pool) if (!P.length || f / P[P.length - 1] > 1.012) P.push(f);
  if (!P.length) return [];
  const N = 4 + ((Math.random() * 4) | 0);
  const R = [[1, 1, 2], [0.5, 0.5, 1, 2], [1.5, 0.5, 1, 1], [0.75, 0.25, 1, 2], [1, 0.5, 0.5, 2]][(Math.random() * 5) | 0];
  const unit = 0.3 * (1.4 - 0.7 * SET.pace), out = [];
  let idx = (Math.random() * P.length) | 0;
  const x0 = rand(W * 0.14, W * 0.42), yTop = Math.max(TOPH + 20, 30), yBot = LT - 40;
  for (let i = 0; i < N; i++) {
    idx = clamp(idx + [-2, -1, -1, 0, 1, 1, 2][(Math.random() * 7) | 0], 0, P.length - 1);
    const f1 = P[idx], f0 = f1 * Math.pow(2, (LIGHT() ? (Math.random() < 0.5 ? 1 : -1) * rand(8, 22) : (Math.random() < 0.7 ? 1 : -1) * rand(35, 95)) / 1200), dur = R[i % R.length] * unit;
    const y = yTop + (yBot - yTop) * (0.1 + 0.8 * (1 - (Math.log2(f1) - Math.log2(560)) / Math.log2(1500 / 560)));
    out.push({ f0, f1, glide: rand(0.08, 0.2), len: Math.max(0.25, dur * 1.4), dur, x: clamp(x0 + i * rand(40, 80) * S, 20, W - 20), y });
  }
  return out;
}
function birdTick() {
  if (!SET.bird || !entered || paused || JAM.on) { bird.notes.length = 0; return; }
  if (t < bird.next) return;
  const live = voices.filter(v => v.wT > 0);
  if (!bird.notes.length) {
    const settled = live.length > 0 && live.filter(v => v.locked).length >= Math.max(1, live.length - 1);
    if (!settled) { bird.next = t + 0.6; return; }
    bird.notes = makePhrase(live); bird.next = t + 0.1;
    if (bird.notes.length && !bird.sung) { bird.sung = true; bird.discoverAt = t + 1.5; }
    return;
  }
  const n = bird.notes.shift();
  if (bird.x < -50) { bird.x = n.x - 70 * S; bird.y = n.y; }
  audio.birdNote(n.f0, n.f1, n.glide, n.len, (n.x / W - 0.5) * 1.4, round ? 0.018 : LIGHT() ? 0.024 : 0.03);
  bird.tx = n.x; bird.ty = n.y; bird.flash = 1; bird.lastNote = t;
  for (let i = 0; i < 4; i++) sparks.push({ x: n.x, y: n.y, vx: rand(-30, 30), vy: rand(-60, -10), life: rand(0.5, 1), max: 1, c: [255, 232, 186] });
  bird.next = t + n.dur;
  if (!bird.notes.length) bird.next = t + n.dur + rand(1.6, 4.2) * (1.6 - 0.9 * SET.pace);
}

// ---------- naming what you hear ----------
function nearestLab(c) {
  if (M.key === 'just') { const nb = nearestAbs(c, JI8); return { lab: `${nb.p}/${nb.q}`, dev: c - nb.c }; }
  if (M.key === 'bp') { const nb = nearestAbs(c, BP9); return { lab: `${nb.p}/${nb.q}`, dev: c - nb.c }; }
  if (M.easy) { const k = Math.round(c / 100), nb = nearestAbs(c, JI8); return { lab: DEG12[((k % 12) + 12) % 12], dev: c - k * 100, ji: c - nb.c, jl: `${nb.p}/${nb.q}` }; }
  const st = 1200 / M.n, k = Math.round(c / st), kk = ((k % M.n) + M.n) % M.n;
  return { lab: M.key === 'gamelan' ? `‘${GD[kk]}’` : `${kk}\\${M.n}`, dev: c - k * st };
}
function valleyLab(c, tol) {
  tol = tol || 9;
  if (M.key === 'just' || M.easy) { const r = simplestWithin(JI, c, tol); return r ? { lab: r.p === 2 && r.q === 1 ? '1/1' : `${r.p}/${r.q}`, cents: r.c >= 1199.999 ? 0 : r.c } : null; }
  if (M.key === 'bp') { const r = simplestWithin(BPJI, c, tol); return r ? { lab: r.p === 3 && r.q === 1 ? '1/1' : `${r.p}/${r.q}`, cents: r.c >= M.eqC - 1e-6 ? 0 : r.c } : null; }
  const st = 1200 / M.n, k = Math.round(c / st); if (Math.abs(c - k * st) > tol) return null;
  const kk = ((k % M.n) + M.n) % M.n; return { lab: M.key === 'gamelan' ? `‘${GD[kk]}’` : `${kk}\\${M.n}`, cents: kk * st };
}
function chordOf(live) {
  if (era) return { str: ['I⁷', 'IV⁷', 'V⁷'][era.ch], name: '12-bar blues · 4:5:6:7 on every chord', beatless: true };
  if (JAM.on && JAM.chord) return { str: JAM.chord.sym, name: `${JAM.S.name} · ${JAM.chord.name}`, beatless: true };
  if (M.easy && !round) return easyS.name ? { str: easyS.name, name: `${easyS.progName} · 12-TET, close enough for pop` } : null;
  if (M.key === 'just' || M.key === 'bp') {
    const list = M.key === 'just' ? JI : BPJI, eqP = M.eq, set = [[1, 1]];
    let maxDev = 0;
    for (const v of live) {
      const r = simplestWithin(list, v.c, 3);
      if (!r) return null;
      maxDev = Math.max(maxDev, Math.abs(v.c - r.c));
      let p = r.p; const q = r.q; if (p === eqP && q === 1) p = 1;
      if (!set.some(([a, b]) => a * q === p * b)) set.push([p, q]);
    }
    let L = 1; for (const [, q] of set) L = lcm(L, q);
    let ints = set.map(([p, q]) => (p * L) / q).sort((a, b) => a - b);
    const g = ints.reduce((a, b) => gcd(a, b));
    ints = ints.map(n => n / g);
    const str = ints.join(':'), names = M.key === 'just' ? CHORDS : CHORDS_BP;
    const name = ints[ints.length - 1] > 64 ? 'complex' : names[str] || (M.key === 'just' ? 'one slice of one harmonic series' : 'odd partials of one fundamental');
    return { str, name, beatless: maxDev < 0.6 };
  }
  const st = 1200 / M.n, ks = [0];
  let maxDev = 0;
  for (const v of live) {
    const k = Math.round(v.c / st), dev = Math.abs(v.c - k * st);
    if (dev > 3) return null;
    maxDev = Math.max(maxDev, dev);
    const kk = ((k % M.n) + M.n) % M.n; if (!ks.includes(kk)) ks.push(kk);
  }
  ks.sort((a, b) => a - b);
  if (M.key === 'gamelan') return { str: ks.map(k => GD[k]).join(' · '), name: `slendro degrees · ${ks.map(k => k * 240).join(', ')}¢`, shimmer: true, ks };
  return { str: `${ks.join(' · ')} \\${M.n}`, name: `${ks.map(k => Math.round(k * st)).join(', ')}¢`, beatless: maxDev < 0.6, ks };
}
function coincide(fv) {
  let best = null, bs = 1e9;
  for (let i = 0; i < PK; i++) for (let j = 0; j < PK; j++) {
    if (PA[i] * PA[j] < 0.04) continue;
    const c = 1200 * Math.log2((fv * PR[i]) / (fRoot * PR[j]));
    if (c > 150 || c < -150) continue;
    const s = Math.abs(c) + 0.8 * (i + j);
    if (s < bs) { bs = s; best = [i, j, c, s]; }
  }
  return best;
}
function rootLines() {
  if (JAM.on && JAM.chord) return [`${JAM.S.name} · ${JAM.chord.sym} · ${JAM.chord.name}`, `${M.key === 'tet31' ? '31-EDO' : '7-limit just intonation'} · ${JAM.bpm} bpm, swung`];
  if (M.key === 'just') {
    let c = 1200 * (rs.a * L3 + rs.b * L5); c = ((c % 1200) + 1200) % 1200;
    const et = Math.round(c / 100), dev = c - et * 100;
    return [`root ${noteName(rs.a, rs.b)} · ${OUT(fRoot).toFixed(1)} Hz`, `${dev >= 0 ? '+' : '−'}${Math.abs(dev).toFixed(1)}¢ vs 12-TET ${ETN[et % 12]}`];
  }
  if (M.key === 'bp') {
    let p = Math.pow(3, Math.max(rs.e3, 0)) * Math.pow(5, Math.max(rs.e5, 0)) * Math.pow(7, Math.max(rs.e7, 0));
    let q = Math.pow(3, Math.max(-rs.e3, 0)) * Math.pow(5, Math.max(-rs.e5, 0)) * Math.pow(7, Math.max(-rs.e7, 0));
    while (p / q >= 3) q *= 3;
    while (p / q < 1) p *= 3;
    const g = gcd(p, q);
    return [`root ${p / g}/${q / g} from the start · ${OUT(fRoot).toFixed(1)} Hz`, 'tritave 1902¢ · BP steps of 146.3¢'];
  }
  if (M.easy) return [`now ${easyS.name || '…'} · root ${OUT(fRoot).toFixed(1)} Hz`, '12-TET: thirds sit ~14¢ off the just valley floors'];
  const k = ((rs.s % M.n) + M.n) % M.n;
  return M.key === 'gamelan' ? [`root ‘${GD[k]}’ · ${OUT(fRoot).toFixed(1)} Hz`, 'five near-equal steps of 240¢'] : [`root ${k}\\10 · ${OUT(fRoot).toFixed(1)} Hz`, 'ten equal steps of 120¢'];
}

// ---------- the terrain each voice sees ----------
function computeCurves(dt) {
  for (let s = 0; s < NS; s++) CR[s] = dTones(FS[s], fRoot);
  for (const v of voices) { const C = v.C; if (v.w < 0.001) { C.fill(0); continue; } const fv = fOf(v.x); for (let s = 0; s < NS; s++) { const dx = (XS[s] - v.x) / PSW; C[s] = (dTones(FS[s], fv) + PSA * Math.exp(-dx * dx)) * v.w; } }
  for (let s = 0; s < NS; s++) { let tt = CR[s] + holeTerm(XS[s]); for (const v of voices) tt += v.C[s]; TOT[s] = tt; }
  const kk = 1 - Math.exp(-dt * 16);
  for (const v of voices) { const D = v.disp, C = v.C; if (!v.dispInit) { for (let s = 0; s < NS; s++) D[s] = TOT[s] - C[s]; v.dispInit = true; } else for (let s = 0; s < NS; s++) D[s] += (TOT[s] - C[s] - D[s]) * kk; }
  // display only: lift each curve's floor to the bottom and widen the range as voices pile up, so valleys stay visible
  const nl = voices.filter(v => v.wT > 0).length, kb = 1 - Math.exp(-dt * 4);
  DSK += (1 + 0.45 * Math.max(0, nl - 1) - DSK) * kb;
  for (const v of voices) { let mn = Infinity; const D = v.disp; for (let s = 0; s < NS; s++) if (D[s] < mn) mn = D[s]; if (isFinite(mn)) v.base += (0.9 * mn - v.base) * kb; }
}
let DSK = 1;
const hgt = (val, v) => 1 - Math.exp(-Math.max(0, val - (v ? v.base : 0)) / (DS * DSK));
function recomputeXS() {
  if (!XS) return;
  for (let s = 0; s < NS; s++) { XS[s] = VIEW.x0 + (s / (NS - 1)) * (VIEW.x1 - VIEW.x0); FS[s] = fOf(XS[s]); }
  voices.forEach(v => (v.dispInit = false));
  syncZoomUI();
}
function setView(x0, w) { w = clamp(w, XMAX / 12, XMAX); x0 = clamp(x0, 0, XMAX - w); if (Math.abs(x0 - VIEW.x0) < 1e-6 && Math.abs(x0 + w - VIEW.x1) < 1e-6) return; VIEW.x0 = x0; VIEW.x1 = x0 + w; recomputeXS(); const z = XMAX / w; emit('zoom', { v: z }); if (z >= 6) discover('x-zoom'); }
function setZoom(z, cx) { z = clamp(z, 1, 12); const w = XMAX / z; VIEW.tgt = null; setView(cx - w / 2, w); }
function zoomAt(z, px) { z = clamp(z, 1, 12); const w = XMAX / z, cx = xFromS(px), frac = clamp((px - PX0) / PW, 0, 1); VIEW.tgt = null; setView(cx - frac * w, w); }
function zoomBy(f) { setZoom(zoomLevel() * f, (VIEW.x0 + VIEW.x1) / 2); }
