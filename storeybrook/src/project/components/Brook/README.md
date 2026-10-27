# Brook

The map of a game: a meandering watercolor brook with stepping stones that are scenes, chapters or mini-games. Each stone is open, current, walked or locked.

**Provide** an empty block with a height (it fills its width) and draw it with `Storeybrook.brook(host, options)`, or write the options as JSON in `data-sb-brook` and let `init()` draw it:

```html
<div style="height:320px" data-sb-brook='{"stones":[
  {"id":"porch","label":"The porch","sub":"walked","state":"done"},
  {"id":"doll","label":"Wake the doll","sub":"you are here","state":"current","mark":"2"},
  {"id":"origami","label":"Origami","sub":"2 more","state":"locked","why":"Origami opens at 18 nougats."}]}'></div>
```

A stone: `id`, `label`, `sub` (a second line), `state` (`open`, `current`, `done`, `locked`), `mark` (one character on the stone, default its number), `href` (makes it a link), `why` (the toast for a locked stone). Options: `seed` (the brook's meander), `direction` (`"down"` for a vertical brook; by default it turns vertical when the host is taller than it is wide), `onStep(stone, index, event)`.

- The brook is drawn in four strokes: a broad `wash-brook` wash, a deeper core, drifting `art-light` glints, and a dotted `cue` trail; the trail behind the last current or walked stone is drawn solid as the walked path.
- Stones are buttons (or links) with names that include their state ("Wake the doll, you are here"). A locked stone shows the lock on a paler, dashed face and toasts its `why`; its label never dims, so its name and reason stay readable; a walked stone shows a check in `sap`; the current stone has an `accent` halo and bobs.
- It redraws itself when its host changes size. `brook.set(id, state)` changes one stone.

**Do / Don't**
- Do keep labels to two or three words, with the detail in `sub`.
- Do keep four to eight stones in view; a longer journey scrolls or pages.
- Don't make the brook the only way to a chapter: keep a plain list of links for no-JS and for screen readers who prefer it.
