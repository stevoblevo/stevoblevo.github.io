// ===== the book: a jam-along fake book. charts are our own data. melody and words only when the tune is public domain here =====
var BOOK = { open: false, onPlay: false, id: '', tune: null, bars: [], meter: 4, events: [], bpm: 112, semi: 0, voice: 'piano', loop: true, abs: 0, bar: -1, beatIn: 0, sym: '', kind: 'book', heard: 0, timbre: '', also: null, blank: false,
  feel: 'swing', parts: { bass: true, comp: true, drums: true, melody: true }, voicing: 'full', reharm: 'off', countIn: true, practice: '', loopA: 1, loopB: 0, tuning: 'here' };
var bookNext = 0;
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// names spelled as the key spells them: sharps in G, D, A, E, B and F# major and in E, B, F#, C# and G# minor, flats elsewhere
function noteNames() {
  const k = BOOK.tune && BOOK.tune.key || 'C', minor = /^[A-G](#|b)?m$/.test(k), pc = typeof tonicPc === 'function' && BOOK.tune ? tonicPc() : 0;
  return (minor ? [4, 11, 6, 1, 8] : [7, 2, 9, 4, 11, 6]).includes(pc) ? NOTE_SHARPS : NOTE_NAMES;
}
const PC_OF = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

// ---------- names filed off (10.3): a pop catalog as changes only, every title hidden ----------
// The chapter's tunes (src/book-nf.json, made by names_filed_off.py) carry a riddle for a title, a hint (record and
// track) and the real title only as `h`, a hash of its normalised spelling. Type a name and the Book hashes it the same
// way; a match keeps your spelling of the name on this device (andso:named). No melody and no words, as for every tune
// here still in copyright.
const NF_KEY = 'andso:named';
const cyrb53 = (str, seed = 13) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
const nfNorm = t => {
  let s = String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[\u2019']/g, '');
  s = s.replace(/\b[a-z]+s version\b/g, ' ').replace(/\bfrom the vault\b/g, ' ').replace(/\b3am edition\b/g, ' ');   // a re-recording's or an edition's suffix
  return s.replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
};
const NF = { miss: {} };
function nfNamed() { try { return JSON.parse(localStorage.getItem(NF_KEY) || '{}') || {}; } catch (e) { return {}; } }
const nfTune = t => !!(t && t.chapter);   // a tune of the chapter (h empty: its name stays filed off for good)
function nfTitle(t) { return (nfTune(t) && nfNamed()[t.id]) || (t && t.title) || ''; }
function nfGuess(text) {
  const t = BOOK.tune; if (!nfTune(t) || !t.h) return;
  const say = $('bookGuessSay'), n = nfNorm(text);
  if (!n) return;
  if (cyrb53(n).toString(36) === t.h) {
    const all = nfNamed(); all[t.id] = String(text).trim().slice(0, 80);
    try { localStorage.setItem(NF_KEY, JSON.stringify(all)); } catch (e) {}
    if (say) say.textContent = 'named. that is the one.';
    if (!found.has('x-named')) caption('swizzle the swift came to the hills. touch her and she plays.', 4200);
    discover('x-named'); if (Object.keys(all).length >= 13) discover('x-named-13');
    if (typeof jlog === 'function') jlog('named a tune in the book');
    bookRender(); bookSpines(); return;
  }
  NF.miss[t.id] = (NF.miss[t.id] || 0) + 1;
  if (say) say.textContent = NF.miss[t.id] >= 3 && t.ini ? `not that one. its initials: ${t.ini}` : 'not that one.';
}

function pcOf(name) {
  if (!name) return null;
  const m = String(name).trim().match(/^([A-G](?:#|b)?)/);
  return m ? PC_OF[m[1]] : null;
}
function intervalsOf(q) {
  const s = String(q || '').replace(/\s/g, '').replace('−', 'm').replace('–', 'm').replace('°', 'dim').replace('ø', 'm7b5').replace('∆', 'maj7');
  const keys = ['m7b5', 'dim7', 'maj7', 'ma7', 'm7', 'm6', '7b9', '7#11', '7#9', '7sus', 'sus4', 'sus', 'dim', 'aug', 'maj', 'm', '7', '6', '9', '+'];
  const map = { m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], maj7: [0, 4, 7, 11], ma7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m6: [0, 3, 7, 9], '7b9': [0, 4, 7, 10, 13], '7#11': [0, 4, 7, 10, 18], '7#9': [0, 4, 7, 10, 15], '7sus': [0, 5, 7, 10], sus4: [0, 5, 7], sus: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8], maj: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], '6': [0, 4, 7, 9], '9': [0, 4, 7, 10, 14], '+': [0, 4, 8] };
  for (const k of keys) {
    if (s !== k && !s.startsWith(k)) continue;
    if (k === 'm' && (s.startsWith('maj') || s.startsWith('ma7'))) continue;
    if (k === '7' && (s.startsWith('7b') || s.startsWith('7#') || s.startsWith('7sus'))) continue;
    if ((k === '9' || k === '6' || k === 'maj') && s !== k) continue;
    return map[k];
  }
  return [0, 4, 7];
}
function parseChord(sym) {
  let s = String(sym || '').trim();
  if (!s || s === '·' || s === '-' || s === '—') return null;
  let bassName = null;
  const sl = s.indexOf('/');
  if (sl > 0) { bassName = s.slice(sl + 1); s = s.slice(0, sl); }
  const m = s.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!m || pcOf(m[1]) == null) return null;
  return { sym: sym, root: pcOf(m[1]), qual: m[2] || '', iv: intervalsOf(m[2] || ''), bass: bassName ? pcOf(bassName) : null };
}
function labelChord(sym, semi) {
  const c = parseChord(sym);
  if (!c) return '';
  const names = noteNames(), n = pc => names[(pc + semi + 120) % 12];
  return n(c.root) + (c.qual || '') + (c.bass != null ? '/' + n(c.bass) : '');
}
function parseMelody(s) {
  if (!s) return [];
  let at = 0;
  const out = [];
  String(s).trim().split(/\s+/).forEach(tok => {
    const m = tok.match(/^(-?\d+(?:\.\d+)?):(\d+\/\d+|\d+(?:\.\d+)?)$/);
    if (!m) return;
    const semi = +m[1];
    const dur = m[2].includes('/') ? m[2].split('/').reduce((a, b) => +a / +b) : +m[2];
    if (!(dur > 0)) return;
    out.push({ at, semi, dur });
    at += dur;
  });
  return out;
}
function normBars(bars) {
  if (!bars) return [['·']];
  if (typeof bars === 'string') return bars.split('|').map(b => b.trim().split(/\s+/).filter(Boolean));
  return bars.map(b => Array.isArray(b) ? b.slice() : String(b).split(/\s+/));
}
function chartById(id) {
  const b = (typeof BOOK_DATA !== 'undefined' ? BOOK_DATA : []).find(t => t.id === id);
  if (b) return Object.assign({ kind: 'book' }, b);
  const w = (typeof WING_DATA !== 'undefined' ? WING_DATA : []).find(t => t.id === id);
  return w ? Object.assign({ kind: 'wing' }, w) : null;
}
function tonicPc() {
  const home = BOOK.tune ? pcOf(BOOK.tune.key) : 0;
  return ((home == null ? 0 : home) + BOOK.semi + 120) % 12;
}
function keyName() { return noteNames()[tonicPc()] + (BOOK.tune && /m$/.test(BOOK.tune.key) && BOOK.tune.key !== 'C' && BOOK.tune.key.length > 1 && BOOK.tune.key.endsWith('m') ? 'm' : ''); }
function shownKey() {
  const k = BOOK.tune && BOOK.tune.key || 'C';
  const base = noteNames()[tonicPc()];
  return /^[A-G](#|b)?m$/.test(k) ? base + 'm' : base;   // any minor key (the pop chapter has F#m, G#m, Ebm…)
}

function ensAudible(part) {
  if (typeof ENS === 'undefined' || !ENS.on || ENS.n < 2) return true;
  const r = ENS.role;
  if (r === 'silent') return false;
  if (r === 'full') return true;
  if (r === 'bass') return part === 'bass' || part === 'drum';
  if (r === 'comp') return part === 'comp';
  if (r === 'melody') return part === 'melody';
  if (r === 'pad') return part === 'pad';
  return true;
}
function toneAt(t0, midi, dur, vel, part, force) {
  if (!A.ac || muted || !(vel > 0)) return;
  if (!force && !ensAudible(part)) return;
  midi = Math.max(28, Math.min(96, midi));
  const ac = A.ac, f = 440 * Math.pow(2, (midi - 69) / 12);
  const dest = A.ensBus || A.drumBus || A.bus;
  if (!dest) return;
  const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(), mix = ac.createGain();
  o.type = part === 'bass' ? 'sawtooth' : 'triangle';
  o2.type = 'sine';
  o.frequency.value = f;
  o2.frequency.value = f * (part === 'bass' ? 2 : 2.003);
  mix.gain.value = part === 'bass' ? 0.15 : BOOK.timbre === 'bell' && part === 'melody' ? 0.55 : 0.28;
  lp.type = 'lowpass';
  lp.frequency.value = part === 'bass' ? 380 : part === 'pad' ? 640 : BOOK.voice === 'guitar' && part === 'comp' ? 1200 : BOOK.timbre === 'reed' ? 1800 : 2400;
  o.connect(lp); o2.connect(mix); mix.connect(lp); lp.connect(g);
  const peak = vel * (part === 'bass' ? 0.26 : part === 'melody' ? 0.075 : part === 'pad' ? 0.04 : 0.06);
  const d = Math.max(0.09, dur * (BOOK.voice === 'guitar' && part === 'comp' ? 0.28 : 0.92));
  envG(g, t0, peak, d);
  g.connect(dest);
  o.start(t0); o2.start(t0); o.stop(t0 + d + 0.05); o2.stop(t0 + d + 0.05);
  if (BOOK.voice === 'guitar' && part === 'comp') nz(t0, 0.03, 'highpass', 2200, 0.8, 0.012 * vel);
}
function soundPc(chord, which) {
  const pc = which === 'bass' && chord.bass != null ? chord.bass : chord.root;
  return (pc + BOOK.semi + 120) % 12;
}

function bookTick() { /* the jam clock plays the chart */ }
function bookMix() {}
function bookEnsure() {
  if (!entered) return false;
  if (!A.ac) audio.init();
  if (!A.ac) return false;
  if (A.ac.state === 'suspended') A.ac.resume();
  if (typeof ensWire === 'function') ensWire();
  return true;
}
function bookPlay() {
  if (!BOOK.tune || !bookEnsure()) return;
  BOOK.onPlay = true;
  bookApplyFromUI();
  jamLoadChart(BOOK.tune, { play: true });
  bookPaint();
}
function bookPause() {
  BOOK.onPlay = false;
  if (JAM.chart && JAM.on) jamStop(true);
  bookPaint();
}
function bookChoose(id) {
  const t = chartById(id) || (BOOK_DATA && BOOK_DATA[0]);
  if (!t) return;
  BOOK.blank = false;
  BOOK.tune = t; BOOK.id = t.id; BOOK.kind = t.kind || (t.gate ? 'wing' : 'book');
  BOOK.bars = normBars(t.bars); BOOK.meter = t.meter || 4; BOOK.events = melodyAllowed(t) ? parseMelody(t.melody) : [];
  BOOK.timbre = t.timbre || ''; BOOK.also = t.also != null ? t.also : null;
  if (!BOOK.bpm) BOOK.bpm = t.tempo || 112;
  BOOK.bpm = t.tempo && !BOOK.touchedTempo ? t.tempo : BOOK.bpm;
  if (!BOOK.touchedTuning) BOOK.tuning = nfTune(t) ? 'just' : 'here';   // the pop chapter plays microtonal unless you say otherwise
  if (t.feel && !BOOK.touchedFeel) BOOK.feel = t.feel;   // a chart may say how it moves (the pop chapter is mostly straight)
  else if (BOOK.feel === 'swing' && BOOK.meter === 3 && !BOOK.touchedFeel) BOOK.feel = 'waltz';
  BOOK.loopB = BOOK.loopB && BOOK.loopB <= BOOK.bars.length ? BOOK.loopB : BOOK.bars.length;
  BOOK.bar = 0;
  bookRender();
  if (!BOOK.holdFace && $('bookOpen')) { $('bookOpen').hidden = false; if ($('wingFace')) $('wingFace').hidden = true; if (typeof WING !== 'undefined') WING.face = false; }
  if (BOOK.onPlay || (JAM.on && JAM.chart)) bookPlay();
  else jamLoadChart(t, { play: false });
}
function bookBlank() {
  BOOK.blank = true; BOOK.kind = 'book'; BOOK.id = 'yours';
  BOOK.tune = { id: 'yours', title: 'Your page', form: 'an empty sheet', key: 'C', pd: false, basis: 'And so, your turn.', bars: [['·'], ['·'], ['·'], ['·'], ['·'], ['·'], ['·'], ['·']], meter: 4, tempo: BOOK.bpm };
  BOOK.bars = normBars(BOOK.tune.bars); BOOK.meter = 4; BOOK.events = []; BOOK.loopB = 8;
  bookPause(); bookRender();
}
function bookSetSemi(d) {
  BOOK.semi = ((d % 12) + 12) % 12;
  bookRenderChart();
  if (JAM.chart) { JAM.semi = BOOK.semi; if (JAM.chord) jamChange(JAM.chord.id); jamUI(true); }
  bookPaint();
}
function bookNudgeKey(dir) { bookSetSemi(BOOK.semi + dir); }
function bookSetTempo(bpm) { BOOK.touchedTempo = true; BOOK.bpm = clamp(+bpm || 112, 40, 240); if (JAM.chart) JAM.bpm = BOOK.bpm; bookPaint(); }
function bookApplyFromUI() {
  const feel = $('bookFeel'); if (feel) BOOK.feel = feel.value;
  const tun = $('bookTuning'); if (tun) BOOK.tuning = tun.value;
  const voi = $('bookVoicing'); if (voi) BOOK.voicing = voi.value;
  const reh = $('bookReharm'); if (reh) BOOK.reharm = reh.value;
  const pr = $('bookPractice'); if (pr) BOOK.practice = pr.value;
  const cnt = $('bookCount'); if (cnt) BOOK.countIn = cnt.checked;
  const loop = $('bookLoop'); if (loop) BOOK.loop = loop.checked;
  const a = $('bookFrom'), b = $('bookTo');
  if (a) BOOK.loopA = clamp(+a.value || 1, 1, BOOK.bars.length || 1);
  if (b) BOOK.loopB = clamp(+b.value || BOOK.bars.length || 1, BOOK.loopA, BOOK.bars.length || 1);
  ['bass', 'comp', 'drums', 'melody'].forEach(part => {
    const el = $('bookPart-' + part); if (el) BOOK.parts[part] = el.checked && !el.disabled;
  });
  if (typeof bookApplyJam === 'function' && JAM.chart) bookApplyJam();
}
function bookJump(i) {
  BOOK.bar = i;
  if (JAM.chart && JAM.chart.play && JAM.chart.play[i]) {
    JAM.bar = i; JAM.bi = i;
    jamChange(JAM.chart.play[i][0]);
    if (JAM.on) jamUI(false);
  } else if (bookEnsure()) {
    const c = parseChord((BOOK.bars[i] || [])[0]);
    if (c) {
      const t0 = A.ac.currentTime + 0.02;
      toneAt(t0, 48 + soundPc(c, 'bass'), 0.7, 0.8, 'bass', true);
      const third = c.iv[1] != null ? c.iv[1] : 4;
      toneAt(t0, 60 + (soundPc(c, 'root') + third) % 12, 0.8, 0.7, 'comp', true);
    }
  }
  bookHighlight();
}

function bookMount() {
  const root = $('book'); if (!root || root.dataset.built) return; root.dataset.built = '1';
  root.className = 'book';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'the book');
  const part = (id, label) => `<label class="bk-part"><input type="checkbox" id="bookPart-${id}" checked> ${label}</label>`;
  root.innerHTML = '<div class="bk" id="bookOpen">'
    + '<div class="wh bk-h"><span class="wt">THE BOOK</span><span class="ws" id="bookKicker"></span><button type="button" class="wbtn" id="bookClose" aria-label="close the book">×</button></div>'
    + '<div class="bk-body">'
    + '<label class="bk-line">tune <select id="bookTune" aria-label="tune"></select></label>'
    + '<h2 id="bookTitle"></h2>'
    + '<p class="bk-form" id="bookForm"></p><p class="bk-basis" id="bookBasis"></p>'
    + '<form class="bk-name" id="bookName" hidden><span id="bookHint"></span><input id="bookGuess" type="text" autocomplete="off" spellcheck="false" placeholder="name it" aria-label="name this tune"><button type="submit" class="pill">name</button><span id="bookGuessSay" role="status" aria-live="polite"></span></form>'
    + '<div class="bk-chart" id="bookChart" role="list" aria-label="lead sheet"></div>'
    + '<div class="bk-controls">'
    + '<button type="button" class="pill" id="bookGo">play</button>'
    + '<label class="bk-line">tempo <b id="bookTempoN">112</b><input id="bookTempo" type="range" min="40" max="220" value="112" aria-label="tempo"></label>'
    + '<span class="bk-key"><button type="button" id="bookKeyDn" aria-label="one key down">−</button><b id="bookKeyN">C</b><button type="button" id="bookKeyUp" aria-label="one key up">+</button></span>'
    + '<label class="bk-line">feel <select id="bookFeel" aria-label="feel"><option value="swing">swing</option><option value="straight">straight</option><option value="bossa">bossa</option><option value="ballad">ballad</option><option value="waltz">waltz</option></select></label>'
    + '<span class="bk-parts">' + part('bass', 'bass') + part('comp', 'comp') + part('drums', 'drums') + part('melody', 'melody') + '</span>'
    + '<label class="bk-line">tuning <select id="bookTuning" aria-label="tuning"><option value="here">as you are</option><option value="just">just intonation</option><option value="tet31">31-EDO</option><option value="easy">piano (12-TET)</option></select></label>'
    + '<label class="bk-line">voicing <select id="bookVoicing" aria-label="voicing"><option value="shells">shells</option><option value="rootless">rootless</option><option value="full">full</option></select></label>'
    + '<label class="bk-line">reharm <select id="bookReharm" aria-label="reharm"><option value="off">off</option><option value="light">light</option></select></label>'
    + '<label class="bk-line">loop <input id="bookLoop" type="checkbox" checked aria-label="loop"> <input id="bookFrom" type="number" min="1" value="1" aria-label="loop from bar">–<input id="bookTo" type="number" min="1" value="1" aria-label="loop to bar"></label>'
    + '<label class="bk-line">count-in <input id="bookCount" type="checkbox" checked aria-label="count in"></label>'
    + '<label class="bk-line">practice <select id="bookPractice" aria-label="practice"><option value="">band plays</option><option value="bass">you play bass</option><option value="comp">you play chords</option><option value="drums">you play drums</option><option value="melody">you play the line</option></select></label>'
    + '</div>'
    + '<div class="bk-marks"><button type="button" id="bookToWing">the wing</button><button type="button" id="bookDream">dream</button><button type="button" id="bookKeep" hidden>keep</button></div>'
    + '<div class="page-pets" id="bookPets" hidden></div>'
    + '</div><div class="wing-face" id="wingFace" hidden></div></div>';
  on('bookClose', bookClose);
  on('bookGo', () => BOOK.onPlay ? bookPause() : bookPlay());
  on('bookKeyDn', () => bookNudgeKey(-1));
  on('bookKeyUp', () => bookNudgeKey(1));
  on('bookToWing', () => { if (typeof wingOpen === 'function') wingOpen(); });
  on('bookDream', () => { if (typeof dreamStart === 'function') dreamStart('book'); });
  on('bookKeep', () => { try { toggleRec(); } catch (e) {} });
  $('bookTempo').addEventListener('input', e => bookSetTempo(e.target.value));
  ['bookFeel', 'bookTuning', 'bookVoicing', 'bookReharm', 'bookPractice', 'bookLoop', 'bookCount', 'bookFrom', 'bookTo'].forEach(id => {
    const el = $(id); if (!el) return;
    el.addEventListener('change', () => { if (id === 'bookFeel') BOOK.touchedFeel = true; if (id === 'bookTuning') BOOK.touchedTuning = true; bookApplyFromUI(); bookPaint(); if (BOOK.onPlay) bookPlay(); });
  });
  ['bass', 'comp', 'drums', 'melody'].forEach(part => {
    const el = $('bookPart-' + part); if (!el) return;
    el.addEventListener('change', () => { bookApplyFromUI(); });
  });
  $('bookTune').addEventListener('change', () => bookChoose($('bookTune').value));
  $('bookName').addEventListener('submit', e => { e.preventDefault(); nfGuess($('bookGuess').value); });
  bookSpines();
  if (typeof wingMount === 'function') wingMount();
  if (typeof petSlotsPaint === 'function') petSlotsPaint($('bookPets'));
}
function bookSpines() {
  const host = $('bookTune'); if (!host || !BOOK_DATA) return;
  host.innerHTML = '';
  const named = nfNamed(); let group = null, label = '';
  BOOK_DATA.forEach(t => {
    const want = t.chapter ? `${t.chapter} · record ${t.record}` : 'standards';
    if (want !== label) { label = want; group = document.createElement('optgroup'); group.label = want; host.appendChild(group); }
    const o = document.createElement('option');
    o.value = t.id; o.textContent = nfTune(t) ? (named[t.id] ? `${named[t.id]} ✓` : t.title) : t.title;
    group.appendChild(o);
  });
  bookSpinesMark();
}
function bookRenderChart() {
  const el = $('bookChart'); if (!el) return;
  el.textContent = '';
  const bars = (JAM.chart && JAM.chart.id === BOOK.id && JAM.chart.play) ? JAM.chart.play : BOOK.bars;
  bars.forEach((chords, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bar'; b.dataset.i = String(i);
    const n = document.createElement('i'); n.textContent = String(i + 1);
    const name = document.createElement('b');
    const list = Array.isArray(chords) ? chords : [chords];
    name.textContent = list.map(c => labelChord(c, BOOK.semi)).filter(Boolean).join(' ') || '·';
    b.appendChild(n); b.appendChild(name);
    const mk = BOOK.tune && BOOK.tune.marks && BOOK.tune.marks[i];
    if (mk) { const s = document.createElement('em'); s.className = 'bar-mark'; s.textContent = mk; b.appendChild(s); b.classList.add('has-mark'); }
    b.addEventListener('click', () => bookJump(i));
    el.appendChild(b);
  });
  bookHighlight();
}
function bookRender() {
  bookMount();
  const t = BOOK.tune; if (!t) return;
  const nf = nfTune(t), named = nf && nfNamed()[t.id];
  $('bookKicker').textContent = BOOK.kind === 'wing' ? (t.composer || '') : nf ? 'changes · names filed off' : (t.pd ? 'public domain' : 'changes');
  $('bookTitle').textContent = nf ? (named || t.title) : (t.title || '');
  const nb = $('bookName');
  if (nb) {
    nb.hidden = !nf;
    if (nf) {
      $('bookHint').textContent = named ? `${t.hint} · its riddle: ${t.title}` : t.h ? t.hint : `${t.hint} · this one's name stays filed off`;
      $('bookGuess').hidden = !!named || !t.h; nb.querySelector('button').hidden = !!named || !t.h;
      if (NF.shown !== t.id) { NF.shown = t.id; $('bookGuess').value = ''; $('bookGuessSay').textContent = ''; }
    }
  }
  $('bookForm').textContent = [t.form, shownKey(), (t.meter || 4) + '/4'].filter(Boolean).join(' · ');
  $('bookBasis').textContent = t.basis || (typeof t.pd === 'string' ? t.pd : '') || '';
  bookRenderChart();
  bookSpinesMark();
  bookPaint();
  if (typeof MAG !== 'undefined') bookShowPets(!!MAG.found);
}
function bookSpinesMark() {
  const host = $('bookTune'); if (!host) return;
  host.value = BOOK.id || host.value;
}
function bookHighlight() {
  const el = $('bookChart'); if (!el) return;
  const bar = JAM.chart && JAM.on ? JAM.bi : BOOK.bar;
  [...el.children].forEach((n, i) => n.classList.toggle('is-now', i === bar));
  const cur = el.children[bar];
  if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: (typeof DEV !== 'undefined' && DEV.reduce) ? 'auto' : 'smooth' }); } catch (e) {} }
}
function bookPaint() {
  const k = $('bookKeyN'); if (k) k.textContent = shownKey();
  const n = $('bookTempoN'); if (n) n.textContent = String(BOOK.bpm | 0);
  const r = $('bookTempo'); if (r && document.activeElement !== r) r.value = String(BOOK.bpm | 0);
  const loop = $('bookLoop'); if (loop) loop.checked = !!BOOK.loop;
  const feel = $('bookFeel'); if (feel && document.activeElement !== feel) feel.value = BOOK.feel || 'swing';
  const tun = $('bookTuning'); if (tun && document.activeElement !== tun) tun.value = BOOK.tuning || 'here';
  const voi = $('bookVoicing'); if (voi && document.activeElement !== voi) voi.value = BOOK.voicing || 'full';
  const reh = $('bookReharm'); if (reh && document.activeElement !== reh) reh.value = BOOK.reharm || 'off';
  const pr = $('bookPractice'); if (pr && document.activeElement !== pr) pr.value = BOOK.practice || '';
  const cnt = $('bookCount'); if (cnt) cnt.checked = BOOK.countIn !== false;
  const a = $('bookFrom'); if (a && document.activeElement !== a) a.value = String(BOOK.loopA || 1);
  const b = $('bookTo'); if (b && document.activeElement !== b) b.value = String(BOOK.loopB || BOOK.bars.length || 1);
  const mel = $('bookPart-melody');
  if (mel) { mel.disabled = !melodyAllowed(BOOK.tune); if (mel.disabled) mel.checked = false; }
  ['bass', 'comp', 'drums', 'melody'].forEach(part => {
    const el = $('bookPart-' + part); if (el && !el.disabled && document.activeElement !== el) el.checked = BOOK.parts[part] !== false;
  });
  const go = $('bookGo'); if (go) go.textContent = BOOK.onPlay ? 'stop' : 'play';
  const keep = $('bookKeep'); if (keep) keep.hidden = BOOK.id !== 'yours';
}
function bookCover() {}
function bookOpen(id, opt) {
  opt = opt || {};
  if (!entered) { const hold = id, o = opt; $('enter').click(); setTimeout(() => bookOpen(hold, o), 700); return; }
  bookMount();
  if (typeof closeBrook === 'function' && $('brookMap') && $('brookMap').classList.contains('on')) closeBrook();
  $('book').classList.add('on'); $('book').setAttribute('aria-hidden', 'false');
  BOOK.open = true; document.body.classList.add('booking');
  if (id === 'blank') bookBlank();
  else if (id) bookChoose(id);
  else if (!BOOK.tune) bookChoose('st-louis');
  if (opt.play) bookPlay();
  if (opt.wing && typeof wingShow === 'function') wingShow(opt.wing, { play: !!opt.play });
  else if ($('wingFace')) $('wingFace').hidden = !(typeof WING !== 'undefined' && WING.face);
}
function bookClose() {
  bookPause(); BOOK.open = false;
  const root = $('book'); if (root) { root.classList.remove('on'); root.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('booking');
  if ($('wingFace')) $('wingFace').hidden = true;
}
function bookShowPets(on) {
  const el = $('bookPets'); if (!el) return;
  el.hidden = !on;
  if (on && typeof petSlotsPaint === 'function') petSlotsPaint(el);
}
on('bookMark', () => bookOpen(BOOK.id || 'st-louis'));
window.addEventListener('keydown', e => {
  if (typeof DREAM !== 'undefined' && DREAM.on) return;
  if (!$('book') || !$('book').classList.contains('on')) return;
  const tg = e.target && e.target.tagName;
  if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  if (e.key === 'Escape') { bookClose(); e.stopPropagation(); }
  else if (e.key === ' ') { e.preventDefault(); BOOK.onPlay ? bookPause() : bookPlay(); }
}, true);
