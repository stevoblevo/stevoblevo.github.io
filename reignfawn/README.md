# Reignfawn

A Kingdom-style idle side-scroller in the Saelion world. You ride a fawn along a lantern valley, drop coins to raise a hearth, a hall, a keep and a castle, recruit wanderers, arm them with tools, and keep the crown through the night. The valley keeps earning while you are away.

**Play:** https://stevoblevo.github.io/reignfawn/

## What is in v1

- Five valleys (Peach Dusk, Mint Glasshouse, Red Rain, Cobalt Snow, Gold Lantern), each opened by one of the Saelion paintings, then endless "Ever" valleys.
- The coin economy: kindle the hearth, buy bows, hammers, scythes and shields at the stalls, pay for walls (palisade to lantern wall), towers, fields and mills. Builders raise what you pay for.
- Archers hunt by day and hold the walls at night. Farmers work fields from spring to autumn. Knights hold the outer wall.
- The hush comes out of a gate at each end every night, and comes thick on red-rain nights. It takes coins, tools and, from an empty purse, the crown.
- Mounts found in stables: Fawn, Stag, Great Moth, Pipkin, Snow Bear and Saelion. Each changes speed, stamina, light, or what you find.
- Shrines (bow, hammer, sheaf, lantern, purse) and an old chest in every valley.
- Build the lantern boat (hull, mast, sail) and sail on to the next valley.
- Idle: the treasury by the fire fills while you are away (capped by the hearth tier), plus a small gift on your first visit each day and a tithe each dawn.
- Lean back (L): the mount rides herself, collects, recruits and spends.
- Frolic mode: no raids, only building, riding and fireflies.
- Generative score in just intonation (7/6 and 7/4 at night, 11/8 and 13/8 on red-rain nights), faint bells at dawn, synthesized effects. Equal temperament is a setting.
- Keyboard, touch and gamepad. Saves to this browser.

## Source

`index.html` is the whole game (no build step at runtime). The painted plates live in `art/`.

## Toward Steam ($25.99, best at the $5.99 sale)

1. Wrap with Tauri (Rust) for Windows, macOS and Linux; the game already runs as a single page with keyboard and gamepad.
2. Steamworks through `steamworks-rs`: achievements from the ledger (valleys crossed, mounts found, nights kept), Steam Cloud for the two save keys, rich presence ("Valley III, day 14").
3. Content to reach the price: hand-drawn sprite pass over the procedural pixel art, a second biome per valley, hush gates you can assault with knights, a co-op second monarch, a soundtrack pass on the generative score.
4. Steam Deck: the touch-free controls already map to the gamepad; verify text size at 1280x800.
