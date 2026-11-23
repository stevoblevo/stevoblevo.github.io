// ===== AND SO 10 · Three Faces: the toolkit family draws the same state =====
// Storeybrook is the day, Depthfield the night, Hypermetapunk the dusk. The night and the dusk are drawn by the kits'
// own pens (vendor/depthfield-pen-*.js and vendor/hypermetapunk-pen-*.js, pinned by version in build.py), so the canvas
// stands in the same world as each kit's own pages. One state: the voices, the valleys, the finds and the sound do not
// change when the face does. If a pen is missing (an old mirror copy, say) the plain night is drawn instead.
const FACES = [{ id: 'sb-daylight', kit: 'Storeybrook', name: 'day' }, { id: 'hm-dusk', kit: 'Hypermetapunk', name: 'dusk' }, { id: 'df-night', kit: 'Depthfield', name: 'night' }];
const KIT_NAMES = { 'df-night': 'Depthfield night', 'hm-dusk': 'Hypermetapunk dusk' };
const FACE = { seen: new Set(), df: null, hm: null, orb: null, setT: 0 };   // orb: where the sun or the moon stands, for a touch
const kitLook = () => skin === 'df-night' || skin === 'hm-dusk';
function facePen() {
  try {
    if (skin === 'df-night') return FACE.df || (FACE.df = window.Depthfield && window.Depthfield.pen ? window.Depthfield.pen('night') : null);
    if (skin === 'hm-dusk') return FACE.hm || (FACE.hm = window.Hypermetapunk && window.Hypermetapunk.pen ? window.Hypermetapunk.pen('dusk') : null);
  } catch (e) {}
  return null;
}
// the ground of a kit face. false when the kit's pen is not on the page.
function drawFaceBg() {
  const P = facePen(); if (!P) return false;
  const tt = reduceMotion ? 0 : t;
  if (skin === 'df-night') {
    // Depthfield's world at night. The room's weather still follows the music (peach when it plays, red rain when it
    // is tense, a mint clearing on a settled chord, the night garden when it is quiet), but here it only tints the
    // night: the near ridge falls to the void under the terrain, so the instrument always reads.
    const w = WX.w, wx = [w[0] * 0.1, w[1] * 0.5, w[2] * 0.5, w[3] + w[0] * 0.9 + (w[1] + w[2]) * 0.5];
    P.sky(ctx, { x: 0, y: 0, w: W, h: Math.max(LT, 200), weather: wx });
    const mr = Math.max(22, Math.min(W, H) * 0.045), mx0 = (phone ? 0.78 : 0.72) * W + MO.px * 14, my0 = TOPH + (LT - TOPH) * (phone ? 0.42 : 0.2);
    P.sun(ctx, { x: mx0, y: my0, r: mr, w: W, h: H, weather: wx });
    FACE.orb = { x: mx0, y: my0, hit: Math.max(34, mr * 1.4), maxY: LT };
    P.stars(ctx, { x: 0, y: TOPH, w: W, h: LT, weather: wx, t: tt, alpha: 0.25 + 0.75 * wx[3] });
    P.ridges(ctx, { x: 0, y: 0, w: W, h: H, weather: wx, t: tt, par: (WX.mx - 0.5) + MO.px * 0.4, base: [(LT * 0.8) / H, (LT * 0.93) / H, (LT * 1.05) / H], amp: [0.085, 0.065, 0.05] });
    WX.w = wx; drawWxParts(wxPal(), false); WX.w = w;   // fireflies, with rain or motes when the music calls them
    return true;
  }
  // Hypermetapunk's horizon: toner bands down to a horizon inside the terrain, the banded sun standing on it, and the
  // grid floor running out under the hills. The sky is eased so the hot bands stay by the horizon and the words above
  // it sit on the dark.
  const hy = Math.round(LT + (LB - LT) * 0.3), r = Math.max(40, Math.min(MR * 0.72, W * (phone ? 0.11 : 0.14))), sx = phone ? W - r - 14 : Math.min(W - r - 50, MX + MR * 2.45);
  // a touched sun sets: it sinks behind the floor and the sky cools, then the night comes up
  const sink = FACE.setT ? clamp((t - FACE.setT) / 0.8, 0, 1) : 0, sk = sink * sink;
  P.sky(ctx, { x: 0, y: 0, w: W, h: hy, steps: 18, span: 0.8 - 0.34 * sk, ease: 2.6 });
  P.sun(ctx, { x: sx, y: hy + r * 2.1 * sk, r });
  FACE.orb = { x: sx, y: hy - r, hit: r, maxY: hy };
  ctx.fillStyle = P.rgb('void'); ctx.fillRect(0, hy, W, H - hy);
  P.floor(ctx, { x: 0, y: hy, w: W, h: H - hy, vx: sx, t: tt, rows: 10 });
  P.grain(ctx, { w: W, h: H, amount: 0.14 });
  return true;
}
function cycleFace() {
  const i = FACES.findIndex(f => f.id === skin), nx = FACES[(i + 1) % FACES.length].id;
  turnPage(() => setSkin(nx, true));
}
// the sun at dusk and the moon at night can be touched: the sun sets into the night, the moon gives way to the day
function faceTap(px, py) {
  const o = FACE.orb; if (!kitLook() || !o || FACE.setT || py > o.maxY || Math.hypot(px - o.x, py - o.y) > o.hit) return false;
  if (skin === 'hm-dusk') {
    FACE.setT = t; discover('x-sunset');
    setTimeout(() => { FACE.setT = 0; if (skin === 'hm-dusk') turnPage(() => setSkin('df-night', true)); }, reduceMotion ? 0 : 820);
  } else turnPage(() => setSkin('sb-daylight', true));
  return true;
}
function faceSeen(s) {
  FACE.orb = null; FACE.setT = 0;
  if (!entered || REEL.on || !FACES.some(f => f.id === s)) return;
  FACE.seen.add(s);
  if (KIT_NAMES[s]) caption(`${KIT_NAMES[s]}. the same voices, the same valleys.`, 3000);
  if (FACE.seen.size >= 3) discover('x-faces');
}
function facesUI() { document.querySelectorAll('#faceBtns .pill').forEach(b => { const on = b.dataset.face === skin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }
document.querySelectorAll('#faceBtns .pill').forEach(b => b.addEventListener('click', () => { if (b.dataset.face !== skin) turnPage(() => setSkin(b.dataset.face, true)); }));
