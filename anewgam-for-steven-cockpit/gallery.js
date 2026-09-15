/* Yandex-style wall viewer. Uses window.__libraryItems. Does not own door hashes. */
(function () {
  const items = () => window.__libraryItems || [];
  const stage = document.getElementById("ya-stage");
  const img = document.getElementById("ya-img");
  const title = document.getElementById("ya-title");
  const meta = document.getElementById("ya-meta");
  const related = document.getElementById("ya-related");
  const count = document.getElementById("ya-count");
  if (!stage || !img) return;

  let idx = 0;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let returnFocus = null;

  function srcOf(x) {
    return (x && (x.image || x.thumbnail)) || "";
  }

  function list() {
    const xs = items();
    return xs.length ? xs : [];
  }

  function relatedOf(x) {
    const xs = list();
    const tags = new Set((x.tags || []).map(String));
    return xs
      .filter((y) => y.id !== x.id)
      .map((y) => {
        const hit = (y.tags || []).filter((t) => tags.has(t)).length;
        return { y, hit };
      })
      .filter((r) => r.hit > 0)
      .sort((a, b) => b.hit - a.hit)
      .slice(0, 8)
      .map((r) => r.y);
  }

  function applyTransform() {
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function openAt(i, pushHash) {
    const xs = list();
    if (!xs.length) return;
    idx = ((i % xs.length) + xs.length) % xs.length;
    const x = xs[idx];
    img.src = srcOf(x);
    img.alt = x.alt || x.title || "";
    title.textContent = x.title || x.id;
    meta.textContent = [x.date, x.status, (x.tags || []).join(" · ")].filter(Boolean).join(" · ");
    count.textContent = `${idx + 1} / ${xs.length}`;
    related.replaceChildren();
    for (const y of relatedOf(x)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ya-rel";
      b.title = y.title;
      const im = document.createElement("img");
      im.src = y.thumbnail || srcOf(y);
      im.alt = y.title || "";
      b.append(im);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openAt(list().findIndex((z) => z.id === y.id), true);
      });
      related.append(b);
    }
    if (stage.hidden) returnFocus = document.activeElement;
    stage.hidden = false;
    document.querySelector('.shell').inert = true;
    document.querySelector('.side-nav').inert = true;
    document.getElementById('ya-close').focus();
    document.body.classList.add("ya-open");
    resetView();
    if (pushHash) {
      const h = "view=" + encodeURIComponent(x.id);
      if (location.hash.replace(/^#/, "") !== h) history.replaceState(null, "", "#" + h);
    }
  }

  function close() {
    stage.hidden = true;
    document.body.classList.remove("ya-open");
    document.querySelector('.shell').inert = false;
    document.querySelector('.side-nav').inert = false;
    returnFocus?.focus();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (/^#view=|^#gallery$/.test(location.hash)) history.replaceState(null, "", "#library");
  }

  function next(d) {
    openAt(idx + d, true);
  }

  window.__openGallery = function (id) {
    const xs = list();
    const i = id ? xs.findIndex((x) => x.id === id) : 0;
    openAt(i < 0 ? 0 : i, true);
  };

  document.getElementById("grid")?.addEventListener("click", (ev) => {
    const card = ev.target.closest(".card");
    if (!card) return;
    const i = list().findIndex(x => x.id === card.dataset.id);
    if (i >= 0) openAt(i, true);
  });

  document.getElementById('grid')?.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.card')) {
      ev.preventDefault(); window.__openGallery(ev.target.dataset.id);
    }
  });
  document.getElementById("ya-close")?.addEventListener("click", close);
  document.getElementById("ya-prev")?.addEventListener("click", () => next(-1));
  document.getElementById("ya-next")?.addEventListener("click", () => next(1));
  document.getElementById("ya-full")?.addEventListener("click", () => {
    if (!document.fullscreenElement) stage.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  stage.addEventListener("click", (ev) => {
    if (ev.target.closest("button, .ya-ui, .ya-rel, #ya-img")) return;
    const r = stage.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width;
    if (x < 0.28) next(-1);
    else if (x > 0.72) next(1);
    else if (ev.target === stage || ev.target.classList.contains("ya-dim")) close();
  });

  img.addEventListener("dblclick", resetView);

  img.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const nextZ = Math.min(4, Math.max(1, zoom + (ev.deltaY < 0 ? 0.18 : -0.18)));
    zoom = nextZ;
    if (zoom === 1) {
      panX = 0;
      panY = 0;
    }
    applyTransform();
  }, { passive: false });

  img.addEventListener("pointerdown", (ev) => {
    if (zoom <= 1) return;
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    img.setPointerCapture(ev.pointerId);
  });
  img.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    applyTransform();
  });
  img.addEventListener("pointerup", () => { dragging = false; });

  window.addEventListener("keydown", (ev) => {
    if (ev.target.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
    if (!stage.hidden && ev.key === 'Tab') {
      const buttons = [...stage.querySelectorAll('button:not([disabled])')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
    if (stage.hidden) {
      if (ev.key === "g" && !ev.metaKey && !ev.ctrlKey) {
        openAt(0, true);
      }
      return;
    }
    if (ev.key === "Escape") close();
    else if (ev.key === "ArrowLeft") next(-1);
    else if (ev.key === "ArrowRight") next(1);
    else if (ev.key === "f" || ev.key === "F") document.getElementById("ya-full")?.click();
    else if (ev.key === "+" || ev.key === "=") { zoom = Math.min(4, zoom + 0.25); applyTransform(); }
    else if (ev.key === "-" || ev.key === "_") { zoom = Math.max(1, zoom - 0.25); if (zoom === 1) { panX = 0; panY = 0; } applyTransform(); }
    else if (ev.key === "0") resetView();
  });

  function fromHash() {
    let raw; try { raw = decodeURIComponent((location.hash || "").replace(/^#/, "")); } catch { return; }
    if (raw === "gallery") openAt(0, false);
    else if (raw === "hires") {
      if (window.__setLibraryFilter) window.__setLibraryFilter("hires");
      const i = list().findIndex(x => (x.tags || []).includes("hires"));
      if (i >= 0) openAt(i, false);
    }
    else if (raw.startsWith("view=")) {
      const id = raw.slice(5);
      const i = list().findIndex((x) => x.id === id);
      if (i >= 0) openAt(i, false);
    }
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
