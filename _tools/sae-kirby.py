#!/usr/bin/env python3
"""sae-kirby: copy a page's ability before it changes.

Freezes a playable copy of a page into ong.bak/<name>/<version>/index.html (byte-identical,
sha256-checked), takes a graphical backup (title and in-play screenshots on a phone, a laptop
and a 4K screen), tiles them into a contact sheet, records the snapshot in ong.bak/manifest.json
and rebuilds ong.bak/index.html. sae://ong.bak resolves to /ong.bak/ on this site.

    python3 _tools/sae-kirby.py --name and-so --version 6.1 --src and-so/index.html \
        --title "AND SO" --play "#enter" --note "dark by default; tilt, shake and twist"

A snapshot never overwrites a different one: same name and version with other bytes is refused
unless --force. Pages are opened from disk; Google Fonts are fetched through Python (proxy and CA
bundle honoured) and handed to the browser, so the shots use the real faces.
"""
import argparse, datetime, hashlib, html, json, os, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BAK = ROOT / "ong.bak"
VIEWS = [  # (label, width, height, scale, mobile)
    ("phone", 390, 844, 2, True),
    ("laptop", 1440, 900, 1, False),
    ("4k", 3840, 2160, 1, False),
]


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def font_route(cache: Path):
    """A Playwright route handler that serves Google Fonts fetched with requests (TLS verified)."""
    import requests
    cache.mkdir(parents=True, exist_ok=True)
    ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

    def handle(route):
        url = route.request.url
        key = cache / hashlib.sha1(url.encode()).hexdigest()
        try:
            if key.exists():
                body, ctype = key.read_bytes(), (key.with_suffix(".type").read_text() if key.with_suffix(".type").exists() else "application/octet-stream")
            else:
                r = requests.get(url, headers={"User-Agent": ua}, timeout=15)
                body, ctype = r.content, r.headers.get("content-type", "application/octet-stream")
                if r.ok:
                    key.write_bytes(body); key.with_suffix(".type").write_text(ctype)
            route.fulfill(status=200, body=body, headers={"content-type": ctype, "access-control-allow-origin": "*"})
        except Exception:
            route.abort()
    return handle


def shoot(page_file: Path, out_dir: Path, play: str | None, wait_ms: int) -> list[dict]:
    from playwright.sync_api import sync_playwright
    shots = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--mute-audio"])
        for label, w, h, scale, mobile in VIEWS:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=scale, is_mobile=mobile, has_touch=mobile)
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.route("https://fonts.googleapis.com/**", font_route(ROOT / "_tools" / ".fontcache"))
            pg.route("https://fonts.gstatic.com/**", font_route(ROOT / "_tools" / ".fontcache"))
            pg.goto(page_file.as_uri())
            pg.wait_for_timeout(wait_ms)
            f = out_dir / f"{label}-title.jpg"
            pg.screenshot(path=str(f), type="jpeg", quality=82)
            shots.append({"view": label, "state": "title", "file": f.name, "w": w, "h": h})
            if play:
                try:
                    pg.locator(play).first.click(timeout=3000)
                    pg.wait_for_timeout(wait_ms + 2500)
                    f = out_dir / f"{label}-play.jpg"
                    pg.screenshot(path=str(f), type="jpeg", quality=82)
                    shots.append({"view": label, "state": "play", "file": f.name, "w": w, "h": h})
                except Exception as e:  # a page without that control still gets its title shot
                    errs.append(f"play: {e}")
            if errs:
                shots[-1]["errors"] = errs[:3]
            ctx.close()
        b.close()
    return shots


def sheet(out_dir: Path, shots: list[dict], title: str) -> str:
    from PIL import Image, ImageDraw, ImageFont
    tiles = []
    for s in shots:
        im = Image.open(out_dir / s["file"]).convert("RGB")
        th = 360
        im = im.resize((max(1, int(im.width * th / im.height)), th), Image.LANCZOS)
        tiles.append((s, im))
    pad, top = 16, 56
    width = sum(im.width for _, im in tiles) + pad * (len(tiles) + 1)
    sh = Image.new("RGB", (width, 360 + top + pad + 26), (246, 239, 226))
    d = ImageDraw.Draw(sh)
    try:
        F = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", s)
        d.text((pad, 16), title, fill=(52, 38, 30), font=F(22))
    except Exception:
        F = lambda s: ImageFont.load_default()
    x = pad
    for s, im in tiles:
        sh.paste(im, (x, top))
        d.text((x, top + 366), f"{s['view']} · {s['state']}", fill=(110, 88, 70), font=F(14))
        x += im.width + pad
    sh.save(out_dir / "sheet.jpg", quality=86)
    return "sheet.jpg"


