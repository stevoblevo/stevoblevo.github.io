// ===== game: saving, the field guide, score and combos, quests, rounds, Claude-hosted capabilities =====
const SAVE_KEY = 'andso:v2';   // the same key since v2: AND SO 7 reads every earlier save and adds to it
const PREF_KEYS = ['hp', 'shim', 'space', 'sparkle', 'tease', 'pace', 'warm', 'vol', 'chimes', 'bird', 'haptics', 'flip', 'tune', 'ref', 'reg', 'bells', 'wind', 'rain', 'train', 'petForm', 'ui', 'light', 'follow', 'view', 'cymShape', 'cymLines', 'cymPowder', 'x5d', 'x5dSpeed', 'x5dDepth', 'detect', 'motion', 'roll', 'tiltK', 'artic', 'bed', 'autoHum', 'easyStart', 'quiet', 'petEerie'];
let userP = {}, savedSkin = null;
const CAP = { db: null, user: null, uid: null, dl: null, sample: null, ref: null, dbOk: false, writing: false, dirty: false, timer: 0, selfHost: false };

const LIGHT_LOOKS = ['daybreak', 'story', 'eink', 'bw2', 'sb-daylight', 'sb-inkblot', 'sb-comix', 'sb-origami', 'sb-skein'];
function snapshot() {
  const set = {}; PREF_KEYS.forEach(k => (set[k] = SET[k]));
  let sk = skin;
  // the reel borrows looks and views for a few seconds each: what gets saved is whatever you had before it started,
  // so leaving the page mid-reel never brings you back to its paper or daylight shot
  try { if (REEL.on && REEL.saved) { const r = REEL.saved; sk = r.skin; ['view', 'cymShape', 'cymPowder', 'x5d', 'detect', 'flip', 'light', 'tease'].forEach(k => { if (k in r && k in set) set[k] = r[k]; }); } } catch (e) {}
  return { v: 2, sv: 70, lit: 1, found: [...found], presets: userP, unlockAll: allUnlocked, skin: sk, set,
    game: { score: GAME.score, best: GAME.best, rounds: GAME.rounds, stars: GAME.stars, qdone: GAME.qdone, bestTime: GAME.bestTime || 0,
      nougats: GAME.nougats, played: Math.round(GAME.played), stones: GAME.stones.slice(), stories: GAME.stories.slice(), jamBest: GAME.jamBest, lastDay: GAME.lastDay }, stamp: Date.now() };
}
function applySave(s, preferPrefs) {
  if (!s || typeof s !== 'object') return;
  if (Array.isArray(s.found)) s.found.forEach(id => { if (CATI.has(id)) found.add(id); });
  if (s.presets && typeof s.presets === 'object') userP = Object.assign({}, s.presets, userP);
  if (s.unlockAll) allUnlocked = true;
  if (s.game) { const g = s.game; GAME.score = Math.max(GAME.score, +g.score || 0); GAME.best = Math.max(GAME.best, +g.best || 0); GAME.rounds = Math.max(GAME.rounds, +g.rounds || 0); GAME.stars = Math.max(GAME.stars, +g.stars || 0); GAME.qdone = Math.max(GAME.qdone, +g.qdone || 0); if (g.bestTime && (!GAME.bestTime || g.bestTime < GAME.bestTime)) GAME.bestTime = g.bestTime;
    GAME.nougats = Math.max(GAME.nougats, +g.nougats || 0); GAME.played = Math.max(GAME.played, +g.played || 0); GAME.jamBest = Math.max(GAME.jamBest, +g.jamBest || 0); if (g.lastDay && g.lastDay > GAME.lastDay) GAME.lastDay = g.lastDay;
    if (Array.isArray(g.stones)) g.stones.forEach(id => { if (typeof id === 'string' && !GAME.stones.includes(id)) GAME.stones.push(id); });
    if (Array.isArray(g.stories)) g.stories.forEach(id => { if (typeof id === 'string' && !GAME.stories.includes(id)) GAME.stories.push(id); }); }
  if (preferPrefs && s.set) PREF_KEYS.forEach(k => { if (s.set[k] !== undefined && typeof s.set[k] === typeof SET[k]) SET[k] = s.set[k]; });
  // a light look saved before 6.1 (the old light-host default, or a reel cut short) is not kept: those come back dark once
  // 7 opens in Meta Daylight: a look saved before 7 is not carried over, a look you pick in 7 is kept
  if (preferPrefs && s.skin && s.lit && (+s.sv || 0) >= 70) savedSkin = s.skin;
}
function loadLocal() { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { applySave(JSON.parse(raw), true); return true; } } catch (e) {} return false; }
let localT = 0;
function persistSoon() {
  if (MIR.depth > 0) return;   // a copy in the mirror never saves: the page at the top keeps the one save
  clearTimeout(localT);
  localT = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch (e) {} }, 400);
  if (CAP.dbOk) { CAP.dirty = true; clearTimeout(CAP.timer); CAP.timer = setTimeout(flushDb, 4000); }
}
async function flushDb() {
  if (!CAP.dbOk || CAP.writing || !CAP.dirty) return;
  CAP.writing = true; CAP.dirty = false;
  try { await CAP.ref.set(snapshot()); }
  catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted' || e.code === 'quota_exceeded')) { CAP.dbOk = false; saveNote(); } else CAP.dirty = true; }
  CAP.writing = false;
  if (CAP.dirty && CAP.dbOk) CAP.timer = setTimeout(flushDb, 5000);
}
function saveNote() { $('gSave').textContent = CAP.dbOk ? 'progress is kept with your Claude account, so it follows you between devices. click anything found to hear it.' : 'progress is kept in this browser. click anything found to hear it.'; }
async function initCaps() {
  const C = window.claude;
  if (!C || typeof C.use !== 'function') { CAP.selfHost = true; capsUI(); return; }
  const use = n => C.use(n).catch(() => null);
  const [dl, sample, db, user] = await Promise.all([use('downloads'), use('sample'), use('db'), use('user')]);
  CAP.dl = dl; CAP.sample = sample; CAP.db = db; CAP.user = user;
  capsUI();
  if (db && user) {
    try { CAP.uid = await user.id(); } catch (e) { CAP.uid = null; }
    if (CAP.uid) {
      try {
        CAP.ref = db.doc(`data/users/${CAP.uid}/save`);
        const snap = await CAP.ref.get();
        if (snap.exists) { applySave(snap.data(), !localStorage.getItem(SAVE_KEY)); renderGuide(); renderPresets(); checkUnlocks(!entered); scoreUI(); syncUI(); }
        CAP.dbOk = true; CAP.dirty = true; flushDb();
      } catch (e) { CAP.dbOk = false; }
    }
  }
  saveNote();
}
function capsUI() {
  const canSave = !!CAP.dl || CAP.selfHost;
  ['jExp', 'rRec', 'pbRec'].forEach(id => $(id).classList.toggle('hidden', !canSave));
  $('recNote').textContent = canSave ? 'recordings save as .webm. replay runs here on the page.' : 'replay runs here on the page.';
  $('askRow').classList.toggle('hidden', !CAP.sample);
  $('stNew').classList.toggle('hidden', !CAP.sample);
}
async function offerFile(filename, data) {
  if (!CAP.dl && CAP.selfHost) {
    try {
      const b = data instanceof Blob ? data : new Blob([data], { type: 'text/plain;charset=utf-8' }), u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); caption(`saved ${filename}.`, 2200);
    } catch (e) { caption("that file couldn't be saved.", 2400); }
    return;
  }
  if (!CAP.dl) { caption("saving files isn't available here.", 2600); return; }
  try { await CAP.dl.save({ filename, data }); caption(`saved ${filename}.`, 2200); }
  catch (e) { const c = e && e.code; if (c === 'declined') caption('not saved.', 1800); else if (c === 'rate_limited') caption('one save at a time. try again in a moment.', 2400); else if (c === 'unavailable' || c === 'not_granted' || c === 'capability_disabled') { CAP.dl = null; capsUI(); caption("saving files isn't available here.", 2600); } else caption("that file couldn't be saved.", 2400); }
}

