"""Shared helpers for the AND SO charts. Bars are our own data, one bar per cell."""


def T(id, title, composer, year, key, form, bars, tempo=120, meter=4, melody=None):
    # Callers may pass tempo before the bar list.
    if isinstance(bars, int):
        bars, tempo = tempo, bars
    if isinstance(bars, str):
        bars = [b.strip() for b in bars.split("|")]
    bars = [b for b in bars if b != ""]
    n = int(str(form).split("-", 1)[0])
    if len(bars) != n:
        raise SystemExit(f"{id}: {form} has {len(bars)} bars")
    tune = {
        "id": id,
        "title": title,
        "composer": composer,
        "year": int(year),
        "key": key,
        "form": form,
        "tempo": int(tempo),
        "meter": meter,
        "pd": int(year) < 1930,
        "basis": "Our chord chart for AND SO. Not a copy of a printed fake-book page.",
        "bars": [b.split() for b in bars],
    }
    if melody and int(year) < 1930:
        tune["melody"] = melody
    return tune


def aaba(a, b):
    if len(a) != 8 or len(b) != 8:
        raise SystemExit(f"AABA sections {len(a)} {len(b)}")
    return a + a + b + a


def abac(a, b, c):
    if len(a) != 8 or len(b) != 8 or len(c) != 8:
        raise SystemExit(f"ABAC sections {len(a)} {len(b)} {len(c)}")
    return a + b + a + c


def blues12(one, four, five, turn=None):
    """Twelve bars. turn replaces the last four bars when a tune has its own ending."""
    bars = [one, one, one, one, four, four, one, one, five, four, one, five]
    if turn:
        if len(turn) != 4:
            raise SystemExit("turn needs 4 bars")
        bars = bars[:8] + list(turn)
    return bars
