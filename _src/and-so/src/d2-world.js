// ===== world: tunings, moods, presets, skins, the black hole, the box, Saelion, the rail, the conductor =====
function setMode(key, quiet) {
  if (!entered || !MODES[key] || M.key === key || (era && !quiet)) return;
  const prev = M, nm = MODES[key];
  const same = prev.R.length === nm.R.length && prev.R.every((r, i) => Math.abs(r - nm.R[i]) < 1e-9 && Math.abs(prev.A[i] - nm.A[i]) < 1e-9) && prev.struck === nm.struck && prev.ombak === nm.ombak;
  M = nm; PR = M.R; PA = M.A; PK = PR.length;
  rs = { a: 0, b: 0, s: 0, e3: 0, e5: 0, e7: 0 }; path.length = 0; path.push({ a: 0, b: 0 });
  pump = null; gongDue = false; lastBloom = ''; chordNow = null; bird.notes.length = 0;
  if (M.easy) { const k0 = 130.8128 * TUNE, k = Math.round(12 * Math.log2(fRoot / k0)); easyS.key = k0 * Math.pow(2, k / 12); easyS.i = 0; easyS.prog = pickProg(); easyS.name = ''; }
  fRoot = M.easy ? fold(easyS.key, 2, 98) : computeRoot();
  recalibrate();
  if (same) audio.setRoot(fRoot); else audio.rebuild();
  const Lt = LIGHT();
  for (const v of voices) { if (v.wT === 0) continue; v.locked = false; v.target = null; v.glide = null; v.echo = null; v.pinUntil = M.easy ? 0 : t + (Lt ? rand(0.05, 0.2) : rand(0.2, 0.9)); v.temp = M.easy ? 0 : Math.max(v.temp, same || Lt ? 0.12 : 0.45); v.hist.length = 0; v.histT.length = 0; v.pair = null; }
  if (round) { round = null; $('round').classList.remove('on'); }
  if (M.easy) { easyAdvance(); easyS.next = t + 2.8; }
  gam.next = t + 0.4; gam.b = 0; rootFlash = 1; nextAct = t + 7; userIdleUntil = 0;
  if (prev.easy && key === 'just') { discover('x-flip'); if (!quiet) caption('flipped: the 12-TET thirds slide about 14¢ into their valleys.', 3600); }
  else if (!quiet) caption(M.title, 3000);
  modesSeen.add(key); renderGuide(); fillQuests(); syncUI();
  if (modesSeen.size >= MODE_ORDER.length) discover('x-tour');
  if (M.easy) discover('e-first');
  emit('mode'); jlog(`tuning: ${M.title}`);
}
function cycleMode() { const i = MODE_ORDER.indexOf(M.key); setMode(MODE_ORDER[(i + 1) % MODE_ORDER.length]); }
const moodNow = () => (SET.frolic ? 'frolic' : SET.light ? 'light' : 'lean');
function setMood(m) {
  if (m === moodNow()) { syncUI(); return; }
  if (SET.frolic) { SET.frolic = false; SET.tease = SET._tease !== undefined ? SET._tease : 0.5; pet.pose = 0; }
  if (m === 'frolic') { SET.frolic = true; SET._tease = SET.tease; SET.tease = 0.12; pet.pose = 1; frolT = 0; caption('frolic: no leaning. everything skips home.', 2600); discover('x-frolic'); }
  else if (m === 'light') {
    SET.light = true; caption('light: consonance first. every valley is a little sun.', 2800);
    for (const v of voices) if (v.wT > 0 && !v.dragging && !v.locked) { v.temp = 0; v.v *= 0.3; v.pinUntil = 0; }
  } else { SET.light = false; caption('lean: the long way home. a dissonance leans on its resolution.', 2800); }
  jlog(`mood: ${m}`); persistSoon(); syncUI();
}
function nextMood() { setMood({ light: 'lean', lean: 'frolic', frolic: 'light' }[moodNow()]); }
function setNormie(on) {
  if (on === !!SET.normie || !entered) return;
  SET.normie = on;
  if (on) { SET._flip = SET.flip; SET.flip = false; setMode('easy', true); rhy.on = true; rhy.nextT = 0; caption('normie mode: the piano grid, familiar chords, nothing weird. the terrain still knows.', 3600); discover('x-normie'); }
  else { SET.flip = SET._flip !== undefined ? SET._flip : true; setMode('just', true); caption('normie mode off. welcome back.', 2400); }
  jlog(on ? 'normie on' : 'normie off'); syncUI();
}
function setRef(hz) { hz = clamp(+hz || 440, 400, 480); SET.ref = hz; REF = hz / 440; if (A.ac) audio.setRoot(fRoot); $('refC').value = hz; syncUI(); persistSoon(); jlog(`reference pitch: ${hz} Hz`); if (Math.abs(hz - 432) < 0.01) discover('x-432'); }
function restartAll() {
  if (!entered) return;
  era = null; rail = null; pump = null; round = null; hideResult(); $('round').classList.remove('on');
  for (const v of voices) v.wT = 0;
  listenStop(true); TUNE = 1; rs = { a: 0, b: 0, s: 0, e3: 0, e5: 0, e7: 0 }; path.length = 0; path.push({ a: 0, b: 0 });
  if (!M.easy) { fRoot = computeRoot(); audio.setRoot(fRoot); }
  Object.assign(SET, { tease: 0.5, pace: 0.45, warm: 0.55, shim: 0.45, space: 0.5, tune: 0.5, flip: true, frolic: false, normie: false });
  BOX.x = 0; BOX.y = 0; BOX.auto = false; setZoom(1, XMAX / 2); setTuplet(4, true); pet.pose = 0;
  if (M.key !== 'just') setMode('just', true);
  setTimeout(() => startVoices(), 500);
  audio.applyMix(); syncUI(); caption('restarted. same lattice, fresh clay.', 2600); jlog('restart');
}

