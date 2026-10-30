# Anewgam art-world review · 2026-10-30

The existing `/anewgam-for-steven-cockpit/` becomes an art-led garden, archive and workshop. The public URL, local state key (`anewgam.steven.cockpit.v2`), existing art IDs, local thread/outcome/export/import tools, and legacy anchors remain. This is a draft candidate, not a live deployment.

## Design and implementation

- Immediate full-screen art, one primary invitation, quiet navigation and a way back from every depth. Large uncropped archive views replace thumbnail cards. The opening image is a scenic crop; its explicit button opens the complete work.
- Native modal viewer loads actual published source bytes; keyboard, pointer swipe, pinch/zoom, fit, fullscreen request, source link and provenance. Filtering defines the next/previous sequence. Browser Back closes the viewer; deep-link reload selects the exact work. Unknown IDs do not silently open another work.
- Daylight/night follow the system by default, with a saved override. Quiet suppresses transitions and optional labels. Reduced-motion CSS and interaction checks disable motion. No sound starts automatically.
- Existing Storeybrook embed tokens and navigation are copied unchanged into `vendor/` from this repository at the base revision, avoiding external dependencies. The integration confines navigation to an open modal. Regular targets are 48px; TV targets 64px with 5px focus rings. Spatial keyboard and gamepad A/B/D-pad behavior comes from the shared component.
- Depthfield's public brand book at `stevoblevo/depthfield@41eac2256b994b8830f2255d5ab95a81d502bb26` informed the full-bleed composition, restrained chrome and art-first hierarchy. No new renderer, backend, collector or platform was created.
- Scoped shell caching retains the existing PWA and now normalizes URL fragments before allowlist matching. Large art is not bulk-cached. The site provides missing-image recovery and an explicit preview-only state.

## Public art coverage

Baseline: 26 records. Candidate: **51 records = 41 published source images + 10 legacy previews**. No image binaries are added or modified.

| Collection | Source images |
| --- | ---: |
| Cockpit GEN2, GEN4, GEN22 and expressions | 5 |
| Goober originals and Outpost | 4 |
| Published Skein keepers | 7 |
| Peachfall original PNGs | 9 |
| Deduplicated Skyknight scenic vistas | 16 |

`art-inventory.json` records source paths, dimensions, byte counts and SHA-256. The original public catalog/provenance records remain in `goober/gallery/catalog.json`, `goober/assets/asset-provenance.json` and `peachfall/source/manifest.json`. Peachfall discovery uses the existing small/large WebP derivatives; the viewer loads each actual PNG. Vistas have filename-derived titles and explicitly unverified earlier generation details.

All ten old embedded JPEGs are exactly 100 × 75 pixels. They remain at their actual size with “original unavailable”; no upscaled replacement is called an original. Private archives and the private Art Airport original are excluded. Process screenshots, personal reference images, instructional diagrams, sprite sheets and duplicate scenic bytes are not counted as additional artworks. This is a bounded public inventory, not a claim to have recovered every image from private accounts or every repository.

## Verification

Run from the repository root:

```sh
node --test anewgam-for-steven-cockpit/regression.test.cjs anewgam-for-steven-cockpit/art-world.test.cjs
python3 -m http.server 4319 --bind 127.0.0.1
```

Both Node test files passed. Checks include all 51 source fingerprints, legacy dimensions, unique IDs, nine original Peachfall paths and derivatives, local link existence, parse/ID regression, complete scoped cache assets, unrelated-cache preservation, and offline navigation with fragments. `git diff --check` passed.

Actual in-app Chromium browser review used the local HTTP checkout. Screenshots were inspected in the task transcript at desktop, 390 × 844 phone and 1920 × 1080 large-screen sizes; no horizontal overflow was observed. The screenshots are local candidate views, not live deployment proof.

Verified interactions:

- Full original PNG loaded at 1122 × 1402, using `object-fit: contain`; zoom changed the transform; next selected Astral assembly; reload preserved its exact art ID; close restored the archive.
- Peachfall filter returned 9 works. Search with no match showed the reset action. Legacy viewer retained 100 × 75 rendered/source dimensions. Pointer swipe advanced the work.
- Native modal keyboard focus, Escape, D-pad movement, 64px TV targets and 5px focus ring. Daylight and night layouts inspected. Quiet showed no CSS animation and retained all actions.
- Local hold → begin → record outcome → reload retained the original whitespace and the recorded result. Only disposable local test text was entered; it is not committed.
- A source file was temporarily removed only in this isolated checkout: the viewer showed its error/retry UI. Restoring the same bytes and pressing retry loaded the 1792px original. The source file is restored unchanged.
- Stopping the review server initially exposed an inherited fragment allowlist bug. After the fix and worker refresh, stopping the server again and reloading succeeded: all 51 records, the 1536px cached hero and local thread were present. Both review servers were stopped after use.

Limits: pointer gestures and D-pad keys are browser tests, not physical phone/TV/controller acceptance. Pinch and real gamepad buttons are implemented but not physically tested. OS reduced-motion behavior was checked in CSS/interaction code; the browser's OS preference was not changed. PWA installation, first-install offline use and live Pages served-byte acceptance remain untested. No new public preview hosting was created.

## Ownership and promotion

Base/rollback target: `c691e5ac2b205ebde26b4f0eb99edbc10f4d0374` on `master`, reread before publication. No AGENTS.md exists on that master; the integration branch's AGENTS.md was read for continuity. No other checkout, Saedo file, process or service was changed.

Open branches were inspected, not overwritten or merged:

- #2 reconnect `db2b3b1ffa66c018003369cf4ca1e456832dd94d`
- #3 one development home `a9737616bc28e9cd8fde7f94f8d0a490395be0a2`
- #4 Art Airport `1952cb09536b812e4e6bc93ff9ae0f20877c7b8b`
- #5 Nougat `f89379c056071f0fd8c16fbf6822993acf42705a`
- #6 Everfallen `7fb4c7d26b60fa500d01a3c2fb92978fd2420f76`
- #7 Peachfall map `07379f616871c2b3f32165988deff465ae4346da`

The page, app, gallery, door map and worker overlap with those candidates and need deliberate integration if they are promoted later. This candidate does not claim their unmerged ingress, Art Airport custody, Magwena or playable Nougat work. The existing `sae:art-open` event is retained as a gallery integration seam. No workflows, deployment settings, DNS, credentials, paid services or runtime permissions were changed.

Before live promotion: independently review the exact draft revision, decide how to handle overlapping branches, then approve a merge/release and verify the original public URL and rollback. No live merge or deployment is part of this draft delivery.
