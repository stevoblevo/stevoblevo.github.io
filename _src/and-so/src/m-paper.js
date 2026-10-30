// ===== paper: the Storeybrook looks, the quiet switch (words only when they matter), notes or drones =====
// The six Storeybrook looks share one toolkit (vendor/storeybrook.*). On paper the world canvas is drawn as before and
// printed in ink: the glows of the night world become ink blooms on watercolor paper. Knight Night stays a night world.
const SB_LOOK = { 'sb-daylight': 'daylight', 'sb-knight': 'knight', 'sb-inkblot': 'inkblot', 'sb-comix': 'comix', 'sb-origami': 'origami', 'sb-skein': 'skein' };
const SB_NAMES = { 'sb-daylight': 'Meta Daylight', 'sb-knight': 'Knight Night', 'sb-inkblot': 'Ink Blot', 'sb-comix': 'Comix', 'sb-origami': 'Origami', 'sb-skein': 'Skein silk' };
const sbLook = () => SB_LOOK[skin] || '';
const paperLook = () => !!SB_LOOK[skin] && skin !== 'sb-knight';
const QUIET = () => !!SET.quiet && entered;
const FONTS0 = [F_SERIF, F_MONO, F_UI];
const FONTS_SB = {
  daylight: ['"Alegreya", "Iowan Old Style", Georgia, serif', '"Andika", system-ui, sans-serif', '"Andika", system-ui, sans-serif'],
  knight: ['"IM Fell English", Georgia, serif', '"Andika", system-ui, sans-serif', '"Andika", system-ui, sans-serif'],
  inkblot: ['"IM Fell English", Georgia, serif', '"Andika", system-ui, sans-serif', '"Andika", system-ui, sans-serif'],
  comix: ['"Comic Neue", "Comic Sans MS", sans-serif', '"Comic Neue", "Comic Sans MS", sans-serif', '"Comic Neue", "Comic Sans MS", sans-serif'],
  origami: ['"Zen Maru Gothic", "Arial Rounded MT Bold", sans-serif', '"Zen Maru Gothic", sans-serif', '"Zen Maru Gothic", sans-serif'],
  skein: ['"Alegreya", Georgia, serif', '"Andika", system-ui, sans-serif', '"Andika", system-ui, sans-serif']
};
const PAPER = { pal: null, key: '', dots: null, stip: null, knit: null, dotsKey: '' };
function tokRGB(name, fb) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
    const h = /^#([0-9a-f]{6})$/i.exec(v); if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16));
    const m = /rgba?\(([^)]+)\)/i.exec(v); if (m) return m[1].split(',').slice(0, 3).map(x => +x.trim());
  } catch (e) {}
  return fb || [128, 128, 128];
}
function paperPal() {
  if (PAPER.pal && PAPER.key === skin) return PAPER.pal;
  PAPER.key = skin;
  PAPER.pal = { sky: tokRGB('wash-sky', [200, 227, 244]), meadow: tokRGB('wash-meadow', [207, 227, 184]), rose: tokRGB('wash-rose', [243, 198, 211]), sun: tokRGB('wash-sun', [247, 220, 151]),
    brook: tokRGB('wash-brook', [140, 194, 230]), ink: tokRGB('art-line', [47, 59, 72]), sap: tokRGB('sap', [68, 112, 42]), accent: tokRGB('accent', [184, 50, 95]), paper: tokRGB('paper', [244, 246, 242]), water: tokRGB('art-water', [111, 176, 220]) };
  return PAPER.pal;
}
const ART = { img: {} };
const ART_LOOK = { glasshouse: 'glasshouse', peachfall: 'peachfall', 'sb-origami': 'origami-skein', 'sb-skein': 'origami-skein' };
const ART_WING = { Bach: 'bach', Mozart: 'mozart', Beethoven: 'beethoven', Tchaikovsky: 'tchaikovsky', Stravinsky: 'stravinsky' };
function artSrc(id) { return (typeof petBase === 'function' ? petBase() : '') + 'assets/art/' + id + '.webp'; }
function artLoad(id) {
  if (ART.img[id] || ART.img[id] === false) return;
  ART.img[id] = false;
  const img = new Image();
  img.onload = () => { if (img.naturalWidth > 2) { ART.img[id] = img; if (typeof applyLook === 'function') applyLook(); } };
  img.onerror = () => { ART.img[id] = false; };
  img.src = artSrc(id);
}
function artBoot() {
  const base = (typeof petBase === 'function' ? petBase() : '');
  fetch(base + 'assets/art/manifest.json').then(r => r.ok ? r.json() : null).then(m => {
    if (!m) return;
    const files = m.files || m.images || m;
    if (!files || typeof files !== 'object' || Array.isArray(files)) return;
    Object.keys(files).forEach(id => {
      const src = files[id] && (files[id].src || files[id]);
      if (typeof src !== 'string' || files[id].ready === false) return;
      const img = new Image();
      img.onload = () => { if (img.naturalWidth > 2) { ART.img[id] = img; applyLook(); } };
      img.src = src.startsWith('http') || src.startsWith('/') ? src : base + src.replace(/^\.\//, '');
    });
  }).catch(() => {});
}
function paintLookArt() {
  const id = ART_LOOK[skin];
  const img = id && ART.img[id];
  if (!img || img === true || !img.naturalWidth) return false;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, W, H);
  return true;
}
function wingRoomArt(composer) {
  const face = $('wingFace'); if (!face) return;
  const img = ART.img[ART_WING[composer] || ''];
  if (img && img.naturalWidth) {
    face.style.backgroundImage = `linear-gradient(rgba(246,241,230,.82), rgba(246,241,230,.9)), url("${img.src}")`;
    face.style.backgroundSize = 'cover';
    face.style.backgroundPosition = 'center';
  } else face.style.backgroundImage = '';
}
function applyLook() {
  const L = sbLook(), root = document.documentElement;
  if (L) root.dataset.sb = L; else delete root.dataset.sb;
  [F_SERIF, F_MONO, F_UI] = L ? FONTS_SB[L] : FONTS0;
  PAPER.key = ''; PAPER.dotsKey = '';
  inkSync();
  try { if (window.Storeybrook) window.Storeybrook.ensureDefs(); } catch (e) {}
  // the Storeybrook panels keep paper even in the old looks: Knight Night after dark, Meta Daylight in the light ones
  const il = L || (LIGHT_LOOKS.includes(skin) ? 'daylight' : 'knight');
  document.querySelectorAll('.sbi').forEach(el => { el.dataset.sb = il; });
  const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = L ? (getComputedStyle(root).getPropertyValue('--paper').trim() || '#f4f6f2') : '#140a12';
  document.querySelectorAll('[data-look]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === skin)));
  const painted = ART.img[ART_LOOK[skin]];
  if (painted && painted.naturalWidth) {
    document.body.style.backgroundImage = `url("${painted.src}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  } else document.body.style.backgroundImage = '';
}
artBoot();
// the patterns each paper uses under the terrain: halftone for Comix, stipple for Ink Blot, knit for Skein silk
function paperPattern(g, kind) {
  const P = paperPal(), key = kind + skin; if (PAPER[kind] && PAPER.dotsKey === key) return PAPER[kind];
  const c = document.createElement('canvas'), x = c.getContext('2d');
  if (kind === 'dots') { c.width = c.height = 9; x.fillStyle = rgba(P.water, 0.95); x.beginPath(); x.arc(4.5, 4.5, 2.4, 0, TAU); x.fill(); }
  else if (kind === 'stip') { c.width = c.height = 7; x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(3, 3, 1.4, 1.4); }
  else { c.width = 14; c.height = 10; x.strokeStyle = rgba(mix(P.meadow, P.ink, 0.35), 0.7); x.lineWidth = 1.2; x.beginPath(); x.moveTo(1, 2); x.lineTo(7, 8); x.lineTo(13, 2); x.stroke(); }
  PAPER[kind] = g.createPattern(c, 'repeat'); PAPER.dotsKey = key; return PAPER[kind];
}
// the meadow under the terrain and a flower for each voice, drawn on the multiply layer so they read as paint
function drawPaper3() {
  const g = ctx3, P = paperPal(), L = sbLook(), A0 = act && act.disp && act.wT > 0 ? act : voices.find(v => v.wT > 0 && v.disp);
  g.save();
  if (A0 && A0.disp && A0.dispInit) {
    const yOf = s => LB - hgt(A0.disp[s], A0) * (LB - LT) * 0.92;
    const path = () => { g.beginPath(); for (let s = 0; s < NS; s++) { const X = PX0 + (s / (NS - 1)) * PW + VIEW.rubber; if (s) g.lineTo(X, yOf(s)); else g.moveTo(X, yOf(s)); } };
    path(); g.lineTo(PX0 + PW + VIEW.rubber, LB + 2); g.lineTo(PX0 + VIEW.rubber, LB + 2); g.closePath();
    if (L === 'comix') { g.fillStyle = paperPattern(g, 'dots'); g.fill(); }
    else if (L === 'inkblot') { g.fillStyle = paperPattern(g, 'stip'); g.fill(); }
    else if (L === 'origami') {
      g.save(); g.clip();
      const n = 14; for (let i = 0; i < n; i++) { const x0 = PX0 + (i / n) * PW, x1 = PX0 + ((i + 1) / n) * PW; g.fillStyle = rgba(mix(P.meadow, i % 2 ? P.ink : P.paper, i % 2 ? 0.16 : 0.25), 0.95); g.beginPath(); g.moveTo(x0, LB + 2); g.lineTo((x0 + x1) / 2, LT - 40); g.lineTo(x1, LB + 2); g.closePath(); g.fill(); }
      g.restore();
    } else {
      const fg = g.createLinearGradient(0, LT, 0, LB); fg.addColorStop(0, rgba(P.meadow, 0.78)); fg.addColorStop(1, rgba(mix(P.meadow, P.sap, 0.22), 0.95)); g.fillStyle = fg; g.fill();
      if (L === 'skein') { g.fillStyle = paperPattern(g, 'knit'); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; }
    }
    path(); g.strokeStyle = rgba(mix(P.meadow, P.sap, 0.55), L === 'inkblot' ? 0 : 0.55); g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
    if (L !== 'origami' && L !== 'comix') {
      g.strokeStyle = rgba(L === 'inkblot' ? [0, 0, 0] : P.sap, 0.5); g.lineWidth = 1.1; g.beginPath();
      for (let s = 0; s < NS; s += 3) { const X = PX0 + (s / (NS - 1)) * PW + VIEW.rubber, Y = yOf(s), hh = (5 + ((s * 37) % 7)) * Math.max(0.9, S); g.moveTo(X, Y + 2); g.lineTo(X + Math.sin(t * 1.3 + s * 0.3) * 2, Y - hh); }
      g.stroke();
    }
  }
  for (const v of voices) {
    if (v.w < 0.05) continue; const b = ballPos(v); if (b.off) continue;
    const pc = L === 'inkblot' ? [40, 40, 40] : mix(v.col, P.accent, 0.18), r = (6 + 2 * v.flash) * S;
    g.strokeStyle = rgba(L === 'inkblot' ? [0, 0, 0] : P.sap, 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(b.X, b.Y + BR); g.quadraticCurveTo(b.X + 4 * S, (b.Y + LB) / 2, b.X, LB + 4); g.stroke();
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5 + t * 0.15 + v.id; g.fillStyle = rgba(pc, 0.62 * v.w); g.beginPath(); g.ellipse(b.X + Math.cos(a) * r * 1.05, b.Y + Math.sin(a) * r * 1.05, r, r * 0.58, a, 0, TAU); g.fill(); }
    g.fillStyle = rgba(P.sun, 0.9 * v.w); g.beginPath(); g.arc(b.X, b.Y, r * 0.5, 0, TAU); g.fill();
  }
  g.restore();
}

// ---------- the quiet switch: the words go; music names come in when the music changes ----------
let MUSIC_TEXT = false, chordShowT = -99, chordShowS = '';
function quietCanvas(c) {
  const orig = c.fillText;
  c.fillText = function () { if (QUIET() && !MUSIC_TEXT) return; return orig.apply(this, arguments); };
}
// ---------- ink: the light looks print the night canvas through invert(), so its words take a heavier hand ----------
// A cream word at 40% reads about 3.5:1 against the night sky and 2.4:1 once inverted onto paper: the same alpha,
// but light on dark and dark on light are not symmetric in luminance (measured through each look's own filter), and
// thin glyphs that glow at night look grey and spindly in ink. So on paper every word on the world canvas has its
// opacity lifted along 1 - (1 - a)^3.5 (the quietest labels, a = 0.36, come out near 0.8, past 4.5:1; full-strength
// words stay put), is drawn a hair heavier, and sits on a halo in the paper's own color, so it stays readable over
// the terrain, the halftone and the web. Marks that carry meaning (ticks, curves, card edges) use inkA() for a
// gentler lift; the soft glows stay as they are. The dark looks are untouched.
const INK = { on: false, k: 2.6, kText: 3.5, halo: [0, 0, 0] };
const inkA = (a, k) => (INK.on ? 1 - Math.pow(1 - clamp(a, 0, 1), k || INK.k) : a);
const NIGHT_BG = { daybreak: [16, 10, 22], story: [20, 14, 9], eink: [14, 14, 14], bw2: [0, 0, 0] };   // the old light looks paint a dark sky that CSS inverts
function inkSync() {
  INK.on = LIGHT_LOOKS.includes(skin);
  INK.halo = NIGHT_BG[skin] || paperPal().paper.map(v => 255 - v);   // drawn in night colors, printed as the paper
}
function inkCanvas(c) {
  const fill = c.fillText, RE = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
  c.fillText = function (s, x, y, mw) {
    if (!INK.on) return fill.apply(this, arguments);
    const fs = this.fillStyle, m = typeof fs === 'string' ? RE.exec(fs) : null, a = m && m[4] != null ? +m[4] : 1, A = inkA(this.globalAlpha * a, INK.kText);
    if (A < 0.004) return;
    const four = arguments.length > 3, plain = this.globalCompositeOperation === 'source-over', px = +((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 12])[1]);
    this.save(); this.lineJoin = 'round';
    if (plain) {   // the halo: night colors that print as the paper itself
      this.globalAlpha = A * 0.85; this.strokeStyle = rgba(INK.halo, 1); this.lineWidth = Math.max(2, px * 0.2); this.shadowColor = 'rgba(0,0,0,0)';
      if (four) this.strokeText(s, x, y, mw); else this.strokeText(s, x, y);
    }
    this.globalAlpha = A; if (m) this.fillStyle = `rgb(${m[1]},${m[2]},${m[3]})`;
    if (four) fill.call(this, s, x, y, mw); else fill.call(this, s, x, y);
    if (plain && px <= 20) {   // a hair of weight, so thin glyphs read as ink rather than pencil
      this.strokeStyle = this.fillStyle; this.lineWidth = clamp(px * 0.05, 0.45, 0.9);
      if (four) this.strokeText(s, x, y, mw); else this.strokeText(s, x, y);
    }
    this.restore();
  };
}

function setQuiet(on, quiet) {
  SET.quiet = !!on; document.body.classList.toggle('quiet', SET.quiet);
  if (!quiet) { if (SET.quiet) { caption('quiet: the words go away. the music still says its name.', 2600, 'music'); discover('x-quiet'); } else caption('the words are back.', 1800); }
  questsHide(); syncQuietUI(); persistSoon(); jlog(SET.quiet ? 'quiet on' : 'quiet off');
}
function syncQuietUI() {
  const b = $('cWords'); if (b) { b.setAttribute('aria-pressed', String(!!SET.quiet)); b.setAttribute('aria-label', SET.quiet ? 'show the words' : 'hide the words'); b.title = SET.quiet ? 'show the words (Q)' : 'hide the words (Q)'; }
  const s = $('sQuiet'); if (s) s.checked = !!SET.quiet;
}
// in quiet, a new chord name rises for a few seconds and goes
function quietChord() {
  if (!QUIET() || !chordNow) return;
  if (chordNow.str !== chordShowS) { chordShowS = chordNow.str; chordShowT = t; }
  const k = clamp(1 - (t - chordShowT - 2.6) / 1.4, 0, 1) * clamp((t - chordShowT) / 0.5, 0, 1); if (k <= 0.01) return;
  ctx.save(); MUSIC_TEXT = true; ctx.textAlign = 'center'; ctx.globalAlpha = 0.9 * k;
  ctx.fillStyle = 'rgba(248,232,204,0.95)'; ctx.font = fnt(30 * S, 's', 'italic'); ctx.fillText(chordNow.str, MX, Math.min(MY + MR * 1.5, LT - 40));
  MUSIC_TEXT = false; ctx.restore();
}

// ---------- quests come and go on their own ----------
let questsPinned = false, questsT = 0;
function questsPeek() {
  if (!entered || phone || QUIET() || REEL.on) return;
  const q = $('quests'); q.classList.add('on'); clearTimeout(questsT);
  if (!questsPinned) questsT = setTimeout(() => { if (!questsPinned) q.classList.remove('on'); }, 6500);
}
function questsHide() { clearTimeout(questsT); if (!questsPinned || QUIET()) $('quests').classList.remove('on'); }

// ---------- notes or drones ----------
function setArtic(a, quiet) {
  if (a !== 'pluck' && a !== 'drone') return;
  SET.artic = a; if (A.ac) { audio.rebuild(); audio.setRoot(fRoot); padSync(); }
  if (!quiet) caption(a === 'pluck' ? 'notes: every voice is plucked in time, nothing hums underneath.' : 'drones: the held sines of AND SO 6, root and all.', 3000, 'music');
  if (a === 'drone') discover('x-drone');
  syncArticUI(); persistSoon(); jlog(`articulation: ${a}`);
}
function syncArticUI() {
  document.querySelectorAll('[data-artic]').forEach(b => b.classList.toggle('on', b.dataset.artic === SET.artic));
  const bed = $('sBed'); if (bed) bed.checked = !!SET.bed;
  const ah = $('sAutoHum'); if (ah) ah.checked = !!SET.autoHum;
  const es = $('sEasyStart'); if (es) es.checked = !!SET.easyStart;
  const pe = $('sEerie'); if (pe) pe.checked = !!SET.petEerie;
  const ac = $('bArtic'); if (ac) ac.textContent = SET.artic === 'pluck' ? 'notes' : 'drones';
}

// ---------- keeping the AND SO 7 controls honest (called from syncUI) ----------
function sync7() {
  document.querySelectorAll('[data-look]').forEach(b => { const s = b.dataset.look, open = lookOpen(s); b.classList.toggle('on', s === skin); b.classList.toggle('locked', !open); b.setAttribute('aria-pressed', String(s === skin)); });
  syncArticUI(); syncQuietUI();
  document.querySelectorAll('[data-jam]').forEach(b => { const n = +b.dataset.jam; b.classList.toggle('on', JAM.on && JAM.sess === n); b.classList.toggle('locked', !jamOpen(n)); });
  const gm = $('gMirror'); gm.classList.toggle('locked', !mirAllowed()); gm.textContent = MIR.open ? 'close the mirror' : 'open the mirror';
  $('gEA').classList.toggle('hidden', allUnlocked);
  $('gNougats').textContent = `${GAME.nougats} in the jar · ${STONES.filter(stoneOpen).length} of ${STONES.length} stones open`;
  const bj = $('bJam'); bj.textContent = JAM.on ? '■ jam' : '♪ jam'; bj.classList.toggle('hot', JAM.on);
  const dj = $('dJam'); dj.classList.toggle('hot', JAM.on);
}
function cycleLook() {
  const L = Object.keys(SB_LOOK).filter(lookOpen), nx = L[(L.indexOf(skin) + 1) % L.length];
  if (nx && nx !== skin) turnPage(() => setSkin(nx));
}