// ---------- presets, beat, skins ----------
const BUILTIN = {
  'soft dawn': { mode: 'just', box: [0.2, 0.45], skin: 'hmp', tuplet: 4, rhythm: true, set: { tease: 0.4, pace: 0.4, warm: 0.62, shim: 0.4, space: 0.62, tune: 0.55, flip: true } },
  'lofi sunday': { mode: 'easy', box: [0.3, 0.35], skin: 'dawn', tuplet: 4, rhythm: true, set: { tease: 0.35, pace: 0.45, warm: 0.72, flip: false } },
  barbershop: { mode: 'just', box: [0.45, 0.6], skin: 'obsidian', tuplet: 4, rhythm: false, set: { tease: 0.45, pace: 0.35, warm: 0.5, flip: false } },
  'gamelan dusk': { mode: 'gamelan', box: [-0.3, -0.1], skin: 'dawn', tuplet: 4, rhythm: true, set: { tease: 0.4, pace: 0.4, warm: 0.6, flip: false } },
  'bohlen–pierce club': { mode: 'bp', box: [0.2, -0.55], skin: 'obsidian', tuplet: 5, rhythm: true, set: { tease: 0.5, pace: 0.7, warm: 0.45, flip: false } },
  'event horizon': { mode: 'just', box: [-0.7, -0.25], skin: 'obsidian', tuplet: 4, rhythm: false, hole: true, set: { tease: 0.75, pace: 0.5, warm: 0.55, flip: false } },
  'daybreak drift': { mode: 'easy', box: [0, 0.65], skin: 'daybreak', tuplet: 3, rhythm: true, autoVibe: true, set: { tease: 0.4, pace: 0.3, warm: 0.66, flip: true } },
  'storybook': { mode: 'gamelan', box: [0.1, 0.5], skin: 'story', tuplet: 4, rhythm: false, set: { tease: 0.4, pace: 0.3, warm: 0.7, flip: false, bells: true } }
};
function renderPresets() {
  [['pSel', true], ['pbScene', false]].forEach(([id, grouped]) => {
    const sel = $(id); const cur = sel.value; sel.textContent = '';
    [['built-in', BUILTIN, 'b'], ['yours', userP, 'u']].forEach(([lab, obj, pre]) => {
      const names = Object.keys(obj); if (!names.length) return;
      const og = grouped ? document.createElement('optgroup') : sel; if (grouped) og.label = lab;
      names.forEach(n => { const o = document.createElement('option'); o.value = pre + ':' + n; o.textContent = n; og.appendChild(o); });
      if (grouped) sel.appendChild(og);
    });
    if (cur) sel.value = cur;
  });
}
function capturePreset() { const set = {}; ['tease', 'pace', 'warm', 'shim', 'space', 'tune', 'flip', 'bells', 'wind', 'rain', 'train', 'hp', 'sparkle'].forEach(k => (set[k] = SET[k])); return { mode: M.key, set, box: [BOX.x, BOX.y], autoVibe: BOX.auto, skin, tuplet, rhythm: rhy.on, hole: hole.on }; }
function applyPreset(p, name) {
  if (!p || !entered) return;
  if (p.mode && MODES[p.mode] && p.mode !== M.key) setMode(p.mode, true);
  if (p.set) for (const k in p.set) if (k in SET) SET[k] = p.set[k];
  if (p.box) { BOX.x = p.box[0]; BOX.y = p.box[1]; } BOX.auto = !!p.autoVibe;
  if (p.skin || p.theme) setSkin(p.skin || p.theme);
  if (p.tuplet) setTuplet(p.tuplet, true);
  if (p.rhythm !== undefined) { rhy.on = !!p.rhythm; rhy.nextT = 0; }
  if (p.hole !== undefined) setHole(p.hole && UNL.hole);
  audio.applyMix(); syncUI(); caption(`preset: ${name}`, 2200); jlog(`preset: ${name}`);
}
const TUPN = { 2: 'eighths', 3: 'triplets', 4: 'sixteenths', 5: 'quintuplets', 6: 'sextuplets', 7: 'septuplets', 8: 'thirty-seconds', 9: 'nonuplets' };
const TUPC = { 2: 'eighths. plain.', 3: 'triplets. it swings now.', 4: 'sixteenths. home.', 5: 'quintuplets. silly, as requested.', 6: 'sextuplets.', 7: 'septuplets. good luck dancing.', 8: 'thirty-seconds. busy.', 9: 'nonuplets. this is a cry for help.' };
function setTuplet(n, quiet) { n = clamp(n, 2, 9); if (n === tuplet) return; tuplet = n; rhy.base = null; syncUI(); if (!quiet) { caption(TUPC[n], 2200); haptic(6); } if (n === 5 || n === 7 || n === 9) discover('x-tuplet'); emit('tuplet', { v: n }); }
const SKINS = ['obsidian', 'dawn', 'daybreak', 'hmp', 'story', 'eink', 'bw2', 'fieldstone', 'glasshouse', 'peachfall'];
function setSkin(s) {
  if (!SKINS.includes(s)) s = 'obsidian';
  const was = skin; skin = s; document.body.dataset.skin = s;
  if (s === 'story' && entered) $('story').classList.add('on');
  else if (was === 'story' && s !== 'story') $('story').classList.remove('on');
  if (entered && s !== was && (s === 'bw2' || s === 'fieldstone' || s === 'glasshouse' || s === 'peachfall')) discover('x-' + s);
  resize(); syncUI(); persistSoon(); if (entered) jlog(`skin: ${s}`);
}

