# Color

Storeybrook's colors are pigments on paper. Every look fills the same fifty names; components only ever name roles (`ink`, `accent`, `cue`…) or pigments (`rose`, `cerulean`…), never a hex.

## Roles

| Role | What it is for | Pairs with |
|---|---|---|
| `paper`, `surface`, `page` | the three grounds (see Paper) | text in `ink`, `ink-muted` |
| `line` | pencil lines: dividers, quiet outlines, empty sticker slots | decorative except in Ink Blot and Comix, where it is a real border |
| `ink` | story text, display type, every label | `paper`, `surface`, `page`, `scrim`, `cue-soft` |
| `ink-muted` | captions, credits, hints, the price tag's small print | the same grounds |
| `accent`, `accent-soft`, `on-accent` | the one thing to do now | `on-accent` on `accent`; `accent` text on `accent-soft` |
| `cue`, `cue-soft`, `on-cue` | the brook: links, read-aloud, walked paths, switched-on toggles, hints | `ink` on `cue-soft`; `on-cue` on `cue` |
| `link` | inline links (alias of `cue`), wavy underline | grounds |
| `danger` | errors only, with a word or icon | grounds |
| `focus` | the focus ring | 3:1 or more on every ground |
| `scrim`, `chrome` | veils behind dialogs; fixed bars | `ink` on both |

## Pigments

Five pigments, each with a `-soft` tint and an `on-` label color: `rose` (quinacridone), `cerulean`, `sap` (sap green: growth, success, the walked stone), `gamboge` (new gamboge: sun, stars, nougat glints, the candle), `copper` (thread, the shelf's board, Skein silk's accent). A look aliases `accent` and `cue` to two of them.

## Washes and art

- Washes: `wash-sky`, `wash-meadow`, `wash-rose`, `wash-sun`, `wash-brook`. Decorative; text sits on a sheet or `scrim`, never straight on a wash, except display type 24px and up in `ink` (6.8:1 or better on every wash in Meta Daylight).
- Art inks: `art-line` (every outline), `art-light` (catchlights), `art-shade` (shadows, a stone's underside), `art-stone`, `art-water`.
- The nougat: `nougat`, `nougat-nut`, `wrapper`.
- Tags: `tag-sun`, `tag-rose`, `tag-lilac`, `tag-sea`, `tag-sky`; text and dot in the tag color on `page`, fill at 12%. A tag is always a word, never a bare dot.

## Contrast

Every text pair below was measured in every look (176 checks, all passing). The lowest ratio per look:

| Pair | Daylight | Knight | Ink Blot | Comix | Origami | Skein |
|---|---|---|---|---|---|---|
| `ink` on grounds | 11.1 | 10.0 | 18.4 | 17.0 | 11.5 | 11.2 |
| `ink-muted` on grounds | 5.4 | 6.4 | 9.5 | 10.2 | 5.7 | 5.7 |
| `accent` on grounds | 4.9 | 7.1 | 18.4 | 5.2 | 4.7 | 4.7 |
| `cue` / `link` on grounds | 4.9 | 5.4 | 18.4 | 5.6 | 6.7 | 4.8 |
| `danger` on grounds | 5.6 | 5.0 | 18.4 | 5.6 | 5.2 | 5.8 |
| `accent` on `accent-soft` | 4.6 | 5.5 | 16.8 | 4.8 | 4.5 | 4.6 |
| `ink` on `cue-soft` (word being read) | 10.6 | 8.3 | 16.8 | 16.2 | 10.9 | 11.0 |
| `on-accent` on `accent` | 5.7 | 9.2 | 21.0 | 5.8 | 6.0 | 6.0 |
| `on-cue` on `cue` | 5.8 | 7.0 | 21.0 | 6.2 | 8.5 | 6.2 |
| `ink` on `scrim` over washes | 11.1 | 11.3 | 20.3 | 17.1 | 11.8 | 11.8 |
| `focus` ring on grounds (3:1) | 4.9 | 7.1 | 18.4 | 17.0 | 6.7 | 5.8 |
| tags on grounds (lowest of five) | 4.9 | 5.4 | 18.4 | 5.5 | 4.7 | 4.8 |

"Grounds" means `paper`, `surface` and `page`, all three. `on-gamboge` on `gamboge` is 4.9:1 in Meta Daylight and Skein silk, more elsewhere.

## Rules

- Never use `gamboge` as text on a light paper (2.2:1 on Meta Daylight's grounds, 1.3:1 in Comix). It is a fill and a mark, and its labels use `on-gamboge`.
- `line` is about 1.4:1 in the light looks: a control is never told apart by `line` alone. Give it an `ink` border, a fill, or a shadow (`shadow-sticker`).
- `accent` and `cue` never meet on one control. A switched-on toggle is `cue`; the button that confirms is `accent`.
- Status is a word or an icon first: a locked stone says "locked" and shows the lock; a walked one shows a check in `sap`.
- When you need a new color, take it from the five pigments' soft tints. If it truly is new, add it to every look in `tokens.json`, measure it, and add it to this table.
