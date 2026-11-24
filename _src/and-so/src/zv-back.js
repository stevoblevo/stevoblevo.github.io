// ---------- back closes what is open; full screen ----------
// Bleve, 24 Nov 2026: "need to be able to go full screen on mobile and capture back button for closing menus instead
// of closing entire site". The phone's back button (and the browser's) now closes the topmost thing that is open. One
// spare history entry is kept while you play; each back press that closes something puts it back. With nothing open,
// the first back says so and the second leaves, so the site is never a trap.
const BACK = { armed: false, warnAt: -99 };
const BACK_LAYERS = [   // topmost first: is it open, and how it closes
  [() => DIFF.open, () => diffClose()],
  [() => $('versions').classList.contains('on'), () => versionsClose()],
  [() => BD.open, () => boardClose()],
  [() => $('liner').classList.contains('on'), () => $('liner').classList.remove('on')],
  [() => $('story').classList.contains('on'), () => closeStory()],
  [() => { const el = $('brookMap'); return !!el && el.classList.contains('on'); }, () => closeBrook()],
  [() => BOOK.open, () => bookClose()],
  [() => MIR.wins.length > 0, () => mirClose(MIR.wins[MIR.wins.length - 1])],
  [() => MIR.open, () => mirrorTable(false)],
  [() => JAM.on, () => jamStop()],
  [() => REEL.on, () => reelStop()],
  [() => phone && sheet.name !== 'peek', () => setSheet('peek')],
];
function backTop() { for (const [isOpen, close] of BACK_LAYERS) { try { if (isOpen()) return close; } catch (e) {} } return null; }
function backArm() { if (BACK.armed || !entered) return; try { history.pushState({ andso: 1 }, ''); BACK.armed = true; } catch (e) {} }
window.addEventListener('popstate', () => {
  if (!BACK.armed) return;
  BACK.armed = false;
  const close = backTop();
  if (close) { try { close(); } catch (e) {} backArm(); return; }
  if (performance.now() - BACK.warnAt > 3200) { BACK.warnAt = performance.now(); backArm(); caption('nothing open. back again leaves AND SO.', 3000); return; }
  history.back();   // the second back in a row, with nothing open: leave
});
// browsers only honour a history entry made after a touch or a key, so it is made (and remade) on those
window.addEventListener('pointerdown', backArm, true);
window.addEventListener('keydown', backArm, true);
window.addEventListener('click', () => setTimeout(backArm, 0));   // and after the tap that lets you in

// full screen: the real thing where the browser has it; on an iPhone, which has none for pages, say how to get it
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function fullToggle() {
  const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen, exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (fsEl()) { try { exit.call(document); } catch (e) {} return; }
  if (!req) { caption(navigator.standalone ? 'already full screen.' : 'on iPhone: Share, then Add to Home Screen. it opens full screen from there.', 5200); return; }
  try { const p = req.call(d, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => caption('this browser would not go full screen.', 3000)); } catch (e) { caption('this browser would not go full screen.', 3000); }
}
function fullPaint() { const b = $('tFull'); if (!b) return; const on = !!fsEl(); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'leave full screen' : 'full screen'); b.title = on ? 'leave full screen' : 'full screen'; }
document.addEventListener('fullscreenchange', fullPaint); document.addEventListener('webkitfullscreenchange', fullPaint);
on('tFull', fullToggle);
if (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) || navigator.standalone) { const b = $('tFull'); if (b) b.classList.add('hidden'); }   // installed: already full screen
