# Paper

Storeybrook is made of materials, not boxes. Every component is one of five things: the paper itself, a sheet laid on it, a wash of pigment, a drawing in ink, or a small object (tape, a seal, a stone, a nougat). Pick the material first; the component follows.

## The three grounds

| Token | Material | Holds |
|---|---|---|
| `paper` | the table-sized sheet the whole page is painted on | washes, the brook, the shelf, display type |
| `surface` | one step off the paper | bands, tracks (the reader's meter, a toggle's track), a caption's label, a cover's art well |
| `page` | a sheet laid on the paper | book pages, covers, dialogs, the drawer, stickers' backing |

`page` never floats as a plain rectangle. It arrives as `sb-sheet`, `sb-page`, `sb-dialog` or `sb-drawer`, each of which draws its edge through the deckle filter (`#sb-deckle`, displacement `tex-deckle`), carries `shadow-page`, and lays the grain over itself.

## Grain and fibre

- `sb-body` lays a fixed grain over the whole page: an SVG fractal noise tile at `tex-grain-size` (160px), at `op-grain` (0.2), blended `multiply`. Knight Night blends it `soft-light` at 0.5 (candle grain on dark paper); Ink Blot turns it off (e-ink shows noise as dirt).
- `sb-grain` puts the same grain on any one element (a cover's art, a band).
- `sb-page` adds long paper fibres (`--sb-fibre-img`, 420px) at a quarter of the grain's strength.

## Washes

Watercolor is the only way color arrives in a large field. A wash is an `<i class="sb-wash">` inside an absolutely placed `sb-washes` layer behind the content.

- Five pigments: `sb-wash--sky`, `--meadow`, `--rose`, `--sun`, `--brook` (the tokens `wash-sky` … `wash-brook`).
- Size and shape: `--w` (width, default 40%) and `--ar` (aspect, 1.35), always `shape-blob`; `sb-wash--band` makes a full-width band (`--h` its height) for skies and meadows.
- Each wash is a radial pool that is darker at its rim (pigment collects where water dries), granulated by the grain, bled through `#sb-bleed` (displacement `tex-bleed`), at `op-wash`, blended `multiply` so overlaps mix like real glazes.
- `sb-bloom` lets a wash arrive over `dur-bleed` with `ease-out`, once.
- `sb-sun` is paper left unpainted with a `wash-sun` halo: the sun is the absence of paint.

Rules: no more than five washes on a screen; one band at the top (sky) and one at the foot (meadow) at most; never set text straight on a wash without a sheet or `scrim`.

## How each look translates the materials

| Material | Meta Daylight | Knight Night | Ink Blot | Comix | Origami | Skein silk |
|---|---|---|---|---|---|---|
| Wash | watercolor glaze | glaze lit from behind (`screen`) | stipple dots, 7px pitch | halftone at `tex-halftone` | a folded facet, two tones | watercolor, stronger grain |
| Sheet edge | deckled | deckled, candle shadow | hairline black | 3px ink border, square | crisp, dog-eared corner | silk sheen with a dashed copper stitch |
| Grain | multiply 0.2 | soft-light 0.5 | none | 0.18 | 0.22, cutting-mat grid under it | 0.28 |
| Sun | unpainted paper | a candle disc | a ring | a gamboge disc with an ink rim | (as daylight) | (as daylight) |

## Small objects

- **Tape** (`sb-tape`, `--tl`, `--tr`, `--bl`, `--br`): striped `wash-sun` and `wash-rose` washi holding a sheet's corner. Two corners at most.
- **Seal** (`sb-seal`): a wax seal in `accent` for the one irreversible or important press: begin, sign, keep.
- **Stone** (`sb-stone`): a stepping stone on the brook, `shape-stone`, `art-stone` top, `art-shade` underside.
- **Nougat** (`sb-nougat`): the reward, wrapped in `wrapper`, flecked with `nougat-nut`.