// ---------- black hole ----------
function holeRad() { return (12 + 10 * hole.str) * S; }
function setHole(on) {
  const was = hole.on; hole.on = !!on && UNL.hole;
  if (hole.on && !hole.placed) { hole.placed = true; hole.x = PX0 + PW * 0.55; hole.y = LT - 90 * S; }
  if (hole.on && !was) caption('a black hole formed. lower is stronger. it is hungry.', 3000);
  syncUI();
}
function swallow(v) {
  hole.lastEat = t; hole.hawkAt = t + rand(3, 6);
  const b = ballPos(v); spag.push({ x: b.X, y: b.Y, life: 1.2, max: 1.2, c: v.col });
  audio.redshift(v); v.wT = 0; v.locked = false;
  if (act === v) act = voices.find(o => o.wT > 0 && o !== v) || null;
  caption('event horizon. that voice redshifted out of earshot.', 3200); discover('x-horizon'); emit('eat'); haptic([30, 30, 60]);
}

// ---------- pandora's box ----------
function boxWeights() { const q = VERT.map(([vx, vy]) => Math.pow(1 / ((BOX.x - vx) ** 2 + (BOX.y - vy) ** 2 + 0.08), 1.3)); q[0] *= 0.4 + 1.2 * SET.tune; const s = q.reduce((a, b) => a + b, 0); return q.map(v => v / s); }
function movePad(e) { const r = $('pad').getBoundingClientRect(); let x = (((e.clientX - r.left) * 480) / r.width - 240) / 150, y = (((e.clientY - r.top) * 400) / r.height - 212) / 150; const d = Math.hypot(x, y); if (d > 1.02) { x *= 1.02 / d; y *= 1.02 / d; } BOX.x = x; BOX.y = y; }
function openBox() {
  BOX.open = 1; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.95; BOX.x = Math.cos(a) * r; BOX.y = Math.sin(a) * r; BOX.auto = false;
  lean(1.2); if (Math.random() < 0.5 && !round) setMode(MODE_ORDER[(Math.random() * 5) | 0], true);
  caption("you opened it. everything got out. it's fine.", 3200); discover('x-pandora'); syncUI();
}

