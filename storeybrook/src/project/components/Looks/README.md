# Looks

The look picker: one button per look, each showing that look's paper, two of its pigments and its display face.

**Provide** `<div class="sb-looks">` holding a `<button class="sb-look" data-sb-look="<id>">` per look, each with `<span class="sb-look__swatch" aria-hidden="true"><i></i><i></i><b>Aa</b></span>`, the look's name and a `<small>` line. Set the swatch with inline custom properties: `--sw-paper`, `--sw-a`, `--sw-b` (two pigments), `--sw-ink`, `--sw-font`. The swatch values are the look's own and do not change with the current look.

- `Storeybrook.init()` binds every `[data-sb-look]`: pressing one sets the look, remembers it and keeps `aria-pressed` true on the current one (an `accent` border with an `accent-soft` halo).
- A look that waits behind progress has `aria-disabled="true"` and a `data-sb-why` sentence; pressing it shows the sentence as a toast.
- The grid fills columns of at least 150px.

**Do / Don't**
- Do keep Meta Daylight first and Ink Blot reachable early: it is the look for e-ink, print and no motion.
- Don't hide a locked look; show it dimmed with its reason, so people know it exists.
