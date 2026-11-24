/* LIVLOCH · input: keyboard and mouse, touch, gamepad, all feeding one state.

   DESIGN
   - Three devices write the same small state (move stick, look delta, fire, zoom, one-shot edges). main.js reads only that.
   - The last device touched wins and sets a body class, so the HUD and help text follow the device in hand.
   - Touch: left 42% of the screen is a floating stick, the rest is look; holding Fire also drags the view.
   - Mouse look needs pointer lock. If the host frame refuses it, look falls back to raw mouse movement.
   - 0.25 air: jump is a one-shot edge (I.e.jump) as before, and also a level, I.jumpHeld (Space, pad A, or a finger on
     the touch Jump button), for Myra Belle's hover, which lasts while jump is held. */
(function () {
'use strict';
const LL = window.LL;
const I = LL.input = { mx: 0, my: 0, lookX: 0, lookY: 0, fire: false, zoom: false, e: {}, device: 'kbm', locked: false, lockFailed: false, play: false, looking: 0 };
const keys = {}; let canvas = null, app = null;
let stickId = -1, stickOX = 0, stickOY = 0, sx = 0, sy = 0, lookId = -1, lx = 0, ly = 0, fireId = -1, mFire = false, mZoom = false, tFire = false;
let padPrev = [], padFire = false, padZoom = false, padX = 0, padY = 0, navT = 0;
let jumpId = -1, padJump = false; // 0.25 air: the finger on the touch Jump button, and pad A held
const stickEl = () => document.getElementById('stick');

I.take = function (n) { if (I.e[n]) { I.e[n] = false; return true; } return false; };
function setDevice(d) { if (I.device === d) return; I.device = d; document.body.classList.toggle('touch', d === 'touch'); document.body.classList.toggle('pad', d === 'pad'); if (I.onDevice) I.onDevice(d); }
I.lock = function () {
  if (I.device !== 'kbm' || I.locked || I.lockFailed || !canvas.requestPointerLock) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(function () { I.lockFailed = true; }); } catch (e) { I.lockFailed = true; }
};
I.unlock = function () { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} };

