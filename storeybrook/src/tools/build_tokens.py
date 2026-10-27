"""Storeybrook 1 tokens: one source of values, written the way the Design System page reads them, then a contrast audit.

Six looks share one set of names. Meta Daylight is the default; Knight Night takes its paper theatre from the
Cobalt Gray color study; Ink Blot is the e-ink and print look; Comix, Origami and Skein silk are skins a game
can unlock. Every look keeps the same roles, so a page never changes its markup to change its look.
"""
import json, os, re

OUT = os.path.join(os.path.dirname(__file__), "..", "project", "tokens.json")
THEMES = [("daylight", "Meta Daylight"), ("knight", "Knight Night"), ("inkblot", "Ink Blot"),
          ("comix", "Comix"), ("origami", "Origami"), ("skein", "Skein silk")]
TID = [t for t, _ in THEMES]
DARK = {"knight"}


def hx(c):
    c = c.lstrip("#"); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
def tohex(t): return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in t)
def mix(a, b, k):  # k of a over b
    A, B = hx(a), hx(b); return tohex([A[i] * k + B[i] * (1 - k) for i in range(3)])
def T(**kw): return {t: kw[t] for t in TID}

# ---------- paper, ink and lines ----------
N = {
    "paper":        T(daylight="#f4f6f2", knight="#1c2838", inkblot="#ffffff", comix="#fffdf5", origami="#eceef0", skein="#f6ecee"),
    "surface":      T(daylight="#e9eee7", knight="#24334a", inkblot="#f0f0f0", comix="#fff3c4", origami="#e0e5e9", skein="#eee0e4"),
    "page":         T(daylight="#ffffff", knight="#2a3a52", inkblot="#ffffff", comix="#ffffff", origami="#ffffff", skein="#fffafb"),
    "line":         T(daylight="#cdd5ca", knight="#3d4f6b", inkblot="#767676", comix="#111111", origami="#b8c1c8", skein="#dcc3ca"),
    "ink":          T(daylight="#26323f", knight="#f4efe6", inkblot="#000000", comix="#111111", origami="#1f2a33", skein="#3a2330"),
    "ink-muted":    T(daylight="#55616c", knight="#b7c2d2", inkblot="#3d3d3d", comix="#3a3a3a", origami="#4c5965", skein="#6b4f5c"),
}
# ---------- pigments: a hue keeps its name in every look (text-safe shade on that look's paper) ----------
P = {
    "rose":     T(daylight="#b8325f", knight="#f29fb0", inkblot="#000000", comix="#c7006a", origami="#b8311a", skein="#93305a"),
    "cerulean": T(daylight="#2a6a9c", knight="#8fb4e8", inkblot="#000000", comix="#00669e", origami="#2a4c86", skein="#2f5f8a"),
    "sap":      T(daylight="#44702a", knight="#a9d98a", inkblot="#000000", comix="#22722e", origami="#1f6f68", skein="#1a6e56"),
    "gamboge":  T(daylight="#d4920f", knight="#f0c75e", inkblot="#000000", comix="#ffd400", origami="#d99a12", skein="#c98a2a"),
    "copper":   T(daylight="#8c5a2b", knight="#e3b27a", inkblot="#000000", comix="#8a4a10", origami="#8a5a2a", skein="#9c4d1c"),
}
# soft grounds behind a pigment's text: the pigment thinned over the paper
def soft(h, t):
    if t == "inkblot": return "#e6e6e6"
    return mix(P[h][t], N["paper"][t], 0.22 if t in DARK else 0.09)
PS = {f"{h}-soft": {t: soft(h, t) for t in TID} for h in P}
ON = {f"on-{h}": T(daylight="#ffffff", knight="#1c2838", inkblot="#ffffff", comix="#ffffff" if h != "gamboge" else "#111111",
                   origami="#ffffff", skein="#ffffff") for h in P}
ON["on-gamboge"] = T(daylight="#26323f", knight="#1c2838", inkblot="#ffffff", comix="#111111", origami="#1f2a33", skein="#3a2330")

