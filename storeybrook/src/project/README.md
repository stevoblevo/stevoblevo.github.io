Storeybrook is a light-first kit for storybook pages and little games: watercolor paper, pages that turn, stories read aloud, a brook of stepping stones to walk, nougats that fly into a jar, and a creature that grows. It is the daylight counterpart to Depthfield. Where Depthfield is a dark scene with a quiet HUD, Storeybrook is a book on a table with a game folded inside it.

The system has six looks (Meta Daylight, Knight Night, Ink Blot, Comix, Origami, Skein silk), one set of token names that every look fills, twenty-eight components with live previews, a behavior bundle (`window.Storeybrook`), drawn icons, the creature and the nougat as art, and the rules below. This page is the short version. The sections after it go deep: paper, looks, color, type, layout, motion, iconography, writing, sound and reading aloud, rewards and progression, devices, accessibility, code, governance, and play.

## Principles

- **Paper first.** Every surface is a material. The page is `paper`; a card, a dialog or a book page is a sheet of `page` laid on it, deckled, taped or sealed; color arrives as washes that bleed. No flat floating boxes, no glass, no gradients that are not pigment.
- **One accent per page.** `accent` marks the one thing to do now: the primary button, the current stone, the drop cap, the open tab. If two things are `accent`, one is wrong.
- **The brook is the cue.** `cue` is the color of the path through the page: links, the word being read aloud, the walked trail, a switched-on toggle, every "tap" or "say it" hint. Never put `cue` and `accent` on the same control.
- **The story leads; the game lives inside it.** Text is set to be read, in `story-body` at a reading measure. A game is a stone on the brook or a cover on the shelf, never a modal that interrupts the page.
- **Rewards are gifts, not prices.** Nougats are never spent, never lost and never sold. A lock always says why it is shut and how to open it. No timers, no streaks to break, no "only today".
- **Read it to me.** Every page can be read aloud, an Irish English voice first when the device has one, with the words lighting as they are read. With no voices the words are all still there.
- **Six looks, one page.** A look changes materials and fonts, never content, order or meaning. Check a page in Meta Daylight first, then Knight Night, then Ink Blot (e-ink and print), then the rest.
- **Across the room.** The same page works on a phone, an e-ink slate and a 75-inch TV: `data-density="tv"` raises targets to 64px and focus rings to 5px, and the arrow keys, a remote and a gamepad all move focus.
- **Quiet until asked.** Sound is off until a person turns it on, and stays on for that visit only. Nothing needs a camera, a microphone or motion sensors.

## Voice

- Narration is past tense and plain: "The brook went on without asking, so Dora went with it." Instructions are present tense and short.
- Sentence case everywhere. Inside a game the game's own voice may be lower case (AND SO speaks in lower case); the chrome around it does not.
- Calls to action are verbs that say what happens: "Play this one", "Read it to me", "Skip the story", "Walk to the next stone", "Open the jar".
- No exclamation marks outside Comix balloons and sound effects. No emoji: Storeybrook draws its own icons.
- A lock says why and how in one breath: "Walk two more stones to open Origami."
- Prices are honest: "99¢ each" on the tag, "Free to play now" until a shop exists.

## Start here

Load `tokens.css`, `components/bundle.css` and `components/bundle.js`; set the look on `<html>`, give `<body>` `sb-body sb-no-js`, and call `Storeybrook.init()` at the end of the body:

```html
<!doctype html>
<html lang="en" data-theme="daylight" class="sb-root">
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="components/bundle.css">
</head>
<body class="sb-body sb-no-js">
  <div class="sb-washes" aria-hidden="true">
    <i class="sb-wash sb-wash--sky sb-wash--band" style="top:-14%;--h:34%"></i>
    <i class="sb-sun" style="--w:12%;right:4%;top:2%"></i>
  </div>
  <main>
    <h1 class="display-xl">Little games</h1>
    <p class="sb-lede">The brook went on without asking, so Dora went with it.</p>
    <button class="sb-btn sb-btn--primary sb-btn--lg">Play this one</button>
    <div class="sb-reader" data-sb-read="#story">
      <button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>
      <div class="sb-reader__info"><span class="sb-reader__title">The octopus who learned to be a bunny</span>
        <span class="sb-reader__voice"></span><span class="sb-reader__meter"><i></i></span></div>
    </div>
    <article id="story" class="sb-page sb-prose" data-sb-story><p>Once the octopus had learned to be a bunny…</p></article>
  </main>
  <button class="sb-jar sb-jar--fixed" data-cap="30"></button>
  <script src="components/bundle.js"></script>
  <script>Storeybrook.init();</script>
</body>
</html>
```

| Look (`data-theme`) | Name | Material | Use for |
|---|---|---|---|
| `daylight` | Meta Daylight | watercolor on north-light paper | the default: landings, shelves, story pages, the brook |
| `knight` | Knight Night | a cobalt paper theatre by candle | evenings, bedtime stories, the same pages after dark |
| `inkblot` | Ink Blot | black ink, e-ink and print | e-ink slates, printing, anyone who wants no color and no motion |
| `comix` | Comix | halftone, panels and balloons | loud chapters, sound effects, a game's title card |
| `origami` | Origami | folded paper on a cutting mat | making and building: editors, level makers, settings |
| `skein` | Skein silk | silk, copper thread and lace | the doll's chapters, keepsakes, the album |

