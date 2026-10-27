# Lock

A striped cover over something that is not open yet. It says why it is shut and how to open it, and unfolds when it opens.

**Provide** `<div class="sb-lock" data-sb-lock="<id>">` as the last child of a positioned element (a cover, a panel, a sheet), holding `<span class="sb-lock__keyhole"><span data-sb-icon="lock"></span></span>`, `<span class="sb-lock__why">` (what is shut) and `<span class="sb-lock__how">` (how to open it).

- `Storeybrook.unlock(id)` unfolds the lock upward over `dur-turn` (`is-opening`) and hides it; locks for ids already unlocked are hidden when the page loads. Reduced motion simply hides it.
- The cover is diagonal stripes of `page` and `surface` at 92%, so the thing underneath shows faintly through.

**Do / Don't**
- Do always fill in both lines: "Origami is still folded." "Walk two more stones to open it."
- Don't lock anything a person needs to read or to leave.
