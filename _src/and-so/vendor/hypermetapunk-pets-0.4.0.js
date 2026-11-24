/* Hypermetapunk 0.4.0 · crossing pets, the third set (plan C5): five dusk pets in the family's shared save.
   Hypermetapunk.pets   { kit, key, version, list, has(id), find(id), count(), total(), draw(ctx, id, o) }
   The save is localStorage['crossing:pets'] on stevoblevo.github.io, shared with Storeybrook's day pets ('sb:') and
   Depthfield's night pets ('df:'): { found: { 'hmp:<id>': ms, … }, active: { sb: id } }. This file only ever adds
   'hmp:' keys to it; it never removes or rewrites anyone else's.
   An add-on like the pen: load it after bundle.js, or alone. It reads no CSS, and drawing needs only a 2D context. */
(function (w, d) {
  'use strict';
  var H = w.Hypermetapunk = w.Hypermetapunk || {};
  if (H.pets) return;
  var VERSION = '0.4.0', KIT = 'hmp', KEY = 'crossing:pets', SITE = 'https://stevoblevo.github.io/hypermetapunk/';
  var FAMILY = { sb: 7, df: 5 };   /* Storeybrook has seven day pets, Depthfield five night pets */
  var LIST = [
    { id: 'sticker-cat', name: 'Vinyl', line: 'Came off with the sticker. Still a bit tacky.', how: 'Peel a sticker off the parts board.', where: SITE + '#parts' },
    { id: 'static-moth', name: 'Snow', line: 'It lives between the channels. You turned the noise off; it came to see why.', how: 'Stop the ticker.', where: SITE + '#ticker' },
    { id: 'two-plate-koi', name: 'Offset', line: 'Two plates, one fish. It has never lined up and does not mind.', how: 'Hold your pointer or finger on a misregistered heading until its plates slip.', where: SITE + '#h-parts' },
    { id: 'stamp-crab', name: 'Postmark', line: 'Inked, pressed, sideways. It goes where the paper goes.', how: 'Switch the page to Zine.', where: SITE + '#themes' },
    { id: 'tape-bat', name: 'Flutter', line: 'It was living in the tape between the doors. Every one open now.', how: 'Open every door at the foot of the page.', where: SITE + '#doors' }
  ];

  /* ---------- the shared save ---------- */
  var MEM = {};   /* what was found this visit, for when storage is blocked */
  function store() { try { return w.localStorage || null; } catch (e) { return null; } }
  function read() {
    try { var s = store(), v = s && JSON.parse(s.getItem(KEY) || 'null'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
  }
  function write(v) { try { var s = store(); if (!s) return false; s.setItem(KEY, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function found(v) { var f = v && v.found; return f && typeof f === 'object' && !Array.isArray(f) ? f : {}; }
  function bare(id) { id = String(id == null ? '' : id); return id.indexOf(KIT + ':') === 0 ? id.slice(KIT.length + 1) : id; }
  function pet(id) { id = bare(id); for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }
  function has(id) { var k = KIT + ':' + bare(id); return !!(found(read())[k] || MEM[k]); }
  function count() { var n = 0, f = found(read()); for (var i = 0; i < LIST.length; i++) if (f[KIT + ':' + LIST[i].id] || MEM[KIT + ':' + LIST[i].id]) n++; return n; }
  function find(id) {
    var p = pet(id); if (!p || has(p.id)) return false;
    var v = read(), k = KIT + ':' + p.id;   /* read, add one key, write: the other kits' keys ride along untouched */
    v.found = found(v); v.found[k] = MEM[k] = Date.now(); write(v);
    try { w.dispatchEvent(new CustomEvent('hmp:pet', { detail: { id: p.id, name: p.name, count: count() } })); } catch (e) { /* no window events */ }
    return true;
  }
  function total() {
    var f = found(read()), sb = 0, df = 0, k, hmp = count();
    for (k in f) if (Object.prototype.hasOwnProperty.call(f, k) && f[k]) { if (k.indexOf('sb:') === 0) sb++; else if (k.indexOf('df:') === 0) df++; }
    sb = Math.min(sb, FAMILY.sb); df = Math.min(df, FAMILY.df);
    return { sb: sb, df: df, hmp: hmp, all: sb + df + hmp };
  }

  /* ---------- inks: the pen's token tables (tools/pen-inks.py checks both copies against tokens.json) ---------- */
  var INKS = {
    dusk: { 'void': [11, 6, 24], 'paper': [11, 6, 24], 'surface': [22, 13, 46], 'surface-raised': [33, 21, 67], 'page': [33, 21, 67], 'line': [61, 44, 112], 'ink': [247, 242, 255], 'ink-muted': [201, 189, 240], 'accent': [255, 111, 181], 'accent-soft': [255, 111, 181, 0.16], 'on-accent': [20, 6, 31], 'cue': [5, 255, 161], 'on-cue': [4, 20, 12], 'link': [127, 233, 255], 'focus': [232, 255, 0], 'chrome-1': [253, 253, 255], 'chrome-2': [201, 214, 255], 'chrome-3': [127, 127, 213], 'chrome-4': [255, 113, 206], 'chrome-5': [1, 205, 254], 'wave-abyss': [6, 3, 15], 'wave-indigo': [27, 15, 58], 'wave-violet': [61, 22, 99], 'wave-magenta': [255, 46, 136], 'wave-tangerine': [255, 184, 107], 'wave-sun': [255, 251, 150], 'wave-cyan': [1, 205, 254], 'wave-mint': [5, 255, 161], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 90, 0], 'punk-magenta': [255, 0, 168], 'punk-ink': [13, 13, 18], 'slap': [255, 46, 136], 'punk-paper': [244, 239, 227], 'punk-tape': [255, 235, 150, 0.78], 'scrawl': [255, 113, 206] },
    zine: { 'void': [244, 239, 227], 'paper': [244, 239, 227], 'surface': [233, 226, 207], 'surface-raised': [255, 253, 246], 'page': [255, 253, 246], 'line': [201, 192, 168], 'ink': [13, 13, 18], 'ink-muted': [70, 64, 77], 'accent': [194, 0, 106], 'accent-soft': [194, 0, 106, 0.1], 'on-accent': [255, 255, 255], 'cue': [0, 106, 70], 'on-cue': [255, 255, 255], 'link': [0, 80, 168], 'focus': [255, 90, 0], 'chrome-1': [122, 122, 146], 'chrome-2': [52, 52, 74], 'chrome-3': [13, 13, 18], 'chrome-4': [74, 74, 102], 'chrome-5': [13, 13, 18], 'wave-abyss': [244, 239, 227], 'wave-indigo': [238, 226, 242], 'wave-violet': [246, 207, 230], 'wave-magenta': [255, 155, 203], 'wave-tangerine': [255, 207, 158], 'wave-sun': [255, 243, 166], 'wave-cyan': [1, 165, 212], 'wave-mint': [0, 194, 122], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 90, 0], 'punk-magenta': [255, 0, 168], 'punk-ink': [13, 13, 18], 'slap': [13, 13, 18], 'punk-paper': [255, 253, 246], 'punk-tape': [255, 230, 140, 0.85], 'scrawl': [194, 0, 106] },
    contrast: { 'void': [0, 0, 0], 'paper': [0, 0, 0], 'surface': [11, 11, 11], 'surface-raised': [20, 20, 20], 'page': [20, 20, 20], 'line': [255, 255, 255], 'ink': [255, 255, 255], 'ink-muted': [232, 232, 232], 'accent': [232, 255, 0], 'accent-soft': [232, 255, 0, 0.18], 'on-accent': [0, 0, 0], 'cue': [5, 255, 161], 'on-cue': [0, 0, 0], 'link': [127, 233, 255], 'focus': [232, 255, 0], 'chrome-1': [255, 255, 255], 'chrome-2': [255, 255, 255], 'chrome-3': [232, 232, 232], 'chrome-4': [255, 255, 255], 'chrome-5': [232, 255, 0], 'wave-abyss': [0, 0, 0], 'wave-indigo': [0, 0, 0], 'wave-violet': [17, 17, 17], 'wave-magenta': [51, 51, 51], 'wave-tangerine': [119, 119, 119], 'wave-sun': [255, 255, 255], 'wave-cyan': [255, 255, 255], 'wave-mint': [255, 255, 255], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 255, 255], 'punk-magenta': [255, 255, 255], 'punk-ink': [0, 0, 0], 'slap': [255, 255, 255], 'punk-paper': [255, 255, 255], 'punk-tape': [255, 255, 255, 0.9], 'scrawl': [232, 255, 0] }
  };

  /* ---------- drawing helpers ---------- */
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function cmix(a, b, k) { return [Math.round(mix(a[0], b[0], k)), Math.round(mix(a[1], b[1], k)), Math.round(mix(a[2], b[2], k))]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? (c.length > 3 ? c[3] : 1) : a) + ')'; }
  function rand(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* baked art is drawn at device pixels per unit, rounded up to steps of a twelfth of an octave, so a host that
     animates a pet's size re-bakes now and then, not every frame */
  function bucket(x) { return Math.pow(2, Math.ceil(Math.log(Math.max(0.05, x)) / Math.LN2 * 12) / 12); }
  function devScale(ctx) { try { var m = ctx.getTransform(); return Math.sqrt(m.a * m.a + m.b * m.b) || 1; } catch (e) { return w.devicePixelRatio || 1; } }
  function surface(cw, ch) {
    var c = null;
    if (d && d.createElement) { c = d.createElement('canvas'); c.width = cw; c.height = ch; return c; }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(cw, ch);
    return null;
  }
  /* baked art is kept by key, up to a pixel budget; a host that draws at one size bakes once */
  var BAKED = {}, ORDER = [], BUDGET = 6e6, USED = 0;
  function baked(key, make) {
    var hit = BAKED[key]; if (hit) return hit.v;
    var v = make(); if (!v) return null;
    var px = v.px || 0; BAKED[key] = { v: v, px: px }; ORDER.push(key); USED += px;
    while (USED > BUDGET && ORDER.length > 1) { var old = ORDER.shift(); if (BAKED[old]) { USED -= BAKED[old].px; delete BAKED[old]; } }
    return v;
  }
  var SCRATCH = {};
  function scratch(name, cw, ch) {   /* one reusable canvas per name and size */
    var k = name + cw + 'x' + ch, c = SCRATCH[k];
    if (!c) { c = SCRATCH[k] = surface(cw, ch); }
    return c;
  }
  /* die-cut: stamp the art's silhouette in a ring of offsets, tint it, and lay the art back on top */
  function ring(k, src, ox, oy, sw, sh, r, n) {
    for (var i = 0; i < n; i++) { var a = (i / n) * TAU; k.drawImage(src, ox + Math.cos(a) * r, oy + Math.sin(a) * r, sw, sh); }
  }
  function tint(k, c, cw, ch) { k.globalCompositeOperation = 'source-in'; k.fillStyle = rgba(c, 1); k.fillRect(0, 0, cw, ch); k.globalCompositeOperation = 'source-over'; }

  /* ---------- the beat, felt with a swing: long-short, the weight a little behind the beat ---------- */
  var LAG = 0.075, GROOVE = {};
  function groove(id, t, beat) {
    var g = GROOVE[id] || (GROOVE[id] = { lb: 0, lt: -1e9, on: -1e9, per: 0.6, n: 0 });
    var b = beat > 0 ? Math.min(1, +beat) : 0;
    if (t < g.lt - 0.25) { g.on = -1e9; g.n = 0; }   /* the clock went back: a new host or a restart */
    if (b > 0.5 && b > g.lb + 0.2 && t - g.on > 0.16) {
      var gap = t - g.on; if (gap < 2.5) g.per += (clamp(gap, 0.25, 1.6) - g.per) * 0.6;
      g.on = t; g.n++;
    }
    g.lb = b; g.lt = t;
    var ph = (t - g.on) / g.per;
    return { live: g.on < -1e8 ? 0 : clamp(2.2 - ph, 0, 1), ph: ph, n: g.n, side: g.n % 2 ? 1 : -1 };
  }
  function hit(ph) { if (ph < 0) return 0; if (ph < LAG) { var a = ph / LAG; return a * a * (3 - 2 * a); } return Math.exp(-(ph - LAG) * 5.2); }
  function off(ph) {   /* the swung offbeat: two thirds through the beat, lighter and shorter */
    var a = ph - (2 / 3 + LAG * 0.6);
    if (a < -0.08) return 0; if (a < 0) { var q = 1 + a / 0.08; return 0.5 * q * q; }
    return 0.5 * Math.exp(-a * 11);
  }
  function backOut(a) { var c = 1.7; a -= 1; return 1 + a * a * ((c + 1) * a + c); }
  function stepTo(ph, len) { return backOut(clamp((ph - LAG * 0.4) / (len || 0.3), 0, 1)); }   /* travel that lands late, and overshoots a hair */
  function snap(ph) { if (ph < LAG) return clamp(ph / LAG, 0, 1); var a = ph - LAG; return Math.exp(-a * 6.5) * Math.cos(a * 15); }   /* out on the beat, back with a wobble */

  /* ---------- the five ---------- */
  var DRAW = {};

  /* Vinyl, the sticker cat: a die-cut vinyl cat with a thick keyline and a hard slap shadow; a corner peels up on the beat */
  function catPal(look, I) {
    if (look === 'zine') return { body: I['punk-orange'], light: I['wave-tangerine'], stripe: I['punk-ink'], ear: I['wave-magenta'], eye: I['punk-acid'], nose: I['punk-magenta'], collar: I['wave-cyan'], tag: I['punk-acid'], line: I['punk-ink'], key: I['punk-paper'], edge: I['punk-ink'], slap: I['slap'], back: I['surface'], gloss: 0.16 };
    if (look === 'contrast') return { body: I['void'], light: I['surface-raised'], stripe: I['ink'], ear: I['punk-acid'], eye: I['punk-acid'], nose: I['ink'], collar: I['punk-acid'], tag: I['ink'], line: I['ink'], key: I['ink'], edge: I['void'], slap: I['slap'], back: I['ink-muted'], gloss: 0 };
    return { body: I['punk-magenta'], light: I['chrome-4'], stripe: I['wave-violet'], ear: I['wave-tangerine'], eye: I['punk-acid'], nose: I['wave-cyan'], collar: I['wave-mint'], tag: I['punk-acid'], line: I['punk-ink'], key: I['ink'], edge: I['punk-ink'], slap: I['slap'], back: I['chrome-2'], gloss: 0.26 };
  }
  function catShape(k) {
    k.beginPath();
    k.moveTo(-29, 44);
    k.bezierCurveTo(-39, 41, -40, 22, -33, 9);
    k.bezierCurveTo(-29, 2, -27, -2, -28, -6);
    k.bezierCurveTo(-37, -11, -38, -23, -32, -31);
    k.lineTo(-34, -49); k.lineTo(-18, -39);
    k.bezierCurveTo(-8, -43, 7, -43, 17, -40);
    k.lineTo(32, -50); k.lineTo(31, -31);
    k.bezierCurveTo(37, -23, 37, -11, 27, -5);
    k.bezierCurveTo(31, 4, 35, 15, 35, 28);
    k.bezierCurveTo(35, 39, 32, 45, 23, 45);
    k.closePath();
  }
  function catArt(k, c, U) {   /* drawn in units, 100 a pet's height */
    k.lineJoin = 'round'; k.lineCap = 'round';
    var L = Math.max(2.4, 1.1 / U);
    /* the tail, behind */
    k.beginPath(); k.moveTo(24, 40); k.bezierCurveTo(44, 42, 52, 24, 46, 8); k.bezierCurveTo(43, 0, 37, -1, 36, 4);
    k.strokeStyle = rgba(c.line); k.lineWidth = 9 + L * 2; k.stroke(); k.strokeStyle = rgba(c.body); k.lineWidth = 9; k.stroke();
    k.strokeStyle = rgba(c.stripe, 0.55); k.lineWidth = 2.2;
    k.beginPath(); k.moveTo(44, 30); k.lineTo(50, 33); k.moveTo(47, 18); k.lineTo(53, 18); k.stroke();
    /* body and head */
    catShape(k); k.fillStyle = rgba(c.body); k.fill();
    k.save(); catShape(k); k.clip();
    k.fillStyle = rgba(c.light); k.beginPath(); k.ellipse(0, 25, 15, 18, 0, 0, TAU); k.fill();
    k.beginPath(); k.ellipse(-6.5, -12.5, 8, 6.2, 0, 0, TAU); k.ellipse(6.5, -12.5, 8, 6.2, 0, 0, TAU); k.fill();
    k.strokeStyle = rgba(c.stripe, 0.6); k.lineWidth = 2.6;
    k.beginPath(); k.moveTo(-9, -37); k.lineTo(-6, -30); k.moveTo(0, -39); k.lineTo(0, -31); k.moveTo(9, -37); k.lineTo(6, -30);
    k.moveTo(-38, 14); k.quadraticCurveTo(-31, 14, -27, 19); k.moveTo(-39, 26); k.quadraticCurveTo(-32, 26, -28, 31); k.moveTo(36, 16); k.quadraticCurveTo(30, 16, 27, 21); k.stroke();
    if (c.gloss) {   /* the vinyl's gloss: one hard glare band */
      k.fillStyle = 'rgba(255,255,255,' + c.gloss + ')';
      k.beginPath(); k.moveTo(-40, -8); k.lineTo(-22, -52); k.lineTo(-13, -52); k.lineTo(-33, 2); k.closePath(); k.fill();
      k.fillStyle = 'rgba(255,255,255,' + c.gloss * 0.6 + ')';
      k.beginPath(); k.moveTo(-31, 8); k.lineTo(-9, -52); k.lineTo(-6, -52); k.lineTo(-28, 10); k.closePath(); k.fill();
    }
    k.restore();
    catShape(k); k.strokeStyle = rgba(c.line); k.lineWidth = L; k.stroke();
    /* ears */
    k.fillStyle = rgba(c.ear); k.beginPath(); k.moveTo(-31, -44); k.lineTo(-21, -38.5); k.lineTo(-29.5, -33); k.closePath(); k.moveTo(29.5, -45); k.lineTo(20, -39.5); k.lineTo(28.5, -33.5); k.closePath(); k.fill();
    /* collar and tag */
    k.beginPath(); k.moveTo(-24, -5); k.quadraticCurveTo(0, 4, 24, -5); k.lineTo(25, 0); k.quadraticCurveTo(0, 9, -25, 0); k.closePath();
    k.fillStyle = rgba(c.collar); k.fill(); k.lineWidth = L * 0.8; k.strokeStyle = rgba(c.line); k.stroke();
    k.beginPath(); k.arc(3, 8.5, 4.2, 0, TAU); k.fillStyle = rgba(c.tag); k.fill(); k.stroke();
    /* eyes: side-eye, half-lidded */
    [-12.5, 12.5].forEach(function (ex) {
      k.beginPath(); k.ellipse(ex, -23, 6.6, 5.4, 0, 0, TAU); k.fillStyle = rgba(c.eye); k.fill();
      k.fillStyle = rgba(c.line === c.key ? I0['void'] : c.line); k.beginPath(); k.ellipse(ex + 2.2, -22.4, 1.7, 4.3, 0, 0, TAU); k.fill();
      k.fillStyle = 'rgba(255,255,255,0.9)'; k.beginPath(); k.arc(ex + 3.4, -24.6, 1.1, 0, TAU); k.fill();
      k.beginPath(); k.moveTo(ex - 7.4, -24.2); k.quadraticCurveTo(ex, -30.4, ex + 7.4, -24.2); k.lineTo(ex + 7.4, -29); k.lineTo(ex - 7.4, -29); k.closePath(); k.fillStyle = rgba(c.body); k.fill();
      k.beginPath(); k.moveTo(ex - 7.2, -24.4); k.quadraticCurveTo(ex, -29.8, ex + 7.2, -24.4); k.strokeStyle = rgba(c.line); k.lineWidth = L * 0.9; k.stroke();
      k.beginPath(); k.ellipse(ex, -23, 6.6, 5.4, 0, 0, TAU); k.lineWidth = L * 0.7; k.stroke();
    });
    /* nose, mouth, whiskers */
    k.beginPath(); k.moveTo(-3.4, -15.5); k.lineTo(3.4, -15.5); k.lineTo(0, -11.5); k.closePath(); k.fillStyle = rgba(c.nose); k.fill(); k.lineWidth = L * 0.7; k.strokeStyle = rgba(c.line); k.stroke();
    k.beginPath(); k.moveTo(-5.5, -8.4); k.quadraticCurveTo(-2.6, -6.4, 0, -10.6); k.quadraticCurveTo(2.6, -6.4, 5.5, -8.4); k.stroke();
    k.strokeStyle = rgba(c.key, 0.9); k.lineWidth = Math.max(1, 0.5 / U) * 1.3;
    k.beginPath(); k.moveTo(-10, -13); k.lineTo(-27, -16); k.moveTo(-10, -10.5); k.lineTo(-27, -9.5); k.moveTo(10, -13); k.lineTo(27, -16); k.moveTo(10, -10.5); k.lineTo(27, -9.5); k.stroke();
    /* paws */
    k.fillStyle = rgba(c.light); k.strokeStyle = rgba(c.line); k.lineWidth = L * 0.8;
    k.beginPath(); k.ellipse(-12, 42, 8.5, 5, 0, 0, TAU); k.fill(); k.stroke(); k.beginPath(); k.ellipse(12, 42, 8.5, 5, 0, 0, TAU); k.fill(); k.stroke();
    k.beginPath(); k.moveTo(-14.5, 39.5); k.lineTo(-14.5, 43.5); k.moveTo(-9.5, 39.5); k.lineTo(-9.5, 43.5); k.moveTo(9.5, 39.5); k.lineTo(9.5, 43.5); k.moveTo(14.5, 39.5); k.lineTo(14.5, 43.5); k.stroke();
  }
  var I0 = null;   /* the inks of the look being baked, for the few details that need the ground's colour */
  var CAT = { x0: -52, y0: -60, w: 112, h: 120, key: 4.2, edge: 1.3, slap: 5.5 };
  function catBake(look, U) {
    var I = INKS[look], c = catPal(look, I), cw = Math.ceil(CAT.w * U), ch = Math.ceil(CAT.h * U);
    var art = surface(cw, ch), face = surface(cw, ch), back = surface(cw, ch), dark = surface(cw, ch), slap = surface(cw, ch);
    if (!art || !face) return null;
    var a = art.getContext('2d'), f = face.getContext('2d'), b = back.getContext('2d'), k, r1 = (CAT.key + CAT.edge) * U, r2 = CAT.key * U;
    I0 = I; a.setTransform(U, 0, 0, U, -CAT.x0 * U, -CAT.y0 * U); catArt(a, c, U); a.setTransform(1, 0, 0, 1, 0, 0);
    /* the edge ring, then the keyline ring over it, then the art */
    ring(f, art, 0, 0, cw, ch, r1, 16); ring(f, art, 0, 0, cw, ch, r1 * 0.55, 10); tint(f, c.edge, cw, ch);
    ring(b, art, 0, 0, cw, ch, r2, 16); ring(b, art, 0, 0, cw, ch, r2 * 0.55, 10); b.drawImage(art, 0, 0); tint(b, c.key, cw, ch);
    f.drawImage(back, 0, 0); f.drawImage(art, 0, 0);
    /* the silhouette in three inks: the liner side, a soft dark for the flap's shadow, and the slap */
    [[back, c.back], [dark, [0, 0, 0]], [slap, c.slap]].forEach(function (p) { k = p[0].getContext('2d'); k.clearRect(0, 0, cw, ch); k.drawImage(face, 0, 0); tint(k, p[1], cw, ch); });
    return { face: face, back: back, dark: dark, slap: slap, cw: cw, ch: ch, U: U, c: c, px: cw * ch * 5 };
  }
  DRAW['sticker-cat'] = function (ctx, look, o, g, u) {
    var U = bucket(devScale(ctx)), B = baked('cat|' + look + '|' + U, function () { return catBake(look, U); });
    if (!B) return;
    var t = o.t, rot = 0, dy = 0, p = 0.22, blink = 0;
    if (!o.still) {
      var idle = { rot: 0.035 * Math.sin(t * 1.15), dy: -1.4 * Math.sin(t * 2.3), p: 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(t * 1.7)) };
      var lean = mix(-g.side, g.side, stepTo(g.ph, 0.32)), hh = hit(g.ph), oo = off(g.ph);
      rot = mix(idle.rot, lean * 0.085, g.live); dy = mix(idle.dy, -hh * 7 - oo * 3.5, g.live); p = mix(idle.p, 0.18 + 0.82 * hh + 0.4 * oo, g.live);
      blink = (t % 3.9) < 0.13 ? 1 : 0;
    }
    var bx = CAT.x0, by = CAT.y0, cw = B.cw / B.U, ch = B.ch / B.U;
    ctx.translate(0, dy); ctx.rotate(rot);
    /* the fold line across the bottom-left corner; past it the sticker has lifted and folded back over itself */
    var nx = -0.7071, ny = 0.7071, depth = 19 + 18 * clamp(p, 0, 1.3), cx = -54, cy = 56, lx = cx - nx * depth, ly = cy - ny * depth;
    function inside(k) { var tx = -ny, ty = nx; k.beginPath(); k.moveTo(lx + tx * 400, ly + ty * 400); k.lineTo(lx - tx * 400, ly - ty * 400); k.lineTo(lx - tx * 400 - nx * 400, ly - ty * 400 - ny * 400); k.lineTo(lx + tx * 400 - nx * 400, ly + ty * 400 - ny * 400); k.closePath(); k.clip(); }
    var dd = 2 * (lx * nx + ly * ny), RA = 1 - 2 * nx * nx, RB = -2 * nx * ny, RD = 1 - 2 * ny * ny;
    ctx.save(); inside(ctx);
    ctx.drawImage(B.slap, bx + CAT.slap, by + CAT.slap, cw, ch);
    ctx.drawImage(B.face, bx, by, cw, ch);
    ctx.save(); ctx.globalAlpha *= 0.3; ctx.translate(-nx * 2.6, -ny * 2.6); ctx.transform(RA, RB, RB, RD, dd * nx, dd * ny); ctx.drawImage(B.dark, bx, by, cw, ch); ctx.restore();
    ctx.restore();
    /* the flap shows the liner side, lit where it bends and darker toward the lifted tip; it is built on a reused scratch canvas */
    var fl = scratch('flap', B.cw, B.ch); if (fl) {
      var k = fl.getContext('2d'), gr;
      k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, B.cw, B.ch);
      k.setTransform(B.U, 0, 0, B.U, -bx * B.U, -by * B.U); k.save(); inside(k); k.transform(RA, RB, RB, RD, dd * nx, dd * ny); k.drawImage(B.back, bx, by, cw, ch); k.restore();
      gr = k.createLinearGradient(lx, ly, lx - nx * depth, ly - ny * depth);
      gr.addColorStop(0, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.25, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
      k.globalCompositeOperation = 'source-atop'; k.fillStyle = gr; k.fillRect(bx, by, cw, ch); k.globalCompositeOperation = 'source-over'; k.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(fl, bx, by, cw, ch);
    }
    if (blink) {   /* a slow blink, drawn over the printed eyes */
      var c = B.c; ctx.lineWidth = Math.max(2.2, 1 / u); ctx.lineCap = 'round';
      [-12.5, 12.5].forEach(function (ex) { ctx.beginPath(); ctx.ellipse(ex, -23, 7.2, 6, 0, 0, TAU); ctx.fillStyle = rgba(c.body); ctx.fill(); ctx.beginPath(); ctx.moveTo(ex - 6.6, -22); ctx.quadraticCurveTo(ex, -18.6, ex + 6.6, -22); ctx.strokeStyle = rgba(c.line); ctx.stroke(); });
    }
  };

  /* Snow, the static moth: wings of TV static and scanlines that flicker, a chrome body, test-card eyespots */
  var NOISE = {};
  function noise(look) {
    if (NOISE[look]) return NOISE[look];
    var I = INKS[look], N = 40, F = 4, c = surface(N, N * F); if (!c) return null;
    var k = c.getContext('2d'), img = k.createImageData(N, N * F), D = img.data, R = rand(5150), i, x, y, v, p, base, hi, lo;
    lo = look === 'zine' ? I['punk-paper'] : look === 'contrast' ? I['void'] : I['wave-indigo'];
    hi = look === 'zine' ? I['punk-ink'] : look === 'contrast' ? I['ink'] : I['chrome-1'];
    for (y = 0; y < N * F; y++) for (x = 0; x < N; x++) {
      v = R(); p = (y * N + x) * 4;
      if (look === 'contrast') v = v > 0.52 ? 1 : 0; else if (look === 'zine') v = Math.pow(v, 2.2); else v = Math.pow(v, 0.85);
      base = cmix(lo, hi, v);
      if (look === 'dusk' && R() < 0.05) base = R() < 0.5 ? I['chrome-4'] : I['chrome-5'];   /* the odd lit phosphor */
      if (y % 2) { var s = look === 'zine' ? 0.9 : 0.55; base = look === 'zine' ? cmix(base, I['punk-ink'], 0.12) : [base[0] * s, base[1] * s, base[2] * s]; }
      D[p] = base[0]; D[p + 1] = base[1]; D[p + 2] = base[2]; D[p + 3] = 255;
    }
    k.putImageData(img, 0, 0);
    return (NOISE[look] = { c: c, n: N, f: F });
  }
  function foreWing(k) { k.beginPath(); k.moveTo(3, -16); k.bezierCurveTo(18, -30, 40, -40, 56, -36); k.bezierCurveTo(60, -30, 52, -12, 44, -2); k.bezierCurveTo(34, 6, 18, 6, 4, -2); k.closePath(); }
  function hindWing(k) { k.beginPath(); k.moveTo(3, -4); k.bezierCurveTo(22, -6, 42, 2, 42, 16); k.bezierCurveTo(42, 30, 30, 40, 20, 38); k.bezierCurveTo(10, 36, 4, 22, 2, 8); k.closePath(); }
  var BARS = ['punk-acid', 'wave-cyan', 'wave-mint', 'punk-magenta', 'punk-orange', 'wave-indigo'];
  DRAW['static-moth'] = function (ctx, look, o, g, u) {
    var I = INKS[look], NZ = noise(look), t = o.t, line = look === 'contrast' ? I['ink'] : I['punk-ink'];
    var sx = 1, hx = 1, bob = 0, dx = 0, burst = 0, tw = 0, fr = 0;
    if (!o.still) {
      var hh = hit(g.ph), oo = off(g.ph);
      sx = mix(0.8 + 0.2 * Math.sin(t * 6.4), 0.4 + 0.6 * hh + 0.3 * oo, g.live);
      hx = mix(0.82 + 0.18 * Math.sin(t * 6.4 - 0.6), 0.5 + 0.5 * hit(g.ph - 0.05) + 0.25 * oo, g.live);
      bob = mix(1.6 * Math.sin(t * 1.9), -3 * hh, g.live); dx = 2.2 * Math.sin(t * 0.9) * (1 - g.live * 0.6);
      burst = 0.12 * hh * g.live; tw = mix(0.06 * Math.sin(t * 2.6), 0.14 * oo - 0.06 * hh, g.live);
      fr = Math.floor(t * 13);
    }
    ctx.translate(dx, bob + 4);
    var dev = devScale(ctx), R = rand(fr * 7 + 3), lw = Math.max(2.2, 1 / u);
    function wing(shape, scale, side, k0) {
      ctx.save(); ctx.scale(side * scale, 1);
      shape(ctx); ctx.save(); ctx.clip();
      if (NZ) {
        var cell = 60 / NZ.n, fi = (fr + k0) % NZ.f, ox = Math.floor(R() * 8), oy = Math.floor(R() * 8);
        ctx.imageSmoothingEnabled = cell * dev < 1.6;
        ctx.drawImage(NZ.c, ox, fi * NZ.n + oy, NZ.n - 8, NZ.n - 8, 0, -42, 60, 82);
        ctx.imageSmoothingEnabled = true;
      }
      if (look !== 'contrast') {   /* the vertical hold rolling through */
        var ry = -42 + (((o.still ? 0.3 : t * 0.42 + k0 * 0.2) % 1) * 92);
        ctx.fillStyle = look === 'zine' ? 'rgba(13,13,18,0.14)' : 'rgba(255,255,255,0.14)'; ctx.fillRect(0, ry, 60, 9);
      }
      if (burst > 0.01) { ctx.fillStyle = look === 'zine' ? rgba(I['punk-ink'], burst * 0.6) : 'rgba(255,255,255,' + burst + ')'; ctx.fillRect(0, -42, 60, 82); }
      ctx.strokeStyle = rgba(line, look === 'contrast' ? 0.9 : 0.5); ctx.lineWidth = Math.max(0.9, 0.6 / u);
      ctx.beginPath();
      if (shape === foreWing) { ctx.moveTo(4, -12); ctx.quadraticCurveTo(28, -26, 54, -34); ctx.moveTo(6, -8); ctx.quadraticCurveTo(30, -14, 48, -10); ctx.moveTo(6, -4); ctx.quadraticCurveTo(24, -2, 38, 2); }
      else { ctx.moveTo(4, 0); ctx.quadraticCurveTo(24, 4, 40, 14); ctx.moveTo(4, 4); ctx.quadraticCurveTo(18, 18, 24, 36); }
      ctx.stroke();
      if (shape === foreWing) {   /* the eyespot is a test card */
        ctx.save(); ctx.beginPath(); ctx.arc(36, -20, 7.2, 0, TAU); ctx.clip();
        for (var b = 0; b < BARS.length; b++) { ctx.fillStyle = rgba(look === 'contrast' ? (b % 2 ? I['void'] : I['ink']) : I[BARS[b]]); ctx.fillRect(28.8 + b * 2.4, -28, 2.5, 16); }
        ctx.restore();
        ctx.beginPath(); ctx.arc(36, -20, 7.2, 0, TAU); ctx.lineWidth = Math.max(1.6, 0.8 / u); ctx.strokeStyle = rgba(line); ctx.stroke();
        ctx.beginPath(); ctx.arc(36, -20, 9.4, 0, TAU); ctx.lineWidth = Math.max(0.9, 0.5 / u); ctx.strokeStyle = rgba(look === 'zine' ? I['punk-ink'] : I['chrome-1'], 0.7); ctx.stroke();
      }
      ctx.restore();
      shape(ctx); ctx.lineWidth = lw; ctx.strokeStyle = rgba(line); ctx.lineJoin = 'round'; ctx.stroke();
      if (look === 'dusk') { shape(ctx); ctx.lineWidth = Math.max(0.8, 0.5 / u); ctx.strokeStyle = rgba(I['chrome-2'], 0.55); ctx.stroke(); }
      ctx.restore();
    }
    wing(hindWing, hx, -1, 1); wing(hindWing, hx, 1, 2); wing(foreWing, sx, -1, 3); wing(foreWing, sx, 1, 0);
    /* antennae, feathered */
    ctx.lineCap = 'round'; ctx.strokeStyle = rgba(look === 'dusk' ? I['chrome-2'] : line); ctx.lineWidth = Math.max(1.5, 0.8 / u);
    [-1, 1].forEach(function (s) {
      ctx.save(); ctx.translate(s * 2, -26); ctx.rotate(s * tw);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 3, -14, s * 15, -21); ctx.stroke();
      if (u > 0.34) { ctx.lineWidth = Math.max(0.8, 0.5 / u); ctx.beginPath(); for (var q = 0.25; q < 1; q += 0.15) { var px = mix(0, s * 15, q * q) + s * 1.5 * q, py = mix(0, -21, q) * (0.7 + 0.3 * q); ctx.moveTo(px, py); ctx.lineTo(px + s * 3.2, py + 1.5); ctx.moveTo(px, py); ctx.lineTo(px - s * 1.6, py - 2.8); } ctx.stroke(); }
      ctx.restore();
    });
    /* the chrome body */
    var gr;
    if (look === 'contrast') gr = rgba(I['ink']);
    else { gr = ctx.createLinearGradient(-6, 0, 6, 0); gr.addColorStop(0, rgba(I['chrome-3'])); gr.addColorStop(0.28, rgba(I['chrome-1'])); gr.addColorStop(0.5, rgba(I['chrome-2'])); gr.addColorStop(0.55, look === 'dusk' ? 'rgb(234,246,255)' : rgba(I['chrome-1'])); gr.addColorStop(0.62, rgba(I['chrome-4'])); gr.addColorStop(1, rgba(I['chrome-5'])); }
    ctx.lineWidth = Math.max(1.8, 0.9 / u); ctx.strokeStyle = rgba(look === 'contrast' ? I['void'] : I['punk-ink']);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 12, 5.6, 19, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 12, 5.6, 19, 0, 0, TAU); ctx.clip(); ctx.lineWidth = Math.max(1, 0.6 / u); ctx.strokeStyle = rgba(look === 'contrast' ? I['void'] : I['punk-ink'], 0.5);
    ctx.beginPath(); for (var y = 0; y < 30; y += 5.5) { ctx.moveTo(-7, y); ctx.quadraticCurveTo(0, y + 2.5, 7, y); } ctx.stroke(); ctx.restore();
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, -12, 7.4, 8.6, 0, 0, TAU); ctx.fill(); ctx.lineWidth = Math.max(1.8, 0.9 / u); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -22.5, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(look === 'contrast' ? I['punk-acid'] : I['punk-acid']); ctx.beginPath(); ctx.arc(-3.2, -23.4, 1.9, 0, TAU); ctx.arc(3.2, -23.4, 1.9, 0, TAU); ctx.fill();
  };

  /* Offset, the two-plate koi: printed as a cyan plate and a magenta plate that never quite register; on the beat
     they slip apart with the swing and snap back. The plates overprint (multiply) on the fish's own paper, on a
     reused scratch canvas, so off the paper they still print in colour on any ground. */
  var SEG = 24, SP = [], SN = [];   /* a reused spine, so swimming allocates no arrays */
  for (var si = 0; si <= SEG; si++) { SP.push([0, 0]); SN.push([0, 0]); }
  var KOI = { x0: -54, y0: -56, w: 108, h: 114, len: 74, top: -46 };
  function hw(q) { q = clamp(q, 0, 1); return 17.5 * Math.pow(Math.sin(Math.PI * Math.pow(q, 0.6)), 0.85); }
  function spine(phase, amp, bend) {
    for (var i = 0; i <= SEG; i++) { var q = i / SEG; SP[i][0] = Math.sin(q * 3.4 - phase) * amp * Math.pow(q, 1.5) + bend * q * q * 9; SP[i][1] = KOI.top + q * KOI.len; }
    for (i = 0; i <= SEG; i++) { var a = SP[Math.max(0, i - 1)], b = SP[Math.min(SEG, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.sqrt(tx * tx + ty * ty) || 1; SN[i][0] = ty / l; SN[i][1] = -tx / l; }
  }
  function at(q, v) {   /* fish space (q along, 0 the snout and 1 the tail's root; v across, in units) onto the bent spine */
    var f = clamp(q, 0, 1) * SEG, i = Math.min(SEG - 1, Math.floor(f)), r = f - i, a = SP[i], b = SP[i + 1], na = SN[i], nb = SN[i + 1];
    return [mix(a[0], b[0], r) + mix(na[0], nb[0], r) * v, mix(a[1], b[1], r) + mix(na[1], nb[1], r) * v];
  }
  function line(k, p, first) { if (first) k.moveTo(p[0], p[1]); else k.lineTo(p[0], p[1]); }
  function bodyPath(k) {
    k.beginPath(); var i;
    for (i = 0; i <= SEG; i++) line(k, at(i / SEG, hw(i / SEG)), !i);
    for (i = SEG; i >= 0; i--) line(k, at(i / SEG, -hw(i / SEG)), false);
    k.closePath();
  }
  function along(q) { var i = Math.round(clamp(q, 0, 1) * SEG); return [-SN[i][1], SN[i][0]]; }   /* the spine's direction, head to tail */
  function finPath(k, q, side, len, back, droop) {   /* a long butterfly fin, swept back from the body's edge */
    var r = at(q, side * hw(q) * 0.86), r2 = at(q + 0.1, side * hw(q + 0.1) * 0.84), n = SN[Math.round(q * SEG)], a = along(q);
    var nx = n[0] * side, ny = n[1] * side, tx = r[0] + nx * len + a[0] * back, ty = r[1] + ny * len + a[1] * back + droop;
    k.moveTo(r[0], r[1]);
    k.bezierCurveTo(r[0] + nx * len * 0.5 - a[0] * 2, r[1] + ny * len * 0.5 - a[1] * 2, tx - a[0] * 6 + nx * 2, ty - a[1] * 6, tx, ty);
    k.bezierCurveTo(tx + a[0] * 5 - nx * 3, ty + a[1] * 5, r2[0] + nx * 5 + a[0] * 2, r2[1] + ny * 5 + a[1] * 2, r2[0], r2[1]);
    k.closePath();
    return [r, tx, ty, r2];
  }
  function finRays(k, q, side, len, back, droop) {
    var r = at(q + 0.03, side * hw(q) * 0.8), n = SN[Math.round(q * SEG)], a = along(q), nx = n[0] * side, ny = n[1] * side;
    for (var j = 0; j < 4; j++) { var f = 0.45 + j * 0.16, b = back * (0.4 + j * 0.22) + 2; k.moveTo(r[0], r[1]); k.quadraticCurveTo(r[0] + nx * len * 0.45 * f, r[1] + ny * len * 0.45 * f + 1, r[0] + nx * len * 0.82 * f + a[0] * b, r[1] + ny * len * 0.82 * f + a[1] * b + droop * f); }
  }
  function tailPath(k, swish) {
    var e = SP[SEG], a = along(1), n = SN[SEG], L = 25, S = 19, root = at(0.95, 0);
    k.moveTo(root[0] + n[0] * 3, root[1] + n[1] * 3);
    k.bezierCurveTo(e[0] + n[0] * 9 + a[0] * 6, e[1] + n[1] * 9 + a[1] * 6, e[0] + n[0] * (S + swish) + a[0] * L * 0.55, e[1] + n[1] * (S + swish) + a[1] * L * 0.55, e[0] + n[0] * (S + 1 + swish) + a[0] * L, e[1] + n[1] * (S + 1 + swish) + a[1] * L);
    k.bezierCurveTo(e[0] + n[0] * (S * 0.6) + a[0] * L * 0.92, e[1] + n[1] * (S * 0.6) + a[1] * L * 0.92, e[0] + n[0] * 3 + a[0] * L * 0.7, e[1] + n[1] * 3 + a[1] * L * 0.7, e[0] + a[0] * L * 0.62, e[1] + a[1] * L * 0.62);
    k.bezierCurveTo(e[0] - n[0] * 3 + a[0] * L * 0.7, e[1] - n[1] * 3 + a[1] * L * 0.7, e[0] - n[0] * (S * 0.6) + a[0] * L * 0.92, e[1] - n[1] * (S * 0.6) + a[1] * L * 0.92, e[0] - n[0] * (S + 1 - swish) + a[0] * L, e[1] - n[1] * (S + 1 - swish) + a[1] * L);
    k.bezierCurveTo(e[0] - n[0] * (S - swish) + a[0] * L * 0.55, e[1] - n[1] * (S - swish) + a[1] * L * 0.55, e[0] - n[0] * 9 + a[0] * 6, e[1] - n[1] * 9 + a[1] * 6, root[0] - n[0] * 3, root[1] - n[1] * 3);
    k.closePath();
  }
  function tailRays(k, swish) {
    var e = SP[SEG], a = along(1), n = SN[SEG], root = at(0.94, 0);
    for (var r = -3; r <= 3; r++) { if (!r) continue; var s = r / 3, tipx = e[0] + n[0] * (s * 18 + swish * Math.abs(s)) + a[0] * (24 - Math.abs(s) * 3), tipy = e[1] + n[1] * (s * 18 + swish * Math.abs(s)) + a[1] * (24 - Math.abs(s) * 3); k.moveTo(root[0], root[1]); k.quadraticCurveTo(e[0] + n[0] * s * 6 + a[0] * 8, e[1] + n[1] * s * 6 + a[1] * 8, tipx, tipy); }
  }
  /* kohaku markings: a round spot on the head, a saddle across the back, one more before the tail */
  var PATCH = [[0.1, 0.06, 0.045, 0.44, 0.4], [0.33, -0.3, 0.1, 0.9, 1.3], [0.42, 0.42, 0.08, 0.7, 2.1], [0.66, 0.3, 0.085, 0.8, 2.6]];
  function patches(k) {
    for (var j = 0; j < PATCH.length; j++) {
      var P = PATCH[j], a, first = true;
      for (a = 0; a < TAU; a += TAU / 22) { var wob = 1 + 0.13 * Math.sin(a * 3 + P[4]) + 0.07 * Math.sin(a * 5 + P[4] * 2); line(k, at(P[0] + Math.cos(a) * P[2] * wob, (P[1] + Math.sin(a) * P[3] * wob) * hw(P[0])), first); first = false; }
      k.closePath();
    }
  }
  function shade(k) {   /* a second, inner line down each flank, for the body's roundness */
    for (var e = -1; e <= 1; e += 2) for (var i = 3; i <= SEG - 2; i++) { var q = i / SEG, p = at(q, e * (hw(q) - 3.4)); if (i === 3) k.moveTo(p[0], p[1]); else k.lineTo(p[0], p[1]); }
  }
  function regMark(k) { k.moveTo(36.2, -42); k.arc(32, -42, 4.2, 0, TAU); k.moveTo(26, -42); k.lineTo(38, -42); k.moveTo(32, -48); k.lineTo(32, -36); }
  DRAW['two-plate-koi'] = function (ctx, look, o, g, u) {
    var I = INKS[look], t = o.t, phase = 0.9, amp = 2.4, bend = 0.15, sl = 1.2, ang = -0.6, swish = 1, flare = 0;
    if (!o.still) {
      var hh = hit(g.ph), oo = off(g.ph), sp = snap(g.ph), so = g.ph > 0.6 ? Math.max(0, snap(g.ph - 2 / 3 - LAG * 0.6)) : 0;
      phase = t * 2.2 + g.live * (g.n * 1.1 + hh * 1.2); amp = 2.6 + g.live * (2.6 * hh + 1.4 * oo);
      bend = mix(0.3 * Math.sin(t * 0.7), g.side * 0.4 * stepTo(g.ph, 0.4), g.live);
      sl = 1.2 + g.live * (5.8 * Math.max(0, sp) + 2.6 * so);
      ang = g.side > 0 ? -0.55 : 2.6; swish = 3.5 * Math.sin(t * 2.2 - 1.2) + g.live * 4.5 * hh * g.side; flare = hh * g.live;
    }
    if (look === 'contrast') sl = 0;
    spine(phase, amp, bend);
    var dev = devScale(ctx), cw = Math.ceil(KOI.w * dev), ch = Math.ceil(KOI.h * dev), cv = scratch('koi', cw, ch); if (!cv) return;
    var k = cv.getContext('2d'), sx = Math.cos(ang) * sl, sy = Math.sin(ang) * sl, lw = Math.max(2, 1 / u), thin = Math.max(0.75, 0.5 / u);
    var paper = look === 'contrast' ? I['void'] : I['punk-paper'], cyan = look === 'contrast' ? I['ink'] : I['wave-cyan'], mag = look === 'contrast' ? I['punk-acid'] : I['punk-magenta'];
    var fl = 21 + flare * 4, fb = 15 + flare * 3;
    function fins(c) { finPath(c, 0.2, 1, fl, fb, 4); finPath(c, 0.2, -1, fl, fb, 4); finPath(c, 0.55, 1, 10, 8, 2); finPath(c, 0.55, -1, 10, 8, 2); tailPath(c, swish); }
    k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, cw, ch); k.setTransform(dev, 0, 0, dev, -KOI.x0 * dev, -KOI.y0 * dev);
    k.lineJoin = 'round'; k.lineCap = 'round';
    /* the paper: the fish as printed stock, which never moves */
    k.beginPath(); fins(k); k.fillStyle = rgba(paper, look === 'contrast' ? 1 : 0.9); k.fill();
    bodyPath(k); k.fillStyle = rgba(paper); k.fill();
    if (look !== 'contrast') k.globalCompositeOperation = 'multiply';
    /* the cyan plate: the line, the fin rays, the scales, a registration mark */
    k.save(); k.translate(-sx, -sy); k.strokeStyle = rgba(cyan);
    k.beginPath(); fins(k); if (look !== 'contrast') { k.fillStyle = rgba(cyan, 0.2); k.fill(); } k.lineWidth = lw * 0.8; k.stroke();
    bodyPath(k); k.lineWidth = lw; k.stroke();
    k.lineWidth = thin; k.beginPath(); finRays(k, 0.2, 1, fl, fb, 4); finRays(k, 0.2, -1, fl, fb, 4); tailRays(k, swish); k.stroke(); k.beginPath(); k.strokeStyle = rgba(cyan, 0.55); shade(k); k.stroke(); k.strokeStyle = rgba(cyan); k.beginPath();
    var e1 = at(0.07, -hw(0.07) * 0.64), e2 = at(0.07, hw(0.07) * 0.64), sn = at(0.02, 0), dorsal = [at(0.3, 0), at(0.46, 0), at(0.62, 0)];
    k.moveTo(dorsal[0][0], dorsal[0][1]); k.quadraticCurveTo(dorsal[1][0], dorsal[1][1], dorsal[2][0], dorsal[2][1]);
    k.moveTo(sn[0] - 4, sn[1] + 1); k.lineTo(sn[0] - 8, sn[1] - 3); k.moveTo(sn[0] + 4, sn[1] + 1); k.lineTo(sn[0] + 8, sn[1] - 3);   /* the barbels */
    k.stroke();
    k.lineWidth = Math.max(1.1, 0.7 / u); k.beginPath(); k.arc(e1[0], e1[1], 2.7, 0, TAU); k.moveTo(e2[0] + 2.7, e2[1]); k.arc(e2[0], e2[1], 2.7, 0, TAU); regMark(k); k.stroke();
    k.restore();
    /* the magenta plate: the markings, cut to the fish as designed, then slipped with the plate */
    k.save(); k.translate(sx, sy);
    k.save(); bodyPath(k); k.clip(); k.beginPath(); patches(k); k.fillStyle = rgba(mag); k.fill(); k.restore();
    if (look !== 'contrast') { k.beginPath(); finPath(k, 0.2, 1, fl, fb, 4); finPath(k, 0.2, -1, fl, fb, 4); k.fillStyle = rgba(mag, 0.16); k.fill(); }
    k.beginPath(); regMark(k); k.strokeStyle = rgba(mag); k.lineWidth = Math.max(1.1, 0.7 / u); k.stroke();
    k.restore();
    k.globalCompositeOperation = 'source-over';
    /* the key: only the pupils are black, and they stay in register */
    k.fillStyle = rgba(look === 'contrast' ? I['ink'] : I['punk-ink']); k.beginPath(); k.arc(e1[0], e1[1], 1.6, 0, TAU); k.moveTo(e2[0] + 1.6, e2[1]); k.arc(e2[0], e2[1], 1.6, 0, TAU); k.fill();
    k.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cv, KOI.x0, KOI.y0, cw / dev, ch / dev);
  };

  /* Postmark, the stamp crab: a rubber-stamp crab in one ink, pressed unevenly over a halftone; it sidesteps on the
     beat and leaves its last impression fading behind */
  function crabBody(k, legs) {
    k.beginPath(); k.moveTo(-33, 2);
    k.bezierCurveTo(-34, -10, -22, -15, 0, -15); k.bezierCurveTo(22, -15, 34, -10, 33, 2);
    k.bezierCurveTo(33, 16, 18, 24, 0, 24); k.bezierCurveTo(-18, 24, -33, 16, -33, 2); k.closePath();
  }
  function crabLegs(k, pose) {
    var s, j, x0, y0, kx, ky, fx, fy;
    for (s = -1; s <= 1; s += 2) for (j = 0; j < 3; j++) {
      var lift = (j + (s > 0 ? 1 : 0)) % 2 === pose ? -4 : 0;
      x0 = s * (27 - j * 3); y0 = 9 + j * 6; kx = s * (42 - j * 2); ky = 4 + j * 8 + lift; fx = s * (50 - j * 5); fy = 30 + j * 5 + lift * 0.5;
      k.moveTo(x0, y0); k.lineTo(kx, ky); k.lineTo(fx, fy);
    }
  }
  function claw(k, open) {   /* the right claw, raised; the left is its mirror */
    k.beginPath(); k.moveTo(25, -6); k.quadraticCurveTo(37, -10, 40, -22); k.lineTo(45, -20); k.quadraticCurveTo(42, -6, 28, 0); k.closePath();
    k.moveTo(37, -24);
    k.bezierCurveTo(30, -30, 30, -42, 38, -47); k.bezierCurveTo(44, -50, 50, -47, 51, -42 + open * 2);
    k.lineTo(44, -36 + open * 3); k.lineTo(52, -34 + open * 4);
    k.bezierCurveTo(52, -27, 47, -21, 40, -20); k.closePath();
  }
  function stampInk(k, cw, ch, seed, U) {   /* uneven pressure: a light patch, speckle, and a worn edge */
    var R = rand(seed), i, x, y, r;
    k.globalCompositeOperation = 'destination-out';
    var gr = k.createRadialGradient(cw * 0.22, ch * 0.62, 0, cw * 0.22, ch * 0.62, cw * 0.3);
    gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = gr; k.fillRect(0, 0, cw, ch);
    for (i = 0; i < 260; i++) { x = R() * cw; y = R() * ch; r = (0.3 + R() * 0.9) * U; k.fillStyle = 'rgba(0,0,0,' + (0.35 + R() * 0.6) + ')'; k.beginPath(); k.arc(x, y, r, 0, TAU); k.fill(); }
    for (i = 0; i < 26; i++) { x = R() * cw; y = R() * ch; k.fillStyle = 'rgba(0,0,0,0.5)'; k.fillRect(x, y, (2 + R() * 6) * U, Math.max(1, 0.6 * U)); }
    k.globalCompositeOperation = 'source-over';
  }
  var CRAB = { x0: -60, y0: -56, w: 120, h: 104 };
  function crabBake(look, U, part) {
    var I = INKS[look], ink = I[look === 'dusk' ? 'wave-magenta' : look === 'zine' ? 'accent' : 'punk-acid'], cw = Math.ceil(CRAB.w * U), ch = Math.ceil(CRAB.h * U), c = surface(cw, ch); if (!c) return null;
    var k = c.getContext('2d'), L = Math.max(3, 1.1 / U);
    k.setTransform(U, 0, 0, U, -CRAB.x0 * U, -CRAB.y0 * U); k.lineJoin = 'round'; k.lineCap = 'round'; k.strokeStyle = k.fillStyle = rgba(ink);
    if (part === 'claw0' || part === 'claw1') {
      claw(k, part === 'claw1' ? 1 : 0); k.lineWidth = L; k.fill();
      k.globalCompositeOperation = 'destination-out'; k.lineWidth = Math.max(1, 0.5 / U) * 1.4; k.beginPath(); k.moveTo(36, -40); k.quadraticCurveTo(38, -45, 44, -45); k.stroke(); k.globalCompositeOperation = 'source-over';
    } else {
      k.beginPath(); crabLegs(k, part === 'legs1' ? 1 : 0); k.lineWidth = L * 1.25; k.stroke();
      /* eye stalks */
      k.lineWidth = L * 0.9; k.beginPath(); k.moveTo(-8, -13); k.lineTo(-11, -25); k.moveTo(8, -13); k.lineTo(11, -25); k.stroke();
      k.beginPath(); k.arc(-11.5, -28, 5, 0, TAU); k.arc(11.5, -28, 5, 0, TAU); k.fill();
      /* the shell: a solid rim, a halftone that darkens toward the edge, a scalloped brow */
      crabBody(k); k.lineWidth = L * 1.1; k.stroke();
      k.save(); crabBody(k); k.clip();
      for (var y = -16; y < 26; y += 3.4) for (var x = -34; x < 35; x += 3.4) {   /* lit from the top left: the dots grow away from the light */
        var oxx = x + ((Math.round((y + 16) / 3.4) % 2) ? 1.7 : 0), dd = Math.sqrt((oxx - 12) * (oxx - 12) / 520 + (y + 8) * (y + 8) / 200), rr = (0.42 + 0.58 * clamp((dd - 0.2) * 1.7, 0, 1)) * 2.15;
        if (rr > 0.28) { k.beginPath(); k.arc(oxx, y, rr, 0, TAU); k.fill(); }
      }
      k.restore();
      k.beginPath(); for (var b = -24; b <= 24; b += 8) { k.moveTo(b - 4, -12.5); k.quadraticCurveTo(b, -17.5, b + 4, -12.5); } k.lineWidth = L * 0.8; k.stroke();
      /* the face, cut out of the ink: eye glints, a pleased mouth */
      k.globalCompositeOperation = 'destination-out';
      k.beginPath(); k.arc(-10, -29.5, 1.8, 0, TAU); k.arc(13, -29.5, 1.8, 0, TAU); k.fill();
      k.lineWidth = Math.max(1.6, 0.7 / U); k.beginPath(); k.moveTo(-6, 4); k.quadraticCurveTo(0, 9, 6, 4); k.stroke();
      k.beginPath(); k.arc(-14, 1, 2.2, 0, TAU); k.arc(14, 1, 2.2, 0, TAU); k.fill();
      k.globalCompositeOperation = 'source-over';
    }
    k.setTransform(1, 0, 0, 1, 0, 0);
    stampInk(k, cw, ch, part.length * 97 + part.charCodeAt(part.length - 1), U);
    return { c: c, cw: cw, ch: ch, U: U, px: cw * ch };
  }
  DRAW['stamp-crab'] = function (ctx, look, o, g, u) {
    var U = bucket(devScale(ctx)), t = o.t;
    function part(name) { return baked('crab|' + look + '|' + U + '|' + name, function () { return crabBake(look, U, name); }); }
    var x = 0, y = 0, sq = 1, legs = 'legs0', open = 0, raise = 0, ghost = 0, gx = 0, rise = 0;
    if (!o.still) {
      var hh = hit(g.ph), oo = off(g.ph), spot = function (n) { return [-1, -1, 1, 1][((n % 4) + 4) % 4] * 9; }, k = stepTo(g.ph, 0.24);
      var shuffle = Math.sin(t * 0.8), idleX = 6 * (shuffle > 0.6 ? 1 : shuffle < -0.6 ? -1 : shuffle / 0.6);
      x = mix(idleX, mix(spot(g.n - 1), spot(g.n), k), g.live);
      rise = g.live * (g.ph < 0.26 && spot(g.n) !== spot(g.n - 1) ? Math.sin(Math.PI * clamp(g.ph / 0.26, 0, 1)) * 5 : 0);
      y = -rise; sq = 1 + 0.05 * g.live * hh * (g.ph > 0.2 ? 1 : 0);
      legs = (rise > 1 || (g.live < 0.5 && Math.floor(t * 3) % 2)) ? 'legs1' : 'legs0';
      open = clamp(mix(0.5 + 0.5 * Math.sin(t * 2.2), 1 - oo * 2, g.live), 0, 1);
      raise = mix(0.08 * Math.sin(t * 1.6), -0.12 * oo + 0.05 * hh, g.live);
      if (g.live > 0 && spot(g.n) !== spot(g.n - 1)) { ghost = 0.34 * g.live * clamp(1 - g.ph / 1.3, 0, 1); gx = spot(g.n - 1); }
    }
    function impression(px, py, a, s) {
      var bd = part(legs), cl = part(open > 0.5 ? 'claw1' : 'claw0'); if (!bd || !cl) return;
      var cw = bd.cw / U, ch = bd.ch / U;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(px, py + 24); ctx.scale(s, 1 / s); ctx.translate(0, -24);
      ctx.drawImage(bd.c, CRAB.x0, CRAB.y0, cw, ch);
      ctx.save(); ctx.translate(26, -4); ctx.rotate(raise); ctx.scale(1.12, 1.12); ctx.translate(-26, 4); ctx.drawImage(cl.c, CRAB.x0, CRAB.y0, cw, ch); ctx.restore();
      ctx.save(); ctx.scale(-1, 1); ctx.translate(26, -4); ctx.rotate(-raise * 0.7); ctx.translate(-26, 4); ctx.drawImage(cl.c, CRAB.x0, CRAB.y0, cw, ch); ctx.restore();
      ctx.restore();
    }
    ctx.translate(0, 6);
    if (ghost > 0.01) impression(gx, 0, ghost, 1);
    impression(x, y, 1, sq);
  };

  /* Flutter, the tape bat: each wing is an arm of cassette tape out to the wrist and three loops of it hanging from
     there for fingers, glossy side and matte side twisting through, a film of membrane between. The body is the
     cassette: reels for eyes, a label for a belly. A wingbeat on the beat, and a little wow in the tape. */
  var WRIST = [22, -24], FINGERS = [[0.16, 45, 8.5], [0.76, 42, 8], [1.32, 37, 7.5]];   /* angle from the wrist, length, half-width */
  var RN = 30, RX = [], RY = [], RS = [];
  for (var ri = 0; ri <= RN; ri++) { RX.push(0); RY.push(0); RS.push(0); }
  function measure(n) { var l = 0; RS[0] = 0; for (var i = 1; i <= n; i++) { var dx = RX[i] - RX[i - 1], dy = RY[i] - RY[i - 1]; l += Math.sqrt(dx * dx + dy * dy); RS[i] = l; } }
  function loop(seed, a, len, wid, t, wow) {   /* a teardrop of tape, its point at the wrist, sampled into RX/RY */
    var ca = Math.cos(a), sa = Math.sin(a), i, s, X, Y;
    for (i = 0; i <= RN; i++) {
      s = (i / RN) * TAU; X = len * (1 - Math.cos(s)) / 2; Y = wid * Math.sin(s) * (0.3 + 0.7 * (1 - Math.cos(s)) / 2);
      Y += wow * Math.sin(X * 0.25 - t * 2.3 + seed * 1.7) * Math.min(1, X / 10);   /* the wow: the tape wavers as it runs */
      RX[i] = WRIST[0] + X * ca - Y * sa; RY[i] = WRIST[1] + X * sa + Y * ca;
    }
    measure(RN); return RN;
  }
  function arm(t, wow) {   /* the arm: one strand from the shoulder up to the wrist */
    var n = 12, i, s, x, y;
    for (i = 0; i <= n; i++) { s = i / n; x = 2 * (1 - s) * s * 5 + s * s * WRIST[0]; y = 2 * (1 - s) * s * -22 + s * s * WRIST[1]; y += wow * 0.6 * Math.sin(s * 6 - t * 2.3); RX[i] = x; RY[i] = y; }
    measure(n); return n;
  }
  function tape(ctx, c, n, W, tw, u) {   /* the strand in RX/RY as tape: width pinches where it twists; matte side, glossy side, edges, shine */
    var i, face, cs, cs2, f1, f2, a0, a1, b0, b1, tx, ty, l, nx, ny, nx2, ny2, edge = Math.max(0.55, 0.42 / u);
    function nrm(i) { var a = Math.max(0, i - 1), b = Math.min(n, i + 1), x = RX[b] - RX[a], y = RY[b] - RY[a], q = Math.sqrt(x * x + y * y) || 1; NX = -y / q * W / 2; NY = x / q * W / 2; }
    function wid(i) { return 0.2 + 0.8 * Math.abs(Math.cos(RS[i] * 0.075 + tw)); }
    for (face = 1; face >= 0; face--) {
      ctx.beginPath();
      for (i = 0; i < n; i++) {
        cs = Math.cos(RS[i] * 0.075 + tw); if ((cs >= 0 ? 0 : 1) !== face) continue;
        nrm(i); nx = NX; ny = NY; f1 = wid(i); nrm(i + 1); nx2 = NX; ny2 = NY; f2 = wid(i + 1);
        ctx.moveTo(RX[i] + nx * f1, RY[i] + ny * f1); ctx.lineTo(RX[i + 1] + nx2 * f2, RY[i + 1] + ny2 * f2); ctx.lineTo(RX[i + 1] - nx2 * f2, RY[i + 1] - ny2 * f2); ctx.lineTo(RX[i] - nx * f1, RY[i] - ny * f1); ctx.closePath();
      }
      ctx.fillStyle = rgba(face ? c.back : c.front); ctx.fill();
    }
    ctx.beginPath();
    for (var e = -1; e <= 1; e += 2) for (i = 0; i <= n; i++) { nrm(i); f1 = wid(i) * e; if (i) ctx.lineTo(RX[i] + NX * f1, RY[i] + NY * f1); else ctx.moveTo(RX[i] + NX * f1, RY[i] + NY * f1); }
    ctx.strokeStyle = rgba(c.edge, 0.8); ctx.lineWidth = edge; ctx.stroke();
    ctx.beginPath();
    for (i = 0; i < n; i++) if (Math.cos(RS[i] * 0.075 + tw) > 0.5) { ctx.moveTo(RX[i], RY[i]); ctx.lineTo(RX[i + 1], RY[i + 1]); }
    ctx.strokeStyle = c.shine; ctx.lineWidth = Math.max(0.8, W * 0.24); ctx.stroke();
  }
  var NX = 0, NY = 0;
  function batPal(look, I) {
    if (look === 'zine') return { front: I['punk-ink'], back: I['chrome-1'], edge: I['punk-ink'], sheenA: I['punk-paper'], sheenB: I['wave-cyan'], film: I['wave-violet'], filmA: 0.85, body: I['punk-ink'], rim: I['punk-ink'], fur: I['chrome-1'], reel: I['punk-paper'], hub: I['punk-ink'], wound: I['chrome-2'], fang: I['punk-paper'], ear: I['wave-magenta'], label: I['punk-paper'], stripe: I['punk-magenta'], rule: I['chrome-1'] };
    if (look === 'contrast') return { front: I['ink'], back: I['punk-acid'], edge: I['void'], sheenA: I['void'], sheenB: I['void'], film: I['surface-raised'], filmA: 1, body: I['void'], rim: I['ink'], fur: I['ink-muted'], reel: I['ink'], hub: I['void'], wound: I['ink-muted'], fang: I['ink'], ear: I['punk-acid'], label: I['ink'], stripe: I['punk-acid'], rule: I['void'] };
    return { front: I['wave-indigo'], back: I['chrome-3'], edge: I['chrome-2'], sheenA: I['chrome-4'], sheenB: I['chrome-5'], film: I['wave-magenta'], filmA: 0.22, body: I['wave-abyss'], rim: I['chrome-2'], fur: I['chrome-3'], reel: I['punk-paper'], hub: I['punk-ink'], wound: I['wave-violet'], fang: I['punk-paper'], ear: I['chrome-4'], label: I['punk-paper'], stripe: I['punk-magenta'], rule: I['chrome-3'] };
  }
  function batBody(k) {
    k.beginPath(); k.moveTo(-12, -14); k.lineTo(-16, -33); k.lineTo(-5, -20); k.quadraticCurveTo(0, -21.5, 5, -20); k.lineTo(16, -33); k.lineTo(12, -14);
    k.bezierCurveTo(17, -6, 17, 10, 11, 17); k.quadraticCurveTo(0, 23, -11, 17); k.bezierCurveTo(-17, 10, -17, -6, -12, -14); k.closePath();
  }
  function membrane(k, wl) {   /* shoulder, wrist, the three finger tips with the scallops between, back to the hip */
    var tip = function (j) { var f = FINGERS[j]; return [WRIST[0] + Math.cos(f[0]) * f[1] * wl, WRIST[1] + Math.sin(f[0]) * f[1] * wl]; }, a = tip(0), b = tip(1), c = tip(2);
    k.beginPath(); k.moveTo(0, 2); k.quadraticCurveTo(5, -22, WRIST[0], WRIST[1]); k.lineTo(a[0], a[1]);
    k.quadraticCurveTo((a[0] + b[0]) / 2 - 7, (a[1] + b[1]) / 2 - 3, b[0], b[1]); k.quadraticCurveTo((b[0] + c[0]) / 2 - 3, (b[1] + c[1]) / 2 - 7, c[0], c[1]);
    k.quadraticCurveTo(c[0] - 12, c[1] - 6, 3, 14); k.closePath();
  }
  DRAW['tape-bat'] = function (ctx, look, o, g, u) {
    var I = INKS[look], c = batPal(look, I), t = o.t, flap = 0.3, bob = 0, wow = 0.5, spin = 0.5, tw = 0.6, wl = 1;
    if (!o.still) {
      var hh = hit(g.ph), oo = off(g.ph);
      flap = mix(0.26 + 0.16 * Math.sin(t * 3.3), 0.5 - 0.95 * hh - 0.3 * oo, g.live);
      wl = mix(1 + 0.03 * Math.sin(t * 3.3 + 1), 0.92 + 0.1 * hh, g.live);
      bob = mix(1.8 * Math.sin(t * 3.3 - 0.9), -5 * hh - 1.6 * oo, g.live);
      wow = 0.6 + g.live * (0.6 + 1.5 * hh); spin = t * 1.4 + g.live * (g.n * 0.9 + hh * 0.6); tw = t * 0.9;
    }
    var gr = ctx.createLinearGradient(0, -40, 60, 10); gr.addColorStop(0, rgba(c.sheenA)); gr.addColorStop(1, rgba(c.sheenB)); c.shine = look === 'contrast' ? rgba(I['void']) : gr;
    var i, j, side, n;
    ctx.translate(0, bob + 12); ctx.scale(1.02, 1.02); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (side = -1; side <= 1; side += 2) {
      ctx.save(); ctx.translate(side * 10, -8); ctx.scale(side, 1); ctx.rotate(-flap);
      membrane(ctx, wl); ctx.fillStyle = rgba(c.film, c.filmA); ctx.fill();
      for (j = FINGERS.length - 1; j >= 0; j--) { n = loop(j + (side > 0 ? 3 : 0), FINGERS[j][0], FINGERS[j][1] * wl, FINGERS[j][2], t, wow); tape(ctx, c, n, 4.6, tw + j * 1.3 + side, u); }
      n = arm(t, wow); tape(ctx, c, n, 5, tw + 2.2 + side, u);
      ctx.restore();
    }
    /* the body is the cassette: fur, a rim of light, ears */
    batBody(ctx); ctx.fillStyle = rgba(c.body); ctx.fill(); ctx.strokeStyle = rgba(c.rim); ctx.lineWidth = Math.max(1.6, 0.8 / u); ctx.stroke();
    ctx.fillStyle = rgba(c.ear); ctx.beginPath(); ctx.moveTo(-12.4, -17); ctx.lineTo(-14.2, -28.5); ctx.lineTo(-7.4, -19.6); ctx.closePath(); ctx.moveTo(12.4, -17); ctx.lineTo(14.2, -28.5); ctx.lineTo(7.4, -19.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(c.fur, 0.5); ctx.lineWidth = Math.max(0.7, 0.45 / u); ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-12, 1); ctx.moveTo(14, -2); ctx.lineTo(12, 1); ctx.moveTo(-13.5, 6); ctx.lineTo(-11.5, 9); ctx.moveTo(13.5, 6); ctx.lineTo(11.5, 9); ctx.stroke();
    /* a label for a belly */
    ctx.fillStyle = rgba(c.label); ctx.fillRect(-8.5, 3, 17, 10.5); ctx.fillStyle = rgba(c.stripe); ctx.fillRect(-8.5, 9.4, 17, 2.4);
    ctx.strokeStyle = rgba(c.rule); ctx.lineWidth = Math.max(0.5, 0.35 / u); ctx.beginPath(); ctx.moveTo(-6.5, 5.4); ctx.lineTo(6.5, 5.4); ctx.moveTo(-6.5, 7.6); ctx.lineTo(3.5, 7.6); ctx.stroke();
    /* feet */
    ctx.strokeStyle = rgba(c.rim); ctx.lineWidth = Math.max(1, 0.55 / u); ctx.beginPath(); ctx.moveTo(-5, 19); ctx.lineTo(-6, 24); ctx.lineTo(-3.5, 25); ctx.moveTo(5, 19); ctx.lineTo(6, 24); ctx.lineTo(3.5, 25); ctx.stroke();
    /* the eyes are two reels: one full of tape, one nearly run out */
    for (j = 0; j < 2; j++) {
      var ex = j ? 6.6 : -6.6, wound = j ? 3.3 : 4.9;
      ctx.beginPath(); ctx.arc(ex, -9, 5.8, 0, TAU); ctx.fillStyle = rgba(c.reel); ctx.fill();
      ctx.beginPath(); ctx.arc(ex, -9, wound, 0, TAU); ctx.fillStyle = rgba(c.wound); ctx.fill();
      ctx.beginPath(); ctx.arc(ex, -9, 2.3, 0, TAU); ctx.fillStyle = rgba(c.reel); ctx.fill();
      ctx.save(); ctx.translate(ex, -9); ctx.rotate(spin * (j ? 1.45 : 1)); ctx.fillStyle = rgba(c.hub);
      for (var q = 0; q < 6; q++) { ctx.rotate(TAU / 6); ctx.fillRect(-0.5, 0.75, 1, 1.6); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(ex, -9, 5.8, 0, TAU); ctx.strokeStyle = rgba(c.hub); ctx.lineWidth = Math.max(0.9, 0.55 / u); ctx.stroke();
    }
    /* a grin with fangs */
    ctx.strokeStyle = rgba(c.rim); ctx.lineWidth = Math.max(0.9, 0.5 / u); ctx.beginPath(); ctx.moveTo(-4.5, -1.5); ctx.quadraticCurveTo(0, 1.4, 4.5, -1.5); ctx.stroke();
    ctx.fillStyle = rgba(c.fang); ctx.beginPath(); ctx.moveTo(-3.1, -0.7); ctx.lineTo(-1.9, 2.6); ctx.lineTo(-0.9, -0.1); ctx.closePath(); ctx.moveTo(3.1, -0.7); ctx.lineTo(1.9, 2.6); ctx.lineTo(0.9, -0.1); ctx.closePath(); ctx.fill();
  };

  /* draw(ctx, id, { x, y, size, t, beat, look, still, alpha }): centred on (x, y), size ≈ its height in CSS px */
  function draw(ctx, id, o) {
    var p = pet(id); if (!ctx || !p) return false;
    o = o || {};
    var look = INKS[o.look] ? o.look : 'dusk', size = o.size > 0 ? +o.size : 64, u = size / 100, t = +o.t || 0;
    var g = o.still ? null : groove(p.id, t, o.beat);
    ctx.save();
    try {
      if (o.alpha != null) ctx.globalAlpha *= clamp(+o.alpha, 0, 1);
      ctx.translate(+o.x || 0, +o.y || 0); ctx.scale(u, u);
      DRAW[p.id](ctx, look, { t: t, still: !!o.still }, g, u);
    } finally { ctx.restore(); }
    return true;
  }

  H.pets = { kit: KIT, key: KEY, version: VERSION, list: LIST, has: has, find: find, count: count, total: total, draw: draw };
})(window, document);
