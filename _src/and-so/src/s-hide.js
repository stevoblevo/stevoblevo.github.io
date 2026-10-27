// ===== the chimera hide: Saelion on a light page =====
// At night Saelion is pale pink against the dark. On paper the same pink vanished into the page, so in the light looks
// she is drawn the way Storeybrook draws its creatures, with an ink line around every shape, and she wears a chimera's
// hide: an off-white coat that is two animals at once, split down her middle like a chimera cat, warm on her left and
// cool on her right to match her two different eyes. The patches drift slowly through their colors and each new chord
// moves them a step along. bw2 inverts the overlay canvas, so there (and in every dark look) she stays as she was.
const HIDE = {
  warm: [[202, 110, 56], [188, 72, 104], [206, 146, 40], [160, 86, 62]],   // apricot, raspberry, ochre, cinnamon
  cool: [[44, 122, 144], [88, 92, 178], [50, 134, 98], [116, 80, 162]],    // teal, indigo, jade, violet
  offL: [249, 241, 229], offR: [236, 242, 247],                             // two off-whites, one warm and one cool
  coatL: [247, 238, 224], coatR: [234, 240, 245],                           // ...each faintly tinted by its side's drifting color
  ph: 0, goal: 0, chord: '', lastT: 0, key: ''
};
// patches in the pet's own units: x, y, rx, ry, turn, seed. Each side keeps to its own half of the seam, and the
// head's patches stay clear of her eyes so her face still reads.
const HIDE_HEAD = { L: [[-7, -10.5, 4.6, 3.2, 0.5, 0.3], [-9.6, 6.6, 4.2, 4.8, -0.3, 1.1]],
                    R: [[10.6, -4, 3.2, 4.6, -0.3, 0.7], [4.6, 10.2, 4.8, 3, 0.2, 1.9]] };
const HIDE_BODY = { L: [[-7.5, 5, 5, 6.5, 0.3, 0.5], [-3, -8, 3, 2.2, 0, 1.6]],
                    R: [[7.5, -3, 4.2, 6.2, -0.2, 1.2], [4, 11, 4.2, 3, 0.2, 2.2]] };
const HIDE_EGG = { L: [[-6, -7, 3, 2.4, 0, 0.2], [-4, 7, 2.6, 2.2, 0, 1.3], [-9, 1, 2, 2.6, 0, 2.1]],
                   R: [[5, 2, 3, 2.6, 0, 0.8], [6, -9, 2.2, 1.8, 0, 1.7], [3, 10, 2, 2, 0, 2.6]] };
