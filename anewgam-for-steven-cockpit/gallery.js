/* Yandex-image-style wall viewer. Related = overlapping tags. */
(function () {
  const items = window.__libraryItems || [];
  if (!items.length) return;

  const stage = document.getElementById("g-stage");
  const frame = document.getElementById("g-frame");
  const imgEl = document.getElementById("g-img");
  const titleEl = document.getElementById("g-title");
  const capEl = document.getElementById("g-cap");
  const relEl = document.getElementById("g-related");
  const countEl = document.getElementById("g-count");
  if (!stage || !imgEl) return;

  let list = items.slice();
  let idx = 0;
  let scale = 1;
  let ox = 0;
  let oy = 0;

  function visible() {
    const f = window.__libraryFilter || "all";
    const xs = items.filter((x) => f === "all" || x.tags.includes(f) || x.id.includes(f));
    return xs.length ? xs : items;
  }

  function related(cur) {
    const tags = new Set(cur.tags || []);
    return items
      .filter((x) => x.id !== cur.id && (x.tags || []).some((t) => tags.has(t)))
      .slice(0, 8);
  }

  function src(x) {
    return x.image || x.thumbnail;
  }

  function applyTransform() {
    imgEl.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
  }

  function resetZoom() {
    scale = 1;
    ox = 0;
    oy = 0;
    applyTransform();
  }

  function paint() {
    const cur = list[idx];
    if (!cur) return;
    imgEl.src = src(cur);
    imgEl.alt = cur.alt || cur.title;
    titleEl.textContent = cur.title;
    capEl.textContent = (cur.caption || "") + (cur.provenance ? " · " + cur.provenance : "");
    countEl.textContent = `${idx + 1} / ${list.length}`;
    resetZoom();
    relEl.replaceChildren();
    for (const r of related(cur)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "g-rel";
      b.title = r.title;
      const im = document.createElement("img");
      im.src = r.thumbnail || r.image;
      im.alt = r.title;
      b.append(im);
      b.addEventListener("click", () => open(r.id));
      relEl.append(b);
    }
  }

  function open(id) {
    list = visible();
    const found = list.findIndex((x) => x.id === id);
    idx = found >= 0 ? found : 0;
    if (found < 0) {
      list = items.slice();
      idx = Math.max(0, items.findIndex((x) => x.id === id));
    }
    stage.hidden = false;
    document.body.style.overflow = "hidden";
    paint();
    imgEl.focus();
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    stage.hidden = true;
    document.body.style.overflow = "";
    resetZoom();
  }

  function step(d) {
    if (!list.length) return;
    idx = (idx + d + list.length) % list.length;
    paint();
  }

  function toggleFs() {
    if (!document.fullscreenElement) stage.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  document.getElementById("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    open(card.dataset.id);
  });

  document.getElementById("g-close").addEventListener("click", close);
  document.getElementById("g-prev").addEventListener("click", () => step(-1));
  document.getElementById("g-next").addEventListener("click", () => step(1));
  document.getElementById("g-fs").addEventListener("click", toggleFs);

  frame.addEventListener("click", (e) => {
    if (e.target !== frame && e.target !== imgEl) return;
    const r = frame.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x < 0.28) step(-1);
    else if (x > 0.72) step(1);
  });

  frame.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const next = scale * (e.deltaY < 0 ? 1.12 : 0.9);
      scale = Math.min(6, Math.max(1, next));
      if (scale === 1) {
        ox = 0;
        oy = 0;
      }
      applyTransform();
    },
    { passive: false },
  );

  let drag = false;
  let sx = 0;
  let sy = 0;
  frame.addEventListener("pointerdown", (e) => {
    if (scale <= 1) return;
    drag = true;
    sx = e.clientX - ox;
    sy = e.clientY - oy;
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener("pointermove", (e) => {
    if (!drag) return;
    ox = e.clientX - sx;
    oy = e.clientY - sy;
    applyTransform();
  });
  frame.addEventListener("pointerup", () => {
    drag = false;
  });

  window.addEventListener("keydown", (e) => {
    if (stage.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "f" || e.key === "F") toggleFs();
  });

  window.__openGallery = open;
})();
