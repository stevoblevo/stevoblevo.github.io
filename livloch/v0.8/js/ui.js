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
  on('bAuto', H.auto); on('bInk', H.ink);
  // settings
  const bind = (id, key, type) => {
    const el = $(id);
    if (type === 'c') el.checked = !!cfg[key]; else el.value = cfg[key];
    el.addEventListener('input', function () { cfg[key] = type === 'c' ? el.checked : +el.value; H.save(); H.apply(); });
  };
  bind('oSens', 'sens'); bind('oVol', 'vol'); bind('oInv', 'invert', 'c'); bind('oAssist', 'assist', 'c'); bind('oLow', 'low', 'c');
  $('oAuto').addEventListener('input', function () { cfg.autoFire = $('oAuto').checked; H.save(); });
};
UI.lookChips = function () { const k = LL.cfg.look; document.querySelectorAll('[data-look]').forEach(b => { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute('data-look') === k)); }); const L = LL.gfx.LOOKS[k]; $('lookLine').textContent = L ? 'Look: ' + L.name + ', from ' + L.kit + '.' : ''; };
UI.record = function () { const c = LL.cfg; $('rec').textContent = (c.wins + c.losses) ? 'Your record: ' + c.wins + ' won, ' + c.losses + ' lost' : ''; };
UI.error = function (msg) { const e = $('err'); e.hidden = false; e.textContent = msg; $('bPlay').disabled = true; $('bWatch').disabled = true; };
function show(name) {
  UI.screen = name;
  ['title', 'shop', 'pause', 'over'].forEach(function (s) { $(s).hidden = s !== name; });
  if (name && LL.input.device !== 'touch') { const b = $(name).querySelector('.btn.primary, .btn'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
UI.showTitle = function () { $('hud').hidden = true; show('title'); UI.record(); };
UI.startHUD = function (w) {
  W = w; const p = W.player, d = p.def;
  $('hud').hidden = false; show(null);
  $('hud').style.setProperty('--hc', d.css);
  for (let i = 0; i < 3; i++) { const b = $('ab' + i); b.querySelector('span').textContent = d.ab[i].name; b.title = d.ab[i].name + ': ' + d.ab[i].desc; }
  $('gunN').textContent = d.gun.name;
  $('feed').innerHTML = ''; $('dead').hidden = true; lastSouls = -1; hurt = 0;
  nums.forEach(n => { n.life = 0; n.el.style.opacity = 0; });
  UI.banner('The ' + C.LANE_NAME[1] + ' is yours.', 'Your side holds the other two. Shop any time with ' + (LL.input.device === 'kbm' ? 'B' : 'the Shop button') + '.', 5);
  $('bAuto').textContent = W.auto ? 'Take the wheel' : 'Let it play itself';
};
UI.coach = function (text) { const c = $('coach'); c.hidden = !text; if (text) c.textContent = text; };
UI.banner = function (text, small, secs) {
  const b = $('banner'); b.innerHTML = esc(text) + (small ? '<small>' + esc(small) + '</small>' : ''); b.classList.add('on'); bannerT = secs || 3.5;
};
function feed(html) { const f = $('feed'), p = document.createElement('p'); p.innerHTML = html; f.appendChild(p); while (f.children.length > 4) f.removeChild(f.firstChild); setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 6000); }
function num(x, y, z, text, cls) {
  const n = nums[numI]; numI = (numI + 1) % nums.length;
  n.x = x + (Math.random() - 0.5) * 0.6; n.y = y; n.z = z + (Math.random() - 0.5) * 0.6; n.t = 0; n.life = 0.8; n.el.textContent = text; n.el.className = cls || '';
}
const hname = h => '<b class="t' + h.team + '">' + esc(h.name) + '</b>';
UI.fx = function (e) {
  if (!W || !W.player) return;
  const pl = W.player;
  switch (e.k) {
    case 'hit':
      if (e.p === 1) {
        if (e.amt >= 1) num(e.x, e.y + 0.3, e.z, String(Math.round(e.amt)), e.crit ? 'crit' : '');
        const hm = $('hitm'); hm.className = ''; void hm.offsetWidth; hm.className = 'on';
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
    case 'snuff': UI.banner('The light is gone from your ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + '.', 'It cannot fire until the hush carrying its light is caught', 5); break;
    case 'thiefdown': if (e.vp && e.loot) feed('Your ' + Math.round(e.loot) + ' souls are back'); else if (e.p) feed('You caught the hush'); if (e.carry) feed('The ' + e.carry.kind + ' is lit again'); break;
    case 'thiefhome': if (e.carry) UI.banner('The hush reached its gate.', 'Your ' + C.LANE_NAME[e.carry.lane] + ' ' + e.carry.kind + ' stays dark for two minutes', 4.5); else if (e.vp) feed('The hush got home with your souls'); break;
    case 'relit': feed('The ' + C.LANE_NAME[e.u.lane] + ' ' + e.u.kind + ' is lit again'); break;
    case 'fruit': { const fi = C.FRUIT_INFO[e.kind];
      if (e.kind === 'biglime') { UI.banner(e.p ? 'Big Verde Limón.' : e.u.name + ' found the Big Verde Limón.', 'Your whole side is sour and quick for ' + e.t + ' seconds, and orbs come to you', 4.5); feed(hname(e.u) + ' ate the <b>Big Verde Limón</b>'); }
      else if (e.p) feed('<b style="color:' + fi.css + '">' + fi.name + '</b> · ' + fi.line + ', ' + e.t + ' s');
      break; }
    case 'fruitripe': if (e.kind === 'biglime') feed('The <b>Big Verde Limón</b> is ripe'); break;
    case 'redwarn': UI.banner('The moons are nearly full.', 'Red rain in fifteen seconds', 3.5); break;
    case 'red': UI.banner('Then the rain comes down red.', 'The Hush is thick for a minute. Extra hollows on every thread', 5); break;
    case 'redend': feed('The rain thins'); break;
    case 'lastbreath': if (e.u === pl) feed('Last breath'); break;
    case 'fold':
      if (e.p) UI.banner('The valley folds.', 'Your ' + C.LANE_NAME[e.from] + ' troopers cross to the ' + C.LANE_NAME[e.to] + ' for ' + C.FOLD_T + ' seconds', 5);
      feed('<b class="t' + e.team + '">' + C.TEAM_NAME[e.team] + '</b> folded the valley');
      break;
    case 'foldend': if (e.p) feed('The crease lets go'); break;
    case 'death': if (e.kind === 'stray' && Math.hypot(e.x - C.CREASE_X[0], e.z) < 14 && !W.creaseHint) { W.creaseHint = true; feed('The ground under it is creased'); } break;
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
    case 'wave': if (e.n === 2) UI.banner('Troopers drop souls.', 'Shoot the orb that floats up to secure the other half', 5); break;
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
  if (onOff) { $('sbPause').innerHTML = board(); $('oAuto').checked = H.autoFire(); $('bAuto').textContent = W.auto ? 'Take the wheel' : 'Let it play itself'; show('pause'); }
  else show(null);
};
UI.showOver = function () {
  const win = W.winner === 0, t = U.fmtTime(W.t);
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
  W.fruit.forEach(function (f) { if (!f.ripe) return; g.fillStyle = C.FRUIT_INFO[f.k].css; g.beginPath(); g.arc(X(f.x), Y(f.z), f.k === 'biglime' ? 6 : 3, 0, 6.3); g.fill(); });
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
  $('clock').textContent = U.fmtTime(W.t); $('k0').textContent = W.kills[0]; $('k1').textContent = W.kills[1];
  $('dead').hidden = p.alive || UI.screen === 'shop'; if (!p.alive) $('deadT').textContent = Math.ceil(p.respT);
  $('autoTag').hidden = !W.auto;
  { const bf = $('buffs'), a = []; if (p.zestT > 0) a.push('Lemon ' + Math.ceil(p.zestT)); if (p.furyT > 0) a.push('Verde Limón ' + Math.ceil(p.furyT)); if (p.hipsT > 0) a.push('Rose hips ' + Math.ceil(p.hipsT)); if (W.pull[p.team] > 0) a.push('orbs come to you ' + Math.ceil(W.pull[p.team]));
    bf.hidden = !a.length; if (a.length) { const t = a.join(' · '); if (bf.textContent !== t) bf.textContent = t; } }
  { const mo = $('moons'), pp = W.red > 0 ? 1 : U.clamp(1 - (W.redNext - W.t) / C.RED_EVERY, 0, 1); mo.classList.toggle('red', W.red > 0); for (let i = 0; i < 5; i++) mo.children[i].style.setProperty('--ph', U.clamp(pp * 5 - i, 0, 1).toFixed(2)); }
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
