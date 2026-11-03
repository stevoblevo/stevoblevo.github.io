// ===== the overhearing: Saelion listens for words, mishears them on purpose, and each mishearing becomes a guardian =====
// "oh I see love" is heard first, plainly. A little later an ice cube turns up (I see, ice), then a floating heart
// (love), and later still, somehow, an eye (the I). Three eyes make a triclops; an eye that sighs, or meets a pea,
// makes a psyklopea. Every guardian is a small drawn object with no label: tap it and it switches a real thing on
// (freeze the chord, the light mood, detective mode, triplets in 3D, the 5D lattice...). They float around Saelion,
// can be dragged anywhere, and a flick off the screen sends one to sleep.
// Words come from the browser's own speech recognition (only after you switch it on), from what you whisper into the
// box, or, where Claude is available, from Claude mishearing the same phrase in its own way.
const GUARD = {
  ice: { name: 'ice cube', words: ['ice', 'icy', 'nice', 'dice', 'mice', 'rice', 'twice', 'price', 'slice', 'i see', 'eye see', 'eyes see', 'ice see'], intro: 'freeze' },
  heart: { name: 'floating heart', words: ['love', 'loved', 'lovely', 'loving', 'glove', 'dove', 'above', 'heart', 'hearts', 'art', 'part', 'start', 'hard', 'sweetheart', 'darling', 'dear'] },
  eye: { name: 'eye', words: ['i', 'eye', 'eyes', 'aye', 'ay', 'im', 'ive', 'ill'], odds: 0.6, late: true },
  triclops: { name: 'triclops', combo: true },
  psyk: { name: 'psyklopea', words: ['sigh', 'sighs', 'psych', 'psycho', 'cycle', 'cyclops', 'cyclone', 'cyclic', 'psyche'] },
  pea: { name: 'pea', words: ['pea', 'peas', 'pee', 'p', 'peace', 'piece', 'please', 'peasy'], hidden: true },
  moon: { name: 'moon', words: ['moon', 'moonlight', 'noon', 'june', 'soon', 'spoon', 'tune', 'mood', 'night', 'knight'] },
  sun: { name: 'sun', words: ['sun', 'sunny', 'son', 'sunday', 'fun', 'done', 'daylight', 'sunshine'] },
  cloud: { name: 'raincloud', words: ['rain', 'reign', 'rainy', 'again', 'brain', 'cloud', 'cloudy', 'loud', 'proud', 'crowd', 'allowed'] },
  bell: { name: 'bell', words: ['bell', 'bells', 'well', 'tell', 'belle', 'yell', 'spell', 'shell'] },
  train: { name: 'train', words: ['train', 'trains', 'plain', 'chain', 'crane', 'lane', 'terrain', 'choo'] },
  bird: { name: 'bird', words: ['bird', 'birds', 'word', 'words', 'heard', 'third', 'nerd', 'herd', 'tweet'] },
  key: { name: 'key', words: ['key', 'keys', 'keep', 'monkey', 'turkey', 'whiskey', 'quay'] },
  star: { name: 'star', words: ['star', 'stars', 'far', 'car', 'guitar', 'are', 'bar', 'twinkle'] },
  bunny: { name: 'bunny', words: ['bunny', 'bunnies', 'honey', 'money', 'funny', 'rabbit', 'hop', 'hoppy'] },
  octo: { name: 'octopus', words: ['octopus', 'focus', 'hocus', 'pocus', 'lotus', 'octave', 'arms'] },
  fly: { name: 'butterfly', words: ['butterfly', 'fly', 'flies', 'flutter', 'butter', 'sky', 'pie', 'flying'] },
  hole: { name: 'black hole', words: ['hole', 'whole', 'soul', 'goal', 'coal', 'bowl', 'roll', 'hold', 'holy'] },
  wave: { name: 'wave', words: ['wave', 'waves', 'sea', 'see', 'she', 'c', 'ocean', 'save', 'gave', 'brave'] },
  nougat: { name: 'nougat', words: ['nougat', 'nugget', 'new get', 'candy', 'sweet', 'sweets', 'treat'] },
  bee: { name: 'bee', words: ['bee', 'bees', 'be', 'buzz', 'busy', 'b', 'honeybee', 'beat'] },
  clock: { name: 'clock', words: ['clock', 'time', 'tick', 'tock', 'block', 'knock', 'oclock', 'rock'] },
  jam: { name: 'jam jar', words: ['jam', 'jams', 'jamming', 'jammy', 'ham', 'lamb', 'jazz', 'jazzy', 'jamey'] },
  mirror: { name: 'mirror', words: ['mirror', 'mirrors', 'nearer', 'error', 'terror', 'clearer', 'mere'] },
  book: { name: 'book', words: ['book', 'books', 'look', 'cook', 'hook', 'story', 'stories', 'glory', 'read'] }
};
// a rough English sound key: enough to hear "i see" as "ice" and "eyes" as "ice", and to mishear on purpose
function earNorm(w) {
  w = String(w).toLowerCase().replace(/[^a-z]/g, ''); if (!w) return '';
  w = w.replace(/^(kn|gn|pn|wr)/, m => m[1]).replace(/^ps/, 's').replace(/^wh/, 'w').replace(/^x/, 's');
  w = w.replace(/eye/g, 'i').replace(/igh/g, 'i').replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/qu/g, 'kw').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/v/g, 'f');
  w = w.replace(/([^aeiou])y$/, '$1i').replace(/([^aeiou])y([^aeiou])/g, '$1i$2').replace(/^y(?=[^aeiou])/, 'i');
  w = w.replace(/ee|ea|ie/g, 'e').replace(/oo|ou/g, 'u').replace(/ai|ay/g, 'a').replace(/(.)\1+/g, '$1');
  if (w.length >= 3 && /[^aeiou]e$/.test(w)) w = w.slice(0, -1);
  return w;
}
function earLev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const EAR_W = new Map(), EAR_N = new Map();
Object.entries(GUARD).forEach(([id, g]) => (g.words || []).forEach(w => { EAR_W.set(w, id); const n = earNorm(w); if (n && !EAR_N.has(n)) EAR_N.set(n, id); }));
// the obvious reading first, then the mishearings: whole phrases before single words, the I saved for later
function mishear(text, generous) {
  const toks = String(text).toLowerCase().replace(/[’']/g, '').split(/[^a-z]+/).filter(Boolean).slice(0, 40), out = [], used = new Set(), covered = new Set();
  const add = (id, at, how, n) => { if (!id || used.has(id)) return; used.add(id); out.push({ id, at, how }); for (let k = at; k < at + n; k++) covered.add(k); };
  for (let n = 3; n >= 2; n--) for (let i = 0; i + n <= toks.length; i++) {
    const g = toks.slice(i, i + n).join(' '), id = EAR_W.get(g) || EAR_N.get(earNorm(g.replace(/ /g, '')));
    if (id && !GUARD[id].late) add(id, i, 'sound', n);
  }
  toks.forEach((w, i) => { const id = EAR_W.get(w) || EAR_N.get(earNorm(w)); if (id && (!covered.has(i) || GUARD[id].late)) add(id, i, 'word', 1); });
  // and on purpose, now and then, a word that only nearly sounds like something
  toks.forEach((w, i) => {
    const n = earNorm(w); if (n.length < 4 || Math.random() > 0.3) return;
    for (const [k, id] of EAR_N) if (!used.has(id) && earLev(n, k) === 1) { add(id, i, 'misheard', 1); break; }
  });
  return out.filter(m => (generous && m.how !== 'misheard') || Math.random() < (GUARD[m.id].odds || (m.how === 'misheard' ? 0.6 : 0.78))).sort((a, b) => (GUARD[a.id].late ? 1 : 0) - (GUARD[b.id].late ? 1 : 0) || a.at - b.at).slice(0, 3);
}

// ---------- what each guardian does: a real switch, and a little trick when it arrives ----------
const EAR = { on: false, rec: null, want: false, err: '', guards: [], q: [], ask: false, frozen: null, prev: {}, heardT: -99, heardS: '', missT: -99, missS: '' };
const GFEAT = {
  ice: { on: () => !!EAR.frozen, tap: () => guardFreeze(!EAR.frozen), intro: () => { guardFreeze(true); setTimeout(() => { if (EAR.frozen && EAR.frozen.intro) guardFreeze(false); }, 2600); if (EAR.frozen) EAR.frozen.intro = true; } },
  heart: { on: () => moodNow() === 'light' && !!SET.bed, tap: () => { const on = !(moodNow() === 'light' && SET.bed); if (on) { if (SET.normie) setNormie(false); setMood('light'); } SET.bed = on; padSync(); syncArticUI(); audio.bloom(voices.filter(v => v.wT > 0).map(v => fOf(v.x))); bloomFlash = 1; persistSoon(); }, intro: () => { audio.bloom(voices.filter(v => v.wT > 0).map(v => fOf(v.x))); bloomFlash = 1; } },
  eye: { on: () => !!SET.detect, tap: () => { SET.detect = !SET.detect; if (SET.detect && viewOn() === 'mandala') setViewMode('cube', true); persistSoon(); syncUI(); } },
  triclops: { on: () => tuplet === 3 && viewOn() === 'cube', tap: () => { const on = !(tuplet === 3 && viewOn() === 'cube'); setTuplet(on ? 3 : 4, true); setViewMode(on ? 'cube' : 'mandala', true); }, intro: () => setTimeout(() => { setTuplet(3, true); setViewMode('cube', true); }, 900) },
  psyk: { on: () => viewOn() === 'd5', tap: () => { if (viewOn() === 'd5') setViewMode('mandala', true); else { if (!SET.x5d) setX5d(true); setViewMode('d5', true); } } },
  moon: { on: () => skin === 'sb-knight' || skin === 'dawn' || skin === 'obsidian', tap: () => turnPage(() => setSkin(lookOpen('sb-knight') ? 'sb-knight' : 'dawn', true)) },
  sun: { on: () => skin === 'sb-daylight', tap: () => turnPage(() => setSkin('sb-daylight', true)) },
  cloud: { on: () => !!SET.rain, tap: () => { SET.rain = !SET.rain; persistSoon(); syncUI(); } },
  bell: { on: () => !!SET.bells, tap: () => { SET.bells = !SET.bells; if (SET.bells) { bellNext = t + 0.5; } persistSoon(); syncUI(); }, intro: () => { if (A.ac && !era) peal(); } },
  train: { on: () => !!SET.train, tap: () => { SET.train = !SET.train; if (SET.train) trainNext = t + 2; persistSoon(); syncUI(); } },
  bird: { on: () => !!SET.bird, tap: () => { SET.bird = !SET.bird; persistSoon(); syncUI(); }, intro: () => { bird.next = t + 0.2; } },
  key: { on: () => false, tap: () => { chooseRootStep(); gongDue = false; userIdleUntil = t + 10; } },
  star: { on: () => !!SET.sparkle, tap: () => { SET.sparkle = !SET.sparkle; audio.applyMix(); persistSoon(); syncUI(); } },
  bunny: { on: () => SET.petForm === 'bunny', tap: () => { SET.petForm = 'bunny'; pet.lock = false; persistSoon(); syncUI(); } },
  octo: { on: () => SET.petForm === 'tree', tap: () => { SET.petForm = 'tree'; pet.lock = false; persistSoon(); syncUI(); } },
  fly: { on: () => SET.petForm === 'pixie', tap: () => { SET.petForm = 'pixie'; pet.lock = false; persistSoon(); syncUI(); } },
  hole: { on: () => hole.on, tap: () => { if (UNL.hole) setHole(!hole.on); else caption('the black hole forms at 6 finds. this one is only a promise.', 2600); } },
  wave: { on: () => SET.space > 0.85, tap: () => { if (SET.space > 0.85) SET.space = EAR.prev.space != null ? EAR.prev.space : 0.62; else { EAR.prev.space = SET.space; SET.space = 0.95; } audio.applyMix(); persistSoon(); syncUI(); } },
  nougat: { on: () => false, tap: () => { const d = new Date().toISOString().slice(0, 10); if (GAME.guardNougat !== d) { GAME.guardNougat = d; const g = EAR.guards.find(x => x.id === 'nougat'); nougat(1, g ? g.x : W / 2, g ? g.y : H / 2, 'a nougat guardian'); } else caption('one nougat a day from this one. it is a guardian, not a vending machine.', 2600); } },
  bee: { on: () => rhy.on, tap: () => toggleBeat() },
  clock: { on: () => SET.pace > 0.6, tap: () => { SET.pace = SET.pace < 0.35 ? 0.45 : SET.pace < 0.6 ? 0.8 : 0.25; persistSoon(); syncUI(); } },
  jam: { on: () => JAM.on, tap: () => (JAM.on ? jamStop(false) : jamStart(jamOpen(JAM.sess) ? JAM.sess : 1)) },
  mirror: { on: () => MIR.open, tap: () => mirrorTable() },
  book: { on: () => $('story').classList.contains('on'), tap: () => ($('story').classList.contains('on') ? closeStory() : openStory(storyCur)) },
  pea: { on: () => false, tap: () => {} }
};
function guardFreeze(on) {
  if (on && !EAR.frozen) {
    EAR.frozen = { autoOn, rhy: rhy.on };
    autoOn = false; rhy.on = false; rhy.nextT = 0;
    for (const v of voices) if (v.wT > 0 && !v.dragging) { v.v = 0; v.temp = 0; if (!v.locked) lockVoice(v); }
  } else if (!on && EAR.frozen) { autoOn = EAR.frozen.autoOn; rhy.on = EAR.frozen.rhy; rhy.nextT = 0; EAR.frozen = null; }
  syncUI();
}

// ---------- hearing ----------
function hearText(text, src) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 160); if (!text || !entered) return;
  GAME.heard = (GAME.heard || 0) + 1; EAR.heardS = text; EAR.heardT = t; EAR.missS = '';
  discover('x-heard'); jlog(`overheard${src === 'typed' ? ' (whispered)' : ''}: “${text}”`);
  // the first two times, everything it hears comes out; after that, only some of it
  const ms = mishear(text, GAME.heard <= 2); let at = t + rand(2.2, 3.2);
  ms.forEach((m, i) => { EAR.q.push({ id: m.id, at, word: text.split(/\s+/)[m.at] || '' }); at += i === 0 ? rand(3.5, 6) : rand(9, 18); });
  if (CAP.sample && SET.earClaude) claudeMishear(text);
  if (MIR.depth === 0) persistSoon();
}
async function claudeMishear(text) {
  if (EAR.ask) return; EAR.ask = true;
  const ids = Object.keys(GUARD).filter(k => !GUARD[k].combo && !GUARD[k].hidden);
  const prompt = `You are Saelion, a small creature who lives inside AND SO, a microtonal music toy. You overheard someone say or sing: "${text}".\nMishear it on purpose, by sound, the way a child mishears a song lyric (a mondegreen): keep the rhythm, change the words.\nThen pick at most two guardians whose names the misheard words sound like, from these ids: ${ids.join(', ')}.\nReply with JSON only: {"misheard": "<your misheard version, lower case, at most 12 words>", "guardians": ["<id>"]}`;
  try {
    const r = await CAP.sample.json(prompt, { modelTier: 'quick' });
    if (r && typeof r.misheard === 'string' && r.misheard.trim()) { EAR.missS = r.misheard.trim().toLowerCase().slice(0, 90); EAR.missT = t; jlog(`misheard by Claude: “${EAR.missS}”`); discover('x-mondegreen'); }
    const gs = r && Array.isArray(r.guardians) ? r.guardians.filter(id => typeof id === 'string' && GUARD[id] && !GUARD[id].combo && !GUARD[id].hidden).slice(0, 2) : [];
    gs.forEach((id, i) => EAR.q.push({ id, at: t + 8 + i * 6, word: '' }));
  } catch (e) {
    const c = e && e.code;
    if (c === 'not_granted' || c === 'sampling_disabled' || c === 'not_declared' || c === 'capability_disabled' || c === 'capability_removed') { CAP.sample = null; capsUI(); }
  }
  EAR.ask = false;
}
// the browser's own speech recognition, only after it is switched on, and never remembered as on
function earsOn(on) {
  if (on) voiceCommandsStop('Voice commands off while Saelion overhears.');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  EAR.want = !!on && !!SR; EAR.err = '';
  if (!EAR.want) { const previous = EAR.rec; EAR.rec = null; EAR.on = false; try { if (previous) previous.abort(); } catch (e) {} earUI(); return; }
  if (EAR.rec) return;
  try {
    const r = new SR(); r.continuous = true; r.interimResults = false; r.lang = navigator.language || 'en-US'; r.maxAlternatives = 1;
    r.onresult = e => { if (EAR.rec !== r || !EAR.want) return; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) hearText(e.results[i][0].transcript, 'mic'); };
    r.onerror = e => { if (EAR.rec !== r) return; EAR.err = e && e.error || 'error'; if (EAR.err === 'not-allowed' || EAR.err === 'service-not-allowed' || EAR.err === 'audio-capture') { EAR.want = false; caption("words can't be heard here. whisper them into the box instead.", 3200); } earUI(); };
    r.onend = () => { if (EAR.rec !== r) return; EAR.rec = null; EAR.on = false; if (EAR.want) setTimeout(() => { if (EAR.want && !EAR.rec) earsOn(true); }, 500); earUI(); };
    r.onstart = () => { if (EAR.rec !== r || !EAR.want) { try { r.abort(); } catch (_) {} return; } EAR.on = true; earUI(); };
    EAR.rec = r; r.start(); discover('x-ears'); jlog('Saelion is overhearing words');
  } catch (e) { EAR.want = false; EAR.rec = null; EAR.err = 'unavailable'; }
  earUI();
}
function earUI() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, sw = $('sEars');
  $('earRow').classList.toggle('hidden', !SR); if (sw) sw.checked = !!EAR.want;
  $('earClaudeRow').classList.toggle('hidden', !CAP.sample); $('sEarClaude').checked = !!SET.earClaude;
  $('earNote').textContent = !SR ? 'this browser has no speech recognition, so whisper into the box instead. Saelion mishears typed words just the same.'
    : EAR.on ? 'overhearing. words go through your browser’s speech recognition, which in Chrome and Edge is an online service, so the sound leaves this device to become words. AND SO keeps the words only here.'
    : 'off until you switch it on, and off again whenever you leave. words go through your browser’s speech recognition, which in Chrome and Edge is an online service.';
  const met = (GAME.met || []).filter(id => GUARD[id]).map(id => GUARD[id].name);
  $('earMet').textContent = met.length ? `met so far: ${met.join(', ')}.` : 'no guardians yet. say something near Saelion.';
}