ACCENT = T(daylight="rose", knight="gamboge", inkblot="rose", comix="rose", origami="rose", skein="copper")
CUE = T(daylight="cerulean", knight="cerulean", inkblot="cerulean", comix="cerulean", origami="cerulean", skein="sap")
ROLES = {
    "accent":      {t: "{%s}" % ACCENT[t] for t in TID},
    "accent-soft": {t: "{%s-soft}" % ACCENT[t] for t in TID},
    "on-accent":   {t: "{on-%s}" % ACCENT[t] for t in TID},
    "cue":         {t: "{%s}" % CUE[t] for t in TID},
    "cue-soft":    {t: "{%s-soft}" % CUE[t] for t in TID},
    "on-cue":      {t: "{on-%s}" % CUE[t] for t in TID},
    "link":        {t: "{cue}" for t in TID},
}
STATE = {
    "danger": T(daylight="#b3261e", knight="#ff8a7a", inkblot="#000000", comix="#c4001d", origami="#b3261e", skein="#a3241e"),
    "focus":  T(daylight="#2a6a9c", knight="#f0c75e", inkblot="#000000", comix="#111111", origami="#2a4c86", skein="#93305a"),
    "scrim":  T(daylight="rgba(244, 246, 242, 0.86)", knight="rgba(28, 40, 56, 0.84)", inkblot="rgba(255, 255, 255, 0.94)",
                comix="rgba(255, 253, 245, 0.9)", origami="rgba(236, 238, 240, 0.88)", skein="rgba(246, 236, 238, 0.88)"),
    "chrome": T(daylight="rgba(255, 255, 255, 0.9)", knight="rgba(42, 58, 82, 0.9)", inkblot="rgba(255, 255, 255, 1)",
                comix="rgba(255, 255, 255, 0.96)", origami="rgba(255, 255, 255, 0.92)", skein="rgba(255, 250, 251, 0.92)"),
}
# ---------- washes: watercolor tints, never text; they mix where they overlap ----------
WASH = {
    "wash-sky":    T(daylight="#c8e3f4", knight="#2f4a6e", inkblot="#e2e2e2", comix="#7fd3f5", origami="#c9d8ee", skein="#d8e3f2"),
    "wash-meadow": T(daylight="#cfe3b8", knight="#2c4a3d", inkblot="#d6d6d6", comix="#9bdc8f", origami="#bfe0d8", skein="#cfe8dc"),
    "wash-rose":   T(daylight="#f3c6d3", knight="#5a3a52", inkblot="#dcdcdc", comix="#ff9fd0", origami="#f6c3b8", skein="#f2c6d2"),
    "wash-sun":    T(daylight="#f7dc97", knight="#6b5a2e", inkblot="#ececec", comix="#fff07a", origami="#f6dc9a", skein="#f5ddb8"),
    "wash-brook":  T(daylight="#8cc2e6", knight="#3d6a8c", inkblot="#bdbdbd", comix="#38b6ee", origami="#9ab6e0", skein="#a9c9e6"),
}
# ---------- art inks: lines and fills for the drawings (characters, nougats, stones) ----------
ART = {
    "art-line":    T(daylight="#2f3b48", knight="#0f1724", inkblot="#000000", comix="#111111", origami="#2a3540", skein="#3a2330"),
    "art-light":   T(daylight="#ffffff", knight="#f4efe6", inkblot="#ffffff", comix="#ffffff", origami="#ffffff", skein="#fffafb"),
    "art-shade":   T(daylight="#c7d3cf", knight="#16202e", inkblot="#bdbdbd", comix="#3a3a3a", origami="#c8cfd6", skein="#e3c9d0"),
    "art-stone":   T(daylight="#d9ddd4", knight="#4a5a73", inkblot="#f2f2f2", comix="#ffffff", origami="#ffffff", skein="#efe3dc"),
    "art-water":   T(daylight="#6fb0dc", knight="#5a8fbf", inkblot="#9e9e9e", comix="#00a8e8", origami="#5c86c9", skein="#86b4d8"),
    "nougat":      T(daylight="#f2dcb8", knight="#f2dcb8", inkblot="#ffffff", comix="#ffe8b0", origami="#f2dcb8", skein="#f6e2c4"),
    "nougat-nut":  T(daylight="#a8743f", knight="#c78e52", inkblot="#000000", comix="#8a4a10", origami="#a8743f", skein="#9c5a2a"),
    "wrapper":     T(daylight="#d94f7f", knight="#e87a9a", inkblot="#000000", comix="#ff3ea5", origami="#e2452c", skein="#c96a8a"),
}
TAG = {
    "tag-sun":   T(daylight="#8a5a00", knight="#f3cf8a", inkblot="#000000", comix="#7a5a00", origami="#7f5700", skein="#8a5418"),
    "tag-rose":  T(daylight="#a3304f", knight="#f29fb0", inkblot="#000000", comix="#b0005e", origami="#a8341c", skein="#93305a"),
    "tag-lilac": T(daylight="#6a4fa3", knight="#c4a2ff", inkblot="#000000", comix="#5b3fa0", origami="#5a4a9a", skein="#6a4a8a"),
    "tag-sea":   T(daylight="#1f6f5c", knight="#8ff0d2", inkblot="#000000", comix="#1d6e57", origami="#1f6f68", skein="#1a6e56"),
    "tag-sky":   T(daylight="#2a6a9c", knight="#8fb4e8", inkblot="#000000", comix="#00669e", origami="#2a4c86", skein="#2f5f8a"),
}

