// ===== the classical wing: twelve steps, our own reductions of public-domain pieces =====
var WING = { step: 1, played: [], dream: false, holding: false, holdT: 0, onsets: [], humAt: 0, pi: 0, loud: false, loudAt: 0, slow: 0, face: false };

function wingPiece(i) { return WING_DATA && WING_DATA[i] || null; }
function wingNow() { return wingPiece(Math.min(WING_DATA.length, WING.step) - 1); }
function wingMount() {
  const face = $('wingFace'); if (!face || face.dataset.built) return; face.dataset.built = '1';
  face.innerHTML = '<button type="button" class="book-x" id="wingBack" aria-label="back to the book">×</button>'
    + '<div class="wing-path" id="wingPath"></div>'
    + '<p class="sheet-kicker" id="wingKicker"></p><h2 id="wingTitle"></h2>'
    + '<p class="sheet-form" id="wingInvite"></p><p class="sheet-basis" id="wingBasis"></p>'
    + '<div class="wkeys" id="wingKeys"></div><p class="wing-warm" id="wingWarm"></p>';
  const keys = $('wingKeys'), degs = [0, 2, 4, 5, 7, 9, 11, 12];
  degs.forEach(semi => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'wkey'; b.setAttribute('aria-label', 'scale degree ' + semi);
    b.addEventListener('pointerdown', e => wingDown(e, semi, b));
    const up = () => { WING.holding = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    keys.appendChild(b);
  });
  on('wingBack', () => { WING.face = false; $('wingFace').hidden = true; if ($('bookOpen')) $('bookOpen').hidden = false; });
  wingPaint();
}
function wingOpen() {
  if (!entered) { bookOpen(); setTimeout(wingOpen, 800); return; }
  bookMount(); wingMount();
  $('book').classList.add('on'); BOOK.open = true; document.body.classList.add('booking');
  if ($('bookOpen')) $('bookOpen').hidden = true;
  $('wingFace').hidden = false; WING.face = true; bookCover(false);
  wingPaint();
}
function wingShow(id, opt) {
  opt = opt || {};
  const p = (WING_DATA || []).find(x => x.id === id) || wingNow();
  if (!p) return;
  wingOpen();
  BOOK.holdFace = true; bookChoose(p.id); BOOK.holdFace = false;
  if ($('bookOpen')) $('bookOpen').hidden = true;
  $('wingFace').hidden = false; WING.face = true;
  if (opt.play) bookPlay();
  wingPaint();
}
function wingPaint() {
  const path = $('wingPath'); if (!path || !WING_DATA) return;
  path.textContent = '';
  WING_DATA.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const n = i + 1, done = WING.step > n, cur = WING.step === n;
    b.className = 'wsun' + (done ? ' is-done' : '') + (cur ? ' is-now' : '');
    b.textContent = (p.composer || '?').slice(0, 1);
    b.setAttribute('aria-label', done || cur ? p.composer + ', ' + p.title : 'a later stone');
    b.disabled = !done && !cur;
    b.addEventListener('click', () => { if (done || cur) wingShow(p.id, { play: done }); });
    path.appendChild(b);
  });
  const p = wingNow();
  const open = p && (WING.step > WING_DATA.indexOf(p) + 1 || BOOK.id === p.id && BOOK.kind === 'wing' && BOOK.onPlay);
  if ($('wingKicker')) $('wingKicker').textContent = p ? p.composer : '';
  if ($('wingTitle')) $('wingTitle').textContent = p && (WING.step > WING_DATA.indexOf(p) || open) ? p.title : '';
  if ($('wingInvite')) $('wingInvite').textContent = p && WING.step <= WING_DATA.length ? p.invite : 'The wing is open.';
  if ($('wingBasis')) $('wingBasis').textContent = p && WING.step > WING_DATA.indexOf(p) ? (p.pd || '') : '';
  if (WING.step === 4 && p) wingPhraseDots();
}
function wingPhrase() {
  const p = WING_DATA && WING_DATA[3];
  if (!p) return [];
  return parseMelody(p.melody).slice(0, 5).map(e => ((e.semi % 12) + 12) % 12);
}
function wingPhraseDots() {
  const host = $('wingWarm'); if (!host) return;
  host.textContent = '';
  const ph = wingPhrase();
  ph.forEach((semi, i) => {
    const iel = document.createElement('i');
    iel.className = 'pdot' + (i < WING.pi ? ' is-got' : i === WING.pi ? ' is-now' : '');
    iel.style.bottom = (6 + semi) + 'px';
    host.appendChild(iel);
  });
}
function wingDown(e, semi, el) {
  if (e.button != null && e.button !== 0) return;
  WING.holding = true; WING.holdT = t;
  const r = el.getBoundingClientRect();
  const y = r.height ? (e.clientY - r.top) / r.height : 0.5;
  const vel = y > 0.62 ? 0.9 : y < 0.38 ? 0.28 : 0.55;
  const p = wingNow();
  const root = p ? (pcOf(p.key) || 0) : 0;
  if (bookEnsure()) toneAt(A.ac.currentTime + 0.01, 60 + root + semi, 0.85, vel, 'melody', true);
  wingOnset(semi, vel);
  if (typeof magHearSemi === 'function') magHearSemi((root + semi) % 12);
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
}
function wingOnset(semi, vel) {
  const now = performance.now();
  WING.onsets.push(now);
  if (WING.onsets.length > 8) WING.onsets = WING.onsets.slice(-8);
  if (WING.step === 2 && WING.onsets.length >= 8) {
    const gaps = [];
    for (let i = 1; i < WING.onsets.length; i++) gaps.push(WING.onsets[i] - WING.onsets[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg > 160 && avg < 1600 && gaps.every(g => Math.abs(g - avg) / avg < 0.24)) wingGrant(2);
  }
  if (WING.step === 3 && ((semi % 12) + 12) % 12 === 0) wingGrant(3);
  if (WING.step === 4) {
    const target = wingPhrase();
    const got = ((semi % 12) + 12) % 12;
    if (got === target[WING.pi]) { WING.pi++; if (WING.pi >= target.length) wingGrant(4); else wingPhraseDots(); }
    else { WING.pi = 0; wingPhraseDots(); }
  }
  if (WING.step === 5) {
    if (vel > 0.72) { WING.loud = true; WING.loudAt = t; }
    else if (WING.loud && vel < 0.38 && t - WING.loudAt < 8) wingGrant(5);
  }
}
function wingGrant(step) {
  if (typeof DREAM !== 'undefined' && DREAM.on) return;
  if (WING.step !== step) return;
  const p = wingPiece(step - 1); if (!p) return;
  WING.step = step + 1;
  caption(p.warm, 4600, 'music');
  wingShow(p.id, { play: true });
  if (step === 4 && typeof magOnPhrase === 'function') magOnPhrase();
  persistSoon();
}
function wingReadyAll() {
  if (!WING_DATA) return false;
  return WING_DATA.slice(0, 11).every(p => WING.played.includes(p.id));
}
function wingHeard() {
  if (!BOOK.onPlay || !BOOK.tune || BOOK.kind !== 'wing') return;
  const beats = (BOOK.bars.length || 1) * (BOOK.meter || 4);
  const secs = beats * 60 / Math.max(40, BOOK.bpm);
  if ((BOOK.heard || 0) >= Math.min(8, secs * 0.8) && !WING.played.includes(BOOK.tune.id)) {
    WING.played.push(BOOK.tune.id); persistSoon();
  }
}
function wingTick(dt) {
  if (WING.step === 1 && WING.holding && t - WING.holdT >= 3) wingGrant(1);
  if (WING.step === 3 && t > WING.humAt && !DREAM.on) {
    WING.humAt = t + 5;
    const p = wingPiece(2);
    if (p && bookEnsure()) toneAt(A.ac.currentTime + 0.02, 60 + (pcOf(p.key) || 0), 1.1, 0.45, 'melody', true);
  }
  if (DREAM.on) { wingHeard(); return; }
  if (WING.step === 6 && BOOK.kind === 'wing' && BOOK.onPlay && BOOK.bpm <= 60) { WING.slow += dt; if (WING.slow >= 60) wingGrant(6); }
  if (WING.step === 11 && BOOK.kind === 'wing' && BOOK.onPlay && BOOK.meter === 7 && BOOK.abs >= 7 * 8) wingGrant(11);
  if (WING.step === 7 && typeof ENS !== 'undefined' && ENS.on && ENS.n >= 2) wingGrant(7);
  else if (WING.step === 8 && typeof ENS !== 'undefined' && ENS.on && ENS.n >= 3) wingGrant(8);
  else if (WING.step === 9 && WING.dream) wingGrant(9);
  else if (WING.step === 10 && typeof MAG !== 'undefined' && MAG.found) wingGrant(10);
  else if (WING.step === 12 && wingReadyAll()) wingGrant(12);
  wingHeard();
}
function wingDreamDone() { WING.dream = true; persistSoon(); if (WING.step === 9 && !(typeof DREAM !== 'undefined' && DREAM.on)) wingGrant(9); }
function wingOnMag() { if (WING.step === 10) wingGrant(10); }