// ---------- guardians ----------
function spawnGuard(id, from) {
  if (!GUARD[id] || !entered || MIR.depth > 1) return null;
  if (id === 'psyk') { const e = EAR.guards.find(g => g.id === 'eye'); if (e && !EAR.guards.some(g => g.id === 'psyk')) return guardMerge([e], 'psyk'); }
  if (id === 'eye') { const tri = EAR.guards.find(g => g.id === 'triclops'); if (tri && EAR.guards.filter(g => g.id === 'eye').length >= 2) { tri.pop = 1.4; tri.wob = 1; if (UNL.pet && !QUIET() && from !== 'load') { pet.say = 'another eye. the triclops took it.'; pet.sayUntil = t + 3; } return tri; } }
  if (id === 'pea') { const p = EAR.guards.find(g => g.id === 'psyk'); if (p) { p.pop = 1.4; p.wob = 1; return p; } }
  if (EAR.guards.some(g => g.id === id) && id !== 'eye') { const g = EAR.guards.find(x => x.id === id); g.pop = 1; return g; }
  const n = EAR.guards.length, a = -Math.PI / 2 + n * 1.15;
  const g = { id, x: pet.x, y: pet.y - 20 * S, a, r: (64 + 14 * (n % 3)) * S, free: false, hx: 0, hy: 0, pop: 1, born: t, seed: Math.random() * 10, wob: 0 };
  EAR.guards.push(g);
  while (EAR.guards.length > 12) { const old = EAR.guards.find(x => !GFEAT[x.id].on()) || EAR.guards[0]; EAR.guards.splice(EAR.guards.indexOf(old), 1); }
  GAME.met = GAME.met || []; const first = !GAME.met.includes(id); if (first) GAME.met.push(id);
  audio.chime(fold(fRoot * [5 / 4, 3 / 2, 7 / 4, 2][n % 4] * 4, 2, 520), 0.03, 0); pet.cheer = 1; pet.jump = 0.8;
  for (let i = 0; i < 12; i++) sparks.push({ x: g.x, y: g.y, vx: rand(-70, 70), vy: rand(-90, 10), life: rand(0.5, 1.1), max: 1.1, c: [255, 220, 170] });
  if (UNL.pet && !QUIET() && from !== 'load') { pet.say = from === 'claude' ? `Claude heard it differently. a ${GUARD[id].name} came out.` : `i heard “${(EAR.q.lastWord || '').toLowerCase() || 'something'}”. a ${GUARD[id].name} came out of it.`; pet.sayUntil = t + 4.5; }
  if (from !== 'load') { const f = GFEAT[id]; if (f && f.intro) try { f.intro(); } catch (e) {} discover('x-guard'); if ((GAME.met || []).length >= 8) discover('x-guard8'); jlog(`a guardian: ${GUARD[id].name}`); }
  guardCombos(); persistGuards(); earUI();
  return g;
}
function guardMerge(parts, id) {
  const cx = parts.reduce((s, g) => s + g.x, 0) / parts.length, cy = parts.reduce((s, g) => s + g.y, 0) / parts.length;
  EAR.guards = EAR.guards.filter(g => !parts.includes(g));
  const g = { id, x: cx, y: cy, a: parts[0].a, r: parts[0].r, free: parts[0].free, hx: parts[0].hx, hy: parts[0].hy, pop: 1.6, born: t, seed: Math.random() * 10, wob: 0 };
  EAR.guards.push(g);
  GAME.met = GAME.met || []; if (!GAME.met.includes(id)) GAME.met.push(id);
  for (let i = 0; i < 26; i++) sparks.push({ x: cx, y: cy, vx: rand(-120, 120), vy: rand(-120, 60), life: rand(0.6, 1.4), max: 1.4, c: id === 'psyk' ? [190, 255, 140] : [210, 170, 255] });
  audio.bloom([fRoot * 2, fRoot * 2.5, fRoot * 3]); bloomFlash = 1;
  if (UNL.pet && !QUIET()) { pet.say = id === 'triclops' ? 'three eyes found each other. that is a triclops now.' : 'an eye met a sigh. it calls itself a psyklopea.'; pet.sayUntil = t + 5; }
  discover(id === 'triclops' ? 'x-triclops' : 'x-psyk'); jlog(`guardians merged: ${GUARD[id].name}`);
  const f = GFEAT[id]; if (f && f.intro) try { f.intro(); } catch (e) {}
  persistGuards(); earUI();
  return g;
}
function guardCombos() {
  const eyes = EAR.guards.filter(g => g.id === 'eye');
  if (eyes.length >= 3 && !EAR.guards.some(g => g.id === 'triclops')) guardMerge(eyes.slice(0, 3), 'triclops');
  const pea = EAR.guards.find(g => g.id === 'pea'), eye = EAR.guards.find(g => g.id === 'eye');
  if (pea && eye && !EAR.guards.some(g => g.id === 'psyk')) guardMerge([eye, pea], 'psyk');
  const psy = EAR.guards.find(g => g.id === 'psyk'), pea2 = EAR.guards.find(g => g.id === 'pea');
  if (psy && pea2) { EAR.guards.splice(EAR.guards.indexOf(pea2), 1); psy.pop = 1.4; psy.wob = 1; }
}
function persistGuards() { GAME.guards = EAR.guards.map(g => g.id); if (MIR.depth === 0) persistSoon(); }
function guardsSleep() { EAR.guards.length = 0; EAR.q.length = 0; if (EAR.frozen) guardFreeze(false); persistGuards(); earUI(); caption('the guardians went to sleep. say something and they come back.', 2600); }
function guardsLoad() { (GAME.guards || []).slice(0, 12).forEach((id, i) => setTimeout(() => { if (GUARD[id]) { const g = spawnGuard(id, 'load'); if (g) g.pop = 0.6; } }, 1200 + i * 220)); }
function guardTick(dt) {
  if (!entered) return;
  while (EAR.q.length && t >= EAR.q[0].at) { const q = EAR.q.shift(); EAR.q.lastWord = q.word; spawnGuard(q.id, 'heard'); }
  const n = EAR.guards.length;
  EAR.guards.forEach((g, i) => {
    g.pop = Math.max(0, g.pop - dt * 1.6); g.wob *= Math.exp(-dt * 4);
    let tx, ty;
    if (g.free) { tx = g.hx; ty = g.hy; }
    else { const a = g.a + t * 0.12 + i * 0.02; tx = pet.x + Math.cos(a) * g.r * (phone ? 0.8 : 1); ty = pet.y - 18 * S + Math.sin(a) * g.r * 0.62; }
    tx += Math.sin(t * 0.9 + g.seed) * 5 * S; ty += Math.sin(t * 1.3 + g.seed * 2) * 6 * S;
    if (g.drag) return;
    const k = 1 - Math.exp(-dt * 3); g.x += (clamp(tx, 20, W - 20) - g.x) * k; g.y += (clamp(ty, TOPH + 20, H - 20) - g.y) * k;
  });
}
function guardAt(px, py) { let best = null, bd = (phone ? 30 : 24) * Math.max(S, 0.9); for (const g of EAR.guards) { const d = Math.hypot(g.x - px, g.y - py); if (d < bd) { bd = d; best = g; } } return best; }
function guardTap(g) {
  const f = GFEAT[g.id]; if (!f) return;
  try { f.tap(); } catch (e) {}
  g.wob = 1; g.pop = 0.5; haptic(8);
  if (!QUIET() && UNL.pet) { pet.say = `${GUARD[g.id].name}: ${guardSays(g.id, f.on())}`; pet.sayUntil = t + 3.2; }
  jlog(`tapped the ${GUARD[g.id].name}`); discover('x-guardtap');
}
function guardSays(id, on) {
  const S2 = { ice: ['the chord thawed.', 'frozen. everything holds still.'], heart: ['back to normal.', 'light mood, and a soft bed under it.'], eye: ['eyes closed.', 'detective mode: every node has a name.'], triclops: ['back to four.', 'triplets, in three dimensions.'],
    psyk: ['back to the mandala.', 'five dimensions. one eye is plenty.'], moon: ['', 'night paper.'], sun: ['', 'daylight paper.'], cloud: ['the rain stopped.', 'rain.'], bell: ['the bells went quiet.', 'bells, tuned wrong on purpose.'], train: ['no trains.', 'a train, far off, any minute.'],
    bird: ['the bird is quiet.', 'the bird sings again.'], key: ['the next chord.', 'the next chord.'], star: ['the echoes stopped.', 'sparkle echoes.'], bunny: ['', 'bunny.'], octo: ['', 'tree octopus.'], fly: ['', 'butterfly pixie.'], hole: ['the hole closed.', 'a black hole. hungry.'],
    wave: ['the room got smaller.', 'all the space in the world.'], nougat: ['', ''], bee: ['no beat.', 'a beat.'], clock: ['slower.', 'faster.'], jam: ['the band packed up.', 'the band is in.'], mirror: ['the mirror closed.', 'the mirror opened.'], book: ['the book closed.', 'the storybook.'], pea: ['a pea. it is waiting for an eye.', ''] };
  const s = S2[id] || ['', '']; return s[on ? 1 : 0] || s[1] || '';
}

