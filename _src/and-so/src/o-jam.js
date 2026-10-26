// ===== the jam: a play-along band, after Jamey Aebersold's records, in tunings a piano can't play =====
// Aebersold's Play-A-Longs (from 1967; more than 130 volumes) are a rhythm section and a chord chart with the melody
// left out for you, piano and bass on opposite channels. Here the band plays in 7-limit just intonation or 31-EDO:
// the voices on the terrain comp, a bass walks on the right, a ride cymbal swings, and the bird is the horn that
// trades phrases with you. You play the pad (or the home row, or the sky harp).
const JI_PAD = [[1, 1, '1'], [9, 8, '2'], [7, 6, '♭3', 1], [6, 5, '♭3', 1], [5, 4, '3'], [4, 3, '4'], [7, 5, '♭5', 1], [3, 2, '5'], [5, 3, '6'], [7, 4, '♭7', 1], [9, 5, '♭7', 1], [2, 1, '1'], [9, 4, '2'], [7, 3, '♭3', 1], [5, 2, '3']]
  .map(([p, q, deg, b]) => ({ r: p / q, lab: `${p}/${q}`, deg, blue: !!b }));
const E31_PAD = [[0, '1'], [5, '2'], [8, '♭3', 1], [10, '3'], [13, '4'], [15, '♭5', 1], [18, '5'], [23, '6'], [25, '♭7', 1], [26, '♭7'], [28, '7'], [31, '1'], [36, '2'], [39, '♭3', 1], [41, '3']]
  .map(([s, deg, b]) => ({ r: E31(s), lab: `${s % 31}\\31`, deg, blue: !!b }));
const H7 = [1, 5 / 4, 3 / 2, 7 / 4], W7 = [1, E31(10), E31(18), E31(25)];
const JCH = {
  I7: { sym: 'I⁷', root: 1, tones: H7, name: '4:5:6:7 on 1/1' },
  IV7: { sym: 'IV⁷', root: 4 / 3, tones: H7, name: '4:5:6:7 on 4/3' },
  V7: { sym: 'V⁷', root: 3 / 2, tones: H7, name: '4:5:6:7 on 3/2' },
  I6: { sym: 'I⁶', root: 1, tones: [1, E31(10), E31(18), E31(23)], name: '0 · 10 · 18 · 23 of 31' },
  VI7: { sym: 'VI⁷', root: E31(23), tones: W7, name: '0 · 10 · 18 · 25 on step 23' },
  II7: { sym: 'II⁷', root: E31(5), tones: W7, name: '0 · 10 · 18 · 25 on step 5' },
  V7w: { sym: 'V⁷', root: E31(18), tones: W7, name: '0 · 10 · 18 · 25 on step 18' }
};
const JSESS = {
  1: { stone: 'jam1', name: 'One chord', mode: 'just', bpm: 96, pad: JI_PAD, semi: 16 / 15, two: 9 / 8, six: 5 / 3, form: ['I7', 'I7', 'I7', 'I7'], sets: 6,
    line: 'one harmonic seventh chord, 4:5:6:7. the horn plays two bars, you answer in the next two.' },
  2: { stone: 'jam2', name: 'Twelve bars', mode: 'just', bpm: 112, pad: JI_PAD, semi: 16 / 15, two: 9 / 8, six: 5 / 3, form: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], sets: 3,
    line: 'a quick-change blues with 4:5:6:7 on 1/1, 4/3 and 3/2. trade twos with the horn.' },
  3: { stone: 'jam3', name: 'The turnaround', mode: 'tet31', bpm: 126, pad: E31_PAD, semi: E31(3), two: E31(5), six: E31(23), form: ['I6', 'VI7', 'II7', 'V7w'], sets: 8,
    line: 'the ragtime turnaround in 31 equal steps. every seventh sits 1.1¢ under barbershop’s 7/4.' }
};
const JAM = { on: false, sess: 1, S: null, bpm: 96, bar: -1, bi: 0, chorus: 0, chord: null, keyF: 130.81, padF: 261.63, barT0: 0, beat: 0.6, keys: [], held: new Map(),
  score: 0, notes: 0, good: 0, cNotes: 0, cGood: 0, cAns: 0, answered: 0, blues: new Set(), call: null, resp: [], phase: '', uiQ: [], birdQ: [], last: null, walk: [], comp: [], compPat: -1,
  ending: false, endAt: 0, prev: null, switching: false };
