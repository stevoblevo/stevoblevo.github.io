// ===== layout and input: one pointer manager, multi-touch, the scale, the sheet =====
const cvs = $('c'), ctx = cvs.getContext('2d'), cvs2 = $('c2'), ctx2 = cvs2.getContext('2d'), cvs3 = $('c3'), ctx3 = cvs3.getContext('2d'), hitEl = $('hit'), gw = $('gw');
let dprScale = 1;
const PANEL_DY = 56;   // the lattice panel sits under the jar
const sheet = { h: 0, name: 'peek', drag: null, suppress: 0 };
function sheetH(name) { return name === 'full' ? H - TOPH - 6 : name === 'half' ? Math.round(H * 0.56) : PEEK; }
function setSheet(name) { sheet.name = name; sheet.h = sheetH(name); gw.style.height = sheet.h + 'px'; $('dMore').firstChild.textContent = name === 'peek' ? '⌃' : '⌄'; $('dMore').lastChild.textContent = name === 'peek' ? 'more' : 'less'; }
function readSafe() { const cs = getComputedStyle($('probe')); SAT = parseFloat(cs.paddingTop) || 0; SAB = parseFloat(cs.paddingBottom) || 0; }
function placeGw(x, y) { const r = gw.getBoundingClientRect(); gw.style.left = clamp(x, 6, Math.max(6, W - r.width - 6)) + 'px'; gw.style.top = clamp(y, 6, Math.max(6, H - 44)) + 'px'; }
function resize() {
  readSafe();
  W = window.innerWidth; H = window.innerHeight;
  DPR = skin === 'bw2' ? 1 : Math.min(window.devicePixelRatio || 1, MIR.depth > 0 ? 1 : 2) * dprScale;   // copies in the mirror are drawn small anyway
  [cvs, cvs2, cvs3].forEach(c => { c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR)); });
  [ctx, ctx2, ctx3].forEach(g => g.setTransform(DPR, 0, 0, DPR, 0, 0));
  S = clamp(Math.min(W, H) / 760, 0.7, 2);
  phone = W < 760 || (H > W * 1.15 && W < 900);
  wide = !phone && W > H * 1.05;
  const hmp = skin === 'hmp', JB = jamPadH();
  if (phone) {
    TOPH = 46 + SAT; PEEK = 84 + SAB; SH = 44;
    LB = Math.round(H - PEEK - SH - 4 - JB);
    LT = Math.round(LB - (JB ? clamp((H - JB) * 0.22, 110, 220) : clamp(H * 0.25, 140, 240)));
    PX0 = 14; PW = Math.max(100, W - 28);
    const skyTop = TOPH + 10, skyH = Math.max(120, LT - 46 - skyTop);
    MX = W / 2; MY = skyTop + skyH * 0.5;
    MR = Math.max(40, Math.min(skyH * 0.26, (W / 2 - 18) / 1.85));
    latticeOn = false; BR = 9.5 * S;
  } else {
    TOPH = 0; PEEK = 0; SH = 34;
    LT = Math.round((H - JB) * (hmp ? 0.66 : 0.6)); LB = Math.round(H - SH - (hmp ? 86 : 22) - JB);
    PX0 = 56; PW = Math.max(100, W - 112);
    latticeOn = !hmp && W >= 980 && H >= 560;
    MX = hmp ? W * 0.4 : latticeOn ? W * 0.6 : W * 0.5; MY = hmp ? LT * 0.54 : LT * 0.47;
    MR = Math.max(40, Math.min(hmp ? LT * 0.24 : LT * 0.3, W * (hmp ? 0.15 : 0.2), (MY - 30) / 1.9, (LT - 70 - MY) / 1.6)); BR = 7.5 * S;
  }
  const ns = clamp(Math.round(PW / 3.2), 120, 420);
  if (ns !== NS) { NS = ns; XS = new Float32Array(NS); FS = new Float32Array(NS); CR = new Float32Array(NS); TOT = new Float32Array(NS); voices.forEach(allocV); }
  recomputeXS();
  $('hint').style.top = LT - 30 + 'px';
  const toast = $('toast');
  if (phone) { toast.style.left = '12px'; toast.style.width = W - 24 + 'px'; toast.style.top = TOPH + 4 + 'px'; }
  else { toast.style.left = '22px'; toast.style.width = '300px'; toast.style.top = (latticeOn ? 296 + PANEL_DY : hmp ? 150 : 104) + 'px'; }
  const qs = $('quests');
  if (phone) { qs.style.left = '12px'; qs.style.width = W - 24 + 'px'; qs.style.top = TOPH + 4 + 'px'; }
  else { qs.style.left = '22px'; qs.style.width = '268px'; qs.style.top = Math.max(latticeOn ? 300 + PANEL_DY : 120, LT - 150) + 'px'; }
  placeChrome();
  const zc = $('zc'); zc.style.right = '56px'; zc.style.top = LT - 42 + 'px'; zc.classList.toggle('on', entered && !phone);
  const tb = $('tabs'); tb.style.left = PX0 + 'px'; tb.style.top = LT - 44 + 'px';
  $('top').classList.toggle('on', entered && phone); $('hud').classList.toggle('hidden', phone);
  gw.classList.toggle('sheet', phone);
  if (phone) { if (entered) gw.classList.add('on'); setSheet(sheet.name); gw.style.left = ''; gw.style.top = ''; }
  else { gw.style.height = ''; gw.style.maxHeight = Math.max(260, LT - 112) + 'px'; if (gw.classList.contains('on')) placeGw(parseFloat(gw.style.left) || W - 302, parseFloat(gw.style.top) || 52); }
  if (!entered || phone || QUIET()) $('quests').classList.remove('on'); else if (questsPinned) $('quests').classList.add('on');
  const jp = $('jam'); jp.style.height = JB + 'px'; jp.style.bottom = (phone ? PEEK : 0) + 'px';
  if (JAM.on && JAM.keys.length && (W < 560) !== (JAM.keys.length <= 12)) jamPadBuild();
  vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  if (hole.placed) { hole.x = clamp(hole.x, PX0, PX0 + PW); hole.y = clamp(hole.y, TOPH + 30, LT - 16); }
  if (pet.placed && (pet.hx > W - 10 || pet.hy > H - 10 || pet.hy < TOPH)) petHome();
  syncUI();
}
// the round banner and captions share the top on phones; on desktop the banner sits above the quest card
function placeChrome() {
  const rb = $('round'), on = !!(round && !round.done), root = document.documentElement.style;
  if (phone) { rb.style.left = '50%'; rb.style.transform = 'translateX(-50%)'; rb.style.top = TOPH + 4 + 'px'; root.setProperty('--capTop', TOPH + (on ? 56 : 4) + 'px'); }
  else { const qTop = Math.max(latticeOn ? 300 + PANEL_DY : 120, LT - 150); rb.style.left = '22px'; rb.style.transform = 'none'; rb.style.top = qTop - 54 + 'px'; root.setProperty('--capTop', (skin === 'hmp' ? 84 : 54) + 'px'); }
  // the reel's HUD sits under the phone's top bar, and the captions step down below it
  const rh = $('reelHud'); rh.style.top = (phone ? TOPH + 6 : 10) + 'px';
  if (REEL.on) root.setProperty('--capTop', (phone ? TOPH + 52 : 58) + 'px');
  // the view chip rides just above the sound box's top-right corner, clear of the lattice nodes
  const vc = $('viewChip'); vc.classList.toggle('on', !!entered);
  if (entered) { const w = vc.offsetWidth || 104, hh = vc.offsetHeight || 30; vc.style.left = clamp(Math.min(W - 12, MX + MR * 1.03 + 40) - w, 12, Math.max(12, W - w - 12)) + 'px'; vc.style.top = Math.max(TOPH + 6, MY - MR * 1.03 - 14 - hh) + 'px'; }
}