// ---------- words ----------
let capTimer = 0;
// kind 'music' captions still show when the words are hidden: a chord name, a tuning, the band's opening line
function caption(text, ms, kind) {
  if (QUIET() && kind !== 'music') return;
  const el = $('cap'), wasOn = el.classList.contains('on');
  clearTimeout(capTimer); el.classList.remove('on');
  capTimer = setTimeout(() => { el.textContent = text; el.classList.add('on'); capTimer = setTimeout(() => el.classList.remove('on'), ms || 3200); }, wasOn ? 600 : 30);
}
function showHint(text, secs) { const el = $('hint'); el.textContent = text; el.classList.add('on'); hintOffAt = t + secs; }
function hideHint() { $('hint').classList.remove('on'); hintOffAt = 0; }

// ---------- the field guide ----------
function discover(id, v) {
  if (found.has(id)) return;
  const e = CATI.get(id); if (!e) return;
  found.add(id); persistSoon(); renderGuide(id);
  if (MIR.depth > 0) mirUp({ andso: 'found', id });
  else if (found.size % 4 === 0) setTimeout(() => nougat(1, MX, MY - MR, `${found.size} things found`), 900);
  toastQ.push(e); if (!toastFlush && !toastHideAt) toastFlush = t + 0.7;
  joyBurst(e, v); pet.cheer = 1; checkUnlocks(false); jlog(`found: ${e.name}`);
  const b = v && v.wT !== undefined ? ballPos(v) : null;
  award(50, b ? b.X : MX, b ? b.Y - 40 : MY - MR, 'found');
  haptic([12, 30, 12]);
}
function discoverIv(key, v) { const e = CAT.find(c => c.mode === M.key && c.kind === 'iv' && c.key === key); if (e) discover(e.id, v); }
function discoverCh(str) { const e = CAT.find(c => c.mode === M.key && c.kind === 'ch' && c.key === str); if (e) discover(e.id); }
function joyBurst(e, v, px, py) {
  let x = px !== undefined ? px : MX, y = py !== undefined ? py : MY;
  if (v && v.wT !== undefined) { const b = ballPos(v); x = b.X; y = b.Y; }
  const txts = e.kind === 'ev' || !e.key ? ['✦', '♪', '✧'] : [e.key, '✦', '♪'], n = Math.round((reduceMotion ? 6 : 16) * qScale);
  for (let i = 0; i < n; i++) glyphs.push({ x, y, vx: rand(-110, 110), vy: rand(-220, -80), life: rand(1.3, 2.3), max: 2.3, txt: txts[i % txts.length], col: COLORS[i % 4], rot: rand(-0.5, 0.5), vr: rand(-2.2, 2.2), s: rand(0.8, 1.3) });
  aurora = 1; bloomFlash = Math.max(bloomFlash, 0.8);
  audio.flourish();
}
function showToast(items) {
  if (!items.length) return;
  const e = items[0], el = $('toast');
  el.textContent = '';
  const mk = (cls, txt) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; el.appendChild(d); };
  mk('tk', `DISCOVERED · ${found.size}/${CAT.length}`);
  mk('tt', e.name); mk('tl', e.line); mk('tf', e.fact);
  if (items.length > 1) mk('tm', 'also: ' + items.slice(1).map(c => c.name).join(', '));
  el.classList.add('on');
}
function renderGuide(newId) {
  const list = $('glist'); list.textContent = '';
  const order = [M.key, 'any', ...MODE_ORDER.filter(k => k !== M.key)];
  for (const m of order) {
    const items = CAT.filter(c => c.mode === m); if (!items.length) continue;
    const fc = items.filter(c => found.has(c.id)).length;
    const h = document.createElement('div'); h.className = 'gm'; h.textContent = `${MODE_TITLES[m]} · ${fc}/${items.length}`; list.appendChild(h);
    for (const c of items) {
      const f = found.has(c.id), b = document.createElement('button');
      b.className = 'gi' + (f ? ' f' : '') + (c.id === newId ? ' new' : '');
      const nm = document.createElement('div'); nm.className = 'gn'; nm.textContent = f ? c.name : '???';
      const hh = document.createElement('div'); hh.className = 'gh'; hh.textContent = f ? c.line : c.hint;
      b.appendChild(nm); b.appendChild(hh);
      if (f) { b.title = c.fact + ' (click to hear it)'; b.addEventListener('click', () => audio.preview(c)); } else b.tabIndex = -1;
      list.appendChild(b);
    }
  }
  $('gProg').textContent = `${found.size} / ${CAT.length}`;
  $('gBar').style.width = `${(100 * found.size) / CAT.length}%`;
}
function renderUnl() {
  const el = $('unl'); el.textContent = 'unlocks: ';
  UNLOCKS.forEach((u, i) => { const s = document.createElement(UNL[u.id] ? 'b' : 'span'); s.textContent = UNL[u.id] ? `✓ ${u.name}` : `${u.name} at ${u.n}`; el.appendChild(s); if (i < UNLOCKS.length - 1) el.appendChild(document.createTextNode(' · ')); });
  $('bSkip').classList.toggle('hidden', UNLOCKS.every(u => UNL[u.id]));
}
function checkUnlocks(quiet) { for (const u of UNLOCKS) if (!UNL[u.id] && (allUnlocked || found.size >= u.n)) { UNL[u.id] = true; if (!quiet && entered) onUnlock(u.id); } syncUI(); }
function onUnlock(id) {
  if (id === 'pet') { pet.hatch = 1.8; return; }
  const msg = { box: "unlocked: Pandora's box. five dimensions of vibe. please do open it.", hole: 'unlocked: a black hole. it bends pitch and it is hungry.', rail: 'unlocked: the guided rail. sit back.' }[id];
  setTimeout(() => caption(msg, 3600), 600);
}