const jamOpen = n => { const S = JSESS[n]; if (!S) return false; const st = STONE.get(S.stone); return !st || stoneOpen(st); };

function jamStart(n) {
  if (!entered || era || !JSESS[n]) return;
  if (!jamOpen(n)) { const st = STONE.get(JSESS[n].stone); caption(`${JSESS[n].name} opens at ${st.need} nougats. the jar has ${GAME.nougats}.`, 2800); return; }
  if (JAM.on) jamStop(true);
  if (round) skipRound(); if (rail) stopRail(false); pump = null;
  if (LS.src) listenStop();
  const S = JSESS[n];
  JAM.prev = { mode: M.key, rhy: rhy.on, tease: SET.tease };
  JAM.S = S; JAM.sess = n; JAM.bpm = S.bpm;
  if (M.key !== S.mode) { JAM.switching = true; setMode(S.mode, true); JAM.switching = false; }
  JAM.keyF = fold(fRoot, 2, 98); JAM.padF = fold(JAM.keyF, 2, 220);
  SET.tease = 0.08;
  Object.assign(JAM, { on: true, bar: -1, bi: 0, chorus: 0, score: 0, notes: 0, good: 0, cNotes: 0, cGood: 0, cAns: 0, answered: 0, call: null, resp: [], phase: '', last: null, ending: false, endAt: 0, compPat: -1 });
  JAM.blues.clear(); JAM.uiQ.length = 0; JAM.birdQ.length = 0; bird.notes.length = 0;
  rhy.nextT = 0; rhy.step = 0; rhy.bar = -1;
  for (let g = 0; g < 4 && voices.filter(v => v.wT > 0).length < 4; g++) if (!addVoice(rand(300, XMAX - 300), { temp: 0 })) break;
  jamChange(S.form[0]);
  JAM.walk = jamWalk(0); JAM.comp = [];
  jamPadBuild(); jamUI(true);
  $('jam').classList.add('on'); $('jam').setAttribute('aria-hidden', 'false'); document.body.classList.add('jamming');
  resize();
  caption(`${S.name}: ${S.line}`, 4400, 'music');
  discover('x-jam'); jlog(`jam: ${S.name}`); syncUI();
}
function jamStop(quiet) {
  if (!JAM.on) return;
  JAM.on = false; jamReleaseAll();
  const P = JAM.prev || {};
  if (P.tease != null) SET.tease = P.tease;
  rhy.on = P.rhy != null ? P.rhy : rhy.on; rhy.nextT = 0; rhy.bar = -1; rhy.base = null;
  for (const v of voices) { v.target = null; v.locked = false; v.temp = Math.max(v.temp, 0.1); }
  $('jam').classList.remove('on'); $('jam').setAttribute('aria-hidden', 'true'); document.body.classList.remove('jamming');
  if (P.mode && P.mode !== M.key && MODES[P.mode]) setMode(P.mode, true);
  GAME.jamBest = Math.max(GAME.jamBest, JAM.score);
  resize();
  if (!quiet) caption(JAM.notes ? `the band packs up. ${JAM.notes} notes, ${JAM.good} on the changes, ${JAM.blues.size} kinds of blue, ${JAM.answered} answers. best ${GAME.jamBest}.` : 'the band packs up.', 4600);
  persistSoon(); jlog(`jam over: ${JAM.score}`); syncUI();
}

