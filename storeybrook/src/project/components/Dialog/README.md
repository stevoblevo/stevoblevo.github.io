# Dialog

A sheet that asks one question over a veiled page: a title in the display face, a sentence or two in the story face, and two buttons.

**Provide** `<dialog class="sb-dialog" id="…">` holding `<h2 class="sb-dialog__title">`, `<p class="sb-dialog__body">` and `<div class="sb-dialog__actions">` with a quiet button and a primary one. Open it with a button carrying `data-sb-open="#id"` (or `Storeybrook.dialog.open(el)`, which uses `showModal()`); buttons inside with `data-sb-close` close it.

- The sheet is `page` with a deckled edge and `shadow-lift`, up to 34rem wide; the backdrop is `scrim`. It arrives rising 14px and turning from −1° over `dur-base`.
- Escape closes it (the browser's own dialog behavior), and so does Back at the TV density.
- Fires `sb:dialog` with `{open, id}`.

**Do / Don't**
- Do ask one question, with the primary button saying what happens ("Open the book"), and the quiet one the way out ("Not now").
- Don't use a dialog for rewards or news: a Toast does that without stopping play.
