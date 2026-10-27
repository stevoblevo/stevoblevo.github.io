# Seal

A wax seal in `accent` for the one press that begins or keeps something: begin the book, sign it, keep this.

**Provide** `<button class="sb-seal" aria-label="Begin the book">` holding one letter (set in the look's display face), or put `data-sb-icon` on the seal itself so the icon is its only child (drawn at 46% of the seal). Sizes: `sb-seal--sm` (52px), default (76px), `sb-seal--lg` (112px).

- The seal is `shape-seal`, lit from the top left, with a raised rim, a drip, and `shadow-seal`. Hover turns it 6° and grows it 4% (`ease-bounce`).
- Ink Blot makes it black; Comix rims it in ink; Origami turns it into a 45° diamond with its content upright.

**Do / Don't**
- Do use at most one seal per page, for a moment that matters.
- Do give it an `aria-label`: a single letter is not a name.
- Don't use a seal for routine actions or navigation; that is `sb-btn`.