// ---------- score and combos ----------
function award(pts, x, y, label) {
  const p = Math.round(pts); if (!p || !entered) return;
  GAME.score += p;
  floaters.push({ x: clamp(x, 30, W - 30), y: clamp(y, TOPH + 20, H - 40), txt: `+${p}${label ? ' ' + label : ''}`, life: 1.6, max: 1.6 });
  scoreUI(); persistSoon();
}
function scoreUI() {
  $('tScoreN').textContent = GAME.score.toLocaleString();
  $('tCombo').textContent = GAME.combo > 1 ? ` ×${Math.min(GAME.combo, 8)}` : '';
  $('gStats').textContent = GAME.rounds ? `${GAME.rounds} rounds · ${GAME.stars} stars · best ${GAME.bestTime ? GAME.bestTime.toFixed(1) + 's' : '—'} · best combo ×${GAME.best} · resonance ${GAME.score.toLocaleString()}` : 'cover every target peg with a voice at rest. under 12 seconds earns three stars. every third round is by ear.';
}
function onLand(v, fresh, lab) {
  if (!fresh || !entered) return;
  GAME.combo = t - GAME.lastLand < 4 ? GAME.combo + 1 : 1; GAME.lastLand = t;
  if (GAME.combo > GAME.best) GAME.best = GAME.combo;
  const mult = Math.min(GAME.combo, 8);
  let base = M.easy ? 8 : 12;
  if (lab && lab.includes('/')) { const pq = lab.split('/').map(Number); base = 8 + Math.round(4 * Math.log2(Math.max(2, pq[0] * pq[1]))); }
  const b = ballPos(v);
  award(base * mult, b.X, b.Y - 30, mult > 1 ? `×${mult}` : '');
  emit('land', { lab }); emit('combo', { v: GAME.combo });
  if (GAME.combo >= 5) discover('x-combo5');
  if (t - v.relT < 2.2 && Math.abs(v.x - v.relX) < 4) { v.relT = -99; award(25, b.X, b.Y - 54, 'perfect'); discover('x-perfect', v); emit('perfect'); }
}