// ---------- saelion ----------
const TRIVIA = [
  'the Pacific Northwest tree octopus is a 1998 hoax site used to teach source-checking. i am partly tree octopus. check your sources.',
  'appoggiatura leans. acciaccatura, from acciaccare, crushes. both Italian, both rude to the beat.',
  "the 7th harmonic sits about 31¢ under the piano's B♭. barbershop quartets find it by ear.",
  "in 2003 Chandra caught the Perseus cluster's black hole humming a B♭ about 57 octaves below middle C.",
  'Bohlen–Pierce was found at least three times: Bohlen, van Prooijen, Pierce. none of them needed an octave.',
  'groove, per the research, is the pleasurable urge to move. medium syncopation wins.',
  'heterochromia: two different iris colors. one eye per tuning system.',
  "Pandora's box was a jar. hope stayed in. so did i, briefly.",
  "gamut, from gamma ut: Guido's lowest note, later the whole range. i contain multitudes. five of them.",
  'try getting a voice up to eighty-eight.',
  'a cent is a hundredth of a piano semitone. the syntonic comma is about twenty-one and a half of them.',
  'pinch the mandala. the polygon is the beat. it was requested.',
  'two fingers, two voices. four fingers, a barbershop quartet.'
];
function petTalk() { if (!UNL.pet || pet.hatch > 0) return; pet.say = TRIVIA[pet.triv++ % TRIVIA.length]; pet.sayUntil = t + 7.5; pet.cheer = 0.6; }
function petPose() { if (!UNL.pet) return; pet.pose = (pet.pose + 1) % 4; pet.say = ['floating.', 'dancing.', 'sitting.', 'storybook pose.'][pet.pose]; pet.sayUntil = t + 1.6; }
function petTarget() { const f = SET.petForm || 'bunny'; if (f === 'bunny') return [0.08, 0.3, 1, 0.12, 0.04]; if (f === 'tree') return [1, 0.15, 0.1, 0.1, 0.9]; if (f === 'pixie') return [0.1, 0.9, 0.2, 1, 0.05]; return W5.map(w => clamp(w * 2.6, 0, 1)); }
function petHome() { pet.hx = phone ? W * 0.16 : skin === 'hmp' ? Math.min(W - 60, W * 0.62) : Math.max(70, MX - MR * 2.05); pet.hy = phone ? clamp(LT - 40, TOPH + 60, H) : skin === 'hmp' ? LT - 50 : MY + MR * 0.35; }
function petTick(dt) {
  if (!entered) return;
  if (!pet.placed) { petHome(); pet.placed = true; }
  if (pet.hatch > 0) { pet.hatch -= dt; if (pet.hatch <= 0) { pet.hatch = 0; joyBurst({ kind: 'ev', key: '' }, null, pet.x, pet.y); caption('Saelion hatched. species: indeterminate, currently bunny.', 3400); pet.say = 'hi. i am mostly vibes.'; pet.sayUntil = t + 4; discover('x-pet'); } }
  if (!pet.lock) { const tw = petTarget(); for (let k = 0; k < 5; k++) pet.w[k] += (tw[k] - pet.w[k]) * (1 - Math.exp(-dt * 1.5)); }
  pet.jump *= Math.exp(-dt * 6); pet.cheer *= Math.exp(-dt * 2);
  pet.blinkT -= dt; if (pet.blinkT <= 0) { pet.blink = 0.14; pet.blinkT = rand(2, 5.5); } pet.blink = Math.max(0, pet.blink - dt);
  const bob = reduceMotion ? 0 : 1;
  pet.x = pet.hx + 5 * Math.sin(t * 0.8) * bob;
  pet.y = pet.hy + 7 * Math.sin(t * 1.25) * bob - 12 * pet.jump * S - 16 * pet.cheer * S * Math.abs(Math.sin(t * 9));
}

// ---------- the guided rail ----------
const RAIL = [
  { d: 9, cap: 'the terrain: every valley is a place where partials line up.', go: () => { setMode('just', true); setZoom(1, XMAX / 2); } },
  { d: 10, cap: "easy listening: the piano's grid. the thirds sit a little way up the valley walls.", go: () => setMode('easy', true) },
  { d: 10, cap: 'the flip: the chord slides into just intonation. that small slide is the whole argument.', go: () => setMode('just', true) },
  { d: 9, cap: 'zoom in. at this scale a pixel is about a cent.', go: () => { const v = voices.find(o => o.wT > 0); setZoom(7, v ? v.x : XMAX / 2); } },
  { d: 8, cap: 'lean on everything at once.', go: () => { setZoom(1, XMAX / 2); lean(1); } },
  { d: 10, cap: 'a beat at medium syncopation, where the groove research says pleasure peaks.', go: () => { rhy.on = true; rhy.nextT = 0; syncUI(); } },
  { d: 11, cap: 'gamelan: the shimmer is on purpose.', go: () => setMode('gamelan', true) },
  { d: 11, cap: 'Bohlen–Pierce: no octaves, and nobody misses them.', go: () => setMode('bp', true) },
  { d: 11, cap: '10-TET, sweetened by its own spectrum.', go: () => setMode('tet10', true) },
  { d: 11, cap: "31-EDO: Huygens' thirty-one steps. the thirds are almost pure.", go: () => setMode('tet31', true) },
  { d: 21, cap: 'the comma pump: four reasonable steps, and the root comes home flat.', go: () => { setMode('just', true); setTimeout(startPump, 1200); } },
  { d: 10, cap: 'back to easy listening. end of the line.', go: () => setMode('easy', true) }
];
function startRail() { if (!UNL.rail || !entered) return; if (round) skipRound(); rail = { i: -1, next: t + 0.2 }; autoOn = true; syncUI(); }
function stopRail(done) { rail = null; syncUI(); if (done) discover('x-rail'); }
function railTick() {
  if (!rail || era || t < rail.next) return;
  rail.i++;
  if (rail.i >= RAIL.length) { stopRail(true); caption('end of the line. please take your belongings.', 3000); return; }
  const st = RAIL[rail.i];
  try { st.go(); } catch (e) {}
  caption(st.cap, Math.min(st.d * 1000 - 500, 9000)); rail.next = t + st.d;
}