const HIDE_DEF = { warm: HIDE.warm, cool: HIDE.cool, offL: HIDE.offL, offR: HIDE.offR };
const lightPet = () => LIGHT_LOOKS.includes(skin) && skin !== 'bw2';
const hideInk = () => (SB_LOOK[skin] ? paperPal().ink : [43, 33, 48]);
// the Storeybrook looks lend her their tag colors, the same ones the landing creature wears (Ink Blot: white, with ink blots)
function hidePal() {
  if (HIDE.key === skin) return; HIDE.key = skin;
  if (SB_LOOK[skin]) {
    HIDE.warm = ['tag-rose', 'tag-sun', 'copper', 'wrapper'].map(n => tokRGB(n)); HIDE.cool = ['tag-sea', 'tag-lilac', 'tag-sky', 'sap'].map(n => tokRGB(n));
    const ink = skin === 'sb-inkblot'; HIDE.offL = ink ? [255, 255, 255] : mix([255, 246, 240], tokRGB('tag-sun'), 0.1); HIDE.offR = ink ? [255, 255, 255] : mix([244, 247, 250], tokRGB('tag-sky'), 0.12);
  } else Object.assign(HIDE, HIDE_DEF);
}
function hideTick() {   // once a frame, from drawPet
  hidePal();
  const dt = clamp(t - HIDE.lastT, 0, 0.1); HIDE.lastT = t;
  const s = chordNow ? chordNow.str : '';
  if (s && s !== HIDE.chord) { if (HIDE.chord) HIDE.goal += 0.19; HIDE.chord = s; }
  HIDE.ph += (HIDE.goal - HIDE.ph) * Math.min(1, dt * 1.4);
  const tint = skin === 'sb-inkblot' ? 0 : 0.13;
  HIDE.coatL = mix(HIDE.offL, hideCol('warm', 9), tint); HIDE.coatR = mix(HIDE.offR, hideCol('cool', 9), tint);   // the two halves of the coat drift too
}
function hideCol(side, k) {
  const P = HIDE[side], n = P.length, warm = side === 'warm', drift = reduceMotion ? 0 : t / (warm ? 47 : 61);
  const u = ((((HIDE.ph * (warm ? 1 : -1) + drift + k * 0.37) % 1) + 1) % 1) * n, i = Math.floor(u), f = u - i;
  return mix(P[i % n], P[(i + 1) % n], f * f * (3 - 2 * f));
}
// the seam: nearly straight down her middle, wandering a little, like the split on a chimera cat's face
function hideHalf(g, s, y0, y1, sc) {
  const big = 60 * sc, n = 12, ph = reduceMotion ? 0 : t * 0.25;
  g.beginPath(); g.moveTo(s * big, y0);
  for (let k = 0; k <= n; k++) { const y = y0 + ((y1 - y0) * k) / n; g.lineTo(Math.sin((y / sc) * 0.42 + ph) * 0.9 * sc, y); }
  g.lineTo(s * big, y1); g.closePath();
}
function hidePatches(g, side, spots, sc, oy) {
  spots.forEach(([x, y, rx, ry, rot, sd], i) => {
    const w = 1 + (reduceMotion ? 0 : 0.09 * Math.sin(t * 0.33 + sd * 2.1)), c = hideCol(side, i + sd), m = Math.max(rx, ry), R = m * sc * w;
    g.save(); g.translate(x * sc, y * sc + oy); g.rotate(rot); g.scale(rx / m, ry / m);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, rgba(c, 0.86)); gr.addColorStop(0.7, rgba(c, 0.78)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.restore();
  });
}
// one shape in the hide: the coat in two halves (with a soft shadow that lifts her off the page), the patches, a
// little shade low down, then the ink line
function hideShape(g, path, spots, sc, oy, top, bot, ink) {
  g.save(); g.shadowColor = rgba(ink, 0.24); g.shadowBlur = 8 * sc; g.shadowOffsetY = 3.5 * sc;
  path(); g.fillStyle = rgba(HIDE.coatL, 1); g.fill(); g.restore();
  g.save(); path(); g.clip();
  hideHalf(g, 1, top, bot, sc); g.fillStyle = rgba(HIDE.coatR, 1); g.fill();
  [[-1, 'warm', spots.L], [1, 'cool', spots.R]].forEach(([s, side, sp]) => { g.save(); hideHalf(g, s, top, bot, sc); g.clip(); hidePatches(g, side, sp, sc, oy); g.restore(); });
  const sh = g.createLinearGradient(0, top, 0, bot); sh.addColorStop(0.5, rgba(ink, 0)); sh.addColorStop(1, rgba(ink, 0.13));
  g.fillStyle = sh; g.fillRect(-40 * sc, top, 80 * sc, bot - top);
  g.restore();
  path(); g.strokeStyle = rgba(ink, 0.95); g.lineWidth = Math.max(1.4, 1.45 * sc); g.lineJoin = 'round'; g.stroke();
}
function hideHead(g, sc, ink) { const R = 13 * sc; hideShape(g, () => { g.beginPath(); g.arc(0, 0, R, 0, TAU); }, HIDE_HEAD, sc, 0, -R - 2, R + 2, ink); }
function hideBody(g, sc, sy, ink) { const cy = 2 * sc + sy; hideShape(g, () => { g.beginPath(); g.ellipse(0, cy, 13 * sc, 15 * sc, 0, 0, TAU); }, HIDE_BODY, sc, cy, cy - 15 * sc - 2, cy + 15 * sc + 2, ink); }
function hideEgg(g, sc, ink) { hideShape(g, () => { g.beginPath(); g.ellipse(0, 0, 13 * sc, 17 * sc, 0, 0, TAU); }, HIDE_EGG, sc, 0, -19 * sc, 19 * sc, ink); }
