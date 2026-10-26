// ===== listen: a demo hummer first, your own voice if you want it. pitch is tracked on this page (YIN), the music follows, Saelion ad-libs =====
const LS = {
  src: null, used: false, micOk: false, auto: false, autoAt: 0, autoDone: false,
  det: null, an: null, sink: null, buf: null, dec: null, cm: null, stream: null, msrc: null, hum: null,
  nextT: 0, rms: 0, floor: 0.002, f: 0, fi: 0, conf: 0, vN: 0, uN: 0, jumpN: 0, hist: [],
  note: null, phrase: [], phrases: 0, lastVoicedT: -99, lastFollowT: -99, lastAction: '', lastShift: 0,
  steady: { c: 0, t0: 0 }, roomC: null, dispX: null, vis: 0, show: 0, trail: [], echoV: null, echoT: 0,
  selfF: [], adlibBusy: false, lastAdlibT: -99, lines: [], devs: [], lastLab: ''
};
const listenBusy = () => !!LS.src && t - LS.lastVoicedT < 6;
const NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function stdev(a) { const n = a.length; if (n < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / n; return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / (n - 1)); }
function median(a) { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[n >> 1] : 0.5 * (s[n / 2 - 1] + s[n / 2])) : 0; }
function selfNote(fOut, dur) { if (LS.src !== 'mic') return; LS.selfF.push([fOut, t + dur]); if (LS.selfF.length > 40) LS.selfF.shift(); }

// ---------- the ear: an analyser, a decimated buffer, YIN ----------
function earBuild() {
  if (LS.det || !A.ac) return;
  const ac = A.ac;
  LS.det = ac.createGain(); LS.an = ac.createAnalyser(); LS.an.fftSize = 2048; LS.an.smoothingTimeConstant = 0;
  LS.sink = ac.createGain(); LS.sink.gain.value = 0;
  LS.det.connect(LS.an); LS.an.connect(LS.sink); LS.sink.connect(ac.destination);
  LS.buf = new Float32Array(2048); LS.dec = new Float32Array(1024); LS.cm = new Float32Array(560);
}
function yin(x, sr2) {
  const Wn = 512, tMax = Math.min(Math.floor(sr2 / 70), x.length - Wn - 2), tMin = Math.max(2, Math.floor(sr2 / 1100)), d = LS.cm;
  let run = 0; d[0] = 1;
  for (let tau = 1; tau <= tMax + 1; tau++) {
    let s = 0;
    for (let j = 0; j < Wn; j++) { const q = x[j] - x[j + tau]; s += q * q; }
    run += s; d[tau] = run > 0 ? (s * tau) / run : 1;
  }
  let tau = -1;
  for (let k = tMin; k <= tMax; k++) if (d[k] < 0.13) { while (k + 1 <= tMax && d[k + 1] < d[k]) k++; tau = k; break; }
  if (tau < 0) { let mn = 1e9; for (let k = tMin; k <= tMax; k++) if (d[k] < mn) { mn = d[k]; tau = k; } if (mn > 0.28) return null; }
  const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b, tf = den > 1e-9 ? tau + (a - c) / (2 * den) : tau;
  return { f: sr2 / tf, conf: 1 - b };
}
function heardSelf(fOut) {
  const c = f => Math.abs(1200 * Math.log2(fOut / f)), near = f => { for (let m = 0.5; m <= 4; m *= 2) if (c(f * m) < 2.5) return true; return false; };
  for (const v of voices) if (v.w > 0.05 && v !== LS.echoV && near(OUT(fOf(v.x)))) return true;
  if (near(OUT(fRoot)) || near(OUT(fRoot) * 1.5)) return true;
  for (const [f, u] of LS.selfF) if (t < u && near(f)) return true;
  return false;
}
function analyze() {
  const an = LS.an, buf = LS.buf; an.getFloatTimeDomainData(buf);
  let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
  const rms = Math.sqrt(e / buf.length); LS.rms += (rms - LS.rms) * 0.5;
  LS.floor += (rms - LS.floor) * (rms < LS.floor ? 0.3 : 0.004);
  const gate = LS.src === 'mic' ? Math.max(0.005, LS.floor * 2.4) : 0.01;
  let r = null;
  if (rms > gate) { const x = LS.dec; for (let i = 0; i < 1024; i++) x[i] = 0.5 * (buf[2 * i] + buf[2 * i + 1]); r = yin(x, A.ac.sampleRate / 2); }
  if (r && r.conf > 0.72 && r.f >= 70 && r.f <= 1100) { if (LS.src === 'mic' && heardSelf(r.f)) return; voiced(r.f, r.conf); }
  else unvoiced();
}

