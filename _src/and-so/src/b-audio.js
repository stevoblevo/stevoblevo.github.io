// ===== audio: every tone is two banks of sine partials, so any spectrum works =====
const A = { ac: null, useCS: false, tones: new Map(), root: null, noise: null };
const OUT = f => f * REF;
// AND SO 7: voices are notes, not drones. In pluck articulation a tone is silent until something strikes it, and the root
// is carried by the bass instead of a held tone. 'drone' brings back the held sines of every version before 7.
const plucky = () => SET.artic === 'pluck' && !M.struck;
const rootLevel = () => (plucky() ? 0 : 0.11);
const aNow = () => (A.ac ? A.ac.currentTime : 0);
function impulse(sec, dec) {
  const ac = A.ac, len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, dec); }
  return b;
}
function glide(p, v, tc) { const now = A.ac.currentTime; if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); } p.setTargetAtTime(v, now, tc); }
function route(tn, pan) {
  if (Math.abs(pan - tn.pan) < 0.01 && tn.hp === SET.hp) return;
  tn.pan = pan; tn.hp = SET.hp;
  const th = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4, pl = Math.cos(th) * Math.SQRT2, pr = Math.sin(th) * Math.SQRT2, now = A.ac.currentTime;
  const g = SET.hp ? [pl, 0, 0, pr] : [pl * 0.5, pr * 0.5, pl * 0.5, pr * 0.5];
  [tn.LL, tn.LR, tn.RL, tn.RR].forEach((n, i) => n.gain.setTargetAtTime(g[i], now, 0.08));
}
function setBeta(tn, b) {
  if (Math.abs(b - tn.beta) < 1e-3) return;
  tn.beta = b; const now = A.ac.currentTime;
  if (A.useCS) tn.bP.offset.setTargetAtTime(b / 2, now, 0.25);
  else tn.oscs.forEach(x => x.o.frequency.setTargetAtTime(OUT(tn.f) * tn.R[x.k] + (x.sg * tn.R[x.k] * b) / 2, now, 0.05));
}
function setF(tn, f, tc) {
  if (Math.abs(f - tn.f) < tn.f * 1e-6 && tn.ref === REF) return;
  tn.f = f; tn.ref = REF; const now = A.ac.currentTime;
  if (A.useCS) tn.fS.offset.setTargetAtTime(OUT(f), now, tc);
  else tn.oscs.forEach(x => x.o.frequency.setTargetAtTime(OUT(f) * tn.R[x.k] + (x.sg * tn.R[x.k] * tn.beta) / 2, now, tc));
}
function makeTone(f, level, pan, isRoot) {
  const ac = A.ac, now = ac.currentTime, out = ac.createGain();
  out.gain.setValueAtTime(0, now);
  if (level > 0) out.gain.linearRampToValueAtTime(level, now + 0.5);
  const base = M.struck ? (isRoot ? 0.25 : 0.16) : plucky() ? 0 : 1, env = ac.createGain(); env.gain.value = base;
  const mg = ac.createChannelMerger(2), sL = ac.createGain(), sR = ac.createGain();
  const LL = ac.createGain(), LR = ac.createGain(), RL = ac.createGain(), RR = ac.createGain();
  sL.connect(LL); sL.connect(LR); sR.connect(RL); sR.connect(RR);
  LL.connect(mg, 0, 0); LR.connect(mg, 0, 1); RL.connect(mg, 0, 0); RR.connect(mg, 0, 1);
  mg.connect(env); env.connect(out); out.connect(A.bus);
  const tn = { out, env, LL, LR, RL, RR, oscs: [], srcs: [], R: PR.slice(), f, ref: REF, beta: 0, pan: 99, hp: null, level, isRoot, base, fS: null, bP: null };
  if (A.useCS) { tn.fS = ac.createConstantSource(); tn.fS.offset.value = OUT(f); tn.bP = ac.createConstantSource(); tn.bP.offset.value = 0; tn.fS.start(now); tn.bP.start(now); tn.srcs.push(tn.fS, tn.bP); }
  for (let k = 0; k < PK; k++) {
    let gf = null;
    if (A.useCS) { gf = ac.createGain(); gf.gain.value = PR[k]; tn.fS.connect(gf); }
    for (let side = 0; side < 2; side++) {
      const sg = side ? 1 : -1, o = ac.createOscillator(); o.type = 'sine';
      if (A.useCS) { o.frequency.value = 0; gf.connect(o.frequency); const gb = ac.createGain(); gb.gain.value = sg * PR[k]; tn.bP.connect(gb); gb.connect(o.frequency); }
      else o.frequency.value = OUT(f) * PR[k];
      const ga = ac.createGain(); ga.gain.value = PA[k] * M.norm;
      o.connect(ga); ga.connect(side ? sR : sL);
      o.start(now + Math.random() * 0.003);
      tn.oscs.push({ o, k, sg });
    }
  }
  route(tn, pan); setBeta(tn, betaFor(isRoot));
  return tn;
}
function killTone(tn, tc) {
  if (!tn) return;
  const now = A.ac.currentTime;
  tn.out.gain.cancelScheduledValues(now); tn.out.gain.setTargetAtTime(0, now, tc || 0.12);
  tn.oscs.forEach(x => x.o.stop(now + 0.9)); tn.srcs.forEach(s => s.stop(now + 0.9));
  setTimeout(() => { try { tn.out.disconnect(); } catch (e) {} }, 1400);
}
function strikeAt(tn, amt, tau, when) {
  if (!A.ac || !tn) return;
  const t0 = Math.max(when || 0, A.ac.currentTime), g = tn.env.gain;
  g.cancelScheduledValues(t0); g.setValueAtTime(Math.max(g.value, 0.0001), t0);
  g.linearRampToValueAtTime(amt, t0 + 0.006); g.setTargetAtTime(tn.base, t0 + 0.006, tau);
}
function envG(g, t0, peakV, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peakV + 0.0002, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
function bell3(f, gain, delay, dest) {
  if (!A.ac || muted) return;
  const ac = A.ac, t0 = ac.currentTime + (delay || 0);
  [[1, 1, 2.6], [PR[1], 0.14, 1.2], [PR[2], 0.06, 0.7]].forEach(([m, a, d]) => {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = OUT(f) * m;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain * a, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(dest || A.chimeBus); o.start(t0); o.stop(t0 + d + 0.05);
  });
}

const audio = {
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || A.ac) return;
    try {
      const ac = (A.ac = new AC({ latencyHint: 'interactive' }));
      A.useCS = typeof ac.createConstantSource === 'function';
      A.vol = ac.createGain(); A.vol.gain.value = 0; A.vol.connect(ac.destination);
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -14; lim.knee.value = 8; lim.ratio.value = 12; lim.attack.value = 0.005; lim.release.value = 0.3; lim.connect(A.vol);
      A.lp = ac.createBiquadFilter(); A.lp.type = 'lowpass'; A.lp.Q.value = 0.5; A.lp.frequency.value = 5000; A.lp.connect(lim);
      A.bus = ac.createGain(); A.bus.gain.value = 0.85; A.bus.connect(A.lp);
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.09; const lg = ac.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(A.bus.gain); lfo.start();
      A.conv = ac.createConvolver(); A.conv.buffer = impulse(3.4, 2.6);
      A.rw = ac.createGain(); A.rw.gain.value = 0.32; A.bus.connect(A.conv); A.conv.connect(A.rw); A.rw.connect(A.lp);
      const sp = ac.createChannelSplitter(2), mg = ac.createChannelMerger(2), dL = ac.createDelay(0.05), dR = ac.createDelay(0.05);
      dL.delayTime.value = 0.014; dR.delayTime.value = 0.019;
      [[dL, 0.13], [dR, 0.171]].forEach(([d, fq]) => { const o = ac.createOscillator(); o.frequency.value = fq; const g = ac.createGain(); g.gain.value = 0.0018; o.connect(g); g.connect(d.delayTime); o.start(); });
      A.bus.connect(sp); sp.connect(dL, 0); sp.connect(dR, 1); dL.connect(mg, 0, 0); dR.connect(mg, 0, 1);
      A.chWet = ac.createGain(); A.chWet.gain.value = 0; mg.connect(A.chWet); A.chWet.connect(A.lp);
      A.chimeBus = ac.createGain(); A.chimeBus.connect(A.bus);
      const ppIn = ac.createGain(); A.chimeBus.connect(ppIn);
      const pL = ac.createDelay(1), pR = ac.createDelay(1); pL.delayTime.value = 0.31; pR.delayTime.value = 0.31;
      const fL = ac.createBiquadFilter(), fR = ac.createBiquadFilter(); fL.type = fR.type = 'lowpass'; fL.frequency.value = fR.frequency.value = 3200;
      const kL = ac.createGain(), kR = ac.createGain(); kL.gain.value = kR.gain.value = 0.36;
      const pm = ac.createChannelMerger(2);
      ppIn.connect(pL); pL.connect(fL); fL.connect(pm, 0, 0); fL.connect(kL); kL.connect(pR); pR.connect(fR); fR.connect(pm, 0, 1); fR.connect(kR); kR.connect(pL);
      A.ppWet = ac.createGain(); A.ppWet.gain.value = 0; pm.connect(A.ppWet); A.ppWet.connect(A.bus);
      A.drumBus = ac.createGain(); A.drumBus.gain.value = 0.9; A.drumBus.connect(A.lp);
      const ds = ac.createGain(); ds.gain.value = 0.08; A.drumBus.connect(ds); ds.connect(A.conv);
      A.noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      { const d = A.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 0.9;
      A.presG = ac.createGain(); A.presG.gain.value = 0; A.bus.connect(bp); bp.connect(A.presG); A.presG.connect(A.lp);
      A.bellBus = ac.createGain(); { const lpB = ac.createBiquadFilter(), dry = ac.createGain(); lpB.type = 'lowpass'; lpB.frequency.value = 2600; dry.gain.value = 0.35; A.bellBus.connect(lpB); lpB.connect(dry); dry.connect(A.lp); lpB.connect(A.conv); }
      A.analyser = ac.createAnalyser(); A.analyser.fftSize = 2048; A.vol.connect(A.analyser);
      const now = ac.currentTime;
      A.vol.gain.setValueAtTime(0, now); A.vol.gain.linearRampToValueAtTime(muted ? 0 : 0.95 * SET.vol, now + 1.6);
      A.root = makeTone(fRoot, rootLevel(), 0, true);
      capture.setup();
      audio.applyMix();
      if (ac.state === 'suspended') ac.resume();
      document.addEventListener('visibilitychange', () => { if (!A.ac || paused) return; if (document.hidden) A.ac.suspend(); else A.ac.resume(); });
    } catch (e) { A.ac = null; }
  },
  applyMix() {
    if (!A.ac) return;
    const now = A.ac.currentTime;
    glide(A.vol.gain, muted ? 0 : 0.95 * SET.vol, 0.15);
    A.lp.frequency.setTargetAtTime(9000 * Math.pow(1800 / 9000, SET.warm), now, 0.2);
    A.chWet.gain.setTargetAtTime((SET.hp ? 0.5 : 0.12) * SET.space, now, 0.3);
    A.ppWet.gain.setTargetAtTime(SET.sparkle ? (SET.hp ? 0.42 : 0.24) : 0, now, 0.2);
    const all = A.root ? [A.root, ...A.tones.values()] : [...A.tones.values()];
    for (const tn of all) { route(tn, tn.pan === 99 ? 0 : tn.pan); setBeta(tn, betaFor(tn.isRoot)); }
  },
  addVoice(v) { if (A.ac) A.tones.set(v.id, makeTone(fOf(v.x), 0, panOf(v.x), false)); },
  updateVoice(v) {
    if (!A.ac) return; const tn = A.tones.get(v.id); if (!tn) return;
    setF(tn, fOf(v.x), 0.012);
    const lv = 0.085 * v.w;
    if (Math.abs(lv - tn.level) > 0.0015) { tn.level = lv; tn.out.gain.setTargetAtTime(lv, A.ac.currentTime, 0.05); }
    route(tn, panOf(v.x));
  },
  removeVoice(v) { if (!A.ac) return; const tn = A.tones.get(v.id); if (!tn) return; A.tones.delete(v.id); killTone(tn); },
  setRoot(f) {
    if (!A.ac || !A.root) return;
    const tn = A.root, now = A.ac.currentTime, g = tn.out.gain;
    g.cancelScheduledValues(now); g.setTargetAtTime(0, now, 0.02);
    if (A.useCS) { tn.fS.offset.cancelScheduledValues(now + 0.07); tn.fS.offset.setValueAtTime(OUT(f), now + 0.07); }
    else tn.oscs.forEach(x => { x.o.frequency.cancelScheduledValues(now + 0.07); x.o.frequency.setValueAtTime(OUT(f) * tn.R[x.k] + (x.sg * tn.R[x.k] * tn.beta) / 2, now + 0.07); });
    tn.f = f; tn.ref = REF;
    g.setTargetAtTime(rootLevel(), now + 0.08, 0.04);
    padSync();
  },
  rebuild() {
    if (!A.ac) return;
    killTone(A.root); A.root = makeTone(fRoot, rootLevel(), 0, true);
    for (const tn of A.tones.values()) killTone(tn);
    A.tones.clear();
    for (const v of voices) if (v.wT > 0) A.tones.set(v.id, makeTone(fOf(v.x), 0, panOf(v.x), false));
    padSync();
  },
  strikeVoice(v, amt, tau, when) { strikeAt(A.tones.get(v.id), amt, tau, when); },
  // a plucked note on a voice: louder than the held level, then it rings out to silence (or to the drone floor)
  pluck(v, amt, tau, when) { if (!A.ac || muted) return; const tn = A.tones.get(v.id); if (!tn) return; strikeAt(tn, amt, tau, when); v.flash = Math.max(v.flash, Math.min(1, amt * 0.6)); v.lastPluck = t; },
  strikeRoot(amt, tau, when) { strikeAt(A.root, amt, tau, when); },
  chime(f, gain, delay) { if (SET.chimes) bell3(f, gain, delay); },
  bloom(fs) { if (SET.chimes) fs.slice().sort((a, b) => a - b).forEach((f, i) => bell3(f * M.chimeR, 0.024, 0.05 + i * 0.085)); },
  flourish() {
    if (!A.ac || muted || !SET.chimes || t < flourishT) return;
    flourishT = t + 2.5;
    const f0 = fold(fRoot * 4, M.eq, 300);
    M.flo.forEach((r, i) => bell3(f0 * r, 0.02, 0.04 + i * 0.075));
  },
  preview(c) {
    if (!A.ac || muted) return;
    const base = 261.63;
    if (c.kind === 'iv') {
      const pq = c.key.split('/').map(Number); let r = pq[0] / pq[1]; if (r === 1) r = c.mode === 'bp' ? 3 : 2;
      bell3(base, 0.035, 0); bell3(base * r, 0.035, 0.32); bell3(base, 0.026, 0.8); bell3(base * r, 0.026, 0.8);
    } else if (c.kind === 'ch') {
      const n = c.key.split(':').map(Number);
      n.forEach((k, i) => bell3((base * k) / n[0], 0.03, i * 0.13));
      n.forEach(k => bell3((base * k) / n[0], 0.02, n.length * 0.13 + 0.35));
    } else (MODES[c.mode] || MODES.just).flo.forEach((r, i) => bell3(base * r, 0.026, i * 0.08));
  },
  // a soft tone in the current spectrum, for tapping the scale or hearing a round's target
  pip(f, gain, delay, len) {
    if (!A.ac || muted) return;
    const ac = A.ac, t0 = ac.currentTime + 0.01 + (delay || 0), out = ac.createGain(), L = len || 1.1;
    out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(gain, t0 + 0.02); out.gain.setTargetAtTime(0.0001, t0 + L * 0.5, L * 0.3);
    out.connect(A.chimeBus);
    for (let k = 0; k < Math.min(PK, 5); k++) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = OUT(f) * PR[k]; g.gain.value = PA[k] * M.norm; o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + L + 0.6); }
  },
  birdAt(f0, f1, gl, len, pan, gain, when) {
    if (!A.ac || muted) return;
    const ac = A.ac, t0 = Math.max(when || 0, ac.currentTime + 0.005), out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(gain, t0 + 0.015); out.gain.setTargetAtTime(gain * 0.55, t0 + 0.05, 0.15); out.gain.setTargetAtTime(0.0001, t0 + len, 0.1);
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -0.8, 0.8); out.connect(p); p.connect(A.chimeBus); } else out.connect(A.chimeBus);
    [[PR[0], 1], [PR[1], 0.2], [PR[2], 0.07]].forEach(([m, a]) => { const o = ac.createOscillator(), ga = ac.createGain(); o.frequency.setValueAtTime(OUT(f0) * m, t0); o.frequency.exponentialRampToValueAtTime(OUT(f1) * m, t0 + gl); ga.gain.value = a; o.connect(ga); ga.connect(out); o.start(t0); o.stop(t0 + len + 0.7); });
  },
  birdNote(f0, f1, gl, len, pan, gain) { audio.birdAt(f0, f1, gl, len, pan, gain, 0); },
  redshift(v) {
    if (!A.ac) return; const tn = A.tones.get(v.id); if (!tn) return; A.tones.delete(v.id);
    const now = A.ac.currentTime;
    if (tn.fS) tn.fS.offset.setTargetAtTime(OUT(tn.f) / 4, now, 0.55); else tn.oscs.forEach(x => x.o.frequency.setTargetAtTime((OUT(tn.f) * tn.R[x.k]) / 4, now, 0.55));
    tn.out.gain.cancelScheduledValues(now); tn.out.gain.setTargetAtTime(0, now + 0.4, 0.45);
    tn.oscs.forEach(x => x.o.stop(now + 2.6)); tn.srcs.forEach(s => s.stop(now + 2.6));
    setTimeout(() => { try { tn.out.disconnect(); } catch (e) {} }, 3000);
  }
};

