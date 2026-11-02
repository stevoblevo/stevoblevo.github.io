# Cover player source candidate — not published or browser-accepted

This extends the earlier pure gate candidate. The source build list now includes the local-file UI, runtime and conductor initialization; no generated HTML or deployed route is changed. Master and the concurrent AND SO PR stack remain untouched. Build version stays 8.1, pending separate version/publication review.

## Actual provider provenance

`z-cover-panel.js` is unchanged Grok output (1384 UTF-8 bytes before trailing newline). `tests/fixtures/grok-cover-panel.js.txt` preserves it. The runtime provider output is preserved exactly in `tests/fixtures/grok-cover-runtime.js.txt`; it was 1413 bytes before newline, exceeding the requested 1400-byte output target by 13 bytes. It was received in a corrected separate provider attempt after an earlier run returned only commentary. Process completion is not UI acceptance.

The conductor did not replace the implementation. `tests/fixtures/runtime-conductor.diff` records the narrow changes: idempotent mount; additive visibility/pagehide listeners instead of clobbered global handlers; destroy cleanup; synchronous play error handling alongside rejected promises; pause invalidates pending error callbacks. `z-cover-init.js` wires the existing shared mute/paused/volume state, moves the existing source link outside collapsed details, and supplies a trusted configuration callback. The existing applyMix, pbPlay and pbStop paths call coverSync; no rhythm/JAM/BOOK clock is changed.

## Behavior and scope

In Gamut's scrolling settings body, expand **Cover jam**, acknowledge permission for your own local media, choose a supported audio/video file and click **Play audio**. Selection does not autoplay. Files stay local as temporary object URLs; no upload or YouTube extraction occurs. One video element carries the local audio/video without switching clocks or seeking on reveal. Rights checkbox acknowledgment is not a license verification service.

Video requirements are **not configured**. Trusted application code may provide `window.ANDSO_COVER_REQUIREMENTS(facts)`; only strict true can qualify the selected file, and Reveal still requires a manual click. Missing/throwing/false callbacks fail closed. No nougat, microphone, score or duration rule is inferred. Do not load this callback from user input or stored scripts. This is a UI mechanic, not DRM or server-side authorization. The reference link to Haruka No.2's YouTube performance is outside the reveal/collapse region; it is not played, hidden, or gated.

## Verification so far

- `node _src/and-so/tests/cover-player.cjs`: 26 mocked DOM/media checks pass.
- `node _src/and-so/tests/cover-integration.cjs`: 16 wiring-model/source checks pass.
- Earlier pure gate checks: 19 pass plus the original provider assertions.
- Changed JavaScript syntax and Python build syntax checks pass.
- **No real browser test passed.** Local Chromium launch failed under the execution sandbox; one escalation failed before launch. A documented cloud-browser file navigation was policy-rejected and not retried. These checks are not substituted by mocks.

For an already authorized verification host, generate an original fixture (not source media):

    ffmpeg -f lavfi -i color=c=blue:s=160x90:r=10:d=2 -f lavfi -i sine=frequency=440:duration=2 -c:v libvpx -c:a libvorbis -shortest synthetic.webm

Set `CHROME_PATH`, `ANDSO_QA_MEDIA` (absolute fixture path), and optionally `ANDSO_QA_OUTPUT`, then run `node _src/and-so/tests/browser-cover-player.cjs` with installed Playwright. This isolated UI/runtime harness is still unexecuted. It does not replace full-app tests of existing Gamut layout, keyboard/pointer capture, mute/pause/volume controls, mobile presentation, and local-media privacy. Build locally with the existing build.py, inspect the full page and generated diff, and run those tests before any merge or publication. No public deployment, asset license, configured unlock goal, or complete playable cover is claimed here.
