"""Further standards, Latin tunes, and jazz originals."""
from .lib import T, aaba, blues12

def pair(a, b):
    if len(a) != 8 or len(b) != 8:
        raise SystemExit(f"pair {len(a)} {len(b)}")
    return a + b

TUNES = []

def add(id, title, composer, year, key, form, bars, tempo=120, meter=4):
    TUNES.append(T(id, title, composer, year, key, form, bars, tempo, meter=meter))

# --- Latin and calypso ---
add("black-orpheus", "Black Orpheus", "Luiz Bonfa", 1959, "Am", "32-bar AABA", aaba(
    ["Am7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Bm7b5", "E7"],
    ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bm7b5", "E7", "Am7"]), 140)
add("meditation", "Meditation", "Antonio Carlos Jobim", 1962, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "Gm7", "C7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7"]), 100)
add("one-note", "One Note Samba", "Antonio Carlos Jobim", 1961, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Bbmaj7", "Bbmaj7", "Bdim7", "Cm7", "F7", "Bbmaj7"],
    ["D7", "D7", "Gm7", "C7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 120)
add("so-danco", "So Danco Samba", "Antonio Carlos Jobim", 1962, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 140)
add("triste", "Triste", "Antonio Carlos Jobim", 1967, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "G7", "Cm7", "F7"]), 110)
add("corcovado", "Corcovado", "Antonio Carlos Jobim", 1960, "Am", "16-bar", [
    "Am7", "Am7", "Bm7b5", "E7", "Am7", "Dm7", "G7", "Cmaj7", "Bm7b5", "E7", "Am7", "Am7", "Dm7", "G7", "Cmaj7", "Bm7b5 E7"], 96)
add("how-insensitive", "How Insensitive", "Antonio Carlos Jobim", 1963, "Dm", "16-bar", [
    "Dm7", "Dm7", "Dbmaj7", "Dbmaj7", "Cm7", "Cm7", "Bbm7", "Eb7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "A7", "Dm7"], 80)
add("gentle-rain", "The Gentle Rain", "Luiz Bonfa", 1965, "Cm", "16-bar", [
    "Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "Dm7b5", "G7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "G7"], 96)
add("st-thomas", "St. Thomas", "Sonny Rollins", 1956, "C", "16-bar", [
    "Cmaj7", "Cmaj7", "Cmaj7", "Cmaj7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"], 180)
add("afro-blue", "Afro Blue", "Mongo Santamaria", 1959, "Fm", "16-bar", [
    "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Fm7", "Bbm7", "Bbm7", "Fm7", "Fm7", "C7", "C7", "Fm7", "Fm7"], meter=6, tempo=120)
add("pent-up", "Pent Up House", "Sonny Rollins", 1956, "G", "32-bar AABA", aaba(
    ["Gmaj7", "Gmaj7", "Am7", "D7", "Bm7", "E7", "Am7", "D7"],
    ["Bm7", "E7", "Am7", "D7", "Gmaj7", "F#m7", "B7", "E7"]), 176)
add("airegin", "Airegin", "Sonny Rollins", 1954, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"],
    ["Cm7", "F7", "Bbmaj7", "Bbmaj7", "Ebmaj7", "Ab7", "Dm7", "G7"]), 180)
add("doxy-b", "Valse Hot", "Sonny Rollins", 1956, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), meter=3, tempo=160)
add("st-thomas-b", "The Everywhere Calypso", "Sonny Rollins", 1956, "F", "16-bar", [
    "Fmaj7", "Fmaj7", "Fmaj7", "Fmaj7", "Bbmaj7", "Bbmaj7", "Fmaj7", "Fmaj7", "C7", "Bbmaj7", "Fmaj7", "C7", "Fmaj7", "Bbmaj7", "Fmaj7", "Fmaj7"], 160)

# --- Miles, Shorter, Hancock, Silver already partly covered ---
add("milestones", "Milestones", "Miles Davis", 1958, "G", "32-bar AABA", aaba(
    ["Gm7", "Gm7", "Gm7", "Gm7", "Gm7", "Gm7", "Gm7", "Gm7"],
    ["Abm7", "Abm7", "Abm7", "Abm7", "Abm7", "Abm7", "Abm7", "Abm7"]), 180)
