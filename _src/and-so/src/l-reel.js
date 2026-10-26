// ===== the reel: a fourteen-shot tour of everything, cut like the NIC.LAN reel (each shot has a name, a tuning line and a caption) =====
// touching anything hands it back to you, and whatever you had set comes back with it
const REEL = { on: false, i: -1, next: 0, shotT: 0, t0: 0, saved: null, subs: [], flash: 0, bars: 0, total: 0 };
const SHOTS = [
  { n: 'Boot', d: 7, tune: 'just · 7-limit · a drone on the root', cap: 'a drone on the root. the voices roll home to their valleys.', go: () => { setMode('just', true); reelLook('dawn', 'mandala'); reelMood('light'); reelVoices(3); } },
  { n: 'Bloom', d: 7, tune: 'light · consonance first', cap: 'every valley is a little sun. when they all land, the chord blooms.', go: () => lean(1), at: [[3.6, () => chooseRootStep()]] },
  { n: 'Plate', d: 9, tune: 'cymatics · a centre-driven square plate', cap: 'the chord rings a steel plate. the sand runs off whatever moves and rests on the lines that stay still.', go: () => { SET.cymShape = 'square'; SET.cymPowder = false; reelLook(null, 'cymatics'); cymReset(); } },
  { n: 'Round', d: 8, tune: 'cymatics · a round plate, bowed at the edge', cap: 'a round plate: diameters and circles. Chladni drew these in 1787.', go: () => { SET.cymShape = 'circle'; cymReset(); }, at: [[4.2, () => { SET.cymPowder = true; }]] },
  { n: 'Lattice', d: 8, tune: 'cube 3D · 3 × 5 × 7', cap: 'fifths across, thirds up, sevenths back. the lit trail is the evidence.', go: () => { SET.cymPowder = REEL.saved.cymPowder; SET.cymShape = REEL.saved.cymShape; SET.detect = true; reelLook(null, 'cube'); VW.vyaw = 0.9; } },
  { n: 'Penteract', d: 8, tune: '5D · primes 3, 5, 7, 11, 13', cap: 'five primes, five dimensions, thirty-two ratios on one shape.', go: () => { SET.x5d = true; reelLook(null, 'd5'); } },
  { n: 'Crack', d: 9, tune: 'obsidian · a held dissonance', cap: 'hold a dissonance and the obsidian cracks.', go: () => { SET.detect = REEL.saved.detect; reelLook('obsidian', 'mandala'); reelMood('lean'); reelHill(); }, at: [[3.1, reelHill], [6.1, reelHill]] },
  { n: 'Cool', d: 6, tune: 'resolution', cap: 'let it resolve and the glass cools.', go: () => { reelMood('light'); reelRelease(); } },
  { n: 'Thirty-one', d: 10, tune: '31-EDO · 38.7¢ steps · 25\\31 = 967.7¢, a hair under 7/4', cap: 'thirty-one steps to the octave, Huygens’ tuning. 25\\31 sits a hair under 7/4.', go: () => { WX.crack.grow = 0; reelLook('dawn', 'mandala'); setMode('tet31', true); }, at: [[2.4, () => reelStep(25)], [5.4, () => reelStep(10)]] },
  { n: 'Weather', d: 13, tune: 'peachfall · peach fall, red rain, mint clearing, night garden', cap: 'the weather follows the music: tension rains, a settled chord clears, a quiet room turns to night.', go: () => { setMode('just', true); reelLook('peachfall', 'mandala'); WX.force = [1, 0, 0, 0]; }, at: [[3.2, () => (WX.force = [0, 1, 0, 0])], [6.4, () => (WX.force = [0, 0, 1, 0])], [9.6, () => (WX.force = [0, 0, 0, 1])]] },
  { n: 'Glasshouse', d: 8, tune: 'glasshouse · cool air, frost light', cap: 'cool air and frost light. tilt the phone and the ridges lean with you. three spores are hiding.', go: () => { WX.force = null; reelLook('glasshouse', 'mandala'); } },
  { n: 'Fieldstone', d: 6, tune: 'fieldstone · a carved wooden rosette', cap: 'a stone wall, mint florals, a carved rosette behind the mandala.', go: () => reelLook('fieldstone', 'mandala') },
  { n: 'Paper', d: 7, tune: 'bw2 · one bit per pixel, then e-ink', cap: 'one bit per pixel: every grey is a pattern of dots.', go: () => reelLook('bw2', 'cymatics'), at: [[3.6, () => reelLook('eink', 'mandala')]] },
  { n: 'Daybreak', d: 10, tune: 'just · a held 9/8 resolves to 1/1', cap: 'a held 9/8 leans on the root, then resolves. that is the whole story.', go: () => { reelLook('daybreak', 'mandala'); reelMood('light'); reelNineEight(); } }
];
REEL.total = SHOTS.reduce((a, s) => a + s.d, 0);

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
function reelVoices(n) { for (let i = voices.filter(v => v.wT > 0).length; i < n; i++) if (!lightAdd()) break; }
function reelVoice() { return (act && act.wT > 0 && !act.dragging ? act : null) || voices.find(v => v.wT > 0 && !v.dragging) || null; }
// park a voice on the nearest hilltop and hold it there: a dissonance on purpose
function reelHill() {
  const v = reelVoice(); if (!v) return;
  let bx = v.x, bd = -1;
  for (let x = Math.max(80, v.x - 170); x <= Math.min(XMAX - 80, v.x + 170); x += 4) { const d = Dv(v, x); if (d > bd) { bd = d; bx = x; } }
  v.locked = false; v.glide = null; v.echo = null; v.target = null; v.x = bx; v.v = 0; v.temp = 0; v.pinUntil = t + 2.9; v.flash = 1; act = v;
}
function reelRelease() { for (const v of voices) if (v.wT > 0 && !v.dragging) { v.pinUntil = 0; v.temp = 0.05; } }
// glide a voice onto k steps of 31 above the root, in whichever octave is nearest
function reelStep(k) {
  const v = reelVoice(); if (!v || M.key !== 'tet31') return;
  let best = null, bd = 1e9;
  for (let o = -2; o <= 4; o++) { const x = xOf(fRoot * Math.pow(2, k / 31 + o)); if (x < 120 || x > XMAX - 120) continue; const d = Math.abs(x - v.x); if (d < bd) { bd = d; best = x; } }
  if (best == null) return;
  v.locked = false; v.pinUntil = 0; v.target = null; v.echo = null; v.hist.length = 0; v.histT.length = 0; v.glide = { x0: v.x, x1: best, t0: t, dur: 0.5 + 0.0011 * Math.abs(best - v.x) }; act = v;
}
// the NIC.LAN reel's last shot: a held 9/8 appoggiatura resolves to the root
function reelNineEight() {
  const v = reelVoice(); if (!v || M.key !== 'just') return;
  const near = r => { let best = null, bd = 1e9; for (let o = -2; o <= 4; o++) { const x = xOf(fRoot * r * Math.pow(2, o)); if (x < 150 || x > XMAX - 150) continue; const d = Math.abs(x - v.x); if (d < bd) { bd = d; best = x; } } return best; };
  const x98 = near(9 / 8); if (x98 == null) return;
  v.locked = false; v.glide = null; v.echo = null; v.target = null; v.x = x98; v.v = 0; v.temp = 0; v.pinUntil = t + 3.8; v.flash = 1; act = v;
  REEL.subs.push({ at: t + 4.2, fn: () => { const x1 = near(1); if (x1 == null || v.wT === 0) return; v.pinUntil = 0; v.hist.length = 0; v.histT.length = 0; v.glide = { x0: v.x, x1, t0: t, dur: 1.6 }; } });
}

