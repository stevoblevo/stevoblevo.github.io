// ===== the reels: a short film for every look, and the cut (every look in one take) =====
// Each reel stays in its own look and shows its own things, and with autoplay on they run into each other like a
// channel. Touching anything hands it back to you, with whatever you had set. Watching pays part of the way, never
// all of it: a reel credits only the finds it shows (a gate in discover() turns the rest away while one plays),
// every two reels watched to the end put one nougat in the jar, points come at half rate, quests fill at most
// halfway, combos and the lattice's sweet-spot folds don't count. All sixteen come to about two fifths of the field
// guide and eight nougats (five of the thirteen stones); the rest is yours to play for.
const REEL = { on: false, R: null, id: '', i: -1, next: 0, shotT: 0, t0: 0, saved: null, subs: [], flash: 0, bars: 0, done: false, run: 0, cardT: 0, news: [] };

// ---------- what the shots do ----------
function reelLook(s, v) {
  if (s && skin !== s) setSkin(s);
  if (v) { if (v === 'd5') SET.x5d = true; if (viewOn() !== v) setViewMode(v, true); }
}
function reelMood(m) {
  if (m === moodNow()) return;
  if (SET.frolic) { SET.frolic = false; SET.tease = SET._tease !== undefined ? SET._tease : 0.5; pet.pose = 0; }
  if (m === 'frolic') { SET.frolic = true; SET._tease = SET.tease; SET.tease = 0.12; }
  else SET.light = m === 'light';
  if (m === 'light') for (const v of voices) if (v.wT > 0 && !v.dragging && !v.locked) { v.temp = 0; v.v *= 0.3; v.pinUntil = 0; }
  syncUI();
}
// a whole scene at once, quietly: look, tuning, sound box, mood, how many voices, the beat
function reelScene(o) {
  if (o.skin && skin !== o.skin) setSkin(o.skin);
  if (o.mode && o.mode !== M.key) setMode(o.mode, true);
  if (o.view) reelLook(null, o.view);
  if (o.mood) reelMood(o.mood);
  if (o.pet) SET.petForm = o.pet;
  if (o.tuplet) setTuplet(o.tuplet, true);
  if (o.beat !== undefined) { rhy.on = !!o.beat; rhy.nextT = 0; }
  if (o.n) reelCount(o.n);
  syncUI();
}
const reelLive = () => voices.filter(v => v.wT > 0 && !v.dragging).sort((a, b) => a.x - b.x);
function reelVoices(n) { for (let i = voices.filter(v => v.wT > 0).length; i < n; i++) if (!lightAdd()) break; }
// exactly n voices: new ones arrive on sweet spots, the longest-settled ones leave first
function reelCount(n) {
  let live = voices.filter(v => v.wT > 0);
  while (live.length > n) { const o = live.reduce((a, b) => (a.lockT < b.lockT ? a : b)); if (!dropVoice(o)) break; live = voices.filter(v => v.wT > 0); }
  for (let i = live.length; i < n; i++) if (!lightAdd()) break;
}
function reelVoice() { return (act && act.wT > 0 && !act.dragging ? act : null) || voices.find(v => v.wT > 0 && !v.dragging) || null; }
// park a voice on the nearest hilltop and hold it there: a dissonance on purpose
function reelHill() {
  const v = reelVoice(); if (!v) return;
  let bx = v.x, bd = -1;
  for (let x = Math.max(80, v.x - 170); x <= Math.min(XMAX - 80, v.x + 170); x += 4) { const d = Dv(v, x); if (d > bd) { bd = d; bx = x; } }
  v.locked = false; v.glide = null; v.echo = null; v.target = null; v.x = bx; v.v = 0; v.temp = 0; v.pinUntil = t + 2.9; v.flash = 1; act = v;
}
function reelRelease() { for (const v of voices) { v.hold = 0; if (v.wT > 0 && !v.dragging) { v.pinUntil = 0; v.temp = 0.05; } } }
// a reel sets a voice down exactly on its ratio or step, and holds it there until the shot is over, so the chord it
// is showing is the chord you hear
function reelGlide(v, x, dur) {
  if (!v || x == null) return;
  v.locked = false; v.pinUntil = 0; v.target = null; v.echo = null; v.hist.length = 0; v.histT.length = 0;
  v.glide = { x0: v.x, x1: x, t0: t, dur: dur || 0.5 + 0.0011 * Math.abs(x - v.x), exact: true }; act = v;
  v.hold = Math.max(REEL.next, t + 1) + 0.3;
}
// where frequency f sits on the terrain, folded by the tuning's period (octave, or tritave in Bohlen–Pierce), nearest
// `from` and clear of the places in `used`
function reelNear(f, from, used) {
  let best = null, bd = 1e9;
  for (let o = -4; o <= 5; o++) {
    const x = xOf(f * Math.pow(M.eq, o)); if (x < 100 || x > XMAX - 100 || (used && used.some(u => Math.abs(u - x) < 60))) continue;
    const d = Math.abs(x - from); if (d < bd) { bd = d; best = x; }
  }
  return best;
}
// glide the k-th voice from the left onto ratio r above the root
function reelRatio(r, k) {
  const live = reelLive(), v = live[Math.min(k || 0, live.length - 1)]; if (!v) return;
  reelGlide(v, reelNear(fRoot * r, v.x, live.filter(o => o !== v).map(o => o.x)));
}
// a chord: one voice per ratio, each folded toward the middle of the terrain
function reelChord(rs) {
  reelCount(rs.length);
  const live = reelLive(), xs = [];
  for (const r of rs) { const x = reelNear(fRoot * r, XMAX * 0.5, xs); if (x != null) xs.push(x); }
  xs.sort((a, b) => a - b);
  live.forEach((v, i) => { if (xs[i] != null) reelGlide(v, xs[i]); });
}
// k steps of an equal tuning (31-EDO, 10-TET, the five of slendro)
function reelStep(k, idx) { if (M.n) reelRatio(Math.pow(2, k / M.n), idx); }
function reelSteps(ks) { if (M.n) reelChord(ks.map(k => Math.pow(2, k / M.n))); }
// the NIC.LAN reel's last shot: a held 9/8 appoggiatura resolves to the root
function reelNineEight() {
  const v = reelVoice(); if (!v || M.key !== 'just') return;
  const near = r => { let best = null, bd = 1e9; for (let o = -2; o <= 4; o++) { const x = xOf(fRoot * r * Math.pow(2, o)); if (x < 150 || x > XMAX - 150) continue; const d = Math.abs(x - v.x); if (d < bd) { bd = d; best = x; } } return best; };
  const x98 = near(9 / 8); if (x98 == null) return;
  v.locked = false; v.glide = null; v.echo = null; v.target = null; v.x = x98; v.v = 0; v.temp = 0; v.pinUntil = t + 3.8; v.flash = 1; act = v;
  REEL.subs.push({ at: t + 4.2, fn: () => { const x1 = near(1); if (x1 == null || v.wT === 0) return; v.pinUntil = 0; v.hist.length = 0; v.histT.length = 0; v.glide = { x0: v.x, x1, t0: t, dur: 1.6 }; } });
}
// a black hole right on top of a voice: it holds still, falls in, and a chime leaks back out a few seconds later
function reelHole() {
  if (voices.filter(v => v.wT > 0).length < 2) lightAdd();
  const v = reelVoice(); if (!v) return;
  hole.on = true; hole.placed = true; hole.x = xToS(v.x); hole.y = LT - 22 * S; hole.lastEat = -99;
}
function reelBox() {
  BOX.open = 1; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.95; BOX.x = Math.cos(a) * r; BOX.y = Math.sin(a) * r; BOX.auto = false;
  lean(1.2); discover('x-pandora');
}
function reelProg(i) { if (!M.easy) return; easyS.prog = i; easyS.i = 0; easyAdvance(); }
function reelSay(s, secs) { if (!UNL.pet) return; pet.say = s; pet.sayUntil = t + (secs || 6); pet.cheer = 1; }

