#!/usr/bin/env python3
"""The 99¢ Shelf: an indie shelf for the little games, in Storeybrook's Meta Daylight look.

    python3 build.py    # writes ../../gg/index.html (GitHub Pages) and gg-artifact.html (artifact body)

A preview of a shop that is not open: every game links to its free page; nothing takes payment.
Storeybrook (tokens, components, script) is reused from the AND SO vendor copy, keyed on [data-sb].
"""
import json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
VENDOR = REPO / "_src" / "and-so" / "vendor"
FONTS = ("https://fonts.googleapis.com/css2?family=DynaPuff:wdth,wght@75..100,400..700"
         "&family=Alegreya:ital,wght@0,400..800;1,400..800&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&display=swap")
GAMES = json.loads((HERE / "games.json").read_text())


def terrain(w, h, base, seed=0.0):
    pts = [(x, base + 0.13 * h * math.sin(x * 0.017 + seed) + 0.08 * h * math.sin(x * 0.043 + 1 + seed) - 0.1 * h * math.exp(-((x - w * 0.62) / 40) ** 2)) for x in range(0, w + 1, 8)]
    return pts


def path_of(pts):
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)


def valleys(pts, n):
    lows = [i for i in range(1, len(pts) - 1) if pts[i][1] >= pts[i - 1][1] and pts[i][1] >= pts[i + 1][1]]
    lows.sort(key=lambda i: -pts[i][1])
    return sorted([pts[i] for i in lows[:n]])


def art_andso():
    w, h = 800, 300
    pts = terrain(w, h, 196, 0.4)
    ground = path_of(pts) + f" L{w} {h} L0 {h} Z"
    vs = valleys(pts, 3); cols = ["var(--rose)", "var(--cerulean)", "var(--sap)"]
    balls = "".join(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x:.1f}" y2="{h}" stroke="var(--sap)" stroke-width="2.4"/>'
                    f'<circle cx="{x:.1f}" cy="{y - 9:.1f}" r="11" fill="{c}" stroke="var(--art-line)" stroke-width="2.6"/>' for (x, y), c in zip(vs, cols))
    liss = " L".join(f"{560 + 80 * math.sin(3 * t):.1f} {104 + 62 * math.sin(2 * t + 0.6):.1f}" for t in [i * 2 * math.pi / 180 for i in range(181)])
    return (f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            f'<rect width="{w}" height="{h}" fill="var(--wash-sky)"/>'
            f'<circle cx="700" cy="66" r="34" fill="var(--paper)"/><circle cx="700" cy="66" r="44" fill="none" stroke="var(--wash-sun)" stroke-width="12"/>'
            f'<path d="M{liss}" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".55"/>'
            f'<path d="{ground}" fill="var(--wash-meadow)"/><path d="{path_of(pts)}" fill="none" stroke="var(--art-line)" stroke-width="3.2" stroke-linejoin="round"/>{balls}</svg>')


def art_peach():
    petals = "".join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="3.6" fill="var(--rose)" opacity=".75" transform="rotate({r} {x} {y})"/>'
                     for x, y, r in [(214, 54, 20), (300, 80, -30), (262, 160, 60), (330, 140, 10), (196, 196, -40), (352, 210, 75), (248, 30, -10), (318, 36, 45)])
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<defs><linearGradient id="gPeach" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--wash-rose)"/><stop offset="1" stop-color="var(--wash-sun)"/></linearGradient></defs>'
            '<rect width="400" height="250" fill="url(#gPeach)"/>'
            '<path d="M52 250 L52 70 L92 34 L132 70 L132 250 Z" fill="var(--page)" stroke="var(--art-line)" stroke-width="3" stroke-linejoin="round"/>'
            '<rect x="80" y="80" width="24" height="30" rx="12" fill="var(--wash-sun)" stroke="var(--art-line)" stroke-width="2.6"/>'
            '<rect x="80" y="140" width="24" height="26" rx="4" fill="var(--wash-sky)" stroke="var(--art-line)" stroke-width="2.4"/>'
            '<g transform="rotate(-18 250 112)"><path d="M236 118 L264 118 L256 92 L244 92 Z" fill="var(--rose)" stroke="var(--art-line)" stroke-width="2.6" stroke-linejoin="round"/>'
            '<circle cx="250" cy="82" r="10" fill="var(--paper)" stroke="var(--art-line)" stroke-width="2.6"/><path d="M240 80 Q250 64 260 80" fill="var(--copper)"/>'
            '<path d="M244 96 L230 74 M256 96 L270 74" stroke="var(--art-line)" stroke-width="2.6" stroke-linecap="round"/></g>'
            f'{petals}'
            '<g fill="var(--paper)" stroke="var(--art-line)" stroke-width="2.4"><path d="M150 250 Q160 214 196 222 Q214 190 248 206 Q280 186 304 214 Q344 208 352 250 Z"/></g></svg>')


