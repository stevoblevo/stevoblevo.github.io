# Looks

A look is a complete material: paper, pigments, inks, fonts, edges and motion. All six fill the same token names, so a page written once renders in any of them. A look changes how things are made, never what is on the page or in what order.

## The six

**Meta Daylight** (`daylight`, the default). Watercolor on north-light paper: pale sage `paper`, quinacridone `rose` accent, cerulean `cue`, DynaPuff display. Use it for landings, shelves, story pages and the brook, and design every page in it first.

**Knight Night** (`knight`). A cobalt paper theatre lit by a candle. `paper` is deep cobalt (#1c2838), ink is warm cream, the accent is `gamboge` (the candle), display type turns to IM Fell English. Washes glow (`screen`) instead of staining. Use it for evenings and bedtime, and as the dark version of any page.

**Ink Blot** (`inkblot`). Black ink on white: every pigment is black, washes become stipple, the brook becomes a dotted ink line, and all motion stops. It is the look for e-ink slates, for printing and for anyone who wants no color and no movement. `line` is a real 4:1 border here.

**Comix** (`comix`). Halftone, panels and speech balloons: 3px ink borders, offset shadows (`4px 4px 0`), magenta `rose`, Bangers for display and Comic Neue for everything else. Use it for loud chapters, title cards and sound effects; it is the one look where an exclamation mark is at home.

**Origami** (`origami`). Folded paper on a green cutting mat: facets instead of washes, dog-eared sheets, vermilion `rose`, indigo `cerulean`, Zen Maru Gothic for display and interface. Stones and seals turn 45°. Use it for making things: editors, level makers, settings.

**Skein silk** (`skein`). Silk, copper thread and lace: blush paper, a `copper` accent, `sap` (the mint cardigan) as the cue, Caveat for display, a dashed copper stitch around every sheet. Use it for the doll's chapters, keepsakes and the sticker album.

## What a look sets

| Hook | Meta Daylight | Knight Night | Ink Blot | Comix | Origami | Skein silk |
|---|---|---|---|---|---|---|
| `--sb-display` | DynaPuff 600 | IM Fell English 400 | IM Fell English 400 | Bangers 400 | Zen Maru Gothic 700 | Caveat 600 |
| `--sb-story` | Alegreya | Alegreya | Alegreya | Comic Neue | Alegreya | Alegreya |
| `--sb-ui` | Andika | Andika | Andika | Comic Neue | Zen Maru Gothic | Andika |
| `accent` | rose | gamboge | black | magenta | vermilion | copper |
| `cue` | cerulean | sky blue | black | cyan blue | indigo | sap |
| motion | on | on | off | on | on | on |

The hooks (`--sb-display`, `--sb-story`, `--sb-ui`, `--sb-hand`, `--sb-display-weight`, `--sb-display-wdth`, `--sb-grain-*`, `--sb-wash-*`, `--sb-sheet-filter`, `--sb-shadow-c`) are set in `components/bundle.css` under `[data-theme]`. Components read the hooks, never a look's name, except where a look truly reshapes a component (Comix borders, Origami's 45° stones).

## Switching looks

- Set `data-theme` on `<html>`. `Storeybrook.theme.set(id)` does that, remembers it (`sb:theme` in local storage) and updates every `[data-sb-look]` button's `aria-pressed`.
- `Storeybrook.init()` picks, in order: a `?look=` in the URL, the remembered look, the `data-theme` already on `<html>`, then `daylight`.
- A look picker is the Looks component: buttons with `data-sb-look="<id>"`, each showing a swatch of that look's paper, two pigments and its display face.
- `Storeybrook.theme.cycle(allowed)` steps through looks (AND SO binds it to a key).

## Looks you earn

A look can wait behind progress. Give its button `aria-disabled="true"` and a `data-sb-why` sentence; pressing it shows the sentence as a toast instead of switching. AND SO 7 opens Meta Daylight at once and the others as nougats gather in the jar (Knight Night at 6, Ink Blot at 10, Comix at 15, Origami at 18, Skein silk at 25), and an "open everything" switch one press away skips the wait. A page that locks a look must already read well in Meta Daylight; never lock the only look a person can read comfortably.

## A look on one panel

The embedded export (`storeybrook-tokens.css`, `storeybrook.css`) keys every token and component on `[data-sb="<look>"]` instead of `[data-theme]`, on any element. A host page keeps its own theme and turns one panel into a Storeybrook page: AND SO's brook map, story reader and jam panel are `data-sb` islands inside a canvas game. Islands inside a dark host take `knight`; inside a light host, `daylight`.