// ---------- the storybook ----------
const STORY = `Once, at the bottom of a valley where two notes agreed, there lived a small bunny called Saelion. It had one gold eye and one blue one, which was useful, because it lived between two tuning systems and needed an eye on each.

Every morning the voices came rolling down the hills, leaning on each other the way tired friends do, until they found the floor of a valley and went quiet and bright. Saelion counted them. Some days there were four, which was a full house. Some days a black hole swallowed one, and Saelion waited by the edge until a small chime leaked out, because something always does.

When the music sat in the sweet spot long enough, the lattice folded in on itself, and the next morning sounded a little different. The bells in the distance were tuned wrong on purpose. The train went long, long, short, long.

Nobody told the bunny what the lattice was for. It figured it out by listening, which is the only way anyone ever has.`;
function readStory() {
  if (!('speechSynthesis' in window)) { caption("this browser can't read aloud.", 2600); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance($('stText').value), vs = speechSynthesis.getVoices();
  const v = vs.find(x => /en-IE/i.test(x.lang)) || vs.find(x => /en-GB/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang));
  if (v) u.voice = v; u.rate = 0.95; u.pitch = 1.05; speechSynthesis.speak(u);
  $('stVoice').textContent = v ? `voice: ${v.name} (${v.lang})${/en-IE/i.test(v.lang) ? ', Irish, as requested.' : '. no Irish voice on this device.'}` : 'voice: the default one.';
  discover('x-story'); jlog('read the story aloud');
}

// ---------- hands-on helpers ----------
function latPos(i) { const L = LAT[i], a = (L.a * Math.PI) / 180, r = MR * (1.3 + 0.6 * clamp(SET[L.k], 0, 1)); return [MX + Math.cos(a) * r, MY + Math.sin(a) * r]; }
function harpPool() {
  const pcs = [0, ...voices.filter(v => v.wT > 0 && v.locked).map(v => v.c)], pool = [];
  for (const c of pcs) for (let k = -3; k <= 7; k++) { const f = fRoot * Math.pow(2, c / 1200) * Math.pow(M.eq, k); if (f >= 260 && f <= 1700) pool.push(f); }
  pool.sort((a, b) => a - b); const P = []; for (const f of pool) if (!P.length || f / P[P.length - 1] > 1.012) P.push(f); return P;
}
function harpAt(h, px, py) {
  if (!h.pool.length) return;
  const P = h.pool, idx = clamp(Math.floor((px / W) * P.length), 0, P.length - 1);
  harpTrail.push({ x: px, y: py, life: 1.2 });
  if (idx !== h.idx && t - h.lastT > 0.045) {
    h.idx = idx; h.lastT = t;
    const f1 = P[idx], f0 = f1 * Math.pow(2, (SET.frolic ? 0 : (LIGHT() ? rand(4, 12) : rand(15, 45)) * (Math.random() < 0.6 ? 1 : -1)) / 1200), br = clamp(1 - (py - TOPH) / Math.max(1, LT - TOPH), 0, 1);
    audio.birdNote(f0, f1, 0.06, 0.5 + 0.4 * br, (px / W - 0.5) * 1.4, 0.022 + 0.022 * br);
    for (let i = 0; i < 4; i++) sparks.push({ x: px, y: py, vx: rand(-40, 40), vy: rand(-60, -10), life: rand(0.4, 0.9), max: 0.9, c: COLORS[idx % 4] });
    emit('harp'); haptic(4);
  }
}
function spinStep(dir) {
  if (era || round) { rootFlash = 0.5; return; }
  if (M.easy) easyAdvance();
  else if (M.key === 'just') rootStep([dir, 0]);
  else if (M.key === 'bp') rootStep(dir > 0 ? [2, 0, -1] : [-2, 0, 1]);
  else rootStep([dir * (M.n === 5 ? 1 : M.n === 31 ? 18 : 3)]);
  audio.chime(fold(fRoot * 4, M.eq, 400), 0.02, 0); discover('x-spin'); emit('spin'); haptic(6);
}
function strum() { voices.filter(v => v.wT > 0).sort((a, b) => a.x - b.x).forEach((v, i) => audio.chime(fOf(v.x) * 2, 0.024, i * 0.07)); rings.push({ r: MR * 0.9, v: 160, life: 1.1, max: 1.1, c: [255, 236, 190] }); }

