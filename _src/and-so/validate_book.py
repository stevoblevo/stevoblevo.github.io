#!/usr/bin/env python3
"""Check every AND SO chart: the bar count matches the form, and every symbol parses.

The parser matches the one in src/t-book.js. A chart that fails is listed and the
process exits 1. Rests (·) are allowed. Melodies are allowed only when year < 1930.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PC = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
QUAL = ["m7b5", "dim7", "maj7", "ma7", "m7", "m6", "7b9", "7#11", "7#9", "7sus", "sus4", "sus", "dim", "aug", "maj", "m", "7", "6", "9", "+"]
RESTS = {"", "·", "-", "—"}


def pc_of(name):
    m = re.match(r"^([A-G](?:#|b)?)", str(name).strip())
    return PC.get(m.group(1)) if m else None


def parse_chord(sym):
    s = str(sym or "").strip()
    if s in RESTS:
        return "rest"
    bass = None
    if "/" in s:
        s, bass = s.split("/", 1)
        if pc_of(bass) is None:
            return None
    m = re.match(r"^([A-G](?:#|b)?)(.*)$", s)
    if not m or pc_of(m.group(1)) is None:
        return None
    return m.group(2) or "maj"


def bars_of(tune):
    raw = tune.get("bars")
    if isinstance(raw, str):
        return [b.strip().split() for b in raw.split("|")]
    out = []
    for b in raw or []:
        if isinstance(b, list):
            out.append([str(x) for x in b])
        else:
            out.append(str(b).split())
    return out


def expected_bars(form):
    m = re.match(r"^(\d+)-bar\b", str(form or ""))
    if not m:
        return None
    n = int(m.group(1))
    # 32-bar AABA is four eights. 16-bar AABA is four fours. 12-bar blues is twelve.
    if "AABA" in form and n == 32 and n != 4 * 8:
        return None
    if "AABA" in form and n == 16 and n != 4 * 4:
        return None
    if "blues" in form and n not in (8, 12, 16, 24):
        return None
    return n


def load_tunes():
    folder = ROOT / "src" / "book"
    files = sorted(folder.glob("*.json")) if folder.is_dir() else []
    if not files:
        files = [ROOT / "src" / "book.json"]
    tunes = []
    for f in files:
        tunes.extend(json.loads(f.read_text(encoding="utf-8")))
    return tunes


def check(tunes):
    errors = []
    seen = set()
    for t in tunes:
        ident = t.get("id") or t.get("title")
        if not t.get("id") or t["id"] in seen:
            errors.append(f"{ident}: missing or duplicate id")
        seen.add(t.get("id"))
        for field in ("title", "composer", "year", "key", "form", "bars"):
            if t.get(field) in (None, ""):
                errors.append(f"{ident}: missing {field}")
        form = t.get("form") or ""
        want = expected_bars(form)
        got = bars_of(t)
        if want is None:
            errors.append(f"{ident}: form {form!r} is not an N-bar form")
        elif len(got) != want:
            errors.append(f"{ident}: {form} wants {want} bars, has {len(got)}")
        for i, bar in enumerate(got, 1):
            if not bar:
                errors.append(f"{ident}: bar {i} is empty")
            for sym in bar:
                if parse_chord(sym) is None:
                    errors.append(f"{ident}: bar {i} chord {sym!r} does not parse")
        year = t.get("year")
        if not isinstance(year, int):
            errors.append(f"{ident}: year is not an integer")
        elif year >= 1930 and (t.get("melody") or t.get("lyric")):
            errors.append(f"{ident}: melody or lyric on a tune from {year}")
        if not re.match(r"^[A-G](?:#|b)?m?$", str(t.get("key") or "")):
            errors.append(f"{ident}: key {t.get('key')!r}")
    return errors


def main():
    tunes = load_tunes()
    errors = check(tunes)
    print(f"tunes {len(tunes)}")
    if errors:
        print(f"FAILED {len(errors)}")
        for e in errors:
            print(e)
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
