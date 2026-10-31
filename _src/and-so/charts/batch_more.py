"""More of the jam-session canon: bebop lines, hard bop, and songbook tunes."""
from .lib import T, aaba, blues12

def F(a, b, c, d):
    for i, x in enumerate((a, b, c, d)):
        if len(x) != 8:
            raise SystemExit(f"section {i} has {len(x)}")
    return a + b + c + d

def tune(id, title, composer, year, key, form, sections, tempo=140):
    return T(id, title, composer, year, key, form, F(*sections), tempo)

# How High the Moon changes, used by several bop lines.
MOON = F(
    ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Fm7", "Bb7"],
    ["Ebmaj7", "Ebmaj7", "Ebm7", "Ab7", "Dbmaj7", "Dbmaj7", "Dm7", "G7"],
    ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Fm7", "Bb7"],
    ["Ebmaj7", "Am7 D7", "Gmaj7", "Gmaj7", "Am7", "D7", "Gmaj7", "Gmaj7"],
)
# What Is This Thing Called Love, concert C, a common bop key.
WIT = F(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7"],
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "G7", "Cm7"],
    ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"],
    ["Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dm7b5", "G7", "Cm7", "Cm7"],
)
# Indiana / Donna Lee skeleton in Ab.
IND = F(
    ["Abmaj7", "Abmaj7", "Fo7", "Bb7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7"],
    ["Dbmaj7", "Dbmaj7", "Dbm7", "Gb7", "Abmaj7", "F7", "Bb7", "Eb7"],
    ["Abmaj7", "Abmaj7", "Fo7", "Bb7", "Bbm7", "Eb7", "Abmaj7", "C7"],
    ["Fm7", "Bb7", "Eb7", "Abmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7"],
)

