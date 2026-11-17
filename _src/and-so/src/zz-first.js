// ===== AND SO 9 · Open Door: first steps for a first visit, and one find a day =====
// First steps is hands-on and short: four things to do, each named after you have done it. Nothing is credited until
// you touch something, Saedo waits, and the band (easy listening) starts when you are through. It can be skipped, it
// never comes back once it is finished or skipped, and ?first=1 shows it again (?first=0 never does).
const FIRST = { on: false, step: -1, touched: false, grabbed: false, released: false, callAt: 0, did: { drag: false, tap: false, move: false, jar: false }, hold: 0, endAt: 0, tick: 0 };
const FIRST_KEY = 'andso:first', TODAY_KEY = 'andso:today';
const FIRST_STEPS = [
  { k: 'drag', say: 'drag a voice up the hill, then let go.', sub: 'it rolls home to the nearest place where the notes agree.', done: 'there. that was a landing.' },
  { k: 'tap', say: 'tap the ground to add a voice.', sub: 'anywhere on the hills. it finds a valley by itself.', done: 'it found its own valley.' },
  { k: 'move', say: '', sub: 'the valleys belong to the chord. change it, and every voice glides home.', done: 'the ground moved, and they all went home.' },
  { k: 'jar', say: 'everything you find drops into the jar.', sub: '', done: '' }
];
function firstWanted() {
  try {
    const q = location.search;
    if (/[?&]first=0\b/.test(q) || MIR.depth > 0 || wantDream || wantPlay) return false;
    if (/[?&]first=1\b/.test(q)) return true;
    return found.size === 0 && !localStorage.getItem(FIRST_KEY);
  } catch (e) { return false; }
}
function firstStart() {
  FIRST.on = true; FIRST.step = -1; FIRST.touched = false; FIRST.grabbed = false; FIRST.released = false;
  for (const k in FIRST.did) FIRST.did[k] = false;
  autoOn = false; flipAt = t + 1e7; nextTryT = t + 1e7; FIRST.callAt = t + 6;
  document.body.classList.add('first'); syncUI();
  setTimeout(() => { if (FIRST.on) firstNext(); }, 1500);
  if (!FIRST.tick) FIRST.tick = setInterval(firstPlace, 120);
  jlog('first steps');
}
function firstNext() {
  if (!FIRST.on) return;
  const i = FIRST_STEPS.findIndex(s => !FIRST.did[s.k]);
  if (i < 0) { firstEnd(false); return; }
  FIRST.step = i;
  const el = $('first'), s = FIRST_STEPS[i]; if (!el) return;
  let say = s.say, sub = s.sub;
  if (s.k === 'move') say = phone ? 'tap “chord” to move the ground.' : 'press “next chord” to move the ground.';
  if (s.k === 'jar') { sub = `${CAT.length} things to find, and the brook opens as it fills. tap the jar.`; FIRST.endAt = t + 16; }
  $('firstN').textContent = `${i + 1} of ${FIRST_STEPS.length}`;
  $('firstSay').textContent = say; $('firstSub').textContent = sub;
  el.classList.remove('ok', 'end'); el.classList.add('on'); firstPlace();
}
// what the game tells first steps: a voice was grabbed, a voice landed, the ground was tapped, the chord moved, the jar opened
function firstEvent(k) {
  if (!FIRST.on) return;
  if (k === 'grab') { FIRST.touched = true; FIRST.grabbed = true; return; }
  if (k === 'release') {   // in the light mood a voice glides home for a few seconds: say so, and wait for it
    if (!FIRST.grabbed || FIRST.did.drag) return;
    FIRST.released = true;
    if (FIRST.step >= 0 && FIRST_STEPS[FIRST.step].k === 'drag') { $('firstSay').textContent = 'now watch it glide home.'; $('firstSub').textContent = ''; }
    clearTimeout(FIRST.hold); FIRST.hold = setTimeout(() => firstEvent('drag'), 7000);
    return;
  }
  if (k === 'land') { if (!FIRST.released || FIRST.did.drag || voices.some(v => v.dragging)) return; k = 'drag'; }
  else if (k === 'next') k = 'move';
  if (k === 'tap') FIRST.touched = true;
  if (!Object.prototype.hasOwnProperty.call(FIRST.did, k) || FIRST.did[k]) return;
  FIRST.did[k] = true;
  const s = FIRST_STEPS[FIRST.step], el = $('first');
  if (!s || s.k !== k || !el) return;   // done ahead of its turn: it is simply not asked for later
  if (s.done) { $('firstSay').textContent = s.done; $('firstSub').textContent = ''; el.classList.add('ok'); }
  clearTimeout(FIRST.hold); FIRST.hold = setTimeout(firstNext, s.done ? 1900 : 250);
}
function firstEnd(skipped) {
  if (!FIRST.on) return;
  FIRST.on = false; FIRST.step = -1; clearTimeout(FIRST.hold); clearInterval(FIRST.tick); FIRST.tick = 0;
  try { localStorage.setItem(FIRST_KEY, skipped ? 'skipped' : 'done'); } catch (e) {}
  document.body.classList.remove('first');
  const el = $('first'), ring = $('firstRing'); if (ring) ring.classList.remove('on');
  autoOn = true; nextAct = t + 6; flipAt = t + 45; nextTryT = t + 40; lastUserT = t; syncUI(); todayPaint();
  if (el) {
    if (skipped) el.classList.remove('on');
    else {
      $('firstN').textContent = 'the way in'; $('firstSay').textContent = 'that is all of it. the rest is yours to find.';
      $('firstSub').textContent = phone ? 'saedo plays along from here. “more” has the tunings, the looks and the field guide.' : 'saedo plays along from here. G opens the gamut: tunings, looks and the field guide.';
      el.classList.add('ok', 'end'); setTimeout(() => el.classList.remove('on'), 8000);
    }
  }
  if (SET.easyStart && !M.easy) setTimeout(() => { if (entered && !M.easy && !round && !JAM.on && !era && !REEL.on) setMode('easy', true); }, skipped ? 700 : 2800);
  jlog(skipped ? 'first steps skipped' : 'first steps done');
}
// a spot of open ground, well away from every voice, for "tap the ground"
function firstGap() {
  const live = voices.filter(v => v.wT > 0).map(v => v.x).sort((a, b) => a - b);
  const lo = VIEW.x0 + (VIEW.x1 - VIEW.x0) * 0.12, hi = VIEW.x0 + (VIEW.x1 - VIEW.x0) * 0.88, xs = [lo, ...live.filter(x => x > lo && x < hi), hi];
  let best = (lo + hi) / 2, gap = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > gap) { gap = xs[i] - xs[i - 1]; best = (xs[i] + xs[i - 1]) / 2; }
  return best;
}
function firstPlace() {
  const ring = $('firstRing'), el = $('first'); if (!ring || !el) return;
  el.style.top = Math.max(150, LT - 16) + 'px';
  if (!FIRST.on || FIRST.step < 0 || el.classList.contains('ok') || !el.classList.contains('on')) { ring.classList.remove('on'); return; }
  const s = FIRST_STEPS[FIRST.step]; let x = -1, y = -1, r = 34, w = 0, h = 0;
  if (s.k === 'drag') {
    const v = (act && act.wT > 0 && act) || voices.find(o => o.wT > 0);
    if (v && !voices.some(o => o.dragging)) {
      const b = ballPos(v); x = b.X; y = b.Y;
      // until it is touched, the ringed voice calls now and then, so the first sound to answer is yours
      if (!FIRST.touched && t > FIRST.callAt) { FIRST.callAt = t + 5.5; try { if (plucky()) audio.pluck(v, 0.75, 0.3, 0); v.flash = 0.7; } catch (e) {} }
    }
  }
  else if (s.k === 'tap') { const v = voices.find(o => o.wT > 0); if (v) { const b = ballPos(Object.assign({}, v, { x: firstGap(), dropping: false })); x = b.X; y = b.Y + 26; r = 28; } }
  else { const e = $(s.k === 'move' ? (phone ? 'dNext' : 'bNext') : 'jar'), q = e && e.getBoundingClientRect(); if (q && q.width) { x = q.left + q.width / 2; y = q.top + q.height / 2; w = q.width + 14; h = q.height + 14; } }
  if (x < 0) { ring.classList.remove('on'); return; }
  if (!w) w = h = 2 * r;
  ring.style.width = w + 'px'; ring.style.height = h + 'px'; ring.style.left = x - w / 2 + 'px'; ring.style.top = Math.max(2, y - h / 2) + 'px'; ring.classList.add('on');
  if (s.k === 'jar' && FIRST.endAt && t > FIRST.endAt) firstEvent('jar');   // nobody is kept waiting at the last step
}
{ const b = $('firstSkip'); if (b) b.addEventListener('click', () => firstEnd(true)); }

