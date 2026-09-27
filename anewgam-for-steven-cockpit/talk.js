/* Public posts only. Family pocket. Street off the chart. */
window.__publicTalk = [
  { id: "2103955067225116907", line: "peachfall is a tale about time and friendship", when: "2026-09-26" },
  { id: "2101586645493399994", line: "peachfall leads to red reign", when: "2026-09-20" },
  { id: "2101854108600639618", line: "#redreign:dear", when: "2026-09-21" },
  { id: "2103192301367394622", line: "polylite? red reign : bespoke.Gig", when: "2026-09-24" },
  { id: "2103769477464650215", line: "enjoin peachfall aeterna", when: "2026-09-26" },
  { id: "2099365811706048682", line: "breakfast beskar · Dora soul · skein doll", when: "2026-09-14" }
];

(function () {
  const posts = window.__publicTalk || [];

  function wantTalk() {
    const h = String(location.hash || "").replace(/^#/, "").replace(/^\$/, "").toLowerCase();
    return h === "talk" || h === "x" || h === "bubble" || h === "chart";
  }

  function href(id) {
    return "https://x.com/Stevoblevo/status/" + id;
  }

  function ensure() {
    let layer = document.getElementById("talk-layer");
    if (layer) return layer;
    layer = document.createElement("aside");
    layer.id = "talk-layer";
    layer.className = "talk-layer";
    layer.hidden = true;
    layer.innerHTML = '<p class="eyebrow">PUBLIC TALK</p><h2>chart · bubble · pop</h2><div class="talk-chart" id="talk-chart"></div><button type="button" id="talk-pop">pop one</button><button type="button" id="talk-close">leave</button>';
    document.body.append(layer);
    const chart = layer.querySelector("#talk-chart");
    posts.forEach((p, i) => {
      const a = document.createElement("a");
      a.className = "talk-card";
      a.href = href(p.id);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.dataset.i = String(i);
      a.innerHTML = "<small>" + p.when + "</small><strong>" + p.line + "</strong>";
      chart.append(a);
    });
    layer.querySelector("#talk-close").addEventListener("click", () => {
      location.hash = "";
      paint();
    });
    let n = 0;
    layer.querySelector("#talk-pop").addEventListener("click", () => {
      const cards = chart.querySelectorAll(".talk-card");
      cards.forEach((c) => c.classList.remove("on"));
      cards[n % cards.length]?.classList.add("on");
      n += 1;
    });
    return layer;
  }

  function paint() {
    const layer = ensure();
    layer.hidden = !wantTalk();
  }

  window.addEventListener("hashchange", paint);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
})();
