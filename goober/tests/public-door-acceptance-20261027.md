# Public-door acceptance, 2026-10-27

Test-only branch: `test/public-door-acceptance-20261027`.
Public source baseline: `a6ac2d239863d5c7c1087f52e5e297d059c33cc0`.

This branch adds no application changes and is not intended for publication or merge. It reuses the existing GitHub Actions verifier's pinned Playwright client and runner Chrome. The normal verification/deployment-related master-push steps are skipped on this branch; a bounded read-only acceptance job runs instead, with contents:read permission.

Targets resolved from SKEIN-246 and SKEIN-244:
- https://stevoblevo.github.io/cobalt/index.html
- https://stevoblevo.github.io/goober/play/ and its actual /peachfall/ card

The harness hashes eight fetched public entry/runtime/style/image files against checkout bytes and also verifies actual browser response bodies. It extracts the exact public Cobalt inline script, runs actual Node --check, and compares its hash to the browser's runtime script.

Native page.on('pageerror') listeners are attached before any application navigation. A separate blank-page uncaught exception confirms the event observer, with its deliberate probe excluded from application error records. Console errors are recorded separately and never substituted for pageerror evidence.

Fresh signed-out contexts at 1280x720 and 390x844 exercise Cobalt layer buttons, Reset and three-click field cycle; direct Goober Play card navigation; image decode and animation; Watch and Play responses; and narrow layout. Chrome output is muted. Only ephemeral test-profile save state is reset, never a user's saves. No private/local/Grok/Vercel links are opened.

Evidence: acceptance.json, exact cobalt-inline.js, and screenshots in the public-door-acceptance Actions artifact. A source or runtime mismatch fails acceptance. This note is not a passing receipt; use the exact matching terminal CI result.

Cobalt was fixed earlier in commit 1d61df059843b695f8e90437d80f23dfa8af11a1, not PR10. The issue's older slider description differs from the current button-based v0.2 study. Goober Play is now a link handoff, not an embedded canvas.

This closes only the named bounded acceptance slice if passing. SKEIN-244's separately mentioned anewgam-crossing Vercel copy and full SKEIN-243 estate rerun are not covered. No issue status change or application deployment is performed.
