"""Build the public Storeybrook site (stevoblevo.github.io/storeybrook/) from src/project:
dist/ (tokens.css, tokens.json, the bundle, the types, the embedded export), docs/ (every chapter as a page that can be
read aloud), components/ (every live preview with its guidelines) and index.html. Run from anywhere:
    python3 storeybrook/src/tools/build_site.py
"""
import html, json, re, shutil, sys
from pathlib import Path
import markdown
sys.path.insert(0, str(Path(__file__).parent))
from common import tokens_css, P

SITE = P.parent.parent                    # storeybrook/
DIST = SITE / "dist"; DOCS = SITE / "docs"; COMP = SITE / "components"
VERSION = re.search(r"VERSION = '([^']+)'", (P / "components" / "bundle.js").read_text()).group(1)
FONTS = ("https://fonts.googleapis.com/css2?family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800"
         "&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&family=IM+Fell+English:ital@0;1&family=Bangers"
         "&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Zen+Maru+Gothic:wght@400;500;700&display=swap")

CHAPTERS = [("index", "README.md", "The short version"), ("paper", "01-paper.md", "Paper"), ("looks", "02-looks.md", "Looks"), ("color", "03-color.md", "Color"),
            ("type", "04-type.md", "Type"), ("layout", "05-layout.md", "Layout"), ("motion", "06-motion.md", "Motion"), ("iconography", "07-iconography.md", "Iconography"),
            ("writing", "08-writing.md", "Writing"), ("sound", "09-sound.md", "Sound and reading aloud"), ("progression", "10-progression.md", "Rewards and progression"),
            ("devices", "11-devices.md", "Devices"), ("accessibility", "12-accessibility.md", "Accessibility"), ("code", "13-code.md", "Code"),
            ("governance", "14-governance.md", "Governance"), ("play", "15-play.md", "Play")]
GROUPS = ["Actions", "Inputs", "Paper", "Story", "Play", "Rewards", "Shelf", "Navigation", "Overlays", "Transitions"]
ICON = {"Button": "tap", "Seal": "check", "Choice": "look", "Toggle": "sun", "Slider": "drag", "Looks": "look", "Sheet": "sticker", "Washes": "ink", "Page": "book",
        "Spread": "book", "Prose": "book", "Caption": "comix", "Balloon": "comix", "Panels": "comix", "Reader": "voice", "Brook": "brook", "Creature": "bunny",
        "Jar": "jar", "Sticker": "sticker", "Lock": "lock", "Shelf": "gift", "Chip": "info", "Tabs": "menu", "Dialog": "info", "Drawer": "menu", "Toast": "sparkle",
        "Fold": "origami", "Blot": "ink"}
LOOKS = [("daylight", "Meta Daylight"), ("knight", "Knight Night"), ("inkblot", "Ink Blot"), ("comix", "Comix"), ("origami", "Origami"), ("skein", "Skein silk")]


def md(text):
    out = markdown.markdown(text, extensions=["tables", "fenced_code", "toc"], output_format="html")
    out = out.replace("<pre>", '<pre class="sb-noread">').replace("<table>", '<table class="sb-noread">')
    return out


def head(title, depth, desc, extra=""):
    up = "../" * depth
    return (f'<!doctype html>\n<html lang="en" data-theme="daylight" class="sb-root">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>{html.escape(title)}</title>\n'
            f'<meta name="description" content="{html.escape(desc)}">\n<meta name="theme-color" content="#f4f6f2">\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{FONTS}">\n<link rel="stylesheet" href="{up}dist/tokens.css">\n<link rel="stylesheet" href="{up}dist/components/bundle.css">\n'
            f'<link rel="stylesheet" href="{up}site.css">\n{extra}</head>\n')


def topbar(depth, here):
    up = "../" * depth
    links = [("Home", f"{up}index.html", "home"), ("Rules", f"{up}docs/index.html", "docs"), ("Components", f"{up}components/index.html", "components"), ("Files", f"{up}index.html#files", "files")]
    cur = ' aria-current="page"'
    nav = "".join(f'<a class="site-top__link"{cur if k == here else ""} href="{h}">{n}</a>' for n, h, k in links)
    opts = "".join(f'<option value="{i}">{n}</option>' for i, n in LOOKS)
    return (f'<header class="site-top"><a class="site-top__mark" href="{up}index.html"><span data-sb-icon="brook" data-size="22"></span>Storeybrook</a>'
            f'<nav class="site-top__nav" aria-label="Storeybrook">{nav}</nav>'
            f'<label class="site-top__look"><span class="sb-visually-hidden">Look</span><span data-sb-icon="look" data-size="20"></span>'
            f'<select data-site-look aria-label="Look">{opts}</select></label></header>\n')


