/* DESIGN: LIVLOCH · Dreamwalk field notes. Presentation only; never writes to the simulation.
   One picture describes a rule. Verdicts describe the player's design feedback, not a game action.
   The original discovery order is kept in exports; navigation groups only arrange the page. */
(function () {
'use strict';
const LL = window.LL, D = LL.debrief = {};
const choices = [ ['keep', 'check', 'Keep'], ['change', 'pencil-simple', 'Change'], ['cut', 'scissors', 'Cut'] ];
const validChoice = v => choices.some(c => c[0] === v);
const cleanNote = v => typeof v === 'string' ? v.slice(0, 280).trim() : '';
const known = id => Object.prototype.hasOwnProperty.call(LL.debriefData.systems, id);
const unique = ids => Array.from(new Set(ids)).filter(known);
const node = function (tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
function icon(name, cls) {
  const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), u = document.createElementNS(ns, 'use');
  s.setAttribute('viewBox', '0 0 256 256'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  s.setAttribute('class', 'd-icon' + (cls ? ' ' + cls : '')); u.setAttribute('href', 'art/ui/debrief-symbols.svg#' + name); s.appendChild(u); return s;
}
function button(label, symbol, cls) { const b = node('button', cls); b.type = 'button'; if (symbol) b.appendChild(icon(symbol)); b.appendChild(node('span', '', label)); return b; }
function step(s) {
  const n = node('div', 'd-step d-tone-' + (s.tone || 'gold'));
  n.appendChild(icon(s.icon)); n.appendChild(node('b', '', s.label));
  if (s.detail) n.appendChild(node('small', '', s.detail)); return n;
}
function steps(items, arrows) {
  const n = node('div', arrows ? 'd-chain' : 'd-parallel');
  items.forEach(function (s, i) { if (arrows && i) n.appendChild(icon('arrow-right', 'd-arrow')); n.appendChild(step(s)); });
  return n;
}
function diagram(data) {
  const d = data.diagram, n = node('div', 'd-diagram d-diagram-' + d.kind);
  n.setAttribute('role', 'img'); n.setAttribute('aria-label', d.reading);
  const visual = node('div', 'd-diagram-visual'); visual.setAttribute('aria-hidden', 'true');
  if (d.condition) visual.appendChild(node('div', 'd-condition', d.condition));
  if (d.kind === 'branches') {
    const branches = node('div', 'd-branches');
    if (d.steps && d.steps.length) {
      branches.appendChild(steps(d.steps, true));
      branches.appendChild(icon('arrow-right', 'd-branch-down'));
    }
    const routes = node('div', 'd-routes');
    d.branches.forEach(function (r) { const row = node('div', 'd-route'); row.appendChild(node('span', 'd-route-label', r.label)); row.appendChild(steps(r.steps, true)); routes.appendChild(row); });
    branches.appendChild(routes); visual.appendChild(branches);
  } else visual.appendChild(steps(d.steps, d.kind === 'chain'));
  n.appendChild(visual); return n;
}
D.text = function (seen, cfg, version, world) {
  const ids = unique(seen), calls = cfg.calls || {}, notes = cfg.callNotes || {}, reviewed = ids.filter(id => validChoice(calls[id]));
  const title = 'Livloch ' + (version || '') + ' Dreamwalk calls';
  const mode = world && world.fallen ? 'Ever Fallen' : world && world.short ? 'First rain' : 'The livelock';
  const lines = [title, mode + ' · ' + reviewed.length + '/' + ids.length + ' called', ''];
  ids.forEach(function (id) {
    const choice = validChoice(calls[id]) ? calls[id].toUpperCase() : 'UNREVIEWED';
    lines.push(choice + '  ' + LL.debriefData.systems[id][0]);
    const note = cleanNote(notes[id]); if (note) lines.push('  Note: ' + note.replace(/\s*\n\s*/g, ' '));
  });
  return lines.join('\n');
};
D.mount = function (root, options) {
  const ids = unique(options.seen), cfg = options.cfg, world = options.world || {}, save = options.save || function () {};
  if (!cfg.calls || typeof cfg.calls !== 'object' || Array.isArray(cfg.calls)) cfg.calls = {};
  if (!cfg.callNotes || typeof cfg.callNotes !== 'object' || Array.isArray(cfg.callNotes)) cfg.callNotes = {};
  root.replaceChildren(); root.className = 'debrief'; root.setAttribute('aria-labelledby', 'callsTitle');
  if (!ids.length) { root.appendChild(node('p', 'd-empty', 'No hidden systems were revealed in this walk.')); return; }
  const head = node('header', 'd-head'), intro = node('div', 'd-intro');
  intro.appendChild(node('span', 'd-eyebrow', 'Dreamwalk / Field notes'));
  const title = node('h3', 'd-title', 'Your calls, in signs.'); title.id = 'callsTitle'; intro.appendChild(title);
  intro.appendChild(node('p', 'd-intro-line', 'Read what happened. Choose what should stay.')); head.appendChild(intro);
  const progress = node('div', 'd-progress'), tally = node('strong', 'd-tally'), meter = node('progress', 'd-meter');
  meter.max = ids.length; meter.setAttribute('aria-label', 'Mechanics reviewed'); progress.appendChild(tally); progress.appendChild(meter);
  const subcount = node('span', 'd-subcount'); progress.appendChild(subcount); head.appendChild(progress); root.appendChild(head);

  const key = node('div', 'd-key'); key.setAttribute('aria-label', 'Symbol key');
  key.appendChild(node('span', 'd-key-title', 'The signs'));
  [['path', 'Thread', 'mint'], ['lamp', 'House light', 'gold'], ['circle-half', 'Souls', 'gold'], ['eye', 'View', 'hush'], ['ghost', 'Hush', 'hush']].forEach(function (s) {
    const k = node('span', 'd-key-item d-tone-' + s[2]); k.appendChild(icon(s[0])); k.appendChild(node('span', '', s[1])); key.appendChild(k);
  });
  const arrowKey = node('span', 'd-key-item d-key-arrow'); arrowKey.appendChild(icon('arrow-right')); arrowKey.appendChild(node('span', '', 'leads to')); key.appendChild(arrowKey); root.appendChild(key);

  const toolbar = node('div', 'd-toolbar'), filters = node('div', 'd-filters'); filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Filter field notes');
  const filterButtons = [], sections = [], cards = []; let selected = 'all';
  function setFilter(value) {
    selected = value; filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.filter === value)); });
    sections.forEach(function (s) { s.hidden = value !== 'all' && s.dataset.group !== value; });
  }
  function addFilter(id, label, symbol, count) {
    const b = button(label, symbol, 'd-filter'); b.dataset.filter = id; b.setAttribute('aria-pressed', String(id === 'all'));
    b.appendChild(node('span', 'd-filter-count', String(count))); b.addEventListener('click', function () { setFilter(id); }); filterButtons.push(b); filters.appendChild(b);
  }
  addFilter('all', 'All', null, ids.length);
  LL.debriefData.groups.forEach(function (g) { const count = ids.filter(id => LL.debriefData.get(id, world).group === g.id).length; if (count) addFilter(g.id, g.short || g.title, g.icon, count); });
  toolbar.appendChild(filters);
  const copyButton = button('Copy my calls', 'copy', 'd-copy'); copyButton.id = 'bCopyCalls'; toolbar.appendChild(copyButton); root.appendChild(toolbar);
  const status = node('p', 'd-status'); status.id = 'copyNote'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); root.appendChild(status);
  const exportBox = node('div', 'd-export'); exportBox.hidden = true;
  const exportLabel = node('label', '', 'Your calls — select and copy'); exportLabel.htmlFor = 'callsExport'; exportBox.appendChild(exportLabel);
  const exportArea = node('textarea', 'd-export-text'); exportArea.id = 'callsExport'; exportArea.readOnly = true; exportArea.rows = 12; exportBox.appendChild(exportArea); root.appendChild(exportBox);
  function text() { return D.text(ids, cfg, options.version, world); }
  copyButton.addEventListener('click', async function () {
    const value = text(); status.textContent = ''; copyButton.disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value); exportBox.hidden = true; status.textContent = 'Copied. Paste your calls into an issue or Discussion on github.com/stevoblevo/livloch.';
    } catch (e) {
      exportBox.hidden = false; exportArea.value = value; exportArea.focus(); exportArea.select();
      status.textContent = 'Copy was unavailable. Your calls are selected below; copy them from the text box.';
    } finally { copyButton.disabled = false; }
  });

  const list = node('div', 'd-groups'); list.id = 'callList'; root.appendChild(list);
  const choiceStatus = node('span', 'd-sr'); choiceStatus.setAttribute('role', 'status'); choiceStatus.setAttribute('aria-live', 'polite'); root.appendChild(choiceStatus);
  function updateCounts() {
    const n = ids.filter(id => validChoice(cfg.calls[id])).length;
    tally.textContent = n + ' / ' + ids.length + ' called'; meter.value = n;
    const counts = choices.map(c => ids.filter(id => cfg.calls[id] === c[0]).length);
    subcount.textContent = counts[0] + ' keep · ' + counts[1] + ' change · ' + counts[2] + ' cut';
    if (!exportBox.hidden) exportArea.value = text();
  }
  LL.debriefData.groups.forEach(function (g, index) {
    const groupIds = ids.filter(id => LL.debriefData.get(id, world).group === g.id); if (!groupIds.length) return;
    const section = node('section', 'd-group'); section.dataset.group = g.id; section.setAttribute('aria-labelledby', 'group-' + g.id); sections.push(section);
    const gh = node('div', 'd-group-heading'); gh.appendChild(node('span', 'd-group-number', String(index + 1).padStart(2, '0')));
    const h = node('h4', '', g.title); h.id = 'group-' + g.id; gh.appendChild(h); gh.appendChild(node('span', 'd-group-count', groupIds.length + ' signs')); section.appendChild(gh);
    const grid = node('div', 'd-grid'); section.appendChild(grid); list.appendChild(section);
    groupIds.forEach(function (id) {
      const data = LL.debriefData.get(id, world), card = node('article', 'd-card'); card.dataset.system = id; card.setAttribute('aria-labelledby', 'call-' + id); cards.push(card);
      const top = node('div', 'd-card-top'), heading = node('h5', '', data.title); heading.id = 'call-' + id; top.appendChild(heading);
      if (data.badge) { const badge = node('span', 'd-badge'); badge.appendChild(icon(data.badge.icon)); badge.appendChild(node('span', '', data.badge.text)); top.appendChild(badge); }
      card.appendChild(top); card.appendChild(diagram(data)); card.appendChild(node('p', 'd-summary', data.summary));
      const details = node('details', 'd-rule'), summary = node('summary'); summary.appendChild(node('span', '', 'Full rule')); summary.appendChild(icon('caret-down')); details.appendChild(summary); details.appendChild(node('p', '', data.rule)); card.appendChild(details);
      const field = node('fieldset', 'd-verdict'); field.appendChild(node('legend', 'd-sr', 'Your call on ' + data.title));
      const inputs = [], undo = button('Clear', null, 'd-clear'); undo.setAttribute('aria-label', 'Clear your call on ' + data.title);
      const notes = node('div', 'd-note');
      const label = node('label', '', 'What should change? (optional)'); label.htmlFor = 'note-' + id; notes.appendChild(label);
      const area = node('textarea'); area.id = 'note-' + id; area.rows = 2; area.maxLength = 280; area.placeholder = 'A little more, a little less, or something else…'; area.value = cleanNote(cfg.callNotes[id]); notes.appendChild(area);
      function updateCard(announce) {
        const choice = validChoice(cfg.calls[id]) ? cfg.calls[id] : ''; card.dataset.verdict = choice; undo.hidden = !choice;
        inputs.forEach(function (input) { input.checked = choice === input.value; }); notes.hidden = choice !== 'change' && !cleanNote(cfg.callNotes[id]);
        label.textContent = choice === 'change' ? 'What should change? (optional)' : 'Your note (optional)';
        if (announce) choiceStatus.textContent = data.title + ': ' + (choice || 'unreviewed') + '.';
      }
      choices.forEach(function (c) {
        const wrap = node('label', 'd-choice d-choice-' + c[0]), input = node('input'); input.type = 'radio'; input.name = 'call-' + id; input.value = c[0];
        const visual = node('span', 'd-choice-face'); visual.appendChild(icon(c[1])); visual.appendChild(node('span', '', c[2]));
        input.addEventListener('change', function () { if (!input.checked) return; cfg.calls[id] = c[0]; save(); updateCard(true); updateCounts(); status.textContent = ''; });
        wrap.appendChild(input); wrap.appendChild(visual); field.appendChild(wrap); inputs.push(input);
      });
      undo.addEventListener('click', function () { delete cfg.calls[id]; save(); updateCard(true); updateCounts(); inputs[0].focus(); status.textContent = ''; });
      field.appendChild(undo); card.appendChild(field); card.appendChild(notes);
      area.addEventListener('input', function () { const value = area.value.slice(0, 280); if (value.trim()) cfg.callNotes[id] = value; else delete cfg.callNotes[id]; save(); if (!exportBox.hidden) exportArea.value = text(); status.textContent = ''; });
      updateCard(false); grid.appendChild(card);
    });
  });
  const foot = node('div', 'd-foot'); foot.appendChild(icon('check')); foot.appendChild(node('p', '', 'These are your design calls. Choices are saved on this device. Copy them whenever you are ready.')); root.appendChild(foot);
  updateCounts(); setFilter(selected);
};
})();