// ---------- the pointer manager ----------
const PTR = new Map();
let pinch = null, three = null, lastScaleTap = 0, lastScaleTapX = -99, scaleMark = null;
function regionOf(px, py) {
  if (py >= LB - 2 && py <= LB + SH + 8) return 'scale';
  if (py >= LT - 30 && py < LB - 2) return 'terrain';
  if (inSoundBox(px, py)) return 'mandala';
  return 'sky';
}
function handsCheck() { const n = voices.filter(v => v.dragging).length; if (n >= 2) discover('x-hands'); if (n >= 4) discover('x-four'); emit('hands', { v: n }); }
function grabVoice(p, v) {
  p.role = 'voice'; p.v = v; p.lx = v.x; p.vel = 0; p.wolf = 0; p.oct = 0; p.mph = 0; p.hit88 = false; p.lsx = p.x; p.fx = v.x; p.lxr = xFromS(p.x); p.det = null;
  v.dragging = p.id; v.locked = false; v.pinUntil = 0; v.temp = 0; v.v = 0; v.dropping = false; v.target = null; v.dragY = p.y; v.dragX = v.x; act = v;
  if (p.type === 'mouse') hitEl.style.cursor = 'grabbing';
  if (!draggedOnce) { draggedOnce = true; hideHint(); }
  if (M.struck) { audio.strikeVoice(v, 0.9, 1); v.flash = 1; } else if (plucky()) audio.pluck(v, 1.1, 0.45, 0);
  haptic(5); handsCheck();
}
function startPinch(kind, a, b) {
  if (a.role === 'voice' || b.role === 'voice') return false;
  a.role = b.role = 'pinch';
  const mx = (a.x + b.x) / 2;
  pinch = { kind, a: a.id, b: b.id, d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z0: zoomLevel(), cx0: xFromS(mx), tup0: tuplet, dv0: VW.dist };
  VIEW.vel = 0; VIEW.tgt = null; VW.drag = false;
  return true;
}
function pinchMove() {
  const a = PTR.get(pinch.a), b = PTR.get(pinch.b); if (!a || !b) return;
  const d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), ratio = d / pinch.d0;
  if (pinch.kind === 'scale') {
    const z = clamp(pinch.z0 * ratio, 1, 12), w = XMAX / z, mx = (a.x + b.x) / 2, frac = clamp((mx - PX0) / PW, 0, 1);
    setView(pinch.cx0 - frac * w, w);
    if (Math.abs(ratio - 1) > 0.15) discover('x-pinch');
  } else if (pinch.kind === 'view') VW.dist = clamp(pinch.dv0 / ratio, 3.2, 14);
  else {
    const steps = Math.round(Math.log(ratio) / Math.log(1.22));
    setTuplet(clamp(pinch.tup0 + steps, 2, 9));
  }
}
// a gentle pull toward the nearest valley floor while dragging slowly: the voice clicks into place without being forced
function detent(v, p, x) {
  const sp = Math.abs(p.vel); if (sp > 650) { p.det = null; return x; }
  const xm = refineMin(v, x, 11), d0 = Dv(v, xm);
  if (!(d0 < Dv(v, xm - 2.5) && d0 < Dv(v, xm + 2.5)) || Math.abs(xm - x) > 10.5) { p.det = null; return x; }
  const s = (1 - sp / 650) * 0.72 * (1 - Math.abs(xm - x) / 14);
  if (s > 0.3 && (p.det == null || Math.abs(xm - p.det) > 3)) { p.det = xm; haptic(4); v.flash = Math.max(v.flash, 0.3); if (plucky()) { audio.pluck(v, 0.85, 0.32, 0); PL.drag = t + 0.12; } }
  return x + (xm - x) * s;
}
hitEl.addEventListener('pointerdown', e => {
  if (!entered) return;
  e.preventDefault();
  if (REEL.on) reelStop(false);
  const px = e.clientX, py = e.clientY, now = performance.now();
  lastUserT = t; userIdleUntil = t + 14; lastPX = px; lastPY = py;
  const p = { id: e.pointerId, x: px, y: py, x0: px, y0: py, t0: now, lt: now, moved: false, role: null, type: e.pointerType };
  PTR.set(e.pointerId, p);
  try { hitEl.setPointerCapture(e.pointerId); } catch (er) {}
  if (PTR.size === 3) { const ps = [...PTR.values()]; if (ps.every(q => now - q.t0 < 380)) three = { t0: now }; }
  const reg = regionOf(px, py), others = [...PTR.values()].filter(q => q !== p);
  const sc = others.find(q => q.role === 'scale' && !q.moved);
  if (sc && (reg === 'scale' || reg === 'terrain') && startPinch('scale', sc, p)) return;
  const sp = others.find(q => q.role === 'spin');
  if (sp && reg === 'mandala' && startPinch('mandala', sp, p)) return;
  const vq = others.find(q => q.role === 'view');
  if (vq && reg === 'mandala' && viewOn() !== 'cymatics' && startPinch('view', vq, p)) return;
  const gq = guardAt(px, py); if (gq) { p.role = 'guard'; p.g = gq; p.dx = px - gq.x; p.dy = py - gq.y; p.gvx = 0; p.gvy = 0; gq.drag = true; return; }
  if (UNL.pet && pet.hatch <= 0 && Math.hypot(px - pet.x, py - (pet.y - 10 * S)) < 36 * S) { p.role = 'pet'; p.dx = px - pet.hx; p.dy = py - pet.hy; return; }
  if (hole.on && Math.hypot(px - hole.x, py - hole.y) < holeRad() * 2.4) { p.role = 'hole'; p.dx = px - hole.x; p.dy = py - hole.y; return; }
  for (let i = 0; i < 5; i++) { const q = latPos(i); if (Math.hypot(px - q[0], py - q[1]) < (phone ? 26 : 18) * Math.max(S, 0.9)) { p.role = 'node'; p.i = i; return; } }
  let hit = null, bd = phone ? 42 : 30;
  for (const v of voices) { if (v.wT === 0 || v.dragging) continue; const b = ballPos(v), d = Math.hypot(b.X - px, b.Y - py); if (d < bd) { bd = d; hit = v; } }
  if (!hit && reg === 'terrain' && !(skin === 'hmp' && tab !== 'resonance' && !phone)) {
    const x = xFromS(px); hit = addVoice(x, { temp: 0 });
    if (!hit) { let nd = 1e9; for (const v of voices) { if (v.wT === 0 || v.dragging) continue; const d = Math.abs(v.x - x); if (d < nd) { nd = d; hit = v; } } }
    if (hit) hit.x = x;
  }
  if (hit) { grabVoice(p, hit); return; }
  if (reg === 'scale') { p.role = 'scale'; p.axis = null; p.vx = 0; VIEW.vel = 0; VIEW.tgt = null; return; }
  if (reg === 'terrain') { p.role = 'none'; return; }
  if (reg === 'mandala') {
    if (viewOn() === 'mandala') { p.role = 'spin'; p.a = Math.atan2(py - MY, px - MX); p.acc = 0; p.av = 0; mrotVel = 0; return; }
    p.role = 'view'; viewDown(p); return;
  }
  if (wxHit(px, py)) { p.role = 'none'; return; }
  if (wxWorld()) wxRipple(px, py, 0.7);
  p.role = 'harp'; p.h = { pool: harpPool(), idx: -1, lastT: 0 };
});
hitEl.addEventListener('pointermove', e => {
  const px = e.clientX, py = e.clientY; lastPX = px; lastPY = py; WX.ptrT = t;
  const p = PTR.get(e.pointerId);
  if (!p) { if (entered && e.pointerType === 'mouse') { hoverCursor(px, py); updateHover(px, py); viewHover(px, py); wxHover(px, py); } return; }
  const now = performance.now(), dtm = Math.max(8, now - p.lt), dx = px - p.x, dy = py - p.y;
  if (!p.moved && Math.hypot(px - p.x0, py - p.y0) > (p.type === 'mouse' ? 4 : 8)) p.moved = true;
  p.x = px; p.y = py; p.lt = now;
  switch (p.role) {
    case 'pinch': pinchMove(); break;
    case 'voice': {
      const v = p.v, xr = xFromS(px), fine = !!e.shiftKey;
      p.fx = clamp(p.fx + (xr - p.lxr) * (fine ? 0.2 : 1), 0, XMAX); p.lxr = xr;
      let x = p.fx;
      p.vel = p.vel * 0.6 + ((x - p.lx) / dtm) * 1000 * 0.4; p.mph = Math.abs(p.vel) / 50;
      if (p.mph >= 88 && !era && !round) { p.hit88 = true; fires.push({ x0: p.lsx, x1: px, life: 1.6 }); }
      if (!e.altKey && !fine) x = detent(v, p, x);
      p.lx = p.fx; p.lsx = px; v.dragX = x; v.dragY = py; if (p.moved) pluckDrag(v, Math.abs(p.vel));
      v.dropping = py > LB + SH * 0.55 && voices.filter(o => o.wT > 0).length > 1;
      break;
    }
    case 'scale':
      if (!p.axis && p.moved) p.axis = Math.abs(px - p.x0) >= Math.abs(py - p.y0) ? 'x' : 'y';
      if (p.axis === 'x') {
        const w = VIEW.x1 - VIEW.x0;
        if (zoomLevel() > 1.01) { const dc = (-dx * w) / PW; setView(VIEW.x0 + dc, w); p.vx = p.vx * 0.5 + (dc / (dtm / 1000)) * 0.5; }
        else VIEW.rubber = clamp(VIEW.rubber + dx * 0.35, -60, 60);
      } else if (p.axis === 'y') { zoomAt(zoomLevel() * Math.exp(-dy * 0.012), p.x0); if (zoomLevel() > 1.3) discover('x-pinch'); }
      break;
    case 'spin': {
      const a2 = Math.atan2(py - MY, px - MX); let d = a2 - p.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      p.a = a2; p.acc += d; mrot += d; p.av = p.av * 0.5 + (d / (dtm / 1000)) * 0.5;
      const st = TAU / 5; while (p.acc > st) { p.acc -= st; spinStep(1); } while (p.acc < -st) { p.acc += st; spinStep(-1); }
      break;
    }
    case 'harp': if (p.moved) harpAt(p.h, px, py); break;
    case 'view': viewMove(p, dx, dy, dtm, e); break;
    case 'node': { const L = LAT[p.i], a = (L.a * Math.PI) / 180, proj = (px - MX) * Math.cos(a) + (py - MY) * Math.sin(a); SET[L.k] = clamp((proj - MR * 1.3) / (MR * 0.6), 0, 1); if (t - (p.la || 0) > 0.1) { p.la = t; audio.applyMix(); } break; }
    case 'pet': pet.hx = clamp(px - p.dx, 20, W - 20); pet.hy = clamp(py - p.dy, TOPH + 30, H - 30); break;
    case 'guard': p.g.x = px - p.dx; p.g.y = py - p.dy; p.gvx = p.gvx * 0.5 + (dx / dtm) * 500; p.gvy = p.gvy * 0.5 + (dy / dtm) * 500; break;
    case 'hole': hole.x = clamp(px - p.dx, PX0, PX0 + PW); hole.y = clamp(py - p.dy, TOPH + 30, LT - 16); break;
  }
});
function endPtr(e) {
  const p = PTR.get(e.pointerId); if (!p) return;
  PTR.delete(e.pointerId);
  const now = performance.now(), dur = now - p.t0;
  if (three) { if (!p.moved && now - three.t0 < 520) { if (PTR.size === 0) { lean(1); discover('x-three'); caption('everyone leans.', 1400); haptic([8, 20, 8]); three = null; } } else three = null; }
  switch (p.role) {
    case 'pinch': { const o = PTR.get(p.id === pinch.a ? pinch.b : pinch.a); if (o) o.role = 'none'; pinch = null; break; }
    case 'view': viewUp(p, now); break;
    case 'voice': {
      const v = p.v; v.dragging = false; v.dragX = null; if (p.type === 'mouse') hitEl.style.cursor = 'grab';
      if (!p.moved && dur < 260) { if (now - (v.tapT || 0) < 340) { v.tapT = 0; if (lightGlide(v, v.x)) { caption('snapped to the nearest valley floor.', 1400); haptic(6); } } else v.tapT = now; }
      if (v.dropping) { v.dropping = false; dropVoice(v); haptic(10); }
      else {
        const stale = now - p.lt > 90;
        v.v = stale ? 0 : clamp(p.vel, -3200, 3200); v.temp = 0.3; v.hist.length = 0; v.histT.length = 0; v.relX = v.x; v.relT = t;
        if (!stale && Math.abs(p.vel) > 2200) discover('x-fling', v);
      }
      if (p.hit88) startEra();
      break;
    }
    case 'scale':
      if (!p.moved && dur < 320) {
        const x = xFromS(p.x);
        if (now - lastScaleTap < 330 && Math.abs(p.x - lastScaleTapX) < 34) easeZoom(zoomLevel() > 1.5 ? 1 : 4, p.x);
        else { audio.pip(fOf(x), 0.05, 0, 1.0); scaleMark = { x, life: 1 }; discover('x-scaletap'); emit('scaletap'); haptic(4); }
        lastScaleTap = now; lastScaleTapX = p.x;
      } else if (p.axis === 'x' && zoomLevel() > 1.01 && now - p.lt < 80) { VIEW.vel = clamp(p.vx, -7000, 7000); if (Math.abs(VIEW.vel) > 900) discover('x-flingscale'); }
      break;
    case 'spin': if (!p.moved) strum(); else if (now - p.lt < 90) mrotVel = clamp(p.av, -8, 8); break;
    case 'harp': if (!p.moved) lean(0.8); else { discover('x-harp'); jlog('played the sky harp'); } break;
    case 'node': audio.applyMix(); syncUI(); persistSoon(); discover('x-lattice'); jlog('lattice adjusted'); break;
    case 'pet': if (!p.moved) { if (now - pet.lastTap < 350) petPose(); else petTalk(); pet.lastTap = now; } break;
    case 'guard': {
      const g = p.g; g.drag = false;
      if (!p.moved && dur < 450) { guardTap(g); break; }
      const fast = Math.hypot(p.gvx, p.gvy) > 1500 && now - p.lt < 90, out = g.x < 8 || g.x > W - 8 || g.y < TOPH + 4 || g.y > H - 8;
      if (fast || out) {
        EAR.guards.splice(EAR.guards.indexOf(g), 1);
        for (let i = 0; i < 14; i++) sparks.push({ x: clamp(g.x, 0, W), y: clamp(g.y, 0, H), vx: rand(-80, 80) + p.gvx * 0.05, vy: rand(-80, 80) + p.gvy * 0.05, life: rand(0.4, 0.9), max: 0.9, c: [220, 230, 255] });
        if (!QUIET() && UNL.pet) { pet.say = `the ${GUARD[g.id].name} went to sleep.`; pet.sayUntil = t + 2.6; }
      } else { g.free = true; g.hx = g.x; g.hy = g.y; }
      persistGuards(); break;
    }
  }
}
hitEl.addEventListener('pointerup', endPtr);
hitEl.addEventListener('pointercancel', endPtr);
hitEl.addEventListener('lostpointercapture', e => { if (PTR.has(e.pointerId)) endPtr(e); });
['gesturestart', 'gesturechange'].forEach(n => document.addEventListener(n, e => e.preventDefault(), { passive: false }));
function hoverCursor(px, py) {
  let near = !!guardAt(px, py) || (UNL.pet && Math.hypot(px - pet.x, py - pet.y) < 34 * S) || (hole.on && Math.hypot(px - hole.x, py - hole.y) < holeRad() * 2.4);
  for (let i = 0; !near && i < 5; i++) { const q = latPos(i); if (Math.hypot(px - q[0], py - q[1]) < 18 * Math.max(S, 0.9)) near = true; }
  if (!near) for (const v of voices) { if (v.wT === 0) continue; const b = ballPos(v); if (Math.hypot(b.X - px, b.Y - py) < 30) { near = true; break; } }
  const reg = regionOf(px, py);
  hitEl.style.cursor = near ? 'grab' : reg === 'scale' ? 'ew-resize' : reg === 'terrain' ? 'crosshair' : reg === 'mandala' ? 'alias' : 'pointer';
}
function updateHover(px, py) {
  hoverTip = null;
  if (py < LT - 44 || py > LB + 4) return;
  let best = null, bd = 22;
  for (const h of valleyHits) { const d = Math.abs(h.X - px); if (d < bd) { bd = d; best = h; } }
  if (!best) return;
  const e = CAT.find(c => c.mode === M.key && c.kind === 'iv' && c.key === best.lab);
  let lines, isFound = true;
  if (e) { isFound = found.has(e.id); lines = isFound ? [e.name, e.line, e.fact] : ['???', e.hint, 'land a voice here to find out.']; }
  else lines = [best.lab, `${Math.round(best.cents)}¢ above the root`, M.n ? 'a step on the grid.' : 'a valley with no field-guide entry. not every valley gets one.'];
  hoverTip = { x: px, y: py, lines, found: isFound };
}
hitEl.addEventListener('pointerleave', () => { hoverTip = null; });
hitEl.addEventListener('wheel', e => {
  if (!entered) return;
  e.preventDefault();
  const px = e.clientX, py = e.clientY, k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1, dx = e.deltaX * k, dy = e.deltaY * k;
  lastUserT = t;
  if (inSoundBox(px, py)) { if (viewWheel(dy)) return; tupAcc += dy; if (Math.abs(tupAcc) > 60) { setTuplet(tuplet + (tupAcc < 0 ? 1 : -1)); tupAcc = 0; } return; }
  wheelView(dx, dy, px, e.shiftKey, e.ctrlKey);
}, { passive: false });
// wheel and buttons steer a target; the view eases toward it every frame, so a mouse notch glides instead of jumping
function easeZoom(z, px) { z = clamp(z, 1, 12); const w = XMAX / z, frac = clamp((px - PX0) / PW, 0, 1), c = xFromS(px); VIEW.tgt = { x0: clamp(c - frac * w, 0, XMAX - w), w }; if (z >= 6) discover('x-zoom'); }
function wheelView(dx, dy, px, shift, pinchZoom) {
  const T = VIEW.tgt || (VIEW.tgt = { x0: VIEW.x0, w: VIEW.x1 - VIEW.x0 });
  if (Math.abs(dx) > Math.abs(dy) || shift) { const d = Math.abs(dx) > Math.abs(dy) ? dx : dy; T.x0 = clamp(T.x0 + d * (T.w / PW), 0, XMAX - T.w); return; }
  const z = clamp((XMAX / T.w) * Math.exp(-dy * (pinchZoom ? 0.01 : 0.0016)), 1, 12), w = XMAX / z, frac = clamp((px - PX0) / PW, 0, 1), c = T.x0 + frac * T.w;
  T.w = w; T.x0 = clamp(c - frac * w, 0, XMAX - w);
  if (z >= 6) discover('x-zoom');
}