// ---------- the conductor (Saedo) ----------
function conductor() {
  if (!entered || paused) return;
  if (rail) railTick();
  if (era) return;
  if (round) { gamelanClock(); return; }
  if (pump) {
    if (t >= pump.next) {
      if (pump.i < pump.steps.length) { rootStep(pump.steps[pump.i++]); pump.next = t + 4.4; }
      else {
        let c = 1200 * ((rs.a - pump.a0) * L3 + (rs.b - pump.b0) * L5);
        c = ((c % 1200) + 1200) % 1200; if (c > 600) c -= 1200;
        caption(`back where it started, ${Math.abs(c).toFixed(1)}¢ ${c < 0 ? 'flat' : 'sharp'}: the syntonic comma, 81/80. 12-TET closes this loop by folding the lattice into a torus. just intonation doesn't fold.`, 7500);
        discover('j-comma'); pump = null; nextAct = t + 8;
      }
    }
    return;
  }
  if (M.easy) { if (!rhyActive() && t > easyS.next) { easyAdvance(); easyS.next = t + 2.8 * (1.5 - 0.9 * effPace()); } }
  else gamelanClock();
  if (SET.flip && autoOn && !rail && t > flipAt && !listenBusy()) {
    const share = 0.2 + 0.7 * W5[0];
    if (LIGHT()) { if (M.easy) { if (Math.random() < share) setMode('just'); } else if (M.key === 'just' && Math.random() < 1 - share) setMode('easy'); }
    else if (M.easy) { if (Math.random() < share) setMode(Math.random() < 0.62 - 0.3 * W5[0] ? 'just' : ['gamelan', 'bp', 'tet10', 'tet31', 'just'][(Math.random() * 5) | 0]); }
    else if (Math.random() < 1 - share) setMode('easy');
    flipAt = t + rand(26, 46) * (M.easy ? 1.3 - 0.8 * W5[0] : 0.6 + 0.9 * W5[0]);
  }
  if (!autoOn || t < userIdleUntil || t < nextAct || MO.busy > 0) return;
  const live = voices.filter(v => v.wT > 0), n = live.length, r = Math.random();
  if (M.easy) { if (n < 3) addVoice(rand(400, XMAX - 400), { temp: 0 }); else if (Math.random() < 0.3 + 0.4 * W5[4]) { const v = live[(Math.random() * n) | 0]; if (v.target != null) assignTarget(v, v.target); } nextAct = t + rand(4, 7); return; }
  if (!live.every(v => v.locked) && t < nextAct + 3.5) return;
  if (LIGHT()) {
    if (n < 2) lightAdd();
    else if (r < 0.36) { if (listenBusy()) lightGlide(live[(Math.random() * n) | 0]); else if (M.struck) gongDue = true; else chooseRootStep(); }
    else if (r < 0.7) { const v = live.slice().sort((a, b) => a.lockT - b.lockT)[0]; if (!lightGlide(v)) chooseRootStep(); }
    else if (r < 0.9) { if (n >= 4 || (n === 3 && Math.random() < 0.35)) { let o = live[0]; for (const v of live) if (v.lockT < o.lockT) o = v; dropVoice(o); } else lightAdd(); }
    else { strum(); bird.next = Math.min(bird.next, t + 0.8); }
    nextAct = t + rand(4.4, 7.2) * (1.8 - 1.3 * effPace());
    return;
  }
  const lp = 0.08 + 0.18 * W5[4];
  if (n < 2) addVoice(rand(200, XMAX - 200), { temp: 1 });
  else if (r < 0.44) { if (listenBusy()) tease(live[(Math.random() * n) | 0], 0.6); else if (M.struck) gongDue = true; else chooseRootStep(); }
  else if (r < 0.66) tease(live[(Math.random() * n) | 0], 1);
  else if (r < 0.66 + lp) lean(0.9);
  else if (r < 0.92) { if (n >= 4 || (n === 3 && Math.random() < 0.4)) { let o = live[0]; for (const v of live) if (v.lockT < o.lockT) o = v; dropVoice(o); } else addVoice(rand(150, XMAX - 150), { temp: 1 }); }
  else if (M.key === 'just' && t - lastPumpT > 70) startPump();
  else if (M.struck) gongDue = true;
  else chooseRootStep();
  nextAct = t + rand(4.4, 7.2) * (1.8 - 1.3 * effPace());
}

