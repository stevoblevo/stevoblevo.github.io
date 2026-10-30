// ===== dreamwalk: the house tour, the book's seven stops, and tune together's seven =====
var DREAM = { on: false, tour: 'main', i: -1, until: 0, clean: true, pending: '', handed: null, arm: 0 };
dreamBypass = () => DREAM.on;

function dreamCam(z) {
  const v = voices.find(x => x.wT > 0);
  const cx = v ? v.x : XMAX * 0.5, w = XMAX / clamp(z, 1, 8);
  VIEW.tgt = { x0: clamp(cx - w / 2, 0, Math.max(0, XMAX - w)), w };
}
function dreamStopRail() { if (typeof versionsClose === 'function') versionsClose(); if ($('liner') && $('liner').classList.contains('on')) $('liner').classList.remove('on'); }

const TOURS = {
  main: [
    { d: 4.2, cap: 'Every valley is a little sun.', go() { dreamCam(1.05); } },
    { d: 4.2, cap: 'A voice rolls home.', go() { dreamCam(2.4); } },
    { d: 4.4, cap: 'The brook keeps what you find.', go() { dreamCam(1.2); openBrook(); } },
    { d: 4.2, cap: 'Every AND SO stays.', go() { closeBrook(); versionsOpen(); } },
    { d: 4.6, cap: 'A window inside the window.', go() { versionsClose(); mirrorTable(true); } },
    { d: 4.2, cap: 'A book of songs nobody wrote down yet.', go() { mirrorTable(false); bookOpen('st-louis', { cover: true }); } },
    { d: 6.2, cap: 'Just the tune and the chords.', go() { bookOpen('st-louis', { play: true }); } },
    { d: 5.2, cap: 'Just one note, held. That\'s how it starts.', go() { wingShow('bwv846', { play: true }); } },
    { d: 5.0, cap: 'Same key, same smile.', go() { wingShow('k525', { play: true }); } },
    { d: 5.0, cap: 'Slow is brave.', go() { wingShow('moonlight', { play: true }); } },
    { d: 5.0, cap: 'Small bells, big hush.', go() { wingShow('sugar', { play: true }); } },
    { d: 5.4, cap: 'Something bright woke up in the wood.', go() { wingShow('firebird', { play: true }); } },
    { d: 4.4, cap: 'Somebody\'s been here.', go() { if (typeof magHint === 'function') magHint(); } },
    { d: 3.6, cap: 'And so.', go() { dreamCam(1.1); bookClose(); } }
  ],
  book: [
    { d: 4.2, cap: 'A book of songs nobody wrote down yet.', go() { bookOpen('st-louis', { cover: true }); }, hand() { bookCover(false); } },
    { d: 4.4, cap: 'Just the tune and the chords. You fill in the rest.', go() { bookOpen('st-louis'); bookHighlight(); } },
    { d: 5.6, cap: 'Here\'s how it goes.', go() { bookOpen('st-louis', { play: true }); } },
    { d: 5.2, cap: 'These are the colors underneath.', go() { if (!BOOK.onPlay) bookPlay(); }, hand() { bookPause(); } },
    { d: 4.4, cap: 'Any key you like. It still sings.', go() { bookNudgeKey(2); } },
    { d: 4.6, cap: 'Your friend knows this one.', go() { bookShowPets(true); if (BOOK.tune && BOOK.tune.pd && bookEnsure()) { const ev = BOOK.events[0]; if (ev) toneAt(A.ac.currentTime + 0.05, 72 + tonicPc() + ev.semi, 1.4, 0.5, 'melody', true); } } },
    { d: 4.2, cap: 'And so, your turn.', go() { bookBlank(); bookShowPets(false); } }
  ],
  tune: [
    { d: 4.2, cap: 'One of you, one song.', go() { bookOpen('rhythm', { play: true }); } },
    { d: 4.6, cap: 'Then another one shows up.', go() { mirrorTable(true); if (typeof mirOpen === 'function' && MIR.wins.length < 1) mirOpen('self', 'phone'); } },
    { d: 4.4, cap: 'Same key. Same heartbeat.', go() { const b = $('ensClasp'); if (b) { b.hidden = false; b.classList.add('is-on'); } const r = $('ensRead'); if (r) r.textContent = shownKey() + ' · ' + (BOOK.bpm | 0); } },
    { d: 4.4, cap: 'Everybody takes a part.', go() { caption('bass, chords, melody.', 2000); } },
    { d: 4.8, cap: 'There\'s always room for one more.', go() { if (typeof mirOpen === 'function' && MIR.wins.length < 2) mirOpen('self', 'tablet'); } },
    { d: 5.0, cap: 'Together, it\'s bigger than any one of us.', go() { document.body.classList.add('ens-glow'); } },
    { d: 4.2, cap: 'And so, we played.', go() { document.body.classList.remove('ens-glow'); if (typeof mirCloseAll === 'function') mirCloseAll(); mirrorTable(false); if (typeof ensSaveTake === 'function') ensSaveTake(); bookShowPets(true); }, hand() { const c = $('ensSave'); if (c) c.hidden = false; } }
  ]
};

