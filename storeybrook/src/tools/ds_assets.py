"""Write Storeybrook's asset files: the icon set as standalone SVGs (fixed mid ink), and Meta Daylight renders of the
creature, the nougat and the jar with every color baked in (the bundle draws them with CSS variables). Not published."""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
from common import tokens_css, P

A = P / "assets"; INK = "#5f6f7c"
js = (P / "components" / "bundle.js").read_text()
body = js[js.index("var ICONS = {"):]; body = body[:body.index("};") + 1]
icons = dict(re.findall(r"([a-z]+): '((?:[^'\\]|\\.)*)'", body))
(A / "Icons").mkdir(parents=True, exist_ok=True)
for name, inner in icons.items():
    inner = inner.replace("currentColor", INK)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="{INK}" '
           f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{inner}</svg>\n')
    (A / "Icons" / f"{name}.svg").write_text(svg)
(A / "Icons" / "README.md").write_text(
    f"The Storeybrook icon set: {len(icons)} icons on a 24px grid, 2px round strokes, almost no fills. These files are drawn in "
    f"{INK} so they read on light and dark grounds here; in pages, use `Storeybrook.icon(name)` or `data-sb-icon`, which draw in "
    "`currentColor` (see Iconography).\n")
print("icons", len(icons))

BAKE = r"""
(sel) => {
  const svg = document.querySelector(sel + ' svg');
  const toRGBA = v => { const m = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(v); if (!m) return v; const c = x => Math.round(parseFloat(x) * 255); return `rgba(${c(m[1])}, ${c(m[2])}, ${c(m[3])}, ${m[4] === undefined ? 1 : m[4]})`; };
  svg.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'clipPath' || el.closest('clipPath')) return;
    const cs = getComputedStyle(el);
    ['fill', 'stroke'].forEach(k => { const v = cs[k]; if (v) el.setAttribute(k, v === 'none' ? 'none' : toRGBA(v)); });
    if (cs.stroke && cs.stroke !== 'none') el.setAttribute('stroke-width', cs.strokeWidth);
    if (cs.opacity && cs.opacity !== '1') el.setAttribute('opacity', cs.opacity);
    el.removeAttribute('class');
  });
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return svg.outerHTML;
}"""
JOBS = [("Creature", f"saelion-{n}.svg", f"S.creatureSVG({{form:'saelion',stage:{i},blink:false}})", 200) for i, n in enumerate(["egg", "kit", "bun", "sprite", "saelion"])]
JOBS += [("Creature", f"{f}.svg", f"S.creatureSVG({{form:'{f}'}})", 200) for f in ["bunny", "octopus", "pixie"]]
JOBS += [("Creature", "saelion-sleepy.svg", "S.creatureSVG({form:'saelion',stage:4,mood:'sleepy'})", 200)]
JOBS += [("Nougat", f"nougat-{s}.svg", f"S.nougatSVG({s})", 120) for s in (3, 7, 11)]
JOBS += [("Nougat", f"jar-{n}.svg", f"S.jarSVG({v})", 100) for n, v in (("empty", 0), ("half", 0.5), ("full", 1))]
html = (f"<!doctype html><html data-theme='daylight'><head><style>{tokens_css()}</style><style>{(P / 'components' / 'bundle.css').read_text()}</style>"
        f"<script>{js}</script></head><body class='sb-body'><div id='h' class='sb-creature'></div></body></html>")
tmp = P.parent / "render" / "_assets.html"; tmp.write_text(html)
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); pg.goto(tmp.as_uri()); pg.wait_for_timeout(300)
    for group, fname, expr, w in JOBS:
        (A / group).mkdir(parents=True, exist_ok=True)
        cls = "sb-creature" if group == "Creature" else ("sb-nougat" if fname.startswith("nougat") else "sb-jar")
        pg.evaluate(f"() => {{ const S = window.Storeybrook, h = document.getElementById('h'); h.className = '{cls}'; h.innerHTML = {expr}; }}")
        out = pg.evaluate(BAKE, "#h")
        out = re.sub(r'\s+role="img"', ' role="img"', out)
        (A / group / fname).write_text(out + "\n")
    b.close()
(A / "Creature" / "README.md").write_text(
    "Saelion, the Storeybrook creature, in Meta Daylight's inks: the five stages of the Saelion form (egg, kit, bun, sprite, saelion), "
    "asleep, and the bunny, tree octopus and butterfly pixie forms. These are reference renders with their colors baked in; in pages, draw it "
    "with `Storeybrook.creature(host, {form, stage, mood})` so it takes the current look's inks and breathes and blinks (see the Creature component).\n")
(A / "Nougat" / "README.md").write_text(
    "The nougat (three seeds: the nuts move with the seed) and the jar empty, half full and full, in Meta Daylight's inks with colors baked in. "
    "In pages use `Storeybrook.nougatSVG(seed)` and `.sb-jar`, which take the current look's `nougat`, `nougat-nut`, `wrapper` and `copper` (see the Jar component).\n")
print("assets", len(JOBS))
