# Shelf

The 99¢ Shelf: game covers standing on a copper board, scrolling sideways, each with a price tag on a string.

**Provide** `<div class="sb-shelf">` holding covers. A cover is `<a class="sb-cover" href="…">` with:
- `<span class="sb-price__string" aria-hidden="true"></span><span class="sb-price"><span class="sb-price__amount">99¢</span><span class="sb-price__each">each</span></span>` (`sb-price--free` turns the amount `sap`),
- `<span class="sb-cover__art">` (4:3, on `surface`: washes, the creature, or the game's own art as an image or canvas),
- `<span class="sb-cover__body">` with `sb-cover__title` (display face), `sb-cover__line` (one sentence) and `sb-cover__meta` (two or three Chips).

Options: `sb-cover--new` hangs a `sap` "New" ribbon; `--tilt` turns a cover a degree or two.

- Covers are `page` with a spine shadow on the left edge, `shadow-page`, lifting 6px with `shadow-lift` on hover and focus; at the TV density the focused cover scales up 7% instead.
- The shelf scrolls sideways with snap points (`grid-auto-columns` from 200px to `size-cover`) and sits on a copper board.

**Do / Don't**
- Do write the price honestly; until a shop exists the page also says "Free to play now".
- Do mark only one cover as new at a time.
- Don't wrap the shelf into a grid of identical cards, and never put a countdown or a crossed-out price on a tag.
