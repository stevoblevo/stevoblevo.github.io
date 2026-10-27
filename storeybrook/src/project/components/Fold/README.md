# Fold

A view folds away like paper to show the next one underneath: the top half folds down over the bottom, then the folded sheet drops away.

**Provide** a container and a function that swaps its content, then call `Storeybrook.fold(host, swap)`. It snapshots the old view, calls `swap()` at once (so the new view is already underneath), plays the fold over `dur-turn` with `ease-paper`, and resolves its Promise when the paper is gone. A paper rustle plays if sound is on.

- The snapshot has its ids removed so nothing is duplicated; it is `aria-hidden`.
- Under reduced motion (and in Ink Blot) `swap()` runs and the Promise resolves at once.

**Do / Don't**
- Do use it for changing a whole view in place: a new look, the next scene, a settings page.
- Don't fold something that is still being read or typed in.
