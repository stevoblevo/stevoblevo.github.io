/* LIVLOCH · audio: a recorded score and a small WebAudio synth for effects.

   MUSIC (0.21)
   - The score is eight recorded cues in art/music/ (made with ElevenLabs Music from prompts in docs/MUSIC.md): a title
     theme, two takes of the calm match music and two of the battle music that alternate so a long match doesn't loop
     one track, a Red Rain cue, and victory and defeat stingers. Home key A major, tense cues in its relative F sharp
     minor, so the effects (below) sit in the same key.
   - Two decks crossfade: a cue change fades over about 2.5 s, and a cue loops by starting its next take on the other
     deck a few seconds before the end. Stingers play over the top while the loop fades out.
   - What plays follows the model: title outside a match; in a match the calm music, the battle music while the fight
     is hot (hurt recently, enemy heroes close, or a structure falling), the Red Rain cue while W.red > 0; the stinger
     on 'over'. Hysteresis keeps it from flapping.
   - Volumes: master x (music | effects), and a mute that silences everything at once (button always on screen, key M).

   EFFECTS
   - No samples. Every sound is a few oscillators or filtered noise.
   - Pitches come from edo(n), written in 31 equal steps to the octave (10 steps a major third, 18 a fifth, 25 the
     harmonic seventh). Since 0.21 they are rounded to the nearest ordinary semitone unless the player turns on
     "Saelion tuning" in Settings, so by default every chime is in tune with the score (A major).
   - Securing soul orbs climbs a ladder of those steps while a combo lasts.
   - Levels were set by measurement; the owner plays with sound on, and reports from other ears are wanted
     (LUFS for the score, A.offline for effects). */