add("old-milestones", "Miles' Old Milestones", "Miles Davis", 1947, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Fmaj7", "Fmaj7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 160)
add("blue-in-green", "Blue in Green", "Miles Davis", 1959, "Cm", "10-bar", [
    "Cm", "Dm7b5", "G7", "Cm", "Fm7 Bb7", "Ebmaj7", "Am7b5 D7", "Gm7", "C7", "Cm"], 60)
add("nardis", "Nardis", "Miles Davis", 1958, "Em", "32-bar AABA", aaba(
    ["Em7", "Em7", "Fmaj7", "Fmaj7", "Em7", "Em7", "Dm7", "G7"],
    ["Am7", "Am7", "Fmaj7", "Fmaj7", "Em7", "Fmaj7", "Em7", "Em7"]), 140)
add("seven-steps", "Seven Steps to Heaven", "Miles Davis", 1963, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "G7"],
    ["Gm7", "C7", "Fmaj7", "Fmaj7", "Bbmaj7", "Eb7", "Am7", "D7"]), 168)
add("joshua", "Joshua", "Victor Feldman", 1963, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Cm7", "F7", "Bbmaj7", "Gm7", "Cm7", "F7"],
    ["Ebmaj7", "Ebmaj7", "Edim7", "Edim7", "Bbmaj7", "G7", "Cm7", "F7"]), 160)
add("nefertiti", "Nefertiti", "Wayne Shorter", 1967, "Db", "16-bar", [
    "Dbmaj7", "Dbmaj7", "Ebmaj7", "Ebmaj7", "Gbmaj7", "Gbmaj7", "Abmaj7", "Abmaj7",
    "Dbmaj7", "Ebm7", "Ab7", "Dbmaj7", "Gbmaj7", "Abmaj7", "Dbmaj7", "Dbmaj7"], 80)
add("iris", "Iris", "Wayne Shorter", 1965, "C", "16-bar", [
    "Cmaj7", "Cmaj7", "Abmaj7", "Abmaj7", "Dbmaj7", "Dbmaj7", "Cmaj7", "Cmaj7",
    "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7"], 72)
add("witch-hunt", "Witch Hunt", "Wayne Shorter", 1964, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Dbmaj7", "Dbmaj7", "Ebmaj7", "Ebmaj7", "Dm7b5", "G7"],
    ["Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "G7"]), 140)
add("speak-no", "Speak No Evil", "Wayne Shorter", 1964, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7", "Abmaj7", "G7"],
    ["Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Dbmaj7", "Gm7b5", "C7", "Cm7"]), 132)
add("fee-fi", "Fee-Fi-Fo-Fum", "Wayne Shorter", 1965, "Fm", "16-bar", [
    "Fm7", "Fm7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7b5", "C7",
    "Fm7", "Db7", "C7", "Fm7", "Bbm7", "Eb7", "Fm7", "Fm7"], 140)
add("infant-eyes", "Infant Eyes", "Wayne Shorter", 1964, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Abmaj7", "Abmaj7", "Gbmaj7", "Gbmaj7", "Fmaj7", "Fmaj7"],
    ["Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 60)
add("black-nile", "Black Nile", "Wayne Shorter", 1964, "G", "32-bar AABA", aaba(
    ["Gmaj7", "Gmaj7", "Fmaj7", "Fmaj7", "Ebmaj7", "Ebmaj7", "Dmaj7", "Dmaj7"],
    ["Cmaj7", "Cmaj7", "Bbmaj7", "Bbmaj7", "Am7", "D7", "Gmaj7", "Gmaj7"]), 140)
add("yes-and-no", "Yes and No", "Wayne Shorter", 1964, "D", "32-bar AABA", aaba(
    ["Dmaj7", "Dmaj7", "Em7", "A7", "Dmaj7", "F#m7", "Bm7", "E7"],
    ["Em7", "A7", "Dmaj7", "Dmaj7", "Gm7", "C7", "Fmaj7", "A7"]), 150)
add("el-gaucho", "El Gaucho", "Wayne Shorter", 1965, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ["Cm7", "Ab7", "Fm7", "Bb7", "Ebmaj7", "G7", "Cm7", "Cm7"]), 140)
add("children", "Children of the Night", "Wayne Shorter", 1961, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Ab7", "Ab7", "Fm7", "Bb7", "Ebmaj7", "G7"],
    ["Cm7", "Fm7", "Bb7", "Ebmaj7", "Abmaj7", "Db7", "Gm7", "C7"]), 160)
add("esp", "E.S.P.", "Wayne Shorter", 1965, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7", "Gbmaj7", "Gbmaj7"],
    ["Em7", "A7", "Dm7", "G7", "Cm7", "F7", "Bbmaj7", "A7"]), 140)