// ---------- moods, layers, the regulator, sweet spots, recursion ----------
let bellNext = 1e9, windNext = 1e9, trainNext = 1e9;
function recurse(d) {
  if (d === 1) { SET.bells = true; bellNext = t + 2; }
  if (d === 2) SET.wind = true;
  if (d === 4) trainNext = t + 3;
  if (d === 5) discover('x-recurse');
  caption(['', 'the lattice folds once. somewhere, bells.', 'twice. the wind picks up.', 'three folds. the lattice turns inside itself.', 'four. a train, far off.', 'five folds deep. the lattice is now mostly lattice.'][d], 3400);
  jlog(`recursion depth ${d}`); syncUI();
}
function worldTick(dt) {
  if (!entered) return;
  if (M.key !== lastMk) lastMk = M.key;
  if (chordNow && chordNow.str !== lastChordStr) { lastChordStr = chordNow.str; jlog(`chord: ${chordNow.str}${chordNow.name ? ' · ' + chordNow.name : ''}`); }
  if (Math.abs(fRoot - lastRootJ) > 0.01) { if (lastRootJ) jlog(`root: ${OUT(fRoot).toFixed(1)} Hz`); lastRootJ = fRoot; }
  if (SET.frolic) {
    frolT -= dt;
    if (frolT <= 0 || (rhyActive() && beatPulse > 0.97)) {
      frolT = rhyActive() ? 1e9 : 0.55;
      const live = voices.filter(v => v.wT > 0 && !v.dragging);
      if (live.length && !round) { const v = live[(Math.random() * live.length) | 0]; if (v.target != null) assignTarget(v, clamp(v.target + (Math.random() < 0.5 ? 1200 : -1200), 80, XMAX - 80)); else tease(v, 0.35); v.bounce = 1; }
      bird.next = Math.min(bird.next, t + 0.4);
    }
  }
  if (A.ac && !paused) {
    if (SET.bells && t > bellNext) { bellNext = t + rand(55, 95); if (!era) peal(); }
    if (SET.wind && t > windNext) { windNext = t + rand(7, 18); gust(); }
    if (SET.rain) { if (!rainSrc) rainOn(true); if (Math.random() < dt * 5) nz(aNow() + 0.01, 0.025, 'highpass', 3500 + Math.random() * 3000, 0.8, 0.012 + 0.02 * Math.random()); } else if (rainSrc) rainOn(false);
    if (SET.train && t > trainNext) { trainNext = t + rand(150, 260); trainPass(); }
  }
  if (SET.reg && BOX.drag == null && !round) {
    const lv = voices.filter(v => v.wT > 0), cx = 0.55 * Rs + 0.25 * (rhyActive() ? 0.22 + 0.32 * W5[1] + 0.14 * W5[4] : 0.1) + 0.2 * (lv.filter(v => !v.locked).length / Math.max(1, lv.length));
    if (cx > 0.6) { regHigh += dt; regLow = 0; } else if (cx < 0.25) { regLow += dt; regHigh = 0; } else { regHigh = Math.max(0, regHigh - dt); regLow = Math.max(0, regLow - dt); regState = 'in the middle band'; }
    if (regHigh > 7) { regHigh = 0; BOX.x += (VERT[2][0] - BOX.x) * 0.2; BOX.y += (VERT[2][1] - BOX.y) * 0.2; regState = 'easing toward calm'; jlog('regulator: easing toward calm'); }
    if (regLow > 14 && !LIGHT()) { regLow = 0; const tg = VERT[Math.random() < 0.5 ? 1 : 0]; BOX.x += (tg[0] - BOX.x) * 0.2; BOX.y += (tg[1] - BOX.y) * 0.2; regState = 'nudging toward interest'; jlog('regulator: nudging toward interest'); }
  }
  const sweet = chordNow && (chordNow.beatless || chordNow.shimmer || M.easy) && Rs < 0.45;
  sweetT = sweet ? sweetT + dt : Math.max(0, sweetT - dt * 0.5);
  if (sweetT > 4) {
    sweetT = 0; seeds++; discover('x-sweet'); emit('sweet'); jlog(`sweet spot #${seeds}`); award(30, MX, MY - MR * 0.6, 'sweet');
    for (let i = 0; i < 12; i++) sparks.push({ x: MX, y: MY, vx: rand(-80, 80), vy: rand(-80, 80), life: rand(0.6, 1.2), max: 1.2, c: [255, 236, 190] });
    let k = 0, mx = 0; W5.forEach((w, i) => { if (w > mx) { mx = w; k = i; } }); BOX.x += (VERT[k][0] - BOX.x) * 0.08; BOX.y += (VERT[k][1] - BOX.y) * 0.08;
    if (seeds % 3 === 0 && depth < 5) { depth++; recurse(depth); }
  }
  for (let i = harpTrail.length - 1; i >= 0; i--) { harpTrail[i].life -= dt; if (harpTrail[i].life <= 0) harpTrail.splice(i, 1); }
  if (harpTrail.length > 200) harpTrail.splice(0, harpTrail.length - 200);
  uiT -= dt;
  if (uiT <= 0) {
    uiT = 0.5; padSync();
    $('jLines').textContent = journal.length ? journal.slice(-7).join('\n') : 'nothing yet.';
    $('regNote').textContent = `regulator: ${regState}. keeps complexity in the middle band, where the research says pleasure peaks.`;
    $('pbTime').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  }
}

