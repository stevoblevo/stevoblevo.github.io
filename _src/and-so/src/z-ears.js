// ===== Lil Elphan-tea: hum a note, sing or pick it back. Chip, Cuppa, and Nibs are tossable stand-ins.
// Painted Chip (KEEP 3bc23121) is not in the repo. Lil's pictures, including 628fd459, are on hold with Cheer.
var EARS = { open: false, hz: 0, last: -1, streak: 0, phase: 'idle', mic: null, bits: [], listenUntil: 0, nibsOut: false, nibsBack: 0, pets: {}, drag: null, demo: false };

var EARS_NOTES = [
  { name: 'do', hz: 261.63 },
  { name: 're', hz: 293.66 },
  { name: 'mi', hz: 329.63 },
  { name: 'fa', hz: 349.23 },
  { name: 'sol', hz: 392.00 },
  { name: 'la', hz: 440.00 }
];

function earsAc() {
  if (typeof unlockAudio === 'function') unlockAudio();
  if (!A.ac && typeof audio !== 'undefined' && audio.init) audio.init();
  return A.ac || null;
}
function earsBus() { return (A.chimeBus || A.bus || (A.ac && A.ac.destination)); }
function earsSay(line, speak) {
  const el = $('earsSay'); if (el) el.textContent = line;
  if (typeof caption === 'function') caption(line, 4600);
  if (!speak || muted) return;
  const R = window.Storeybrook && Storeybrook.read;
  if (R && R.supported && R.speak) R.speak(line, { rate: 0.96, pitch: 1.04 });
}
function earsSung(hz, when, dur) {
  const ac = earsAc(); if (!ac || muted || !(hz > 0)) return;
  const o = ac.createOscillator(), g = ac.createGain();
  const flat = hz * Math.pow(2, -0.55 / 12);
  o.type = 'sine';
  o.frequency.setValueAtTime(flat, when);
  o.frequency.exponentialRampToValueAtTime(hz, when + Math.min(0.5, dur * 0.62));
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.11, when + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(earsBus());
  o.start(when); o.stop(when + dur + 0.06);
}
function earsHum(hz, slow) {
  const ac = earsAc(); if (!ac) return;
  const dur = slow ? 1.7 : 0.95;
  earsSung(hz || EARS.hz, ac.currentTime + 0.05, dur);
}
function earsLoo(hz) {
  const ac = earsAc(); if (!ac || !(hz > 0)) return;
  const t0 = ac.currentTime + 0.04;
  earsSung(hz, t0, 0.32);
  earsSung(hz, t0 + 0.38, 0.42);
}
function earsLa(hz) {
  const ac = earsAc(); if (!ac || !(hz > 0)) return;
  const t0 = ac.currentTime + 0.06;
  [0, 4, 7].forEach((semi, i) => {
    const f = hz * Math.pow(2, semi / 12);
    earsSung(f, t0 + i * 0.34, i === 2 ? 0.7 : 0.3);
  });
}
function earsWobble(hz) {
  const ac = earsAc(); if (!ac || muted || !(hz > 0)) return;
  const when = ac.currentTime + 0.04, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(hz * Math.pow(2, -0.35 / 12), when);
  lfo.frequency.setValueAtTime(6.2, when);
  depth.gain.setValueAtTime(hz * 0.028, when);
  lfo.connect(depth); depth.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.09, when + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
  o.connect(g); g.connect(earsBus());
  o.start(when); lfo.start(when); o.stop(when + 0.62); lfo.stop(when + 0.62);
}
function earsToot() {
  const ac = earsAc(); if (!ac || muted) return;
  const when = ac.currentTime + 0.02;
  [1, 2, 3].forEach((m, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(196 * m, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.07 / m, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    o.connect(g); g.connect(earsBus());
    o.start(when); o.stop(when + 0.32);
  });
}
function earsTink() {
  const ac = earsAc(); if (!ac || muted) return;
  const when = ac.currentTime + 0.01, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1760, when);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.05, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
  o.connect(g); g.connect(earsBus());
  o.start(when); o.stop(when + 0.14);
}
function earsSvg(kind) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 80 64');
  svg.setAttribute('aria-hidden', 'true');
  function sh(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    svg.appendChild(n);
  }
  if (kind === 'lil') {
    sh('ellipse', { cx: '28', cy: '28', rx: '14', ry: '16', fill: '#f3d7ea', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('ellipse', { cx: '52', cy: '28', rx: '14', ry: '16', fill: '#f3d7ea', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('ellipse', { cx: '40', cy: '40', rx: '18', ry: '14', fill: '#f7e7f2', stroke: '#2a211c', 'stroke-width': '1.5' });
    sh('circle', { cx: '40', cy: '28', r: '12', fill: '#f7e7f2', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('circle', { cx: '36', cy: '27', r: '1.3', fill: '#241c16' });
    sh('circle', { cx: '44', cy: '27', r: '1.3', fill: '#241c16' });
    sh('path', { d: 'M40 32 q8 10 2 16', fill: 'none', stroke: '#2a211c', 'stroke-width': '1.6', 'stroke-linecap': 'round' });
  } else if (kind === 'chip') {
    sh('ellipse', { cx: '40', cy: '36', rx: '16', ry: '12', fill: '#e7b23a', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('circle', { cx: '52', cy: '28', r: '8', fill: '#f2d48a', stroke: '#2a211c', 'stroke-width': '1.3' });
    sh('path', { d: 'M28 46 l-4 10 M36 48 l0 10 M46 48 l2 10', fill: 'none', stroke: '#2a211c', 'stroke-width': '1.6', 'stroke-linecap': 'round' });
    sh('path', { d: 'M18 30 h14', fill: 'none', stroke: '#c45b4a', 'stroke-width': '2.2', 'stroke-linecap': 'round' });
  } else if (kind === 'cuppa') {
    sh('path', { d: 'M22 24 h28 l-3 22 a12 8 0 0 1 -22 0 z', fill: '#f7f4ee', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('path', { d: 'M50 30 q10 2 0 14', fill: 'none', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('path', { d: 'M32 16 q2 -6 0 -8 M40 14 q2 -6 0 -8', class: 'ears-steam', fill: 'none', stroke: '#c9b8a4', 'stroke-width': '1.3', 'stroke-linecap': 'round' });
  } else {
    sh('path', { d: 'M18 40 l14 -22 22 8 -8 24 z', fill: '#e7b23a', stroke: '#2a211c', 'stroke-width': '1.4' });
    sh('circle', { cx: '36', cy: '32', r: '2', fill: '#2a211c' });
  }
  return svg;
}
function earsPet(id, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ears-pet pet-' + id;
  b.id = 'earsPet' + id;
  b.setAttribute('aria-label', label);
  b.appendChild(earsSvg(id));
  const host = $('earsPets');
  host.appendChild(b);
  const pet = { id: id, el: b, x: 40, y: 40, vx: 0, vy: 0, hold: false };
  b.addEventListener('pointerdown', e => earsGrab(pet, e));
  if (id === 'cuppa') b.addEventListener('click', () => {
    if (pet.skipClick && performance.now() - pet.skipClick < 450) return;
    earsHum(EARS.hz, true);
  });
  if (id === 'nibs') b.addEventListener('click', () => {
    if (pet.skipClick && performance.now() - pet.skipClick < 450) return;
    if (EARS.nibsOut) earsNibsHome();
  });
  EARS.pets[id] = pet;
  return pet;
}
function earsLayout() {
  const w = window.innerWidth || 800, h = window.innerHeight || 600;
  const phone = document.body.classList.contains('dev-phone');
  const chip = EARS.pets.chip, cup = EARS.pets.cuppa, nibs = EARS.pets.nibs;
  if (!chip) return;
  chip.x = phone ? 18 : w * 0.08; chip.y = h - (phone ? 168 : 96); chip.vx = 0; chip.vy = 0;
  cup.x = phone ? w * 0.5 - 28 : w * 0.22; cup.y = chip.y;
  if (!EARS.nibsOut) { nibs.x = cup.x + 8; nibs.y = cup.y + 6; nibs.el.hidden = true; }
  earsPaint(chip); earsPaint(cup); earsPaint(nibs);
}
function earsPaint(p) {
  const still = document.body.classList.contains('dev-reduce') || (typeof reduceMotion !== 'undefined' && reduceMotion);
  p.el.style.transition = still ? 'none' : '';
  p.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)' + (p.id === 'chip' ? ' rotate(0deg)' : '');
}
function earsGrab(pet, e) {
  if (pet.id === 'nibs' && pet.el.hidden) return;
  pet.hold = true; pet.vx = 0; pet.vy = 0;
  EARS.drag = { pet: pet, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0 };
  try { pet.el.setPointerCapture(e.pointerId); } catch (err) { /* already captured */ }
  e.preventDefault();
}
function earsMove(e) {
  const d = EARS.drag; if (!d) return;
  const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
  d.moved += Math.abs(dx) + Math.abs(dy);
  d.pet.x += dx; d.pet.y += dy; d.lx = e.clientX; d.ly = e.clientY;
  d.pet.vx = dx * 16; d.pet.vy = dy * 16;
  earsPaint(d.pet);
}
function earsDrop() {
  const d = EARS.drag; if (!d) return;
  const pet = d.pet;
  pet.hold = false;
  EARS.drag = null;
  if (d.moved < 10) { pet.vx = 0; pet.vy = 0; return; }
  pet.skipClick = performance.now();
  if (pet.id === 'cuppa' && Math.hypot(pet.vx, pet.vy) > 280) earsNibsPop();
}
function earsNibsPop() {
  const nibs = EARS.pets.nibs, cup = EARS.pets.cuppa;
  if (!nibs || EARS.nibsOut) return;
  EARS.nibsOut = true;
  nibs.el.hidden = false;
  nibs.x = cup.x + 10; nibs.y = cup.y;
  const w = window.innerWidth || 800, h = window.innerHeight || 600;
  const spots = [[w * 0.72, 80], [w * 0.12, h * 0.28], [w * 0.8, h * 0.42], [w * 0.4, 48]];
  const spot = spots[(Math.random() * spots.length) | 0];
  nibs.vx = (spot[0] - nibs.x) * 1.4;
  nibs.vy = (spot[1] - nibs.y) * 1.1;
  nibs.el.classList.add('is-hiding');
  EARS.nibsBack = (typeof t === 'number' ? t : 0) + 4.5;
  earsTink();
}
function earsNibsHome() {
  const nibs = EARS.pets.nibs, cup = EARS.pets.cuppa;
  if (!nibs || !EARS.nibsOut) return;
  EARS.nibsOut = false;
  nibs.el.classList.remove('is-hiding');
  const still = document.body.classList.contains('dev-reduce');
  nibs.x = cup.x + 8; nibs.y = cup.y + 6; nibs.vx = 0; nibs.vy = 0;
  earsPaint(nibs);
  if (still) nibs.el.hidden = true;
  else setTimeout(() => { nibs.el.hidden = true; }, 280);
  earsTink();
}
function earsChipRun() {
  const chip = EARS.pets.chip; if (!chip) return;
  const row = $('earsNotes');
  const r = row ? row.getBoundingClientRect() : { right: (window.innerWidth || 400) - 40, bottom: (window.innerHeight || 600) - 80 };
  const still = document.body.classList.contains('dev-reduce');
  chip.x = Math.max(12, r.right - 36);
  chip.y = Math.min((window.innerHeight || 600) - 72, r.bottom + 8);
  chip.vx = 0; chip.vy = 0;
  if (!still) chip.el.classList.add('is-running');
  earsPaint(chip);
  setTimeout(() => chip.el.classList.remove('is-running'), 700);
}
function earsMark() {
  const box = $('earsStreak');
  if (box) box.textContent = EARS.streak ? (EARS.streak + ' in a row') : '';
  const cup = EARS.pets.cuppa;
  if (cup) cup.el.classList.toggle('is-well', EARS.streak >= 2);
}
function earsRound() {
  if (!EARS.open) return;
  let i = (Math.random() * EARS_NOTES.length) | 0;
  if (i === EARS.last) i = (i + 1) % EARS_NOTES.length;
  EARS.last = i;
  EARS.hz = EARS_NOTES[i].hz;
  EARS.phase = 'listen';
  const say = $('earsSay'); if (say) say.textContent = 'Listen. Then loo-loo it back.';
  document.querySelectorAll('#earsNotes button').forEach(b => b.classList.remove('is-on'));
  earsHum(EARS.hz, false);
  earsChipRun();
  earsMark();
}
function earsJudge(hz) {
  if (!EARS.open || !(EARS.hz > 0) || !(hz > 0)) return;
  const cents = Math.abs(1200 * Math.log(hz / EARS.hz) / Math.LN2);
  earsLoo(hz);
  if (cents <= 50) earsHit();
  else if (cents <= 110) earsNear();
  else earsFar();
}
function earsHit() {
  EARS.streak += 1;
  EARS.phase = 'hit';
  earsLa(EARS.hz);
  earsSay('We did it! My ears are flapping.', true);
  const lil = $('earsLil'); if (lil) lil.classList.add('is-flap');
  setTimeout(() => { if (lil) lil.classList.remove('is-flap'); }, 900);
  if (EARS.streak > 0 && EARS.streak % 5 === 0) earsToot();
  earsMark();
  if (!(typeof DREAM !== 'undefined' && DREAM.on && DREAM.tour === 'ears')) setTimeout(earsRound, 1900);
}
function earsNear() {
  EARS.streak = 0;
  EARS.phase = 'near';
  earsWobble(EARS.hz);
  earsSay('Ooh, so close, my ears heard it wobble. Try again with me?', true);
  earsMark();
  setTimeout(() => { if (EARS.open && EARS.phase === 'near') earsHum(EARS.hz, false); }, 1600);
}
function earsFar() {
  EARS.streak = 0;
  EARS.phase = 'far';
  earsSay('Not that one. Listen once more.', false);
  earsMark();
  setTimeout(() => { if (EARS.open && EARS.phase === 'far') earsHum(EARS.hz, false); }, 900);
}
function earsPick(i) {
  const n = EARS_NOTES[i]; if (!n) return;
  document.querySelectorAll('#earsNotes button').forEach((b, k) => b.classList.toggle('is-on', k === i));
  earsJudge(n.hz);
}
function earsHz(buf, sr) {
  let e = 0;
  for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
  if (Math.sqrt(e / buf.length) < 0.02) return 0;
  const min = Math.max(2, (sr / 900) | 0), max = Math.min((sr / 70) | 0, buf.length - 2);
  let best = 0, corr = 0;
  for (let lag = min; lag <= max; lag++) {
    let c = 0;
    for (let i = 0; i < buf.length - lag; i += 2) c += buf[i] * buf[i + lag];
    if (c > corr) { corr = c; best = lag; }
  }
  return best ? sr / best : 0;
}
function earsSing() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    earsSay('This browser has no microphone. Pick a loo-loo.', false);
    return;
  }
  earsStopMic();
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ac = earsAc(); if (!ac) return;
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    EARS.mic = { stream: stream, an: an, src: src, buf: new Float32Array(2048), hits: [] };
    EARS.phase = 'sing';
    EARS.listenUntil = (typeof t === 'number' ? t : 0) + 3.2;
    const say = $('earsSay'); if (say) say.textContent = 'Sing it. Loo-loo.';
  }).catch(() => earsSay('The microphone stayed quiet. Pick a loo-loo.', false));
}
function earsStopMic() {
  const m = EARS.mic; if (!m) return;
  try { m.stream.getTracks().forEach(tr => tr.stop()); } catch (e) { /* already stopped */ }
  try { m.src.disconnect(); } catch (e2) { /* already disconnected */ }
  EARS.mic = null;
}
function earsMicTick() {
  const m = EARS.mic; if (!m) return;
  m.an.getFloatTimeDomainData(m.buf);
  const hz = earsHz(m.buf, (A.ac && A.ac.sampleRate) || 48000);
  if (hz > 80 && hz < 1000) m.hits.push(hz);
  if (typeof t === 'number' && t >= EARS.listenUntil) {
    const hits = m.hits.slice().sort((a, b) => a - b);
    earsStopMic();
    if (!hits.length) { earsSay('I didn\'t catch a note. Pick a loo-loo, or try the mic again.', false); return; }
    earsJudge(hits[hits.length >> 1]);
  }
}
function earsTick(dt) {
  if (!EARS.open) return;
  earsMicTick();
  const w = window.innerWidth || 800, h = window.innerHeight || 600;
  const still = document.body.classList.contains('dev-reduce');
  Object.keys(EARS.pets).forEach(id => {
    const p = EARS.pets[id];
    if (p.el.hidden || p.hold) return;
    if (still) { p.vx = 0; p.vy = 0; return; }
    p.vy += 1400 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.x < 8) { p.x = 8; p.vx = Math.abs(p.vx) * 0.45; }
    if (p.x > w - 64) { p.x = w - 64; p.vx = -Math.abs(p.vx) * 0.45; }
    if (p.y < 8) { p.y = 8; p.vy = Math.abs(p.vy) * 0.45; }
    if (p.y > h - 72) { p.y = h - 72; p.vy = -Math.abs(p.vy) * 0.35; p.vx *= 0.82; }
    if (p.id === 'chip') p.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(0deg)';
    else earsPaint(p);
    if (Math.hypot(p.vx, p.vy) < 40 && p.y > h - 80) { p.vx = 0; p.vy = 0; }
  });
  if (EARS.nibsOut && typeof t === 'number' && t > EARS.nibsBack) earsNibsHome();
}
function earsBuild() {
  const root = $('ears'); if (!root || root.dataset.built) return;
  root.dataset.built = '1';
  const sheet = document.createElement('div');
  sheet.className = 'ears-sheet';
  const head = document.createElement('div');
  head.className = 'ears-h';
  const title = document.createElement('h2');
  title.textContent = 'Listening';
  const close = document.createElement('button');
  close.type = 'button'; close.id = 'earsClose'; close.textContent = '×'; close.setAttribute('aria-label', 'close listening');
  close.addEventListener('click', earsClose);
  head.appendChild(title); head.appendChild(close);
  const say = document.createElement('p');
  say.id = 'earsSay';
  const stage = document.createElement('div');
  stage.id = 'earsLil'; stage.className = 'ears-lil'; stage.appendChild(earsSvg('lil'));
  const notes = document.createElement('div');
  notes.id = 'earsNotes'; notes.className = 'ears-notes';
  EARS_NOTES.forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = n.name;
    b.setAttribute('aria-label', 'loo-loo ' + n.name);
    b.addEventListener('click', () => earsPick(i));
    notes.appendChild(b);
  });
  const row = document.createElement('div');
  row.className = 'ears-actions';
  const sing = document.createElement('button');
  sing.type = 'button'; sing.id = 'earsSing'; sing.textContent = 'Sing it';
  sing.addEventListener('click', earsSing);
  const again = document.createElement('button');
  again.type = 'button'; again.id = 'earsAgain'; again.textContent = 'Hear it again';
  again.addEventListener('click', () => earsHum(EARS.hz, false));
  const watch = document.createElement('button');
  watch.type = 'button'; watch.id = 'earsWatch'; watch.textContent = 'Watch';
  watch.addEventListener('click', () => { if (typeof dreamStart === 'function') dreamStart('ears'); });
  row.appendChild(sing); row.appendChild(again); row.appendChild(watch);
  const streak = document.createElement('p');
  streak.id = 'earsStreak'; streak.className = 'ears-streak';
  sheet.appendChild(head); sheet.appendChild(stage); sheet.appendChild(say); sheet.appendChild(notes); sheet.appendChild(row); sheet.appendChild(streak);
  root.appendChild(sheet);
  const pets = document.createElement('div');
  pets.id = 'earsPets';
  document.body.appendChild(pets);
  earsPet('chip', 'Chip, the scout. Toss him. He lands on his feet.');
  earsPet('cuppa', 'Cuppa. Tap her to hear the note slower. Toss her and Nibs hops out.');
  earsPet('nibs', 'Nibs. Find him and he clicks back into the cup.');
  window.addEventListener('pointermove', earsMove);
  window.addEventListener('pointerup', earsDrop);
  window.addEventListener('pointercancel', earsDrop);
}
function earsOpen() {
  earsBuild();
  const root = $('ears'); if (!root) return;
  EARS.open = true;
  root.classList.add('on');
  root.setAttribute('aria-hidden', 'false');
  const pets = $('earsPets'); if (pets) pets.hidden = false;
  earsLayout();
  earsRound();
}
function earsClose() {
  EARS.open = false;
  earsStopMic();
  const root = $('ears'); if (root) { root.classList.remove('on'); root.setAttribute('aria-hidden', 'true'); }
  const pets = $('earsPets'); if (pets) pets.hidden = true;
}
window.andsoEars = {
  open: earsOpen, close: earsClose, answer: earsJudge, round: earsRound,
  hz: () => EARS.hz, streak: () => EARS.streak, setStreak: n => { EARS.streak = n; }
};