def rebuild_index(man: dict) -> None:
    rows = []
    for e in sorted(man["snapshots"], key=lambda e: (e["name"], e["frozen_at"]), reverse=False):
        base = f"{e['name']}/{e['version']}/"
        rows.append(
            f'<article><a class="art" href="{base}index.html"><img src="{base}{e["sheet"]}" alt="{html.escape(e["title"])} {html.escape(e["version"])}: screenshots" loading="lazy"></a>'
            f'<div><h2>{html.escape(e["title"])} <small>{html.escape(e["version"])}</small></h2>'
            f'<p>{html.escape(e.get("note", ""))}</p>'
            f'<p class="m">frozen {e["frozen_at"][:10]} · {e["bytes"]:,} bytes · sha256 <code>{e["sha256"][:16]}…</code></p>'
            f'<p><a class="go" href="{base}index.html">Play this exact version</a></p></div></article>')
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ong.bak · frozen versions</title>
<meta name="description" content="Playable, byte-identical copies of earlier versions, with screenshots.">
<style>
:root{{--paper:#f6efe2;--ink:#34261e;--muted:#6e5846;--rule:#e2d4bd;--accent:#b0482e}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 Georgia,"Times New Roman",serif}}
main{{max-width:1100px;margin:0 auto;padding:48px 20px 80px}}
h1{{font-weight:400;font-size:clamp(34px,5vw,56px);margin:0}}h1 em{{color:var(--accent)}}
.lede{{color:var(--muted);max-width:60ch}}
article{{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:24px;align-items:start;border-top:1px solid var(--rule);padding:28px 0}}
article img{{width:100%;height:auto;border-radius:10px;box-shadow:0 8px 24px rgba(52,38,30,.18)}}
h2{{font-weight:400;margin:0 0 6px}}h2 small{{color:var(--accent);font-size:.6em;letter-spacing:.08em}}
.m{{font:13px/1.5 ui-monospace,Menlo,monospace;color:var(--muted)}}code{{font:inherit}}
a{{color:var(--accent)}}.go{{display:inline-block;padding:10px 18px;border:1px solid var(--accent);border-radius:999px;text-decoration:none}}
.go:focus-visible,.art:focus-visible{{outline:3px solid var(--accent);outline-offset:3px}}
@media (max-width:720px){{article{{grid-template-columns:1fr}}}}
</style></head><body><main>
<h1>ong<em>.</em>bak</h1>
<p class="lede">Frozen copies. Each one is the exact page as it shipped, byte for byte, kept playable here before the next version replaced it. sae-kirby makes them.</p>
{''.join(rows)}
</main></body></html>
"""
    (BAK / "index.html").write_text(page)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", required=True); ap.add_argument("--version", required=True)
    ap.add_argument("--src", required=True, help="page to freeze, relative to the repo root or absolute")
    ap.add_argument("--title", default=None); ap.add_argument("--note", default="")
    ap.add_argument("--play", default=None, help="selector to press for the in-play shot")
    ap.add_argument("--wait", type=int, default=2500); ap.add_argument("--force", action="store_true")
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args()
    src = Path(a.src) if Path(a.src).is_absolute() else ROOT / a.src
    dest_dir = BAK / a.name / a.version
    dest = dest_dir / "index.html"
    if dest.exists() and sha(dest) != sha(src) and not a.force:
        print(f"refused: {dest} already holds different bytes (use --force to replace)", file=sys.stderr)
        return 2
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
    digest = sha(dest)
    assert digest == sha(src), "copy is not byte-identical"
    shots = [] if a.no_shots else shoot(dest, dest_dir, a.play, a.wait)
    sheet_name = sheet(dest_dir, shots, f"{a.title or a.name} {a.version}") if shots else ""
    manp = BAK / "manifest.json"
    man = json.loads(manp.read_text()) if manp.exists() else {"what": "ong.bak: frozen, playable copies made by sae-kirby", "uri": "sae://ong.bak", "snapshots": []}
    man["snapshots"] = [e for e in man["snapshots"] if not (e["name"] == a.name and e["version"] == a.version)]
    entry = {"name": a.name, "version": a.version, "title": a.title or a.name, "note": a.note,
             "source": str(src.relative_to(ROOT)) if str(src).startswith(str(ROOT)) else src.name,
             "sha256": digest, "bytes": dest.stat().st_size,
             "frozen_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
             "sheet": sheet_name, "shots": shots}
    man["snapshots"].append(entry)
    manp.write_text(json.dumps(man, indent=2) + "\n")
    rebuild_index(man)
    print(json.dumps({k: entry[k] for k in ("name", "version", "sha256", "bytes", "sheet")}, indent=1))
    errs = [s.get("errors") for s in shots if s.get("errors")]
    if errs:
        print("page errors seen:", errs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
