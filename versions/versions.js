/* The version toggle for builds kept on stevoblevo.github.io. One line in a page adds it:
     <script src="/versions/versions.js" data-versions="/and-so/versions.json" data-current="6.1" defer></script>
   It draws a small pill in a corner ("AND SO 6.1"); pressing it lists every version with the current one ticked,
   and choosing one goes there. It stays out of frames (AND SO's mirror) and out of print, needs no other file,
   and never touches the page's own storage, keys or styles (everything lives in its own shadow root). */
(function () {
  'use strict';
  var me = document.currentScript; if (!me) return;
  try { if (window.top !== window.self || /^andso-mirror:/.test(window.name || '')) return; } catch (e) { return; }
  var src = me.getAttribute('data-versions'), cur = me.getAttribute('data-current') || '', corner = me.getAttribute('data-corner') || 'bl';
  if (!src) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function date(d) { try { var t = new Date(d + 'T12:00:00Z'); return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } }
  function build(data) {
    var list = (data && data.versions) || []; if (!list.length) return;
    var here = list.filter(function (v) { return v.id === cur; })[0];
    var host = document.createElement('div'); host.setAttribute('data-version-toggle', '');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var pos = { bl: 'left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom))', br: 'right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))',
      tl: 'left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top))', tr: 'right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top))' }[corner] || '';
    var up = corner.charAt(0) === 'b';
    var items = list.map(function (v) {
      var on = v.id === cur;
      return '<li><a href="' + esc(v.latest && data.latest ? data.latest : v.path) + '"' + (on ? ' aria-current="page"' : '') + '><span class="n">' + esc(v.name) + (v.latest ? ' <i>latest</i>' : '') + (v.edition ? ' <i>edition</i>' : '') + '</span>' +
        '<span class="d">' + esc(date(v.date)) + (v.line ? ' · ' + esc(v.line) : '') + '</span></a></li>';
    }).join('');
    root.innerHTML = '<style>' +
      ':host{all:initial}' +
      '.w{position:fixed;' + pos + ';z-index:2147483000;font:500 14px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f6f2ea}' +
      'button{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 14px 0 12px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(18,20,28,.74);color:inherit;font:inherit;cursor:pointer;' +
      '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.82;transition:opacity .2s}' +
      'button:hover,button:focus-visible,button[aria-expanded="true"]{opacity:1}button:focus-visible,a:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}' +
      'svg{width:16px;height:16px;flex:none}' +
      '.p{position:absolute;' + (up ? 'bottom:44px' : 'top:44px') + ';' + (corner.charAt(1) === 'l' ? 'left:0' : 'right:0') + ';width:min(380px,calc(100vw - 24px));max-height:min(70vh,520px);overflow:auto;padding:8px;border-radius:16px;' +
      'background:rgba(18,20,28,.94);border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 40px rgba(0,0,0,.4)}' +
      '.p[hidden]{display:none}.h{margin:6px 10px 8px;font-weight:700;font-size:13px;color:#cfc6b8}' +
      'ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}' +
      'a{display:grid;gap:2px;padding:9px 10px;border-radius:10px;color:#f6f2ea;text-decoration:none}a:hover{background:rgba(255,255,255,.08)}' +
      'a[aria-current="page"]{background:rgba(255,210,122,.14);box-shadow:inset 3px 0 0 #ffd27a}' +
      '.n{font-weight:700}.n i{font-style:normal;font-weight:600;font-size:11px;margin-left:6px;padding:1px 6px;border-radius:999px;background:rgba(255,255,255,.14);color:#ffd27a}' +
      '.d{color:#cfc6b8;font-size:12.5px}.all{display:block;margin:6px 10px 4px;color:#9fd8ff;font-size:13px}' +
      (up ? '@media (max-width:640px){.w{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 72px)}}' : '') +   // phones keep a dock along the bottom
      '@media print{.w{display:none}}@media (prefers-reduced-motion:reduce){button{transition:none}}' +
      '</style><div class="w"><button type="button" aria-expanded="false" aria-haspopup="true" title="Other versions">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>' +
      '<span>' + esc(here ? (here.short || here.name) : 'Versions') + '</span></button>' +
      '<div class="p" hidden role="group" aria-label="Versions of ' + esc(data.game || 'this game') + '"><p class="h">' + esc(data.game || '') + ' · every version stays playable</p><ul>' + items + '</ul>' +
      (data.index ? '<a class="all" href="' + esc(data.index) + '">All versions, with notes</a>' : '') + '</div></div>';
    var btn = root.querySelector('button'), pan = root.querySelector('.p');
    function open(on) { pan.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) { var a = pan.querySelector('[aria-current]') || pan.querySelector('a'); if (a) a.focus(); } }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(pan.hidden); });
    pan.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); open(false); btn.focus(); } });
    ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click', 'wheel'].forEach(function (t) { host.addEventListener(t, function (e) { e.stopPropagation(); }); });
    document.addEventListener('pointerdown', function (e) { if (!pan.hidden && !host.contains(e.target)) open(false); }, true);
    (document.body || document.documentElement).appendChild(host);
  }
  fetch(src, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(build).catch(function () { /* no list, no toggle */ });
})();
