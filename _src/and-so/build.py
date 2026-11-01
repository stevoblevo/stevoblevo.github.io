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
      "t-book.js", "u-wing.js", "v-tune.js", "w-dream.js", "x-mag.js", "g-loop.js"]
FONTS = ("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500"
         "&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600"
         "&family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800"
         "&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&family=IM+Fell+English:ital@0;1"
         "&family=Bangers&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Zen+Maru+Gothic:wght@400;500;700&display=swap")
VERSION = "8.1.1"


def main() -> None:
    css = (SRC / "style.css").read_text()
    sb_css = (VENDOR / "storeybrook-tokens.css").read_text() + (VENDOR / "storeybrook.css").read_text()
    css_sb = (SRC / "style-sb.css").read_text() + (SRC / "style-book.css").read_text()
    body = (SRC / "body.html").read_text()
    sb_js = (VENDOR / "storeybrook.js").read_text()
    vers = [{k: v[k] for k in ("id", "short", "name", "date", "line", "path", "latest", "edition") if k in v} for v in VERSIONS]
    book = (SRC / "book.json").read_text().strip()
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
        "<title>AND SO 8.1.1</title>\n"
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
        '<meta name="description" content="AND SO 8.1.1 · The Book, in the jam: a microtonal instrument, a lead sheet on the same clock, and a classical wing. '
        'voices roll into the valleys where notes agree.">\n'
        '<meta name="theme-color" content="#f4f6f2">\n'
        '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Ccircle cx=\'8\' cy=\'8\' r=\'5\' fill=\'%23e7b23a\'/%3E%3C/svg%3E">\n'
        # the page draws both light and dark looks itself, so a browser's own dark mode has nothing to repaint
        '<meta name="color-scheme" content="light dark">\n'
        '<title>AND SO 8.1.1</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"{styles}</head>\n<body>\n{body}\n{scripts}</body>\n</html>\n")
    site = ROOT.parents[1] / "and-so"
    site.mkdir(exist_ok=True)
    (site / "book.json").write_text(book + "\n", encoding="utf-8")
    (site / "wing.json").write_text(wing + "\n", encoding="utf-8")
    print(f"wrote {out.name}: {len(page):,} bytes")


if __name__ == "__main__":
    main()
