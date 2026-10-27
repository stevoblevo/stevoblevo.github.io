# Spread

Two pages open like a book, with a gutter shadow down the middle; pages turn with a leaf. Below `bp-expanded` (1024px) it shows one page at a time.

**Provide** `<div class="sb-spread" data-sb-spread>` holding the book's `<article class="sb-page">`s in order. `Storeybrook.init()` (or `Storeybrook.spread(host)`) adds a turn button down each outer edge (18% wide, labelled "Previous page" and "Next page"), turns on ←/→ and Page Up/Page Down while the spread has focus, turns on a 50px swipe, and fires `sb:page` with `{index, count}`.

- A turn flips a leaf over `dur-turn` with `ease-paper`; the new pages show at the half-way point; a paper rustle plays if sound is on. Reduced motion cuts straight to the new pages.
- `spread(host)` returns `{next(), prev(), index(), count}`.

**Do / Don't**
- Do give each page a folio, and the first page a title.
- Don't turn pages by themselves; a turn always answers a press, a key or a swipe.
