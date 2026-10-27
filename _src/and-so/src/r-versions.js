// ===== every version: the older AND SOs stay a press away =====
// ANDSO_VERSIONS is written into the build from versions.py. On stevoblevo.github.io each one opens in place; anywhere
// else (the claude.ai artifact) they open on github.io in a new tab, and 6.1 can also open inside the mirror.
const VER_HOST = 'https://stevoblevo.github.io';
const VER_ON_PAGES = (() => { try { return /(^|\.)github\.io$/.test(location.hostname) && /^\/and-so\//.test(location.pathname); } catch (e) { return false; } })();
function versionsBuild() {
  const list = $('vsList'); if (!list || list.dataset.built) return; list.dataset.built = '1';
  const cur = String(ANDSO_VERSION).replace(/\.0$/, '');
  $('vsLede').textContent = VER_ON_PAGES
    ? 'Every AND SO stays playable here, newest first. Each keeps its own save, so going back never takes anything away from this one.'
    : 'Every AND SO stays playable on stevoblevo.github.io, newest first; they open in a new tab. 6.1 also lives inside the mirror.';
  if (VER_ON_PAGES) { const a = $('vsAll'); a.href = '/and-so/versions/'; a.removeAttribute('target'); a.removeAttribute('rel'); }
  ANDSO_VERSIONS.forEach(v => {
    const li = document.createElement('li'); li.className = 'vs-item'; const here = v.id === cur;
    if (here) li.setAttribute('aria-current', 'page');
    const name = document.createElement('span'); name.className = 'vs-name'; name.textContent = v.name;
    if (v.latest) { const i = document.createElement('i'); i.textContent = 'latest'; name.appendChild(i); }
    if (v.edition) { const i = document.createElement('i'); i.textContent = 'edition'; name.appendChild(i); }
    const date = document.createElement('span'); date.className = 'vs-date'; date.textContent = v.date;
    const line = document.createElement('span'); line.className = 'vs-line'; line.textContent = v.line;
    const go = document.createElement('span'); go.className = 'vs-go';
    if (here) { const s = document.createElement('span'); s.className = 'vs-here'; s.textContent = 'you are here'; go.appendChild(s); }
    else {
      const a = document.createElement('a'); a.textContent = VER_ON_PAGES ? 'play' : 'play ↗';
      a.href = (VER_ON_PAGES ? '' : VER_HOST) + (v.latest ? '/and-so/' : v.path);
      if (!VER_ON_PAGES) { a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', () => jlog(`went to ${v.name}`));
      go.appendChild(a);
      if (v.id === '6.1' && !VER_ON_PAGES) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'in the mirror';
        b.addEventListener('click', () => { versionsClose(); if (!mirAllowed()) { const st = STONE.get('mirror'); caption(`the mirror opens at ${st.need} nougats. the jar has ${GAME.nougats}.`, 2800); return; } mirrorTable(true); mirOpen('61', phone ? 'phone' : 'laptop'); });
        go.appendChild(b);
      }
    }
    li.append(name, line, date, go); list.appendChild(li);
  });
}
function versionsOpen() {
  if (MIR.depth > 0) return;
  versionsBuild(); $('versions').classList.add('on'); jlog('opened every version');
  setTimeout(() => { const f = $('vsList').querySelector('a, button') || $('versionsClose'); if (f) f.focus(); }, 30);
}
function versionsClose() { $('versions').classList.remove('on'); }
on('verBtn', versionsOpen);
on('gVersions', versionsOpen);
on('versionsClose', versionsClose);
$('versions').addEventListener('click', e => { if (e.target === $('versions')) versionsClose(); });
if (MIR.depth > 0) { $('verBtn').disabled = true; $('gVersions').closest('.btns').classList.add('hidden'); $('gVersionsNote').classList.add('hidden'); }
// while the sheet is open, keys belong to it: Escape closes it, and nothing reaches the instrument underneath
window.addEventListener('keydown', e => { if (!$('versions').classList.contains('on')) return; e.stopImmediatePropagation(); if (e.key === 'Escape') versionsClose(); }, true);
