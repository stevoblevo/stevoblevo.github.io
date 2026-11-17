#!/usr/bin/env python3
"""Port AND SO 9's first steps and today's find onto the saelion.co line of AND SO (and-so/index.html in
saelion-relay-canary). Usage: port_first_steps.py <canary and-so/index.html> <github.io _src/and-so/src dir>"""
import sys
from pathlib import Path
target, src = Path(sys.argv[1]), Path(sys.argv[2])
s = target.read_text()
assert 'firstEvent(' not in s, 'already ported'
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (old[:70], c); s = s.replace(old, new)
module = (src / 'zz-first.js').read_text()
css_all = (src / 'style-sb.css').read_text()
css = css_all[css_all.index("/* ---------- first steps and today's find (AND SO 9) ---------- */"):]
# game hooks (the same edits AND SO 9 makes in d-game.js, e-input.js, p-brook.js and g-loop.js)
rep("  const e = CATI.get(id); if (!e) return;\n  if (REEL.on && !reelMay(id)) return;", "  const e = CATI.get(id); if (!e) return;\n  if (FIRST.on && !FIRST.touched) return;   // first steps: the first find waits for your own hand\n  if (REEL.on && !reelMay(id)) return;")
rep("  found.add(id); persistSoon(); renderGuide(id);\n", "  found.add(id); persistSoon(); renderGuide(id); todayHit(id);\n")
rep("function emit(ev, e) {\n  if (!entered) return;\n", "function emit(ev, e) {\n  if (!entered) return;\n  firstEvent(ev);\n  if (FIRST.on && !FIRST.touched) return;   // first steps: quests wait for your own hand too\n")
rep("  if (!draggedOnce) { draggedOnce = true; hideHint(); }\n  if (M.struck) { audio.strikeVoice(v, 0.9, 1);", "  if (!draggedOnce) { draggedOnce = true; hideHint(); }\n  firstEvent('grab');\n  if (M.struck) { audio.strikeVoice(v, 0.9, 1);")
rep("    const x = xFromS(px); hit = addVoice(x, { temp: 0 });\n", "    const x = xFromS(px); hit = addVoice(x, { temp: 0 }); if (hit) firstEvent('tap');\n")
rep("      const v = p.v; v.dragging = false; v.dragX = null; if (p.type === 'mouse') hitEl.style.cursor = 'grab';", "      const v = p.v; v.dragging = false; v.dragX = null; if (p.type === 'mouse') hitEl.style.cursor = 'grab'; firstEvent('release');")
rep("  else if (k === 'n') { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; }", "  else if (k === 'n') { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; firstEvent('next'); }")
rep("on('bNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; });", "on('bNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; firstEvent('next'); });")
rep("on('dNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; haptic(6); });", "on('dNext', () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; haptic(6); firstEvent('next'); });")
rep("function openBrook() {\n  const el = $('brookMap'); if (!el) return;\n", "function openBrook() {\n  const el = $('brookMap'); if (!el) return;\n  firstEvent('jar');\n")
rep("  if (SET.easyStart && !M.easy) setTimeout(", "  const firstVisit = firstWanted();   // a first visit gets first steps: a still ground, no panel, and the band afterwards\n  if (!firstVisit && SET.easyStart && !M.easy) setTimeout(")
rep("  if (!phone && MIR.depth === 0) setTimeout(() => showGw(false), 900);\n  setTimeout(() => { if (!draggedOnce) showHint(", "  if (!phone && MIR.depth === 0 && !firstVisit) setTimeout(() => showGw(false), 900);\n  if (firstVisit) firstStart(); else todayPaint();\n  if (!firstVisit) setTimeout(() => { if (!draggedOnce) showHint(")
rep("  if (entered && t - lastUserT > 30 && t > nextTryT && !$('hint').classList.contains('on'))", "  if (entered && !FIRST.on && t - lastUserT > 30 && t > nextTryT && !$('hint').classList.contains('on'))")
rep("  jarPaint(false); landing(); mirBoot();", "  jarPaint(false); landing(); landingNote(); mirBoot();")
# the module itself, ahead of boot()
rep("function boot(hotData) {\n", module.rstrip('\n') + "\nfunction boot(hotData) {\n")
# markup
rep('<div id="hint"></div>\n', '<div id="hint"></div>\n<div id="first" role="status" aria-live="polite"><div class="first-top"><span id="firstN"></span><button id="firstSkip" type="button">skip</button></div><p id="firstSay"></p><p id="firstSub"></p></div>\n<div id="firstRing" aria-hidden="true"></div>\n')
i = s.index('id="enterFine"'); j = s.index('</p>', i) + 4
s = s[:j] + '\n    <p class="fine today" id="ovToday" hidden></p>' + s[j:]
i = s.index('id="qList"'); k = s.rfind('<', 0, i)
s = s[:k] + '<p id="qToday" hidden></p>' + s[k:]
# styles: readable desktop controls, and the first-steps block at the end of the same style element
rep("#hud.on { opacity: .32 }", "#hud.on { opacity: .62 }\nbody.first #hud.on { opacity: 1 }")
i = s.index("#hud.on { opacity: .62 }"); j = s.index('</style>', i)
s = s[:j].rstrip('\n') + '\n' + css.rstrip('\n') + '\n' + s[j:]
target.write_text(s)
print('ported:', target, len(s), 'bytes')
