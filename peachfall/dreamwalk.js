/* Peachfall 1.1.0 — ?dreamwalk=1 / ?autoplay=1 hook for the published Pages bundle.
   Does not rewrite the hashed game module (Goober CI pins main-BPeuWIE_.js). */
(function () {
  function dreamwalkQuery() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.has("dreamwalk")) {
        var v = q.get("dreamwalk");
        if (v === null || v === "" || v === "1" || String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes") {
          return true;
        }
      }
      if (q.get("autoplay") === "1") return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  if (!dreamwalkQuery()) return;

  var cancelled = false;
  var watching = false;
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* ignore */ }

  function isChrome(target) {
    return !!(target && target.closest && target.closest(".controls, #title-doors, #volume, .vol, a, #btn-mute, #btn-motion, #btn-reset"));
  }

  function yieldToPlay(e) {
    if (!e || e.isTrusted === false) return;
    if (isChrome(e.target)) return;
    if (cancelled && !watching) return;
    if (!watching) {
      cancelled = true;
      return;
    }
    var api = window.__PEACHFALL__;
    if (!api || typeof api.getState !== "function" || typeof api.dispatch !== "function") return;
    var s = api.getState();
    if (!s || s.mode !== "watch") return;
    watching = false;
    var next = Object.assign({}, s, { mode: "play" });
    api.dispatch(s, { type: "HYDRATE", state: next });
    document.removeEventListener("pointerdown", yieldToPlay, true);
    document.removeEventListener("keydown", yieldToPlay, true);
    document.removeEventListener("touchstart", yieldToPlay, true);
  }

  document.addEventListener("pointerdown", yieldToPlay, true);
  document.addEventListener("keydown", yieldToPlay, true);
  document.addEventListener("touchstart", yieldToPlay, { capture: true, passive: true });

  function whenReady(fn) {
    var start = performance.now();
    (function tick() {
      if (document.getElementById("watch-dream") && window.__PEACHFALL__) return fn();
      if (performance.now() - start > 8000) return;
      requestAnimationFrame(tick);
    })();
  }

  whenReady(function () {
    // Title beat so PLAY / WATCH / Gallery are visible before the walk.
    var delay = reduced ? 200 : 1500;
    setTimeout(function () {
      if (cancelled) return;
      var btn = document.getElementById("watch-dream");
      if (!btn) return;
      watching = true;
      btn.click();
    }, delay);
  });
})();
