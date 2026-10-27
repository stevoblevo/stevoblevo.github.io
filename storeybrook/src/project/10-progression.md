# Rewards and progression

Storeybrook games reward people the way a picture book does: with something to keep and somewhere new to go. They never take anything back.

## Nougats

A nougat is the kit's one reward. It flies from the thing that earned it into the jar.

- `Storeybrook.rewards.drop(n, {from, to, reason})` flies `n` nougats from the `from` element to the jar (`to`, default the first `.sb-jar`), adds them as each lands, plays the crinkle if sound is on, buzzes 12ms, and fires `sb:nougat` with `{count, delta, reason}`.
- `Storeybrook.rewards.count()` reads the total; it is kept in local storage (`sb:nougats`).
- The jar (`sb-jar`) shows the count and fills toward `data-cap` (default 30); past the cap it stays full and keeps counting.
- A button with `data-sb-drop="2"` and `data-sb-reason` drops nougats when pressed (for demos and tutorials).

**Nougats are never spent.** They open things by being in the jar, the way height opens a shelf. Nothing ever costs nougats, so nothing can be lost, and a person who stops for a month comes back to the same jar.

## Stones

A brook of stones is the map of a game: each stone is a place, a chapter, a mini-game or a look. `Storeybrook.brook(host, {stones, seed, direction, onStep})` draws it.

| State | Looks like | Says |
|---|---|---|
| `open` | a plain stone with its number or mark | its name |
| `current` | rose halo, a slow bob | "you are here" |
| `done` | sap stone with a check | "walked" |
| `locked` | a paler dashed face and a lock; the label stays in ink | "locked", and on press its `why` as a toast |

- A stone with `href` is a link; without one it is a button that calls `onStep(stone, index)` and fires `sb:step`.
- The trail behind the last `current` or `done` stone is drawn as the walked path (`sb-brook__walked`, in `cue`).
- Labels sit beside the stones on a vertical brook, under them on a horizontal one. Keep labels to two or three words, with a `sub` line for the detail ("2 more").

## Unlocks and stickers

- `Storeybrook.unlock(id, {name, line})` records an unlock (`sb:unlocks`), peels on any sticker with `data-sb-sticker="<id>"`, opens any lock with `data-sb-lock="<id>"`, shows anything with `data-sb-when="<id>"`, and toasts "<name> is open now."
- Stickers fill the album (`sb-album`): a locked sticker is a dashed outline with its name in `ink-muted`, so a person can see what is still to find.
- A lock (`sb-lock`) covers a cover or a panel with stripes, a keyhole, its reason (`sb-lock__why`) and how to open it (`sb-lock__how`).

## The creature grows

The creature's `stage` can follow progress: an egg at the start, a kit at the first unlock, a bun, a sprite, and Saelion with its stars at the end. Growth is a reward in itself; it never shrinks back.

## Rules (no dark patterns)

- Nothing is lost: no nougats spent, no streaks broken, no lives, no energy, no timers.
- Every lock says how to open it, and an "open everything" switch is always available for people who just want to play (AND SO's early-access switch opens every stone and look at once).
- Daily gifts are a hello, not a chore: a few nougats for coming back on a new day, never a penalty for missing one.
- Idle gifts are small and rare (AND SO drops one nougat every two and a half minutes after a minute and a half of quiet listening).
- Never sell nougats, never show a price next to a nougat, never ask for money to skip a lock.
- Rewards are announced once, briefly (a toast for 3.6s), and never block play.

## A worked example: AND SO 7

AND SO's brook has thirteen stones opened by nougats in the jar (0, 2, 4, 6, 8, 10, 12, 15, 18, 21, 25, 30, 36). Nougats come from the first visit (two) and each new day after it (three), every fourth thing found, each stone's first walk, finished quests, three-star rounds, jam choruses, and quiet listening. Looks wait behind stones; "open everything" opens them all at once.