add("fall", "Fall", "Wayne Shorter", 1967, "Eb", "16-bar", [
    "Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7", "Cm7", "Cm7", "Bbm7", "Eb7",
    "Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"], 80)
add("pinocchio", "Pinocchio", "Wayne Shorter", 1967, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7", "Cmaj7", "Cmaj7"],
    ["Bbmaj7", "Bbmaj7", "Abmaj7", "Abmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 120)
add("dolphin-dance", "Dolphin Dance", "Herbie Hancock", 1965, "Eb", "32-bar ABAC", [
    "Ebmaj7", "Ebmaj7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7",
    "Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Fm7", "Bb7",
    "Ebmaj7", "Ebmaj7", "Ebm7", "Ab7", "Dbmaj7", "Dbmaj7", "Gm7", "C7",
    "Fm7", "Bb7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"], 96)
add("tell-me", "Tell Me a Bedtime Story", "Herbie Hancock", 1969, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Em7", "A7", "Dm7", "G7", "Gm7", "C7"],
    ["Fmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Am7", "D7"]), 90)
add("toys", "Toys", "Herbie Hancock", 1968, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ["D7", "D7", "Gm7", "C7", "Fmaj7", "Bb7", "Am7", "D7"]), 140)
add("speak-like", "Speak Like a Child", "Herbie Hancock", 1968, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"],
    ["Bbmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 80)
add("one-finger", "One Finger Snap", "Herbie Hancock", 1964, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Eb7", "Eb7", "Db7", "Db7", "Gbmaj7", "Gbmaj7"],
    ["Em7", "A7", "Dm7", "G7", "Cm7", "F7", "Bbmaj7", "A7"]), 180)
add("the-eye", "The Eye of the Hurricane", "Herbie Hancock", 1965, "Fm", "32-bar AABA", aaba(
    ["Fm7", "Fm7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7b5", "C7"],
    ["Fm7", "Db7", "C7", "Fm7", "Bbm7", "Eb7", "Fm7", "C7"]), 200)
add("riot", "Riot", "Herbie Hancock", 1968, "F", "16-bar", [
    "Fmaj7", "Fmaj7", "Ebmaj7", "Ebmaj7", "Dbmaj7", "Dbmaj7", "C7", "C7",
    "Fmaj7", "Gm7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"], 140)
add("round-midnight", "Round Midnight", "Thelonious Monk", 1944, "Ebm", "32-bar AABA", aaba(
    ["Ebm7", "Ebm7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Db7", "Gb7"],
    ["Fm7b5", "Bb7", "Ebm7", "Ebm7", "Abm7", "Db7", "Gbmaj7", "Bb7"]), 60)
add("well-you-neednt", "Well You Needn't", "Thelonious Monk", 1944, "F", "32-bar AABA", aaba(
    ["F7", "F7", "Gb7", "Gb7", "F7", "F7", "Gb7", "Gb7"],
    ["Bb7", "Bb7", "B7", "B7", "C7", "C7", "Db7", "C7"]), 160)
add("monk-dream", "Monk's Dream", "Thelonious Monk", 1952, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Eb7", "Eb7", "Bbmaj7", "G7", "Cm7", "F7"],
    ["Bbmaj7", "Ab7", "Dbmaj7", "Gb7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 140)
add("misterioso", "Misterioso", "Thelonious Monk", 1948, "Bb", "12-bar blues", blues12("Bb7", "Eb7", "F7"), 100)
add("in-walked", "In Walked Bud", "Thelonious Monk", 1947, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 160)
add("ruby", "Ruby, My Dear", "Thelonious Monk", 1947, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Gm7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 70)
add("ask-me-now", "Ask Me Now", "Thelonious Monk", 1951, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "Ab7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"]), 60)
add("epistrophy", "Epistrophy", "Thelonious Monk", 1942, "Db", "32-bar AABA", aaba(
    ["Db7", "Db7", "D7", "D7", "Eb7", "Eb7", "E7", "E7"],
    ["Db7", "D7", "Eb7", "E7", "F7", "Gb7", "F7", "E7"]), 140)
add("evidence", "Evidence", "Thelonious Monk", 1948, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Cm7 F7", "Bbmaj7", "Cm7 F7", "Bbmaj7 Bb7", "Ebmaj7 Ebm7", "Dm7 G7", "Cm7 F7"],
    ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"]), 180)
add("played-twice", "Played Twice", "Thelonious Monk", 1959, "Bb", "16-bar", [
    "Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7",
    "Bbmaj7", "G7", "Cm7", "F7", "Bbmaj7", "Cm7 F7", "Bbmaj7", "Bbmaj7"], 140)
add("bright-mississippi", "Bright Mississippi", "Thelonious Monk", 1962, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "G7", "G7", "C7", "C7", "F7", "F7"],
    ["Bbmaj7", "Bb7", "Ebmaj7", "Ebm7", "Dm7", "G7", "Cm7", "F7"]), 180)
