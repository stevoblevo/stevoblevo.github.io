"""Rhythm-changes tunes. The grid is the jam-session form, not a printed page."""
from .lib import T, aaba

A = ["Bbmaj7", "Cm7 F7", "Bbmaj7", "Cm7 F7", "Bbmaj7 Bb7", "Ebmaj7 Ebm7", "Dm7 G7", "Cm7 F7"]
B = ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"]
BARS = aaba(A, B)

# A few rhythm tunes turn the bridge or the last A. The rest share this grid.
OWN = {
    "cottontail": aaba(A, ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"]),
    "lester": aaba(
        ["Bbmaj7", "G7", "Cm7 F7", "Bbmaj7", "Bb7", "Ebmaj7", "Dm7 G7", "Cm7 F7"],
        B),
}

CONTRA = [
    ("oleo", "Oleo", "Sonny Rollins", 1954, 140),
    ("anthropology", "Anthropology", "Charlie Parker", 1946, 200),
    ("moose", "Moose the Mooche", "Charlie Parker", 1946, 200),
    ("rhythm-a-ning", "Rhythm-a-Ning", "Thelonious Monk", 1957, 180),
    ("shaw-nuff", "Shaw 'Nuff", "Dizzy Gillespie", 1945, 220),
    ("dexterity", "Dexterity", "Charlie Parker", 1947, 200),
    ("steeplechase", "Steeplechase", "Charlie Parker", 1948, 200),
    ("eternal-triangle", "The Eternal Triangle", "Sonny Stitt", 1957, 220),
    ("fingers", "Fingers", "Thad Jones", 1968, 200),
    ("the-theme", "The Theme", "Miles Davis", 1954, 180),
    ("cottontail", "Cottontail", "Duke Ellington", 1940, 200),
    ("lester", "Lester Leaps In", "Lester Young", 1939, 220),
    ("crazeology", "Crazeology", "Little Benny Harris", 1947, 200),
    ("we", "We", "Charlie Parker", 1954, 200),
]

TUNES = []
for id, title, composer, year, tempo in CONTRA:
    bars = OWN.get(id, BARS)
    TUNES.append(T(id, title, composer, year, "Bb", "32-bar AABA", bars, tempo))
