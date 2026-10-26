// ===== motion: tilt, shake, twist and flick from the phone's own sensors, plus a game controller =====
// tilt rolls the voices like marbles and moves the sky; shake throws every voice somewhere new that still agrees;
// a quick twist of the wrist turns the mandala (and the root); a flick strums. nothing leaves the page.
const MO = {
  on: false, live: false, lastT: -99, hz: 0, nS: 0, rate0: 0,
  sign: 0, vote: 0, votes: 0,
  gx: 0, gy: 1, gz: 0, nx: 0, ny: 1, tx: 0, ty: 0, px: 0, py: 0, fx: 0, busy: 0,
  shakeE: 0, shakeT: -99, twistA: 0, twistT: -99, flickT: -99, levelT: 0, ua: 0,
  ori: null, perm: 'unknown', lastS: 0, uiT: 0, hinted: false, gesture: '', gestureT: -99, recenterT: -99, lean: 0, rolling: false, hops: 0
};
const rt = () => performance.now() / 1000;   // gestures run on the real clock: a slow frame must not stretch a shake
const MO_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
const MO_NEEDS_PERM = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
function moAngle() {
  try {
    const a = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : typeof window.orientation === 'number' ? window.orientation : 0;
    return ((a % 360) + 360) % 360;
  } catch (e) { return 0; }
}
// device axes (x right, y toward the top of the phone) → canvas axes (x right, y down), for whichever way the screen is turned
function moToScreen(x, y) { const th = (moAngle() * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th); return [x * c - y * s, -(x * s + y * c)]; }
function onOrient(e) {
  if (e.beta == null || e.gamma == null) return;
  MO.ori = { b: (e.beta * Math.PI) / 180, g: (e.gamma * Math.PI) / 180, t: performance.now() };
}
function onMotion(e) {
  const g = e.accelerationIncludingGravity; if (!g || g.x == null || g.y == null) return;
  const now = performance.now() / 1000, gap = MO.lastS ? now - MO.lastS : (e.interval || 16) / 1000, dt = clamp(gap, 0.004, 0.1);
  MO.lastS = now; MO.lastT = now; MO.nS++;
  if (!MO.live) { MO.live = true; MO.rate0 = now; motionUI(); }
  const m = Math.hypot(g.x, g.y, g.z || 0); if (m < 1) return;
  // which way do the numbers point? W3C (Android) reports the reaction to gravity, older iOS reports gravity itself.
  // vote with the orientation angles while they are away from gimbal lock, then trust the vote
  if (MO.ori && Math.abs(MO.ori.b) < 1.25 && performance.now() - MO.ori.t < 250 && MO.votes < 60) {
    const cb = Math.cos(MO.ori.b), sb = Math.sin(MO.ori.b), cg = Math.cos(MO.ori.g), sg = Math.sin(MO.ori.g);
    const dn = [cb * sg, -sb, -cb * cg], dot = -(g.x * dn[0] + g.y * dn[1] + (g.z || 0) * dn[2]) / m;
    if (Math.abs(dot) > 0.5) { MO.vote += dot > 0 ? 1 : -1; MO.votes++; if (MO.votes >= 8) MO.sign = MO.vote >= 0 ? -1 : 1; }
  }
  // the hand's own acceleration, for shakes; while it is large the gravity reading is not trusted
  const a = e.acceleration;
  const ua = a && a.x != null ? Math.hypot(a.x, a.y, a.z || 0) : Math.abs(m - 9.81) * 1.4;
  MO.ua = ua;
  if (ua < 3.5) {
    const sg0 = MO.sign || (MO_IOS ? 1 : -1), dx = (sg0 * g.x) / m, dy = (sg0 * g.y) / m, dz = (sg0 * (g.z || 0)) / m;
    const [sx, sy] = moToScreen(dx, dy), k = 1 - Math.exp(-dt / 0.11);
    MO.gx += (sx - MO.gx) * k; MO.gy += (sy - MO.gy) * k; MO.gz += (dz - MO.gz) * k;
  }
  if (!SET.motion || !entered) return;
  MO.shakeE = MO.shakeE * Math.exp(-gap * 3) + Math.max(0, ua - 7) * dt;
  if (MO.shakeE > 2.3 && now - MO.shakeT > 1.6) { MO.shakeE = 0; moShake(); }
  const r = e.rotationRate;
  if (r && r.alpha != null) {
    const rz = r.alpha || 0, rv = moAngle() % 180 === 0 ? r.gamma || 0 : r.beta || 0;
    MO.twistA = MO.twistA * Math.exp(-gap / 0.22) + rz * dt;
    if (Math.abs(MO.twistA) > 32 && Math.abs(rz) > 200 && now - MO.twistT > 0.55 && now - MO.shakeT > 0.8 && ua < 14) { moTwist(rz > 0 ? -1 : 1); MO.twistA = 0; }
    if (Math.abs(rv) > 260 && now - MO.flickT > 0.45 && now - MO.shakeT > 0.8 && now - MO.twistT > 0.35 && ua < 15) moFlick(rv > 0 ? 1 : -1);
  }
}
function moListen() {
  if (moListen.done) return; moListen.done = true;
  try { window.addEventListener('devicemotion', onMotion, { passive: true }); window.addEventListener('deviceorientation', onOrient, { passive: true }); } catch (e) {}
}
async function moAsk() {
  // iOS asks once, from a tap; everywhere else the events simply arrive
  if (!MO_NEEDS_PERM) { moListen(); return 'granted'; }
  try {
    const a = await DeviceMotionEvent.requestPermission();
    try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch (e) {}
    MO.perm = a; if (a === 'granted') moListen();
  } catch (e) { MO.perm = 'denied'; }
  motionUI(); return MO.perm;
}
function moLevel(quiet) { MO.nx = MO.gx; MO.ny = MO.gy; MO.tx = MO.ty = 0; MO.n0 = null; MO.calmT = 0; MO.recenterT = rt(); if (!quiet) { caption('level, right here. tilt from this angle.', 1800); haptic(8); } }
function setMotion(on) {
  SET.motion = !!on; persistSoon();
  if (on) { moAsk().then(() => { if (MO.live) moLevel(true); }); }
  else { MO.fx = 0; MO.busy = 0; }
  motionUI(); syncUI();
}