## Color

- Ground everything on `paper`. Step up to `surface` for bands and tracks, `page` for anything laid on the paper (book pages, covers, dialogs, the drawer), `chrome` for fixed bars.
- Text: `ink` for story and display, `ink-muted` for captions, credits and the small print, on `paper`, `surface`, `page` and `scrim` in every look.
- `accent` is the one accent, with `on-accent` for labels on it and `accent-soft` behind accent text. It aliases a pigment per look: `rose` in Meta Daylight, `gamboge` (candle) in Knight Night, `copper` in Skein silk.
- `cue` is the brook: links (`link` aliases it, with a wavy underline), the read-aloud highlight (`cue-soft` with a `cue` edge), switched-on toggles, the walked trail.
- Washes (`wash-sky`, `wash-meadow`, `wash-rose`, `wash-sun`, `wash-brook`) are decoration. Never set small text straight on a wash; put it on a `page` sheet or a `scrim`.
- Drawings use the art inks: `art-line` for every outline, `art-light` for catchlights, `art-shade` for shadows, `art-stone` and `art-water` for the brook's stones and water.
- `gamboge` is a fill and a mark (suns, stars, nougat glints, the Comix shout), not text on light papers.
- `danger` is errors only, always with a word or icon. Tags (`tag-sun`, `tag-rose`, `tag-lilac`, `tag-sea`, `tag-sky`) carry a dot and a word, never color alone.

## Type

- Load from Google Fonts: DynaPuff (display), Alegreya (story), Andika (interface), Caveat (handwritten notes), and per look IM Fell English (Knight Night and Ink Blot display), Bangers and Comic Neue (Comix), Zen Maru Gothic (Origami). `components/bundle.css` imports them all; a page that needs one look loads only its families.
- `display-xl` once per page, for the title. `display-l` for chapter titles, `display-m` and `display-s` for covers and dialogs. Display faces follow the look through `--sb-display`.
- Stories are `story-body` (20px, 1.6) at `size-measure` (60ch); `story-lede` opens a page; `dropcap` opens a chapter, once.
- Interface text is Andika: `title`, `button`, `label`, `small`, `count` (tabular, for the jar). Andika was drawn for children learning to read, so it also carries the kid density.
- `note` (Caveat) is the hand of the person who owns the book: margin notes, a sticker's name, "try the far stone!". One per view.

## Layout and space

- A page is `size-page` (680px) wide; a spread is two pages with the gutter shadow, one page below `bp-expanded` (1024px). The shelf and the brook run up to `size-container` (1280px).
- Spacing steps run `space-1` (4px) to `space-10` (168px). Use `space-5` inside sheets, `space-7` between blocks, `space-9` between chapters.
- `size-root` scales the root size with the viewport: 16px on phones and laptops, about 18px at 1920 CSS pixels, about 21px at 2560, capped at 28px on an unscaled 4K or 5K screen. Everything set in rem grows with it; the TV density does the rest.
- Layers: `z-art` → `z-content` → `z-stone` → `z-sticky` → `z-reader` → `z-drawer` → `z-overlay` → `z-drop` (a nougat in flight passes over everything).

## Motion

- `dur-tap` (press), `dur-quick` (hover, toggles), `dur-base` (dialogs, toasts, a sticker peeling on), `dur-turn` (page turns, folds, a lock unfolding), `dur-drop` (a nougat's flight), `dur-bleed` (a wash blooming, a blot opening). Easings: `ease-out` for arrivals, `ease-paper` for anything paper does, `ease-bounce` for stones and seals.
- Motion answers a person: a page turns because they turned it, a nougat flies because they earned it. The only things that move on their own are the current stone (a slow bob), the creature (breathing and blinking) and the brook's glints.
- `prefers-reduced-motion: reduce` turns every animation off: pages cut, nougats land at once, locks simply open. Ink Blot turns motion off for everyone, because e-ink cannot show it.

## States and accessibility

- Focus is a `border-focus` (3px) ring in `focus` at `border-focus-offset`, 5px and 5px at the TV density; never removed.
- Targets are `size-target` (48px), 56px at the kid density and 64px on a TV.
- Hover lifts by a pixel; pressed sinks by one; disabled dims to `op-disabled` and says why nearby.
- Every page reads with JS off: `sb-no-js` keeps the story, the stones are links, the reader explains itself.
- Locks, stones and stickers name their state in words ("locked", "walked", "you are here"), not by color.

## Imagery

- Watercolor and ink, drawn: the creature, the nougat, stones, covers made of washes. Covers may hold a game's own art on `surface`.
- No photographs of people, no stock illustration, no emoji, no gradients that are not pigment.

## Iconography

- Use the Storeybrook set (Icons): 24px grid, 2px round strokes, drawn in `currentColor`. In code call `Storeybrook.icon(name, size)` or put `data-sb-icon="name"` on an empty element.
- The creature (Creature) and the nougat and jar (Nougat) are drawn by the bundle (`creatureSVG`, `nougatSVG`, `jarSVG`) so they take the look's inks. The files here are Meta Daylight renders for reference.
- Storeybrook has no mark yet: set its name in `display-l`.