// ---------- the sheet (phones) and the window (desktop) ----------
function sheetDown(e) {
  if (!gw.classList.contains('sheet')) return;
  sheet.drag = { id: e.pointerId, y0: e.clientY, h0: sheet.h, on: false, lt: performance.now(), ly: e.clientY, v: 0 };
}
['grab', 'dock'].forEach(id => $(id).addEventListener('pointerdown', sheetDown));
window.addEventListener('pointermove', e => {
  const d = sheet.drag; if (!d || e.pointerId !== d.id) return;
  const dy = e.clientY - d.y0;
  if (!d.on && Math.abs(dy) > 7) { d.on = true; gw.classList.add('dragging'); try { gw.setPointerCapture(e.pointerId); } catch (er) {} }
  if (!d.on) return;
  const now = performance.now(); d.v = d.v * 0.5 + ((e.clientY - d.ly) / Math.max(8, now - d.lt)) * 0.5; d.ly = e.clientY; d.lt = now;
  sheet.h = clamp(d.h0 - dy, PEEK, sheetH('full')); gw.style.height = sheet.h + 'px';
});
function sheetUp(e) {
  const d = sheet.drag; if (!d || e.pointerId !== d.id) return;
  sheet.drag = null;
  if (!d.on) return;
  gw.classList.remove('dragging'); sheet.suppress = performance.now();
  const snaps = ['peek', 'half', 'full'].map(n => [n, sheetH(n)]);
  let target;
  if (d.v < -0.6) target = snaps.find(([, h]) => h > sheet.h + 10) || snaps[2];
  else if (d.v > 0.6) target = [...snaps].reverse().find(([, h]) => h < sheet.h - 10) || snaps[0];
  else target = snaps.reduce((a, b) => (Math.abs(b[1] - sheet.h) < Math.abs(a[1] - sheet.h) ? b : a));
  setSheet(target[0]);
}
window.addEventListener('pointerup', sheetUp);
window.addEventListener('pointercancel', sheetUp);
const tapOk = () => performance.now() - sheet.suppress > 320;
let gwDrag = null;
function showGw(toggle) {
  if (phone) { setSheet(sheet.name === 'peek' ? 'half' : 'peek'); return; }
  if (toggle && gw.classList.contains('on')) { gw.classList.remove('on'); return; }
  gw.classList.add('on');
  if (!gw.dataset.placed) { gw.dataset.placed = '1'; gw.classList.remove('min'); placeGw(W - (gw.offsetWidth || 288) - 14, 52); }
}
$('gwh').addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  const r = gw.getBoundingClientRect(); gwDrag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
  try { $('gwh').setPointerCapture(e.pointerId); } catch (er) {}
});
$('gwh').addEventListener('pointermove', e => { if (gwDrag && e.pointerId === gwDrag.id) placeGw(e.clientX - gwDrag.dx, e.clientY - gwDrag.dy); });
['pointerup', 'pointercancel'].forEach(n => $('gwh').addEventListener(n, e => { if (gwDrag && e.pointerId === gwDrag.id) gwDrag = null; }));
$('gwMin').addEventListener('click', e => { const m = gw.classList.toggle('min'); e.currentTarget.textContent = m ? '+' : '–'; placeGw(parseFloat(gw.style.left) || 0, parseFloat(gw.style.top) || 0); });

