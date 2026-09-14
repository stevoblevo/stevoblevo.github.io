/* Recovered public hi-res. Pointers only — files already on Pages. */
(function () {
  const items = window.__libraryItems || (window.__libraryItems = []);
  const add = (x) => {
    if (items.some((y) => y.id === x.id)) return;
    items.push(x);
  };
  const G = "/goober/assets/";
  const P = "/peachfall/source/images/";
  const R = G + "rediscovered/";

  add({ id: "orig-crossing", title: "Protect the Lantern", date: "recovered", caption: "Crossing original. Hash-matched lantern plate.", alt: "Protect the Lantern", tags: ["hires", "crossing", "lantern", "goober", "night"], provenance: "ChatGPT library → goober/assets/crossing-original.jpg · public recovered", status: "recovered_original", thumbnail: G + "crossing.webp", image: G + "crossing-original.jpg" });
  add({ id: "orig-garden", title: "EverDelve · Garden Central", date: "recovered", caption: "Garden original. Same strand as Crossing.", alt: "EverDelve Garden Central", tags: ["hires", "everdelve", "garden", "goober"], provenance: "ChatGPT library → goober/assets/garden-original.png · public recovered", status: "recovered_original", thumbnail: G + "garden.webp", image: G + "garden-original.png" });
  add({ id: "orig-sanctuary", title: "Enchanted Tower Garden Sanctuary", date: "recovered", caption: "Sanctuary original.", alt: "Enchanted Tower Garden Sanctuary", tags: ["hires", "tower", "sanctuary", "goober", "night"], provenance: "ChatGPT library → goober/assets/sanctuary-original.png · public recovered", status: "recovered_original", thumbnail: G + "sanctuary.webp", image: G + "sanctuary-original.png" });

  const peach = [
    ["pf-01", "The princess who could not leave the tower", "anchors/01_gen22_page1_the_princess_who_could_not_leave_the_tower.png", "peachfall-01.webp", ["hires", "peachfall", "gen22", "origin"]],
    ["pf-02", "Astral assembly", "anchors/02_astral_assembly_sae_and_little_princesses.png", "peachfall-02.webp", ["hires", "peachfall", "worlds"]],
    ["pf-03", "Assume her fragments", "anchors/03_gameplay_assume_her_fragments.png", "peachfall-03.webp", ["hires", "peachfall", "play"]],
    ["pf-04", "Sae · dream guide", "continuity/04_sae_dream_guide_portrait.png", "peachfall-04.webp", ["hires", "peachfall", "sae"]],
    ["pf-05", "Princess letter · Storyload", "continuity/05_princess_letter_storyload.png", "peachfall-05.webp", ["hires", "peachfall", "origin"]],
    ["pf-06", "Sae and Knight · future key art", "continuity/06_sae_and_knight_future_key_art.png", "peachfall-06.webp", ["hires", "peachfall", "knight", "sae"]],
    ["pf-07", "Dreambound promises", "continuity/07_storyload_dreambound_promises_storyboard.png", "peachfall-07.webp", ["hires", "peachfall", "storyboard"]],
    ["pf-08", "Gen22 · watercolor origin", "continuity/08_gen22_watercolor_page1_of_2.png", "peachfall-08.webp", ["hires", "peachfall", "gen22"]],
    ["pf-09", "Play creates the world", "continuity/09_play_creates_the_world_concept.png", "peachfall-09.webp", ["hires", "peachfall", "worlds"]]
  ];
  for (const [id, title, src, thumb, tags] of peach) {
    add({ id, title, date: "canon", caption: title, alt: title, tags, provenance: "peachfall/source/images · public", status: "canon_hires", thumbnail: R + thumb, image: P + src });
  }
})();
