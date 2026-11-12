#!/usr/bin/env python3
"""Draw AND SO's app icons from icon.svg with the pre-installed Chromium: python3 _src/and-so/pwa/icons.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SVG = (HERE / "icon.svg").read_text()
SIZES = {"icon-192.png": 192, "icon-512.png": 512, "icon-maskable-512.png": 512, "apple-touch-icon.png": 180}

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, px in SIZES.items():
        pg = b.new_page(viewport={"width": px, "height": px})
        pg.set_content(f'<html><body style="margin:0">{SVG.replace("<svg ", f"<svg width=\'{px}\' height=\'{px}\' ", 1)}</body></html>')
        pg.screenshot(path=str(HERE / "icons" / name), clip={"x": 0, "y": 0, "width": px, "height": px})
        pg.close()
    b.close()
print("icons:", ", ".join(SIZES))
