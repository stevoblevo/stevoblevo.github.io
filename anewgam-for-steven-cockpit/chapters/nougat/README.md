# Anewgam — The Nougat Thread

Candidate checkpoint `ANEWGAM-NOUGAT-20260919-01`. An optional playable chapter in the existing product repository, not a replacement cockpit, bot, dispatcher, authority source, or deployment.

## Play

The Princess can mend a stair, wake lanterns, and leave a nougat. At least one real scene path must exist before she passes the thread. The Knight then inherits exactly those earlier choices, crosses by the path actually available, and reaches either a shared-nougat ending or a kept-place ending. Undo, bounded import/export, and explicit Keep are implemented. There are 58 reachable action-history prefixes; the story is intentionally small and finite, not a claim of a fully generative world.

`preview.html` uses existing repository art at `../../gen2-dark.webp`. The separately delivered single-file HTML uses the image Steven supplied in the conversation. That new image was not uploaded to this public repository. The repository preview has not been browser-tested as a hosted page; the standalone variant was rendered and exercised in memory in Chromium.

## Existing cockpit seam

The live `app.js` was read from `master` (blob `7d921ad0565c68eb19a71257370c265659985780`). Its existing `window.__anewgam` API exposes `getState` and `setState`.

After deliberate integration into an approved product candidate:

```javascript
const chapter = AnewgamNougat.mount(chapterElement, {
  host: window.__anewgam,
  art: './gen2-dark.webp',
  allowRemote: false
});
```

Only the chapter's `nougatScene` field is written on Keep. Current host state is read again at that moment and all other fields are retained. The host's own persistence warning remains authoritative. No existing route, index, service worker, publisher, or original Warmth site was modified here. Standalone Keep uses the separate scene-only key `anewgam.nougat.v1`; regular actions stay in memory until Keep or Export.

## Optional hosted specialist

The preview's Ask button discovers models from `GET https://simple-jev-demo-api.featherless.ai/v1/models`, then sends one bounded `choice` request to `/v1/classifier`. No credential, account, cookie, prompt archive, image, or other cockpit thread is supplied. The fixed fictional scene flags and legal actions are shown before the click. There is a 15-second combined deadline and no retry loop. Manual play never requires a model.

The result is a suggestion, not permission or execution. Its full distribution and returned model are validated. A second click applies a currently legal move; manual play, undo, reset, or import invalidate old suggestions. Errors remain errors and cannot become a fake successful model response. Confidence is displayed as a model preference, not calibrated certainty.

Official interface reference: https://simple-jev.featherless.ai/docs

No live model inference was completed for this new game during the checkpoint. The container's attempted public model discovery failed at DNS resolution. Browser transport tests used explicit JavaScript stubs. Prior hosted canaries are separate evidence, not evidence for this new task or local vision.

## Verification

```sh
node --test anewgam-for-steven-cockpit/chapters/nougat/test-nougat.cjs
```

25 Node tests passed, including traversal and replay of all 58 reachable history prefixes. A separate 28-check in-memory Chromium 144 run passed desktop/mobile rendering, actual button-click inheritance, two endings, genuine JSON download and reimport, undo, invalid-import rejection, storage-unavailable behavior, source-derived host-API fixtures, proposal invalidation, explicit application, and simulated provider failure without blocking play.

Repository and locally tested source blobs match:

- `nougat.js`: `e4471d67047d2dae7a881c8db8039672120b2766`
- `test-nougat.cjs`: `57d07a04051d8ce7e0ad9a18bc627819995e231d`

Browser policy blocked local HTTP and file navigation in the test environment; no policy was changed. The new page was tested entirely in memory. Real installed-browser save/reload and opening the delivered file by navigation remain unverified. About-blank storage refusal is handled visibly; actual story export and import were tested. Screenshots, raw test reports, and the browser script are in the conversation's source/proof bundle. The browser harness was corrected to pass functions rather than string expressions under the unchanged Content Security Policy.

This is a tested product candidate. It is not proof of SLO recovery, a Blevodesk deployment, CUA inference, local vision, multiplayer, independent acceptance, or a repaired Saedo full test suite. No worker continues after the checkpoint.