// ---------- the light: a soft bed of root, fifth and octave under everything ----------
const PAD = { mix: null, out: null, oscs: [], key: '', f: 0, lvl: -1 };
function padRatios() {
  if (M.key === 'bp') return [[1 / 3, 0.22], [1, 0.34], [5 / 3, 0.1], [3, 0.12]];
  if (M.key === 'gamelan' || M.key === 'tet10') return [[0.5, 0.24], [1, 0.34], [2, 0.14]];
  if (M.key === 'tet31') return [[0.5, 0.24], [1, 0.34], [E31(18), 0.2], [2, 0.15], [E31(49), 0.05]];
  return [[0.5, 0.24], [1, 0.34], [1.5, 0.2], [2, 0.15], [3, 0.05]];
}
function padSync() {
  if (!A.ac) return;
  const ac = A.ac, now = ac.currentTime, lvl = LIGHT() && entered && !era && (!plucky() || SET.bed) ? 0.045 : 0;
  if (!PAD.out) {
    PAD.mix = ac.createGain(); PAD.mix.gain.value = 0.75;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(PAD.mix.gain); lfo.start();
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = 0.3;
    PAD.out = ac.createGain(); PAD.out.gain.value = 0;
    PAD.mix.connect(lp); lp.connect(PAD.out); PAD.out.connect(A.bus);
    const send = ac.createGain(); send.gain.value = 0.7; PAD.out.connect(send); send.connect(A.conv);
  }
  const key = M.key + (M.easy ? 'e' : '');
  if (key !== PAD.key && PAD.oscs.length) { PAD.oscs.forEach(x => { x.g.gain.setTargetAtTime(0, now, 0.3); x.o.stop(now + 2); }); PAD.oscs = []; }
  if (!PAD.oscs.length) {
    PAD.key = key; PAD.f = fRoot;
    padRatios().forEach(([r, a]) => [-1, 1].forEach(sg => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = OUT(fRoot) * r + sg * 0.12; g.gain.value = 0; g.gain.setTargetAtTime(a * 0.5, now, 0.8);
      o.connect(g); g.connect(PAD.mix); o.start(now); PAD.oscs.push({ o, g, r, sg });
    }));
  } else if (Math.abs(PAD.f - fRoot) > 1e-6 || PAD.ref !== REF) {
    PAD.f = fRoot; PAD.oscs.forEach(x => x.o.frequency.setTargetAtTime(OUT(fRoot) * x.r + x.sg * 0.12, now, 0.09));
  }
  PAD.ref = REF;
  if (Math.abs(lvl - PAD.lvl) > 1e-4) { PAD.lvl = lvl; PAD.out.gain.setTargetAtTime(lvl, now, lvl ? 1.2 : 0.5); }
}