// ---------- notes and phrases ----------
function dispOf(fi) { let x = xOf(fi); while (x < 40) x += 1200; while (x > XMAX - 40) x -= 1200; return x; }
function voiced(f, conf) {
  let c = 1200 * Math.log2(f / 440);
  if (LS.hist.length >= 3) { const m = median(LS.hist), dd = c - m; if (Math.abs(Math.abs(dd) - 1200) < 90) c -= Math.sign(dd) * 1200; }
  LS.hist.push(c); if (LS.hist.length > 5) LS.hist.shift();
  const med = median(LS.hist);
  LS.f = 440 * Math.pow(2, med / 1200); LS.fi = LS.f / REF; LS.conf = conf; LS.vN++; LS.uN = 0; LS.lastVoicedT = t;
  LS.dispX = dispOf(LS.fi); LS.vis = Math.min(1, LS.vis + 0.25);
  LS.trail.push({ x: LS.dispX, y: LT + 18 * S, life: 1 }); if (LS.trail.length > 90) LS.trail.shift();
  if (!LS.note) { if (LS.vN >= 3) noteOn(med); }
  else {
    const nc = median(LS.note.cs.slice(-7));
    if (Math.abs(c - nc) > 75) { if (++LS.jumpN >= 2) { noteOff(); LS.hist.length = 0; LS.hist.push(c); noteOn(c); } } else LS.jumpN = 0;
    if (LS.note) { LS.note.cs.push(LS.jumpN ? nc : c); noteHeld(); }
  }
}
function unvoiced() {
  LS.uN++; LS.vis = Math.max(0, LS.vis - 0.08);
  if (LS.uN >= 4) { LS.vN = 0; LS.hist.length = 0; LS.jumpN = 0; if (LS.note) noteOff(); }
  if (LS.phrase.length && t - LS.lastVoicedT > 0.9) phraseEnd();
}
function noteOn(c) { LS.note = { cs: [c], t0: t, acted: false }; LS.jumpN = 0; }
function noteOff() {
  const n = LS.note; LS.note = null; if (!n) return;
  const dur = t - n.t0, c = median(n.cs);
  if (dur >= 0.12) LS.phrase.push({ c, fi: (440 * Math.pow(2, c / 1200)) / REF, dur });
  if (LS.echoV) { LS.echoV.echo = null; LS.echoV.hist.length = 0; LS.echoV.histT.length = 0; }
}
function noteHeld() {
  const n = LS.note, held = t - n.t0;
  if (SET.follow === 'echo' && held > 0.1 && !round && !era) echoFollow();
  const flat = n.cs.length > 8 && stdev(n.cs.slice(4).slice(-30)) < 4;
  if (!n.room && held >= 1.5) {
    const cs = n.cs.slice(4).slice(-36), mc = median(cs);
    if (stdev(cs) < 4 && (LS.roomC == null || Math.abs(mc - LS.roomC) > 30)) { n.room = true; n.acted = true; roomKey(mc); return; }
  }
  if (!n.long && n.acted && held > (flat ? 1.6 : 1.1) && SET.follow === 'harmony' && !round && !era) {
    n.long = true; const dev = degDev(relCents(LS.fi));
    if (Math.abs(dev) > 22 && t - LS.lastFollowT > 1.2 && retuneBy(dev)) { LS.devs.length = 0; LS.lastFollowT = t; LS.lastAction = 'moved'; }
  }
  if (n.acted || held < 0.3 || (held < 1.5 && (n.cs.length < 9 || flat))) return;
  n.acted = true;
  if (LS.src === 'mic') { discover('x-mic'); const vl = valleyLab(relCents(LS.fi), 12); if (vl && t - (LS.awardT || 0) > 3) { LS.awardT = t; award(6, xToS(LS.dispX), LT + 4, 'in tune'); for (let i = 0; i < 6; i++) sparks.push({ x: xToS(LS.dispX), y: LT + 18 * S, vx: rand(-40, 40), vy: rand(-70, -20), life: rand(0.5, 1), max: 1, c: [255, 240, 210] }); } }
  if (round || era) return;
  if (SET.follow === 'root') { if (t - LS.lastFollowT > 1.6 && retune(LS.fi, 1)) { LS.lastFollowT = t; LS.lastAction = 'moved'; } }
  else if (SET.follow === 'harmony') harmonize(LS.fi);
}

