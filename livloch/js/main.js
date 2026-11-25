/* LIVLOCH · main: states, the loop, and the human's hands on the hero.

   DESIGN
   - States: title, entering (0.28: the moment between Walk in and the match), play, pause, over. One requestAnimationFrame
     loop. On the title the painting shows first; js/face.js decides when the bot world behind it is stepped and drawn.
   - Each frame: read input, turn it into hero.ctl for the player, step the sim in slices of at most 1/45 s, hand W.fx
     to gfx, audio and ui, then draw.
   - Aim is a ray from the camera through the crosshair; the sim says what it hits. Touch and pad get a gentle pull
     toward a target near the crosshair, and touch fires by itself when the ring is on something.
   - Looks, including the Inkblot toggle, are switched here. The view the player wears is model state (S.setLens),
     because some rules depend on it; the renderer only follows W.lens. */
(function () {
'use strict';
const LL = window.LL, C = LL.C, S = LL.sim, U = LL.U, R = LL.gfx, A = LL.audio, I = LL.input, UI = LL.ui, F = LL.face; // 0.28 face: LL.face, the title and the walk in
const KEY = 'livelock.v1';
const cfg = LL.cfg = { sens: 1, vol: 0.6, music: 0.7, sfx: 0.9, mute: false, micro: false, invert: false, autoFire: null, assist: true, low: false, hero: 0, diff: 1, wins: 0, losses: 0, look: 'snow', lookPrev: 'snow', coached: false, v6: false, mode: 'short', bestStars: 0, pet: false, petUnlocked: false, v17: false, lean: false, dream: false, calls: {}, callNotes: {}, bestT: 0, bestL: 0, unl: {}, all: false, snuffBest: 0, heroes3d: true }; // 0.24 heroes3d: 3D figures (off: painted paper); callNotes: the Dreamwalk debrief's notes (PR #43)
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (const k in cfg) if (k in s) cfg[k] = s[k]; } catch (e) {}
if (LL.wardrobe) LL.wardrobe.adopt(cfg, KEY, save); // 0.23 wardrobe: its saved fields (stars all told, goals ever done, what is worn), with defaults for old saves
if (!cfg.v6) { cfg.v6 = true; cfg.look = 'snow'; }
cfg.hero = U.clamp(cfg.hero | 0, 0, LL.HEROES.length - 1); cfg.diff = U.clamp(cfg.diff | 0, 0, 2);
function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }

let pausedAt = 0;
let W = null, state = 'title', last = 0, overT = 0, slowFrames = 0, autoLowered = false, counted = false;
const view = { mode: 'attract', target: null, yaw: 0, pitch: -0.08, zoom: 0 };
const cp = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 1, dist: 5 }, aim = { x: 0, y: 0, z: 0, unit: null, orb: null, dist: 0 }, info = { hot: false, orb: false, canZip: false, canFold: false };
const coach = { step: -1, x: 0, z: 0, look: 0, t: 0 };
const canvas = document.getElementById('gl'), app = document.getElementById('app');
LL.dbg = { view: view }; // read by tools/evidence.js to frame shots; the game never uses it
const autoFireOn = () => cfg.autoFire == null ? I.device === 'touch' : cfg.autoFire;

/* Changing the view is a player action. The model is told (S.setLens) and owns what it means; the renderer just follows. */
function setLook(id) { if (!R.LOOKS[id]) id = 'snow'; cfg.look = id; save(); document.body.setAttribute('data-look', id); R.setLook(id); UI.lookChips(); if (W && (state === 'play' || state === 'pause')) S.setLens(id); }
function restoreLook() { if (R.look !== R.LOOKS[cfg.look]) { document.body.setAttribute('data-look', cfg.look); R.setLook(cfg.look); } } // after a Dreamwalk, the saved look comes back
function nextView() { const L = C.LENSES; setLook(L[(L.indexOf(cfg.look) + 1) % L.length]); }
/* Inkblot view is a way of looking, never a rule: it flips the look and back. */
function toggleInk() { if (cfg.look === 'ink') setLook(R.LOOKS[cfg.lookPrev] && cfg.lookPrev !== 'ink' ? cfg.lookPrev : 'snow'); else { cfg.lookPrev = cfg.look; setLook('ink'); } }
function attract(again) {
  W = S.newWorld({ auto: true, difficulty: 1, seed: (Date.now() & 0xffff) + 3 });
  W.fx.length = 0; restoreLook(); R.build(W);
  view.mode = 'attract'; view.target = null; state = 'title'; I.play = false; A.duck(false); A.cue('title');
  if (!again && F) F.title(); /* 0.28 face: the painting first; F decides when the valley shows through */
}
/* 0.28 face: from the title, Walk in veils the valley with the painting for a moment (the pointer is captured now, while the
   click still counts as a gesture), then starts the match under it; F dissolves the painting and settles the camera. */
