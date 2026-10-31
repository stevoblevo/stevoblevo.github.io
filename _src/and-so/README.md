# AND SO source

The modular source of AND SO. `build.py` inlines `src/` into one self-contained page.

    python3 build.py        # writes and-so.html (artifact body), dist/and-so.html (full page), check.js

Ship `dist/and-so.html` as `/and-so/index.html` here and as `worlds/and-so.html` in the Field.
Before replacing a shipped version, freeze it: `python3 _tools/sae-kirby.py --name and-so --version <v> --src and-so/index.html --play "#enter"`.
Frozen versions live in `/ong.bak/` and keep a friendly route such as `/and-so/v7/`. The current build is AND SO 8.

## Voice command candidate

The current `/and-so/` page has an optional **Voice commands** disclosure. Start listening requests the browser microphone after showing its processing disclosure. Stop listening remains visible even in Quiet mode. Input is English, lasts at most 45 seconds, and stays off after reload, hiding/navigation, errors, or a browser-ended session. Starting command input does not resume stopped game audio. It switches off the existing singing microphone and guardian overhearing; selecting either again stops command input.

Commands target existing actions/settings:

| Say | Effect |
| --- | --- |
| `hummer on` / `hummer off` | Start/stop the demo hummer, idempotently; never request the singing microphone. |
| `rain on` / `rain off` | Set the existing rain layer. |
| `notes mode` / `drone mode` | Select plucked notes or held drones. `switch to notes`, `use drones`, and `notes on`/`drone on` also work. |
| `mute all` / `stop all` / `sound off` | Mute this page and its owned current-version mirrors, including nested copies: music, replay, narration and paper sounds. Command input remains on. Restore music with the ordinary sound button. Other tabs and legacy embedded players retain their own sound controls. |
| `stop listening` / `voice commands off` | Abort command recognition without changing audio settings. |

Optional `please`, explicit `turn`/`switch on/off`, `demo hummer`, `hum her`, and `reign` are bounded aliases. Bare channel/mode names, negations, combined commands and fuzzy matches do nothing. Only final results with a finite browser confidence of at least 0.75 are accepted. Repeated commands are debounced and explicit settings are idempotent. A browser reporting no usable confidence must use the ordinary controls. Layer/mode commands preserve master mute.

Recognition uses the same browser `SpeechRecognition`/`webkitSpeechRecognition` mechanism as existing overhearing, with a separate session that never feeds the guardian/journal/Claude path. AND SO does not store or log command transcripts/audio. No new hosted speech service, key, storage preference, or permission policy is added. Browser processing may send audio to its provider; offline operation is not promised ([Web Speech API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)). HTTPS and browser support are required. The help panel and ordinary controls remain usable when unsupported, denied, or offline.

Narration stops command listening before speaking, including the existing optional ElevenLabs output. Cancellation guards prevent an in-flight narration response from playing or falling back to speech after mute. This does not change voice selection, credentials, speech quality, or the separate narration PR. Headphones and short sessions reduce feedback from game audio; physical recognition accuracy and external room audio remain unverified.

The full-output mute protocol addresses only owned `kind: self` frames. Each srcdoc records its creator's serialized origin; requests require that origin and the exact parent WindowProxy. Acknowledgements require an owned current-version frame, its opaque `null` origin, and the pending request ID. Requests travel down and replies travel up, with duplicate requests sharing one operation. No broadcast or unrelated-tab control is used. A pending message stays visible until local outputs are quiet and all descendants acknowledge; missing replies time out after four seconds with an unconfirmed warning. Closing a muted mirror cannot restore the outer window's earlier sound state.

The mirror regression reproduces the prior `3a6f483` failure with native Web Audio replay sources still running after outer mute, while synthetic narration and paper audio also remain active. Its repaired-case checks include nested mirrors, actual source stops/disconnections, paper AudioContext suspension, wrong source/origin/request IDs, acknowledgement timeouts, and an unrelated top-level test tab retaining its outputs. The fixture supplies mock speech in every owned frame and serves only its temporary HTML over loopback.

### Build and verify

From the repository root:

```sh
python3 _src/and-so/build.py
node --check _src/and-so/check.js
node _src/and-so/tests/commands.test.cjs
python3 _src/and-so/tests/browser_commands.py
python3 _src/and-so/tests/browser_mirrors.py
cmp _src/and-so/dist/and-so.html and-so/index.html
```

For review screenshots: `python3 _src/and-so/tests/browser_commands.py --screenshots /tmp/andso-voice-review`.

Browser tests need Node with built-in WebSocket (Node 22+), Python 3, and Chromium. Set `ANDSO_CHROMIUM` if it is not at `/usr/lib/chromium/chromium`. Each browser run creates and removes its own temporary profile. Recognition, synthesis, media access and provider fetches are mocked before the real built app initializes; microphone prompts are denied and external page loads are blocked by the test fixture's CSP. Tests use actual Web Audio objects and ordinary app controls with output muted by the test browser. They do not prove a physical mic, Safari/iOS, or production deployment.

### Integration and promotion

This is a draft based on master `a283e581fcc9be3da84e1d59789cc4e0bfa5dee8`, separate from cockpit PR #12. Open author work was checked at PR #14 `a9ceb69890ad548f67e4934dd06857c907532abd`, #15 `459eeeed4f969aa73d80b08384fd21f67b3ae5a5`, and #16 `7f2aaedcdaf495c64254fbff8bf234f01cfa605e`.

Source overlaps with #14 are build.py, body.html, style.css, and y-voice.js; #15 and #16 also change build.py. All three replace generated and-so/index.html. Reconcile those exact source changes and regenerate the current page after choosing merge order; do not resolve a generated-page conflict by replacing their feature set. Their unrelated fixes are not included here.

Only the current generated page is refreshed for this candidate: `cp _src/and-so/dist/and-so.html and-so/index.html`. The byte-identical base snapshot already exists at `/and-so/v8.1/`, which remains unchanged, as do the other historical routes and version manifest. Do not run versions.py as a shortcut for integrating this draft; release version selection belongs to promotion after reconciling the author stack.

Promotion still requires reviewing the reconciled exact revision, a user-started physical-microphone check in the intended browser, and separate authorization to merge/deploy. The prior clock migration concerns (ensemble writes bookNext/BOOK.abs, the wing step's stale counter, Dreamwalk pending handoff and partial Mag restoration) are separate, not fixed by command input. A rollback must revert only this feature's commit on the then-current master; never reset master to this baseline.
