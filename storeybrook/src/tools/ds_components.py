"""Write Storeybrook's component folders (README.md + preview.html) into project/components/. Not published."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import P

FONTS = ("https://fonts.googleapis.com/css2?family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800"
         "&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&family=IM+Fell+English:ital@0;1&family=Bangers"
         "&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Zen+Maru+Gothic:wght@400;500;700&display=swap")
BASE = ("html,body{margin:0}body.sb-body{min-height:0;background:var(--paper);color:var(--ink);font-family:var(--sb-story)}"
        ".pv{position:relative;padding:24px 32px}.row{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.stack{display:grid;gap:18px}")
PRE = "var S=window.Storeybrook;if(S){S.ensureDefs();S.mountIcons();}"

C = []
def comp(name, group, height, readme, body, script="", style=""):
    C.append(dict(name=name, group=group, height=height, readme=readme.strip() + "\n", body=body.strip(), script=script.strip(), style=style.strip()))


# ---------------------------------------------------------------- Actions
comp("Button", "Actions", 190, r"""
# Button

Pill-shaped actions in the interface face; one primary per view, in `accent`.

**Provide** a `<button>` (or `<a>` for navigation) with `sb-btn` and one variant, and a label that says what happens: "Play this one", "Read it to me", "Skip the story".

| Variant | Use | Paint |
|---|---|---|
| `sb-btn--primary` | the one thing to do now | `accent` fill, `on-accent` label, a wax gloss and `shadow-seal` |
| `sb-btn--secondary` | the second choice | `ink` border on a page tint; `cue-soft` on hover |
| `sb-btn--quiet` | escape hatches: skip, back, not now | `ink-muted` label, no box; a wavy `cue` underline on hover; keeps the 48px target |
| `sb-btn--sticker` | playful extras: a new look, a surprise | a `page` sticker on a blob, tilted 2°, `shadow-sticker` |

