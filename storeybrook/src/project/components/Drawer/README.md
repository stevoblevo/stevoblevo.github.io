# Drawer

A side sheet from the right for a book's contents, settings or the album. It slides over a veil, keeps focus inside while open, and gives focus back when it closes.

**Provide** `<aside class="sb-drawer" id="…" aria-hidden="true" aria-labelledby="…">` holding `<div class="sb-drawer__head">` (an `<h2>` and a close button with `data-sb-close`), then an `<ol>` of links or buttons. Open it with `data-sb-open="#id"` or `Storeybrook.drawer.open(el)`.

- `page` with a deckled edge and `shadow-lift`, `min(26rem, 92vw)` wide, sliding in over `dur-base` with `ease-paper`; the veil is `scrim` and closes it on a press.
- Rows are at least `size-target` tall, in the story face; the current one is `cue-soft` (`aria-current="page"`).
- Tab cycles inside it; Escape closes it; Back closes it at the TV density. Fires `sb:drawer` with `{open, id}`.

**Do / Don't**
- Do use it for lists a person picks from: chapters, looks, settings.
- Don't open it by itself; it answers a press.
