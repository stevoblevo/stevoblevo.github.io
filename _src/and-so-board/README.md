# AND SO leaderboard

One serverless function (`api/board.js`) on Vercel, one private JSON document in Vercel Blob, no accounts and no
passwords. A player is a public key; every write is a plain-text message that key signed. The server rebuilds the same
text from the fields it receives and checks the signature, so a score can travel any route (a browser, a relay, a radio
link) and nobody on the way can change it.

## Calls

`POST /api/board`, body JSON (send it as `text/plain` and browsers skip the CORS preflight).

| op | body | answer |
| --- | --- | --- |
| `signin` | `name, alg, pk, at, sig` | `{ id, name, token }` |
| `score` | `id, score, finds, stars, rounds, played, at, sig` | `{ kept, rank, of, best }` |
| `board` | `token` | `{ count, top: [50 rows], you }` |
| `leave` | `id, at, sig` | `{ left: true }` |

- `alg` is `p256` (a WebCrypto ECDSA P-256 device key; `pk` is its public JWK `{kty, crv, x, y}`) or `ed25519` (a
  Solana wallet; `pk` is the base58 address).
- `sig` is base64url: the raw 64-byte signature (P-256 in IEEE P1363 form, as WebCrypto makes it).
- `at` is an ISO time ending in `Z`. A sign-in must be within 10 minutes of the server clock; a score may be up to
  30 days old (carried late) but not from the future.
- `id` is the first 22 characters of base64url(sha256(raw public key)).
- The token lasts 30 days and only lets you read the board. Writes always need a signature.

The signed texts, exactly (`\n` is a newline):

```
AND SO leaderboard\nsign in as {name}\nat {at}
AND SO leaderboard\nsign my score: {score} resonance, {finds} finds, {stars} stars, {rounds} rounds, {played}s played\nas {name}\nat {at}
AND SO leaderboard\nremove {name} from the board\nat {at}
```

## Rules

- Names: 2 to 20 letters, numbers, spaces and `. _ ' -`, starting with a letter or number. Names are unique ignoring
  case and punctuation. Signing in again under a new name renames you.
- A score keeps your best; finds, stars, rounds and played keep their maximum. One accepted score every 8 seconds.
- A score older than the one on file changes nothing. More than `5000 + 400 × seconds played` resonance is refused.
- The board shows names and numbers, and whether a row signed with a wallet. It never shows keys or ids of others.
- `leave` takes you off: your row, your name and your key are deleted. A player who signed in but never posted a
  score doesn't appear on the board at all.
- Wallets only sign. Nothing here moves tokens or pays anything out.

## Storage

`board/v1.json` in a private Blob store connected to the Vercel project (previews use `board/preview-v1.json`). Writes are conditional on the ETag that was
read (`ifMatch`), so two players posting at once can't overwrite each other: the loser reads again and retries. The
board's session key is made on the first sign-in and kept in that same document; deleting `key` from it signs
everyone out.

## Run and test

```
npm test                              # the whole protocol, with a file standing in for Blob
ANDSO_BOARD_FILE=/tmp/b.json vercel dev
```

## The radio relay

`_tools/andso-rns-sidecar.py` carries the same signed bodies over Reticulum (LoRa or anything else RNS runs on) and
posts them here from whichever node has the internet. See the notes at the top of that file.