U = {
    "paper": "The page itself: the full-bleed background every look starts from. Grain and washes sit on it.",
    "surface": "One step off the paper: bands, the shelf's board, the read-aloud bar's track, a caption's label.",
    "page": "A sheet laid on the paper: book pages, cards, dialogs, the drawer. Deckled or taped, never a plain floating box.",
    "line": "Pencil lines: dividers, outlines of quiet controls, empty sticker slots. In Ink Blot and Comix it is a real border (3:1 or more).",
    "ink": "Story text and display type on paper, surface, page and scrim.",
    "ink-muted": "Second voice: captions, credits, hints, the price tag's small print. On paper, surface, page and scrim.",
    "accent": "THE accent: the one thing to do now (the primary button, the current stone, the open tab). Aliases the look's pigment. Text on paper, surface, page and accent-soft.",
    "accent-soft": "Thinned accent behind accent text: the selected row, the current word being read, a stone's halo.",
    "on-accent": "Label on an accent fill.",
    "cue": "The brook's color: links, the read-aloud highlight edge, 'tap', 'drag' and 'say it' hints, the path through the page.",
    "cue-soft": "Thinned cue: the word being read aloud, hover wash on links and rows.",
    "on-cue": "Label on a cue fill.",
    "link": "Inline links: alias of cue, with a wavy underline.",
    "danger": "Errors only, always with a word or an icon.",
    "focus": "Focus ring: 3px at 3px offset (5px on the TV density). 3:1 or more on every ground in every look.",
    "scrim": "Veil behind dialogs and over busy art under text.",
    "chrome": "Fixed bars: the read-aloud bar, the shelf's top bar.",
}
for h in P:
    U[h] = f"Pigment. {h.capitalize()} in every look, at its text-safe shade on that look's paper."
    U[f"{h}-soft"] = f"Thinned {h} over the paper: behind {h} text, a tinted row, a sticker's halo."
    U[f"on-{h}"] = f"Label on a {h} fill."
