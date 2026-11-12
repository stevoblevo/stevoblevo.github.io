/* Cockpit 1.1.0 — ?dreamwalk=1 / ?autoplay=1 walks the main path across the first three live doors. */
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

  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* ignore */ }
  var dwell = reduced ? 400 : 2200;
  var stopped = false;
  var timer = 0;
  var index = 0;

  function liveDoors() {
    var all = window.__anewDoors || [];
    return all.filter(function (d) { return d && d.live; }).slice(0, 3);
  }

  function paintNote(text) {
    var note = document.getElementById("door-note");
    if (note) note.textContent = text;
  }

  function show(i) {
    var doors = liveDoors();
    if (!doors.length) return;
    var d = doors[i % doors.length];
    var bar = document.getElementById("doors");
    if (!bar) return;
    var buttons = bar.querySelectorAll(".door");
    buttons.forEach(function (el) {
      el.classList.toggle("on", el.getAttribute("data-door") === d.id);
    });
    paintNote("Dreamwalk · " + d.title + " — " + d.line + " (touch, click, or a key takes the reins)");
    if (window.__setLibraryFilter) {
      var map = { peachfall: "peachfall", goober: "all", andso: "all" };
      window.__setLibraryFilter(map[d.id] || "all");
    }
    if (!reduced) {
      var active = bar.querySelector('.door[data-door="' + d.id + '"]');
      if (active && typeof active.scrollIntoView === "function") {
        try { active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }
        catch (e) { active.scrollIntoView(false); }
      }
    }
  }

  function stop(e) {
    if (stopped) return;
    if (e && e.isTrusted === false) return;
    stopped = true;
    if (timer) { clearTimeout(timer); timer = 0; }
    document.removeEventListener("pointerdown", stop, true);
    document.removeEventListener("keydown", stop, true);
    document.removeEventListener("touchstart", stop, true);
    document.removeEventListener("wheel", stop, true);
    var doors = liveDoors();
    var d = doors.length ? doors[(index + doors.length - 1) % doors.length] : null;
    paintNote(d
      ? "Dreamwalk paused at " + d.title + ". Open a door when you are ready."
      : "Dreamwalk paused. Open a door when you are ready.");
  }

  function step() {
    if (stopped) return;
    var doors = liveDoors();
    if (!doors.length) return;
    show(index);
    index = (index + 1) % doors.length;
    timer = setTimeout(step, dwell);
  }

  function start() {
    var bar = document.getElementById("doors");
    if (!bar || !bar.querySelector(".door")) {
      setTimeout(start, 50);
      return;
    }
    document.addEventListener("pointerdown", stop, true);
    document.addEventListener("keydown", stop, true);
    document.addEventListener("touchstart", stop, { capture: true, passive: true });
    document.addEventListener("wheel", stop, { capture: true, passive: true });
    paintNote("Dreamwalk · the main path across three live doors. Touch, click, or a key takes the reins.");
    var kick = reduced ? 200 : 600;
    timer = setTimeout(step, kick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
