// ===== AND SO 10 · Three Faces: the toolkit family draws the same state =====
// Storeybrook is the day, Depthfield the night, Hypermetapunk the dusk. The night and the dusk are drawn by the kits'
// own pens (vendor/depthfield-pen-*.js and vendor/hypermetapunk-pen-*.js, pinned by version in build.py), so the canvas
// stands in the same world as each kit's own pages. One state: the voices, the valleys, the finds and the sound do not
// change when the face does. If a pen is missing (an old mirror copy, say) the plain night is drawn instead.
const FACES = [{ id: 'sb-daylight', kit: 'Storeybrook', name: 'day' }, { id: 'hm-dusk', kit: 'Hypermetapunk', name: 'dusk' }, { id: 'df-night', kit: 'Depthfield', name: 'night' }];
const KIT_NAMES = { 'df-night': 'Depthfield night', 'hm-dusk': 'Hypermetapunk dusk' };
const FACE = { seen: new Set(), df: null, hm: null, orb: null, setT: 0, clock: '' };   // orb: where the sun or the moon stands, for a touch
const faceLook = () => FACES.some(f => f.id === skin);
const kitLook = () => skin === 'df-night' || skin === 'hm-dusk';
function facePen() {
  try {
    if (skin === 'df-night') return FACE.df || (FACE.df = window.Depthfield && window.Depthfield.pen ? window.Depthfield.pen('night') : null);
    if (skin === 'hm-dusk') return FACE.hm || (FACE.hm = window.Hypermetapunk && window.Hypermetapunk.pen ? window.Hypermetapunk.pen('dusk') : null);
  } catch (e) {}
  return null;
}
// The instrument's own three inks (the cream of its words, its gold, its mint) are written all through the drawing code
// as night colours. On a kit face they are swapped for the kit's ink, accent and cue as they reach the canvas, so the
// words, ticks and highlights are printed in the kit's inks without a second copy of the drawing. Voices keep their own
// colours: they are the state, not the face.
const KIT_INKS = {
  'hm-dusk': [['234,220,198', '247,242,255'], ['248,232,204', '247,242,255'], ['246,195,95', '255,111,181'], ['126,224,195', '5,255,161']],
  'df-night': [['234,220,198', '233,245,239'], ['248,232,204', '233,245,239'], ['246,195,95', '94,242,184'], ['126,224,195', '201,230,255']]
};
function kitInk(v) {
  const M = KIT_INKS[skin]; if (!M || typeof v !== 'string' || v.charCodeAt(0) !== 114) return v;   // 'r' of rgb( and rgba(
  const i = v.indexOf('(') + 1;
  for (let k = 0; k < M.length; k++) if (v.startsWith(M[k][0], i) && v.charCodeAt(i + M[k][0].length) !== 46 && !(v.charCodeAt(i + M[k][0].length) >= 48 && v.charCodeAt(i + M[k][0].length) <= 57)) return v.slice(0, i) + M[k][1] + v.slice(i + M[k][0].length);
  return v;
}
function kitCanvas(c) {
  ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(name => {
    const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, name); if (!d || !d.set) return;
    Object.defineProperty(c, name, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, KIT_INKS[skin] ? kitInk(v) : v); } });
  });
}
// the chord's name in the kit's own lettering. false leaves it to the instrument's serif.
function faceChord(str, x, y) {
  if (skin !== 'hm-dusk' || QUIET()) return false;
  const P = facePen(); if (!P) return false;
  P.chrome(ctx, str, x, y + 4 * S, { size: Math.round(30 * S), font: F_SERIF, weight: 'italic 700', align: 'center' });
  return true;
}
// the day's sun, in watercolour on the paper: a gamboge disc with the pigment pooled at its edge and a few pencil rays
function drawDaySun() {
  if (skin !== 'sb-daylight') return;
  const P = paperPal(), g = ctx3, r = clamp(22 * S, 18, 34), x = phone ? W * 0.86 : W * 0.3, y = TOPH + (LT - TOPH) * (phone ? 0.84 : 0.42);
  const sink = FACE.setT ? clamp((t - FACE.setT) / 0.8, 0, 1) : 0, a = 1 - sink, yy = y + sink * sink * (LT - y), br = reduceMotion ? 0 : Math.sin(t * 0.7);
  const gam = [212, 146, 15];
  g.save(); g.globalAlpha = a;
  const w = g.createRadialGradient(x, yy, r * 0.6, x, yy, r * 2.6); w.addColorStop(0, rgba(P.sun, 0.55)); w.addColorStop(1, rgba(P.sun, 0)); g.fillStyle = w; g.fillRect(x - r * 3, yy - r * 3, r * 6, r * 6);
  const d = g.createRadialGradient(x - r * 0.2, yy - r * 0.25, r * 0.1, x, yy, r); d.addColorStop(0, rgba(mix(P.sun, gam, 0.35), 0.9)); d.addColorStop(0.82, rgba(mix(P.sun, gam, 0.6), 0.92)); d.addColorStop(1, rgba(gam, 0.95));
  g.fillStyle = d; g.beginPath(); g.arc(x, yy, r, 0, TAU); g.fill();
  g.strokeStyle = rgba(P.ink, 0.5); g.lineWidth = 1.2; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU + 0.2 + br * 0.03, r0 = r * (1.34 + 0.04 * br), r1 = r * (i % 2 ? 1.62 : 1.82) + br * 1.5; g.beginPath(); g.moveTo(x + Math.cos(an) * r0, yy + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, yy + Math.sin(an) * r1); g.stroke(); }
  g.restore();
  FACE.orb = { x, y, hit: Math.max(34, r * 1.7), maxY: LT };
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
    P.haze(ctx, { x: 0, y: LT * 0.62, w: W, h: LT * 0.5, weather: wx, amount: 0.035 + 0.045 * peak });   // air between the ridges, and it breathes with the sound
    WX.w = wx; drawWxParts(wxPal(), false); WX.w = w;   // fireflies, with rain or motes when the music calls them
    P.vignette(ctx, { x: 0, y: 0, w: W, h: H, amount: 0.42 });
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
// The lights can be touched, and the day goes round: the day's sun goes down into the dusk, the dusk sun sets into the
// night, and the moon gives way to the day.
function faceTap(px, py) {
  const o = FACE.orb; if (!faceLook() || !o || FACE.setT || py > o.maxY || Math.hypot(px - o.x, py - o.y) > o.hit) return false;
  if (skin === 'df-night') { turnPage(() => setSkin('sb-daylight', true)); return true; }
  const from = skin, to = from === 'hm-dusk' ? 'df-night' : 'hm-dusk';
  FACE.setT = t; if (from === 'hm-dusk') discover('x-sunset');
  setTimeout(() => { FACE.setT = 0; if (skin === from) turnPage(() => setSkin(to, true)); }, reduceMotion ? 0 : 820);
  return true;
}
// The face can keep your hours: day from 7, dusk from 17, night from 20. A face you choose by hand stays until the
// light next changes.
function clockFace() { const h = new Date().getHours(); return h >= 7 && h < 17 ? 'sb-daylight' : h >= 17 && h < 20 ? 'hm-dusk' : 'df-night'; }
function faceClockTick(first) {
  if (!SET.faceClock || REEL.on || MIR.depth > 0) return;
  const f = clockFace(); if (f === FACE.clock) return;
  const was = FACE.clock; FACE.clock = f; if (f === skin) return;
  if (first || !entered) { setSkin(f, true); return; }
  turnPage(() => setSkin(f, true)); if (was) discover('x-hours');
}
function setFaceClock(on, quiet) {
  SET.faceClock = !!on; FACE.clock = ''; const s = $('sFaceClock'); if (s) s.checked = SET.faceClock;
  if (SET.faceClock) { faceClockTick(false); if (!quiet) caption('the face keeps your hours now: day, dusk, night.', 2600); }
  persistSoon();
}
setInterval(() => faceClockTick(false), 30000);
function faceSeen(s) {
  FACE.orb = null; FACE.setT = 0;
  if (!entered || REEL.on || !FACES.some(f => f.id === s)) return;
  FACE.seen.add(s);
  if (KIT_NAMES[s]) caption(`${KIT_NAMES[s]}. the same voices, the same valleys.`, 3000);
  if (FACE.seen.size >= 3) discover('x-faces');
}
function facesUI() { document.querySelectorAll('#faceBtns .pill').forEach(b => { const on = b.dataset.face === skin; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }
document.querySelectorAll('#faceBtns .pill').forEach(b => b.addEventListener('click', () => { if (b.dataset.face !== skin) turnPage(() => setSkin(b.dataset.face, true)); }));
$('sFaceClock').addEventListener('change', e => setFaceClock(e.target.checked));
