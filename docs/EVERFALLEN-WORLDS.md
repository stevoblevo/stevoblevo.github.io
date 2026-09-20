# #everfallen — paths that remember

Steven's requirement, 2026-09-20:

> each fo our gams needs auto play / runthru
> be sure we link all our gams interweaved nito cockpit/anewgams y each other puzzle dev play etc.

Every game should have a Watch journey through actual mechanics, a way to take over at the current moment, and an automated run-through with observable outcomes. Keep the existing cockpit and each world's identity and saves. World links are connections, not a claim that every world is implemented or that private worlds have been published.

The existing `saelion.workspace.json` owns the world inventory. `shared/worlds.js` is its generated public projection. `shared/ways.js` supplies the same small Worlds / Home / Watch controls at existing entrances, with a tab-local return path. External worlds open separately without transferring player data. The development workspace remains this repository.

## Implemented in this candidate

| World | Play / Watch | Automated run-through |
| --- | --- | --- |
| Peachfall public slice | Existing engine preserved; Watch, Take over, return to previous in-memory scene. Backgrounding stops Watch. | Actual rendered Watch to ending with all gifts; stored-save preservation. |
| Signal Run | Missing script reference repaired; real physics autoplay, Pause, Take over, restore. Watch and assisted practice do not write player scores/logs/ghosts. | Scored 45-second finish, pause/restore, manual takeover. |
| Nougat Thread | Existing PR #5 chapter integrated; paced real choices, Pause, Take over, restore. Explicit Keep still controls saves. | Actual ending, manual continuation, unchanged kept copy, return to cockpit. |

`npm run check` runs the unit/build gate. With Python Playwright installed and `npm run dev` running, `npm run runthrough` drives the browser journeys and writes screenshots and results under `test-results/browser/worlds`. Browser results must be read before claiming a pass. A chapter imported from a candidate branch is still a candidate.

The shared controls stop or pause Watch when the Worlds dialog opens or the page becomes hidden. Watch never sends an AI request. The playable moment remains available on Take over. Browser saves keep their existing scope; links do not provide cross-device or cross-origin save synchronization.

## Known gaps retained in the same inventory

- Goober/Crossing is connected as a world; its wider puzzle/story modes still need an autoplay adapter. Signal Run is the integrated playable slice.
- #everfallen is a butterfly-lit visual seed, not an implemented new game. The supplied portrait keeps its own blue/lavender and butterfly identity; it does not redefine Sae's established appearance.
- Polylite remains private development, linked to its existing public art doorway. Its actual private game needs an adapter.
- Cheese Royale's old link targeted a missing route. The false live claim is removed; source recovery remains open.
- Circle of Else, Forest Mist and The Warmth have external doors. Their host availability, Watch support and return integration are not verified by this candidate's local browser suite.
- Meema's Princess Console stays private. Discovery returned no published entrance; publication or access changes are outside this change.
- Dora's Lantern That Waits remains a dream seed; its linger/follow/rest interactions are proposed.

## Lineage and release boundary

Based on canonical integration branch `sae/one-development-home-20260917`, revision `a9737616bc28e9cd8fde7f94f8d0a490395be0a2`. Nougat source was recovered from PR #5 head `f89379c056071f0fd8c16fbf6822993acf42705a`, preserving the chapter and its tests. Art Airport, private Peachfall engine selection and other concurrent work are not promoted here. Published engine bytes remain unchanged.

This is an implementation candidate until review and promotion. A passing run-through does not mean every known game is connected, the site is deployed, or Skein has accepted it.

## Image seed provenance

The attached butterfly portrait is retained as reference `libfile_627510d3279c81919b8f1968a497776b`, filename `196838891973ad58817e114e7c912e11.jpg`, 1,024 × 1,024 pixels, 183,325 bytes, SHA-256 `8dee4388b5d6e9c653e00313a24e7b9ddf7e4d46b086f5be6db0b1bd19287da0`. Its original artist and license are unverified. The image bytes are not copied into this public source candidate. The blue/lavender hair, blue eyes, butterflies and falling lights inspire #everfallen; that interpretation is separate from authorship or character identity.