// ---------- drums, bass, keys ----------
function kick(t0, v) { if (!A.drumBus || muted || v <= 0) return; const ac = A.ac, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(115, t0); o.frequency.exponentialRampToValueAtTime(44, t0 + 0.13); envG(g, t0, 0.42 * v, 0.38); o.connect(g); g.connect(A.drumBus); o.start(t0); o.stop(t0 + 0.42); }
function nz(t0, dur, type, f, q, gain) { if (!A.drumBus) return; const ac = A.ac, s = ac.createBufferSource(); s.buffer = A.noise; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); envG(g, t0, gain, dur); s.connect(fl); fl.connect(g); g.connect(A.drumBus); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.02); }
function snare(t0, v) { if (!muted && v > 0) nz(t0, 0.17, 'bandpass', 1900, 0.9, 0.15 * v); }
function hat(t0, v, open) { if (!muted && v > 0) nz(t0, open ? 0.24 : 0.045, 'highpass', 7200, 0.7, (open ? 0.05 : 0.034) * v); }
function bassAt(t0, f, v, dur) { if (!A.drumBus || muted || v <= 0) return; const ac = A.ac, o = ac.createOscillator(), g = ac.createGain(), lpb = ac.createBiquadFilter(); lpb.type = 'lowpass'; lpb.frequency.value = 480; o.type = 'triangle'; o.frequency.value = OUT(f); envG(g, t0, 0.2 * v, Math.max(0.16, dur)); o.connect(lpb); lpb.connect(g); g.connect(A.drumBus); o.start(t0); o.stop(t0 + Math.max(0.16, dur) + 0.1); }
function keysAt(t0, f, v) { if (!A.ac || muted || v <= 0) return; const ac = A.ac, g = ac.createGain(); envG(g, t0, 0.04 * v, 0.7); g.connect(A.chimeBus); [[1, 1], [PR[1], 0.18]].forEach(([m, a]) => { const o = ac.createOscillator(), ga = ac.createGain(); o.frequency.value = OUT(f) * m; ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(t0); o.stop(t0 + 0.75); }); }

