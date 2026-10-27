# Toggle

An on/off switch: a folded-paper tab sliding in a track. On is `cue`.

**Provide** `<label class="sb-toggle">` holding `<input type="checkbox">`, then `<span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>`, then the label text. The label says what turns on: "Hide the words", "Sound", "Read along".

- Off: `surface` track with an `ink-muted` edge; the thumb is a `page` tab with a dog-eared corner and an `ink` outline. On: `cue-soft` track, `cue` edge, `cue` thumb slid 26px (`ease-bounce`).
- The whole label is the target (at least `size-target` tall). The focus ring draws around the track.
- Disabled: `disabled` on the input dims the track and the label; say why nearby.

**Do / Don't**
- Do apply the change at once; a toggle never waits for a Save button.
- Don't use a toggle for choosing between two named things (Moira or Orla): use a Choice.
