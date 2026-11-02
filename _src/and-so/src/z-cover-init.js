// Conductor integration only; UI/runtime are preserved Grok outputs with documented lifecycle fixes.
// No unlock threshold is selected. Only trusted application code may configure this callback.
var COVER_PLAYER = null;
function coverSync() {
  if (!COVER_PLAYER) return;
  COVER_PLAYER.media.muted = !!(muted || paused);
  COVER_PLAYER.media.volume = Math.max(0, Math.min(1, Number(SET.vol) || 0));
  if (paused) COVER_PLAYER.pause();
  COVER_PLAYER.check();
}
var coverPanel = mountCoverPanel();
// Keep the source reference outside the collapsed local-media/reveal region.
var coverReference = coverPanel.querySelector('a');
if (coverReference) coverPanel.after(coverReference);
COVER_PLAYER = mountCoverPlayer(coverPanel, function (facts) {
  var requirement = window.ANDSO_COVER_REQUIREMENTS;
  return typeof requirement === 'function' && requirement(facts) === true;
});
coverPanel.addEventListener('click', coverSync);
coverPanel.addEventListener('change', coverSync);
coverSync();
