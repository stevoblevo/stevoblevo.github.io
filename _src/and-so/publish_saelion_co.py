#!/usr/bin/env python3
"""Publish AND SO on saelion.co the way it is published on stevoblevo.github.io: the latest build at /and-so/, every
version at its own address (the same paths), the versions page, and the toggle the older builds carry.

Run from the repository root after build.py and versions.py:
  python3 _src/and-so/publish_saelion_co.py <saelion-relay-canary checkout>

The checkout must be on a new branch made from the commit saelion.co production serves (look it up first; other
games deploy there too). This writes only under and-so/, the and-so lines of scripts/public-files.json (the site's
exact list of public files) and the /and-so rewrites in vercel.json. The saelion.co line that was there before (AND SO
8.1 with the origami art and the voice library) moves to /and-so/saelion-8.1/ the first time, so it stays playable and
choosable. The Gamut Field Guide keeps saelion.co's own copy. The older builds differ from their github.io bytes in
two spots only: the toggle's address and the save path spelled out (see DBPATH); versions.json lists saelion.co's sha256.
"""
import hashlib, json, shutil, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = REPO / "and-so"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import versions as V  # noqa: E402

TOGGLE_GH = 'src="/versions/versions.js"'
# saelion.co's public-file guard (scripts/build-public.mjs) reads the slashed save path as a home folder; the older
# builds get the same path spelled out, as the saelion.co line already had it (10.2 on has it in the source)
DBPATH = ('db.doc(`data/users/${CAP.uid}/save`)', "db.doc(['data', 'users', CAP.uid, 'save'].join('/'))")
TOGGLE_CO = 'src="/and-so/versions/versions.js"'
LINE = dict(id="saelion-8.1", short="AND SO 8.1 · saelion.co", name="AND SO 8.1 · the saelion.co line", date="2026-11-17",
            path="/and-so/saelion-8.1/", line="What saelion.co served until 23 November 2026: AND SO 8.1 with the origami art and the voice library.")


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main(canary):
    C = canary / "and-so"; assert C.is_dir(), C
    written = []
    def put(rel, data=None, src=None):
        dest = C / rel; dest.parent.mkdir(parents=True, exist_ok=True)
        if src is not None: shutil.copyfile(src, dest)
        else: dest.write_text(data, encoding="utf-8")
        written.append("and-so/" + rel)
        return dest
    # 1. keep the saelion.co line
    line_dest = C / "saelion-8.1" / "index.html"
    if not line_dest.exists():
        old = (C / "index.html").read_text(encoding="utf-8")
        assert "<title>AND SO 8.1</title>" in old and "assets/origami" in old, "and-so/index.html is not the saelion.co 8.1 line"
        i = old.rfind("</body>"); assert i > 0
        tog = f'<script {TOGGLE_CO} data-versions="/and-so/versions.json" data-current="saelion-8.1" data-corner="bl" defer></script>\n'
        put("saelion-8.1/index.html", old[:i] + tog + old[i:])
    else: written.append("and-so/saelion-8.1/index.html")
    # 2. every version at its own address
    data = json.loads((SITE / "versions.json").read_text(encoding="utf-8"))
    rows = []
    for r in data["versions"]:
        rel = r["path"].removeprefix("/and-so/").strip("/") + "/index.html"
        if r["id"] == "gamut-43":   # saelion.co keeps its own copy of the edition
            written.append("and-so/" + rel); r = dict(r, sha256=sha(C / rel)); rows.append(r); continue
        src = (REPO / r["path"].strip("/") / "index.html").read_text(encoding="utf-8")
        if not r.get("latest"):
            n = src.count(TOGGLE_GH); assert n <= 1, r["id"]; src = src.replace(TOGGLE_GH, TOGGLE_CO)
        src = src.replace(*DBPATH)
        d = put(rel, src)
        if r.get("latest"): put("index.html", src)
        rows.append(dict(r, sha256=sha(d)))
        if r["id"] == "8.1": rows.append(dict(LINE, commit="saelion.co", sha256=sha(line_dest)))
    if not any(r["id"] == LINE["id"] for r in rows): rows.append(dict(LINE, commit="saelion.co", sha256=sha(line_dest)))
    put("versions.json", json.dumps(dict(data, versions=rows), indent=1, ensure_ascii=False) + "\n")
    (C / "versions").mkdir(exist_ok=True); V.write_index(rows, dest=C / "versions" / "index.html"); written.append("and-so/versions/index.html")
    put("versions/versions.js", src=REPO / "versions" / "versions.js")
    # 3. the files the current build loads by address
    for rel in ("sw.js", "manifest.webmanifest", "assets/art/manifest.json", "assets/pet/slots.json"):
        if (SITE / rel).exists(): put(rel, src=SITE / rel)
    # 4. the public list and the routes
    pf = canary / "scripts" / "public-files.json"; names = json.loads(pf.read_text(encoding="utf-8"))
    have = set(names); new = [w for w in dict.fromkeys(written) if w not in have]
    if new:
        last = max(i for i, n in enumerate(names) if n.startswith("and-so/"))
        names[last + 1:last + 1] = sorted(new)
        pf.write_text(json.dumps(names, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    vj = canary / "vercel.json"; vc = json.loads(vj.read_text(encoding="utf-8")); rw = vc["rewrites"]
    srcs = {r["source"] for r in rw}; at = max(i for i, r in enumerate(rw) if r["source"].startswith("/and-so")) + 1; add = []
    for r in rows + [dict(path="/and-so/versions/")]:
        p = r["path"].rstrip("/")
        for s in (p, p + "/"):
            if s not in srcs: add.append({"source": s, "destination": p + "/index.html"})
    rw[at:at] = add
    vj.write_text(json.dumps(vc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"saelion.co: {len(rows)} versions, latest {next(r['id'] for r in rows if r.get('latest'))}; {len(new)} new public files, {len(add)} new routes")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
