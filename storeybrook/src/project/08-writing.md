# Writing

Words in Storeybrook are read twice: once by eye, once aloud by a voice that has never seen the page. Write for both.

## Voice

- **Narration** is past tense, plain and specific: "The brook went on without asking, so Dora went with it." Name real things (the far stone, the copper lid), not moods.
- **Instructions** are present tense, short, and start with a verb: "Walk to the next stone." "Tap the jar to count."
- **Characters** speak in balloons. The creature speaks in short lower-case lines ("hi. i am mostly vibes."), which is its voice, not the system's.
- **Sentence case** for every title, button and label. No all-caps, no title case.
- **No exclamation marks** except inside Comix balloons and sound effects ("NOUGAT!", "PLUNK").
- **No emoji.** **No "Oops".** **No "simply" or "just"** in instructions.

## Buttons and links

| Say | Not |
|---|---|
| Play this one | Start, Go, Submit |
| Read it to me | Listen, TTS, Audio |
| Skip the story | Skip, Close |
| Walk to the next stone | Continue, Next level |
| Open the jar | Rewards, Inventory |
| Turn the page | Next |

A button keeps its name through the whole flow: "Read it to me" becomes "Pause reading" while speaking and "Keep reading" when paused, and nothing else.

## Locks, prices and rewards

- A lock says why and how, in one sentence: "Walk two more stones to open Origami." Never "Locked" alone.
- A price is honest: the tag says "99¢ each"; until a shop exists the page also says "Free to play now". Never a countdown, never "only today", never a crossed-out price.
- A reward names what it was for: "A nougat for walking the far stone." Never "You earned 1 nougat!".
- Empty states invite: "No stickers yet. The first one is on the porch stone."

## Writing for reading aloud

- Keep sentences under about 200 characters. The reader speaks in chunks that end at sentence marks, up to 220 characters, and long sentences split badly.
- Write numbers the way they are said in stories ("three stones", "ninety-nine cents"), and figures in interface ("3 of 12").
- Avoid symbols a voice mispronounces: write "and" not "&", "to" not "→", "about" not "~".
- Put anything that should not be read (icons, decorations, repeated labels) in `aria-hidden="true"` or `class="sb-noread"`; the reader skips both.
- Give every chapter a title the reader can announce: the reader bar shows it as `sb-reader__title`.

## Captions, balloons, notes

- `sb-caption` is the narrator's box over a picture: one or two sentences, with an optional speaker (`sb-caption__who`).
- `sb-balloon` is a character speaking; `--think` is a thought (italic, story face); `--shout` is a Comix shout on `gamboge`. One balloon per speaker per panel.
- `sb-note` is the book owner's handwriting in `cue`: a tip in the margin ("try the far stone!"). One per view, at most six words.
