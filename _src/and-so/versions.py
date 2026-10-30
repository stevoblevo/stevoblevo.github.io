"""Every version of AND SO stays playable on GitHub Pages. This writes:
  and-so/index.html and and-so/v8/index.html   the current build (dist/and-so.html), which has its own version picker
  and-so/<path>/index.html                     each earlier build, taken from the commit that shipped it, plus one line
                                               that adds the version toggle (/versions/versions.js)
  and-so/versions.json                         the list the toggle and AND SO 7 read, with each file's sha256
  and-so/versions/index.html                   every version on one page (also the way in without JavaScript)
Run from the repository root after build.py:  python3 _src/and-so/versions.py
"""
import hashlib, html, json, shutil, subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = REPO / "and-so"
VERSIONS = [
    dict(id="8.1.3", short="AND SO 8.1.3", name="AND SO 8.1.3 · The Book, in the jam", date="2026-10-30", path="/and-so/v8.1.3/", latest=True, source="dist",
         line="8.1.3 fake book: 331 standards, chord changes only except public-domain melodies."),
    dict(id="8.1.2", short="AND SO 8.1.2", name="AND SO 8.1.2 · The Book, in the jam", date="2026-10-30", path="/and-so/v8.1.2/", source="bc7db7cb7bd59f695ae29ab738006d6538d99635",
         line="8.1.2 full screen."),
    dict(id="8.1.1", short="AND SO 8.1.1", name="AND SO 8.1.1 · The Book, in the jam", date="2026-10-30", path="/and-so/v8.1.1/", source="eca23d0a44601de2a49fd36498972e47b4a5d5d6",
         line="8.1.1 voice fix. The listener's language first, then the OS and browser, with quality inside each step. Inside that language, an accent from another region. Moira is not in the pool. ?voices=1 lists the choice. Full screen."),
    dict(id="8.1", short="AND SO 8.1", name="AND SO 8.1 · The Book, in the jam", date="2026-10-30", path="/and-so/v8.1/", source="a283e581fcc9be3da84e1d59789cc4e0bfa5dee8",
         line="The fake book plays inside the jam, on the same clock, with a lead sheet and real controls. The narrator uses an English accent from outside your own region. Full screen."),
    dict(id="8", short="AND SO 8.0.1", name="AND SO 8.0.1 · The Book", date="2026-10-30", path="/and-so/v8/", source="471c3b3ccdcf06902cad03940a4d5c5b96990cf7",
         line="A book of changes you can play with, a classical wing, Tune together when another copy is listening, Dreamwalk, and Mag, who finds you with a bunny behind her. 8.0.1 full screen."),
    dict(id="7", short="AND SO 7.0.1", name="AND SO 7.0.1 · Everfallen", date="2026-10-27", path="/and-so/v7/", source="c691e5ac2b205ebde26b4f0eb99edbc10f4d0374", corner="bl",
         line="Plucked notes, a jam band, the brook and its nougats, the mirror, Storeybrook looks, guardians born from misheard words, and a reel for every look. 7.0.1 full screen."),
    dict(id="6.1", short="AND SO 6.1.1", name="AND SO 6.1.1", date="2026-10-24", path="/and-so/v6.1/", source="aa8cbe6", corner="bl",
         line="Dark by default. Tilt, shake and twist, the guided reel, 31-EDO, the glasshouse and peachfall looks. 6.1.1 full screen."),
    dict(id="6", short="AND SO 6.0.1", name="AND SO 6.0.1", date="2026-10-23", path="/and-so/v6/", source="bb58990", corner="bl",
         line="Tilt, shake and twist; a guided reel; 31-EDO; the glasshouse and peachfall looks. 6.0.1 full screen."),
    dict(id="2026-10-22", short="AND SO, 22 Oct", name="AND SO, 22 October", date="2026-10-22", path="/and-so/2026-10-22/", source="60ed2e8", corner="bl",
         line="Cymatics, the lattice cube, a 5D experiment, and the bw2 and fieldstone looks. Full screen."),
    dict(id="2026-10-12", short="AND SO, 12 Oct", name="AND SO, 12 October", date="2026-10-12", path="/and-so/2026-10-12/", source="cf63f5c", corner="bl",
         line="The first AND SO: a microtonal instrument you can hum to. Full screen."),
    dict(id="gamut-43", short="Gamut Field Guide", name="Gamut Field Guide", date="2026-10-22", path="/and-so/gamut-43/", source="06690c7:and-so/gamut-43/index.html", edition=True, corner="bl",
         line="The field-guide edition: an appoggiatura you can hold, and 43 things to discover across alternate tunings. Full screen."),
]