// ---------- following ----------
function retune(fi, r) {
  const eq = M.key === 'bp' ? 3 : 2, lo = M.key === 'bp' ? 70 : 98;
  return retuneBy(1200 * Math.log2(fold(fold(fi / r, eq, lo) / fRoot, eq, 1 / Math.sqrt(eq))));
}
function retuneBy(d) {
  if (era || round || !entered || Math.abs(d) < 3) return false;
  const k = Math.pow(2, d / 1200);
  TUNE = fold(TUNE * k, M.eq, 1 / Math.sqrt(M.eq));
  if (M.easy) {
    easyS.key = fold(easyS.key * k, 2, 110); fRoot = fold(fRoot * k, 2, 98);
    for (const v of voices) if (v.wT > 0 && v.target != null && !v.dragging && v.echo == null) assignTarget(v, clamp(v.target + d, 80, XMAX - 80));
  } else fRoot = computeRoot();
  audio.setRoot(fRoot); rootFlash = 1; LS.lastShift = d;
  if (!M.easy) for (const v of voices) { if (v.wT === 0 || v.dragging || v.echo != null) continue; v.locked = false; v.pinUntil = 0; v.target = null; v.hist.length = 0; v.histT.length = 0; v.glide = { x0: v.x, x1: clamp(v.x + d, 0, XMAX), t0: t, dur: 0.22 + Math.abs(d) * 0.003 }; }
  emit('change'); jlog(`retuned ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}¢ to follow ${LS.src === 'demo' ? 'the hummer' : 'a singer'}`);
  return true;
}
// in tune with the key? the scale degrees each tuning offers, in cents above the root
const DIA_J = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 7 / 5, 10 / 7, 3 / 2, 8 / 5, 5 / 3, 7 / 4, 9 / 5, 15 / 8, 2].map(r => 1200 * Math.log2(r));
const CT_J = [0, 315.64, 386.31, 701.96, 968.83], L3C = 1200 * Math.log2(3), L5C = 1200 * Math.log2(5);
function degDev(c) {
  if (M.key === 'just') { let b = 1e9; for (const d of DIA_J) { const e = c - d; if (Math.abs(e) < Math.abs(b)) b = e; } return b; }
  const st = M.easy ? 100 : M.key === 'bp' ? M.eqC / 13 : 1200 / M.n, k = Math.round(c / st);
  return c - k * st;
}
function harmonize(fi) {
  const c = relCents(fi), dev = degDev(c);
  LS.devs.push(dev); if (LS.devs.length > 3) LS.devs.shift();
  const off = LS.devs.filter(d => Math.abs(d) > 22), up = off.filter(d => d > 0), dn = off.filter(d => d < 0);
  if (Math.abs(dev) > 22) {
    const same = up.length >= 2 ? up : dn.length >= 2 ? dn : null;
    if (same && t - LS.lastFollowT > 1.2 && retuneBy(median(same))) { LS.devs.length = 0; LS.lastFollowT = t; LS.lastAction = 'moved'; }
    else LS.lastAction = 'heard';
    return;
  }
  if (M.key !== 'just') { LS.lastAction = 'fits'; return; }
  const circ = d => { d = ((d % 1200) + 1200) % 1200; return Math.min(d, 1200 - d); };
  const pcs = [0, ...voices.filter(v => v.wT > 0).map(v => v.c)];
  LS.lastLab = nearestLab(c).lab;
  if (pcs.some(p => circ(c - p) < 25)) { LS.lastAction = 'fits'; return; }
  for (const st of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) {
    const cn = c - (st[0] * L3C + st[1] * L5C);
    if (CT_J.some(x => circ(cn - x) < 25)) {
      if (t - LS.lastFollowT < 1.6) { LS.lastAction = 'fits'; return; }
      rootStep(st); LS.lastFollowT = t; LS.lastAction = 'harmonized';
      LS.lastLab = nearestLab(relCents(fi)).lab; jlog(`harmonized: the chord moved so the sung note is its ${LS.lastLab}`);
      return;
    }
  }
  LS.lastAction = 'fits';
}
function echoFollow() {
  let v = LS.echoV;
  if (!v || v.wT === 0) {
    v = null;
    const live = voices.filter(o => o.wT > 0 && !o.dragging);
    if (live.length < 4) v = addVoice(LS.dispX, { temp: 0 });
    if (!v && live.length) v = live.slice().sort((a, b) => Math.abs(a.x - LS.dispX) - Math.abs(b.x - LS.dispX))[0];
    if (!v) return;
    LS.echoV = v;
  }
  if (v.dragging) return;
  v.locked = false; v.glide = null; v.target = null; v.pinUntil = 0;
  const x0 = LS.dispX, xs = refineMin(v, x0, 40);
  v.echo = Math.abs(xs - x0) < 38 ? xs : x0;
  LS.echoT += 0.04; if (LS.echoT > 1.5) discover('x-echo', v);
  LS.lastAction = 'echo';
}
function roomKey(c) {
  LS.roomC = c;
  if (round || era) return;
  const hz = 440 * Math.pow(2, c / 1200), moved = retune(hz / REF, 1);
  LS.lastFollowT = t; LS.lastAction = 'room'; discover('x-room');
  caption(moved ? `a steady ${hz.toFixed(1)} Hz. that's the root now.` : `a steady ${hz.toFixed(1)} Hz, right on the root. the room and the music agree.`, 3400);
}

