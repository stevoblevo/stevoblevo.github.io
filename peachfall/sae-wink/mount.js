/* Static-host adapter. Same eye as sae-wink.js. Never emits sae-wink. */
const COUNTERS = {
  "peachfall-playable-v1"(data) {
    const gifts = data && data.gifts && typeof data.gifts === "object" ? data.gifts : null;
    if (!gifts) return 0;
    return Object.values(gifts).filter(Boolean).length;
  },
  "polylite-save-v0"(data) {
    if (!data || typeof data !== "object") return 0;
    const goals = Number(data.goals);
    const dreams = Number(data.dreams);
    const n = (Number.isFinite(goals) ? goals : 0) + (Number.isFinite(dreams) ? dreams : 0);
    return n > 0 ? n : 0;
  },
};

function clamp(count) {
  return Number.isSafeInteger(count) && count > 0 ? Math.min(count, 24) : 0;
}

export function mountSaeWink({ world = "peachfall", saveKey = "", bottom = "132px", composer = "" } = {}) {
  if (document.querySelector("sae-wink[data-root]")) return;
  const eye = document.createElement("sae-wink");
  eye.setAttribute("data-root", "");
  eye.setAttribute("world", world);
  if (bottom) eye.style.setProperty("--sae-wink-bottom", bottom);
  const marks = () => {
    if (!saveKey || !COUNTERS[saveKey]) {
      eye.setAttribute("mark-count", "0");
      return;
    }
    try {
      const raw = localStorage.getItem(saveKey);
      const data = raw ? JSON.parse(raw) : null;
      eye.setAttribute("mark-count", String(clamp(COUNTERS[saveKey](data))));
    } catch {
      eye.setAttribute("mark-count", "0");
    }
  };
  marks();
  window.addEventListener("storage", (event) => {
    if (event.key === saveKey) marks();
  });
  const place = () => (document.fullscreenElement || document.body).appendChild(eye);
  place();
  document.addEventListener("fullscreenchange", place);
  if (composer) {
    eye.addEventListener("sae:chat-request", (event) => {
      const node = document.querySelector(composer);
      if (!(node instanceof HTMLElement)) return;
      event.preventDefault();
      if ("hidden" in node) node.hidden = false;
      node.focus();
    });
  }
}
