/* Live-door map. Private polylite is named, not hosted. */
window.__anewDoors = [
  { id: "talk", hash: ["talk"], title: "Talk to Sae ↗", href: "https://anewgam-steven-cockpit.stevoblevo.chatgpt.site/talk?source=cockpit-talk-door", live: false, external: true, line: "Opens your private Talk site in a new tab with ChatGPT sign-in. Local drafts are not sent. Talk requires a network connection." },
  { id: "peachfall", hash: ["peachfall", "$peachfall"], title: "$peachfall", href: "/peachfall/", live: true, line: "Watch / play the dream" },
  { id: "goober", hash: ["goober", "crossing", "anewgam"], title: "Crossing", href: "/goober/", live: true, line: "Aiden door · find your line" },
  { id: "run", hash: ["run", "signal"], title: "Signal Run", href: "/goober/run/", live: true, line: "Ruins · lanterns · no wager" },
  { id: "with-him", hash: ["with-him", "withhim"], title: "With him", href: "/goober/with-him/", live: true, line: "Same world. Further together." },
  { id: "cheese", hash: ["cheese", "cheese-royale"], title: "Cheese Royale", href: "/cheese-royale/", live: true, line: "Tester table" },
  { id: "everFallen", hash: ["everfallen", "everFallen", "everdelve"], title: "$everFallen", href: null, live: false, line: "Plates in this library · no public play yet" },
  { id: "polylite", hash: ["polylite", "$polylite", "polylight"], title: "$polylite", href: null, live: false, line: "Private sibling · play local / loopback" },
  { id: "sc1", hash: ["sc1.lov", "sc1", "lov"], title: "sc1.lov", href: null, live: false, line: "KkNight comes · day is now night" },
  { id: "kids", hash: ["kids", "kidsmod"], title: "Kids Mod", href: null, live: false, line: "Family plate · G-rated · not live" },
  { id: "hires", hash: ["hires", "hi-res"], title: "Hi-res", href: null, live: false, line: "Recovered originals on this wall" },
  { id: "atlas", hash: ["atlas"], title: "Atlas", href: "/goober/gallery/", live: true, line: "Goober recovered wall" }
];

(function () {
  const doors = window.__anewDoors || [];
  const bar = document.getElementById("doors");
  if (!bar) return;
  const talk = doors.find(d => d.id === "talk");
  if (talk && !document.getElementById("talk-door-note")) {
    const note = document.createElement("p");
    note.id = "talk-door-note";
    note.textContent = talk.line;
    note.style.cssText = "color:var(--muted);font-size:.8rem;margin:4px 0 12px";
    bar.after(note);
  }
  function norm(h) { return String(h || "").replace(/^#/, "").replace(/^\$/, "").trim(); }
  function current() {
    const raw = norm(location.hash).toLowerCase();
    return doors.find((d) => d.hash.some((x) => norm(x).toLowerCase() === raw)) || null;
  }
  function paint() {
    const active = current(); bar.replaceChildren();
    for (const d of doors) {
      const el = d.href && (d.live || d.external) ? document.createElement("a") : document.createElement("button");
      el.className = "door" + (active && active.id === d.id ? " on" : ""); el.dataset.door = d.id;
      if (d.href && (d.live || d.external)) {
        el.href = d.href; el.textContent = d.title;
        if (d.external) {
          el.target = "_blank"; el.rel = "noopener noreferrer";
          el.referrerPolicy = "no-referrer"; el.dataset.saeTalk = "";
          el.style.minHeight = "44px"; el.setAttribute("aria-describedby", "talk-door-note");
        }
      }
      else { el.type = "button"; el.textContent = d.title + (d.live ? "" : " · plates");
        el.addEventListener("click", () => {location.hash = d.hash[0];document.getElementById('library')?.scrollIntoView();}); }
      el.title = d.line; bar.append(el);
    }
    const outward = document.createElement("a");
    outward.className = "door"; outward.href = "./magwena/"; outward.textContent = "Magwena ↗";
    outward.title = "Carry a chosen moment, never the whole private dream."; bar.append(outward);
    const note = document.getElementById("door-note");
    if (note) {note.textContent = active ? (active.external ? "External private door: " : active.live ? "Open live: " : "In this library: ") + active.line : "Steven · .anewgam — hash a door or stay with the stills.";}
    if (active && window.__setLibraryFilter) {
      const map = { peachfall: "peachfall", goober: "all", run: "all", "with-him": "all", cheese: "all", everFallen: "gen23", polylite: "polylite", sc1: "night", kids: "polylite", hires: "hires", atlas: "hires" };
      window.__setLibraryFilter(map[active.id] || "all");
    }
  }
  window.addEventListener("hashchange", paint); paint();
})();
