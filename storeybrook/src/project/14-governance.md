# Governance

## Versions

Storeybrook is versioned as a whole: `tokens.json` carries the major version (1), `Storeybrook.version` the full one (1.1.0).

- **Major**: a token, class, data attribute or API renamed or removed; a behavior that changes what a page does; a look removed.
- **Minor**: new tokens, components, icons, looks, densities or options.
- **Patch**: values tuned, bugs fixed, wording.

## 1.1.0

- Creature: a `hide` option. `chimera` gives Saelion a coat split down her middle, warm on the left and cool on the right like her eyes, with patches in the tag colors that drift slowly; ink blots in Ink Blot; none in Knight Night, where she glows instead. Shipped first in AND SO 7's light looks (the pet in the game and on the landing), then on the 99¢ Shelf's AND SO cover.
- Brook: a locked stone dims its face (paler, dashed) instead of fading as a whole, so its label and its reason stay readable in every look. `op-disabled` is for disabled controls only.

## 1.0.0

- Six looks (Meta Daylight, Knight Night, Ink Blot, Comix, Origami, Skein silk) over fifty color tokens, measured: 176 contrast pairs, none below its floor.
- Eight font families and sixteen type styles; spacing, radius, shadow, z-index, duration, easing, breakpoint, size, opacity, border, shape, density and texture families.
- Twenty-eight components, the behavior bundle (theme, density, spatial navigation, reading aloud, rewards, unlocks, brook, creature, spread, fold, blot, drawer, dialog, toast, sound, haptics, icons), forty-four icons, the creature in five stages and four forms, the nougat and the jar.
- Shipped first in: AND SO 7 · Everfallen (the brook map, the story reader, the jar, the looks, the landing) and the 99¢ Shelf (covers, price tags, the TV density), October 2026.

## How a pattern gets in

1. It ships first, in a real page or game.
2. It is used a second time somewhere else, or asked for twice.
3. It is written down here with exact values from the page that shipped it, a preview, a README and its accessibility notes, and measured in all six looks.
4. Its tokens, classes and API are named for what they do, not where they came from.

Waiting at step 2: AND SO's overhearing guardians (drawn objects that switch a feature on when tapped), its recursive mirror windows, and its quiet mode (all words hidden but music).

## Rules for every page

- One `display-xl`, one `accent`, one creature, one handwritten note per view.
- Meta Daylight first, then Knight Night, then Ink Blot; then the rest.
- Every lock says how to open it; nothing costs nougats; nothing is lost.
- Sound off until asked; no camera, microphone or sensors from the kit.
- Every control a real button or link with a name; every page readable without the bundle.
- Contrast pairs from the Color table; nothing new below 4.5:1.
- Reduced motion checked; the TV density checked with arrow keys only.

## Where it lives

- This design system is the reference: tokens, components, previews and these rules.
- The public kit is served from GitHub Pages at `stevoblevo.github.io/storeybrook/`: the files, the docs as pages, and a live sample in every look. It lives in its own folder so it can move to a repository of its own later with its history intact.
- It goes to saelion.co only with the owner's go-ahead, as a static folder beside the other ways in.

## Known gaps

- Fonts are hosted by Google; a page that cannot load them falls back to system faces of the same kind (rounded sans, old-style serif, cursive).
- The Irish voice exists only where the device has one; the reader names the voice it uses.
- Knight Night, Comix, Origami and Skein silk were drawn for this kit and first shipped in AND SO 7; tune them as more pages ship in them.
- The creature's blink reads `dur-wink`, which is not a token yet (it falls back to 150ms).
- Page turns and folds use the Web Animations API; without it they cut.
- `forced-colors` keeps controls usable but drops washes and the brook's paint; a brook in high-contrast mode is its stones and labels only.