function play(auto) {
  if (state === 'entering') return;
  if (F && state === 'title') {
    if (!auto && !cfg.lean) I.lock();
    A.init(); A.ui('ok'); F.leave(); state = 'entering'; I.play = false;
    setTimeout(function () { state = 'title'; start(auto); F.enter(); }, F.VEIL); return;
  }
  start(auto); if (F) F.plain();
}
function start(auto) {
  A.init(); A.ui('ok'); A.duck(false); A.cue('valley');
  W = S.newWorld({ heroPick: cfg.hero, difficulty: cfg.diff, auto: !!auto, seed: (Date.now() & 0xfffff) + 11, lens: cfg.look, mode: cfg.mode, lean: !auto && cfg.lean, dream: !auto && cfg.dream }); speed = 1;
  lens0 = W.lens; restoreLook(); R.build(W); UI.startHUD(W);
  view.mode = 'play'; view.target = W.player; view.yaw = 0; view.pitch = -0.08; view.zoom = 0;
  state = 'play'; I.play = true; counted = !auto; overT = 0; I.lookX = I.lookY = 0;
  coach.step = (!auto && !W.lean && I.device === 'touch' && !cfg.coached) ? 0 : -1; coach.x = W.player.x; coach.z = W.player.z; coach.t = 0; coach.look = 0; UI.coach('');
  if (!auto && !W.lean) I.lock();
}
function pause() { if (state !== 'play' || W.over) return; if (UI.screen === 'shop') UI.toggleShop(false); state = 'pause'; pausedAt = performance.now(); I.play = false; UI.showPause(true); I.unlock(); A.duck(true); }
function resume() { if (state !== 'pause') return; state = 'play'; I.play = true; UI.showPause(false); I.lock(); last = performance.now(); A.duck(false); }
function quit() { I.unlock(); UI.showTitle(); attract(); }

function playerControl(dt) {
  const p = W.player, c = p.ctl, menu = UI.screen !== null;
  info.hot = info.orb = false; info.canZip = false; info.canFold = false;
  if (p.useAI) {
    if (W.lean) { for (let i = 0; i < 3; i++) if (I.take('ab' + i)) S.call(i); if (I.take('zip')) S.leanFold(); if (I.take('echo')) S.echo(); } // Lean Back: Q E F call a thread, T folds
    view.yaw += U.angDiff(p.yaw, view.yaw) * Math.min(1, dt * 3); view.pitch += (p.pitch * 0.6 - 0.1 - view.pitch) * Math.min(1, dt * 3);
    view.zoom += (0 - view.zoom) * Math.min(1, dt * 8); return;
  }
  if (!menu) { view.yaw -= I.lookX; view.pitch -= I.lookY * (cfg.invert ? -1 : 1); }
  view.pitch = U.clamp(view.pitch, -1.25, 1.2);
  view.zoom += ((I.zoom && !menu ? 1 : 0) - view.zoom) * Math.min(1, dt * 12);
  if (!p.alive) { c.fire = false; c.mx = c.mz = 0; return; }
  R.camPose(p, view.yaw, view.pitch, view.zoom, cp);
  // aim help for thumbs and sticks
  if (cfg.assist && !menu && (I.device === 'touch' || I.device === 'pad')) {
    let best = null, ba = 0.15, bdy = 0, bdp = 0; const us = W.units;
    for (let i = 0; i < us.length; i++) {
      const u = us[i]; if (!u.alive || u.team !== 1 - p.team || u.struct) continue;
      const dx = u.x - cp.x, dz = u.z - cp.z, hd = Math.hypot(dx, dz); if (hd > 48 || hd < 2) continue;
      const dyaw = U.angDiff(Math.atan2(dx, dz), view.yaw), dp = Math.atan2(u.y + u.h * 0.62 - cp.y, hd) - view.pitch;
      const a = Math.hypot(dyaw * Math.cos(view.pitch), dp) - (u.kind === 'hero' ? 0.03 : 0);
      if (a < ba) { ba = a; best = u; bdy = dyaw; bdp = dp; }
    }
    if (best && (I.looking > 0 || I.fire || Math.abs(I.mx) + Math.abs(I.my) > 0.2 || autoFireOn())) {
      const k = Math.min(1, dt * (I.device === 'touch' ? 5 : 3.2));
      view.yaw += bdy * k; view.pitch += bdp * k; R.camPose(p, view.yaw, view.pitch, view.zoom, cp);
    }
  }
  S.aimPoint(cp.x, cp.y, cp.z, cp.dx, cp.dy, cp.dz, cp.dist + 0.4, p.team, aim);
  c.ax = aim.x; c.ay = aim.y; c.az = aim.z;
  const range = p.def.gun.range * 1.02, ad = Math.hypot(aim.x - p.x, aim.z - p.z);
  const u = aim.unit;
  info.orb = !!aim.orb && ad <= range;
  info.hot = !!u && ad <= range && (!u.struct || S.vuln(u));
  c.jumpHeld = !menu && I.jumpHeld; // 0.25 air: held jump keeps Myra Belle's hover going
  if (menu) { c.mx = c.mz = 0; c.fire = false; return; }
  const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw);
  c.mx = -cy * I.mx + sy * I.my; c.mz = sy * I.mx + cy * I.my;
  let fire = I.fire;
  if (!fire && autoFireOn()) fire = info.orb || (info.hot && ((u.kind !== 'stray' && u.kind !== 'ness') || u.hp < u.maxHp));
  c.fire = fire;
  if (I.take('jump')) c.jump = true;
  if (I.take('dash')) c.dash = true;
  if (I.take('reload')) c.reload = true;
  const ci = S.creaseFor(p); info.canFold = ci >= 0;
  if (I.take('zip')) { if (ci >= 0) S.fold(p, ci); else c.zip = true; }
  runCoach(dt, p);
  for (let i = 0; i < 3; i++) if (I.take('ab' + i)) c.ab[i] = true;
  if (I.take('hat')) c.hat = true; // 0.26 guard: Dora's hat (G, pad R3, the touch Hat button)
  info.canZip = S.canZip(p) >= 0;
}