U["rose"] = "Pigment: quinacridone rose. The accent of Meta Daylight, Ink Blot (as black), Comix (magenta) and Origami (vermilion)."
U["cerulean"] = "Pigment: cerulean. The brook and every cue in most looks; indigo in Origami, cyan in Comix."
U["sap"] = "Pigment: sap green. Growth and success: an unlocked stone, a found thing. The cue of Skein silk (the mint cardigan)."
U["gamboge"] = "Pigment: new gamboge. Sun, stars and nougat glints; the candle accent of Knight Night. Below text contrast on light papers: fills, marks and 24px+ type only there."
U["copper"] = "Pigment: copper. Thread, braids and the accent of Skein silk."
U.update({
    "wash-sky": "Watercolor wash: the sky at the top of a page. Decorative only, never under small text without a scrim.",
    "wash-meadow": "Watercolor wash: the meadow at the foot of a page.",
    "wash-rose": "Watercolor wash: blush behind a character or a reward.",
    "wash-sun": "Watercolor wash: the sun's halo, a nougat's glow.",
    "wash-brook": "Watercolor wash: the brook's broad stroke (the cue line rides inside it).",
    "art-line": "Ink line of every drawing: characters, nougats, stones, icons drawn large.",
    "art-light": "Highlights in drawings: the catchlight, the shine on a wrapper.",
    "art-shade": "Shadow fill in drawings, and the shadow under a stone.",
    "art-stone": "A stepping stone's top.",
    "art-water": "Water inside drawings: ripples, the brook's sparkle dashes.",
    "nougat": "The nougat itself (the reward).",
    "nougat-nut": "Nuts in the nougat; caramel lines.",
    "wrapper": "The nougat's twist wrapper.",
    "tag-sun": "Categorical tag (first of five: sun, rose, lilac, sea, sky). Text and dot on paper and page; fill is this at 12%.",
    "tag-rose": "Categorical tag. Text and dot on paper and page.",
    "tag-lilac": "Categorical tag. Text and dot on paper and page.",
    "tag-sea": "Categorical tag. Text and dot on paper and page.",
    "tag-sky": "Categorical tag. Text and dot on paper and page.",
})

COLORS = []
def add(name, val, usage): COLORS.append({"name": name, "value": val, "usage": usage})
for k in ["paper", "surface", "page", "line", "ink", "ink-muted"]: add(k, N[k], U[k])
for k in ["accent", "accent-soft", "on-accent", "cue", "cue-soft", "on-cue", "link"]: add(k, ROLES[k], U[k])
for k in ["danger", "focus", "scrim", "chrome"]: add(k, STATE[k], U[k])
for h in P:
    add(h, P[h], U[h]); add(f"{h}-soft", PS[f"{h}-soft"], U[f"{h}-soft"]); add(f"on-{h}", ON[f"on-{h}"], U[f"on-{h}"])
for k in WASH: add(k, WASH[k], U[k])
for k in ART: add(k, ART[k], U[k])
for k in TAG: add(k, TAG[k], U[k])