def tail(depth, script=""):
    up = "../" * depth
    return (f'<footer class="site-foot"><p>Storeybrook {VERSION}. Shipped first in <a class="sb-ink-link" href="{up}../and-so/">AND SO 7</a> and '
            f'<a class="sb-ink-link" href="{up}../gg/">the 99¢ Shelf</a>. Its dark counterpart is Depthfield.</p>'
            f'<p><a class="sb-ink-link" href="{up}../index.html">stevoblevo.github.io</a> · <a class="sb-ink-link" href="{up}../saelion-atlas/">Saelion Atlas</a></p></footer>\n'
            f'<script src="{up}dist/components/bundle.js"></script>\n<script src="{up}site.js"></script>\n'
            + (f"<script>{script}</script>\n" if script else "") + "</body>\n</html>\n")


def build_dist():
    if DIST.exists(): shutil.rmtree(DIST)
    (DIST / "components").mkdir(parents=True); (DIST / "embed").mkdir()
    (DIST / "tokens.css").write_text("/* Storeybrook — generated from tokens.json */\n" + tokens_css())
    shutil.copy(P / "tokens.json", DIST / "tokens.json")
    for f in ("bundle.css", "bundle.js", "index.d.ts"): shutil.copy(P / "components" / f, DIST / "components" / f)
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "export_andso.py"), str(DIST / "embed")], check=True, capture_output=True)


def build_docs():
    DOCS.mkdir(exist_ok=True)
    for i, (slug, src, name) in enumerate(CHAPTERS):
        text = (P / src).read_text()
        if slug == "index": text = "# The short version\n\n" + text
        body = md(text)
        prev = CHAPTERS[i - 1] if i > 0 else None; nxt = CHAPTERS[i + 1] if i + 1 < len(CHAPTERS) else None
        cur = ' aria-current="page"'
        toc = "".join(f'<li><a href="{s}.html"{cur if s == slug else ""}>{n}</a></li>' for s, _, n in CHAPTERS)
        pn = ""
        if prev: pn += f'<a class="sb-btn sb-btn--quiet" href="{prev[0]}.html"><span data-sb-icon="prev"></span>{prev[2]}</a>'
        if nxt: pn += f'<a class="sb-btn sb-btn--secondary" href="{nxt[0]}.html">{nxt[2]}<span data-sb-icon="next"></span></a>'
        page = (head(f"{name} · Storeybrook", 1, f"Storeybrook rules: {name}.") + '<body class="sb-body sb-no-js">\n' + washes(small=True) + topbar(1, "docs") +
                f'<div class="site-doc"><nav class="site-toc" aria-label="Chapters"><p class="site-toc__head">Chapters</p><ol>{toc}</ol></nav>'
                f'<main class="site-doc__main"><div class="sb-reader site-reader" data-sb-read="#doc"><button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>'
                f'<div class="sb-reader__info"><span class="sb-reader__title">{html.escape(name)}</span><span class="sb-reader__voice"></span><span class="sb-reader__meter"><i></i></span></div></div>'
                f'<article class="sb-page site-page" id="doc"><div class="sb-prose site-prose">{body}</div></article>'
                f'<p class="site-pn">{pn}</p></main></div>\n' + tail(1))
        (DOCS / f"{slug}.html").write_text(page)


def summary(readme):
    t = re.sub(r"^# .*\n+", "", readme).strip().split("\n\n")[0]
    m = re.match(r"(.+?[.!?])(\s|$)", t.replace("\n", " "))
    return (m.group(1) if m else t).strip()