// ---------- the changes ----------
function jamChange(id) {
  const C = JCH[id]; if (!C) return;
  JAM.chord = Object.assign({ id }, C);
  const rootF = JAM.keyF * C.root;
  fRoot = fold(rootF, 2, 98); audio.setRoot(fRoot); rootFlash = 0.7;
  setChordTargets(rootF, C.tones.slice(1).concat([2]));   // the third, fifth, seventh and octave: the bass has the root
  for (const v of voices) if (v.target != null) v.approachUntil = 0;
  jamPadRoles();
}
const jamCents = (f, rootF) => { const c = 1200 * Math.log2(f / rootF); return ((c % 1200) + 1200) % 1200; };
function jamRole(key) {
  const C = JAM.chord; if (!C) return 'scale';
  const rel = jamCents(JAM.padF * key.r, JAM.keyF * C.root);
  const ct = C.tones.some(r => { const c = jamCents(r, 1), d = Math.abs(rel - c); return Math.min(d, 1200 - d) < 7; });
  return ct ? 'chord' : key.blue ? 'blue' : 'scale';
}
function jamPadRoles() { const els = $('jamKeys').children; JAM.keys.forEach((k, i) => { if (els[i]) els[i].dataset.role = jamRole(k); }); }

// ---------- the band ----------
function jamBar(t0) {
  const S = JAM.S; if (!S) return;
  JAM.bar++; JAM.barT0 = t0; JAM.beat = 60 / JAM.bpm;
  const L = S.form.length, bi = JAM.bar % L;
  if (JAM.bar > 0 && bi === 0) jamChorusEnd();
  if (JAM.ending) return;
  if (JAM.chorus >= S.sets && bi === 0) { jamEnding(t0); return; }
  const id = S.form[bi]; if (!JAM.chord || JAM.chord.id !== id) jamChange(id);
  JAM.walk = jamWalk(bi); JAM.comp = jamCompFigure(bi % 4 < 2 && JAM.bar >= 4);
  const seg = bi % 4;
  if (seg === 0) { jamJudge(); if (JAM.bar >= 4) jamCall(t0); else JAM.call = null; }
  JAM.uiQ.push({ t: t0, bi, phase: !JAM.call ? '' : seg < 2 ? 'call' : 'you' });
}
function jamStep(i, t0, n, spb) {
  if (!JAM.S || JAM.ending) return;
  const beat = (i / n) | 0, sub = i % n, lv = clamp(dyn, 0.55, 1.05);
  if (sub === 0) ride(t0, (beat % 2 ? 0.8 : 1) * lv);
  if (sub === 2 && beat % 2 === 1) ride(t0, 0.55 * lv);
  if (sub === 0 && beat % 2 === 1) chick(t0, lv);
  if (sub === 0) kick(t0, 0.14 * lv);
  if (sub === 2 && Math.random() < (beat === 3 ? 0.35 : 0.14)) snare(t0, rand(0.1, 0.22) * lv);
  if (sub === 0 && JAM.walk[beat]) jamBass(t0, JAM.walk[beat], 0.95 * lv, spb * n * 0.94);
  for (const c of JAM.comp) if (c[0] === i) jamCompHit(t0, c[1] * lv);
  // the change is anticipated on the last eighth of the bar, the way a pianist pushes it
  if (i === 4 * n - 1) { const nb = (JAM.bar + 1) % JAM.S.form.length, id = JAM.S.form[nb]; if (JAM.chord && id !== JAM.chord.id) jamChange(id); }
}
function ride(t0, v) { if (muted || !A.drumBus) return; nz(t0, 0.46, 'bandpass', 5400, 2.4, 0.03 * v); nz(t0, 0.025, 'highpass', 9000, 0.7, 0.018 * v); }
function chick(t0, v) { if (muted || !A.drumBus) return; nz(t0, 0.04, 'bandpass', 2700, 1.3, 0.028 * v); }
function jamBass(t0, f, v, dur) {
  if (!A.ac || muted || v <= 0) return;
  const ac = A.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = OUT(f); o2.type = 'sine'; o2.frequency.value = OUT(f); g2.gain.value = 0.7;
  lp.type = 'lowpass'; lp.Q.value = 0.9; lp.frequency.setValueAtTime(1100, t0); lp.frequency.exponentialRampToValueAtTime(340, t0 + 0.22);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.26 * v, t0 + 0.007); g.gain.exponentialRampToValueAtTime(0.11 * v, t0 + 0.2); g.gain.setTargetAtTime(0.0001, t0 + dur * 0.9, 0.05);
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = 0.55; g.connect(p); p.connect(A.drumBus); } else g.connect(A.drumBus);
  o.start(t0); o2.start(t0); o.stop(t0 + dur + 0.5); o2.stop(t0 + dur + 0.5);
}
// a walking line: root on one, chord tones or a step in the middle, and the fourth beat leans into the next root
function jamWalk(bi) {
  const S = JAM.S, C = JAM.chord || JCH[S.form[bi]], nid = S.form[(bi + 1) % S.form.length];
  const R = fold(JAM.keyF * C.root, 2, 62), N = fold(JAM.keyF * JCH[nid].root, 2, 62), [, t3, t5, t7] = C.tones;
  const pats = [[1, t3, t5], [1, S.two, t3], [1, t5, S.six], [2, t7, t5], [1, t5, 2], [1, t3, S.two]];
  const out = pats[(Math.random() * pats.length) | 0].map(r => R * r), prev = out[2];
  const cands = [N * S.semi, N / S.semi, N * S.semi * 2, N / S.semi * 2, N * S.semi / 2].filter(f => f > 52 && f < 270);
  out.push(cands.sort((a, b) => Math.abs(Math.log(a / prev)) - Math.abs(Math.log(b / prev)))[0] || N);
  return out;
}
// comping: Charleston, two and four, the and of one and three, a push into the next bar, or space while the horn talks
const COMPS = [[[0, 1], [5, 0.8]], [[3, 0.8], [9, 0.8]], [[2, 0.75], [8, 0.8]], [[5, 0.7], [11, 0.9]], [[2, 0.7], [5, 0.7], [11, 0.8]], [[0, 0.9], [8, 0.7]]];
function jamCompFigure(sparse) {
  if (sparse) return Math.random() < 0.5 ? [[0, 0.75]] : [[3, 0.6]];
  let k; do { k = (Math.random() * COMPS.length) | 0; } while (k === JAM.compPat && COMPS.length > 1);
  JAM.compPat = k; return COMPS[k];
}
function jamCompHit(t0, amt) { liveSorted().forEach((v, k) => audio.pluck(v, (0.95 - 0.06 * k) * amt, 0.34, t0 + k * 0.011)); }
function jamEnding(t0) {
  JAM.ending = true; JAM.call = null;
  jamChange(JAM.S.form[0]);   // already anticipated on the last eighth, so the voices are home by the downbeat
  liveSorted().forEach((v, k) => audio.pluck(v, 1.3, 1.6, t0 + k * 0.03));
  jamBass(t0, fold(JAM.keyF, 2, 62), 1, 2.4); kick(t0, 0.5); nz(t0, 2.4, 'highpass', 3800, 0.5, 0.05);
  JAM.endAt = t + Math.max(0, t0 - aNow()) + 2.8;
  JAM.uiQ.push({ t: t0, bi: 0, phase: 'end' });
}

