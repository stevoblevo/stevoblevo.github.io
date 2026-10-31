"""Songbook tunes, 32 bars unless the form says otherwise. Our own grids."""
from .lib import T

def F(a, b, c, d):
    for i, x in enumerate((a, b, c, d)):
        if len(x) != 8:
            raise SystemExit(f"section {i} has {len(x)}")
    return a + b + c + d

def tune(id, title, composer, year, key, form, sections, tempo=120):
    return T(id, title, composer, year, key, form, F(*sections), tempo)

TUNES = [
    tune("all-of-me", "All of Me", "Gerald Marks", 1931, "C", "32-bar ABAC", [
        ["Cmaj7", "Cmaj7", "E7", "E7", "A7", "A7", "Dm7", "G7"],
        ["Dm7", "G7", "Cmaj7", "Cmaj7", "E7", "E7", "Am7", "A7"],
        ["Dm7", "G7", "Cmaj7", "Cmaj7", "Fmaj7", "Fm7", "Cmaj7", "A7"],
        ["Dm7", "G7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("how-high", "How High the Moon", "Morgan Lewis", 1940, "G", "32-bar ABAC", [
        ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Fm7", "Bb7"],
        ["Ebmaj7", "Ebmaj7", "Ebm7", "Ab7", "Dbmaj7", "Dbmaj7", "Dm7", "G7"],
        ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Fm7", "Bb7"],
        ["Ebmaj7", "Am7 D7", "Gmaj7", "Gmaj7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("just-friends", "Just Friends", "John Klenner", 1931, "G", "32-bar ABAC", [
        ["Gmaj7", "Gmaj7", "B7", "B7", "Em7", "A7", "Am7", "D7"],
        ["Gmaj7", "Gmaj7", "B7", "B7", "Em7", "A7", "Am7", "D7"],
        ["Bm7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7", "F#m7", "B7"],
        ["Em7", "A7", "Am7", "D7", "Bm7", "E7", "Am7", "D7"],
    ]),
    tune("another-you", "There Will Never Be Another You", "Harry Warren", 1942, "Eb", "32-bar ABAC", [
        ["Ebmaj7", "Gm7 C7", "Fm7 Bb7", "Ebmaj7", "Abmaj7", "Gm7 C7", "Fm7 Bb7", "Ebmaj7"],
        ["Abmaj7", "Abm7 Db7", "Ebmaj7", "Cm7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Ebmaj7", "Gm7 C7", "Fm7 Bb7", "Ebmaj7", "Abmaj7", "Gm7 C7", "Fm7 Bb7", "Ebmaj7"],
        ["Abmaj7", "Abm7 Db7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("the-way", "The Way You Look Tonight", "Jerome Kern", 1936, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("but-not", "But Not for Me", "George Gershwin", 1930, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7"],
        ["Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("our-love", "Our Love Is Here to Stay", "George Gershwin", 1938, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Gm7", "C7"],
        ["Fmaj7", "Am7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["A7", "A7", "Dm7", "G7", "Gm7", "C7", "Am7", "D7"],
        ["Gm7", "C7", "Fmaj7", "Am7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("stella", "Stella by Starlight", "Victor Young", 1946, "Bb", "32-bar ABAC", [
        ["Em7b5", "A7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Bbm7", "Eb7", "Cm7b5", "F7", "Bbmaj7", "Bbmaj7"],
        ["Em7b5", "A7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ab7"],
        ["Bbmaj7", "Em7b5 A7", "Dm7", "G7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"],
    ]),
    tune("green-dolphin", "On Green Dolphin Street", "Bronislaw Kaper", 1947, "Eb", "32-bar ABAC", [
        ["Ebmaj7", "Ebmaj7", "Ebmaj7", "Ebmaj7", "Ebm7", "Ab7", "Dbmaj7", "Dbmaj7"],
        ["Ebmaj7", "Ebmaj7", "Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7"],
        ["Ebmaj7", "Ebmaj7", "Ebmaj7", "Ebmaj7", "Ebm7", "Ab7", "Dbmaj7", "Dbmaj7"],
        ["Gm7b5", "C7", "Fm7", "Bb7", "Ebmaj7", "Gm7 C7", "Fm7 Bb7", "Ebmaj7"],
    ]),
    tune("invitation", "Invitation", "Bronislaw Kaper", 1952, "Cm", "32-bar AABA", [
        ["Cm7", "Cm7", "Dm7b5", "G7", "Cm7", "Cm7", "Dm7b5", "G7"],
        ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"],
        ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ]),
    tune("my-romance", "My Romance", "Richard Rodgers", 1935, "C", "32-bar AABA", [
        ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7"],
        ["Cmaj7", "C7", "Fmaj7", "Fm7", "Cmaj7", "A7", "Dm7", "G7"],
        ["Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Am7", "D7"],
        ["Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("have-you-met", "Have You Met Miss Jones", "Richard Rodgers", 1937, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
        ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
        ["Bbmaj7", "Abm7 Db7", "Gbmaj7", "Em7 A7", "Dmaj7", "Abm7 Db7", "Gbmaj7", "C7"],
        ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
    ]),
    tune("my-funny", "My Funny Valentine", "Richard Rodgers", 1937, "Cm", "32-bar AABA", [
        ["Cm7", "Cm7", "Cm7", "Dm7b5 G7", "Cm7", "Cm7", "Fm7", "Bb7"],
        ["Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "Dm7b5", "G7", "Cm7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "G7"],
        ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dm7b5 G7", "Cm7"],
    ]),
    tune("spring", "It Might as Well Be Spring", "Richard Rodgers", 1945, "G", "32-bar AABA", [
        ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Bm7", "E7"],
        ["Am7", "D7", "Gmaj7", "Gmaj7", "F#m7", "B7", "Em7", "A7"],
        ["Am7", "D7", "Gmaj7", "Gmaj7", "F#7", "B7", "Em7", "A7"],
        ["Am7", "D7", "Bm7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("there-is", "There Is No Greater Love", "Isham Jones", 1936, "Bb", "32-bar AABA", [
        ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
        ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
        ["Cm7", "F7", "Bbmaj7", "Bbmaj7", "Ebmaj7", "Ab7", "Dm7", "G7"],
        ["Cm7", "F7", "Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"],
    ]),
    tune("easy-living", "Easy Living", "Ralph Rainger", 1937, "F", "32-bar AABA", [
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "A7"],
        ["Dm7", "G7", "Gm7", "C7", "Fmaj7", "D7", "Gm7", "C7"],
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("out-of-nowhere", "Out of Nowhere", "Johnny Green", 1931, "G", "32-bar ABAC", [
        ["Gmaj7", "Gmaj7", "Bb7", "Bb7", "Ebmaj7", "Ebmaj7", "Gmaj7", "Gmaj7"],
        ["Am7", "D7", "Gmaj7", "Gmaj7", "F#m7", "B7", "Em7", "A7"],
        ["Gmaj7", "Gmaj7", "Bb7", "Bb7", "Ebmaj7", "Ebmaj7", "Am7", "D7"],
        ["Bm7", "E7", "Am7", "D7", "Gmaj7", "Am7 D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("you-go-to-my-head", "You Go to My Head", "J. Fred Coots", 1938, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7b5", "C7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("skylark", "Skylark", "Hoagy Carmichael", 1941, "Eb", "32-bar ABAC", [
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "C7"],
        ["Fm7", "Bb7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("the-nearness", "The Nearness of You", "Hoagy Carmichael", 1938, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "D7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["Fmaj7", "Fmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "A7"],
        ["Dm7", "G7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"],
        ["Fmaj7", "D7", "Gm7", "C7", "Fmaj7", "Gm7 C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("in-a-sentimental", "In a Sentimental Mood", "Duke Ellington", 1935, "F", "32-bar AABA", [
        ["Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7"],
        ["Fmaj7", "Am7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["A7", "A7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "C7"],
        ["Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7", "Gm7 C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("dont-blame", "Don't Blame Me", "Jimmy McHugh", 1933, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Gm7", "C7"],
        ["Fmaj7", "Fm7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
        ["Em7", "A7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
        ["Cmaj7", "Dm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("exactly", "Exactly Like You", "Jimmy McHugh", 1930, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "E7", "E7", "A7", "A7", "D7", "G7"],
        ["Cmaj7", "Cmaj7", "C7", "C7", "Fmaj7", "Fmaj7", "D7", "G7"],
        ["Cmaj7", "Cmaj7", "E7", "E7", "A7", "A7", "D7", "G7"],
        ["Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("im-confessin", "I'm Confessin'", "Doc Daugherty", 1930, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "A7", "A7", "D7", "D7", "G7", "C7"],
        ["Fmaj7", "Fmaj7", "F7", "F7", "Bbmaj7", "Bbmaj7", "G7", "C7"],
        ["Fmaj7", "D7", "G7", "C7", "Fmaj7", "D7", "G7", "C7"],
        ["Fmaj7", "A7", "D7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("pennies", "Pennies from Heaven", "Arthur Johnston", 1936, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Gm7", "C7"],
        ["Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
        ["Gm7", "C7", "Fmaj7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7"],
        ["Dm7", "G7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("polka-dots", "Polka Dots and Moonbeams", "Jimmy Van Heusen", 1940, "F", "32-bar AABA", [
        ["Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7"],
        ["Fmaj7", "Am7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "A7"],
        ["Dm7", "G7", "Gm7", "C7", "Fmaj7", "Bb7", "Am7", "D7"],
        ["Gm7", "C7", "Fmaj7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("i-thought", "I Thought About You", "Jimmy Van Heusen", 1939, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "D7"],
        ["Gm7", "C7", "Fmaj7", "A7", "Dm7", "G7", "Gm7", "C7"],
        ["Fmaj7", "Fmaj7", "Bb7", "Bb7", "Ebmaj7", "Ab7", "Gm7", "C7"],
        ["Fmaj7", "D7", "Gm7", "C7", "Fmaj7", "Gm7 C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("like-someone", "Like Someone in Love", "Jimmy Van Heusen", 1944, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
        ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7"],
        ["Em7", "A7", "Dm7", "G7", "Cmaj7", "Gm7", "C7", "Fmaj7"],
        ["Fm7", "Bb7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("imagination", "Imagination", "Jimmy Van Heusen", 1940, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("darn", "Darn That Dream", "Jimmy Van Heusen", 1939, "G", "32-bar AABA", [
        ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Bm7", "E7"],
        ["Am7", "D7", "Gmaj7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
        ["Bm7", "E7", "Am7", "D7", "Gmaj7", "F#7", "Bm7", "E7"],
        ["Am7", "D7", "Bm7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("it-could", "It Could Happen to You", "Jimmy Van Heusen", 1944, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7"],
        ["Fm7", "Bb7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("all-gods", "All God's Chillun Got Rhythm", "Bronislaw Kaper", 1937, "G", "32-bar AABA", [
        ["Gmaj7", "Gmaj7", "Gmaj7", "Gmaj7", "Cmaj7", "Cmaj7", "Gmaj7", "Gmaj7"],
        ["Gmaj7", "Gmaj7", "Am7", "D7", "Gmaj7", "E7", "Am7", "D7"],
        ["Gmaj7", "Gmaj7", "B7", "B7", "Em7", "A7", "Am7", "D7"],
        ["Gmaj7", "Am7", "Bm7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("softly", "Softly, as in a Morning Sunrise", "Sigmund Romberg", 1928, "Cm", "32-bar AABA", [
        ["Cm7", "Cm7", "Dm7b5", "G7", "Cm7", "Cm7", "Dm7b5", "G7"],
        ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "G7"],
        ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ]),
    tune("lover-come", "Lover, Come Back to Me", "Sigmund Romberg", 1928, "G", "32-bar AABA", [
        ["Gmaj7", "Gmaj7", "E7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
        ["Gmaj7", "Gmaj7", "B7", "B7", "Em7", "A7", "Am7", "D7"],
        ["Gmaj7", "E7", "Am7", "D7", "Gmaj7", "F#7", "Bm7", "E7"],
        ["Am7", "D7", "Gmaj7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("yesterdays", "Yesterdays", "Jerome Kern", 1933, "Dm", "32-bar AABA", [
        ["Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7b5", "A7"],
        ["Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Em7b5", "A7", "Dm7"],
        ["Gm7", "C7", "Fmaj7", "Fmaj7", "Bbmaj7", "E7", "A7", "A7"],
        ["Dm7", "Gm7", "C7", "Fmaj7", "Em7b5", "A7", "Dm7", "Dm7"],
    ]),
    tune("all-the-things-b", "Long Ago and Far Away", "Jerome Kern", 1944, "F", "32-bar AABA", [
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Bbmaj7", "Bbm7", "Am7", "D7"],
        ["Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "D7", "Gm7", "C7"],
        ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("the-song-is", "The Song Is You", "Jerome Kern", 1932, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
        ["Cmaj7", "Gm7", "C7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7"],
        ["Dm7", "G7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
        ["Cmaj7", "Dm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("smoke", "Smoke Gets in Your Eyes", "Jerome Kern", 1933, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Cm7", "F7", "Bb7", "Bb7"],
        ["Ebmaj7", "C7", "Fm7", "Bb7", "Gm7", "C7", "Fm7", "Bb7"],
        ["Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("a-fine", "A Fine Romance", "Jerome Kern", 1936, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Am7", "Dm7", "G7"],
        ["Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "G7", "Gm7", "C7"],
        ["Fmaj7", "F7", "Bbmaj7", "Bbmaj7", "Ebmaj7", "Ab7", "Gm7", "C7"],
        ["Fmaj7", "D7", "Gm7", "C7", "Fmaj7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("night-and-day", "Night and Day", "Cole Porter", 1932, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Gm7", "C7"],
        ["Fmaj7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7", "Dm7", "G7"],
        ["Cmaj7", "Ab7", "Dm7", "G7", "Cmaj7", "Ab7", "Dm7", "G7"],
        ["Cmaj7", "Dm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("what-is", "I Love You", "Cole Porter", 1944, "F", "32-bar AABA", [
        ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
        ["Fmaj7", "Am7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
        ["Cm7", "F7", "Bbmaj7", "Bbmaj7", "Ebmaj7", "Ab7", "Dm7", "G7"],
        ["Gm7", "C7", "Fmaj7", "Am7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ]),
    tune("love-for-sale", "Love for Sale", "Cole Porter", 1930, "Cm", "32-bar AABA", [
        ["Cm7", "Cm7", "Dm7b5", "G7", "Cm7", "Cm7", "Fm7", "Bb7"],
        ["Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "G7", "Cm7", "Cm7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"],
        ["Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "G7", "Cm7", "Cm7"],
    ]),
    tune("night-day-2", "Just One of Those Things", "Cole Porter", 1935, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Db7", "Gbmaj7", "F7", "Bbmaj7", "A7", "Abmaj7", "G7"],
        ["Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("you-do", "You'd Be So Nice to Come Home To", "Cole Porter", 1943, "C", "32-bar AABA", [
        ["Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Em7", "Am7", "D7"],
        ["Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
        ["Fmaj7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7", "Dm7", "G7"],
        ["Cmaj7", "Dm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ]),
    tune("from-this", "From This Moment On", "Cole Porter", 1950, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"],
        ["Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
    tune("easy-to-love", "Easy to Love", "Cole Porter", 1936, "G", "32-bar AABA", [
        ["Gmaj7", "Gmaj7", "Am7", "D7", "Gmaj7", "Gmaj7", "F#m7", "B7"],
        ["Em7", "A7", "Am7", "D7", "Gmaj7", "E7", "Am7", "D7"],
        ["Bm7", "E7", "Am7", "D7", "Gmaj7", "F#7", "Bm7", "E7"],
        ["Am7", "D7", "Gmaj7", "Em7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ]),
    tune("i-concentrate", "I Concentrate on You", "Cole Porter", 1940, "Eb", "32-bar AABA", [
        ["Ebmaj7", "Gm7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
        ["Abmaj7", "Db7", "Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7"],
        ["Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ]),
]
