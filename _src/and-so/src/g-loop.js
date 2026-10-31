// ===== the loop and the boot =====
let perfAcc = 0, perfN = 0, perfT = 0;
const PERF_LOCK = (() => { try { return /[?&]hq\b/.test(location.search); } catch (e) { return false; } })();
function update(dt) {
  if (BOX.auto && BOX.drag == null) {
    const tx = 0.62 * Math.sin(t * 0.043 + 1.1) * Math.cos(t * 0.017), ty = 0.58 * Math.sin(t * 0.031 + 0.4), cp = clamp(Rs - 0.45, 0, 0.5), gp = chordNow ? 0.12 : 0, kk = 1 - Math.exp(-dt * 0.35);
    BOX.x += (tx + (VERT[4][0] - tx) * cp + (VERT[2][0] - tx) * gp - BOX.x) * kk; BOX.y += (ty + (VERT[4][1] - ty) * cp + (VERT[2][1] - ty) * gp - BOX.y) * kk;
  }
  const bw = boxWeights();
  for (let k = 0; k < 5; k++) W5[k] += (bw[k] - W5[k]) * (1 - Math.exp(-dt * 2));
  BOX.open *= Math.exp(-dt * 1.5);
  conductor();
  rhythmTick();
  listenTick(dt);
  motionTick(dt); padTick(dt);
  const nowA = aNow();
  while (visQ.length && visQ[0].t <= nowA) { const q = visQ.shift(); stepIdx = q.i; stepFlash = 1; if (q.i % q.n === 0) { beatPulse = 1; pet.jump = Math.max(pet.jump, 0.45 + 0.4 * W5[1]); } }
  stepFlash *= Math.exp(-dt * 7); beatPulse *= Math.exp(-dt * 5);
  for (const v of voices) v.w += (v.wT - v.w) * (1 - Math.exp(-dt * (v.wT ? 4.5 : 2.6)));
  for (let i = voices.length - 1; i >= 0; i--) { const v = voices[i]; if (v.wT === 0 && v.w < 0.01) { audio.removeVoice(v); voices.splice(i, 1); if (act === v) act = null; } }
  if (!act || act.wT === 0) act = voices.find(v => v.wT > 0) || null;
  if (hole.on) {
    hole.c = xFromS(hole.x); hole.str = clamp(1 - (LT - 20 - hole.y) / (LT * 0.75), 0.15, 1);
    hole.m = 1.4 * D0 * hole.str * (0.6 + 0.8 * W5[4]); hole.spin += dt * (1 + 2 * hole.str);
    hole.lab = nearestLab(relCents(fOf(hole.c))).lab;
    if (!era && !round) for (const v of voices) {
      if (v.wT === 0 || v.dragging) { v.hz = 0; continue; }
      v.hz = Math.abs(v.x - hole.c) < 8 ? (v.hz || 0) + dt : 0;
      if (v.hz > 1.1 && t - hole.lastEat > 6 && voices.filter(o => o.wT > 0).length > 1) swallow(v);
    }
    if (hole.hawkAt && t > hole.hawkAt) { hole.hawkAt = 0; audio.chime(fold(fOf(hole.c) * 8, 2, 1400), 0.03, 0); for (let i = 0; i < 18; i++) sparks.push({ x: hole.x, y: hole.y, vx: rand(-90, 90), vy: rand(-90, 90), life: rand(0.6, 1.4), max: 1.4, c: [220, 200, 255] }); discover('x-hawking'); }
  }
  let scaleHeld = false;
  for (const p of PTR.values()) if (p.role === 'scale' || p.role === 'pinch') scaleHeld = true;
  if (!scaleHeld) {
    if (Math.abs(VIEW.vel) > 20) {
      const w = VIEW.x1 - VIEW.x0, nx = VIEW.x0 + VIEW.vel * dt; setView(nx, w);
      if (nx <= 0 || nx >= XMAX - w) { VIEW.rubber = clamp(VIEW.rubber + (nx <= 0 ? 1 : -1) * Math.min(42, Math.abs(VIEW.vel) * 0.012), -48, 48); VIEW.vel = 0; }
      VIEW.vel *= Math.exp(-dt * 2.8);
    } else VIEW.vel = 0;
    if (Math.abs(VIEW.rubber) > 0.3) VIEW.rubber *= Math.exp(-dt * 9); else VIEW.rubber = 0;
    if (VIEW.tgt) {
      const T = VIEW.tgt, k = 1 - Math.exp(-dt * 14), w0 = VIEW.x1 - VIEW.x0, w = w0 + (T.w - w0) * k, x0 = VIEW.x0 + (T.x0 - VIEW.x0) * k;
      if (Math.abs(T.w - w) < 0.05 && Math.abs(T.x0 - x0) < 0.05) { setView(T.x0, T.w); VIEW.tgt = null; } else setView(x0, w);
    }
  }
  viewTick(dt); wxTick(dt); reelTick(dt);
  if (zoomLevel() > 1.01) for (const p of PTR.values()) {
    if (p.role !== 'voice') continue;
    const e = 34, w = VIEW.x1 - VIEW.x0, sp = w * 0.9 * dt;
    let moved = false;
    if (p.x < PX0 + e) { setView(VIEW.x0 - sp * (1 - (p.x - PX0) / e), w); moved = true; }
    else if (p.x > PX0 + PW - e) { setView(VIEW.x0 + sp * (1 - (PX0 + PW - p.x) / e), w); moved = true; }
    if (moved) { const xr = xFromS(p.x); p.fx = clamp(p.fx + xr - p.lxr, 0, XMAX); p.lxr = xr; p.v.dragX = p.fx; }
  }
  const SUB = Math.max(4, Math.ceil(dt / 0.0042)), h = dt / SUB;   // keep each physics step short even when frames are slow: the valleys are stiff
  for (let k = 0; k < SUB; k++) for (const v of voices) stepVoice(v, h);
  rollTicks();
  const tau = 0.55 + 0.9 * effTease(), tmode = targetMode();
  for (const v of voices) {
    if (v.wT === 0) continue;
    const free = !v.dragging && !v.glide && t >= v.pinUntil, tm = tmode && v.target != null;
    if (free) v.temp *= Math.exp(-dt / tau);
    v.hist.push(v.x); v.histT.push(t);
    while (v.histT.length && t - v.histT[0] > 0.4) { v.hist.shift(); v.histT.shift(); }
    if (v.locked) { if (!tmode && !(v.hold > t)) { const d0 = Dv(v, v.x); if (Dv(v, v.x - 0.4) < d0 - 1e-12 || Dv(v, v.x + 0.4) < d0 - 1e-12) { v.locked = false; v.v = 0; v.hist.length = 0; v.histT.length = 0; } } }   // a reel's held chord stays put until its shot ends
    else if (tm) { if (!v.dragging && t >= v.approachUntil && Math.abs(v.x - v.target) < 0.7 && Math.abs(v.v) < 6) lockExact(v, v.target); }
    else if (free && v.temp < 0.05 && v.histT.length > 6 && t - v.histT[0] > 0.33) {
      let mn = 1e9, mx = -1e9; for (const x of v.hist) { if (x < mn) mn = x; if (x > mx) mx = x; }
      if (mx - mn < 1.6) { if (tmode) lockExact(v, v.x); else lockVoice(v); }
    }
  }
  for (const p of PTR.values()) {
    if (p.role !== 'voice') continue;
    const v = p.v, hN = 1 - Math.exp(-Dv(v, v.x) / DS);
    p.wolf = hN > 0.72 ? p.wolf + dt : Math.max(0, p.wolf - dt * 2);
    if (p.wolf > 2.5) discover('x-wolf', v);
    for (const o of voices) if (o !== v && o.wT > 0 && Math.abs(o.x - v.x) < 14) { discover('x-space', v); break; }
    if (M.key === 'bp') { const near = Math.abs(v.c - 1200) < 12 || voices.some(o => o !== v && o.wT > 0 && Math.abs(Math.abs(o.x - v.x) - 1200) < 12); p.oct = near ? p.oct + dt : 0; if (p.oct > 0.8) discover('b-nooct', v); }
  }
  computeCurves(dt);
  for (const v of voices) {
    const fv = fOf(v.x); v.c = relCents(fv);
    const nl = nearestLab(v.c); v.lab = nl.lab; v.dev = nl.dev; v.ji = nl.ji || 0; v.jl = nl.jl || '';
    let cp = coincide(fv);
    if (cp && v.pair && (v.pair[0] !== cp[0] || v.pair[1] !== cp[1]) && v.pair[0] < PK && v.pair[1] < PK) {
      const oc = 1200 * Math.log2((fv * PR[v.pair[0]]) / (fRoot * PR[v.pair[1]])), os = Math.abs(oc) + 0.8 * (v.pair[0] + v.pair[1]);
      if (Math.abs(oc) < 150 && os < cp[3] + 3) cp = [v.pair[0], v.pair[1], oc, os];
    }
    if (cp) { v.pair = cp; v.fa = M.fig[cp[1]]; v.fb = M.fig[cp[0]]; v.kap = Math.pow(2, cp[2] / 1200) - 1; const dHz = fv * PR[cp[0]] - fRoot * PR[cp[1]]; v.phi += TAU * dHz * 0.45 * dt; v.beat = Math.abs(dHz); }
    else { v.pair = null; v.fa = 1; v.fb = 1; v.kap = 0.03; v.phi += TAU * 6 * dt; v.beat = 30; }
    v.flash *= Math.exp(-dt * 3); v.bounce *= Math.exp(-dt * 3.2);
    audio.updateVoice(v);
  }
  let rough = 0;
  for (let i = 0; i < voices.length; i++) { const a = voices[i], fa = fOf(a.x); rough += dTones(fa, fRoot) * a.w; for (let j = i + 1; j < voices.length; j++) rough += dTones(fa, fOf(voices[j].x)) * a.w * voices[j].w; }
  Rs += (1 - Math.exp(-rough / (1.6 * D0)) - Rs) * (1 - Math.exp(-dt * 3));
  const live = voices.filter(v => v.wT > 0);
  chordNow = live.length && live.every(v => v.locked) ? chordOf(live) : null;
  if (chordNow) {
    const key = `${M.key}:${chordNow.str}@${fRoot.toFixed(2)}:${live.map(v => Math.round(v.x / 5)).join(',')}`;
    if (key !== lastBloom) {
      lastBloom = key; bloomFlash = 1;
      if (tmode) peak = Math.max(peak, 0.45);
      else {
        peak = 1; chill = 1; audio.bloom(live.map(v => fOf(v.x)));
        if (LIGHT() && live.length >= 2) { discover('x-light'); aurora = Math.max(aurora, 0.35); }
        if (M.key === 'just' || M.key === 'bp') discoverCh(chordNow.str);
        else if (M.key === 'gamelan') { if (chordNow.ks && chordNow.ks.length >= 3) discover('g-chord'); }
        else if (M.key === 'tet10' && chordNow.ks && chordNow.ks.filter(k => k !== 0 && k !== 5).length >= 2) discover('t-nopiano');
        else if (M.key === 'tet31' && chordNow.ks && [10, 18, 25].every(k => chordNow.ks.includes(k))) discover('w-chord');
        gpRumble(0.25, 0.05, 110);
        if (live.length >= 2) award(10 * live.length, MX, MY - MR * 0.4, 'chord');
        emit('chord', { str: chordNow.str, n: live.length });
      }
      if (live.length >= 4) discover('x-full');
    }
  }
  roundTick();
  dynamicsTick(dt);
  if (!era) { birdTick(); if (bird.discoverAt && t >= bird.discoverAt) { bird.discoverAt = 0; discover('x-bird'); } }
  const be = 1 - Math.exp(-dt * 5);
  bird.x += (bird.tx - bird.x) * be; bird.y += (bird.ty - bird.y) * be;
  const singing = SET.bird && (bird.notes.length > 0 || t - bird.lastNote < 2.2);
  bird.alpha += ((singing ? 1 : 0) - bird.alpha) * (1 - Math.exp(-dt * 3)); bird.flash *= Math.exp(-dt * 4);
  if (bird.alpha > 0.02) { bird.trail.push([bird.x, bird.y]); if (bird.trail.length > 36) bird.trail.shift(); }
  else { bird.trail.length = 0; if (!singing) { bird.x = bird.tx = -100; bird.y = bird.ty = -100; } }
  petTick(dt); pluckFree(); brookTick(dt); jamTick(); guardTick(dt); heardTick();
  bookTick(); wingTick(dt); ensTick(); dreamTick(); magTick(dt);
  if (era && era.endAt) {
    if (!era.cap && t > era.endAt + 1.3) { era.cap = true; caption("1955 isn't ready for that yet. its kids will be.", 5200); discover('x-1955'); }
    if (t > era.endAt + 4.2) { const pv = era.prev, pr = era.prevRhy; era = null; for (const v of voices) { v.target = null; v.locked = false; v.temp = 0.2; } if (pv !== M.key) setMode(pv, true); rhy.on = pr; rhy.nextT = 0; syncUI(); }
  }
  if (toastFlush && t >= toastFlush && !(REEL.on && phone)) { showToast(toastQ.splice(0, 4)); toastFlush = 0; toastHideAt = t + 7; }
  if (toastHideAt && t >= toastHideAt) { $('toast').classList.remove('on'); toastHideAt = 0; if (toastQ.length) toastFlush = t + 0.9; }
  if (hintOffAt && t > hintOffAt) hideHint();
  if (entered && t - lastUserT > 30 && t > nextTryT && !$('hint').classList.contains('on')) { const pool = CAT.filter(c => !found.has(c.id) && (c.mode === 'any' || c.mode === M.key)); if (pool.length) showHint('try: ' + pool[(Math.random() * pool.length) | 0].hint, 8); nextTryT = t + 45; }
  if (GAME.combo && t - GAME.lastLand > 4) { GAME.combo = 0; scoreUI(); }
  mrot += dt * 0.025; bloomFlash *= Math.exp(-dt * 1.8); rootFlash *= Math.exp(-dt * 2.2); aurora *= Math.exp(-dt * 0.9); flash55 *= Math.exp(-dt * 0.8);
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; } s.vx *= Math.exp(-dt * 1.5); s.x += s.vx * dt; s.y += s.vy * dt; }
  if (sparks.length > 400) sparks.splice(0, sparks.length - 400);
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life -= dt; if (r.life <= 0) { rings.splice(i, 1); continue; } r.r += r.v * dt; r.v *= Math.exp(-dt * 1.2); }
  for (let i = glyphs.length - 1; i >= 0; i--) { const g = glyphs[i]; g.life -= dt; if (g.life <= 0) { glyphs.splice(i, 1); continue; } g.vy += 60 * dt; g.vx *= Math.exp(-dt * 0.8); g.x += g.vx * dt; g.y += g.vy * dt; g.rot += g.vr * dt; }
  if (glyphs.length > 160) glyphs.splice(0, glyphs.length - 160);
  for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].life -= dt; if (floaters[i].life <= 0) floaters.splice(i, 1); }
  if (floaters.length > 24) floaters.splice(0, floaters.length - 24);
  for (let i = fires.length - 1; i >= 0; i--) { fires[i].life -= dt; if (fires[i].life <= 0) fires.splice(i, 1); }
  if (fires.length > 120) fires.splice(0, fires.length - 120);
  for (let i = spag.length - 1; i >= 0; i--) { spag[i].life -= dt; if (spag[i].life <= 0) spag.splice(i, 1); }
  if (scaleMark) { scaleMark.life -= dt; if (scaleMark.life <= 0) scaleMark = null; }
  spaceT -= dt; if (spaceT <= 0 && A.ac) { spaceT = 0.3; A.rw.gain.setTargetAtTime(0.3 + 0.3 * W5[3], A.ac.currentTime, 0.5); }
  worldTick(dt);
}
let einkT = 0;
function frame(now) {
  if (window.innerWidth !== W || window.innerHeight !== H) resize();
  let dt = (now - last) / 1000; last = now;
  if (!(dt > 0)) dt = 0.016;
  if (entered && !PERF_LOCK) {
    perfAcc += dt; perfN++; perfT += dt;
    if (perfT > 2.5) {
      const avg = perfAcc / perfN;
      if (avg > 0.026 && dprScale > 0.55) { dprScale = Math.max(0.55, dprScale - 0.15); qScale = Math.max(0.5, qScale - 0.15); resize(); }
      else if (avg < 0.0175 && dprScale < 1) { dprScale = Math.min(1, dprScale + 0.1); qScale = Math.min(1, qScale + 0.1); resize(); }
      perfAcc = 0; perfN = 0; perfT = 0;
    }
  }
  if (dt > 0.05) dt = 0.05;
  t += dt; update(dt);
  const slow = skin === 'eink' || skin === 'bw2';
  if (!slow || now - einkT > (skin === 'bw2' ? 380 : 450)) { einkT = now; draw(); if (skin === 'bw2') ditherBW(); }
  requestAnimationFrame(frame);
}