(function () {
'use strict';
const LL = window.LL;
const A = LL.audio = { on: false, vol: 0.6, music: 0.7, sfx: 0.9, muted: false, micro: false };
let ctx = null, master = null, sfxBus = null, musBus = null, nbuf = null, drone = null, combo = 0, comboT = 0, shotBudget = 0, lastT = 0;
const edo = n => 110 * Math.pow(2, A.micro ? n / 31 : Math.round(n * 12 / 31) / 12);
const LADDER = [31, 36, 41, 49, 54, 59, 62, 67, 72, 80, 85, 93];

A.init = function () {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(function () {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = A.muted ? 0 : A.vol;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.sfx; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = A.music; musBus.connect(master);
    nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.on = true; if (A.micro) startDrone(); musicStart();
  } catch (e) { ctx = null; }
};
/* For evidence runs: render one event offline, with no drone, and report its level. It measures; it does not listen. */
A.offline = function (ev, W, cam, secs) {
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) return Promise.resolve(null);
  const keep = { ctx: ctx, master: master, sfxBus: sfxBus, nbuf: nbuf, drone: drone, on: A.on, combo: combo, budget: shotBudget };
  const oc = new OC(1, Math.floor(44100 * (secs || 2)), 44100);
  ctx = oc; master = oc.createGain(); master.gain.value = 1; master.connect(oc.destination); sfxBus = master; drone = null;
  nbuf = oc.createBuffer(1, 44100, 44100); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.on = true; shotBudget = 6; let threw = null;
  try { A.fx(ev, W, cam); } catch (e) { threw = e.message; }
  ctx = keep.ctx; master = keep.master; sfxBus = keep.sfxBus; nbuf = keep.nbuf; drone = keep.drone; A.on = keep.on; combo = keep.combo; shotBudget = keep.budget;
  return oc.startRendering().then(function (buf) { const x = buf.getChannelData(0); let pk = 0, acc = 0, last = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; acc += a * a; if (a > 0.002) last = i; } return { peak: pk, rms: Math.sqrt(acc / x.length), seconds: last / 44100, threw: threw }; });
};
A.setVol = function (v, music, sfx) {
  A.vol = v; if (music != null) A.music = music; if (sfx != null) A.sfx = sfx;
  if (!ctx) return; const t = ctx.currentTime;
  master.gain.setTargetAtTime(A.muted ? 0 : A.vol, t, 0.05); musBus.gain.setTargetAtTime(A.music, t, 0.05); sfxBus.gain.setTargetAtTime(A.sfx, t, 0.05);
};
A.setMute = function (m) { A.muted = !!m; if (ctx) master.gain.setTargetAtTime(A.muted ? 0 : A.vol, ctx.currentTime, 0.04); };
A.setMicro = function (m) { A.micro = !!m; if (!ctx) return; if (A.micro && !drone) startDrone(); else if (!A.micro && drone) { drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); const d = drone; drone = null; setTimeout(function () { try { d.g.disconnect(); } catch (e) {} }, 2500); } };
function tone(f, dur, type, g, slide, delay) {
  if (!A.on || g <= 0.002) return;
  const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), a = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.006); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(a); a.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, g, f, q, type, delay, slide) {
  if (!A.on || g <= 0.002) return;
  const t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain();
  s.buffer = nbuf; s.loop = true; fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
  if (slide) fl.frequency.exponentialRampToValueAtTime(slide, t + dur);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(a); a.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
function bell(n, g, dur) { const f = edo(n); [1, 2.01, 2.76, 5.4, 8.9].forEach(function (p, i) { tone(f * p, dur / (1 + i * 0.5), 'sine', g / (1 + i * 1.3)); }); }
function startDrone() {
  const g = ctx.createGain(); g.gain.value = 0.05; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 220; fl.Q.value = 2;
  [0, 18, 31 + 9].forEach(function (n, i) { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = edo(n - 31) * (1 + i * 0.002); o.connect(fl); o.start(); });
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 70; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
  fl.connect(g); g.connect(sfxBus); drone = { g: g, fl: fl };
}
A.ui = function (kind) {
  if (kind === 'ok') { tone(edo(62), 0.09, 'triangle', 0.12); tone(edo(72), 0.12, 'triangle', 0.1, 0, 0.06); }
  else if (kind === 'no') tone(edo(20), 0.14, 'square', 0.06, edo(14));
  else tone(edo(54), 0.05, 'triangle', 0.08);
};
/* MUSIC ------------------------------------------------------------------------------------------------------- */
const CUES = { title: ['title'], valley: ['valley-1', 'valley-2'], battle: ['battle-1', 'battle-2'], red: ['red'], win: ['win'], lose: ['lose'] };
const STING = { win: 1, lose: 1 }, LVL = { title: 0.9, valley: 0.8, battle: 0.85, red: 0.9, win: 1, lose: 1.15 };
const XF = 2.6, LOOPXF = 4;
let decks = [], deckI = 0, cue = null, want = 'title', take = {}, sting = null, after = null, heat = 0, battleT = 0, duck = 1, timer = 0;
A.base = 'art/music/';
function deck() {
  const el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous';
  const d = { el: el, g: ctx.createGain(), name: null, fading: false };
  try { ctx.createMediaElementSource(el).connect(d.g); } catch (e) { d.direct = true; }
  d.g.gain.value = 0; d.g.connect(musBus); return d;
}
function fadeTo(d, v, secs) { const t = ctx.currentTime; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(v, t + secs); if (d.direct) d.el.volume = Math.min(1, v); }
function startOn(d, name, lvl, secs) {
  d.name = name; d.el.src = A.base + name + '.mp3'; d.el.currentTime = 0; d.fading = false;
  const p = d.el.play(); if (p && p.catch) p.catch(function () {}); fadeTo(d, lvl * duck, secs);
}
function stopDeck(d, secs) { if (!d || !d.name) return; d.fading = true; fadeTo(d, 0, secs); const el = d.el, nm = d.name; setTimeout(function () { if (d.fading && d.name === nm) { el.pause(); d.name = null; } }, secs * 1000 + 120); }
function nextTake(c) { const L = CUES[c]; take[c] = ((take[c] == null ? -1 : take[c]) + 1) % L.length; return L[take[c]]; }
function play(c, secs) {
  if (!ctx || !decks.length) return; const cur = decks[deckI];
  if (STING[c]) { if (!sting) sting = deck(); stopDeck(cur, 1.2); cue = c; startOn(sting, CUES[c][0], LVL[c], 0.05); sting.el.onended = function () { sting.name = null; cue = null; if (after) A.cue(after); }; return; }
  deckI = 1 - deckI; const nd = decks[deckI]; stopDeck(cur, secs); cue = c; startOn(nd, nextTake(c), LVL[c], secs);
}
function musicStart() { if (!ctx) return; decks = [deck(), deck()]; timer = setInterval(musicTick, 250); if (want) play(want, 1.5); }
/* Every quarter second: crossfade a cue into its next take before it runs out, and follow the wanted cue. */
function musicTick() {
  if (!ctx || ctx.state !== 'running') return;
  if (want && want !== cue && !(sting && sting.name)) play(want, XF);
  const d = decks[deckI]; if (!d || !d.name || !cue || STING[cue]) return;
  const el = d.el; if (el.duration && el.currentTime > el.duration - LOOPXF) play(cue, LOOPXF);
}
/* A.cue(name): what the model says should be playing. 'title', 'valley', 'battle', 'red', or a stinger 'win'/'lose'
   followed by `then` once it ends. */
A.cue = function (c, then) { if (STING[c]) { after = then || 'title'; want = null; if (ctx && decks.length) play(c); else want = then || 'title'; return; } want = c; };
A.duck = function (on) { duck = on ? 0.45 : 1; if (!ctx) return; decks.forEach(function (d) { if (d.name && !d.fading) fadeTo(d, LVL[cue] * duck, 0.4); }); };
A.state = function () { return { cue: cue, want: want, heat: +heat.toFixed(2), decks: decks.map(function (d) { return d.name ? d.name + '@' + d.el.currentTime.toFixed(1) : '-'; }) }; };
/* In a match: how hot is the fight around the player? Hurt in the last 4 s, a crowd of Hush within about 24 m (a
   hollow counts as four), a structure falling nearby. Battle music comes in above 0.55 held for a second and leaves after 7 s below 0.25. */
function musicFrame(dt, W) {
  const p = W.player; if (!p) return;
  if (W.over) return;
  let h = 0;
  if (W.t - (p.lastHurt == null ? -99 : p.lastHurt) < 4) h = 1;
  let n = 0; const T = W.troopers || [];
  for (let i = 0; i < T.length; i++) { const o = T[i]; if (o.team !== p.team && o.alive && Math.abs(o.x - p.x) < 24 && Math.abs(o.z - p.z) < 24) n += o.big ? 4 : 1; }
  for (let i = 0; i < W.heroes.length; i++) { const o = W.heroes[i]; if (o.team !== p.team && o.alive && Math.hypot(o.x - p.x, o.z - p.z) < 28) n += 4; }
  h = Math.max(h, Math.min(1, n / 7) * 0.8);
  heat += (h - heat) * Math.min(1, dt * (h > heat ? 3 : 0.6));
  if (heat > 0.55) battleT = Math.min(battleT + dt, 8); else if (heat < 0.25) battleT = Math.max(0, battleT - dt * 0.15); 
  const fight = (want === 'battle') ? (heat > 0.25 || battleT > 0.9) : (heat > 0.55 && battleT > 1);
  if (W.red > 0) want = 'red'; else want = fight ? 'battle' : 'valley';
}
A.frame = function (dt, W) {
  if (W) musicFrame(dt, W);
  if (!A.on) return;
  comboT -= dt; if (comboT <= 0) combo = 0;
  shotBudget = Math.min(6, shotBudget + dt * 14);
  if (drone && W && W.player) { const hot = W.t - W.player.lastHurt < 4 ? 1 : 0; drone.fl.frequency.setTargetAtTime(200 + hot * 420, ctx.currentTime, 0.6); }
};
const ROOK_COL = (LL.HEROES.find(function (d) { return d.id === 'rook'; }) || {}).col; // 0.25 rook: his zone's toll carries his colour
/* 0.25 AIR. Short sounds for each hero's air move, in the score's key (edo, A major): the plain jump keeps its puff of air;
   Dora's jump adds a small lantern clink (E5 and A5); Anna's rock-hop is a knock of stone (a low thud on A2 to E2 and a
   dry crack) with a hiss of grit; the Skein Doll's tuck is a yarn whip rising and a plucked C sharp; Myra's hover is a
   flutter (filtered noise beaten at about the wings' rate, held while she hangs) over a soft A and C sharp, and it ends on
   a falling third. Heard for the player's hero; other heroes' second jumps and hovers quietly by distance. */
let hoverSnd = null;
function flutter(dur, g) { // noise through a band-pass, its level beaten by a square LFO near the wings' rate; returns a stop()
  if (!A.on || g <= 0.002) return null;
  const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  s.buffer = nbuf; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1500; fl.Q.value = 0.9;
  lfo.type = 'square'; lfo.frequency.value = 5.2; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.04); a.gain.setValueAtTime(g, t + dur - 0.12); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(am); am.connect(a); a.connect(sfxBus); s.start(t, Math.random()); lfo.start(t); s.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  return function () { const n = ctx.currentTime; try { a.gain.cancelScheduledValues(n); a.gain.setValueAtTime(Math.max(0.0001, a.gain.value), n); a.gain.exponentialRampToValueAtTime(0.0001, n + 0.08); s.stop(n + 0.1); lfo.stop(n + 0.1); } catch (er) {} };
}
function airSound(e, pl, near) {
  const u = e.u; if (!u || !u.def) return; const mine = u === pl, g = mine ? 1 : 0.45 * near(u.x, u.z, 40), id = u.def.id;
  if (e.k === 'jump' && !e.dbl) { if (!mine) return; noise(0.07, 0.05, 1200, 1); if (id === 'dora') { tone(edo(80), 0.12, 'triangle', 0.035); tone(edo(93), 0.09, 'sine', 0.02, 0, 0.03); } return; }
  if (g < 0.02) return;
  if (e.k === 'jump') {
    if (id === 'anna') { noise(0.1, 0.13 * g, 700, 0.9, 'lowpass', 0, 160); tone(edo(0), 0.12, 'sine', 0.12 * g, edo(-13)); noise(0.05, 0.06 * g, 2600, 3, 'bandpass'); noise(0.22, 0.035 * g, 4200, 1, 'highpass', 0.04); }
    else if (id === 'skein') { noise(0.18, 0.07 * g, 1100, 4, 'bandpass', 0, 5200); tone(edo(72), 0.1, 'triangle', 0.06 * g, 0, 0.05); }
    else noise(0.07, 0.05 * g, 2400, 1);
  } else if (e.k === 'hover') {
    if (hoverSnd && mine) { hoverSnd(); hoverSnd = null; }
    const H = u.def.air && u.def.air.hover, stop = flutter((H && H.t || 1.2) + 0.1, 0.07 * g); if (mine) hoverSnd = stop;
    tone(edo(62), 0.35, 'sine', 0.05 * g); tone(edo(72), 0.4, 'sine', 0.035 * g, 0, 0.05);
  } else if (e.k === 'hoverend') {
    if (mine && hoverSnd) { hoverSnd(); hoverSnd = null; }
    if (e.why !== 'land') tone(edo(72), 0.22, 'sine', 0.04 * g, edo(62));
  }
}
/* 0.26 GUARD. Short sounds for the guards and the thread, in the score's key through edo() (rounded to A major unless
   Saelion tuning is on):
   - Anna's aegis: raised, a bronze shing (a ring of inharmonic partials on E, a breath of noise); a block, a clang on A with
     a click, heavier for a melee block.
   - Dora's bubble: opening, a soft rising glass chime (E to A, then C sharp); a soak, a small glassy tink; the pop, a quick
     rising sine and a puff of noise, then a bright A, soft.
   - Skye's fray: a thread whisper sweeping up and a plucked high E; a pass, a dry whisper.
   - A thread boost: the thread plucked and pulled, an A that bends up a fourth with an E above it.
   - Dora's hat: charged, three quiet notes (A, C sharp, E); thrown, a whirr while it flies; a cut, a soft thwick; home, a
     soft catch and a chime. Myra's boon: a warm A major bell chord. Rook's roll: a whoosh across.
   Heard for the player's hero, others' quietly by distance (the pass and the soak only for the player). */