FAM = {
    "display": "\"DynaPuff\", \"Arial Rounded MT Bold\", \"Trebuchet MS\", system-ui, sans-serif",
    "story": "\"Alegreya\", \"Iowan Old Style\", \"Palatino Linotype\", Georgia, serif",
    "ui": "\"Andika\", \"Segoe UI\", ui-sans-serif, system-ui, sans-serif",
    "old": "\"IM Fell English\", \"Iowan Old Style\", Georgia, serif",
    "comic": "\"Bangers\", \"Impact\", \"Arial Black\", sans-serif",
    "comic-text": "\"Comic Neue\", \"Comic Sans MS\", \"Chalkboard SE\", sans-serif",
    "fold": "\"Zen Maru Gothic\", \"Hiragino Maru Gothic ProN\", \"Arial Rounded MT Bold\", sans-serif",
    "hand": "\"Caveat\", \"Bradley Hand\", \"Segoe Print\", cursive",
}
TYPE = {"fonts": [], "families": FAM, "groups": [
    {"name": "Display", "family": "display", "styles": [
        {"name": "display-xl", "fontSize": "112px", "lineHeight": 0.92, "fontWeight": 600, "letterSpacing": "-0.02em", "sample": "Little games", "usage": "One per page: the title on the paper. clamp(56px, 9vw, 112px); never all caps. The look swaps the family (Knight Night and Ink Blot: IM Fell English; Comix: Bangers; Origami: Zen Maru Gothic; Skein silk: Caveat)."},
        {"name": "display-l", "fontSize": "72px", "lineHeight": 0.95, "fontWeight": 600, "letterSpacing": "-0.015em", "sample": "The brook bends", "usage": "Chapter titles. clamp(40px, 6vw, 72px)."},
        {"name": "display-m", "fontSize": "44px", "lineHeight": 1.05, "fontWeight": 500, "letterSpacing": "-0.01em", "sample": "A nougat for you", "usage": "Section titles, game titles on covers, dialog headings. clamp(30px, 3.6vw, 44px)."},
        {"name": "display-s", "fontSize": "28px", "lineHeight": 1.1, "fontWeight": 500, "sample": "Wake the doll", "usage": "Card titles, sticker names, the price on a tag."},
    ]},
    {"name": "Story", "family": "story", "styles": [
        {"name": "story-lede", "fontSize": "26px", "lineHeight": 1.45, "fontWeight": 400, "sample": "The brook went on without asking, so Dora went with it.", "usage": "The first paragraph of a page, and read-aloud text on covers. clamp(20px, 2vw, 26px); 34em max."},
        {"name": "story-body", "fontSize": "20px", "lineHeight": 1.6, "fontWeight": 400, "sample": "Each stone was warm from the sun, and each one hummed a little when you stood on it.", "usage": "Story text on book pages. clamp(18px, 1.2vw + 12px, 22px); 60ch max."},
        {"name": "story-italic", "fontSize": "20px", "lineHeight": 1.6, "fontWeight": 400, "fontStyle": "italic", "sample": "said the octopus, mostly to herself", "usage": "Asides, speech tags, the narrator's voice in a balloon."},
        {"name": "dropcap", "fontSize": "96px", "lineHeight": 0.8, "fontWeight": 700, "sample": "O", "usage": "The illuminated first letter of a chapter (DropCap), sitting on a wash blot."},
    ]},
    {"name": "Interface", "family": "ui", "styles": [
        {"name": "title", "fontSize": "22px", "lineHeight": 1.3, "fontWeight": 700, "sample": "Read it to me", "usage": "Panel, dialog and drawer titles."},
        {"name": "button", "fontSize": "18px", "lineHeight": 1.2, "fontWeight": 700, "sample": "Play this one", "usage": "Buttons and tabs. Sentence case, a verb first."},
        {"name": "label", "fontSize": "16px", "lineHeight": 1.4, "fontWeight": 400, "sample": "Voice: Moira, Irish English", "usage": "Field labels, menu items, the read-aloud bar."},
        {"name": "small", "fontSize": "14px", "lineHeight": 1.4, "fontWeight": 400, "sample": "Plays free while prices are a preview", "usage": "Fine print and credits. Never below 14px; 18px on the TV density."},
        {"name": "count", "fontSize": "20px", "lineHeight": 1, "fontWeight": 700, "sample": "12", "usage": "Counters: the nougat jar, stones walked, stickers found. tabular-nums."},
    ]},
    {"name": "Hand", "family": "hand", "styles": [
        {"name": "note", "fontSize": "26px", "lineHeight": 1.15, "fontWeight": 500, "sample": "try the far stone!", "usage": "Margin notes, a hint written beside a drawing, the label on a jar. Short: five words or fewer."},
    ]},
    {"name": "Comix", "family": "comic", "styles": [
        {"name": "comic-shout", "fontSize": "64px", "lineHeight": 0.95, "fontWeight": 400, "letterSpacing": "0.01em", "sample": "Kaplunk", "usage": "Comix only: sound words and panel titles."},
        {"name": "balloon", "family": "comic-text", "fontSize": "19px", "lineHeight": 1.35, "fontWeight": 700, "sample": "Is that a nougat in the brook?", "usage": "Speech balloon text in every look (Comix sets every UI label in it too)."},
    ]},
]}

SPACING = [("space-1", "4px", "Icon to label."), ("space-2", "8px", "Tight stacks: a title and its line."), ("space-3", "12px", "Inside chips and tags; between a tag and the price."),
           ("space-4", "16px", "Phone gutter; card padding."), ("space-5", "24px", "Paragraph gap; button padding inline."), ("space-6", "32px", "Desktop gutter; between cards on a bank."),
           ("space-7", "48px", "Between a title block and its story."), ("space-8", "72px", "Between groups on a page."), ("space-9", "112px", "Between pages of a scrolling story."),
           ("space-10", "168px", "Between banks of the brook on wide screens.")]
RADIUS = [("radius-none", "0", "Full-bleed art and comic panels."), ("radius-sm", "6px", "Tags and small labels."), ("radius-md", "12px", "Fields, rows, small cards."),
          ("radius-lg", "20px", "Pages, dialogs, the drawer."), ("radius-xl", "32px", "Big rounded tiles and the read-aloud bar."), ("radius-pill", "999px", "Buttons, chips, the brook's stones.")]

