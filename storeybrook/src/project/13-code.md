# Code

## Files

| File | What |
|---|---|
| `tokens.css` | every token as a custom property; looks as `[data-theme]` blocks; a class per type style |
| `components/bundle.css` | every component, prefixed `sb-`; the look hooks; reduced-motion, forced-colors and print rules; the Google Fonts import |
| `components/bundle.js` | one classic script, no dependencies, no network: `window.Storeybrook` |
| `components/index.d.ts` | the markup contracts (`<Comp>Props`) and the JS API, as types |

Load them in that order, set `data-theme` on `<html>` (and `class="sb-root"` for the fluid root size), give `<body>` `sb-body sb-no-js`, and call `Storeybrook.init()` at the end of the body.

## Data attributes

| Attribute | On | Does |
|---|---|---|
| `data-theme="<look>"` | `<html>` | the look; `init()` may replace it with `?look=` or the saved look |
| `data-density="regular"`, `"kid"`, `"tv"` | `<html>` | targets, focus rings, story face; `tv` turns on spatial navigation |
| `data-sb-look="<look>"` (+ `aria-disabled`, `data-sb-why`) | a button | switches the look, or explains why it cannot |
| `data-sb-story` | the story's container | what the reader reads when it has no other target |
| `data-sb-read="#id"` | `.sb-reader` | which element this reader reads |
| `data-sb-voice`, `data-sb-rate` | `<select>`s inside a reader | voice and pace pickers, filled and remembered |
| `data-sb-brook='{"stones":[…]}'` | an empty element | draws a brook with those stones (JSON, see `BrookOptions`) |
| `data-sb-creature='{"form":"saelion","stage":3}'` | an empty element | draws the creature, breathing and blinking |
| `data-sb-spread` | `.sb-spread` holding `.sb-page`s | page turns: buttons, arrow keys, swipes |
| `data-sb-open="#id"`, `data-sb-close` | a button; a button inside | opens a `<dialog>` or `.sb-drawer`; closes the one it is in |
| `data-sb-drop="n"` (+ `data-sb-reason`) | a button | drops n nougats into the jar from this button |
| `data-sb-unlock="id"` (+ `data-sb-name`) | a button | unlocks `id` |
| `data-sb-lock="id"` | `.sb-lock` | hidden (unfolding) once `id` is unlocked |
| `data-sb-sticker="id"` | `.sb-sticker` | locked until `id`, then peels on |
| `data-sb-when="id"` | anything | hidden until `id` is unlocked |
| `data-sb-sound` | a button | toggles paper sounds; keeps `aria-pressed` in step |
| `data-sb-nougat="seed"` | an empty `.sb-nougat` | filled with that nougat |
| `data-sb-icon="name"` (+ `data-size`) | an empty element | filled with that icon |
| `data-cap="30"` | `.sb-jar` | how many nougats fill the jar |
| `data-sb-autofocus`, `data-sb-focus` | anything | first stop for arrow keys; makes a non-control reachable by them |
| `class="sb-noread"` | anything | the reader skips it |

## The API

`Storeybrook.init(options)` binds all of the above and returns the API. Underneath:

- `theme`: `list()`, `get()`, `set(id, {persist})`, `cycle(allowed)`, `init({fallback})`
- `density`: `get()`, `set(v)`, `isTV()`, `init()`
- `nav`: `enable()`, `move(dir)`, `back()`, `candidates()`
- `read`: `speak(target, {voice, rate, pitch})`, `pause()`, `resume()`, `toggle(target)`, `stop()`, `bind(bar, target)`, `voices()`, `pick(name)`, `isIrish(voice)`, `supported`, `state`
- `rewards`: `count()`, `set(n)`, `drop(n, {from, to, reason})`, `paint()`
- `unlocks`: `list()`, `has(id)`, `unlock(id, {name, line, toast})`, `lock(id)`, `paint()`; `unlock(id, o)` is also on the root
- `brook(host, {stones, seed, direction, onStep})` → `{set(id, state), layout(), path, length, vertical}`
- `creature(host, {form, stage, mood, hide, blink, idle})` → `{set(o), get(), stop(), stages}`; `creatureSVG(o)` → string
- `spread(host)` → `{next(), prev(), index(), count}`
- `fold(host, swap)` and `blot(host, {duration})` → Promises that settle when the motion ends
- `drawer.open/close(el)`, `dialog.open/close(el)`, `toast(html, {ms})`
- `sound.enable(on)`, `sound.play('stone' | 'nougat' | 'sticker' | 'page')`, `haptic(pattern)`
- `icon(name, size)`, `icons`, `mountIcons(root)`, `nougatSVG(seed)`, `jarSVG(fill)`, `token(name)`, `reducedMotion()`, `ensureDefs()`, `version`

Every function is typed in `index.d.ts`.

## Events

Events arrive on `window` as `sb:<name>` with a `detail`: `ready`, `theme`, `density`, `back`, `read`, `nougat`, `unlock`, `step`, `creature`, `page`, `drawer`, `dialog`, `sound`.

```js
addEventListener('sb:nougat', e => console.log(e.detail.count, e.detail.reason));
```

## Storage

Local storage: `sb:theme`, `sb:density`, `sb:voice`, `sb:rate`, `sb:nougats`, `sb:unlocks`. Session storage: `sb:sound` (this visit only). Every read and write is wrapped: with storage blocked (a private window, an embedded frame) the page works and simply forgets.

## Progressive enhancement

- No JS: `sb-no-js` stays on `<body>`; every story, link and cover still works; looks fall back to the markup's `data-theme`.
- No speech synthesis: the reader disables itself and says so.
- No Web Animations: page turns, folds, blots and drops happen at once.
- No storage: nothing is remembered between visits.
- Old browsers: `color-mix()`, `:is()`, `backdrop-filter`, `inset` and `translate` are used; where missing, surfaces fall back to solid `page` and `chrome`.

## Embedding in another app

A game or a host page that has its own theme uses the embedded export instead of `tokens.css` and `bundle.css`:

- `storeybrook-tokens.css`: every look's tokens keyed on `[data-sb="<look>"]`, so they apply only inside elements that ask for a look.
- `storeybrook.css`: the components with `[data-theme]` rewritten to `[data-sb]` and the font import removed (the host loads fonts).
- `storeybrook.js`: the same bundle.

Put `data-sb="daylight"` (or another look) on any panel and it becomes a Storeybrook page inside the host. AND SO 7 builds this way: `tools/export_andso.py` writes the three files into the game's `vendor/` folder.

## Budgets

- `bundle.js` under 60 KB and `bundle.css` under 56 KB before compression (1.1.0: 59.8 KB and 55.8 KB).
- No network from the bundle; fonts are the largest cost: load only the families a page uses.
- One canvas at most per page belongs to a game, not the kit; the kit draws with SVG and CSS.
