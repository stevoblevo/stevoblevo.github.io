# Devices

One Storeybrook page runs on a phone in a hand, a folding phone, a tablet on a lap, a laptop, an e-ink slate, a 5K desktop display and a 75-inch TV across the room. The page does not change; its density, its root size and its way of being moved through do.

## Densities

Set `data-density` on `<html>`, or let `Storeybrook.init()` choose (`?tv=1` in the URL, then the saved choice `sb:density`, then a TV browser by its user agent, then `regular`).

| Density | Targets | Focus ring | Story text | For |
|---|---|---|---|---|
| `regular` | `size-target` (48px) | 3px at 3px | Alegreya | phones, tablets, laptops, desktop displays |
| `kid` | 56px | 3px at 3px | Andika, 1.3–1.6rem | early readers, a parent reading along |
| `tv` | 64px | 5px at 5px | Alegreya | TVs and anything seen from across a room |

`Storeybrook.density.set('tv')` also turns on spatial navigation. `Storeybrook.density.isTV()` recognises webOS (LG), Tizen (Samsung), Android TV, Fire TV, Chromecast, Roku, BRAVIA, Viera, HbbTV and console browsers.

## Screens

| Screen | CSS size | Look and density | Notes |
|---|---|---|---|
| Phone | 390 × 844 | any, `regular` | the brook turns vertical; spreads show one page; the reader bar and the jar sit in the safe area |
| Folding phone, open | 768 × 840 | any, `regular` | a square page; covers in two columns |
| Tablet | 820 × 1180 | any, `regular` or `kid` | the best reading device; spreads show one page in portrait |
| Laptop | 1440 × 900 | any, `regular` | the landing fits one screen; spreads show two pages |
| E-ink slate | 1024 × 768 | Ink Blot, `regular` | no motion, no color, high contrast; turn pages instead of scrolling |
| 4K or 5K display | 2560 × 1440 CSS (5K at 2×) | any, `regular` | `size-root` is about 21px (28px when unscaled); nothing is a thumbnail |
| TV, 1080p or 4K | 1920 × 1080 CSS | any, `tv` | seen from three metres: 64px targets, 5px rings, D-pad and gamepad |

TV browsers, LG's webOS among them, typically lay out a 4K panel at 1920 × 1080 CSS pixels, so on a 75-inch TV it is the TV density that makes things big, not the pixel count.

## Input

- **Touch and mouse.** Everything is a real button or link. Spreads also turn with a 50px swipe.
- **Keyboard.** Tab order follows the page. Spreads take ←/→ and Page Up/Page Down when focused. Escape closes the drawer and dialogs.
- **Remote and D-pad.** At the TV density (or after `Storeybrook.nav.enable()`), the arrow keys move focus to the nearest control in that direction, scrolling it into view. Back (Escape, Backspace, BrowserBack, or webOS key 461) closes a dialog or the drawer, then fires `sb:back`.
- **Gamepad.** With navigation on: the D-pad or left stick moves focus (repeating every 240ms when held), A presses, B goes back.
- Give the first thing to press `data-sb-autofocus` so the first arrow press lands there.

## Big screens

- Covers lift and scale up 7% when focused at the TV density, so the focused one is obvious from the sofa.
- Keep text on sheets, never straight on washes, because TVs crush contrast.
- No hover-only affordances anywhere: a TV has no hover.

## E-ink

- Use Ink Blot: black on white, stipple instead of wash, no animation at all, a 4:1 `line`.
- Prefer page turns to scrolling (e-ink redraws whole screens), so long stories go in a spread.
- Avoid the grain and big black fills (Ink Blot already does): they ghost.