// ---------- sound layers: bells, wind, rain, a train ----------
const BELLP = [[0.5, 0.45, 8], [1, 1, 6], [1.2, 0.5, 4.5], [1.5, 0.32, 3.6], [2, 0.55, 3], [2.5, 0.22, 2.2], [3, 0.16, 1.7], [4.2, 0.1, 1.2]];
function bellAt(t0, f, g, pan) {
  if (!A.bellBus || muted) return;
  const ac = A.ac, out = ac.createGain(); out.gain.value = g;
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(A.bellBus); } else out.connect(A.bellBus);
  BELLP.forEach(([m, a, d]) => { const o = ac.createOscillator(), ga = ac.createGain(); o.frequency.value = OUT(f) * m; ga.gain.setValueAtTime(0.0001, t0); ga.gain.exponentialRampToValueAtTime(a, t0 + 0.004); ga.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(ga); ga.connect(out); o.start(t0); o.stop(t0 + d + 0.05); });
}
function bellScale() {
  if (M.key === 'gamelan') return [2, E5(4), E5(3), E5(2), E5(1), 1];
  if (M.key === 'bp') return [3, 7 / 3, 9 / 5, 5 / 3, 7 / 5, 1];
  if (M.key === 'tet10') return [2, E10(8), E10(6), E10(5), E10(3), 1];
  if (M.key === 'tet31') return [2, E31(23), E31(18), E31(13), E31(10), 1];
  if (M.easy) return [2, Math.pow(2, 9 / 12), Math.pow(2, 7 / 12), Math.pow(2, 5 / 12), Math.pow(2, 4 / 12), 1];
  return [2, 5 / 3, 3 / 2, 4 / 3, 5 / 4, 1];
}
function peal() {
  if (!A.ac) return;
  const sc = bellScale(), base = fold(fRoot * 2, 2, 180), row = [0, 1, 2, 3, 4, 5], rows = [row.slice()];
  for (let k = 0; k < 4; k++) { for (let i = k % 2; i + 1 < 6; i += 2) { const x = row[i]; row[i] = row[i + 1]; row[i + 1] = x; } rows.push(row.slice()); }
  rows.push([0, 1, 2, 3, 4, 5]);
  let t0 = aNow() + 0.1;
  rows.forEach((r, ri) => { r.forEach(b => { bellAt(t0, base * sc[b], 0.016 * (0.85 + 0.3 * Math.random()), -0.6 + b * 0.24); t0 += 0.3; }); if (ri % 2) t0 += 0.3; });
  jlog('bells, somewhere'); discover('x-bells');
}
function gust() {
  if (!A.ac || muted) return;
  const ac = A.ac, sc = bellScale(), n = 3 + ((Math.random() * 5) | 0);
  let t0 = aNow() + 0.05;
  for (let i = 0; i < n; i++) {
    const f = OUT(fold(fRoot * 8 * sc[(Math.random() * sc.length) | 0], M.eq, 900)), out = ac.createGain(); out.gain.value = 0.012 + 0.01 * Math.random(); out.connect(A.chimeBus);
    [[1, 1, 3.5], [2.76, 0.35, 1.6], [5.4, 0.12, 0.8]].forEach(([m, a, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * m; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(a, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + d + 0.05); });
    t0 += rand(0.12, 0.6);
  }
}
let rainSrc = null, rainG = null;
function rainOn(on) {
  if (!A.ac) return;
  const ac = A.ac, now = ac.currentTime;
  if (on && !rainSrc) { rainSrc = ac.createBufferSource(); rainSrc.buffer = A.noise; rainSrc.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.4; rainG = ac.createGain(); rainG.gain.value = 0; rainSrc.connect(bp); bp.connect(rainG); rainG.connect(A.lp); rainSrc.start(); rainG.gain.setTargetAtTime(0.022, now, 1.2); }
  else if (!on && rainSrc) { rainG.gain.setTargetAtTime(0, now, 0.6); rainSrc.stop(now + 3); rainSrc = null; }
}
function trainPass() {
  if (!A.ac || muted) return;
  const ac = A.ac, t0 = ac.currentTime + 0.1, base = OUT(fold(fRoot * 2, 2, 190)), out = ac.createGain(), lpT = ac.createBiquadFilter();
  lpT.type = 'lowpass'; lpT.frequency.value = 1400; out.connect(lpT);
  let dst = A.lp;
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.setValueAtTime(-0.85, t0); p.pan.linearRampToValueAtTime(0.85, t0 + 11); lpT.connect(p); p.connect(A.lp); p.connect(A.conv); dst = p; } else lpT.connect(A.lp);
  out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(0.05, t0 + 5.5); out.gain.exponentialRampToValueAtTime(0.0001, t0 + 11.5);
  const blasts = [[0, 1.6], [2.0, 1.6], [4.0, 0.6], [5.0, 2.2]];
  [4, 5, 6, 7].forEach(hh => {
    const o = ac.createOscillator(), g = ac.createGain(), f = (base * hh) / 4; o.type = 'sawtooth'; g.gain.value = 0;
    blasts.forEach(([s, d]) => { g.gain.setValueAtTime(0, t0 + s); g.gain.linearRampToValueAtTime(0.25, t0 + s + 0.08); g.gain.setValueAtTime(0.25, t0 + s + d - 0.1); g.gain.linearRampToValueAtTime(0, t0 + s + d); });
    o.frequency.setValueAtTime(f * 1.03, t0); o.frequency.setValueAtTime(f * 1.03, t0 + 4.6); o.frequency.exponentialRampToValueAtTime(f * 0.97, t0 + 6.4);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 12);
  });
  { const s = ac.createBufferSource(), l2 = ac.createBiquadFilter(), g2 = ac.createGain(); s.buffer = A.noise; s.loop = true; l2.type = 'lowpass'; l2.frequency.value = 140; g2.gain.setValueAtTime(0.0001, t0); g2.gain.exponentialRampToValueAtTime(0.06, t0 + 6); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 12); s.connect(l2); l2.connect(g2); g2.connect(dst); s.start(t0); s.stop(t0 + 12.2); }
  jlog('a train, long-long-short-long'); discover('x-train');
}