// ---------- quests ----------
const QDEF = [
  { id: 'q-land3', m: 'any', txt: 'land 3 voices', n: 3, ev: 'land' },
  { id: 'q-combo3', m: 'any', txt: 'reach a ×3 combo', n: 1, ev: 'combo', f: e => e.v >= 3 },
  { id: 'q-chord3', m: 'any', txt: 'settle a chord of 3 voices', n: 1, ev: 'chord', f: e => e.n >= 3 },
  { id: 'q-hands', m: 'any', txt: 'hold two voices at once', n: 1, ev: 'hands', f: e => e.v >= 2, touch: true },
  { id: 'q-zoom', m: 'any', txt: 'zoom the scale to 4×', n: 1, ev: 'zoom', f: e => e.v >= 4 },
  { id: 'q-scaletap', m: 'any', txt: 'tap the scale 5 times', n: 5, ev: 'scaletap' },
  { id: 'q-harp', m: 'any', txt: 'play 12 notes on the sky harp', n: 12, ev: 'harp' },
  { id: 'q-spin', m: 'any', txt: 'turn the mandala a full circle', n: 5, ev: 'spin' },
  { id: 'q-perfect', m: 'any', txt: 'make a perfect release', n: 1, ev: 'perfect' },
  { id: 'q-round', m: 'any', txt: 'finish a round', n: 1, ev: 'round' },
  { id: 'q-3star', m: 'any', txt: 'earn three stars in a round', n: 1, ev: 'round', f: e => e.stars >= 3 },
  { id: 'q-sweet', m: 'any', txt: 'find a sweet spot', n: 1, ev: 'sweet' },
  { id: 'q-tuplet', m: 'any', txt: 'set the beat to quintuplets', n: 1, ev: 'tuplet', f: e => e.v >= 5 },
  { id: 'q-lean', m: 'any', txt: 'glide or lean 3 times', n: 3, ev: 'lean' },
  { id: 'q-sing', m: 'any', txt: 'hum or sing 2 phrases', n: 2, ev: 'phrase', need: () => LS.micOk },
  { id: 'q-mode', m: 'any', txt: 'switch to another tuning', n: 1, ev: 'mode' },
  { id: 'q-74', m: 'just', txt: 'land a voice on 7/4', n: 1, ev: 'land', f: e => e.lab === '7/4' },
  { id: 'q-65', m: 'just', txt: 'land a voice on 6/5', n: 1, ev: 'land', f: e => e.lab === '6/5' },
  { id: 'q-456', m: 'just', txt: 'settle a 4:5:6', n: 1, ev: 'chord', f: e => e.str === '4:5:6' },
  { id: 'q-357', m: 'bp', txt: 'settle a 3:5:7', n: 1, ev: 'chord', f: e => e.str === '3:5:7' },
  { id: 'q-gong', m: 'gamelan', txt: 'hear the gong 3 times', n: 3, ev: 'gong' },
  { id: 'q-tet', m: 'tet10', txt: 'land 4 voices in 10-TET', n: 4, ev: 'land' },
  { id: 'q-31', m: 'tet31', txt: 'land 4 voices in 31-EDO', n: 4, ev: 'land' },
  { id: 'q-easy', m: 'easy', txt: 'ride 8 chord changes', n: 8, ev: 'change' },
  { id: 'q-hole', m: 'any', txt: 'feed the black hole', n: 1, ev: 'eat', need: () => UNL.hole }
];
const QD = new Map(QDEF.map(q => [q.id, q]));
function questPool() { return QDEF.filter(q => (q.m === 'any' || q.m === M.key) && (!q.touch || isTouch) && (!q.need || q.need()) && !GAME.quests.some(a => a.id === q.id)); }
function fillQuests() {
  GAME.quests = GAME.quests.filter(a => { const q = QD.get(a.id); return q && (a.done || q.m === 'any' || q.m === M.key); });
  while (GAME.quests.length < 3) { const p = questPool(); if (!p.length) break; const pm = p.filter(q => q.m === M.key), pick = pm.length && Math.random() < 0.5 ? pm : p; GAME.quests.push({ id: pick[(Math.random() * pick.length) | 0].id, p: 0, done: false }); }
  renderQuests();
}
function emit(ev, e) {
  if (!entered) return;
  e = e || {};
  let ch = false;
  for (const a of GAME.quests) {
    if (a.done) continue;
    const q = QD.get(a.id);
    if (!q || q.ev !== ev || (q.m !== 'any' && q.m !== M.key) || (q.f && !q.f(e))) continue;
    a.p += e.amt || 1; ch = true;
    if (a.p >= q.n) completeQuest(a, q);
  }
  if (ch) renderQuests();
}
function completeQuest(a, q) {
  a.done = true; GAME.qdone++;
  award(Math.min(220, 60 + 20 * q.n), W / 2, LT * 0.45, 'quest');
  caption(`quest done: ${q.txt}.`, 2600); audio.flourish(); haptic([10, 40, 10]); discover('x-quest'); jlog(`quest: ${q.txt}`);
  nougat(1, W / 2, LT * 0.45, `quest: ${q.txt}`);
  setTimeout(() => { GAME.quests = GAME.quests.filter(x => x !== a); fillQuests(); persistSoon(); }, 1700);
}
function renderQuests() {
  const list = $('qList'); list.textContent = '';
  for (const a of GAME.quests) {
    const q = QD.get(a.id); if (!q) continue;
    const it = document.createElement('div'); it.className = 'qi' + (a.done ? ' done' : '');
    const tx = document.createElement('div'); tx.className = 'qt'; tx.textContent = (a.done ? '✓ ' : '') + q.txt + (q.n > 1 && !a.done ? ` · ${Math.min(a.p, q.n)}/${q.n}` : '');
    const bar = document.createElement('div'); bar.className = 'qb'; const fill = document.createElement('i'); fill.style.width = `${(100 * Math.min(a.p, q.n)) / q.n}%`; bar.appendChild(fill);
    it.appendChild(tx); it.appendChild(bar); list.appendChild(it);
  }
  $('tQuestN').textContent = `${GAME.quests.filter(a => !a.done).length}`;
  questsPeek();
}

