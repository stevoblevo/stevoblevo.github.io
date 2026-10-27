# Motion

Paper moves the way paper moves: it turns, folds, peels, drops and settles. Motion in Storeybrook answers something a person did, and shows what changed. Almost nothing moves on its own.

## Durations and easings

| Token | Value | For |
|---|---|---|
| `dur-tap` | 120ms | a press: buttons sink, stones dip |
| `dur-quick` | 220ms | hover, a toggle's thumb, a cover lifting |
| `dur-base` | 420ms | a dialog or toast arriving, a sticker peeling on, the drawer sliding |
| `dur-turn` | 700ms | a page turning, a view folding away, a lock unfolding |
| `dur-drop` | 900ms | a nougat flying to the jar |
| `dur-bleed` | 1600ms | a wash blooming, an ink blot opening |

| Easing | Curve | For |
|---|---|---|
| `ease-out` | `cubic-bezier(0.2, 0.9, 0.3, 1)` | anything arriving |
| `ease-paper` | `cubic-bezier(0.45, 0.05, 0.25, 1)` | anything paper does: turns, folds, the drawer, the bob of the current stone |
| `ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | small objects landing: stones, seals, a toggle's thumb, the jar's bump |

## The moments

- **Page turn** (`Storeybrook.spread`): a leaf rotates over `dur-turn` with `ease-paper`; the new pages appear at the half-way point; a paper rustle plays if sound is on.
- **Fold** (`Storeybrook.fold(host, swap)`): the old view is cut into two halves; the top folds down over the bottom, then the folded sheet drops away, revealing the new view already underneath.
- **Blot** (`Storeybrook.blot(host)`): an ink-blot mask grows from nothing to cover the element over `dur-bleed`. Use it to reveal a new look or a found thing.
- **Nougat drop** (`Storeybrook.rewards.drop(n, {from})`): each nougat arcs from the thing that earned it to the jar, spinning, 140ms apart; the jar bumps as each lands.
- **Unlock**: the lock's striped cover unfolds upward (`dur-turn`), then the sticker peels on (`dur-base`, `ease-bounce`).
- **Bloom**: a wash arrives once, scaling up from 0.82 over `dur-bleed`.

## What moves by itself

Only three things, all slow and small: the current stone bobs 4px over 2.8s, the creature breathes (2.5% over 4.2s) and blinks every 2.6–5.2s, and the brook's glints drift. Nothing else loops. No parallax, no autoplaying carousels, no marquee.

## Reduced motion and Ink Blot

- Under `prefers-reduced-motion: reduce` every animation and transition in the bundle stops: pages cut, folds and blots swap at once, nougats land without flying, locks simply open, the stone and the creature hold still. Hover lifts stop too.
- Every behavior in `bundle.js` checks `Storeybrook.reducedMotion()` when it runs, not once at load, so a person can change the setting mid-visit.
- Ink Blot counts as reduced motion for everyone: e-ink screens cannot show it, and the look is also for people who want none.

## Rules

- One orchestrated moment per screen. If a page turn and a nougat drop would happen together, start the drop when the turn ends (`sb:page` fires then).
- Motion never carries meaning alone: the jar's count changes as each nougat lands, and an unlock's toast names what opened.
- No motion over `dur-bleed`. Anything longer is a scene, and belongs to the game, not the kit.
