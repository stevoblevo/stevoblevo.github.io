/* Steven cockpit v3: local-first thread loom and portable receipts. */
(function () {
  "use strict";
  const api = window.__anewgam;
  if (!api) return;
  const $ = (s, r = document) => r.querySelector(s);
  const toast = api.toast || (() => {});
  const statuses = ["held-local", "in-motion", "proven"];
  const labels = { "held-local": "HELD LOCAL", "in-motion": "IN MOTION", proven: "PROVEN" };

  function normalise(raw) {
    const next = raw && typeof raw === "object" ? raw : {};
    next.blooms = Number.isFinite(Number(next.blooms)) ? Math.max(0, Number(next.blooms)) : 7;
    next.fruit = typeof next.fruit === "string" ? next.fruit.slice(0, 80) : "rose-gold Peach";
    next.threads = Array.isArray(next.threads) ? next.threads.slice(0, 250).map((t, i) => ({
      id: typeof t.id === "string" ? t.id : `legacy-${i}-${Date.now()}`,
      source: String(t.source || "").slice(0, 4000),
      heldAt: t.heldAt || new Date().toISOString(),
      updatedAt: t.updatedAt || t.heldAt || new Date().toISOString(),
      status: statuses.includes(t.status) ? t.status : "held-local",
      proof: String(t.proof || "").slice(0, 2000)
    })).filter(t => t.source) : [];
    next.receipts = Array.isArray(next.receipts) ? next.receipts.slice(0, 500) : [];
    next.attend = next.attend && typeof next.attend === "object" ? next.attend : { colourInheritance: "" };
    next.attend.colourInheritance = ["peachfall", "goober", "guide-only"].includes(next.attend.colourInheritance) ? next.attend.colourInheritance : "";
    return next;
  }

  function state() { return normalise(api.getState()); }
  function receipt(s, event, thread) {
    s.receipts.unshift({ at: new Date().toISOString(), event, threadId: thread?.id || null, authorityEffect: "none" });
    s.receipts = s.receipts.slice(0, 500);
  }

  function advance(id) {
    const s = state();
    const thread = s.threads.find(t => t.id === id);
    if (!thread) return;
    if (thread.status === "held-local") thread.status = "in-motion";
    else if (thread.status === "in-motion") {
      const proof = prompt("What proves this round trip? A result, link, filename, or plain truthful sentence:", thread.proof || "");
      if (proof === null) return;
      if (!proof.trim()) return toast("Proof stays open until there is something truthful to name.");
      thread.proof = proof.trim().slice(0, 2000);
      thread.status = "proven";
      s.blooms += 1;
    } else return toast("This thread is already proven. Its receipt stays visible.");
    thread.updatedAt = new Date().toISOString();
    receipt(s, `thread-${thread.status}`, thread);
    api.setState(s);
    toast(thread.status === "proven" ? "Round trip proven. The world grew." : "Thread is moving—bounded, visible, unsent.");
  }

  function render() {
    const s = state();
    const counts = Object.fromEntries(statuses.map(x => [x, s.threads.filter(t => t.status === x).length]));
    $("#heldCount").textContent = counts["held-local"];
    $("#motionCount").textContent = counts["in-motion"];
    $("#provenCount").textContent = counts.proven;
    const progress = s.threads.length ? Math.round(((counts["in-motion"] * .5 + counts.proven) / s.threads.length) * 100) : 0;
    $("#loomProgress").style.width = `${progress}%`;
    $("#loomProgressText").textContent = s.threads.length ? `${progress}% of ${s.threads.length} thread${s.threads.length === 1 ? "" : "s"} returned with proof` : "No thread begun";
    const list = $("#threadList");
    list.replaceChildren();
    $("#threadEmpty").hidden = s.threads.length > 0;
    for (const thread of s.threads) {
      const article = document.createElement("article");
      article.className = "thread";
      const main = document.createElement("div");
      main.className = "thread-main";
      const head = document.createElement("div"); head.className = "thread-state";
      const status = document.createElement("small"); status.textContent = labels[thread.status];
      const time = document.createElement("time"); time.dateTime = thread.updatedAt; time.textContent = new Date(thread.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      head.append(status, time);
      const source = document.createElement("p"); source.className = "thread-source"; source.textContent = thread.source;
      main.append(head, source);
      if (thread.proof) { const proof = document.createElement("p"); proof.className = "thread-proof"; proof.textContent = `Proof · ${thread.proof}`; main.append(proof); }
      const controls = document.createElement("div"); controls.className = "thread-controls";
      const act = document.createElement("button"); act.type = "button"; act.className = "prove"; act.textContent = thread.status === "held-local" ? "Begin move" : thread.status === "in-motion" ? "Return proof" : "Proven ✓"; act.disabled = thread.status === "proven"; act.addEventListener("click", () => advance(thread.id));
      const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy"; copy.addEventListener("click", async () => { await navigator.clipboard?.writeText(thread.source); toast("Original words copied."); });
      controls.append(act, copy); article.append(main, controls); list.append(article);
    }
    $("#cockpitHealth").textContent = `${navigator.onLine ? "online" : "offline"} · ${s.receipts.length} receipts`;
    const attendLabels = { peachfall: "Peachfall first", goober: "Goober first", "guide-only": "Keep Aurose as guide only" };
    if ($("#attendChoice")) $("#attendChoice").textContent = s.attend.colourInheritance ? `Held locally · ${attendLabels[s.attend.colourInheritance]}` : "Not chosen on this device.";
    document.querySelectorAll("[data-attend-choice]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.attendChoice === s.attend.colourInheritance)));
  }

  function exportState() {
    const s = state();
    const payload = { format: "sae.anewgam.skein", version: 3, exportedAt: new Date().toISOString(), authorityEffect: "none", state: s };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `steven-anewgam-skein-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    receipt(s, "skein-exported"); api.setState(s); toast("Portable skein exported with a local receipt.");
  }

  async function importState(file) {
    if (!file || file.size > 2_000_000) return toast("Choose a .json skein smaller than 2 MB.");
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== "sae.anewgam.skein" || !parsed.state) throw new Error("format");
      const incoming = normalise(parsed.state); const current = state();
      const byId = new Map(current.threads.map(t => [t.id, t]));
      for (const t of incoming.threads) if (!byId.has(t.id)) byId.set(t.id, t);
      current.threads = [...byId.values()].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 250);
      current.blooms = Math.max(current.blooms, incoming.blooms);
      receipt(current, "skein-imported"); api.setState(current); toast("Skein merged. Existing local threads were preserved.");
    } catch { toast("That file is not a valid .anewgam skein."); }
  }

  function health() {
    const set = (id, text, good) => { $(id).textContent = text; $(id.replace("State", "Pip"))?.classList.toggle("good", good); };
    set("#netState", navigator.onLine ? "network available" : "offline cockpit", true);
    let localGood = false; try { localStorage.setItem("anewgam.health", "1"); localStorage.removeItem("anewgam.health"); localGood = true; } catch {}
    set("#storeState", localGood ? "local memory ready" : "storage limited", localGood);
    const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    set("#installState", installed ? "installed cockpit" : "browser cockpit", installed);
    render();
  }

  $("#exportState")?.addEventListener("click", exportState);
  $("#importState")?.addEventListener("click", () => $("#importFile").click());
  $("#importFile")?.addEventListener("change", e => { importState(e.target.files?.[0]); e.target.value = ""; });
  $("#persistState")?.addEventListener("click", async () => {
    if (!navigator.storage?.persist) return toast("This browser manages storage automatically. Export is your portable backup.");
    const granted = await navigator.storage.persist(); toast(granted ? "Local memory fortified by this browser." : "Browser kept standard storage; export remains available."); health();
  });
  document.querySelectorAll("[data-attend-choice]").forEach(button => button.addEventListener("click", () => {
    const s = state();
    s.attend.colourInheritance = button.dataset.attendChoice;
    receipt(s, "attend-colour-inheritance-held-local");
    api.setState(s);
    toast("Choice held locally. Export the skein to carry it beyond this device.");
  }));
  window.addEventListener("anewgam:state", render);
  window.addEventListener("online", health); window.addEventListener("offline", health);
  health();
})();
