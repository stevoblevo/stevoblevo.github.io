"""Kitchen sink: one page with most of Storeybrook on it, rendered in every look. Not published."""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
from common import tokens_css, attach_fonts, P, ROOT

OUT = ROOT / "render"; OUT.mkdir(exist_ok=True)
BODY = """
<div class="sb-washes"><i class="sb-wash sb-wash--sky sb-wash--band" style="top:-14%;--h:34%"></i><i class="sb-sun" style="--w:12%;right:4%;top:1%"></i>
<i class="sb-wash sb-wash--rose" style="--w:26%;left:-6%;top:30%"></i><i class="sb-wash sb-wash--meadow sb-wash--band" style="bottom:-14%;--h:30%"></i></div>
<main style="position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:56px 32px 140px;display:grid;gap:48px">
<header style="display:grid;grid-template-columns:1.4fr 1fr;gap:32px;align-items:center">
 <div><h1 class="display-xl" style="margin:0">Little games</h1>
 <p class="sb-lede" style="margin-top:18px">The brook went on without asking, so Dora went with it. Every stone is a small game, and every game is ninety-nine cents.</p>
 <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:26px;align-items:center"><button class="sb-btn sb-btn--primary sb-btn--lg">Play this one</button><button class="sb-btn sb-btn--secondary">Read it to me</button><button class="sb-btn sb-btn--quiet">Skip the story</button><button class="sb-btn sb-btn--sticker">New look</button><button class="sb-seal" aria-label="Begin">B</button></div></div>
 <div style="display:grid;place-items:center"><div data-sb-creature='{"stage":4}' style="--cw:300px"></div></div>
</header>
<section style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
 <article class="sb-page" data-sb-story><p class="sb-prose" style="margin:0"><span class="sb-dropcap">O</span>nce the octopus had learned to be a bunny, the butterfly part was easy. She tried it in the morning, when the brook was loud enough to cover any mistakes, and by noon she could hover over the stones without touching them. <a class="sb-ink-link" href="#">Read the first chapter</a>.</p>
 <div style="display:flex;gap:18px;margin-top:22px;align-items:flex-end"><span class="sb-balloon">Is that a nougat in the brook?</span><span class="sb-balloon sb-balloon--think">it is warm from the sun</span></div></article>
 <div style="display:grid;gap:22px"><div class="sb-brook" style="height:300px" data-sb-brook='{"stones":[{"label":"The porch","sub":"walked","state":"done"},{"label":"Wake the doll","sub":"you are here","state":"current"},{"label":"The far stone","state":"open"},{"label":"Origami","sub":"2 more","state":"locked"}]}'></div>
 <div class="sb-reader" style="max-width:none"><button class="sb-btn sb-btn--primary sb-btn--icon sb-reader__play" aria-label="Read it to me"><span data-sb-icon="play"></span></button><div class="sb-reader__info"><span class="sb-reader__title">The octopus who learned to be a bunny</span><span class="sb-reader__voice">Irish English voice</span><span class="sb-reader__meter"><i style="--p:38%"></i></span></div></div></div>
</section>
<section style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px;align-items:start">
 <a class="sb-cover sb-cover--new" href="#" style="--tilt:-1.2deg"><span class="sb-price"><span class="sb-price__amount">99¢</span><span class="sb-price__each">each</span></span><div class="sb-cover__art" style="background:linear-gradient(160deg,var(--wash-sky),var(--wash-rose))"><div data-sb-creature='{"stage":2,"form":"saelion"}' style="--cw:46%;margin:6% auto 0;display:block"></div></div><div class="sb-cover__body"><h3 class="sb-cover__title">AND SO</h3><p class="sb-cover__line">Hold a chord until it sings back.</p><div class="sb-cover__meta"><span class="sb-chip sb-chip--sky">Music</span><span class="sb-chip sb-chip--rose">Tilt</span></div></div></a>
 <a class="sb-cover" href="#" style="--tilt:0.8deg"><span class="sb-price"><span class="sb-price__amount">99¢</span><span class="sb-price__each">each</span></span><div class="sb-cover__art" style="background:linear-gradient(180deg,var(--wash-sun),var(--wash-meadow))"></div><div class="sb-cover__body"><h3 class="sb-cover__title">Everfallen</h3><p class="sb-cover__line">A night garden, falling into other ground.</p><div class="sb-cover__meta"><span class="sb-chip sb-chip--sun">Faller</span></div></div></a>
 <div style="display:grid;gap:18px;justify-items:start">
  <div class="sb-album" style="width:100%"><div class="sb-sticker" data-sb-sticker="a"><span class="sb-sticker__art" data-sb-icon="star" data-size="48"></span><span class="sb-sticker__name">first stone</span></div><div class="sb-sticker sb-sticker--locked"><span class="sb-sticker__art" data-sb-icon="origami" data-size="48"></span><span class="sb-sticker__name">origami</span></div></div>
  <div style="display:flex;gap:24px;align-items:center"><button class="sb-jar" data-cap="20" aria-label="nougats"></button><span class="sb-nougat" data-sb-nougat="3" style="--n:72px"></span><span class="sb-note">try the far stone!</span></div>
  <label class="sb-toggle"><input type="checkbox" checked><span class="sb-toggle__track"><span class="sb-toggle__thumb"></span></span>Hide the words</label>
  <div class="sb-slider" style="width:100%"><div class="sb-slider__row"><span>Reading speed</span><output>0.96</output></div><input type="range" min="0.6" max="1.4" step="0.02" value="0.96" style="--p:45%"></div>
  <fieldset class="sb-choice"><legend>Who reads</legend><label><input type="radio" name="w" checked><span>Moira</span></label><label><input type="radio" name="w"><span>Orla</span></label><label><input type="radio" name="w"><span>You</span></label></fieldset>
 </div>
</section>
<section class="sb-panels" style="--cols:3"><div class="sb-panel sb-panel--dots"><span class="sb-panel__cap">Meanwhile, under the stones</span><span class="sb-panel__sfx" style="right:16px;bottom:20px">Plunk</span></div><div class="sb-panel sb-panel--wide" style="background:var(--wash-sky)"><span class="sb-balloon sb-balloon--shout" style="position:absolute;left:30px;top:40px">Nougat!</span></div></section>
<section style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px;align-items:end">
 <div data-sb-creature='{"stage":0}' style="--cw:130px"></div><div data-sb-creature='{"stage":1}' style="--cw:130px"></div><div data-sb-creature='{"stage":2}' style="--cw:130px"></div><div data-sb-creature='{"stage":3}' style="--cw:130px"></div><div data-sb-creature='{"stage":4,"mood":"surprised"}' style="--cw:130px"></div>
</section>
</main>
"""


def page(theme, tcss):
    css = (P / "components" / "bundle.css").read_text(); js = (P / "components" / "bundle.js").read_text()
    return (f'<!doctype html><html lang="en" data-theme="{theme}" class="sb-root"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<style>{tcss}</style><style>{css}</style></head><body class="sb-body">{BODY}<script>{js}</script><script>Storeybrook.init({{fallback:"{theme}"}});Storeybrook.theme.set("{theme}",{{persist:false}});Storeybrook.rewards.set(9);</script></body></html>')


if __name__ == "__main__":
    themes = sys.argv[1].split(",") if len(sys.argv) > 1 else [x["id"] for x in json.load(open(P / "tokens.json"))["color"]["themes"]]
    w, h = (int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else "1440x2000").split("x"))
    tcss = tokens_css()
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for th in themes:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1); pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            attach_fonts(pg)
            f = OUT / f"sink-{th}.html"; f.write_text(page(th, tcss)); pg.goto(f.as_uri()); pg.wait_for_timeout(1500)
            pg.screenshot(path=str(OUT / f"sink-{th}.png"), full_page=True)
            print(th, "errors:", errs[:3]); ctx.close()
        b.close()
