# Audio-first cover gate: isolated candidate, not a shipped feature

Base: `stevoblevo/stevoblevo.github.io` master `6739c8a9bdf1938a68b39697278cae1180401914` (AND SO 8.1).

Steven requested a cover to play/listen/jam with, initially audio only, with video unlocking when requirements are met. Actual unlock requirements and an authorized cover asset have not been supplied. No score, nougat, microphone, duration, or payment threshold is inferred.

## Provenance and verification

Grok produced the exact fixture in `tests/fixtures/grok-cover-gate.txt` through the existing provider lane on 2026-11-02. `src/z-cover-gate.js` is its function prefix, unchanged; provider assertions are deliberately excluded from runtime source. Conductor work only packages that function and the independent verification harness. No claim of Saedo/Hermes UI implementation is made.

Run from any directory: `node _src/and-so/tests/cover-gate.cjs`. The harness checks exact function preservation, runs the original synthetic assertions in an isolated VM, then 19 independent assertions against the module. This verifies a pure reducer, not browser playback or content access control.

## Contract

`coverGate(state, event)` accepts reducer-produced state (or initially undefined). `select` supplies `id` and strictly boolean `allowed` and resets all progress, even for the same id. `play` and `pause` represent manual playback requests. `check` evaluates the trusted app callback `predicate(facts)`; only strict true grants eligibility. Missing/throwing predicates fail closed and remove reveal. `reveal` represents a separate manual reveal request; checks alone do not reveal or start playback. Unknown events preserve state. Inputs are not mutated by the reducer itself; callbacks must also be pure.

The caller, not untrusted URLs or saved state, must establish `allowed` from approved owned/licensed non-YouTube media. Do not hydrate arbitrary state; reconstruct through select/check. The callback and facts are trusted application integration, not user scripts. This is a UI state helper, NOT authentication, DRM, asset validation, or server authorization. Do not preload/expose protected video assets before a separately validated delivery decision.

## Integration point, deliberately not wired

`build.py` currently concatenates the listed modules inside one IIFE. Once requirements, authorized assets, and UI integration are reviewed, insert `z-cover-gate.js` before `g-loop.js`. Keep provider assertions out of the build. Existing `b-audio.js` owns WebAudio and user-gesture activation; `c-music.js` schedules through `rhy.nextT`; `o-jam.js` owns JAM. Do not introduce a second clock or repurpose the older BOOK/ensemble clock. Bind play/reveal only to explicit user actions and implement pause/stop/source replacement in the actual media controller.

This candidate leaves build order, generated HTML, existing clocks, microphone permissions, saved progress, and public deployment unchanged. Preserve concurrent PRs #14, #15, #16, #17 and #20. No asset is included or extracted from YouTube. The supplied YouTube reference remains a normal visible link/embed, never hidden audio or gated YouTube access. See https://developers.google.com/youtube/terms/developer-policies .

Before integration: specify the predicate and rights-cleared media; add real browser tests for manual playback/reveal, asset delivery, denied playback, replacement cleanup, mute/pause, mobile gestures, and no duplicate audio. Then rebuild through the existing build.py workflow and review generated changes separately. No merge or publication is authorized by this candidate artifact.