// ---------- the gestures ----------
function moGesture(name) { MO.gesture = name; MO.gestureT = rt(); lastUserT = t; userIdleUntil = t + 8; }
function moShake() {
  MO.shakeT = rt(); moGesture('shake');
  if (round || era) { haptic(20); return; }
  const live = voices.filter(v => v.wT > 0 && !v.dragging);
  if (LIGHT()) live.forEach((v, i) => setTimeout(() => { if (v.wT > 0 && !v.dragging) lightGlide(v); }, 40 + i * 110));
  else live.forEach(v => tease(v, 1.25));
  if (Math.random() < 0.55) chooseRootStep();
  if (viewOn() === 'cymatics') { cymReset(); CY.gain = clamp(CY.gain * 1.25, 0.25, 2.2); }
  wxBurst(W / 2, (TOPH + LT) / 2, 1.4);
  if (A.ac && !muted) { const t0 = aNow() + 0.01; for (let k = 0; k < 7; k++) nz(t0 + k * 0.055 + Math.random() * 0.02, 0.05, 'bandpass', 5200 + Math.random() * 2600, 1.4, 0.03); }
  for (let i = 0; i < 26; i++) sparks.push({ x: rand(0, W), y: rand(TOPH, LT), vx: rand(-90, 90), vy: rand(-160, -40), life: rand(0.5, 1.2), max: 1.2, c: COLORS[i % 4] });
  rings.push({ r: MR * 0.6, v: 260, life: 1.2, max: 1.2, c: [255, 236, 190] });
  haptic([24, 40, 24]); gpRumble(0.6, 0.6, 260);
  if (!found.has('x-shake')) caption('shaken: everyone jumps and lands somewhere new that still agrees.', 2800);
  discover('x-shake'); jlog('shook the phone');
}
function moTwist(dir) {
  MO.twistT = rt(); moGesture('twist');
  mrotVel = clamp(mrotVel + dir * 3.2, -8, 8);
  if (viewOn() === 'cube' || viewOn() === 'd5') VW.vyaw += dir * 2.4;
  spinStep(dir); discover('x-twist');
  if (!found.has('x-twist')) caption('a twist of the wrist turns the mandala, and the root moves with it.', 2800);
  gpRumble(0.25, 0, 90);
}
function moFlick(dir) {
  MO.flickT = rt(); moGesture('flick');
  strum(); discover('x-flick');
  const P = harpPool(); if (P.length) { const n = Math.min(6, P.length); for (let i = 0; i < n; i++) { const f = P[dir > 0 ? i : P.length - 1 - i]; audio.birdAt(f, f, 0.02, 0.45, (dir > 0 ? -0.5 : 0.5) + (i / n) * dir, 0.018, aNow() + 0.02 + i * 0.045); } }
  haptic(10);
}

