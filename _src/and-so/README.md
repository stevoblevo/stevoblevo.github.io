# AND SO source

The modular source of AND SO. `build.py` inlines `src/` into one self-contained page.

    python3 build.py        # writes and-so.html (artifact body), dist/and-so.html (full page), check.js
    python3 versions.py     # from the repo root: /and-so/, every /and-so/v*/ and versions.json

Ship `dist/and-so.html` as `/and-so/index.html` here and as `worlds/and-so.html` in the Field.
Before replacing a shipped version, freeze it: `python3 _tools/sae-kirby.py --name and-so --version <v> --src and-so/index.html --play "#enter"`.
Frozen versions live in `/ong.bak/` and keep a friendly route such as `/and-so/v7/`. The current build is AND SO 8.3.

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
