# Button

Pill-shaped actions in the interface face; one primary per view, in `accent`.

**Provide** a `<button>` (or `<a>` for navigation) with `sb-btn` and one variant, and a label that says what happens: "Play this one", "Read it to me", "Skip the story".

| Variant | Use | Paint |
|---|---|---|
| `sb-btn--primary` | the one thing to do now | `accent` fill, `on-accent` label, a wax gloss and `shadow-seal` |
| `sb-btn--secondary` | the second choice | `ink` border on a page tint; `cue-soft` on hover |
| `sb-btn--quiet` | escape hatches: skip, back, not now | `ink-muted` label, no box; a wavy `cue` underline on hover; keeps the 48px target |
| `sb-btn--sticker` | playful extras: a new look, a surprise | a `page` sticker on a blob, tilted 2°, `shadow-sticker` |

Sizes: default (`size-target`, 48px; 56px kid, 64px TV), `sb-btn--lg` (+16px, for the landing's Play), `sb-btn--sm` (40px, dense rows only), `sb-btn--icon` (a circle; give it an `aria-label`). An icon goes first inside the label (`data-sb-icon`, 1.25em).

**States**
- Hover lifts 1px; pressed sinks 1px (`dur-tap`). Focus shows the `focus` ring.
- Disabled: `disabled` (or `aria-disabled="true"` on a link) dims to `op-disabled`; say why nearby.
- Busy: `aria-busy="true"` adds a turning ring after the label; keep the label.

**Looks**: Comix gives every button a 3px ink border and a 4px offset shadow that presses flat; Origami squares the primary and folds its corner; Skein silk stitches a dashed thread inside the primary; Ink Blot is flat black with no gloss.

**Do / Don't**
- Do keep one primary per view; the landing's is "Play this one".
- Don't use a primary for skipping: skipping is `--quiet`.
- Don't put `cue` on a button: blue means the brook, links and reading, not actions.
