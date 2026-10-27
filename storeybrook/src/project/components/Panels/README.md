# Panels

Comic panels: a grid of inked frames with captions, halftone and sound effects.

**Provide** `<div class="sb-panels" style="--cols:3">` holding `<div class="sb-panel">`s. Options: `sb-panel--wide` (two columns), `sb-panel--tall` (two rows), `sb-panel--dots` (a `cue` halftone ground). Inside a panel: `<p class="sb-panel__cap">` for the caption box at the top left, `<span class="sb-panel__sfx" aria-hidden="true">PLUNK</span>` for a sound effect (Bangers in `gamboge` with an ink stroke), and any art or balloons.

- Panels are `page` with a `border-ink` frame (3px in Comix), at least 180px tall, 14px apart.
- On phones set `--cols:1` or `2`; panels read left to right, top to bottom.

**Do / Don't**
- Do write a sound effect as a word in capitals (it is the one place capitals are right), and hide it from the reader with `aria-hidden` when the caption already says it.
- Don't use panels for layout of non-story content.