// ---------- ad lib ----------
function phraseEnd() {
  const ph = LS.phrase.splice(0);
  if (!ph.length || (ph.length === 1 && ph[0].dur < 0.25)) return;
  LS.phrases++;
  if (LS.src === 'demo' && LS.phrases >= 1) discover('x-hum');
  if (LS.src === 'mic') emit('phrase');
  const line = adlib(ph);
  addLine(line); LS.lastAction = '';
  if (LS.phrases >= 3) discover('x-adlib');
  if (LS.phrases % 3 === 0) adlibClaude(describe(ph));
}
function describe(ph) {
  const cs = ph.map(p => p.c), n = ph.length, lo = Math.min(...cs), hi = Math.max(...cs), span = hi - lo, first = cs[0], last = cs[n - 1];
  const pi = cs.indexOf(hi), li = cs.indexOf(lo);
  const contour = span < 60 ? '' : pi > 0 && pi < n - 1 && hi - first > 80 && hi - last > 80 ? 'in an arch' : li > 0 && li < n - 1 && first - lo > 80 && last - lo > 80 ? 'in a dip' : last > first + 60 ? 'rising' : last < first - 60 ? 'falling' : 'wandering';
  const range = span < 60 ? '' : span < 420 ? 'inside a third' : span < 750 ? 'across a fifth' : span < 1250 ? 'across an octave' : 'over more than an octave';
  const labs = ph.map(p => nearestLab(relCents(p.fi)).lab), cnt = {};
  labs.forEach(l => (cnt[l] = (cnt[l] || 0) + 1));
  const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '';
  const hz = Math.round(440 * Math.pow(2, median(cs) / 1200));
  return `${n} note${n > 1 ? 's' : ''}${contour ? ', ' + contour : ''}${range ? ', ' + range : ''}, mostly ${top}, around ${hz} Hz`;
}
function adlib(ph) {
  const n = ph.length, d = describe(ph).split(', '), who = LS.src === 'demo' ? 'the hummer' : 'you', Who = who[0].toUpperCase() + who.slice(1);
  const shape = d.slice(1, -2).join(', '), top = (d[d.length - 2] || '').replace('mostly ', ''), pick = a => a[(Math.random() * a.length) | 0];
  const sang = n === 1 ? `${Who} held one long note` : `${Who} ${LS.src === 'demo' ? 'hummed' : 'sang'} ${NUMW[n] || n} notes`;
  const react = {
    fits: [`the chord already had room for ${top}.`, 'the voices nodded. it was already in the chord.', `it landed on ${top}, which the chord was keeping warm.`],
    moved: [`rather than argue, the chord moved ${Math.abs(LS.lastShift).toFixed(0)}¢ to meet it.`, 'Saelion moved the root, quietly, so it would fit.', `the lattice slid ${Math.abs(LS.lastShift).toFixed(0)}¢ and made it the right note.`],
    room: ['a steady hum came in from the room, and the lattice took it as the floor.', 'something in the room was humming. now everything is tuned to it.'],
    echo: [`a voice sang it straight back, nudged onto ${top}.`, 'the echo voice followed, one valley floor at a time.'],
    harmonized: [`the chord changed underneath, so the last note became its ${LS.lastLab}.`, `Saedo found a chord where that note is the ${LS.lastLab}, and moved there.`],
    heard: ['one note sat between the keys. the music waited to see if it meant it.', 'a note between the valleys. noted, not yet followed.'],
    '': ['the voices listened.', 'Saelion’s ears went up.']
  }[LS.lastAction] || ['the voices listened.'];
  const open = Math.random() < 0.25 ? pick(['Down in the valley, ', 'Later, ', 'Then ', 'Somewhere near the root, ']) : '';
  const body = `${sang}${shape ? ', ' + shape : ''}.`;
  return `${open}${open ? body[0].toLowerCase() + body.slice(1) : body} ${pick(react)}`;
}
function addLine(line, fromClaude) {
  line = line.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  LS.lines.push(line); if (LS.lines.length > 4) LS.lines.shift();
  $('lLines').textContent = LS.lines.join('\n');
  const ta = $('stText'); ta.value = ta.value.replace(/\s+$/, '') + '\n\n' + line;
  jlog(`ad lib: ${line}`);
  if (UNL.pet && pet.hatch <= 0) { pet.say = line; pet.sayUntil = t + 7; pet.cheer = 0.5; } else if (!fromClaude) caption(line, 4200);
}
async function adlibClaude(desc) {
  if (!CAP.sample || !CAP.sampleOk || LS.adlibBusy || t - LS.lastAdlibT < 25) return;
  LS.adlibBusy = true; LS.lastAdlibT = t;
  try {
    const tail = $('stText').value.slice(-420).replace(/\s+/g, ' ');
    const r = await CAP.sample(`You write one line at a time for a gentle storybook inside AND SO, a microtonal music game. The hero is Saelion, a small bunny with one gold eye and one blue one who lives at the bottom of a valley where two notes agree. ${LS.src === 'demo' ? 'A pretend hummer' : 'A real person'} is singing to the game right now. What was just sung: ${desc}. The story so far ends: "${tail}". Write ONE new sentence, at most 24 words, that continues the story and works in what was sung. Plain text, no quotes, no emoji, warm and a little dry.`, { modelTier: 'quick', cache: false });
    const line = ((r && r.text) || '').trim().split('\n')[0].slice(0, 220);
    if (line && LS.src) addLine(line, true);
  } catch (e) { const c = e && e.code; if (c === 'not_granted' || c === 'sampling_disabled' || c === 'capability_disabled' || c === 'capability_removed' || c === 'not_declared') CAP.sampleOk = false; }
  LS.adlibBusy = false;
}

