/* Depthfield 2.3.0 · the pen: a look's inks and its world, for games that draw on canvas (family task F4).
   Depthfield.looks          the seven looks as data (id, name, light, motion, print)
   Depthfield.pen(look)      resolved inks, the four weathers, and a pen that draws the world: sky, sun, stars, three
                             ridges with their rim light, haze and vignette
   An add-on: load it after bundle.js, or alone (a single-file game needs nothing else). It reads no CSS. The numbers
   are project/tokens.json resolved to RGB; tools/pen-inks.py fails when they drift. */
(function (w, d) {
  'use strict';
  var D = w.Depthfield = w.Depthfield || {};
  if (D.pen) return;
  var VERSION = '2.3.0';
  var LOOKS = [
    { id: 'night', name: 'Night · mint', light: false, motion: true, print: false, weather: 'night' },
    { id: 'day', name: 'Day · mint', light: true, motion: true, print: true, weather: 'mint' },
    { id: 'peach-night', name: 'Night · peach', light: false, motion: true, print: false, weather: 'peach' },
    { id: 'peach-day', name: 'Day · peach', light: true, motion: true, print: true, weather: 'peach' },
    { id: 'thread-night', name: 'Night · thread', light: false, motion: true, print: false, weather: 'night' },
    { id: 'thread-day', name: 'Day · thread', light: true, motion: true, print: true, weather: 'night' },
    { id: 'contrast', name: 'High contrast', light: false, motion: false, print: false, weather: 'night' }
  ];
  var WEATHER = [{ id: 'peach', name: 'peach fall' }, { id: 'rain', name: 'red rain' }, { id: 'mint', name: 'mint clearing' }, { id: 'night', name: 'night garden' }];
  var BASE = { 'wx-peach-sky-top': [38, 26, 44], 'wx-peach-sky-low': [255, 150, 120], 'wx-peach-sun': [255, 200, 160], 'wx-peach-ridge-1': [60, 34, 52], 'wx-peach-ridge-2': [86, 44, 58], 'wx-peach-ridge-3': [120, 60, 64], 'wx-peach-rim': [255, 180, 138], 'wx-rain-sky-top': [22, 14, 24], 'wx-rain-sky-low': [150, 40, 52], 'wx-rain-sun': [255, 110, 110], 'wx-rain-ridge-1': [40, 18, 28], 'wx-rain-ridge-2': [58, 22, 32], 'wx-rain-ridge-3': [80, 28, 38], 'wx-rain-rim': [255, 107, 107], 'wx-mint-sky-top': [10, 26, 28], 'wx-mint-sky-low': [40, 130, 110], 'wx-mint-sun': [200, 255, 230], 'wx-mint-ridge-1': [14, 46, 42], 'wx-mint-ridge-2': [18, 66, 56], 'wx-mint-ridge-3': [30, 96, 80], 'wx-mint-rim': [94, 242, 184], 'wx-night-sky-top': [10, 14, 26], 'wx-night-sky-low': [34, 48, 80], 'wx-night-sun': [201, 230, 255], 'wx-night-ridge-1': [18, 24, 40], 'wx-night-ridge-2': [24, 32, 52], 'wx-night-ridge-3': [32, 42, 66], 'wx-night-rim': [201, 230, 255], 'gh-sky-top': [8, 28, 25], 'gh-sky-top-end': [14, 42, 48], 'gh-sky-low': [18, 72, 60], 'gh-sky-low-end': [96, 150, 150], 'gh-ridge-1': [12, 46, 38], 'gh-ridge-2': [16, 66, 52], 'gh-ridge-3': [30, 104, 82], 'gh-shaft': [160, 255, 215], 'gh-glow': [201, 255, 230], 'gh-haze': [140, 230, 195], 'eye-white': [233, 245, 239], 'eye-iris': [94, 242, 184], 'eye-pupil': [7, 17, 15], 'eye-glint': [255, 255, 255], 'lamp': [255, 214, 160] };
  var INKS = {
    'night': { 'void': [7, 17, 15], 'surface': [13, 26, 23], 'surface-raised': [20, 36, 32], 'line': [35, 53, 47], 'ink': [233, 245, 239], 'ink-muted': [147, 170, 161], 'accent': [94, 242, 184], 'accent-soft': [15, 58, 44], 'on-accent': [7, 17, 15], 'cue': [201, 230, 255], 'on-cue': [7, 17, 15], 'link': [94, 242, 184], 'danger': [255, 138, 122], 'focus': [201, 230, 255], 'scrim': [7, 17, 15, 0.7], 'chrome': [20, 36, 32, 0.86], 'mint': [94, 242, 184], 'mint-soft': [15, 58, 44], 'on-mint': [7, 17, 15], 'frost': [201, 230, 255], 'frost-soft': [38, 51, 53], 'on-frost': [7, 17, 15], 'peach': [255, 180, 138], 'peach-soft': [47, 43, 35], 'on-peach': [17, 23, 34], 'rain': [255, 107, 107], 'rain-soft': [47, 31, 30], 'thread': [242, 201, 138], 'thread-soft': [45, 46, 35], 'on-thread': [27, 21, 48], 'tag-gold': [243, 207, 138], 'tag-rose': [242, 159, 176], 'tag-violet': [196, 162, 255], 'tag-sea': [143, 240, 210], 'tag-peach': [255, 180, 138], 'art-void': [7, 17, 15], 'art-ink': [233, 245, 239], 'art-ink-muted': [147, 170, 161], 'art-accent': [94, 242, 184], 'art-on-accent': [7, 17, 15], 'art-cue': [201, 230, 255], 'lens-c': [54, 224, 255], 'lens-m': [255, 79, 184], 'lens-y': [255, 225, 77] },
    'day': { 'void': [238, 246, 242], 'surface': [227, 238, 233], 'surface-raised': [255, 255, 255], 'line': [205, 220, 213], 'ink': [13, 26, 23], 'ink-muted': [79, 100, 96], 'accent': [11, 114, 85], 'accent-soft': [211, 242, 229], 'on-accent': [255, 255, 255], 'cue': [31, 95, 143], 'on-cue': [255, 255, 255], 'link': [11, 114, 85], 'danger': [179, 38, 30], 'focus': [13, 26, 23], 'scrim': [238, 246, 242, 0.82], 'chrome': [255, 255, 255, 0.9], 'mint': [11, 114, 85], 'mint-soft': [211, 242, 229], 'on-mint': [255, 255, 255], 'frost': [31, 95, 143], 'frost-soft': [233, 239, 244], 'on-frost': [255, 255, 255], 'peach': [165, 70, 31], 'peach-soft': [246, 236, 233], 'on-peach': [255, 255, 255], 'rain': [180, 45, 45], 'rain-soft': [248, 234, 234], 'thread': [143, 97, 22], 'thread-soft': [244, 239, 232], 'on-thread': [251, 247, 238], 'tag-gold': [128, 90, 14], 'tag-rose': [168, 57, 94], 'tag-violet': [91, 63, 160], 'tag-sea': [29, 115, 87], 'tag-peach': [168, 76, 34], 'art-void': [7, 17, 15], 'art-ink': [233, 245, 239], 'art-ink-muted': [147, 170, 161], 'art-accent': [94, 242, 184], 'art-on-accent': [7, 17, 15], 'art-cue': [201, 230, 255], 'lens-c': [10, 134, 166], 'lens-m': [194, 24, 122], 'lens-y': [154, 125, 0] },
    'peach-night': { 'void': [17, 23, 34], 'surface': [22, 28, 41], 'surface-raised': [27, 34, 48], 'line': [44, 52, 68], 'ink': [243, 236, 230], 'ink-muted': [169, 163, 168], 'accent': [255, 180, 138], 'accent-soft': [55, 48, 51], 'on-accent': [17, 23, 34], 'cue': [201, 230, 255], 'on-cue': [17, 23, 34], 'link': [255, 180, 138], 'danger': [255, 138, 122], 'focus': [201, 230, 255], 'scrim': [17, 23, 34, 0.72], 'chrome': [27, 34, 48, 0.86], 'mint': [94, 242, 184], 'mint-soft': [29, 58, 58], 'on-mint': [17, 23, 34], 'frost': [201, 230, 255], 'frost-soft': [46, 56, 69], 'on-frost': [17, 23, 34], 'peach': [255, 180, 138], 'peach-soft': [55, 48, 51], 'on-peach': [17, 23, 34], 'rain': [255, 107, 107], 'rain-soft': [55, 36, 46], 'thread': [242, 201, 138], 'thread-soft': [53, 51, 51], 'on-thread': [27, 21, 48], 'tag-gold': [243, 207, 138], 'tag-rose': [242, 159, 176], 'tag-violet': [196, 162, 255], 'tag-sea': [143, 240, 210], 'tag-peach': [255, 180, 138], 'art-void': [17, 23, 34], 'art-ink': [243, 236, 230], 'art-ink-muted': [169, 163, 168], 'art-accent': [255, 180, 138], 'art-on-accent': [17, 23, 34], 'art-cue': [201, 230, 255], 'lens-c': [54, 224, 255], 'lens-m': [255, 79, 184], 'lens-y': [255, 225, 77] },
    'peach-day': { 'void': [246, 239, 233], 'surface': [242, 235, 229], 'surface-raised': [255, 255, 255], 'line': [220, 205, 194], 'ink': [27, 33, 48], 'ink-muted': [90, 85, 96], 'accent': [165, 70, 31], 'accent-soft': [246, 236, 233], 'on-accent': [255, 255, 255], 'cue': [31, 95, 143], 'on-cue': [255, 255, 255], 'link': [165, 70, 31], 'danger': [179, 38, 30], 'focus': [27, 33, 48], 'scrim': [246, 239, 233, 0.84], 'chrome': [255, 255, 255, 0.9], 'mint': [11, 114, 85], 'mint-soft': [231, 241, 238], 'on-mint': [255, 255, 255], 'frost': [31, 95, 143], 'frost-soft': [233, 239, 244], 'on-frost': [255, 255, 255], 'peach': [165, 70, 31], 'peach-soft': [246, 236, 233], 'on-peach': [255, 255, 255], 'rain': [180, 45, 45], 'rain-soft': [248, 234, 234], 'thread': [143, 97, 22], 'thread-soft': [244, 239, 232], 'on-thread': [251, 247, 238], 'tag-gold': [128, 90, 14], 'tag-rose': [168, 57, 94], 'tag-violet': [91, 63, 160], 'tag-sea': [29, 115, 87], 'tag-peach': [168, 76, 34], 'art-void': [17, 23, 34], 'art-ink': [243, 236, 230], 'art-ink-muted': [169, 163, 168], 'art-accent': [255, 180, 138], 'art-on-accent': [17, 23, 34], 'art-cue': [201, 230, 255], 'lens-c': [10, 134, 166], 'lens-m': [194, 24, 122], 'lens-y': [154, 125, 0] },
    'thread-night': { 'void': [13, 11, 28], 'surface': [21, 18, 43], 'surface-raised': [31, 26, 58], 'line': [58, 51, 88], 'ink': [243, 236, 224], 'ink-muted': [189, 179, 204], 'accent': [242, 201, 138], 'accent-soft': [50, 41, 46], 'on-accent': [27, 21, 48], 'cue': [201, 230, 255], 'on-cue': [13, 11, 28], 'link': [242, 201, 138], 'danger': [255, 138, 122], 'focus': [242, 201, 138], 'scrim': [13, 11, 28, 0.74], 'chrome': [21, 18, 43, 0.86], 'mint': [94, 242, 184], 'mint-soft': [26, 48, 53], 'on-mint': [13, 11, 28], 'frost': [201, 230, 255], 'frost-soft': [43, 46, 64], 'on-frost': [13, 11, 28], 'peach': [255, 180, 138], 'peach-soft': [52, 38, 46], 'on-peach': [17, 23, 34], 'rain': [255, 107, 107], 'rain-soft': [52, 26, 41], 'thread': [242, 201, 138], 'thread-soft': [50, 41, 46], 'on-thread': [27, 21, 48], 'tag-gold': [243, 207, 138], 'tag-rose': [242, 159, 176], 'tag-violet': [196, 162, 255], 'tag-sea': [143, 240, 210], 'tag-peach': [255, 180, 138], 'art-void': [13, 11, 28], 'art-ink': [243, 236, 224], 'art-ink-muted': [189, 179, 204], 'art-accent': [242, 201, 138], 'art-on-accent': [27, 21, 48], 'art-cue': [201, 230, 255], 'lens-c': [54, 224, 255], 'lens-m': [255, 79, 184], 'lens-y': [255, 225, 77] },
    'thread-day': { 'void': [239, 232, 218], 'surface': [229, 219, 198], 'surface-raised': [251, 247, 238], 'line': [205, 191, 166], 'ink': [33, 27, 48], 'ink-muted': [85, 73, 106], 'accent': [143, 97, 22], 'accent-soft': [244, 239, 232], 'on-accent': [251, 247, 238], 'cue': [31, 95, 143], 'on-cue': [255, 255, 255], 'link': [143, 97, 22], 'danger': [179, 38, 30], 'focus': [143, 97, 22], 'scrim': [239, 232, 218, 0.84], 'chrome': [251, 247, 238, 0.9], 'mint': [11, 114, 85], 'mint-soft': [231, 241, 238], 'on-mint': [255, 255, 255], 'frost': [31, 95, 143], 'frost-soft': [233, 239, 244], 'on-frost': [255, 255, 255], 'peach': [165, 70, 31], 'peach-soft': [246, 236, 233], 'on-peach': [255, 255, 255], 'rain': [180, 45, 45], 'rain-soft': [248, 234, 234], 'thread': [143, 97, 22], 'thread-soft': [244, 239, 232], 'on-thread': [251, 247, 238], 'tag-gold': [128, 90, 14], 'tag-rose': [168, 57, 94], 'tag-violet': [91, 63, 160], 'tag-sea': [29, 115, 87], 'tag-peach': [168, 76, 34], 'art-void': [13, 11, 28], 'art-ink': [243, 236, 224], 'art-ink-muted': [189, 179, 204], 'art-accent': [242, 201, 138], 'art-on-accent': [27, 21, 48], 'art-cue': [201, 230, 255], 'lens-c': [10, 134, 166], 'lens-m': [194, 24, 122], 'lens-y': [154, 125, 0] },
    'contrast': { 'void': [0, 0, 0], 'surface': [7, 11, 10], 'surface-raised': [14, 21, 19], 'line': [143, 167, 157], 'ink': [255, 255, 255], 'ink-muted': [211, 224, 218], 'accent': [125, 255, 201], 'accent-soft': [20, 41, 32], 'on-accent': [0, 0, 0], 'cue': [214, 236, 255], 'on-cue': [0, 0, 0], 'link': [125, 255, 201], 'danger': [255, 168, 156], 'focus': [255, 255, 255], 'scrim': [0, 0, 0, 0.86], 'chrome': [14, 21, 19, 0.96], 'mint': [125, 255, 201], 'mint-soft': [20, 41, 32], 'on-mint': [0, 0, 0], 'frost': [214, 236, 255], 'frost-soft': [34, 38, 41], 'on-frost': [0, 0, 0], 'peach': [255, 196, 163], 'peach-soft': [41, 31, 26], 'on-peach': [0, 0, 0], 'rain': [255, 143, 143], 'rain-soft': [41, 23, 23], 'thread': [255, 217, 158], 'thread-soft': [41, 35, 25], 'on-thread': [0, 0, 0], 'tag-gold': [243, 207, 138], 'tag-rose': [242, 159, 176], 'tag-violet': [196, 162, 255], 'tag-sea': [143, 240, 210], 'tag-peach': [255, 180, 138], 'art-void': [0, 0, 0], 'art-ink': [255, 255, 255], 'art-ink-muted': [211, 224, 218], 'art-accent': [125, 255, 201], 'art-on-accent': [0, 0, 0], 'art-cue': [214, 236, 255], 'lens-c': [54, 224, 255], 'lens-m': [255, 79, 184], 'lens-y': [255, 225, 77] }
  };
  var P = [], seed = 20261123, i;
  for (i = 0; i < 512; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; P.push(seed / 4294967296); }   /* a fixed table: the same ridges for everyone */
  function noise(x) { var n = Math.floor(x), f = x - n, u = f * f * (3 - 2 * f); return P[n & 511] * (1 - u) + P[(n + 1) & 511] * u; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mixc(a, b, k) { return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]; }
  function still() { try { return !!(D.reducedMotion ? D.reducedMotion() : w.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function lookId(look) {
    var id = typeof look === 'string' ? look : look && look.closest ? ((look.closest('[data-theme]') || d.documentElement).getAttribute('data-theme')) : d.documentElement.getAttribute('data-theme');
    return INKS[id] ? id : 'night';
  }
  function pen(look, opt) {
    var id = lookId(look), L = LOOKS.filter(function (x) { return x.id === id; })[0], I = {}, k, held = !!(opt && opt.still), bare = id === 'contrast';
    for (k in BASE) I[k] = BASE[k];
    for (k in INKS[id]) I[k] = INKS[id][k];
    function ink(name) { return I[name] || I.ink; }
    function rgb(name, a) { var c = typeof name === 'string' ? ink(name) : name; return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? (c.length > 3 ? c[3] : 1) : a) + ')'; }
    /* a weather's palette. Pass an id, a number from 0 (peach fall) to 3 (night garden) to blend between neighbours,
       or four weights [peach, rain, mint, night] to blend any of them (a game whose weather follows its music). */
    function one(n) { var p = 'wx-' + WEATHER[n].id + '-'; return { sky: [ink(p + 'sky-top'), ink(p + 'sky-low')], sun: ink(p + 'sun'), ridge: [ink(p + 'ridge-1'), ink(p + 'ridge-2'), ink(p + 'ridge-3')], rim: ink(p + 'rim') }; }
    function weather(wx) {
      if (wx == null) wx = L.weather;
      if (typeof wx === 'string') { for (var n = 0; n < 4; n++) if (WEATHER[n].id === wx) return one(n); return one(3); }
      if (wx && wx.length === 4) {
        var all = [one(0), one(1), one(2), one(3)], sum = (wx[0] + wx[1] + wx[2] + wx[3]) || 1;
        var blend = function (get) { var o = [0, 0, 0], q, c; for (q = 0; q < 4; q++) { c = get(all[q]); o[0] += c[0] * wx[q] / sum; o[1] += c[1] * wx[q] / sum; o[2] += c[2] * wx[q] / sum; } return [Math.round(o[0]), Math.round(o[1]), Math.round(o[2])]; };
        return { sky: [blend(function (p) { return p.sky[0]; }), blend(function (p) { return p.sky[1]; })], sun: blend(function (p) { return p.sun; }), ridge: [0, 1, 2].map(function (j) { return blend(function (p) { return p.ridge[j]; }); }), rim: blend(function (p) { return p.rim; }) };
      }
      var f = clamp(wx, 0, 3), i0 = Math.min(2, Math.floor(f)), t = f - i0, a = one(i0), b = one(i0 + 1);
      return { sky: [mixc(a.sky[0], b.sky[0], t), mixc(a.sky[1], b.sky[1], t)], sun: mixc(a.sun, b.sun, t), ridge: a.ridge.map(function (c, j) { return mixc(c, b.ridge[j], t); }), rim: mixc(a.rim, b.rim, t) };
    }
    function time(o) { return held || still() ? 0 : (o.t || 0); }
    /* the sky: the weather's two tones, top to low. High contrast prints the void. */
    function sky(ctx, o) {
      var x = o.x || 0, y = o.y || 0, S = weather(o.weather), g;
      if (bare) { ctx.fillStyle = rgb('art-void'); ctx.fillRect(x, y, o.w, o.h); return; }
      g = ctx.createLinearGradient(0, y, 0, y + o.h * 0.85); g.addColorStop(0, rgb(S.sky[0])); g.addColorStop(1, rgb(S.sky[1])); ctx.fillStyle = g; ctx.fillRect(x, y, o.w, o.h);
    }
    /* the sun (or the night garden's moon): a wide glow and a small disc at (x, y) */
    function sun(ctx, o) {
      var S = weather(o.weather), R = o.glow == null ? Math.max(o.w || 0, o.h || 0) * 0.55 || (o.r || 20) * 12 : o.glow, r = o.r == null ? Math.min(o.w || 400, o.h || 400) * 0.045 : o.r, g;
      if (!bare) { g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, R); g.addColorStop(0, rgb(S.sun, 0.55)); g.addColorStop(0.2, rgb(S.sun, 0.18)); g.addColorStop(1, rgb(S.sun, 0)); ctx.fillStyle = g; ctx.fillRect(o.x - R, o.y - R, R * 2, R * 2); }
      ctx.fillStyle = bare ? rgb('art-ink') : rgb(S.sun, 0.9); ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 7); ctx.fill();
    }
    /* stars: ninety fixed points in the top of the box, twinkling unless motion is held */
    function stars(ctx, o) {
      var x = o.x || 0, y = o.y || 0, S = weather(o.weather), t = time(o), a = o.alpha == null ? 1 : o.alpha, n;
      for (n = 0; n < (o.count || 90); n++) { ctx.fillStyle = rgb(bare ? ink('art-ink') : S.rim, a * (0.3 + 0.5 * Math.abs(Math.sin(t + n)))); ctx.fillRect(x + P[n] * o.w, y + P[n + 100] * o.h * (o.depth || 0.55), 1.4, 1.4); }
    }
    /* where ridge `n` (0 the far one, 2 the near one) stands at x. `par` slides the ridges past each other (-0.5 to 0.5). */
    function ridgeY(n, px, o) {
      var h = o.h, f = [0.0015, 0.0023, 0.0033][n], amp = (o.amp || [0.15, 0.12, 0.1])[n] * h, base = (o.base || [0.6, 0.72, 0.84])[n] * h, par = clamp(o.par || 0, -0.5, 0.5) * [18, 36, 64][n];
      return (o.y || 0) + base - amp * (noise((px + par) * f + n * 40 + time(o) * 0.015) * 1.2 + noise((px + par) * f * 3 + n * 9) * 0.35);
    }
    /* three ridges, far to near, each lit along its edge by the weather's rim colour and falling to the void */
    function ridges(ctx, o) {
      var x = o.x || 0, y = o.y || 0, S = weather(o.weather), n, px, top, g, from = o.from || 0, to = o.to == null ? 2 : o.to;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, o.w, o.h); ctx.clip();
      for (n = from; n <= to; n++) {
        ctx.beginPath(); ctx.moveTo(x, y + o.h); for (px = 0; px <= o.w + 8; px += 8) ctx.lineTo(x + px, ridgeY(n, px, o)); ctx.lineTo(x + o.w, y + o.h); ctx.closePath();
        if (bare) ctx.fillStyle = rgb('art-void');
        else { top = ridgeY(n, o.w / 2, o) - 80; g = ctx.createLinearGradient(0, top, 0, y + o.h); g.addColorStop(0, rgb(S.ridge[n].map(function (v) { return Math.min(255, v + 26); }))); g.addColorStop(0.3, rgb(S.ridge[n])); g.addColorStop(1, rgb('art-void')); ctx.fillStyle = g; }
        ctx.fill();
        ctx.strokeStyle = bare ? rgb('art-ink', 0.9 - n * 0.2) : rgb(S.rim, 0.3 - n * 0.07); ctx.lineWidth = bare ? 1.6 : 1.2; ctx.beginPath();
        for (px = 0; px <= o.w + 8; px += 8) { if (px) ctx.lineTo(x + px, ridgeY(n, px, o)); else ctx.moveTo(x + px, ridgeY(n, px, o)); } ctx.stroke();
      }
      ctx.restore();
    }
    /* a band of mist across the box (nothing in High contrast) */
    function haze(ctx, o) {
      if (bare) return; var y = o.y || 0, g = ctx.createLinearGradient(0, y, 0, y + o.h), c = o.ink ? ink(o.ink) : weather(o.weather).rim, a = o.amount == null ? 0.08 : o.amount;
      g.addColorStop(0, rgb(c, 0)); g.addColorStop(0.5, rgb(c, a)); g.addColorStop(1, rgb(c, 0)); ctx.fillStyle = g; ctx.fillRect(o.x || 0, y, o.w, o.h);
    }
    /* the dark corners that hold the eye in the middle (nothing in High contrast) */
    function vignette(ctx, o) {
      if (bare) return; var x = o.x || 0, y = o.y || 0, cx = x + o.w / 2, cy = y + o.h / 2, g = ctx.createRadialGradient(cx, cy, Math.min(o.w, o.h) * 0.35, cx, cy, Math.max(o.w, o.h) * 0.75);
      g.addColorStop(0, rgb('art-void', 0)); g.addColorStop(1, rgb('art-void', o.amount == null ? 0.75 : o.amount)); ctx.fillStyle = g; ctx.fillRect(x, y, o.w, o.h);
    }
    /* the whole world in one call: sky, sun, stars at night, ridges, vignette */
    function world(ctx, o) {
      var x = o.x || 0, y = o.y || 0, wx = o.weather == null ? L.weather : o.weather, night = wx === 'night' || wx >= 2.5 || (wx && wx.length === 4 && wx[3] > 0.5);
      sky(ctx, o); sun(ctx, { x: x + o.w * (o.sunX == null ? 0.7 : o.sunX), y: y + o.h * (o.sunY == null ? 0.24 : o.sunY), w: o.w, h: o.h, weather: wx });
      if (night || bare) stars(ctx, o);
      ridges(ctx, o); if (o.vignette !== false) vignette(ctx, o);
    }
    return { look: id, name: L.name, light: L.light, inks: I, rgb: rgb, weathers: WEATHER.slice(), weather: weather, sky: sky, sun: sun, stars: stars, ridgeY: ridgeY, ridges: ridges, haze: haze, vignette: vignette, world: world };
  }
  D.looks = D.looks || LOOKS; D.pen = pen; D.penVersion = VERSION;
})(window, document);
