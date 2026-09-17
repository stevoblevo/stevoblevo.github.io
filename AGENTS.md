# One development home

This repository is Steven's canonical **integration and site workspace**. Continue it; do not create another cockpit or make a deployment URL a new source of truth.

- `npm run dev` serves the current whole site on loopback. `npm run check` runs the shared checks and builds `dist/`.
- `saelion.workspace.json` records source owners, routes and deployment targets. `Saelion.code-workspace` is the single editor entry.
- Keep the existing cockpit route and store (`anewgam.steven.cockpit.v2`). A thread held locally is NOT an AI message, Saedo admission, execution receipt or cross-device sync.
- Peachfall's published engine assets are preserved. Its editable engine remains in the existing private `stevoblevo/peachfall-playable` repository; do not silently publish that source, replace it with an older branch, or hand-edit its minified output.
- Optional engine checkout/build commands use the same root workspace but never promote the output automatically. Inspect all candidate branches and compare actual game behavior before replacing the published bundle.
- Website/deployment settings cannot configure registrar DNS. Never add a CNAME or force the custom domain before ownership, target routing and TLS are verified. No wildcard DNS or exposure of local operators.
- Branch from fresh HEAD, preserve concurrent work (including device-chat PR #2), run tests, and use a separate reviewer before live promotion. A passing test is not independent review.
- Keep private worktrees, secrets, credentials and owner state out of `dist/`. Do not cache APIs, authenticated responses or other applications' data.
- Exact source wording is retained; interpretation is separate. No fake green lights, worker counts or completed claims.