// ---------- rounds: build the constellation ----------
const RSETS = {
  just: [[[5, 4], [3, 2]], [[6, 5], [3, 2]], [[4, 3], [5, 3]], [[5, 4], [3, 2], [7, 4]], [[7, 6], [3, 2]], [[3, 2], [7, 4]], [[5, 4], [5, 3]], [[6, 5], [3, 2], [7, 4]], [[7, 5], [7, 4]]],
  bp: [[[5, 3], [7, 3]], [[7, 5], [9, 5]], [[9, 7], [5, 3]], [[5, 3], [7, 3], [3, 1]]]
};
function ratioLabel(pqs) {
  const set = [[1, 1], ...pqs]; let L = 1; for (const [, q] of set) L = lcm(L, q);
  let ints = set.map(([p, q]) => (p * L) / q).sort((a, b) => a - b); const g = ints.reduce((a, b) => gcd(a, b)); ints = ints.map(n => n / g);
  const str = ints.join(':'), names = M.key === 'bp' ? CHORDS_BP : CHORDS;
  return names[str] ? `${str} · ${names[str]}` : `${str} · ${M.key === 'bp' ? 'odd partials of one fundamental' : 'one harmonic series'}`;
}
function startRound() {
  if (!entered || era) return;
  if (M.easy) { if (SET.normie) setNormie(false); else setMode('just', true); }
  pump = null; if (rail) stopRail(false);
  hideResult();
  roundN++;
  const ear = roundN % 3 === 0;
  let ratios, label;
  if (M.key === 'just' || M.key === 'bp') { const L = RSETS[M.key], pqs = L[(Math.random() * L.length) | 0]; ratios = pqs.map(([p, q]) => p / q); label = ratioLabel(pqs); }
  else {
    const pool = M.key === 'gamelan' ? [1, 2, 3, 4] : [3, 4, 6, 7, 8], k = 2 + (Math.random() < 0.5 ? 1 : 0), ks = [];
    while (ks.length < k) { const s = pool[(Math.random() * pool.length) | 0]; if (!ks.includes(s)) ks.push(s); }
    ks.sort((a, b) => a - b); ratios = ks.map(s => Math.pow(2, s / M.n));
    label = M.key === 'gamelan' ? `slendro ‘1’ · ${ks.map(s => '‘' + GD[s] + '’').join(' · ')}` : `0 · ${ks.join(' · ')} \\10`;
  }
  let xs = null;
  for (const k of [0, 1, -1, 2, -2, 3, -3]) { const arr = ratios.map(r => xOf(fRoot * r * Math.pow(M.eq, k))); if (arr.every(x => x > 240 && x < XMAX - 240)) { xs = arr; break; } }
  if (!xs) xs = ratios.map(r => clamp(xOf(fold(fRoot * r, M.eq, fOf(360))), 240, XMAX - 240));
  let live = voices.filter(v => v.wT > 0);
  for (let i = live.length - 1; i >= xs.length; i--) dropVoice(live[i]);
  while (voices.filter(v => v.wT > 0).length < xs.length) if (!addVoice(rand(300, XMAX - 300), { temp: 0.3 })) break;
  live = voices.filter(v => v.wT > 0);
  live.forEach((v, i) => { if (v.dragging) return; v.target = null; v.locked = false; let nx = rand(160, XMAX - 160); for (let g = 0; g < 8 && xs.some(x => Math.abs(x - nx) < 120); g++) nx = rand(160, XMAX - 160); v.x = nx; v.v = 0; v.temp = 0.35; v.pinUntil = t + 0.5 + i * 0.1; v.hist.length = 0; v.histT.length = 0; });
  round = { xs, covered: xs.map(() => false), t0: t, ear, label, hintAt: t + (ear ? 12 : 10), revealed: !ear, done: false, lastUi: 0 };
  if (zoomLevel() > 1.01) setZoom(1, XMAX / 2);
  $('rLabel').textContent = (ear ? 'by ear: ' : '') + label;
  $('round').classList.add('on');
  caption(ear ? 'by ear. the pegs stay hidden for 12 seconds. tap “hear it”.' : 'round: cover every peg with a voice at rest.', 3200);
  setTimeout(hearTarget, 400);
  jlog(`round ${roundN}: ${label}`); syncUI();
}
function hearTarget() { if (!round) return; round.xs.forEach((x, i) => audio.pip(fOf(x), 0.045, i * 0.28, 0.9)); round.xs.forEach(x => audio.pip(fOf(x), 0.03, round.xs.length * 0.28 + 0.25, 1.6)); }
function roundTick() {
  if (!round || round.done) return;
  const live = voices.filter(v => v.wT > 0);
  round.covered = round.xs.map(x => live.some(v => v.locked && Math.abs(v.x - x) < 7));
  if (!round.revealed && t > round.hintAt) { round.revealed = true; caption('the pegs are showing now.', 2000); }
  if (t - round.lastUi > 0.1) { round.lastUi = t; $('rTime').textContent = `${(t - round.t0).toFixed(1)}s`; }
  if (round.covered.every(Boolean) && live.length >= round.xs.length && live.every(v => v.locked && !v.dragging)) endRound();
}
function endRound() {
  round.done = true;
  const secs = t - round.t0, stars = secs <= 12 ? 3 : secs <= 25 ? 2 : 1;
  GAME.rounds++; GAME.stars += stars; if (!GAME.bestTime || secs < GAME.bestTime) GAME.bestTime = secs;
  award(100 * stars + 20 * round.xs.length, MX, MY, '★'.repeat(stars));
  discover('x-round'); if (stars === 3) { discover('x-3star'); nougat(1, MX, MY, 'three stars'); } if (round.ear) discover('x-ear');
  emit('round', { stars });
  bloomFlash = 1; aurora = 1; peak = 1; chill = 1; haptic([20, 60, 20]);
  audio.bloom(voices.filter(v => v.wT > 0).map(v => fOf(v.x)));
  for (let i = 0; i < 40 * qScale; i++) sparks.push({ x: MX + rand(-MR, MR), y: MY + rand(-MR, MR), vx: rand(-120, 120), vy: rand(-160, 40), life: rand(0.8, 1.8), max: 1.8, c: COLORS[i % 4] });
  $('resStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('resTitle').textContent = round.label;
  $('resLine').textContent = `${secs.toFixed(1)}s · ${GAME.rounds} rounds · ${GAME.stars} stars`;
  $('result').classList.add('on'); $('round').classList.remove('on');
  jlog(`round done in ${secs.toFixed(1)}s, ${stars} stars`); persistSoon(); syncUI();
}
function hideResult() { $('result').classList.remove('on'); }
function endRoundUI(next) { hideResult(); round = null; $('round').classList.remove('on'); nextAct = t + 6; syncUI(); if (next) startRound(); }
function skipRound() { if (!round) return; round = null; $('round').classList.remove('on'); caption('round skipped.', 1600); nextAct = t + 5; syncUI(); }

// ---------- asking Claude, as Saelion ----------
let askCtl = null;
async function askSaelion(q) {
  if (!CAP.sample || !q) return;
  if (askCtl) askCtl.abort();
  const ctl = (askCtl = new AbortController()), out = $('askOut');
  out.textContent = 'thinking…';
  const state = `tuning: ${M.title}. root ${OUT(fRoot).toFixed(1)} Hz. voices: ${voices.filter(v => v.wT > 0).map(v => v.lab).join(', ') || 'none'}. chord: ${chordNow ? chordNow.str + ' (' + chordNow.name + ')' : 'unsettled'}. finds: ${found.size} of ${CAT.length}.`;
  const prompt = `You are Saelion, a small five-dimensional creature (bunny, tree octopus and butterfly pixie at once, one gold eye and one blue) who lives inside AND SO, a microtonal music toy where voices roll into the valleys of a sensory-dissonance curve. Answer the player's question in at most three short sentences, dry and warm, lower case, accurate about tuning and acoustics. No emoji.\n\nWhat the player is hearing right now: ${state}\n\nQuestion: ${q}`;
  try {
    const r = await CAP.sample(prompt, { modelTier: 'quick', signal: ctl.signal, onText: ({ text }) => { out.textContent = text; pet.say = text; pet.sayUntil = t + 12; } });
    out.textContent = r.text; pet.say = r.text; pet.sayUntil = t + 10; pet.cheer = 0.6;
    CAP.sampleOk = true; discover('x-ask'); jlog(`asked Saelion: ${q}`);
  } catch (e) {
    const c = e && e.code;
    if (c === 'cancelled') return;
    if (c === 'not_granted' || c === 'sampling_disabled' || c === 'not_declared' || c === 'capability_disabled' || c === 'capability_removed') { CAP.sample = null; capsUI(); out.textContent = ''; return; }
    out.textContent = e.text || (c === 'rate_limited' ? 'Saelion needs a minute. ask again soon.' : "Saelion didn't catch that. try again.");
  }
}
async function newStory() {
  if (!CAP.sample) return;
  const ta = $('stText'), btn = $('stNew'); btn.disabled = true; ta.value = 'thinking…';
  const finds = [...found].map(id => CATI.get(id)).filter(Boolean).slice(-12).map(c => c.name).join(', ');
  const prompt = `Write a short storybook chapter (150 to 200 words, plain prose, lower case is fine, no title, no emoji) about Saelion, a small bunny with one gold eye and one blue eye who lives at the bottom of a valley where two musical notes agree, in a world of microtonal tunings. Make it gentle, a little funny, and specific. Weave in these things the reader actually found while playing: ${finds || 'a first landing'}. Also these moments from their session log, most recent last:\n${journal.slice(-24).join('\n')}`;
  try { const r = await CAP.sample(prompt, { cache: false, onText: ({ text }) => { ta.value = text; } }); ta.value = r.text; CAP.sampleOk = true; discover('x-newstory'); jlog('the storybook wrote a new chapter'); }
  catch (e) { const c = e && e.code; if (c === 'not_granted' || c === 'sampling_disabled') { CAP.sample = null; capsUI(); } ta.value = e.text || STORY; }
  btn.disabled = false;
}
