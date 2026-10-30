/* Full screen on desktop. On iOS Safari the Fullscreen API is missing, so the page
   fills the visual viewport and the status-bar meta asks for standalone chrome. */
(function () {
  if (document.getElementById('andso-fs')) return;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  function meta(name, content) {
    if (document.querySelector('meta[name="' + name + '"]')) return;
    var el = document.createElement('meta');
    el.name = name;
    el.content = content;
    document.head.appendChild(el);
  }
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  var css = document.createElement('style');
  css.textContent = '#andso-fs{position:fixed;z-index:100000;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));min-width:44px;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(28,20,14,.4);background:rgba(255,252,246,.94);color:#1c140e;font:600 14px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation}'
    + (reduce ? '' : '')
    + 'html.andso-ios-fs,html.andso-ios-fs body{height:100%;height:100dvh}'
    + 'html.andso-ios-fs body{position:fixed;inset:0;width:100%;max-width:100%;overflow:hidden}'
    + '@media (prefers-reduced-motion: reduce){#andso-fs{transition:none;animation:none}}';
  document.head.appendChild(css);
  var btn = document.createElement('button');
  btn.id = 'andso-fs';
  btn.type = 'button';
  btn.textContent = 'Full screen';
  btn.setAttribute('aria-pressed', 'false');
  function on() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement) || document.documentElement.classList.contains('andso-ios-fs');
  }
  function sync() {
    var active = on();
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.textContent = active ? 'Exit full screen' : 'Full screen';
  }
  function cssOn() {
    document.documentElement.classList.add('andso-ios-fs');
    try { window.scrollTo(0, 1); } catch (e) { /* no scroll */ }
    sync();
  }
  function cssOff() {
    document.documentElement.classList.remove('andso-ios-fs');
    sync();
  }
  function enter() {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!ios && req) {
      try {
        var pending = req.call(el);
        if (pending && pending.catch) pending.catch(cssOn);
        else sync();
      } catch (e) { cssOn(); }
    } else cssOn();
  }
  function exit() {
    var ex = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && ex) {
      try { ex.call(document); } catch (e) { /* already out */ }
    }
    cssOff();
  }
  btn.addEventListener('click', function () { if (on()) exit(); else enter(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') exit(); });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  document.body.appendChild(btn);
})();