def art_knight():
    tiles = []
    for r in range(5):
        for c in range(6):
            x, y = 40 + c * 64 + (r % 2) * 32, 92 + r * 32
            fill = "var(--surface)" if (r + c) % 2 else "var(--page)"
            tiles.append(f'<path d="M{x} {y} l32 -16 l32 16 l-32 16 Z" fill="{fill}" stroke="var(--art-line)" stroke-width="1.6"/>')
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<defs><radialGradient id="gLantern" cx=".64" cy=".44" r=".42"><stop offset="0" stop-color="var(--wash-sun)"/><stop offset="1" stop-color="var(--wash-sun)" stop-opacity="0"/></radialGradient></defs>'
            '<rect width="400" height="250" fill="var(--wash-brook)"/>' + "".join(tiles) +
            '<rect width="400" height="250" fill="url(#gLantern)"/>'
            '<rect x="252" y="64" width="16" height="22" rx="3" fill="var(--gamboge)" stroke="var(--art-line)" stroke-width="2.4"/><path d="M260 48 L260 64" stroke="var(--art-line)" stroke-width="2.4"/>'
            '<path d="M156 150 Q156 112 184 108 Q212 112 212 150 L212 168 L156 168 Z" fill="var(--wash-sky)" stroke="var(--art-line)" stroke-width="3" stroke-linejoin="round"/>'
            '<path d="M164 136 L204 136" stroke="var(--art-line)" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M184 108 Q190 80 222 74 Q206 92 210 106" fill="var(--accent)" stroke="var(--art-line)" stroke-width="2.4" stroke-linejoin="round"/></svg>')


def art_goober():
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<rect width="400" height="250" fill="var(--wash-meadow)"/><rect width="400" height="96" fill="var(--wash-sky)"/>'
            '<path d="M0 96 Q100 80 200 98 T400 92 L400 110 L0 110 Z" fill="var(--wash-meadow)"/>'
            '<path d="M-10 214 C 70 150, 150 230, 220 160 S 330 120, 410 150" fill="none" stroke="var(--art-line)" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round"/>'
            '<path d="M330 148 L330 112 L360 122 L330 132" fill="var(--accent)" stroke="var(--art-line)" stroke-width="2.4" stroke-linejoin="round"/>'
            '<ellipse cx="206" cy="176" rx="30" ry="26" fill="var(--wash-sun)" stroke="var(--art-line)" stroke-width="3"/>'
            '<circle cx="196" cy="170" r="5" fill="var(--art-line)"/><circle cx="216" cy="170" r="5" fill="var(--art-line)"/><circle cx="194" cy="168" r="1.6" fill="var(--paper)"/><circle cx="214" cy="168" r="1.6" fill="var(--paper)"/>'
            '<path d="M198 184 Q206 190 214 184" fill="none" stroke="var(--art-line)" stroke-width="2.4" stroke-linecap="round"/>'
            '<g fill="var(--sap)"><path d="M40 236 l6 -18 l6 18 Z"/><path d="M90 242 l5 -14 l5 14 Z"/><path d="M300 236 l6 -18 l6 18 Z"/><path d="M356 230 l5 -14 l5 14 Z"/></g></svg>')