// ---------- the first chord ----------
function startVoices() {
  if (LIGHT()) {
    const r0 = M.easy ? fRoot : M.root0;
    [[2, 4], [2.5, -3], [3, 3]].forEach(([r, off], i) => setTimeout(() => { if (!entered) return; const v = addVoice(xOf(r0 * r) + off, { temp: 0 }); if (v && i === 0) act = v; }, 60 + i * 420));
    return;
  }
  [xOf(M.root0 * 2.5) + 31, xOf(M.root0 * 3) - 34, xOf(M.root0 * 3.5) + 27].forEach((x, i) => addVoice(x, { temp: 0.25, pin: 1.4 + i * 0.6 }));
  act = voices[0];
}

// ---------- boot ----------
var wantPlay = false, wantDream = '';
try {
  const q = location.search;
  if (/[?&]play=1/.test(q)) wantPlay = true;
  if (/[?&]dreamwalk=book/.test(q)) wantDream = 'book';
  else if (/[?&]dreamwalk=tune/.test(q)) wantDream = 'tune';
  else if (/[?&]dreamwalk=(?:1|main)(?:&|$)/.test(q)) wantDream = 'main';
} catch (e) {}
function boot(hotData) {
  recalibrate();
  loadLocal();
  if (hotData && hotData.v) applySave(hotData, true);
  REF = SET.ref / 440;
  // AND SO 7 opens on paper: a Storeybrook look you pick is kept, while the older looks (a preset, a brook stone, the
  // older-looks row) last for the visit, so the page never reopens in one of them; a mirror copy opens in the look it was handed
  skin = MIR.depth > 0 && SKINS.includes(MIR.look) ? MIR.look : SB_LOOK[savedSkin] ? savedSkin : 'sb-daylight';
  document.body.dataset.skin = skin; applyLook(); document.body.classList.add('landing');
  inkCanvas(ctx); quietCanvas(ctx); quietCanvas(ctx2); document.body.classList.toggle('quiet', !!SET.quiet);   // quiet wraps ink, so quiet hides the halos too
  $('stText').value = STORY;
  $('enterFine').insertAdjacentText('beforeend', ` there are ${CAT.length} things to find.`);
  checkUnlocks(true); renderGuide(); renderPresets(); scoreUI(); renderQuests(); saveNote(); reelUI();
  resize();
  if (MIR.depth === 0) initCaps(); else capsUI();
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => snapshot()); } catch (e) {}
  jarPaint(false); landing(); mirBoot();
  if ((wantDream || wantPlay) && MIR.depth === 0) setTimeout(() => { if (!entered) $('enter').click(); }, 350);
  requestAnimationFrame(frame);
}
$('enterReel').addEventListener('click', () => { $('enter').click(); setTimeout(reelStart, 1400); });
$('enter').addEventListener('click', e => {
  if (entered) return;
  entered = true; e.currentTarget.blur();
  $('overlay').classList.add('gone'); $('hud').classList.add('on'); document.body.classList.remove('landing');
  audio.init();
  startVoices();
  caption(LIGHT() ? 'light first. every valley is a little sun.' : 'a dissonance leans on its resolution.', 3800, 'music');
  // Everfallen starts in easy listening: familiar chords, plucked, that slide into just intonation when the auto-flip comes
  if (SET.easyStart && !M.easy) setTimeout(() => { if (entered && !M.easy && !round && !JAM.on && !era && !REEL.on) setMode('easy', true); }, 1600);
  dailyNougat(); guardsLoad();
  nextAct = t + 10; lastUserT = t; nextTryT = t + 40; flipAt = t + 45; bellNext = t + 14; windNext = t + 9; trainNext = t + 200;
  lastPX = W / 2; lastPY = H / 2;
  fillQuests(); resize();
  if (!phone && MIR.depth === 0) setTimeout(() => showGw(false), 900);
  setTimeout(() => { if (!draggedOnce) showHint(phone ? 'drag a voice · tap the terrain to add one · drag the scale' : 'drag a voice off its rest · tap the terrain to add one · scroll the scale · tap the sky to ' + (LIGHT() ? 'glide' : 'lean'), 16); }, 1600);
  jlog('entered');
  if (wantDream) { const tour = wantDream; wantDream = ''; setTimeout(() => dreamStart(tour), 700); }
  else if (wantPlay) { wantPlay = false; setTimeout(() => bookOpen('st-louis', { play: true }), 800); }
});
try {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(d => boot(d || {})); else boot((hot && hot.data) || {});
} catch (e) { boot({}); }
// a read-only window for tests, only with ?debug in the address
try {
  if (/[?&]debug\b/.test(location.search)) window.__andso = {
    voices: () => voices.filter(v => v.wT > 0).map(v => ({ x: +v.x.toFixed(2), c: +v.c.toFixed(2), lab: v.lab, locked: v.locked, glide: !!v.glide, echo: v.echo, drag: !!v.dragging })),
    sound: () => ({ muted, audioState: A.ac && A.ac.state, rain: SET.rain, artic: SET.artic, hummer: LS.src === 'demo', masterGain: A.vol && A.vol.gain.value, replays: capture.replays.size }),
    ls: () => ({ src: LS.src, f: +LS.f.toFixed(2), conf: +LS.conf.toFixed(3), phrases: LS.phrases, lines: LS.lines.slice(), note: !!LS.note, roomC: LS.roomC, act: LS.lastAction, rms: +LS.rms.toFixed(4), dispX: LS.dispX }),
    state: () => ({ t: +t.toFixed(2), root: +fRoot.toFixed(3), tune: +TUNE.toFixed(5), Rs: +Rs.toFixed(4), chord: chordNow && chordNow.str, mood: moodNow(), mode: M.key, skin, found: [...found], score: GAME.score }),
    listenStart, listenStop, setFollow, lean, setMood, setMode, setSkin, setViewMode, setX5d, reelStart, reelStop,
    jamStart, jamStop, jamNoteOn, jamNoteOff, openBrook, closeBrook, walkStone, mirrorTable, mirOpen, setQuiet, setArtic, earlyAccess, openStory, cycleLook, eerie,
    jam: () => ({ on: JAM.on, sess: JAM.sess, bar: JAM.bar, bi: JAM.bi, chorus: JAM.chorus, score: JAM.score, notes: JAM.notes, good: JAM.good, phase: JAM.phase, chord: JAM.chord && JAM.chord.sym, keys: JAM.keys.length, call: !!JAM.call, blues: [...JAM.blues] }),
    game: () => ({ nougats: GAME.nougats, stones: GAME.stones.slice(), stories: GAME.stories.slice(), played: Math.round(GAME.played), jamBest: GAME.jamBest, lastDay: GAME.lastDay, all: allUnlocked }),
    mir: () => ({ depth: MIR.depth, open: MIR.open, deep: MIR.deep, wins: MIR.wins.map(w => ({ kind: w.kind, dev: w.dev, look: w.look, ready: w.ready, k: +w.k.toFixed(3) })) }),
    hearText, spawnGuard, guardsSleep, mishear, earNorm, guards: () => EAR.guards.map(g => ({ id: g.id, x: Math.round(g.x), y: Math.round(g.y), on: !!(GFEAT[g.id] && GFEAT[g.id].on()) })), ear: () => ({ q: EAR.q.map(q => q.id), heard: EAR.heardS, miss: EAR.missS, met: GAME.met.slice() }),
    nougat: n => nougat(n, W / 2, H / 2, 'a test'), played: s => { GAME.played = s; }, deep: d => { MIR.deep = d; }, folds: d => { depth = d; }, petForm: f => { SET.petForm = f; }, pet: () => ({ x: pet.x, y: pet.y, say: pet.say }),
    mo: () => ({ twistA: +MO.twistA.toFixed(1), sinceShake: +(performance.now() / 1000 - MO.shakeT).toFixed(2), sinceTwist: +(performance.now() / 1000 - MO.twistT).toFixed(2), on: MO.on, live: MO.live, sign: MO.sign, gx: +MO.gx.toFixed(3), gy: +MO.gy.toFixed(3), tx: +MO.tx.toFixed(3), ty: +MO.ty.toFixed(3), lean: +MO.lean.toFixed(2), rolling: MO.rolling, hops: MO.hops, busy: +MO.busy.toFixed(2), gesture: MO.gesture, hz: Math.round(MO.hz) }),
    wx: () => ({ w: WX.w.map(x => +x.toFixed(2)), name: wxName(), heat: +WX.heat.toFixed(3), tens: +WX.tens.toFixed(3), crack: +WX.crack.grow.toFixed(2), eye: { a: +WX.eye.a.toFixed(2), x: Math.round(WX.eye.x), y: Math.round(WX.eye.y) }, spores: WX.spores.map(s => ({ x: Math.round(s.x || -1), y: Math.round(s.y || -1), f: s.f })), parts: WX.parts.length }),
    hill: i => { const v = voices.filter(o => o.wT > 0)[i]; if (!v) return null; let bx = v.x, be = -1; for (let x = Math.max(160, v.x - 320); x <= Math.min(XMAX - 160, v.x + 320); x += 4) { const d = Dv(v, x), e = (d - wxFloor(v, x, d)) / D0; if (e > be) { be = e; bx = x; } } return { x: bx, X: xToS(bx), e: +be.toFixed(3) }; },
    pair: (x1, x2) => +(dTones(fOf(x1), fOf(x2)) / D0).toFixed(3), wxForce: f => { WX.force = f || null; }, crack: g => { WX.crack.grow = g; WX.crack.hotT = t; },
    reel: () => ({ on: REEL.on, id: REEL.id, i: REEL.i, done: REEL.done, name: REEL.R && REEL.i >= 0 && REEL.i < REEL.R.shots.length ? REEL.R.shots[REEL.i].n : '', shots: REEL.R ? REEL.R.shots.length : 0, total: REEL.R ? REEL.R.total : 0,
      watched: GAME.reels.slice(), reelFound: GAME.reelFound.slice(), auto: !!SET.reelAuto, share: REEL_SHARE, gives: [...REEL_GIVES], card: $('reelCard').classList.contains('on'), news: REEL.news.slice() }),
    reels: () => REELS.concat(CUT).map(r => ({ id: r.id, name: r.name, total: r.total, gives: [...r.gives], shots: r.shots.map(s => ({ n: s.n, d: s.d, gives: s.gives || [] })) })),
    reelSkip, reelNow: () => { if (REEL.on && !REEL.done && REEL.i >= 0) REEL.next = t; }, reelAuto: on => { SET.reelAuto = !!on; reelUI(); },
    quests: () => GAME.quests.map(a => ({ id: a.id, p: a.p, done: a.done })), setQuests: ids => { GAME.quests = ids.map(id => ({ id, p: 0, done: false })); renderQuests(); },
    view: () => ({ x0: +VIEW.x0.toFixed(2), x1: +VIEW.x1.toFixed(2), tgt: VIEW.tgt && { x0: +VIEW.tgt.x0.toFixed(2), w: +VIEW.tgt.w.toFixed(2) }, rubber: +VIEW.rubber.toFixed(2), vel: +VIEW.vel.toFixed(1), zoom: +zoomLevel().toFixed(3) }),
    box: () => ({ view: viewOn(), MX, MY, MR, yaw: +VW.yaw.toFixed(3), dist: +VW.dist.toFixed(2), pick: VW.pick && VW.pick.lab, hits: (VW.hits || []).map(h => ({ X: Math.round(h.X), Y: Math.round(h.Y), lab: h.nd.lab })), cy: { n: CY.n, motion: +CY.motion.toFixed(4), still: +CY.still.toFixed(2), gain: CY.gain, lead: CY.lead && CY.lead.ms.map(m => m.mo.key + '@' + m.a.toFixed(2)).join(' '), f: CY.lead && +CY.lead.f.toFixed(1) } }),
    geo: () => ({ W, H, LT, LB, SH, PX0, PW, DPR, phone, TOPH }),
    xs: v => xToS(v), ball: i => { const v = voices.filter(o => o.wT > 0)[i]; if (!v) return null; const b = ballPos(v); return { X: Math.round(b.X), Y: Math.round(b.Y), x: +v.x.toFixed(2), locked: v.locked }; }, dv: (i, x) => { const v = voices.filter(o => o.wT > 0)[i]; return v ? Dv(v, x) : null; }, refine: (i, x) => { const v = voices.filter(o => o.wT > 0)[i]; return v ? refineMin(v, x, 11) : null; },
    book: () => ({ open: BOOK.open, id: BOOK.id, on: BOOK.onPlay, bar: BOOK.bar, sym: BOOK.sym, bpm: BOOK.bpm, pd: !!(BOOK.tune && BOOK.tune.pd), n: BOOK_DATA.length, pdn: BOOK_DATA.filter(t => t.pd).length, wingN: WING_DATA.length }),
    wing: () => ({ step: WING.step, played: WING.played.slice(), dream: WING.dream }),
    ens: () => ({ on: ENS.on, n: ENS.n, role: ENS.role, gain: +ENS.gain.toFixed(3), master: ENS.master, id: ENS.id, born: ENS.born, bpm: BOOK.bpm, abs: BOOK.abs, chord: BOOK.sym, bus: A.bus ? +A.bus.gain.value.toFixed(3) : null, drum: A.drumBus ? +A.drumBus.gain.value.toFixed(3) : null, vol: A.vol ? +A.vol.gain.value.toFixed(3) : null, filter: A.roleF ? A.roleF.type : '', ensFilter: A.ensFilter ? A.ensFilter.type : '', peers: Object.keys(ENS.peers).map(id => ({ id, born: ENS.peers[id].born })) }),
    dream: () => ({ on: DREAM.on, tour: DREAM.tour, i: DREAM.i, clean: DREAM.clean, cap: (TOURS[DREAM.tour] && TOURS[DREAM.tour][DREAM.i] && TOURS[DREAM.tour][DREAM.i].cap) || '' }),
    mag: () => ({ found: MAG.found, step: MAG.step, look: MAG.look }),
    dreamStart, bookOpen, wingShow
  };
} catch (e) {}