// ---------- the demo hummer ----------
function humBuild() {
  const ac = A.ac, now = ac.currentTime, H = { q: [], next: 0, phrases: 0, on: true };
  H.o1 = ac.createOscillator(); H.o1.type = 'triangle'; H.o2 = ac.createOscillator(); H.o2.type = 'sine';
  H.o1.frequency.value = 200; H.o2.frequency.value = 400;
  H.g2 = ac.createGain(); H.g2.gain.value = 0.2; H.env = ac.createGain(); H.env.gain.value = 0;
  H.lp = ac.createBiquadFilter(); H.lp.type = 'lowpass'; H.lp.frequency.value = 1150; H.lp.Q.value = 0.6;
  H.vib = ac.createOscillator(); H.vib.frequency.value = 5.3; H.vibG = ac.createGain(); H.vibG.gain.value = 0;
  H.vib.connect(H.vibG); H.vibG.connect(H.o1.detune); H.vibG.connect(H.o2.detune);
  H.o1.connect(H.env); H.o2.connect(H.g2); H.g2.connect(H.env); H.env.connect(H.lp);
  H.aud = ac.createGain(); H.aud.gain.value = 0.3; H.lp.connect(H.aud); H.aud.connect(A.lp);
  H.send = ac.createGain(); H.send.gain.value = 0.22; H.lp.connect(H.send); H.send.connect(A.conv);
  H.lp.connect(LS.det);
  H.o1.start(now); H.o2.start(now); H.vib.start(now);
  return H;
}
function humKill(H) {
  if (!H || !A.ac) return;
  const now = A.ac.currentTime; H.on = false;
  H.env.gain.cancelScheduledValues(now); H.env.gain.setTargetAtTime(0, now, 0.08);
  [H.o1, H.o2, H.vib].forEach(o => { try { o.stop(now + 0.6); } catch (e) {} });
  setTimeout(() => { try { H.lp.disconnect(); H.aud.disconnect(); H.send.disconnect(); } catch (e) {} }, 900);
}
function humPhrase(H) {
  const base = fold(fRoot, 2, 120);
  if (!H.phrases) return [{ f: base * Math.pow(2, ((Math.random() < 0.5 ? -1 : 1) * rand(28, 42)) / 1200), dur: 3.1, gap: 1.1, flat: true }];
  const DEG = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2], n = 3 + ((Math.random() * 4) | 0);
  const cell = [[0.42, 0.42, 0.84], [0.3, 0.3, 0.6, 1.1], [0.6, 0.3, 0.3, 0.9], [0.84, 0.42, 0.42, 1.26]][(Math.random() * 4) | 0], out = [];
  let i = 2 + ((Math.random() * 3) | 0);
  for (let k = 0; k < n; k++) {
    i = clamp(i + [-2, -1, -1, 1, 1, 2][(Math.random() * 6) | 0], 0, DEG.length - 1);
    let r = DEG[i], off = rand(-16, 16);
    if (k === n - 1 && Math.random() < 0.35) { r = [7 / 5, 11 / 8, 7 / 4, 45 / 32][(Math.random() * 4) | 0]; off = rand(-6, 6); }
    out.push({ f: base * r * Math.pow(2, off / 1200), dur: cell[k % cell.length], gap: 0.05 });
  }
  const L = out[out.length - 1]; L.dur = Math.max(L.dur, 0.8); L.gap = rand(1.3, 2.3);
  return out;
}
function humTick() {
  const H = LS.hum; if (!H || !H.on || t < H.next) return;
  if (!H.q.length) {
    if (LS.auto && H.phrases >= 4) { listenStop(true); showHint('that was the demo hummer. now you: ◎ listen, then “my microphone” in the sheet', 12); return; }
    H.q = humPhrase(H); H.phrases++;
  }
  const nt = H.q.shift(), fOut = OUT(nt.f), now = A.ac.currentTime + 0.02, scoop = nt.flat ? 0 : rand(25, 60);
  const fresh = H.env.gain.value < 0.02;
  [[H.o1, 1], [H.o2, 2]].forEach(([o, m]) => { const p = o.frequency, f0 = fOut * m * Math.pow(2, -scoop / 1200); p.cancelScheduledValues(now); p.setValueAtTime(fresh ? f0 : p.value, now); p.setTargetAtTime(f0, now, 0.012); p.setTargetAtTime(fOut * m, now + 0.04, 0.07); });
  const g = H.env.gain; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setTargetAtTime(0.3, now, 0.035); g.setTargetAtTime(0.0001, now + nt.dur, 0.05);
  const vg = H.vibG.gain; vg.cancelScheduledValues(now); vg.setValueAtTime(0, now); vg.linearRampToValueAtTime(nt.flat ? 0 : 15, now + Math.min(0.55, nt.dur * 0.6));
  H.next = t + nt.dur + nt.gap;
}

