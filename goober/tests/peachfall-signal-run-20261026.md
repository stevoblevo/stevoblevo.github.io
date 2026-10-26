# Peachfall / Signal Run repair candidate

Base: `fa66436579bd80ac775b3c6b9d6edd2a67ecf9a7` in `stevoblevo/stevoblevo.github.io`.

Three runtime files now change across the candidate commits:
- `peachfall/assets/main-BPeuWIE_.js`: resolve the same three image files relative to the module, skip missing/pending/broken images, scale using natural dimensions, and always restore canvas state after drawing.
- `goober/run/index.html`: load the already checked-in `field.js?v=2` instead of absent `run.v2.js?v=2`. The runtime itself, saves, device-local report storage, input behavior and artwork are unchanged.
- `peachfall/assets/main-CVicfXhU.css`: apply the exact reviewed narrow/portrait layout patch. Controls, HUD and story text flow around the unchanged 16:9 canvas, with 44px minimum controls.

The original Cobalt quote error is already fixed; no Cobalt change. Beauty Show is out of this candidate. No live branch, workflow, service worker, site alias or deployment configuration changes.

This is a targeted repair of the checked-in Peachfall bundle. No matching unbundled Peachfall implementation was found in the base tree; a later authoritative rebuild must carry these changes forward. The existing bundle filename is retained to keep this patch bounded; browser cache renewal remains part of eventual release verification.

## Tests already executed

`peachfall-signal-run-results.json` records 34 passing source/model assertions in a JavaScript isolate: image readiness, natural-dimension scaling, canvas restore on success/error, Goober idle/start/keyboard/pointer/cancellation/hidden-tab/finish/restart/storage-denial behavior.

The initial model results do not establish native browser behavior. They remain preserved as the preparing environment's original evidence. Subsequent reviewer results are recorded separately below; no full acceptance is claimed.

## Reviewed responsive follow-up

The patch applies to base commit `6a12a39203c14ec47e9c72ad9b76dc833bc900db`. The publisher independently verified the exact source preimage, the supplied 5,269-byte LF patch with final newline, the postimage, and forward/reverse byte restoration before committing. No CSS was reconstructed or redesigned.

SHA-256 bindings for `peachfall/assets/main-CVicfXhU.css`:

```text
preimage  6f36631dfc557730ed4984172108d0b2172e295553888579d0e1a54620aa516c
postimage 20da9bb3a2681ce19937d4adfe59e305e2312dcf527497e777e0c8a76868eea7
patch     4779a25f9f2b5c57d464231577f803b45c1b93c888b04a0d68fc3f00b13fbb39
```

These bindings describe the supplied CSS-only patch; a GitHub commit patch also containing this document has different bytes.

### Browser evidence supplied by the existing reviewer

The publisher received this summary through the repair handoff; it did not independently rerun the browser or inspect the reviewer's local screenshots.

- Initial acceptance of `6a12a392`: all 190 materialized tracked files matched Git blobs. Peachfall image decode/recovery and Goober controls, completed runs, persistence and storage-denied restart passed. A concrete Peachfall control/HUD/story overlap at 390px blocked layout acceptance.
- Exact responsive CSS follow-up: **123 positive layout/comparison assertions passed**, using actual browser rectangles at **320, 390 and 768px**, plus corrected desktop baseline measurements.
- **38 source/model checks passed** separately on the review host. This is separate from, not an addition to, the original 34-assertion isolate receipt.
- Independent review returned **GO** for this bounded patch. Forward/reverse patch application restored exact bytes.
- Two invalid baseline captures remain retained and excluded from passing evidence. The reviewer closed the preview and owned tabs.
- The publisher's integration adds only the hash-verified CSS and this evidence summary to the existing candidate. It does not establish a new browser run or full acceptance.

### Remaining limits

Still unverified: native pointer cancellation, true hidden-tab/key release, literal network abort, physical touch/notch hardware, full accessibility and cross-browser behavior. Viewport measurements are not physical-device proof. Do not infer these passes from simulated events, image recovery, or the independent patch-review GO.

The candidate remains **unmerged and undeployed**. Further acceptance must preserve these limits until actual evidence addresses them.

## Run on an existing test host

Use a clean checkout of this candidate, or download its three runtime files into an isolated copy. Do not overwrite a dirty checkout.

```sh
node --experimental-vm-modules goober/tests/peachfall-signal-run-model.mjs
node goober/tests/public-contracts.mjs
python3 -m http.server 8838 --bind 127.0.0.1
```

The first command adds true module/classic parsing, entry binding, URL resolution at normal/prefixed mounts, and image-file existence checks. Neither Node command was executed by the publisher's preparing environment; the review host separately reported the 38 source/model checks above. Use an available port and existing browser installation; no dependency install or paid service is required.

## Browser acceptance checklist and remaining verification

Retain the reported passes above; do not count this checklist as newly executed. Use an isolated guest browser profile with silent/null audio output. Record browser/version, exact candidate SHA, console/page errors, image/script requests and screenshots. Test desktop and a 390px viewport; emulation is not physical touch proof.

1. Open both `/peachfall/` and `/peachfall/play.html`. Verify all three requests under `/peachfall/source/images/anchors/` succeed and decode. No request should use root `/source/images/`.
2. Observe changing canvas frames before and after Play/Watch. Verify visible artwork, controls and several frames without page errors. Keep real audio output muted.
3. In a separate context, delay an image and then abort it. The scene should keep rendering without a broken-image exception. When the delayed image is allowed to load, artwork should appear. Capture normal and delayed/failed-load evidence separately.
4. Open `/goober/run/`; verify `field.js?v=2` succeeds and `run.v2.js` is not requested. Before Start, the ship remains idle.
5. Start: canvas receives focus; left/right turns, up moves, pointer/touch-pad controls move the ship and release on pointer cancel. Test keyboard and narrow-layout pointer controls separately.
6. Complete a 45-second run, verify restart and a local report. Repeat with storage blocked: completion/restart should still work and a visible storage failure should appear. Preserve seeded ghost/log data in a dedicated test profile; do not use the user's live profile.
7. Verify World/Field log/Notebook links and Back. Check hidden-tab pause/resume and key release; preserve/report current behavior rather than silently expanding this patch.
8. Capture screenshots only after actual rendering. Save reports outside the source tree until reviewed; a failed assertion must remain visible.

## Recovery

No live deployment occurs from this candidate. The original repair is commit `6a12a39203c14ec47e9c72ad9b76dc833bc900db`, based on `fa66436579bd80ac775b3c6b9d6edd2a67ecf9a7`. Reverting only the responsive follow-up returns to the original repair candidate; its parent preserves the exact pre-CSS-fix bytes. Each commit's GitHub `.patch` URL is a portable forward patch; `git apply -R` reverses it in a clean matching checkout. Prefer `git revert <follow-up-commit>` on the review branch if recovery is needed. Do not reset a dirty checkout or overwrite newer live work.