// ---------- the cut: fourteen shots across every look, cut like the NIC.LAN reel (a name, a tuning line, a caption) ----------
const SHOTS = [
  { n: 'Boot', d: 7, tune: 'just · 7-limit · a drone on the root', cap: 'a drone on the root. the voices roll home to their valleys.', go: () => { setMode('just', true); reelLook('dawn', 'mandala'); reelMood('light'); reelVoices(3); } },
  { n: 'Bloom', d: 7, tune: 'light · consonance first', cap: 'every valley is a little sun. when they all land, the chord blooms.', go: () => lean(1), at: [[3.6, () => chooseRootStep()]], gives: ['x-light'] },
  { n: 'Plate', d: 9, tune: 'cymatics · a centre-driven square plate', cap: 'the chord rings a steel plate. the sand runs off whatever moves and rests on the lines that stay still.', go: () => { SET.cymShape = 'square'; SET.cymPowder = false; reelLook(null, 'cymatics'); cymReset(); }, gives: ['x-cymatics'] },
  { n: 'Round', d: 8, tune: 'cymatics · a round plate, bowed at the edge', cap: 'a round plate: diameters and circles. Chladni drew these in 1787.', go: () => { SET.cymShape = 'circle'; cymReset(); }, at: [[4.2, () => { SET.cymPowder = true; }]], gives: ['x-figure', 'x-powder'] },
  { n: 'Lattice', d: 8, tune: 'cube 3D · 3 × 5 × 7', cap: 'fifths across, thirds up, sevenths back. the lit trail is the evidence.', go: () => { SET.cymPowder = REEL.saved.cymPowder; SET.cymShape = REEL.saved.cymShape; SET.detect = true; reelLook(null, 'cube'); VW.vyaw = 0.9; }, gives: ['x-cube'] },
  { n: 'Penteract', d: 8, tune: '5D · primes 3, 5, 7, 11, 13', cap: 'five primes, five dimensions, thirty-two ratios on one shape.', go: () => { SET.x5d = true; reelLook(null, 'd5'); }, gives: ['x-5d'] },
  { n: 'Crack', d: 9, tune: 'obsidian · a held dissonance', cap: 'hold a dissonance and the obsidian cracks.', go: () => { SET.detect = REEL.saved.detect; reelLook('obsidian', 'mandala'); reelMood('lean'); reelHill(); }, at: [[3.1, reelHill], [6.1, reelHill]], gives: ['x-crack'] },
  { n: 'Cool', d: 6, tune: 'resolution', cap: 'let it resolve and the glass cools.', go: () => { reelMood('light'); reelRelease(); } },
  { n: 'Thirty-one', d: 10, tune: '31-EDO · 38.7¢ steps · 25\\31 = 967.7¢, a hair under 7/4', cap: 'thirty-one steps to the octave, Huygens’ tuning. 25\\31 sits a hair under 7/4.', go: () => { WX.crack.grow = 0; reelLook('dawn', 'mandala'); setMode('tet31', true); }, at: [[2.4, () => reelStep(25)], [5.4, () => reelStep(10)]], gives: ['w-first', 'w-25', 'w-10'] },
  { n: 'Weather', d: 13, tune: 'peachfall · peach fall, red rain, mint clearing, night garden', cap: 'the weather follows the music: tension rains, a settled chord clears, a quiet room turns to night.', go: () => { setMode('just', true); reelLook('peachfall', 'mandala'); WX.force = [1, 0, 0, 0]; }, at: [[3.2, () => (WX.force = [0, 1, 0, 0])], [6.4, () => (WX.force = [0, 0, 1, 0])], [9.6, () => (WX.force = [0, 0, 0, 1])]], gives: ['x-peachfall', 'x-weather'] },
  { n: 'Glasshouse', d: 8, tune: 'glasshouse · cool air, frost light', cap: 'cool air and frost light. tilt the phone and the ridges lean with you. three spores are hiding.', go: () => { WX.force = null; reelLook('glasshouse', 'mandala'); }, gives: ['x-glasshouse'] },
  { n: 'Fieldstone', d: 6, tune: 'fieldstone · a carved wooden rosette', cap: 'a stone wall, mint florals, a carved rosette behind the mandala.', go: () => reelLook('fieldstone', 'mandala'), gives: ['x-fieldstone'] },
  { n: 'Paper', d: 7, tune: 'bw2 · one bit per pixel, then e-ink', cap: 'one bit per pixel: every grey is a pattern of dots.', go: () => reelLook('bw2', 'cymatics'), at: [[3.6, () => reelLook('eink', 'mandala')]], gives: ['x-bw2'] },
  { n: 'Daybreak', d: 10, tune: 'just · a held 9/8 resolves to 1/1', cap: 'a held 9/8 leans on the root, then resolves. that is the whole story.', go: () => { reelLook('daybreak', 'mandala'); reelMood('light'); reelNineEight(); }, gives: ['j-9/8'] }
];