// ---------- keeping the controls honest ----------
function syncZoomUI() { $('zLab').textContent = zoomLevel().toFixed(1) + '×'; }
function syncUI() {
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.m === M.key));
  $('gwBlurb').textContent = M.blurb;
  $('tModeName').textContent = M.short; $('tMode').querySelector('.dot').style.background = rgba(ACC[M.key], 1);
  $('bPump').classList.toggle('hidden', M.key !== 'just');
  $('bBeat').textContent = rhy.on ? 'beat: on' : 'beat: off'; $('dBeat').classList.toggle('hot', rhy.on);
  $('bRail').classList.toggle('hidden', !UNL.rail); $('bRail').textContent = rail ? 'rail: stop' : 'rail';
  $('bAuto').textContent = autoOn ? 'saedo: on' : 'saedo: off';
  $('bSnd').textContent = muted ? 'sound: off' : 'sound: on'; $('tSound').textContent = muted ? '♪ off' : '♪ on';
  const md = moodNow(), lit = LIGHT() && !M.easy;
  $('bNorm').textContent = SET.normie ? 'normie: on' : 'normie: off'; $('bFrol').textContent = `${md} mood`;
  $('dMood').firstChild.textContent = { light: '☼', lean: '≈', frolic: '✿' }[md]; $('dMood').lastChild.textContent = md; $('dMood').classList.toggle('hot', md !== 'lean');
  $('bLean').textContent = lit ? 'glide' : 'lean'; $('dLean').firstChild.textContent = lit ? '∿' : '≈'; $('dLean').lastChild.textContent = lit ? 'glide' : 'lean';
  $('bRound').textContent = round ? '■ round' : '▶ round'; $('bRound').classList.toggle('hot', !!round); $('dRound').classList.toggle('hot', !!round);
  $('gRound').textContent = round ? '■ end this round' : '▶ play a round';
  $('sFlip').checked = !!SET.flip; $('sRhy').checked = rhy.on; $('sHole').checked = hole.on; $('sPetLock').checked = pet.lock;
  [['sHp', 'hp'], ['sSpark', 'sparkle'], ['sChime', 'chimes'], ['sBird', 'bird'], ['sReg', 'reg'], ['sBells', 'bells'], ['sWind', 'wind'], ['sRain', 'rain'], ['sTrain', 'train'], ['sHap', 'haptics']].forEach(([id, k]) => ($(id).checked = !!SET[k]));
  [['sShim', 'shim'], ['sSpace', 'space'], ['sTease', 'tease'], ['sPace', 'pace'], ['sWarm', 'warm'], ['sVol', 'vol'], ['sTune', 'tune']].forEach(([id, k]) => ($(id).value = Math.round(SET[k] * 100)));
  placeChrome();
  $('boxLocked').classList.toggle('hidden', UNL.box); $('boxWrap').classList.toggle('hidden', !UNL.box); $('bAutoV').classList.toggle('on', BOX.auto);
  $('holeLocked').classList.toggle('hidden', UNL.hole); $('holeRow').classList.toggle('hidden', !UNL.hole); $('holeNote').classList.toggle('hidden', !UNL.hole);
  $('petLocked').classList.toggle('hidden', UNL.pet); $('petWrap').classList.toggle('hidden', !UNL.pet);
  document.querySelectorAll('#themeBtns .pill').forEach(b => b.classList.toggle('on', b.dataset.th === skin));
  document.querySelectorAll('[data-ref]').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.ref - SET.ref) < 0.01));
  document.querySelectorAll('#formBtns .pill').forEach(b => b.classList.toggle('on', b.dataset.f === SET.petForm));
  $('mLight').classList.toggle('on', md === 'light'); $('mLean').classList.toggle('on', md === 'lean'); $('mFrol').classList.toggle('on', md === 'frolic'); $('mNorm').classList.toggle('on', !!SET.normie);
  listenUI();
  const vw = viewOn();
  document.querySelectorAll('#viewBtns .pill').forEach(b => { b.classList.toggle('on', b.dataset.view === vw); if (b.dataset.view === 'd5') b.classList.toggle('hidden', !SET.x5d); });
  $('cymOpts').classList.toggle('hidden', vw !== 'cymatics');
  document.querySelectorAll('#cymShape .pill').forEach(b => b.classList.toggle('on', b.dataset.shape === (SET.cymShape === 'circle' ? 'circle' : 'square')));
  $('sCymLines').checked = !!SET.cymLines; $('sCymPowder').checked = !!SET.cymPowder;
  $('sX5d').checked = !!SET.x5d; $('x5dOpts').classList.toggle('hidden', !SET.x5d); $('sDetect').checked = !!SET.detect;
  $('sX5dSpeed').value = Math.round(SET.x5dSpeed * 100); $('sX5dDepth').value = Math.round(SET.x5dDepth * 100);
  $('viewNote').textContent = {
    mandala: 'mandala: each voice traces a Lissajous figure against the root. a still figure is a pure interval; a turning one is beating. tap the chip above the sound box, or press X, to change the view.',
    cymatics: 'tap the chip above the sound box, or press X, to change the view.',
    cube: 'cube 3D: fifths run left to right, major thirds go up, harmonic sevenths go back. lit nodes are voices, the gold one is the root. drag to turn it, pinch or scroll to come closer, tap a node to hear and inspect it.',
    d5: '5D: the penteract of 3, 5, 7, 11 and 13. drag to turn, shift-drag to twist the hidden dimensions, tap a node to inspect it.'
  }[vw];
  $('tupNote').textContent = `pinch or scroll the mandala to change the subdivision. now ${tuplet}: ${TUPN[tuplet]}.`;
  const recOn = capture.recording();
  $('rRec').textContent = recOn ? '■ stop & save' : '● record'; $('pbRec').textContent = recOn ? '■ save' : '● rec';
  $('pbVol').value = Math.round(SET.vol * 100); $('pbVolP').textContent = Math.round(SET.vol * 100) + '%';
  $('pbPlay').textContent = paused ? '▶' : '❚❚';
  $('viewChipName').textContent = VIEW_NAME[vw];
  $('sMotion').checked = !!SET.motion; $('sRoll').checked = !!SET.roll; $('sTiltK').value = Math.round(SET.tiltK * 100);
  const rOn = REEL.on; $('bReel').textContent = rOn ? '■ reel' : '▶ reel'; $('gReel').textContent = rOn ? '■ stop the reel' : '▶ watch the reel'; $('tReel').textContent = rOn ? '■' : '▶';
  document.body.classList.toggle('reel', rOn); motionUI();
  placeChrome();
  const hmpDesk = skin === 'hmp' && entered && !phone;
  $('pbar').classList.toggle('hidden', !hmpDesk); $('tabs').classList.toggle('hidden', !hmpDesk);
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  renderUnl(); syncZoomUI();
}