// ---------- one find a day: something to look for, a nougat when you find it, another one tomorrow ----------
function todayGet() {
  let day = ''; try { day = new Date().toISOString().slice(0, 10); } catch (e) { return null; }
  let s = null; try { s = JSON.parse(localStorage.getItem(TODAY_KEY) || 'null'); } catch (e) {}
  if (s && s.day === day && CATI.get(s.id)) return s;
  const early = found.size < 12;   // the first days stay in the tunings a newcomer is already in
  let pool = CAT.filter(c => !found.has(c.id) && c.hint && (!early || c.mode === 'just' || c.mode === 'easy'));
  if (!pool.length) pool = CAT.filter(c => !found.has(c.id) && c.hint);
  if (!pool.length) return null;
  let h = 7; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  s = { day, id: pool[h % pool.length].id, done: false };
  try { localStorage.setItem(TODAY_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}
function todayHit(id) {
  if (REEL.on || MIR.depth > 0 || (!entered && !found.size)) return;
  const s = todayGet(); if (!s || s.done || s.id !== id) return;
  s.done = true; try { localStorage.setItem(TODAY_KEY, JSON.stringify(s)); } catch (e) {}
  setTimeout(() => { nougat(1, W / 2, H * 0.4, 'today’s find'); caption('today’s find. there is another one tomorrow.', 3600); todayPaint(); }, 1600);
}
function todayPaint() {
  const s = entered || found.size ? todayGet() : null, e = s && CATI.get(s.id);
  const where = e && e.mode !== 'any' && MODES[e.mode] ? ` (in ${MODES[e.mode].short})` : '';
  const line = !e ? '' : s.done ? 'today’s find: found. another one tomorrow.' : `today’s find: ${e.hint}${where}`;
  for (const id of ['ovToday', 'qToday']) { const el = $(id); if (el) { el.textContent = line; el.hidden = !line; el.classList.toggle('done', !!(s && s.done)); } }
}
function landingNote() {
  todayPaint();
  const f = $('enterFine');
  if (f && found.size > 0) f.textContent = `welcome back. ${found.size} of ${CAT.length} found, ${GAME.nougats} nougat${GAME.nougats === 1 ? '' : 's'} in the jar.`;
}