I.init = function (cv, root) {
  canvas = cv; app = root;
  const KEYMAP = { Space: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyQ: 'ab0', KeyE: 'ab1', KeyF: 'ab2', Digit1: 'ab0', Digit2: 'ab1', Digit3: 'ab2', KeyR: 'reload', KeyT: 'zip', KeyB: 'shop', KeyI: 'ink', KeyV: 'view', KeyC: 'echo', BracketRight: 'view', KeyP: 'pause', Escape: 'esc', Tab: 'shop' };
  window.addEventListener('keydown', function (ev) {
    // Menus include native verdict radios and editable debrief notes. Their keys belong to the control.
    if (ev.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable)) return;
    setDevice('kbm');
    if (I.play) { if (ev.code === 'Tab' || ev.code === 'Space' || ev.code.indexOf('Arrow') === 0) ev.preventDefault(); }
    if (ev.repeat) return;
    keys[ev.code] = true;
    const m = KEYMAP[ev.code]; if (m) I.e[m] = true;
    if (ev.code === 'ArrowUp' || ev.code === 'ArrowLeft') I.e.navPrev = true;
    if (ev.code === 'ArrowDown' || ev.code === 'ArrowRight') I.e.navNext = true;
  });
  window.addEventListener('keyup', function (ev) { keys[ev.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; mFire = mZoom = false; });
  document.addEventListener('pointerlockchange', function () { I.locked = document.pointerLockElement === canvas; if (!I.locked) { mFire = mZoom = false; if (I.onUnlock) I.onUnlock(); } });
  document.addEventListener('pointerlockerror', function () { I.lockFailed = true; });
  canvas.addEventListener('mousedown', function (ev) {
    if (I.device === 'touch') return;
    setDevice('kbm');
    if (!I.play) return;
    if (!I.locked && !I.lockFailed) { I.lock(); return; }
    if (ev.button === 0) mFire = true; else if (ev.button === 2) mZoom = true;
  });
  window.addEventListener('mouseup', function (ev) { if (ev.button === 0) mFire = false; else if (ev.button === 2) mZoom = false; });
  window.addEventListener('mousemove', function (ev) {
    if (I.device !== 'kbm' || !I.play) return;
    if (I.locked || I.lockFailed) { I.lookX += (ev.movementX || 0) * 0.0023; I.lookY += (ev.movementY || 0) * 0.0023; }
  });
  canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  // touch
  app.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType !== 'touch') return;
    setDevice('touch');
    const b = ev.target.closest ? ev.target.closest('[data-btn]') : null;
    if (b) {
      ev.preventDefault(); b.classList.add('down');
      try { b.setPointerCapture(ev.pointerId); } catch (e) {}
      const n = b.getAttribute('data-btn');
      if (n === 'fire') { tFire = true; fireId = ev.pointerId; lookId = ev.pointerId; lx = ev.clientX; ly = ev.clientY; }
      else { I.e[n] = true; if (n === 'jump') jumpId = ev.pointerId; } // 0.25 air: held for the hover
      return;
    }
    if (!I.play || ev.target.closest('.screen') || ev.target.closest('button')) return;
    ev.preventDefault();
    if (ev.clientX < window.innerWidth * 0.42 && stickId < 0) {
      stickId = ev.pointerId; stickOX = ev.clientX; stickOY = ev.clientY; sx = sy = 0;
      const s = stickEl(); if (s) { s.style.left = stickOX + 'px'; s.style.top = stickOY + 'px'; }
    } else if (lookId < 0) { lookId = ev.pointerId; lx = ev.clientX; ly = ev.clientY; }
  }, { passive: false });
  app.addEventListener('pointermove', function (ev) {
    if (ev.pointerType !== 'touch') return;
    if (ev.pointerId === stickId) {
      let dx = (ev.clientX - stickOX) / 52, dy = (ev.clientY - stickOY) / 52; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      sx = dx; sy = -dy; const k = stickEl(); if (k) k.firstElementChild.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)';
    } else if (ev.pointerId === lookId) {
      I.lookX += (ev.clientX - lx) * 0.0062; I.lookY += (ev.clientY - ly) * 0.0062; lx = ev.clientX; ly = ev.clientY; I.looking = 0.4;
    }
  }, { passive: false });
  const up = function (ev) {
    if (ev.pointerType !== 'touch') return;
    const b = ev.target.closest ? ev.target.closest('[data-btn]') : null; if (b) b.classList.remove('down');
    if (ev.pointerId === stickId) { stickId = -1; sx = sy = 0; const k = stickEl(); if (k) { k.firstElementChild.style.transform = ''; k.style.left = ''; k.style.top = ''; } }
    if (ev.pointerId === fireId) { fireId = -1; tFire = false; }
    if (ev.pointerId === lookId) lookId = -1;
    if (ev.pointerId === jumpId) jumpId = -1; // 0.25 air
  };
  app.addEventListener('pointerup', up); app.addEventListener('pointercancel', up);
  // ability buttons by mouse
  app.addEventListener('click', function (ev) {
    const b = ev.target.closest ? ev.target.closest('.ab') : null;
    if (b && I.device !== 'touch') I.e[b.getAttribute('data-btn')] = true;
  });
};
function padBtn(gp, i) { const b = gp.buttons[i]; return b ? (b.pressed || b.value > 0.5) : false; }
I.poll = function (dt, sens) {
  let x = 0, y = 0;
  if (keys.KeyW || keys.ArrowUp) y += 1; if (keys.KeyS || keys.ArrowDown) y -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1; if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (I.device === 'touch') { x = sx; y = sy; }
  if (I.looking > 0) I.looking -= dt;
  // gamepad
  let gp = null;
  try { const gps = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected && gps[i].buttons.length >= 10) { gp = gps[i]; break; } } catch (e) {}
  padFire = padZoom = false;
  padJump = false; // 0.25 air
  if (gp) {
    const dz = v => Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84;
    const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
    let any = Math.abs(ax) + Math.abs(ay) + Math.abs(rx) + Math.abs(ry) > 0.2;
    const MAP = { 0: 'jump', 1: 'dash', 2: 'reload', 3: 'ab2', 4: 'ab0', 5: 'ab1', 8: 'shop', 9: 'pause', 12: 'zip', 14: 'echo', 15: 'view' };
    for (let i = 0; i < 16; i++) {
      const d = padBtn(gp, i); if (d) any = true;
      if (d && !padPrev[i]) {
        if (MAP[i]) I.e[MAP[i]] = true;
        if (i === 0) I.e.navOk = true; if (i === 1) I.e.navBack = true;
        if (i === 12 || i === 14) I.e.navPrev = true; if (i === 13 || i === 15) I.e.navNext = true;
      }
      padPrev[i] = d;
    }
    navT -= dt;
    if (Math.abs(ay) > 0.6 || Math.abs(ax) > 0.6) { if (navT <= 0) { navT = 0.28; if (ay > 0.6 || ax > 0.6) I.e.navNext = true; else I.e.navPrev = true; } } else navT = 0;
    if (any) setDevice('pad');
    if (I.device === 'pad') {
      x = ax; y = -ay;
      const cur = v => v * Math.abs(v);
      I.lookX += cur(rx) * 3.1 * dt * (padZoom ? 0.6 : 1); I.lookY += cur(ry) * 2.1 * dt;
      if (Math.abs(rx) + Math.abs(ry) > 0.1) I.looking = 0.4;
      padFire = padBtn(gp, 7); padZoom = padBtn(gp, 6);
      padJump = padBtn(gp, 0); // 0.25 air
    }
  }
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  I.mx = x; I.my = y;
  I.fire = mFire || tFire || padFire; I.zoom = mZoom || padZoom;
  I.jumpHeld = !!keys.Space || padJump || jumpId >= 0; // 0.25 air
  I.lookX *= sens; I.lookY *= sens;
};
I.rumble = function (a, ms) {
  if (I.device !== 'pad') return;
  try { const gps = navigator.getGamepads(); for (let i = 0; i < gps.length; i++) { const g = gps[i]; if (g && g.vibrationActuator && g.vibrationActuator.playEffect) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: a, weakMagnitude: a * 0.6 }).catch(function () {}); } } catch (e) {}
};
})();