// ---------- the tick: tilt becomes a force on the voices and a lean in the sky ----------
function motionTick(dt) {
  const now = rt(), fresh = MO.live && now - MO.lastT < 1.2;
  MO.on = !!SET.motion && fresh && entered;
  if (!MO.on) {
    MO.fx = 0; MO.busy = Math.max(0, MO.busy - dt);
    MO.px *= Math.exp(-dt * 3); MO.py *= Math.exp(-dt * 3);
    if (MO.live && !fresh && SET.motion) MO.hz = 0;
    uiTilt(dt); return;
  }
  MO.hz = MO.nS / Math.max(0.5, now - MO.rate0);
  // the neutral slowly follows however the phone is being held, so a resting hand never keeps the voices rolling.
  // but the neutral a roll started from is remembered: once the phone comes back past halfway to it, the neutral snaps home,
  // so tilting, holding and returning to level never rolls everyone back the other way
  const kn = 1 - Math.exp(-dt / 8);
  MO.nx += (MO.gx - MO.nx) * kn; MO.ny += (MO.gy - MO.ny) * kn;
  if (MO.n0) {
    const back = Math.hypot(MO.gx - MO.n0[0], MO.gy - MO.n0[1]), here = Math.hypot(MO.gx - MO.nx, MO.gy - MO.ny), drift = Math.hypot(MO.nx - MO.n0[0], MO.ny - MO.n0[1]);
    if (drift > 0.02 && back < here) { MO.nx = MO.n0[0]; MO.ny = MO.n0[1]; }
  }
  MO.tx = MO.gx - MO.nx; MO.ty = MO.gy - MO.ny;
  const kp = 1 - Math.exp(-dt * 6);
  MO.px += (clamp(MO.tx * 2.2, -1, 1) - MO.px) * kp; MO.py += (clamp(MO.ty * 2.2, -1, 1) - MO.py) * kp;
  // marbles: past a dead zone the voices lean downhill; past about 12° they hop, one valley at a time, faster the steeper it gets.
  // every hop lands on a valley floor, so the chord changes but always agrees with itself
  const twisting = now - MO.twistT < 0.4 || now - MO.shakeT < 0.6, dzn = 0.1 - 0.04 * SET.tiltK, hopAt = 0.22 - 0.1 * SET.tiltK, ax = MO.tx;
  MO.lean = clamp((Math.abs(ax) - dzn) / Math.max(0.02, hopAt - dzn), 0, 1) * Math.sign(ax);
  MO.fx = Math.abs(ax) > dzn ? ax : 0;
  const rolling = SET.roll && Math.abs(ax) > hopAt && !round && !era && !twisting && !targetMode();
  if (rolling) {
    MO.busy = 0.8;
    const dir = ax > 0 ? 1 : -1, steep = clamp((Math.abs(ax) - hopAt) / 0.35, 0, 1), every = 0.85 - 0.62 * steep;
    if (!MO.rolling) { voices.filter(v => v.wT > 0).sort((a, b) => (b.x - a.x) * dir).forEach((v, i) => (v.hopT = 0.1 + i * 0.13)); MO.rolling = true; if (!MO.n0) MO.n0 = [MO.nx, MO.ny]; }
    for (const v of voices) {
      if (v.wT === 0 || v.dragging || v.echo != null || v.glide) continue;
      v.hopT = (v.hopT || 0) - dt; if (v.hopT > 0) continue;
      v.hopT = every * (0.85 + 0.3 * Math.random());
      if (!v.locked && Math.abs(v.v) > 40) continue;
      const xm = moNextValley(v, dir); if (xm == null) continue;
      v.locked = false; v.pinUntil = 0; v.target = null; v.v = 0; v.hist.length = 0; v.histT.length = 0; v.glide = { x0: v.x, x1: xm, t0: t, dur: 0.18 + 0.0011 * Math.abs(xm - v.x) };
      v.flash = Math.max(v.flash, 0.5); haptic(5); MO.hops++;
      if (MO.hops >= 2) discover('x-tilt', v);
    }
  } else { MO.rolling = false; MO.busy = Math.max(0, MO.busy - dt); }
  if (MO.n0 && !rolling && Math.abs(ax) < dzn) { MO.calmT = (MO.calmT || 0) + dt; if (MO.calmT > 3) MO.n0 = null; } else MO.calmT = 0;
  // a spirit level: flat on a table, still
  if (Math.hypot(MO.gx, MO.gy) < 0.012 && MO.ua < 0.6) { if (!MO.levelT) MO.levelT = now; else if (now - MO.levelT > 2.5) discover('x-level'); } else MO.levelT = 0;
  if (!MO.hinted && t > 2 && entered) {
    MO.hinted = true;
    setTimeout(() => { if (MO.on) caption('tilt the phone: the voices roll like marbles. shake for a new chord, twist to turn the mandala, flick to strum.', 5200); }, 2600);
  }
  uiTilt(dt);
}
// the next valley floor downhill, read off the root's own terrain (those floors stay put while the other voices move):
// walk up over the next hilltop, then down to the bottom. skip floors that would crowd or clash with another voice (thirds and wider
// are fine, seconds are not; a gliding voice counts where it is headed), and stop 150¢ short of either end, where the walls bounce everyone around
function moNextValley(v, dir) {
  const st = 3, Dr = x => dTones(fOf(x), fRoot) + holeTerm(x);
  let x = v.x, prev = Dr(x), rising = false, peaked = false;
  for (let k = 0; k < 150; k++) {
    const nx = x + dir * st; if (nx < 150 || nx > XMAX - 150) return null;
    const d = Dr(nx);
    if (!peaked) { if (d > prev + 1e-12) rising = true; else if (rising && d < prev - 1e-12) peaked = true; }
    else if (d > prev + 1e-12) {
      let a = x - st, b = x + st; for (let i = 0; i < 18; i++) { const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618; if (Dr(m1) < Dr(m2)) b = m2; else a = m1; }
      const xm = (a + b) / 2;
      if (voices.every(o => { if (o === v || o.wT === 0) return true; const ox = o.glide ? o.glide.x1 : o.x; return Math.abs(ox - xm) >= 90 && dTones(fOf(xm), fOf(ox)) < 0.95 * D0; })) return xm;
      peaked = false; rising = true;
    }
    prev = d; x = nx;
  }
  return null;
}
// voices rolling freely (after a fling, say) click over each hilltop: a tick in the hand
function rollTicks() {
  for (const v of voices) {
    if (v.wT === 0 || v.dragging || v.locked || v.glide || Math.abs(v.v) < 25) { v.gsP = 0; continue; }
    const g = Dv(v, v.x + 0.6) - Dv(v, v.x - 0.6), s = g > 0 ? 1 : -1;
    if (v.gsP && s !== v.gsP && ((v.v > 0 && v.gsP > 0) || (v.v < 0 && v.gsP < 0))) { haptic(6); v.flash = Math.max(v.flash, 0.35); gpRumble(0.15, 0, 40); }
    v.gsP = s;
  }
}

