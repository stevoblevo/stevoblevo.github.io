# Choice

A row of pill-shaped radio choices for picking one of a few: who reads, the pace, how hard.

**Provide** a `<fieldset class="sb-choice">` with a `<legend>`, then one `<label>` per option holding an `<input type="radio">` and a `<span>` with the option's name. Give the radios one `name`.

- Unchosen: `page` pill with an `ink-muted` border (3:1 or better on every ground) and an `ink` label. Chosen: `accent` border, `accent-soft` fill, `accent` label (4.5:1 or better in every look).
- The focus ring draws around the pill of the focused radio. Arrow keys move between options, as radios do.
- Two to five options. More than five, or options longer than three words: use a `<select>`.

**Do / Don't**
- Do name options with nouns or short phrases: "Moira", "Orla", "You".
- Don't use a choice for on/off: that is a Toggle.
