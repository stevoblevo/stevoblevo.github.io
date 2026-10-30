// ===== the brook: nougats, stepping stones that change the whole scene, stories read aloud, idling, and her =====
// Nougats are kept, never spent: each stone opens when the jar holds enough. Walking a stone changes the look, the
// tuning, the view and the mood at once (a scene). "Open everything" is the early-access door: all of it, now.
const STONES = [
  { id: 'morning', name: 'Morning paper', line: 'Meta Daylight, easy listening, the mandala.', need: 0, go: () => scene({ skin: 'sb-daylight', mode: 'easy', view: 'mandala', mood: 'light' }) },
  { id: 'jam1', name: 'Jam: one chord', line: 'A seventh chord in 4:5:6:7 and a band that waits for you.', need: 2, go: () => { closeBrook(); jamStart(1); } },
  { id: 'glass', name: 'The glasshouse', line: 'Mint haze, just intonation, sand on a plate.', need: 4, go: () => scene({ skin: 'glasshouse', mode: 'just', view: 'cymatics', mood: 'light' }) },
  { id: 'knight', name: 'Knight Night', line: 'A cobalt paper theatre in thirty-one steps.', need: 6, go: () => scene({ skin: 'sb-knight', mode: 'tet31', view: 'cube', mood: 'light' }) },
  { id: 'peach', name: 'Peach fall', line: 'Gamelan, and weather that follows the music.', need: 8, go: () => scene({ skin: 'peachfall', mode: 'gamelan', view: 'mandala', mood: 'light' }) },
  { id: 'ink', name: 'Ink blot', line: 'Black ink on white, Bohlen–Pierce, no octaves.', need: 10, go: () => scene({ skin: 'sb-inkblot', mode: 'bp', view: 'mandala', mood: 'lean' }) },
  { id: 'jam2', name: 'Jam: twelve bars', line: 'The blues in 7-limit just intonation. Trade twos with the horn.', need: 12, go: () => { closeBrook(); jamStart(2); } },
  { id: 'comix', name: 'Comix', line: 'Halftone, balloons, a frolic in triplets.', need: 15, go: () => { scene({ skin: 'sb-comix', mode: 'easy', view: 'mandala', mood: 'frolic' }); setTuplet(3, true); } },
  { id: 'origami', name: 'Origami', line: 'Folded paper on a cutting mat, 10-TET, sand.', need: 18, go: () => scene({ skin: 'sb-origami', mode: 'tet10', view: 'cymatics', mood: 'light' }) },
  { id: 'mirror', name: 'The mirror', line: 'AND SO opened inside AND SO, and 6.1 kept as it was.', need: 21, go: () => { closeBrook(); mirrorTable(true); } },
  { id: 'skein', name: 'SKEIN silk', line: 'Silk, copper thread, and a doll who knits.', need: 25, go: () => { SET.petForm = 'skein'; scene({ skin: 'sb-skein', mode: 'just', view: 'mandala', mood: 'light' }); } },
  { id: 'jam3', name: 'Jam: the turnaround', line: 'The ragtime turnaround in thirty-one steps, every seventh a barbershop one.', need: 30, go: () => { closeBrook(); jamStart(3); } },
  { id: 'deep', name: 'Five folds deep', line: 'Obsidian, the 5D lattice, and whatever she has become.', need: 36, go: () => { if (!SET.x5d) setX5d(true); scene({ skin: 'obsidian', mode: 'just', view: 'd5', mood: 'lean' }); } }
];
const STONE = new Map(STONES.map(s => [s.id, s]));
const stoneOpen = s => allUnlocked || GAME.nougats >= s.need;
let curStone = 'morning';