def build_components():
    COMP.mkdir(exist_ok=True)
    rows = []
    for d in sorted((P / "components").iterdir()):
        if not d.is_dir() or d.name == "Cover" or not (d / "preview.html").exists(): continue
        src = (d / "preview.html").read_text(); readme = (d / "README.md").read_text()
        group = re.search(r'group="([^"]+)"', src.splitlines()[0]).group(1)
        style = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
        body = re.search(r'<body class="sb-body">\n(.*?)\n<script>', src, re.S).group(1)
        script = re.search(r"<script>(.*?)</script></body>", src, re.S).group(1)
        style = style.replace("html,body{margin:0}body.sb-body{min-height:0;background:var(--paper);color:var(--ink);font-family:var(--sb-story)}", "")
        rows.append((group, d.name, summary(readme)))
        page = (head(f"{d.name} · Storeybrook", 1, summary(readme), f"<style>{style}</style>\n") + '<body class="sb-body sb-no-js">\n' + topbar(1, "components") +
                f'<main class="site-comp"><p class="site-crumb"><a class="sb-ink-link" href="index.html">Components</a> · {group}</p>'
                f'<section class="site-live" aria-label="{d.name}, live">{body}</section>'
                f'<article class="sb-page site-page"><div class="sb-prose site-prose">{md(readme)}</div></article></main>\n' + tail(1, script))
        (COMP / f"{d.name}.html").write_text(page)
    cards = ""
    for g in GROUPS:
        items = [r for r in rows if r[0] == g]
        if not items: continue
        cards += f'<section class="site-group"><h2 class="display-s">{g}</h2><div class="site-cards">' + "".join(
            f'<a class="site-card" href="{n}.html"><span class="site-card__icon" data-sb-icon="{ICON.get(n, "star")}" data-size="26"></span><span class="site-card__name">{n}</span><span class="site-card__line">{html.escape(s)}</span></a>'
            for _, n, s in items) + "</div></section>"
    page = (head("Components · Storeybrook", 1, "Twenty-eight Storeybrook components, live, in any of six looks.") + '<body class="sb-body sb-no-js">\n' + washes(small=True) + topbar(1, "components") +
            f'<main class="site-wrap"><h1 class="display-l site-h1">Components</h1><p class="sb-lede">Every component is plain markup with <code>sb-</code> classes, a few with a behavior from the bundle. Open one to see it live in the current look, with its rules.</p>{cards}</main>\n' + tail(1))
    (COMP / "index.html").write_text(page)
    return rows


def washes(small=False):
    if small:
        return ('<div class="sb-washes site-washes" aria-hidden="true"><i class="sb-wash sb-wash--sky sb-wash--band" style="top:-8rem;--h:16rem"></i>'
                '<i class="sb-sun" style="--w:7rem;right:4%;top:0.5rem"></i></div>\n')
    return ('<div class="sb-washes site-washes" aria-hidden="true"><i class="sb-wash sb-wash--sky sb-wash--band sb-bloom" style="top:-14rem;--h:30rem"></i>'
            '<i class="sb-sun" style="--w:9rem;right:6%;top:1.5rem"></i><i class="sb-wash sb-wash--rose" style="--w:22rem;left:-7rem;top:26rem"></i>'
            '<i class="sb-wash sb-wash--meadow sb-wash--band" style="top:44rem;--h:24rem"></i></div>\n')


