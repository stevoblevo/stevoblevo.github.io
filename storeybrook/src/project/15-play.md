# Play

Storeybrook is for little games as much as for stories. A game keeps its own engine and its own canvas; Storeybrook gives it a cover, a front page, a map, a jar, a book and a look. These patterns come from AND SO 7 and the 99¢ Shelf.

## The cover and the shelf

Every game has a cover (`sb-cover` inside `sb-shelf`): 4:3 art on `surface`, a `display-s` title in the look's display face, one line in the story face, two or three tags, and a price tag hanging from a copper string.

- The shelf scrolls sideways with snap points and sits on a copper board; it never wraps into a grid of identical cards.
- Covers tilt a degree or two (`--tilt`), lift on hover and focus, and scale up 7% when focused at the TV density.
- A new game wears the `sb-cover--new` ribbon (`sap`), one at a time.
- Price tags say "99¢ each". Until a shop exists, the page says "Free to play now" and the cover links straight to the game.

## The front page

A game opens on a page, not a loading screen: the title in `display-xl`, the creature beside it, a one-sentence lede, a primary "Play this one", a secondary "Read it to me", a quiet "Skip the story", and the brook along the bottom showing where a person can go. The game's canvas waits behind the page and is uncovered when they press Play.

## The brook as the map

The brook is the game's level select and its progress bar at once: stones are scenes, modes or mini-games; locked stones say how many nougats open them; the walked trail shows how far a person has come. Open it from a "brook" button or a key, close it with Escape or the same button. A stone walked for the first time drops a nougat.

## The jar as the score

The jar sits in a corner (`sb-jar--fixed`, or the game's own placement) and is the score a person keeps. Nougats fly into it from the thing that earned them, so a person sees what each one was for.

## The book inside the game

Stories open in a reader over the game (`sb-dialog` or a side sheet), with the read-aloud bar. New stories appear in the book as stones are walked ("a new story in the book: The window"). While a story is read aloud, keep the game's music low enough to hear every word.

## Looks on a canvas

A canvas game drawn for a dark night can wear the paper looks without redrawing:

- Draw the world dark; on a paper look, invert its canvas with a CSS filter (`invert(1) hue-rotate(180deg)`), so light becomes ink on paper and colors keep their hue. Ink Blot adds `grayscale(1) contrast(1.6)`; Comix adds saturation.
- Draw paper effects (washes, grain, shadows) on a second canvas over the world, blended `multiply`, so they read as pigment on the page.
- Keep characters on their own canvas, never inverted, so the creature looks the same in every look.
- Turn every panel the game shows (menus, the brook, the book, the jar) into a `data-sb` island in the current look.

## Quiet and loud

- A game should have a quiet mode: every word hidden except music and what someone needs right now. Hints come back for a few seconds when they matter, then fade.
- Loud moments (a chorus finished, a stone opened) are one balloon or one toast, never both.

## Candidate patterns

Shipped once in AND SO 7 and waiting for a second use (see Governance):

- **Guardians.** Small drawn objects, with no labels, that float near the creature and switch a real feature when tapped (an ice cube freezes the chord, a heart turns on the light mood). They arrive from words the game overheard and playfully misheard, can be dragged anywhere, and are flicked off the screen to sleep.
- **Mirror windows.** The game opened inside itself in sandboxed frames shaped like real devices (a phone, a folding phone, a tablet, an e-ink slate, a TV), to show one state in many skins at once.