let hatSnd = null;
function whirr(dur, g) { // noise through a band-pass whose level is beaten fast by a square LFO, like a spinning brim; returns a stop()
  if (!A.on || g <= 0.002) return null;
  const t = ctx.currentTime, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  s.buffer = nbuf; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 2200; fl.Q.value = 1.6; lfo.type = 'square'; lfo.frequency.value = 16; lg.gain.value = 0.45; am.gain.value = 0.55; lfo.connect(lg); lg.connect(am.gain);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.05); a.gain.setValueAtTime(g, t + dur - 0.1); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(am); am.connect(a); a.connect(sfxBus); s.start(t, Math.random()); lfo.start(t); s.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  return function () { const n = ctx.currentTime; try { a.gain.cancelScheduledValues(n); a.gain.setValueAtTime(Math.max(0.0001, a.gain.value), n); a.gain.exponentialRampToValueAtTime(0.0001, n + 0.06); s.stop(n + 0.08); lfo.stop(n + 0.08); } catch (er) {} };
}
function guardSound(e, pl, near) {
  const u = e.u; if (!u || !u.def) return; const mine = u === pl, g = mine ? 1 : 0.45 * near(u.x, u.z, 45);
  switch (e.k) {
    case 'guard':
      if (g < 0.02) return;
      if (e.kind === 'aegis') { [1, 2.32, 3.9, 5.1].forEach(function (p, i) { tone(edo(49) * p, 0.5 / (1 + i * 0.6), 'sine', 0.07 * g / (1 + i)); }); noise(0.12, 0.05 * g, 5200, 1.5, 'highpass'); }
      else if (e.kind === 'bubble') { tone(edo(49), 0.3, 'sine', 0.06 * g, edo(62)); tone(edo(72), 0.55, 'sine', 0.045 * g, 0, 0.08); tone(edo(93), 0.4, 'triangle', 0.02 * g, 0, 0.12); }
      else if (e.kind === 'fray') { noise(0.32, 0.06 * g, 1200, 3, 'bandpass', 0, 6400); tone(edo(80), 0.18, 'triangle', 0.05 * g, 0, 0.06); }
      break;
    case 'guarded':
      if (e.how === 'block') { if (g < 0.02) return; bell(31, (e.melee ? 0.12 : 0.1) * g, e.melee ? 0.9 : 0.6); noise(0.05, (e.melee ? 0.13 : 0.09) * g, 3200, 2); if (e.melee) noise(0.14, 0.09 * g, 400, 1, 'lowpass'); }
      else if (!mine) return;
      else if (e.how === 'absorb') { tone(edo(103), 0.12, 'sine', 0.05); tone(edo(111), 0.08, 'sine', 0.025, 0, 0.02); }
      else noise(0.09, 0.08, 3800, 2.5, 'bandpass', 0, 1600);
      break;
    case 'guardend': if (e.kind === 'bubble' && g >= 0.02) { tone(edo(62), 0.07, 'sine', 0.07 * g, edo(93)); noise(0.08, 0.06 * g, 2600, 1.2); tone(edo(93), 0.4, 'sine', 0.04 * g, 0, 0.05); } break;
    case 'tboost': if (g >= 0.02) { tone(edo(31), 0.3, 'triangle', 0.08 * g, edo(44)); tone(edo(49), 0.4, 'sine', 0.05 * g, 0, 0.05); noise(0.2, 0.03 * g, 2400, 2, 'bandpass', 0, 4800); } break;
    case 'hatready': if (mine) [31, 41, 49].forEach(function (n, i) { tone(edo(n + 31), 0.3, 'sine', 0.05, 0, i * 0.08); }); break;
    case 'hatthrow': if (hatSnd && mine) { hatSnd(); hatSnd = null; } { const s = whirr(1.8, 0.05 * g); if (mine) hatSnd = s; } noise(0.1, 0.06 * g, 1800, 1, 'bandpass', 0, 3600); break;
    case 'hatcut': { const gc = mine ? 0.8 : 0.4 * near(e.x, e.z, 45); noise(0.06, 0.2 * gc, 2600, 2); tone(edo(62), 0.06, 'triangle', 0.05 * gc, edo(49)); break; }
    case 'hatback': if (mine && hatSnd) { hatSnd(); hatSnd = null; } if (g >= 0.02) { noise(0.06, 0.06 * g, 700, 1, 'lowpass'); tone(edo(80), 0.25, 'sine', 0.04 * g, 0, 0.03); } break;
    case 'boon': { const gb = mine ? 1 : 0.5 * near(e.x, e.z, 50); if (gb < 0.02) break; bell(31, 0.05 * gb, 1.6); bell(41, 0.035 * gb, 1.5); bell(49, 0.03 * gb, 1.4); break; }
    case 'roll': if (g >= 0.02) noise(0.4, 0.16 * g, 600, 1.4, 'bandpass', 0, 2600); break;
  }
}
A.fx = function (e, W, cam) {
  if (!A.on) return;
  const pl = W.player;
  const near = (x, z, R) => { const d = Math.hypot(x - cam.x, z - cam.z); return Math.max(0, 1 - d / (R || 70)); };
  switch (e.k) {
    case 'shot': {
      const mine = e.u === pl; let g = mine ? 0.16 : 0.07 * near(e.x, e.z, 60);
      if (!mine) { if (shotBudget < 1) return; shotBudget--; }
      const id = e.u.def.id;
      if (id === 'anna') { noise(0.16, g * 1.5, 900, 0.8, 'lowpass', 0, 200); tone(edo(18), 0.14, 'square', g * 0.7, edo(0)); }
      else if (id === 'myra') { noise(0.2, g * 1.6, 1400, 0.6, 'lowpass', 0, 300); tone(edo(31 + 9), 0.3, 'sine', g * 0.6); }
      else if (id === 'skein') { noise(0.04, g, 4200, 3); tone(edo(93), 0.04, 'triangle', g * 0.5, edo(80)); }
      else if (id === 'rook') { noise(0.05, g * 1.1, 3200, 2); tone(edo(75), 0.07, 'triangle', g * 0.7, edo(88)); tone(edo(106), 0.05, 'sine', g * 0.3, 0, 0.03); } // 0.25 rook: a wick struck, a spark that climbs
      else { noise(0.06, g, 2400, 1.5); tone(edo(62), 0.08, 'triangle', g * 0.8, edo(49)); }
      break;
    }
    case 'hit':
      if (e.p === 1 && e.kind !== 'dot') { const now = ctx.currentTime; if (now - lastT > 0.035) { lastT = now; tone(edo(e.crit ? 111 : 98), 0.05, 'square', e.crit ? 0.07 : 0.045); } }
      else if (e.p === 2) noise(0.12, Math.min(0.3, 0.08 + e.amt / 400), 300, 1, 'lowpass');
      break;
    case 'soul':
      if (!e.p && !e.vsPlayer) break;
      if (e.kind === 'secured' && e.p) { combo = Math.min(LADDER.length - 1, combo + 1); comboT = 4; tone(edo(LADDER[combo]), 0.22, 'sine', 0.16); tone(edo(LADDER[combo] + 18), 0.3, 'sine', 0.08, 0, 0.04); }
      else if (e.kind === 'denied') { if (e.p) { tone(edo(72), 0.1, 'square', 0.08); tone(edo(59), 0.16, 'square', 0.08, 0, 0.07); } else { tone(edo(40), 0.18, 'sawtooth', 0.05, edo(31)); } }
      break;
    case 'death':
      if (e.kind === 'trooper') { noise(0.14, 0.09 * near(e.x, e.z, 50), 1800, 2, 'bandpass', 0, 500); if (e.by && e.by === pl) { noise(0.07, 0.07, 4200, 2.5, 'bandpass', 0, 1500); tone(edo(e.team === 1 ? 72 : 80), 0.07, 'triangle', 0.05); } } // 0.23: your kill tears paper
      else if (e.kind === 'stray') { noise(0.4, 0.2 * near(e.x, e.z), 500, 1, 'lowpass'); }
      break;
    case 'herokill': {
      if (e.victim === pl) { [62, 54, 49, 41, 31].forEach((n, i) => tone(edo(n), 0.35, 'triangle', 0.13, 0, i * 0.11)); }
      else if (e.killer === pl) { [31, 41, 49, 59, 72].forEach((n, i) => tone(edo(n), 0.3, 'triangle', 0.14, 0, i * 0.07)); bell(62, 0.1, 1.2); }
      else bell(e.victim.team === 0 ? 22 : 40, 0.07, 1);
      break;
    }
    case 'structdown': if (near(e.u.x, e.u.z, 60) > 0.3) heat = Math.max(heat, 0.8); noise(1.4, 0.4, 700, 0.6, 'lowpass', 0, 60); bell(e.u.team === 0 ? 9 : 18, 0.22, 3); bell(e.u.team === 0 ? 0 : 31, 0.16, 3.5); break;
    case 'explode': noise(0.35, 0.3 * near(e.x, e.z, 60), 900, 0.7, 'lowpass', 0, 120); break;
    case 'nova': noise(0.3, 0.25 * near(e.x, e.z, 60), 1500, 1, 'bandpass', 0, 300); tone(edo(31), 0.3, 'sine', 0.12 * near(e.x, e.z, 60), edo(13)); break;
    /* 0.25 rook: Lantern Lift (the wick catches and climbs; a held breath of air for the glide; a plucked thread when one catches
       him; boots down) and the Landing Bell (a small hand bell when he rings it; a brighter bell over the toll when it lands). */
    case 'lift': { const g = e.u === pl ? 1 : 0.5 * near(e.x, e.z, 50); if (g <= 0) break; noise(0.5, 0.13 * g, 500, 1.2, 'bandpass', 0, 2800); tone(edo(31), 0.45, 'triangle', 0.1 * g, edo(62)); tone(edo(80), 0.3, 'sine', 0.05 * g, 0, 0.3); break; }
    case 'glide': { const g = e.u === pl ? 1 : 0.4 * near(e.x, e.z, 50); if (g <= 0) break; noise(1.0, 0.055 * g, 1900, 0.7, 'bandpass', 0, 800); tone(edo(62), 0.7, 'sine', 0.045 * g, edo(57)); break; }
    case 'liftthread': if (e.u === pl) { tone(edo(49), 0.18, 'triangle', 0.12); tone(edo(67), 0.32, 'sine', 0.1, 0, 0.06); tone(edo(80), 0.4, 'sine', 0.06, 0, 0.12); } break;
    case 'liftland': if (e.u === pl) { noise(0.1, 0.1, 380, 1, 'lowpass'); tone(edo(62), 0.06, 'triangle', 0.04); } break;
    case 'toll': if (e.col === ROOK_COL) { bell(49, 0.2 * near(e.x, e.z, 90), 1.8); bell(80, 0.1 * near(e.x, e.z, 90), 1.2); }
      bell(0, 0.4 * near(e.x, e.z, 90), 3.5); noise(0.7, 0.3 * near(e.x, e.z, 90), 500, 0.6, 'lowpass', 0, 80); break;
    case 'cast': if (e.u === pl && e.i === 2 && e.u.def.id === 'rook') { bell(80, 0.055, 0.7); bell(93, 0.035, 0.6); tone(edo(111), 0.25, 'sine', 0.04, 0, 0.18); break; } // 0.25 rook: the hand bell, rung
      if (e.u === pl) { noise(0.25, 0.12, 600, 1.2, 'bandpass', 0, 3200); tone(edo(e.i === 2 ? 49 : 62 + e.i * 5), 0.25, 'triangle', 0.1, edo(e.i === 2 ? 80 : 72)); } break;
    case 'blink': noise(0.2, 0.15 * near(e.x, e.z, 50), 3000, 3, 'bandpass', 0, 400); break;
    case 'zip': if (e.u === pl) tone(edo(31), 0.5, 'sawtooth', 0.06, edo(62)); break;
    case 'jump': case 'hover': case 'hoverend': airSound(e, pl, near); break; // 0.25 air
    case 'guard': case 'guarded': case 'guardend': case 'tboost': case 'hatready': case 'hatthrow': case 'hatcut': case 'hatback': case 'boon': case 'roll': guardSound(e, pl, near); break; // 0.26 guard
    case 'dash': if (e.u === pl) noise(0.16, 0.1, 1800, 0.8, 'bandpass', 0, 500); break;
    case 'reload': if (e.u === pl) { tone(edo(80), 0.04, 'square', 0.05); tone(edo(85), 0.04, 'square', 0.05, 0, e.u.def.gun.reload - 0.1); } break;
    case 'towershot': if (e.tp) { tone(edo(93), 0.18, 'sawtooth', 0.09, edo(49)); } else noise(0.1, 0.06 * near(e.u.x, e.u.z, 60), 2600, 4); break;
    case 'buy': if (e.u === pl) { tone(edo(62), 0.12, 'sine', 0.14); tone(edo(80), 0.2, 'sine', 0.12, 0, 0.09); } break;
    case 'level': if (e.u === pl) [49, 59, 67, 80].forEach((n, i) => tone(edo(n), 0.2, 'sine', 0.1, 0, i * 0.06)); break;
    case 'respawn': if (e.u === pl) bell(49, 0.12, 1.4); break;
    case 'over': A.cue(e.winner === 0 && !e.fallen ? 'win' : 'lose', 'title'); break; // the recorded stinger replaces the old synth arpeggio
    case 'fray': case 'gutter': bell(13, 0.2, 3); break;
    case 'fruit': { const big = !!LL.C.FRUIT_INFO[e.kind].big; if (!e.p && !big) break; const st = big ? [31, 41, 49, 59, 72] : { lemon: [62, 72, 80], hips: [49, 59, 67], lime: [54, 64, 72] }[e.kind]; st.forEach((n, i) => tone(edo(n), 0.22, 'triangle', 0.16, 0, i * 0.07)); if (big) bell(31, 0.2, 2.4); } break;
    case 'fruitripe': if (e.lens) bell(49, 0.1, 1.8); break;
    case 'moodsolved': [31, 41, 49, 56, 62].forEach((n, i) => tone(edo(n), 0.9, 'sine', 0.13, 0, i * 0.05)); bell(62, 0.14, 2.6); break;
    case 'moodmiss': tone(edo(40), 0.18, 'triangle', 0.1, edo(36)); break;
    case 'moodlost': tone(edo(31), 0.5, 'sine', 0.09, edo(18)); break;
    case 'lens': noise(0.18, 0.06, 2600, 1.2, 'bandpass', 0, 900); break;
    case 'theft': if (e.p) { tone(edo(72), 0.16, 'square', 0.18); tone(edo(59), 0.16, 'square', 0.18, 0, 0.13); tone(edo(41), 0.4, 'square', 0.18, 0, 0.26); } break;
    case 'snuff': noise(0.5, 0.25, 400, 0.8, 'lowpass', 0, 60); tone(edo(22), 0.6, 'sine', 0.14, edo(0)); break;
    case 'thiefdown': if (e.p || e.vp) { tone(edo(62), 0.1, 'triangle', 0.12); tone(edo(80), 0.12, 'triangle', 0.12, 0, 0.08); tone(edo(93), 0.2, 'triangle', 0.12, 0, 0.16); } break;
    case 'thiefhome': if (e.vp || e.carry) { tone(edo(31), 0.9, 'sawtooth', 0.16, edo(13)); bell(13, 0.12, 1.6); } break;
    case 'redwarn': bell(31, 0.1, 1.6); bell(18, 0.1, 1.6); break;
    case 'red': bell(-13, 0.26, 4); noise(2.5, 0.12, 2400, 0.5, 'highpass'); break;
    case 'slam': noise(0.3, 0.9 * near(e.x, e.z, 45), 220, 1, 'lowpass'); tone(70, 0.28, 'sine', 0.3 * near(e.x, e.z, 45), 40); break;
    case 'lastbreath': if (e.u === pl) { noise(0.5, 0.2, 500, 1, 'bandpass', 0, 2600); bell(49, 0.12, 1.2); } break;
    case 'relit': bell(62, 0.08, 1.4); break;
    case 'fold': noise(0.9, 0.28, 900, 0.8, 'bandpass', 0, 5200); noise(0.5, 0.2, 3000, 2, 'highpass', 0.35); bell(49, 0.14, 2.2); bell(49 + 18, 0.1, 2); break;
    case 'foldend': if (e.p) noise(0.6, 0.14, 4200, 0.8, 'bandpass', 0, 700); break;
    case 'nessup': tone(62, 1.8, 'sawtooth', 0.16, 30); tone(93, 1.8, 'sawtooth', 0.1, 41); noise(1.4, 0.22, 320, 0.7, 'lowpass', 0, 80); break;
    case 'nessdown': bell(0, 0.24, 3.5); bell(18, 0.2, 3); bell(40, 0.16, 2.6); if (e.team === 0) [31, 41, 49, 59, 72].forEach((n, i) => tone(edo(n), 0.5, 'triangle', 0.12, 0, 0.3 + i * 0.09)); break;
    case 'nesswind': noise(1.1, 0.3 * near(e.x, e.z, 70), 180, 1.2, 'bandpass', 0, 1600); break;
    case 'nessspit': noise(0.25, 0.2 * near(e.x, e.z, 60), 1200, 2, 'bandpass', 0, 300); break;
    /* 0.26 ness: its voice is low and in the score's key (A: edo 0 is A2). The tell is a rising growl with a tick when the
       spot locks; the chomp a snap, a thud and water; let go, a wet gasp. The flood: a horn call on A and E (a fifth, edo 18)
       under a long swell of water for the warning, a rush as the front runs out, a falling wash and a far bell as it drains. */
    case 'nesstell': { const g = e.p ? 1 : near(e.x, e.z, 70); tone(edo(-31), e.t, 'sawtooth', 0.13 * g, edo(-13)); tone(edo(0), e.t, 'triangle', 0.07 * g, edo(13)); noise(e.t, 0.1 * g, 300, 1.4, 'bandpass', 0, 1500); break; }
    case 'nesslock': if (e.p) { tone(edo(93), 0.05, 'square', 0.06); tone(edo(93), 0.05, 'square', 0.06, 0, 0.1); } break;
    case 'nesschomp': { const g = e.p ? 1 : near(e.tx, e.tz, 70); noise(0.09, 0.5 * g, 2600, 1.2, 'bandpass', 0, 500); tone(90, 0.3, 'sine', 0.4 * g, 38); noise(0.6, 0.26 * g, 900, 0.7, 'lowpass', 0.04, 200); if (e.hit && e.u) bell(-13, 0.1 * g, 1.2); else if (!e.hit) tone(edo(31), 0.2, 'triangle', 0.06 * g, edo(18), 0.12); break; }
    case 'nessrelease': { const g = e.p ? 1 : near(e.x, e.z, 60); noise(0.35, 0.2 * g, 700, 1, 'bandpass', 0, 2600); tone(edo(18), 0.3, 'triangle', 0.07 * g, edo(49)); break; }
    case 'floodwarn': tone(edo(0), 2.6, 'sawtooth', 0.09, edo(0) * 0.985); tone(edo(18), 2.2, 'sawtooth', 0.06, edo(18) * 0.985, 0.5); tone(edo(-31), 3.2, 'sine', 0.2, edo(-31) * 0.97); noise(e.t, 0.16, 140, 0.8, 'lowpass', 0, 700); bell(0, 0.08, 3); break;
    case 'flood': noise(3.2, 0.3, 500, 0.6, 'lowpass', 0, 1600); noise(2.4, 0.12, 2400, 0.8, 'bandpass', 0.3, 900); tone(60, 2.4, 'sine', 0.2, 34); break;
    case 'flooddrain': noise(3.2, 0.2, 1500, 0.7, 'lowpass', 0, 160); tone(edo(18), 1.6, 'sine', 0.06, edo(0)); bell(31, 0.06, 2.5); break;
    case 'nessdive': case 'nesshome': noise(0.7, 0.24 * near(e.x, e.z, 70), 600, 0.8, 'lowpass', 0, 150); break;
    case 'fishing': if (e.team === 1) { tone(edo(40), 0.3, 'square', 0.07); tone(edo(36), 0.4, 'square', 0.07, 0, 0.25); } break;
    case 'greatend': if (e.team === 0) tone(edo(62), 0.5, 'sine', 0.1, edo(31)); break;
  }
};
})();
