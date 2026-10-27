"""Render every component preview the way the Design System page frames it (tokens.css, bundle.css and bundle.js
preloaded, data-theme on <html>), in the looks given, at 960px. Reports page errors and measured heights, and writes a
contact sheet per look into render/. Not published."""
import json, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(Path(__file__).parent))
from common import tokens_css, attach_fonts, P, ROOT

OUT = ROOT / "render" / "ds"; OUT.mkdir(parents=True, exist_ok=True)
looks = sys.argv[1].split(",") if len(sys.argv) > 1 else ["daylight"]
only = sys.argv[2].split(",") if len(sys.argv) > 2 else None
TOK = tokens_css(); CSS = (P / "components" / "bundle.css").read_text(); JS = (P / "components" / "bundle.js").read_text()
comps = sorted([d.name for d in (P / "components").iterdir() if d.is_dir() and (d / "preview.html").exists()])
if only: comps = [c for c in comps if c in only]


def frame(src, look):
    head = f"<style>{TOK}</style><style>{CSS}</style><script>{JS}</script>"
    src = re.sub(r"<html[^>]*>", f'<html lang="en" data-theme="{look}">', src, count=1)
    return src.replace("<head>", "<head>" + head, 1)


report = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--mute-audio"])
    for look in looks:
        shots = []
        for name in comps:
            src = (P / "components" / name / "preview.html").read_text()
            m = re.search(r"height=(\d+)", src.splitlines()[0]); h0 = int(m.group(1)) if m else 120
            f = OUT / f"_{name}-{look}.html"; f.write_text(frame(src, look))
            pg = b.new_page(viewport={"width": 960, "height": max(h0, 200)}, device_scale_factor=1); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
            attach_fonts(pg); pg.goto(f.as_uri()); pg.wait_for_timeout(1100)
            hh = pg.evaluate("Math.ceil(document.body.getBoundingClientRect().height)")
            path = OUT / f"{name}-{look}.png"
            pg.set_viewport_size({"width": 960, "height": max(hh, 60)}); pg.wait_for_timeout(150)
            pg.screenshot(path=str(path), full_page=True)
            shots.append((name, path, h0, hh)); report.setdefault(name, {})[look] = {"card": h0, "content": hh, "errors": errs[:3]}
            pg.close()
        # contact sheet: two columns of 480px thumbnails
        W, COLW, pad = 980, 480, 10
        ims = []
        for name, path, h0, hh in shots:
            im = Image.open(path).convert("RGB"); sc = COLW / im.width; im = im.resize((COLW, max(1, int(im.height * sc))))
            ims.append((name, im, h0, hh))
        col_h = [0, 0]; place = []
        for name, im, h0, hh in ims:
            c = 0 if col_h[0] <= col_h[1] else 1; place.append((c, col_h[c], name, im, h0, hh)); col_h[c] += im.height + 26 + pad
        sheet = Image.new("RGB", (W, max(col_h) + pad), (250, 250, 250)); dr = ImageDraw.Draw(sheet)
        for c, y, name, im, h0, hh in place:
            x = pad + c * (COLW + pad); dr.text((x, y + 6), f"{name}  card {h0}  content {hh}", fill=(200, 0, 60) if hh > h0 + 4 else (40, 40, 40)); sheet.paste(im, (x, y + 22))
        sheet.save(OUT / f"sheet-{look}.jpg", quality=82)
    b.close()
print(json.dumps({k: {l: (v["card"], v["content"], v["errors"]) for l, v in d.items()} for k, d in report.items()}, indent=0)[:6000])