SHADOW = [
    ("shadow-page", T(daylight="0 1px 0 rgba(38, 50, 63, 0.06), 0 10px 30px rgba(38, 50, 63, 0.10)", knight="0 1px 0 rgba(0, 0, 0, 0.3), 0 14px 40px rgba(5, 10, 20, 0.45)",
                      inkblot="0 0 0 1px #000000", comix="4px 4px 0 #111111", origami="0 1px 0 rgba(31, 42, 51, 0.08), 0 8px 24px rgba(31, 42, 51, 0.12)",
                      skein="0 1px 0 rgba(58, 35, 48, 0.06), 0 10px 30px rgba(58, 35, 48, 0.10)"),
     "A sheet resting on the paper: pages, cards, dialogs. Ink Blot swaps it for a 1px black edge; Comix for a hard offset."),
    ("shadow-lift", T(daylight="0 18px 40px rgba(38, 50, 63, 0.18)", knight="0 22px 50px rgba(5, 10, 20, 0.6)", inkblot="0 0 0 2px #000000",
                      comix="7px 7px 0 #111111", origami="0 18px 40px rgba(31, 42, 51, 0.2)", skein="0 18px 40px rgba(58, 35, 48, 0.18)"),
     "A sheet picked up: a focused or hovered cover, a dragged page."),
    ("shadow-sticker", T(daylight="0 2px 0 rgba(38, 50, 63, 0.15), 0 6px 14px rgba(38, 50, 63, 0.14)", knight="0 2px 0 rgba(0, 0, 0, 0.4), 0 8px 18px rgba(0, 0, 0, 0.45)",
                         inkblot="0 0 0 1px #000000", comix="3px 3px 0 #111111", origami="0 2px 0 rgba(31, 42, 51, 0.15), 0 6px 14px rgba(31, 42, 51, 0.14)",
                         skein="0 2px 0 rgba(58, 35, 48, 0.12), 0 6px 14px rgba(58, 35, 48, 0.12)"),
     "Stickers, price tags and seals: a thin rim and a short drop."),
    ("shadow-seal", T(daylight="inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 6px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(38, 50, 63, 0.25)",
                      knight="inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 6px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.5)",
                      inkblot="0 0 0 2px #000000", comix="3px 3px 0 #111111",
                      origami="inset 0 2px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 6px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(31, 42, 51, 0.25)",
                      skein="inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -3px 6px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(58, 35, 48, 0.25)"),
     "The wax seal's emboss (primary buttons in Meta Daylight, the Seal component)."),
    ("shadow-ink", T(daylight="0 1px 0 rgba(255, 255, 255, 0.7)", knight="0 2px 12px rgba(0, 0, 0, 0.6)", inkblot="0 0 0 rgba(0, 0, 0, 0)",
                     comix="2px 2px 0 #ffffff", origami="0 1px 0 rgba(255, 255, 255, 0.7)", skein="0 1px 0 rgba(255, 255, 255, 0.7)"),
     "text-shadow for display type laid over a wash or a drawing."),
]

