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
    if (!source.trim()) return;
    if (state.threads.length >= 250) return toast('250 threads held. Export your skein before starting another.');
    const now = new Date().toISOString();
    state.threads.unshift({id: crypto.randomUUID(), source: source.slice(0, 4000), heldAt: now, updatedAt: now, status: 'held-local', proof: ''});
    state.blooms++; record('thread-held'); save();
    toast(memoryOnly ? 'Held in this tab only. Export to keep it.' : 'Thread saved on this device. Nothing sent.');
    return true;
  }
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
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  function theme(value) {
    const resolved = value === 'system' ? (systemTheme.matches ? 'dark' : 'light') : value;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.sb = resolved === 'light' ? 'daylight' : 'knight';
    $('#themeToggle').textContent = resolved === 'light' ? 'Switch to night' : 'Switch to daylight';
    $('#themeSelect').value = value;
    $('meta[name="theme-color"]').content = resolved === 'light' ? '#f4f6f2' : '#111b20';
  }
  const selectedTheme = () => ['dark','light'].includes(state.theme) ? state.theme : 'system';
  theme(selectedTheme());
  systemTheme.addEventListener('change', () => theme(selectedTheme()));
  $('#themeSelect').addEventListener('change', e => { state.theme = e.target.value; theme(state.theme); save(); });
  $('#themeToggle').addEventListener('click', () => { state.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; theme(state.theme); save(); });
  function route() { const hash = location.hash || '#garden'; $$('[data-nav]').forEach(a => { if (a.hash === hash) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  window.addEventListener('hashchange', route); route();
  const items = window.__libraryItems || []; let filter = 'all';
  function renderLibrary() {
    const query = $('#librarySearch').value.toLowerCase().trim();
    const visible = items.filter(x => (filter === 'all' || (x.tags || []).includes(filter)) && `${x.title} ${x.caption} ${(x.tags || []).join(' ')}`.toLowerCase().includes(query));
    window.__visibleArt = visible;
    $('#grid').replaceChildren(); $('#empty').hidden = visible.length > 0;
    $('#libraryCount').textContent = `${visible.length} / ${items.length} works`;
    $('#coverage').textContent = `${items.length} works: ${items.filter(x=>!x.previewOnly).length} public source images and ${items.filter(x=>x.previewOnly).length} early previews. The archive brings together the published cockpit, Goober, Peachfall, Skein and Skyknight collections.`;
    for (const x of visible) {
      const card = document.createElement('button'); card.type='button'; card.className = 'card'; card.dataset.id = x.id; card.dataset.preview=String(!!x.previewOnly); card.setAttribute('aria-label', `Open ${x.title}`);
      const mat=document.createElement('div');mat.className='art-mat';
      const image = document.createElement('img'); image.className = 'thumb'; image.src = x.thumbnail || x.image; image.alt = x.alt || x.title; image.loading = 'lazy'; image.decoding='async';
      image.width=x.width;image.height=x.height;
      if(x.display){image.srcset=`${x.thumbnail} 480w, ${x.display} 1440w`;image.sizes='(max-width:600px) 92vw, 44vw';}
      const error=document.createElement('span');error.className='unavailable';error.textContent='Image unavailable · open to try the source';
      image.addEventListener('error',()=>card.classList.add('failed'));
      mat.append(image,error);
      const body = document.createElement('div'); body.className = 'body';
      for (const [tag, cls, text] of [['div','kicker',x.previewOnly ? 'Early seed / 100 × 75 preview' : `${(x.tags||[]).includes('vistas')?'Skyknight':(x.tags||[]).includes('skein')?'Skein':(x.tags||[]).includes('peachfall')?'Peachfall':(x.tags||[]).includes('goober')?'Goober':'Anewgam'} / ${x.width} × ${x.height}`], ['h3','',x.title]]) {
        const el = document.createElement(tag); el.className = cls; el.textContent = text; body.append(el);
      }
      card.append(mat, body); $('#grid').append(card);
    }
  }
  window.__setLibraryFilter = f => { filter = f || 'all'; $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter))); renderLibrary(); };
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => window.__setLibraryFilter(b.dataset.filter)));
  $('#librarySearch').addEventListener('input', renderLibrary);
  $('#clearSearch').addEventListener('click',()=>{$('#librarySearch').value='';window.__setLibraryFilter('all');$('#librarySearch').focus();});
  $('#open-gallery').addEventListener('click', () => { const card = $('#grid .card'); if (card) window.__openGallery(card.dataset.id); else toast('No works match this search.'); });
  renderLibrary(); render();
  $('#updateApp').addEventListener('click', async () => {
    if (!('serviceWorker' in navigator)) return toast('Service workers are unavailable in this browser.');
    try { const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return toast('Offline worker not installed yet.'); await reg.update(); toast('Update check completed. Reload to load the latest published page.'); } catch { toast('Update check failed. Check your connection.'); }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(async reg => { await navigator.serviceWorker.ready; $('#offlineStatus').textContent = 'Offline shell ready · large gallery images need network'; reg.update().catch(() => {}); }).catch(() => { $('#offlineStatus').textContent = 'Offline shell unavailable'; });
})();
