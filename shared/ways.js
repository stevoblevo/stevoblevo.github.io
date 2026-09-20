/* Shared paths and real game adapters. No account, host or remote-worker effects. */
(() => {
  'use strict';
  const worlds = window.__saeWorlds || [];
  const home = '/anewgam-for-steven-cockpit/';
  const matches = (world, pathname) => [world.href, ...(world.aliases || [])].some(href => href?.startsWith('/') && new URL(href, location.origin).pathname === pathname);
  const current = worlds.find(w => matches(w, location.pathname))
    || (location.pathname.startsWith('/peachfall/') ? worlds.find(w => w.id === 'peachfall') : null)
    || (location.pathname.startsWith('/goober/') ? worlds.find(w => w.id === 'goober') : null)
    || worlds.find(w => w.id === 'cockpit');
  const bar = document.createElement('nav'); bar.id = 'sae-way'; bar.setAttribute('aria-label', 'Paths between worlds');
  const make = (tag, text, parent = bar) => {const el = document.createElement(tag); el.textContent = text; parent.append(el); return el;};
  const homeLink = make('a', 'Sae · home'); homeLink.href = home;
  const back = make('a', 'Back to my path'); back.hidden = true;
  const open = make('button', 'Worlds'); open.type = 'button'; open.id = 'sae-worlds-open';
  const watch = make('button', 'Watch'); watch.type = 'button'; watch.id = 'sae-watch'; watch.hidden = true;
  const pause = make('button', 'Pause'); pause.type = 'button'; pause.id = 'sae-pause'; pause.hidden = true;
  const take = make('button', 'Take over'); take.type = 'button'; take.id = 'sae-takeover'; take.hidden = true;
  const stop = make('button', 'Return to my scene'); stop.type = 'button'; stop.id = 'sae-stop'; stop.hidden = true;
  const status = make('output', ''); status.setAttribute('aria-live', 'polite');
  document.body.prepend(bar);
  const safePath = value => typeof value === 'string' && value.length < 1000 && /^\/(?!\/)/.test(value) && !value.includes('\\')
    && worlds.some(w => matches(w, new URL(value, location.origin).pathname));
  try {const value = sessionStorage.getItem('sae.return.' + current.id); if (safePath(value) && value !== location.pathname + location.hash) {back.href = value; back.hidden = false;}} catch {}
  function remember(event) {
    const a = event.target.closest?.('a[href]'); if (!a) return;
    const target = new URL(a.href, location.href);
    if (target.origin !== location.origin) return;
    const destination = worlds.find(w => matches(w, target.pathname));
    if (!destination || destination.id === current.id) return;
    const source = location.pathname + location.hash;
    if (safePath(source)) try {sessionStorage.setItem('sae.return.' + destination.id, source);} catch {}
  }
  document.addEventListener('click', remember, true);
  const dialog = document.createElement('dialog'); dialog.id = 'sae-world-dialog'; dialog.setAttribute('aria-labelledby', 'sae-worlds-title');
  const header = make('header', '', dialog); const title = make('h2', 'Follow another thread', header); title.id = 'sae-worlds-title';
  const close = make('button', 'Back', header); close.type = 'button'; close.onclick = () => dialog.close();
  make('p', 'Each world keeps its own memories. A path can lead onward and still remember home.', dialog);
  const list = make('ul', '', dialog);
  for (const world of worlds) {
    const li = make('li', '', list); make('strong', world.title, li); make('p', world.note, li);
    const actions = make('div', '', li); actions.className = 'sae-world-actions';
    if (world.href) {
      const a = make('a', world.kind === 'game' ? 'Play' : world.kind === 'seed' || world.kind === 'private-development' ? 'Visit the seed' : 'Enter', actions);
      a.href = world.href;
      if (world.kind === 'external') {a.target = '_blank'; a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer';}
      a.addEventListener('click', event => {
        if (world.id === current.id && adapter) {event.preventDefault(); if (mode !== 'idle') end(true);}
        dialog.close();
      });
      if (world.watch) {
        const a = make('a', 'Watch', actions); const url = new URL(world.href, location.origin); url.searchParams.set('watch', '1'); a.href = url.pathname + url.search + url.hash;
        a.addEventListener('click', event => {
          if (world.id === current.id && adapter) {event.preventDefault(); dialog.close(); if (mode === 'paused') togglePause(); else start();}
          else dialog.close();
        });
      }
    } else make('small', 'Entrance still to be connected', actions);
  }
  const notes = make('a', 'Development and run-through coverage', dialog); notes.href = '/docs/EVERFALLEN-WORLDS.md';
  document.body.append(dialog);
  // Global game handlers must not consume Enter/Space intended for these controls.
  // Keep keyup bubbling so keys held before entering the controls are released.
  for (const surface of [bar, dialog]) surface.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open) end(false);
    event.stopPropagation();
  });
  let adapter = null, mode = 'idle', timer = null;
  function paint(message = '') {
    watch.hidden = !adapter || mode !== 'idle';
    take.hidden = stop.hidden = mode === 'idle';
    pause.hidden = mode === 'idle' || !adapter?.pause;
    pause.textContent = mode === 'paused' ? 'Continue watching' : 'Pause';
    if (message) status.textContent = message;
  }
  function clearIntent() {const url = new URL(location.href); url.searchParams.delete('watch'); history.replaceState(history.state, '', url.pathname + url.search + url.hash);}
  function end(takeover = false) {
    if (!adapter || mode === 'idle') return;
    clearInterval(timer); timer = null;
    try {takeover ? adapter.takeOver() : adapter.stop(); mode = 'idle'; clearIntent(); paint(takeover ? 'Your turn. Continue from this moment.' : 'Your earlier scene is back.');}
    catch (error) {status.textContent = 'Could not return: ' + error.message;}
  }
  function start() {
    if (!adapter || mode !== 'idle') return;
    try {
      adapter.watch(); mode = 'watching'; clearIntent(); paint('Watching · take over whenever you like.');
      timer = setInterval(() => {if (adapter.ended?.()) {clearInterval(timer); timer = null; paint('Journey complete · take over or return to your scene.');}}, 300);
    } catch (error) {try {adapter.stop();} catch {} mode = 'idle'; paint('Watch could not start: ' + error.message);}
  }
  function togglePause() {
    if (!adapter?.pause || mode === 'idle') return;
    mode = mode === 'paused' ? 'watching' : 'paused'; adapter.pause(mode === 'paused'); paint(mode === 'paused' ? 'Watching is paused.' : 'Watching · take over whenever you like.');
  }
  watch.onclick = start; take.onclick = () => end(true); stop.onclick = () => end(false); pause.onclick = togglePause;
  open.onclick = () => {if (mode === 'watching') {if (adapter?.pause) togglePause(); else end(false);} dialog.showModal();};
  document.addEventListener('keydown', e => {if (e.key === 'Escape' && !dialog.open) end(false);});
  document.addEventListener('visibilitychange', () => {if (document.hidden && mode === 'watching') {if (adapter?.pause) togglePause(); else end(false);}});
  window.addEventListener('pagehide', () => end(false));
  window.__saeJourney = Object.freeze({
    register(value) {adapter = value; paint(); if (new URL(location.href).searchParams.get('watch') === '1') start();},
    start, stop: () => end(false), takeOver: () => end(true),
    getMode: () => mode, world: current.id
  });
})();
