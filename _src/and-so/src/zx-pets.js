// ===== AND SO 10.2 · The Band: the family's crossing pets come to play in their own face =====
// Storeybrook's seven day pets, Depthfield's five night pets and Hypermetapunk's five dusk pets share one save on this
// site, localStorage 'crossing:pets' ({ found: { 'sb:egg': ts, 'df:firefly': ts, 'hmp:stamp-crab': ts, … } }). The ones
// found on the kits' own pages come to AND SO and stand on the hilltops of their own face, dancing to the beat with a
// swing; touch one and it plays a lick in the tuning you are in, with the harmonic seventh as its blue note where the
// tuning has one. Each kit draws its own pets (`<Kit>.pets.draw`, the family's pets contract, family plan F9), vendored
// by version and listed in build.py. A pet found in another tab arrives while you play. All seventeen open the lattice:
// every pet in every face (also `?lattice=1`, the link the kits show when all seventeen are found).
// Your own pet wears the face too: a die-cut sticker at dusk (Hypermetapunk's pen.sticker), moonlit at night
// (Depthfield's pen.rim), the watercolour chimera by day as before.
const KIT_API = { sb: () => window.Storeybrook && window.Storeybrook.pets, df: () => window.Depthfield && window.Depthfield.pets, hmp: () => window.Hypermetapunk && window.Hypermetapunk.pets };
const FACE_KIT = { 'sb-daylight': 'sb', 'hm-dusk': 'hmp', 'df-night': 'df' };
const KIT_SITE = { sb: 'https://stevoblevo.github.io/storeybrook/', hmp: 'https://stevoblevo.github.io/hypermetapunk/', df: 'https://stevoblevo.github.io/depthfield/' };
const KIT_SET = { sb: ['day pets', 'Storeybrook', 7], hmp: ['dusk pets', 'Hypermetapunk', 5], df: ['night pets', 'Depthfield', 5] };
const KIT_LOOK = { sb: 'daylight', hmp: 'dusk', df: 'night' };
const XP = { found: {}, sig: '', readT: -99, band: [], crestT: -99, lattice: /[?&]lattice=1\b/.test(location.search), hits: [], ghost: null, ghostT: 40, booted: false };
const xpList = k => { const a = KIT_API[k](); return a && Array.isArray(a.list) ? a.list : []; };
const xpPet = (k, id) => xpList(k).find(p => p.id === id);
function xpRead(force) {
  if (!force && t - XP.readT < 1.5) return false;
  XP.readT = t;
  let f = {}; try { const s = JSON.parse(localStorage.getItem('crossing:pets') || '{}'); if (s && s.found && typeof s.found === 'object') f = s.found; } catch (e) {}
  const sig = Object.keys(f).sort().join('|'); if (sig === XP.sig) return false;
  const was = XP.found; XP.found = f; XP.sig = sig;
  if (XP.booted) for (const key in f) if (!was[key]) xpArrived(key);   // found on a kit's page while AND SO was open
  XP.booted = true; xpLatticeCheck(); petRowsPaint(); return true;
}
const xpHas = (k, id) => !!XP.found[k + ':' + id];
function xpCount(k) { return xpList(k).filter(p => xpHas(k, p.id)).length; }
function xpLatticeCheck() {
  const all = ['sb', 'hmp', 'df'].every(k => xpList(k).length && xpCount(k) === xpList(k).length);
  if (all) { XP.lattice = true; if (entered) discover('x-lattice'); }
}
function xpArrived(key) {
  const [k, id] = key.split(':'), p = xpPet(k, id); if (!p) return;
  caption(`${p.name} came across from ${KIT_SET[k][1]}.${FACE_KIT[skin] === k || XP.lattice ? ' look at the hills.' : ''}`, 3600);
  discover('x-crossing'); XP.crestT = -99;
}
// who is on the hills now: the face's own kit, or everyone in the lattice
function xpWho() {
  const kits = XP.lattice ? ['sb', 'hmp', 'df'] : FACE_KIT[skin] ? [FACE_KIT[skin]] : [];
  const out = []; for (const k of kits) for (const p of xpList(k)) if (xpHas(k, p.id)) out.push({ k, id: p.id }); return out;
}
// the hilltops: the crests of the terrain you are playing, away from the voices (they live in the valleys)
function xpCrests(n) {
  const A0 = act, xs = [], lo = Math.max(2, Math.round(((VIEW.rubber < 0 ? -VIEW.rubber : 0)) / PW * NS)), hi = NS - 3;
  const y = s => A0 && A0.disp ? LB - hgt(A0.disp[s], A0) * (LB - LT) * 0.92 : LT + 10;
  for (let s = lo; s <= hi; s++) { const Y = y(s); if (Y <= y(s - 1) && Y <= y(s + 1) && Y <= y(s - 2) && Y <= y(s + 2)) xs.push([sx(s), Y]); }
  const busy = voices.filter(v => v.wT > 0).map(v => xToS(v.x)), gap = Math.max(phone ? 44 : 70, PW / (n + 3)), pick = [], sz = petSize();
  // and out from under the panels that float over the hills (quests, the gamut, the zoom pill, a card)
  const panels = ['quests', 'gw', 'zc', 'first', 'toast'].map(id => $(id)).filter(el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && +getComputedStyle(el).opacity > 0.05).map(el => el.getBoundingClientRect());
  const covered = (x, y) => panels.some(r => x + sz * 0.5 > r.left - 6 && x - sz * 0.5 < r.right + 6 && y > r.top - 6 && y - sz * 1.1 < r.bottom + 6);
  xs.sort((a, b) => a[1] - b[1]);
  for (const c of xs) { if (pick.length >= n) break; if (c[0] < PX0 + 18 || c[0] > PX0 + PW - 18) continue; if (busy.some(x => Math.abs(x - c[0]) < 26)) continue; if (covered(c[0], c[1])) continue; if (pick.some(q => Math.abs(q[0] - c[0]) < gap)) continue; pick.push(c); }
  for (let i = 0; pick.length < n && i < n * 2; i++) { const X = PX0 + PW * ((i + 0.5) / (n * 2)), s = clamp(Math.round((X - PX0) / PW * (NS - 1)), 0, NS - 1); if (!pick.some(q => Math.abs(q[0] - X) < gap * 0.6)) pick.push([X, y(s)]); }
  return pick.sort((a, b) => a[0] - b[0]);
}
function xpTick(dt) {
  dtLast = dt || 1 / 60; if (!entered) return;
  xpRead(false);
  const who = xpWho(), key = who.map(m => m.k + m.id).join(',');
  if (key !== XP.band.map(m => m.k + m.id).join(',')) {
    const old = new Map(XP.band.map(m => [m.k + m.id, m]));
    XP.band = who.map(m => old.get(m.k + m.id) || { ...m, x: W + 60, y: LT, tx: 0, ty: 0, fx: 0, fy: 0, hopT: -9, note: 0, sway: Math.random() * 6 });
    XP.crestT = -99;
  }
  if (XP.band.length && t - XP.crestT > 0.45) {
    XP.crestT = t; const c = xpCrests(XP.band.length);
    XP.band.forEach((m, i) => { const [X, Y] = c[i] || [m.x, m.y]; if (Math.abs(X - m.tx) > 6 || Math.abs(Y - m.ty) > 14) { m.fx = m.x; m.fy = m.y; m.tx = X; m.ty = Y; m.hopT = t; } });
  }
  for (const m of XP.band) {
    const k = clamp((t - m.hopT) / 0.55, 0, 1), e = k * k * (3 - 2 * k);
    if (k < 1) { m.x = m.fx + (m.tx - m.fx) * e; m.y = m.fy + (m.ty - m.fy) * e - Math.sin(k * Math.PI) * Math.min(46, 12 + Math.abs(m.tx - m.fx) * 0.12); }
    else { m.x = m.tx; m.y = m.ty; }
    m.note *= Math.exp(-dtLast * 6);
  }
  ghostTick();
}
let dtLast = 1 / 60;
const petSize = () => (phone ? 30 : 40) * Math.max(0.85, Math.min(S, 1.4));
function drawBand(g) {
  XP.hits.length = 0;
  if (!entered || REEL.on || !XP.band.length && !XP.ghost) return;
  const sz = petSize(), still = reduceMotion, beat = rhyActive() ? beatPulse : 0;
  for (const m of XP.band) {
    const api = KIT_API[m.k](); if (!api || !api.draw) continue;
    const look = XP.lattice ? KIT_LOOK[m.k] : skin === 'hm-dusk' ? 'dusk' : skin === 'df-night' ? 'night' : 'daylight';
    try { api.draw(g, m.id, { x: m.x, y: m.y - sz * 0.5, size: sz, t: t + m.sway, beat: Math.max(beat, m.note), look, still, alpha: 1, lookX: lastPX, lookY: lastPY }); } catch (e) {}
    XP.hits.push({ m, x: m.x, y: m.y - sz * 0.5, r: Math.max(26, sz * 0.62) });
  }
  if (XP.ghost) drawGhost(g, sz);
}
// a faint visitor: now and then a pet you have not found yet walks over the hills of its own face. touch it to learn
// where it lives.
function ghostTick() {
  const k = FACE_KIT[skin];
  if (XP.ghost) { const G = XP.ghost; G.x += (G.dir * (phone ? 38 : 56)) * dtLast; if (G.k !== k || G.x < PX0 - 80 || G.x > PX0 + PW + 80) { XP.ghost = null; XP.ghostT = t + 45 + Math.random() * 40; } return; }
  if (!k || XP.lattice || QUIET() || FIRST.on || t < XP.ghostT) return;
  const left = xpList(k).filter(p => !xpHas(k, p.id)); if (!left.length) { XP.ghostT = t + 60; return; }
  const p = left[Math.floor(Math.random() * left.length)], dir = Math.random() < 0.5 ? 1 : -1;
  XP.ghost = { k, id: p.id, dir, x: dir > 0 ? PX0 - 60 : PX0 + PW + 60 };
}
function drawGhost(g, sz) {
  const G = XP.ghost, api = KIT_API[G.k](); if (!api || !api.draw) return;
  const s = clamp(Math.round((G.x - PX0) / PW * (NS - 1)), 0, NS - 1), y = act && act.disp ? LB - hgt(act.disp[s], act) * (LB - LT) * 0.92 : LT;
  const hop = reduceMotion ? 0 : Math.abs(Math.sin(t * 5.2)) * sz * 0.12;
  try { api.draw(g, G.id, { x: G.x, y: y - sz * 0.5 - hop, size: sz * 0.9, t, beat: 0, look: KIT_LOOK[G.k], still: reduceMotion, alpha: 0.3 }); } catch (e) {}
  XP.hits.push({ ghost: G, x: G.x, y: y - sz * 0.5, r: Math.max(28, sz * 0.7) });
}
function petBandTap(px, py) {
  let h = null, best = 1e9;   // the nearest one under the finger; a visitor wins a tie
  for (const c of XP.hits) { const d = Math.hypot(px - c.x, py - c.y) - (c.ghost ? 8 : 0); if (d <= c.r && d < best) { best = d; h = c; } }
  if (h) {
    if (h.ghost) {
      const p = xpPet(h.ghost.k, h.ghost.id); if (!p) return false;
      caption(`a visitor: ${p.name}. it lives at ${KIT_SET[h.ghost.k][1]}. ${p.how}`, 5200); discover('x-visitor');
      XP.ghost = null; XP.ghostT = t + 50; return true;
    }
    const p = xpPet(h.m.k, h.m.id); petLick(h.m); if (p) caption(`${p.name}. ${p.line}`, 2600); discover('x-band'); return true;
  }
  return false;
}
// ---------- a lick in the tuning you are in ----------
// Five shapes over the tuning's own scale (bellScale), swung: eighth notes in a long-short 2:1, a little behind the beat.
// 'b' is the blue note: the harmonic seventh, 7/4, 31 cents flatter than the piano's minor seventh, in just and in easy
// listening; the other tunings play their own sixth degree there. Day pets play the keys, dusk pets the keys over a
// walking bass note, night pets the glass bells.
const LICKS = [[0, 2, 4, 'b', 5, 4], [5, 4, 'b', 3, 2, 0], [0, 4, 2, 5, 'b', 7], [2, 3, 4, 'b', 4, 2, 0], [4, 5, 7, 6, 'b', 4, 5]];
function petLick(m) {
  if (!A.ac || muted) { m.note = 1; return; }
  const sc = bellScale().slice().reverse(), at = i => i === 'b' ? (M.key === 'just' || M.easy ? 7 / 4 : sc[4]) : i <= 5 ? sc[i] : sc[i - 5] * sc[5];
  let hsh = 0; for (const ch of m.k + m.id) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  const L = LICKS[hsh % LICKS.length], spb = 60 / (rhyActive() ? rhy.bpm : 108), lay = 0.025, base = fRoot * (m.k === 'df' ? 2 : 1) * (fRoot < 160 ? 2 : 1);
  const t0 = A.ac.currentTime + 0.04;
  L.forEach((d, i) => {
    const when = t0 + Math.floor(i / 2) * spb + (i % 2 ? spb * (2 / 3) : 0) + lay, f = base * at(d), v = i === L.length - 1 ? 1.25 : i % 2 ? 0.8 : 1.05;
    if (m.k === 'df') bell3(f, 0.034 * v, when - A.ac.currentTime);
    else { keysAt(when, f, 1.5 * v); if (m.k === 'hmp' && i % 2 === 0) bassAt(when, base / 2 * at(d === 'b' ? 0 : Math.min(+d, 4)), 0.55, spb * 0.6); }
    setTimeout(() => { m.note = 1; }, Math.max(0, (when - A.ac.currentTime) * 1000));
  });
}
// ---------- your own pet wears the face ----------
const PETDRESS = { cv: null, g: null, w: 0, h: 0 };
function drawPetFace(g) {
  const P = kitLook() ? facePen() : null, fn = P && (skin === 'hm-dusk' ? P.sticker : P.rim);
  if (!fn || !entered || !pet.placed || typeof lightPet === 'function' && lightPet()) { drawPet(g); return; }
  const sc = S * (phone ? 1 : 1.15), bw = Math.ceil(230 * sc), bh = Math.ceil(210 * sc), dpr = Math.min(2, DPR || 1);
  if (!PETDRESS.cv) { PETDRESS.cv = document.createElement('canvas'); PETDRESS.g = PETDRESS.cv.getContext('2d'); }
  const C = PETDRESS.cv, G = PETDRESS.g;
  if (PETDRESS.w !== bw || PETDRESS.h !== bh) { C.width = Math.ceil(bw * dpr); C.height = Math.ceil(bh * dpr); PETDRESS.w = bw; PETDRESS.h = bh; }
  G.setTransform(dpr, 0, 0, dpr, 0, 0); G.clearRect(0, 0, bw, bh);
  const cx = bw / 2, cy = bh * 0.56;
  G.save(); G.translate(cx - pet.x, cy - pet.y); drawPet(G); G.restore();
  const x = pet.x, y = pet.y - (cy - bh / 2);
  try {
    if (skin === 'hm-dusk') P.sticker(g, C, x, y, { w: bw, h: bh, keyline: Math.max(2.5, 3.2 * sc), slap: Math.max(4, 6 * sc), slip: reduceMotion ? 0 : 1.2 + 1.6 * beatPulse, angle: reduceMotion ? 0 : Math.sin(t * 0.9) * 0.025 });
    else { const o = FACE.orb || { x: W * 0.72, y: TOPH }; P.rim(g, C, x, y, { w: bw, h: bh, lx: o.x, ly: o.y, weather: WX.w, ground: pet.y + 28 * sc, amount: 0.85 }); }
  } catch (e) { g.drawImage(C, x - bw / 2, y - bh / 2, bw, bh); }
}
// ---------- the pets in the gamut ----------
function petRowsPaint() {
  const host = $('petRows'); if (!host) return;
  const dpr = Math.min(2, DPR || 1), rows = [];
  host.textContent = '';
  for (const k of ['sb', 'hmp', 'df']) {
    const list = xpList(k), n = xpCount(k), [what, kit, total] = KIT_SET[k];
    const row = document.createElement('div'); row.className = 'petrow';
    const head = document.createElement('div'); head.className = 'petrow-h';
    head.innerHTML = `<span>${what} · ${kit}</span><b>${list.length ? n : 0} of ${list.length || total}</b>`;
    const a = document.createElement('a'); a.href = KIT_SITE[k]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = n < (list.length || total) ? 'find them' : 'visit'; head.appendChild(a);
    row.appendChild(head);
    const chips = document.createElement('div'); chips.className = 'petchips';
    for (const p of list) {
      const has = xpHas(k, p.id), c = document.createElement('canvas'), sz = 40;
      c.width = sz * dpr; c.height = sz * dpr; c.className = 'petchip' + (has ? ' on' : ''); c.title = has ? `${p.name}: ${p.line}` : `still out there. ${p.how}`;
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', has ? p.name : 'a pet still out there');
      chips.appendChild(c); rows.push([k, p.id, c, has]);
    }
    if (!list.length) { const s = document.createElement('span'); s.className = 'petnone'; s.textContent = 'this kit’s pets are not on this page yet.'; chips.appendChild(s); }
    row.appendChild(chips); host.appendChild(row);
  }
  const lat = document.createElement('div'); lat.className = 'note';
  lat.textContent = XP.lattice ? 'the lattice is open: every pet you found plays in every face.' : 'all seventeen open the lattice: every pet in every face.';
  host.appendChild(lat);
  const draw = () => rows.forEach(([k, id, c, has]) => { const g = c.getContext('2d'), api = KIT_API[k](); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 40, 40); if (!api || !api.draw) return; try { api.draw(g, id, { x: 20, y: 21, size: 30, t: 0, beat: 0, look: KIT_LOOK[k], still: true, alpha: has ? 1 : 0.16 }); } catch (e) {} });
  draw(); setTimeout(draw, 900); setTimeout(draw, 2600);   // Storeybrook's pets are pictures that load
}
addEventListener('storage', e => { if (e.key === 'crossing:pets') xpRead(true); });
