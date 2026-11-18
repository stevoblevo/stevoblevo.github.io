/* LIVLOCH · audio: small WebAudio synth, pitched in 31 equal steps to the octave.

   DESIGN
   - No samples. Every sound is a few oscillators or filtered noise, so the game stays one small folder.
   - All pitches come from edo(n) = 110 Hz * 2^(n/31). In 31-EDO, 10 steps is a near-just major third, 18 a fifth,
     25 the harmonic seventh; 0-10-18-25 is close to 4:5:6:7. Good news rises through those, bad news falls.
   - Securing soul orbs climbs a ladder of those steps while a combo lasts. That ladder is the seed of "thread tuning".
   - Nobody has listened to this. Levels were set from offline measurement (A.offline, docs/evidence/audio-signal.txt). */
(function () {
'use strict';
const LL = window.LL;
const A = LL.audio = { on: false, vol: 0.6 };
let ctx = null, master = null, nbuf = null, drone = null, combo = 0, comboT = 0, shotBudget = 0, lastT = 0;
const edo = n => 110 * Math.pow(2, n / 31);
const LADDER = [31, 36, 41, 49, 54, 59, 62, 67, 72, 80, 85, 93];

A.init = function () {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(function () {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = A.vol;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.on = true; startDrone();
  } catch (e) { ctx = null; }
};
/* For evidence runs: render one event offline, with no drone, and report its level. It measures; it does not listen. */
A.offline = function (ev, W, cam, secs) {
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) return Promise.resolve(null);
  const keep = { ctx: ctx, master: master, nbuf: nbuf, drone: drone, on: A.on, combo: combo, budget: shotBudget };
  const oc = new OC(1, Math.floor(44100 * (secs || 2)), 44100);
  ctx = oc; master = oc.createGain(); master.gain.value = 1; master.connect(oc.destination); drone = null;
  nbuf = oc.createBuffer(1, 44100, 44100); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.on = true; shotBudget = 6; let threw = null;
  try { A.fx(ev, W, cam); } catch (e) { threw = e.message; }
  ctx = keep.ctx; master = keep.master; nbuf = keep.nbuf; drone = keep.drone; A.on = keep.on; combo = keep.combo; shotBudget = keep.budget;
  return oc.startRendering().then(function (buf) { const x = buf.getChannelData(0); let pk = 0, acc = 0, last = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; acc += a * a; if (a > 0.002) last = i; } return { peak: pk, rms: Math.sqrt(acc / x.length), seconds: last / 44100, threw: threw }; });
};
A.setVol = function (v) { A.vol = v; if (master) master.gain.value = v; };
function tone(f, dur, type, g, slide, delay) {
  if (!A.on || g <= 0.002) return;
  const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), a = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.006); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(a); a.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, g, f, q, type, delay, slide) {
  if (!A.on || g <= 0.002) return;
  const t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), a = ctx.createGain();
  s.buffer = nbuf; s.loop = true; fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
  if (slide) fl.frequency.exponentialRampToValueAtTime(slide, t + dur);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(a); a.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