TUNES = [
    T("ornithology", "Ornithology", "Charlie Parker", 1946, "G", "32-bar ABAC", MOON, 180),
    T("satellite", "Satellite", "John Coltrane", 1960, "G", "32-bar ABAC", MOON, 200),
    T("hot-house", "Hot House", "Tadd Dameron", 1945, "Cm", "32-bar AABA", WIT, 180),
    T("donna-lee", "Donna Lee", "Charlie Parker", 1947, "Ab", "32-bar ABAC", IND, 200),
    T("confirmation", "Confirmation", "Charlie Parker", 1946, "F", "32-bar AABA", aaba(
        ["Fmaj7", "Em7b5 A7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["Cm7", "F7", "Bbmaj7", "Bbmaj7", "Ebmaj7", "Ab7", "Dm7", "G7"]), 200),
    T("yardbird", "Yardbird Suite", "Charlie Parker", 1946, "C", "32-bar AABA", aaba(
        ["Cmaj7", "Cmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7", "A7"],
        ["Dm7", "G7", "Em7", "A7", "Dm7", "G7", "Dm7", "G7"]), 176),
    T("scrapple", "Scrapple from the Apple", "Charlie Parker", 1947, "F", "32-bar AABA", aaba(
        ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "G7"],
        ["Bbmaj7", "Bbmaj7", "Bbm7", "Eb7", "Am7", "D7", "Gm7", "C7"]), 190),
    T("dewey", "Dewey Square", "Charlie Parker", 1947, "Eb", "32-bar AABA", aaba(
        ["Ebmaj7", "Ebmaj7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"]), 180),
    T("suede", "My Little Suede Shoes", "Charlie Parker", 1951, "C", "32-bar AABA", aaba(
        ["Cmaj7", "Cmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "G7"],
        ["Dm7", "G7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 160),
    T("groovin", "Groovin' High", "Dizzy Gillespie", 1945, "Eb", "32-bar AABA", aaba(
        ["Ebmaj7", "Ebmaj7", "Abmaj7", "Abmaj7", "Ebmaj7", "Ebmaj7", "Bb7", "Bb7"],
        ["Ebmaj7", "Gm7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 180),
    T("tunisia", "A Night in Tunisia", "Dizzy Gillespie", 1942, "Dm", "32-bar AABA", aaba(
        ["Dm7", "Dm7", "Em7b5", "A7", "Dm7", "Dm7", "Em7b5", "A7"],
        ["Gm7", "C7", "Fmaj7", "Fmaj7", "Bbm7", "Eb7", "Em7b5", "A7"]), 176),
    T("salt-peanuts", "Salt Peanuts", "Dizzy Gillespie", 1942, "Bb", "16-bar", [
        "Bb7", "Bb7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7", "F7", "Eb7", "Bb7", "Bb7", "F7", "F7", "Bb7", "Bb7"], 220),
    T("woody", "Woody'n You", "Dizzy Gillespie", 1943, "Db", "32-bar AABA", aaba(
        ["Dbmaj7", "Dbmaj7", "Dbm7", "Gb7", "Bmaj7", "Bmaj7", "Bm7", "E7"],
        ["Amaj7", "Amaj7", "Am7", "D7", "Abmaj7", "Abmaj7", "Gm7b5", "C7"]), 176),
    T("bebop", "Bebop", "Dizzy Gillespie", 1945, "F", "32-bar AABA", aaba(
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"]), 200),
    T("dizzy-atmosphere", "Dizzy Atmosphere", "Dizzy Gillespie", 1945, "Bb", "32-bar AABA", aaba(
        ["Bbmaj7", "Cm7 F7", "Bbmaj7", "Cm7 F7", "Bbmaj7", "G7", "Cm7", "F7"],
        ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"]), 200),
    T("solar", "Solar", "Miles Davis", 1954, "Cm", "12-bar blues", [
        "Cm7", "Cm7", "Gm7 C7", "Fmaj7", "Fm7", "Bb7", "Ebmaj7", "Ebm7 Ab7", "Dbmaj7", "Dm7b5 G7", "Cm7", "Cm7"], 160),
    T("tune-up", "Tune Up", "Miles Davis", 1953, "D", "16-bar", [
        "Em7", "A7", "Dmaj7", "Dmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Cm7", "F7", "Bbmaj7", "Bbmaj7", "Em7", "A7", "Dmaj7", "Dmaj7"], 176),
    T("four", "Four", "Miles Davis", 1954, "Eb", "32-bar ABAC", F(
        ["Ebmaj7", "Ebmaj7", "Abmaj7", "Abmaj7", "Ebmaj7", "Ebmaj7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7"],
        ["Ebmaj7", "Ebmaj7", "Abmaj7", "Abmaj7", "Ebmaj7", "Ebmaj7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 168),
    T("so-what-b", "Impressions", "John Coltrane", 1961, "Dm", "32-bar AABA", aaba(
        ["Dm7", "Dm7", "Dm7", "Dm7", "Dm7", "Dm7", "Dm7", "Dm7"],
        ["Ebm7", "Ebm7", "Ebm7", "Ebm7", "Ebm7", "Ebm7", "Ebm7", "Ebm7"]), 200),
    T("mr-day", "Mr. Day", "John Coltrane", 1960, "Bb", "12-bar blues", blues12("Bb7", "Eb7", "F7"), 160),
    T("naima", "Naima", "John Coltrane", 1959, "Eb", "16-bar", [
        "Ebmaj7", "Ebmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7b5", "C7",
        "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dbmaj7", "Gm7b5 C7", "Fm7 Bb7", "Ebmaj7"], 60),
    T("moments-notice", "Moment's Notice", "John Coltrane", 1957, "Eb", "32-bar AABA", aaba(
        ["Ebmaj7", "Fm7 Bb7", "Ebmaj7", "Fm7 Bb7", "Abmaj7", "Bbm7 Eb7", "Abmaj7", "Db7"],
        ["Gbmaj7", "Abm7 Db7", "Gbmaj7", "Fm7 Bb7", "Ebmaj7", "Gm7 C7", "Fm7", "Bb7"]), 176),
    T("lazy-bird", "Lazy Bird", "John Coltrane", 1957, "G", "32-bar AABA", aaba(
        ["Gmaj7", "Gmaj7", "Bm7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
        ["Fmaj7", "Fmaj7", "Em7", "A7", "Dm7", "G7", "Cm7", "F7"]), 160),
    T("locomotion", "Locomotion", "John Coltrane", 1957, "Bb", "12-bar blues", blues12("Bb7", "Eb7", "F7"), 180),
    T("grand-central", "Grand Central", "John Coltrane", 1959, "C", "32-bar AABA", aaba(
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
        ["Abmaj7", "Abmaj7", "Dbmaj7", "Dbmaj7", "Gbmaj7", "Gbmaj7", "Bmaj7", "Bmaj7"]), 200),
    T("spacetrane", "Spiral", "John Coltrane", 1957, "Eb", "16-bar", [
        "Ebmaj7", "Ebmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7", "C7",
        "Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"], 140),
    T("blue-bossa-b", "Recorda Me", "Joe Henderson", 1963, "Am", "16-bar", [
        "Am7", "Am7", "Am7", "Am7", "Am7", "Am7", "Bm7b5", "E7",
        "Am7", "Am7", "Fmaj7", "E7", "Am7", "Bm7b5 E7", "Am7", "Am7"], 140),
    T("inner-urge", "Inner Urge", "Joe Henderson", 1964, "Fm", "32-bar AABA", aaba(
        ["Fm7", "Fm7", "Dbmaj7", "Dbmaj7", "Em7", "Em7", "Gbmaj7", "Gbmaj7"],
        ["Gm7", "Gm7", "Amaj7", "Amaj7", "Bbm7", "Bbm7", "Cm7", "Cm7"]), 140),
    T("recorda-2", "Isotope", "Joe Henderson", 1964, "C", "12-bar blues", [
        "C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7", "Gm7", "C7", "F7", "Gb7"], 160),
    T("black-narcissus", "Black Narcissus", "Joe Henderson", 1969, "G", "32-bar AABA", aaba(
        ["Gmaj7", "Gmaj7", "Fmaj7", "Fmaj7", "Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7"],
        ["Cmaj7", "Cmaj7", "Bbmaj7", "Bbmaj7", "Abmaj7", "Abmaj7", "Gbmaj7", "Gbmaj7"]), 80),
    T("song-for-my-father", "Song for My Father", "Horace Silver", 1964, "Fm", "24-bar AAB", [
        "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Eb7", "Eb7",
        "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Eb7", "Eb7",
        "Db7", "Db7", "C7", "C7", "Fm7", "Fm7", "Eb7", "Eb7"], 120),
    T("the-preacher", "The Preacher", "Horace Silver", 1955, "Bb", "32-bar AABA", aaba(
        ["Bb6", "Bb6", "Bb6", "Bb6", "Eb7", "Eb7", "Bb6", "Bb6"],
        ["F7", "F7", "Bb6", "G7", "C7", "F7", "Bb6", "Bb6"]), 140),
    T("strollin", "Strollin'", "Horace Silver", 1960, "Bb", "32-bar AABA", aaba(
        ["Bbmaj7", "Bbmaj7", "Cm7", "F7", "Bbmaj7", "Gm7", "Cm7", "F7"],
        ["Ebmaj7", "Ebmaj7", "Edim7", "Edim7", "Bbmaj7", "G7", "Cm7", "F7"]), 112),
    T("nutville", "Nica's Dream", "Horace Silver", 1956, "Bb", "32-bar AABA", aaba(
        ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "Gm7", "C7", "C7"],
        ["Cm7", "F7", "Bbmaj7", "Bbmaj7", "Ebm7", "Ab7", "Dm7", "G7"]), 140),
    T("peace", "Peace", "Horace Silver", 1959, "Bb", "32-bar AABA", aaba(
        ["Bbmaj7", "Am7", "Dm7", "Gm7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"],
        ["Ebmaj7", "Ebm7", "Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 72),
    T("silver-serenade", "Silver's Serenade", "Horace Silver", 1963, "Eb", "32-bar AABA", aaba(
        ["Ebmaj7", "Ebmaj7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 140),
    T("cape-verdean", "The Cape Verdean Blues", "Horace Silver", 1965, "Fm", "32-bar AABA", aaba(
        ["Fm7", "Fm7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7b5", "C7"],
        ["Fm7", "Fm7", "Db7", "Db7", "C7", "C7", "Fm7", "C7"]), 120),
    T("juicy", "Juicy Lucy", "Horace Silver", 1964, "F", "16-bar", [
        "F7", "F7", "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "Bb7", "F7", "C7", "F7", "F7", "C7", "F7"], 140),
    T("the-kicker", "The Kicker", "Joe Henderson", 1967, "C", "32-bar AABA", aaba(
        ["C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7"],
        ["G7", "F7", "C7", "A7", "D7", "G7", "C7", "C7"]), 160),
    T("short-story", "Short Story", "Joe Henderson", 1964, "F", "16-bar", [
        "Fmaj7", "Em7b5 A7", "Dm7 G7", "Cm7 F7", "Bbmaj7", "Bbm7 Eb7", "Am7 D7", "Abm7 Db7",
        "Gm7", "C7", "Fmaj7", "Am7 D7", "Gm7 C7", "Fmaj7", "Gm7", "C7"], 140),
    T("ceora", "Ceora", "Lee Morgan", 1965, "Ab", "32-bar AABA", aaba(
        ["Abmaj7", "Abmaj7", "Bb7", "Bb7", "Ebmaj7", "Ebmaj7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"]), 140),
    T("the-sidewinder", "The Sidewinder", "Lee Morgan", 1963, "Eb", "24-bar blues", [
        "Eb7", "Eb7", "Eb7", "Eb7", "Eb7", "Eb7", "Eb7", "Eb7",
        "Ab7", "Ab7", "Ab7", "Ab7", "Eb7", "Eb7", "Eb7", "Eb7",
        "Bb7", "Ab7", "Eb7", "Eb7", "Bb7", "Bb7", "Eb7", "Eb7"], 140),
    T("search-for", "Search for the New Land", "Lee Morgan", 1964, "F", "32-bar AABA", aaba(
        ["Fmaj7", "Fmaj7", "Em7", "A7", "Dm7", "G7", "Gm7", "C7"],
        ["Fmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 100),
    T("yes-indeed", "Yes I Can, No You Can't", "Lee Morgan", 1964, "Bb", "12-bar blues", blues12("Bb7", "Eb7", "F7"), 140),
    T("dat-dere", "Dat Dere", "Bobby Timmons", 1960, "Bb", "32-bar AABA", aaba(
        ["Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "G7", "Cm7", "F7"],
        ["Bb7", "Bb7", "Ab7", "Ab7", "G7", "G7", "Cm7", "F7"]), 140),
    T("moanin", "Moanin'", "Bobby Timmons", 1958, "Fm", "32-bar AABA", aaba(
        ["Fm7", "Fm7", "Bbm7", "Eb7", "Fm7", "Fm7", "C7", "C7"],
        ["Fm7", "Bbm7", "Eb7", "Abmaj7", "Db7", "Gm7b5", "C7", "Fm7"]), 120),
    T("dis-here", "This Here", "Bobby Timmons", 1960, "F", "16-bar", [
        "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "C7", "F7", "Bb7", "F7", "C7", "F7", "Bb7", "F7", "F7"], meter=3, tempo=140),
    T("work-song", "Work Song", "Nat Adderley", 1960, "Fm", "16-bar", [
        "Fm7", "Fm7", "Fm7", "Fm7", "Bbm7", "Bbm7", "Fm7", "Fm7", "C7", "C7", "Fm7", "Fm7", "C7", "Bbm7", "Fm7", "Fm7"], 116),
    T("sack-o-woe", "Sack o' Woe", "Cannonball Adderley", 1960, "F", "16-bar", [
        "F7", "F7", "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "Bb7", "F7", "C7", "F7", "Bb7", "F7", "C7"], 140),
    T("mercy", "Mercy, Mercy, Mercy", "Joe Zawinul", 1966, "Bb", "16-bar", [
        "Bb7", "Bb7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7", "Cm7", "F7", "Bb7", "Bb7", "Eb7", "F7", "Bb7", "Bb7"], 88),
    T("country-preacher", "Country Preacher", "Joe Zawinul", 1969, "F", "16-bar", [
        "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "Bb7", "F7", "F7", "Bb7", "C7", "F7", "Bb7", "F7", "F7"], 100),
    T("eighty-one", "Eighty-One", "Ron Carter", 1965, "F", "16-bar", [
        "F7", "F7", "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "C7", "F7", "Bb7", "F7", "C7", "F7", "F7"], 108),
    T("freedom-jazz", "Freedom Jazz Dance", "Eddie Harris", 1965, "F", "16-bar", [
        "F7", "F7", "F7", "F7", "Eb7", "Eb7", "F7", "F7", "Db7", "Db7", "F7", "Eb7", "F7", "Eb7", "F7", "F7"], 140),
    T("compared", "Compared to What", "Gene McDaniels", 1966, "Eb", "16-bar", [
        "Eb7", "Eb7", "Eb7", "Eb7", "Ab7", "Ab7", "Eb7", "Eb7", "Bb7", "Ab7", "Eb7", "Bb7", "Eb7", "Ab7", "Eb7", "Bb7"], 100),
    T("cold-duck", "Cold Duck Time", "Eddie Harris", 1969, "Bb", "16-bar", [
        "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7", "Ab7", "G7", "Cm7", "F7", "Bb7", "Bb7", "Eb7", "F7", "Bb7", "Bb7"], 120),
    T("chameleon", "Chameleon", "Herbie Hancock", 1973, "Bb", "16-bar", [
        "Bb7", "Bb7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7", "Cm7", "F7", "Bb7", "Bb7", "Eb7", "Eb7", "Bb7", "Bb7"], 108),
    T("the-chicken", "The Chicken", "Pee Wee Ellis", 1969, "F", "16-bar", [
        "F7", "F7", "F7", "F7", "Bb7", "Bb7", "F7", "F7", "C7", "Bb7", "F7", "C7", "F7", "Bb7", "F7", "F7"], 140),
]