def art_raven():
    stars = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="var(--paper)" opacity=".85"/>' for x, y, r in [(40, 40, 2), (90, 80, 1.5), (150, 30, 2.2), (220, 60, 1.4), (330, 40, 1.8), (370, 110, 1.4), (60, 140, 1.3), (260, 20, 1.5)])
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<defs><linearGradient id="gNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2a45"/><stop offset="1" stop-color="#3a4f7a"/></linearGradient></defs>'
            f'<rect width="400" height="250" fill="url(#gNight)"/>{stars}'
            '<circle cx="290" cy="96" r="46" fill="#f4efe6"/><circle cx="306" cy="86" r="46" fill="url(#gNight)" opacity=".18"/>'
            '<path d="M120 150 C 150 120, 196 118, 222 132 C 240 112, 266 108, 288 116 C 266 120, 254 130, 248 142 C 270 150, 286 166, 292 184 C 268 168, 242 160, 214 162 C 188 170, 160 168, 138 160 L 112 172 L 120 150 Z" fill="#0f1524" stroke="#f4efe6" stroke-width="1.6" stroke-opacity=".35"/>'
            '<circle cx="246" cy="128" r="2.6" fill="var(--gamboge)"/>'
            '<path d="M0 214 Q120 196 220 216 T400 206 L400 250 L0 250 Z" fill="#0f1524"/></svg>')


def art_well():
    rain = "".join(f'<path d="M{x} {y} l-8 22" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>' for x, y in [(40, 20), (90, 60), (140, 14), (200, 44), (250, 10), (300, 52), (350, 18), (380, 70), (70, 110), (330, 120), (20, 160), (370, 170)])
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<defs><linearGradient id="gDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5d86"/><stop offset="1" stop-color="#8d98ad"/></linearGradient>'
            '<radialGradient id="gPeachL" cx=".5" cy=".62" r=".5"><stop offset="0" stop-color="var(--wash-sun)" stop-opacity=".95"/><stop offset="1" stop-color="var(--wash-sun)" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="400" height="250" fill="url(#gDusk)"/><rect width="400" height="250" fill="url(#gPeachL)"/>{rain}'
            '<ellipse cx="200" cy="170" rx="96" ry="30" fill="#2c3a58" stroke="var(--art-line)" stroke-width="3"/>'
            '<path d="M104 170 L104 214 Q200 252 296 214 L296 170" fill="var(--art-stone)" stroke="var(--art-line)" stroke-width="3" stroke-linejoin="round"/>'
            '<path d="M104 192 Q200 226 296 192 M140 176 L140 222 M176 182 L176 230 M224 182 L224 230 M260 176 L260 222" fill="none" stroke="var(--art-line)" stroke-width="1.8" opacity=".6"/>'
            '<ellipse cx="200" cy="168" rx="70" ry="18" fill="var(--art-water)" opacity=".9"/><path d="M168 166 Q200 158 232 166" stroke="var(--paper)" stroke-width="2" fill="none" opacity=".8"/>'
            '<circle cx="246" cy="122" r="12" fill="var(--rose)" stroke="var(--art-line)" stroke-width="2.4"/><path d="M246 110 Q250 100 258 98" stroke="var(--sap)" stroke-width="2.4" fill="none"/></svg>')


def art_garden():
    rain = "".join(f'<path d="M{x} {y} l-7 20" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity=".7"/>' for x, y in [(30, 14), (80, 40), (130, 10), (180, 36), (230, 8), (280, 30), (330, 12), (380, 40), (110, 70), (300, 66)])
    fl = []
    for i, (x, y, c) in enumerate([(60, 186, "var(--rose)"), (110, 206, "var(--wash-sun)"), (300, 196, "var(--rose)"), (350, 214, "var(--tag-lilac)"), (250, 222, "var(--wash-sun)"), (30, 226, "var(--tag-lilac)")]):
        fl.append(f'<path d="M{x} {y + 8} L{x} 250" stroke="var(--sap)" stroke-width="2.4"/>' + "".join(
            f'<circle cx="{x + 7 * math.cos(a):.1f}" cy="{y + 7 * math.sin(a):.1f}" r="5.5" fill="{c}" stroke="var(--art-line)" stroke-width="1.6"/>' for a in [k * 2 * math.pi / 5 for k in range(5)]) +
            f'<circle cx="{x}" cy="{y}" r="4" fill="var(--gamboge)"/>')
    return ('<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
            '<rect width="400" height="250" fill="var(--wash-rose)"/><path d="M0 150 Q200 120 400 150 L400 250 L0 250 Z" fill="var(--wash-meadow)"/>' + rain +
            '<path d="M176 250 Q190 196 200 150 Q210 196 224 250 Z" fill="var(--paper)" opacity=".8"/>'
            '<path d="M182 150 L182 118 L200 100 L218 118 L218 150 Z" fill="var(--page)" stroke="var(--art-line)" stroke-width="2.6" stroke-linejoin="round"/>'
            '<rect x="194" y="128" width="12" height="22" rx="6" fill="var(--wash-sun)" stroke="var(--art-line)" stroke-width="2"/>' + "".join(fl) + '</svg>')


