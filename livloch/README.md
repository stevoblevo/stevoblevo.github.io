# Livloch

A third-person lane game in the Saelion valley. The Reign keeps the lanterns lit, the Hush puts them out, and their paper troopers cancel each other on three threads until something asymmetrical happens. WebGL (Three.js r128 from cdnjs), no build step: `index.html` plus `js/`.

- Play: https://stevoblevo.github.io/livloch/
- Version: 0.7. Every kept version is playable under `vX.Y/` and listed at `versions/` (see `versions.json`).
- Source of truth: the private repo `stevoblevo/livloch`. This folder is a copy of its `release/0.7` branch.
- Status: prototype. Solo against bots. Not yet play-tested on real devices beyond one phone session.

## Files

| File | What it holds |
|---|---|
| `js/core.js` | constants, lanes, heroes, items |
| `js/sim.js` | the whole match, headless: units, combat, bots, souls, the Ness, creases |
| `js/gfx.js` | the WebGL scene and the four looks |
| `js/audio.js` | synthesised sound in 31 equal steps |
| `js/input.js` | mouse and keyboard, touch, gamepad |
| `js/ui.js`, `js/main.js` | HUD, menus, the loop |

`core.js` and `sim.js` run under Node with no DOM, which is how the bot-versus-bot soak tests are run.

## Looks

Cobalt Snow (from the concept plate in `art/title.jpg`), Lantern Night (Reignfawn), Knight Night (Storeybrook), Origami (Storeybrook with Foldlight fold), Hypermetapunk (Foldlight glow).
