/* Storeybrook Pets 1.4.0 · the seven day pets, as data and on canvas. An add-on: load it after bundle.js.
     <script src="components/bundle.js"></script><script src="components/pets.js"></script>
   Storeybrook.pets  the family's crossing pets (family F9, plan S7): the same names in Storeybrook (sb), Depthfield (df) and
                     Hypermetapunk (hmp), saved together in localStorage['crossing:pets'] on stevoblevo.github.io:
                     { found: { 'sb:<id>': ts, 'df:<id>': ts, 'hmp:<id>': ts }, active: { sb: id } }.
   pets.draw(ctx, id, o) paints a pet on canvas from Storeybrook.creatureSVG in a look's own inks (the table below, taken from
   tokens.json and bundle.css; nothing is read from CSS), cached once per pet, look and size, and lets it dance to the beat
   with a swing. No dependencies, no network. Budget: 24 KB. */
(function (w, d) {
  'use strict';
  var S = w.Storeybrook;
  if (!S || S.pets || !S.creatureSVG) return;
  var VERSION = '1.4.0', KEY = 'crossing:pets', HOME = 'https://stevoblevo.github.io/storeybrook/', FAMILY = { sb: 7, df: 5, hmp: 5 };

  /* ---------- the seven, moved here from the showcase (plan S7). look: where each one waits; o: its creatureSVG options ---------- */
  function pet(id, name, look, o, line, how) {
    return { id: id, name: name, line: line, how: how, where: HOME + (look && look !== 'daylight' ? '?look=' + look : ''), look: look,
      o: Object.assign({ form: 'saelion', stage: 4, mood: 'happy', hide: 'plain' }, o) };
  }
  var LIST = [
    pet('egg', 'The egg', 'daylight', { stage: 0 }, 'Saelion left it on the porch stone.', 'Tap Saelion on the front page.'),
    pet('kit', 'Kit', 'knight', { stage: 1 }, 'It woke up by candlelight.', 'Wake the sleeper at bedtime.'),
    pet('octopus', 'Octopus', 'inkblot', { form: 'octopus' }, 'It was waiting on the last page.', 'Turn the slate to its last page.'),
    pet('bunny', 'Bunny', 'comix', { form: 'bunny', mood: 'surprised' }, 'The heist needed an accomplice.', 'Grab the nougats in the comic.'),
    pet('sprite', 'Sprite', 'origami', { stage: 3 }, 'It grew while you walked.', 'Walk three stones in the level maker.'),
    pet('pixie', 'Pixie', 'skein', { form: 'pixie' }, 'It was pressed into the album.', 'Press the seal on the album.'),
    pet('saelion', 'Saelion', null, { stage: 4, hide: 'chimera' }, 'All grown, and she knows the way.', 'Find the other six first.')
  ];
  var BY = {}, REC = {};
  LIST.forEach(function (p, i) { BY[p.id] = p; REC[p.id] = { i: i }; });

  /* ---------- the shared save: read, change, write back; other kits' entries are never touched ---------- */
  var memo = {};
  function read() {
    try { var raw = w.localStorage.getItem(KEY), v = raw ? JSON.parse(raw) : {}; memo = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    catch (e) { /* storage blocked or unreadable: keep this visit's copy */ }
    return memo;
  }
  function found() { var f = read().found; return f && typeof f === 'object' && !Array.isArray(f) ? f : {}; }
  function bare(id) { id = id == null ? '' : String(id); return id.charCodeAt(0) === 115 && id.charCodeAt(1) === 98 && id.charCodeAt(2) === 58 ? id.slice(3) : id; }
  function has(id) { return !!found()['sb:' + bare(id)]; }
  function find(id) {
    id = bare(id); if (!BY[id]) return false;
    var s = read(); if (!s.found || typeof s.found !== 'object' || Array.isArray(s.found)) s.found = {};
    if (s.found['sb:' + id]) return false;
    s.found['sb:' + id] = Date.now(); memo = s;
    try { w.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* kept for this visit */ }
    try { w.dispatchEvent(new CustomEvent('sb:pet', { detail: { id: id, name: BY[id].name, kit: 'sb' } })); } catch (e) { /* old browser */ }
    return true;
  }
  function count() { var f = found(); return LIST.filter(function (p) { return !!f['sb:' + p.id]; }).length; }
  function total() {
    var f = found(), out = { sb: count(), df: 0, hmp: 0, all: 0 };
    Object.keys(f).forEach(function (k) { if (!f[k]) return; if (k.slice(0, 3) === 'df:') out.df++; else if (k.slice(0, 4) === 'hmp:') out.hmp++; });
    out.df = Math.min(out.df, FAMILY.df); out.hmp = Math.min(out.hmp, FAMILY.hmp); out.all = out.sb + out.df + out.hmp;
    return out;
  }

  /* ---------- each look's inks. art-line, art-light, art-shade, wash-rose, wash-sky, wash-sun, gamboge, tag-sun, tag-sky, tag-rose,
     tag-sea from tokens.json, then the creature's fur and arm from bundle.css (tests/pets/logic.cjs keeps them in step) ---------- */
  var INK = {
    daylight: ['#2f3b48', '#ffffff', '#c7d3cf', '#f3c6d3', '#c8e3f4', '#f7dc97', '#d4920f', '#8a5a00', '#2a6a9c', '#a3304f', '#1f6f5c', '#fff4f1', '#c99adb'],
    knight: ['#0f1724', '#f4efe6', '#16202e', '#5a3a52', '#2f4a6e', '#6b5a2e', '#f0c75e', '#f3cf8a', '#8fb4e8', '#f29fb0', '#8ff0d2', '#f4efe6', '#c99adb'],
    inkblot: ['#000000', '#ffffff', '#bdbdbd', '#dcdcdc', '#e2e2e2', '#ececec', '#000000', '#000000', '#000000', '#000000', '#000000', '#ffffff', '#000000'],
    comix: ['#111111', '#ffffff', '#3a3a3a', '#ff9fd0', '#7fd3f5', '#fff07a', '#ffd400', '#7a5a00', '#00669e', '#b0005e', '#1d6e57', '#fff4f1', '#c99adb'],
    origami: ['#2a3540', '#ffffff', '#c8cfd6', '#f6c3b8', '#c9d8ee', '#f6dc9a', '#d99a12', '#7f5700', '#2a4c86', '#a8341c', '#1f6f68', '#fff4f1', '#c99adb'],
    skein: ['#3a2330', '#fffafb', '#e3c9d0', '#f2c6d2', '#d8e3f2', '#f5ddb8', '#c98a2a', '#8a5418', '#2f5f8a', '#93305a', '#1a6e56', '#fff4f1', '#c99adb']
  };
  function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hex(c) { return '#' + c.map(function (v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  /* color-mix(in srgb, b t, a) */
  function mixHex(a, b, t) { var x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (k) { return x[k] + (y[k] - x[k]) * t; })); }
  function inks(look) {
    var k = INK[look], ink = look === 'inkblot', night = look === 'knight';
    var C = { line: k[0], light: k[1], shade: k[2], rose: k[3], sky: k[4], sun: k[5], gamboge: k[6], tsun: k[7], tsky: k[8], trose: k[9], tsea: k[10], fur: k[11], arm: k[12], ink: ink, night: night };
    C.furW = ink ? '#ffffff' : night ? C.fur : mixHex(C.fur, C.tsun, 0.12);
    C.furC = ink ? '#ffffff' : night ? C.fur : mixHex('#f3f7fa', C.tsky, 0.14);
    C.patchW = ink ? '#000000' : mixHex(C.furW, C.trose, 0.74);
    C.patchC = ink ? '#000000' : mixHex(C.furC, C.tsea, 0.74);
    C.earW = ink ? '#000000' : night ? C.rose : mixHex(C.rose, C.trose, 0.55);
    C.earC = ink ? '#000000' : night ? C.rose : mixHex(C.sky, C.tsea, 0.5);
    C.vars = { 'art-line': C.line, 'art-light': C.light, 'art-shade': C.shade, 'wash-rose': C.rose, 'wash-sky': C.sky, 'wash-sun': C.sun, gamboge: C.gamboge };
    return C;
  }

  /* ---------- a self-contained SVG: the bundle.css rules for .sb-creature written onto each element ---------- */
  function dress(el, C, boost) {
    var c = ' ' + (el.getAttribute('class') || '') + ' ', lined = false;
    function is(n) { return c.indexOf(' ' + n + ' ') >= 0; }
    function set(a, v) { el.setAttribute(a, v); }
    function line(wd) { set('stroke', C.line); set('stroke-width', (wd * boost).toFixed(2)); lined = true; }
    if (is('sbc-body')) { set('fill', C.fur); line(3); }
    if (is('sbc-ear-in')) set('fill', C.rose);
    if (is('sbc-arm')) { set('fill', 'none'); set('stroke', C.arm); set('stroke-width', '11'); set('stroke-linecap', 'round'); }
    if (is('sbc-arm-line')) { set('fill', 'none'); line(3); set('stroke-linecap', 'round'); }
    if (is('sbc-wing')) { set('fill', C.sky); set('fill-opacity', '0.7'); line(2.5); }
    if (is('sbc-eye-a')) set('fill', '#e4a623');
    if (is('sbc-eye-b')) set('fill', '#3f7fd0');
    if (is('sbc-pupil')) set('fill', C.line);
    if (is('sbc-glint')) set('fill', '#ffffff');
    if (is('sbc-cheek')) { set('fill', C.rose); set('opacity', '0.85'); }
    if (is('sbc-mouth')) { set('fill', 'none'); line(2.5); set('stroke-linecap', 'round'); }
    if (is('sbc-star')) { set('fill', C.gamboge); line(1.5); }
    if (is('sbc-shadow')) { set('fill', C.shade); set('opacity', '0.6'); }
    if (C.ink && (is('sbc-eye-a') || is('sbc-eye-b'))) { set('fill', '#ffffff'); set('stroke', '#000000'); set('stroke-width', (1.5 * boost).toFixed(2)); lined = true; }
    if (is('sbc-fur-w')) set('fill', C.furW);
    if (is('sbc-fur-c')) set('fill', C.furC);
    if (is('sbc-rim')) { set('fill', 'none'); line(3); }
    if (is('sbc-patch--w')) set('fill', C.patchW);
    if (is('sbc-patch--c')) set('fill', C.patchC);
    if (is('sbc-ear-in--w')) set('fill', C.earW);
    if (is('sbc-ear-in--c')) set('fill', C.earC);
    if (!lined && el.getAttribute('stroke') === C.line && el.hasAttribute('stroke-width')) set('stroke-width', (parseFloat(el.getAttribute('stroke-width')) * boost).toFixed(2));
    el.removeAttribute('class'); el.removeAttribute('style');
  }
  /* the drawing split into parts that move on their own: shadow, wings, ears, arms and the rest (head, face, coat, stars) */
  var SLOTS = 9; /* 0 shadow, 1 left wing, 2 right wing, 3 left ear, 4 right ear, 5 arms, 6 body, 7 body with eyes shut, 8 glow */
  function parts(o, C, boost, shut) {
    var src = S.creatureSVG(Object.assign({}, o, { shut: shut, label: 'pet' })).replace(/var\(--([a-z-]+)\)/g, function (m, n) { return C.vars[n] || C.line; });
    var doc; try { doc = new DOMParser().parseFromString(src.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml'); } catch (e) { return null; }
    var root = doc && doc.documentElement; if (!root || root.nodeName !== 'svg') return null;
    if (C.night) Array.prototype.slice.call(root.querySelectorAll('.sbc-hide')).forEach(function (n) { n.parentNode.removeChild(n); });
    var out = [[], [], [], [], [], [], []];
    function kids(g, idx) { var c = g.cloneNode(false), k = Array.prototype.slice.call(g.children); idx.forEach(function (i) { if (k[i]) c.appendChild(k[i].cloneNode(true)); }); return c; }
    Array.prototype.slice.call(root.children).forEach(function (n) {
      var cls = n.getAttribute('class') || '', first = n.firstElementChild, fc = first ? first.getAttribute('class') || '' : '';
      if (/sbc-shadow/.test(cls)) out[0].push(n);
      else if (n.nodeName === 'g' && /sbc-wing/.test(fc)) { out[1].push(kids(n, [0, 2])); out[2].push(kids(n, [1, 3])); }
      else if (n.nodeName === 'g' && /sbc-body/.test(fc)) { out[3].push(kids(n, [0, 1])); out[4].push(kids(n, [2, 3])); }
      else if (n.nodeName === 'g' && n.querySelector('.sbc-arm')) out[5].push(n);
      else out[6].push(n);
    });
    var xs = new XMLSerializer();
    return out.map(function (list) {
      if (!list.length) return '';
      return list.map(function (n) { [n].concat(Array.prototype.slice.call(n.querySelectorAll('*'))).forEach(function (e) { dress(e, C, boost); }); return xs.serializeToString(n); }).join('');
    });
  }

  /* ---------- rasterising: one picture per part, per look, per size step, cropped to what it draws ---------- */
  var BOX = 256, ORG = -28, BUCK = [40, 60, 90, 135, 200, 300, 450, 680, 1000];
  function crop(c, B) {
    var g = c.getContext('2d'), px, x, y, x0 = B, y0 = B, x1 = -1, y1 = -1;
    try { px = g.getImageData(0, 0, B, B).data; } catch (e) { return { c: c, x: ORG, y: ORG, w: BOX, h: BOX }; }
    for (y = 0; y < B; y++) for (x = 0; x < B; x++) if (px[(y * B + x) * 4 + 3] > 3) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(B - 1, x1 + 1); y1 = Math.min(B - 1, y1 + 1);
    var n = d.createElement('canvas'), k = BOX / B; n.width = x1 - x0 + 1; n.height = y1 - y0 + 1;
    n.getContext('2d').drawImage(c, -x0, -y0);
    return { c: n, x: ORG + x0 * k, y: ORG + y0 * k, w: n.width * k, h: n.height * k };
  }
  function raster(inner, B, done) {
    var im = new Image();
    im.onload = function () {
      var c = d.createElement('canvas'); c.width = c.height = B;
      try { c.getContext('2d').drawImage(im, 0, 0, B, B); done(crop(c, B)); } catch (e) { done(null); }
    };
    im.onerror = function () { done(null); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + ORG + ' ' + ORG + ' ' + BOX + ' ' + BOX + '" width="' + B + '" height="' + B + '">' + inner + '</svg>');
  }
  function glow(C, B) { /* Knight Night: she glows by candlelight instead of wearing her coat */
    var s = Math.round(B * 0.8), c = d.createElement('canvas'), g = c.getContext('2d'), q = rgb(C.gamboge), r = s / 2;
    c.width = c.height = s;
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(' + q + ',0.34)'); gr.addColorStop(0.45, 'rgba(' + q + ',0.14)'); gr.addColorStop(1, 'rgba(' + q + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    var k = BOX / B; return { c: c, x: 100 - s * k / 2, y: 114 - s * k / 2, w: s * k, h: s * k };
  }
  function load(rec, bi) {
    var e = { ready: false, L: [] }, B = BUCK[bi], C = inks(rec.look), boost = Math.max(1, Math.min(1.8, 1.15 / (3 * B / BOX)));
    var a = parts(rec.o, C, boost, false), b = rec.blinks ? parts(rec.o, C, boost, true) : null, src = [], left = 0;
    if (!a) return e;
    for (var i = 0; i < 7; i++) src[i] = a[i]; src[7] = b ? b[6] : '';
    for (i = 0; i < SLOTS; i++) e.L[i] = null;
    if (C.night) e.L[8] = glow(C, B);
    src.forEach(function (s, i) { if (!s) return; left++; raster(s, B, function (L) { e.L[i] = L; if (--left === 0) e.ready = true; }); });
    if (!left) e.ready = true;
    return e;
  }
  function record(p, look) {
    var r = REC[p.id], o = p.o; if (r[look]) return r[look];
    var stage = Math.max(0, Math.min(4, o.stage == null ? 4 : o.stage)), sc = [0.62, 0.72, 0.86, 0.94, 1][stage], ry = 50 * sc, wg = stage >= 4 || o.form === 'pixie' ? 1 : 0.7;
    return (r[look] = { o: o, look: look, i: r.i, b: [], blinks: !(o.form === 'saelion' && stage === 0) && o.mood !== 'sleepy',
      ex: 17 * sc, ey: 118 - ry + 6, wx: 12 * wg, wy: 112, ay: 118 + ry * 0.55 });
  }

  /* ---------- the groove: onsets read from `beat`, the tempo learnt from them, a swing laid a little behind the beat ---------- */
  var BT = { t: -1, beat: 0, on: -1, per: 0.5, n: 0, e: 0 };
  function track(t, beat) {
    if (t === BT.t) return;
    if (t < BT.t - 1) { BT.on = -1; BT.n = 0; BT.e = 0; }
    var dt = BT.t < 0 || t < BT.t ? 0 : Math.min(0.1, t - BT.t);
    if (beat > 0.6 && beat > BT.beat + 0.2) {
      if (BT.on >= 0) { var gap = t - BT.on; if (gap > 0.22 && gap < 2) BT.per += (gap - BT.per) * (BT.n < 3 ? 0.6 : 0.25); }
      BT.on = t; BT.n++;
    }
    var live = BT.on >= 0 && t - BT.on < BT.per * 2.2;
    BT.e += ((live ? 1 : 0) - BT.e) * Math.min(1, dt * (live ? 4 : 1.6));
    BT.t = t; BT.beat = beat;
  }
  var SW = 0.64, LAY = 0.05, PI = Math.PI, LAG = [0, 0.01, 0.04, 0, 0.02, 0.01, 0.03];
  var P = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, el: 0, er: 0, ws: 1, wr: 0, as: 0, ss: 1, sa: 1, blink: false };
  function fr(v) { return v - Math.floor(v); }
  function arc(u) { return u <= 0 || u >= 1 ? 0 : 4 * u * (1 - u); }
  function bump(u, wd) { u /= wd; return Math.exp(-u * u); }
  /* the swung sway: from one side to the other over a beat, half way by the "and" (long, then short) */
  function swing(q, dir) { return dir * Math.cos(PI * (q < SW ? 0.5 * q / SW : 0.5 + 0.5 * (q - SW) / (1 - SW))); }
  function pose(i, t, ph, E, step) {
    var g = ph - LAY - LAG[i], gl = g - 0.12;
    if (step) { g = Math.floor(g) + 0.3; gl = g; }
    var q = fr(g), dir = (Math.floor(g) + BT.n) & 1 ? -1 : 1, ql = fr(gl), dirl = (Math.floor(gl) + BT.n) & 1 ? -1 : 1;
    var air = q < SW ? arc(q / SW) : 0, skip = q >= SW ? arc((q - SW) / (1 - SW)) : 0, land = bump(Math.min(q, 1 - q), 0.08), land2 = bump(q - SW, 0.06);
    var sway = swing(q, dir), trail = swing(ql, dirl), br = 1 - Math.cos(2 * PI * t / 4.2), fl, st, h;
    P.dx = 0; P.dy = 0; P.rot = 0; P.sx = 1 + 0.0125 * br; P.sy = 1 - 0.0075 * br; P.el = 0; P.er = 0; P.ws = 1; P.wr = 0; P.as = 0;
    switch (i) {
      case 0: /* the egg rocks on the beat and hops on the "and"; idle, it wobbles now and then */
        P.rot = E * 0.15 * sway + (1 - E) * 0.06 * Math.sin(t * 11) * Math.pow(Math.max(0, Math.sin(t * 0.9)), 14);
        P.dy = -E * 9 * skip; P.sy -= E * 0.08 * land; P.sx += E * 0.06 * land; break;
      case 1: /* the kit bobs; its ears flop just after each landing */
        P.dy = -E * (13 * air + 4 * skip); P.sy += E * (0.06 * air - 0.1 * land - 0.05 * land2); P.sx += E * (0.07 * land + 0.03 * land2 - 0.03 * air);
        P.rot = E * 0.05 * sway;
        P.el = -E * (0.34 * bump(q - 0.12, 0.12) + 0.16 * bump(q - SW - 0.1, 0.08) - 0.1 * air) - (1 - E) * 0.1 * Math.pow(Math.max(0, Math.sin(t * 0.7)), 30);
        P.er = E * (0.34 * bump(q - 0.16, 0.12) + 0.16 * bump(q - SW - 0.13, 0.08) - 0.1 * air) + (1 - E) * 0.1 * Math.pow(Math.max(0, Math.sin(t * 0.7 - 0.4)), 30); break;
      case 2: /* the octopus shimmies side to side, and its arms trail behind */
        P.dx = E * 10 * sway; P.rot = -E * 0.05 * sway; P.as = -E * 0.45 * trail + (1 - E) * 0.08 * Math.sin(t * 1.7);
        P.dy = -E * 4 * skip; P.sy -= E * 0.06 * land; P.sx += E * 0.04 * land; break;
      case 3: /* the bunny takes the long beat in one big hop and skips the short one; it stretches in the air, squashes landing */
        P.dy = -E * (26 * air + 6 * skip); st = E * 0.13 * arc(air);
        P.sy += st - E * (0.16 * land + 0.06 * land2); P.sx += E * (0.12 * land + 0.04 * land2) - st * 0.7;
        P.rot = E * 0.06 * sway; P.el = -E * (0.3 * bump(q - 0.1, 0.1) - 0.22 * air); P.er = E * (0.3 * bump(q - 0.14, 0.1) - 0.22 * air); break;
      case 4: /* the sprite floats; its wings beat on the beat and on the "and" */
        P.dy = -7 - 3 * Math.sin(2 * PI * t / 2.6) - E * (7 * air + 3 * skip);
        fl = E * (0.42 * bump(Math.min(q, 1 - q), 0.08) + 0.3 * bump(q - SW, 0.06)) + (1 - E) * 0.14 * (0.5 + 0.5 * Math.sin(t * 5));
        P.ws = 1 - fl; P.wr = fl * 0.35; P.as = -E * 0.3 * trail + (1 - E) * 0.06 * Math.sin(t * 2.1); P.rot = E * 0.05 * sway;
        P.el = -E * 0.14 * bump(q - 0.1, 0.12); P.er = E * 0.14 * bump(q - 0.14, 0.12); break;
      case 5: /* the pixie flutters along a swung curve, two wingbeats to the beat, long and short */
        P.dx = E * 9 * sway; P.dy = -11 - 4 * Math.sin(2 * PI * t / 1.9) - E * 6 * (1 - sway * sway);
        fl = E * 0.5 * (0.5 + 0.5 * Math.cos(2 * PI * (q < SW ? q / SW : (q - SW) / (1 - SW)))) + (1 - E) * 0.22 * (0.5 + 0.5 * Math.sin(t * 9)) + 0.04 * Math.sin(t * 38);
        P.ws = 1 - fl; P.wr = fl * 0.3; P.rot = E * 0.09 * sway; break;
      default: /* Saelion sways like a queen: she dips on the beat, opens her wings, and her arms ripple after */
        P.dy = E * (4 * land - 6 * skip); P.sy += E * (0.04 * skip - 0.08 * land); P.sx += E * 0.05 * land; P.rot = E * 0.06 * sway;
        P.ws = 1 + E * (0.1 * bump(q - 0.06, 0.12) - 0.2 * bump(q - SW, 0.07)); P.wr = E * (0.12 * bump(q - SW, 0.07) - 0.08 * bump(q - 0.06, 0.12));
        P.el = -E * 0.22 * bump(q - 0.12, 0.12); P.er = E * 0.22 * bump(q - 0.16, 0.12); P.as = -E * 0.32 * trail + (1 - E) * 0.05 * Math.sin(t * 1.6);
    }
    h = Math.max(0, -P.dy); P.ss = Math.max(0.5, 1 - h * 0.012); P.sa = Math.max(0.35, 1 - h * 0.018);
    P.blink = !step && t > 0 && fr(t / 4.3 + i * 0.37) < 0.032;
  }

  /* ---------- draw(ctx, id, { x, y, size, t, beat, look, still, alpha }) ---------- */
  var EMPTY = {}, MQ = null;
  try { MQ = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { MQ = null; }
  function part(ctx, L) { if (L) ctx.drawImage(L.c, L.x, L.y, L.w, L.h); }
  function draw(ctx, id, o) {
    var p = BY[id] || BY[bare(id)]; if (!p || !ctx || !ctx.drawImage) return false;
    o = o || EMPTY;
    var look = INK[o.look] ? o.look : 'daylight', size = +o.size > 0 ? +o.size : 64, still = o.still != null ? !!o.still : look === 'inkblot' || !!(MQ && MQ.matches);
    var rec = record(p, look), dpr = Math.min(3, w.devicePixelRatio || 1), need = size * BOX / 200 * dpr, bi = 0, k, e, L;
    while (bi < BUCK.length - 1 && BUCK[bi] < need) bi++;
    e = rec.b[bi] || (rec.b[bi] = load(rec, bi));
    if (!e.ready) { e = null; for (k = 1; k < BUCK.length && !e; k++) { L = rec.b[bi + k]; if (L && L.ready) e = L; else if ((L = rec.b[bi - k]) && L.ready) e = L; } if (!e) return false; }
    var t = still ? 0 : +o.t || 0, E = 0, ph = 0, step = look === 'inkblot'; /* Ink Blot is e-ink: still unless asked, then one pose per beat, no tweening, no idle */
    if (!still) { track(t, +o.beat || 0); E = BT.e; ph = BT.on >= 0 ? (t - BT.on) / BT.per : 0; if (step) { E = E > 0.5 ? 1 : 0; t = 0; } }
    pose(rec.i, t, ph, E, step);
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : Math.max(0, Math.min(1, +o.alpha));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    k = size / 200;
    ctx.translate(+o.x || 0, +o.y || 0); ctx.scale(k, k); ctx.translate(-100, -100);
    if ((L = e.L[0])) { ctx.save(); ctx.globalAlpha *= P.sa; ctx.translate(100 + P.dx * 0.6, 178); ctx.scale(P.ss, P.ss); ctx.translate(-100, -178); part(ctx, L); ctx.restore(); }
    ctx.translate(100 + P.dx, 178 + P.dy); ctx.rotate(P.rot); ctx.scale(P.sx, P.sy); ctx.translate(-100, -178);
    if ((L = e.L[8])) { ctx.save(); ctx.globalAlpha *= 0.75 + 0.25 * (+o.beat || 0); part(ctx, L); ctx.restore(); }
    if ((L = e.L[1])) { ctx.save(); ctx.translate(100 - rec.wx, rec.wy); ctx.rotate(P.wr); ctx.scale(P.ws, 1); ctx.translate(rec.wx - 100, -rec.wy); part(ctx, L); ctx.restore(); }
    if ((L = e.L[2])) { ctx.save(); ctx.translate(100 + rec.wx, rec.wy); ctx.rotate(-P.wr); ctx.scale(P.ws, 1); ctx.translate(-100 - rec.wx, -rec.wy); part(ctx, L); ctx.restore(); }
    if ((L = e.L[3])) { ctx.save(); ctx.translate(100 - rec.ex, rec.ey); ctx.rotate(P.el); ctx.translate(rec.ex - 100, -rec.ey); part(ctx, L); ctx.restore(); }
    if ((L = e.L[4])) { ctx.save(); ctx.translate(100 + rec.ex, rec.ey); ctx.rotate(P.er); ctx.translate(-100 - rec.ex, -rec.ey); part(ctx, L); ctx.restore(); }
    if ((L = e.L[5])) { ctx.save(); ctx.transform(1, 0, P.as, 1, -P.as * rec.ay, 0); part(ctx, L); ctx.restore(); }
    part(ctx, P.blink && e.L[7] ? e.L[7] : e.L[6]);
    ctx.restore();
    return true;
  }

  S.pets = { kit: 'sb', key: KEY, version: VERSION, list: LIST, has: has, find: find, count: count, total: total, draw: draw };
})(window, document);
