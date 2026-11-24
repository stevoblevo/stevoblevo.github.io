# AND SO source

The modular source of AND SO. `build.py` inlines `src/` into one self-contained page.

    python3 build.py        # writes and-so.html (artifact body), dist/and-so.html (full page), check.js
    python3 versions.py     # from the repo root: /and-so/, every /and-so/v*/ and versions.json

Ship `dist/and-so.html` as `/and-so/index.html` here and as `worlds/and-so.html` in the Field.
Before replacing a shipped version, freeze it: `python3 _tools/sae-kirby.py --name and-so --version <v> --src and-so/index.html --play "#enter"`.
Frozen versions live in `/ong.bak/` and keep a friendly route such as `/and-so/v7/`. The current build is AND SO 10.7 · Plush.

Version numbers 8.1.1 to 8.2.0 are taken by open pull requests (the Cursor stack on top of `a283e58`), so the
leaderboard build is 8.3. Each version keeps its own address; nothing is replaced in place.

## The board (8.3)

`src/z-board.js` is the in-game side of the leaderboard; the server is `_src/and-so-board/` (its README has the
protocol), live at `https://and-so-board.vercel.app/api/board`. A player signs in with a name; this browser makes an
ECDSA P-256 key with WebCrypto, keeps it in IndexedDB (non-extractable), and signs every write with it. A Solana wallet
(Phantom, Solflare, Backpack) can sign instead; it only ever signs text. The board is shown only to signed-in players.
Scores signed while offline wait in localStorage (`andso:board`) and go out on the `online` event. On desktop the HUD
has a board button (S); on a phone the score chip on the top bar opens it; the gamut has a section too.

`_tools/andso-rns-sidecar.py` carries the same signed bodies over Reticulum/LXMF (LoRa or anything RNS runs on).

## As an app (8.3)

`pwa/` holds the manifest, the service worker and the icons (`pwa/icons.py` redraws them from `pwa/icon.svg`);
`build.py` copies them to `/and-so/`. `src/z-app.js` registers the worker only on stevoblevo.github.io under
`/and-so/`. The worker goes to the network first and keeps what it fetched, so online always means the newest build.

## Open Door (9)

`src/zz-first.js` is the way in for a first visit, and the one find a day.

**First steps.** A visitor with nothing found and no `andso:first` key gets four things to do, each named after it is
done: drag a voice and let go, tap the ground, move the chord, open the jar. While it runs the ground stays still
(just intonation, Saedo off, no auto-flip), the gamut does not open by itself, quests and the idle hints are hidden,
and nothing is credited (finds or quests) until the visitor has touched something, so the first find is theirs. When it
ends, Saedo and easy listening start. It can be skipped, it never returns once finished or skipped, `?first=1` shows it
again and `?first=0` never does. The game reports to it through `firstEvent()` (grab, release, land, tap, next, jar);
those calls sit in `e-input.js`, `d-game.js` and `p-brook.js`.

**Today's find.** One unfound thing a day (`andso:today`), shown on the landing for a returning visitor and at the top
of the quests. Finding it that day is worth one nougat. Early on (under 12 finds) it is drawn from the just and
easy-listening finds only. Nothing expires and nothing is lost by missing a day.

Also in 9: the desktop HUD rests at 62% instead of 32% so the controls can be read, and the landing greets a returning
visitor with their count.

## Three Faces (10)

The toolkit family draws one state three ways: Storeybrook is the day, Hypermetapunk the dusk, Depthfield the night.
The voices, valleys, finds and sound do not change when the face does (family plan C9: one state, many faces).

- `src/zy-faces.js` holds the faces. The day is the Storeybrook look as before. The dusk and the night are skins
  `hm-dusk` and `df-night`, and their ground is drawn by each kit's own pen: `Hypermetapunk.pen('dusk')` (sky in toner
  bands, the banded sun, the grid floor, grain) and `Depthfield.pen('night')` (sky, moon, stars, three ridges). The
  panels take each kit's tokens by the family's shared names (`style-sb.css`, the block marked "three faces").
