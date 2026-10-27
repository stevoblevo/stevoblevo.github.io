# Toast

A short message on a slip of sun-washed paper at the top of the screen: a reward, an unlock, a hint. It never takes focus and leaves by itself.

**Provide** nothing in the markup: call `Storeybrook.toast(html, {ms})`. It shows one toast at a time (a new one replaces the old), for 3 seconds by default (unlocks use 3.6), as `role="status"` with `aria-live="polite"`.

- The slip is `wash-sun` over `page`, turned −1°, with `shadow-sticker`; Knight Night uses `page`; Comix inks its edge. It arrives like a dialog over `dur-base`.
- Put a nougat or an icon first, then one sentence with the important words in `<b>`.

**Do / Don't**
- Do say what happened and what it was for: "<b>Origami</b> is open now."
- Don't use a toast for an error a person must act on; put the message next to the thing that failed.
