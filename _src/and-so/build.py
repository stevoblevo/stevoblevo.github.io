#!/usr/bin/env python3
"""Inline the AND SO sources into one self-contained page: and-so.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
JS = ["a-core.js", "b-audio.js", "c-music.js", "d-game.js", "d2-world.js",
      "e-input.js", "f-draw.js", "f2-terrain.js", "h-listen.js", "i-views.js", "j-motion.js", "k-world.js", "l-reel.js", "g-loop.js"]
FONTS = ("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500"
         "&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&display=swap")

def main() -> None:
    css = (SRC / "style.css").read_text()
    body = (SRC / "body.html").read_text()
    script = "\n".join((SRC / name).read_text() for name in JS)
    page = (
        "<title>AND SO</title>\n"
        f'<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"<style>\n{css}</style>\n"
        f"{body}\n"
        "<script>\n(() => {\n'use strict';\n"
        f"{script}\n"
        "})();\n</script>\n"
    )
    out = ROOT / "and-so.html"
    out.write_text(page)
    (ROOT / "check.js").write_text("(() => {\n'use strict';\n" + script + "\n})();\n")
    # local preview wrapped the way the publish skeleton wraps it
    (ROOT / "preview.html").write_text(
        '<!doctype html><html><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        "</head><body>" + page + "</body></html>")
    # self-hosted copy (saelion.co): a full document, head in the head
    dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
    (dist / "and-so.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="AND SO: a microtonal instrument and game. voices roll into the valleys of a sensory-dissonance curve; hum or sing and the music follows.">\n'
        '<meta name="theme-color" content="#140a12">\n'
        '<title>AND SO</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'<link rel="stylesheet" href="{FONTS}">\n'
        f"<style>\n{css}</style>\n</head>\n<body>\n{body}\n"
        "<script>\n(() => {\n'use strict';\n" + script + "\n})();\n</script>\n</body>\n</html>\n")
    print(f"wrote {out.name}: {len(page):,} bytes")

if __name__ == "__main__":
    main()
