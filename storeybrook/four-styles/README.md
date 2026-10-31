# Four styles · same heart

A small, reusable presentation layer for **Gen 4**, **Gen 2**, **Skeptic** and **Semiotic strict**. One semantic DOM, four visual languages. A style change preserves the story, note, bookmark, current artwork view, focused control and scroll position. It does not reload, route, send a message or assert a verified outcome.

- **Gen 4:** Depthfield scene materials, cinematic type and one warm accent.
- **Gen 2:** Storeybrook paper, expressive story typography and a garden accent.
- **Skeptic:** monochrome materials, annotations and explicit questions about evidence, uncertainty and the next check.
- **Semiotic strict:** flat materials and fewer visible words, with accessible names and a reversible Words control. Symbols are not assumed to be universally understood.

The source illustration supplies the art language; it does not establish scientific, safety or outcome claims. No attached artwork is included in this public package. The demo opens with an honest local-art chooser until an authorized asset map is supplied. `manifest.example.json` deliberately has null URLs and source fields.

## Reuse

Load the scoped Depthfield adapter, existing Storeybrook tokens, and this CSS:

```html
<link rel="stylesheet" href="vendor/depthfield-tokens.css">
<link rel="stylesheet" href="../dist/embed/storeybrook-tokens.css">
<link rel="stylesheet" href="four-styles.css">
<script src="../dist/embed/storeybrook.js"></script>
```

Use `index.html` as the markup contract: a `[data-four-styles]` root containing the four `[data-fs-mode]` buttons, artwork/fallback nodes and optional settings controls. It is a standalone example, not a new application framework. Give each embedded instance a distinct storage key.

```js
import { mount } from './four-styles.js';
const controller = mount(document.querySelector('[data-four-styles]'), {
  storeybrook: window.Storeybrook,
  assets: approvedAssetMap, // { gen4: { scene, keyframes, symbols, column }, ... }
  storageKey: 'my-story.four-styles.preferences.v1'
});
controller.setStyle('skeptic');
controller.getState();
controller.setAssets(anotherApprovedMap);
// controller.destroy() removes the component's listeners and owned object URLs.
```

URLs must be on the page's origin, or local blob URLs selected by the person. The map contains no text or HTML to inject. Controls remain real buttons, inputs and links. Semantic story content belongs to the host page; the toolkit never rewrites it. `fourstyles:change` emits the style, appearance choice and artwork view for host integrations. `semantics.json` records the demo's shared content and intended uses.

Use one page-level controller for the included demo. The shared Storeybrook navigation candidate API supplies focus semantics. Its spatial-scoring and gamepad mapping are adapted into this component's own input scope, with native summaries, modal containment, reversible Back and dynamic Quiet/reduced-motion behavior. The shared vendor bundle is not modified or globally overridden.

## Choices and accessibility

- Appearance is independent of visual style: system, light or dark. A changing system preference is observed during the visit.
- Persistence is opt-in. Only style/appearance/control preferences are saved under this package's own key. Turning Remember off removes that key. Notes, bookmarks and local file selections remain visit-only.
- Quiet and OS reduced motion suppress transitions and cancel active motion. No sound starts. No sensor, microphone or camera is requested.
- Regular targets are at least 48px. Across the room sets 64px targets and 5px focus rings.
- Tab and native Enter/Space work throughout. Left/right and Home/End select styles when a style button is focused. In TV mode, D-pad/left-stick move, A activates and B returns; Escape/Back closes the focused disclosure before its dialog.
- Semiotic strict hides optional copy with opacity, preserving both layout and accessible text. Words restores it. Required control labels remain visible. No state depends on color alone.
- No JavaScript still leaves readable semantic content and a clear explanation. Missing artwork keeps a stable frame and a retry/file-selection path.

## Artwork and private preview

A local crop pack uses `gen4-scene.png`, `gen2-scene.png`, `skeptic-scene.png`, `semiotic-scene.png`, plus matching `-keyframes`, `-symbols` and `-column` files. Select them with Choose crop files; object URLs remain in this browser and are never uploaded. Refresh restores remembered preferences, not the browser's private file selection.

For a self-contained private preview, provide the separate crop manifest and an empty destination outside the source checkout:

```sh
python3 scripts/prepare_local_demo.py --manifest /private/crops/manifest.private.json --output /private/preview
python3 -m http.server 4332 --bind 127.0.0.1 --directory /private/preview
# Open http://127.0.0.1:4332/storeybrook/four-styles/
```

The preparation script verifies every crop SHA-256, copies the current package and its existing Storeybrook dependencies, and writes a private `demo-assets.js` map. It never edits the checkout or uploads anything. The source enlargement adds pixels, not recovered detail; crop provenance must distinguish those facts.

Before public activation, approve the exact image/derivative scope, select public asset URLs, populate a reviewed map and provenance manifest, and complete browser acceptance. Do not copy the private pack or Library identifiers into GitHub. A code-only PR does not authorize image publication. Do not merge or change the existing cockpit as part of this package.

## Lineage

- Storeybrook tokens, icons and navigation: existing `storeybrook/dist/embed/` at repository base `a283e581fcc9be3da84e1d59789cc4e0bfa5dee8`.
- Depthfield token values: [`project/tokens.css` at 41eac2256b994b8830f2255d5ab95a81d502bb26](https://github.com/stevoblevo/depthfield/blob/41eac2256b994b8830f2255d5ab95a81d502bb26/project/tokens.css). The adapter changes selectors to opt-in `data-df` and omits unrelated global typography helper classes; token values stay unchanged.
- Both systems' existing principles govern: art leads, one accent, sparse language, reversible movement, conventional input, quiet and reduced motion.
- No new dependency, backend, account, paid service, workflow or deployment is introduced.

## Verification

```sh
node storeybrook/four-styles/four-styles.test.mjs
```

The tests exercise actual controller code with a small DOM harness: four modes, semantic state/focus/position retention, keyboard switching, opt-in persistence and storage failure, independent/changing theme and motion preferences, stale-image callbacks, retry, asset URL restrictions, source links and the public asset boundary. They are not a substitute for browser or physical-device acceptance. See `REVIEW.md` for the delivered candidate's actual verification and remaining limitations.
