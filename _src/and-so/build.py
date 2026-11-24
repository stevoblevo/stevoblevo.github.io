#!/usr/bin/env python3
"""Inline the AND SO sources into one self-contained page.

    python3 build.py      # writes and-so.html (artifact body), dist/and-so.html (full page), check.js

Storeybrook (the storybook design toolkit) is vendored in vendor/: its tokens are scoped under html[data-sb], so they
only apply while a Storeybrook look is on, and its script defines window.Storeybrook before AND SO runs.
"""
import json
from pathlib import Path

from versions import VERSIONS   # every version of AND SO, for the picker on the landing and in the gamut

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor"
JS = ["a-core.js", "b-audio.js", "c-music.js", "d-game.js", "d2-world.js", "e-input.js", "f-draw.js", "f2-terrain.js",
      "h-listen.js", "i-views.js", "j-motion.js", "k-world.js", "l-reel.js", "m-paper.js", "n-mirror.js", "o-jam.js",
      "p-brook.js", "y-voice.js", "q-guard.js", "r-versions.js", "s-hide.js",
      "t-book.js", "u-wing.js", "v-tune.js", "w-dream.js", "x-mag.js", "z-board.js", "z-app.js", "zz-first.js", "zy-faces.js", "zw-petreal.js", "zx-pets.js", "g-loop.js"]
FONTS = ("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500"
         "&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600"
         "&family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800"
         "&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&family=IM+Fell+English:ital@0;1"
         "&family=Bangers&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Zen+Maru+Gothic:wght@400;500;700&display=swap")
VERSION = "10.6"
# the toolkit family, pinned by version: Storeybrook is vendored as before; the night and the dusk draw with the kits' pens
# each kit's add-ons (the pen; the pets, family plan F9), copied from the kit's v/<version>/ and never edited here
KIT_ADDONS = ["storeybrook-paper-1.4.0.js", "storeybrook-pets-1.4.0.js", "depthfield-pen-2.4.0.js", "depthfield-pets-2.4.0.js", "hypermetapunk-pen-0.4.0.js", "hypermetapunk-pets-0.4.0.js"]


def main() -> None:
    css = (SRC / "style.css").read_text()
    sb_css = (VENDOR / "storeybrook-tokens.css").read_text() + (VENDOR / "storeybrook.css").read_text()
    css_sb = (SRC / "style-sb.css").read_text() + (SRC / "style-book.css").read_text()
    body = (SRC / "body.html").read_text()
    # the pens ride in the same script element as Storeybrook, so the mirror carries them into its inner copies
    sb_js = (VENDOR / "storeybrook.js").read_text() + "".join("\n" + (VENDOR / name).read_text().replace("</script", "<\\/script") for name in KIT_ADDONS)   # a kit's comment may show a <script> tag; inline, it would end ours
    vers = [{k: v[k] for k in ("id", "short", "name", "date", "line", "path", "latest", "edition") if k in v} for v in VERSIONS]
    # the Book: the standards (book.json) and the chapter with its names filed off (book-nf.json, names_filed_off.py)
    book = json.dumps(json.loads((SRC / "book.json").read_text()) + (json.loads((SRC / "book-nf.json").read_text()) if (SRC / "book-nf.json").exists() else []), ensure_ascii=False, separators=(",", ":"))
    wing = (SRC / "wing.json").read_text().strip()
    script = f"const ANDSO_VERSIONS = {json.dumps(vers, ensure_ascii=False)};\nconst BOOK_DATA = {book};\nconst WING_DATA = {wing};\n" + "\n".join((SRC / name).read_text() for name in JS)
    for bad in ("</script", "<!--"):
        assert bad not in script and bad not in sb_js, f"{bad} would end the inline script"
    for bad in ("</style",):
        assert bad not in css + sb_css + css_sb, "a stylesheet would end early"
    # ids on the style, the app markup and both scripts: the mirror reads them back to open a fresh copy of the page
    # paper from the first paint: AND SO opens in Meta Daylight, so the page wears its tokens before the script decides
    # (boot() keeps or swaps the look); without this a slow load shows the night ground for a moment
    styles = (f'<style id="andso-css">\n{css}{sb_css}{css_sb}</style>\n'
              "<script>document.documentElement.dataset.sb = 'daylight';</script>\n")
    body = f'<div id="andso-app">\n{body}</div>\n'
    scripts = f"<script id=\"sb-js\">\n{sb_js}\n</script>\n<script id=\"andso-js\">\n(() => {{\n'use strict';\nconst ANDSO_VERSION = '{VERSION}';\n{script}\n}})();\n</script>\n"
    page = (
        "<title>AND SO 10.6</title>\n"
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"{styles}{body}\n{scripts}"
    )
    out = ROOT / "and-so.html"
    out.write_text(page)
    (ROOT / "check.js").write_text("(() => {\n'use strict';\nconst ANDSO_VERSION = 'x';\n" + script + "\n})();\n")
    (ROOT / "preview.html").write_text(
        '<!doctype html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        "</head><body>" + page + "</body></html>")
    dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
    (dist / "and-so.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="AND SO 10.6 · Fluff: a microtonal instrument you play by letting go, with a fake book of changes to play along with in just intonation, and the kits\' pets on the hills. First steps for a first visit, one find a day, a board you sign with your own key, a lead sheet on the same clock, and a classical wing. '
        'voices roll into the valleys where notes agree.">\n'
        '<meta name="theme-color" content="#f4f6f2">\n'
        # installable on stevoblevo.github.io: the manifest, worker and icons are copied next to the page below
        '<link rel="manifest" href="/and-so/manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="/and-so/icons/apple-touch-icon.png">\n'
        '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Ccircle cx=\'8\' cy=\'8\' r=\'5\' fill=\'%23e7b23a\'/%3E%3C/svg%3E">\n'
        # the page draws both light and dark looks itself, so a browser's own dark mode has nothing to repaint
        '<meta name="color-scheme" content="light dark">\n'
        '<title>AND SO 10.6</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"{styles}</head>\n<body>\n{body}\n{scripts}</body>\n</html>\n")
    site = ROOT.parents[1] / "and-so"
    site.mkdir(exist_ok=True)
    (site / "book.json").write_text(book + "\n", encoding="utf-8")
    (site / "wing.json").write_text(wing + "\n", encoding="utf-8")
    pwa = ROOT / "pwa"   # AND SO as an app: the worker must sit at /and-so/sw.js to look after everything under /and-so/
    (site / "manifest.webmanifest").write_text((pwa / "manifest.webmanifest").read_text(), encoding="utf-8")
    (site / "sw.js").write_text((pwa / "sw.js").read_text(), encoding="utf-8")
    (site / "icons").mkdir(exist_ok=True)
    for icon in (pwa / "icons").glob("*.png"):
        (site / "icons" / icon.name).write_bytes(icon.read_bytes())
    print(f"wrote {out.name}: {len(page):,} bytes")


if __name__ == "__main__":
    main()
