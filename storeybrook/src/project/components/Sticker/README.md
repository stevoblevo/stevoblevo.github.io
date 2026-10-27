# Sticker

Stickers for things found and places opened, kept in an album. A sticker not found yet is a dashed outline with its name, so a person can see what is still to find.

**Provide** `<div class="sb-sticker" data-sb-sticker="<id>">` holding `<span class="sb-sticker__art">` (an icon or a small drawing) and `<span class="sb-sticker__name">` (the hand face). Put stickers in `<div class="sb-album">` (a grid of 132px columns). Set `--rot` for its tilt.

- `Storeybrook.unlock(id)` turns `sb-sticker--locked` off for the matching sticker and peels it on (`is-new`, `dur-base`, `ease-bounce`), with a toast and a peel sound.
- Locked: dashed `line` outline, faded art, `ink-muted` name. Found: a `page` sticker with a white border on a `wash-sun` glow and `shadow-sticker`.
- Origami turns the art 45°; Comix rims it in ink.

**Do / Don't**
- Do name stickers for what was found ("the far stone"), in two or three words.
- Don't hide unfound stickers: the outline is the hint.