// ---------- the box pad ----------
const padEl = $('pad');
padEl.addEventListener('pointerdown', e => { BOX.drag = e.pointerId; BOX.auto = false; movePad(e); try { padEl.setPointerCapture(e.pointerId); } catch (er) {} syncUI(); });
padEl.addEventListener('pointermove', e => { if (BOX.drag === e.pointerId) movePad(e); });
['pointerup', 'pointercancel'].forEach(n => padEl.addEventListener(n, e => { if (BOX.drag === e.pointerId) { BOX.drag = null; persistSoon(); } }));

// ---------- keyboard ----------
window.addEventListener('keyup', e => { if (JAM.on) jamKey(e, false); });
window.addEventListener('keydown', e => {
  if (!entered) return;
  const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA') return;
  if (JAM.on && jamKey(e, true)) return;
  if (tg === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase(); lastUserT = t;
  if ($('book') && $('book').classList.contains('on')) { if (k === 'escape') bookClose(); return; }
  if (k === 'escape' && $('brookMap').classList.contains('on')) { closeBrook(); return; }
  if (k === 'escape' && $('liner').classList.contains('on')) { $('liner').classList.remove('on'); return; }
  if (k === 'escape' && MIR.open) { mirrorTable(false); return; }
  if (REEL.on && k === 'arrowright') { e.preventDefault(); reelSkip(); return; }   // the next reel; anything else hands it back to you
  if (REEL.on && k !== 'w' && k !== 'shift') { reelStop(false); if (k === 'escape') return; }
  if (k === ' ' || k === 'l') { e.preventDefault(); lean(1); userIdleUntil = t + 10; }
  else if (k === 'n') { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; }
  else if (k === 'p') startPump();
  else if (k === 'g') showGw(true);
  else if (k === 'a') { autoOn = !autoOn; syncUI(); }
  else if (k === 'm') toggleMute();
  else if (k >= '1' && k <= '6') setMode(MODE_ORDER[+k - 1]);
  else if (k === 'w') { if (REEL.on) reelStop(false); else reelStart(); }
  else if (k === 'b') toggleBeat();
  else if (k === 'r') toggleRound();
  else if (k === 'y' && UNL.rail) rail ? stopRail(false) : startRail();
  else if (k === 'h' && UNL.hole) setHole(!hole.on);
  else if (k === '+' || k === '=') wheelView(0, -254, PX0 + PW / 2);
  else if (k === '-') wheelView(0, 254, PX0 + PW / 2);
  else if (k === 'o') setNormie(!SET.normie);
  else if (k === 'f') nextMood();
  else if (k === 'v') listenToggle();
  else if (k === 'x') cycleView();
  else if (k === 't') doReplay();
  else if (k === 'q') setQuiet(!SET.quiet);
  else if (k === 'j') jamStart(jamOpen(JAM.sess) ? JAM.sess : 1);
  else if (k === 'k') mirrorTable();
  else if (k === 'd') setArtic(SET.artic === 'pluck' ? 'drone' : 'pluck');
  else if (k === 'c') ($('brookMap').classList.contains('on') ? closeBrook() : openBrook());
  else if (k === 'e') cycleLook();
  else if (k === 'escape') { if ($('result').classList.contains('on')) endRoundUI(false); if ($('story').classList.contains('on')) closeStory(); }
});

// ---------- buttons ----------
function toggleMute() { muted = !muted; audio.applyMix(); syncUI(); }
function toggleBeat() { rhy.on = !rhy.on; rhy.nextT = 0; syncUI(); }
function toggleRound() { if (round && !round.done) skipRound(); else if (round && round.done) endRoundUI(false); else startRound(); }
function doReplay() { if (capture.replay()) { caption('rewinding the last ten seconds.', 2400); discover('x-replay'); jlog('replayed the last 10 seconds'); } }
function toggleRec() {
  if (capture.recording()) { capture.stop(); return; }
  if (!CAP.dl && !CAP.selfHost) { caption("saving files isn't available here.", 2400); return; }
  const ok = capture.start(blob => { syncUI(); jlog('recording saved'); offerFile(`and-so-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`, blob); });
  caption(ok ? 'recording. press again to stop and save.' : "this browser can't record here.", 2400); if (ok) jlog('recording started'); syncUI();
}
const on = (id, fn) => $(id).addEventListener('click', e => { if (!tapOk()) return; fn(e); });
on('tMode', cycleMode);
on('tQuest', () => { questsPinned = !questsPinned; if (questsPinned && !QUIET()) $('quests').classList.add('on'); else questsHide(); });
on('tScore', () => caption(`resonance ${GAME.score.toLocaleString()} · ${GAME.rounds} rounds · ${GAME.stars} stars · best combo ×${GAME.best}`, 3200));
on('tSound', toggleMute);
on('qHide', () => { questsPinned = false; questsHide(); });
on('bLean', () => { lean(1); userIdleUntil = t + 10; });
on('bNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; });
on('bPump', startPump);
on('bBeat', toggleBeat);
on('bRound', toggleRound);
on('bRail', () => (rail ? stopRail(false) : startRail()));
on('bNorm', () => setNormie(!SET.normie));
on('bFrol', nextMood);
on('bListen', listenToggle);
on('lDemo', () => listenStart('demo'));
on('lMic', () => listenStart('mic'));
on('lStop', () => listenStop());
document.querySelectorAll('#lFollow .pill').forEach(b => b.addEventListener('click', () => { if (tapOk()) setFollow(b.dataset.fl); }));
on('bRep', doReplay);
on('bGam', () => showGw(true));
on('bAuto', () => { autoOn = !autoOn; syncUI(); });
on('bSnd', toggleMute);
on('dLean', () => { lean(1); userIdleUntil = t + 10; haptic(6); });
on('dNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; haptic(6); });
on('dRound', toggleRound);
on('dBeat', toggleBeat);
on('dMood', nextMood);
on('dMore', () => setSheet(sheet.name === 'peek' ? 'half' : 'peek'));
on('rHear', hearTarget);
on('rSkip', skipRound);
on('resNext', () => endRoundUI(true));
on('resDone', () => endRoundUI(false));
on('gRound', toggleRound);
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => { if (tapOk()) setMode(b.dataset.m); }));
$('sFlip').addEventListener('change', e => { SET.flip = e.target.checked; flipAt = t + 20; persistSoon(); });
on('mLight', () => { if (SET.normie) setNormie(false); setMood('light'); });
on('mLean', () => { if (SET.normie) setNormie(false); setMood('lean'); });
on('mFrol', () => setMood('frolic'));
on('mNorm', () => setNormie(!SET.normie));
on('bSkip', () => { allUnlocked = true; persistSoon(); checkUnlocks(false); caption('everything unlocked. the game respects your time.', 3000); });
on('gReset', () => { found.clear(); GAME.reelFound.length = 0; gDeg = new Set([0]); modesSeen = new Set([M.key]); bird.sung = false; persistSoon(); renderGuide(); reelUI(); caption('field guide wiped. everything is undiscovered again.', 3000); });
const bindRange = (id, key) => { const el = $(id); el.addEventListener('input', () => { SET[key] = el.value / 100; audio.applyMix(); }); el.addEventListener('change', persistSoon); };
[['sShim', 'shim'], ['sSpace', 'space'], ['sTease', 'tease'], ['sPace', 'pace'], ['sWarm', 'warm'], ['sVol', 'vol'], ['sTune', 'tune']].forEach(([i, k]) => bindRange(i, k));
const bindSw = (id, key, after) => $(id).addEventListener('change', e => { SET[key] = e.target.checked; audio.applyMix(); if (after) after(); persistSoon(); });
bindSw('sHp', 'hp', () => caption(SET.hp ? "binaural split on. each voice's two tunings now live in different ears." : 'binaural split off.', 3200));
bindSw('sSpark', 'sparkle'); bindSw('sChime', 'chimes'); bindSw('sBird', 'bird'); bindSw('sReg', 'reg'); bindSw('sHap', 'haptics');
bindSw('sBells', 'bells', () => { if (SET.bells) bellNext = t + 3; });
bindSw('sWind', 'wind', () => { if (SET.wind) windNext = t + 1; });
bindSw('sRain', 'rain');
bindSw('sTrain', 'train', () => { if (SET.train) trainNext = t + 4; });
document.querySelectorAll('[data-ref]').forEach(b => b.addEventListener('click', () => setRef(+b.dataset.ref)));
on('refSet', () => setRef($('refC').value));
$('sRhy').addEventListener('change', e => { rhy.on = e.target.checked; rhy.nextT = 0; syncUI(); });
$('sHole').addEventListener('change', e => setHole(e.target.checked));
$('sPetLock').addEventListener('change', e => { pet.lock = e.target.checked; });
document.querySelectorAll('#formBtns .pill').forEach(b => b.addEventListener('click', () => { SET.petForm = b.dataset.f; pet.lock = false; syncUI(); persistSoon(); jlog(`saelion: ${b.textContent}`); }));
on('bPose', petPose);
on('bTalk', petTalk);
on('askBtn', () => { const q = $('askIn').value.trim(); if (q) askSaelion(q); });
$('askIn').addEventListener('keydown', e => { if (e.key === 'Enter') { const q = $('askIn').value.trim(); if (q) askSaelion(q); } });
document.querySelectorAll('#themeBtns .pill').forEach(b => b.addEventListener('click', () => setSkin(b.dataset.th)));
on('rRec', toggleRec);
on('rRep', doReplay);
on('jExp', () => offerFile('and-so-journal.txt', `AND SO · Saedo's journal\n${new Date().toISOString()}\n\n${journal.join('\n')}\n`));
on('jCopy', () => { const txt = journal.join('\n') || 'nothing yet.'; try { navigator.clipboard.writeText(txt).then(() => caption('journal copied.', 1600), () => caption("couldn't copy here.", 1800)); } catch (er) { caption("couldn't copy here.", 1800); } });
on('stOpen', () => openStory(storyCur));
on('stRead', readStoryAloud);
on('stNew', () => { $('stPane').classList.add('hidden'); $('stText').classList.remove('hidden'); newStory(); });
on('stPaste', () => { $('stPane').classList.add('hidden'); $('stText').classList.remove('hidden'); $('stText').focus(); });
on('stStop', () => { try { if (window.Storeybrook) Storeybrook.read.stop(); else speechSynthesis.cancel(); } catch (er) {} $('stRead').textContent = 'read to me'; });
on('stClose', closeStory);
on('pLoad', () => { const v = $('pSel').value; if (!v) return; const n = v.slice(2); applyPreset(v[0] === 'b' ? BUILTIN[n] : userP[n], n); });
on('pSave', () => { const n = ($('pName').value || '').trim().slice(0, 28) || `vibe ${Object.keys(userP).length + 1}`; userP[n] = capturePreset(); persistSoon(); renderPresets(); $('pSel').value = 'u:' + n; $('pName').value = ''; caption(`saved: ${n}`, 2000); });
on('pDel', () => { const v = $('pSel').value; if (!v || v[0] !== 'u') { caption("built-ins can't be deleted. they're load-bearing.", 2400); return; } delete userP[v.slice(2)]; persistSoon(); renderPresets(); });
on('bRestart', restartAll);
on('zIn', () => wheelView(0, -294, PX0 + PW / 2)); on('zOut', () => wheelView(0, 294, PX0 + PW / 2)); on('zReset', () => { VIEW.tgt = { x0: 0, w: XMAX }; });
on('viewChip', e => { cycleView(); e.currentTarget.blur(); });
document.querySelectorAll('#viewBtns .pill').forEach(b => b.addEventListener('click', () => { if (tapOk()) setViewMode(b.dataset.view); }));
document.querySelectorAll('#cymShape .pill').forEach(b => b.addEventListener('click', () => { if (!tapOk()) return; SET.cymShape = b.dataset.shape; cymReset(); persistSoon(); syncUI(); }));
$('sCymLines').addEventListener('change', e => { SET.cymLines = e.target.checked; CY.glowKey = ''; persistSoon(); });
$('sCymPowder').addEventListener('change', e => { SET.cymPowder = e.target.checked; persistSoon(); if (SET.cymPowder) caption('fine powder: it rides the air currents to the antinodes, the opposite of sand.', 3000); });
on('cymSprinkle', () => { cymReset(); caption('fresh sand, evenly spread. watch it find the still lines.', 2400); });
$('sX5d').addEventListener('change', e => setX5d(e.target.checked));
$('sX5dSpeed').addEventListener('input', e => { SET.x5dSpeed = e.target.value / 100; }); $('sX5dSpeed').addEventListener('change', persistSoon);
$('sX5dDepth').addEventListener('input', e => { SET.x5dDepth = e.target.value / 100; }); $('sX5dDepth').addEventListener('change', persistSoon);
$('sDetect').addEventListener('change', e => { SET.detect = e.target.checked; persistSoon(); });
document.querySelectorAll('#tabs .tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; syncUI(); }));
on('pbPlay', () => { if (!A.ac) return; paused = !paused; if (paused) A.ac.suspend(); else A.ac.resume(); syncUI(); jlog(paused ? 'paused' : 'resumed'); });
on('pbStop', () => { if (!A.ac) return; paused = true; A.ac.suspend(); if ('speechSynthesis' in window) speechSynthesis.cancel(); caption('stopped. press play to pick it back up.', 2600); syncUI(); jlog('stopped'); });
$('pbVol').addEventListener('input', e => { SET.vol = e.target.value / 100; audio.applyMix(); $('pbVolP').textContent = e.target.value + '%'; });
$('pbScene').addEventListener('change', e => { const v = e.target.value; if (!v) return; const n = v.slice(2); applyPreset(v[0] === 'b' ? BUILTIN[n] : userP[n], n); });
on('pbRec', toggleRec);
on('pbRep', doReplay);
window.addEventListener('resize', resize);