// ---------- start, stop, the tick ----------
async function listenStart(src, auto) {
  if (!entered) return;
  if (!A.ac) audio.init();
  if (!A.ac) { caption("this browser can't run the audio here.", 2600); return; }
  if (A.ac.state === 'suspended') A.ac.resume();
  if (!auto) LS.used = true;
  if (LS.src === src) { listenUI(); return; }
  listenStop(true);
  earBuild();
  LS.phrase.length = 0; LS.note = null; LS.hist.length = 0; LS.vN = 0; LS.uN = 0; LS.lastAction = ''; LS.roomC = null; LS.echoT = 0; LS.devs.length = 0;
  if (src === 'demo') {
    LS.src = 'demo'; LS.auto = !!auto; LS.hum = humBuild(); LS.hum.next = t + 0.6;
    caption(auto ? 'listen: a demo hummer joins in. the music will follow it.' : 'the demo hummer, slightly out of tune on purpose. watch the music follow.', 3600);
    jlog(auto ? 'the demo hummer joined in' : 'demo hummer on');
  } else {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { micNote('no microphone access in this browser.'); return; }
    $('lNote').textContent = 'asking for the microphone…';
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      LS.stream = st; LS.msrc = A.ac.createMediaStreamSource(st); LS.msrc.connect(LS.det);
      LS.src = 'mic'; LS.auto = false; LS.micOk = true; LS.floor = 0.002; LS.selfF.length = 0;
      caption('listening. hum, sing, or let something in the room hum for a while.', 3600); jlog('microphone on');
      st.getAudioTracks().forEach(tr => tr.addEventListener('ended', () => { if (LS.src === 'mic') listenStop(); }));
    } catch (e) {
      const n = e && e.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') micNote(CAP.selfHost ? 'the microphone was declined, or this page is framed without it. the demo hummer still works. the standalone page:' : 'this host keeps the microphone off. open AND SO on its own page to sing to it:', true);
      else if (n === 'NotFoundError' || n === 'OverconstrainedError') micNote('no microphone found. the demo hummer still works.');
      else micNote("the microphone couldn't start. the demo hummer still works.");
      listenUI(); return;
    }
  }
  listenUI(); syncUI();
}
function micNote(msg, link) {
  const el = $('lNote'); el.textContent = msg;
  if (link) { el.append(' '); const a = document.createElement('a'); a.href = 'https://stevoblevo.github.io/and-so/index.html'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'stevoblevo.github.io/and-so'; el.append(a); }
  caption(msg.replace(/:$/, '.'), 3800);
}
function listenStop(quiet) {
  const was = LS.src;
  if (LS.hum) { humKill(LS.hum); LS.hum = null; }
  if (LS.stream) { LS.stream.getTracks().forEach(tr => tr.stop()); LS.stream = null; }
  if (LS.msrc) { try { LS.msrc.disconnect(); } catch (e) {} LS.msrc = null; }
  if (LS.note) noteOff();
  if (LS.phrase.length) phraseEnd();
  for (const v of voices) v.echo = null;
  LS.src = null; LS.auto = false; LS.echoV = null; LS.vis = 0;
  if (was && !quiet) { caption(was === 'mic' ? 'microphone off.' : 'the hummer stopped.', 1800); jlog(was === 'mic' ? 'microphone off' : 'demo hummer off'); }
  if (typeof syncUI === 'function' && entered) syncUI();
}
function listenToggle() { if (LS.src) listenStop(); else listenStart(LS.micOk ? 'mic' : 'demo'); }
function setFollow(f) {
  if (!['harmony', 'echo', 'root'].includes(f)) return;
  SET.follow = f; if (f !== 'echo') { for (const v of voices) v.echo = null; LS.echoV = null; }
  caption({ harmony: 'harmonize: the chord moves to fit whatever is sung.', echo: 'echo: a voice sings the note back, nudged onto the nearest valley floor.', root: 'be the root: every held note becomes the 1/1.' }[f], 3200);
  persistSoon(); syncUI();
}
function listenTick(dt) {
  if (!entered) return;
  if (!LS.autoAt) LS.autoAt = t + 24;
  if (REEL.on) LS.autoAt = Math.max(LS.autoAt, t + 30);   // the hummer waits until the reel is over, and a while after
  // AND SO 7: the demo hummer no longer joins on its own (it sings a little out of tune on purpose, which was the point and also the problem)
  if (SET.autoHum && !LS.autoDone && autoOn && t > LS.autoAt && !LS.src && !round && !era && !paused && !muted && !JAM.on) { LS.autoDone = true; if (!LS.used) listenStart('demo', true); }
  for (let i = LS.trail.length - 1; i >= 0; i--) { const p = LS.trail[i]; p.life -= dt * 0.75; p.y -= 26 * S * dt; if (p.life <= 0) LS.trail.splice(i, 1); }
  LS.show += ((LS.src ? 1 : 0) - LS.show) * (1 - Math.exp(-dt * 4));
  if (LS.selfF.length && LS.selfF[0][1] < t) LS.selfF.shift();
  if (!LS.src || !A.ac || paused) return;
  if (LS.src === 'demo') humTick();
  if (t >= LS.nextT) { LS.nextT = t + 0.04; analyze(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && LS.src === 'mic') listenStop(); });