// ---------- drawing: no labels, just the objects ----------
function drawGuards(g) {
  if (!entered || !EAR.guards.length) return;
  for (const q of EAR.guards) {
    const r = (15 + 4 * q.pop + 3 * q.wob * Math.sin(t * 30)) * Math.max(0.85, S) * (phone ? 1.05 : 1.1), on = GFEAT[q.id] && GFEAT[q.id].on();
    g.save(); g.translate(q.x, q.y); g.rotate(Math.sin(t * 1.1 + q.seed) * 0.08 + q.wob * 0.3 * Math.sin(t * 24));
    if (on) { const gl = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2); gl.addColorStop(0, 'rgba(255,230,160,0.55)'); gl.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 2, 0, TAU); g.fill(); }
    g.lineWidth = Math.max(1.6, r * 0.12); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#26323f';
    try { (GDRAW[q.id] || GDRAW.star)(g, r, q, on); } catch (e) {}
    g.restore();
  }
}
const GDRAW = {
  ice(g, r) { g.rotate(0.18); g.fillStyle = 'rgba(205,236,255,0.88)'; roundRect(g, -r, -r, r * 2, r * 2, r * 0.38); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.9)'; roundRect(g, -r * 0.62, -r * 0.7, r * 0.5, r * 0.32, r * 0.14); g.fill(); g.strokeStyle = 'rgba(120,170,210,0.8)'; g.lineWidth *= 0.6; g.beginPath(); g.moveTo(r * 0.2, r * 0.55); g.lineTo(r * 0.62, r * 0.18); g.stroke(); },
  heart(g, r) { const s = r * 1.05, y = Math.sin(t * 2.2) * r * 0.12; g.translate(0, y); g.fillStyle = '#e8476f'; g.beginPath(); g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.5, -s * 0.1, -s * 0.7, -s * 1.2, 0, -s * 0.45); g.bezierCurveTo(s * 0.7, -s * 1.2, s * 1.5, -s * 0.1, 0, s * 0.9); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-s * 0.48, -s * 0.36, s * 0.2, s * 0.12, -0.6, 0, TAU); g.fill(); },
  eye(g, r, q) { guardEye(g, 0, 0, r, [110, 200, 255], q); },
  triclops(g, r, q) { g.fillStyle = '#b9a2f2'; g.beginPath(); g.ellipse(0, r * 0.1, r * 1.35, r * 1.05, 0, 0, TAU); g.fill(); g.stroke(); [-0.62, 0, 0.62].forEach((dx, i) => guardEye(g, dx * r * 1.25, -r * 0.05 - (i === 1 ? r * 0.2 : 0), r * 0.36, [[246, 195, 95], [255, 110, 150], [110, 200, 255]][i], q, i)); g.beginPath(); g.moveTo(-r * 0.6, r * 1.1); g.lineTo(-r * 0.7, r * 1.45); g.moveTo(r * 0.6, r * 1.1); g.lineTo(r * 0.7, r * 1.45); g.stroke(); },
  psyk(g, r, q) { g.fillStyle = '#9ed36a'; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.85, -0.25, 0, TAU); g.fill(); g.stroke(); g.save(); g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fillStyle = '#fffaf4'; g.fill(); g.stroke(); g.clip(); for (let k = 0; k < 6; k++) { g.strokeStyle = `hsl(${(t * 90 + k * 60) % 360},80%,55%)`; g.lineWidth = r * 0.1; g.beginPath(); for (let a = 0; a < 6.5; a += 0.2) { const rr = a * r * 0.09; const X = Math.cos(a + k + t * 2) * rr, Y = Math.sin(a + k + t * 2) * rr; if (a) g.lineTo(X, Y); else g.moveTo(X, Y); } g.stroke(); } g.restore(); g.fillStyle = '#1b1220'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, TAU); g.fill(); },
  pea(g, r) { g.fillStyle = '#9ed36a'; g.beginPath(); g.arc(0, 0, r * 0.7, 0, TAU); g.fill(); g.stroke(); },
  moon(g, r) { g.fillStyle = '#f4e7b0'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(r * 0.45, -r * 0.25, r * 0.85, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(200,180,120,0.6)'; g.beginPath(); g.arc(-r * 0.45, r * 0.25, r * 0.14, 0, TAU); g.fill(); },
  sun(g, r) { g.rotate(t * 0.4); g.strokeStyle = '#e8a33a'; for (let k = 0; k < 8; k++) { const a = (k * TAU) / 8; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); g.stroke(); } g.strokeStyle = '#26323f'; g.fillStyle = '#ffd25e'; g.beginPath(); g.arc(0, 0, r * 0.75, 0, TAU); g.fill(); g.stroke(); },
  cloud(g, r) { g.fillStyle = '#eef3f8'; g.beginPath(); g.arc(-r * 0.55, 0, r * 0.55, 0, TAU); g.arc(r * 0.05, -r * 0.3, r * 0.7, 0, TAU); g.arc(r * 0.65, r * 0.05, r * 0.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#eef3f8'; g.fillRect(-r * 0.6, -r * 0.05, r * 1.3, r * 0.45); g.strokeStyle = '#e8476f'; for (let k = 0; k < 3; k++) { const y = ((t * 1.6 + k / 3) % 1) * r * 0.9; g.beginPath(); g.moveTo(-r * 0.5 + k * r * 0.5, r * 0.5 + y); g.lineTo(-r * 0.6 + k * r * 0.5, r * 0.75 + y); g.stroke(); } },
  bell(g, r) { g.rotate(Math.sin(t * 3) * 0.25); g.fillStyle = '#e8b84a'; g.beginPath(); g.moveTo(-r * 0.9, r * 0.6); g.quadraticCurveTo(-r * 0.8, -r * 1.05, 0, -r * 1.05); g.quadraticCurveTo(r * 0.8, -r * 1.05, r * 0.9, r * 0.6); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#26323f'; g.beginPath(); g.arc(Math.sin(t * 3 + 1) * r * 0.2, r * 0.75, r * 0.18, 0, TAU); g.fill(); },
  train(g, r) { g.fillStyle = '#e8476f'; roundRect(g, -r * 1.1, -r * 0.5, r * 1.6, r * 0.95, r * 0.15); g.fill(); g.stroke(); g.fillStyle = '#6fb0dc'; roundRect(g, r * 0.1, -r * 0.95, r * 0.75, r * 0.65, r * 0.1); g.fill(); g.stroke(); g.fillStyle = '#26323f'; g.fillRect(-r * 0.85, -r * 0.95, r * 0.28, r * 0.45); [-0.7, 0, 0.62].forEach(x => { g.fillStyle = '#26323f'; g.beginPath(); g.arc(x * r, r * 0.55, r * 0.24, 0, TAU); g.fill(); }); g.fillStyle = 'rgba(240,240,240,0.8)'; g.beginPath(); g.arc(-r * 0.75 - Math.sin(t * 2) * r * 0.2, -r * 1.3 - ((t * 0.8) % 1) * r * 0.4, r * 0.24, 0, TAU); g.fill(); },
  bird(g, r) { g.fillStyle = '#6fb0dc'; g.beginPath(); g.ellipse(0, 0, r, r * 0.78, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#4f8fbf'; g.beginPath(); g.ellipse(-r * 0.15, r * 0.05, r * 0.5, r * 0.3 * (0.6 + 0.4 * Math.sin(t * 9)), -0.3, 0, TAU); g.fill(); g.fillStyle = '#e8a33a'; g.beginPath(); g.moveTo(r * 0.9, -r * 0.1); g.lineTo(r * 1.35, r * 0.05); g.lineTo(r * 0.9, r * 0.2); g.fill(); g.fillStyle = '#26323f'; g.beginPath(); g.arc(r * 0.45, -r * 0.25, r * 0.12, 0, TAU); g.fill(); },
  key(g, r) { g.rotate(-0.6); g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(-r * 0.7, 0, r * 0.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#26323f'; g.beginPath(); g.arc(-r * 0.7, 0, r * 0.18, 0, TAU); g.fill(); g.fillStyle = '#e8b84a'; g.fillRect(-r * 0.25, -r * 0.13, r * 1.35, r * 0.26); g.strokeRect(-r * 0.25, -r * 0.13, r * 1.35, r * 0.26); g.fillRect(r * 0.75, r * 0.1, r * 0.18, r * 0.3); g.fillRect(r * 0.42, r * 0.1, r * 0.15, r * 0.22); },
  star(g, r) { g.rotate(t * 0.6); g.fillStyle = '#ffd25e'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r * 1.05; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); },
  bunny(g, r) { g.fillStyle = '#fbeef2'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.35, -r * 0.95, r * 0.22, r * 0.6, s * 0.15, 0, TAU); g.fill(); g.stroke(); }); g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#26323f'; [-1, 1].forEach(s => { g.beginPath(); g.arc(s * r * 0.28, -r * 0.08, r * 0.1, 0, TAU); g.fill(); }); g.fillStyle = '#e8476f'; g.beginPath(); g.arc(0, r * 0.18, r * 0.09, 0, TAU); g.fill(); },
  octo(g, r) { g.fillStyle = '#c99be8'; for (let k = 0; k < 4; k++) { const x = (k - 1.5) * r * 0.42; g.beginPath(); g.moveTo(x, r * 0.3); g.quadraticCurveTo(x + Math.sin(t * 3 + k) * r * 0.4, r * 0.9, x + Math.sin(t * 3 + k + 1) * r * 0.3, r * 1.3); g.lineWidth = r * 0.22; g.strokeStyle = '#c99be8'; g.stroke(); } g.lineWidth = Math.max(1.6, r * 0.12); g.strokeStyle = '#26323f'; g.beginPath(); g.ellipse(0, -r * 0.1, r * 0.85, r * 0.75, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#26323f'; [-1, 1].forEach(s => { g.beginPath(); g.arc(s * r * 0.3, -r * 0.1, r * 0.1, 0, TAU); g.fill(); }); },
  fly(g, r) { const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 6)); g.fillStyle = '#9fd0ff'; [-1, 1].forEach(s => { g.save(); g.scale(s * f, 1); g.beginPath(); g.ellipse(r * 0.55, -r * 0.35, r * 0.6, r * 0.45, -0.4, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#ffd1e0'; g.beginPath(); g.ellipse(r * 0.45, r * 0.4, r * 0.4, r * 0.3, 0.4, 0, TAU); g.fill(); g.stroke(); g.restore(); g.fillStyle = '#9fd0ff'; }); g.fillStyle = '#26323f'; g.beginPath(); g.ellipse(0, 0, r * 0.12, r * 0.6, 0, 0, TAU); g.fill(); },
  hole(g, r) { g.rotate(t * 1.2); g.strokeStyle = '#ff9a3c'; g.lineWidth = r * 0.22; g.beginPath(); g.ellipse(0, 0, r * 1.1, r * 0.45, 0, 0, TAU); g.stroke(); g.fillStyle = '#05040a'; g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fill(); },
  wave(g, r) { g.fillStyle = '#6fb0dc'; g.beginPath(); g.moveTo(-r * 1.2, r * 0.7); g.quadraticCurveTo(-r * 0.9, -r * 0.4, 0, -r * 0.7); g.quadraticCurveTo(r * 0.8, -r * 0.9, r * 0.9, -r * 0.1); g.quadraticCurveTo(r * 0.3, -r * 0.55, r * 0.05, -r * 0.05); g.quadraticCurveTo(r * 0.5, r * 0.4, r * 1.2, r * 0.7); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(-r * 0.6, -r * 0.2); g.quadraticCurveTo(-r * 0.2, -r * 0.6, r * 0.4, -r * 0.6); g.stroke(); },
  nougat(g, r) { g.fillStyle = '#e9c6d5'; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.85, 0); g.lineTo(s * r * 1.45, -r * 0.5); g.lineTo(s * r * 1.45, r * 0.5); g.closePath(); g.fill(); g.stroke(); }); g.fillStyle = '#f6e2c0'; roundRect(g, -r * 0.9, -r * 0.55, r * 1.8, r * 1.1, r * 0.3); g.fill(); g.stroke(); g.fillStyle = '#b5793f'; [[-0.4, -0.1], [0.1, 0.15], [0.45, -0.2]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x * r, y * r, r * 0.13, r * 0.09, 0.5, 0, TAU); g.fill(); }); },
  bee(g, r) { const f = 0.6 + 0.4 * Math.abs(Math.sin(t * 14)); g.fillStyle = 'rgba(220,240,255,0.85)'; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.3, -r * 0.7, r * 0.32, r * 0.5 * f, s * 0.4, 0, TAU); g.fill(); g.stroke(); }); g.fillStyle = '#ffd25e'; g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.65, 0, 0, TAU); g.fill(); g.stroke(); g.save(); g.clip(); g.fillStyle = '#26323f'; [-0.3, 0.25].forEach(x => g.fillRect(x * r, -r, r * 0.22, r * 2)); g.restore(); },
  clock(g, r) { g.fillStyle = '#fffaf4'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke(); const a1 = t * 0.5, a2 = t * 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a1) * r * 0.5, Math.sin(a1) * r * 0.5); g.moveTo(0, 0); g.lineTo(Math.cos(a2) * r * 0.78, Math.sin(a2) * r * 0.78); g.stroke(); },
  jam(g, r) { g.fillStyle = '#c94a6e'; roundRect(g, -r * 0.75, -r * 0.55, r * 1.5, r * 1.45, r * 0.3); g.fill(); g.stroke(); g.fillStyle = '#e8b84a'; roundRect(g, -r * 0.85, -r * 0.95, r * 1.7, r * 0.42, r * 0.12); g.fill(); g.stroke(); g.fillStyle = '#fffaf4'; g.fillRect(-r * 0.55, -r * 0.05, r * 1.1, r * 0.45); },
  mirror(g, r) { g.fillStyle = '#e8b84a'; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 1.15, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#cfe6f5'; g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.9, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(-r * 0.3, -r * 0.4); g.lineTo(r * 0.05, -r * 0.75); g.moveTo(-r * 0.25, -r * 0.05); g.lineTo(r * 0.3, -r * 0.6); g.stroke(); },
  book(g, r) { g.fillStyle = '#fffaf4'; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(0, -r * 0.55); g.quadraticCurveTo(s * r * 0.6, -r * 0.8, s * r * 1.15, -r * 0.6); g.lineTo(s * r * 1.15, r * 0.65); g.quadraticCurveTo(s * r * 0.6, r * 0.45, 0, r * 0.7); g.closePath(); g.fill(); g.stroke(); }); g.strokeStyle = 'rgba(38,50,63,0.5)'; g.lineWidth *= 0.6; [-1, 1].forEach(s => [-0.2, 0.05, 0.3].forEach(y => { g.beginPath(); g.moveTo(s * r * 0.25, y * r); g.lineTo(s * r * 0.9, y * r - r * 0.05); g.stroke(); })); }
};
function guardEye(g, X, Y, r, col, q, i) {
  const shut = ((t * (0.23 + (i || 0) * 0.07) + (q ? q.seed : 0)) % 1) < 0.04;
  if (shut) { g.beginPath(); g.moveTo(X - r, Y); g.quadraticCurveTo(X, Y + r * 0.6, X + r, Y); g.stroke(); return; }
  const dx = lastPX - (q ? q.x : 0) - X, dy = lastPY - (q ? q.y : 0) - Y, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 120), ox = (dx / d) * r * 0.32 * m, oy = (dy / d) * r * 0.32 * m;
  g.fillStyle = '#fffaf4'; g.beginPath(); g.arc(X, Y, r, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = rgba(col, 1); g.beginPath(); g.arc(X + ox, Y + oy, r * 0.58, 0, TAU); g.fill();
  g.fillStyle = '#1b1220'; g.beginPath(); g.arc(X + ox * 1.15, Y + oy * 1.15, r * 0.28, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(X + ox - r * 0.22, Y + oy - r * 0.25, r * 0.13, 0, TAU); g.fill();
}
// what was heard, plainly at first, and what Claude made of it: in the hand of the storybook, near Saelion
function heardTick() {
  const el = $('heard'); if (!el) return;
  const showA = t - EAR.heardT < 5.5 && EAR.heardS, showB = EAR.missS && t - EAR.missT < 6.5, on = entered && !QUIET() && (showA || showB) && UNL.pet;
  el.classList.toggle('on', !!on); if (!on) return;
  const txt = showB ? `or was it “${EAR.missS}”?` : `“${EAR.heardS}”`;
  if (el.textContent !== txt) el.textContent = txt;
  el.style.left = clamp(pet.x, 120, W - 120) + 'px'; el.style.top = Math.max(TOPH + 12, pet.y - 110 * S) + 'px';
}