// ---------- the little bubble level on the phone's top bar, and the sheet's readout ----------
function uiTilt(dt) {
  MO.uiT -= dt; if (MO.uiT > 0) return; MO.uiT = 0.06;
  const b = $('tTilt'); if (!b) return;
  const show = (MO.live || MO_NEEDS_PERM || isTouch) && entered;
  b.classList.toggle('hidden', !show);
  if (!show) return;
  const dot = b.firstElementChild, on = MO.on, x = on ? clamp(MO.tx * 46, -9, 9) : 0, y = on ? clamp(MO.ty * 46, -9, 9) : 0;
  dot.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  b.classList.toggle('on', on); b.classList.toggle('roll', on && !!MO.rolling);
  b.classList.toggle('ask', !on && SET.motion && MO_NEEDS_PERM && MO.perm !== 'granted');
  const note = $('mNote');
  if (note && MO.on && ((rt() * 4) | 0) % 2 === 0) {
    const deg = v => Math.round((Math.asin(clamp(v, -1, 1)) * 180) / Math.PI);
    note.textContent = `sensors live, about ${Math.round(MO.hz)} readings a second. tilt ${Math.abs(deg(MO.tx))}° ${MO.tx >= 0 ? 'right' : 'left'}, ${Math.abs(deg(MO.ty))}° ${MO.ty >= 0 ? 'toward you' : 'away'}${MO.gesture && rt() - MO.gestureT < 3 ? ` · last gesture: ${MO.gesture}` : ''}.`;
  }
}
function motionUI() {
  const note = $('mNote'); if (!note) return;
  $('mAllow').classList.toggle('hidden', !(MO_NEEDS_PERM && MO.perm !== 'granted'));
  if (!SET.motion) note.textContent = 'motion is off. switch it on to tilt, shake, twist and flick.';
  else if (MO.live) note.textContent = 'sensors live. tilt rolls the voices and leans the sky; shake throws a new chord; twist your wrist to turn the root; flick to strum.';
  else if (MO_NEEDS_PERM && MO.perm !== 'granted') note.textContent = 'this device asks first: press allow motion, then tilt away.';
  else note.textContent = isTouch ? 'waiting for the motion sensors. if nothing arrives, this page is probably framed without them (the Claude app may keep sensors from artifacts); the standalone page has them: stevoblevo.github.io/and-so' : 'no motion sensors here. on a phone: tilt rolls the voices, shake throws a new chord, a twist turns the root.';
}