Sizes: default (`size-target`, 48px; 56px kid, 64px TV), `sb-btn--lg` (+16px, for the landing's Play), `sb-btn--sm` (40px, dense rows only), `sb-btn--icon` (a circle; give it an `aria-label`). An icon goes first inside the label (`data-sb-icon`, 1.25em).

**States**
- Hover lifts 1px; pressed sinks 1px (`dur-tap`). Focus shows the `focus` ring.
- Disabled: `disabled` (or `aria-disabled="true"` on a link) dims to `op-disabled`; say why nearby.
- Busy: `aria-busy="true"` adds a turning ring after the label; keep the label.

**Looks**: Comix gives every button a 3px ink border and a 4px offset shadow that presses flat; Origami squares the primary and folds its corner; Skein silk stitches a dashed thread inside the primary; Ink Blot is flat black with no gloss.

**Do / Don't**
- Do keep one primary per view; the landing's is "Play this one".
- Don't use a primary for skipping: skipping is `--quiet`.
- Don't put `cue` on a button: blue means the brook, links and reading, not actions.
""", """
<div class="pv stack">
<div class="row"><button class="sb-btn sb-btn--primary sb-btn--lg">Play this one</button>
<button class="sb-btn sb-btn--secondary"><span data-sb-icon="voice"></span>Read it to me</button>
<button class="sb-btn sb-btn--quiet">Skip the story</button>
<button class="sb-btn sb-btn--sticker">New look</button></div>
<div class="row"><button class="sb-btn sb-btn--primary sb-btn--icon" aria-label="Read it to me"><span data-sb-icon="play" data-size="26"></span></button>
<button class="sb-btn sb-btn--secondary sb-btn--sm"><span data-sb-icon="map"></span>The brook</button>
<button class="sb-btn sb-btn--primary" disabled>Opens at 6 nougats</button>
<button class="sb-btn sb-btn--secondary" aria-busy="true">Saving the page</button></div>
</div>""", PRE)

comp("Seal", "Actions", 170, r"""
# Seal

A wax seal in `accent` for the one press that begins or keeps something: begin the book, sign it, keep this.

**Provide** `<button class="sb-seal" aria-label="Begin the book">` holding one letter (set in the look's display face), or put `data-sb-icon` on the seal itself so the icon is its only child (drawn at 46% of the seal). Sizes: `sb-seal--sm` (52px), default (76px), `sb-seal--lg` (112px).

- The seal is `shape-seal`, lit from the top left, with a raised rim, a drip, and `shadow-seal`. Hover turns it 6° and grows it 4% (`ease-bounce`).
- Ink Blot makes it black; Comix rims it in ink; Origami turns it into a 45° diamond with its content upright.

**Do / Don't**
- Do use at most one seal per page, for a moment that matters.
- Do give it an `aria-label`: a single letter is not a name.
- Don't use a seal for routine actions or navigation; that is `sb-btn`.
""", """
<div class="pv row" style="gap:28px">
<button class="sb-seal sb-seal--sm" aria-label="Keep this" data-sb-icon="check"></button>
<button class="sb-seal" aria-label="Begin the book">B</button>
<button class="sb-seal sb-seal--lg" aria-label="Open the storybook" data-sb-icon="book" data-size="48"></button>
</div>""", PRE)

# ---------------------------------------------------------------- Inputs
comp("Choice", "Inputs", 230, r"""
# Choice

A row of pill-shaped radio choices for picking one of a few: who reads, the pace, how hard.

**Provide** a `<fieldset class="sb-choice">` with a `<legend>`, then one `<label>` per option holding an `<input type="radio">` and a `<span>` with the option's name. Give the radios one `name`.

- Unchosen: `page` pill with an `ink-muted` border (3:1 or better on every ground) and an `ink` label. Chosen: `accent` border, `accent-soft` fill, `accent` label (4.5:1 or better in every look).
- The focus ring draws around the pill of the focused radio. Arrow keys move between options, as radios do.
- Two to five options. More than five, or options longer than three words: use a `<select>`.

**Do / Don't**
- Do name options with nouns or short phrases: "Moira", "Orla", "You".
- Don't use a choice for on/off: that is a Toggle.
""", """
<div class="pv stack">
<fieldset class="sb-choice"><legend>Who reads</legend>
<label><input type="radio" name="who" checked><span>Moira</span></label><label><input type="radio" name="who"><span>Orla</span></label><label><input type="radio" name="who"><span>You</span></label></fieldset>
<fieldset class="sb-choice"><legend>Pace</legend>
<label><input type="radio" name="pace"><span>Slow</span></label><label><input type="radio" name="pace" checked><span>Story</span></label><label><input type="radio" name="pace"><span>Quick</span></label></fieldset>
</div>""", PRE)

comp("Toggle", "Inputs", 110, r"""
# Toggle

An on/off switch: a folded-paper tab sliding in a track. On is `cue`.

**Provide** `<label class="sb-toggle">` holding `<input type="checkbox">`, then `<span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>`, then the label text. The label says what turns on: "Hide the words", "Sound", "Read along".

- Off: `surface` track with an `ink-muted` edge; the thumb is a `page` tab with a dog-eared corner and an `ink` outline. On: `cue-soft` track, `cue` edge, `cue` thumb slid 26px (`ease-bounce`).
- The whole label is the target (at least `size-target` tall). The focus ring draws around the track.
- Disabled: `disabled` on the input dims the track and the label; say why nearby.

**Do / Don't**
- Do apply the change at once; a toggle never waits for a Save button.
- Don't use a toggle for choosing between two named things (Moira or Orla): use a Choice.
""", """
<div class="pv row" style="gap:28px">
<label class="sb-toggle"><input type="checkbox" checked><span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>Hide the words</label>
<label class="sb-toggle"><input type="checkbox"><span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>Sound</label>
<label class="sb-toggle"><input type="checkbox" disabled><span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>Haptics (not on this device)</label>
</div>""", PRE)

comp("Slider", "Inputs", 130, r"""
# Slider

A range on a copper thread with an `accent` bead, for one continuous setting: reading speed, space, volume.

**Provide** `<label class="sb-slider">` holding `<span class="sb-slider__row"><span>Reading speed</span><output>0.96</output></span>` and `<input type="range">`. Keep the `<output>` in step with the value, and set `--p` on the input to the filled percentage so WebKit draws the copper part of the track (Firefox draws it itself).

- The track is 4px: `copper` up to the bead, `line` after it. The bead is 26px with an `art-line` rim.
- The value in the `<output>` is tabular so it does not jitter.

**Do / Don't**
- Do show the value in words or numbers a person understands ("0.96×", "story pace").
- Don't use a slider for fewer than five steps: use a Choice.
""", """
<div class="pv" style="max-width:420px">
<label class="sb-slider"><span class="sb-slider__row"><span>Reading speed</span><output id="o">0.96×</output></span>
<input id="r" type="range" min="0.7" max="1.3" step="0.01" value="0.96"></label>
</div>""", PRE + "var r=document.getElementById('r'),o=document.getElementById('o');function f(){var p=(r.value-r.min)/(r.max-r.min)*100;r.style.setProperty('--p',p+'%');o.textContent=(+r.value).toFixed(2)+'×';}r.addEventListener('input',f);f();")

LOOKS = [("daylight", "Meta Daylight", "Watercolor paper", "#f4f6f2", "#f3c6d3", "#8cc2e6", "#26323f", "DynaPuff"),
         ("knight", "Knight Night", "By candle", "#1c2838", "#f0c75e", "#8fb4e8", "#f4efe6", "IM Fell English"),
         ("inkblot", "Ink Blot", "E-ink and print", "#ffffff", "#000000", "#9e9e9e", "#000000", "IM Fell English"),
         ("comix", "Comix", "Halftone and balloons", "#fffdf5", "#ff9fd0", "#38b6ee", "#111111", "Bangers"),
         ("origami", "Origami", "Folded paper", "#eceef0", "#f6c3b8", "#9ab6e0", "#1f2a33", "Zen Maru Gothic"),
         ("skein", "Skein silk", "Silk and copper", "#f6ecee", "#f2c6d2", "#cfe8dc", "#3a2330", "Caveat")]
looks_html = "".join(
    f'<button class="sb-look" type="button" data-sb-look="{i}"' + (' aria-disabled="true" data-sb-why="Skein silk opens at 25 nougats."' if i == "skein" else "") +
    f' style="--sw-paper:{p};--sw-a:{a};--sw-b:{b};--sw-ink:{ink};--sw-font:\'{fnt}\'"><span class="sb-look__swatch" aria-hidden="true"><i></i><i></i><b>Aa</b></span>{n}<small>{line}</small></button>'
    for i, n, line, p, a, b, ink, fnt in LOOKS)
comp("Looks", "Inputs", 340, r"""
# Looks

The look picker: one button per look, each showing that look's paper, two of its pigments and its display face.

**Provide** `<div class="sb-looks">` holding a `<button class="sb-look" data-sb-look="<id>">` per look, each with `<span class="sb-look__swatch" aria-hidden="true"><i></i><i></i><b>Aa</b></span>`, the look's name and a `<small>` line. Set the swatch with inline custom properties: `--sw-paper`, `--sw-a`, `--sw-b` (two pigments), `--sw-ink`, `--sw-font`. The swatch values are the look's own and do not change with the current look.

- `Storeybrook.init()` binds every `[data-sb-look]`: pressing one sets the look, remembers it and keeps `aria-pressed` true on the current one (an `accent` border with an `accent-soft` halo).
- A look that waits behind progress has `aria-disabled="true"` and a `data-sb-why` sentence; pressing it shows the sentence as a toast.
- The grid fills columns of at least 150px.

**Do / Don't**
- Do keep Meta Daylight first and Ink Blot reachable early: it is the look for e-ink, print and no motion.
- Don't hide a locked look; show it dimmed with its reason, so people know it exists.
""", f'<div class="pv"><div class="sb-looks">{looks_html}</div></div>',
     PRE + "document.querySelectorAll('[data-sb-look]').forEach(function(b){function sync(){var cur=document.documentElement.getAttribute('data-theme')||'daylight';document.querySelectorAll('[data-sb-look]').forEach(function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-sb-look')===cur));});}sync();b.addEventListener('click',function(){if(b.getAttribute('aria-disabled')==='true'){if(S)S.toast(b.getAttribute('data-sb-why'),{ms:2600});return;}if(S)S.theme.set(b.getAttribute('data-sb-look'),{persist:false});else document.documentElement.setAttribute('data-theme',b.getAttribute('data-sb-look'));sync();});});")

# ---------------------------------------------------------------- Paper
comp("Sheet", "Paper", 230, r"""
# Sheet

A sheet of `page` laid on the paper: a deckled edge, the paper's grain, `shadow-page`, held down with washi tape at up to two corners.

**Provide** `<div class="sb-sheet">` with its content. Add tape as the first children: `<span class="sb-tape sb-tape--tl" aria-hidden="true"></span>` (`--tl`, `--tr`, `--bl`, `--br`).

- Padding runs `clamp(1.25rem, 3vw, 2.5rem)`. The edge comes from the `#sb-deckle` filter, which `Storeybrook.init()` (or `ensureDefs()`) puts in the page.
- Comix gives the sheet a square 3px ink border; Origami a crisp edge with a folded corner; Skein silk a sheen and a dashed copper stitch; Ink Blot a plain white sheet.

**Do / Don't**
- Do use a sheet for anything that holds text over washes: a lede, a note, a form.
- Don't nest sheets, and don't tape more than two corners.
""", """
<div class="pv" style="padding:36px 40px"><div class="sb-sheet" style="max-width:520px">
<span class="sb-tape sb-tape--tl" aria-hidden="true"></span><span class="sb-tape sb-tape--br" aria-hidden="true"></span>
<h3 class="title" style="margin:0 0 6px">The porch stone</h3>
<p class="story-body" style="margin:0;font-size:1.1rem">The first stone was warm from the sun, and Dora sat on it to read the rest of the map.</p>
</div></div>""", PRE)

comp("Washes", "Paper", 230, r"""
# Washes

Watercolor fields that bleed, mix and granulate: the only way large color arrives on the page.

**Provide** an absolutely placed `<div class="sb-washes" aria-hidden="true">` as the first child of a positioned container, holding up to five `<i class="sb-wash sb-wash--sky">` (or `--meadow`, `--rose`, `--sun`, `--brook`). Size and place each with inline style: `--w` (width, default 40%), `--ar` (aspect ratio, default 1.35), and `left`, `top`, `right` or `bottom`. `sb-wash--band` makes a full-width band (`--h` its height) for a sky or a meadow. `<i class="sb-sun">` is a sun of unpainted paper with a `wash-sun` halo.

- Each wash is darker at its rim, granulated, bled through `#sb-bleed`, at `op-wash`, and blended `multiply`, so overlaps mix like glazes. Knight Night glows them (`screen`); Ink Blot turns them to stipple; Comix to halftone; Origami to folded facets.
- `sb-bloom` on a wash lets it arrive once over `dur-bleed`.
- `sb-grain` lays the paper grain on any one element.

**Do / Don't**
- Do keep text on a sheet over washes, never straight on them.
- Don't use more than five washes on a screen, or a wash to mean something: they are weather, not signals.
""", """
<div class="pv" style="height:220px;overflow:hidden;padding:0">
<div class="sb-washes"><i class="sb-wash sb-wash--sky sb-wash--band" style="top:-30%;--h:60%"></i><i class="sb-sun" style="--w:13%;right:6%;top:4%"></i>
<i class="sb-wash sb-wash--rose sb-bloom" style="--w:30%;left:-6%;top:34%"></i><i class="sb-wash sb-wash--brook" style="--w:26%;left:58%;top:50%;--ar:2"></i>
<i class="sb-wash sb-wash--meadow sb-wash--band" style="bottom:-34%;--h:56%"></i></div>
<div class="sb-sheet" style="position:absolute;left:32%;top:30%;max-width:300px;padding:14px 18px"><p class="label" style="margin:0">Text sits on a sheet, never straight on a wash.</p></div>
</div>""", PRE)

comp("Page", "Paper", 350, r"""
# Page

One book page: `page` with long fibres, a deckled edge and `shadow-page`, `size-page` wide, with a folio.

**Provide** `<article class="sb-page">` with the page's content and `<span class="sb-page__folio">7</span>` for the page number. Add `sb-page--lined` for an exercise book's lines (a `cue` hairline every 1.6em). Inside a spread a page gets `sb-page--left` or `sb-page--right`, which also places the folio on the outer corner.

- Padding grows from `clamp(1.5rem, 4vw, 3.5rem)`; text inside is `sb-prose` at the reading measure.
- Comix squares the page and inks its edge.

**Do / Don't**
- Do put one chapter or one scene on a page; turn the page rather than scroll inside it.
- Don't put controls other than links and the reader on a page: they belong to the chrome.
""", """
<div class="pv" style="display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start">
<article class="sb-page sb-page--right" style="min-height:220px"><h3 class="display-s" style="margin:0 0 10px">The far stone</h3>
<div class="sb-prose" style="font-size:1.05rem"><p>Nobody had walked to the far stone in years, so the moss had made itself at home.</p></div><span class="sb-page__folio">7</span></article>
<article class="sb-page sb-page--lined sb-page--right" style="min-height:220px"><p class="sb-note" style="margin:0">things the brook said</p>
<div class="sb-prose" style="font-size:1.05rem;line-height:1.6em"><p>plink. plonk. a fish.</p></div><span class="sb-page__folio">8</span></article>
</div>""", PRE)

comp("Spread", "Paper", 230, r"""
# Spread

Two pages open like a book, with a gutter shadow down the middle; pages turn with a leaf. Below `bp-expanded` (1024px) it shows one page at a time.

**Provide** `<div class="sb-spread" data-sb-spread>` holding the book's `<article class="sb-page">`s in order. `Storeybrook.init()` (or `Storeybrook.spread(host)`) adds a turn button down each outer edge (18% wide, labelled "Previous page" and "Next page"), turns on ←/→ and Page Up/Page Down while the spread has focus, turns on a 50px swipe, and fires `sb:page` with `{index, count}`.

- A turn flips a leaf over `dur-turn` with `ease-paper`; the new pages show at the half-way point; a paper rustle plays if sound is on. Reduced motion cuts straight to the new pages.
- `spread(host)` returns `{next(), prev(), index(), count}`.

**Do / Don't**
- Do give each page a folio, and the first page a title.
- Don't turn pages by themselves; a turn always answers a press, a key or a swipe.
""", """
<div class="pv"><div class="sb-spread" id="sp" aria-label="The octopus who learned to be a bunny">
<article class="sb-page"><h3 class="display-s" style="margin:0 0 8px">Chapter one</h3><div class="sb-prose" style="font-size:1.05rem"><p>Once the octopus had learned to be a bunny, the butterfly part was easy.</p></div><span class="sb-page__folio">1</span></article>
<article class="sb-page"><div class="sb-prose" style="font-size:1.05rem"><p>She tried it in the morning, when the brook was loud enough to cover any mistakes.</p></div><span class="sb-page__folio">2</span></article>
<article class="sb-page"><div class="sb-prose" style="font-size:1.05rem"><p>By noon she could hover over the stones without touching them.</p></div><span class="sb-page__folio">3</span></article>
<article class="sb-page"><div class="sb-prose" style="font-size:1.05rem"><p>By evening she had forgotten she had ever been only one thing.</p></div><span class="sb-page__folio">4</span></article>
</div></div>""", PRE + "if(S)S.spread(document.getElementById('sp'));")

# ---------------------------------------------------------------- Story
comp("Prose", "Story", 290, r"""
# Prose

Story text and its marks: the lede, the body at the reading measure, a drop cap, ink links and the owner's handwritten note.

**Provide**
- `<p class="sb-lede">` for the first paragraph of a page (`story-lede`, up to 34em).
- `<div class="sb-prose">` around the story's paragraphs (`story-body`, fluid from 1.125rem to 1.375rem, at `size-measure`).
- `<span class="sb-dropcap">O</span>` as the first letter of a chapter: the display face in `accent`, 4.6em, over a small sun wash (a square in Ink Blot, a gamboge panel in Comix).
- `<a class="sb-ink-link">` (or any link inside `sb-prose`): `link` with a wavy underline that darkens on hover; solid and 2px in Ink Blot.
- `<p class="sb-note">` for a handwritten note in `cue` (Caveat, 1.6rem).

At the kid density, ledes and prose switch to Andika at 1.3–1.6rem.

**Do / Don't**
- Do use one drop cap per chapter and one note per view.
- Don't justify, don't set story text in capitals, don't underline anything that is not a link.
""", """
<div class="pv" style="max-width:640px">
<p class="sb-lede">The brook went on without asking, so Dora went with it.</p>
<div class="sb-prose" style="margin-top:14px"><p><span class="sb-dropcap">E</span>very stone was a small game, and every game had a door in it. The first door was a porch, and the porch had a jar on it, and the jar was nearly empty. <a class="sb-ink-link" href="#">Read the first chapter</a>.</p></div>
<p class="sb-note">try the far stone!</p>
</div>""", PRE)

comp("Caption", "Story", 130, r"""
# Caption

The narrator's box over a picture: a slip of `surface` paper set a little askew, in the story face, with an optional speaker.

**Provide** `<p class="sb-caption">` with one or two sentences; put the speaker first as `<span class="sb-caption__who">Saelion</span>` (Andika bold in `accent`).

- Up to 30em wide; `shadow-sticker`; turned −0.6°. Comix squares it with an ink border and no tilt.

**Do / Don't**
- Do use a caption for narration over art and panels; use a Balloon when a character speaks.
- Don't put more than two captions on a picture.
""", """
<div class="pv row" style="gap:28px;align-items:flex-start">
<p class="sb-caption" style="margin:0">Meanwhile, under the stones, the nougats were keeping very still.</p>
<p class="sb-caption" style="margin:0"><span class="sb-caption__who">Saelion</span>The jar is only half full. That is the good half.</p>
</div>""", PRE)

comp("Balloon", "Story", 250, r"""
# Balloon

Speech balloons for characters: a rounded balloon with an inked tail, a thought cloud, and a Comix shout.

**Provide** `<p class="sb-balloon">` with what is said. Variants: `sb-balloon--right` (tail toward the right; set `--tail-x` for any other place), `sb-balloon--think` (a cloud with two bubbles, italic, in the story face), `sb-balloon--shout` (a `gamboge` burst in Bangers, for sound and surprise).

- Balloons are `page` with a `border-ink` line in `art-line` and Comic Neue bold, up to 22em. Comix thickens the line to 3px and drops the shadow.
- Balloons sit near the speaker, never covering faces or the text of the page.

**Do / Don't**
- Do keep a balloon to one or two short sentences.
- Do keep exclamation marks for shouts; a Comix shout may have one.
- Don't use a balloon for system messages; that is a Toast.
""", """
<div class="pv row" style="gap:30px;align-items:flex-start;padding-bottom:40px">
<p class="sb-balloon" style="margin:0">Is that a nougat in the brook?</p>
<p class="sb-balloon sb-balloon--right" style="margin:0">It is a stone. Probably.</p>
<p class="sb-balloon sb-balloon--think" style="margin:0">it is warm from the sun</p>
<p class="sb-balloon sb-balloon--shout" style="margin:0">NOUGAT!</p>
</div>""", PRE)

comp("Panels", "Story", 250, r"""
# Panels

Comic panels: a grid of inked frames with captions, halftone and sound effects.

**Provide** `<div class="sb-panels" style="--cols:3">` holding `<div class="sb-panel">`s. Options: `sb-panel--wide` (two columns), `sb-panel--tall` (two rows), `sb-panel--dots` (a `cue` halftone ground). Inside a panel: `<p class="sb-panel__cap">` for the caption box at the top left, `<span class="sb-panel__sfx" aria-hidden="true">PLUNK</span>` for a sound effect (Bangers in `gamboge` with an ink stroke), and any art or balloons.

- Panels are `page` with a `border-ink` frame (3px in Comix), at least 180px tall, 14px apart.
- On phones set `--cols:1` or `2`; panels read left to right, top to bottom.

**Do / Don't**
- Do write a sound effect as a word in capitals (it is the one place capitals are right), and hide it from the reader with `aria-hidden` when the caption already says it.
- Don't use panels for layout of non-story content.
""", """
<div class="pv"><div class="sb-panels" style="--cols:3">
<div class="sb-panel sb-panel--dots"><p class="sb-panel__cap" style="margin:0">Meanwhile, under the stones</p><span class="sb-panel__sfx" style="right:14px;bottom:12px">PLUNK</span></div>
<div class="sb-panel sb-panel--wide" style="background:var(--wash-sky)"><p class="sb-balloon sb-balloon--shout" style="position:absolute;left:22px;top:28px;margin:0">NOUGAT!</p><div id="cr" style="position:absolute;right:24px;bottom:8px;--cw:150px"></div></div>
</div></div>""", PRE + "if(S)S.creature(document.getElementById('cr'),{stage:3,mood:'surprised'});")

comp("Reader", "Story", 240, r"""
# Reader

The read-aloud bar: a play button, the chapter's title, the voice in use and a meter, bound to the text it reads. Irish English first, word by word.

**Provide**
```html
<div class="sb-reader" data-sb-read="#story">
  <button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>
  <div class="sb-reader__info">
    <span class="sb-reader__title">The octopus who learned to be a bunny</span>
    <span class="sb-reader__voice"></span>
    <span class="sb-reader__meter"><i></i></span>
  </div>
  <select data-sb-voice aria-label="Voice"></select> <!-- optional -->
</div>
```
Add `sb-reader--fixed` to pin it to the bottom-left corner above the page (`z-reader`, safe areas respected). `Storeybrook.init()` binds every reader; `Storeybrook.read.bind(bar, target)` binds one by hand.

- The play button's icon and name follow the state: "Read it to me", "Pause reading", "Keep reading".
- The voice line says "Irish English voice", or which voice is used when there is no Irish one. With no voices at all the button is disabled and the line says the words are all on the page.
- The word being spoken gets `cue-soft` with a `cue` edge; the meter fills in `cue`.
- `<select data-sb-voice>` and `<select data-sb-rate>` are filled and remembered (`sb:voice`, `sb:rate`).

**Do / Don't**
- Do give the bar a chapter title; the voice reads the text, the title says what it is.
- Don't autoplay. Reading starts from a press.
""", """
<div class="pv stack" style="max-width:600px">
<div class="sb-reader" id="rd" data-sb-read="#st"><button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>
<div class="sb-reader__info"><span class="sb-reader__title">The octopus who learned to be a bunny</span><span class="sb-reader__voice"></span><span class="sb-reader__meter"><i style="--p:34%"></i></span></div></div>
<div id="st" class="sb-prose" style="font-size:1.1rem"><p>Once the octopus had learned to be a bunny, the butterfly part was easy. She tried it in the morning, when the brook was loud enough to cover any mistakes.</p></div>
</div>""", PRE + "if(S)S.read.bind(document.getElementById('rd'),document.getElementById('st'));")

# ---------------------------------------------------------------- Play
comp("Brook", "Play", 410, r"""
# Brook

The map of a game: a meandering watercolor brook with stepping stones that are scenes, chapters or mini-games. Each stone is open, current, walked or locked.

**Provide** an empty block with a height (it fills its width) and draw it with `Storeybrook.brook(host, options)`, or write the options as JSON in `data-sb-brook` and let `init()` draw it:

```html
<div style="height:320px" data-sb-brook='{"stones":[
  {"id":"porch","label":"The porch","sub":"walked","state":"done"},
  {"id":"doll","label":"Wake the doll","sub":"you are here","state":"current","mark":"2"},
  {"id":"origami","label":"Origami","sub":"2 more","state":"locked","why":"Origami opens at 18 nougats."}]}'></div>
```

A stone: `id`, `label`, `sub` (a second line), `state` (`open`, `current`, `done`, `locked`), `mark` (one character on the stone, default its number), `href` (makes it a link), `why` (the toast for a locked stone). Options: `seed` (the brook's meander), `direction` (`"down"` for a vertical brook; by default it turns vertical when the host is taller than it is wide), `onStep(stone, index, event)`.

- The brook is drawn in four strokes: a broad `wash-brook` wash, a deeper core, drifting `art-light` glints, and a dotted `cue` trail; the trail behind the last current or walked stone is drawn solid as the walked path.
- Stones are buttons (or links) with names that include their state ("Wake the doll, you are here"). A locked stone shows the lock and toasts its `why`; a walked stone shows a check in `sap`; the current stone has an `accent` halo and bobs.
- It redraws itself when its host changes size. `brook.set(id, state)` changes one stone.

**Do / Don't**
- Do keep labels to two or three words, with the detail in `sub`.
- Do keep four to eight stones in view; a longer journey scrolls or pages.
- Don't make the brook the only way to a chapter: keep a plain list of links for no-JS and for screen readers who prefer it.
""", """
<div class="pv" style="padding:24px 24px 56px"><div id="bk" style="height:320px"></div></div>""",
     PRE + "if(S)S.brook(document.getElementById('bk'),{seed:5,stones:[{id:'porch',label:'The porch',sub:'walked',state:'done'},{id:'doll',label:'Wake the doll',sub:'you are here',state:'current',mark:'2'},{id:'far',label:'The far stone',state:'open',mark:'3'},{id:'origami',label:'Origami',sub:'2 more',state:'locked',why:'Origami opens at 18 nougats.'},{id:'home',label:'Home',state:'open',mark:'5'}]});")

creatures = "".join(f'<figure style="margin:0;text-align:center"><div data-c=\'{{"form":"saelion","stage":{s}}}\' style="--cw:120px"></div><figcaption class="small" style="color:var(--ink-muted)">{n}</figcaption></figure>'
                    for s, n in enumerate(["egg", "kit", "bun", "sprite", "saelion"]))
creatures += "".join(f'<figure style="margin:0;text-align:center"><div data-c=\'{{"form":"{f}","mood":"{m}"}}\' style="--cw:120px"></div><figcaption class="small" style="color:var(--ink-muted)">{f}{", " + m if m != "happy" else ""}</figcaption></figure>'
                     for f, m in [("bunny", "happy"), ("octopus", "surprised"), ("pixie", "sleepy")])
comp("Creature", "Play", 360, r"""
# Creature

Saelion: a bunny, a tree octopus and a butterfly pixie at once, which grows from an egg. It breathes and blinks; it can be sleepy or surprised.

**Provide** an empty element and call `Storeybrook.creature(host, {form, stage, mood})`, or write the options in `data-sb-creature` and let `init()` draw it. Size it with `--cw` (default 180px).

| Option | Values | Default |
|---|---|---|
| `form` | `saelion`, `bunny`, `octopus`, `pixie` | `saelion` |
| `stage` | 0 `egg`, 1 `kit`, 2 `bun`, 3 `sprite`, 4 `saelion` (Saelion only) | 4 |
| `mood` | `happy`, `sleepy` (eyes shut), `surprised` (round mouth) | `happy` |
| `blink`, `idle` | blink every few seconds; breathe | `true`, `true` |

- It returns `{set(options), get(), stop(), stages}`; `set` redraws and fires `sb:creature`. `Storeybrook.creatureSVG(options)` returns the drawing as a string.
- The drawing is `role="img"` with a label ("Saelion as a sprite"). Its outline is `art-line`, its cheeks `wash-rose`, its wings `wash-sky`, its stars `gamboge`; one eye amber, one blue. Fur warms in Knight Night and turns white in Ink Blot.
- Breathing and blinking stop under reduced motion and in Ink Blot.

**Do / Don't**
- Do keep one creature per screen, 120–220px, near the title or the brook.
- Do let it grow with progress, never shrink back.
- Don't let it talk over the story: its lines go in a Balloon beside it, briefly.
""", f'<div class="pv" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px 12px">{creatures}</div>',
     PRE + "if(S)document.querySelectorAll('[data-c]').forEach(function(h){S.creature(h,JSON.parse(h.getAttribute('data-c')));});")

# ---------------------------------------------------------------- Rewards
comp("Jar", "Rewards", 150, r"""
# Jar

The nougat jar: the count of every nougat a person has earned, filling toward a cap. Nougats fly into it from whatever earned them.

**Provide** `<button class="sb-jar" data-cap="30" type="button"></button>` (add `sb-jar--fixed` to pin it to the bottom-right corner). `init()` draws the jar and its count; `Storeybrook.rewards.paint()` repaints after a change. A single nougat is `<span class="sb-nougat" data-sb-nougat="7"></span>` (the seed places its nuts; set `--n` for its width, default 44px).

- `Storeybrook.rewards.drop(n, {from, to, reason})` flies n nougats from `from` to the jar over `dur-drop`, 140ms apart; each one adds to the count as it lands, bumps the jar, crinkles (if sound is on), buzzes 12ms and fires `sb:nougat`.
- The jar's name is its count: "9 nougats in the jar". The count is `count` style, tabular.
- Under reduced motion the nougats land at once.

**Do / Don't**
- Do drop nougats from the thing that earned them, so the flight explains itself.
- Don't take nougats out of the jar. Nothing costs nougats.
""", """
<div class="pv row" style="gap:28px"><button class="sb-jar" id="jar" data-cap="30" type="button"></button>
<span class="sb-nougat" data-sb-nougat="3"></span><span class="sb-nougat" data-sb-nougat="7" style="--n:56px"></span><span class="sb-nougat" data-sb-nougat="11"></span>
<button class="sb-btn sb-btn--secondary sb-btn--sm" id="drop"><span data-sb-icon="nougat"></span>Drop a nougat</button></div>""",
     PRE + "if(S){document.querySelectorAll('[data-sb-nougat]').forEach(function(x){x.innerHTML=S.nougatSVG(+x.getAttribute('data-sb-nougat'));});var j=document.getElementById('jar');if(!j.querySelector('.sb-jar__count'))j.insertAdjacentHTML('beforeend','<span class=\"sb-jar__count\"></span>');if(S.rewards.count()<9)S.rewards.set(9);S.rewards.paint();document.getElementById('drop').addEventListener('click',function(e){S.rewards.drop(1,{from:e.currentTarget,to:j,reason:'trying the preview'});});}")

stk = [("star", "first stone", ""), ("leaf", "the meadow", ""), ("origami", "origami", " sb-sticker--locked"), ("heart", "a friend", " is-new")]
stickers = "".join(f'<div class="sb-sticker{c}" style="--rot:{r}deg"><span class="sb-sticker__art"><span data-sb-icon="{i}" data-size="48"></span></span><span class="sb-sticker__name">{n}</span></div>'
                   for (i, n, c), r in zip(stk, [-4, 3, -2, 5]))
comp("Sticker", "Rewards", 220, r"""
# Sticker

Stickers for things found and places opened, kept in an album. A sticker not found yet is a dashed outline with its name, so a person can see what is still to find.

**Provide** `<div class="sb-sticker" data-sb-sticker="<id>">` holding `<span class="sb-sticker__art">` (an icon or a small drawing) and `<span class="sb-sticker__name">` (the hand face). Put stickers in `<div class="sb-album">` (a grid of 132px columns). Set `--rot` for its tilt.

- `Storeybrook.unlock(id)` turns `sb-sticker--locked` off for the matching sticker and peels it on (`is-new`, `dur-base`, `ease-bounce`), with a toast and a peel sound.
- Locked: dashed `line` outline, faded art, `ink-muted` name. Found: a `page` sticker with a white border on a `wash-sun` glow and `shadow-sticker`.
- Origami turns the art 45°; Comix rims it in ink.

**Do / Don't**
- Do name stickers for what was found ("the far stone"), in two or three words.
- Don't hide unfound stickers: the outline is the hint.
""", f'<div class="pv"><div class="sb-album">{stickers}</div></div>', PRE)

comp("Lock", "Rewards", 340, r"""
# Lock

A striped cover over something that is not open yet. It says why it is shut and how to open it, and unfolds when it opens.

**Provide** `<div class="sb-lock" data-sb-lock="<id>">` as the last child of a positioned element (a cover, a panel, a sheet), holding `<span class="sb-lock__keyhole"><span data-sb-icon="lock"></span></span>`, `<span class="sb-lock__why">` (what is shut) and `<span class="sb-lock__how">` (how to open it).

- `Storeybrook.unlock(id)` unfolds the lock upward over `dur-turn` (`is-opening`) and hides it; locks for ids already unlocked are hidden when the page loads. Reduced motion simply hides it.
- The cover is diagonal stripes of `page` and `surface` at 92%, so the thing underneath shows faintly through.

**Do / Don't**
- Do always fill in both lines: "Origami is still folded." "Walk two more stones to open it."
- Don't lock anything a person needs to read or to leave.
""", """
<div class="pv"><div class="sb-sheet" style="position:relative;max-width:440px;min-height:150px">
<h3 class="display-s" style="margin:0 0 6px">Origami</h3><p class="label" style="margin:0">Folded paper on a cutting mat, ten steps to the octave.</p>
<div class="sb-lock" id="lk"><span class="sb-lock__keyhole"><span data-sb-icon="lock"></span></span><span class="sb-lock__why">Origami is still folded.</span><span class="sb-lock__how">Walk two more stones to open it.</span></div></div>
<p class="row" style="margin-top:16px"><button class="sb-btn sb-btn--secondary sb-btn--sm" id="op"><span data-sb-icon="key"></span>Open it</button><button class="sb-btn sb-btn--quiet sb-btn--sm" id="rs">Fold it again</button></p></div>""",
     PRE + "var lk=document.getElementById('lk');document.getElementById('op').addEventListener('click',function(){if(lk.hidden)return;var rm=S&&S.reducedMotion();if(rm){lk.hidden=true;return;}lk.classList.add('is-opening');setTimeout(function(){lk.hidden=true;lk.classList.remove('is-opening');},700);});document.getElementById('rs').addEventListener('click',function(){lk.hidden=false;});")

# ---------------------------------------------------------------- Shelf
def cover(title, line, chips, price, art, new=False, tilt="0deg", free=False):
    ch = "".join(f'<span class="sb-chip sb-chip--{t}">{w}</span>' for t, w in chips)
    pr = (f'<span class="sb-price__string" aria-hidden="true"></span><span class="sb-price{" sb-price--free" if free else ""}"><span class="sb-price__amount">{price}</span>'
          f'<span class="sb-price__each">{"to play" if free else "each"}</span></span>')
    return (f'<a class="sb-cover{" sb-cover--new" if new else ""}" href="#" style="--tilt:{tilt}">{pr}<span class="sb-cover__art">{art}</span>'
            f'<span class="sb-cover__body"><span class="sb-cover__title">{title}</span><span class="sb-cover__line">{line}</span><span class="sb-cover__meta">{ch}</span></span></a>')
shelf = (cover("AND SO", "Hold a chord until it sings back.", [("sky", "Music"), ("rose", "Story")], "99¢",
               '<span class="sb-washes"><i class="sb-wash sb-wash--sky sb-wash--band" style="top:-20%;--h:70%"></i><i class="sb-wash sb-wash--rose" style="--w:60%;left:30%;top:40%"></i></span><span id="c1" style="position:absolute;left:50%;top:52%;translate:-50% -50%;--cw:120px"></span>', new=True, tilt="-1deg") +
         cover("Everfallen", "A night garden, falling into other ground.", [("sun", "Faller")], "99¢",
               '<span class="sb-washes"><i class="sb-wash sb-wash--sun sb-wash--band" style="top:-10%;--h:70%"></i><i class="sb-wash sb-wash--meadow sb-wash--band" style="bottom:-20%;--h:60%"></i></span>', tilt="1deg") +
         cover("The well", "Drop a word in and wait.", [("lilac", "Quiet"), ("sea", "Short")], "Free",
               '<span class="sb-washes"><i class="sb-wash sb-wash--brook" style="--w:70%;left:15%;top:20%"></i></span>', free=True, tilt="-0.5deg"))
comp("Shelf", "Shelf", 450, r"""
# Shelf

The 99¢ Shelf: game covers standing on a copper board, scrolling sideways, each with a price tag on a string.

**Provide** `<div class="sb-shelf">` holding covers. A cover is `<a class="sb-cover" href="…">` with:
- `<span class="sb-price__string" aria-hidden="true"></span><span class="sb-price"><span class="sb-price__amount">99¢</span><span class="sb-price__each">each</span></span>` (`sb-price--free` turns the amount `sap`),
- `<span class="sb-cover__art">` (4:3, on `surface`: washes, the creature, or the game's own art as an image or canvas),
- `<span class="sb-cover__body">` with `sb-cover__title` (display face), `sb-cover__line` (one sentence) and `sb-cover__meta` (two or three Chips).

Options: `sb-cover--new` hangs a `sap` "New" ribbon; `--tilt` turns a cover a degree or two.

- Covers are `page` with a spine shadow on the left edge, `shadow-page`, lifting 6px with `shadow-lift` on hover and focus; at the TV density the focused cover scales up 7% instead.
- The shelf scrolls sideways with snap points (`grid-auto-columns` from 200px to `size-cover`) and sits on a copper board.

**Do / Don't**
- Do write the price honestly; until a shop exists the page also says "Free to play now".
- Do mark only one cover as new at a time.
- Don't wrap the shelf into a grid of identical cards, and never put a countdown or a crossed-out price on a tag.
""", f'<div class="pv" style="padding-top:8px"><div class="sb-shelf">{shelf}</div></div>', PRE + "if(S)S.creature(document.getElementById('c1'),{stage:2});")

comp("Chip", "Shelf", 90, r"""
# Chip

A small tag with a dot and a word, in one of five categorical colors: what kind of game, how long, what it needs.

**Provide** `<span class="sb-chip sb-chip--sky">Music</span>` (`--sun`, `--rose`, `--lilac`, `--sea`, `--sky`); without a color it is a plain `surface` chip with a `line` dot.

- Text and dot in the tag color on a 12% tint of it over `page` (4.7:1 or better in every look). Ink Blot draws every chip as black on white with a hairline.
- 30px tall, Andika bold.

**Do / Don't**
- Do use chips for categories, two or three per cover.
- Don't use a chip as a button, or color alone to say something: the word carries it.
""", """
<div class="pv row" style="gap:10px"><span class="sb-chip sb-chip--sun">Faller</span><span class="sb-chip sb-chip--rose">Story</span><span class="sb-chip sb-chip--lilac">Quiet</span><span class="sb-chip sb-chip--sea">Short</span><span class="sb-chip sb-chip--sky">Music</span><span class="sb-chip">Two players</span></div>""", PRE)

# ---------------------------------------------------------------- Navigation
comp("Tabs", "Navigation", 330, r"""
# Tabs

Chapter tabs on the edge of the book: the open one is a `page` tab with an `accent` bar, pulled out from the stack.

**Provide** `<div class="sb-tabs" role="tablist" aria-orientation="vertical">` holding `<button class="sb-tab" role="tab" aria-selected="true">` per chapter (or links with `aria-current="true"` when each tab is its own page). Keep the panels as `role="tabpanel"`, labelled by their tabs.

- Closed tabs: `surface` with a `line` edge, `ink-muted` text. The open tab: `page`, `accent` text and a 6px `accent` bar on its inner edge, nudged out 6px with `shadow-sticker`.
- Each tab is at least `size-target` tall; arrow keys move between tabs when you wire them as a tablist.

**Do / Don't**
- Do name tabs with chapter titles, short.
- Don't use more than seven tabs; a longer book uses the drawer for its contents.
""", """
<div class="pv" style="display:grid;grid-template-columns:200px 1fr;gap:0;align-items:start">
<div class="sb-tabs" role="tablist" aria-orientation="vertical"><button class="sb-tab" role="tab" aria-selected="false">The porch</button><button class="sb-tab" role="tab" aria-selected="true">The far stone</button><button class="sb-tab" role="tab" aria-selected="false">Under the stones</button><button class="sb-tab" role="tab" aria-selected="false">Home</button></div>
<article class="sb-page" role="tabpanel" style="min-height:200px"><h3 class="display-s" style="margin:0 0 8px">The far stone</h3><div class="sb-prose" style="font-size:1.05rem"><p>Nobody had walked to the far stone in years.</p></div></article>
</div>""", PRE + "document.querySelectorAll('.sb-tab').forEach(function(t){t.addEventListener('click',function(){document.querySelectorAll('.sb-tab').forEach(function(x){x.setAttribute('aria-selected',String(x===t));});document.querySelector('[role=tabpanel] h3').textContent=t.textContent;});});")

# ---------------------------------------------------------------- Overlays
comp("Dialog", "Overlays", 310, r"""
# Dialog

A sheet that asks one question over a veiled page: a title in the display face, a sentence or two in the story face, and two buttons.

**Provide** `<dialog class="sb-dialog" id="…">` holding `<h2 class="sb-dialog__title">`, `<p class="sb-dialog__body">` and `<div class="sb-dialog__actions">` with a quiet button and a primary one. Open it with a button carrying `data-sb-open="#id"` (or `Storeybrook.dialog.open(el)`, which uses `showModal()`); buttons inside with `data-sb-close` close it.

- The sheet is `page` with a deckled edge and `shadow-lift`, up to 34rem wide; the backdrop is `scrim`. It arrives rising 14px and turning from −1° over `dur-base`.
- Escape closes it (the browser's own dialog behavior), and so does Back at the TV density.
- Fires `sb:dialog` with `{open, id}`.

**Do / Don't**
- Do ask one question, with the primary button saying what happens ("Open the book"), and the quiet one the way out ("Not now").
- Don't use a dialog for rewards or news: a Toast does that without stopping play.
""", """
<div class="pv" style="display:grid;place-items:center;min-height:260px;background:var(--scrim)">
<div class="sb-dialog" role="dialog" aria-labelledby="dt" style="position:relative"><h2 class="sb-dialog__title" id="dt">Read it to you?</h2>
<p class="sb-dialog__body">The storybook can read each page aloud in an Irish voice, lighting the words as it goes.</p>
<div class="sb-dialog__actions"><button class="sb-btn sb-btn--quiet">Not now</button><button class="sb-btn sb-btn--primary">Read it to me</button></div></div></div>""", PRE)

comp("Drawer", "Overlays", 350, r"""
# Drawer

A side sheet from the right for a book's contents, settings or the album. It slides over a veil, keeps focus inside while open, and gives focus back when it closes.

**Provide** `<aside class="sb-drawer" id="…" aria-hidden="true" aria-labelledby="…">` holding `<div class="sb-drawer__head">` (an `<h2>` and a close button with `data-sb-close`), then an `<ol>` of links or buttons. Open it with `data-sb-open="#id"` or `Storeybrook.drawer.open(el)`.

- `page` with a deckled edge and `shadow-lift`, `min(26rem, 92vw)` wide, sliding in over `dur-base` with `ease-paper`; the veil is `scrim` and closes it on a press.
- Rows are at least `size-target` tall, in the story face; the current one is `cue-soft` (`aria-current="page"`).
- Tab cycles inside it; Escape closes it; Back closes it at the TV density. Fires `sb:drawer` with `{open, id}`.

**Do / Don't**
- Do use it for lists a person picks from: chapters, looks, settings.
- Don't open it by itself; it answers a press.
""", """
<div class="pv" style="position:relative;height:340px;overflow:hidden;padding:0"><p class="story-body" style="margin:0;padding:28px 32px;color:var(--ink-muted)">The page underneath.</p>
<aside class="sb-drawer is-open" style="position:absolute" aria-labelledby="dh"><div class="sb-drawer__head"><h2 id="dh">The book</h2><button class="sb-btn sb-btn--quiet sb-btn--icon" aria-label="Close the book"><span data-sb-icon="close"></span></button></div>
<ol><li><a href="#"><span data-sb-icon="stone"></span>The porch</a></li><li><a href="#" aria-current="page"><span data-sb-icon="brook"></span>The far stone</a></li><li><button type="button"><span data-sb-icon="lock"></span>Origami, opens at 18 nougats</button></li><li><a href="#"><span data-sb-icon="home"></span>Home</a></li></ol></aside></div>""", PRE)

comp("Toast", "Overlays", 160, r"""
# Toast

A short message on a slip of sun-washed paper at the top of the screen: a reward, an unlock, a hint. It never takes focus and leaves by itself.

**Provide** nothing in the markup: call `Storeybrook.toast(html, {ms})`. It shows one toast at a time (a new one replaces the old), for 3 seconds by default (unlocks use 3.6), as `role="status"` with `aria-live="polite"`.

- The slip is `wash-sun` over `page`, turned −1°, with `shadow-sticker`; Knight Night uses `page`; Comix inks its edge. It arrives like a dialog over `dur-base`.
- Put a nougat or an icon first, then one sentence with the important words in `<b>`.

**Do / Don't**
- Do say what happened and what it was for: "<b>Origami</b> is open now."
- Don't use a toast for an error a person must act on; put the message next to the thing that failed.
""", """
<div class="pv" style="display:grid;gap:16px;justify-items:center">
<div class="sb-toast" role="status" style="position:relative;left:auto;top:auto;translate:none"><span class="sb-nougat" data-sb-nougat="5" style="--n:34px"></span><span><b>Origami</b> is open now.</span></div>
<button class="sb-btn sb-btn--secondary sb-btn--sm" id="t">Show a toast</button></div>""",
     PRE + "if(S){document.querySelectorAll('[data-sb-nougat]').forEach(function(x){x.innerHTML=S.nougatSVG(+x.getAttribute('data-sb-nougat'));});document.getElementById('t').addEventListener('click',function(){S.toast('<span class=\"sb-nougat\" style=\"--n:34px\">'+S.nougatSVG(9)+'</span><span>A nougat for <b>walking the far stone</b>.</span>',{ms:3000});});}")

# ---------------------------------------------------------------- Transitions
comp("Fold", "Transitions", 290, r"""
# Fold

A view folds away like paper to show the next one underneath: the top half folds down over the bottom, then the folded sheet drops away.

**Provide** a container and a function that swaps its content, then call `Storeybrook.fold(host, swap)`. It snapshots the old view, calls `swap()` at once (so the new view is already underneath), plays the fold over `dur-turn` with `ease-paper`, and resolves its Promise when the paper is gone. A paper rustle plays if sound is on.

- The snapshot has its ids removed so nothing is duplicated; it is `aria-hidden`.
- Under reduced motion (and in Ink Blot) `swap()` runs and the Promise resolves at once.

**Do / Don't**
- Do use it for changing a whole view in place: a new look, the next scene, a settings page.
- Don't fold something that is still being read or typed in.
""", """
<div class="pv stack"><div class="sb-sheet" id="fh" style="max-width:460px;min-height:120px"><h3 class="display-s" style="margin:0 0 6px">Morning paper</h3><p class="label" style="margin:0">Meta Daylight, easy listening, the mandala.</p></div>
<p class="row" style="margin:0"><button class="sb-btn sb-btn--secondary sb-btn--sm" id="fb"><span data-sb-icon="origami"></span>Fold to the next stone</button></p></div>""",
     PRE + "var n=0,P=[['Morning paper','Meta Daylight, easy listening, the mandala.'],['The glasshouse','Mint haze, just intonation, sand on a plate.'],['Knight Night','A cobalt paper theatre in thirty-one steps.']],h=document.getElementById('fh');document.getElementById('fb').addEventListener('click',function(){n=(n+1)%P.length;var sw=function(){h.querySelector('h3').textContent=P[n][0];h.querySelector('p').textContent=P[n][1];};if(S)S.fold(h,sw);else sw();});")

comp("Blot", "Transitions", 320, r"""
# Blot

An ink blot opens from the middle of an element to reveal it: for a new look, a found thing, the first picture of a chapter.

**Provide** the element to reveal and call `Storeybrook.blot(host, {duration})`. It masks the element with a blot shape that grows from nothing to past its edges over `dur-bleed` (or `duration`), and resolves its Promise when it has opened.

- Reveal something that is ready: the element is masked while it opens, so it should already hold its content.
- Under reduced motion (and in Ink Blot) it shows the element at once.

**Do / Don't**
- Do use one blot per moment, on the thing that is new.
- Don't blot text a person is reading, or loop it.
""", """
<div class="pv stack"><div id="bh" class="sb-sheet" style="max-width:460px;min-height:150px;display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center"><div id="bc" style="--cw:120px"></div><div><h3 class="display-s" style="margin:0 0 4px">Saelion woke up</h3><p class="label" style="margin:0">A sprite now: three arms and small wings.</p></div></div>
<p class="row" style="margin:0"><button class="sb-btn sb-btn--secondary sb-btn--sm" id="bb"><span data-sb-icon="ink"></span>Blot it in again</button></p></div>""",
     PRE + "if(S){S.creature(document.getElementById('bc'),{stage:3});document.getElementById('bb').addEventListener('click',function(){S.blot(document.getElementById('bh'));});}")


def write():
    root = P / "components"
    for c in C:
        d = root / c["name"]; d.mkdir(parents=True, exist_ok=True)
        (d / "README.md").write_text(c["readme"])
        style = BASE + (c["style"] or "")
        html = (f'<!-- @dsCard group="{c["group"]}" height={c["height"]} -->\n<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>{c["name"]}</title>\n'
                f'<link rel="stylesheet" href="{FONTS}">\n<style>{style}</style></head>\n<body class="sb-body">\n{c["body"]}\n<script>{c["script"]}</script></body></html>\n')
        assert "</script" not in c["script"]
        (d / "preview.html").write_text(html)
    print(len(C), "components:", ", ".join(c["name"] for c in C))


if __name__ == "__main__":
    write()
