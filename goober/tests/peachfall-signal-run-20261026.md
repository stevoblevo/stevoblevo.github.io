# Peachfall / Signal Run repair candidate

Base: `fa66436579bd80ac775b3c6b9d6edd2a67ecf9a7` in `stevoblevo/stevoblevo.github.io`.

Only two runtime files change:
- `peachfall/assets/main-BPeuWIE_.js`: resolve the same three image files relative to the module, skip missing/pending/broken images, scale using natural dimensions, and always restore canvas state after drawing.
- `goober/run/index.html`: load the already checked-in `field.js?v=2` instead of absent `run.v2.js?v=2`. The runtime itself, saves, device-local report storage, input behavior and artwork are unchanged.

The original Cobalt quote error is already fixed; no Cobalt change. Beauty Show is out of this candidate. No live branch, workflow, service worker, site alias or deployment configuration changes.

This is a targeted repair of the checked-in Peachfall bundle. No matching unbundled Peachfall implementation was found in the base tree; a later authoritative rebuild must carry these changes forward. The existing bundle filename is retained to keep this patch bounded; browser cache renewal remains part of eventual release verification.

## Tests already executed

`peachfall-signal-run-results.json` records 34 passing source/model assertions in a JavaScript isolate: image readiness, natural-dimension scaling, canvas restore on success/error, Goober idle/start/keyboard/pointer/cancellation/hidden-tab/finish/restart/storage-denial behavior.

These do not establish native browser behavior. No browser acceptance or screenshots are claimed.

## Run on an existing test host

Use a clean checkout of this candidate, or download its two runtime files into an isolated copy. Do not overwrite a dirty checkout.

```sh
node --experimental-vm-modules goober/tests/peachfall-signal-run-model.mjs
node goober/tests/public-contracts.mjs
python3 -m http.server 8838 --bind 127.0.0.1
```

The first command adds true module/classic parsing, entry binding, URL resolution at normal/prefixed mounts, and image-file existence checks. Neither Node command was executed by the preparing environment. Use an available port and existing browser installation; no dependency install or paid service is required.

## Required browser acceptance

Use an isolated guest browser profile with silent/null audio output. Record browser/version, exact candidate SHA, console/page errors, image/script requests and screenshots. Test desktop and a 390px viewport; emulation is not physical touch proof.

1. Open both `/peachfall/` and `/peachfall/play.html`. Verify all three requests under `/peachfall/source/images/anchors/` succeed and decode. No request should use root `/source/images/`.
2. Observe changing canvas frames before and after Play/Watch. Verify visible artwork, controls and several frames without page errors. Keep real audio output muted.
3. In a separate context, delay an image and then abort it. The scene should keep rendering without a broken-image exception. When the delayed image is allowed to load, artwork should appear. Capture normal and delayed/failed-load evidence separately.
4. Open `/goober/run/`; verify `field.js?v=2` succeeds and `run.v2.js` is not requested. Before Start, the ship remains idle.
5. Start: canvas receives focus; left/right turns, up moves, pointer/touch-pad controls move the ship and release on pointer cancel. Test keyboard and narrow-layout pointer controls separately.
6. Complete a 45-second run, verify restart and a local report. Repeat with storage blocked: completion/restart should still work and a visible storage failure should appear. Preserve seeded ghost/log data in a dedicated test profile; do not use the user's live profile.
7. Verify World/Field log/Notebook links and Back. Check hidden-tab pause/resume and key release; preserve/report current behavior rather than silently expanding this patch.
8. Capture screenshots only after actual rendering. Save reports outside the source tree until reviewed; a failed assertion must remain visible.

## Recovery

No live deployment occurs from this candidate. Its parent preserves the exact originals. The eventual candidate commit's GitHub `.patch` URL is a portable forward patch; `git apply -R` reverses it in a clean matching checkout. Prefer `git revert <candidate-commit>` on a review branch if recovery is needed. Do not reset a dirty checkout or overwrite newer live work.