// ---------- trading with the horn ----------
const CALL_RHY = [[0.667, 1, 1.667, 2], [0, 0.667, 1.667, 3], [0.667, 1.667, 2, 2.667, 3.333], [0, 1, 1.667, 2.333, 4], [1.667, 2, 2.667, 3, 4.667], [0, 0.667, 1, 2]];
function jamCall(t0) {
  const rhy0 = CALL_RHY[(Math.random() * CALL_RHY.length) | 0], n = Math.min(12, JAM.keys.length), pool = [];
  for (let k = 0; k < n; k++) { const r = jamRole(JAM.keys[k]); pool.push(r === 'chord' ? 3 : r === 'blue' ? 2 : 1); }
  let k = 4 + ((Math.random() * 5) | 0); const notes = [];
  rhy0.forEach((b, j) => {
    let best = k, bs = -1;
    for (const d of [-2, -1, 1, 2, 0]) { const kk = clamp(k + d, 0, n - 1), s = pool[kk] * (j === rhy0.length - 1 && pool[kk] < 3 ? 0.2 : 1) + Math.random() * 1.6; if (s > bs) { bs = s; best = kk; } }
    k = best; notes.push({ k, b });
  });
  JAM.call = { notes, contour: notes.slice(1).map((x, j) => Math.sign(x.k - notes[j].k)) }; JAM.resp = [];
  notes.forEach((x, j) => {
    const f1 = JAM.padF * JAM.keys[x.k].r * 2, f0 = f1 * Math.pow(2, -(JAM.keys[x.k].blue ? 55 : 30) / 1200), when = t0 + x.b * JAM.beat, last = j === notes.length - 1;
    audio.birdAt(f0, f1, 0.05, last ? 0.7 : 0.3, 0.45, 0.034, when);
    JAM.birdQ.push({ t: when, x: W * (0.24 + 0.06 * j) + rand(-12, 12), y: clamp(LT * (0.75 - 0.045 * x.k), TOPH + 40, LT - 50) });
  });
}
function jamJudge() {
  const c = JAM.call, r = JAM.resp; JAM.call = null; JAM.resp = [];
  if (!c || r.length < 2) return;
  const rc = r.slice(1, c.contour.length + 1).map((x, j) => Math.sign(x.k - r[j].k)), m = Math.min(rc.length, c.contour.length, 3);
  let same = 0; for (let j = 0; j < m; j++) if (rc[j] === c.contour[j]) same++;
  if (m >= 1 && same === m) { JAM.score += 6; JAM.cAns++; JAM.answered++; jamFloat(r[0].k, 'answered', 'chord'); discover('x-call'); }
  else if (r.length >= 3) { JAM.score += 2; jamFloat(r[0].k, 'an answer', 'scale'); }
}
function jamChorusEnd() {
  jamJudge(); JAM.chorus++;
  if (JAM.cNotes >= 6 && JAM.cGood >= 4) {
    const r = $('jam').getBoundingClientRect();
    nougat(1 + (JAM.cAns ? 1 : 0), r.left + r.width / 2, r.top, `a chorus of ${JAM.S.name.toLowerCase()}`);
    discover('x-chorus');
  }
  JAM.cNotes = JAM.cGood = JAM.cAns = 0;
}

