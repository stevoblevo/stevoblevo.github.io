# Page

One book page: `page` with long fibres, a deckled edge and `shadow-page`, `size-page` wide, with a folio.

**Provide** `<article class="sb-page">` with the page's content and `<span class="sb-page__folio">7</span>` for the page number. Add `sb-page--lined` for an exercise book's lines (a `cue` hairline every 1.6em). Inside a spread a page gets `sb-page--left` or `sb-page--right`, which also places the folio on the outer corner.

- Padding grows from `clamp(1.5rem, 4vw, 3.5rem)`; text inside is `sb-prose` at the reading measure.
- Comix squares the page and inks its edge.

**Do / Don't**
- Do put one chapter or one scene on a page; turn the page rather than scroll inside it.
- Don't put controls other than links and the reader on a page: they belong to the chrome.
