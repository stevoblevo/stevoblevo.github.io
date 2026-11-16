# Hypermetapunk roadmap

Hypermetapunk is the neon kit: the third face of the AND SO lattice, after Storeybrook (paper and daylight) and Depthfield (planes and depth). This folder is its source of truth for any agent or person working on it (Claude, Muse, Grok, ChatGPT, or by hand).

## 0.1 (16 Nov 2026), what is here

- `tokens.json`: one theme, `neon`. Colours, type, spacing, radii and one `glow` shadow, measured from the hypermetapunk look in AND SO 8.3 (`_src/and-so/src/f-draw.js`, `f2-terrain.js`, `l-reel.js`).
- `README.md`: the brand book (principles, voice, colour, type, layout, imagery).
- `components/Cover/preview.html`: the cover card.
- `design-system.json`: the index for the claude.ai Design System artifact that mirrors this folder.
- First use: the neon cut of the AND SO deck (13 slides), a separate artifact from the Storeybrook deck, which stays as it was.

## Rules that do not change

- The ground is dark: `void`, `aubergine`, `plum`. Light comes from the things on it.
- Glow means live. One glowing thing at a time.
- Five axes, five colours: Tuning `mint`, Shimmer `violet`, Pace `gold`, Space `sky`, Warmth `coral`. Same order as `LAT` in `_src/and-so/src/a-core.js`. The mapping is a design choice, not physics, and says so where it could be misread.
- Text holds 7:1 on every ground. Colour is never the only signal.
- Sound, microphone and camera stay off until a person turns them on.

## Next (0.2)

- Components, each with a preview: Readout (mono value plus unit), AxisChip, Panel, Tab and Toggle (pill), Node, the Pentagon (five axes, rings, a state shape), the Penteract (32 corners, 80 edges, decagonal projection), the Ruler (cents, one tick per cent).
- A `site.css` like Storeybrook's, so AND SO's own chrome can consume the tokens directly.
- A reduced-motion pass written down: what drifts, what stops.

## Later

- A light companion theme only if it keeps "glow means live" honest (likely an e-ink-safe variant that swaps glow for a heavier stroke).
- Shared token names with Storeybrook where the meaning is the same (`ink`, `ink-muted`, `line`), so one component can wear either kit.

## How to change it

Version every change. Bump the version in `README.md` and here, keep old builds reachable, and never replace Storeybrook or an earlier Hypermetapunk build in place.