add("caravan", "Caravan", "Juan Tizol", 1936, "Fm", "32-bar AABA", aaba(
    ["Fm7", "Fm7", "Fm7", "Fm7", "Bbm7", "Eb7", "Abmaj7", "Db7"],
    ["Gm7b5", "C7", "Fm7", "Fm7", "Db7", "C7", "Fm7", "C7"]), 140)
add("perdido", "Perdido", "Juan Tizol", 1942, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Bbmaj7", "Bbmaj7", "G7", "G7", "Cm7", "F7"],
    ["Bbmaj7", "D7", "Gm7", "C7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 160)
add("mellow-tone", "In a Mellow Tone", "Duke Ellington", 1939, "Ab", "32-bar AABA", aaba(
    ["Abmaj7", "Abmaj7", "Db7", "Db7", "Abmaj7", "F7", "Bb7", "Eb7"],
    ["Abmaj7", "Abmaj7", "Dbmaj7", "Dbmaj7", "Abmaj7", "Eb7", "Abmaj7", "Abmaj7"]), 120)
add("dont-get-around", "Don't Get Around Much Anymore", "Duke Ellington", 1942, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "A7", "A7", "D7", "D7", "G7", "G7"],
    ["Cmaj7", "C7", "Fmaj7", "Fm7", "Cmaj7", "A7", "Dm7", "G7"]), 110)
