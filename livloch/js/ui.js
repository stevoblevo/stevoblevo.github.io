/* LIVLOCH · ui: HUD, minimap, shop, menus.

   DESIGN
   - Voice is Saelion's: short, quiet, declarative, no exclamation marks. Say what happened and what it costs.
   - The HUD explains consequences, not mechanics. Secrets (the fold, fruit, the loch) are hinted once and left to be found.
   - The five moons under the clock are the red-rain countdown. The minimap is the tactical truth: thieves blink on it.
   - Gold double frames and cut corners come from the concept plate. */
(function () {
'use strict';
const LL = window.LL, C = LL.C, S = LL.sim, U = LL.U;
const UI = LL.ui = { screen: 'title' };
const $ = id => document.getElementById(id);
let H = null, W = null, nums = [], numI = 0, bannerT = 0, miniT = 0, slowT = 0, hurt = 0, immuneT = -9, mctx = null, lastSouls = -1, pr = { x: 0, y: 0, vis: false };
const KILL_VERBS = ['folded', 'unpicked', 'put out', 'unravelled', 'creased'];
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

UI.init = function (handlers) {
  H = handlers;
  const cfg = LL.cfg;
  // heroes
  const hw = $('heroes');
  LL.HEROES.forEach(function (d, i) {
    const b = document.createElement('button'); b.className = 'hero'; b.style.setProperty('--hc', d.css); b.setAttribute('aria-pressed', String(i === cfg.hero));
    b.innerHTML = '<h4><i></i>' + esc(d.name) + '</h4><span class="ti">' + esc(d.title) + '</span><p>' + esc(d.blurb) + '</p><ul><li><b>Gun</b>' + esc(d.gun.name) + '</li>' +
      d.ab.map(a => '<li><b>' + a.key + '</b>' + esc(a.name) + '</li>').join('') + '</ul>';
    b.addEventListener('click', function () { cfg.hero = i; H.save(); hw.querySelectorAll('.hero').forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); LL.audio.init(); LL.audio.ui(); });
    hw.appendChild(b);
  });
  document.querySelectorAll('[data-diff]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(+b.getAttribute('data-diff') === cfg.diff));
    b.addEventListener('click', function () { cfg.diff = +b.getAttribute('data-diff'); H.save(); document.querySelectorAll('[data-diff]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); LL.audio.init(); LL.audio.ui(); });
  });
  const modeLine = function () { $('modeLine').textContent = (cfg.mode === 'short' ? 'First rain: six minutes, five stars. ' + (cfg.bestStars ? 'Best ' + cfg.bestStars + ' of 5. ' : '') : '') + (cfg.mode === 'short' ? '' : cfg.mode === 'fallen' ? 'Ever Fallen: already lost. Hold the last lantern and take the lights back. ' + (cfg.bestT ? 'Best ' + U.fmtTime(cfg.bestT) + ', ' + cfg.bestL + ' lights.' : 'No record yet.') : 'The livelock: three threads, two patrons, one of them yours.') + (cfg.lean ? ' Leaning back: the hero plays itself; you keep the view, the thread and the fold.' : ''); document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.getAttribute('data-mode') === cfg.mode))); $('cLean').setAttribute('aria-pressed', String(!!cfg.lean)); $('cDream').setAttribute('aria-pressed', String(!!cfg.dream)); if (cfg.dream) $('modeLine').textContent += ' Dreamwalk: you will be shown every hidden thing, and asked at the end what to keep.'; $('bPlay').textContent = cfg.dream ? 'Dream' : (cfg.lean ? 'Sit down' : 'Walk in'); };
  UI.modeLine = modeLine;
  document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { cfg.mode = b.getAttribute('data-mode'); H.save(); modeLine(); LL.audio.init(); LL.audio.ui(); }); });
  $('cLean').addEventListener('click', function () { cfg.lean = !cfg.lean; H.save(); modeLine(); LL.audio.init(); LL.audio.ui(); });
  modeLine();
  UI.record();
  ['looks', 'looks2'].forEach(function (id) {
    const w = $(id);
    Object.keys(LL.gfx.LOOKS).forEach(function (k) {
      const L = LL.gfx.LOOKS[k], b = document.createElement('button'); b.className = 'chip'; b.setAttribute('data-look', k); b.textContent = L.name; b.title = 'From ' + L.kit;
      b.addEventListener('click', function () { H.look(k); LL.audio.init(); LL.audio.ui(); });
      w.appendChild(b);
    });
  });
  UI.lookChips();
  // shop
  const sc = $('shopCols');
  LL.CATS.forEach(function (cat, ci) {
    const col = document.createElement('div'); col.innerHTML = '<h3>' + cat + '</h3>';
    LL.ITEMS.forEach(function (it, i) {
      if (it.cat !== ci) return;
      const b = document.createElement('button'); b.className = 'item'; b.id = 'item' + i;
      b.innerHTML = '<b>' + esc(it.name) + '</b><span class="c">' + it.cost + '</span><small>' + esc(it.desc) + '</small>';
      b.addEventListener('click', function () { H.buy(i); });
      col.appendChild(b);
    });
    sc.appendChild(col);
  });
  // numbers
  const nw = $('nums'); for (let i = 0; i < 26; i++) { const el = document.createElement('span'); nw.appendChild(el); nums.push({ el: el, t: 0, life: 0, x: 0, y: 0, z: 0 }); }
  mctx = $('mini').getContext('2d');
  // buttons
  const on = (id, f) => $(id).addEventListener('click', f);
  on('bPlay', () => H.play(false)); on('bWatch', () => H.play(true));
  on('bFull', H.full); on('bFull2', H.full);
  on('bShop', () => UI.toggleShop()); on('bDeadShop', () => UI.toggleShop(true)); on('bShopClose', () => UI.toggleShop(false));
  on('bPause', H.pause); on('bResume', H.resume); on('bQuit', H.quit); on('bAgain', () => H.play(false)); on('bTitle', H.quit);
  { const w = $('worlds'); LL.WORLDS.forEach(function (x) { const a = document.createElement('a'); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = x.name + ' ↗'; w.appendChild(a); }); }
  { const t = $('perfT'); document.querySelector('#pause .panel').appendChild(t.content.cloneNode(true));
    on('bPerf', function () { const r = LL.perfReport(); if (!r) return; const done = function (ok) { $('perfNote').textContent = ok ? 'Copied. Paste it into issue #25 on github.com/stevoblevo/livloch.' : 'Could not copy; read it off above.'; }; try { navigator.clipboard.writeText(r.text).then(function () { done(true); }, function () { done(false); }); } catch (err) { done(false); } }); }
  on('bEcho', H.echo); on('lEcho', H.echo); on('lFast', function () { $('lFast').textContent = H.fast() + '×'; });
  on('bCopyCalls', function () { const t = UI.callsText(); const done = function (ok) { $('copyNote').textContent = ok ? 'Copied. Paste it into an issue or a Discussion on github.com/stevoblevo/livloch.' : t; }; try { navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); }); } catch (err) { done(false); } });
  $('cDream').addEventListener('click', function () { cfg.dream = !cfg.dream; H.save(); modeLine(); LL.audio.init(); LL.audio.ui(); });
  on('bAuto', H.auto); on('bInk', H.view); on('bCab', UI.showCab); on('bCabClose', function () { snuffRun = null; show('title'); });
  { let taps = 0; const all = $('oAll'); all.checked = !!cfg.all; $('lAll').hidden = !cfg.all; $('bCab').hidden = false;
    $('hSet').addEventListener('click', function () { if (++taps >= 5) { $('lAll').hidden = false; LL.audio.ui('ok'); } }); // the hidden switch: five taps on the word Settings
    all.addEventListener('change', function () { cfg.all = all.checked; H.save(); }); }
  [0, 1, 2].forEach(l => on('lCall' + l, () => H.call(l))); on('lFold', H.leanFold); on('lView', H.view);
  // settings
  const bind = (id, key, type) => {
    const el = $(id);
    if (type === 'c') el.checked = !!cfg[key]; else el.value = cfg[key];
    el.addEventListener('input', function () { cfg[key] = type === 'c' ? el.checked : +el.value; H.save(); H.apply(); });
  };
  bind('oSens', 'sens'); bind('oVol', 'vol'); bind('oMusic', 'music'); bind('oSfx', 'sfx'); bind('oMute', 'mute', 'c'); bind('oMicro', 'micro', 'c'); bind('oInv', 'invert', 'c'); bind('oAssist', 'assist', 'c'); bind('oLow', 'low', 'c'); bind('oPet', 'pet', 'c'); bind('oH3d', 'heroes3d', 'c'); /* 0.24 heroes3d */ UI.petStatus();
  $('oAuto').addEventListener('input', function () { cfg.autoFire = $('oAuto').checked; H.save(); });
};
/* The mute buttons (one on the title and menus, one in the match HUD) and the Settings box show the same state. */
UI.muteShow = function (m) {
  document.querySelectorAll('.mute').forEach(function (b) { b.setAttribute('aria-pressed', String(!!m)); b.setAttribute('aria-label', m ? 'Sound is off. Turn sound on (M)' : 'Sound is on. Mute (M)'); b.title = m ? 'Sound off · M' : 'Mute · M'; });
  const o = document.getElementById('oMute'); if (o) o.checked = !!m;
};
UI.lookChips = function () { const k = LL.cfg.look; document.querySelectorAll('[data-look]').forEach(b => { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === k)); }); const L = LL.gfx.LOOKS[k]; $('lookLine').textContent = L ? 'Look: ' + L.name + ', from ' + L.kit + '.' : ''; };
/* ---------- the cabinet: easter eggs ---------- */
UI.unlock = function (id) {
  const c = LL.cfg; if (!c.unl) c.unl = {}; if (c.unl[id]) return; const e = LL.CABINET.find(x => x.id === id); if (!e) return;
  c.unl[id] = 1; H.save(); if (!$('hud').hidden) feed('<b>Something in the cabinet opened</b> · ' + e.name); $('bCab').hidden = false;
};
const isOpen = id => !!(LL.cfg.all || (LL.cfg.unl && LL.cfg.unl[id]) || (LL.CABINET.find(x => x.id === id) || {}).open);
let snuffRun = null;
function cabDraw() {
  const L = $('cabList'); L.innerHTML = ''; let n = 0;
  LL.CABINET.forEach(function (e) {
    const open = isOpen(e.id); if (open) n++;
    const b = document.createElement(open && e.url ? 'a' : 'button'); b.className = 'item' + (open ? '' : ' shut');
    b.innerHTML = '<b>' + (open ? e.name : '· · ·') + '</b><small>' + (open ? e.line : e.feat) + '</small>';
    if (open && e.url) { b.href = e.url; b.target = '_blank'; b.rel = 'noopener'; }
    else if (open) b.addEventListener('click', function () { if (e.video) videoShow(e); else if (e.id === 'snuff') snuffStart(); else platesShow(); });
    else b.disabled = true;
    L.appendChild(b);
  });
  $('cabSub').textContent = n + ' of ' + LL.CABINET.length + ' open. The shut ones say what opens them.';
}
function videoShow(e) { $('snuff').hidden = true; snuffRun = null; const P = $('plates'); P.hidden = true; const B = $('plateBig'); B.hidden = false; B.innerHTML = '<video controls playsinline preload="metadata" style="width:100%;border:1px solid var(--gold)" src="' + e.video + '"></video><p>' + e.name + '. ' + e.line + '</p>'; B.scrollIntoView({ block: 'nearest' }); }
function platesShow() {
  const P = $('plates'); $('snuff').hidden = true; P.hidden = false; $('plateBig').hidden = true; $('plateBig').innerHTML = '<img alt=""><p></p>'; P.innerHTML = '';
  LL.PLATES.forEach(function (pl) { const b = document.createElement('button'), im = document.createElement('img'); im.loading = 'lazy'; im.src = pl.f; im.alt = pl.name; b.title = pl.name; b.appendChild(im);
    b.addEventListener('click', function () { const B = $('plateBig'); B.hidden = false; B.querySelector('img').src = pl.f; B.querySelector('img').alt = pl.name; B.querySelector('p').textContent = pl.name + '. ' + pl.line; B.scrollIntoView({ block: 'nearest' }); }); P.appendChild(b); });
}
/* Snuff: nine houses. A hush creeps onto a lit one; touch it before the light goes. Thirty seconds. */
function snuffStart() {
  $('plates').hidden = true; $('plateBig').hidden = true; $('snuff').hidden = false;
  const cv = $('snuffC'), g = cv.getContext('2d'), st = { t: 30, score: 0, lost: 0, h: [], next: 0.6, last: performance.now(), on: true };
  for (let i = 0; i < 9; i++) st.h.push({ lit: true, hush: 0 });
  snuffRun = st;
  cv.onpointerdown = function (ev) { if (!st.on) { snuffStart(); return; } const r = cv.getBoundingClientRect(), i = Math.floor((ev.clientX - r.left) / r.width * 3) + 3 * Math.floor((ev.clientY - r.top) / r.height * 3), c = st.h[i]; if (c && c.hush > 0) { c.hush = 0; st.score++; LL.audio.ui('ok'); } };
  (function loop(now) {
    if (snuffRun !== st || $('cab').hidden) return;
    const dt = Math.min(0.1, (now - st.last) / 1000); st.last = now;
    if (st.on) { st.t -= dt; st.next -= dt;
      if (st.next <= 0) { st.next = Math.max(0.28, 0.9 - (30 - st.t) * 0.02); const c = st.h[Math.floor(Math.random() * 9)]; if (c.lit && c.hush <= 0) c.hush = 1.25; }
      st.h.forEach(function (c) { if (c.hush > 0) { c.hush -= dt; if (c.hush <= 0) { c.lit = false; st.lost++; } } });
      if (st.t <= 0 || st.lost >= 9) { st.on = false; const cf = LL.cfg; if (st.score > (cf.snuffBest || 0)) { cf.snuffBest = st.score; H.save(); } } }
    const css = getComputedStyle(document.body), gold = css.getPropertyValue('--gold') || '#f0c060', night = css.getPropertyValue('--night') || '#1b1840', mint = css.getPropertyValue('--mint') || '#a9b8ff';
    g.fillStyle = night; g.fillRect(0, 0, 330, 330);
    st.h.forEach(function (c, i) { const x = (i % 3) * 110 + 55, y = Math.floor(i / 3) * 110 + 60;
      g.fillStyle = c.lit ? gold : 'rgba(128,128,128,0.35)'; g.beginPath(); g.moveTo(x - 30, y - 6); g.lineTo(x, y - 34); g.lineTo(x + 30, y - 6); g.fill(); g.fillRect(x - 22, y - 6, 44, 38);
      if (c.lit) { g.fillStyle = night; g.fillRect(x - 6, y + 6, 12, 14); }
      if (c.hush > 0) { g.fillStyle = mint; g.beginPath(); g.arc(x + 18 * (c.hush / 1.25), y + 26, 13, 0, 6.3); g.fill(); g.fillStyle = night; g.fillRect(x + 18 * (c.hush / 1.25) - 6, y + 22, 4, 4); g.fillRect(x + 18 * (c.hush / 1.25) + 2, y + 22, 4, 4); } });
    $('snuffT').textContent = st.on ? Math.ceil(st.t) + ' s · caught ' + st.score + ' · dark ' + st.lost + ' of 9' : 'Caught ' + st.score + '. ' + (9 - st.lost) + ' houses still lit. Best ' + (LL.cfg.snuffBest || 0) + '. Touch to go again.';
    requestAnimationFrame(loop);
  })(performance.now());
}
UI.showCab = function () { $('snuff').hidden = true; $('plates').hidden = true; $('plateBig').hidden = true; snuffRun = null; cabDraw(); show('cab'); };
UI.petStatus = function () {
  const box = $('oPet'), cap = $('petCaption'); if (!box || !cap) return;
  box.disabled = !LL.cfg.petUnlocked; box.checked = !!LL.cfg.petUnlocked && !!LL.cfg.pet;
  cap.textContent = LL.cfg.petUnlocked ? 'Guardian fox · follows and points at stolen light' : 'Guardian fox · rescue a stolen light to unlock';
};
UI.record = function () { const c = LL.cfg; $('rec').textContent = (c.wins + c.losses) ? 'Your record: ' + c.wins + ' won, ' + c.losses + ' lost' : ''; };
UI.error = function (msg) { const e = $('err'); e.hidden = false; e.textContent = msg; $('bPlay').disabled = true; $('bWatch').disabled = true; };
function show(name) {
  UI.screen = name;
  ['title', 'shop', 'pause', 'over', 'cab'].forEach(function (s) { $(s).hidden = s !== name; });
  if (name && LL.input.device !== 'touch') { const b = $(name).querySelector('.btn.primary, .btn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
UI.show = function (name) { show(name); }; // 0.23 wardrobe: js/wardrobe.js opens its own screen (#ward) through this
UI.showTitle = function () { $('hud').hidden = true; document.body.classList.remove('lean'); show('title'); UI.record(); if (UI.modeLine) UI.modeLine(); };
UI.startHUD = function (w) {
  W = w; const p = W.player, d = p.def;
  $('hud').hidden = false; show(null);
  $('hud').style.setProperty('--hc', d.css);
  for (let i = 0; i < 3; i++) { const b = $('ab' + i); b.querySelector('span').textContent = d.ab[i].name; b.title = d.ab[i].name + ': ' + d.ab[i].desc; }
  $('gunN').textContent = d.gun.name;
  $('feed').innerHTML = ''; $('dead').hidden = true; lastSouls = -1; hurt = 0;
  nums.forEach(n => { n.life = 0; n.el.style.opacity = 0; });
  document.body.classList.toggle('lean', !!W.lean); dreamSeen = []; dreamQ = []; dreamT = 0; wasMercy = false; $('dreamCard').hidden = true; $('lFast').hidden = !W.dream; $('lFast').textContent = '1×'; $('calls').hidden = true;
  document.querySelector('#score .t0 .nm').textContent = W.fallen ? 'Lights ' : 'Reign '; $('autoTag').textContent = W.lean ? 'Lean back · the view, the thread and the fold are yours' : 'Auto · the valley plays itself';
  if (W.short && !W.dream) UI.banner('First rain.', 'Five minutes until it comes down red. Do the thing under the map', 6);
  else if (W.dream) UI.banner('Dreamwalk.', 'Sit back. Each hidden thing is named the first time it happens. Faster is the last button', 7);
  else if (W.fallen) UI.banner('The valley is already lost.', 'Hold the last lantern. Every small one put down gives a light back for ' + C.LIT_T + ' seconds', 7);
  else if (W.lean) UI.banner('Sit back.', 'Your hero plays itself. Change the view, call a thread, fold when it lights', 6);
  else UI.banner('The ' + C.LANE_NAME[1] + ' is yours.', 'Your side holds the other two. Shop any time with ' + (LL.input.device === 'kbm' ? 'B' : 'the Shop button') + '.', 5);
  $('bAuto').textContent = W.auto ? 'Take the wheel' : 'Let it play itself';
};
UI.coach = function (text) { const c = $('coach'); c.hidden = !text; if (text) c.textContent = text; };
UI.banner = function (text, small, secs) {
  const b = $('banner'); b.innerHTML = esc(text) + (small ? '<small>' + esc(small) + '</small>' : ''); b.classList.add('on'); bannerT = secs || 3.5;
};
UI.feed = function (html) { feed(html); }; // 0.23 wardrobe: js/wardrobe.js says "New in the wardrobe" here
function feed(html) { const f = $('feed'), p = document.createElement('p'); p.innerHTML = html; f.appendChild(p); while (f.children.length > 4) f.removeChild(f.firstChild); setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 6000); }
function num(x, y, z, text, cls) {
  const n = nums[numI]; numI = (numI + 1) % nums.length;
  n.x = x + (Math.random() - 0.5) * 0.6; n.y = y; n.z = z + (Math.random() - 0.5) * 0.6; n.t = 0; n.life = 0.8; n.el.textContent = text; n.el.className = cls || '';
}
const hname = h => '<b class="t' + h.team + '">' + esc(h.name) + '</b>';
/* DREAMWALK captions. Each hidden system has a name and one plain line. In a Dreamwalk the first time a system happens its
   card is shown and it joins the list the player judges at the end. */
const SYS = {
  wave: ['The livelock', 'Both sides send the same troopers every 24 seconds. They meet and cancel. Shooting them changes nothing for long.'],
  soul: ['Souls and orbs', 'A dead trooper gives half a soul at once. The other half floats up. Shoot yours to keep it, theirs to deny it.'],
  zip: ['Threads', 'Stand on your own thread and ride it to the front. It reaches further as you push.'],
  thief: ['The small ones', 'The Hush has no heroes. It sends thieves for your souls and for the light in your houses.'],
  snuff: ['A stolen light', 'A small one took a house\'s light. Catch it before the gate and the light comes back. Miss, and the house stays dark two minutes.'],
  lastbreath: ['Last breath', 'Once per life, a killing blow leaves a hero standing with a sliver.'],
  nessup: ['The Ness', 'Three minutes in, something surfaces in the loch.'],
  nessdown: ['The Greatness', 'Whoever lands the last hit on the Ness gives their whole side 90 seconds of harder hits.'],
  redwarn: ['A mood', 'Thirty seconds before the rain the valley says one line. One view answers it. Three tries.'],
  moodmiss: ['Wrong view', 'That was not the view the mood wanted. The walk misses once on purpose so you can see it.'],
  moodsolved: ['The answer', 'The right view. This rain comes thin: no extra hollows, fewer thieves.'],
  red: ['Red rain', 'Every five minutes the Hush is thick for a minute.'],
  rainwake: ['Rainwake', 'A view worn in the rain: souls are worth half again while it is red.'],
  memory: ['Memory', 'A view for dark houses: the dark passes twice as fast and light holds twice as long. Souls are worth half while you wear it.'],
  fruit: ['Fruit', 'Lemons quicken, rose hips mend, Verde Limón sharpens. They grow back.'],
  bigfruit: ['Big fruit', 'The rare tier feeds the whole side, and each one exists only through one view.'],
  fold: ['The fold', 'With a crease\'s guard dead, the valley folds and one thread\'s troopers walk onto the next for 45 seconds.'],
  echo: ['Echo', 'Your last seconds, replayed beside you: the same shots from the same places.'],
  mercy: ['Mercy', 'Two structures behind, the Hush eases off. Nobody tells you.'],
  fishing: ['Fishing', 'Sometimes a whole side goes to the loch and leaves its threads empty.'],
  fray: ['The fray', 'At fifteen minutes structures start taking more damage.'],
  gutter: ['The gutter', 'At twenty minutes both patrons burn down. Someone has to win.'],
  relit: ['A light recovered', 'Ever Fallen: each small one put down relights the nearest dark house for 80 seconds.'],
  structdown: ['A house falls', 'Structures only take real damage while the attacker\'s troopers stand at them.']
};
let dreamSeen = [], dreamQ = [], dreamT = 0, wasMercy = false;
function sysOf(e) {
  switch (e.k) {
    case 'wave': return e.n === 2 ? 'wave' : null; case 'soul': return e.kind === 'secured' ? 'soul' : null;
    case 'zip': return e.u && e.u.team === 0 ? 'zip' : null; case 'thief': return 'thief'; case 'snuff': return e.faded ? null : 'snuff';
    case 'fruit': return C.FRUIT_INFO[e.kind].big ? 'bigfruit' : 'fruit'; case 'relit': return e.recovered ? 'relit' : null;
    case 'dream': return e.sys; case 'echo': return 'echo';
    case 'lastbreath': case 'nessup': case 'nessdown': case 'redwarn': case 'moodmiss': case 'moodsolved': case 'red': case 'fold': case 'fishing': case 'fray': case 'gutter': case 'structdown': return e.k;
  }
  return null;
}
function dreamShow(id) {
  if (!SYS[id] || dreamSeen.indexOf(id) >= 0) return;
  dreamSeen.push(id); dreamQ.push(id); // cards queue, so two things in one second are both read
}
function dreamNext() {
  const id = dreamQ.shift(), c = $('dreamCard'); if (!id) { c.hidden = true; return; }
  c.hidden = false; dreamT = dreamQ.length ? 4.5 : 8;
  c.querySelector('small').textContent = 'HIDDEN THING ' + (dreamSeen.indexOf(id) + 1); c.querySelector('b').textContent = SYS[id][0]; c.querySelector('p').textContent = SYS[id][1];
}
function callsDraw() {
  const L = $('callList'), cf = LL.cfg; if (!cf.calls) cf.calls = {}; L.innerHTML = '';
  dreamSeen.forEach(function (id) {
    const r = document.createElement('div'); r.className = 'cr'; r.innerHTML = '<span><b>' + SYS[id][0] + '</b><small>' + SYS[id][1] + '</small></span>';
    const g = document.createElement('div'); g.className = 'row';
    ['keep', 'change', 'cut'].forEach(function (v) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = v[0].toUpperCase() + v.slice(1); b.setAttribute('aria-pressed', String(cf.calls[id] === v));
      b.addEventListener('click', function () { cf.calls[id] = v; H.save(); callsDraw(); }); g.appendChild(b); });
    r.appendChild(g); L.appendChild(r);
  });
}
UI.callsText = function () { const cf = LL.cfg; return 'Livloch ' + (document.querySelector('#title footer').textContent.match(/[0-9.]+/) || [''])[0] + ' Dreamwalk calls\n' + dreamSeen.map(function (id) { return (cf.calls[id] || 'no call').toUpperCase() + '  ' + SYS[id][0]; }).join('\n'); };
UI.fx = function (e) {
  if (!W || !W.player) return;
  const pl = W.player;
  if (W.dream) { const sid = sysOf(e); if (sid) dreamShow(sid); }
  switch (e.k) {
    case 'hit':
      if (e.p === 1) {
        if (e.amt >= 1) num(e.x, e.y + 0.3, e.z, String(Math.round(e.amt)), e.crit ? 'crit' : '');
        const hm = $('hitm'); if (hm.className !== 'kill' || !hm.getAnimations || !hm.getAnimations().length) { hm.className = ''; void hm.offsetWidth; hm.className = 'on'; }
      } else if (e.p === 2) { hurt = Math.min(1, hurt + 0.25 + e.amt / 300); if (e.amt > 30) LL.input.rumble(0.5, 120); }
      break;
    case 'soul':
      if (e.p && e.kind === 'secured') num(e.x, e.y, e.z, '+' + Math.round(e.val) + ' secured', 'soul');
      else if (e.p && e.kind === 'denied') num(e.x, e.y, e.z, 'denied +' + Math.round(e.val), 'soul');
      else if (e.vsPlayer && e.kind === 'denied') num(e.x, e.y, e.z, 'denied', 'deny');
      else if (e.p && e.kind === 'drift') num(e.x, e.y, e.z, '+' + Math.round(e.val), 'soul');
      break;
    case 'herokill': {
      const v = e.victim, k = e.killer;
      if (k) feed(hname(k) + ' ' + KILL_VERBS[(k.kills + v.deaths) % KILL_VERBS.length] + ' ' + hname(v));
      else feed(hname(v) + ' walked into ' + (e.src && e.src.struct ? 'a ' + e.src.kind : (e.src && e.src.kind === 'ness' ? 'the loch' : (e.src && e.src.big ? 'a hollow' : 'the hush'))));
      if (k === pl) { UI.banner('You ' + KILL_VERBS[(k.kills + v.deaths) % KILL_VERBS.length] + ' ' + v.name + '.', '+' + (200 + 25 * v.level) + ' souls', 2.5); const hm = $('hitm'); hm.className = ''; void hm.offsetWidth; hm.className = 'kill'; LL.input.rumble(0.8, 200); }
      if (v === pl) { $('deadH').textContent = !k && e.src && e.src.kind === 'ness' ? 'The loch kept you.' : k ? k.name + ' ' + KILL_VERBS[(k.kills + v.deaths) % KILL_VERBS.length] + ' you.' : 'You came apart.'; LL.input.rumble(1, 400); }
      break;
    }
    case 'structdown': {
      const s = e.u, mine = s.team === pl.team, ln = C.LANE_NAME[s.lane];
      if (mine) UI.banner('Your ' + s.kind + ' on the ' + ln + ' has fallen.', s.kind === 'warden' ? 'Your patron is open' : 'The warden behind it is next', 4.5);
      else UI.banner('The Hush ' + s.kind + ' on the ' + ln + ' is down.', '+' + e.bounty + ' souls each' + (s.kind === 'warden' ? ' · their patron is open' : ''), 4.5);
      feed('<b class="t' + s.team + '">' + C.TEAM_NAME[s.team] + '</b> lost a ' + s.kind);
      break;
    }
    case 'thief': if (e.mark === pl) feed('A hush is out for your souls'); else if (e.mark.struct) feed('A hush is out for a lantern'); break;
    case 'theft': if (e.p) UI.banner('A hush has ' + Math.round(e.amt) + ' of your souls.', 'Catch it before it reaches the gate', 4.5); else feed('A hush robbed ' + hname(e.u)); break;
    case 'moodsolved': UI.unlock('plates'); UI.banner('That is the one.', 'The rain will come thin: no extra hollows, fewer thieves. +80 souls each', 5); break;
    case 'goal': { const q = $('quest'); feed('<b>Done</b> · ' + e.line + (e.pay ? ' · +' + e.pay : '')); q.classList.remove('done'); void q.offsetWidth; q.classList.add('done'); LL.audio.ui('ok'); break; }
    case 'echo': feed('<b>Echo</b> · ' + Math.round(e.len) + ' seconds of you' + (e.mem ? ', remembered whole' : '')); break;
    case 'echoend': if (e.shots) feed('The echo fired ' + e.shots + ' times and went'); break;
    case 'call': feed('Called to the <b>' + C.LANE_NAME[e.lane] + '</b>'); break;
    case 'lightkept': feed('A light, and nowhere dark to put it (' + e.n + ')'); break;
    case 'snuff': if (e.faded) { feed('The light on the ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + ' burned down'); break; } if (W.fallen) { feed('A hush took the light from the ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind); break; } UI.banner('The light is gone from your ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + '.', 'It cannot fire until the hush carrying its light is caught', 5); break;
    case 'thiefdown': if (e.vp && e.loot) feed('Your ' + Math.round(e.loot) + ' souls are back'); else if (e.p) feed('You caught the hush'); if (e.carry) feed('The ' + e.carry.kind + ' is lit again'); break;
    case 'thiefhome': if (W.fallen) { if (e.carry) feed('That light is gone for good'); break; } if (e.carry) UI.banner('The hush reached its gate.', 'Your ' + C.LANE_NAME[e.carry.lane] + ' ' + e.carry.kind + ' stays dark for two minutes', 4.5); else if (e.vp) feed('The hush got home with your souls'); break;
    case 'relit': if (e.recovered) { feed('<b>Light recovered</b> · ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + ' · ' + e.n); break; } feed('The ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + ' is lit again'); break;
    case 'fruit': { const fi = C.FRUIT_INFO[e.kind];
      if (fi.big) { UI.banner(e.p ? fi.name + '.' : e.u.name + ' found the ' + fi.name + '.', fi.line.charAt(0).toUpperCase() + fi.line.slice(1) + ', for ' + e.t + ' seconds' + (e.kind === 'biglime' ? '. Orbs come to you' : ''), 4.5); feed(hname(e.u) + ' ate the <b>' + fi.name + '</b>'); }
      else if (e.p) feed('<b style="color:' + fi.css + '">' + fi.name + '</b> · ' + fi.line + ', ' + e.t + ' s');
      break; }
    case 'fruitripe': if (e.lens) feed(e.lens === W.lens ? 'The <b>' + C.FRUIT_INFO[e.kind].name + '</b> is ripe' : 'Something ripened that this light does not show'); break;
    case 'lens': feed('View: <b>' + (LL.gfx.LOOKS[e.id] ? LL.gfx.LOOKS[e.id].name : e.id) + '</b>'); break;
    case 'moodmiss': feed('Not that view. ' + e.left + (e.left === 1 ? ' try left' : ' tries left')); break;
    case 'moodlost': feed('The mood slipped away'); break;
    case 'redwarn': UI.banner(C.MOODS[e.mood].line, 'Red rain in thirty seconds. One view answers this. Three tries (' + (LL.input.device === 'kbm' ? 'V' : 'the View button') + ')', 9); break;
    case 'red': if (e.thin) UI.banner('The rain comes down red, and thin.', 'You answered the mood. No extra hollows this time', 5); else if (W.fallen) UI.banner('Rain ' + e.n + '.', (e.n + 2) + ' extra hollows. It is one thicker every time', 5); else UI.banner('Then the rain comes down red.', 'The Hush is thick for a minute. Extra hollows on every thread', 5); break;
    case 'redend': feed('The rain thins'); break;
    case 'lastbreath': if (e.u === pl) feed('Last breath'); break;
    case 'fold':
      if (e.p) UI.banner('The valley folds.', 'Your ' + C.LANE_NAME[e.from] + ' troopers cross to the ' + C.LANE_NAME[e.to] + ' for ' + C.FOLD_T + ' seconds', 5);
      feed('<b class="t' + e.team + '">' + C.TEAM_NAME[e.team] + '</b> folded the valley');
      break;
    case 'foldend': if (e.p) feed('The crease lets go'); break;
    case 'death': if (e.kind === 'trooper' && e.by && e.by === W.player) { const hm = $('hitm'); hm.className = ''; void hm.offsetWidth; hm.className = 'pop'; } // 0.23: your trooper kills tick the crosshair
      if (e.kind === 'stray' && Math.hypot(e.x - C.CREASE_X[0], e.z) < 14 && !W.creaseHint) { W.creaseHint = true; feed('The ground under it is creased'); } break;
    case 'nessup': UI.banner('Something large is in the loch.', 'Kill the Ness for the Greatness: ' + C.GREAT_T + ' seconds of harder hits for your whole side', 6); feed('The <b>Ness</b> has surfaced'); break;
    case 'nessdown':
      if (e.team === pl.team) UI.banner('Your side has the Greatness.', '+350 souls each · guns, abilities and troopers hit harder for ' + C.GREAT_T + ' seconds', 5);
      else if (e.team >= 0) UI.banner('Hush has the Greatness.', 'Hold your structures for ' + C.GREAT_T + ' seconds', 5);
      if (e.hero) feed(hname(e.hero) + ' landed the <b>Ness</b>');
      break;
    case 'fishing': if (e.team !== pl.team) UI.banner('Hush is fishing.', 'They are all at the loch. Their threads are empty', 4); break;
    case 'gutter': UI.banner('Twenty minutes. Both patrons are guttering.', 'They burn down on their own now. The healthier one outlasts the other', 6); break;
    case 'fray': UI.banner('Fifteen minutes. The threads are fraying.', 'Structures have lost their protection', 5); break;
    case 'level': if (e.u === pl) { if (e.lv === C.ULT_LEVEL) UI.banner(pl.def.ab[2].name + ' is awake.', pl.def.ab[2].desc, 4.5); else feed('You reached level ' + e.lv); } break;
    case 'wave': if (e.n === 2 && !W.lean) UI.banner('Troopers drop souls.', 'Shoot the orb that floats up to secure the other half', 5); break;
    case 'immune':
      if (e.p && W.t - immuneT > 4) { immuneT = W.t; UI.banner('It will not break yet.', e.u.kind === 'patron' ? 'Drop a warden on any thread first' : 'Drop the guardian on this thread first', 3); }
      break;
    case 'respawn': if (e.u === pl) $('dead').hidden = true; break;
  }
};
UI.toggleShop = function (force) {
  if (!W || W.over) return;
  const open = force == null ? UI.screen !== 'shop' : force;
  if (open && UI.screen === null) { show('shop'); LL.input.unlock(); refreshShop(true); LL.audio.ui(); }
  else if (!open && UI.screen === 'shop') { show(null); H.relock(); }
};
function refreshShop(force) {
  const p = W.player; const s = Math.floor(p.souls);
  if (!force && s === lastSouls) return; lastSouls = s;
  $('shopSouls').textContent = s + ' souls';
  LL.ITEMS.forEach(function (it, i) {
    const b = $('item' + i), own = p.items.indexOf(i) >= 0;
    b.classList.toggle('own', own); b.classList.toggle('can', !own && s >= it.cost);
    b.querySelector('.c').textContent = own ? 'owned' : it.cost;
  });
}
UI.afterBuy = function (ok) { LL.audio.ui(ok ? 'ok' : 'no'); refreshShop(true); };
function board() {
  let h = '<table class="sb"><tr><th>Hero</th><th>Lv</th><th>K / D / A</th><th>Souls</th><th>Damage</th></tr>';
  W.heroes.forEach(function (x) { h += '<tr class="t' + x.team + (x.isPlayer ? ' me' : '') + '"><td>' + esc(x.name) + (x.isPlayer ? ' (you)' : '') + '</td><td>' + x.level + '</td><td>' + x.kills + ' / ' + x.deaths + ' / ' + x.assists + '</td><td>' + Math.round(x.total) + '</td><td>' + Math.round(x.dmgDealt) + '</td></tr>'; });
  return h + '</table>';
}
UI.showPause = function (onOff) {
  if (onOff) { $('sbPause').innerHTML = board(); $('oAuto').checked = H.autoFire(); $('bAuto').textContent = W.auto ? 'Take the wheel' : 'Let it play itself'; { const r = LL.perfReport(); $('perf').textContent = r ? r.text.split('\n').slice(1, 5).join(' · ') : 'Play for a few seconds, then pause again.'; $('perfNote').textContent = ''; } show('pause'); }
  else show(null);
};
UI.showOver = function () {
  const win = W.winner === 0, t = U.fmtTime(W.t);
  document.body.classList.remove('lean'); $('calls').hidden = !(W.dream || dreamSeen.length) || !dreamSeen.length; if (dreamSeen.length) { callsDraw(); $('copyNote').textContent = ''; }
  $('stars').hidden = !W.short;
  if (W.short && W.stars) { const n = LL.STARS.filter(function (x) { return W.stars[x.id]; }).length, cf = LL.cfg;
    $('overH').innerHTML = n === 5 ? 'Five stars. <em>The rain found nothing.</em>' : (n >= 3 ? 'The rain has passed. <em>' + n + ' of 5.</em>' : 'The rain has passed. ' + n + ' of 5.');
    $('overP').textContent = 'First rain, ' + t + '. ' + (n >= (cf.bestStars || 0) && n > 0 ? 'Your best.' : 'Best is ' + (cf.bestStars || 0) + '.') + (n < 5 ? ' The ones you missed are the things worth finding.' : ' Try the livelock next; it does not end by itself.');
    $('stars').innerHTML = '<div class="big">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></div>' + LL.STARS.map(function (x) { return '<p class="' + (W.stars[x.id] ? '' : 'no') + '">' + (W.stars[x.id] ? '★ ' : '· ') + x.line + '</p>'; }).join('');
    $('sbOver').innerHTML = board(); $('hud').hidden = true; show('over'); return; }
  if (W.fallen) { const cfg = LL.cfg, best = W.t >= (cfg.bestT || 0);
    $('overH').innerHTML = 'You held for <em>' + t + '</em>.';
    $('overP').textContent = 'Lights recovered: ' + W.lights + '. Moods answered: ' + W.moodsSolved + '. ' + (best ? 'That is the longest anyone has held here.' : 'Best is ' + U.fmtTime(cfg.bestT) + '.') + ' The valley was already lost; that was never the question.';
    $('sbOver').innerHTML = board(); $('hud').hidden = true; show('over'); return; }
  $('overH').innerHTML = win ? 'The Hush gate is <em>shut</em>.' : 'Your patron went dark.';
  $('overP').textContent = win ? 'The livelock resolved in ' + t + '. One door stays lit.' : 'The livelock resolved in ' + t + ', just not in your favour. The troopers did not notice.';
  $('sbOver').innerHTML = board(); $('hud').hidden = true; show('over');
};
UI.nav = function (I) {
  if (!UI.screen) return;
  const root = $(UI.screen), list = Array.prototype.filter.call(root.querySelectorAll('button, input'), el => !el.disabled && el.offsetParent !== null);
  if (!list.length) return;
  let i = list.indexOf(document.activeElement);
  if (I.take('navNext')) { i = (i + 1) % list.length; list[i].focus(); }
  else if (I.take('navPrev')) { i = (i - 1 + list.length) % list.length; list[i].focus(); }
  if (I.take('navOk') && i >= 0) list[i].click();
};
function minimap(view) {
  const cv = $('mini'), g = mctx, w = cv.width, h = cv.height, sc = Math.min(w / (2 * (C.HALF_X + 4)), h / (2 * (C.HALF_Z + 4)));
  const X = x => w / 2 - x * sc, Y = z => h / 2 - z * sc;
  g.clearRect(0, 0, w, h);
  g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = LL.gfx.look.ui.line;
  LL.lanes.forEach(function (L) { g.beginPath(); L.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); });
  g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = LL.gfx.look.ui.line; C.CREASE_X.forEach(function (cx, i) { const c = W.creases[i]; g.strokeStyle = c.t > 0 ? '#fff0a0' : LL.gfx.look.ui.line; g.beginPath(); g.moveTo(X(cx), Y(-13)); g.lineTo(X(cx), Y(13)); g.stroke(); }); g.setLineDash([]);
  g.fillStyle = 'rgba(60,150,170,0.55)'; g.beginPath(); g.arc(X(C.LOCH.x), Y(C.LOCH.z), C.LOCH.r * sc, 0, 6.3); g.fill();
  if (W.ness.alive) { g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(X(C.LOCH.x), Y(C.LOCH.z), 5.5, 0, 6.3); g.fill(); }
  W.fruit.forEach(function (f) { if (!f.ripe || (f.lens && f.lens !== W.lens)) return; g.fillStyle = C.FRUIT_INFO[f.k].css; g.beginPath(); g.arc(X(f.x), Y(f.z), f.lens ? 6 : 3, 0, 6.3); g.fill(); });
  W.strays.forEach(function (s) { if (!s.alive) return; g.fillStyle = 'rgba(201,160,255,0.8)'; g.beginPath(); g.arc(X(s.x), Y(s.z), 3, 0, 6.3); g.fill(); });
  W.troopers.forEach(function (t) { if (!t.alive) return; g.fillStyle = C.TEAM_CSS[t.team]; const z = t.big ? 4.5 : 1.5; g.fillRect(X(t.x) - z, Y(t.z) - z, z * 2, z * 2); });
  W.thieves.forEach(function (t) { if (!t.alive) return; g.fillStyle = (Math.floor(W.t * 4) % 2) ? '#f2e2ff' : C.TEAM_CSS[1]; g.save(); g.translate(X(t.x), Y(t.z)); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); });
  W.structs.forEach(function (s) {
    const z = s.kind === 'patron' ? 9 : (s.kind === 'warden' ? 7 : 6);
    g.fillStyle = s.alive ? (s.dark ? 'rgba(90,74,120,0.9)' : C.TEAM_CSS[s.team]) : 'rgba(120,110,125,0.5)';
    g.save(); g.translate(X(s.x), Y(s.z)); if (s.kind === 'patron') g.rotate(Math.PI / 4); g.fillRect(-z, -z, z * 2, z * 2);
    if (s.alive && s.hp < s.maxHp) { g.fillStyle = 'rgba(14,9,18,0.75)'; const f = 1 - s.hp / s.maxHp; g.fillRect(-z, -z, z * 2, z * 2 * f); }
    g.restore();
  });
  W.heroes.forEach(function (x) {
    if (!x.alive) return;
    g.fillStyle = C.TEAM_CSS[x.team]; g.strokeStyle = LL.gfx.look.ui.edge; g.lineWidth = 2;
    g.beginPath(); g.arc(X(x.x), Y(x.z), x.isPlayer ? 0 : 6, 0, 6.3); g.fill(); if (!x.isPlayer) g.stroke();
  });
  const p = W.player;
  if (p.alive) { g.save(); g.translate(X(p.x), Y(p.z)); g.rotate(-view.yaw); g.fillStyle = LL.gfx.look.ui.me; g.strokeStyle = LL.gfx.look.ui.edge; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore(); }
}
UI.frame = function (dt, w, view, info) {
  W = w; if ($('hud').hidden || !W.player) return;
  const p = W.player, d = p.def, R = LL.gfx;
  // numbers
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i]; if (n.life <= 0) continue;
    n.t += dt; const f = n.t / n.life;
    if (f >= 1) { n.life = 0; n.el.style.opacity = 0; continue; }
    R.project(n.x, n.y + f * 1.4, n.z, pr);
    n.el.style.opacity = pr.vis ? (f < 0.7 ? 1 : (1 - f) / 0.3) : 0;
    n.el.style.transform = 'translate(' + Math.round(pr.x) + 'px,' + Math.round(pr.y) + 'px) translate(-50%,-50%)';
  }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on'); }
  hurt = Math.max(0, hurt - dt * 1.6);
  const hpF = p.hp / p.maxHp;
  $('vig').style.opacity = p.alive ? Math.min(0.9, hurt * 0.7 + (hpF < 0.35 ? (0.35 - hpF) * 2 : 0)) : 0;
  const cr = $('cross'); cr.className = info.orb ? 'orb' : (info.hot ? 'hot' : ''); cr.style.visibility = p.alive && !W.auto ? 'visible' : 'hidden';
  for (let i = 0; i < 3; i++) {
    const b = $('ab' + i), cd = p.cds[i], locked = i === 2 && p.level < C.ULT_LEVEL;
    b.classList.toggle('locked', locked); b.classList.toggle('cd', cd > 0); b.classList.toggle('ready', !locked && cd <= 0 && p.alive);
    b.querySelector('i').style.height = cd > 0 ? Math.min(100, cd / p.cdMax[i] * 100) + '%' : (locked ? '100%' : '0');
    const em = b.querySelector('em'), tx = locked ? 'Lv' + C.ULT_LEVEL : (cd > 0 ? String(Math.ceil(cd)) : ''); if (em.textContent !== tx) em.textContent = tx;
  }
  slowT -= dt; miniT -= dt;
  if (miniT <= 0) { miniT = 0.1; minimap(view); }
  if (slowT > 0) return;
  slowT = 0.08;
  $('hpFill').style.width = (hpF * 100) + '%'; $('shFill').style.width = Math.min(100, p.shield / p.maxHp * 100) + '%';
  $('hpTxt').textContent = Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp);
  const am = $('ammo'); am.classList.toggle('rel', p.reloadT > 0); $('ammoN').textContent = p.reloadT > 0 ? '· · ·' : p.ammo + ' / ' + p.magSize;
  const st = $('stam'); if (st.children.length !== p.st.stam) { st.innerHTML = ''; for (let i = 0; i < p.st.stam; i++) st.appendChild(document.createElement('i')); }
  for (let i = 0; i < st.children.length; i++) st.children[i].className = i < p.stamina ? 'on' : '';
  const s = Math.floor(p.souls); $('soulN').textContent = s; $('lvl').textContent = 'Lv ' + p.level;
  let can = false; for (let i = 0; i < LL.ITEMS.length; i++) if (p.items.indexOf(i) < 0 && s >= LL.ITEMS[i].cost) { can = true; break; }
  $('souls').classList.toggle('can', can);
  $('clock').textContent = U.fmtTime(W.t) + (W.lens === 'rain' && W.red <= 0 ? ' · rain ' + U.fmtTime(Math.max(0, W.redNext - W.t)) : ''); $('k0').textContent = W.fallen ? W.lights : W.kills[0];
  { const g = S.goal(), q = $('quest'), t = g ? g.id : ''; if (q.dataset.g !== t) { q.dataset.g = t; q.hidden = !g || W.dream; if (g) q.innerHTML = '<small>NEXT</small>' + g.line + (g.pay ? ' · <b>+' + g.pay + '</b>' : ''); } }
  { const er = S.echoReady(), be = $('bEcho'), le = $('lEcho'); if (be.disabled === er) be.disabled = !er; if (le.disabled === er) le.disabled = !er; }
  if (W.dream) { if (W.mercy && !wasMercy) dreamShow('mercy'); wasMercy = W.mercy; dreamT -= dt; if (dreamT <= 0 && (dreamQ.length || !$('dreamCard').hidden)) dreamNext(); }
  if (W.lean) { const ok = S.leanCrease() >= 0, lf = $('lFold'); if (lf.disabled === ok) lf.disabled = !ok; for (let l = 0; l < 3; l++) { const b = $('lCall' + l), on = String(p.ai.lane === l); if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on); } } $('k1').textContent = W.kills[1];
  $('dead').hidden = p.alive || UI.screen === 'shop'; if (!p.alive) $('deadT').textContent = Math.ceil(p.respT);
  { // with the mouse captured the buttons cannot be clicked, so the keys are written on them
    const kb = LL.input.device === 'kbm' && !W.lean, k = $('keys'); if (k.hidden === kb) k.hidden = !kb;
    const t = kb ? 'Press B to spend souls while you wait' : 'Spend souls while you wait', d = $('bDeadShop'); if (d.textContent !== t) d.textContent = t; }
  $('autoTag').hidden = !W.auto;
  { const bf = $('buffs'), a = []; if (p.zestT > 0) a.push('Lemon ' + Math.ceil(p.zestT)); if (p.furyT > 0) a.push('Verde Limón ' + Math.ceil(p.furyT)); if (p.hipsT > 0) a.push('Rose hips ' + Math.ceil(p.hipsT)); if (W.pull[p.team] > 0) a.push('orbs come to you ' + Math.ceil(W.pull[p.team]));
    bf.hidden = !a.length; if (a.length) { const t = a.join(' · '); if (bf.textContent !== t) bf.textContent = t; } }
  { const mo = $('moons'), pp = W.red > 0 ? 1 : U.clamp(1 - (W.redNext - W.t) / W.redEvery, 0, 1); mo.classList.toggle('red', W.red > 0); for (let i = 0; i < 5; i++) mo.children[i].style.setProperty('--ph', U.clamp(pp * 5 - i, 0, 1).toFixed(2)); }
  const gr = $('great'), g0 = W.great[p.team], g1 = W.great[1 - p.team];
  if (g0 > 0 || g1 > 0) { gr.hidden = false; gr.className = g0 > 0 ? 'mine' : 'theirs'; gr.textContent = (g0 > 0 ? 'Greatness · ' + Math.ceil(g0) : 'Hush Greatness · ' + Math.ceil(g1)) + 's'; } else gr.hidden = true;
  const pm = $('prompt'), tz = $('tZip');
  if (p.alive && !W.auto && info.canFold) {
    pm.hidden = false; pm.innerHTML = '<b>' + (LL.input.device === 'pad' ? 'D-pad up' : 'T') + '</b> · fold the valley'; tz.hidden = false; tz.textContent = 'Fold';
  } else if (p.alive && !W.auto && (info.canZip || p.zip)) {
    const dev = LL.input.device, key = dev === 'pad' ? 'D-pad up' : 'T';
    pm.hidden = false; pm.innerHTML = p.zip ? '<b>' + (dev === 'pad' ? 'A' : 'Space') + '</b> · let go' : '<b>' + key + '</b> · ride the thread';
    tz.hidden = false; tz.textContent = p.zip ? 'Let go' : 'Ride thread';
  } else { pm.hidden = true; tz.hidden = true; }
  if (UI.screen === 'shop') refreshShop(false);
};
})();
