# Jar

The nougat jar: the count of every nougat a person has earned, filling toward a cap. Nougats fly into it from whatever earned them.

**Provide** `<button class="sb-jar" data-cap="30" type="button"></button>` (add `sb-jar--fixed` to pin it to the bottom-right corner). `init()` draws the jar and its count; `Storeybrook.rewards.paint()` repaints after a change. A single nougat is `<span class="sb-nougat" data-sb-nougat="7"></span>` (the seed places its nuts; set `--n` for its width, default 44px).

- `Storeybrook.rewards.drop(n, {from, to, reason})` flies n nougats from `from` to the jar over `dur-drop`, 140ms apart; each one adds to the count as it lands, bumps the jar, crinkles (if sound is on), buzzes 12ms and fires `sb:nougat`.
- The jar's name is its count: "9 nougats in the jar". The count is `count` style, tabular.
- Under reduced motion the nougats land at once.

**Do / Don't**
- Do drop nougats from the thing that earned them, so the flight explains itself.
- Don't take nougats out of the jar. Nothing costs nougats.