add("do-nothin", "Do Nothin' Till You Hear from Me", "Duke Ellington", 1943, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Cm7", "F7", "Bbmaj7", "Gm7", "Cm7", "F7"],
    ["Bbmaj7", "D7", "Gm7", "C7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 90)
add("just-squeeze", "Just Squeeze Me", "Duke Ellington", 1941, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "D7", "D7", "G7", "G7", "C7", "C7"],
    ["Fmaj7", "A7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 110)
add("it-dont-mean", "It Don't Mean a Thing", "Duke Ellington", 1932, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Bbmaj7", "Bbmaj7", "Eb7", "Eb7", "Bbmaj7", "Bbmaj7"],
    ["F7", "F7", "Bbmaj7", "G7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 160)
add("mood-indigo", "Mood Indigo", "Duke Ellington", 1930, "Bb", "16-bar", [
    "Bbmaj7", "Bbmaj7", "Eb7", "Eb7", "Bbmaj7", "Bbmaj7", "G7", "G7", "C7", "C7", "F7", "F7", "Bbmaj7", "G7", "C7", "F7"], 80)
add("solitude", "Solitude", "Duke Ellington", 1934, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7", "Gm7", "C7"],
    ["Fm7", "Bb7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 70)
add("prelude", "Prelude to a Kiss", "Duke Ellington", 1938, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Dm7", "Em7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ["Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 70)
add("sophisticated", "Sophisticated Lady", "Duke Ellington", 1933, "Ab", "32-bar AABA", aaba(
    ["Abmaj7", "Abmaj7", "Dbmaj7", "Dbmaj7", "Abmaj7", "F7", "Bb7", "Eb7"],
    ["Abmaj7", "Bbm7", "Eb7", "Abmaj7", "Dbmaj7", "Eb7", "Abmaj7", "Abmaj7"]), 70)
add("i-let-a-song", "I Let a Song Go Out of My Heart", "Duke Ellington", 1938, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 140)
add("take-five", "Take Five", "Paul Desmond", 1959, "Dm", "16-bar", [
    "Dm7", "Dm7", "Dm7", "Dm7", "Gm7", "Gm7", "Dm7", "Dm7", "A7", "A7", "Dm7", "Dm7", "Gm7", "A7", "Dm7", "Dm7"], meter=5, tempo=176)
add("blue-rondo", "Blue Rondo a la Turk", "Dave Brubeck", 1959, "F", "24-bar", [
    "Fmaj7", "Fmaj7", "Fmaj7", "Bbmaj7", "Bbmaj7", "Bbmaj7", "Fmaj7", "Fmaj7",
    "C7", "C7", "C7", "Fmaj7", "Fmaj7", "Fmaj7", "Bbmaj7", "Bbmaj7",
    "Fmaj7", "C7", "Fmaj7", "Fmaj7", "C7", "C7", "Fmaj7", "Fmaj7"], meter=4, tempo=180)
add("in-your-own", "In Your Own Sweet Way", "Dave Brubeck", 1952, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "G7", "Cm7", "F7"]), 120)
add("the-duke", "The Duke", "Dave Brubeck", 1955, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "E7", "E7", "Am7", "D7", "Dm7", "G7"],
    ["Cmaj7", "Gm7", "C7", "Fmaj7", "Fm7", "Bb7", "Em7", "A7"]), 120)
add("alice", "Alice in Wonderland", "Sammy Fain", 1951, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "C7", "Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7"]), 120)
add("someday", "Someday My Prince Will Come", "Frank Churchill", 1937, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Ebmaj7", "Ebmaj7", "Bbmaj7", "Gm7", "Cm7", "F7"],
    ["Bbmaj7", "D7", "Gm7", "C7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), meter=3, tempo=140)
add("my-favorite", "My Favorite Things", "Richard Rodgers", 1959, "Em", "32-bar AABA", aaba(
    ["Em7", "Em7", "Em7", "Em7", "Am7", "D7", "Gmaj7", "Gmaj7"],
    ["Em7", "F#m7b5", "B7", "Em7", "Am7", "D7", "Em7", "Em7"]), meter=3, tempo=160)
add("my-ship", "My Ship", "Kurt Weill", 1941, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "Dm7", "Gm7", "C7"],
    ["Fmaj7", "D7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]), 80)
add("september", "September Song", "Kurt Weill", 1938, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "E7", "E7", "Am7", "D7", "Dm7", "G7"],
    ["Cmaj7", "A7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"]), 70)
add("speak-low", "Speak Low", "Kurt Weill", 1943, "G", "32-bar AABA", aaba(
    ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Bm7", "E7"],
    ["Am7", "D7", "Gmaj7", "E7", "Am7", "D7", "Gmaj7", "Gmaj7"]), 110)
add("my-foolish", "My Foolish Heart", "Victor Young", 1949, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "G7", "Cm7", "F7"]), 70)
add("when-i-fall", "When I Fall in Love", "Victor Young", 1952, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 72)
add("beautiful-love", "Beautiful Love", "Victor Young", 1931, "Dm", "32-bar AABA", aaba(
    ["Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7b5", "A7"],
    ["Dm7", "Gm7", "C7", "Fmaj7", "Em7b5", "A7", "Dm7", "Dm7"]), 140)
add("i-remember", "I'll Remember April", "Gene de Paul", 1942, "G", "32-bar AABA", aaba(
    ["Gmaj7", "Gmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Bm7", "E7"],
    ["Am7", "D7", "Gmaj7", "E7", "Am7", "D7", "Bm7", "E7"]), 140)
add("east-of", "East of the Sun", "Brooks Bowman", 1934, "G", "32-bar AABA", aaba(
    ["Gmaj7", "Gmaj7", "Am7", "D7", "Gmaj7", "Gmaj7", "F#m7", "B7"],
    ["Em7", "A7", "Am7", "D7", "Gmaj7", "E7", "Am7", "D7"]), 120)
add("you-stepped", "You Stepped Out of a Dream", "Nacio Herb Brown", 1940, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "C7", "Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7"]), 140)
add("i-remember-you", "I Remember You", "Victor Schertzinger", 1941, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Am7", "Dm7", "G7"],
    ["Gm7", "C7", "Fmaj7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 140)
add("laura", "Laura", "David Raksin", 1945, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Gm7", "C7", "Fmaj7"],
    ["Fm7", "Bb7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 80)
add("days-of-wine", "Days of Wine and Roses", "Henry Mancini", 1962, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Eb7", "Eb7", "D7", "D7", "Gm7", "C7"],
    ["Fmaj7", "Am7", "Dm7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 100)
add("moon-river", "Moon River", "Henry Mancini", 1961, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Am7", "Fmaj7", "Cmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ["Fmaj7", "Fm7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 80)
add("charade", "Charade", "Henry Mancini", 1963, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ["Cm7", "Abmaj7", "Fm7", "Bb7", "Ebmaj7", "G7", "Cm7", "Cm7"]), 110)
add("dreamsville", "Dreamsville", "Henry Mancini", 1959, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Bm7b5", "E7", "Am7", "Am7", "Am7", "D7"],
    ["Dm7", "G7", "Cmaj7", "Cmaj7", "Fmaj7", "Fm7", "Em7", "A7"]), 70)
add("two-for", "Two for the Road", "Henry Mancini", 1967, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
    ["Fmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 80)
add("watch-what", "Watch What Happens", "Michel Legrand", 1964, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abm7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 110)
add("what-are-you", "What Are You Doing the Rest of Your Life", "Michel Legrand", 1969, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Gm7", "Cm7", "F7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Db7", "Ebmaj7", "Gm7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 70)
add("the-windmills", "The Windmills of Your Mind", "Michel Legrand", 1968, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ["Cm7", "Abmaj7", "Bb7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "Cm7"]), 120)
add("call-me", "Call Me Irresponsible", "Jimmy Van Heusen", 1962, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "G7", "Cm7", "F7"]), 90)
add("second-time", "The Second Time Around", "Jimmy Van Heusen", 1960, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 80)
add("shadow", "The Shadow of Your Smile", "Johnny Mandel", 1965, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
    ["Fmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 80)
add("emily", "Emily", "Johnny Mandel", 1964, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7", "A7"],
    ["Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 80)
add("a-time", "A Time for Love", "Johnny Mandel", 1966, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ["D7", "G7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]), 70)
add("the-island", "The Island", "Ivan Lins", 1979, "Ab", "32-bar AABA", aaba(
    ["Abmaj7", "Abmaj7", "Gm7b5", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Dbmaj7", "Dbmaj7", "Cm7", "F7", "Bbm7", "Eb7", "Abmaj7", "Abmaj7"]), 90)
add("love-dance", "Love Dance", "Ivan Lins", 1981, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Bbmaj7", "G7", "Cm7", "F7"]), 100)
add("nunca", "Dindi", "Antonio Carlos Jobim", 1959, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 110)
add("fotografia", "Fotografia", "Antonio Carlos Jobim", 1959, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"]), 120)
add("agua", "Agua de Beber", "Antonio Carlos Jobim", 1963, "Am", "32-bar AABA", aaba(
    ["Am7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Bm7b5", "E7"],
    ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bm7b5", "E7", "Am7"]), 130)
add("chega", "Chega de Saudade", "Antonio Carlos Jobim", 1958, "Dm", "32-bar AABA", aaba(
    ["Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7b5", "A7"],
    ["Dm7", "Bbmaj7", "Em7b5", "A7", "Dm7", "Gm7", "A7", "Dm7"]), 120)
add("samba-de", "Samba de Uma Nota So", "Antonio Carlos Jobim", 1961, "Bb", "16-bar", [
    "Bbmaj7", "Bbmaj7", "Bdim7", "Cm7", "F7", "Bbmaj7", "D7", "Gm7", "C7", "Cm7", "F7", "Bbmaj7", "Gm7", "C7", "F7", "Bbmaj7"], 120)
add("wave", "Wave", "Antonio Carlos Jobim", 1967, "D", "32-bar AABA", aaba(
    ["Dmaj7", "Dmaj7", "Bm7", "E7", "Em7", "A7", "Dmaj7", "Dmaj7"],
    ["Gmaj7", "Gmaj7", "F#m7", "B7", "Em7", "A7", "Dmaj7", "Dmaj7"]), 110)
add("desfinado", "Desafinado", "Antonio Carlos Jobim", 1959, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"],
    ["Fmaj7", "Bbmaj7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "Fmaj7"]), 120)
add("once-i-loved", "Once I Loved", "Antonio Carlos Jobim", 1960, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Gm7", "Cm7", "F7", "Dm7b5", "G7", "Cm7", "F7"]), 90)
add("if-you-never", "If You Never Come to Me", "Antonio Carlos Jobim", 1963, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "G7", "Gm7", "C7"],
    ["Fmaj7", "D7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]), 90)
add("por-toda", "Por Toda a Minha Vida", "Antonio Carlos Jobim", 1963, "D", "16-bar", [
    "Dmaj7", "Dmaj7", "Bm7", "E7", "Em7", "A7", "Dmaj7", "Dmaj7", "Gmaj7", "F#m7", "B7", "Em7", "A7", "Dmaj7", "Em7", "A7"], 100)
add("o-grande", "O Grande Amor", "Antonio Carlos Jobim", 1963, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Gm7", "Am7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7"],
    ["D7", "G7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]), 100)
add("inutil", "Inutil Paisagem", "Antonio Carlos Jobim", 1963, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 80)
add("viva", "Vivo Sonhando", "Antonio Carlos Jobim", 1963, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Gm7", "Cm7", "F7"],
    ["Fm7", "Bb7", "Ebmaj7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 90)
add("ligia", "Ligia", "Antonio Carlos Jobim", 1972, "Bb", "32-bar AABA", aaba(
    ["Bbmaj7", "Bbmaj7", "Am7b5", "D7", "Gm7", "C7", "Cm7", "F7"],
    ["Bbmaj7", "Ebmaj7", "Edim7", "Bbmaj7", "Cm7", "F7", "Bbmaj7", "Bbmaj7"]), 90)
add("ansa", "Anos Dourados", "Antonio Carlos Jobim", 1973, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"]), 80)
add("eu-sei", "Eu Sei que Vou Te Amar", "Antonio Carlos Jobim", 1959, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "C7", "Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7"]), 80)
add("samba-em", "Samba em Preludio", "Baden Powell", 1962, "Am", "32-bar AABA", aaba(
    ["Am7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Bm7b5", "E7"],
    ["Am7", "Fmaj7", "Bm7b5", "E7", "Am7", "Dm7", "E7", "Am7"]), 90)
add("berimbau", "Berimbau", "Baden Powell", 1963, "Am", "16-bar", [
    "Am7", "Am7", "Am7", "Am7", "Dm7", "Dm7", "Am7", "Am7", "E7", "E7", "Am7", "Am7", "Dm7", "E7", "Am7", "Am7"], 110)
add("canto", "Canto de Ossanha", "Baden Powell", 1966, "Dm", "16-bar", [
    "Dm7", "Dm7", "Dm7", "Dm7", "Gm7", "Gm7", "Dm7", "Dm7", "A7", "A7", "Dm7", "Dm7", "Gm7", "A7", "Dm7", "Dm7"], 100)
add("manha", "Manha de Carnaval", "Luiz Bonfa", 1959, "Am", "32-bar AABA", aaba(
    ["Am7", "Am7", "Dm7", "G7", "Cmaj7", "Cmaj7", "Bm7b5", "E7"],
    ["Am7", "Fmaj7", "Bm7b5", "E7", "Am7", "E7", "Am7", "Am7"]), 120)
add("samba-do", "Samba do Aviao", "Antonio Carlos Jobim", 1963, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 130)
add("ela-e", "Ela e Carioca", "Antonio Carlos Jobim", 1963, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ["Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 120)
add("so-em", "So em Teus Bracos", "Antonio Carlos Jobim", 1964, "F", "16-bar", [
    "Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7", "Fmaj7", "D7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"], 90)
add("voce", "Voce e Eu", "Carlos Lyra", 1961, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7"]), 110)
add("coisa", "Coisa Mais Linda", "Carlos Lyra", 1963, "Eb", "32-bar AABA", aaba(
    ["Ebmaj7", "Ebmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"],
    ["Abmaj7", "Abmaj7", "Gm7", "C7", "Fm7", "Bb7", "Ebmaj7", "Ebmaj7"]), 100)
add("minha", "Minha Saudade", "Joao Donato", 1962, "Cm", "32-bar AABA", aaba(
    ["Cm7", "Cm7", "Fm7", "Bb7", "Ebmaj7", "Ab7", "Dm7b5", "G7"],
    ["Cm7", "Abmaj7", "Bb7", "Ebmaj7", "Abmaj7", "G7", "Cm7", "Cm7"]), 100)
add("amazonas", "Amazonas", "Joao Donato", 1970, "Am", "16-bar", [
    "Am7", "Am7", "Am7", "Am7", "Dm7", "Dm7", "Am7", "Am7", "E7", "E7", "Am7", "Am7", "Dm7", "E7", "Am7", "Am7"], 110)
add("a-ra", "A Ra", "Joao Donato", 1970, "F", "16-bar", [
    "Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7", "D7", "G7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Gm7", "C7", "Fmaj7", "Fmaj7"], 110)
add("sim-nao", "Se e Tarde Me Perdoa", "Carlos Lyra", 1961, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Em7", "Am7", "D7"],
    ["Dm7", "G7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 100)
add("lobo", "Lobo Bobo", "Carlos Lyra", 1959, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Dm7", "G7", "Em7", "A7", "Dm7", "G7"],
    ["Cmaj7", "C7", "Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7"]), 130)
add("influencia", "Influencia do Jazz", "Carlos Lyra", 1962, "F", "32-bar AABA", aaba(
    ["Fmaj7", "Fmaj7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"],
    ["Fmaj7", "D7", "Gm7", "C7", "Am7", "D7", "Gm7", "C7"]), 140)
add("sambo", "Saudade Fez um Samba", "Carlos Lyra", 1959, "Dm", "32-bar AABA", aaba(
    ["Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7b5", "A7"],
    ["Dm7", "Gm7", "C7", "Fmaj7", "Bbmaj7", "E7", "A7", "Dm7"]), 110)
add("primavera", "Primavera", "Carlos Lyra", 1964, "C", "32-bar AABA", aaba(
    ["Cmaj7", "Cmaj7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    ["Fmaj7", "Fm7", "Cmaj7", "A7", "Dm7", "G7", "Cmaj7", "Cmaj7"]), 120)
add("marcha", "Marcha da Quarta-Feira de Cinzas", "Carlos Lyra", 1963, "Dm", "16-bar", [
    "Dm7", "Dm7", "Gm7", "C7", "Fmaj7", "Fmaj7", "Em7b5", "A7", "Dm7", "Gm7", "C7", "Fmaj7", "Em7b5", "A7", "Dm7", "Dm7"], 100)
add("voce-e", "Voce e Eu Samba", "Carlos Lyra", 1961, "G", "16-bar", [
    "Gmaj7", "Gmaj7", "Am7", "D7", "Bm7", "E7", "Am7", "D7", "Gmaj7", "E7", "Am7", "D7", "Gmaj7", "Am7", "D7", "Gmaj7"], 120)
