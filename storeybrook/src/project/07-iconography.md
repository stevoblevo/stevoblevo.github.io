# Iconography

Storeybrook's pictures are drawn with the same pen: a round 2px line, round ends, very few fills. Three kinds of picture share it: icons, the creature, and the nougat with its jar.

## Icons

Forty-four icons on a 24px grid, `stroke-width` 2, round caps and joins, drawn in `currentColor` so they take the text color they sit in.

| Kind | Icons |
|---|---|
| Reading and playing | `play`, `pause`, `stop`, `voice`, `book`, `music`, `hum` |
| Moving around | `next`, `prev`, `up`, `down`, `home`, `menu`, `close`, `map` |
| Progress and rewards | `lock`, `key`, `check`, `star`, `sparkle`, `nougat`, `jar`, `sticker`, `gift`, `heart`, `egg` |
| The world | `stone`, `brook`, `sun`, `moon`, `leaf`, `bunny`, `eye` |
| The looks | `look`, `ink`, `comix`, `origami`, `skein` (Meta Daylight uses `sun`, Knight Night `moon`) |
| Devices and input | `gamepad`, `tv`, `tap`, `drag` |
| Messages | `info`, `alert` |

- In markup: an empty element with `data-sb-icon="name"` (and `data-size`, default 24) is filled when `Storeybrook.init()` or `Storeybrook.mountIcons()` runs.
- In script: `Storeybrook.icon(name, size)` returns the SVG string; `Storeybrook.icons` lists the names.
- Every icon is `aria-hidden`. A button that is only an icon gets an `aria-label` that says what it does ("Read it to me", "Close the book").
- Sizes: 20px inside stones and small buttons, 24px in buttons, 26px in the reader's play button, 46% of a seal.
- The files in the Icons group are drawn in a fixed mid ink so they read on light and dark here. In pages, use the bundle, which draws in `currentColor`.

## The creature

Saelion is one creature that is a bunny, a tree octopus and a butterfly pixie at once, and it grows. `Storeybrook.creatureSVG({form, stage, mood})` draws it; `Storeybrook.creature(host, opts)` puts it in a host and makes it breathe and blink.

- `form`: `saelion` (all three at once, the default), `bunny`, `octopus`, `pixie`.
- `stage` (Saelion only): 0 `egg`, 1 `kit` (ears), 2 `bun` (two arms), 3 `sprite` (three arms, small wings), 4 `saelion` (five arms, full wings, three stars).
- `mood`: `happy` (default), `sleepy` (eyes shut, no blinking), `surprised` (round mouth).
- Eyes are odd on purpose: one amber (`#e4a623`), one blue (`#3f7fd0`). Fur is `--sbc-fur`, arms `--sbc-arm`; Knight Night warms the fur, Ink Blot draws it in black and white.
- The SVG carries `role="img"` and a label ("Saelion as a sprite").

Rules: one creature per screen, at 120–220px. It reacts (cheers, sleeps, looks surprised); it never blocks content or talks over the story. In a game it may change with time and play (AND SO's grows stranger the deeper the mirror goes); in the kit it stays friendly.

## The nougat and the jar

- `Storeybrook.nougatSVG(seed)` draws a nougat: a `nougat` bar with five `nougat-nut` flecks placed by the seed, twisted `wrapper` ends and an `art-light` glint. Same seed, same nougat.
- `Storeybrook.jarSVG(fill)` draws the jar with its `copper` lid, filled from 0 to 1 with nougat and a wavy `wrapper` line on top.
- Both use the look's inks, so a nougat in Knight Night is the same sweet under candlelight.

## No emoji

Storeybrook never uses emoji in its interface or its stories. If a picture is needed, it is an icon from the set, the creature, a nougat, or a game's own drawing.