// ---------- nougats ----------
let jarBumpT = 0;
function nougat(n, x, y, why) {
  if (!entered || !n) return;
  if (MIR.depth > 0) { mirUp({ andso: 'nougat', n, why: why || '' }); return; }   // there is one jar, at the top of the chain
  const before = GAME.nougats; GAME.nougats += n;
  const jar = $('jar');
  if (jar && window.Storeybrook && !reduceMotion && x != null) {
    const jr = jar.getBoundingClientRect();
    for (let k = 0; k < Math.min(n, 5); k++) {
      const f = document.createElement('div'); f.className = 'sb-drop-flight'; f.setAttribute('aria-hidden', 'true');
      f.innerHTML = '<span class="sb-nougat" style="--n:40px">' + Storeybrook.nougatSVG(k + 3) + '</span>'; document.body.appendChild(f);
      const x0 = clamp(x, 10, W - 50) - 20, y0 = clamp(y, 10, H - 40) - 12, x1 = jr.left + jr.width / 2 - 20, y1 = jr.top + jr.height * 0.4 - 12, lift = Math.min(220, Math.abs(y1 - y0) * 0.6 + 80), fr = [];
      for (let s = 0; s <= 12; s++) { const q = s / 12; fr.push({ transform: `translate(${(x0 + (x1 - x0) * q).toFixed(1)}px,${(y0 + (y1 - y0) * q - Math.sin(Math.PI * q) * lift).toFixed(1)}px) rotate(${(q * 380) | 0}deg) scale(${(1 - q * 0.35).toFixed(2)})` }); }
      const a = f.animate(fr, { duration: 900, delay: k * 130, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
      a.onfinish = () => { f.remove(); jarPaint(true); };
    }
  } else jarPaint(true);
  audio.chime(fold(fRoot * 6, M.eq, 700), 0.018, 0.85);
  if (why) jlog(`nougat +${n}: ${why}`);
  STONES.forEach(s => { if (!allUnlocked && before < s.need && GAME.nougats >= s.need) setTimeout(() => stoneNews(s), 1200); });
  if (GAME.nougats >= 10 && before < 10) discover('x-nougat10');
  persistSoon();
}
function jarPaint(bump) {
  const jar = $('jar'); if (!jar) return;
  const cap = Math.max(10, (STONES.find(s => s.need > GAME.nougats) || STONES[STONES.length - 1]).need);
  if (window.Storeybrook) { const svg = jar.querySelector('svg'); const html = Storeybrook.jarSVG(Math.min(1, GAME.nougats / cap)); if (svg) svg.outerHTML = html; else jar.insertAdjacentHTML('afterbegin', html); }
  $('jarN').textContent = String(GAME.nougats);
  jar.setAttribute('aria-label', `${GAME.nougats} nougats in the jar. open the brook`);
  if (bump) { jar.classList.remove('is-bump'); void jar.offsetWidth; jar.classList.add('is-bump'); jarBumpT = t; }
}
function stoneNews(s) {
  const jar = $('jar'); if (jar) jar.classList.add('news');
  if (REEL.on) { REEL.news.push(`a stone opened on the brook: ${s.name}.`); jlog(`stone open: ${s.name}`); return; }
  caption(`a stone opened on the brook: ${s.name}.`, 3200);
  jlog(`stone open: ${s.name}`);
}

// ---------- scenes: the whole look at once, behind a turning page ----------
function scene(o) {
  turnPage(() => {
    if (o.skin) setSkin(o.skin);
    if (o.mode && MODES[o.mode] && o.mode !== M.key) setMode(o.mode, true);
    if (o.view) setViewMode(o.view, true);
    if (o.mood) { if (SET.normie) setNormie(false); setMood(o.mood); }
    syncUI();
  });
}
function turnPage(mid) {
  const el = $('turn');
  if (!el || reduceMotion || !el.animate) { mid(); return; }
  el.classList.add('on');
  const a = el.animate([{ transform: 'translateX(102%) skewX(-8deg)' }, { transform: 'translateX(0) skewX(0deg)' }], { duration: 380, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
  a.onfinish = () => {
    try { mid(); } catch (e) {}
    const b = el.animate([{ transform: 'translateX(0) skewX(0deg)' }, { transform: 'translateX(-102%) skewX(8deg)' }], { duration: 420, delay: 80, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    b.onfinish = () => { el.classList.remove('on'); el.getAnimations().forEach(x => x.cancel()); };
  };
  try { if (window.Storeybrook) Storeybrook.sound.play('page'); } catch (e) {}
}
function walkStone(id) {
  const s = STONE.get(id); if (!s) return;
  if (!stoneOpen(s)) { caption(`${s.name} opens at ${s.need} nougats. ${s.need - GAME.nougats} to go.`, 2600); return; }
  curStone = id; if (!GAME.stones.includes(id)) { GAME.stones.push(id); if (GAME.stones.length === 3) discover('x-stone'); nougat(1, W / 2, H / 2, `walked ${s.name}`); }
  if (id !== 'mirror') closeBrook();
  try { s.go(); } catch (e) {}
  STORIES.forEach(st => { if (st.after === id && !GAME.stories.includes(st.id)) { GAME.stories.push(st.id); setTimeout(() => caption(`a new story in the book: ${st.title}.`, 3200), 1500); } });
  jlog(`stone: ${s.name}`); persistSoon();
}

// ---------- the brook map ----------
let brookApi = null;
function openBrook() {
  const el = $('brookMap'); if (!el) return;
  el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); $('jar').classList.remove('news');
  $('bmN').textContent = String(GAME.nougats);
  const nn = el.querySelector('[data-sb-nougat]'); if (nn && !nn.firstChild && window.Storeybrook) nn.innerHTML = Storeybrook.nougatSVG(5);
  const host = $('bmBrook'), stones = STONES.map(s => ({ id: s.id, label: s.name, sub: stoneOpen(s) ? (GAME.stones.includes(s.id) ? 'walked' : 'open') : `${s.need - GAME.nougats} more`,
    state: !stoneOpen(s) ? 'locked' : s.id === curStone ? 'current' : GAME.stones.includes(s.id) ? 'done' : 'open', why: `${s.name} opens at ${s.need} nougats.`, mark: '' }));
  host.innerHTML = '';
  if (window.Storeybrook) brookApi = Storeybrook.brook(host, { stones, seed: 11, direction: host.clientHeight > host.clientWidth * 0.9 ? 'down' : 'across', onStep: s => walkStone(s.id) });
  renderStoryList(); $('bmEA').classList.toggle('hidden', allUnlocked);
  setTimeout(() => { const f = el.querySelector('.sb-stone[data-state="current"], .sb-stone:not([data-state="locked"])'); if (f) f.focus(); }, 60);
  jlog('opened the brook');
}
function closeBrook() { const el = $('brookMap'); if (!el) return; el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); }

// ---------- stories, read aloud (an Irish English voice when the device has one) ----------
const STORIES = [
  { id: 'valley', title: 'The bottom of the valley', after: null, text: () => STORY },
  { id: 'octopus', title: 'The octopus who learned to be a bunny', after: 'glass', text: () => `Saelion was mostly tree octopus on Mondays. It is the kind of thing that happens when you live between two tuning systems and nobody checks your sources.

On Tuesday she tried being a bunny. The ears were easy; they went up when the chord was major and folded down when it leaned. The hopping was harder. Octopus arms do not hop. They pour.

So she poured from valley to valley, and every time she landed, a note rang out, small and exact, like a spoon on a glass. By Wednesday the other voices were landing on her beat. By Thursday she had a band.

On Friday she tried the butterfly part. It turned out to be the easiest of all. You only have to stop holding on.` },
  { id: 'nougats', title: 'Nougats in the brook', after: 'jam1', text: () => `There is a brook that runs under the music, and in the brook there are nougats. Nobody put them there. They are what is left over when a chord comes out right: a little sweetness, wrapped in paper, twisted at both ends.

Saelion keeps them in a jar. She does not eat them. She counts them, and when there are enough, a stone rises out of the water and she can walk a little further down.

Some of the stones lead to other papers. One is the colour of a cobalt night. One is all ink and no colour at all. One is folded so many times it has corners in places corners should not be.

At the end of the brook, she has heard, there is a window. She is not sure yet what is on the other side. She suspects it is her.` },
  { id: 'window', title: 'The window inside the window', after: 'mirror', text: () => `When you open AND SO inside AND SO, the small one is not a picture. It is the whole thing, running, with its own valleys and its own bird.

Saelion noticed first. She pressed her face to the glass of the little window and the Saelion inside pressed back. Then the little one opened a window of her own, and there was a smaller Saelion inside that, and then there were three of them looking at each other, and nobody blinked.

The deeper she goes, the more eyes she has. She says it is so she can keep track of everyone. She says it is perfectly normal. She says you should not close the window while she is still in it.

You can, though. She always comes back.` },
  { id: 'silk', title: 'Silk and copper', after: 'skein', text: () => `The doll was knitted from leftovers: mint from a cardigan, cream from a christening lace, copper from a braid of thread that had been wound around a pencil for years.

She cannot hear the music, exactly. She feels it in the knit. A pure fifth makes her stitches sit flat. A wolf fifth makes them pull. When the chord is just right, the copper braids lift a little, the way hair does before a storm.

She has button eyes, which means she never has to blink, which means she has seen everything. She would like you to know she is very good at keeping secrets, and one of them is yours.` }
];
let storyCur = 'valley';
function renderStoryList() {
  const ul = $('bmStories'); if (!ul) return; ul.textContent = '';
  STORIES.forEach(st => {
    const li = document.createElement('li'), b = document.createElement('button'), open = GAME.stories.includes(st.id) || allUnlocked;
    b.type = 'button'; b.className = 'sb-btn sb-btn--quiet'; b.disabled = !open;
    b.innerHTML = window.Storeybrook ? Storeybrook.icon(open ? 'book' : 'lock', 20) : '';
    b.appendChild(document.createTextNode(open ? st.title : `a story after ${(STONE.get(st.after) || {}).name || 'the brook'}`));
    if (open) b.addEventListener('click', () => { closeBrook(); openStory(st.id); });
    li.appendChild(b); ul.appendChild(li);
  });
}
function openStory(id) {
  const st = STORIES.find(s => s.id === id) || STORIES[0]; storyCur = st.id;
  $('stTitle').textContent = st.title;
  const pane = $('stPane'); pane.__sbWords = null; pane.textContent = '';
  st.text().split(/\n\s*\n/).forEach(par => { const p = document.createElement('p'); p.textContent = par.trim(); pane.appendChild(p); });
  $('stText').value = st.text(); $('stText').classList.add('hidden'); pane.classList.remove('hidden');
  $('story').classList.add('on'); storyVoiceNote();
  if (GAME.stories.length >= 2 && st.id !== 'valley') discover('x-story2');
}
function storyVoiceNote() {
  const R = window.Storeybrook && Storeybrook.read; if (!R || !R.supported) { $('stVoice').textContent = "this browser can't read aloud. the words are all here."; return; }
  const v = R.pick(); $('stVoice').textContent = v ? `voice: ${v.name} (${v.lang})` : 'voice: the default one.';
}
function readStoryAloud() {
  const R = window.Storeybrook && Storeybrook.read; const pane = $('stPane');
  if (!$('stText').classList.contains('hidden')) {   // reading your own pasted story
    pane.__sbWords = null; pane.textContent = ''; $('stText').value.split(/\n\s*\n/).forEach(par => { const p = document.createElement('p'); p.textContent = par.trim(); pane.appendChild(p); });
    $('stText').classList.add('hidden'); pane.classList.remove('hidden');
  }
  if (!R || !R.supported) { readStory(); return; }
  if (R.state === 'speaking') { R.pause(); $('stRead').textContent = 'keep reading'; return; }
  if (R.state === 'paused') { R.resume(); $('stRead').textContent = 'pause'; return; }
  R.speak(pane, { rate: 0.95, pitch: 1.05 }); $('stRead').textContent = 'pause'; storyVoiceNote(); discover('x-story'); jlog('read a story aloud');
}
window.addEventListener('sb:read', e => { const s = e.detail && e.detail.state; if (s === 'done' || s === 'stopped') { const b = $('stRead'); if (b) b.textContent = 'read to me'; } });

// ---------- idling, a daily nougat, and how long you've been here ----------
let idleNougatAt = 0, whisperAt = 0;
function brookTick(dt) {
  if (!entered) return;
  GAME.played += dt;
  if (MIR.depth === 0) {
    const idle = t - lastUserT;
    if (idle > 90 && !paused && !muted && A.ac) { if (!idleNougatAt) idleNougatAt = t + 150; else if (t > idleNougatAt) { idleNougatAt = t + 150; nougat(1, pet.x, pet.y, 'leaving it on'); } }
    else idleNougatAt = 0;
  }
  if (jarBumpT && t - jarBumpT > 0.6) { jarBumpT = 0; const j = $('jar'); if (j) j.classList.remove('is-bump'); }
  // she says strange small things once she has been somewhere deep, unless the words are off
  const E = eerie();
  if (E > 0.45 && !QUIET() && UNL.pet && t > whisperAt) {
    whisperAt = t + rand(40, 90) * (1.4 - E);
    if (Math.random() < 0.7 && !(pet.say && t < pet.sayUntil)) { pet.say = WHISPERS[(Math.random() * WHISPERS.length) | 0]; pet.sayUntil = t + 5; }
  }
  if (E >= 0.9 && UNL.pet) discover('x-eyes');
}
const WHISPERS = ['i can see the other window from here.', 'how many of me are there now?', "you're further in than last time.", "don't close me while i'm still in it.", 'the one inside is copying me. i think.', 'i counted your nougats. twice.', 'every valley is a little sun. some are a little eye.', 'shh. the band is listening.', "i grew another one. it's for watching the bird."];
// how strange she has become: deeper in the mirror, more lattice folds, more hours together
function eerie() { return SET.petEerie ? clamp((MIR.depth + 0.5 * MIR.deep) * 0.34 + depth * 0.07 + Math.min(1, GAME.played / 5400) * 0.32 + 0.05 * MIR.wins.length, 0, 1) : 0; }
function dailyNougat() {
  let day = ''; try { day = new Date().toISOString().slice(0, 10); } catch (e) { return; }
  if (day && day !== GAME.lastDay && MIR.depth === 0) { const first = !GAME.lastDay; GAME.lastDay = day; setTimeout(() => { nougat(first ? 2 : 3, W / 2, H * 0.4, first ? 'a first visit' : 'coming back'); if (!first) caption('three nougats for coming back.', 2400); }, 2500); }
}
function closeStory() { try { if (window.Storeybrook) Storeybrook.read.stop(true); else if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} $('story').classList.remove('on'); $('stRead').textContent = 'read to me'; }

// ---------- the landing: Saelion, the title, and the brook you are about to walk ----------
function landing() {
  if (!window.Storeybrook) return;
  const c = $('ovCreature'); if (c && !c.firstChild) Storeybrook.creature(c, { form: 'saelion', stage: 4, mood: 'happy', hide: 'chimera' });   // her chimera hide on paper, as in the game
  const host = $('ovBrook'); if (!host) return;
  host.textContent = '';
  const shown = STONES.slice(0, W < 700 ? 4 : W < 1100 ? 6 : 8);
  const stones = shown.map(s => ({ id: s.id, label: s.name, sub: stoneOpen(s) ? (GAME.stones.includes(s.id) ? 'walked' : 'open') : `at ${s.need} nougats`,
    state: !stoneOpen(s) ? 'locked' : GAME.stones.includes(s.id) ? 'done' : s.id === 'morning' ? 'current' : 'open', why: `${s.name} opens at ${s.need} nougats.` }));
  Storeybrook.brook(host, { stones, seed: 9, direction: 'across', onStep: s => { if (!entered) $('enter').click(); setTimeout(() => walkStone(s.id), 1100); } });
}

// ---------- the controls for 7 ----------
on('cWords', () => setQuiet(!SET.quiet));
on('jar', () => ($('brookMap').classList.contains('on') ? closeBrook() : openBrook()));
on('bBrook', openBrook);
on('gBrook', openBrook);
on('bmClose', closeBrook);
function earlyAccess() { allUnlocked = true; checkUnlocks(false); persistSoon(); caption('early access: every stone, story, look and jam is open. the jar still counts.', 3400); syncUI(); }
on('bmEA', () => { earlyAccess(); openBrook(); });
on('gEA', earlyAccess);
document.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => {
  if (!tapOk()) return; const s = b.dataset.look;
  if (!lookOpen(s)) { const st = STONE.get(LOOK_STONE[s]); caption(`${SB_NAMES[s]} opens with its stone on the brook, at ${st.need} nougats.`, 2800); return; }
  if (s !== skin) turnPage(() => setSkin(s));
}));
document.querySelectorAll('[data-artic]').forEach(b => b.addEventListener('click', () => { if (tapOk()) setArtic(b.dataset.artic); }));
on('bArtic', () => setArtic(SET.artic === 'pluck' ? 'drone' : 'pluck'));
$('sBed').addEventListener('change', e => { SET.bed = e.target.checked; padSync(); persistSoon(); });
$('sAutoHum').addEventListener('change', e => { SET.autoHum = e.target.checked; persistSoon(); });
$('sEasyStart').addEventListener('change', e => { SET.easyStart = e.target.checked; persistSoon(); });
$('sEerie').addEventListener('change', e => { SET.petEerie = e.target.checked; persistSoon(); });
$('sQuiet').addEventListener('change', e => setQuiet(e.target.checked));
document.querySelectorAll('[data-jam]').forEach(b => b.addEventListener('click', () => { if (!tapOk()) return; const n = +b.dataset.jam; if (JAM.on && JAM.sess === n) jamStop(false); else jamStart(n); }));
on('bJam', () => (JAM.on ? jamStop(false) : jamStart(jamOpen(JAM.sess) ? JAM.sess : 1)));
on('dJam', () => { if (JAM.on) jamStop(false); else jamStart(jamOpen(JAM.sess) ? JAM.sess : 1); haptic(6); });
on('jamStop', () => jamStop(false));
const linerOpen = () => { $('liner').classList.add('on'); setTimeout(() => $('linerClose').focus(), 30); };
on('jamNotes', linerOpen);
on('gLiner', linerOpen);
on('linerClose', () => $('liner').classList.remove('on'));
$('liner').addEventListener('click', e => { if (e.target === $('liner')) $('liner').classList.remove('on'); });
$('brookMap').addEventListener('click', e => { if (e.target === $('brookMap')) closeBrook(); });
on('gMirror', () => mirrorTable());
document.querySelectorAll('[data-mdev]').forEach(b => b.addEventListener('click', () => mirOpen('self', b.dataset.mdev)));
on('mir61', () => mirOpen('61', phone ? 'phone' : 'laptop'));
on('mirAll', () => { mirCloseAll(); mirrorTable(false); });
on('mirExit', () => mirrorTable(false));
jamPointer();

// ---------- the overhearing's controls ----------
$('sEars').addEventListener('change', e => earsOn(e.target.checked));
$('sEarClaude').addEventListener('change', e => { SET.earClaude = e.target.checked; persistSoon(); });
const earWhisper = () => { const v = $('earIn').value.trim(); if (!v) return; hearText(v, 'typed'); $('earIn').value = ''; };
on('earGo', earWhisper);
$('earIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); earWhisper(); } });
on('earSleep', guardsSleep);
document.addEventListener('visibilitychange', () => { if (document.hidden && EAR.want) earsOn(false); });