// ---------- running it ----------
function reelStart() {
  if (!entered || REEL.on) return;
  if (round) skipRound(); if (rail) stopRail(false); if (pump) pump = null; if (LS.src) listenStop(true);
  REEL.saved = { skin, view: SET.view, cymShape: SET.cymShape, cymPowder: SET.cymPowder, x5d: SET.x5d, detect: SET.detect, mode: M.key, mood: moodNow(), flip: SET.flip, normie: SET.normie, light: SET.light, tease: SET.tease };
  if (SET.normie) { SET.normie = false; SET.flip = SET._flip !== undefined ? SET._flip : true; }
  REEL.saved.flip = SET.flip; SET.flip = false;
  REEL.on = true; REEL.i = -1; REEL.next = t + 0.2; REEL.t0 = t + 0.2; REEL.subs = [];
  if (phone) { setSheet('peek'); $('toast').classList.remove('on'); } else gw.classList.remove('on');
  if (VIEW.x1 - VIEW.x0 < XMAX - 1) VIEW.tgt = { x0: 0, w: XMAX };
  $('reelHud').classList.add('on'); syncUI(); jlog('the reel');
}
function reelStop(done) {
  if (!REEL.on) return;
  REEL.on = false; WX.force = null; REEL.subs = [];
  const s = REEL.saved;
  reelRelease();
  SET.cymShape = s.cymShape; SET.cymPowder = s.cymPowder; SET.detect = s.detect; SET.x5d = s.x5d; SET.flip = s.flip;
  if (s.normie) setNormie(true); else if (s.mode !== M.key) setMode(s.mode, true);
  reelMood(s.mood);
  if (skin !== s.skin) setSkin(s.skin);
  const v = s.view === 'd5' && !s.x5d ? 'mandala' : s.view; if (viewOn() !== v) setViewMode(v, true);
  if (viewOn() === 'cymatics') cymReset();
  $('reelHud').classList.remove('on');
  if (done) { discover('x-reel'); caption('that was everything. your turn.', 3200); } else caption('your turn.', 1500);
  persistSoon(); syncUI(); jlog(done ? 'the reel, to the end' : 'the reel, stopped');
}
function reelTick(dt) {
  REEL.bars += ((REEL.on ? 1 : 0) - REEL.bars) * (1 - Math.exp(-dt * 3)); REEL.flash *= Math.exp(-dt * 3.2);
  if (!REEL.on) return;
  userIdleUntil = t + 6; lastUserT = Math.max(lastUserT, t - 5);
  if (t >= REEL.next) {
    REEL.i++;
    if (REEL.i >= SHOTS.length) { reelStop(true); return; }
    const sh = SHOTS[REEL.i]; REEL.shotT = t; REEL.next = t + sh.d;
    REEL.subs = (sh.at || []).map(([d, fn]) => ({ at: t + d, fn }));
    try { sh.go(); } catch (e) {}
    caption(sh.cap, sh.d * 1000 - 700); REEL.flash = 1; haptic(5);
    $('reelId').textContent = `S${String(REEL.i + 1).padStart(2, '0')} / ${SHOTS.length}`; $('reelName').textContent = sh.n; $('reelTune').textContent = sh.tune;
  }
  for (const s of REEL.subs) if (!s.done && t >= s.at) { s.done = true; try { s.fn(); } catch (e) {} }
  $('reelBar').style.width = (clamp((t - REEL.t0) / REEL.total, 0, 1) * 100).toFixed(2) + '%';
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
$('reelStop').addEventListener('click', e => { e.stopPropagation(); reelStop(false); });
['bReel', 'gReel', 'tReel'].forEach(id => $(id).addEventListener('click', e => { e.currentTarget.blur(); if (!tapOk()) return; if (REEL.on) reelStop(false); else reelStart(); }));
