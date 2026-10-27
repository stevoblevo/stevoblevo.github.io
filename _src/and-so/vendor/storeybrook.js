/* Storeybrook 1.0.0 · behaviors for storybook pages and little games. One classic script, no dependencies, no network.
   window.Storeybrook: theme, density, nav, read (read aloud), rewards (nougats), unlocks, brook, creature, spread,
   fold, blot, drawer, dialog, toast, sound, haptic, icons. Every module checks reduced motion at run time and
   wraps storage, so a page works with storage blocked and with JS off (markup stays readable). */
(function (w, d) {
  'use strict';
  if (w.Storeybrook && w.Storeybrook.version) return;
  var VERSION = '1.1.0';
  var THEMES = [
    { id: 'daylight', name: 'Meta Daylight', line: 'Watercolor on north-light paper' },
    { id: 'knight', name: 'Knight Night', line: 'A cobalt paper theatre by candle' },
    { id: 'inkblot', name: 'Ink Blot', line: 'Black ink, e-ink and print' },
    { id: 'comix', name: 'Comix', line: 'Halftone, panels and balloons' },
    { id: 'origami', name: 'Origami', line: 'Folded paper on a cutting mat' },
    { id: 'skein', name: 'Skein silk', line: 'Silk, copper thread and lace' }
  ];
  var IDS = THEMES.map(function (t) { return t.id; });

  /* ---------- small helpers ---------- */
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function look() { return d.documentElement.getAttribute('data-theme') || d.documentElement.getAttribute('data-sb') || ''; }
  function reduced() { try { return w.matchMedia('(prefers-reduced-motion: reduce)').matches || look() === 'inkblot'; } catch (e) { return false; } }
  function store(kind) { try { var s = w[kind]; var k = '__sb'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function get(k, def, s) { s = s || LS; try { var v = s && s.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function put(k, v, s) { s = s || LS; try { if (s) s.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
  function emit(name, detail) { try { w.dispatchEvent(new CustomEvent('sb:' + name, { detail: detail })); } catch (e) { /* old browser */ } }
  function token(name) { try { return getComputedStyle(d.documentElement).getPropertyValue('--' + name).trim(); } catch (e) { return ''; } }
  function ms(name, def) { var v = token(name); var n = parseFloat(v); return isNaN(n) ? def : (/ms$/.test(v) ? n : n * 1000); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, attrs, html) { var e = d.createElement(tag); if (attrs) for (var k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; }
  function rand(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- shared SVG filters: deckled edges, watercolor bleed, wobbly ink ---------- */
  function ensureDefs() {
    if (!d.body || d.getElementById('sb-defs')) return;
    var s = d.createElementNS(NS, 'svg');
    s.setAttribute('id', 'sb-defs'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.style.position = 'absolute'; s.style.width = '0'; s.style.height = '0'; s.style.overflow = 'hidden';
    s.innerHTML =
      '<filter id="sb-deckle" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="sb-bleed" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves="3" seed="7" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="dd"/>' +
      '<feGaussianBlur in="dd" stdDeviation="0.9"/></filter>' +
      '<filter id="sb-ink" x="-5%" y="-5%" width="110%" height="110%">' +
      '<feTurbulence type="turbulence" baseFrequency="0.06" numOctaves="2" seed="11" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>';
    d.body.insertBefore(s, d.body.firstChild);
  }

  /* ---------- theme: six looks, one set of names ---------- */
  var theme = {
    list: function () { return THEMES.slice(); },
    get: function () { var t = d.documentElement.getAttribute('data-theme'); return IDS.indexOf(t) >= 0 ? t : 'daylight'; },
    set: function (id, opts) {
      opts = opts || {}; if (IDS.indexOf(id) < 0) return theme.get();
      d.documentElement.setAttribute('data-theme', id);
      if (opts.persist !== false) put('sb:theme', id);
      $$('[data-sb-look]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sb-look') === id)); });
      emit('theme', { theme: id }); return id;
    },
    cycle: function (allowed) { var list = allowed || IDS; var i = list.indexOf(theme.get()); return theme.set(list[(i + 1) % list.length]); },
    init: function (opts) {
      opts = opts || {}; var q = null;
      try { q = new URLSearchParams(w.location.search).get('look'); } catch (e) { /* no URL */ }
      var saved = get('sb:theme', null), cur = d.documentElement.getAttribute('data-theme');
      var pick = IDS.indexOf(q) >= 0 ? q : IDS.indexOf(saved) >= 0 ? saved : IDS.indexOf(cur) >= 0 ? cur : (opts.fallback || 'daylight');
      return theme.set(pick, { persist: false });
    }
  };

  /* ---------- density: regular, kid, tv ---------- */
  var density = {
    get: function () { return d.documentElement.getAttribute('data-density') || 'regular'; },
    set: function (v) { if (['regular', 'kid', 'tv'].indexOf(v) < 0) v = 'regular'; d.documentElement.setAttribute('data-density', v); put('sb:density', v); emit('density', { density: v }); if (v === 'tv') nav.enable(); return v; },
    isTV: function () { var ua = (navigator.userAgent || ''); return /\b(Web0S|webOS|SMART-TV|SmartTV|Tizen|BRAVIA|AFT[A-Z]|CrKey|Android TV|HbbTV|NetCast|Viera|Roku|Xbox|PlayStation)\b/i.test(ua); },
    init: function () {
      var q = null; try { q = new URLSearchParams(w.location.search).get('tv'); } catch (e) { /* no URL */ }
      var saved = get('sb:density', null);
      var v = q === '1' ? 'tv' : saved ? saved : density.isTV() ? 'tv' : (d.documentElement.getAttribute('data-density') || 'regular');
      d.documentElement.setAttribute('data-density', v); if (v === 'tv') nav.enable(); return v;
    }
  };

  /* ---------- spatial navigation: arrows, a remote's D-pad, a gamepad ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [data-sb-focus]';
  var nav = {
    on: false, pad: null,
    candidates: function () { return $$(FOCUSABLE).filter(function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden],[inert]') && getComputedStyle(e).visibility !== 'hidden'; }); },
    move: function (dir) {
      var cur = d.activeElement, list = nav.candidates(); if (!list.length) return false;
      if (!cur || cur === d.body || list.indexOf(cur) < 0) { (d.querySelector('[data-sb-autofocus]') || list[0]).focus(); return true; }
      var a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = Infinity;
      list.forEach(function (e) {
        if (e === cur) return; var b = e.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
        var main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, side = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
        if (main <= 4) return; var score = main + side * 2.2; if (score < bs) { bs = score; best = e; }
      });
      if (best) { best.focus({ preventScroll: true }); try { best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { best.scrollIntoView(); } return true; }
      return false;
    },
    back: function () {
      var dl = $('dialog[open]'); if (dl) { dl.close(); return true; }
      var dr = $('.sb-drawer.is-open'); if (dr) { drawer.close(dr); return true; }
      emit('back', {}); return false;
    },
    key: function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[e.key] && (nav.on || density.get() === 'tv')) { if (nav.move(map[e.key])) e.preventDefault(); }
      else if ((e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack' || e.keyCode === 461) && density.get() === 'tv') { if (nav.back()) e.preventDefault(); }
    },
    enable: function () {
      if (nav.on) return; nav.on = true;
      if (!nav.pad && 'getGamepads' in navigator) {
        var prev = {}, rep = 0;
        var poll = function (ts) {
          var pads = []; try { pads = navigator.getGamepads() || []; } catch (e) { pads = []; }
          for (var i = 0; i < pads.length; i++) {
            var p = pads[i]; if (!p) continue;
            var b = function (n) { return !!(p.buttons[n] && p.buttons[n].pressed); };
            var st = { up: b(12) || p.axes[1] < -0.6, down: b(13) || p.axes[1] > 0.6, left: b(14) || p.axes[0] < -0.6, right: b(15) || p.axes[0] > 0.6, a: b(0), b: b(1) };
            ['up', 'down', 'left', 'right'].forEach(function (k) { if (st[k] && (!prev[k] || ts - rep > 240)) { nav.move(k); rep = ts; } });
            if (st.a && !prev.a && d.activeElement && d.activeElement !== d.body) d.activeElement.click();
            if (st.b && !prev.b) nav.back();
            prev = st; break;
          }
          nav.pad = w.requestAnimationFrame(poll);
        };
        w.addEventListener('gamepadconnected', function () { if (!nav.pad) nav.pad = w.requestAnimationFrame(poll); });
      }
    }
  };
  d.addEventListener('keydown', function (e) { nav.key(e); });

  /* ---------- read aloud: Irish English first, word by word ---------- */
  var SY = w.speechSynthesis || null;
  var IRISH_NAMES = /moira|orla|emily.*ireland|connor.*ireland|ireland|irish/i;
  var read = {
    supported: !!(SY && w.SpeechSynthesisUtterance), state: 'idle', voice: null, rate: 0.96, pitch: 1.05, _q: null, _el: null, _words: [], _chunks: [], _i: 0, _timer: 0, _boundary: false,
    voices: function () {
      if (!read.supported) return [];
      var v = SY.getVoices() || [];
      function rank(x) { var l = (x.lang || '').toLowerCase(); return l === 'en-ie' || IRISH_NAMES.test(x.name) && l.indexOf('en') === 0 ? 0 : l === 'en-gb' ? 1 : l.indexOf('en') === 0 ? 2 : 3; }
      return v.slice().sort(function (a, b) { return rank(a) - rank(b) || (b.localService === a.localService ? 0 : b.localService ? 1 : -1) || a.name.localeCompare(b.name); });
    },
    pick: function (name) {
      var v = read.voices(); if (!v.length) return null;
      if (name) { var m = v.filter(function (x) { return x.name === name; })[0]; if (m) return m; }
      var saved = get('sb:voice', null); if (saved) { var s = v.filter(function (x) { return x.name === saved; })[0]; if (s) return s; }
      return v[0];
    },
    isIrish: function (v) { return !!v && (/^en-ie$/i.test(v.lang || '') || (IRISH_NAMES.test(v.name) && /^en/i.test(v.lang || ''))); },
    prepare: function (root) {
      if (root.__sbWords) return root.__sbWords;
      var words = [], text = '', walker = d.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) { if (n.parentNode && !n.parentNode.closest('script,style,[aria-hidden="true"],.sb-noread')) nodes.push(n); }
      nodes.forEach(function (tn) {
        var parts = tn.nodeValue.split(/(\s+)/), frag = d.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(p)); text += ' '; return; }
          var sp = d.createElement('span'); sp.className = 'sb-word'; sp.textContent = p; frag.appendChild(sp);
          words.push({ el: sp, start: text.length, end: text.length + p.length }); text += p;
        });
        tn.parentNode.replaceChild(frag, tn);
      });
      root.__sbWords = { words: words, text: text.replace(/\s+/g, ' ') };
      return root.__sbWords;
    },
    _chunk: function (text) {
      var out = [], re = /[^.!?;:]+[.!?;:]*\s*/g, m, buf = '', start = 0, pos = 0;
      while ((m = re.exec(text))) {
        if ((buf + m[0]).length > 220 && buf) { out.push({ text: buf, start: start }); start = pos; buf = ''; }
        buf += m[0]; pos += m[0].length;
      }
      if (buf.trim()) out.push({ text: buf, start: start });
      return out.length ? out : [{ text: text, start: 0 }];
    },
    _mark: function (charIndex) {
      var ws = read._words, hit = null;
      for (var i = 0; i < ws.length; i++) { if (ws[i].start <= charIndex && charIndex < ws[i].end + 1) { hit = ws[i]; break; } if (ws[i].start > charIndex) { hit = ws[Math.max(0, i - 1)]; break; } }
      $$('.sb-word.is-reading', read._el || d).forEach(function (x) { x.classList.remove('is-reading'); });
      if (hit) { hit.el.classList.add('is-reading'); var p = Math.round(100 * (ws.indexOf(hit) + 1) / ws.length); emit('read', { state: read.state, progress: p }); read._progress(p); }
    },
    _progress: function (p) { $$('.sb-reader__meter i').forEach(function (x) { x.style.setProperty('--p', p + '%'); }); },
    speak: function (target, opts) {
      opts = opts || {}; if (!read.supported) { emit('read', { state: 'unsupported' }); return false; }
      read.stop(true);
      var el2 = typeof target === 'string' ? null : target, prep = el2 ? read.prepare(el2) : { words: [], text: String(target) };
      read._el = el2; read._words = prep.words; read._chunks = read._chunk(prep.text); read._i = 0; read._boundary = false;
      read.voice = read.pick(opts.voice); read.rate = opts.rate || get('sb:rate', read.rate); read.pitch = opts.pitch || read.pitch;
      read.state = 'speaking'; emit('read', { state: 'speaking', progress: 0, voice: read.voice && read.voice.name });
      read._next(); read._sync(); return true;
    },
    _next: function () {
      if (read._i >= read._chunks.length) { read._done(); return; }
      var c = read._chunks[read._i], u = new w.SpeechSynthesisUtterance(c.text);
      if (read.voice) { u.voice = read.voice; u.lang = read.voice.lang; } else u.lang = 'en-IE';
      u.rate = read.rate; u.pitch = read.pitch;
      u.onboundary = function (e) { if (e.name && e.name !== 'word') return; read._boundary = true; read._mark(c.start + (e.charIndex || 0)); };
      u.onstart = function () {
        clearInterval(read._timer);
        if (!read._words.length) return;
        var wps = 2.6 * read.rate, t0 = Date.now(), first = read._words.findIndex(function (x) { return x.start >= c.start; });
        read._timer = setInterval(function () {
          if (read._boundary || read.state !== 'speaking') return;
          var k = first + Math.floor((Date.now() - t0) / 1000 * wps); var wd = read._words[Math.min(k, read._words.length - 1)];
          if (wd && wd.start < c.start + c.text.length) read._mark(wd.start);
        }, 120);
      };
      u.onend = function () { clearInterval(read._timer); if (read.state === 'idle') return; read._i++; read._next(); };
      u.onerror = function () { clearInterval(read._timer); if (read.state !== 'idle') { read._i++; read._next(); } };
      read._q = u; SY.speak(u);
    },
    _done: function () { clearInterval(read._timer); read.state = 'idle'; $$('.sb-word.is-reading').forEach(function (x) { x.classList.remove('is-reading'); }); read._progress(100); emit('read', { state: 'done', progress: 100 }); read._sync(); },
    pause: function () { if (read.state === 'speaking') { SY.pause(); read.state = 'paused'; emit('read', { state: 'paused' }); read._sync(); } },
    resume: function () { if (read.state === 'paused') { SY.resume(); read.state = 'speaking'; emit('read', { state: 'speaking' }); read._sync(); } },
    toggle: function (target) { if (read.state === 'speaking') read.pause(); else if (read.state === 'paused') read.resume(); else read.speak(target); },
    stop: function (quiet) { if (!read.supported) return; clearInterval(read._timer); read.state = 'idle'; try { SY.cancel(); } catch (e) { /* engine busy */ } $$('.sb-word.is-reading').forEach(function (x) { x.classList.remove('is-reading'); }); if (!quiet) { emit('read', { state: 'stopped' }); read._sync(); } },
    _sync: function () {
      $$('.sb-reader').forEach(function (bar) {
        var b = $('.sb-reader__play', bar); if (b) { b.setAttribute('aria-pressed', String(read.state === 'speaking')); b.setAttribute('aria-label', read.state === 'speaking' ? 'Pause reading' : read.state === 'paused' ? 'Keep reading' : 'Read it to me'); b.innerHTML = icon(read.state === 'speaking' ? 'pause' : 'play', 26); }
      });
    },
    bind: function (bar, target) {
      if (!bar || bar.__sb) return; bar.__sb = true;
      var tgt = target || (bar.getAttribute('data-sb-read') ? $(bar.getAttribute('data-sb-read')) : null);
      if (!read.supported) { bar.setAttribute('data-unsupported', ''); var vv = $('.sb-reader__voice', bar); if (vv) vv.textContent = 'This browser has no voices. The words are all here to read.'; var pb = $('.sb-reader__play', bar); if (pb) pb.disabled = true; return; }
      var play = $('.sb-reader__play', bar), sel = $('select[data-sb-voice]', bar), rate = $('select[data-sb-rate]', bar), vname = $('.sb-reader__voice', bar);
      function fill() {
        var vs = read.voices(), cur = read.pick(); if (!sel) { if (vname && cur) vname.textContent = cur.name + (read.isIrish(cur) ? ' · Irish English' : ''); return; }
        sel.innerHTML = vs.filter(function (v) { return /^en/i.test(v.lang); }).map(function (v) { return '<option value="' + esc(v.name) + '"' + (cur && v.name === cur.name ? ' selected' : '') + '>' + esc(v.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*\(Natural\)/, '')) + (read.isIrish(v) ? ' (Irish)' : '') + '</option>'; }).join('');
        if (vname && cur) vname.textContent = read.isIrish(cur) ? 'Irish English voice' : 'No Irish voice on this device: ' + cur.lang;
      }
      fill(); if (SY.addEventListener) SY.addEventListener('voiceschanged', fill); else SY.onvoiceschanged = fill;
      if (play) play.addEventListener('click', function () { read.toggle(tgt || d.querySelector('[data-sb-story]') || d.body); });
      if (sel) sel.addEventListener('change', function () { put('sb:voice', sel.value); if (read.state !== 'idle') read.speak(read._el || tgt); fill(); });
      if (rate) { rate.value = String(get('sb:rate', read.rate)); rate.addEventListener('change', function () { put('sb:rate', parseFloat(rate.value)); read.rate = parseFloat(rate.value); }); }
      read._sync();
    }
  };

  /* ---------- nougats: small rewards that fly to the jar ---------- */
  function nougatSVG(seed) {
    var r = rand(seed || 7), nuts = '';
    for (var i = 0; i < 5; i++) nuts += '<ellipse cx="' + (40 + r() * 40).toFixed(1) + '" cy="' + (22 + r() * 14).toFixed(1) + '" rx="' + (2.6 + r() * 2).toFixed(1) + '" ry="' + (1.8 + r() * 1.4).toFixed(1) + '" fill="var(--nougat-nut)" transform="rotate(' + (r() * 180).toFixed(0) + ' 60 31)"/>';
    return '<svg viewBox="0 0 120 62" aria-hidden="true" focusable="false">' +
      '<path d="M22 31 L3 14 Q1 31 3 48 Z" fill="var(--wrapper)" stroke="var(--art-line)" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M98 31 L117 14 Q119 31 117 48 Z" fill="var(--wrapper)" stroke="var(--art-line)" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<rect x="20" y="10" width="80" height="42" rx="12" fill="var(--nougat)" stroke="var(--art-line)" stroke-width="2.6"/>' + nuts +
      '<path d="M26 18 Q30 14 38 14" stroke="var(--art-light)" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>' +
      '<path d="M20 22 h80 M20 40 h80" stroke="var(--wrapper)" stroke-width="5" opacity=".55"/></svg>';
  }
  function jarSVG(fill) {
    var h = Math.max(0, Math.min(1, fill)) * 70;
    return '<svg viewBox="0 0 100 120" aria-hidden="true" focusable="false">' +
      '<rect x="22" y="6" width="56" height="14" rx="5" fill="var(--copper)" stroke="var(--art-line)" stroke-width="2.4"/>' +
      '<path d="M18 26 Q14 26 14 34 L14 104 Q14 114 26 114 L74 114 Q86 114 86 104 L86 34 Q86 26 82 26 Z" fill="color-mix(in srgb, var(--wash-sky) 35%, transparent)" stroke="var(--art-line)" stroke-width="2.6"/>' +
      '<clipPath id="sbjc"><path d="M16 30 L84 30 L84 104 Q84 112 74 112 L26 112 Q16 112 16 104 Z"/></clipPath>' +
      '<rect clip-path="url(#sbjc)" x="14" y="' + (112 - h).toFixed(1) + '" width="72" height="' + h.toFixed(1) + '" fill="var(--nougat)"/>' +
      '<path clip-path="url(#sbjc)" d="M14 ' + (112 - h).toFixed(1) + ' q9 -5 18 0 t18 0 t18 0 t18 0" fill="none" stroke="var(--wrapper)" stroke-width="3" opacity=".8"/>' +
      '<path d="M24 36 L24 96" stroke="var(--art-light)" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>';
  }
  var rewards = {
    count: function () { return get('sb:nougats', 0) | 0; },
    set: function (n) { put('sb:nougats', Math.max(0, n | 0)); rewards.paint(); emit('nougat', { count: rewards.count(), delta: 0 }); },
    paint: function () { var n = rewards.count(); $$('.sb-jar').forEach(function (j) { var c = $('.sb-jar__count', j); if (c) c.textContent = String(n); var g = $('svg', j); var cap = +(j.getAttribute('data-cap') || 30); if (g) g.outerHTML = jarSVG(n / cap); else j.insertAdjacentHTML('afterbegin', jarSVG(n / cap)); j.setAttribute('aria-label', n + ' nougat' + (n === 1 ? '' : 's') + ' in the jar'); }); },
    drop: function (n, opts) {
      n = Math.max(1, n | 0); opts = opts || {};
      var jar = opts.to || $('.sb-jar'), from = opts.from, fr = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: w.innerWidth / 2, top: w.innerHeight / 2, width: 0, height: 0 };
      var add = function () { put('sb:nougats', rewards.count() + 1); rewards.paint(); if (jar) { jar.classList.remove('is-bump'); void jar.offsetWidth; jar.classList.add('is-bump'); } sound.play('nougat'); haptic(12); emit('nougat', { count: rewards.count(), delta: 1, reason: opts.reason || '' }); };
      if (!jar || reduced()) { for (var i = 0; i < n; i++) add(); return; }
      var jr = jar.getBoundingClientRect();
      for (var k = 0; k < n; k++) (function (k) {
        var f = el('div', { 'class': 'sb-drop-flight', 'aria-hidden': 'true' }, '<span class="sb-nougat" style="--n:46px">' + nougatSVG(k + 3) + '</span>');
        d.body.appendChild(f);
        var x0 = fr.left + fr.width / 2 - 23, y0 = fr.top + fr.height / 2 - 14, x1 = jr.left + jr.width / 2 - 23, y1 = jr.top + jr.height * 0.45 - 14, lift = Math.min(220, Math.abs(y1 - y0) * 0.6 + 80);
        var dur = ms('dur-drop', 900), frames = [];
        for (var s = 0; s <= 12; s++) { var t = s / 12, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * lift; frames.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (t * 380).toFixed(0) + 'deg) scale(' + (1 - t * 0.35).toFixed(2) + ')' }); }
        var a = f.animate(frames, { duration: dur, delay: k * 140, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
        a.onfinish = function () { f.remove(); add(); };
      })(k);
    }
  };

  /* ---------- unlocks and stickers ---------- */
  var unlocks = {
    list: function () { return get('sb:unlocks', []); },
    has: function (id) { return unlocks.list().indexOf(id) >= 0; },
    unlock: function (id, opts) {
      opts = opts || {}; if (!id || unlocks.has(id)) return false;
      var l = unlocks.list(); l.push(id); put('sb:unlocks', l);
      unlocks.paint(id, true); sound.play('sticker'); haptic([10, 40, 18]);
      if (opts.toast !== false) toast('<span class="sb-nougat" style="--n:34px">' + nougatSVG(id.length) + '</span><span><b>' + esc(opts.name || id) + '</b> ' + esc(opts.line || 'is open now.') + '</span>', { ms: 3600 });
      emit('unlock', { id: id, name: opts.name || id }); return true;
    },
    lock: function (id) { put('sb:unlocks', unlocks.list().filter(function (x) { return x !== id; })); unlocks.paint(); },
    paint: function (just, animate) {
      $$('[data-sb-lock]').forEach(function (lk) {
        var id = lk.getAttribute('data-sb-lock'), open = unlocks.has(id);
        if (open && !lk.hidden) { if (animate && id === just && !reduced()) { lk.classList.add('is-opening'); setTimeout(function () { lk.hidden = true; lk.classList.remove('is-opening'); }, ms('dur-turn', 700)); } else lk.hidden = true; }
        if (!open) lk.hidden = false;
      });
      $$('[data-sb-sticker]').forEach(function (s) { var id = s.getAttribute('data-sb-sticker'), on = unlocks.has(id); s.classList.toggle('sb-sticker--locked', !on); if (on && id === just && animate) { s.classList.add('is-new'); } });
      $$('[data-sb-when]').forEach(function (x) { x.hidden = !unlocks.has(x.getAttribute('data-sb-when')); });
    }
  };

  /* ---------- toast ---------- */
  function toast(html, opts) {
    opts = opts || {}; $$('.sb-toast').forEach(function (t) { t.remove(); });
    var t = el('div', { 'class': 'sb-toast', role: 'status', 'aria-live': 'polite' }, html); d.body.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.ms || 3000); return t;
  }

  /* ---------- the brook: a meandering path with stepping stones ---------- */
  function brook(host, opts) {
    opts = opts || {}; if (!host) return null;
    var stones = opts.stones || [], seed = opts.seed || 5, api = { host: host, stones: stones };
    host.classList.add('sb-brook');
    function layout() {
      host.querySelectorAll('.sb-brook__svg, .sb-stone').forEach(function (x) { x.remove(); });
      var W = host.clientWidth || 600, H = host.clientHeight || 400, vertical = opts.direction ? opts.direction === 'down' : H > W * 0.9, r = rand(seed), n = Math.max(2, stones.length);
      var pts = [];
      for (var i = 0; i <= n + 1; i++) {
        var t = i / (n + 1);
        if (vertical) pts.push([W * (0.5 + (i % 2 ? 0.26 : -0.26) * (0.75 + r() * 0.35)), -40 + (H + 80) * t]);
        else pts.push([-40 + (W + 80) * t, H * (0.5 + (i % 2 ? 0.2 : -0.2) * (0.7 + r() * 0.4))]);
      }
      var dpath = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var j = 1; j < pts.length; j++) { var p0 = pts[j - 1], p1 = pts[j], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        dpath += vertical ? ' Q' + p0[0].toFixed(1) + ' ' + my.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' T' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1)
                          : ' Q' + mx.toFixed(1) + ' ' + p0[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' T' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); }
      var svg = d.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sb-brook__svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'none');
      svg.innerHTML = '<path class="sb-brook__wash" d="' + dpath + '"/><path class="sb-brook__deep" d="' + dpath + '"/><path class="sb-brook__glint" d="' + dpath + '"/><path class="sb-brook__trail" d="' + dpath + '"/>';
      host.insertBefore(svg, host.firstChild);
      var path = svg.querySelector('.sb-brook__trail'), L = path.getTotalLength(), cur = -1;
      stones.forEach(function (s, i) {
        var at = path.getPointAtLength(L * (i + 1) / (n + 1)), side = i % 2 ? 1 : -1;
        var b = el(s.href ? 'a' : 'button', { 'class': 'sb-stone', 'data-state': s.state || 'open', 'data-id': s.id || ('s' + i), style: '--x:' + at.x.toFixed(1) + 'px;--y:' + at.y.toFixed(1) + 'px', href: s.href || null, type: s.href ? null : 'button',
          'aria-label': (s.label || ('Stone ' + (i + 1))) + (s.state === 'locked' ? ', locked' : s.state === 'done' ? ', walked' : s.state === 'current' ? ', you are here' : ''), 'aria-disabled': s.state === 'locked' ? 'true' : null },
          s.state === 'locked' ? icon('lock', 20) : s.state === 'done' ? icon('check', 20) : '<span>' + esc(s.mark || String(i + 1)) + '</span>');
        if (s.label) b.insertAdjacentHTML('beforeend', '<span class="sb-stone__label" style="' + (vertical ? (side > 0 ? 'left:calc(100% + 14px);top:50%;translate:0 -50%' : 'left:auto;right:calc(100% + 14px);top:50%;translate:0 -50%;text-align:right') : '') + '">' + esc(s.label) + (s.sub ? '<small>' + esc(s.sub) + '</small>' : '') + '</span>');
        b.addEventListener('click', function (e) { if (s.state === 'locked') { e.preventDefault(); toast(esc(s.why || 'Walk the stones before this one first.'), { ms: 2600 }); return; } sound.play('stone'); if (opts.onStep) opts.onStep(s, i, e); emit('step', { id: s.id, index: i }); });
        host.appendChild(b); if (s.state === 'current' || s.state === 'done') cur = Math.max(cur, i);
      });
      if (cur >= 0) {
        var upto = L * (cur + 1) / (n + 1), pts2 = [];
        for (var q = 0; q <= 80; q++) { var pp = path.getPointAtLength(upto * q / 80); pts2.push(pp.x.toFixed(1) + ' ' + pp.y.toFixed(1)); }
        var walked = d.createElementNS(NS, 'path'); walked.setAttribute('class', 'sb-brook__walked'); walked.setAttribute('d', 'M' + pts2.join(' L')); svg.appendChild(walked);
      }
      api.path = dpath; api.length = L; api.vertical = vertical;
    }
    layout();
    api.set = function (id, state) { stones.forEach(function (s) { if (s.id === id) s.state = state; }); layout(); };
    api.layout = layout;
    if (w.ResizeObserver) { var last = 0; new ResizeObserver(function () { var now = host.clientWidth + 'x' + host.clientHeight; if (now !== last) { last = now; layout(); } }).observe(host); }
    return api;
  }

  /* ---------- the creature: bunny, tree octopus and butterfly pixie at once; it grows ---------- */
  var STAGES = ['egg', 'kit', 'bun', 'sprite', 'saelion'], hideN = 0;
  /* the chimera hide (hide: 'chimera'): a coat that is two animals at once, split down her middle like a chimera cat,
     warm on the left and cool on the right to match her eyes, with patches in the tag colors. CSS shows it on paper,
     turns the patches to ink blots in Ink Blot, and hides it in Knight Night, where she glows instead. */
  function hideBlob(x, y, rx, ry, rot, seed) {
    var n = 7, pts = [], d = '', k, a, r;
    for (k = 0; k < n; k++) { a = (k / n) * Math.PI * 2; r = 0.86 + 0.22 * Math.abs(Math.sin(seed * 12.9 + k * 4.1)); pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]); }
    var c = Math.cos(rot), s = Math.sin(rot), P = function (p) { return [x + p[0] * c - p[1] * s, y + p[0] * s + p[1] * c]; }, mid = function (p, q) { return P([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); };
    var m0 = mid(pts[n - 1], pts[0]); d = 'M' + m0[0].toFixed(1) + ' ' + m0[1].toFixed(1);
    for (k = 0; k < n; k++) { var p = P(pts[k]), m = mid(pts[k], pts[(k + 1) % n]); d += ' Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1); }
    return d + ' Z';
  }
  function hideLayer(shape, top, bot, spots) {
    var id = 'sbc-hide-' + (++hideN), h = bot - top, g = '<defs><clipPath id="' + id + '">' + shape + '</clipPath></defs><g class="sbc-hide" clip-path="url(#' + id + ')">';
    g += '<path class="sbc-fur-c" d="M100 ' + top + ' C95 ' + (top + h * 0.32).toFixed(1) + ' 105 ' + (top + h * 0.64).toFixed(1) + ' 100 ' + bot + ' L210 ' + bot + ' L210 ' + top + ' Z"/>';
    spots.forEach(function (p, i) { g += '<path class="sbc-patch sbc-patch--' + p[0] + '" style="animation-delay:-' + (i * 9) + 's" d="' + hideBlob(p[1], p[2], p[3], p[4], p[5], i + 1) + '"/>'; });
    return g + '</g>';
  }
  function creatureSVG(o) {
    var form = o.form || 'saelion', stage = Math.max(0, Math.min(4, o.stage == null ? 4 : o.stage)), mood = o.mood || 'happy', shut = !!o.shut, chim = o.hide === 'chimera';
    var ears = form === 'bunny' || (form === 'saelion' && stage >= 1), arms = form === 'octopus' ? 5 : form === 'saelion' ? [0, 0, 2, 3, 5][stage] : 0, wings = form === 'pixie' || (form === 'saelion' && stage >= 3);
    var sc = [0.62, 0.72, 0.86, 0.94, 1][stage], s = '', fw = chim ? ' sbc-fur-w' : '';
    s += '<ellipse class="sbc-shadow" cx="100" cy="178" rx="' + (54 * sc).toFixed(1) + '" ry="9"/>';
    if (stage === 0 && form === 'saelion') {
      var egg = 'M100 46 C140 46 152 104 152 128 C152 160 128 176 100 176 C72 176 48 160 48 128 C48 104 60 46 100 46 Z';
      return '<svg viewBox="0 0 200 200" role="img" aria-label="Saelion, still an egg">' + s +
        '<path class="sbc-body' + fw + '" d="' + egg + '"/>' +
        (chim ? hideLayer('<path d="' + egg + '"/>', 42, 180, [['w', 70, 82, 9, 7, 0.4], ['c', 134, 140, 10, 8, -0.3], ['w', 66, 150, 7, 9, 0.2]]) + '<path class="sbc-rim" d="' + egg + '"/>' : '') +
        '<circle cx="82" cy="96" r="7" class="sbc-ear-in' + (chim ? ' sbc-ear-in--w' : '') + '"/><circle cx="120" cy="120" r="9" class="sbc-ear-in' + (chim ? ' sbc-ear-in--c' : '') + '"/><circle cx="92" cy="146" r="6" class="sbc-ear-in' + (chim ? ' sbc-ear-in--w' : '') + '"/>' +
        '<path d="M70 116 l12 -8 l9 10 l11 -9 l10 9 l12 -8" fill="none" stroke="var(--art-line)" stroke-width="2.6" stroke-linejoin="round"/>' +
        '<path d="M80 64 Q86 58 94 58" stroke="var(--art-light)" stroke-width="5" stroke-linecap="round" fill="none"/></svg>';
    }
    var cx = 100, cy = 118, rx = 56 * sc, ry = 50 * sc;
    if (wings) {
      var wg = stage >= 4 || form === 'pixie' ? 1 : 0.7;
      s += '<g transform="translate(100 ' + (cy - 6) + ') scale(' + wg + ')">' +
        '<path class="sbc-wing" d="M-12 -6 C-60 -70 -112 -40 -86 -2 C-112 14 -70 50 -14 10 Z"/>' +
        '<path class="sbc-wing" d="M12 -6 C60 -70 112 -40 86 -2 C112 14 70 50 14 10 Z"/>' +
        '<circle cx="-62" cy="-26" r="7" fill="var(--wash-sun)" stroke="var(--art-line)" stroke-width="2"/><circle cx="62" cy="-26" r="7" fill="var(--wash-sun)" stroke="var(--art-line)" stroke-width="2"/></g>';
    }
    if (ears) {
      var eh = [0, 42, 54, 60, 64][stage] || 60;
      s += '<g><path class="sbc-body' + fw + '" d="M' + (cx - 26 * sc) + ' ' + (cy - ry + 10) + ' C' + (cx - 46 * sc) + ' ' + (cy - ry - eh) + ' ' + (cx - 14 * sc) + ' ' + (cy - ry - eh - 12) + ' ' + (cx - 8 * sc) + ' ' + (cy - ry + 4) + ' Z"/>' +
        '<path class="sbc-ear-in' + (chim ? ' sbc-ear-in--w' : '') + '" d="M' + (cx - 24 * sc) + ' ' + (cy - ry + 2) + ' C' + (cx - 36 * sc) + ' ' + (cy - ry - eh + 14) + ' ' + (cx - 18 * sc) + ' ' + (cy - ry - eh + 4) + ' ' + (cx - 14 * sc) + ' ' + (cy - ry + 2) + ' Z"/>' +
        '<path class="sbc-body' + (chim ? ' sbc-fur-c' : '') + '" d="M' + (cx + 26 * sc) + ' ' + (cy - ry + 10) + ' C' + (cx + 52 * sc) + ' ' + (cy - ry - eh + 6) + ' ' + (cx + 20 * sc) + ' ' + (cy - ry - eh - 6) + ' ' + (cx + 8 * sc) + ' ' + (cy - ry + 4) + ' Z"/>' +
        '<path class="sbc-ear-in' + (chim ? ' sbc-ear-in--c' : '') + '" d="M' + (cx + 24 * sc) + ' ' + (cy - ry + 2) + ' C' + (cx + 40 * sc) + ' ' + (cy - ry - eh + 18) + ' ' + (cx + 22 * sc) + ' ' + (cy - ry - eh + 8) + ' ' + (cx + 14 * sc) + ' ' + (cy - ry + 2) + ' Z"/></g>';
    }
    if (arms) {
      var a = '';
      for (var i = 0; i < arms; i++) {
        var t = arms === 1 ? 0.5 : i / (arms - 1), ax = cx - rx * 0.75 + rx * 1.5 * t, curl = (i % 2 ? 1 : -1) * (14 + 6 * (i % 3));
        var dd = 'M' + ax.toFixed(1) + ' ' + (cy + ry * 0.55).toFixed(1) + ' C' + (ax + curl * 0.3).toFixed(1) + ' ' + (cy + ry + 14).toFixed(1) + ' ' + (ax - curl).toFixed(1) + ' ' + (cy + ry + 22).toFixed(1) + ' ' + (ax - curl * 0.4).toFixed(1) + ' ' + (cy + ry + 34).toFixed(1) + ' q' + (curl * 0.5).toFixed(1) + ' 6 ' + (curl * 0.6).toFixed(1) + ' -4';
        a += '<path class="sbc-arm-line" d="' + dd + '" stroke-width="15"/><path class="sbc-arm" d="' + dd + '"/>';
      }
      s += '<g>' + a + '</g>';
    }
    var head = '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '"/>';
    s += '<ellipse class="sbc-body' + fw + '" cx="' + cx + '" cy="' + cy + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '"/>';
    if (chim) s += hideLayer(head, Math.round(cy - ry - 4), Math.round(cy + ry + 4), [
      ['w', cx - 0.42 * rx, cy - 0.62 * ry, 0.21 * rx, 0.17 * ry, 0.5], ['w', cx - 0.8 * rx, cy + 0.3 * ry, 0.16 * rx, 0.26 * ry, 0.35],
      ['c', cx + 0.8 * rx, cy - 0.24 * ry, 0.14 * rx, 0.25 * ry, -0.25], ['c', cx + 0.38 * rx, cy + 0.72 * ry, 0.25 * rx, 0.15 * ry, -0.15],
      ['w', cx - 0.2 * rx, cy + 0.84 * ry, 0.12 * rx, 0.1 * ry, 0]]) + head.replace('<ellipse ', '<ellipse class="sbc-rim" ');
    s += '<path d="M' + (cx - rx * 0.55).toFixed(1) + ' ' + (cy - ry * 0.55).toFixed(1) + ' Q' + (cx - rx * 0.35).toFixed(1) + ' ' + (cy - ry * 0.8).toFixed(1) + ' ' + (cx - rx * 0.05).toFixed(1) + ' ' + (cy - ry * 0.82).toFixed(1) + '" stroke="var(--art-light)" stroke-width="5" stroke-linecap="round" fill="none" opacity=".9"/>';
    var ey = cy - ry * 0.08, ex = rx * 0.38, er = Math.max(7, 10.5 * sc);
    if (shut || mood === 'sleepy') {
      s += '<path class="sbc-mouth" d="M' + (cx - ex - er) + ' ' + ey + ' q' + er + ' ' + (er * 0.8) + ' ' + (er * 2) + ' 0"/><path class="sbc-mouth" d="M' + (cx + ex - er) + ' ' + ey + ' q' + er + ' ' + (er * 0.8) + ' ' + (er * 2) + ' 0"/>';
    } else {
      s += '<circle class="sbc-eye-a" cx="' + (cx - ex) + '" cy="' + ey + '" r="' + er + '" stroke="var(--art-line)" stroke-width="2.5"/><circle class="sbc-pupil" cx="' + (cx - ex + 1) + '" cy="' + (ey + 1) + '" r="' + (er * 0.5) + '"/><circle class="sbc-glint" cx="' + (cx - ex - er * 0.3) + '" cy="' + (ey - er * 0.35) + '" r="' + (er * 0.26) + '"/>';
      s += '<circle class="sbc-eye-b" cx="' + (cx + ex) + '" cy="' + ey + '" r="' + er + '" stroke="var(--art-line)" stroke-width="2.5"/><circle class="sbc-pupil" cx="' + (cx + ex + 1) + '" cy="' + (ey + 1) + '" r="' + (er * 0.5) + '"/><circle class="sbc-glint" cx="' + (cx + ex - er * 0.3) + '" cy="' + (ey - er * 0.35) + '" r="' + (er * 0.26) + '"/>';
    }
    s += '<ellipse class="sbc-cheek" cx="' + (cx - ex - er * 0.6) + '" cy="' + (ey + er * 1.4) + '" rx="' + (er * 0.8) + '" ry="' + (er * 0.45) + '"/><ellipse class="sbc-cheek" cx="' + (cx + ex + er * 0.6) + '" cy="' + (ey + er * 1.4) + '" rx="' + (er * 0.8) + '" ry="' + (er * 0.45) + '"/>';
    var my = ey + er * 1.55;
    s += mood === 'surprised' ? '<ellipse class="sbc-mouth" cx="' + cx + '" cy="' + (my + 2) + '" rx="4" ry="5"/>' : '<path class="sbc-mouth" d="M' + (cx - 8) + ' ' + my + ' q4 5 8 0 q4 5 8 0"/>';
    if (form === 'saelion' && stage >= 4) {
      var st = '';
      [-30, 0, 30].forEach(function (dx, k) { var sx = cx + dx, sy = cy - ry - (ears ? 12 : 4) - (k === 1 ? 10 : 0), R = k === 1 ? 9 : 7, pts = '';
        for (var q = 0; q < 10; q++) { var ang = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? R * 0.45 : R; pts += (sx + Math.cos(ang) * rr).toFixed(1) + ',' + (sy + Math.sin(ang) * rr).toFixed(1) + ' '; }
        st += '<polygon class="sbc-star" points="' + pts.trim() + '"/>'; });
      s += st;
    }
    var label = 'Saelion as a ' + (form === 'saelion' ? STAGES[stage] : form) + (mood === 'sleepy' ? ', asleep' : '');
    return '<svg viewBox="0 0 200 200" role="img" aria-label="' + esc(o.label || label) + '">' + s + '</svg>';
  }
  function creature(host, opts) {
    if (!host) return null; var o = Object.assign({ form: 'saelion', stage: 4, mood: 'happy', blink: true }, opts || {});
    host.classList.add('sb-creature'); if (o.idle !== false) host.classList.add('is-idle');
    function paint(shut) { host.innerHTML = creatureSVG(Object.assign({}, o, { shut: shut })); }
    paint(false);
    var timer = 0;
    function blink() { if (reduced() || o.mood === 'sleepy' || !o.blink) return; paint(true); setTimeout(function () { paint(false); }, ms('dur-wink', 150)); timer = setTimeout(blink, 2600 + Math.random() * 2600); }
    timer = setTimeout(blink, 1800);
    return { set: function (n) { Object.assign(o, n || {}); paint(false); emit('creature', { form: o.form, stage: o.stage }); }, get: function () { return Object.assign({}, o); }, stop: function () { clearTimeout(timer); }, stages: STAGES.slice() };
  }

  /* ---------- page turns ---------- */
  function spread(host) {
    if (!host || host.__sb) return null; host.__sb = true;
    var pages = $$(':scope > .sb-page', host), i = 0;
    function wide() { return w.matchMedia('(min-width: 1024px)').matches; }
    function show() {
      var step = wide() ? 2 : 1; pages.forEach(function (p, k) { var on = k >= i && k < i + step; p.hidden = !on; p.classList.toggle('sb-page--left', wide() && k === i); p.classList.toggle('sb-page--right', wide() && k === i + 1); });
      host.style.setProperty('--sb-left-display', 'block');
      emit('page', { index: i, count: pages.length });
    }
    function go(dir) {
      var step = wide() ? 2 : 1, ni = Math.max(0, Math.min(pages.length - 1, i + dir * step)); if (ni === i) return;
      if (!reduced() && host.animate) {
        var leaf = el('div', { 'class': 'sb-leaf', 'aria-hidden': 'true' }, '<div></div><div class="sb-leaf__back"></div>');
        if (dir < 0) { leaf.style.left = wide() ? '0' : '0'; leaf.style.right = 'auto'; leaf.style.transformOrigin = 'right center'; }
        if (!wide()) { leaf.style.width = '100%'; }
        host.appendChild(leaf);
        var a = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(' + (dir > 0 ? -180 : 180) + 'deg)' }], { duration: ms('dur-turn', 700), easing: 'cubic-bezier(.45,.05,.25,1)' });
        setTimeout(function () { i = ni; show(); }, ms('dur-turn', 700) * 0.5);
        a.onfinish = function () { leaf.remove(); };
      } else { i = ni; show(); }
      sound.play('page');
    }
    host.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(1); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(-1); e.preventDefault(); } });
    var sx = null; host.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    host.addEventListener('pointerup', function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    var prev = el('button', { 'class': 'sb-spread__turn sb-spread__turn--prev', type: 'button', 'aria-label': 'Previous page' }), next = el('button', { 'class': 'sb-spread__turn sb-spread__turn--next', type: 'button', 'aria-label': 'Next page' });
    prev.addEventListener('click', function () { go(-1); }); next.addEventListener('click', function () { go(1); });
    host.appendChild(prev); host.appendChild(next); if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
    w.addEventListener('resize', show); show();
    return { next: function () { go(1); }, prev: function () { go(-1); }, index: function () { return i; }, count: pages.length };
  }

  /* ---------- fold: the old view folds away like paper, the new one is underneath ---------- */
  function fold(host, swap) {
    if (!host) return Promise.resolve();
    if (reduced() || !host.animate) { if (swap) swap(); return Promise.resolve(); }
    var r = host.getBoundingClientRect(), h = r.height, snap = host.cloneNode(true);
    snap.removeAttribute('id'); $$('[id]', snap).forEach(function (x) { x.removeAttribute('id'); });
    var cs = getComputedStyle(host); if (cs.position === 'static') host.style.position = 'relative';
    function half(top) {
      var hh = el('div', { 'class': 'sb-fold-half ' + (top ? 'sb-fold-half--top' : 'sb-fold-half--bottom'), 'aria-hidden': 'true' });
      hh.style.height = (h / 2) + 'px'; hh.style.background = 'var(--page)';
      var inner = snap.cloneNode(true); inner.style.position = 'absolute'; inner.style.left = '0'; inner.style.right = '0'; inner.style.height = h + 'px'; inner.style.margin = '0'; inner.style.top = top ? '0' : (-h / 2) + 'px';
      hh.appendChild(inner); return hh;
    }
    var top = half(true), bot = half(false), crease = el('div', { 'class': 'sb-fold-crease', 'aria-hidden': 'true' });
    host.classList.add('sb-fold-host'); if (swap) swap(); host.appendChild(top); host.appendChild(bot); host.appendChild(crease);
    var dur = ms('dur-turn', 700);
    var a1 = top.animate([{ transform: 'rotateX(0deg)', filter: 'brightness(1)' }, { transform: 'rotateX(-180deg)', filter: 'brightness(0.8)' }], { duration: dur * 0.6, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    return new Promise(function (res) {
      a1.onfinish = function () {
        top.remove();
        var a2 = bot.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'translateY(30px) scale(0.6) rotate(-6deg)', opacity: 0 }], { duration: dur * 0.5, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
        a2.onfinish = function () { bot.remove(); crease.remove(); res(); };
      };
      sound.play('page');
    });
  }

  /* ---------- blot: an ink blot opens to show what is under it ---------- */
  var BLOT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 6c9 0 12 9 20 9s15-6 19 2-3 14 1 21 11 10 6 18-14 3-17 11 3 17-6 22-14-4-23-4-16 9-23 3 0-15-5-21-15-6-17-15 9-12 9-20-9-14-3-20 15 3 21-2 9-8 18-8z'/%3E%3C/svg%3E\")";
  function blot(host, opts) {
    opts = opts || {}; if (!host) return Promise.resolve();
    if (reduced() || !host.animate) { host.style.visibility = 'visible'; return Promise.resolve(); }
    host.classList.add('sb-blot'); host.style.setProperty('--sb-blot-mask', BLOT);
    var a = host.animate([{ maskSize: '0% 0%', webkitMaskSize: '0% 0%' }, { maskSize: '320% 320%', webkitMaskSize: '320% 320%' }], { duration: opts.duration || ms('dur-bleed', 1600), easing: 'cubic-bezier(.2,.9,.3,1)' });
    return new Promise(function (res) { a.onfinish = function () { host.classList.remove('sb-blot'); res(); }; });
  }

  /* ---------- drawer and dialog ---------- */
  var drawer = {
    open: function (dr) {
      if (typeof dr === 'string') dr = $(dr); if (!dr) return;
      var veil = dr.__veil || (dr.__veil = el('div', { 'class': 'sb-drawer__veil' })); if (!veil.parentNode) { d.body.appendChild(veil); veil.addEventListener('click', function () { drawer.close(dr); }); }
      dr.__back = d.activeElement; dr.classList.add('is-open'); veil.classList.add('is-open'); dr.setAttribute('aria-hidden', 'false');
      var f = $(FOCUSABLE, dr); if (f) setTimeout(function () { f.focus(); }, 30);
      dr.__trap = function (e) { if (e.key === 'Escape') { drawer.close(dr); } if (e.key === 'Tab') { var fs = $$(FOCUSABLE, dr); if (!fs.length) return; var a = fs[0], z = fs[fs.length - 1]; if (e.shiftKey && d.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && d.activeElement === z) { a.focus(); e.preventDefault(); } } };
      d.addEventListener('keydown', dr.__trap); emit('drawer', { open: true, id: dr.id });
    },
    close: function (dr) {
      if (typeof dr === 'string') dr = $(dr); if (!dr) return;
      dr.classList.remove('is-open'); dr.setAttribute('aria-hidden', 'true'); if (dr.__veil) dr.__veil.classList.remove('is-open');
      if (dr.__trap) d.removeEventListener('keydown', dr.__trap); if (dr.__back && dr.__back.focus) dr.__back.focus(); emit('drawer', { open: false, id: dr.id });
    }
  };
  var dialog = {
    open: function (dl) { if (typeof dl === 'string') dl = $(dl); if (!dl) return; if (dl.showModal) { if (!dl.open) dl.showModal(); } else dl.setAttribute('open', ''); emit('dialog', { open: true, id: dl.id }); },
    close: function (dl) { if (typeof dl === 'string') dl = $(dl); if (!dl) return; if (dl.close) dl.close(); else dl.removeAttribute('open'); emit('dialog', { open: false, id: dl.id }); }
  };

  /* ---------- sound: small paper noises, off until asked for ---------- */
  var sound = {
    ctx: null, on: get('sb:sound', false, SS),
    enable: function (v) { sound.on = v !== false; put('sb:sound', sound.on, SS); if (sound.on && !sound.ctx) { try { sound.ctx = new (w.AudioContext || w.webkitAudioContext)(); } catch (e) { sound.on = false; } } emit('sound', { on: sound.on }); return sound.on; },
    play: function (kind) {
      if (!sound.on) return; if (!sound.ctx) sound.enable(true); var ac = sound.ctx; if (!ac) return; if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
      function tone(f, dur, type, vol, at) { var o = ac.createOscillator(), gg = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; gg.gain.setValueAtTime(0, t + (at || 0)); gg.gain.linearRampToValueAtTime(vol, t + (at || 0) + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + dur); o.connect(gg); gg.connect(g); o.start(t + (at || 0)); o.stop(t + (at || 0) + dur + 0.05); }
      function noise(dur, vol, hp) { var n = ac.createBuffer(1, Math.max(1, (ac.sampleRate * dur) | 0), ac.sampleRate), ch = n.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length); var s = ac.createBufferSource(), f = ac.createBiquadFilter(), gg = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp || 1800; gg.gain.value = vol; s.buffer = n; s.connect(f); f.connect(gg); gg.connect(g); s.start(t); }
      if (kind === 'stone') { tone(523.25, 0.22, 'sine', 0.12); tone(784.0, 0.3, 'sine', 0.06, 0.04); }
      else if (kind === 'nougat') { noise(0.09, 0.12, 2600); tone(1046.5, 0.18, 'triangle', 0.05, 0.03); }
      else if (kind === 'sticker') { noise(0.22, 0.08, 1200); tone(659.25, 0.25, 'sine', 0.07, 0.1); tone(987.77, 0.3, 'sine', 0.05, 0.18); }
      else if (kind === 'page') { noise(0.28, 0.1, 900); }
    }
  };
  function haptic(p) { try { if (navigator.vibrate && !reduced()) navigator.vibrate(p); } catch (e) { /* no vibration */ } }

  /* ---------- icons: drawn with a pen, rounded ends ---------- */
  var ICONS = {
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>', voice: '<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M15 9c1.4 1.6 1.4 4.4 0 6M17.6 6.6c2.8 3 2.8 7.8 0 10.8"/>',
    book: '<path d="M3.5 6c3-1.5 6-1.2 8.5.8v12c-2.5-2-5.5-2.3-8.5-.8zM20.5 6c-3-1.5-6-1.2-8.5.8v12c2.5-2 5.5-2.3 8.5-.8z"/>',
    next: '<path d="M9 5.5l7 6.5-7 6.5"/>', prev: '<path d="M15 5.5L8 12l7 6.5"/>', up: '<path d="M5.5 15L12 8l6.5 7"/>', down: '<path d="M5.5 9L12 16l6.5-7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', menu: '<path d="M4 7h16M4 12h16M4 17h11"/>', home: '<path d="M4 11.5L12 5l8 6.5M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/>',
    key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>', sparkle: '<path d="M12 3.5c.8 4 2.5 5.7 6.5 6.5-4 .8-5.7 2.5-6.5 6.5-.8-4-2.5-5.7-6.5-6.5 4-.8 5.7-2.5 6.5-6.5zM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/>',
    nougat: '<rect x="6.5" y="8.5" width="11" height="7" rx="2"/><path d="M6.5 12L3 9v6zM17.5 12L21 9v6z"/><circle cx="10" cy="11.5" r=".9" fill="currentColor"/><circle cx="13.5" cy="13" r=".9" fill="currentColor"/>',
    jar: '<path d="M8 4.5h8M7.5 7h9c1 0 1.5.6 1.5 1.5v9.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8.5C6 7.6 6.5 7 7.5 7z"/><path d="M6 13c2-1.2 4-1.2 6 0s4 1.2 6 0"/>',
    sticker: '<path d="M5 5.5h14v8.5L13.5 19.5H5z"/><path d="M13.5 19.5v-5.5H19"/>', stone: '<path d="M4.5 15c0-4 3.5-7.5 8-7.5s7 3 7 6.5-3 4.5-7.5 4.5-7.5-.5-7.5-3.5z"/><path d="M8 11.5c1.2-1.2 3-1.8 5-1.6"/>',
    brook: '<path d="M7 3.5c-3 4 3 5 0 8.5s3 5 0 8.5M14 3.5c-3 4 3 5 0 8.5s3 5 0 8.5"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>', ink: '<path d="M12 3.5c3 4.5 5.5 7.6 5.5 10.6a5.5 5.5 0 0 1-11 0c0-3 2.5-6.1 5.5-10.6z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    comix: '<path d="M4 6.5c0-1.4 1.1-2.5 2.5-2.5h11c1.4 0 2.5 1.1 2.5 2.5v6c0 1.4-1.1 2.5-2.5 2.5H11l-4.5 4v-4h0c-1.4 0-2.5-1.1-2.5-2.5z"/><path d="M8.5 9.5h7"/>',
    origami: '<path d="M3.5 14l8-9 3 6.5 6-2.5-4 9.5H7z"/><path d="M11.5 5L10 18.5M14.5 11.5L16.5 18.5"/>', skein: '<circle cx="12" cy="12" r="7.5"/><path d="M6 9c4 1 8 4 10 9M5 13.5c4 0 8 2 9.5 5M9 5c2 3 6 5 10.5 5"/>',
    gamepad: '<path d="M7 8.5h10a4 4 0 0 1 4 4.4l-.4 3a2.5 2.5 0 0 1-4.3 1.3L14.5 15h-5l-1.8 2.2a2.5 2.5 0 0 1-4.3-1.3l-.4-3A4 4 0 0 1 7 8.5z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".9" fill="currentColor"/><circle cx="17" cy="13.5" r=".9" fill="currentColor"/>',
    tv: '<rect x="3.5" y="5.5" width="17" height="11" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>', tap: '<path d="M10 11V5.5a1.5 1.5 0 0 1 3 0V11l3.3.7a2 2 0 0 1 1.6 2.2l-.6 4.6a2 2 0 0 1-2 1.7H11a2 2 0 0 1-1.6-.8L6.5 15.5a1.6 1.6 0 0 1 2.4-2.1L10 14.5"/>',
    drag: '<path d="M12 3.5v17M3.5 12h17M12 3.5L9.5 6M12 3.5L14.5 6M12 20.5L9.5 18M12 20.5L14.5 18M3.5 12L6 9.5M3.5 12L6 14.5M20.5 12L18 9.5M20.5 12L18 14.5"/>',
    hum: '<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6"/>', heart: '<path d="M12 19.5s-7-4.3-7-9.4A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z"/>',
    map: '<path d="M4 6.5l5-2 6 2 5-2v13l-5 2-6-2-5 2z"/><path d="M9 4.5v13M15 6.5v13"/>', gift: '<rect x="4.5" y="9.5" width="15" height="10" rx="1.5"/><path d="M3.5 7h17v2.5h-17zM12 7v12.5M12 7c-1.5-3-5-3-4.5-.5.3 1.4 2.7.5 4.5.5zM12 7c1.5-3 5-3 4.5-.5-.3 1.4-2.7.5-4.5.5z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19c4-4 7-7 9.5-9.5"/>', eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>', alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17v.4"/>',
    music: '<path d="M9 18V6.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>', egg: '<path d="M12 3.5c3.5 0 6 6 6 10a6 6 0 0 1-12 0c0-4 2.5-10 6-10z"/><path d="M8 13.5l2-1.5 2 2 2-2 2 1.5"/>',
    bunny: '<path d="M9 9c-1.5-4-1-6.5.5-6.5S11 5 11 8.5M15 9c1.5-4 1-6.5-.5-6.5S13 5 13 8.5"/><ellipse cx="12" cy="14" rx="6.5" ry="5.5"/><circle cx="9.8" cy="13.5" r=".9" fill="currentColor"/><circle cx="14.2" cy="13.5" r=".9" fill="currentColor"/>',
    look: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'
  };
  function icon(name, size) { var p = ICONS[name]; if (!p) return ''; size = size || 24; return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>'; }
  function mountIcons(root) { $$('[data-sb-icon]', root).forEach(function (x) { if (x.__sbi) return; x.__sbi = true; x.innerHTML = icon(x.getAttribute('data-sb-icon'), +(x.getAttribute('data-size') || 24)); }); }

  /* ---------- bind data attributes ---------- */
  function init(opts) {
    opts = opts || {}; ensureDefs(); theme.init(opts); density.init(); mountIcons();
    d.documentElement.classList.add('sb-root'); if (d.body) { d.body.classList.remove('sb-no-js'); }
    $$('[data-sb-look]').forEach(function (b) { if (b.__sb) return; b.__sb = true; b.setAttribute('aria-pressed', String(b.getAttribute('data-sb-look') === theme.get())); b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') === 'true') { toast(esc(b.getAttribute('data-sb-why') || 'This look is still locked.'), { ms: 2600 }); return; } theme.set(b.getAttribute('data-sb-look')); }); });
    $$('.sb-reader').forEach(function (bar) { read.bind(bar); });
    $$('[data-sb-brook]').forEach(function (h) { if (h.__sbb) return; h.__sbb = true; var cfg = {}; try { cfg = JSON.parse(h.getAttribute('data-sb-brook') || '{}'); } catch (e) { cfg = {}; } h.__brook = brook(h, cfg); });
    $$('[data-sb-creature]').forEach(function (h) { if (h.__sbc) return; h.__sbc = true; var cfg = {}; try { cfg = JSON.parse(h.getAttribute('data-sb-creature') || '{}'); } catch (e) { cfg = {}; } h.__creature = creature(h, cfg); });
    $$('[data-sb-spread]').forEach(function (h) { h.__spread = spread(h); });
    $$('[data-sb-open]').forEach(function (b) { if (b.__sbo) return; b.__sbo = true; b.addEventListener('click', function (e) { var t = $(b.getAttribute('data-sb-open')); if (!t) return; e.preventDefault(); if (t.tagName === 'DIALOG') dialog.open(t); else drawer.open(t); }); });
    $$('[data-sb-close]').forEach(function (b) { if (b.__sbx) return; b.__sbx = true; b.addEventListener('click', function () { var dl = b.closest('dialog'); if (dl) dialog.close(dl); var dr = b.closest('.sb-drawer'); if (dr) drawer.close(dr); }); });
    $$('[data-sb-drop]').forEach(function (b) { if (b.__sbd) return; b.__sbd = true; b.addEventListener('click', function () { rewards.drop(+(b.getAttribute('data-sb-drop') || 1), { from: b, reason: b.getAttribute('data-sb-reason') || '' }); }); });
    $$('[data-sb-unlock]').forEach(function (b) { if (b.__sbu) return; b.__sbu = true; b.addEventListener('click', function () { unlocks.unlock(b.getAttribute('data-sb-unlock'), { name: b.getAttribute('data-sb-name') || '' }); }); });
    $$('[data-sb-sound]').forEach(function (b) { if (b.__sbs) return; b.__sbs = true; b.setAttribute('aria-pressed', String(sound.on)); b.addEventListener('click', function () { sound.enable(!sound.on); b.setAttribute('aria-pressed', String(sound.on)); }); });
    $$('.sb-jar').forEach(function (j) { if (!$('.sb-jar__count', j)) j.insertAdjacentHTML('beforeend', '<span class="sb-jar__count"></span>'); });
    $$('[data-sb-nougat]').forEach(function (x) { if (!x.__sbn) { x.__sbn = true; x.innerHTML = nougatSVG(+(x.getAttribute('data-sb-nougat') || 7)); } });
    rewards.paint(); unlocks.paint();
    emit('ready', { version: VERSION, theme: theme.get(), density: density.get() });
    return API;
  }

  var API = { version: VERSION, init: init, theme: theme, density: density, nav: nav, read: read, rewards: rewards, unlocks: unlocks, unlock: function (id, o) { return unlocks.unlock(id, o); },
    brook: brook, creature: creature, creatureSVG: creatureSVG, spread: spread, fold: fold, blot: blot, drawer: drawer, dialog: dialog, toast: toast, sound: sound, haptic: haptic,
    icon: icon, icons: Object.keys(ICONS), mountIcons: mountIcons, nougatSVG: nougatSVG, jarSVG: jarSVG, token: token, reducedMotion: reduced, ensureDefs: ensureDefs };
  w.Storeybrook = API;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', ensureDefs); else ensureDefs();
})(window, document);
