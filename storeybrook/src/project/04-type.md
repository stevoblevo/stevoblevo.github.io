# Type

Storeybrook reads like a picture book: a round, friendly display face for titles, a warm old-style serif for the story, and a typeface drawn for early readers for every control. Each look swaps the display face; the story and the controls stay put unless the look is Comix or Origami.

## Families

| Key (`--font-…`) | Face | Weights | Used for |
|---|---|---|---|
| `display` | DynaPuff (variable, `wdth` 75–100, `wght` 400–700) | 500, 600 | titles in Meta Daylight; covers; dialog titles |
| `story` | Alegreya (variable, roman and italic) | 400, 700 | stories, ledes, the drop cap's look in the old looks |
| `ui` | Andika | 400, 700 | buttons, labels, tabs, counts, the kid density's story text |
| `hand` | Caveat | 500, 600 | margin notes, sticker names, Skein silk's display |
| `old` | IM Fell English | 400, italic | display in Knight Night and Ink Blot |
| `comic` | Bangers | 400 | display and shouts in Comix |
| `comic-text` | Comic Neue | 400, 700 | balloons; all text in Comix |
| `fold` | Zen Maru Gothic | 400, 500, 700 | display and controls in Origami |

All eight are on Google Fonts; `components/bundle.css` imports them in one request. A page that uses one look can load only that look's faces (Meta Daylight needs DynaPuff, Alegreya, Andika and Caveat). Every stack falls back to a system face of the same kind.

## Styles

| Style | Size / leading | Weight | Use |
|---|---|---|---|
| `display-xl` | 112px / 0.92 | 600 | the page's title, once; scale it with `clamp(3rem, 9vw, 7rem)` |
| `display-l` | 72px / 0.95 | 600 | chapter titles; `clamp(2.4rem, 6vw, 4.5rem)` |
| `display-m` | 44px / 1.05 | 500 | section titles, a big cover |
| `display-s` | 28px / 1.1 | 500 | cover titles, dialog titles, the drawer's head |
| `story-lede` | 26px / 1.45 | 400 | the first paragraph of a page (`sb-lede`) |
| `story-body` | 20px / 1.6 | 400 | the story (`sb-prose`) |
| `story-italic` | 20px / 1.6 | 400 italic | thoughts, asides, the think balloon |
| `dropcap` | 96px / 0.8 | 700 | the first letter of a chapter, in `accent`, once |
| `title` | 22px / 1.3 | 700 | a sheet's heading, a setting's name |
| `button` | 18px / 1.2 | 700 | buttons and stones |
| `label` | 16px / 1.4 | 400 | form labels, toggles, slider names |
| `small` | 14px / 1.4 | 400 | credits, footnotes; never for anything a person must act on |
| `count` | 20px / 1 | 700 | numbers that change: the jar, a score; tabular figures |
| `note` | 26px / 1.15 | 500 | the book owner's handwriting |
| `comic-shout` | 64px / 0.95 | 400 | a Comix sound effect |
| `balloon` | 19px / 1.35 | 700 | speech balloons |

The display styles follow the look: a `display-*` class reads `--sb-display`, so `display-xl` is DynaPuff in Meta Daylight, IM Fell English in Knight Night and Bangers in Comix, at the same size.

## Rules

- One `display-xl` per page. Display lines are short (three to five words) and never wrap to more than two lines.
- Story text sits at `size-measure` (60ch) or narrower. Never justify; never set story text in capitals.
- Use `story-italic` for one thought or one aside per page, not for emphasis inside a sentence.
- No all-caps labels and no letter-spaced eyebrows. Comix display is already capitals; nothing else is.
- Numbers that count up (nougats, scores, the reading meter) use `count` or `font-variant-numeric: tabular-nums` so they do not jitter.
- At the kid density (`data-density="kid"`) story text switches to Andika at 1.3–1.6rem: letter shapes drawn for early readers, a single-storey a and g.
- At the TV density the root size grows (see Layout); type is set in rem so it follows.