// ---------- you: the pad, the home row, the sky harp ----------
function jamPadBuild() {
  const pad = $('jamKeys'); pad.textContent = '';
  JAM.keys = JAM.S.pad.slice(0, W < 560 ? 12 : JAM.S.pad.length);
  JAM.keys.forEach((key, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'jk'; b.dataset.k = k;
    b.setAttribute('aria-label', `${key.lab}, ${key.deg}${key.blue ? ', a blue note' : ''}`);
    const r = document.createElement('b'); r.textContent = key.lab; const d = document.createElement('small'); d.textContent = key.deg;
    b.appendChild(r); b.appendChild(d);
    b.addEventListener('click', e => { if (e.detail !== 0) return; jamNoteOn('click', k, 0.85); setTimeout(() => jamNoteOff('click'), 380); });
    pad.appendChild(b);
  });
  jamPadRoles();
}
function jamVoice(key, f, vel, k) {
  const ac = A.ac, now = ac.currentTime, g = ac.createGain(), trem = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.09 * vel, now + 0.008); g.gain.setTargetAtTime(0.045 * vel, now + 0.02, 0.32); g.gain.setTargetAtTime(0.0001, now + 2.6, 1.1);
  lfo.frequency.value = 5.3; lg.gain.value = 0.26; trem.gain.value = 0.74; lfo.connect(lg); lg.connect(trem.gain); lfo.start(now);
  g.connect(trem);
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp((k / Math.max(1, JAM.keys.length - 1) - 0.5) * 0.9, -0.45, 0.45); trem.connect(p); p.connect(A.chimeBus); } else trem.connect(A.chimeBus);
  const osc = [[1, 1, 'sine'], [4, 0.09, 'sine'], [2, 0.07, 'triangle']].map(([m, a, ty]) => {
    const o = ac.createOscillator(), ga = ac.createGain(), f1 = OUT(f) * m; o.type = ty;
    if (key.blue) { o.frequency.setValueAtTime(f1 * Math.pow(2, -28 / 1200), now); o.frequency.exponentialRampToValueAtTime(f1, now + 0.075); } else o.frequency.value = f1;
    ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(now); return { o, m };
  });
  return { g, osc, lfo };
}
function jamNoteOn(id, k, vel) {
  if (!JAM.on || !A.ac) return;
  const key = JAM.keys[k]; if (!key) return;
  jamNoteOff(id);
  if (A.ac.state === 'suspended') A.ac.resume();
  const f = JAM.padF * key.r, h = muted ? { g: null, osc: [], lfo: null } : jamVoice(key, f, vel, k);
  h.k = k; JAM.held.set(id, h);
  jamScore(k, f, aNow(), false); jamKeyFlash(k, true);
  lastUserT = t; userIdleUntil = t + 8;
}
function jamGlide(id, k) {
  const h = JAM.held.get(id); if (!h || h.k === k || !JAM.keys[k]) return;
  const f = JAM.padF * JAM.keys[k].r, now = aNow();
  h.osc.forEach(x => x.o.frequency.setTargetAtTime(OUT(f) * x.m, now, 0.035));
  jamKeyFlash(h.k, false); h.k = k; jamKeyFlash(k, true); jamScore(k, f, now, true);
}
function jamNoteOff(id) {
  const h = JAM.held.get(id); if (!h) return; JAM.held.delete(id); jamKeyFlash(h.k, false);
  if (!h.g || !A.ac) return;
  const now = A.ac.currentTime; glide(h.g.gain, 0.0001, 0.09); h.osc.forEach(x => x.o.stop(now + 0.8)); h.lfo.stop(now + 0.8);
}
function jamReleaseAll() { [...JAM.held.keys()].forEach(jamNoteOff); }
function jamKeyFlash(k, on) { const el = $('jamKeys').children[k]; if (el) el.classList.toggle('down', on || [...JAM.held.values()].some(h => h.k === k)); }
function jamScore(k, f, when, slide) {
  const key = JAM.keys[k], C = JAM.chord; if (!key || !C || JAM.ending) return;
  const role = jamRole(key), ph = ((((when + 0.012 - JAM.barT0) / JAM.beat) % 1) + 1) % 1, pocket = ph < 0.11 || ph > 0.9 || Math.abs(ph - 2 / 3) < 0.09;
  let pts = role === 'scale' ? 1 : 2, tag = role === 'chord' ? key.lab : role === 'blue' ? `blue ${key.lab}` : '';
  if (pocket && !slide) pts += 1;
  const L = JAM.last;
  if (L && when - L.when < 0.7 && L.k !== k && JAM.keys[L.k] && JAM.keys[L.k].deg === '♭3' && key.deg === '3' && JAM.keys[L.k].r < key.r) { pts += 2; tag = 'the blue slur'; discover('x-slur'); }
  if (key.blue) { JAM.blues.add(key.lab); discover('x-blue'); if (JAM.blues.size >= 4) discover('x-blues4'); }
  if (!slide) { JAM.notes++; JAM.cNotes++; if (role === 'chord' || pts >= 3) { JAM.good++; JAM.cGood++; } if (JAM.phase === 'you') JAM.resp.push({ k, when }); }
  JAM.score += pts; GAME.score += pts; JAM.last = { k, when };
  jamFloat(k, `+${pts}${tag ? ' ' + tag : ''}`, role);
}
let jamScoreT = 0;
function jamFloat(k, txt, kind) {
  const host = $('jamFloats'), key = $('jamKeys').children[k]; if (!host || !key) return;
  const r = key.getBoundingClientRect(), hr = host.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'jf jf-' + kind; s.textContent = QUIET() ? '' : txt; s.style.left = (r.left - hr.left + r.width / 2) + 'px';
  host.appendChild(s); setTimeout(() => s.remove(), 1100);
  clearTimeout(jamScoreT); jamScoreT = setTimeout(() => { $('jamScore').textContent = String(JAM.score); scoreUI(); }, 60);
}
const JAM_ROW = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"], JAM_TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
function jamKey(e, down) {
  if (!JAM.on || e.metaKey || e.ctrlKey || e.altKey) return false;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (down) jamStop(false); return true; }
  let idx = JAM_ROW.indexOf(k); if (idx < 0) { const j = JAM_TOP.indexOf(k); if (j >= 0) idx = j + 5; }
  if (idx < 0 || idx >= JAM.keys.length) return false;
  e.preventDefault(); if (e.repeat) return true;
  if (down) jamNoteOn('key:' + k, idx, 0.9); else jamNoteOff('key:' + k);
  return true;
}
// the sky harp plays the jam's scale while the band is on
function jamHarpPool() { return JAM.keys.map(k => JAM.padF * k.r); }
function jamHarp(idx, py) {
  if (!JAM.keys[idx]) return;
  const br = clamp(1 - (py - TOPH) / Math.max(1, LT - TOPH), 0, 1);
  jamNoteOn('harp', idx, 0.55 + 0.4 * br); setTimeout(() => { const h = JAM.held.get('harp'); if (h && h.k === idx) jamNoteOff('harp'); }, 260);
}

