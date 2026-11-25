# Peachfall (github.io) changelog

## 1.2.1 — 2026-11-25

- From `peachfall-playable` v1.2.1 (merge `b9d3dabb`). New hashed bundle `assets/index-BSC8QTo5.js` + `assets/index-DFImuT5e.css`. Esc pauses. The assumed-count HUD follows the constellation. Previous v1.2.0 stays at `/peachfall/v1.2.0/`; v1.1.0 stays at `/peachfall/v1.1.0/`. Goober-pinned `assets/main-BPeuWIE_.js` is unchanged.


## 1.2.0 — 2026-11-25

- Polish pass from `peachfall-playable` v1.2.0 (merge `f42cdcc9`). New hashed bundle `assets/index-C9BTGzG-.js` + `assets/index-BxS-zgUb.css`. The previous v1.1.0 door stays at `/peachfall/v1.1.0/` and the Goober-pinned `assets/main-BPeuWIE_.js` is unchanged. `?dreamwalk=1` is now handled by the game bundle, so the root door no longer loads `dreamwalk.js`.

## 1.1.0 — 2026-11-12

- `?dreamwalk=1` (alias `?autoplay=1`) auto-starts WATCH THE DREAM after a short title beat so the three title doors are visible, then walks the main path. Honors `prefers-reduced-motion`. Pointer, touch, or keyboard takes the reins in place. The hashed game bundle is unchanged (Goober CI pins it); this hook lives in `dreamwalk.js`.
