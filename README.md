# Saelion — one development home

Open **this repository** to develop the site. The cockpit and Peachfall remain different experiences in one maintained home, not competing projects. GitHub and Vercel publish the result; neither creates a second development identity.

```sh
npm run dev       # whole site on http://127.0.0.1:4317; no installation required
npm run check     # shared tests + allowlisted static build
npm run doctor    # explicit source / deployment / ingress boundaries
```

Open `Saelion.code-workspace` for the editor entry. Refresh the page after editing; the development server serves the current public files. Restart `npm run dev` after adding offline assets so the offline manifest is refreshed.

## One home, existing rooms

`/` is the shared entrance. `/anewgam-for-steven-cockpit/` is the existing cockpit and local Thread Loom. `/peachfall/` is the existing playable/watchable game, now with an install manifest, offline support, and a small **Hold a thought** control writing to that exact same loom. Existing game saves and bundles are not replaced.

Text is device-local only. Original whitespace is retained; oversized input is rejected rather than shortened. Storage failures leave the input visible and do not report success. This is not a connected AI conversation or an authenticated Saedo work submission. LocalStorage is shared by same-origin tabs, not a server database; simultaneous writes by unrelated old tabs are not a transaction guarantee.

## Peachfall source inside the same development workspace

Its engine remains in the existing private `stevoblevo/peachfall-playable` repository. `npm run peachfall:source` checks out the explicit `selectedSourceRef` from `saelion.workspace.json` into ignored `.worktrees/peachfall/`, using your existing Git authentication. It refuses to reset an existing checkout. The historical `observedMain` field is **not** the selected build source.

`npm run peachfall:build` runs that checkout's tests and build from **`.worktrees/peachfall/live-slice`**, using its existing package and reviewed dependencies. It refuses to fall back to the older repository-root game when live-slice is missing. Node 24–26 is required by the private game; the static shell alone requires Node 22 or newer. Existing dirty source is preserved. The command does **not** replace the public game, install dependencies automatically, change credentials, or deploy.

The selected source is a development candidate, not an accepted release. Review its exact private PR #4 tests and built-byte evidence before promotion. Main, live-slice and newer fluidity branches have not all been established as equivalent to the currently published bundle. One workspace does not erase those separate source lineages.

Review and promote a verified engine build separately. Never hand-edit minified output or copy private source into the public site. The offline asset list is derived from the actual published directory on each build.

## Publishing

GitHub Pages continues using the existing branch publishing. `npm run build` also creates an allowlisted `dist/`; the supplied `vercel.json` consumes exactly that output. Attach the **same repository** to an existing appropriate Vercel project, not a newly maintained copy. Vercel linkage, deployment protection and billing/team restrictions are separate platform settings, not proven by this config.

`saelion.co` is the intended origin; `/peachfall/` is the preferred room. No registrar/DNS, CNAME, HTTPS certificate or domain binding is changed by this code. The existing GitHub URL remains usable. Browser saves belong to their origin; moving to a new domain does not magically migrate them.

## Verification and rollback

`npm test` includes the existing cockpit checks plus exact-source ingress, input validation, quota/corrupt-state preservation, offline cache boundaries, private-file exclusion, and the explicit private build-root contract. Browser acceptance covers actual Play/Watch, holding a Peachfall thought and reading it in the cockpit, refresh, mobile controls and offline reload. See the PR's receipt for what was actually executed. Command-composition fixtures are not native Windows checkout proof.

Publish only the reviewed candidate. Roll back by reverting this change set, not resetting unrelated history. No migration changes the existing thread or game save keys. Old cached game versions retire only within the Peachfall cache namespace; a running game is not forcibly reloaded.