// ---------- the panel ----------
function jamUI(full) {
  const S = JAM.S; if (!S) return;
  if (full) {
    $('jamTitle').textContent = S.name;
    const ch = $('jamChart'); ch.textContent = '';
    S.form.forEach(id => { const c = document.createElement('span'); c.className = 'jb'; c.textContent = JCH[id].sym; ch.appendChild(c); });
    document.querySelectorAll('[data-jam]').forEach(b => { const n = +b.dataset.jam; b.classList.toggle('on', n === JAM.sess && JAM.on); b.disabled = !jamOpen(n); });
  }
  const cells = $('jamChart').children; for (let i = 0; i < cells.length; i++) cells[i].classList.toggle('on', i === JAM.bi);
  const ph = $('jamPhase'); ph.dataset.phase = JAM.phase || '';
  ph.textContent = JAM.phase === 'call' ? 'the horn' : JAM.phase === 'you' ? 'your answer' : JAM.phase === 'end' ? 'the last chord' : 'play anything';
  $('jamChord').textContent = JAM.chord ? `${JAM.chord.sym} · ${JAM.chord.name}` : '';
  $('jamSet').textContent = `chorus ${Math.min(JAM.chorus + 1, S.sets)} of ${S.sets}`;
  $('jamScore').textContent = String(JAM.score);
}
function jamTick() {
  if (!JAM.on) return;
  const now = aNow();
  let ui = false;
  while (JAM.uiQ.length && JAM.uiQ[0].t <= now + 0.012) { const q = JAM.uiQ.shift(); JAM.phase = q.phase; JAM.bi = q.bi; ui = true; }
  if (ui) jamUI(false);
  while (JAM.birdQ.length && JAM.birdQ[0].t <= now) { const b = JAM.birdQ.shift(); bird.tx = b.x; bird.ty = b.y; bird.flash = 1; bird.lastNote = t; if (bird.x < -50) { bird.x = b.x; bird.y = b.y; } }
  if (JAM.ending && JAM.endAt && t > JAM.endAt) jamStop(false);
}
// the pad takes a strip at the bottom; the terrain moves up to make room
const jamPadH = () => (JAM.on ? Math.round(phone ? clamp(H * 0.3, 170, 290) : clamp(H * 0.2, 120, 230)) : 0);
function jamPointer() {
  const pad = $('jamKeys'), keyAt = (x, y) => { const el = document.elementFromPoint(x, y), b = el && el.closest && el.closest('.jk'); return b && pad.contains(b) ? +b.dataset.k : -1; };
  pad.addEventListener('pointerdown', e => {
    const k = keyAt(e.clientX, e.clientY); if (k < 0) return;
    e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (er) {}
    const r = pad.children[k].getBoundingClientRect(), vel = 0.55 + 0.45 * clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1);
    jamNoteOn('p' + e.pointerId, k, vel);
  });
  pad.addEventListener('pointermove', e => { if (!JAM.held.has('p' + e.pointerId)) return; const k = keyAt(e.clientX, e.clientY); if (k >= 0) jamGlide('p' + e.pointerId, k); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => pad.addEventListener(n, e => jamNoteOff('p' + e.pointerId)));
}
