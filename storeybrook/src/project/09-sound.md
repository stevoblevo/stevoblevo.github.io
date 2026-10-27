# Sound and reading aloud

Storeybrook has two kinds of sound: a voice that reads the story, and small paper noises. Both wait to be asked.

## Reading aloud

`Storeybrook.read` speaks a page with the browser's own speech synthesis and lights each word as it is spoken. It runs on the device; nothing is sent anywhere by the kit.

- **Voice choice.** Voices are ranked: Irish English (`en-IE`, or a voice named Moira, Orla or "Irish") first, then British English, then any English, then the rest; on-device voices before network ones. A person's choice is kept (`sb:voice`).
- **Pace.** Rate 0.96 and pitch 1.05 by default, a touch slower and brighter than the engine's default; the rate is kept (`sb:rate`). Offer 0.8, 0.96 and 1.15 at most.
- **Chunks.** Text is spoken in chunks that end at sentence marks, up to 220 characters, so long pages do not stall the engine.
- **Highlight.** Words are wrapped in `sb-word` the first time a page is read; the spoken word gets `is-reading` (`cue-soft` behind it, a `cue` edge under it; inverted in Ink Blot). Where the engine reports word boundaries the highlight follows them; where it does not, it follows a steady 2.6 words a second times the rate.
- **What is skipped.** `script`, `style`, anything `aria-hidden="true"` and anything inside `.sb-noread`.
- **No voices.** If the browser has no speech synthesis the reader disables its play button and says "This browser has no voices. The words are all here to read." If there is no Irish voice it says which voice it is using.
- **Events.** `sb:read` fires with `{state, progress}`: `speaking`, `paused`, `stopped`, `done`, `unsupported`.

The reader is an aid, never a gate: every story is readable without it, and nothing happens only because a page was read aloud.

### The Irish voice

Irish English is Storeybrook's first choice because the stories were written to be heard in it. Which voices exist depends on the device: Apple devices ship Moira (en-IE); Microsoft Edge offers Irish neural voices (Emily, Connor) online; many Android and Linux devices have none. The reader always falls back gracefully and says so.

## Paper noises

`Storeybrook.sound` makes four small sounds with the Web Audio API; there are no audio files.

| Name | When | What |
|---|---|---|
| `stone` | stepping on a stone | two soft sine tones, C and G |
| `nougat` | a nougat landing in the jar | a wrapper's crinkle and a high triangle tick |
| `sticker` | a sticker peeling on | a peel and two rising tones |
| `page` | a page turning, a fold | a brush of filtered noise |

- Off until a person turns it on (`data-sb-sound` on a button toggles it; `Storeybrook.sound.enable()` from script). The choice lasts for this visit only (`sb:sound` in session storage).
- Each sound is quiet (peak gain 0.12) and short (under 0.4s). They never loop and never play on load.
- A game that has its own music (AND SO) mutes these while its own sound is on, or routes them through its mixer.

## Haptics

`Storeybrook.haptic(pattern)` vibrates where the device can and reduced motion is off: 12ms for a nougat, a 10–40–18ms pattern for a sticker. Nothing else buzzes.

## Rules

- Sound and voice are never required to play, read or win.
- Never autoplay. The first sound always follows a press.
- A page with sound has a visible sound toggle that says its state ("Sound on" / "Sound off"), not just an icon.
- Microphones and cameras are not part of the kit. A game that listens (AND SO's overhearing) asks from a press, says where the sound goes, and is off again when the person leaves.
