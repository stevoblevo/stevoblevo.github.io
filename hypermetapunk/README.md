> **Superseded (23 Nov 2026).** This folder is an early stand-in Claude made on 16 Nov, before it found the real kit.
> The real Hypermetapunk lives in its own repository, <https://github.com/stevoblevo/hypermetapunk>, served at
> <https://stevoblevo.github.io/hypermetapunk/> (the project site takes that address, so this folder is never served).
> Its Claude design-system artifact now holds the real kit's `project/` too. Kept here as history; do not build on it.

Hypermetapunk is the neon kit: a dark aubergine room where five glowing axes hold a sound in place. It is the third face of the same lattice, after Storeybrook (paper, daylight, a book on a table) and Depthfield (planes and depth of field). Where Storeybrook reads like a storybook, Hypermetapunk reads like an instrument panel at night: named things in tracked serif capitals, live things in glow, numbers with their units.

It starts small. Version 0.1 holds the colours, type, spacing, radii and one glow, taken from the hypermetapunk look in AND SO 8.3, where it was first drawn. It has no components yet; the plan for them is in `hypermetapunk/ROADMAP.md` in the stevoblevo.github.io repository.

## Principles

- **The ground is the dark.** Everything sits on `void`, `aubergine` or `plum`. Light comes from the things on it, not from the page.
- **Glow means live.** `mint` and the `glow` shadow mark what is happening now: the sounding curve, the node under your finger, the active tab. Nothing static glows. If two things glow, one of them is lying.
- **Five axes, five colours.** The lattice has five dimensions and each has its colour: Tuning `mint`, Shimmer `violet`, Pace `gold`, Space `sky`, Warmth `coral`. Use them only for those axes and for data about them. The colours are a designed mapping, not light frequencies; say so wherever a person might read them as physics.
- **Name it, then measure it.** Names are set in the display face: tracked capitals for a marquee, italic for an axis. Values are set in `mono` with their real units: cents, hertz, ratios like 3/2, beats per minute.
- **Readable in the dark.** `ink` and `ink-muted` hold 7:1 or better on every ground. A colour is never the only signal: a held dissonance in `coral` also says “held”.
- **Quiet until asked.** Sound, the microphone and the camera wait for a person to turn them on. Motion drifts slowly; with reduced motion, nothing drifts.

## Voice

- Lower case inside an instrument, sentence case in the chrome around it, as in AND SO.
- Short, plain and exact: “five primes, five dimensions: thirty-two ratios on one shape.” Numbers carry units.
- No exclamation marks, no emoji.

## Colour

- Ground: `void` for the outer dark, `aubergine` for the surface you read and play on, `plum` for anything raised.
- Text: `ink` for names and running text; `ink-muted` for labels, captions and readouts.
- Lines: `line` for hairlines and lattice edges; control borders use `ink-muted` so they reach 3:1.
- Signal: `mint` for the one live thing. The primary action is `gold` with `void` text (12:1).
- Warm: `peach` for large numerals and the creature’s highlight, never small text on light.

## Type

- Load from Google Fonts: Cormorant Garamond (display, 500 and 600, with italic), Hanken Grotesk (text), JetBrains Mono (readouts).
- `marquee`: one per screen, the name of the thing, tracked 0.18em in capitals.
- `title` for section names; `axis` (italic) for the five axes and other labels that sit in the drawing.
- `body` for reading; `label` (tracked capitals, small) for controls; `readout` for every number with a unit.

## Layout and space

- Spacing steps: `space-1` 4px, `space-2` 8px, `space-4` 16px, `space-8` 32px, `space-16` 64px. The lattice dot pitch is `space-4`.
- Radii: `radius-sm` for readouts and chips, `radius-md` for panels, `radius-pill` for tabs, toggles and nodes.
- The drawing leads: the lattice or the curve takes the middle; panels sit at the edges on `plum` with `radius-md`.

## Imagery

- Lines and points of light: the pentagon of five axes, the penteract (32 corners, 80 edges), dissonance curves with their valleys. Drawn, never photographed.
- No gradients other than a glow fading into the dark.

## Consuming

Set the page on `void`, put readable content on `aubergine` or `plum`, and use the colour names above as CSS variables (`var(--mint)`). The global namespace is `Hypermetapunk`.