def git_show(spec):
    if ":" not in spec: spec += ":and-so/index.html"
    return subprocess.run(["git", "-C", str(REPO), "show", spec], check=True, capture_output=True).stdout.decode("utf-8")


def toggle(v):
    return (f'<script src="/versions/versions.js" data-versions="/and-so/versions.json" data-current="{v["id"]}" '
            f'data-corner="{v.get("corner", "bl")}" defer></script>\n')


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    out = []
    dist = REPO / "_src" / "and-so" / "dist" / "and-so.html"
    for v in VERSIONS:
        dest = REPO / v["path"].strip("/") / "index.html"; dest.parent.mkdir(parents=True, exist_ok=True)
        if v["source"] == "dist":
            shutil.copy(dist, dest); shutil.copy(dist, SITE / "index.html")
        else:
            src = git_show(v["source"]); i = src.rfind("</body>")
            assert i > 0, v["id"]
            dest.write_text(src[:i] + toggle(v) + src[i:], encoding="utf-8")
        row = {k: v[k] for k in ("id", "short", "name", "date", "line", "path") if k in v}
        for k in ("latest", "edition"):
            if v.get(k): row[k] = True
        row["commit"] = v["source"].split(":")[0] if v["source"] != "dist" else "current build"
        row["sha256"] = sha(dest)
        out.append(row)
    data = {"game": "AND SO", "latest": "/and-so/", "index": "/and-so/versions/", "versions": out}
    (SITE / "versions.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_index(out)
    print("versions:", ", ".join(f'{r["id"]} → {r["path"]}' for r in out))


def write_index(rows):
    items = "".join(
        f'<li><a class="sb-sheet ver" href="{html.escape(r["path"])}"><span class="ver__name">{html.escape(r["name"])}'
        + (' <span class="sb-chip sb-chip--sea">latest</span>' if r.get("latest") else "") + (' <span class="sb-chip sb-chip--lilac">edition</span>' if r.get("edition") else "")
        + f'</span><span class="ver__date">{html.escape(r["date"])}</span><span class="ver__line">{html.escape(r["line"])}</span></a></li>' for r in rows)
    page = f"""<!doctype html>
<html lang="en" data-theme="daylight" class="sb-root">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>AND SO · every version</title>
<meta name="description" content="Every version of AND SO, the microtonal music toy. Each one stays playable.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DynaPuff:wdth,wght@75..100,400..700&family=Alegreya:ital,wght@0,400..800;1,400..800&family=Andika:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400..700&display=swap">
<link rel="stylesheet" href="/storeybrook/dist/tokens.css">
<link rel="stylesheet" href="/storeybrook/dist/components/bundle.css">
<style>
main {{ position: relative; z-index: 1; max-width: 46rem; margin: 0 auto; padding: var(--space-7) var(--space-5) var(--space-9); }}
h1 {{ margin: 0 0 var(--space-3); }}
.sb-lede {{ margin-bottom: var(--space-6); }}
ol {{ list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-4); }}
a.ver {{ display: grid; gap: 4px; color: var(--ink); text-decoration: none; transition: transform var(--dur-quick) var(--ease-out); }}
a.ver:hover, a.ver:focus-visible {{ transform: translateY(-2px); }}
.ver__name {{ font: var(--sb-display-weight) 1.6rem/1.1 var(--sb-display); font-variation-settings: "wdth" var(--sb-display-wdth); display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }}
.ver__date {{ font: 700 0.95rem/1.2 var(--sb-ui); color: var(--ink-muted); }}
.ver__line {{ font: 400 1.1rem/1.45 var(--sb-story); }}
.back {{ display: inline-block; margin-top: var(--space-6); }}
@media (prefers-reduced-motion: reduce) {{ a.ver {{ transition: none; }} a.ver:hover {{ transform: none; }} }}
</style>
</head>
<body class="sb-body sb-no-js">
<div class="sb-washes" aria-hidden="true"><i class="sb-wash sb-wash--sky sb-wash--band" style="top:-9rem;--h:18rem"></i><i class="sb-sun" style="--w:7rem;right:6%;top:1rem"></i></div>
<main>
<h1 class="display-l">Every AND SO</h1>
<p class="sb-lede">A short changelog, newest first. Each line opens that version, and the one before stays where it was. They keep separate saves.</p>
<ol>{items}</ol>
<a class="sb-btn sb-btn--secondary back" href="/and-so/">Back to AND SO 8.1.3</a>
</main>
<script src="/storeybrook/dist/components/bundle.js"></script>
<script>if (window.Storeybrook) Storeybrook.init();</script>
</body>
</html>
"""
    d = SITE / "versions"; d.mkdir(exist_ok=True)
    (d / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