OTHER = {
    "zIndex": [("z-art", "0", "Washes, the brook and drawings."), ("z-content", "10", "Pages and story text."), ("z-stone", "20", "Stones and hotspots over art."),
               ("z-sticky", "40", "The shelf's top bar and chapter tabs."), ("z-reader", "50", "The read-aloud bar."), ("z-drawer", "60", "The drawer and its veil."),
               ("z-overlay", "1000", "Dialogs and the sticker reveal."), ("z-drop", "2000", "A nougat in flight to the jar.")],
    "duration": [("dur-tap", "120ms", "Press and release."), ("dur-quick", "220ms", "Hover lifts, a focus ring arriving."), ("dur-base", "420ms", "Dialogs, drawers, a sticker peeling in."),
                 ("dur-turn", "700ms", "A page turn or a fold."), ("dur-drop", "900ms", "A nougat's flight to the jar."), ("dur-bleed", "1600ms", "A wash blooming in, the brook drawing itself once.")],
    "easing": [("ease-out", "cubic-bezier(0.2, 0.9, 0.3, 1)", "Things that arrive: dialogs, stickers, a lifted cover."),
               ("ease-paper", "cubic-bezier(0.45, 0.05, 0.25, 1)", "Turns and folds: paper has weight at the start."),
               ("ease-bounce", "cubic-bezier(0.34, 1.56, 0.64, 1)", "A nougat landing in the jar, a stone hopped on. Once, never on a loop.")],
    "breakpoint": [("bp-medium", "640px", "Two banks of the brook; the read-aloud bar shows its voice name."),
                   ("bp-expanded", "1024px", "Book spreads show two pages; the shelf shows three covers a row."),
                   ("bp-wide", "1600px", "Wide and 4K: the fluid root size takes over (see size-root)."),
                   ("bp-tv", "1800px", "Big screens: with a remote or a gamepad the TV density switches on.")],
    "size": [("size-root", "clamp(16px, 0.42vw + 10px, 28px)", "The root font size: 16px on phones and laptops, growing on 4K and 5K screens so the page reads from a sofa. Everything else is in rem."),
             ("size-target", "48px", "Minimum target for anything pressable (64px on the TV density)."), ("size-stone", "56px", "A stepping stone's hit area on the brook."),
             ("size-cover", "260px", "A game cover's width on the shelf (portrait, 3:4)."), ("size-measure", "60ch", "Max line length for story text."),
             ("size-page", "680px", "One book page's max width; a spread is two."), ("size-reader", "560px", "The read-aloud bar's max width."),
             ("size-jar", "72px", "The nougat jar."), ("size-container", "1280px", "Max width of shelves and docs; washes and the brook keep going.")],
    "opacity": [("op-grain", "0.2", "Paper grain over grounds (multiply on light papers, soft light on Knight Night; off in Ink Blot)."),
                ("op-wash", "0.85", "A wash's peak opacity at its heart."), ("op-disabled", "0.45", "Locked or disabled controls (always with a reason nearby).")],
    "border": [("border-pencil", "1px", "Quiet outlines and dividers."), ("border-ink", "2px", "Inked outlines: secondary buttons, stones, the jar."),
               ("border-comix", "3px", "Comix panels and balloons."), ("border-focus", "3px", "Focus ring width (5px on the TV density)."), ("border-focus-offset", "3px", "Focus ring offset.")],
    "shape": [("shape-blob", "58% 42% 55% 45% / 46% 54% 46% 54%", "A wash blot or a sticker: never a perfect circle."),
              ("shape-stone", "52% 48% 46% 54% / 60% 58% 42% 40%", "A stepping stone's top."),
              ("shape-seal", "49% 51% 47% 53% / 52% 47% 53% 48%", "A wax seal's slightly uneven rim."),
              ("shape-tag", "6px 6px 6px 6px", "The price tag's body (the hole and string are drawn).")],
    "density": [("density-regular", "1", "Phones, tablets, laptops and hi-DPI desktops."),
                ("density-kid", "1.15", "Kids reading level: bigger story text and targets."),
                ("density-tv", "1.5", "The 53L TV and any remote or gamepad driven big screen: targets 64px+, focus 5px, one row of covers in focus.")],
    "texture": [("tex-grain-size", "160px", "Tile size of the paper grain."), ("tex-deckle", "6", "Displacement of a page's deckled edge, in px."),
                ("tex-bleed", "14", "How far a wash's edge wanders, in px."), ("tex-halftone", "6px", "Comix halftone dot pitch.")],
}


def tlist(rows): return {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in rows]}
tokens = {"name": "Storeybrook", "version": 1,
          "color": {"themes": [{"id": t, "name": n} for t, n in THEMES], "tokens": COLORS},
          "type": TYPE, "spacing": tlist(SPACING), "radius": tlist(RADIUS), "shadow": tlist(SHADOW)}
for k, rows in OTHER.items(): tokens[k] = tlist(rows)

# ---------- validate like the page does ----------
NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")
seen = set()
for fam, body in tokens.items():
    if fam in ("name", "version", "type"): continue
    for tok in body["tokens"]:
        assert NAME.match(tok["name"]), tok["name"]
        assert tok["name"] not in seen, "duplicate " + tok["name"]; seen.add(tok["name"])
        if fam not in ("color", "shadow"):
            assert re.match(r"^[A-Za-z0-9 #%(),./+_-]{1,200}$", tok["value"]), (tok["name"], tok["value"])
