# Washes

Watercolor fields that bleed, mix and granulate: the only way large color arrives on the page.

**Provide** an absolutely placed `<div class="sb-washes" aria-hidden="true">` as the first child of a positioned container, holding up to five `<i class="sb-wash sb-wash--sky">` (or `--meadow`, `--rose`, `--sun`, `--brook`). Size and place each with inline style: `--w` (width, default 40%), `--ar` (aspect ratio, default 1.35), and `left`, `top`, `right` or `bottom`. `sb-wash--band` makes a full-width band (`--h` its height) for a sky or a meadow. `<i class="sb-sun">` is a sun of unpainted paper with a `wash-sun` halo.

- Each wash is darker at its rim, granulated, bled through `#sb-bleed`, at `op-wash`, and blended `multiply`, so overlaps mix like glazes. Knight Night glows them (`screen`); Ink Blot turns them to stipple; Comix to halftone; Origami to folded facets.
- `sb-bloom` on a wash lets it arrive once over `dur-bleed`.
- `sb-grain` lays the paper grain on any one element.

**Do / Don't**
- Do keep text on a sheet over washes, never straight on them.
- Don't use more than five washes on a screen, or a wash to mean something: they are weather, not signals.