def build_index(rows):
    stones = [("The short version", "index"), ("Paper", "paper"), ("Looks", "looks"), ("Color", "color"), ("Type", "type"), ("Rewards", "progression"), ("Devices", "devices"), ("Code", "code")]
    brook = json.dumps({"seed": 7, "stones": [{"id": s, "label": n, "href": f"docs/{s}.html", "mark": str(i + 1)} for i, (n, s) in enumerate(stones)]})
    looks = "".join(f'<button class="sb-look" type="button" data-sb-look="{i}" style="--sw-paper:{p};--sw-a:{a};--sw-b:{b};--sw-ink:{k};--sw-font:\'{f}\'"><span class="sb-look__swatch" aria-hidden="true"><i></i><i></i><b>Aa</b></span>{n}<small>{l}</small></button>'
                    for i, n, l, p, a, b, k, f in [("daylight", "Meta Daylight", "Watercolor paper", "#f4f6f2", "#f3c6d3", "#8cc2e6", "#26323f", "DynaPuff"),
                                                    ("knight", "Knight Night", "By candle", "#1c2838", "#f0c75e", "#8fb4e8", "#f4efe6", "IM Fell English"),
                                                    ("inkblot", "Ink Blot", "E-ink and print", "#ffffff", "#000000", "#9e9e9e", "#000000", "IM Fell English"),
                                                    ("comix", "Comix", "Halftone and balloons", "#fffdf5", "#ff9fd0", "#38b6ee", "#111111", "Bangers"),
                                                    ("origami", "Origami", "Folded paper", "#eceef0", "#f6c3b8", "#9ab6e0", "#1f2a33", "Zen Maru Gothic"),
                                                    ("skein", "Skein silk", "Silk and copper", "#f6ecee", "#f2c6d2", "#cfe8dc", "#3a2330", "Caveat")])
    files = [("dist/tokens.css", "every token as a custom property; looks as [data-theme] blocks; a class per type style"),
             ("dist/components/bundle.css", "every component, prefixed sb-, with the look hooks and the font import"),
             ("dist/components/bundle.js", "one classic script, no dependencies, no network: window.Storeybrook"),
             ("dist/components/index.d.ts", "the markup contracts and the API, as types"),
             ("dist/tokens.json", "the tokens as data, in every look"),
             ("dist/embed/storeybrook-tokens.css", "for a host with its own theme: tokens keyed on [data-sb]"),
             ("dist/embed/storeybrook.css", "the components keyed on [data-sb], without the font import"),
             ("dist/embed/storeybrook.js", "the same bundle, for the embedded export")]
    fl = "".join(f'<li><a class="sb-ink-link" href="{p}" download>{p.split("/")[-1]}</a><span>{html.escape(d)}</span></li>' for p, d in files)
    start = html.escape((P / "README.md").read_text().split("```html\n", 1)[1].split("```", 1)[0])
    page = (head("Storeybrook", 0, "Storeybrook: a light-first kit for storybook pages and little games, in six looks.") + '<body class="sb-body sb-no-js">\n' + washes() + topbar(0, "home") +
            '<main class="site-wrap">\n'
            '<section class="site-hero"><div class="site-hero__words"><h1 class="display-xl site-title">Storeybrook</h1>'
            '<p class="sb-lede">A light-first kit for storybook pages and little games: watercolor paper, pages that turn, stories read aloud, a brook of stones to walk, and nougats that fly into a jar.</p>'
            '<p class="site-cta"><a class="sb-btn sb-btn--primary sb-btn--lg" href="docs/index.html">Read the rules</a><a class="sb-btn sb-btn--secondary" href="components/index.html"><span data-sb-icon="sticker"></span>See the components</a>'
            '<a class="sb-btn sb-btn--quiet" href="#files">Get the files</a></p></div>'
            '<div class="site-hero__art"><div data-sb-creature=\'{"form":"saelion","stage":4}\' style="--cw:min(280px,60vw)"></div></div></section>\n'
            f'<section class="site-brook" aria-labelledby="bh"><h2 class="sb-visually-hidden" id="bh">The chapters</h2><p class="sb-note site-brook__note">walk the brook to read the rules</p>'
            f'<div class="site-brook__host" data-sb-brook=\'{html.escape(brook, quote=True)}\'></div>'
            '<ol class="site-brook__list">' + "".join(f'<li><a href="docs/{s}.html">{n}</a></li>' for n, s in stones) + '</ol></section>\n'
            '<section class="site-three">'
            f'<div class="sb-sheet"><h2 class="title">Six looks, one page</h2><p class="label site-small">Press one. This whole page changes material; nothing on it moves.</p><div class="sb-looks site-looks">{looks}</div></div>'
            '<div class="sb-sheet"><h2 class="title">Read it to me</h2><div class="sb-reader" data-sb-read="#tiny"><button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"></button>'
            '<div class="sb-reader__info"><span class="sb-reader__title">The octopus who learned to be a bunny</span><span class="sb-reader__voice"></span><span class="sb-reader__meter"><i></i></span></div></div>'
            '<p id="tiny" class="story-body site-tiny">Once the octopus had learned to be a bunny, the butterfly part was easy. She tried it in the morning, when the brook was loud enough to cover any mistakes.</p></div>'
            '<div class="sb-sheet site-jar"><h2 class="title">Nougats are kept</h2><p class="label site-small">They open things by being in the jar. Nothing ever costs one.</p>'
            '<p class="site-jar__row"><button class="sb-jar" data-cap="12" type="button"></button><button class="sb-btn sb-btn--secondary sb-btn--sm" data-sb-drop="1" data-sb-reason="trying the jar"><span data-sb-icon="nougat"></span>Earn a nougat</button></p></div>'
            '</section>\n'
            f'<section class="site-files" id="files"><h2 class="display-m">Files</h2><div class="site-files__grid"><div class="sb-sheet"><ul class="site-files__list">{fl}</ul>'
            '<p class="label site-small">Fonts come from Google Fonts. Load only the families your looks use.</p></div>'
            f'<div class="sb-sheet site-code"><h3 class="title">Start here</h3><pre class="sb-noread"><code>{start}</code></pre></div></div></section>\n'
            '</main>\n' + tail(0))
    (SITE / "index.html").write_text(page)


if __name__ == "__main__":
    build_dist(); build_docs(); rows = build_components(); build_index(rows)
    print("built", VERSION, len(CHAPTERS), "chapters,", len(rows), "components")
