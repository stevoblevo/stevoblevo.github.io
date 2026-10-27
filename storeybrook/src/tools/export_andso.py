"""Export Storeybrook for embedding in another app (AND SO): tokens scoped under html[data-sb="<look>"] so they never
touch the host's own variables until a Storeybrook look is on, and the component CSS with [data-theme] → [data-sb].
Writes into the destination folder given on the command line. Not published."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import P

dest = Path(sys.argv[1]); dest.mkdir(parents=True, exist_ok=True)
t = json.load(open(P / "tokens.json"))
themes = [x["id"] for x in t["color"]["themes"]]; first = themes[0]


def val(v, th):
    if isinstance(v, dict): v = v.get(th, v.get(first))
    m = re.match(r"^\{(.+)\}$", v or "")
    return f"var(--{m.group(1)})" if m else v


blocks = []
rest = []
for fam, body in t.items():
    if fam in ("name", "version", "color", "type", "shadow"): continue
    rest += [f"--{x['name']}:{x['value']}" for x in body["tokens"]]
rest += [f"--font-{k}:{v}" for k, v in t["type"]["families"].items()]
for th in themes:
    lines = [f"--{c['name']}:{val(c['value'], th)}" for c in t["color"]["tokens"]]
    lines += [f"--{s['name']}:{val(s['value'], th)}" for s in t["shadow"]["tokens"]]
    blocks.append(f'[data-sb="{th}"]{{' + ";".join(lines + rest) + "}")
(dest / "storeybrook-tokens.css").write_text("/* Storeybrook 1 tokens, scoped: they apply inside any element whose data-sb names a look (the page, or one panel) */\n" + "\n".join(blocks) + "\n")

css = (P / "components" / "bundle.css").read_text()
css = css.split("\n", 1)[1]                          # drop the Google Fonts @import (the host loads fonts)
css = css.replace('[data-theme="', '[data-sb="')
css = re.sub(r"/\* the type styles from tokens\.css follow the look \*/.*?(?=/\* ---------- the page)", "", css, flags=re.S)
# :root hooks become html[data-sb] hooks, so nothing leaks into the host's dark looks
css = css.replace(":root {\n  --sb-display", "[data-sb] {\n  --sb-display")
(dest / "storeybrook.css").write_text("/* Storeybrook 1.0 components, embedded (looks keyed on [data-sb], on the page or on one panel) */\n" + css)
js = (P / "components" / "bundle.js").read_text()
(dest / "storeybrook.js").write_text(js)
print("exported", [p.name for p in dest.iterdir()], len(css), len(js))