// ---------- capture: the last ten seconds, and recordings ----------
const capture = {
  ringL: null, ringR: null, pos: 0, len: 0, proc: null, rec: null, chunks: [], dest: null,
  setup() {
    if (!A.ac || this.proc) return;
    const ac = A.ac;
    this.len = Math.floor(ac.sampleRate * 12); this.ringL = new Float32Array(this.len); this.ringR = new Float32Array(this.len);
    try { this.proc = ac.createScriptProcessor(4096, 2, 2); } catch (e) { this.proc = null; return; }
    this.proc.onaudioprocess = e => { const a = e.inputBuffer.getChannelData(0), b = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : a, L = this.ringL, R = this.ringR, n = this.len; let p = this.pos; for (let i = 0; i < a.length; i++) { L[p] = a[i]; R[p] = b[i]; p = (p + 1) % n; } this.pos = p; };
    const z = ac.createGain(); z.gain.value = 0; A.vol.connect(this.proc); this.proc.connect(z); z.connect(ac.destination);
  },
  replay() {
    if (!A.ac || !this.ringL) return false;
    const ac = A.ac, sr = ac.sampleRate, n = Math.min(this.len, Math.floor(sr * 10)), L = new Float32Array(n), R = new Float32Array(n);
    let p = (this.pos - n + this.len) % this.len; for (let i = 0; i < n; i++) { L[i] = this.ringL[p]; R[i] = this.ringR[p]; p = (p + 1) % this.len; }
    const buf = ac.createBuffer(2, n, sr); buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
    const rn = Math.floor(sr * 0.7), rb = ac.createBuffer(2, rn, sr);
    for (let c = 0; c < 2; c++) { const src = c ? R : L, d = rb.getChannelData(c); for (let i = 0; i < rn; i++) d[i] = src[Math.max(0, n - 1 - Math.floor((i / rn) * n))] * 0.6; }
    const now = ac.currentTime, g = ac.createGain(); g.gain.value = 0.95 * SET.vol; g.connect(ac.destination);
    const s1 = ac.createBufferSource(); s1.buffer = rb; s1.connect(g); s1.start(now);
    const s2 = ac.createBufferSource(); s2.buffer = buf; s2.connect(g); s2.start(now + 0.72);
    A.vol.gain.setTargetAtTime(0.1 * SET.vol, now, 0.1); setTimeout(() => audio.applyMix(), (0.75 + n / sr) * 1000);
    return true;
  },
  recording() { return !!(this.rec && this.rec.state === 'recording'); },
  start(onDone) {
    if (!A.ac || typeof MediaRecorder === 'undefined') return false;
    try {
      this.dest = A.ac.createMediaStreamDestination(); A.vol.connect(this.dest); this.chunks = [];
      const mime = ['audio/webm;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m));
      this.rec = mime ? new MediaRecorder(this.dest.stream, { mimeType: mime }) : new MediaRecorder(this.dest.stream);
      this.rec.ondataavailable = ev => { if (ev.data && ev.data.size) this.chunks.push(ev.data); };
      this.rec.onstop = () => { const b = new Blob(this.chunks, { type: 'audio/webm' }); try { A.vol.disconnect(this.dest); } catch (er) {} onDone(b); };
      this.rec.start(1000);
      return true;
    } catch (er) { return false; }
  },
  stop() { if (this.recording()) this.rec.stop(); }
};
