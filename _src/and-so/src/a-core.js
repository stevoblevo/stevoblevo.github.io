// ===== core: tunings, the dissonance model, ratio names, the field guide, shared state =====
const $ = id => document.getElementById(id);
// the page's own source, read before anything has changed it, so the mirror can open a fresh copy of the whole thing
const SELF_SRC = (() => {
  try {
    const app = $('andso-app'), css = $('andso-css'), js = $('andso-js'), sb = $('sb-js'), lk = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
    return app && css && js ? { app: app.outerHTML, css: css.textContent, js: js.textContent, sbj: sb ? sb.textContent : '', fonts: lk ? lk.href : '' } : null;
  } catch (e) { return null; }
})();
const TAU = Math.PI * 2, L3 = Math.log2(3), L5 = Math.log2(5);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c, al) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al})`;
const gauss = () => { let p = 0, q = 0; while (!p) p = Math.random(); while (!q) q = Math.random(); return Math.sqrt(-2 * Math.log(p)) * Math.cos(TAU * q); };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const r = a % b; a = b; b = r; } return a; };
const lcm = (a, b) => (a / gcd(a, b)) * b;
const mq = q => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
const reduceMotion = mq('(prefers-reduced-motion: reduce)');
const isTouch = mq('(pointer: coarse)') || (navigator.maxTouchPoints || 0) > 1;
let F_SERIF = '"Newsreader", ui-serif, Georgia, serif', F_MONO = '"DM Mono", ui-monospace, Menlo, monospace', F_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const fnt = (px, kind, style) => `${style || ''} ${Math.round(px)}px ${kind === 'm' ? F_MONO : kind === 'u' ? F_UI : F_SERIF}`;

// ---------- tunings: each is a spectrum, and the spectrum decides the scale ----------
const E5 = m => Math.pow(2, m / 5), E10 = m => Math.pow(2, m / 10), E31 = m => Math.pow(2, m / 31);
const MODES = {
  just: { key: 'just', title: 'just · 7-limit', short: 'just', eq: 2, R: [1, 2, 3, 4, 5, 6, 7], A: [1, 0.62, 0.46, 0.37, 0.3, 0.25, 0.21], root0: 130.8128, chimeR: 2, struck: false, ombak: 0, bg: [30, 22, 17], flo: [1, 5 / 4, 3 / 2, 2],
    blurb: 'harmonic tone, seven partials. valleys at whole-number ratios like 5/4, 3/2, and 7/4. the root walks a 5-limit lattice.' },
  gamelan: { key: 'gamelan', title: 'gamelan · slendro, ombak', short: 'gamelan', eq: 2, n: 5, R: [0, 5, 7, 12, 13, 17].map(E5), A: [1, 0.35, 0.55, 0.3, 0.22, 0.12], root0: 110, chimeR: 2, struck: true, ombak: 3.2, bg: [20, 24, 18], flo: [1, E5(1), E5(2), E5(3), 2],
    blurb: 'bar-like partials nudged onto a five-step grid, so the valleys land on a slendro-ish scale. every voice is tuned twice, a few hertz apart, and shimmers: ombak, the Balinese way.' },
  bp: { key: 'bp', title: 'Bohlen–Pierce · no octaves', short: 'BP', eq: 3, R: [1, 3, 5, 7, 9, 11], A: [1, 0.55, 0.4, 0.3, 0.22, 0.16], root0: 98, chimeR: 3, struck: false, ombak: 0, bg: [27, 18, 33], flo: [1, 5 / 3, 7 / 3, 3],
    blurb: 'odd harmonics only, roughly a clarinet. the octave stops being consonant, 3:1 takes over its job, and 3:5:7 is the major triad.' },
  tet10: { key: 'tet10', title: '10-TET · Sethares spectrum', short: '10-TET', eq: 2, n: 10, R: [0, 10, 16, 20, 23, 26, 28].map(E10), A: [1, 0.62, 0.46, 0.37, 0.3, 0.25, 0.21], root0: 110, chimeR: 2, struck: false, ombak: 0, bg: [15, 23, 30], flo: [1, E10(3), E10(6), 2],
    blurb: "ten equal steps per octave sound sour on harmonic tones. Sethares' fix: move the partials onto the ten-step grid, and the sourness goes with them." },
  tet31: { key: 'tet31', title: '31-EDO · Huygens–Fokker', short: '31-EDO', eq: 2, n: 31, R: [0, 31, 49, 62, 72, 80, 87].map(E31), A: [1, 0.62, 0.46, 0.37, 0.3, 0.25, 0.21], root0: 110, chimeR: 2, struck: false, ombak: 0, bg: [26, 16, 40], flo: [1, E31(10), E31(18), 2],
    blurb: "thirty-one equal steps of 38.7¢, Huygens' tuning and Fokker's organ. the partials sit on the grid, the thirds come out almost pure, and 25\\31 lands a hair under 7/4." },
  easy: { key: 'easy', title: 'easy listening · 12-TET', short: 'easy', eq: 2, n: 12, easy: true, R: [1, 2, 3, 4, 5, 6, 7], A: [1, 0.62, 0.46, 0.37, 0.3, 0.25, 0.21], root0: 130.8128, chimeR: 2, struck: false, ombak: 0, bg: [26, 20, 24], flo: [1, Math.pow(2, 4 / 12), Math.pow(2, 7 / 12), 2],
    blurb: "the piano's grid, familiar chords, a beat. the terrain stays honest: watch the thirds sit a little way up the valley walls." }
};
for (const k in MODES) {
  const m = MODES[k];
  m.fig = m.R.map((r, i) => (Math.abs(r - Math.round(r)) < 0.02 ? Math.round(r) : i + 1));
  m.eqC = 1200 * Math.log2(m.eq);
  m.norm = 1 / m.A.reduce((a, b) => a + b, 0);
}
const MODE_ORDER = ['just', 'gamelan', 'bp', 'tet10', 'tet31', 'easy'];
const MODE_TITLES = { any: 'anywhere', just: 'just', gamelan: 'gamelan', bp: 'Bohlen–Pierce', tet10: '10-TET', tet31: '31-EDO', easy: 'easy listening' };
const ACC = { just: [246, 195, 95], gamelan: [111, 214, 198], bp: [184, 162, 255], tet10: [120, 200, 240], tet31: [255, 150, 58], easy: [255, 160, 140] };
let M = MODES.just, PR = M.R, PA = M.A, PK = PR.length;

// ---------- range and sensory dissonance (Plomp–Levelt, Sethares' parameterization) ----------
const FLO = 196, XMAX = 1700, PSW = 30, NOISE = 1000, GAMMA = 2.4;
const fOf = x => FLO * Math.pow(2, x / 1200);
const xOf = f => 1200 * Math.log2(f / FLO);
function dTones(fa, fb) {
  let d = 0;
  for (let i = 0; i < PK; i++) {
    const p = fa * PR[i], ap = PA[i];
    for (let j = 0; j < PK; j++) {
      const q = fb * PR[j];
      let lo, df;
      if (p < q) { lo = p; df = q - p; } else { lo = q; df = p - q; }
      const z = (df * 0.24) / (0.0207 * lo + 18.96);
      if (z > 5) continue;
      d += ap * PA[j] * (Math.exp(-3.5 * z) - Math.exp(-5.75 * z));
    }
  }
  return d;
}
let D0 = 1, DS = 1, PSA = 1, GPULL = 1e5;
function recalibrate() {
  const f0 = M.root0, step = 2, arr = [];
  D0 = 0;
  for (let x = 0; x <= XMAX; x += step) { const d = dTones(fOf(x), f0); arr.push(d); if (d > D0) D0 = d; }
  DS = 0.55 * D0; PSA = 1.6 * D0;
  let bx = -1, bp = 0;
  for (let i = 3; i < arr.length - 3; i++) {
    if (!(arr[i] < arr[i - 1] && arr[i] <= arr[i + 1])) continue;
    let ml = arr[i], mr = arr[i];
    for (let k = 1; k <= 20; k++) { if (i - k >= 0) ml = Math.max(ml, arr[i - k]); if (i + k < arr.length) mr = Math.max(mr, arr[i + k]); }
    const p = Math.min(ml, mr) - arr[i];
    if (p > bp) { bp = p; bx = i * step; }
  }
  let sl = 0.005;
  if (bx >= 0) { const d0 = dTones(fOf(bx), f0); sl = Math.max(Math.abs(dTones(fOf(bx + 6), f0) - d0), Math.abs(dTones(fOf(bx - 6), f0) - d0)) / (6 * D0); }
  GPULL = clamp(1300 / Math.max(sl, 1e-9), 2e4, 3e6);
}

// ---------- ratio bookkeeping ----------
const JI = [{ p: 1, q: 1, c: 0, h: 1 }, { p: 2, q: 1, c: 1200, h: 2 }];
for (let q = 2; q <= 16; q++) for (let p = q + 1; p < 2 * q; p++) if (gcd(p, q) === 1) JI.push({ p, q, c: 1200 * Math.log2(p / q), h: p * q });
JI.sort((a, b) => a.h - b.h);
const JI8 = JI.filter(r => r.q <= 8);
const BPJI = [{ p: 1, q: 1, c: 0, h: 1 }, { p: 3, q: 1, c: 1200 * L3, h: 3 }];
for (let q = 1; q <= 25; q += 2) for (let p = q + 2; p < 3 * q; p += 2) if (gcd(p, q) === 1) BPJI.push({ p, q, c: 1200 * Math.log2(p / q), h: p * q });
BPJI.sort((a, b) => a.h - b.h);
const BP9 = BPJI.filter(r => r.q <= 9 && r.p <= 27);
function nearestAbs(c, list) { let best = list[0], bd = 1e9; for (const r of list) { const d = Math.abs(c - r.c); if (d < bd) { bd = d; best = r; } } return best; }
function simplestWithin(list, c, tol) { for (const r of list) if (Math.abs(c - r.c) <= tol) return r; return null; }
function fac(n) { const e = [0, 0, 0, 0], P = [2, 3, 5, 7]; for (let i = 0; i < 4; i++) while (n % P[i] === 0) { n /= P[i]; e[i]++; } return n === 1 ? e : null; }
const LET = 'FCGDAEB';
function letterName(n) { const idx = n + 1, L = LET[((idx % 7) + 7) % 7], acc = Math.floor(idx / 7); return L + (acc > 0 ? '♯'.repeat(acc) : acc < 0 ? '♭'.repeat(-acc) : ''); }
function noteName(a, b) { return letterName(a + 4 * b) + (b > 0 ? '↓'.repeat(b) : b < 0 ? '↑'.repeat(-b) : ''); }
const ETN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const GN = ['G', 'A♭', 'A', 'B♭', 'B', 'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯'];
const GD = ['1', '2', '3', '5', '6'];
const DEG12 = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
const CHORDS = {
  '4:5:6': 'just major triad', '10:12:15': 'just minor triad', '4:5:6:7': 'harmonic seventh', '4:5:7': 'harmonic seventh, no fifth',
  '4:6:7': 'harmonic seventh, no third', '5:6:8': 'major, first inversion', '3:4:5': 'major, second inversion', '12:15:20': 'minor, first inversion',
  '6:7:9': 'septimal minor triad', '8:10:12:15': 'just major seventh', '6:8:9': 'sus4', '8:9:12': 'sus2', '1': 'octaves of the root',
  '2:3': 'perfect fifth', '3:4': 'perfect fourth', '4:5': 'major third', '5:6': 'minor third', '3:5': 'major sixth', '5:8': 'minor sixth',
  '4:7': 'harmonic seventh', '6:7': 'septimal minor third', '7:8': 'septimal whole tone', '5:7': 'septimal tritone', '7:9': 'septimal major third'
};
const CHORDS_BP = { '3:5:7': 'Bohlen–Pierce major triad', '5:7:9': 'Bohlen–Pierce minor triad', '1': 'tritaves of the root' };
const COLORS = [[246, 195, 95], [255, 138, 112], [111, 214, 198], [184, 162, 255]];

// ---------- the field guide ----------
const CAT = [
  ['x-first', 'any', 'ev', '', 'first landing', 'a voice came to rest', "the bottom of a valley is where its partials line up with somebody else's.", 'let a voice settle'],
  ['x-full', 'any', 'ev', '', 'full house', 'four voices, all at rest', 'four voices on the floors of four valleys. the terrain approves.', 'four voices, all at rest at once'],
  ['x-fling', 'any', 'ev', '', 'voice-leading by catapult', 'threw a voice over the hills', 'it landed somewhere consonant anyway. physics is forgiving.', 'throw one'],
  ['x-wolf', 'any', 'ev', '', 'the wolf', 'held a voice somewhere it hates', 'named for the howling fifth in old keyboard tunings. you kept yours on purpose, which makes it a pet.', 'keep a voice somewhere it hates, for a while'],
  ['x-space', 'any', 'ev', '', 'personal space', 'two voices, one pitch', "they won't share a note. that's not acoustics: the bump is mine, not Sethares'.", 'try to make two voices share a pitch'],
  ['x-bird', 'any', 'ev', '', 'the bird', 'it sings over consonance', 'it only sings once the chord settles. it has standards.', 'settle a chord and listen'],
  ['x-tour', 'any', 'ev', '', 'field trip', 'every tuning', 'same terrain model, five different floors.', 'visit every tuning, easy listening included'],
  ['x-hands', 'any', 'ev', '', 'two hands', 'held two voices at once', 'a chord shaped by hand. the terrain bends under both fingers.', 'hold two voices at the same time'],
  ['x-four', 'any', 'ev', '', 'four-part harmony', 'four fingers, four voices', 'a barbershop quartet, played on glass.', 'hold four voices at once'],
  ['x-pinch', 'any', 'ev', '', 'pinch', 'stretched the scale', 'zoomed in, the cents get wide enough to see. the syntonic comma is about twenty-one of them.', 'pinch the scale, or drag up on it'],
  ['x-flingscale', 'any', 'ev', '', 'record stop', 'flung the scale', 'it glides and slows like a record coming to rest.', 'zoom in, then fling the scale sideways'],
  ['x-scaletap', 'any', 'ev', '', 'pitch pipe', 'tapped the scale', 'every point on the scale is a pitch. tap one to hear it before you commit a voice.', 'tap the scale under the terrain'],
  ['x-three', 'any', 'ev', '', 'three-finger lean', 'tapped with three fingers', 'everyone leans at once.', 'tap with three fingers'],
  ['x-round', 'any', 'ev', '', 'first constellation', 'finished a round', 'every target covered, every voice at rest.', 'play a round'],
  ['x-3star', 'any', 'ev', '', 'three stars', 'a round in under 12 seconds', 'fast and settled.', 'finish a round in under 12 seconds'],
  ['x-ear', 'any', 'ev', '', 'by ear', 'finished an ear round', 'no pegs, just the name and the sound.', 'finish an ear round, where the targets start hidden'],
  ['x-quest', 'any', 'ev', '', 'commission', 'finished a quest', 'someone asked, you delivered.', 'finish a quest'],
  ['x-combo5', 'any', 'ev', '', 'combo', 'five landings in a row', 'five voices landing, each within four seconds of the last.', 'land five voices in quick succession'],
  ['x-perfect', 'any', 'ev', '', 'perfect release', 'let go within 4¢ of a valley floor', 'you found it before the physics did.', 'let go of a voice right on a valley floor'],
  ['j-1/1', 'just', 'iv', '1/1', 'octave', '2/1 · 1200¢', 'treated as the same note by nearly every musical culture, which is as close to agreement as music gets.', 'the obvious one'],
  ['j-3/2', 'just', 'iv', '3/2', 'perfect fifth', '3/2 · 702.0¢', "two cents wider than the piano's. Pythagoras built a whole tuning by stacking these.", 'the second-simplest ratio'],
  ['j-4/3', 'just', 'iv', '4/3', 'perfect fourth', '4/3 · 498.0¢', "the fifth upside down, two cents narrower than the piano's.", 'a fifth, inverted'],
  ['j-5/4', 'just', 'iv', '5/4', 'just major third', '5/4 · 386.3¢', "the piano's major third is about 14¢ sharp of this. everyone just got used to it.", "a third the piano can't quite play"],
  ['j-6/5', 'just', 'iv', '6/5', 'just minor third', '6/5 · 315.6¢', "a hair wider than the piano's 300.", 'the darker third'],
  ['j-5/3', 'just', 'iv', '5/3', 'just major sixth', '5/3 · 884.4¢', 'the piano rounds it up to 900.', 'a sixth, sweetened'],
  ['j-7/4', 'just', 'iv', '7/4', 'harmonic seventh', '7/4 · 968.8¢', "about 31¢ flat of the piano's B♭, roughly where barbershop quartets park it.", "a seventh the piano can't reach"],
  ['j-7/6', 'just', 'iv', '7/6', 'septimal minor third', '7/6 · 266.9¢', 'smaller than any minor third on a keyboard, and somehow sweeter.', 'a third smaller than any key allows'],
  ['j-7/5', 'just', 'iv', '7/5', 'septimal tritone', '7/5 · 582.5¢', 'the tritone, declawed. diabolus in musica, retired.', "the devil's interval, minus the devil"],
  ['j-9/8', 'just', 'iv', '9/8', 'whole tone', '9/8 · 203.9¢', 'a fifth of a fifth. in this timbre you only get here by leaning on another voice.', 'two fifths, folded'],
  ['j-10/9', 'just', 'iv', '10/9', 'small whole tone', '10/9 · 182.4¢', 'short of 9/8 by exactly 81/80. the comma hides in the step sizes too.', 'the other whole tone'],
  ['j-15/8', 'just', 'iv', '15/8', 'just major seventh', '15/8 · 1088.3¢', 'a fifth above the major third, leaning hard on the octave.', 'a leading tone, just'],
  ['j-16/15', 'just', 'iv', '16/15', 'just semitone', '16/15 · 111.7¢', "wider than the piano's semitone, and says so.", 'the smallest step worth naming'],
  ['j-4:5:6', 'just', 'ch', '4:5:6', 'just major triad', '4:5:6', "the major triad with the beats taken out. the piano's version approximates this.", 'the happiest three numbers'],
  ['j-10:12:15', 'just', 'ch', '10:12:15', 'just minor triad', '10:12:15', 'the same two thirds as major, stacked the other way.', 'major, flipped'],
  ['j-4:5:6:7', 'just', 'ch', '4:5:6:7', 'harmonic seventh chord', '4:5:6:7', 'partials 4 through 7 of one note: the chord barbershop chases.', 'four consecutive partials'],
  ['j-6:7:9', 'just', 'ch', '6:7:9', 'septimal minor triad', '6:7:9', 'minor, built on the 7th harmonic. smoother than it has any right to be.', 'a minor chord made of sevens'],
  ['j-8:10:12:15', 'just', 'ch', '8:10:12:15', 'just major seventh chord', '8:10:12:15', 'four notes, zero beats, one jazz club.', 'major, plus its leading tone'],
  ['j-6:8:9', 'just', 'ch', '6:8:9', 'sus4', '6:8:9', "suspended: the fourth hangs instead of resolving. here it doesn't have to.", 'a chord that forgot its third'],
  ['j-comma', 'just', 'ev', '', 'the syntonic comma', '81/80 · 21.5¢', 'four reasonable moves and the root comes back 21.5¢ flat. 12-TET hides this by folding the lattice into a torus.', 'go around the lattice and come back wrong'],
  ['g-ombak', 'gamelan', 'ev', '', 'ombak', 'Balinese for "wave"', 'paired tunings a few hertz apart. the beating is the point, not a flaw.', 'land a voice in gamelan'],
  ['g-gong', 'gamelan', 'ev', '', 'the gong', 'end of the cycle', 'the biggest instrument plays the least and gets the last word.', 'wait for the end of a cycle'],
  ['g-all5', 'gamelan', 'ev', '', 'all five degrees', '1 · 2 · 3 · 5 · 6', 'slendro numbers its notes 1, 2, 3, 5, 6. there is no 4. there never was.', 'visit every slendro degree'],
  ['g-chord', 'gamelan', 'ev', '', 'a slendro chord', 'three degrees at once', '240¢ steps: no major thirds, no minor ones, and nobody misses them.', 'three degrees at once'],
  ['b-1/1', 'bp', 'iv', '1/1', 'the tritave', '3/1 · 1902.0¢', "Bohlen–Pierce's octave. odd harmonics agree on 3:1 and disagree on 2:1.", "the octave's replacement"],
  ['b-9/7', 'bp', 'iv', '9/7', 'supermajor third', '9/7 · 435.1¢', "between the piano's major third and its fourth. BP uses it as a scale step.", 'a third, overinflated'],
  ['b-7/5', 'bp', 'iv', '7/5', 'septimal tritone', '7/5 · 582.5¢', 'in Bohlen–Pierce this is a perfectly respectable scale degree.', 'a tritone with manners'],
  ['b-5/3', 'bp', 'iv', '5/3', 'major sixth', '5/3 · 884.4¢', 'the bottom half of the BP major triad.', 'half a triad'],
  ['b-7/3', 'bp', 'iv', '7/3', 'septimal minor tenth', '7/3 · 1466.9¢', 'the top of the BP major triad.', 'the top of a triad'],
  ['b-9/5', 'bp', 'iv', '9/5', 'large minor seventh', '9/5 · 1017.6¢', 'the top of the BP minor triad.', 'the top of the other triad'],
  ['b-3:5:7', 'bp', 'ch', '3:5:7', 'Bohlen–Pierce major triad', '3:5:7', 'no octaves were harmed in the making of this chord.', 'three odd numbers in a row'],
  ['b-5:7:9', 'bp', 'ch', '5:7:9', 'Bohlen–Pierce minor triad', '5:7:9', 'the other triad, same no-octave diet.', 'the next three odd numbers'],
  ['b-nooct', 'bp', 'ev', '', 'no octave', 'tried 2:1 here', "odd partials don't line up at 2:1, so there's no valley. a discovery of absence.", "try an octave where octaves don't work"],
  ['t-first', 'tet10', 'ev', '', 'sour, sweetened', '120¢ steps', 'with harmonic tones most of these steps sound wrong. with these partials they settle. the timbre was the problem.', 'land a voice in 10-TET'],
  ['t-5', 'tet10', 'ev', '', 'the shared tritone', '5\\10 · 600¢', 'the only 10-TET step besides the octave that the piano also has.', 'the one step the piano shares'],
  ['t-nopiano', 'tet10', 'ev', '', "a chord the piano can't play", 'two intervals off the piano grid', 'only 0, 600 and 1200¢ are shared with 12-TET. the rest falls between the keys.', 'two intervals the piano lacks, at once'],
  ['w-first', 'tet31', 'ev', '', 'thirty-one', '38.7¢ steps', 'Huygens proposed 31 equal steps in 1691; Fokker built an organ for them in 1950. a five-step grid with fine print.', 'land a voice in 31-EDO'],
  ['w-10', 'tet31', 'ev', '', 'the nearly pure third', '10\\31 · 387.1¢', 'within a cent of 5/4. the meantone dream: thirds pure, fifths a little narrow.', 'the 31-step major third'],
  ['w-25', 'tet31', 'ev', '', 'a hair under 7/4', '25\\31 · 967.7¢', 'the harmonic seventh, 1.1¢ flat. no smaller equal tuning gets this close.', 'the 31-step seventh'],
  ['w-chord', 'tet31', 'ev', '', 'the 31-step seventh chord', '0 · 10 · 18 · 25', 'almost exactly 4:5:6:7, on a grid you can build a keyboard for.', 'the four-note 31-step chord'],
  ['e-first', 'easy', 'ev', '', 'easy listening', 'the piano grid', 'twelve equal semitones: every interval slightly off, and everyone agreed to stop noticing.', 'try easy listening'],
  ['e-doowop', 'easy', 'ev', '', 'I–vi–IV–V', 'the fifties changes', 'the doo-wop progression, twice through. 1955 would approve.', 'wait for the fifties progression'],
  ['x-pet', 'any', 'ev', '', 'Saelion', 'it hatched', 'species: indeterminate. dimensions: five. eyes: two, different.', 'find your first thing'],
  ['x-zoom', 'any', 'ev', '', 'magnifier', 'zoomed past 6×', 'at this zoom a pixel is about a cent.', 'zoom in until a pixel is a cent'],
  ['x-tuplet', 'any', 'ev', '', 'tuplets', 'an odd number against the beat', 'the polygon around the mandala is the subdivision. silly, as requested.', 'pinch or scroll the mandala'],
  ['x-flip', 'any', 'ev', '', 'the flip', 'easy listening into just', "the piano's major third and the just one are 14¢ apart. that little slide is the whole argument.", 'flip from easy listening into just'],
  ['x-horizon', 'any', 'ev', '', 'event horizon', 'a voice fell in', 'it redshifted out of earshot. nothing gets out, except eventually something does.', 'feed the black hole'],
  ['x-hawking', 'any', 'ev', '', 'Hawking radiation', 'something got out', 'Hawking predicted black holes leak. this one leaks a chime.', 'wait after the black hole eats'],
  ['x-pandora', 'any', 'ev', '', "Pandora's box", 'you opened it', 'in the myth it was a jar; "box" is a 16th-century mistranslation. hope stayed inside.', 'open the box'],
  ['x-1955', 'any', 'ev', '', '1955', 'eighty-eight', "boogie-woogie in 7-limit just intonation. 1955's famous intro came from a 1946 Louis Jordan record; the rhythm under both goes back to Pinetop Smith's 1928 boogie.", 'get a voice up to eighty-eight'],
  ['x-rail', 'any', 'ev', '', 'end of the line', 'rode the whole rail', 'the guided tour, start to finish. you may now disembark.', 'ride the guided rail to the end'],
  ['x-sweet', 'any', 'ev', '', 'sweet spot', 'a chord held in the middle band', 'settled, unhurried, not too busy. the inverted U, found by ear. the lattice remembers.', 'let a settled chord sit for a while'],
  ['x-recurse', 'any', 'ev', '', 'recursion', 'five folds deep', 'every sweet spot changed what came next. that is the whole recursion.', 'collect sweet spots until the lattice folds five times'],
  ['x-lattice', 'any', 'ev', '', 'the 5D lattice', 'dragged a node', 'five parameters on one pentagon. the same lattice under every skin.', 'drag one of the five glowing nodes'],
  ['x-harp', 'any', 'ev', '', 'sky harp', 'played the air', 'every string is a note the chord already agrees with.', 'drag across the sky'],
  ['x-spin', 'any', 'ev', '', 'turntable', 'turned the mandala', 'a fifth of a turn moves the root. clockwise goes up.', 'turn the mandala'],
  ['x-bells', 'any', 'ev', '', 'church bells', 'tuned wrong on purpose', "a bell's tierce sits a minor third above its prime, which is why bells sound like bells. these are tuned to the current scale.", 'leave the bells on and wait'],
  ['x-train', 'any', 'ev', '', 'the train', 'long, long, short, long', 'the grade-crossing signal, in 4:5:6:7. the Doppler shift is free.', 'turn on the distant train and wait'],
  ['x-normie', 'any', 'ev', '', 'normie mode', 'nothing weird', 'the piano grid and familiar chords. the terrain still shows where the thirds would rather be.', 'switch normie on'],
  ['x-frolic', 'any', 'ev', '', 'frolic', 'no leaning', 'everything skips home on the beat. tension: optional.', 'switch the mood to frolic'],
  ['x-432', 'any', 'ev', '', '432 Hz', 'switched the reference', "31.8¢ flat of 440. the healing claims have never held up; it's just lower.", 'try the other reference pitch'],
  ['x-replay', 'any', 'ev', '', 'instant replay', 'wound the signal back', 'the last ten seconds live in a ring buffer on this page. nothing gets uploaded.', 'replay the last ten seconds'],
  ['x-story', 'any', 'ev', '', 'read aloud', 'the storybook, out loud', 'the voice comes from your device. if it has an Irish one, it uses that.', 'open the storybook and press read'],
  ['x-light', 'any', 'ev', '', 'beauty and light', 'consonance first', 'the same terrain, read the other way up: every valley is a little sun, and the voices go straight to it.', 'let a chord bloom in the light mood'],
  ['x-hum', 'any', 'ev', '', 'the hummer', 'heard the demo sing', 'a pretend person humming slightly out of tune, so you can hear what the listening does before you sing.', 'start the demo hummer'],
  ['x-mic', 'any', 'ev', '', 'your own voice', 'sang into the microphone', 'the pitch is worked out on this page, about twenty-five times a second. nothing is recorded or sent.', 'sing or hum into the microphone'],
  ['x-echo', 'any', 'ev', '', 'sung back in tune', 'the echo voice followed you', 'it sings your note, nudged onto the nearest valley floor. just-intonation autotune, for once in a good way.', 'hold a note while listening'],
  ['x-room', 'any', 'ev', '', 'the room’s key', 'tuned to a steady hum', 'a fridge, a fan, a tuning fork: anything steady for a few seconds becomes the root.', 'let a steady tone sound for a few seconds while listening'],
  ['x-adlib', 'any', 'ev', '', 'ad lib', 'Saelion wrote you into the story', 'every phrase you sing gets a line in the storybook, made up on the spot.', 'sing three phrases while listening'],
  ['x-cymatics', 'any', 'ev', '', 'cymatics', 'sand on a singing plate', 'Chladni sprinkled sand on a bowed metal plate in 1787. the sand runs off whatever moves and settles on the lines that stay still.', 'switch the sound box to cymatics'],
  ['x-figure', 'any', 'ev', '', 'a Chladni figure', 'the sand settled', "a plate's modes go up as n² + m², not 1, 2, 3. plates are inharmonic, which is why gongs and bells sound like gongs and bells.", 'let a chord ring on the plate until the sand settles'],
  ['x-powder', 'any', 'ev', '', 'the inverse pattern', 'fine powder at the antinodes', 'very fine powder rides the air currents over the plate and gathers where it moves most: the opposite of sand.', 'turn on the fine powder'],
  ['x-cube', 'any', 'ev', '', 'the lattice cube', 'fifths, thirds, sevenths', 'every just ratio is a point: three steps of 3/2 one way, 5/4 another, 7/4 the third. a major triad is a triangle; its minor is the same triangle flipped.', 'switch the sound box to the cube'],
  ['x-5d', 'any', 'ev', '', 'five dimensions', 'primes 3 to 13', 'thirty-two ratios on a penteract: every corner a product of 3, 5, 7, 11 and 13, every edge one prime. an experiment.', 'switch on the 5D experiment'],
  ['x-detective', 'any', 'ev', '', 'lattice detective', 'inspected a ratio', 'every node knows its prime factors and its Tenney height: log₂ of numerator times denominator. lower is simpler.', 'tap a node in the cube'],
  ['x-bw2', 'any', 'ev', '', 'two colors', 'black and white e-paper', 'one bit per pixel. the grays are an ordered dither, the same trick e-paper badges and early Macs used.', 'try the bw2 look'],
  ['x-fieldstone', 'any', 'ev', '', 'fieldstone', 'a sundress and a stone wall', 'mint florals, warm river stone, a carved wooden rosette. summer, mostly.', 'try the fieldstone look'],
  ['x-tilt', 'any', 'ev', '', 'marbles', 'tilted a voice into the next valley', 'tilt the phone and the voices roll downhill. level it again and the chord settles.', 'tilt your phone until a voice rolls'],
  ['x-shake', 'any', 'ev', '', 'snow globe', 'shook the phone', 'every voice jumps and lands somewhere new that still agrees.', 'shake your phone'],
  ['x-twist', 'any', 'ev', '', 'the dial', 'twisted the phone', 'a quick turn of the wrist turns the mandala, and the root moves with it.', 'give the phone a quick twist'],
  ['x-flick', 'any', 'ev', '', 'flick', 'flicked the phone', 'a flick of the wrist strums the chord, like a wand.', 'flick the phone sideways'],
  ['x-level', 'any', 'ev', '', 'spirit level', 'held it dead level', 'flat and still, within half a degree. the bubble is happy.', 'lay the phone flat and still'],
  ['x-pad', 'any', 'ev', '', 'controller', 'played with a gamepad', 'the left stick moves a voice, A glides, B moves the root, Y changes the view. the gamepad lab, put to work.', 'connect a game controller'],
  ['x-reel', 'any', 'ev', '', 'the reel', 'watched it all', 'fourteen shots, every look and view, one take.', 'watch the reel to the end'],
  ['x-crack', 'any', 'ev', '', 'crazing', 'the obsidian cracked', 'hold a dissonance and the glass cracks. let it resolve and the cracks cool, then heal.', 'hold a dissonance on the obsidian look'],
  ['x-wink', 'any', 'ev', '', 'Sae-wink', 'it winked back', 'open 2.6 seconds, closed 0.16, on its own clock. press it and it winks at you.', 'find the eye in the mint clearing'],
  ['x-spores', 'any', 'ev', '', 'three spores', 'found them all', 'three spores were hiding in the glasshouse haze.', 'find three spores in the glasshouse'],
  ['x-weather', 'any', 'ev', '', 'four weathers', 'peach fall to night garden', 'tension rains, a settled chord clears to mint, a quiet room turns to night.', 'see all four weathers in the peachfall look'],
  ['x-glasshouse', 'any', 'ev', '', 'glasshouse', 'cool air', 'mint haze, frost light, ridges that lean when you do.', 'try the glasshouse look'],
  ['x-peachfall', 'any', 'ev', '', 'peachfall', 'little worlds', 'petals, red rain, a mint clearing, a night garden: whatever the music is doing.', 'try the peachfall look'],
  ['x-ask', 'any', 'ev', '', 'conversation', 'asked Saelion something', 'it answered. mostly vibes, but well-read vibes.', 'ask Saelion a question'],
  ['x-newstory', 'any', 'ev', '', 'a new chapter', 'the storybook wrote one', 'written from what you found this session.', 'ask the storybook for a new story'],
  // AND SO 7 · Everfallen
  ['x-quiet', 'any', 'ev', '', 'quiet', 'the words went away', 'nothing on screen but the music, and the name of a chord when it changes.', 'hide the words'],
  ['x-drone', 'any', 'ev', '', 'the old hum', 'brought the drones back', 'AND SO 6 held every voice as a sine that never stopped. 7 plucks them. both are here.', 'switch from notes to drones'],
  ['x-nougat10', 'any', 'ev', '', 'a sweet tooth', 'ten nougats in the jar', 'nougats are kept, never spent. the jar opens stones on the brook.', 'collect ten nougats'],
  ['x-stone', 'any', 'ev', '', 'the brook', 'walked three stones', 'each stone is a whole scene at once: a look, a tuning, a view and a mood.', 'walk three stones on the brook'],
  ['x-story2', 'any', 'ev', '', 'a second story', 'read another one aloud', 'stories open as you walk the brook. the voice is your device’s, Irish English when it has one.', 'open a new story from the brook'],
  ['x-eyes', 'any', 'ev', '', 'how many eyes', 'she has nine now', 'the deeper the mirror and the longer you stay, the stranger Saelion gets. she says it is perfectly normal.', 'go deep enough that Saelion changes'],
  ['x-jam', 'any', 'ev', '', 'the band', 'sat in with the band', "built like Jamey Aebersold's Play-A-Longs: a rhythm section and a chart, the melody left to you.", 'start a jam from the brook, or press J'],
  ['x-blue', 'any', 'ev', '', 'a blue note', 'played between the keys', '7/6, 7/5 and 7/4 are where the research puts the blue third, fifth and seventh: none of them on a piano.', 'play a blue key on the jam pad'],
  ['x-blues4', 'any', 'ev', '', 'all the blues', 'four kinds of blue', 'a blue third at 7/6 and at 6/5, a blue fifth at 7/5, a blue seventh at 7/4 or 9/5.', 'play four different blue notes in one jam'],
  ['x-slur', 'any', 'ev', '', 'the slur', 'a blue third bent up to 5/4', 'between 6/5 and 5/4 is what Temperley and colleagues call a neutral third. the old records slide through it.', 'slide from a blue third up into the major third'],
  ['x-call', 'any', 'ev', '', 'trading twos', 'answered the horn', 'the horn played two bars and you answered with the same shape. that is the whole conversation.', 'answer the horn with the same ups and downs'],
  ['x-chorus', 'any', 'ev', '', 'a chorus', 'took a whole chorus', 'once around the form, on the changes. the band noticed.', 'play a good chorus in a jam'],
  ['x-mirror', 'any', 'ev', '', 'the mirror', 'opened AND SO inside AND SO', 'the copy is the whole page, running, seeded with your progress. it cannot touch your save.', 'open the mirror from the brook'],
  ['x-mirror3', 'any', 'ev', '', 'three deep', 'a window in a window in a window', 'three copies down, the copy stops copying. Saelion has opinions about it.', 'open windows three deep'],
  ['x-device', 'any', 'ev', '', 'device lab', 'simulated a screen', 'the copy believes it is a phone, a tablet or a TV, to the pixel, and lays itself out to match.', 'open a window in the mirror'],
  ['x-table', 'any', 'ev', '', 'the table', 'a TV or e-paper on the table', 'windows you can drag, fold and turn to face the other side of a table.', 'open a TV or e-paper window in the mirror'],
  ['x-61', 'any', 'ev', '', 'as it was', 'opened 6.1', 'AND SO 6.1, frozen the night 7 began, playing in a window of 7.', 'open 6.1 in the mirror'],
  ['x-look', 'any', 'ev', '', 'Storeybrook', 'a paper look', 'the same world printed in ink on watercolor paper, comic halftone, folded paper or knitted silk.', 'try a Storeybrook look'],
  ['x-skein', 'any', 'ev', '', 'the silk doll', 'Saelion, knitted', 'button eyes, copper braids, mint stitches. she never blinks, which means she has seen everything.', 'walk to SKEIN silk on the brook'],
  ['x-heard', 'any', 'ev', '', 'overheard', 'Saelion heard some words', 'the plain words come first. the mishearings come later, on purpose.', 'whisper something to Saelion, in the gamut'],
  ['x-ears', 'any', 'ev', '', 'ears open', 'let her overhear', "the browser's own speech recognition turns what it hears into words; Saelion only keeps the words.", 'switch on overhearing, in the gamut'],
  ['x-guard', 'any', 'ev', '', 'a guardian', 'a mishearing came to life', 'I see became an ice cube. every guardian switches something real on when you tap it.', 'say something near Saelion and wait'],
  ['x-guardtap', 'any', 'ev', '', 'the switch', 'tapped a guardian', 'no labels: the object is the button. tap it again to switch it off.', 'tap one of the guardians'],
  ['x-guard8', 'any', 'ev', '', 'a whole menagerie', 'eight guardians met', 'ice, hearts, eyes, moons, bees: whatever the room happened to say.', 'meet eight different guardians'],
  ['x-triclops', 'any', 'ev', '', 'triclops', 'three eyes found each other', 'every I she overhears might become an eye. three make a triclops, who likes triplets and three dimensions.', 'let Saelion overhear the word I, three times'],
  ['x-psyk', 'any', 'ev', '', 'psyklopea', 'an eye met a sigh', 'one eye, a pea pod, five dimensions.', 'say sigh, or psych, or peas, near an eye'],
  ['x-mondegreen', 'any', 'ev', '', 'mondegreen', 'Claude misheard it too', 'a mondegreen is a misheard lyric: the word comes from a 1954 essay that misheard a ballad.', 'whisper something where Claude can answer']
].map(a => ({ id: a[0], mode: a[1], kind: a[2], key: a[3], name: a[4], line: a[5], fact: a[6], hint: a[7] }));
const CATI = new Map(CAT.map(c => [c.id, c]));

// ---------- settings and shared state ----------
const SET = { hp: false, shim: 0.38, space: 0.62, sparkle: true, tease: 0.5, pace: 0.4, warm: 0.62, vol: 0.7, chimes: true, bird: true, haptics: true,
  flip: true, tune: 0.5, ref: 440, reg: true, bells: true, wind: false, rain: false, train: false, frolic: false, normie: false, light: true, petForm: 'bunny', ui: 0, follow: 'harmony',
  view: 'mandala', cymShape: 'square', cymLines: true, cymPowder: false, x5d: false, x5dSpeed: 0.4, x5dDepth: 0.5, detect: false, motion: true, roll: true, tiltK: 0.5,
  // AND SO 7 · Everfallen: notes instead of drones, easy listening first, the hummer only when asked, words only when they matter
  artic: 'pluck', bed: false, autoHum: false, easyStart: true, quiet: false, petEerie: true, earClaude: true };
const LIGHT = () => !!SET.light && !SET.frolic;
let W = 0, H = 0, S = 1, wide = true, latticeOn = false, LT = 0, LB = 0, SH = 34, PX0 = 0, PW = 1, MX = 0, MY = 0, MR = 100, BR = 8, NS = 0, DPR = 1, qScale = 1;
let SAT = 0, SAB = 0, TOPH = 0, PEEK = 0, phone = false;
let XS, FS, CR, TOT, vig;
let entered = false, muted = false, autoOn = true, paused = false, t = 0, last = performance.now();
let rs = { a: 0, b: 0, s: 0, e3: 0, e5: 0, e7: 0 }, fRoot = M.root0, REF = 1, TUNE = 1;
const path = [{ a: 0, b: 0 }], voices = [], sparks = [], rings = [], glyphs = [], valleyHits = [], floaters = [], harpTrail = [], fires = [], spag = [];
let vid = 0, act = null, nextAct = 0, userIdleUntil = 0, pump = null, lastPumpT = -999, gongDue = false;
const gam = { next: 0, b: 0 };
let Rs = 0, mrot = 0, bloomFlash = 0, rootFlash = 0, aurora = 0, chordNow = null, lastBloom = '', draggedOnce = false;
let found = new Set(), gDeg = new Set([0]), modesSeen = new Set(['just']);
const toastQ = [];
let toastFlush = 0, toastHideAt = 0, flourishT = 0, hoverTip = null, lastUserT = 0, nextTryT = 0, hintOffAt = 0;
const bird = { next: 0, notes: [], x: -100, y: -100, tx: -100, ty: -100, trail: [], alpha: 0, flash: 0, lastNote: -99, sung: false, discoverAt: 0 };
const VIEW = { x0: 0, x1: XMAX, vel: 0, rubber: 0 };
const W5 = [0.2, 0.2, 0.2, 0.2, 0.2];
const VNAMES = ['micro', 'groove', 'glow', 'drift', 'chaos'], VCOL = [[184, 162, 255], [255, 138, 112], [246, 195, 95], [111, 214, 198], [255, 96, 150]];
const VERT = VNAMES.map((_, k) => [Math.cos(-Math.PI / 2 + (k * TAU) / 5), Math.sin(-Math.PI / 2 + (k * TAU) / 5)]);
const BOX = { x: 0, y: 0, auto: false, drag: null, open: 0 };
const UNL = { pet: false, box: false, hole: false, rail: false };
const UNLOCKS = [{ id: 'pet', n: 1, name: 'Saelion' }, { id: 'box', n: 3, name: "Pandora's box" }, { id: 'hole', n: 6, name: 'the black hole' }, { id: 'rail', n: 10, name: 'the guided rail' }];
let allUnlocked = false;
const hole = { on: false, placed: false, x: 0, y: 0, c: 850, str: 0.5, m: 0, lab: '', spin: 0, lastEat: -99, hawkAt: 0 };
const rhy = { on: true, nextT: 0, step: 0, bar: -1, pat: null, base: null, bpm: 84 };
const visQ = [];
let tuplet = 4, tupAcc = 0, stepIdx = 0, stepFlash = 0, beatPulse = 0, skin = 'obsidian', tab = 'resonance';
let dyn = 0.75, dynTrend = 0, peak = 0, chill = 0, era = null, flash55 = 0, flipAt = 45, surpriseN = 0, rail = null, spaceT = 0;
let lastPX = 0, lastPY = 0;
const easyS = { key: 130.8128, prog: 0, i: 0, name: '', progName: '', next: 0 };
const pet = { hx: 0, hy: 0, x: -999, y: -999, placed: false, w: [0.5, 0.5, 0.5, 0.5, 0.5], lock: false, pose: 0, jump: 0, cheer: 0, hatch: 0, blink: 0, blinkT: 3, say: '', sayUntil: 0, triv: 0, lastTap: 0 };
const stars = Array.from({ length: 200 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * TAU, c: Math.random() }));
let lastMk = '', lastChordStr = '', lastRootJ = 0, sweetT = 0, seeds = 0, depth = 0, regHigh = 0, regLow = 0, regState = 'in the middle band', uiT = 0, frolT = 0;
const journal = [];
const LAT = [{ k: 'tune', n: 'Tuning', a: -90 }, { k: 'shim', n: 'Shimmer', a: -18 }, { k: 'pace', n: 'Pace', a: 54 }, { k: 'space', n: 'Space', a: 126 }, { k: 'warm', n: 'Warmth', a: 198 }];
const GAME = { score: 0, best: 0, combo: 0, lastLand: -99, rounds: 0, stars: 0, qdone: 0, quests: [], nougats: 0, played: 0, stones: [], stories: ['valley'], jamBest: 0, lastDay: '', guards: [], met: [], heard: 0, guardNougat: '' };
let round = null, roundN = 0;

const fold = (f, eq, lo) => { const hi = lo * eq; while (f >= hi) f /= eq; while (f < lo) f *= eq; return f; };
function computeRoot() {
  if (M.key === 'just') return fold(M.root0 * TUNE * Math.pow(3, rs.a) * Math.pow(5, rs.b), 2, 98);
  if (M.key === 'bp') return fold(M.root0 * TUNE * Math.pow(3, rs.e3) * Math.pow(5, rs.e5) * Math.pow(7, rs.e7), 3, 70);
  return fold(M.root0 * TUNE * Math.pow(2, rs.s / M.n), 2, 98);
}
const betaFor = isRoot => (M.ombak ? M.ombak * (0.35 + 0.65 * SET.shim) : SET.hp ? 0.25 + 1.1 * SET.shim : 0) * (isRoot ? 0.6 : 1);
const panOf = x => clamp((x / XMAX - 0.5) * 1.2, -0.7, 0.7);
const effTease = () => { const b = clamp(SET.tease * (0.55 + 0.9 * W5[4]) + 0.08 * W5[4], 0, 1); return LIGHT() ? b * 0.35 : b; };
const effPace = () => clamp(SET.pace * (0.65 + 0.7 * W5[1]) + 0.12 * W5[1] - 0.12 * W5[3], 0.05, 1);
const xToS = x => PX0 + ((x - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * PW + VIEW.rubber;
const xFromS = px => clamp(VIEW.x0 + ((px - VIEW.rubber - PX0) / PW) * (VIEW.x1 - VIEW.x0), 0, XMAX);
const zoomLevel = () => XMAX / (VIEW.x1 - VIEW.x0);
const holeTerm = x => { if (!hole.on) return 0; const dx = (x - hole.c) / 70; return -hole.m * Math.exp(-dx * dx); };
function relCents(f) { const r = f / fRoot, k = Math.floor(Math.log(r) / Math.log(M.eq) + 1e-9); return 1200 * Math.log2(r / Math.pow(M.eq, k)); }
function jlog(s) { journal.push(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}  ${s}`); if (journal.length > 500) journal.shift(); }
function haptic(ms) { if (!SET.haptics) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