assert len([k for k in tokens if k not in ("name", "version", "color", "type", "spacing", "radius", "shadow")]) <= 12
for fam in OTHER: assert len(OTHER[fam]) <= 60
os.makedirs(os.path.dirname(OUT), exist_ok=True)

# ---------- contrast audit ----------
def resolve(name, t):
    v = next(x for x in COLORS if x["name"] == name)["value"]
    v = v.get(t, v.get(TID[0])) if isinstance(v, dict) else v
    m = re.match(r"^\{(.+)\}$", v)
    return resolve(m.group(1), t) if m else v
def rgba(v):
    if v.startswith("#"): return hx(v) + (1.0,)
    nums = [float(x) for x in re.findall(r"[\d.]+", v)]; return tuple(nums[:3]) + ((nums[3] if len(nums) > 3 else 1.0),)
def over(fg, bg): a = fg[3]; return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)
def lum(c):
    def ch(v): v /= 255; return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])
def cr(a, b): la, lb = lum(a), lum(b); return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
fails, rows = [], []
GROUNDS = ["paper", "surface", "page"]
for t in TID:
    g = [rgba(resolve(k, t)) for k in GROUNDS]
    washes = [over(rgba(resolve("scrim", t)), rgba(resolve(w, t))) for w in WASH]
    def chk(fg, grounds, need, label, names=None):
        f = rgba(resolve(fg, t)); rs = [cr(f, gg) for gg in grounds]; worst = min(rs)
        rows.append((t, label, round(worst, 2), need))
        if worst < need: fails.append((t, label, round(worst, 2), need, fg, [n for n, r in zip(names or [], rs) if r < need]))
    for fg in ["ink", "ink-muted", "accent", "cue", "link", "danger", "rose", "cerulean", "sap", "copper", "tag-sun", "tag-rose", "tag-lilac", "tag-sea", "tag-sky"]:
        chk(fg, g, 4.5, f"{fg} on grounds", GROUNDS)
    chk("gamboge", g, 4.5 if t in DARK else 1.0, "gamboge on grounds", GROUNDS)
    for fg in ["ink", "ink-muted"]: chk(fg, washes, 4.5, f"{fg} on scrim over washes")
    chk("ink", [rgba(resolve(w, t)) for w in WASH], 4.5, "ink straight on washes")
    chk("accent", [rgba(resolve("accent-soft", t))], 4.5, "accent on accent-soft")
    chk("ink", [rgba(resolve("cue-soft", t))], 4.5, "ink on cue-soft (word being read)")
    chk("on-accent", [rgba(resolve("accent", t))], 4.5, "on-accent on accent")
    chk("on-cue", [rgba(resolve("cue", t))], 4.5, "on-cue on cue")
    for h in P: chk(f"on-{h}", [rgba(resolve(h, t))], 4.5 if h != "gamboge" else 3.0, f"on-{h} on {h}")
    chk("focus", g, 3, "focus ring on grounds (it sits 3px off the control, on the ground)")
    if t in ("inkblot", "comix"): chk("line", g, 3, "line (borders) on grounds")
print(f"{len(COLORS)} colors · {sum(len(x['styles']) for x in TYPE['groups'])} type styles · " +
      " · ".join(f"{k} {len(v['tokens'])}" for k, v in tokens.items() if k not in ('name', 'version', 'type', 'color')))
print("contrast checks:", len(rows), "failures:", len(fails))
for f in fails: print("  FAIL", f[:4], f[5])
notes = {}
for t, label, worst, need, fg, bad in fails:
    if bad and "on grounds" in label: notes.setdefault(fg, []).append(f"{t} on {'/'.join(bad)} ({worst}:1)")
for tok in COLORS:
    if tok["name"] in notes:
        tok["usage"] += " Below 4.5:1 in " + "; ".join(notes[tok["name"]]) + ": there, 24px+ type, fills and marks only."
json.dump(tokens, open(OUT, "w"), indent=1, ensure_ascii=False)
json.dump(rows, open(os.path.join(os.path.dirname(__file__), "contrast.json"), "w"))
