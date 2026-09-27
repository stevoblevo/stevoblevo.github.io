/* Public @Stevoblevo posts only. Family pocket. Talking bubbles ok. */
(function () {
  const HOST = "https://x.com/Stevoblevo/status/";
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function mount() {
    let section = document.getElementById("talk");
    if (!section) {
      section = el("section", "talk-chart panel");
      section.id = "talk";
      const lib = document.getElementById("library");
      (lib && lib.parentNode ? lib.parentNode : document.body).insertBefore(section, lib || null);
    } else {
      section.classList.add("talk-chart", "panel");
    }
    section.replaceChildren();
    const head = el("div", "talk-head");
    const copy = document.createElement("div");
    copy.append(el("p", "eyebrow", "PUBLIC TALK · FROM:STEVOBLEVO"), el("h2", "", "Chart · bubble · talking"));
    head.append(copy, el("p", "", "Tap a bubble. Talking is fine. Not family. Not a coin."));
    const row = el("div", "bubbles");
    section.append(head, row, el("p", "talk-note", "Allowlist on this device. Open X for the live thread."));
    let pop = document.getElementById("talk-pop");
    if (!pop) {
      pop = el("div", "");
      pop.id = "talk-pop";
      pop.setAttribute("role", "dialog");
      document.body.append(pop);
    }
    function openTalk(post) {
      pop.replaceChildren();
      const card = el("div", "card");
      card.append(el("small", "", "@Stevoblevo · " + post.when + " · " + post.tag), el("p", "", post.line));
      const acts = el("div", "acts");
      const a = el("a", "", "Open the public post");
      a.href = HOST + post.id;
      a.target = "_blank";
      a.rel = "noreferrer";
      const talk = el("button", "", "Talk it");
      talk.type = "button";
      talk.addEventListener("click", function () {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(post.line);
          u.rate = 0.92;
          window.speechSynthesis.speak(u);
        } catch (e) {}
      });
      const close = el("button", "", "Close");
      close.type = "button";
      close.addEventListener("click", function () {
        pop.classList.remove("on");
        try { window.speechSynthesis.cancel(); } catch (e) {}
      });
      acts.append(a, talk, close);
      card.append(acts);
      pop.append(card);
      pop.classList.add("on");
    }
    pop.addEventListener("click", function (ev) {
      if (ev.target === pop) pop.classList.remove("on");
    });
    fetch("./posts.json").then(function (r) { return r.json(); }).then(function (data) {
      (data.posts || []).forEach(function (post) {
        const b = el("button", "bubble");
        b.type = "button";
        b.dataset.tag = post.tag;
        b.append(el("small", "", post.when), el("b", "", post.line));
        b.addEventListener("click", function () { openTalk(post); });
        row.append(b);
      });
    }).catch(function () {
      row.append(el("p", "", "Talk chart waiting on posts.json"));
    });
    function goTalk() {
      if (/^(talk|posts|x)$/i.test(String(location.hash).replace("#", ""))) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("hashchange", goTalk);
    goTalk();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