// ---------- what the ear shows ----------
function drawListen() {
  if (LS.show < 0.01 && !LS.trail.length) return;
  const a = Math.max(LS.show, 0.3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of LS.trail) { if (p.x < VIEW.x0 || p.x > VIEW.x1) continue; ctx.fillStyle = `rgba(255,240,210,${0.32 * p.life * a})`; ctx.beginPath(); ctx.arc(xToS(p.x), p.y, 1.8 * S * p.life + 0.6, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  if (LS.dispX != null && LS.vis > 0.02 && LS.dispX >= VIEW.x0 && LS.dispX <= VIEW.x1) {
    const X = xToS(LS.dispX), Y = LT + 18 * S, k = LS.vis * LS.show, r = (5 + 22 * Math.min(1, LS.rms * 6)) * S;
    ctx.setLineDash([2, 5]); ctx.strokeStyle = `rgba(255,240,210,${0.32 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y + 6); ctx.lineTo(X, LB); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, r * 2.2); g.addColorStop(0, `rgba(255,244,220,${0.75 * k})`); g.addColorStop(1, 'rgba(255,244,220,0)'); ctx.fillStyle = g; ctx.fillRect(X - r * 2.2, Y - r * 2.2, r * 4.4, r * 4.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255,250,240,${0.95 * k})`; ctx.beginPath(); ctx.arc(X, Y, 4.5 * S, 0, TAU); ctx.fill();
    const nl = nearestLab(relCents(LS.fi)), dv = Math.abs(nl.dev) < 0.5 ? '' : ` ${nl.dev > 0 ? '+' : '−'}${Math.abs(nl.dev).toFixed(0)}¢`;
    ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,244,224,${0.9 * k})`; ctx.font = fnt(phone ? 11.5 : 12, 's', 'italic');
    ctx.fillText(`${LS.src === 'demo' ? 'hummer' : 'you'} · ${nl.lab}${dv}`, X, Y - 12 * S);
    ctx.fillStyle = `rgba(234,220,198,${0.55 * k})`; ctx.font = fnt(9.5, 'm'); ctx.fillText(`${LS.f.toFixed(1)} Hz`, X, Y + 18 * S);
  }
  ctx.restore();
}
function listenUI() {
  const s = LS.src;
  $('lDemo').classList.toggle('on', s === 'demo'); $('lMic').classList.toggle('on', s === 'mic'); $('lStop').classList.toggle('hidden', !s);
  document.querySelectorAll('#lFollow .pill').forEach(b => b.classList.toggle('on', b.dataset.fl === SET.follow));
  const lab = s === 'mic' ? '◉ mic' : s === 'demo' ? '◉ hummer' : '◎ listen';
  $('bListen').textContent = lab;
  if (s && $('lNote').textContent.startsWith('asking')) $('lNote').textContent = s === 'mic' ? 'listening on this page. nothing is recorded or sent. headphones help it hear only you.' : 'the demo hummer is singing, a little out of tune on purpose.';
}
