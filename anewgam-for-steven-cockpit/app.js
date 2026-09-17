/* One doorway. Public shell; local state is never sent to a service. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const KEY = 'anewgam.steven.cockpit.v2';
  let state = {}, memoryOnly = false, captured = '', promptEvent = null;
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  if (typeof state !== 'object' || Array.isArray(state)) state = {};
  state.threads = Array.isArray(state.threads) ? state.threads.filter(t => t && typeof t.source === 'string') : [];
  state.receipts = Array.isArray(state.receipts) ? state.receipts.filter(r => r && typeof r === 'object') : [];
  state.blooms = Number.isFinite(Number(state.blooms)) ? Math.max(0, Number(state.blooms)) : 7;
  state.fruit = ['rose-gold Peach', 'cyan Pear', 'violet Plum'].includes(state.fruit) ? state.fruit : 'rose-gold Peach';
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 5000);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); memoryOnly = false; }
    catch { memoryOnly = true; toast('Storage unavailable. Changes are in this tab only; export a backup now.'); }
    $('#storageWarning').hidden = !memoryOnly;
    render(); window.dispatchEvent(new CustomEvent('anewgam:state'));
  }
  const record = event => { state.receipts.unshift({at: new Date().toISOString(), event, authorityEffect: 'none'}); state.receipts = state.receipts.slice(0, 500); };
  function hold(source) {
    try {
      const result = window.__saeIngress.append(localStorage, source, {world: 'cockpit'});
      state = result.state; memoryOnly = false;
      $('#storageWarning').hidden = true;
      render(); window.dispatchEvent(new CustomEvent('anewgam:state'));
      toast('Saved in your existing local loom. Nothing sent; no worker started.');
      return true;
    } catch (error) { toast(error.message || 'Could not save. Your input is still here.'); return false; }
  }
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    try { state = window.__saeIngress.read(localStorage); render(); window.dispatchEvent(new CustomEvent('anewgam:state')); }
    catch (error) { toast(error.message); }
  });
  window.__anewgam = {key: KEY, getState: () => state, setState: next => { state = next; save(); }, toast, hold};
  function render() {
    $('#fruitName').textContent = state.fruit; $('#bloomCount').textContent = state.blooms;
    $$('[data-fruit]').forEach(b => { b.classList.toggle('on', b.dataset.fruit === state.fruit); b.setAttribute('aria-pressed', String(b.dataset.fruit === state.fruit)); });
    const completed = state.threads.filter(t => t.status === 'proven').length;
    const percent = state.threads.length ? Math.round(completed / state.threads.length * 100) : 0;
    $('.mission .bar i').style.width = percent + '%';
    $('.mission-foot span').textContent = `${completed} / ${state.threads.length} outcomes recorded locally`;
    $('.pulse .status').textContent = state.threads.length ? 'LOCAL THREADS' : 'READY TO BEGIN';
    $('#navThreadCount').textContent = state.threads.length;
    $('#continueBtn').textContent = state.threads.length ? 'Open threads' : 'Begin a thread';
  }
  $('#dropForm').addEventListener('submit', e => {
    e.preventDefault(); captured = $('#dropInput').value;
    if (!captured.trim()) return toast('Drop a fragment first.');
    $('#interpretText').textContent = `“${captured}” — ready to hold exactly as written. No AI or remote execution is connected here.`;
    $('#interpret').classList.add('show'); $('#holdBtn').focus();
  });
  $('#dropInput').addEventListener('input', () => { captured = ''; $('#interpret').classList.remove('show'); });
  $('#holdBtn').addEventListener('click', () => {
    if (captured && hold(captured)) { captured = ''; $('#dropInput').value = ''; $('#interpret').classList.remove('show'); location.hash = 'loom'; }
  });
  $('#continueBtn').addEventListener('click', () => { if (state.threads.length) location.hash = 'loom'; else { location.hash = 'cockpit'; $('#dropInput').focus(); } });
  $$('[data-fruit]').forEach(b => b.addEventListener('click', () => { state.fruit = b.dataset.fruit; record('fruit-selected'); save(); }));
  $('#stageProjection').addEventListener('click', () => { if (hold('Aiden / Goober: prepare a #learntocode play projection for review. Do not send or cross into another world without permission.')) location.hash = 'loom'; });
  const dialog = $('#detailDialog');
  function detail(title, description) { $('#detailTitle').textContent = title; $('#detailText').textContent = description; dialog.showModal(); }
  $('#detailClose').addEventListener('click', () => dialog.close());
  $('#domainBoundary').addEventListener('click', () => detail('saelion.co · route boundary', 'This cockpit uses the existing GitHub Pages doorway. Naming saelion.co, a .local host or a sae:// route does not configure DNS, authenticate a device, or authorize an action. No DNS or device access is changed here.'));
  $$('[data-local]').forEach(b => b.addEventListener('click', () => detail(b.textContent, 'Named local destination, not connected from this public browser. No agent or authenticated device bridge is configured here. This control shows the boundary; it does not claim to connect.')));
  $('#installBtn').addEventListener('click', async () => {
    if (!promptEvent) return detail('Install this cockpit', 'Chrome / Edge: browser menu → Install app. iPhone / iPad Safari: Share → Add to Home Screen. If installation is unavailable, use the bookmarked doorway. Offline readiness is shown below; this does not install a local agent.');
    try { await promptEvent.prompt(); const result = await promptEvent.userChoice; toast(result.outcome === 'accepted' ? 'Installation accepted by this browser.' : 'Installation cancelled.'); } catch { toast('This browser could not open installation.'); }
    promptEvent = null;
  });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptEvent = e; });
  window.addEventListener('appinstalled', () => { $('#installBtn').textContent = 'Installed'; });
  function theme(value) {
    document.documentElement.dataset.theme = value;
    $('#themeToggle').textContent = value === 'light' ? '☾ Dark' : '☀ Light';
    $('#themeToggle').setAttribute('aria-label', value === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    $('meta[name="theme-color"]').content = value === 'light' ? '#f6f1e8' : '#071510';
    $('#gen2Hero').src = value === 'light' ? 'gen2-light.webp' : 'gen2-dark.webp';
  }
  theme(state.theme === 'light' ? 'light' : 'dark');
  $('#themeToggle').addEventListener('click', () => { state.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; theme(state.theme); save(); });
  function route() { const hash = location.hash || '#cockpit'; $$('[data-nav]').forEach(a => { if (a.hash === hash) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  window.addEventListener('hashchange', route); route();
  const items = window.__libraryItems || []; let filter = 'all';
  function renderLibrary() {
    const query = $('#librarySearch').value.toLowerCase().trim();
    const visible = items.filter(x => (filter === 'all' || (x.tags || []).includes(filter) || x.id.includes(filter)) && `${x.title} ${x.caption} ${(x.tags || []).join(' ')}`.toLowerCase().includes(query));
    $('#grid').replaceChildren(); $('#empty').style.display = visible.length ? 'none' : 'block';
    $('#libraryCount').textContent = `${visible.length} / ${items.length} plates`;
    for (const x of visible) {
      const card = document.createElement('article'); card.className = 'card'; card.dataset.id = x.id; card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', `Open ${x.title}`);
      const image = document.createElement('img'); image.className = 'thumb'; image.src = x.thumbnail || x.image; image.alt = x.alt || x.title; image.loading = 'lazy';
      const body = document.createElement('div'); body.className = 'body';
      for (const [tag, cls, text] of [['div','kicker',`${x.date} · ${x.status}`], ['h2','',x.title], ['p','caption',x.caption], ['div','meta',(x.tags || []).join(' · ')]]) {
        const el = document.createElement(tag); el.className = cls; el.textContent = text; body.append(el);
      }
      card.append(image, body); $('#grid').append(card);
    }
  }
  window.__setLibraryFilter = f => { filter = f || 'all'; $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter))); renderLibrary(); };
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => window.__setLibraryFilter(b.dataset.filter)));
  $('#librarySearch').addEventListener('input', renderLibrary);
  $('#open-gallery').addEventListener('click', () => { const card = $('#grid .card'); if (card) window.__openGallery(card.dataset.id); else toast('No plates match this search.'); });
  renderLibrary(); render();
  $('#updateApp').addEventListener('click', async () => {
    if (!('serviceWorker' in navigator)) return toast('Service workers are unavailable in this browser.');
    try { const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return toast('Offline worker not installed yet.'); await reg.update(); toast('Update check completed. Reload to load the latest published page.'); } catch { toast('Update check failed. Check your connection.'); }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(async reg => { await navigator.serviceWorker.ready; $('#offlineStatus').textContent = 'Offline shell ready · large gallery images need network'; reg.update().catch(() => {}); }).catch(() => { $('#offlineStatus').textContent = 'Offline shell unavailable'; });
})();
