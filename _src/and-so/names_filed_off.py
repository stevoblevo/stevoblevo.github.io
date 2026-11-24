#!/usr/bin/env python3
"""The Book's "names filed off" chapter: a pop catalog as changes only, every title hidden.

Bleve asked (23 Nov 2026) for the changes of a whole pop catalog in the Book, playable in AND SO's tunings, with the
names obscured. Chord progressions are not protected the way melodies and words are, so the chapter holds only what
the Book already allows for tunes still in copyright: form, key, tempo, meter and the chords of each bar. No melody,
no lyric, no sources in the public file (their addresses name the songs). Each tune shows a riddle instead of its
title, and a hint (which record, which track). The real title is kept only as a hash of its normalised spelling
(`nfNorm` + `cyrb53` in t-book.js, the same functions below), so the Book can tell when you have named a tune.

Usage: python3 names_filed_off.py <dir with b*.json research files> [<private mapping out.json>]
  writes src/book-nf.json (public) and, if asked, a private list of id -> real title and sources for upkeep.
"""
import json, re, sys, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
RECORDS = {"Taylor Swift": 1, "Fearless": 2, "Fearless (Taylor's Version)": 2, "Speak Now": 3, "Speak Now (Taylor's Version)": 3,
           "Red": 4, "Red (Taylor's Version)": 4, "1989": 5, "1989 (Taylor's Version)": 5, "Reputation": 6, "Lover": 7,
           "Folklore": 8, "Evermore": 9, "Midnights": 10, "Midnights (3am Edition)": 10, "The Tortured Poets Department": 11,
           "The Tortured Poets Department: The Anthology": 11, "The Life of a Showgirl": 12}
CHORD = re.compile(r"^[A-G](#|b)?(m|7|maj7|m7|sus4|sus2|add9|m\(add9\)|6|m6|dim|m7b5|aug)?(/[A-G](#|b)?)?$")
MAX_BARS = 240


def imul(a, b): return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def cyrb53(s, seed=13):
    h1, h2 = 0xDEADBEEF ^ seed, 0x41C6CE57 ^ seed
    for ch in s:
        c = ord(ch)
        h1 = imul(h1 ^ c, 2654435761); h2 = imul(h2 ^ c, 1597334677)
    h1 = imul(h1 ^ (h1 >> 16), 2246822507) ^ imul(h2 ^ (h2 >> 13), 3266489909)
    h2 = imul(h2 ^ (h2 >> 16), 2246822507) ^ imul(h1 ^ (h1 >> 13), 3266489909)
    return (h2 & 0x1FFFFF) * 4294967296 + (h1 & 0xFFFFFFFF)


def norm(title):
    s = unicodedata.normalize("NFKD", title.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("&", " and ").replace("’", "").replace("'", "")
    for p in ("taylors version", "from the vault", "3am edition"): s = s.replace(p, " ")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"^the ", "", s)
    return s


def b36(n):
    d = "0123456789abcdefghijklmnopqrstuvwxyz"; out = ""
    while n: n, r = divmod(n, 36); out = d[r] + out
    return out or "0"


def main(src, private=None):
    rows, priv, problems = [], [], []
    for f in sorted(Path(src).glob("b*.json")):
        for s in json.loads(f.read_text(encoding="utf-8")):
            title, album = (s.get("title") or "").strip(), s["album"].strip()   # a withheld title stays empty: that tune cannot be named
            rec = RECORDS.get(album)
            if rec is None: problems.append(f"unknown album {album!r}"); continue
            secs, form = s.get("sections") or {}, s.get("form") or []
            bars, marks = [], {}
            for name in form:
                sec = secs.get(name)
                if not sec: continue
                marks[str(len(bars))] = re.sub(r"\s*\d+$", "", name).lower()
                for b in sec:
                    b = [c.strip() for c in (b if isinstance(b, list) else [b]) if str(c).strip()]
                    bad = [c for c in b if not CHORD.match(c)]
                    if bad: problems.append(f"{album} {s.get('track')}: chord {bad}"); b = [c for c in b if CHORD.match(c)]
                    bars.append(b[:2] or ["·"])
            meter = int(s.get("meter") or 4)
            if meter == 6: meter, bars = 3, [x for b in bars for x in (b[:1], b[1:] or b[:1])]
            bars = bars[:MAX_BARS]
            if len(bars) < 4: problems.append(f"{album} {s.get('track')}: no usable chart ({s.get('confidence')})"); continue
            n = norm(title) if title else ""; h = cyrb53(n) if n else 0
            words = [w for w in re.sub(r"[^A-Za-z0-9' ]+", " ", re.sub(r"\(.*?\)", "", title)).split() if w]
            vault = bool(s.get("vault"))
            tid = "nf-" + b36(cyrb53((n or f"track {s.get('track')}") + "|" + album, 7))[:9]
            riddle = str(s.get("riddle") or "").strip().lower()
            leak = [w for w in re.findall(r"[a-z0-9']+", riddle) if len(w) > 3 and w in set(n.split())]
            if leak: problems.append(f"{album} {s.get('track')}: riddle uses a title word {leak}")
            rows.append({
                "id": tid, "chapter": "names filed off", "record": rec, "track": int(s.get("track") or 0), "drawer": vault,
                "title": riddle or "a tune with its name filed off",
                "hint": f"record {rec} · " + (f"from the drawer, track {s.get('track')}" if vault else f"track {s.get('track')}"),
                "ini": " ".join(w[0].upper() for w in words),
                "h": b36(h) if h else "", "form": " · ".join(dict.fromkeys(re.sub(r"\s*\d+$", "", x).lower() for x in form)),
                "key": s["key"], "tempo": int(round(float(s.get("tempo") or 100))), "meter": meter,
                "feel": s.get("feel") if s.get("feel") in ("straight", "ballad", "waltz", "swing") else ("waltz" if meter == 3 else "straight"),
                "pd": False, "marks": marks, "conf": s.get("confidence") or "low",
                "basis": "Changes only: form, key and the chords of each bar, read from published analyses. No melody and no lyric. Its name is filed off: name it.",
                "bars": bars})
            priv.append({"id": tid, "title": title, "album": album, "track": s.get("track"), "sources": s.get("sources") or [], "confidence": s.get("confidence"), "notes": s.get("notes", "")})
    rows.sort(key=lambda r: (r["record"], r["drawer"], r["track"]))
    ids = [r["id"] for r in rows]; assert len(ids) == len(set(ids)), "duplicate ids"
    (HERE / "src" / "book-nf.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if private: Path(private).write_text(json.dumps(priv, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"names filed off: {len(rows)} tunes, {sum(len(r['bars']) for r in rows)} bars, {len(problems)} notes")
    for p in problems: print("  -", p)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
