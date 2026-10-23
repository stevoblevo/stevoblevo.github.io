# Gamut Field Guide persistence

The uploaded source edition is preserved in Git at
[`06690c7fa0153291f8acd5295ff8a33cd8e43787`](https://github.com/stevoblevo/stevoblevo.github.io/blob/06690c7fa0153291f8acd5295ff8a33cd8e43787/and-so/gamut-43/index.html).
Its original `index.html` SHA-256 is
`2a80277e98467bb767688f312d2d5d8684fb2b43ad06aca59a826b22c1cd4f7c`.
The sibling `and-so/index.html` is a separate instrument and is unchanged.

The persistence patch keeps the existing keys and serialized formats:

| Key | Value |
| --- | --- |
| `andso-field-guide-v1` | JSON array of discovery IDs |
| `andso-presets-v1` | JSON object of named presets |
| `andso-unlock-all-v1` | `1` for explicit unlock-all (`0` also accepted) |

A complete `window.storage.get/set` implementation remains the preferred backend,
with the existing `false` shared argument. Ordinary browsers use `localStorage`.
Existing valid v1 values load directly without rewriting them. Unknown discovery
IDs are retained on subsequent writes without counting toward current unlocks;
resetting the guide explicitly clears them too. Presets accept the existing
partial preset shape. Earned unlocks are recalculated after loading discoveries.

Reads finish before Enter, save, delete, reset, and unlock-all become available.
Asynchronous writes run in order. Each operation has a four-second timeout so a
hung host request cannot prevent entry or stall the queue indefinitely. A timed-out
write has an uncertain outcome: its warning says the save is unconfirmed, and
further writes to that key are blocked until reload to prevent a late write from
overwriting newer changes. Other keys remain usable. Save/delete/reset feedback follows the completed
write; failed writes keep changes usable for the current visit and show a
session-only warning. Quota failure still permits reading earlier saves and a
later write can recover if capacity becomes available.

Malformed values and failed reads protect the affected key from overwrites for
that visit; other keys continue to work. The guide displays which saves could not
be read or written. Recovery requires backing up and repairing/removing the
specific damaged value in the relevant storage, then reloading. No automatic
clearing or replacement of unreadable user data occurs.

The selected backend remains fixed during a visit. A failing host API is reported
instead of silently switching to a potentially stale browser copy. This patch
cannot transfer data between origins or read a host API's data from a standalone
browser. Browser data remains subject to browser clearing/private-mode policies.
No server, network request, credential, or migration service is added.

## Browser regression tests

Run from the repository root with Node.js, Playwright, and Chromium installed:

```sh
node --test and-so/gamut-43/tests/persistence.test.cjs
```

Set `CHROMIUM_PATH` if Chromium is not `/usr/bin/chromium`. The harness serves only
the tested HTML on an ephemeral loopback port and creates fresh browser contexts;
it does not use user profiles, devices, microphones, or production. Host API mode
is mocked with asynchronous get/set calls, including private scope, rejection,
and ordering checks. Each case checks for uncaught page errors.

To reproduce the original bug using the same regression test:

```sh
git show 06690c7fa0153291f8acd5295ff8a33cd8e43787:and-so/gamut-43/index.html > /tmp/gamut-43-original.html
GAMUT_HTML=/tmp/gamut-43-original.html node --test --test-name-pattern='ordinary browser reload' and-so/gamut-43/tests/persistence.test.cjs
```

The original fails because the saves never reach browser storage. Independent
Chromium reproduction on 2026-10-23 also confirmed one discovered item, one named
preset, and all four unlocks existed before reload and all disappeared afterward.
The patch is verified locally; real host API access and production deployment are
outside this regression harness.

Verified on 2026-10-23 in the saved cloud environment: all 21 browser cases
passed (0 failures, 0 skipped), using Chromium 151.0.7922.173, Playwright 1.62.1,
and Node.js 24.19.0. The inline script also parses and `git diff --check` passes.
