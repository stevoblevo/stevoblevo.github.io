/* Depthfield 2.4.0 · pets: the five night pets as data and as drawings, and the family's shared pets save (family task F9).
   Depthfield.pets.list            the five night pets: { id, name, line, how, where }
   Depthfield.pets.has(id)         found yet? (find(id) records it; count() counts Depthfield's own)
   Depthfield.pets.total()         found across the family from the same save: Storeybrook sb (7), Depthfield df (5),
                                   Hypermetapunk hmp (5), 17 in all
   Depthfield.pets.draw(ctx, id, o) a pet on canvas, lit like the art, dancing to the beat with a swing
   The save is localStorage['crossing:pets'] on stevoblevo.github.io: { found: { 'sb:<id>': ts, 'df:<id>': ts, 'hmp:<id>': ts },
   active: { sb: id } }, written read-modify-write so no other kit's entry is lost.
   An add-on like pen.js: load it after bundle.js, or alone. It reads no CSS and needs no DOM to draw. Its inks are a part of
   the pen's tables; tools/pen-inks.py checks them against tokens.json. */
(function (w) {
  'use strict';
  var D = w.Depthfield = w.Depthfield || {};
  if (D.pets) return;
  var VERSION = '2.4.0', KEY = 'crossing:pets', KIT = 'df', SIZE = { sb: 7, df: 5, hmp: 5 }, HOME = 'https://stevoblevo.github.io/depthfield/';
  var LIST = [
    { id: 'glass-bloom', name: 'Glass bloom', line: 'It floated off the haze to follow you.', how: 'Somewhere in the haze over the glasshouse.', where: HOME + '?theme=night' },
    { id: 'mint-spore', name: 'Mint spore', line: 'It left the near ridge for your pointer.', how: 'On the nearest ridge of the glasshouse.', where: HOME + '?theme=night' },
    { id: 'frost-seed', name: 'Frost seed', line: 'The far ridge let it go.', how: 'On the far ridge of the glasshouse.', where: HOME + '?theme=night' },
    { id: 'winkle', name: 'Winkle', line: 'A small eye that came off the ridge when you winked first.', how: 'Wink at the eye in the mint clearing.', where: HOME + '?theme=peach-day' },
    { id: 'firefly', name: 'Firefly', line: 'The night garden’s last light.', how: 'It drifts over the night garden, past the doors.', where: HOME + '?theme=contrast' }
  ];

  /* ---------- the shared save ---------- */
  var held = null;   /* a copy kept here as well, for when storage is out of reach (a private window, blocked site data) */
  function read() {
    var raw, v = null;
    try { raw = w.localStorage.getItem(KEY); } catch (e) { raw = undefined; }
    if (raw === undefined) v = held ? JSON.parse(JSON.stringify(held)) : null;   /* out of reach: what this page found */
    else if (raw) { try { v = JSON.parse(raw); } catch (e) { v = null; } }   /* a save that does not parse starts again */
    if (!v || typeof v !== 'object') v = {};
    if (!v.found || typeof v.found !== 'object') v.found = {};
    return v;
  }
  function write(v) { held = v; try { w.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function bare(id) { id = String(id == null ? '' : id); return id.indexOf(KIT + ':') === 0 ? id.slice(KIT.length + 1) : id; }
  function known(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return true; return false; }
  /* 'winkle' and 'df:winkle' are the same pet; another kit's id ('sb:saelion') is looked up as given */
  function has(id) { var b = bare(id); return !!read().found[b.indexOf(':') < 0 ? KIT + ':' + b : b]; }
  function find(id) {
    var b = bare(id), v;
    if (!known(b)) return false;
    v = read();
    if (v.found[KIT + ':' + b]) return false;
    v.found[KIT + ':' + b] = Date.now(); write(v);
    return true;
  }
  function count() { var f = read().found, n = 0, i; for (i = 0; i < LIST.length; i++) if (f[KIT + ':' + LIST[i].id]) n++; return n; }
  function total() {
    var f = read().found, o = { sb: 0, df: 0, hmp: 0, all: 0 }, k, p, i;
    for (k in f) if (Object.prototype.hasOwnProperty.call(f, k) && f[k]) { p = k.slice(0, k.indexOf(':')); if (p === 'sb' || p === 'hmp') o[p]++; }
    for (i = 0; i < LIST.length; i++) if (f[KIT + ':' + LIST[i].id]) o.df++;
    o.sb = Math.min(SIZE.sb, o.sb); o.hmp = Math.min(SIZE.hmp, o.hmp); o.all = o.sb + o.df + o.hmp;
    return o;
  }

  /* ---------- inks: the pen's tables, only the ones the pets use ---------- */
  var BASE = { 'eye-white': [233, 245, 239], 'eye-pupil': [7, 17, 15], 'eye-glint': [255, 255, 255], 'wx-mint-rim': [94, 242, 184], 'wx-night-rim': [201, 230, 255], 'wx-peach-rim': [255, 180, 138], 'gh-glow': [201, 255, 230] };
  var INKS = {
    'night': { 'art-void': [7, 17, 15], 'art-ink': [233, 245, 239], 'ink': [233, 245, 239], 'mint': [94, 242, 184], 'frost': [201, 230, 255], 'cue': [201, 230, 255], 'peach': [255, 180, 138] },
    'day': { 'art-void': [7, 17, 15], 'art-ink': [233, 245, 239], 'ink': [13, 26, 23], 'mint': [11, 114, 85], 'frost': [31, 95, 143], 'cue': [31, 95, 143], 'peach': [165, 70, 31] },
    'peach-night': { 'art-void': [17, 23, 34], 'art-ink': [243, 236, 230], 'ink': [243, 236, 230], 'mint': [94, 242, 184], 'frost': [201, 230, 255], 'cue': [201, 230, 255], 'peach': [255, 180, 138] },
    'peach-day': { 'art-void': [17, 23, 34], 'art-ink': [243, 236, 230], 'ink': [27, 33, 48], 'mint': [11, 114, 85], 'frost': [31, 95, 143], 'cue': [31, 95, 143], 'peach': [165, 70, 31] },
    'thread-night': { 'art-void': [13, 11, 28], 'art-ink': [243, 236, 224], 'ink': [243, 236, 224], 'mint': [94, 242, 184], 'frost': [201, 230, 255], 'cue': [201, 230, 255], 'peach': [255, 180, 138] },
    'thread-day': { 'art-void': [13, 11, 28], 'art-ink': [243, 236, 224], 'ink': [33, 27, 48], 'mint': [11, 114, 85], 'frost': [31, 95, 143], 'cue': [31, 95, 143], 'peach': [165, 70, 31] },
    'contrast': { 'art-void': [0, 0, 0], 'art-ink': [255, 255, 255], 'ink': [255, 255, 255], 'mint': [125, 255, 201], 'frost': [214, 236, 255], 'cue': [214, 236, 255], 'peach': [255, 196, 163] }
  };
  var MODE = { 'night': 0, 'day': 1, 'peach-night': 0, 'peach-day': 1, 'thread-night': 0, 'thread-day': 1, 'contrast': 2 };   /* 0 lit night, 1 paper, 2 keyline */
  var TAU = Math.PI * 2, LIGHT = Math.atan2(-0.75, -0.55), PAL = {};
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, k) { return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a < 0 ? 0 : a > 1 ? 1 : a) + ')'; }
  /* a look's pet palette, resolved once. On paper the bodies take the look's own hues and the glow keeps the night's. */
  function palette(look) {
    var id = MODE[look] == null ? 'night' : look, P = PAL[id], I, m, deep, white = BASE['eye-glint'];
    if (P) return P;
    I = INKS[id]; m = MODE[id]; deep = I['art-void'];
    function hue(name, aura) { var c = I[name]; return { c: c, hi: mix(c, white, m === 1 ? 0.5 : 0.68), lo: mix(c, deep, m === 1 ? 0.3 : 0.55), aura: m === 2 ? c : BASE[aura] }; }
    P = PAL[id] = {
      id: id, light: m === 1, bare: m === 2, deep: deep, ink: I.ink, line: I['art-ink'], white: white,
      mint: hue('mint', 'wx-mint-rim'), frost: hue('frost', 'wx-night-rim'), cue: hue('cue', 'wx-night-rim'), ember: hue('peach', 'wx-peach-rim'),
      glass: BASE['gh-glow'], sclera: BASE['eye-white'], scleraLo: mix(BASE['eye-white'], m === 1 ? I.mint : deep, m === 1 ? 0.28 : 0.42), pupil: BASE['eye-pupil'],
      hot: mix(BASE['wx-peach-rim'], white, 0.8), shell: m === 1 ? mix(I.ink, I.peach, 0.25) : mix(deep, BASE['wx-peach-rim'], 0.18)
    };
    return P;
  }

  /* ---------- the swing: one beat clock per pet, read from the host's beat envelope ---------- */
  var LAG = 0.07, OFF = 2 / 3 + 0.04, BEAT = {};   /* the hit lands a little behind the beat; the off-beat at two thirds (long, short), a little late too */
  function hit(p, c, a, r) { var k = p - c; return k < 0 ? Math.exp(-(k * k) / (a * a)) : Math.exp(-k / r); }
  function ease(x, d) { x = clamp(x / d, 0, 1); x -= 1; return 1 + 2.4 * x * x * x + 1.4 * x * x; }   /* out, with a small overshoot */
  /* `beat` jumps to 1 on each beat and decays. A jump marks the beat; the time between jumps gives the period. */
  function groove(id, t, beat) {
    if (!(beat > 0)) return null;
    var st = BEAT[id] || (BEAT[id] = { b: 0, at: -1e9, per: 0.5, n: 0, g: { p: 0, n: 0, down: 0, off: 0 } }), p, e, G = st.g;
    if (t < st.at) st.at = -1e9;
    if (beat > 0.5 && beat > st.b + 0.25 && t - st.at > 0.15) { if (t - st.at < 2) st.per = st.per * 0.5 + clamp(t - st.at, 0.25, 1.5) * 0.5; st.at = t; st.n++; }
    st.b = beat;
    p = (t - st.at) / st.per;
    if (p > 2.5) return null;
    e = clamp(2.5 - p, 0, 1);
    G.p = p; G.n = st.n;
    G.down = e * (hit(p, LAG, 0.05, 0.17) + (p < 1 ? hit(p - 1, LAG, 0.05, 0.17) : 0));
    G.off = p < 1 ? e * hit(p, OFF, 0.05, 0.09) : 0;
    return G;
  }
  var RM = null;
  function reduced() {
    try {
      if (D.reducedMotion) return !!D.reducedMotion();
      if (RM === null) RM = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : false;
      return !!(RM && RM.matches);
    } catch (e) { return false; }
  }

  /* ---------- drawing, in a unit box: the pet is about 1 tall, centred on 0, 0 ---------- */
  function glow(ctx, P, r, col, a, wide) {   /* a soft bloom round the origin; `wide` keeps more light out at the edge, like a lantern's */
    if (P.bare || a <= 0) return;
    if (P.light) a *= 0.5;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    if (wide) { g.addColorStop(0, rgba(col, a)); g.addColorStop(0.35, rgba(col, a * 0.5)); g.addColorStop(0.7, rgba(col, a * 0.16)); g.addColorStop(1, rgba(col, 0)); }
    else { g.addColorStop(0, rgba(col, a)); g.addColorStop(0.18, rgba(col, a * 0.62)); g.addColorStop(0.45, rgba(col, a * 0.22)); g.addColorStop(0.75, rgba(col, a * 0.06)); g.addColorStop(1, rgba(col, 0)); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  }
  function bloom(ctx, P) { if (!P.light) ctx.globalCompositeOperation = 'lighter'; }
  function settle(ctx) { ctx.globalCompositeOperation = 'source-over'; }
  /* a lit sphere: the highlight up and to the left, the far edge falling to shadow, and a glint */
  function orb(ctx, P, x, y, r, h, px) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (P.bare) { ctx.fillStyle = rgba(P.deep); ctx.fill(); ctx.lineWidth = Math.max(1.5 * px, r * 0.18); ctx.strokeStyle = rgba(h.c); ctx.stroke(); return; }
    var g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r * 1.04);
    g.addColorStop(0, rgba(h.hi)); g.addColorStop(0.48, rgba(h.c)); g.addColorStop(1, rgba(h.lo));
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = rgba(P.white, 0.85); ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.4, r * 0.24, 0, TAU); ctx.fill();
  }
  function shadow(ctx, P) {   /* on paper a floating pet casts a soft shadow, which is its depth */
    ctx.save(); ctx.translate(0, 0.45); ctx.scale(1, 0.2);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.3);
    g.addColorStop(0, rgba(P.ink, 0.16)); g.addColorStop(1, rgba(P.ink, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.3, 0, TAU); ctx.fill(); ctx.restore();
  }
  function lit(a) { var k = Math.cos(a - LIGHT); return k > 0 ? k : 0; }   /* how squarely a direction faces the moon */

  /* Mint spore: six spines and a bead at each tip. Idle it breathes and turns; to music the spines pump on the hit and it
     steps round a twelfth of a turn each beat, a little late, with a smaller push on the off-beat. */
  function spore(ctx, P, m) {
    var h = P.mint, t = m.t, g = m.g, px = m.px / 1.3, len = 1 + Math.sin(t * 2.4) * 0.08, turn = t * 0.5, fl = 0, i, a, c, s, r0, r1, wd, k;
    if (g) { len += 0.26 * g.down + 0.12 * g.off; turn = t * 0.12 + (g.n + ease(g.p - LAG, 0.32)) * Math.PI / 6; fl = g.down * 0.9 + g.off * 0.45; ctx.translate(0, -0.045 * g.down + 0.02 * g.off); }
    bloom(ctx, P); glow(ctx, P, 0.5 + 0.04 * fl, h.aura, 0.5 + 0.3 * fl); glow(ctx, P, 0.24, h.aura, 0.5 + 0.3 * fl); settle(ctx);
    ctx.scale(1.3, 1.3);
    for (i = 0; i < 12; i++) {   /* the six back spines sit between the front ones, shorter and in shadow */
      var front = i % 2 === 0; a = turn + i * Math.PI / 6; c = Math.cos(a); s = Math.sin(a);
      r0 = front ? 0.07 : 0.06; r1 = (front ? 0.25 : 0.165) * len; wd = (front ? 0.04 : 0.03);
      if (P.bare) { if (!front) continue; ctx.beginPath(); ctx.moveTo(c * r0, s * r0); ctx.lineTo(c * r1, s * r1); ctx.lineWidth = Math.max(1.5 * px, 0.025); ctx.strokeStyle = rgba(h.c); ctx.stroke(); }
      else {
        k = lit(a);
        ctx.beginPath(); ctx.moveTo(c * r0 - s * wd / 2, s * r0 + c * wd / 2); ctx.lineTo(c * r1, s * r1); ctx.lineTo(c * r0 + s * wd / 2, s * r0 - c * wd / 2); ctx.closePath();
        ctx.fillStyle = front ? rgba(mix(h.lo, h.hi, 0.25 + 0.75 * k)) : rgba(h.lo, 0.9); ctx.fill();
      }
      if (front) {   /* the bead */
        var br = Math.max(1.1 * px, 0.03);
        ctx.beginPath(); ctx.arc(c * r1, s * r1, br, 0, TAU);
        if (P.bare) { ctx.fillStyle = rgba(h.c); ctx.fill(); continue; }
        ctx.fillStyle = rgba(mix(h.c, h.hi, k)); ctx.fill();
        ctx.fillStyle = rgba(P.white, 0.5 + 0.4 * k); ctx.beginPath(); ctx.arc(c * r1 - br * 0.35, s * r1 - br * 0.35, br * 0.42, 0, TAU); ctx.fill();
      }
    }
    orb(ctx, P, 0, 0, 0.085, h, px);
  }

  /* Glass bloom: two rings of glass petals round a mint heart. It opens on the hit and sways on the off-beat. */
  function petal(ctx, a, r0, r1, wd) {
    var c = Math.cos(a), s = Math.sin(a), nx = -s * wd, ny = c * wd, q = r0 + (r1 - r0) * 0.42, e = r1 + (r1 - r0) * 0.1;
    ctx.beginPath(); ctx.moveTo(c * r0, s * r0);
    ctx.bezierCurveTo(c * q + nx, s * q + ny, c * e + nx * 0.62, s * e + ny * 0.62, c * r1, s * r1);
    ctx.bezierCurveTo(c * e - nx * 0.62, s * e - ny * 0.62, c * q - nx, s * q - ny, c * r0, s * r0);
    ctx.closePath();
  }
  function glassBloom(ctx, P, m) {
    var h = P.cue, t = m.t, g = m.g, px = m.px / 1.22, open = 1 + Math.sin(t * 1.7) * 0.05, turn = t * 0.25, fl = 0, i, a, k, c, s, gr, r1;
    if (g) { open += 0.2 * g.down + 0.05 * g.off; turn = t * 0.08 + (g.n + ease(g.p - LAG, 0.4)) * Math.PI / 12 + 0.12 * g.off; fl = g.down; }
    bloom(ctx, P); glow(ctx, P, 0.5 + 0.04 * fl, h.aura, 0.42 + 0.25 * fl); glow(ctx, P, 0.2, P.glass, 0.55 + 0.3 * fl); settle(ctx);
    ctx.scale(1.22, 1.22);
    if (!P.bare) {   /* glass: bright by the heart, clear at the tips; at night the petals add light where they overlap */
      gr = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.32);
      gr.addColorStop(0, rgba(h.hi, P.light ? 0.6 : 0.5)); gr.addColorStop(0.4, rgba(h.c, P.light ? 0.3 : 0.2)); gr.addColorStop(1, rgba(h.c, P.light ? 0.14 : 0.08));
      bloom(ctx, P);
    }
    for (i = 0; i < 12; i++) {
      var front = i >= 6; a = turn + (front ? (i - 6) * Math.PI / 3 : i * Math.PI / 3 + Math.PI / 6); r1 = (front ? 0.29 : 0.21) * open;
      petal(ctx, a, 0.04, r1, front ? 0.1 : 0.075);
      if (P.bare) { if (front) { ctx.lineWidth = Math.max(1.5 * px, 0.016); ctx.strokeStyle = rgba(h.c); ctx.stroke(); } continue; }
      ctx.fillStyle = gr; ctx.fill();
      ctx.lineWidth = Math.max(0.9 * px, 0.009); ctx.strokeStyle = rgba(front ? h.hi : h.c, front ? 0.7 : 0.3); ctx.stroke();
      if (!front) continue;
      c = Math.cos(a); s = Math.sin(a); k = lit(a);
      ctx.beginPath(); ctx.moveTo(c * 0.07, s * 0.07); ctx.lineTo(c * r1 * 0.78, s * r1 * 0.78);   /* the crease down each petal */
      ctx.lineWidth = Math.max(0.7 * px, 0.007); ctx.strokeStyle = rgba(h.hi, 0.22 + 0.3 * k); ctx.stroke();
      if (k < 0.15) continue;   /* a specular line on the petals that face the moon */
      ctx.beginPath(); ctx.moveTo(c * r1 * 0.42 - s * 0.03, s * r1 * 0.42 + c * 0.03); ctx.lineTo(c * r1 * 0.82 - s * 0.022, s * r1 * 0.82 + c * 0.022);
      ctx.lineWidth = Math.max(1 * px, 0.014); ctx.strokeStyle = rgba(P.white, 0.8 * k); ctx.stroke();
    }
    settle(ctx);
    orb(ctx, P, 0, 0, 0.062, P.mint, px);
  }

  /* Frost seed: a six-armed crystal with a spark that catches the moon. It rings on the hit, steps round each beat, and
     the spark flashes on the off-beat. */
  function frostSeed(ctx, P, m) {
    var h = P.frost, t = m.t, g = m.g, px = m.px / 1.3, len = 1 + Math.sin(t * 2.1 + 1) * 0.05, turn = t * 0.18, fl = 0, tw = 0.5 + 0.5 * Math.sin(t * 3.3), i, a, c, s, r1, b, bc, bs, j;
    if (g) { len += 0.14 * g.down; turn = t * 0.06 + (g.n + ease(g.p - LAG, 0.3)) * Math.PI / 12; fl = g.down; tw = Math.max(g.off * 1.1, 0.2 + 0.3 * g.down); }
    if (m.still) tw = 0.7;
    bloom(ctx, P); glow(ctx, P, 0.5 + 0.04 * fl, h.aura, 0.44 + 0.3 * fl); glow(ctx, P, 0.2, h.aura, 0.46 + 0.3 * fl); settle(ctx);
    ctx.scale(1.3, 1.3);
    ctx.save(); ctx.rotate(turn);
    ctx.beginPath();
    for (i = 0; i < 6; i++) {
      a = i * Math.PI / 3; c = Math.cos(a); s = Math.sin(a); r1 = 0.26 * len;
      ctx.moveTo(c * 0.06, s * 0.06); ctx.lineTo(c * r1, s * r1);
      for (j = 0; j < 2; j++) {   /* two pairs of branches on each arm */
        var d = (j ? 0.195 : 0.135) * len, l = j ? 0.045 : 0.068;
        for (b = -1; b <= 1; b += 2) { bc = Math.cos(a + b * 1.0); bs = Math.sin(a + b * 1.0); ctx.moveTo(c * d, s * d); ctx.lineTo(c * d + bc * l, s * d + bs * l); }
      }
    }
    if (P.bare) { ctx.lineWidth = Math.max(1.5 * px, 0.02); ctx.strokeStyle = rgba(h.c); ctx.stroke(); }
    else {
      ctx.lineWidth = Math.max(1.4 * px, 0.026); ctx.strokeStyle = rgba(h.lo, 0.95); ctx.stroke();
      ctx.lineWidth = Math.max(0.8 * px, 0.013); ctx.strokeStyle = rgba(h.hi); ctx.stroke();   /* ice: a bright line down the middle of every arm */
    }
    ctx.beginPath();   /* the hexagonal heart */
    for (i = 0; i < 6; i++) { a = i * Math.PI / 3 + Math.PI / 6; if (i) ctx.lineTo(Math.cos(a) * 0.075, Math.sin(a) * 0.075); else ctx.moveTo(Math.cos(a) * 0.075, Math.sin(a) * 0.075); }
    ctx.closePath();
    if (P.bare) { ctx.fillStyle = rgba(P.deep); ctx.fill(); ctx.lineWidth = Math.max(1.5 * px, 0.016); ctx.strokeStyle = rgba(h.c); ctx.stroke(); }
    else {
      var hg = ctx.createLinearGradient(-0.06, -0.07, 0.06, 0.07); hg.addColorStop(0, rgba(h.hi)); hg.addColorStop(0.5, rgba(h.c)); hg.addColorStop(1, rgba(h.lo));
      ctx.fillStyle = hg; ctx.fill(); ctx.lineWidth = Math.max(0.8 * px, 0.01); ctx.strokeStyle = rgba(P.white, 0.7); ctx.stroke();
    }
    ctx.restore();
    if (P.bare || tw <= 0.05) return;
    var sx = -0.12, sy = -0.13, sr = 0.1 * clamp(tw, 0, 1.2);   /* the spark, fixed to the moon's side while the crystal turns */
    bloom(ctx, P);
    ctx.fillStyle = rgba(P.white, 0.9 * clamp(tw, 0, 1));
    ctx.beginPath(); ctx.moveTo(sx, sy - sr); ctx.quadraticCurveTo(sx, sy, sx + sr * 0.6, sy); ctx.quadraticCurveTo(sx, sy, sx, sy + sr * 0.6);
    ctx.quadraticCurveTo(sx, sy, sx - sr * 0.6, sy); ctx.quadraticCurveTo(sx, sy, sx, sy - sr); ctx.fill();
    settle(ctx);
  }

  /* Winkle: a small eye. It looks where it is told (lookX, lookY) or wanders; idle it blinks every few seconds, to music it
     blinks on the swung off-beat, squashes on the hit and glances from side to side. */
  function almond(ctx, rx, ry) {
    ctx.beginPath(); ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx * 0.45, -ry * 1.3, rx * 0.45, -ry * 1.3, rx, 0);
    ctx.bezierCurveTo(rx * 0.45, ry * 1.2, -rx * 0.45, ry * 1.2, -rx, 0);
    ctx.closePath();
  }
  function winkle(ctx, P, m) {
    var h = P.mint, t = m.t, g = m.g, o = m.o, px = m.px / 1.32, open = 1, sx = 1, sy = 1, fl = 0, ix = 0, iy = 0, dil = 1, bt, side, i, a;
    if (!m.still) { bt = t % 4.2; if (bt > 4.02) open = Math.abs(bt - 4.11) / 0.09; }
    if (g) { open = 1 - 0.95 * hit(g.p, OFF, 0.06, 0.08); sx = 1 + 0.06 * g.down; sy = 1 - 0.08 * g.down; fl = g.down; dil = 1 + 0.22 * g.down; }
    if (o.lookX != null && o.lookY != null) {
      var dx = o.lookX - (o.x || 0), dy = o.lookY - (o.y || 0), d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / (m.s * 2.5));
      ix = dx / d * k * 0.1; iy = dy / d * k * 0.055;
    } else if (g) { side = g.n % 2 ? 1 : -1; ix = side * (2 * ease(g.p - LAG, 0.28) - 1) * 0.075; }
    else if (!m.still) { ix = Math.sin(t * 0.63) * 0.06; iy = Math.sin(t * 0.41 + 1) * 0.025; }
    bloom(ctx, P); glow(ctx, P, 0.5, h.aura, 0.3 + 0.22 * fl); glow(ctx, P, 0.34, h.aura, 0.16); settle(ctx);
    ctx.scale(1.32 * sx, 1.32 * sy);
    var rx = 0.31, ry = 0.19 * Math.max(0.05, open), lw = Math.max(1.3 * px, 0.022);
    if (open < 0.12) {   /* shut: the lid and three lashes */
      ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.quadraticCurveTo(0, 0.07, rx, 0);
      for (i = -1; i <= 1; i++) { ctx.moveTo(i * 0.12, 0.045 - Math.abs(i) * 0.012); ctx.lineTo(i * 0.16, 0.1 - Math.abs(i) * 0.01); }
      ctx.lineWidth = lw * 1.3; ctx.strokeStyle = rgba(P.bare ? P.line : h.c, 0.95); ctx.stroke(); return;
    }
    almond(ctx, rx, ry);
    if (P.bare) {
      ctx.fillStyle = rgba(P.deep); ctx.fill(); ctx.lineWidth = Math.max(1.5 * px, 0.02); ctx.strokeStyle = rgba(P.line); ctx.stroke();
      ctx.save(); almond(ctx, rx, ry); ctx.clip();
      ctx.beginPath(); ctx.arc(ix, iy, 0.13, 0, TAU); ctx.strokeStyle = rgba(h.c); ctx.stroke();
      ctx.beginPath(); ctx.arc(ix, iy, 0.05 * dil, 0, TAU); ctx.fillStyle = rgba(h.c); ctx.fill(); ctx.restore(); return;
    }
    var sg = ctx.createRadialGradient(-0.05, -0.07, 0.02, 0, 0, 0.36);   /* the white of a ball, not a disc */
    sg.addColorStop(0, rgba(P.sclera)); sg.addColorStop(0.5, rgba(P.sclera)); sg.addColorStop(1, rgba(P.scleraLo));
    ctx.fillStyle = sg; ctx.fill();
    ctx.save(); ctx.clip();
    var ig = ctx.createRadialGradient(ix - 0.03, iy - 0.035, 0.008, ix, iy, 0.135);
    ig.addColorStop(0, rgba(h.hi)); ig.addColorStop(0.45, rgba(h.c)); ig.addColorStop(0.84, rgba(h.lo)); ig.addColorStop(1, rgba(P.pupil));
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, 0.135, 0, TAU); ctx.fill();
    if (m.s >= 44) {   /* the iris's threads, once there is room for them */
      ctx.beginPath();
      for (i = 0; i < 18; i++) { a = i * TAU / 18 + 0.2; ctx.moveTo(ix + Math.cos(a) * 0.06, iy + Math.sin(a) * 0.06); ctx.lineTo(ix + Math.cos(a) * (0.11 + (i % 3) * 0.008), iy + Math.sin(a) * (0.11 + (i % 3) * 0.008)); }
      ctx.lineWidth = Math.max(0.6 * px, 0.006); ctx.strokeStyle = rgba(h.hi, 0.4); ctx.stroke();
    }
    ctx.fillStyle = rgba(P.pupil); ctx.beginPath(); ctx.arc(ix, iy, 0.052 * dil, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(P.white, 0.95); ctx.beginPath(); ctx.arc(ix - 0.045, iy - 0.05, 0.03, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(P.white, 0.55); ctx.beginPath(); ctx.arc(ix + 0.042, iy + 0.032, 0.013, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(P.white, P.light ? 0.5 : 0.3); ctx.beginPath(); ctx.ellipse(-0.19, -0.045 * open, 0.045, 0.018, -0.35, 0, TAU); ctx.fill();   /* wet light on the white */
    var lg = ctx.createLinearGradient(0, -ry * 1.05, 0, -ry * 1.05 + 0.13);   /* the lid's shadow on the ball */
    lg.addColorStop(0, rgba(P.deep, P.light ? 0.3 : 0.55)); lg.addColorStop(1, rgba(P.deep, 0));
    ctx.fillStyle = lg; ctx.fillRect(-rx, -ry * 1.05, rx * 2, 0.14);
    ctx.restore();
    almond(ctx, rx, ry); ctx.lineWidth = lw; ctx.strokeStyle = rgba(h.c, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.bezierCurveTo(-rx * 0.45, -ry * 1.3, rx * 0.45, -ry * 1.3, rx, 0);   /* the lash line */
    ctx.lineWidth = lw * 1.6; ctx.strokeStyle = rgba(h.lo, 0.95); ctx.stroke();
  }

  /* Firefly: a lantern with a body and wings. Idle it flickers; to music it flares on the hit and again, smaller, on the
     off-beat, and hops a little. */
  function firefly(ctx, P, m) {
    var h = P.ember, t = m.t, g = m.g, px = m.px / 1.55, a = m.still ? 0.9 : 0.72 + 0.28 * Math.sin(t * 3.1), fl = 0, flap = m.still ? 1 : 0.72 + 0.28 * Math.sin(t * 19), hov = m.still ? 0 : Math.sin(t * 1.9) * 0.025, side;
    if (g) { a = 0.42 + 0.58 * Math.max(g.down, 0.75 * g.off); fl = g.down + 0.5 * g.off; hov = -0.045 * g.off + 0.02 * g.down; }
    ctx.translate(-0.015, hov - 0.035);
    ctx.translate(0.027, 0.064);   /* the bloom sits on the lantern */
    bloom(ctx, P); glow(ctx, P, 0.5 * (1 + 0.12 * fl), h.aura, 0.6 * a + 0.15 * fl, true); glow(ctx, P, 0.24, h.aura, 0.9 * a); glow(ctx, P, 0.1, P.hot, 0.75 * a); settle(ctx);
    ctx.translate(-0.027, -0.064);
    ctx.scale(1.55, 1.55); ctx.rotate(-0.4);
    for (side = -1; side <= 1; side += 2) {   /* wings, catching the lantern and the moon */
      ctx.save(); ctx.translate(side * 0.012, -0.085); ctx.rotate(side * (0.62 + 0.3 * (1 - flap))); ctx.scale(flap, 1);
      ctx.beginPath(); ctx.ellipse(0, -0.07, 0.04, 0.078, 0, 0, TAU);
      if (P.bare) { ctx.lineWidth = Math.max(1.2 * px, 0.012); ctx.strokeStyle = rgba(P.line); ctx.stroke(); }
      else { ctx.fillStyle = rgba(P.frost.aura, P.light ? 0.3 : 0.16); ctx.fill(); ctx.lineWidth = Math.max(0.7 * px, 0.008); ctx.strokeStyle = rgba(P.light ? P.frost.c : P.white, P.light ? 0.5 : 0.4); ctx.stroke(); }
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-0.012, -0.16); ctx.quadraticCurveTo(-0.03, -0.22, -0.06, -0.235); ctx.moveTo(0.012, -0.16); ctx.quadraticCurveTo(0.03, -0.22, 0.06, -0.235);
    ctx.lineWidth = Math.max(0.8 * px, 0.008); ctx.strokeStyle = rgba(P.bare ? P.line : P.light ? P.shell : h.aura, P.bare ? 1 : 0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.15, 0.026, 0, TAU); ctx.moveTo(0.034, -0.09); ctx.ellipse(0, -0.09, 0.034, 0.045, 0, 0, TAU);   /* head and thorax */
    if (P.bare) { ctx.fillStyle = rgba(P.deep); ctx.fill(); ctx.lineWidth = Math.max(1.2 * px, 0.012); ctx.strokeStyle = rgba(P.line); ctx.stroke(); }
    else { ctx.fillStyle = rgba(P.shell); ctx.fill(); ctx.lineWidth = Math.max(0.7 * px, 0.008); ctx.strokeStyle = rgba(h.aura, 0.35 + 0.3 * a); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 0.025, 0.044, 0.078, 0, 0, TAU);   /* the lantern */
    if (P.bare) { ctx.lineWidth = Math.max(1.5 * px, 0.016); ctx.strokeStyle = rgba(h.c); ctx.stroke(); ctx.fillStyle = rgba(h.c); ctx.beginPath(); ctx.arc(0, 0.04, 0.024, 0, TAU); ctx.fill(); return; }
    var lg = ctx.createRadialGradient(0, 0.045, 0.004, 0, 0.03, 0.085);
    lg.addColorStop(0, rgba(P.hot)); lg.addColorStop(0.45, rgba(h.aura, 0.6 + 0.4 * a)); lg.addColorStop(1, P.light ? rgba(h.c, 0.95) : rgba(mix(h.aura, h.lo, 0.6 - 0.4 * a), 0.95));
    ctx.fillStyle = lg; ctx.fill();
    bloom(ctx, P); ctx.fillStyle = rgba(P.hot, 0.55 + 0.45 * a); ctx.beginPath(); ctx.arc(0, 0.045, 0.022 + 0.008 * fl, 0, TAU); ctx.fill(); settle(ctx);
  }

  var PAINT = { 'glass-bloom': glassBloom, 'mint-spore': spore, 'frost-seed': frostSeed, 'winkle': winkle, 'firefly': firefly };
  var M = { s: 40, px: 0.025, t: 0, g: null, still: false, o: null };   /* one motion record, reused every call */
  /* draw(ctx, id, { x, y, size, t, beat, look, still, alpha, lookX, lookY }): the pet centred on x, y, about `size` tall */
  function draw(ctx, id, o) {
    var b = bare(id), fn = PAINT[b], P, s, still;
    if (!fn || !ctx) return;
    o = o || {};
    s = o.size > 0 ? o.size : 40; P = palette(o.look || 'night'); still = !!o.still || reduced();
    M.s = s; M.px = 1 / s; M.o = o; M.still = still; M.t = still ? 0 : (+o.t || 0); M.g = still ? null : groove(b, +o.t || 0, +o.beat || 0);
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha *= clamp(+o.alpha, 0, 1);
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (P.light) shadow(ctx, P);
    fn(ctx, P, M);
    ctx.restore();
    M.o = null;
  }

  D.pets = { kit: KIT, key: KEY, version: VERSION, list: LIST, has: has, find: find, count: count, total: total, draw: draw };
})(typeof window !== 'undefined' ? window : self);
