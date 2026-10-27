// The 99¢ Shelf: draw Saelion and the nougat, and make the shelf walkable with a TV remote or a keyboard's arrows.
(() => {
  const SB = window.Storeybrook; if (!SB) return;
  try { SB.ensureDefs(); } catch (e) {}
  document.querySelectorAll('[data-creature]').forEach(el => SB.creature(el, { form: 'saelion', stage: 4, mood: 'happy' }));
  document.querySelectorAll('[data-nougat]').forEach(el => { el.innerHTML = SB.nougatSVG(+el.dataset.nougat || 4); });
  let tv = false;
  try { tv = /[?&]tv=1\b/.test(location.search) || SB.density.isTV(); } catch (e) {}
  if (tv) { document.documentElement.dataset.density = 'tv'; SB.nav.enable(); const first = document.querySelector('.hero-actions a'); if (first) first.focus({ preventScroll: true }); }
  addEventListener('keydown', e => { if (e.key === 'Tab' && !SB.nav.on) SB.nav.enable(); });
})();
