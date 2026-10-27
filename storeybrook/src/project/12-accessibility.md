# Accessibility

A storybook is for everyone at the table: the child, the parent reading along, the grandparent across the room, the person who uses a switch or a screen reader. These are the floors; components already meet them.

## Seeing

- Text pairs meet 4.5:1 in every look (see Color, 176 checks); large display type, icons, borders and the focus ring meet 3:1.
- Nothing is told by color alone: stones say "locked", "walked", "you are here"; tags carry words; errors carry a word or an icon.
- Ink Blot is the high-contrast, no-color, no-motion look. Offer it in the look picker, never lock it away from someone who needs it.
- `forced-colors: active` (Windows high contrast): buttons, stones, covers and choices get system borders; washes and the brook's paint are dropped.

## Moving through

- Every control is a real `<button>`, `<a>`, `<input>` or `<select>`. Stones are buttons or links; covers are links.
- Focus is always visible: a `focus` ring, `border-focus` wide at `border-focus-offset` (5px and 5px on a TV). Never remove it; never replace it with a color change.
- Targets are at least `size-target` (48px), 56px at the kid density, 64px on a TV.
- The drawer traps focus while open and returns it to the button that opened it; Escape closes it. Dialogs use `<dialog>` and `showModal()`.
- Arrow keys, a remote and a gamepad move focus spatially at the TV density (see Devices).

## Hearing and reading

- Reading aloud is an aid: every word is on the page. The reader says when there are no voices.
- Sounds are never the only signal: the jar counts, the toast names, the stone changes state.
- The kid density sets stories in Andika, a face drawn for early readers.
- Pages declare a language (`<html lang="en">`) so screen readers and the speech engine pick the right voice.

## Motion

- `prefers-reduced-motion: reduce` stops every animation and transition in the kit (see Motion), checked each time a behavior runs.
- Nothing flashes. The fastest repeating motion is the creature's blink, every few seconds.

## Screen readers

- Decorative art (washes, the brook's paths, nougats in flight, icons) is `aria-hidden`.
- The creature is `role="img"` with a label that names its form and stage.
- The jar's label is its count ("9 nougats in the jar"); stones' labels add their state; the reader's play button says "Read it to me", "Pause reading" or "Keep reading".
- Toasts are `role="status"` with `aria-live="polite"`: announced, never stealing focus.

## Without JavaScript

- Give `<body>` `sb-no-js`; `init()` removes it. Write pages so they read in full without the bundle: the story is in the markup, stones can be a list of links, looks fall back to the `data-theme` on `<html>`.
- The reader, the brook and the creature need the bundle; put a plain alternative beside them (a list of chapters, a still picture).

## Printing

- `@media print` hides the reader bar, the fixed jar, the drawer and toasts, and drops the page grain. Print in Ink Blot for the cleanest page.

## Checklist for a page

- Meta Daylight, Knight Night and Ink Blot all checked by eye.
- Tab through everything: visible ring, sensible order, nothing trapped but the open drawer.
- Reduced motion on: nothing moves, nothing is lost.
- Reader on a device with no voices: it says so, nothing breaks.
- TV density with arrow keys only: every control reachable.
- Every lock says how to open it.
