# Tabs

Chapter tabs on the edge of the book: the open one is a `page` tab with an `accent` bar, pulled out from the stack.

**Provide** `<div class="sb-tabs" role="tablist" aria-orientation="vertical">` holding `<button class="sb-tab" role="tab" aria-selected="true">` per chapter (or links with `aria-current="true"` when each tab is its own page). Keep the panels as `role="tabpanel"`, labelled by their tabs.

- Closed tabs: `surface` with a `line` edge, `ink-muted` text. The open tab: `page`, `accent` text and a 6px `accent` bar on its inner edge, nudged out 6px with `shadow-sticker`.
- Each tab is at least `size-target` tall; arrow keys move between tabs when you wire them as a tablist.

**Do / Don't**
- Do name tabs with chapter titles, short.
- Don't use more than seven tabs; a longer book uses the drawer for its contents.