function dreamStart(tour) {
  tour = tour || 'main';
  if (!TOURS[tour]) tour = 'main';
  if (!entered) { DREAM.pending = tour; $('enter').click(); return; }
  if (typeof REEL !== 'undefined' && REEL.on && typeof reelStop === 'function') reelStop(false);
  if (typeof JAM !== 'undefined' && JAM.on) jamStop(true);
  DREAM.tour = tour; DREAM.i = -1; DREAM.on = true; DREAM.clean = true; DREAM.arm = t + 0.75; DREAM.handed = null;
  document.body.classList.add('dreaming');
  const k = $('dreamKeep'); if (k) k.hidden = true;
  dreamAdvance();
}
function dreamAdvance() {
  const tour = TOURS[DREAM.tour] || TOURS.main;
  DREAM.i += 1;
  if (DREAM.i >= tour.length) { dreamFinish(true); return; }
  const s = tour[DREAM.i];
  try { s.go(); } catch (e) {}
  caption(s.cap, Math.max(1800, (s.d - 0.4) * 1000));
  DREAM.until = t + s.d;
}
function dreamTick() { if (DREAM.on && t >= DREAM.until) dreamAdvance(); }
function dreamHand() {
  if (!DREAM.on || t < DREAM.arm) return;
  const tour = TOURS[DREAM.tour] || [];
  const s = tour[DREAM.i];
  DREAM.on = false; DREAM.clean = false; DREAM.handed = DREAM.tour;
  document.body.classList.remove('dreaming');
  if (s && s.hand) { try { s.hand(); } catch (e) {} }
  const k = $('dreamKeep'); if (k) k.hidden = false;
}
function dreamFinish(clean) {
  DREAM.on = false;
  document.body.classList.remove('dreaming');
  document.body.classList.remove('ens-glow');
  if (clean && DREAM.clean && typeof wingDreamDone === 'function') wingDreamDone();
  if (clean) caption('And so.', 2400);
  const k = $('dreamKeep'); if (k) k.hidden = true;
}
function dreamResume() {
  if (DREAM.on) return;
  DREAM.on = true; DREAM.clean = false; DREAM.arm = t + 0.4;
  document.body.classList.add('dreaming');
  const k = $('dreamKeep'); if (k) k.hidden = true;
  dreamAdvance();
}
on('dreamMark', () => dreamStart('main'));
on('dreamKeep', dreamResume);
on('ensSave', () => { if (typeof ensSaveTake === 'function') ensSaveTake(); });
window.addEventListener('pointerdown', e => {
  if (!DREAM.on || t < DREAM.arm) return;
  if (e.target && e.target.closest && e.target.closest('#dreamKeep, #ensSave')) return;
  dreamHand();
}, true);
window.addEventListener('keydown', e => {
  if (!DREAM.on || t < DREAM.arm) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  dreamHand();
}, true);