// ---------- a reel for every look: each shows its own things ----------
const REELS = [
  { id: 'sb-daylight', name: 'Meta Daylight', line: 'watercolor paper, the piano grid, the fifties changes, the flip, and the bird', shots: [
    { n: 'Paper', d: 9, tune: 'easy listening · 12-TET', cap: 'Meta Daylight: the world printed in ink on watercolor paper, and easy listening first: the piano’s grid.', go: () => reelScene({ skin: 'sb-daylight', mode: 'easy', view: 'mandala', mood: 'light', n: 3, beat: true, tuplet: 4 }), gives: ['e-first'] },
    { n: 'Doo-wop', d: 12, tune: 'I–vi–IV–V · 12-TET', cap: 'I, vi, IV, V: the doo-wop changes. the thirds sit a little way up the valley walls.', go: () => reelProg(3), gives: ['e-doowop'] },
    { n: 'The flip', d: 10, tune: 'easy listening → just · the thirds slide 14¢', cap: 'the flip: the same chord, and the piano’s thirds slide about fourteen cents down into their valleys.', go: () => setMode('just', true), gives: ['x-flip'] },
    { n: 'Birdsong', d: 11, tune: 'just · a settled 4:5:6', cap: 'settle a chord and the bird sings over it, leaning on each note before it lands.', go: () => { SET.bird = true; reelChord([5 / 4, 3 / 2, 2]); bird.next = Math.min(bird.next, t + 2.4); }, gives: ['x-bird'] },
    { n: 'Glide', d: 8, tune: 'light · consonance first', cap: 'in the light mood the voices glide from one sweet spot to the next.', go: () => lean(1), at: [[4, () => lean(1)]] }
  ] },
  { id: 'sb-knight', name: 'Knight Night', line: 'a cobalt paper theatre in thirty-one steps, and the lattice cube', shots: [
    { n: 'Curtain', d: 9, tune: '31-EDO · 38.7¢ steps', cap: 'Knight Night: a paper theatre after dark, in thirty-one equal steps to the octave. Huygens’ tuning.', go: () => reelScene({ skin: 'sb-knight', mode: 'tet31', view: 'mandala', mood: 'light', n: 3 }), gives: ['w-first'] },
    { n: 'Ten steps', d: 9, tune: '10\\31 = 387.1¢ · 5/4 = 386.3¢', cap: 'ten steps: 387.1 cents, within a cent of a pure major third.', go: () => reelStep(10, 0), gives: ['w-10'] },
    { n: 'Twenty-five', d: 9, tune: '25\\31 = 967.7¢ · 7/4 = 968.8¢', cap: 'twenty-five steps: a hair under 7/4, the barbershop seventh.', go: () => reelStep(25, 2), gives: ['w-25'] },
    { n: 'The cube', d: 10, tune: 'cube 3D · 3 × 5 × 7', cap: 'the lattice cube: fifths across, thirds up, sevenths in depth. every voice is a point on it.', go: () => { reelLook(null, 'cube'); VW.vyaw = 0.8; }, gives: ['x-cube'] },
    { n: 'Bows', d: 8, tune: '31-EDO · the root moves', cap: 'the root moves, and every voice finds its floor again.', go: () => chooseRootStep() }
  ] },
  { id: 'sb-inkblot', name: 'Ink Blot', line: 'black ink on white, and Bohlen–Pierce: odd harmonics, no octaves', shots: [
    { n: 'Blot', d: 9, tune: 'Bohlen–Pierce · odd partials only', cap: 'Ink Blot: black ink on white. Bohlen–Pierce: odd harmonics only, and the octave stops being home.', go: () => reelScene({ skin: 'sb-inkblot', mode: 'bp', view: 'mandala', mood: 'light', n: 2 }) },
    { n: 'The tritave', d: 9, tune: '3/1 · 1902.0¢', cap: 'three to one, the tritave: here it does the octave’s job.', go: () => reelRatio(3, 0), gives: ['b-1/1'] },
    { n: 'Five thirds', d: 9, tune: '5/3 · 884.4¢', cap: '5/3: the bottom half of the Bohlen–Pierce major triad.', go: () => reelRatio(5 / 3, 1), gives: ['b-5/3'] },
    { n: 'Three, five, seven', d: 11, tune: '3:5:7 · the BP major triad', cap: 'add 7/3 and three odd numbers make a major triad, with no octave anywhere in it.', go: () => reelChord([5 / 3, 7 / 3, 3]), gives: ['b-7/3', 'b-3:5:7'] },
    { n: 'Lean', d: 9, tune: 'lean · a dissonance, then its resolution', cap: 'in the lean mood a dissonance hangs on its resolution, and then lets go.', go: () => { reelMood('lean'); reelHill(); }, at: [[5, reelRelease]] }
  ] },
  { id: 'sb-comix', name: 'Comix', line: 'halftone and balloons: frolic, quintuplets, and normie mode', shots: [
    { n: 'Splash page', d: 9, tune: 'easy listening · frolic · triplets', cap: 'Comix: halftone dots and speech balloons. frolic: no leaning, everything skips home on the beat.', go: () => reelScene({ skin: 'sb-comix', mode: 'easy', view: 'mandala', mood: 'frolic', n: 3, beat: true, tuplet: 3 }), gives: ['x-look', 'x-frolic'] },
    { n: 'Five', d: 9, tune: 'quintuplets · five against the beat', cap: 'five against the beat: the polygon around the mandala is the subdivision.', go: () => setTuplet(5, true), gives: ['x-tuplet'] },
    { n: 'Balloon', d: 8, tune: 'Saelion · a speech balloon', cap: 'Saelion has opinions. in Comix they come in balloons.', go: () => reelSay('POW. that was a IV chord.', 6) },
    { n: 'Normie', d: 10, tune: 'normie · the piano grid', cap: 'normie mode: the piano grid and familiar chords. nothing weird, except the terrain still knows.', go: () => setNormie(true), gives: ['x-normie'] },
    { n: 'Triplets', d: 8, tune: 'frolic · triplets', cap: 'back to triplets. it swings now.', go: () => { SET.normie = false; setTuplet(3, true); } }
  ] },
  { id: 'sb-origami', name: 'Origami', line: 'folded paper, ten equal steps, and sand on a singing plate', shots: [
    { n: 'Fold', d: 9, tune: '10-TET · Sethares spectrum', cap: 'Origami: folded paper on a cutting mat. ten equal steps, with the partials moved onto the grid so they agree.', go: () => { reelScene({ skin: 'sb-origami', mode: 'tet10', view: 'mandala', mood: 'light', n: 3 }); reelSteps([3, 6, 10]); }, gives: ['t-first'] },
    { n: 'Shared tritone', d: 9, tune: '5\\10 = 600¢', cap: 'five steps of ten: 600 cents, the one step this tuning shares with the piano.', go: () => reelStep(5, 1), gives: ['t-5'] },
    { n: 'Plate', d: 10, tune: 'cymatics · a square plate, driven at the centre', cap: 'the chord shakes a metal plate: the sand runs off wherever it moves and settles on the lines that stay still.', go: () => { SET.cymShape = 'square'; SET.cymPowder = false; reelLook(null, 'cymatics'); cymReset(); }, gives: ['x-cymatics'] },
    { n: 'Figure', d: 10, tune: 'Chladni · modes rise as n² + m²', cap: 'a Chladni figure. plates ring at n² + m², not 1, 2, 3, which is why gongs sound like gongs.', go: () => {}, gives: ['x-figure'] },
    { n: 'Crease', d: 8, tune: '10-TET · a new root', cap: 'a new root, and the sand runs to new lines.', go: () => chooseRootStep() }
  ] },
  { id: 'sb-skein', name: 'Skein silk', line: 'silk and copper thread, septimal thirds, and the old hum of drones', shots: [
    { n: 'Cast on', d: 9, tune: 'just · 7-limit', cap: 'Skein silk: mint, cream and copper thread, and Saelion as a knitted doll with button eyes.', go: () => reelScene({ skin: 'sb-skein', mode: 'just', view: 'mandala', mood: 'light', n: 3, pet: 'skein' }) },
    { n: 'Seven sixths', d: 9, tune: '7/6 · 266.9¢', cap: '7/6: a minor third smaller than any piano key allows, and somehow sweeter.', go: () => reelRatio(7 / 6, 0), gives: ['j-7/6'] },
    { n: 'Six, seven, nine', d: 10, tune: '6:7:9 · the septimal minor triad', cap: '6:7:9, minor built on the seventh harmonic: smoother than it has any right to be.', go: () => reelChord([7 / 6, 3 / 2, 2]), gives: ['j-6:7:9'] },
    { n: 'The old hum', d: 10, tune: 'drones · the held sines of AND SO 6', cap: 'drones: every voice held as a sine that never stops, the way AND SO 6 played.', go: () => setArtic('drone', true), gives: ['x-drone'] },
    { n: 'Bind off', d: 8, tune: 'notes · plucked again', cap: 'and back to notes, plucked like a music box.', go: () => { setArtic('pluck', true); chooseRootStep(); } }
  ] },
  { id: 'obsidian', name: 'obsidian', line: 'volcanic glass that crazes under a held dissonance, and a black hole', shots: [
    { n: 'Glass', d: 9, tune: 'just · the lean mood', cap: 'obsidian: volcanic glass, lit from below. in the lean mood a dissonance hangs before it resolves.', go: () => reelScene({ skin: 'obsidian', mode: 'just', view: 'mandala', mood: 'lean', n: 3 }) },
    { n: 'Crazing', d: 10, tune: 'a held dissonance', cap: 'hold a dissonance and the glass crazes.', go: reelHill, at: [[3.2, reelHill], [6.4, reelHill]], gives: ['x-crack'] },
    { n: 'Cooling', d: 7, tune: 'resolution', cap: 'let it resolve and the cracks cool, then heal.', go: () => { reelMood('light'); reelRelease(); } },
    { n: 'Event horizon', d: 11, tune: 'a black hole · it bends pitch', cap: 'a black hole bends the terrain around it, and eats any voice that sits too close.', go: reelHole, gives: ['x-horizon'] },
    { n: 'Hawking', d: 9, tune: 'Hawking radiation', cap: 'something always gets out: Hawking radiation, as a chime.', go: () => { if (voices.filter(v => v.wT > 0).length < 2) lightAdd(); }, at: [[7, () => { hole.on = false; }]], gives: ['x-hawking'] }
  ] },
  { id: 'dawn', name: 'dawn', line: 'the just triads, major and minor, and the comma that comes home flat', shots: [
    { n: 'First light', d: 10, tune: 'just · 4:5:6', cap: 'dawn, and the just major triad: 4:5:6, with the beats taken out.', go: () => { reelScene({ skin: 'dawn', mode: 'just', view: 'mandala', mood: 'light', n: 3 }); reelChord([5 / 4, 3 / 2, 2]); }, gives: ['j-5/4', 'j-4:5:6'] },
    { n: 'Minor', d: 10, tune: 'just · 10:12:15', cap: 'the same two thirds stacked the other way: 10:12:15, the just minor triad.', go: () => reelChord([6 / 5, 3 / 2, 2]), gives: ['j-10:12:15'] },
    { n: 'Comma pump', d: 22, tune: 'I · vi · ii · V · I, in just intonation', cap: 'the comma pump: four reasonable steps around the lattice. watch where the root comes home.', go: () => { reelChord([5 / 4, 3 / 2, 2]); REEL.subs.push({ at: t + 1.4, fn: startPump }); }, gives: ['j-comma'] },
    { n: 'Sunrise', d: 8, tune: 'light · glide', cap: 'and the sun comes up over the lattice anyway.', go: () => lean(1) }
  ] },
  { id: 'daybreak', name: 'daylight 6', line: 'the first light look: a chord in bloom, and a held 9/8 that resolves', shots: [
    { n: 'Daybreak', d: 9, tune: 'just · light', cap: 'daylight 6: the night sky printed inverted, the first light look AND SO had.', go: () => reelScene({ skin: 'daybreak', mode: 'just', view: 'mandala', mood: 'light', n: 3 }) },
    { n: 'Bloom', d: 9, tune: 'light · consonance first', cap: 'every valley is a little sun, and when the voices all land the chord blooms.', go: () => reelChord([5 / 4, 3 / 2, 2]), gives: ['x-light'] },
    { n: 'Appoggiatura', d: 11, tune: 'just · a held 9/8 resolves to 1/1', cap: 'a held 9/8 leans on the root, then resolves. that is the whole story.', go: reelNineEight, gives: ['j-9/8'] },
    { n: 'Morning', d: 8, tune: 'light · a new root', cap: 'the root moves a fifth, and the morning goes on.', go: () => chooseRootStep() }
  ] },
  { id: 'hmp', name: 'hypermetapunk', line: 'the neon one: Pandora’s box, the drifting puck, five dimensions, a magnifier', shots: [
    { n: 'Boot', d: 9, tune: 'just · lean · a beat', cap: 'hypermetapunk, the neon one. five vibes on one pentagon: micro, groove, glow, drift and chaos.', go: () => reelScene({ skin: 'hmp', mode: 'just', view: 'mandala', mood: 'lean', n: 3, beat: true }) },
    { n: 'The box', d: 9, tune: 'Pandora’s box', cap: 'open the box and everything gets out at once. it’s fine.', go: reelBox, gives: ['x-pandora'] },
    { n: 'Auto vibe', d: 9, tune: 'auto vibe · the puck drifts', cap: 'auto vibe: the puck drifts between the five, and the music follows it.', go: () => { BOX.auto = true; } },
    { n: 'Penteract', d: 10, tune: '5D · primes 3, 5, 7, 11, 13', cap: 'five primes, five dimensions: thirty-two ratios on one shape.', go: () => { SET.x5d = true; reelLook(null, 'd5'); }, gives: ['x-5d'] },
    { n: 'Magnifier', d: 9, tune: 'zoom 7× · a pixel is about a cent', cap: 'zoom in until a pixel is about a cent. the syntonic comma is twenty-one of them.', go: () => { reelLook(null, 'mandala'); const v = reelVoice(); setZoom(7, v ? v.x : XMAX / 2); }, at: [[7.4, () => { VIEW.tgt = { x0: 0, w: XMAX }; }]], gives: ['x-zoom'] }
  ] },
  { id: 'story', name: 'storybook 6', line: 'gamelan: slendro, the wave of ombak, the gong, and church bells', shots: [
    { n: 'Once', d: 9, tune: 'gamelan · slendro · ombak', cap: 'storybook 6, in gamelan: every voice tuned twice, a few hertz apart, so it shimmers. ombak, the wave.', go: () => reelScene({ skin: 'story', mode: 'gamelan', view: 'mandala', mood: 'light', n: 3 }), gives: ['g-ombak'] },
    { n: 'Three degrees', d: 10, tune: 'slendro ‘2’ · ‘3’ · ‘5’', cap: 'three degrees at once: steps of 240 cents, no major thirds, no minor ones, and nobody misses them.', go: () => reelSteps([1, 2, 3]), gives: ['g-chord'] },
    { n: 'The gong', d: 11, tune: 'the end of the cycle', cap: 'the gong ends the cycle: the biggest instrument plays the least and gets the last word.', go: () => { gongDue = true; }, gives: ['g-gong'] },
    { n: 'Bells', d: 12, tune: 'church bells, faint, tuned to the scale', cap: 'church bells, tuned to the scale. a bell’s tierce sits a minor third above its prime, which is why bells sound like bells.', go: () => { SET.bells = true; bellNext = t + 0.8; }, gives: ['x-bells'] }
  ] },
  { id: 'eink', name: 'e-ink', line: 'slow paper: a pure fifth, 432 hertz, and a train going by', shots: [
    { n: 'Refresh', d: 9, tune: 'e-ink · a frame every half second', cap: 'e-ink: a new frame about every half second, like a reader. calm on purpose.', go: () => reelScene({ skin: 'eink', mode: 'just', view: 'mandala', mood: 'light', n: 2 }) },
    { n: 'Fifth', d: 9, tune: '3/2 · 702.0¢', cap: '3/2, the perfect fifth: two cents wider than the piano’s.', go: () => reelChord([3 / 2, 2]), gives: ['j-3/2'] },
    { n: '432', d: 9, tune: 'A = 432 Hz · 31.8¢ flat of 440', cap: '432 hertz: 31.8 cents flat of 440. it doesn’t heal anything; it’s just lower.', go: () => setRef(432), gives: ['x-432'] },
    { n: 'The train', d: 13, tune: 'long, long, short, long · 4:5:6:7', cap: 'a train, far off: long, long, short, long, in 4:5:6:7. the Doppler shift is free.', go: () => { SET.train = true; trainNext = t + 0.6; }, gives: ['x-train'] }
  ] },
  { id: 'bw2', name: 'bw2 · 1-bit', line: 'one bit per pixel: a fourth, a round plate, and powder that goes the other way', shots: [
    { n: 'One bit', d: 9, tune: 'bw2 · an ordered dither', cap: 'bw2: one bit per pixel. every grey is a pattern of dots, the trick e-paper badges and early Macs used.', go: () => reelScene({ skin: 'bw2', mode: 'just', view: 'mandala', mood: 'light', n: 3 }), gives: ['x-bw2'] },
    { n: 'Fourth', d: 9, tune: '4/3 · 498.0¢', cap: '4/3: the fifth upside down, two cents narrower than the piano’s.', go: () => reelChord([4 / 3, 2]), gives: ['j-4/3'] },
    { n: 'Round plate', d: 10, tune: 'cymatics · a round plate, bowed at the edge', cap: 'a round plate: diameters and circles, as Chladni drew them in 1787.', go: () => { SET.cymShape = 'circle'; SET.cymPowder = false; reelLook(null, 'cymatics'); cymReset(); } },
    { n: 'Powder', d: 11, tune: 'fine powder · it goes the other way', cap: 'very fine powder rides the air over the plate and gathers where it moves most: the opposite of sand.', go: () => { SET.cymPowder = true; }, gives: ['x-powder'] }
  ] },
  { id: 'fieldstone', name: 'fieldstone', line: 'a stone wall and a rosette: the harmonic seventh, and four voices at rest', shots: [
    { n: 'Wall', d: 9, tune: 'just · light', cap: 'fieldstone: a sundress and a stone wall, mint florals and a carved wooden rosette.', go: () => reelScene({ skin: 'fieldstone', mode: 'just', view: 'mandala', mood: 'light', n: 3 }), gives: ['x-fieldstone'] },
    { n: 'Seven fourths', d: 9, tune: '7/4 · 968.8¢', cap: '7/4, the harmonic seventh: about 31 cents flat of the piano’s B♭, where barbershop quartets park it.', go: () => reelRatio(7 / 4, 0), gives: ['j-7/4'] },
    { n: 'Barbershop', d: 12, tune: '4:5:6:7 · four voices at rest', cap: 'four voices on four valley floors: 4:5:6:7, partials four to seven of one note.', go: () => reelChord([5 / 4, 3 / 2, 7 / 4, 2]), gives: ['x-full', 'j-4:5:6:7'] },
    { n: 'Rosette', d: 8, tune: 'a new root', cap: 'the rosette turns, and the root moves.', go: () => chooseRootStep() }
  ] },
  { id: 'glasshouse', name: 'glasshouse', line: 'cool air and frost light: the demo hummer, and a sweet spot held', shots: [
    { n: 'Haze', d: 9, tune: 'just · light · mint haze', cap: 'glasshouse: cool air and frost light. tilt a phone and the ridges lean with you. three spores are hiding.', go: () => reelScene({ skin: 'glasshouse', mode: 'just', view: 'mandala', mood: 'light', n: 3 }), gives: ['x-glasshouse'] },
    { n: 'The hummer', d: 13, tune: 'listen · a pretend person, slightly out of tune', cap: 'the demo hummer: a pretend person, a little out of tune on purpose, and the chord moves to fit it.', go: () => listenStart('demo', true), at: [[12.6, () => listenStop(true)]], gives: ['x-hum'] },
    { n: 'Sweet spot', d: 12, tune: 'a settled chord, in the middle band', cap: 'a settled chord, held without hurry in the middle band: a sweet spot. the lattice remembers it.', go: () => { if (LS.src) listenStop(true); reelChord([3 / 2, 2]); }, gives: ['x-sweet'] },
    { n: 'Frost', d: 8, tune: 'light · glide', cap: 'the frost light moves when the chord does.', go: () => lean(1) }
  ] },
  { id: 'peachfall', name: 'peachfall', line: 'little worlds: petals, red rain, a mint clearing and a night garden', shots: [
    { n: 'Petals', d: 9, tune: 'peach fall', cap: 'peachfall: little worlds where the weather follows the music. first, petals.', go: () => { reelScene({ skin: 'peachfall', mode: 'just', view: 'mandala', mood: 'light', n: 3 }); WX.force = [1, 0, 0, 0]; }, gives: ['x-peachfall'] },
    { n: 'Red rain', d: 8, tune: 'a held dissonance', cap: 'hold a dissonance and it rains red.', go: () => { WX.force = [0, 1, 0, 0]; reelMood('lean'); reelHill(); } },
    { n: 'Mint clearing', d: 9, tune: '5/3 · a settled sixth', cap: 'a settled chord clears to mint. 5/3, the major sixth, a little sweeter than the piano’s.', go: () => { WX.force = [0, 0, 1, 0]; reelMood('light'); reelRelease(); reelChord([5 / 3, 2]); }, gives: ['j-5/3'] },
    { n: 'Night garden', d: 9, tune: 'a quiet room', cap: 'and a quiet room turns to night.', go: () => { WX.force = [0, 0, 0, 1]; }, gives: ['x-weather'] }
  ] }
];
const CUT = { id: 'cut', name: 'The cut', line: 'every look and every view, in one take', shots: SHOTS };
const REEL_BY = new Map(REELS.concat(CUT).map(r => [r.id, r]));
REELS.concat(CUT).forEach(r => { r.total = r.shots.reduce((a, s) => a + s.d, 0); r.gives = new Set(r.shots.flatMap(s => s.gives || [])); });
// what can be found while a reel plays: its own shots' finds, and what follows from finding anything at all
const REEL_ALWAYS = new Set(['x-pet', 'x-nougat10', 'x-reel', 'x-reels']);
const reelMay = id => REEL_ALWAYS.has(id) || !!(REEL.R && REEL.R.gives.has(id));
const reelWatched = id => GAME.reels.includes(id);
const REEL_GIVES = new Set(REELS.flatMap(r => [...r.gives]).concat('x-reels'));
const REEL_SHARE = Math.round((100 * REEL_GIVES.size) / CAT.length);

