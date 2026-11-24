/* Storeybrook Paper 1.4.0 · folded paper for canvas and the page. An add-on: load it after bundle.js.
     <script src="components/bundle.js"></script><script src="components/paper.js"></script>
   Storeybrook.pen(look)   a look's resolved inks, its paper stocks and materials, and a pen that draws shapes as folded
                           paper lit from one direction (plan O1; the Storeybrook half of family task F4), and since 1.4
                           pen.sun(ctx, o): the look's sun on paper, a moon in Knight Night (plan S7).
   Storeybrook.folded(el)  the same folds as an SVG figure in the page, which folds itself on reveal (plan O3).
   Storeybrook.looks       the six looks as data: { id, name, light, motion, print }.
   No dependencies, no network. Reduced motion and Ink Blot draw the finished fold at once, and a still sun. Budget: 44 KB. */
(function (w, d) {
  'use strict';
  var S = w.Storeybrook;
  if (!S || S.pen) return;
  var VERSION = '1.4.0';

  var LOOKS = [
    { id: 'daylight', name: 'Meta Daylight', light: true, motion: true, print: false },
    { id: 'knight', name: 'Knight Night', light: false, motion: true, print: false },
    { id: 'inkblot', name: 'Ink Blot', light: true, motion: false, print: true },
    { id: 'comix', name: 'Comix', light: true, motion: true, print: false },
    { id: 'origami', name: 'Origami', light: true, motion: true, print: false },
    { id: 'skein', name: 'Skein silk', light: true, motion: true, print: false }
  ];
  var IDS = LOOKS.map(function (l) { return l.id; });
  var INKS = ['paper', 'surface', 'page', 'ink', 'ink-muted', 'line', 'accent', 'cue', 'art-line', 'art-light', 'art-shade', 'art-stone', 'art-water',
    'wash-sky', 'wash-rose', 'wash-sun', 'wash-meadow', 'wash-brook', 'paper-kami', 'paper-washi', 'paper-kraft', 'paper-foil', 'gamboge', 'copper', 'tag-sun'];
  var STOCKS = ['kami', 'washi', 'kraft', 'foil'];
  /* how each look lays its paper: outline strength, crease strength, the material over each facet, tone steps */
  var STYLE = {
    daylight: { line: 0.22, crease: 1, mat: 'fibre' },
    knight: { line: 0.2, crease: 0.9, mat: 'fibre' },
    inkblot: { line: 1, crease: 1, mat: 'stipple', mono: true },
    comix: { line: 1, crease: 0.55, mat: 'halftone', steps: 3 },
    origami: { line: 0.3, crease: 1.2, mat: 'fibre' },
    skein: { line: 0.3, crease: 0.8, mat: 'knit', stitch: true }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function css(c, a) { c = c || [0, 0, 0]; return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + (a == null ? 1 : +(+a).toFixed(3)) + ')'; }
  function rand(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var MQ = null; /* asked once: the sun reads it every frame */
  function reduced(look) { try { MQ = MQ || w.matchMedia('(prefers-reduced-motion: reduce)'); return look === 'inkblot' || MQ.matches; } catch (e) { return false; } }

  /* ---------- resolving a look's inks: any CSS colour, through one pixel ---------- */
  var px1;
  function toRGB(c) {
    if (c == null) return null;
    if (Array.isArray(c)) return c.slice(0, 3);
    if (!px1) { var cv = d.createElement('canvas'); cv.width = cv.height = 1; px1 = cv.getContext('2d', { willReadFrequently: true }); }
    px1.clearRect(0, 0, 1, 1); px1.fillStyle = '#010203'; px1.fillStyle = String(c);
    if (px1.fillStyle === '#010203' && !/^#010203$/i.test(c)) return null;
    px1.fillRect(0, 0, 1, 1); var p = px1.getImageData(0, 0, 1, 1).data;
    return p[3] ? [p[0], p[1], p[2]] : null;
  }
  function lookOf(el) {
    var t = el && el.closest && el.closest('[data-theme]'), v = (t && t.getAttribute('data-theme')) || d.documentElement.getAttribute('data-theme') || 'daylight';
    return IDS.indexOf(v) < 0 ? 'daylight' : v;
  }

  /* ---------- materials: small tiles in the look's own inks, repeated ---------- */
  function tile(P, kind) {
    var key = '_' + kind; if (P[key]) return P[key];
    var c = d.createElement('canvas'), g, r = rand(kind.length * 97 + 13), i, n;
    var line = P.inks['art-line'] || [40, 40, 40], light = P.inks['art-light'] || [255, 255, 255];
    if (kind === 'halftone') { c.width = c.height = 6; g = c.getContext('2d'); g.fillStyle = css(line, 1); g.beginPath(); g.arc(3, 3, 1.3, 0, 7); g.fill(); }
    else if (kind === 'stipple') { c.width = c.height = 24; g = c.getContext('2d'); g.fillStyle = '#000'; for (i = 0; i < 46; i++) g.fillRect(Math.floor(r() * 24), Math.floor(r() * 24), 1.2, 1.2); }
    else if (kind === 'knit') { c.width = 12; c.height = 10; g = c.getContext('2d'); g.strokeStyle = css(line, 0.55); g.lineWidth = 1.1; g.beginPath(); g.moveTo(1, 2); g.lineTo(6, 8); g.lineTo(11, 2); g.stroke(); }
    else if (kind === 'mat') { c.width = c.height = 48; g = c.getContext('2d'); g.strokeStyle = css(P.inks.line || line, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0.5); g.lineTo(48, 0.5); g.moveTo(0.5, 0); g.lineTo(0.5, 48); g.stroke(); }
    else if (kind === 'grain') { c.width = c.height = 64; g = c.getContext('2d'); for (i = 0; i < 380; i++) { g.fillStyle = r() < 0.5 ? css(line, 0.18) : css(light, 0.25); g.fillRect(r() * 64, r() * 64, 1, 1); } }
    else { /* fibre: the long, pale fibres of washi and kami */
      c.width = c.height = 128; g = c.getContext('2d'); g.lineCap = 'round';
      for (i = 0, n = 70; i < n; i++) {
        var x = r() * 128, y = r() * 128, a = r() * Math.PI, l = 6 + r() * 22;
        g.strokeStyle = r() < 0.6 ? css(light, 0.55) : css(line, 0.22); g.lineWidth = 0.5 + r() * 0.7;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    }
    P[key] = c; return c;
  }
  function material(P, ctx, kind) { return ctx.createPattern(tile(P, kind), 'repeat'); }

  /* ---------- the shapes, drawn back to front: x and y run -1..1 (y down), z comes toward you ---------- */
  function T(a, b, c, tag) { return [a, b, c, tag]; }
  var SHAPES = (function () {
    var m = { P: [-0.05, -0.9, 0.3], C1: [-0.28, -0.45, 0.42], C3: [0.02, -0.42, 0.6], C2: [0.2, -0.45, 0.45], M1: [-0.55, 0, 0.45], M2: [0.5, 0.02, 0.5], F: [0.08, 0.6, 0.85], L: [-1, 0.6, 0], R: [1, 0.6, 0] };
    var mountain = { stock: 'art-stone', tags: { cap: 'washi' }, tris: [
      T(m.P, m.L, m.C1), T(m.C1, m.L, m.M1), T(m.M1, m.L, m.F), T(m.C1, m.M1, m.F), T(m.C1, m.F, m.C3), T(m.C3, m.F, m.C2), T(m.C2, m.F, m.M2), T(m.M2, m.F, m.R),
      T(m.C2, m.M2, m.R), T(m.P, m.C2, m.R), T(m.P, m.C1, m.C3, 'cap'), T(m.P, m.C3, m.C2, 'cap')] };
    var pine = { stock: 'wash-meadow', tags: { trunk: 'kraft' }, tris: [
      T([-0.1, 0.55, 0.1], [0.1, 0.55, 0.1], [0.1, 0.92, 0.1], 'trunk'), T([-0.1, 0.55, 0.1], [0.1, 0.92, 0.1], [-0.1, 0.92, 0.1], 'trunk')] };
    [[-0.2, 0.62, 0.82], [-0.6, 0.15, 0.64], [-1, -0.3, 0.46]].forEach(function (k) {
      var top = [0, k[0] - 0.02 - (k[0] < -0.5 ? 0 : 0.05), 0.35], l = [-k[2], k[1], 0.05], r2 = [k[2], k[1], 0.05], c = [0, k[1], 0.6];
      pine.tris.push(T(top, l, c), T(top, c, r2));
    });
    var c = { K: [0, 0.42, 0.3], B: [0, 0.02, 0.62], NB: [-0.24, 0.14, 0.38], N: [-0.88, -0.52, 0.2], Hd: [-1, -0.36, 0.22], Hn: [-0.82, -0.42, 0.28], TB: [0.24, 0.14, 0.38], Tt: [0.96, -0.5, 0.2], Wf: [-0.18, -0.96, 0.78], Wb: [0.36, -0.86, 0.12], WB: [0.02, -0.06, 0.56] };
    var crane = { stock: 'kami', tris: [
      T(c.WB, c.Wb, c.TB), T(c.WB, c.Wb, c.B), T(c.Tt, c.TB, c.K), T(c.N, c.NB, c.K), T(c.N, c.Hd, c.Hn), T(c.NB, c.B, c.K), T(c.B, c.TB, c.K), T(c.WB, c.Wf, c.NB), T(c.WB, c.Wf, c.B)] };
    var g = { t1: [-0.36, -0.56, 0.62], t2: [0.36, -0.56, 0.62], c1: [-0.82, -0.14, 0.3], c2: [0.82, -0.14, 0.3], g: [0, -0.08, 0.8], p: [0, 0.78, 0.38], b1: [-0.52, -0.62, 0.22], b2: [0.52, -0.62, 0.22] };
    var stone = { stock: 'foil', tris: [T(g.c1, g.b1, g.t1), T(g.t2, g.b2, g.c2), T(g.c1, g.t1, g.g), T(g.t1, g.t2, g.g), T(g.t2, g.c2, g.g), T(g.c1, g.g, g.p), T(g.g, g.c2, g.p)] };
    var b = { S: [0, -0.95, 0.42], SL: [-0.55, 0.15, 0.3], SR: [0.55, 0.15, 0.3], SC: [0, 0.15, 0.6], HL: [-1, 0.12, 0.2], HR: [1, 0.12, 0.2], BL: [-0.62, 0.6, 0.4], BR: [0.62, 0.6, 0.4], HC: [0, 0.12, 0.58], BC: [0, 0.6, 0.62] };
    var boat = { stock: 'washi', tags: { hull: 'kami' }, tris: [T(b.S, b.SL, b.SC), T(b.S, b.SC, b.SR), T(b.HL, b.HC, b.BL, 'hull'), T(b.HC, b.BC, b.BL, 'hull'), T(b.HC, b.HR, b.BR, 'hull'), T(b.HC, b.BR, b.BC, 'hull')] };
    var f = { cr: [0, -0.6, 0.34], F: [0, -0.3, 0.52], cl: [-0.38, 0, 0.36], crr: [0.38, 0, 0.36], N: [0, 0.9, 0.62], el: [-0.86, -0.94, 0.14], eb: [-0.3, -0.42, 0.4], er: [0.86, -0.94, 0.14], ebr: [0.3, -0.42, 0.4], n1: [-0.12, 0.7, 0.64], n2: [0.12, 0.7, 0.64] };
    var deer = { stock: 'kraft', tags: { ear: 'kraft', nose: 'art-line' }, tris: [T(f.el, f.cl, f.eb, 'ear'), T(f.er, f.ebr, f.crr, 'ear'), T(f.cr, f.eb, f.F), T(f.cr, f.F, f.ebr), T(f.eb, f.cl, f.F), T(f.F, f.crr, f.ebr), T(f.cl, f.N, f.F), T(f.F, f.N, f.crr), T(f.n1, f.n2, f.N, 'nose')] };
    return { mountain: mountain, pine: pine, crane: crane, stone: stone, boat: boat, deer: deer };
  })();

  /* ---------- the fold: geometry and light, shared by canvas and SVG ---------- */
  function normal(a, b, c) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l]; return n[2] < 0 ? [-n[0], -n[1], -n[2]] : n;
  }
  function stockRGB(P, name, color) {
    var c = color != null ? toRGB(color) : null; if (c) return c;
    if (STOCKS.indexOf(name) >= 0) name = 'paper-' + name;
    return P.inks[name] || toRGB(name) || P.inks['paper-kami'] || [200, 200, 200];
  }
  /* facets(P, tris, o) -> { faces: [{pts, fill, lam, foil}], creases: [{a, b, c}], edges: [{a, b}] } in pixels */
  function facets(P, tris, o) {
    var st = STYLE[P.look] || STYLE.daylight, faces = [], edges = {}, hi = P.inks['art-light'] || [255, 255, 255], L = P.light;
    tris.forEach(function (t, i) {
      var n = normal(t[0], t[1], t[2]), lam = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      var stock = (t[3] && o.tags && o.tags[t[3]]) || o.stock, foil = stock === 'foil', base = stockRGB(P, stock, t[3] ? null : o.color), q = lam;
      if (st.steps) q = Math.round(lam * st.steps) / st.steps;
      var tone = foil ? 0.42 + 0.8 * q : 0.6 + 0.5 * q, fill = tone <= 1 ? mul(base, tone) : mix(base, hi, (tone - 1) * 1.6);
      if (foil) { var rz = 2 * lam * n[2] - L[2]; fill = mix(fill, [255, 255, 255], Math.pow(Math.max(0, rz), 16) * 0.85); }
      if (st.mono) fill = [255, 255, 255];
      faces.push({ pts: [t[0], t[1], t[2]], fill: fill, lam: lam, n: n });
      for (var k = 0; k < 3; k++) {
        var a = t[k], b = t[(k + 1) % 3], ka = Math.round(a[0] * 4) + ',' + Math.round(a[1] * 4), kb = Math.round(b[0] * 4) + ',' + Math.round(b[1] * 4), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        (edges[key] = edges[key] || { a: a, b: b, f: [] }).f.push(i);
      }
    });
    var creases = [], outline = [];
    Object.keys(edges).forEach(function (k) {
      var e = edges[k];
      if (e.f.length === 1) { outline.push(e); return; }
      var f1 = faces[e.f[0]], f2 = faces[e.f[1]], dot = f1.n[0] * f2.n[0] + f1.n[1] * f2.n[1] + f1.n[2] * f2.n[2];
      if (dot < 0.998) creases.push({ a: e.a, b: e.b, c: f1.lam < f2.lam ? f1.fill : f2.fill, k: clamp((1 - dot) * 6, 0.25, 1) });
    });
    return { faces: faces, creases: creases, outline: outline, style: st };
  }
  /* place a shape: normalised coordinates to pixels, flattened by open (0 a flat sheet, 1 folded) */
  function place(shape, o) {
    var s = o.size || 100, x0 = o.x || 0, y0 = o.y || 0, open = o.open == null ? 1 : clamp(o.open, 0, 1), fl = o.flip ? -1 : 1, rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
    return shape.tris.map(function (t) {
      var out = [0, 1, 2].map(function (k) { var x = t[k][0] * fl, y = t[k][1]; return [x0 + (x * cr - y * sr) * s, y0 + (x * sr + y * cr) * s, t[k][2] * s * open]; });
      out.push(t[3]); return out;
    });
  }
  function shapeOf(name) { return typeof name === 'string' ? SHAPES[name] : name; }

  /* ---------- canvas drawing ---------- */
  function drawFaces(P, ctx, tris, o) {
    o = o || {};
    var F = facets(P, tris, o), st = F.style, s = o.size || 100, lw = o.lineWidth || Math.max(1, s / 80), open = o.open == null ? 1 : clamp(o.open, 0, 1);
    var line = P.inks['art-line'] || [40, 40, 40];
    if (o.shadow !== false && P.shadow > 0 && !st.mono && F.faces.length) {
      var L = P.light, h = Math.hypot(L[0], L[1]) || 1, off = s * 0.08 * open / Math.max(0.35, Math.tan(Math.asin(clamp(L[2], 0, 0.99)))), dx = -L[0] / h * off, dy = -L[1] / h * off;
      var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      tris.forEach(function (t) { for (var k = 0; k < 3; k++) { minx = Math.min(minx, t[k][0]); miny = Math.min(miny, t[k][1]); maxx = Math.max(maxx, t[k][0]); maxy = Math.max(maxy, t[k][1]); } });
      var pad = Math.ceil(off + 4), cw = Math.ceil(maxx - minx + pad * 2), ch = Math.ceil(maxy - miny + pad * 2);
      if (cw > 0 && ch > 0 && cw < 8000 && ch < 8000) {
        var sc = d.createElement('canvas'); sc.width = cw; sc.height = ch; var g = sc.getContext('2d'); g.fillStyle = css(P.inks['art-shade'] || [0, 0, 0], 1);
        tris.forEach(function (t) { g.beginPath(); g.moveTo(t[0][0] - minx + pad, t[0][1] - miny + pad); g.lineTo(t[1][0] - minx + pad, t[1][1] - miny + pad); g.lineTo(t[2][0] - minx + pad, t[2][1] - miny + pad); g.closePath(); g.fill(); g.stroke(); });
        ctx.save(); ctx.globalAlpha = P.shadow * (o.shadowAlpha == null ? 1 : o.shadowAlpha);
        try { ctx.filter = 'blur(' + Math.max(1, Math.round(off * 0.45)) + 'px)'; } catch (e) { /* no canvas filters */ }
        ctx.drawImage(sc, minx - pad + dx, miny - pad + dy); ctx.restore();
      }
    }
    var mat = material(P, ctx, st.mat);
    F.faces.forEach(function (f) {
      var p = f.pts; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.closePath();
      ctx.fillStyle = css(f.fill); ctx.fill(); ctx.strokeStyle = css(f.fill); ctx.lineWidth = 0.8; ctx.stroke();
      var a = st.mono ? clamp((0.85 - f.lam) * 1.3, 0, 0.9) : st.mat === 'halftone' ? clamp((0.55 - f.lam) * 1.4, 0, 0.6) : P.grain * (st.mat === 'knit' ? 2.5 : 1);
      if (a > 0.01) { ctx.save(); ctx.clip(); ctx.globalAlpha = a; ctx.fillStyle = mat; ctx.fill(); ctx.restore(); }
    });
    ctx.save(); ctx.lineCap = 'round';
    F.creases.forEach(function (c) { ctx.strokeStyle = css(mix(c.c, line, 0.4), clamp(P.crease * st.crease * c.k * open, 0, 1)); ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(c.a[0], c.a[1]); ctx.lineTo(c.b[0], c.b[1]); ctx.stroke(); });
    ctx.strokeStyle = css(st.mono ? [0, 0, 0] : line, st.line); ctx.lineWidth = lw * (st.line >= 1 ? 1.6 : 1); ctx.lineJoin = 'round';
    if (o.baseY != null) F.outline = F.outline.filter(function (e) { return !(e.a[1] >= o.baseY - 0.5 && e.b[1] >= o.baseY - 0.5); });
    F.outline.forEach(function (e) { ctx.beginPath(); ctx.moveTo(e.a[0], e.a[1]); ctx.lineTo(e.b[0], e.b[1]); ctx.stroke(); });
    if (st.stitch) { ctx.setLineDash([lw * 3, lw * 2.4]); ctx.strokeStyle = css(P.inks.accent || line, 0.75); ctx.lineWidth = lw * 0.9; F.outline.forEach(function (e) { ctx.beginPath(); ctx.moveTo(e.a[0], e.a[1]); ctx.lineTo(e.b[0], e.b[1]); ctx.stroke(); }); }
    ctx.restore();
    return F;
  }

  /* a range of folded ridges along a baseline: for dioramas and side-scrollers */
  function rangeTris(o) {
    var r = rand(o.seed || 7), n = o.peaks || 5, x0 = o.x || 0, wd = o.width || 600, base = o.y || 400, H = o.height || 160, z = H * 0.35 * (o.depth == null ? 1 : o.depth) * (o.open == null ? 1 : o.open), step = wd / n, tris = [];
    var prev = [x0, base, 0];
    for (var i = 0; i < n; i++) {
      var apex = [x0 + step * (i + 0.3 + r() * 0.4), base - H * (0.55 + r() * 0.45), z], R = [x0 + step * (i + 1), i === n - 1 ? base : base - H * (0.12 + r() * 0.25), 0], C = [apex[0], base, z * 0.7];
      var lerp = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
      if (o.cap) {
        var cl = lerp(apex, prev, 0.28), cr = lerp(apex, R, 0.28), cc = lerp(apex, C, 0.28);
        tris.push([prev, cl, cc], [prev, cc, C], [cc, cr, R], [cc, R, C], [cl, apex, cc, 'cap'], [apex, cr, cc, 'cap']);
      } else { /* plan O1: a second crease on each face, so a ridge reads as folded, not cut */
        var ql = lerp(apex, C, 0.55); ql[2] += H * 0.08;
        tris.push([prev, apex, ql], [prev, ql, C], [apex, R, ql], [ql, R, C]);
      }
      tris.push([prev, C, [prev[0], base, 0]], [R, [R[0], base, 0], C]);
      prev = R;
    }
    return tris;
  }

  /* ---------- the sun: gamboge on paper, a moon in Knight Night (plan S7). Static parts are painted once per look and size step ---------- */
  var SUNB = [16, 24, 36, 54, 80, 120, 180, 270, 400], TAU = Math.PI * 2, NONE = {}, SEED = { daylight: 11, knight: 23, inkblot: 37, comix: 41, origami: 53, skein: 67 };
  function sheet(R, ext) { var c = d.createElement('canvas'), s = Math.ceil(ext * R) * 2 + 2; c.width = c.height = s; return { c: c, g: c.getContext('2d'), m: s / 2, e: s / 2 / R }; }
  /* a slightly irregular round: three slow waves on the radius, so the edge reads as painted, not compassed */
  function blob(g, cx, cy, R, seed, k) {
    var r = rand(seed), a = r() * 7, b = r() * 7, c = r() * 7, i, th, rr;
    g.beginPath();
    for (i = 0; i <= 120; i++) {
      th = i / 120 * TAU; rr = R * (1 + k * (0.028 * Math.sin(3 * th + a) + 0.016 * Math.sin(5 * th + b) + 0.007 * Math.sin(9 * th + c)));
      if (i) g.lineTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr); else g.moveTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr);
    }
    g.closePath();
  }
  /* a soft wash bleeding into the paper: overlapping radial pools, then a faint tide line where the water stopped */
  function halo(S, R, col, a, reach, tide, r) {
    var g = S.g, m = S.m, i, cx, cy, rr, gr;
    for (i = 0; i < 5; i++) {
      cx = m + (r() - 0.5) * R * 0.3; cy = m + (r() - 0.5) * R * 0.3; rr = R * reach * (0.78 + r() * 0.3);
      gr = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, rr); gr.addColorStop(0, css(col, a)); gr.addColorStop(0.45, css(col, a * 0.5)); gr.addColorStop(1, css(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, S.c.width, S.c.height);
    }
    if (tide) { g.lineWidth = Math.max(1, R * 0.03); g.strokeStyle = css(tide, a * 0.3); blob(g, m, m, R * reach * 0.66, 97, 1.6); g.stroke(); }
  }
  /* the disc: a wash that thins in the middle and pools its pigment at the edge, granulates in the tooth, with one back-run */
  function painted(P, S, R, base, rim, light, seed, mottle) {
    var g = S.g, m = S.m, r = rand(seed + 5), i, a, u, rr, n, gr, sz;
    g.save(); blob(g, m, m, R, seed, 1); g.fillStyle = css(base, 0.88); g.fill(); g.clip();
    gr = g.createRadialGradient(m - R * 0.2, m - R * 0.22, 0, m, m, R * 1.02);
    gr.addColorStop(0, css(light, 0.66)); gr.addColorStop(0.5, css(light, 0.3)); gr.addColorStop(0.84, css(light, 0));
    g.fillStyle = gr; g.fillRect(0, 0, S.c.width, S.c.height);
    [[0.3, 0.12], [0.15, 0.2], [0.06, 0.36]].forEach(function (s) { blob(g, m, m, R, seed, 1); g.lineWidth = R * s[0]; g.strokeStyle = css(rim, s[1]); g.stroke(); });
    for (i = 0; i < (mottle || 0); i++) { /* maria on the moon: darker pools with harder fringes */
      a = r() * TAU; u = Math.sqrt(r()) * 0.55; blob(g, m + Math.cos(a) * R * u, m + Math.sin(a) * R * u, R * (0.12 + r() * 0.2), seed + 20 + i, 3);
      g.fillStyle = css(rim, 0.13 + r() * 0.12); g.fill(); g.lineWidth = Math.max(0.6, R * 0.012); g.strokeStyle = css(rim, 0.12); g.stroke();
    }
    n = Math.min(1800, Math.round(R * R * 0.14)); sz = Math.max(0.7, R * 0.013);
    for (i = 0; i < n; i++) { a = r() * TAU; u = Math.sqrt(r()); rr = R * u; g.fillStyle = css(rim, 0.05 + 0.25 * u * u * u * r()); g.fillRect(m + Math.cos(a) * rr, m + Math.sin(a) * rr, sz * (0.6 + r()), sz * (0.6 + r())); }
    blob(g, m + R * 0.26, m + R * 0.2, R * 0.3, seed + 9, 2.5); g.fillStyle = css(light, 0.12); g.fill(); g.lineWidth = Math.max(0.6, R * 0.014); g.strokeStyle = css(rim, 0.1); g.stroke();
    g.globalAlpha = 0.45; g.fillStyle = material(P, g, 'grain'); g.fillRect(0, 0, S.c.width, S.c.height);
    g.restore();
    blob(g, m, m, R * 1.012, seed, 1); g.lineWidth = Math.max(1, R * 0.05); g.strokeStyle = css(base, 0.12); g.stroke();
  }
  /* pencil rays: two or three light passes, a little bowed, with the graphite broken by the paper's tooth */
  function pencil(S, R, n, r0, long, short, col, which, r) {
    var g = S.g, m = S.m, i, k, th, c, s, a, b, wob, lw = Math.max(0.7, R * 0.021);
    g.lineCap = 'round';
    for (i = 0; i < n; i++) {
      th = (i + (r() - 0.5) * 0.25) / n * TAU - Math.PI / 2; a = R * r0; b = R * (i % 2 ? short : long) * (0.94 + r() * 0.12); wob = (r() - 0.5) * R * 0.06;
      if (i % 2 !== which) continue;
      c = Math.cos(th); s = Math.sin(th);
      for (k = 0; k < 3; k++) {
        var o = (k - 1) * lw * 0.7; g.strokeStyle = css(col, [0.42, 0.56, 0.24][k]); g.lineWidth = lw * [0.8, 1, 0.7][k];
        g.beginPath(); g.moveTo(m + c * a - s * o, m + s * a + c * o); g.quadraticCurveTo(m + c * (a + b) / 2 - s * (o + wob), m + s * (a + b) / 2 + c * (o + wob), m + c * b - s * o * 0.4, m + s * b + c * o * 0.4); g.stroke();
      }
    }
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.5)';
    for (i = Math.round(R * R * 0.06); i > 0; i--) g.fillRect(r() * S.c.width, r() * S.c.height, lw * 0.8, lw * 0.8);
    g.globalCompositeOperation = 'source-over';
  }
  function sparkles(S, R, n, col, off, r) { /* four-point twinkles, spread round the moon */
    var g = S.g, m = S.m, i, a, u, x, y, l, q;
    g.fillStyle = css(col, 0.8);
    for (i = 0; i < n; i++) {
      a = (i + off + r() * 0.5) / n * TAU; u = R * (1.4 + r() * 0.9); x = m + Math.cos(a) * u; y = m + Math.sin(a) * u; l = Math.max(2.5, R * (0.06 + r() * 0.06)); q = l * 0.16;
      g.beginPath(); g.moveTo(x, y - l * 1.3); g.quadraticCurveTo(x + q, y - q, x + l, y); g.quadraticCurveTo(x + q, y + q, x, y + l * 1.3); g.quadraticCurveTo(x - q, y + q, x - l, y); g.quadraticCurveTo(x - q, y - q, x, y - l * 1.3); g.fill();
    }
  }
  function stipple(S, R, from, to, n, p, col, r) { /* ink dots scattered at random, as many as p(d, x, y) asks for */
    var g = S.g, m = S.m, i, a, u, x, y, sz = Math.max(0.6, R * 0.011);
    g.fillStyle = css(col);
    for (i = 0; i < n; i++) {
      a = r() * TAU; u = Math.sqrt(from * from + r() * (to * to - from * from)); x = Math.cos(a) * u; y = Math.sin(a) * u;
      if (r() < p(u, x, y)) { g.beginPath(); g.arc(m + x * R, m + y * R, sz * (0.7 + r() * 0.6), 0, TAU); g.fill(); }
    }
  }
  function dots(S, R, from, to, step, rot, size, col) { /* print dots on a rotated grid, sized by size(d, x, y) in R units */
    var g = S.g, m = S.m, c = Math.cos(rot), s = Math.sin(rot), n = Math.ceil(to * R / step), i, j, x, y, rr, q;
    g.fillStyle = css(col);
    for (i = -n; i <= n; i++) for (j = -n; j <= n; j++) {
      x = (i * c - j * s) * step; y = (i * s + j * c) * step; rr = Math.hypot(x, y) / R;
      if (rr < from || rr > to) continue;
      q = size(rr, x / R, y / R) * step * 0.5; if (q < 0.35) continue;
      g.beginPath(); g.arc(m + x, m + y, q, 0, TAU); g.fill();
    }
  }
  function sunArt(P, R) {
    var L = P.look, I = P.inks, seed = SEED[L] || 11, r = rand(seed), i, th, a, b, g, m, lw;
    var gam = I.gamboge || I['wash-sun'] || [212, 146, 15], line = I['art-line'] || [40, 40, 40], light = I['art-light'] || [255, 255, 255];
    var wsun = I['wash-sun'] || gam, deep = I['tag-sun'] || mul(gam, 0.6), shade = I['art-shade'] || [0, 0, 0];
    var A = { halo: sheet(R, 2.8), rays: [sheet(R, 2.1), sheet(R, 2.1)], disc: sheet(R, 1.45), mode: 'breathe' };
    if (L === 'knight') { /* the moon: the same wash in pale washi, cool at its rim, with maria; sparkles instead of rays */
      var stone = I['art-stone'] || [90, 100, 120], pale = mix(light, wsun, 0.1);
      halo(A.halo, R, light, 0.1, 2.5, null, r); halo(A.halo, R, I['wash-sky'] || stone, 0.22, 1.9, null, r);
      sparkles(A.rays[0], R, 3, light, 0, r); sparkles(A.rays[1], R, 3, light, 0.5, r);
      painted(P, A.disc, R, pale, mix(light, stone, 0.6), light, seed, 5); A.mode = 'twinkle';
    } else if (L === 'inkblot') { /* ink: a white disc in a brush outline, stippled on its shade side, wedge rays */
      stipple(A.halo, R, 1.12, 2, Math.round(R * R * 0.7), function (u) { return 0.3 * Math.pow(Math.max(0, 1 - (u - 1.12) / 0.88), 2.6); }, [0, 0, 0], r);
      for (i = 0; i < 12; i++) {
        g = A.rays[i % 2].g; m = A.rays[i % 2].m; th = i / 12 * TAU - Math.PI / 2 + (r() - 0.5) * 0.08; a = R * 1.22; b = R * (i % 2 ? 1.55 : 1.8);
        g.fillStyle = '#000'; g.beginPath(); g.moveTo(m + Math.cos(th - 0.07) * a, m + Math.sin(th - 0.07) * a); g.lineTo(m + Math.cos(th) * b, m + Math.sin(th) * b); g.lineTo(m + Math.cos(th + 0.07) * a, m + Math.sin(th + 0.07) * a); g.closePath(); g.fill();
      }
      g = A.disc.g; m = A.disc.m; blob(g, m, m, R, seed, 1); g.fillStyle = '#fff'; g.fill();
      g.save(); g.clip(); stipple(A.disc, R, 0, 1.05, Math.round(R * R * 0.9), function (u, x, y) { return Math.max(0, Math.min(0.5, (x * 0.7 + y * 0.7 - 0.1) * 0.45)); }, [0, 0, 0], r); g.restore();
      g.lineJoin = 'round'; g.strokeStyle = '#000'; blob(g, m, m, R, seed, 1); g.lineWidth = Math.max(1.5, R * 0.07); g.stroke();
      blob(g, m, m, R * 1.008, seed + 1, 1.1); g.lineWidth = Math.max(0.6, R * 0.018); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
    } else if (L === 'comix') { /* print: a flat yellow disc, a heavy line, a burst of spikes and Ben-Day dots fading out */
      dots(A.halo, R, 1.05, 2.6, Math.max(3, R * 0.13), 0.26, function (d) { return 0.95 * Math.pow(Math.max(0, 1 - (d - 1.05) / 1.55), 1.1); }, gam);
      lw = Math.max(1.2, R * 0.05);
      for (i = 0; i < 14; i++) {
        g = A.rays[i % 2].g; m = A.rays[i % 2].m; th = i / 14 * TAU - Math.PI / 2; a = R * 0.9; b = R * (i % 2 ? 1.5 : 1.86);
        g.beginPath(); g.moveTo(m + Math.cos(th - 0.16) * a, m + Math.sin(th - 0.16) * a); g.lineTo(m + Math.cos(th) * b, m + Math.sin(th) * b); g.lineTo(m + Math.cos(th + 0.16) * a, m + Math.sin(th + 0.16) * a); g.closePath();
        g.fillStyle = css(gam); g.fill(); g.lineJoin = 'miter'; g.lineWidth = lw; g.strokeStyle = css(line); g.stroke();
      }
      g = A.disc.g; m = A.disc.m; blob(g, m, m, R, seed, 0.4); g.fillStyle = css(gam); g.fill();
      g.save(); g.clip(); dots(A.disc, R, 0, 1.1, Math.max(2.4, R * 0.1), 0.26, function (d, x, y) { return Math.max(0, Math.min(0.9, (x * 0.75 + y * 0.66 - 0.05) * 1.1)); }, mix(gam, I.accent || [200, 0, 100], 0.42)); g.restore();
      g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, R * 0.08); g.beginPath(); g.arc(m, m, R * 0.66, Math.PI * 1.08, Math.PI * 1.38); g.stroke();
      blob(g, m, m, R, seed, 0.4); g.lineWidth = Math.max(1.5, R * 0.085); g.strokeStyle = css(line); g.stroke();
    } else if (L === 'origami') { /* papercraft: a pleated rosette of facets and folded kite rays, each lit from the pen's sun */
      halo(A.halo, R, wsun, 0.18, 2.1, null, r);
      var kami = I['paper-kami'] || gam, disc = [], cz = R * 0.6, N = 12, v = [];
      for (i = 0; i < N; i++) { th = i / N * TAU - Math.PI / 2; a = R * (i % 2 ? 0.94 : 1.02); v.push([A.disc.m + Math.cos(th) * a, A.disc.m + Math.sin(th) * a, i % 2 ? R * 0.2 : 0]); }
      for (i = 0; i < N; i++) disc.push([[A.disc.m, A.disc.m, cz], v[i], v[(i + 1) % N]]);
      for (i = 0; i < 12; i++) {
        var S2 = A.rays[i % 2], mm = S2.m, ra = R * 0.9, rb = R * (i % 2 ? 1.5 : 1.78), mid = (ra + rb) * 0.42;
        th = i / 12 * TAU - Math.PI / 2 + Math.PI / 12;
        var b1 = [mm + Math.cos(th - 0.13) * ra, mm + Math.sin(th - 0.13) * ra, 0], b2 = [mm + Math.cos(th + 0.13) * ra, mm + Math.sin(th + 0.13) * ra, 0];
        var tip = [mm + Math.cos(th) * rb, mm + Math.sin(th) * rb, 0], sp = [mm + Math.cos(th) * mid, mm + Math.sin(th) * mid, R * 0.16];
        drawFaces(P, S2.g, [[b1, tip, sp], [sp, tip, b2], [b1, sp, b2]], { stock: i % 2 ? 'gamboge' : 'paper-kami', color: i % 2 ? gam : kami, size: R * 1.2 });
      }
      drawFaces(P, A.disc.g, disc, { color: gam, stock: 'gamboge', size: R * 2 });
    } else if (L === 'skein') { /* knitted: rows of stitches in gamboge silk, a running stitch round the edge, stitched rays */
      var copper = I.copper || I.accent || deep, knit = mix(gam, copper, 0.45);
      halo(A.halo, R, wsun, 0.3, 2.2, null, r);
      g = A.halo.g; m = A.halo.m; g.setLineDash([R * 0.09, R * 0.07]); g.lineCap = 'round'; g.lineWidth = Math.max(1, R * 0.03); g.strokeStyle = css(copper, 0.4); blob(g, m, m, R * 1.62, seed + 3, 0.8); g.stroke(); g.setLineDash([]);
      lw = Math.max(1, R * 0.034);
      for (i = 0; i < 12; i++) {
        g = A.rays[i % 2].g; m = A.rays[i % 2].m; th = i / 12 * TAU - Math.PI / 2; a = R * 1.2; b = R * (i % 2 ? 1.5 : 1.72);
        g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = css(copper, 0.9); g.setLineDash([R * 0.08, R * 0.055]);
        g.beginPath(); g.moveTo(m + Math.cos(th) * a, m + Math.sin(th) * a); g.lineTo(m + Math.cos(th) * b, m + Math.sin(th) * b); g.stroke(); g.setLineDash([]);
        var tx = m + Math.cos(th) * (b + R * 0.08), ty = m + Math.sin(th) * (b + R * 0.08), q = R * 0.05;
        g.beginPath(); g.moveTo(tx - q, ty - q); g.lineTo(tx + q, ty + q); g.moveTo(tx + q, ty - q); g.lineTo(tx - q, ty + q); g.stroke();
      }
      g = A.disc.g; m = A.disc.m; blob(g, m, m, R, seed, 0.8); g.fillStyle = css(mix(gam, wsun, 0.3)); g.fill();
      g.save(); g.clip();
      var rh = R * 0.15, cw = R * 0.12, row, x, y;
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(0.8, R * 0.03);
      for (row = 0, y = m - R * 1.05; y < m + R * 1.1; y += rh, row++) for (x = m - R * 1.1 + (row % 2) * cw * 0.5; x < m + R * 1.1; x += cw) {
        g.strokeStyle = css(knit, 0.42 + 0.18 * ((row + Math.round(x / cw)) % 2)); g.beginPath(); g.moveTo(x - cw * 0.42, y - rh * 0.4); g.quadraticCurveTo(x - cw * 0.12, y + rh * 0.2, x, y + rh * 0.42); g.quadraticCurveTo(x + cw * 0.12, y + rh * 0.2, x + cw * 0.42, y - rh * 0.4); g.stroke();
      }
      g.globalAlpha = 0.35; g.fillStyle = material(P, g, 'grain'); g.fillRect(0, 0, A.disc.c.width, A.disc.c.height); g.restore();
      g.setLineDash([R * 0.1, R * 0.065]); g.lineCap = 'round'; g.lineWidth = Math.max(1, R * 0.04); g.strokeStyle = css(copper, 0.85); blob(g, m, m, R * 0.88, seed, 0.8); g.stroke(); g.setLineDash([]);
      g.lineWidth = Math.max(0.8, R * 0.02); g.strokeStyle = css(line, 0.35); blob(g, m, m, R, seed, 0.8); g.stroke();
    } else { /* Meta Daylight: gamboge laid wet on north-light paper, pencil rays */
      halo(A.halo, R, wsun, 0.42, 2.5, mix(wsun, gam, 0.5), r);
      pencil(A.rays[0], R, 10, 1.22, 1.72, 1.46, line, 0, rand(seed + 1)); pencil(A.rays[1], R, 10, 1.22, 1.72, 1.46, line, 1, rand(seed + 1));
      painted(P, A.disc, R, mix(gam, wsun, 0.18), mix(gam, deep, 0.42), mix(light, wsun, 0.3), seed, 0);
    }
    return A;
  }
  function sheetAt(ctx, S, x, y, r, a, s, rot) {
    if (!S || a <= 0.004) return;
    var e = S.e * r * s;
    if (!rot && a >= 1) { ctx.drawImage(S.c, x - e, y - e, e * 2, e * 2); return; }
    ctx.save(); ctx.globalAlpha *= Math.min(1, a); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(S.c, -e, -e, e * 2, e * 2); ctx.restore();
  }

  /* ---------- the pen ---------- */
  var CACHE = {};
  function pen(look, opt) {
    if (look && look.nodeType) look = lookOf(look);
    if (IDS.indexOf(look) < 0) look = lookOf(null);
    if (CACHE[look] && !(opt && opt.fresh)) return CACHE[look];
    var p = d.createElement('i'), inks = {};
    p.setAttribute('data-theme', look); p.setAttribute('aria-hidden', 'true');
    p.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none';
    (d.body || d.documentElement).appendChild(p);
    var cs = getComputedStyle(p);
    INKS.forEach(function (n) { if (!cs.getPropertyValue('--' + n).trim()) return; p.style.color = 'var(--' + n + ')'; inks[n] = toRGB(getComputedStyle(p).color); });
    function num(n, def) { var v = parseFloat(cs.getPropertyValue('--' + n)); return isNaN(v) ? def : v; }
    var az = num('tex-fold-light', 135) * Math.PI / 180, el = num('tex-fold-elevation', 48) * Math.PI / 180;
    var P = {
      look: look, version: VERSION, inks: inks,
      /* the light the folds are lit from (1.3 called it sun; since 1.4 sun paints the sun, and sun[0..2] still read this) */
      light: [Math.cos(el) * Math.cos(az), -Math.cos(el) * Math.sin(az), Math.sin(el)],
      crease: num('tex-fold-crease', 0.5), shadow: num('tex-fold-shadow', 0.32), grain: num('tex-fold-grain', 0.1),
      rgb: function (name, a) { return css(inks[name] || toRGB(name), a); },
      stock: function (name) { return stockRGB(P, name); },
      material: function (ctx, kind) { return material(P, ctx, kind || (STYLE[look] || {}).mat || 'fibre'); },
      /* fold(ctx, shape, { x, y, size, stock, color, tags, open, flip, rot, shadow }) draws one shape; returns its facets */
      fold: function (ctx, shape, o) { o = o || {}; var sh = shapeOf(shape); if (!sh) return null; var oo = Object.assign({ stock: sh.stock, tags: Object.assign({}, sh.tags, o.tags) }, o); oo.tags = Object.assign({}, sh.tags, o.tags); return drawFaces(P, ctx, place(sh, oo), oo); },
      /* range(ctx, { x, y, width, height, peaks, seed, stock, cap, depth, open }) draws a ridge of folds */
      range: function (ctx, o) { o = o || {}; var oo = Object.assign({ stock: 'art-stone', size: o.height || 160, shadow: false, baseY: o.y || 400 }, o); oo.tags = Object.assign({ cap: o.cap === true ? 'washi' : o.cap }, o.tags); return drawFaces(P, ctx, rangeTris(oo), oo); },
      /* ground(ctx, { w, h }) lays the look's paper: the page colour, the cutting mat in Origami, the grain */
      ground: function (ctx, o) {
        o = o || {}; var W = o.w || ctx.canvas.width, H = o.h || ctx.canvas.height;
        ctx.save(); ctx.fillStyle = css(inks.paper || [244, 246, 242]); ctx.fillRect(0, 0, W, H);
        if (look === 'origami') { ctx.fillStyle = material(P, ctx, 'mat'); ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, W, H); }
        if (look !== 'inkblot') { ctx.globalAlpha = look === 'knight' ? 0.25 : 0.5; ctx.fillStyle = material(P, ctx, 'grain'); ctx.fillRect(0, 0, W, H); }
        ctx.restore();
      },
      /* sun(ctx, { x, y, r, t, still, alpha }) paints the look's sun centred on x, y (plan S7): a gamboge wash that pools at its
         edge, a halo bleeding into the paper and pencil rays that breathe; a moon in Knight Night, ink in Ink Blot, print in Comix,
         paper in Origami, knitting in Skein silk. Deterministic in t; the painted parts are cached, so a frame costs four images */
      sun: function (ctx, o) {
        o = o || NONE;
        var r = +o.r > 0 ? +o.r : 40, x = +o.x || 0, y = +o.y || 0, still = o.still != null ? !!o.still : reduced(look), t = still ? 0 : +o.t || 0;
        var need = r * Math.min(3, w.devicePixelRatio || 1), bi = 0, A, br, sw;
        while (bi < SUNB.length - 1 && SUNB[bi] < need) bi++;
        A = P._sun[bi] || (P._sun[bi] = sunArt(P, SUNB[bi]));
        br = Math.sin(TAU * t / 6.5); sw = 0.018 * Math.sin(TAU * t / 13);
        ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : clamp(+o.alpha, 0, 1);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        sheetAt(ctx, A.halo, x, y, r, A.mode === 'twinkle' ? 0.86 + 0.14 * br : 1, 1 + 0.02 * br, 0);
        if (A.mode === 'twinkle') { sheetAt(ctx, A.rays[0], x, y, r, still ? 1 : 0.5 + 0.5 * br, 1, 0); sheetAt(ctx, A.rays[1], x, y, r, still ? 1 : 0.5 - 0.5 * br, 1, 0); }
        else { sheetAt(ctx, A.rays[0], x, y, r, 1, 1 + 0.045 * br, sw); sheetAt(ctx, A.rays[1], x, y, r, 1, 1 - 0.045 * br, -sw); }
        sheetAt(ctx, A.disc, x, y, r, 1, 1, 0);
        ctx.restore();
      },
      shapes: Object.keys(SHAPES), _sun: []
    };
    P.sun[0] = P.light[0]; P.sun[1] = P.light[1]; P.sun[2] = P.light[2];
    p.remove(); CACHE[look] = P; return P;
  }
  pen.shapes = SHAPES;
  pen.clear = function () { CACHE = {}; };

  /* ---------- Folded: the same folds as an SVG figure that folds itself on reveal (plan O3) ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg', LIVE = [];
  function style() {
    if (d.getElementById('sb-paper-css')) return;
    var s = d.createElement('style'); s.id = 'sb-paper-css';
    s.textContent = '.sb-folded{display:inline-block;position:relative;width:var(--fw,160px);aspect-ratio:1;margin:0;vertical-align:middle}' +
      '.sb-folded svg{display:block;width:100%;height:100%;overflow:visible}' +
      '.sb-folded__facets polygon{transform-box:fill-box;transform-origin:50% 50%;transition:transform var(--dur-base,420ms) var(--ease-paper,ease) calc(var(--i)*60ms),opacity var(--dur-base,420ms) linear calc(var(--i)*60ms)}' +
      '.sb-folded__shadow,.sb-folded__creases{transition:opacity 420ms linear calc(var(--n)*60ms)}' +
      '.sb-folded.is-flat .sb-folded__facets polygon{transform:scale(.12) rotate(-40deg);opacity:0}' +
      '.sb-folded.is-flat .sb-folded__shadow,.sb-folded.is-flat .sb-folded__creases{opacity:0;transition-delay:0s}' +
      '@media (prefers-reduced-motion: reduce){.sb-folded *{transition:none!important}}';
    (d.head || d.documentElement).appendChild(s);
  }
  function svgEl(tag, attrs) { var e = d.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function pts(p) { return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
  function folded(el, o) {
    if (!el) return null;
    if (el.__folded) return el.__folded;
    if (!o) { var a = el.getAttribute('data-sb-folded') || ''; try { o = /^\s*\{/.test(a) ? JSON.parse(a) : { shape: a }; } catch (e) { o = { shape: a }; } }
    o.shape = o.shape || 'crane';
    style(); el.classList.add('sb-folded');
    if (!el.getAttribute('role')) el.setAttribute('role', 'img');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', o.label || ('A folded paper ' + (typeof o.shape === 'string' ? o.shape : 'shape')));
    var api = { el: el, render: render, refold: refold, set: function (n) { Object.assign(o, n); render(); }, destroy: function () { el.__folded = null; LIVE = LIVE.filter(function (x) { return x !== api; }); el.textContent = ''; } };
    function render() {
      var sh = shapeOf(o.shape); if (!sh) return;
      var P = pen(el), oo = Object.assign({ stock: sh.stock, size: 82, x: 100, y: 100 }, o); oo.tags = Object.assign({}, sh.tags, o.tags);
      var tris = place(sh, oo), F = facets(P, tris, oo), st = F.style, line = P.inks['art-line'] || [40, 40, 40];
      var svg = svgEl('svg', { viewBox: '0 0 200 200', 'aria-hidden': 'true', focusable: 'false' });
      if (!st.mono) {
        var L = P.light, h = Math.hypot(L[0], L[1]) || 1, off = 7, sg = svgEl('g', { 'class': 'sb-folded__shadow', fill: css(P.inks['art-shade'] || [0, 0, 0]), opacity: P.shadow, transform: 'translate(' + (-L[0] / h * off).toFixed(1) + ' ' + (-L[1] / h * off).toFixed(1) + ')', style: '--n:' + F.faces.length });
        F.faces.forEach(function (f) { sg.appendChild(svgEl('polygon', { points: pts(f.pts) })); });
        svg.appendChild(sg);
      }
      var fg = svgEl('g', { 'class': 'sb-folded__facets' });
      F.faces.forEach(function (f, i) { fg.appendChild(svgEl('polygon', { points: pts(f.pts), fill: css(f.fill), stroke: css(f.fill), 'stroke-width': '0.6', style: '--i:' + i })); });
      svg.appendChild(fg);
      var cg = svgEl('g', { 'class': 'sb-folded__creases', 'stroke-linecap': 'round', style: '--n:' + F.faces.length });
      F.creases.forEach(function (c) { cg.appendChild(svgEl('line', { x1: c.a[0].toFixed(1), y1: c.a[1].toFixed(1), x2: c.b[0].toFixed(1), y2: c.b[1].toFixed(1), stroke: css(mix(c.c, line, 0.4)), 'stroke-opacity': clamp(P.crease * st.crease * c.k, 0, 1).toFixed(2), 'stroke-width': '1.2' })); });
      F.outline.forEach(function (e) { cg.appendChild(svgEl('line', { x1: e.a[0].toFixed(1), y1: e.a[1].toFixed(1), x2: e.b[0].toFixed(1), y2: e.b[1].toFixed(1), stroke: css(st.mono ? [0, 0, 0] : line), 'stroke-opacity': st.line, 'stroke-width': st.line >= 1 ? '2.4' : '1.4' })); });
      if (st.stitch) F.outline.forEach(function (e) { cg.appendChild(svgEl('line', { x1: e.a[0].toFixed(1), y1: e.a[1].toFixed(1), x2: e.b[0].toFixed(1), y2: e.b[1].toFixed(1), stroke: css(P.inks.accent || line), 'stroke-dasharray': '4 3', 'stroke-width': '1.2' })); });
      svg.appendChild(cg);
      el.textContent = ''; el.appendChild(svg);
    }
    function refold() {
      if (reduced(lookOf(el))) { el.classList.remove('is-flat'); return; }
      el.classList.add('is-flat'); void el.offsetWidth;
      w.requestAnimationFrame(function () { w.requestAnimationFrame(function () { el.classList.remove('is-flat'); }); });
    }
    render(); el.__folded = api; LIVE.push(api);
    if (o.reveal !== false && !reduced(lookOf(el)) && 'IntersectionObserver' in w) {
      el.classList.add('is-flat');
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); refold(); } }); }, { threshold: 0.35 });
      io.observe(el);
    }
    return api;
  }
  folded.scan = function (root) { Array.prototype.forEach.call((root || d).querySelectorAll('[data-sb-folded]'), function (el) { folded(el); }); };
  /* a look change repaints every figure in its new inks */
  function watch() {
    try {
      new MutationObserver(function () { LIVE.forEach(function (a) { if (a.el.isConnected) a.render(); }); })
        .observe(d.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
    } catch (e) { /* old browser */ }
  }

  S.pen = pen; S.folded = folded; S.looks = S.looks || LOOKS; S.paperVersion = VERSION;
  function start() { folded.scan(); watch(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
