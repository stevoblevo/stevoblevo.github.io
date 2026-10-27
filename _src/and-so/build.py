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
      "p-brook.js", "q-guard.js", "r-versions.js", "g-loop.js"]
FONTS = ("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500"
         "&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600"
         "&family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800"
         "&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&family=IM+Fell+English:ital@0;1"
         "&family=Bangers&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Zen+Maru+Gothic:wght@400;500;700&display=swap")
VERSION = "7.0"


def main() -> None:
    css = (SRC / "style.css").read_text()
    sb_css = (VENDOR / "storeybrook-tokens.css").read_text() + (VENDOR / "storeybrook.css").read_text()
    css_sb = (SRC / "style-sb.css").read_text()
    body = (SRC / "body.html").read_text()
    sb_js = (VENDOR / "storeybrook.js").read_text()
    vers = [{k: v[k] for k in ("id", "short", "name", "date", "line", "path", "latest", "edition") if k in v} for v in VERSIONS]
    script = f"const ANDSO_VERSIONS = {json.dumps(vers, ensure_ascii=False)};\n" + "\n".join((SRC / name).read_text() for name in JS)
    for bad in ("</script", "<!--"):
        assert bad not in script and bad not in sb_js, f"{bad} would end the inline script"
    for bad in ("</style",):
        assert bad not in css + sb_css + css_sb, "a stylesheet would end early"
    # ids on the style, the app markup and both scripts: the mirror reads them back to open a fresh copy of the page
    styles = f'<style id="andso-css">\n{css}{sb_css}{css_sb}</style>\n'
    body = f'<div id="andso-app">\n{body}</div>\n'
    scripts = f"<script id=\"sb-js\">\n{sb_js}\n</script>\n<script id=\"andso-js\">\n(() => {{\n'use strict';\nconst ANDSO_VERSION = '{VERSION}';\n{script}\n}})();\n</script>\n"
    page = (
        "<title>AND SO 7</title>\n"
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
        '<meta name="description" content="AND SO 7 · Everfallen: a microtonal instrument and storybook game. voices roll into the valleys where notes agree; '
        'jam over a blues in 7-limit tuning, open the game inside itself, and keep the nougats.">\n'
        '<meta name="theme-color" content="#f4f6f2">\n'
        '<title>AND SO 7</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"{styles}</head>\n<body>\n{body}\n{scripts}</body>\n</html>\n")
    print(f"wrote {out.name}: {len(page):,} bytes")


if __name__ == "__main__":
    main()
