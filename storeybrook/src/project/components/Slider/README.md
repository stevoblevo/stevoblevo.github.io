# Slider

A range on a copper thread with an `accent` bead, for one continuous setting: reading speed, space, volume.

**Provide** `<label class="sb-slider">` holding `<span class="sb-slider__row"><span>Reading speed</span><output>0.96</output></span>` and `<input type="range">`. Keep the `<output>` in step with the value, and set `--p` on the input to the filled percentage so WebKit draws the copper part of the track (Firefox draws it itself).

- The track is 4px: `copper` up to the bead, `line` after it. The bead is 26px with an `art-line` rim.
- The value in the `<output>` is tabular so it does not jitter.

**Do / Don't**
- Do show the value in words or numbers a person understands ("0.96×", "story pace").
- Don't use a slider for fewer than five steps: use a Choice.
