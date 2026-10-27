# Sheet

A sheet of `page` laid on the paper: a deckled edge, the paper's grain, `shadow-page`, held down with washi tape at up to two corners.

**Provide** `<div class="sb-sheet">` with its content. Add tape as the first children: `<span class="sb-tape sb-tape--tl" aria-hidden="true"></span>` (`--tl`, `--tr`, `--bl`, `--br`).

- Padding runs `clamp(1.25rem, 3vw, 2.5rem)`. The edge comes from the `#sb-deckle` filter, which `Storeybrook.init()` (or `ensureDefs()`) puts in the page.
- Comix gives the sheet a square 3px ink border; Origami a crisp edge with a folded corner; Skein silk a sheen and a dashed copper stitch; Ink Blot a plain white sheet.

**Do / Don't**
- Do use a sheet for anything that holds text over washes: a lede, a note, a form.
- Don't nest sheets, and don't tape more than two corners.