// ---------- running them ----------
// the borrowed knobs: everything a reel may change, kept so it can all go back
function reelSave() {
  return { skin, view: SET.view, mode: M.key, mood: moodNow(), normie: SET.normie, flip: SET.flip, light: SET.light, tease: SET.tease,
    cymShape: SET.cymShape, cymPowder: SET.cymPowder, x5d: SET.x5d, detect: SET.detect, tuplet, beat: rhy.on, ref: SET.ref, artic: SET.artic,
    bells: SET.bells, train: SET.train, wind: SET.wind, rain: SET.rain, bird: SET.bird, petForm: SET.petForm, hole: hole.on,
    box: [BOX.x, BOX.y, BOX.auto], zoom: [VIEW.x0, VIEW.x1], wxSeen: WX.seen.slice() };
}
// every reel starts from your own settings, and the look, tuning, view and mood are its first shot's to set
function reelKnobs(s) {
  SET.cymShape = s.cymShape; SET.cymPowder = s.cymPowder; SET.detect = s.detect; SET.x5d = s.x5d;
  if (tuplet !== s.tuplet) setTuplet(s.tuplet, true);
  rhy.on = s.beat; rhy.nextT = 0;
  if (SET.ref !== s.ref) { SET.ref = s.ref; REF = s.ref / 440; if (A.ac) audio.setRoot(fRoot); }
  if (SET.artic !== s.artic) setArtic(s.artic, true);
  SET.bells = s.bells; SET.train = s.train; SET.wind = s.wind; SET.rain = s.rain; SET.bird = s.bird; SET.petForm = s.petForm;
  hole.on = s.hole; BOX.x = s.box[0]; BOX.y = s.box[1]; BOX.auto = s.box[2];
  WX.force = null; pump = null;
  for (const v of voices) v.hold = 0;
  if (LS.src) listenStop(true);
  if (zoomLevel() > 1.01) VIEW.tgt = { x0: 0, w: XMAX };
}
// the reel for the look you're in, unless you've seen it: then the next one you haven't
function reelPick(from) {
  const ids = REELS.map(r => r.id), i0 = Math.max(0, ids.indexOf(from || skin));
  for (let k = 0; k < ids.length; k++) { const id = ids[(i0 + k) % ids.length]; if (!reelWatched(id)) return id; }
  return ids[i0];
}
function reelNextId(id) {
  const ids = REELS.map(r => r.id), i = ids.indexOf(id);
  if (i < 0) return reelPick();
  for (let k = 1; k <= ids.length; k++) { const n = ids[(i + k) % ids.length]; if (!reelWatched(n)) return n; }
  return ids[(i + 1) % ids.length];
}
function reelStart(id) {
  if (!entered) return;
  if (REEL.on) { reelBegin(id || reelNextId(REEL.id)); return; }
  if (era) { caption('the reels wait until 1955 is over.', 2200); return; }
  if (round) skipRound(); if (rail) stopRail(false); if (pump) pump = null; if (LS.src) listenStop(true);
  if (JAM.on) jamStop(true); if (MIR.open) mirrorTable(false); closeBrook(); if ($('story').classList.contains('on')) closeStory();
  REEL.saved = reelSave();
  if (SET.normie) { SET.normie = false; SET.flip = SET._flip !== undefined ? SET._flip : true; }
  REEL.saved.flip = SET.flip; SET.flip = false;
  REEL.on = true; REEL.run = 0; REEL.news = []; REEL.R = null;
  if (phone) { setSheet('peek'); $('toast').classList.remove('on'); } else gw.classList.remove('on');
  if (VIEW.x1 - VIEW.x0 < XMAX - 1) VIEW.tgt = { x0: 0, w: XMAX };
  $('reelHud').classList.add('on'); jlog('the reels');
  reelBegin(id || reelPick());
  syncUI();
}
function reelBegin(id) {
  const R = REEL_BY.get(id) || REEL_BY.get(reelPick());
  REEL.R = R; REEL.id = R.id; REEL.i = -1; REEL.subs = []; REEL.done = false; REEL.t0 = t; REEL.next = t + 1.2;
  if (SET.normie) SET.normie = false;
  reelKnobs(REEL.saved);
  $('reelCard').classList.remove('on'); REEL.cardT = 0;
  $('reelId').textContent = R.name; $('reelName').textContent = ''; $('reelTune').textContent = ''; $('reelBar').style.width = '0%';
  // between reels the page turns, and the next one starts under it
  const go = () => { if (REEL.R === R && REEL.i === -1) { REEL.next = t; REEL.t0 = t; } };
  if (REEL.run++ > 0) turnPage(go); else go();
  reelUI(); jlog(`reel: ${R.name}`);
}
function reelCredit(sh) { if (sh && sh.gives) for (const id of sh.gives) if (!found.has(id)) discover(id); }
function reelDone(R) {
  let msg;
  if (R.id === 'cut') { discover('x-reel'); msg = 'the cut, to the end.'; }
  else if (!reelWatched(R.id)) {
    GAME.reels.push(R.id);
    const n = REELS.filter(r => reelWatched(r.id)).length;
    if (n % 2 === 0) { nougat(1, W / 2, H * 0.42, 'two reels watched'); msg = `${R.name}, watched. two halves make a nougat.`; }
    else msg = `${R.name}, watched: half a nougat. the next reel makes it whole.`;
    if (n === REELS.length) discover('x-reels');
  } else msg = `${R.name}, again.`;
  persistSoon(); reelUI(); jlog(`reel watched: ${R.name}`);
  if (SET.reelAuto) {
    REEL.done = true; REEL.next = t + 2.6; caption(msg, 2600);
    $('reelName').textContent = 'next: ' + REEL_BY.get(reelNextId(R.id)).name; $('reelTune').textContent = '';
  } else { reelStop(true); caption(msg + ' your turn.', 3400); }
}
function reelStop(done) {
  if (!REEL.on) return;
  REEL.on = false; REEL.done = false; REEL.subs = []; REEL.R = null; REEL.id = '';
  const s = REEL.saved;
  reelRelease(); reelKnobs(s);
  if (!found.has('x-weather')) s.wxSeen.forEach((v, k) => { WX.seen[k] = v; });
  SET.flip = s.flip;
  if (s.normie) setNormie(true);
  else { SET.normie = false; if (s.mode !== M.key) setMode(s.mode, true); }
  reelMood(s.mood);
  if (skin !== s.skin) setSkin(s.skin, true);
  const v = s.view === 'd5' && !s.x5d ? 'mandala' : s.view; if (viewOn() !== v) setViewMode(v, true);
  if (viewOn() === 'cymatics') cymReset();
  VIEW.tgt = { x0: s.zoom[0], w: s.zoom[1] - s.zoom[0] };
  flipAt = Math.max(flipAt, t + 30); nextAct = t + 6;   // your tuning comes back and stays a while before any auto-flip
  $('reelHud').classList.remove('on'); $('reelCard').classList.remove('on'); REEL.cardT = 0;
  if (!done) caption('your turn.', 1500);
  if (REEL.news.length) { const nw = REEL.news.splice(0); setTimeout(() => caption(nw.join(' '), 4200), done ? 3600 : 1800); }
  persistSoon(); syncUI(); reelUI(); jlog(done ? 'the reels, to the end' : 'the reels, stopped');
}
function reelTick(dt) {
  REEL.bars += ((REEL.on ? 1 : 0) - REEL.bars) * (1 - Math.exp(-dt * 3)); REEL.flash *= Math.exp(-dt * 3.2);
  if (!REEL.on) return;
  userIdleUntil = t + 6; lastUserT = Math.max(lastUserT, t - 5);
  if (REEL.cardT && t > REEL.cardT) { REEL.cardT = 0; $('reelCard').classList.remove('on'); }
  const R = REEL.R; if (!R) return;
  if (t >= REEL.next) {
    if (REEL.done) { reelBegin(reelNextId(R.id)); return; }
    if (REEL.i >= 0) reelCredit(R.shots[REEL.i]);   // that shot played to its end: whatever it showed is yours
    REEL.i++;
    if (REEL.i >= R.shots.length) { reelDone(R); return; }
    const sh = R.shots[REEL.i], earn = REEL.i === 0 ? reelEarn(R) : ''; REEL.shotT = t; REEL.next = t + sh.d;
    REEL.subs = (sh.at || []).map(([d, fn]) => ({ at: t + d, fn }));
    try { sh.go(); } catch (e) {}
    if (REEL.i === 0) { reelCard(R, earn); REEL.subs.push({ at: t + 2.9, fn: () => caption(sh.cap, sh.d * 1000 - 3600) }); }   // the title card first, then the words
    else caption(sh.cap, sh.d * 1000 - 700);
    REEL.flash = 1; haptic(5);
    $('reelId').textContent = `${R.name} · ${REEL.i + 1}/${R.shots.length}`; $('reelName').textContent = sh.n; $('reelTune').textContent = sh.tune;
  }
  for (const s of REEL.subs) if (!s.done && t >= s.at) { s.done = true; try { s.fn(); } catch (e) {} }
  if (!REEL.done) $('reelBar').style.width = (clamp((t - REEL.t0) / R.total, 0, 1) * 100).toFixed(2) + '%';
}
// the title card: which reel, what it shows, and what watching it still earns
function reelEarn(R) {
  const left = [...R.gives].filter(id => !found.has(id)).length, finds = `${left} ${left === 1 ? 'find' : 'finds'}`;
  if (R.id === 'cut') return found.has('x-reel') ? 'watched before' : 'watch it to the end for a find';
  if (reelWatched(R.id)) return left ? `watched before · ${finds} still in it` : 'watched before: nothing left to earn, only to watch';
  return left ? `watching it earns ${finds} and half a nougat` : 'watching it to the end earns half a nougat';
}
function reelCard(R, earn) {
  const n = REELS.indexOf(R);
  $('rcK').textContent = n >= 0 ? `reel ${n + 1} of ${REELS.length}` : 'the original reel';
  $('rcName').textContent = R.name; $('rcLine').textContent = R.line; $('rcEarn').textContent = earn || reelEarn(R);
  $('reelCard').classList.add('on'); REEL.cardT = t + 3.4;
}
// the shelf in the gamut: a pill for every reel, a tick for each one watched, and what watching has paid so far
function reelUI() {
  const box = $('reelBtns'); if (!box) return;
  if (!box.firstChild) REELS.forEach(R => {
    const b = document.createElement('button'); b.className = 'pill'; b.type = 'button'; b.dataset.reel = R.id; b.title = R.line;
    b.addEventListener('click', () => { if (tapOk()) reelStart(R.id); }); box.appendChild(b);
  });
  box.querySelectorAll('[data-reel]').forEach(b => {
    const id = b.dataset.reel, here = REEL.on && REEL.id === id;
    b.textContent = (reelWatched(id) ? '✓ ' : '') + REEL_BY.get(id).name; b.classList.toggle('on', here); b.setAttribute('aria-pressed', String(here));
  });
  const sw = $('sReelAuto'); if (sw) sw.checked = !!SET.reelAuto;
  const w = REELS.filter(r => reelWatched(r.id)).length, rf = GAME.reelFound.length, nh = Math.floor(w / 2), half = w % 2;
  const nougs = nh ? `${nh} nougat${nh === 1 ? '' : 's'}${half ? ' and a half' : ''}` : 'half a nougat';
  $('gReelNote').textContent = (w ? `${w} of ${REELS.length} watched: they have found you ${rf} ${rf === 1 ? 'thing' : 'things'} and ${nougs}. ` : 'a short film for every look, each showing different things. ')
    + `all ${REELS.length} come to about ${REEL_SHARE}% of the field guide and ${REELS.length / 2} nougats, and quests fill halfway while you watch: the rest is yours to play for. touch anything to take over.`;
}
// letterbox bars and a soft flash at every cut, drawn on the top canvas
function drawReelFx(g) {
  if (REEL.bars < 0.01 && REEL.flash < 0.01) return;
  const b = REEL.bars, top = b * Math.min(H * 0.055, 48), bot = b * Math.min(H * 0.03, 26);
  g.fillStyle = `rgba(0,0,0,${0.88 * b})`; g.fillRect(0, 0, W, top); g.fillRect(0, H - bot, W, bot);
  if (REEL.flash > 0.01) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7); gr.addColorStop(0, `rgba(255,236,200,${0.22 * REEL.flash})`); gr.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  }
}
const reelSkip = () => { if (REEL.on) reelBegin(reelNextId(REEL.id)); };
$('reelStop').addEventListener('click', e => { e.stopPropagation(); reelStop(false); });
$('reelNext').addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); reelSkip(); });
['bReel', 'gReel', 'tReel'].forEach(id => $(id).addEventListener('click', e => { e.currentTarget.blur(); if (!tapOk()) return; if (REEL.on) reelStop(false); else reelStart(); }));
on('gCut', () => reelStart('cut'));
bindSw('sReelAuto', 'reelAuto');
