# AND SO source

The modular source of AND SO. `build.py` inlines `src/` into one self-contained page.

    python3 build.py        # writes and-so.html (artifact body), dist/and-so.html (full page), check.js
    python3 versions.py     # from the repo root: /and-so/, every /and-so/v*/ and versions.json

Ship `dist/and-so.html` as `/and-so/index.html` here and as `worlds/and-so.html` in the Field.
Before replacing a shipped version, freeze it: `python3 _tools/sae-kirby.py --name and-so --version <v> --src and-so/index.html --play "#enter"`.
Frozen versions live in `/ong.bak/` and keep a friendly route such as `/and-so/v7/`. The current build is AND SO 10.1 · Three Faces.

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
- The pens are vendored, pinned by version, and listed in `build.py` as `KIT_PENS`:
  `vendor/depthfield-pen-2.3.0.js` and `vendor/hypermetapunk-pen-0.3.0.js`, copied from each kit's `v/<version>/pen.js`.
  To move to a newer kit, copy its `v/<version>/pen.js` in under the new name and change `KIT_PENS`; never edit a
  vendored pen here. They ride in the same script element as Storeybrook, so the mirror's inner copies carry them. If a
  pen is missing the plain night is drawn.
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

## Where AND SO is published (16 Nov 2026)

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

## Next (ideas, not promises)

- 10.x: gradients still carry the night colours (only solid styles are inked); a `sun` for `Storeybrook.pen` so the
  day's sun comes from the kit; `P.misreg` for the landing title at dusk.
- Carry the three faces onto the saelion.co line once its first-steps port (pull request 38) is promoted.
- A mastery ladder on the board: today's find and round times as their own columns.
- Bring the recorded story voices from the saelion.co line into `y-voice.js`.
