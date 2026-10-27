# Storeybrook

A light-first kit for storybook pages and little games: watercolor paper, pages that turn, stories read aloud, a brook of stepping stones to walk, nougats that fly into a jar, and a creature that grows. Six looks (Meta Daylight, Knight Night, Ink Blot, Comix, Origami, Skein silk) fill one set of token names, so a page written once renders in any of them. It is the daylight counterpart to Depthfield.

Live: https://stevoblevo.github.io/storeybrook/ (the rules, every component live, and the files).

## Use it

```html
<html lang="en" data-theme="daylight" class="sb-root">
<link rel="stylesheet" href="dist/tokens.css">
<link rel="stylesheet" href="dist/components/bundle.css">
<body class="sb-body sb-no-js">
  …
  <script src="dist/components/bundle.js"></script>
  <script>Storeybrook.init();</script>
</body>
```

| File | What |
|---|---|
| `dist/tokens.css` | every token as a custom property; looks as `[data-theme]` blocks; a class per type style |
| `dist/components/bundle.css` | every component, prefixed `sb-`; the look hooks; the Google Fonts import |
| `dist/components/bundle.js` | one classic script, no dependencies, no network: `window.Storeybrook` |
| `dist/components/index.d.ts` | the markup contracts and the API, as types |
| `dist/tokens.json` | the tokens as data |
| `dist/embed/` | the same kit keyed on `[data-sb="<look>"]`, for a host page or game with its own theme (AND SO uses this) |

The rules are in `src/project/README.md` and the numbered chapters beside it, and on the site under Rules.

## Source

- `src/project/` is the design system itself: `tokens.json`, the brand book (`README.md` and fifteen chapters), `components/<Name>/README.md` and `preview.html` for twenty-eight components, the bundle, the types, and the icon, creature and nougat art under `assets/`.
- `src/tools/` builds everything from it:

| Script | Does |
|---|---|
| `build_tokens.py` | writes `src/project/tokens.json` from one table of values, then audits contrast in every look (`contrast.json`) |
| `ds_components.py` | writes every component's README and live preview |
| `ds_assets.py` | writes the icon SVGs and bakes the creature, nougat and jar art (Playwright) |
| `ds_check.py` | renders every preview in the looks given, the way the design-system page frames them (Playwright) |
| `build_site.py` | builds this site: `dist/`, `docs/`, `components/`, `index.html` |
| `export_andso.py` | writes the embedded copy for a host, e.g. `python3 storeybrook/src/tools/export_andso.py _src/and-so/vendor` |

Run them from the repository root, in that order after a change: tokens, components, assets, site, export.

## Its own repository, later

The folder is self-contained: every path inside it is relative. `git subtree split --prefix storeybrook -b storeybrook` makes a branch with its history that can be pushed to a repository of its own. Only the footer's links back to the other games point outside the folder.