- The kits' add-ons are vendored, pinned by version, and listed in `build.py` as `KIT_ADDONS` (10 and 10.1 called it
  `KIT_PENS` and pinned Depthfield 2.3.0 and Hypermetapunk 0.3.0). Since 10.2: Storeybrook 1.4.0 (`paper.js` for the
  pen and its sun, `pets.js`), Depthfield 2.4.0 (`pen.js`, `pets.js`) and Hypermetapunk 0.4.0 (`pen.js`, `pets.js`),
  each copied from the kit's `v/<version>/` as `vendor/<kit>-<file>-<version>.js`. To move to a newer kit, copy the new
  files in under their new names and change `KIT_ADDONS`; never edit a vendored file here (the build escapes a
  `</script` in a kit's comment as it inlines it). They ride in the same script element as Storeybrook, so the mirror's
  inner copies carry them. If a pen is missing the plain night is drawn.
- The night's weather follows the music, as peachfall's does (`WX.w` in `k-world.js`), but it only tints the night, so
  the instrument always reads: red when it is tense, mint on a settled chord, deep night when the room is quiet.
- Ways to turn the face: the "three faces" row in the gamut, the Z key (day, dusk, night), and by touch: the dusk sun
  sets when it is touched and the night comes up; the moon gives way to the day. `faceTap()` is called from
  `e-input.js` after a voice has had its chance at the pointer.
- Two finds: `x-faces` (wear all three in one visit) and `x-sunset` (touch the dusk sun). 141 finds in all.
- `__andso.face()` (with `?debug`) reports the skin and where the sun or moon stands.

### 10.1: the whole scene in each kit's hand

- **Kit inks on the canvas.** The drawing code writes the instrument's three inks (cream words, gold, mint) as night
  colours in hundreds of places. `kitCanvas()` wraps `fillStyle`, `strokeStyle` and `shadowColor` on the world
  canvases, and on a kit face `kitInk()` swaps those three for the kit's ink, accent and cue as they are set
  (`KIT_INKS` in `zy-faces.js`). Voices keep their own colours: they are the state, not the face. To ink another colour,
  add a pair to `KIT_INKS`; do not fork the drawing code per face.
- **Lettering.** At dusk the chord's name is set with `P.chrome` (`faceChord()`, called from `drawReadout`).
- **Night.** `P.haze` between the ridges breathes with the sound; `P.vignette` holds the eye in the middle.
- **Day.** `drawDaySun()` paints a watercolour sun on the paper canvas (`ctx3`). Storeybrook's pen has no sun of its own
  yet; if it gains one, call it here.
- **The lights go round by touch.** The day's sun goes down into the dusk, the dusk sun sets into the night, the moon
  gives way to the day (`faceTap()`).
- **The clock.** "the face follows your clock" in the gamut (`SET.faceClock`, off by default): day from 7, dusk from 17,
  night from 20. A face chosen by hand stays until the light next changes. The find `x-hours` is for being here when
  it changes. 142 finds in all.
- The instrument's own chrome (pills, section words, switches) takes each kit's accent in `style-sb.css`.

## The Band (10.2)

The family's crossing pets come to AND SO. Storeybrook has seven day pets, Hypermetapunk five dusk pets and Depthfield
five night pets, each found on that kit's own page by doing what the kit is for, and all saved together in
`localStorage['crossing:pets']` on stevoblevo.github.io (family plan F9). AND SO reads the same save.

- `src/zx-pets.js`. The pets you have found stand on the hilltops of their own face (`xpCrests`: the crests of the
  terrain you are playing, away from the voices in the valleys and from under the panels) and hop when the hills
  change. Each kit draws its own (`<Kit>.pets.draw`) and they dance to `beatPulse` with a swing.
- Touch one and it plays a lick in the tuning you are in (`petLick`): one of five swung shapes over the tuning's scale,
  with the harmonic seventh, 7/4, as the blue note in just and in easy listening. Day pets play the keys, dusk pets
  the keys over a bass note, night pets the glass bells.
- A pet found in another tab arrives while you play (the `storage` event); now and then a pet you have not found walks
  over the hills of its face, faint, and tells you where it lives when touched.
- All seventeen (or `?lattice=1`, the link the kits show at seventeen) open the lattice: every pet in every face.
- Your own pet wears the face (`drawPetFace`): drawn to an offscreen canvas, then die-cut as a sticker at dusk
  (`Hypermetapunk.pen('dusk').sticker`) and lit by the moon at night (`Depthfield.pen('night').rim`). By day the sun is
  Storeybrook's own (`Storeybrook.pen('daylight').sun`).
- The gamut has a "crossing pets" section: each kit's pets, found or still out there, with a link to where they live.
- Gradients on the kit faces take the kits' inks too (`kitCanvas` wraps the gradient makers).
- Finds: `x-band`, `x-crossing`, `x-visitor`, `x-lattice` (146 in all). None of them is ever a day's find.
- `__andso.pets()`, `petsRead()` and `ghostNow()` with `?debug`.

## Names Filed Off (10.3)

Bleve asked for a full fake book of a pop catalog's changes, microtonal, with the names obscured. The Book now has a
second chapter beside the standards: 220 songs (twelve records, with their vault, 3am and anthology tracks), each as
changes only. Chord progressions are not protected the way melodies and words are, so the chapter holds exactly what
the Book already allowed for tunes still in copyright: form, key, tempo, meter and the chords of each bar. No melody,
no lyric.

- Data: `src/book-nf.json`, made by `names_filed_off.py` from research files (one object per song: album, track,
  key, tempo, meter, feel, sections of bars, form, riddle, sources, confidence). The public file has no titles and no
  sources (their addresses name the songs); each tune has `title` (the riddle), `hint` (record and track), `ini`
  (initials, shown after three wrong names) and `h`, the hash of its normalised title (`cyrb53`, the same in the script
  and in `t-book.js`). One title is withheld (`h` empty): it plays and keeps its riddle but cannot be named.
- The private key (id, real title, album, track, sources, confidence, notes) is kept outside this repository, in the
  claude.ai project, for upkeep.
- Research: chords from Hooktheory and chord sites, keys and tempos cross-checked where reachable; no source gave
  chord lengths, so bar layouts are inferred and most charts are "medium" confidence (`conf`: 25 high, 172 medium,
  23 low). Charts were read through a fetcher told to return chords only; no lyric text was kept.
- In the Book: the tune list is grouped by record; the kicker says "changes · names filed off"; under the title, the
  hint and a name-it box (a match keeps your spelling on this device, `andso:named`); section marks on the chart; the
  tune's own feel; chord names spelled as the key spells them (sharps in sharp keys); and a tuning choice for the Book
  (as you are, just intonation, 31-EDO, piano), which this chapter sets to just intonation, so its changes play
  microtonal. The jam gives the old tuning back when it stops. 5/4 charts play.
- Finds: `x-named` (name one), `x-named-13` (name thirteen). 148 in all.

## Plush (10.7)

The three weak spots left in 10.6, in `src/zw-petreal.js`:

- **Antlers**: each beam is one smooth tapered filled shape (`beam` in `petAntlersDraw`), not round-capped segments, which read as beads. Thicker, with about 700 shorter hairs of nap per antler. They do not move on her head, so they are painted once per size into a sprite (`petAntlers`, `ANTL`).
- **Paper look**: her colour is mixed less far toward white (0.42, was 0.6) and a soft ink shadow is laid behind the coat (`furSprite`), so she stands off the page.
- **Frame rate**, headless Chromium, software rendering, 1280 × 800, all parts grown, frames a second (10.4 in brackets): paper knight 25 (31), dusk 16 (29), night 21 (27), paper daylight 24 (28). The antler sprite did not move these; the eight arms and the dusk sticker are the cost. Still not measured on a real GPU.

## Fluff (10.6)

Bleve on 10.5: "kind of looks like a dirty rabbit now. I thought I was gonna get a beautiful fluffy little bunny", and the octopus should be more octopus, and the antlers more antler. What changed, all in `src/zw-petreal.js`:

- **Why 10.5 looked dirty**: dark skin showed between the hairs, the roots were half black, and the shade was black multiplied over a mauve coat. Now the down under the coat is pale, roots are only a little darker than tips, tips are white, her colour is mixed two thirds toward white, and the shade is lilac (a cool paper grey on paper) laid in `furSprite`. Never black.
- **Fluff**: a blurred bloom of down under the strands, hairs that stand straight out near the outline (`flow`), longer coat hairs, more and longer white guard hairs. A white ruff at the chest and a scut behind (`petFur` with `skip` 4 and 5, in `drawPet`). The seam down her front fades under the coat.
- **Octopus arms** (`petArms`): eight, walked out by heading so they bend like muscle; thick at the body, tapering, tips curling into spirals; a web of skin between them; a mottled back; a pale underside with two rows of ringed suckers that become one row toward the tip.
- **Antlers** (`petAntlers`): four thick tapered beams each side with a plush sheen, swollen round tips, and a nap of about 230 very short hairs per antler in place of 10.5's few long ones, which read as ladder rungs.

## Fur (10.5)

Bleve said 10.4 "just looks blurry": he wanted fur that is photo-real on a character that is not. What changed:

- **The coat is combed, not smudged** (`furGrey` in `src/zw-petreal.js`). Three layers of single strands over dark skin: a short thick undercoat, about 46 fine hairs per unit of area each shaded from a dark root to a pale tip and laid bottom row first, and a few long thin guard hairs that break the outline. The strands are painted once per shape, without colour, at device resolution. Her colour is multiplied over that sprite (`furSprite`), so a coat whose colour drifts (the paper look) is re-tinted, not re-combed. One `drawImage` per part per frame.
- **Arms and legs are furred too** (`petFurLimb`): the same coat on a thin capsule laid along the limb.
- **Her own canvas** (`#cpet`, `drawPetFace` in `src/zx-pets.js`). The main canvases are capped at 2 device pixels per CSS pixel; she is drawn on a small canvas of her own at up to 3 (2 at dusk and at night, where the sticker and the rim light cost more per pixel), moved by a CSS transform. The reel, the mirror and the plain black-and-white look draw her on the main canvas as before.
- **A little larger**: `PET_SC()` is 1.42 × S (1.12 on a phone), was 1.15 × S. Her speech bubble moved up to clear the ears.
- At night the rim light's smear toward the moon is turned down (`amount: 0.12`): it read as blur.

Measured in headless Chromium (software rendering, 1280 × 800, all five parts grown): about the same frame rate as 10.4 on paper and at night, lower at dusk when she has wings (the die-cut sticker covers a larger box). Not measured on a real GPU.

## Velvet (10.4)

Bleve asked for the pet to look like something you want to touch. `src/zw-petreal.js` replaces the plain shapes
`drawPet` used for four of her parts, in every look (ink and chimera colours on paper, glow in the dark looks); her
shape, poses and the five weights that grow each part are unchanged.

- `petFur`: a seeded coat over body, head and ears (shadow, mid and highlight hairs lying along the body, fluff past
  the outline), as strong as the bunny in her (`wl`).
- `petAntlers`: velvet: a dark core, a lit side, a soft pile, blunt rounded tips, one leaf.
- `petWings`: bezier fore and hind wings, veins, a dark margin with pale dots, an eyespot, a travelling sheen and
  glinting scales; the wings foreshorten as they beat.
- `petArms`: six tapered octopus arms with a lit top, suckers on the inner side, a wet glint and tips that glow
  with the beat.
- Swizzle (`SO_PETS`): AND SO's own band pet, a swift who conducts with a swizzle stick. She comes to the hills, in
  every face, when you name your first tune in the Book's chapter with its names filed off (`x-named`). She was asked
  for as a caricature of a real singer; she is an original character instead, and should stay one.
- `__andso.petW([antlers, limbs, ears, wings, arms])` with `?debug` sets and locks the pet's parts.

## Where AND SO is published

- `stevoblevo.github.io/and-so/` is this source, built. Every version keeps its address under `/and-so/v*/`.
- `saelion.co/and-so` is served from the `saelion-relay-canary` repository, deployed to production from a chosen commit
  (not from a branch tip). On 16 Nov it serves a different line of 8.1: this repo's 8.1 plus that repo's own additions
  (an origami invitation, recorded story voices under `/and-so/voices/`, its own `pwa.js` and `sw.js`, a `<base>` tag
  because the address has no trailing slash). `saelion.co/field/worlds/and-so` is an older 6.x copy.
- 17 Nov: first steps and today's find were ported onto that line instead of replacing it, so it keeps its voices and
  invitation. `port_saelion_co.py` applies the same edits 9 makes here to that repo's built `and-so/index.html`
  (`python3 port_saelion_co.py <canary>/and-so/index.html src`). It is on the branch
  `release/and-so-first-steps-20261117` there (pull request 38), built as a preview deployment. Promoting it to
  saelion.co is the owner's step.
- Still separate: the board, the app shell and the radio relay of 8.3 are not on that line, and its recorded voices and
  origami invitation are not in this source.
- 24 Nov (10.2): Bleve asked for every new version to be published and deployed, playable at the public link and
  choosable. From 10.2 saelion.co carries AND SO as GitHub Pages does: `publish_saelion_co.py <canary checkout>` (after
  `build.py` and `versions.py`, on a branch made from the commit production serves) writes the latest build at
  `/and-so/`, every version at the same `/and-so/v*/` paths, `versions.json`, the versions page and the toggle, adds
  their lines to the canary's `scripts/public-files.json` and exact rewrites to its `vercel.json`, and moves the 8.1
  line that was there to `/and-so/saelion-8.1/` (playable, and listed with the versions). The picker opens versions in
  place on saelion.co too (`VER_ON_PAGES` in `r-versions.js`). saelion.co's public-file guard reads the slashed save
  path as a home folder, so the source now spells it out (`d-game.js`) and the script does the same in older builds.
  `petBase()` knows that saelion.co serves the page at `/and-so` with no trailing slash.

## Next (ideas, not promises)

- 10.x: `P.misreg` for the landing title at dusk; the pets' licks as a call and response with Saedo.
- A mastery ladder on the board: today's find and round times as their own columns.
- Bring the recorded story voices from the saelion.co line into `y-voice.js`.