/* First match on a phone: three short prompts, each cleared by doing the thing. */
function runCoach(dt, p) {
  if (coach.step < 0) return;
  coach.t += dt; coach.look += Math.abs(I.lookX) + Math.abs(I.lookY);
  if (coach.step === 0) { UI.coach('Left thumb anywhere on this side: move'); if (Math.hypot(p.x - coach.x, p.z - coach.z) > 8) { coach.step = 1; coach.t = 0; coach.look = 0; } }
  else if (coach.step === 1) { UI.coach('Right thumb: drag to look. Your gun fires itself when the ring is on something'); if (coach.look > 1.2 || coach.t > 14) { coach.step = 2; coach.t = 0; } }
  else if (coach.step === 2) { UI.coach(info.canZip ? 'Tap Ride thread to reach the fight' : 'Walk forward until you are standing on a thread'); if (p.zip || coach.t > 30) { coach.step = 3; coach.t = 0; } }
  else if (coach.step === 3) { UI.coach('Shoot the orbs that float up from dead troopers. That is most of your income'); if (coach.t > 9) { coach.step = -1; UI.coach(''); cfg.coached = true; save(); } }
}
/* Cabinet feats. Only a person earns them: nothing opens while the valley is just being watched. */
const worn = {}; let lens0 = 'snow', speed = 1;
const perf = []; let perfI = 0;
LL.perfReport = function () {
  const a = perf.slice().sort(function (x, y) { return x - y; }), n = a.length; if (n < 30) return null;
  const avg = a.reduce(function (s, v) { return s + v; }, 0) / n, p99 = a[Math.min(n - 1, Math.floor(n * 0.99))], p50 = a[Math.floor(n / 2)], i = R.info();
  return { fps: Math.round(1000 / avg), mid: Math.round(1000 / p50), low: Math.round(1000 / p99), frames: n, slow: a.filter(function (v) { return v > 33.4; }).length, info: i,
    text: 'Livloch ' + (document.querySelector('#title footer').textContent.match(/[0-9.]+/) || [''])[0] + ' frame report\n' + Math.round(1000 / avg) + ' fps average, ' + Math.round(1000 / p50) + ' typical, ' + Math.round(1000 / p99) + ' at the worst 1%\n' + a.filter(function (v) { return v > 33.4; }).length + ' of ' + n + ' frames slower than 30 fps\n' + i.w + 'x' + i.h + ' at ' + i.pr + 'x, view ' + i.look + (i.low ? ', lighter graphics' : '') + ', ' + (i.gl2 ? 'WebGL2' : 'WebGL1') + '\n' + i.gpu + '\n' + (W ? (W.dream ? 'Dreamwalk' : (W.lean ? 'Lean back' : 'Played')) + (W.fallen ? ', Ever Fallen' : '') + ', ' + U.fmtTime(W.t) + ' in, device ' + I.device : '') };
};
function feats(e) {
  if ((W.auto && !W.lean) || W.dream) return;
  // Earn the guardian fox by bringing back a stolen light (PR #6). It changes no rule.
  if (!cfg.petUnlocked && ((e.k === 'thiefdown' && e.p && e.carry) || (e.k === 'relit' && e.recovered))) {
    cfg.petUnlocked = cfg.pet = true; save(); R.setPet(true); UI.petStatus();
    UI.banner('A small guardian has found you.', 'It follows, and points at thieves carrying light. Settings can send it home', 5);
  }
  const U_ = UI.unlock;
  if (e.k === 'thiefdown' && e.p) U_('snuff'); else if (e.k === 'relit' && e.recovered) { U_('snuff'); if (e.n >= 10) U_('garden'); }
  else if (e.k === 'fruit' && C.FRUIT_INFO[e.kind].big) U_('peachfall');
  else if (e.k === 'fold' && e.p) U_('knight');
  else if (e.k === 'nessdown' && e.team === 0) U_('peachball');
  else if (e.k === 'redend' && W.moodsSolved > 0 && W.mood && W.mood.solved) U_('redreign');
  else if (e.k === 'lens') { worn[e.id] = W; if (C.LENSES.every(k => worn[k] === W || k === lens0)) U_('foldflow'); }
  else if (e.k === 'over') { if (W.lean) U_('kk'); if (e.fallen && e.t >= 480) U_('everfallen'); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - last;
  let dt = Math.min(0.1, (now - last) / 1000); last = now; if (!(dt > 0)) dt = 0.016;
  if (state === 'play' && raw > 0 && raw < 1000) { perf[perfI++ % 900] = raw; } // the last 900 frames, for the report
  const devSens = I.device === 'touch' && R.portrait ? 1.15 : 1;
  I.poll(dt, cfg.sens * devSens);
  if (state === 'play') {
    const esc = I.take('esc');
    if (I.take('pause') || esc || (UI.screen === 'shop' && I.take('navBack'))) { if (UI.screen === 'shop') UI.toggleShop(false); else pause(); }
    else if (I.take('shop')) UI.toggleShop();
    if (I.take('ink')) toggleInk();
    if (I.take('view')) nextView(); if (I.take('echo')) S.echo();
  } else if (state === 'pause') { const esc = I.take('esc') && now - pausedAt > 500; if (I.take('pause') || esc || I.take('navBack')) resume(); }
  UI.nav(I);
  if (state === 'play') {
    playerControl(dt);
    const steps = Math.max(1, Math.ceil(dt * 45)), sd = dt / steps;
    for (let k = 0; k < (W.dream ? speed : 1); k++) for (let s = 0; s < steps; s++) S.step(sd); // Dreamwalk can run faster than life
    const cam = R.cam();
    for (let i = 0; i < W.fx.length; i++) {
      const e = W.fx[i];
      R.fx(e);
      if (e.k === 'lens' && W.dream && R.look !== R.LOOKS[e.id]) { document.body.setAttribute('data-look', e.id); R.setLook(e.id); } // Dreamwalk: show the view the director chose (issue #7); cfg.look is not changed
      if (state === 'play') {
        A.fx(e, W, cam); UI.fx(e);
        if (e.k === 'respawn' && e.u === W.player && !W.player.useAI) { view.yaw = 0; view.pitch = -0.06; }
        feats(e);
        if (e.k === 'over') { overT = 2.6; I.unlock(); if (e.short && W.auto === W.lean && e.n > (cfg.bestStars || 0)) { cfg.bestStars = e.n; save(); }
          if (e.fallen && W.auto === W.lean && e.t > cfg.bestT) { cfg.bestT = e.t; cfg.bestL = e.lights; save(); } if (counted && !e.fallen && !e.short && !W.lean) { if (e.winner === 0) cfg.wins++; else cfg.losses++; save(); } }
        if (LL.wardrobe) LL.wardrobe.fx(e, W); // 0.23 wardrobe: counts stars, goals and lights after the Cabinet has had the event; says when something new is earned
      }
    }
    W.fx.length = 0;
    if (W.over) {
      if (state === 'title') attract();
      else if (overT > 0) { overT -= dt; if (overT <= 0) { state = 'over'; I.play = false; UI.showOver(); } }
    }
  }
  if (state === 'title' && F && W && F.titleFrame(dt, raw)) { /* 0.28 face: the attract world plays behind the title; only the renderer hears it */
    const steps = Math.max(1, Math.ceil(dt * 45)), sd = dt / steps; for (let s = 0; s < steps; s++) S.step(sd);
    for (let i = 0; i < W.fx.length; i++) R.fx(W.fx[i]); W.fx.length = 0;
    if (W.over) attract(true); else R.frame(dt, view);
  } else if (state !== 'title' && state !== 'entering') R.frame(state === 'pause' ? 0 : dt, view);
  if (state === 'play' && F) F.playFrame(); if (F) F.tick(Math.min(0.25, raw / 1000 || 0)); // 0.28 face
  if (state === 'play') { UI.frame(dt, W, view, info); A.frame(dt, W); }
  for (const k in I.e) I.e[k] = false;
  I.lookX = I.lookY = 0;
  // drop to lighter graphics if the device is struggling
  if (state === 'play' && !cfg.low && !autoLowered) { if (dt > 1 / 26) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2); if (slowFrames > 120) { autoLowered = true; R.setQuality(true); } }
}

