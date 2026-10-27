"""Shared test helpers: compile tokens.json to tokens.css the way the Design System page does, and serve Google Fonts
to headless Chromium through Python (proxy and CA bundle honoured, TLS verified). Not published."""
import hashlib, json, os, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
P = ROOT / "project"
CACHE = HERE / ".fontcache"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def tokens_css(t=None):
    t = t or json.load(open(P / "tokens.json"))
    themes = [x["id"] for x in t["color"]["themes"]]; first = themes[0]
    def val(v, th):
        if isinstance(v, dict): v = v.get(th, v.get(first))
        m = re.match(r"^\{(.+)\}$", v or "")
        return f"var(--{m.group(1)})" if m else v
    out = []
    for i, th in enumerate(themes):
        sel = f':root, [data-theme="{th}"]' if i == 0 else f'[data-theme="{th}"]'
        lines = [f"  --{c['name']}: {val(c['value'], th)};" for c in t["color"]["tokens"]]
        lines += [f"  --{s['name']}: {val(s['value'], th)};" for s in t.get("shadow", {}).get("tokens", [])]
        out.append(sel + " {\n" + "\n".join(lines) + "\n}")
    rest = []
    for fam, body in t.items():
        if fam in ("name", "version", "color", "type", "shadow"): continue
        rest += [f"  --{x['name']}: {x['value']};" for x in body["tokens"]]
    rest += [f"  --font-{k}: {v};" for k, v in t["type"]["families"].items()]
    out.append(":root {\n" + "\n".join(rest) + "\n}")
    for g in t["type"]["groups"]:
        for s in g["styles"]:
            fam = s.get("family", g["family"]); lh = s["lineHeight"]; lh = lh if isinstance(lh, str) else str(lh)
            decl = [f"font-family: var(--font-{fam})", f"font-size: {s['fontSize']}", f"line-height: {lh}", f"font-weight: {s['fontWeight']}"]
            if "letterSpacing" in s: decl.append(f"letter-spacing: {s['letterSpacing']}")
            if "fontStyle" in s: decl.append(f"font-style: {s['fontStyle']}")
            out.append(f".{s['name']} {{ " + "; ".join(decl) + "; }")
    return "\n".join(out) + "\n"


def font_route():
    import requests
    CACHE.mkdir(parents=True, exist_ok=True)
    def handle(route):
        url = route.request.url
        key = CACHE / hashlib.sha1(url.encode()).hexdigest()
        try:
            if key.exists():
                body = key.read_bytes(); ctype = (key.with_suffix(".t").read_text() if key.with_suffix(".t").exists() else "application/octet-stream")
            else:
                r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
                body, ctype = r.content, r.headers.get("content-type", "application/octet-stream")
                if r.ok: key.write_bytes(body); key.with_suffix(".t").write_text(ctype)
            route.fulfill(status=200, body=body, headers={"content-type": ctype, "access-control-allow-origin": "*"})
        except Exception:
            route.abort()
    return handle


def attach_fonts(page):
    h = font_route()
    page.route("https://fonts.googleapis.com/**", h)
    page.route("https://fonts.gstatic.com/**", h)