function bell(n, g, dur) { const f = edo(n); [1, 2.01, 2.76, 5.4, 8.9].forEach(function (p, i) { tone(f * p, dur / (1 + i * 0.5), 'sine', g / (1 + i * 1.3)); }); }
function startDrone() {
  const g = ctx.createGain(); g.gain.value = 0.05; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 220; fl.Q.value = 2;
  [0, 18, 31 + 9].forEach(function (n, i) { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = edo(n - 31) * (1 + i * 0.002); o.connect(fl); o.start(); });
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 70; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
  fl.connect(g); g.connect(master); drone = { g: g, fl: fl };
}
A.ui = function (kind) {
  if (kind === 'ok') { tone(edo(62), 0.09, 'triangle', 0.12); tone(edo(72), 0.12, 'triangle', 0.1, 0, 0.06); }
  else if (kind === 'no') tone(edo(20), 0.14, 'square', 0.06, edo(14));
  else tone(edo(54), 0.05, 'triangle', 0.08);
};
A.frame = function (dt, W) {
  if (!A.on) return;
  comboT -= dt; if (comboT <= 0) combo = 0;
  shotBudget = Math.min(6, shotBudget + dt * 14);
  if (drone && W && W.player) { const hot = W.t - W.player.lastHurt < 4 ? 1 : 0; drone.fl.frequency.setTargetAtTime(200 + hot * 420, ctx.currentTime, 0.6); }
};
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
      if (e.kind === 'trooper') noise(0.14, 0.09 * near(e.x, e.z, 50), 1800, 2, 'bandpass', 0, 500);
      else if (e.kind === 'stray') { noise(0.4, 0.2 * near(e.x, e.z), 500, 1, 'lowpass'); }
      break;
    case 'herokill': {
      if (e.victim === pl) { [62, 54, 49, 41, 31].forEach((n, i) => tone(edo(n), 0.35, 'triangle', 0.13, 0, i * 0.11)); }
      else if (e.killer === pl) { [31, 41, 49, 59, 72].forEach((n, i) => tone(edo(n), 0.3, 'triangle', 0.14, 0, i * 0.07)); bell(62, 0.1, 1.2); }
      else bell(e.victim.team === 0 ? 22 : 40, 0.07, 1);
      break;
    }
    case 'structdown': noise(1.4, 0.4, 700, 0.6, 'lowpass', 0, 60); bell(e.u.team === 0 ? 9 : 18, 0.22, 3); bell(e.u.team === 0 ? 0 : 31, 0.16, 3.5); break;
    case 'explode': noise(0.35, 0.3 * near(e.x, e.z, 60), 900, 0.7, 'lowpass', 0, 120); break;
    case 'nova': noise(0.3, 0.25 * near(e.x, e.z, 60), 1500, 1, 'bandpass', 0, 300); tone(edo(31), 0.3, 'sine', 0.12 * near(e.x, e.z, 60), edo(13)); break;
    case 'toll': bell(0, 0.4 * near(e.x, e.z, 90), 3.5); noise(0.7, 0.3 * near(e.x, e.z, 90), 500, 0.6, 'lowpass', 0, 80); break;
    case 'cast': if (e.u === pl) { noise(0.25, 0.12, 600, 1.2, 'bandpass', 0, 3200); tone(edo(e.i === 2 ? 49 : 62 + e.i * 5), 0.25, 'triangle', 0.1, edo(e.i === 2 ? 80 : 72)); } break;
    case 'blink': noise(0.2, 0.15 * near(e.x, e.z, 50), 3000, 3, 'bandpass', 0, 400); break;
    case 'zip': if (e.u === pl) tone(edo(31), 0.5, 'sawtooth', 0.06, edo(62)); break;
    case 'jump': if (e.u === pl) noise(0.07, 0.05, e.dbl ? 2400 : 1200, 1); break;
    case 'dash': if (e.u === pl) noise(0.16, 0.1, 1800, 0.8, 'bandpass', 0, 500); break;
    case 'reload': if (e.u === pl) { tone(edo(80), 0.04, 'square', 0.05); tone(edo(85), 0.04, 'square', 0.05, 0, e.u.def.gun.reload - 0.1); } break;
    case 'towershot': if (e.tp) { tone(edo(93), 0.18, 'sawtooth', 0.09, edo(49)); } else noise(0.1, 0.06 * near(e.u.x, e.u.z, 60), 2600, 4); break;
    case 'buy': if (e.u === pl) { tone(edo(62), 0.12, 'sine', 0.14); tone(edo(80), 0.2, 'sine', 0.12, 0, 0.09); } break;
    case 'level': if (e.u === pl) [49, 59, 67, 80].forEach((n, i) => tone(edo(n), 0.2, 'sine', 0.1, 0, i * 0.06)); break;
    case 'respawn': if (e.u === pl) bell(49, 0.12, 1.4); break;
    case 'over': if (e.winner === 0) [31, 41, 49, 59, 62, 72, 80, 93].forEach((n, i) => tone(edo(n), 0.9, 'triangle', 0.13, 0, i * 0.12)); else [62, 59, 49, 44, 31, 22, 13, 0].forEach((n, i) => tone(edo(n), 0.9, 'triangle', 0.12, 0, i * 0.16)); break;
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
    case 'fishing': if (e.team === 1) { tone(edo(40), 0.3, 'square', 0.07); tone(edo(36), 0.4, 'square', 0.07, 0, 0.25); } break;
    case 'greatend': if (e.team === 0) tone(edo(62), 0.5, 'sine', 0.1, edo(31)); break;
  }
};
})();
