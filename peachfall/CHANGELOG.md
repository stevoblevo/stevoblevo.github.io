# Peachfall (github.io) changelog

## 2.0.0 · The Orchard — 2026-11-27

- From `peachfall-playable` main `5875518` (merges #16, the 1.2.8 kid-safety line, and #17, The Orchard). New hashed bundle `assets/index-gSBOQ3dg.js` + `assets/index-Cgkgal7Y.css`. Every scene repainted as one golden-hour peach orchard; new Knight, Princess and Sae figures; each princess met leaves a visible change; dusk-to-night light carries the story. Rules and story unchanged from 1.2.8; no GEN22 art.
- Root door and `/peachfall/v2.0.0/` serve 2.0.0. The previous root (1.2.1) stays at `/peachfall/v1.2.1/`; v1.2.0 and v1.1.0 unchanged. Goober-pinned `assets/main-BPeuWIE_.js` unchanged.

## 2026-11-25 — kid-safety takedown

- Removed the Gallery GEN22 comic page and its companion plates from `/peachfall/source/` (shared by the root door, `/v1.2.0/`, and `/v1.1.0/`). Also removed the watercolor gen22 page and the source contact sheet. Gallery entries and "Kid Mode" / "Protected source art" copy are dropped from the published bundles.


## 1.2.1 — 2026-11-25

- From `peachfall-playable` v1.2.1 (merge `b9d3dabb`). New hashed bundle `assets/index-BSC8QTo5.js` + `assets/index-DFImuT5e.css`. Esc pauses. The assumed-count HUD follows the constellation. Previous v1.2.0 stays at `/peachfall/v1.2.0/`; v1.1.0 stays at `/peachfall/v1.1.0/`. Goober-pinned `assets/main-BPeuWIE_.js` is unchanged.


## 1.2.0 — 2026-11-25

- Polish pass from `peachfall-playable` v1.2.0 (merge `f42cdcc9`). New hashed bundle `assets/index-C9BTGzG-.js` + `assets/index-BxS-zgUb.css`. The previous v1.1.0 door stays at `/peachfall/v1.1.0/` and the Goober-pinned `assets/main-BPeuWIE_.js` is unchanged. `?dreamwalk=1` is now handled by the game bundle, so the root door no longer loads `dreamwalk.js`.

## 1.1.0 — 2026-11-12

- `?dreamwalk=1` (alias `?autoplay=1`) auto-starts WATCH THE DREAM after a short title beat so the three title doors are visible, then walks the main path. Honors `prefers-reduced-motion`. Pointer, touch, or keyboard takes the reins in place. The hashed game bundle is unchanged (Goober CI pins it); this hook lives in `dreamwalk.js`.
