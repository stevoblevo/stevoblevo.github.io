# Prose

Story text and its marks: the lede, the body at the reading measure, a drop cap, ink links and the owner's handwritten note.

**Provide**
- `<p class="sb-lede">` for the first paragraph of a page (`story-lede`, up to 34em).
- `<div class="sb-prose">` around the story's paragraphs (`story-body`, fluid from 1.125rem to 1.375rem, at `size-measure`).
- `<span class="sb-dropcap">O</span>` as the first letter of a chapter: the display face in `accent`, 4.6em, over a small sun wash (a square in Ink Blot, a gamboge panel in Comix).
- `<a class="sb-ink-link">` (or any link inside `sb-prose`): `link` with a wavy underline that darkens on hover; solid and 2px in Ink Blot.
- `<p class="sb-note">` for a handwritten note in `cue` (Caveat, 1.6rem).

At the kid density, ledes and prose switch to Andika at 1.3–1.6rem.

**Do / Don't**
- Do use one drop cap per chapter and one note per view.
- Don't justify, don't set story text in capitals, don't underline anything that is not a link.
