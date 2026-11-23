/* Hypermetapunk 0.3.0 · the pen: a theme's inks and its horizon, for games that draw on canvas (plan C4, family F4).
   Hypermetapunk.looks        the three themes as data (id, name, light, motion, print)
   Hypermetapunk.pen(theme)   resolved inks, and a pen that draws the dusk band, the banded sun, the grid floor, chrome
                              and misregistered lettering, and the print materials
   An add-on: load it after bundle.js, or alone (a single-file game needs nothing else). It reads no CSS. */
(function (w, d) {
  'use strict';
  var H = w.Hypermetapunk = w.Hypermetapunk || {};
  if (H.pen) return;
  var VERSION = '0.3.0', root = d.documentElement;
  var LOOKS = [
    { id: 'dusk', name: 'Dusk', light: false, motion: true, print: false, line: 'Neon at the horizon, chrome over violet' },
    { id: 'zine', name: 'Zine', light: true, motion: true, print: true, line: 'Photocopied in daylight, stapled, stickered' },
    { id: 'contrast', name: 'High contrast', light: false, motion: false, print: false, line: 'Black, white and acid, nothing lost' }
  ];
  function token(name, el) { try { return getComputedStyle(el || root).getPropertyValue('--' + name).trim(); } catch (e) { return ''; } }
  function reduced() { try { return root.classList.contains('hmp-still') || w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function rand(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  /* The numbers in INKS are project/tokens.json resolved to RGB; tools/pen-inks.py fails when they drift. A host asks
     for a colour by its token name, never by a hex value, so the same drawing code prints in every theme. */
  var INKS = {
    dusk: { 'void': [11, 6, 24], 'paper': [11, 6, 24], 'surface': [22, 13, 46], 'surface-raised': [33, 21, 67], 'page': [33, 21, 67], 'line': [61, 44, 112], 'ink': [247, 242, 255], 'ink-muted': [201, 189, 240], 'accent': [255, 111, 181], 'accent-soft': [255, 111, 181, 0.16], 'on-accent': [20, 6, 31], 'cue': [5, 255, 161], 'on-cue': [4, 20, 12], 'link': [127, 233, 255], 'focus': [232, 255, 0], 'chrome-1': [253, 253, 255], 'chrome-2': [201, 214, 255], 'chrome-3': [127, 127, 213], 'chrome-4': [255, 113, 206], 'chrome-5': [1, 205, 254], 'wave-abyss': [6, 3, 15], 'wave-indigo': [27, 15, 58], 'wave-violet': [61, 22, 99], 'wave-magenta': [255, 46, 136], 'wave-tangerine': [255, 184, 107], 'wave-sun': [255, 251, 150], 'wave-cyan': [1, 205, 254], 'wave-mint': [5, 255, 161], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 90, 0], 'punk-magenta': [255, 0, 168], 'punk-ink': [13, 13, 18], 'slap': [255, 46, 136], 'punk-paper': [244, 239, 227], 'punk-tape': [255, 235, 150, 0.78], 'scrawl': [255, 113, 206] },
    zine: { 'void': [244, 239, 227], 'paper': [244, 239, 227], 'surface': [233, 226, 207], 'surface-raised': [255, 253, 246], 'page': [255, 253, 246], 'line': [201, 192, 168], 'ink': [13, 13, 18], 'ink-muted': [70, 64, 77], 'accent': [194, 0, 106], 'accent-soft': [194, 0, 106, 0.1], 'on-accent': [255, 255, 255], 'cue': [0, 106, 70], 'on-cue': [255, 255, 255], 'link': [0, 80, 168], 'focus': [255, 90, 0], 'chrome-1': [122, 122, 146], 'chrome-2': [52, 52, 74], 'chrome-3': [13, 13, 18], 'chrome-4': [74, 74, 102], 'chrome-5': [13, 13, 18], 'wave-abyss': [244, 239, 227], 'wave-indigo': [238, 226, 242], 'wave-violet': [246, 207, 230], 'wave-magenta': [255, 155, 203], 'wave-tangerine': [255, 207, 158], 'wave-sun': [255, 243, 166], 'wave-cyan': [1, 165, 212], 'wave-mint': [0, 194, 122], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 90, 0], 'punk-magenta': [255, 0, 168], 'punk-ink': [13, 13, 18], 'slap': [13, 13, 18], 'punk-paper': [255, 253, 246], 'punk-tape': [255, 230, 140, 0.85], 'scrawl': [194, 0, 106] },
    contrast: { 'void': [0, 0, 0], 'paper': [0, 0, 0], 'surface': [11, 11, 11], 'surface-raised': [20, 20, 20], 'page': [20, 20, 20], 'line': [255, 255, 255], 'ink': [255, 255, 255], 'ink-muted': [232, 232, 232], 'accent': [232, 255, 0], 'accent-soft': [232, 255, 0, 0.18], 'on-accent': [0, 0, 0], 'cue': [5, 255, 161], 'on-cue': [0, 0, 0], 'link': [127, 233, 255], 'focus': [232, 255, 0], 'chrome-1': [255, 255, 255], 'chrome-2': [255, 255, 255], 'chrome-3': [232, 232, 232], 'chrome-4': [255, 255, 255], 'chrome-5': [232, 255, 0], 'wave-abyss': [0, 0, 0], 'wave-indigo': [0, 0, 0], 'wave-violet': [17, 17, 17], 'wave-magenta': [51, 51, 51], 'wave-tangerine': [119, 119, 119], 'wave-sun': [255, 255, 255], 'wave-cyan': [255, 255, 255], 'wave-mint': [255, 255, 255], 'punk-acid': [232, 255, 0], 'punk-orange': [255, 255, 255], 'punk-magenta': [255, 255, 255], 'punk-ink': [0, 0, 0], 'slap': [255, 255, 255], 'punk-paper': [255, 255, 255], 'punk-tape': [255, 255, 255, 0.9], 'scrawl': [232, 255, 0] }
  };
  var BAND = [['wave-abyss', 0], ['wave-indigo', 0.34], ['wave-violet', 0.52], ['wave-magenta', 0.72], ['wave-tangerine', 0.9], ['wave-sun', 1.08]];
  var SUN_BARS = [[0, 0.52], [0.55, 0.64], [0.68, 0.76], [0.81, 0.88], [0.94, 1]];   /* the lit bands of the disc; the gaps are the cuts */
  var GRAIN = { dusk: 0.24, zine: 0.28, contrast: 0 };
  function penLook(look) {
    var id = typeof look === 'string' ? look : look && look.closest ? (look.closest('[data-theme]') || root).getAttribute('data-theme') : root.getAttribute('data-theme');
    return INKS[id] ? id : 'dusk';
  }
  function pen(look, opt) {
    var id = penLook(look), I = INKS[id], T = LOOKS.filter(function (x) { return x.id === id; })[0], held = !!(opt && opt.still), tiles = {};
    function ink(name) { return I[name] || I.ink; }
    function rgb(name, a) { var c = typeof name === 'string' ? ink(name) : name; return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? (c.length > 3 ? c[3] : 1) : a) + ')'; }
    function mix(a, b, k) { return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]; }
    function band(k) {   /* the dusk gradient at k (0 the top of the sky, 1.08 past the sun) */
      for (var i = 1; i < BAND.length; i++) if (k <= BAND[i][1]) return mix(ink(BAND[i - 1][0]), ink(BAND[i][0]), (k - BAND[i - 1][1]) / (BAND[i][1] - BAND[i - 1][1]));
      return ink('wave-sun');
    }
    /* the sky: the gradient stepped down in hard toner bands, with the printer's lines across it. Its bottom edge is the horizon.
       `ease` above 1 holds the dark longer and keeps the hot bands close to the horizon, for a sky with words over it. */
    function sky(ctx, o) {
      var x = o.x || 0, y = o.y || 0, n = Math.max(2, o.steps || 14), span = o.span == null ? 0.9 : o.span, ease = o.ease > 0 ? o.ease : 1, i, y0, y1;
      ctx.save();
      if (id === 'contrast') { ctx.fillStyle = rgb('void'); ctx.fillRect(x, y, o.w, o.h); ctx.restore(); return; }
      for (i = 0; i < n; i++) { y0 = Math.floor(y + (o.h * i) / n); y1 = Math.ceil(y + (o.h * (i + 1)) / n); ctx.fillStyle = rgb(band(Math.pow((i + 0.5) / n, ease) * span)); ctx.fillRect(x, y0, o.w, y1 - y0); }
      if (o.lines !== false) { ctx.fillStyle = 'rgba(0,0,0,0.115)'; for (i = y; i < y + o.h; i += 5) ctx.fillRect(x, i, o.w, 2); }
      ctx.restore();
    }
    /* the sun: a banded disc with its base on (x, y). Dusk prints the gradient with a glow, Zine prints it flat magenta, High contrast in ink. */
    function sun(ctx, o) {
      var r = o.r, cx = o.x, cy = o.y - r, top = cy - r, g, i;
      ctx.save();
      if (id === 'dusk' && o.glow !== false) { g = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.7); g.addColorStop(0, rgb('chrome-4', 0.4)); g.addColorStop(1, rgb('chrome-4', 0)); ctx.fillStyle = g; ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4); }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      if (id === 'zine') ctx.fillStyle = rgb('punk-magenta'); else if (id === 'contrast') ctx.fillStyle = rgb('ink');
      else { g = ctx.createLinearGradient(0, top, 0, top + 2 * r); g.addColorStop(0, rgb('wave-sun')); g.addColorStop(0.42, rgb('wave-tangerine')); g.addColorStop(0.78, rgb('wave-magenta')); g.addColorStop(1, rgb('chrome-4')); ctx.fillStyle = g; }
      for (i = 0; i < SUN_BARS.length; i++) ctx.fillRect(cx - r, top + 2 * r * SUN_BARS[i][0], 2 * r, 2 * r * (SUN_BARS[i][1] - SUN_BARS[i][0]) + 0.5);
      if (o.tape !== false && id !== 'contrast') { ctx.translate(cx, top + 2 * r * 0.355); ctx.rotate(-4 * Math.PI / 180); ctx.fillStyle = rgb('punk-tape'); ctx.fillRect(-r * 1.1, -r * 0.13, r * 2.2, r * 0.26); }
      ctx.restore();
    }
    /* the grid floor: rows that close up toward the horizon (its top edge) and lines that fan from the vanishing point. `t` in seconds drifts the rows toward the viewer; it holds still under reduced motion and "hold still". */
    function floor(ctx, o) {
      var x = o.x || 0, y = o.y, w = o.w, h = o.h, vx = o.vx == null ? x + w / 2 : o.vx, rows = o.rows || 11, gap = o.gap || Math.max(40, w / 12), spread = o.spread || 3;
      var ph = held || reduced() ? 0 : (((o.t || 0) / 3.2) % 1 + 1) % 1, i, k, yy, a, j, n, bx;
      var hc = id === 'dusk' ? ink('wave-cyan') : id === 'zine' ? ink('punk-ink') : ink('ink'), vc = id === 'dusk' ? ink('wave-magenta') : hc;
      var ha = id === 'dusk' ? 0.55 : id === 'zine' ? 0.5 : 0.9, va = id === 'dusk' ? 0.45 : id === 'zine' ? 0.35 : 0.7;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.lineWidth = o.line || 2;
      for (i = 0; i <= rows; i++) {
        k = (i + ph) / rows; yy = y + h * Math.pow(k, 2.1); a = Math.min(1, (yy - y) / (h * 0.16)) * Math.min(1, (1.02 - k) * 7);   /* thin out where the rows crowd the horizon */
        if (a <= 0.01) continue;
        ctx.strokeStyle = rgb(hc, ha * a); ctx.beginPath(); ctx.moveTo(x, Math.round(yy) + 0.5); ctx.lineTo(x + w, Math.round(yy) + 0.5); ctx.stroke();
      }
      n = Math.ceil((w / 2 + Math.abs(vx - (x + w / 2))) / (gap * 0.3)) + 1;
      var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgb(vc, 0)); g.addColorStop(0.3, rgb(vc, va)); g.addColorStop(0.86, rgb(vc, va)); g.addColorStop(1, rgb(vc, 0)); ctx.strokeStyle = g;
      for (j = -n; j <= n; j++) { bx = vx + j * gap * spread; ctx.beginPath(); ctx.moveTo(vx + j * gap * 0.3, y); ctx.lineTo(bx, y + h); ctx.stroke(); }
      ctx.restore();
    }
    /* sky, sun and floor in one call. `at` is where the horizon sits (0 to 1 down the box). */
    function horizon(ctx, o) {
      var x = o.x || 0, y = o.y || 0, hy = Math.round(y + o.h * (o.at == null ? 0.58 : o.at)), r = o.sunR == null ? Math.min(o.w, o.h) * 0.2 : o.sunR;
      sky(ctx, { x: x, y: y, w: o.w, h: hy - y, steps: o.steps, lines: o.lines });
      if (r > 0) sun(ctx, { x: o.sunX == null ? x + o.w / 2 : o.sunX, y: hy, r: r, tape: o.tape });
      ctx.fillStyle = rgb(id === 'zine' ? 'paper' : 'void'); ctx.fillRect(x, hy, o.w, y + o.h - hy);
      floor(ctx, { x: x, y: hy, w: o.w, h: y + o.h - hy, vx: o.sunX, t: o.t });
      return hy;
    }
    /* print materials as patterns: `scan` (the printer's lines), `halftone` (a dot screen), `xerox` (photocopy speckle) */
    function material(ctx, kind) {
      if (tiles[kind]) return ctx.createPattern(tiles[kind], 'repeat');
      var c = d.createElement('canvas'), k = c.getContext('2d'), i, R;
      if (kind === 'scan') { c.width = 4; c.height = 5; k.fillStyle = 'rgba(0,0,0,0.115)'; k.fillRect(0, 0, 4, 2); }
      else if (kind === 'halftone') { c.width = c.height = 8; k.fillStyle = rgb(id === 'dusk' ? 'wave-abyss' : id === 'zine' ? 'punk-ink' : 'ink', id === 'dusk' ? 0.5 : 0.32); k.beginPath(); k.arc(2, 2, 1.5, 0, 7); k.arc(6, 6, 1.5, 0, 7); k.fill(); }
      else { c.width = c.height = 128; R = rand(1977); for (i = 0; i < 2600; i++) { k.fillStyle = R() < 0.5 ? 'rgba(255,255,255,' + (0.1 + R() * 0.5) + ')' : 'rgba(0,0,0,' + (0.1 + R() * 0.5) + ')'; k.fillRect((R() * 128) | 0, (R() * 128) | 0, 1 + ((R() * 2) | 0), 1); } }
      tiles[kind] = c; return ctx.createPattern(c, 'repeat');
    }
    /* lay the theme's photocopy grain over a box (nothing in High contrast) */
    function grain(ctx, o) {
      var a = (o.amount == null ? GRAIN[id] : o.amount); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = material(ctx, 'xerox'); ctx.fillRect(o.x || 0, o.y || 0, o.w, o.h); ctx.restore();
    }
    function face(o) { return (o.weight || '') + ' ' + o.size + 'px ' + (o.font || token('font-display') || '"Archivo Black", "Arial Black", Impact, sans-serif'); }
    /* chrome lettering: the mirror gradient over a slipped magenta plate. Zine prints it dark with the plate dropped; High contrast prints solid ink on a ground-coloured keyline. */
    function chrome(ctx, text, x, y, o) {
      var s = o.size, g, slip = Math.max(2, s * (id === 'zine' ? 0.07 : 0.045));
      ctx.save(); ctx.font = face(o); ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
      if (id === 'contrast') { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, s * 0.12); ctx.strokeStyle = rgb('void'); ctx.strokeText(text, x, y); ctx.fillStyle = rgb('ink'); ctx.fillText(text, x, y); ctx.restore(); return; }
      ctx.fillStyle = rgb('punk-magenta'); ctx.fillText(text, x + slip, y + slip);
      g = ctx.createLinearGradient(0, y - s * 0.78, 0, y + s * 0.06);
      g.addColorStop(0, rgb('chrome-1')); g.addColorStop(0.32, rgb('chrome-2')); g.addColorStop(0.5, rgb('chrome-3')); if (id === 'dusk') g.addColorStop(0.54, 'rgb(234,246,255)'); g.addColorStop(0.76, rgb('chrome-4')); g.addColorStop(1, rgb('chrome-5'));
      ctx.fillStyle = g; ctx.fillText(text, x, y); ctx.restore();
    }
    /* misregistered type: a cyan plate and a magenta plate slipped either side of the ink */
    function misreg(ctx, text, x, y, o) {
      var dx = o.dx == null ? Math.max(1.5, o.size * 0.035) : o.dx;
      ctx.save(); ctx.font = face(o); ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
      if (id !== 'contrast') { ctx.fillStyle = rgb('wave-cyan', 0.85); ctx.fillText(text, x - dx, y - dx * 0.4); ctx.fillStyle = rgb('punk-magenta', 0.85); ctx.fillText(text, x + dx, y + dx * 0.4); }
      ctx.fillStyle = rgb(o.ink || 'ink'); ctx.fillText(text, x, y); ctx.restore();
    }
    return { look: id, name: T.name, light: T.light, inks: I, rgb: rgb, band: band, sky: sky, sun: sun, floor: floor, horizon: horizon, material: material, grain: grain, chrome: chrome, misreg: misreg };
  }
  H.looks = H.looks || LOOKS; H.pen = pen; H.penVersion = VERSION;
})(window, document);
