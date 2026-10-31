# Four-style toolkit review

This change adds only `storeybrook/four-styles/` on a separate branch based on `a283e581fcc9be3da84e1d59789cc4e0bfa5dee8`. It does not change the reviewed cockpit PR, its exact head, shared Storeybrook files, any workflow or live Pages.

The public package contains JavaScript/CSS, shared semantic content, a standalone code-only demo, a null asset-map example, tests, a verified local-preview assembly script and documentation. No attached image, private Library identifier or machine path is included. The separate private crop pack has four complete column crops, four primary scenes, four key-frame strips and four symbol strips, with source-pixel coordinates, SHA-256 fingerprints and provenance. The source's column dividers shift below the main art, so complete columns use explicit polygon alpha masks; selected pixels are not repainted or resampled. The shared bottom footer remains in the original source.

The four visual modes share one DOM and independent system/light/dark appearance. Preferences are remembered only after the person opts in. Notes and bookmarks survive style changes in memory; they are not silently stored. Semiotic mode keeps screen-reader labels and optional readable words. Skeptic presents questions and uncertainty, without fabricated evidence or status.

Automated controller and asset-boundary tests pass. The private crop manifest and source bytes are independently hashed, all crop dimensions are verified, and pixel comparisons confirm that retained pixels match their source rectangles. HTTP asset checks verify the private assembly resolves its scripts, styles and all sixteen crops.

Browser acceptance is pending: the in-app browser connection returned “transport closed before response” during tab creation, and inventory then returned no browser surfaces with the same error. No alternate browser-control route was used. Consequently no rendered desktop/mobile/TV screenshot or physical controller/touch test is claimed for this package. Dynamic theme/reduced-motion, keyboard and state-retention checks currently use the controller harness. Test these in a real browser before promotion.

No public runnable preview is configured. The private assembly runs only through an explicitly started loopback server; the public code demo honestly asks for local artwork. Public image activation requires separate approval of the exact assets and a reviewed map. Code publication remains a draft; no merge or live promotion is performed.