// ---------- a game controller (the gamepad lab's deadzones: left 0.18, right 0.25) ----------
const GP = { seen: false, prev: [], held: null, v: null, lastId: '', zoomT: 0, rum: null };
function gpRadial(x, y, dz) { const m = Math.hypot(x, y); if (m < dz) return [0, 0]; const k = Math.min(1, (m - dz) / (1 - dz)); return [(x / m) * k, (y / m) * k]; }
function gpPad() { if (!navigator.getGamepads) return null; let gs; try { gs = navigator.getGamepads(); } catch (e) { return null; } for (const g of gs) if (g && g.connected) return g; return null; }
function gpRumble(weak, strong, ms) {
  const gp = GP.rum; if (!gp || !gp.vibrationActuator) return;
  try { const p = gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function gpRelease() {
  const v = GP.v; GP.held = null; GP.v = null;
  if (v && v.dragging === 'pad') { v.dragging = false; v.dragX = null; v.temp = 0.3; v.v = 0; v.hist.length = 0; v.histT.length = 0; }
}
function gpSelect(dir) {
  const live = voices.filter(v => v.wT > 0).sort((a, b) => a.x - b.x); if (!live.length) return;
  const i = live.indexOf(act); act = live[(((i < 0 ? 0 : i + dir) % live.length) + live.length) % live.length]; act.flash = 1; haptic(4);
}
function padTick(dt) {
  if (!entered) return;
  const gp = gpPad(); GP.rum = gp;
  if (!gp) { if (GP.held) gpRelease(); return; }
  if (!GP.seen || GP.lastId !== gp.id) {
    GP.seen = true; GP.lastId = gp.id; GP.prev = gp.buttons.map(b => b.pressed);
    caption('controller: left stick moves a voice, A glides, B moves the root, X adds a voice, Y changes the view, the bumpers pick a voice.', 5200);
    discover('x-pad'); jlog(`controller: ${gp.id}`); gpRumble(0.3, 0.2, 160); return;
  }
  const B = i => !!(gp.buttons[i] && gp.buttons[i].pressed), P = i => B(i) && !GP.prev[i], V = i => (gp.buttons[i] ? gp.buttons[i].value : 0);
  const [lx] = gpRadial(gp.axes[0] || 0, gp.axes[1] || 0, 0.18), [rx, ry] = gpRadial(gp.axes[2] || 0, gp.axes[3] || 0, 0.25);
  let any = Math.abs(lx) + Math.abs(rx) + Math.abs(ry) > 0;
  // left stick drives the active voice like a finger: it follows, then rolls home when the stick lets go
  if (Math.abs(lx) > 0) {
    if (!GP.held) {
      const v = act && act.wT > 0 ? act : voices.find(o => o.wT > 0);
      if (v && !v.dragging) { GP.held = 'pad'; GP.v = v; v.dragging = 'pad'; v.dragX = v.x; v.locked = false; v.glide = null; v.echo = null; v.pinUntil = 0; v.temp = 0; v.v = 0; draggedOnce = true; }
    }
    const v = GP.v;
    if (v && v.dragging === 'pad') { const sp = 110 + 540 * lx * lx; v.dragX = clamp(v.dragX + lx * sp * dt, 70, XMAX - 70); v.dragY = LT; }
  } else if (GP.held) gpRelease();
  // right stick turns whatever the sound box shows
  if (Math.abs(rx) + Math.abs(ry) > 0) {
    const vw = viewOn();
    if (vw === 'cube' || vw === 'd5') { VW.yaw += rx * 2.4 * dt; VW.pitch = clamp(VW.pitch + ry * 1.8 * dt, -1.35, 1.35); VW.vyaw = 0; VW.vpitch = 0; }
    else if (vw === 'mandala') { const d = rx * 2.6 * dt; mrot += d; GP.spin = (GP.spin || 0) + d; const st = TAU / 5; while (GP.spin > st) { GP.spin -= st; spinStep(1); } while (GP.spin < -st) { GP.spin += st; spinStep(-1); } }
  }
  if (P(0)) { lean(1); userIdleUntil = t + 10; }
  if (P(1)) { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; }
  if (P(2)) { const v = LIGHT() ? lightAdd() : addVoice(rand(300, XMAX - 300), { temp: 0.3 }); if (!v) caption('four voices is the limit.', 1600); }
  if (P(3)) cycleView();
  if (P(4)) gpSelect(-1);
  if (P(5)) gpSelect(1);
  if (P(8)) { const i = SKINS.indexOf(skin); setSkin(SKINS[(i + 1) % SKINS.length]); }
  if (P(9)) showGw(true);
  if (P(10)) { if (REEL.on) reelStop(false); else reelStart(); }
  if (P(11)) { if (viewOn() === 'cymatics') cymReset(); else strum(); }
  if (P(12)) setTuplet(tuplet + 1);
  if (P(13)) setTuplet(tuplet - 1);
  const lt = V(6), rt = V(7);
  if ((lt > 0.15 || rt > 0.15) && t - GP.zoomT > 0.05) { GP.zoomT = t; wheelView(0, (lt - rt) * 140, PX0 + PW / 2); any = true; }
  if (B(14) || B(15)) { const w = VIEW.x1 - VIEW.x0; VIEW.tgt = { x0: clamp(VIEW.x0 + (B(15) ? 1 : -1) * w * 0.9 * dt, 0, XMAX - w), w }; any = true; }
  if (any || gp.buttons.some(b => b.pressed)) { lastUserT = t; if (REEL.on && (any || gp.buttons.some((b, i) => b.pressed && i !== 10))) reelStop(false); }
  GP.prev = gp.buttons.map(b => b.pressed);
}

// ---------- wiring ----------
moListen();
let tiltPress = 0, tiltLong = false;
$('tTilt').addEventListener('click', e => {
  e.currentTarget.blur();
  if (tiltLong) { tiltLong = false; return; }
  if (MO_NEEDS_PERM && MO.perm !== 'granted') { SET.motion = true; moAsk().then(p => { if (p === 'granted') { moLevel(true); caption('tilt is on. level is wherever you hold it now.', 2600); } else caption('motion was not allowed. it stays off.', 2600); syncUI(); }); return; }
  if (!MO.live) { caption(isTouch ? 'no motion sensors reached this page. the standalone page has them: stevoblevo.github.io/and-so' : 'no motion sensors on this device.', 4200); return; }
  if (!SET.motion) { setMotion(true); caption('tilt is on.', 1600); return; }
  moLevel(false);
});
$('tTilt').addEventListener('pointerdown', () => { tiltLong = false; tiltPress = setTimeout(() => { if (SET.motion) { tiltLong = true; setMotion(false); caption('tilt is off. tap the bubble to turn it back on.', 2600); haptic(12); } }, 650); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(n => $('tTilt').addEventListener(n, () => clearTimeout(tiltPress)));
$('sMotion').addEventListener('change', e => setMotion(e.target.checked));
$('sRoll').addEventListener('change', e => { SET.roll = e.target.checked; persistSoon(); });
$('sTiltK').addEventListener('input', e => { SET.tiltK = e.target.value / 100; });
$('sTiltK').addEventListener('change', persistSoon);
$('mLevel').addEventListener('click', () => { if (MO.live) moLevel(false); else caption('no motion sensors reached this page.', 2400); });
$('mAllow').addEventListener('click', () => moAsk().then(p => { if (p === 'granted') { SET.motion = true; moLevel(true); caption('motion allowed. tilt away.', 2200); } syncUI(); }));
window.addEventListener('gamepadconnected', () => { GP.seen = false; });
// turning the phone to landscape is not a twist, and the new "level" is however it is held afterwards
const moTurned = () => { MO.twistT = rt() + 0.8; MO.flickT = rt() + 0.8; setTimeout(() => { if (MO.live) moLevel(true); }, 350); };
try { if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', moTurned); else window.addEventListener('orientationchange', moTurned); } catch (e) {}
window.addEventListener('gamepaddisconnected', () => { if (GP.held) gpRelease(); caption('controller disconnected.', 1800); GP.seen = false; });
