# Creature

Saelion: a bunny, a tree octopus and a butterfly pixie at once, which grows from an egg. It breathes and blinks; it can be sleepy or surprised.

**Provide** an empty element and call `Storeybrook.creature(host, {form, stage, mood})`, or write the options in `data-sb-creature` and let `init()` draw it. Size it with `--cw` (default 180px).

| Option | Values | Default |
|---|---|---|
| `form` | `saelion`, `bunny`, `octopus`, `pixie` | `saelion` |
| `stage` | 0 `egg`, 1 `kit`, 2 `bun`, 3 `sprite`, 4 `saelion` (Saelion only) | 4 |
| `mood` | `happy`, `sleepy` (eyes shut), `surprised` (round mouth) | `happy` |
| `blink`, `idle` | blink every few seconds; breathe | `true`, `true` |
| `hide` | `plain`, or `chimera`: on paper a coat split down her middle, warm on the left and cool on the right like her eyes, with patches in the tag colors that drift slowly (ink blots in Ink Blot; none in Knight Night, where she glows instead) | `plain` |

- It returns `{set(options), get(), stop(), stages}`; `set` redraws and fires `sb:creature`. `Storeybrook.creatureSVG(options)` returns the drawing as a string.
- The drawing is `role="img"` with a label ("Saelion as a sprite"). Its outline is `art-line`, its cheeks `wash-rose`, its wings `wash-sky`, its stars `gamboge`; one eye amber, one blue. Fur warms in Knight Night and turns white in Ink Blot.
- Breathing and blinking stop under reduced motion and in Ink Blot; so does the chimera's drift.
- Use `chimera` where she has to stand out on a light page: the outline and the two-toned coat keep her from vanishing into white paper.

**Do / Don't**
- Do keep one creature per screen, 120–220px, near the title or the brook.
- Do let it grow with progress, never shrink back.
- Don't let it talk over the story: its lines go in a Balloon beside it, briefly.
