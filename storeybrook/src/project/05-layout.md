# Layout

A Storeybrook screen is a table with a book on it. The paper fills the screen; content sits on sheets and pages laid on the paper; the brook and the shelf run across it.

## Sizes

| Token | Value | What |
|---|---|---|
| `size-page` | 680px | one book page |
| `size-measure` | 60ch | the longest line of story text |
| `size-reader` | 560px | the read-aloud bar |
| `size-container` | 1280px | the shelf, the brook, a landing's grid |
| `size-cover` | 260px | a cover on the shelf (the shelf's columns run 200px to this) |
| `size-stone` | 56px | a stepping stone |
| `size-jar` | 72px | the nougat jar |
| `size-target` | 48px | the smallest thing a finger presses |
| `size-root` | `clamp(16px, 0.42vw + 10px, 28px)` | the root size; everything in rem follows it |

`size-root` is 16px on a phone and a laptop, about 18px at 1920 CSS pixels (most TVs, including 4K ones, report this), about 21px at 2560 (a 5K display at its default scaling), and 28px, the cap, on a screen running unscaled at 4K or 5K. Put `class="sb-root"` on `<html>` to use it.

## Spacing

`space-1` 4px · `space-2` 8px · `space-3` 12px · `space-4` 16px · `space-5` 24px · `space-6` 32px · `space-7` 48px · `space-8` 72px · `space-9` 112px · `space-10` 168px.

- Inside a sheet or a dialog: `space-5`, growing to `space-6` above 1024px (the components use `clamp()` for this).
- Between blocks on a page: `space-7`. Between chapters or shelf rows: `space-9`.
- Around the brook: at least `space-7` above and `space-8` below (stone labels hang under the stones).

## The page and the spread

- A single page (`sb-page`) is `size-page` wide with padding from `clamp(1.5rem, 4vw, 3.5rem)`; its folio (`sb-page__folio`) sits at the bottom outer corner.
- A spread (`sb-spread`) sets two pages side by side with a gutter shadow down the middle, and shows one page at a time below `bp-expanded` (1024px).
- Text on a page aligns left. Display titles on a landing may sit to one side of the art; never center long text.

## Breakpoints

| Token | Width | Use it for |
|---|---|---|
| `bp-medium` | 640px | the end of phones: two-column grids start, the reader bar stops spanning the screen |
| `bp-expanded` | 1024px | spreads show two pages (built into `sb-spread` and `Storeybrook.spread`); landings go to two columns, story beside art |
| `bp-wide` | 1600px | big laptops and desktop displays: more covers in view, wider margins |
| `bp-tv` | 1800px | big screens; pair it with the TV density |

Custom properties cannot drive media queries, so write the width in the query and name the token in a comment: `@media (min-width: 1024px) /* bp-expanded */`.

## Layers

`z-art` (0, washes and drawings) → `z-content` (10) → `z-stone` (20) → `z-sticky` (40) → `z-reader` (50, the reader bar and the jar) → `z-drawer` (60) → `z-overlay` (1000, dialogs, toasts) → `z-drop` (2000, a nougat in flight passes over everything).

## Landing pattern

The landing of a Storeybrook site or game is one screen, no scrolling needed on a laptop:

```
+------------------------------------------------------------+
|  sky band (wash)                                   sun      |
|  display-xl title                       the creature (art)  |
|  story-lede, two lines                                      |
|  [Play this one]  (Read it to me)  Skip the story           |
|                                                             |
|  ~~~~~ the brook, 4 to 8 stones, labels under them ~~~~~    |
|  meadow band (wash)                                  jar    |
+------------------------------------------------------------+
```

On a phone the art moves above the title and the brook turns vertical (it does this itself when the host is taller than it is wide). On a TV it is the same layout at the TV density.