ARTS = {"andso": art_andso, "peach": art_peach, "knight": art_knight, "goober": art_goober, "raven": art_raven, "well": art_well, "garden": art_garden}
TAGS = {"sky": "sb-chip--sky", "rose": "sb-chip--rose", "sun": "sb-chip--sun", "sea": "sb-chip--sea", "lilac": "sb-chip--lilac"}


def cover(g, i):
    chips = "".join(f'<span class="sb-chip {TAGS.get(t, "")}">{n}</span>' for n, t in g["chips"])
    sub = f'<span class="cv-sub">{g["sub"]}</span>' if g.get("sub") else ""
    tilt = [-1.1, 0.8, -0.6, 1, -0.9, 0.7, -0.5][i % 7]
    extra = '<div class="cv-creature" data-creature></div>' if g["id"] == "and-so" else ""
    return (f'<a class="sb-cover cv{" cv--feature" if g.get("feature") else ""}" href="{g["href"]}" style="--tilt:{tilt}deg" aria-label="{g["title"]}{": " + g["sub"] if g.get("sub") else ""}. 99 cents when the shop opens; free to play now.">'
            f'<span class="sb-price"><span class="sb-price__amount">99¢</span><span class="sb-price__each">each</span></span>'
            f'<div class="sb-cover__art cv-art">{ARTS[g["art"]]()}{extra}</div>'
            f'<div class="sb-cover__body"><h3 class="sb-cover__title">{g["title"]}{sub}</h3><p class="sb-cover__line">{g["line"]}</p>'
            f'<div class="sb-cover__meta"><span class="cv-chips">{chips}</span><span class="cv-play">Play free</span></div></div></a>')


def main():
    tokens = (VENDOR / "storeybrook-tokens.css").read_text()
    comps = (VENDOR / "storeybrook.css").read_text()
    sbjs = (VENDOR / "storeybrook.js").read_text()
    css = (HERE / "page.css").read_text()
    js = (HERE / "page.js").read_text()
    body = (HERE / "page.html").read_text().replace("<!-- COVERS -->", "\n".join(cover(g, i) for i, g in enumerate(GAMES))).replace("{{COUNT}}", str(len(GAMES)))
    for bad in ("</script", "<!--"):
        assert bad not in js and bad not in sbjs, bad
    head = (f'<title>The 99¢ Shelf</title>\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="{FONTS}">\n'
            f'<style>\n{tokens}{comps}{css}</style>\n')
    tail = f'{body}\n<script>\n{sbjs}\n</script>\n<script>\n{js}\n</script>\n'
    (HERE / "gg-artifact.html").write_text(head.replace('</title>\n', '</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n', 1) + tail)
    out = REPO / "gg"; out.mkdir(exist_ok=True)
    (out / "index.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="description" content="The 99¢ Shelf: Saelion\'s little games, each priced at ninety-nine cents for when the shop opens, and each free to play right now.">\n'
        '<meta name="theme-color" content="#f4f6f2">\n' + head + '</head>\n<body>\n' + tail + '</body>\n</html>\n')
    page = head + tail
    print("wrote gg/index.html and gg-artifact.html", len(page))


if __name__ == "__main__":
    main()