/* SOUND SETTINGS (0.21): master, music and effects volumes, mute, and the 31-step tuning switch. Browsers only start
   audio after a gesture, so the first tap or key anywhere starts it (and the title music); the mute button and M work
   on every screen. */
function soundApply() { A.setVol(cfg.vol, cfg.music, cfg.sfx); A.setMute(cfg.mute); A.setMicro(cfg.micro); UI.muteShow(cfg.mute); }
function toggleMute() { cfg.mute = !cfg.mute; save(); A.init(); soundApply(); }
function firstGesture(ev) { if (ev && ev.target && ev.target.closest && ev.target.closest('.mute')) return; A.init(); soundApply(); }
function boot() {
  UI.init({
    play: play, pause: pause, resume: resume, quit: quit, save: save,
    apply: function () { soundApply(); R.setQuality(cfg.low); R.setPet(cfg.petUnlocked && cfg.pet); if (R.setHeroes3d) R.setHeroes3d(cfg.heroes3d !== false); /* 0.24 heroes3d */ },
    buy: function (i) { UI.afterBuy(S.buy(W.player, i)); },
    look: setLook, ink: toggleInk, view: nextView,
    call: function (l) { if (state === 'play') S.call(l); }, echo: function () { if (state === 'play') S.echo(); }, fast: function () { speed = speed >= 4 ? 1 : speed * 2; return speed; }, leanFold: function () { if (state === 'play') S.leanFold(); },
    relock: function () { if (state === 'play') I.lock(); },
    autoFire: autoFireOn,
    auto: function () { S.setAuto(!W.auto); counted = false; document.body.classList.toggle('lean', !!W.lean); document.getElementById('bAuto').textContent = W.auto ? 'Take the wheel' : 'Let it play itself'; resume(); },
    full: function () { try { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) { const p = el.requestFullscreen(); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
  });
  soundApply();
  ['pointerdown', 'keydown', 'touchend'].forEach(function (k) { document.addEventListener(k, firstGesture, { capture: true, passive: true }); });
  document.addEventListener('keydown', function (ev) { if (ev.code === 'KeyM' && !ev.repeat && !(ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName))) toggleMute(); });
  document.querySelectorAll('.mute').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); toggleMute(); b.blur(); }); });
  I.init(canvas, app);
  document.addEventListener('click', function (ev) { const b = ev.target.closest ? ev.target.closest('#hud button') : null; if (b) b.blur(); });
  I.onUnlock = function () { if (state === 'play' && UI.screen === null && !W.over && !W.auto) pause(); };
  if (cfg.mode !== 'fallen' && cfg.mode !== 'short') cfg.mode = cfg.v17 ? 'match' : 'short'; cfg.v17 = true; // First Rain is where a new or returning player starts
  if (!window.THREE || !R.init(canvas)) { UI.error('This browser would not hand over WebGL, so the valley cannot be drawn here. Try another browser or device.'); return; }
  R.setQuality(cfg.low); R.setPet(cfg.petUnlocked && cfg.pet); if (R.setHeroes3d) R.setHeroes3d(cfg.heroes3d !== false); // 0.24 heroes3d
  if (!R.LOOKS[cfg.look]) cfg.look = 'snow';
  document.body.setAttribute('data-look', cfg.look); if (cfg.look !== 'snow') R.setLook(cfg.look); else LL.C.TEAM_CSS = R.look.css; UI.lookChips();
  window.addEventListener('resize', R.resize);
  if (window.ResizeObserver) new ResizeObserver(R.resize).observe(app);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  attract();
  last = performance.now(); requestAnimationFrame(frame);
}
boot();
})();
