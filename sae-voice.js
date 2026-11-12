/* sae-voice.js v1.1.0 (2026-10-30) — one shared read-aloud voice picker for the Dock games. Vanilla ES module, no deps.
 * Chain: Tower ElevenLabs proxy (only when configured: <meta name="sae-voice-proxy">, window.SAE_VOICE_PROXY or ?voiceproxy=)
 *   -> best device voice (tier 2 natural/premium, then tier 1 plain non-novelty) -> captions only (never a novelty voice, never Moira).
 * Order: listener's language (en only if none) -> accent from a region other than the listener's (Steven's taste) -> this OS/browser's own voice family -> quality.
 * API: await SaeVoice.ready(); SaeVoice.speak(text,{character}); SaeVoice.pick(characterId,prefs); SaeVoice.cancel();
 *      SaeVoice.mountSettings(); SaeVoice.setMuted(bool); SaeVoice.state  — debug readout with ?voices=1 */
export const VERSION = '1.1.0';
const QS = new URLSearchParams(location.search);
const LS = 'saevoice.v1';
const DENY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Moira|Fred|Junior|Ralph|Kathy|Deranged|Hysterical|Pipe Organ)\b|eSpeak|espeak|Compact/i;
// accent regions, ranked by Steven's taste (clear English from somewhere other than the listener's locale)
const ACCENTS = ['en-IE', 'en-GB', 'en-ZA', 'en-IN', 'en-AU', 'en-NZ', 'en-US', 'en-CA'];
const SCOT = /Fiona|Scotland|Scottish/i, IRISH = /Ireland|Irish|Connor|Emily/i; // Moira denied entirely (Steven 2026-10-30)
const store = { get() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem(LS, JSON.stringify(Object.assign(store.get(), o))); } catch (e) {} } };
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ok = 'speechSynthesis' in window;
const S = { voices: [], good: [], chosen: null, proxy: null, muted: false, unlocked: false, tier: 'captions', why: '' };

function locale() { return (navigator.language || document.documentElement.lang || 'en').replace('_', '-'); }
const UA = navigator.userAgent || '';
const FAMILY = /Edg\//.test(UA) ? /Microsoft/i : /Android/.test(UA) ? /Google|^[a-z]{2,3}[-_][a-z]{2}[-_]x-|English|Android/i
  : /(iPhone|iPad|Macintosh)/.test(UA) && !/Chrome|CriOS|Firefox/.test(UA) ? /Siri|Premium|Enhanced|^[A-Z][a-z]+( \(|$)/
  : /Chrome|CriOS/.test(UA) ? /^Google /i : /./;
function tierOf(v) { // 0 = never; 1 = acceptable plain voice; 2 = natural/premium
  const n = v.name;
  if (DENY.test(n)) return 0;
  if (/Online \(Natural\)/i.test(n) || /\((Premium|Enhanced)\)/i.test(n) || /Siri/i.test(n) || /^Google /i.test(n)) return 2;
  return 1;                                                                       // Samantha/Daniel/Karen, Android "English United States", Firefox/Linux, Microsoft desktop
}
const region = (l) => ((l || '').replace('_', '-').split('-')[1] || '').toUpperCase();
function accentScore(v, listener) {        // higher = better; only compares voices already in the listener's language
  if (!/^en/i.test(v.lang)) return region(v.lang) === region(listener) ? 0 : 1;
  const r = IRISH.test(v.name) ? 'IE' : SCOT.test(v.name) ? 'SCOT' : region(v.lang);
  if (r === region(listener) || (r === 'SCOT' && region(listener) === 'GB')) return 0;   // listener's own accent last
  const order = ['IE', 'SCOT', 'ZA', 'IN', 'GB', 'AU', 'NZ', 'CA', 'US'];
  const k = order.indexOf(r); return k < 0 ? 1 : 20 - k;
}
function pool(prefs = {}) {              // listener's language first; English only when that language has no usable voice
  const listener = prefs.locale || locale(), lang = listener.slice(0, 2).toLowerCase();
  const usable = S.voices.filter(v => tierOf(v) > 0);
  const mine = usable.filter(v => (v.lang || '').toLowerCase().startsWith(lang));
  return { listener, list: mine.length ? mine : usable.filter(v => /^en/i.test(v.lang)) };
}
function rank(prefs = {}) {
  const { listener, list } = pool(prefs);
  const key = v => [accentScore(v, listener), FAMILY.test(v.name) ? 1 : 0, tierOf(v), v.localService ? 0 : 1];
  return list.slice().sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return a.name.localeCompare(b.name); });
}
function load() {
  S.voices = ok ? speechSynthesis.getVoices() : [];
  S.good = rank();
  const saved = store.get().voice;
  S.chosen = (saved && S.good.find(v => v.name === saved)) || S.good[0] || null;
  S.tier = S.proxy ? 'elevenlabs' : (S.chosen ? 'device' : 'captions');
  S.why = S.chosen ? '' : 'no usable device voice; captions only';
  refreshers.forEach(f => { try { f(); } catch (e) {} });   // late voiceschanged: refresh status + debug
}
const refreshers = new Set();
async function probeProxy() {
  const meta = document.querySelector && document.querySelector('meta[name="sae-voice-proxy"]');
  const base = QS.get('voiceproxy') || window.SAE_VOICE_PROXY || (meta && meta.content) || '';
  if (!base || QS.get('voiceproxy') === '0' || store.get().proxy === false) return null;   // only probe when configured
  try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 1500);
    const r = await fetch(base + '/health', { signal: c.signal }); clearTimeout(t);
    if (!r.ok) return null; const j = await r.json(); return j && j.ok && j.key ? { base, chars: j.characters || {} } : null;
  } catch (e) { return null; }
}
let readyP = null;
export function ready() {
  if (readyP) return readyP;
  readyP = (async () => {
    S.muted = !!store.get().muted;
    const vp = ok ? new Promise(res => { if (speechSynthesis.getVoices().length) return res();
      const t = setTimeout(res, 1500); speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); res(); }, { once: true }); }) : Promise.resolve();
    const [, px] = await Promise.all([vp, probeProxy()]);
    S.proxy = px; load();
    if (ok) speechSynthesis.addEventListener('voiceschanged', load);
    if (QS.get('voices') === '1') debug();
    S.isReady = true; return S;
  })();
  return readyP;
}
/* distinct good voice per character: stable hash over the ranked list, never repeating the narrator's if another exists */
export function pick(characterId, prefs = {}) {
  const per = (store.get().chars || {})[characterId];
  const list = rank(prefs);
  if (per) { const v = list.find(x => x.name === per); if (v) return v; }
  if (!characterId || characterId === 'narrator') return S.chosen;
  if (!list.length) return null;
  // first-come distinct assignment: each new character gets the best voice nobody else holds yet
  const auto = AUTO[characterId] && list.find(x => x.name === AUTO[characterId]); if (auto) return auto;
  const taken = new Set(Object.values(AUTO)); if (S.chosen) taken.add(S.chosen.name);
  const v = list.find(x => !taken.has(x.name)) || list[Object.keys(AUTO).length % list.length];
  AUTO[characterId] = v.name; return v;
}
const AUTO = {};
let audio = null;
export function cancel() { try { ok && speechSynthesis.cancel(); } catch (e) {} if (audio) { audio.pause(); audio = null; } }
export function setMuted(m) { S.muted = !!m; store.set({ muted: S.muted }); if (m) cancel(); }
export async function speak(text, opt = {}) {
  if (!text || S.muted || store.get().off) return false;
  await ready(); cancel();
  const rate = (opt.rate || 0.95) * (RM() ? 0.92 : 1);
  if (S.proxy) {
    try { audio = new Audio(`${S.proxy.base}/tts?text=${encodeURIComponent(text.slice(0, 400))}&voice=${encodeURIComponent(opt.character || 'narrator')}`);
      audio.playbackRate = Math.min(1, rate + 0.05); await audio.play(); return true; } catch (e) { audio = null; /* fall through to device */ }
  }
  const v = pick(opt.character, opt.prefs); if (!v || !ok) return false;      // captions only
  const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = rate; u.pitch = opt.pitch || 1;
  speechSynthesis.speak(u);
  // Chrome stops long utterances after ~15 s; Safari can leave the queue paused after a tab switch
  const keep = setInterval(() => { if (!speechSynthesis.speaking) return clearInterval(keep); if (speechSynthesis.paused) speechSynthesis.resume(); }, 5000);
  u.onend = u.onerror = () => clearInterval(keep);
  return true;
}
/* iOS / autoplay unlock on the first tap: a silent utterance + a silent audio element */
function unlock() {
  if (S.unlocked) return; S.unlocked = true;
  try { if (ok) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
  try { const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='); a.play().catch(() => {}); } catch (e) {}
}
addEventListener('pointerdown', unlock, { once: true, capture: true });
addEventListener('keydown', unlock, { once: true, capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });

/* tiny settings: one gear chip (draggable), opens a small panel with select + Test voice. No text over text: the panel is a solid box, one at a time. */
export function mountSettings(opts = {}) {
  if (document.getElementById('saev')) return;
  const st = document.createElement('style');
  st.textContent = `#saev{position:fixed;z-index:9999;font:13px/1.3 system-ui,sans-serif;touch-action:none}
#saev>button{width:36px;height:36px;border-radius:50%;border:1px solid #c9a86a;background:#241a2ecc;color:#f3e4c4;cursor:grab}
#saev .p{position:absolute;bottom:42px;right:0;width:230px;padding:10px;border-radius:10px;background:#241a2e;color:#f3e4c4;border:1px solid #c9a86a;box-shadow:0 6px 20px #0008;display:none}
#saev.open .p{display:block}#saev select,#saev .p button{width:100%;margin-top:6px;padding:6px;border-radius:6px}
#saev small{display:block;opacity:.75;margin-top:6px}`;
  document.head.appendChild(st);
  const pos = store.get().pos || { r: 14, b: 14 };
  const w = document.createElement('div'); w.id = 'saev'; w.style.right = pos.r + 'px'; w.style.bottom = pos.b + 'px';
  w.innerHTML = `<button aria-label="Read-aloud voice" title="Read-aloud voice">⚙</button><div class="p" role="dialog" aria-label="Voice">
<label>Read-aloud voice<select></select></label><button type="button" class="t">Test voice</button><small></small></div>`;
  document.body.appendChild(w);
  const sel = w.querySelector('select'), note = w.querySelector('small'), g = w.firstElementChild;
  const fill = () => { sel.innerHTML = '';
    const add = (val, txt) => { const o = document.createElement('option'); o.value = val; o.textContent = txt; sel.appendChild(o); };
    if (S.proxy) add('@11', 'Tower voices (ElevenLabs)');
    rank().forEach(v => add(v.name, `${v.name} · ${v.lang}`)); add('@off', 'Captions only (no voice)');
    const s = store.get(); sel.value = s.off ? '@off' : (S.proxy && s.proxy !== false ? '@11' : (S.chosen ? S.chosen.name : '@off'));
    note.textContent = S.tier === 'captions' ? 'No good voice on this device — captions only.' : `Using: ${S.tier === 'elevenlabs' ? 'Tower ElevenLabs' : S.chosen.name}`; };
  ready().then(fill); refreshers.add(fill);
  sel.onchange = () => { const v = sel.value;
    if (v === '@off') store.set({ off: true }); else if (v === '@11') store.set({ off: false, proxy: true });
    else { store.set({ off: false, voice: v, proxy: false }); S.proxy = null; S.chosen = S.good.find(x => x.name === v) || S.chosen; S.tier = 'device'; }
    fill(); };
  w.querySelector('.t').onclick = () => speak(opts.testLine || 'Hello! This is how I will read the story to you.', { character: 'narrator' });
  // drag (pointer), click toggles
  let d = null;
  g.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, r: parseFloat(w.style.right), b: parseFloat(w.style.bottom), m: false }; g.setPointerCapture(e.pointerId); });
  g.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.m = true;
    if (d.m) { w.style.right = Math.max(4, Math.min(innerWidth - 40, d.r - dx)) + 'px'; w.style.bottom = Math.max(4, Math.min(innerHeight - 40, d.b - dy)) + 'px'; } });
  g.addEventListener('pointerup', () => { if (d && d.m) store.set({ pos: { r: parseFloat(w.style.right), b: parseFloat(w.style.bottom) } }); else w.classList.toggle('open'); d = null; });
}
function debug() {
  let pre = document.getElementById('saev-debug');
  if (!pre) { pre = document.createElement('pre'); pre.id = 'saev-debug';
    pre.style.cssText = 'position:fixed;left:8px;top:8px;z-index:10000;max-height:60vh;overflow:auto;background:#000d;color:#9f9;font:11px monospace;padding:8px;border-radius:6px;max-width:46vw';
    document.body.appendChild(pre); refreshers.add(debug); }
  const ranked = rank();
  pre.textContent = `sae-voice ${VERSION} debug · locale ${locale()} · tier ${S.tier} · proxy ${S.proxy ? S.proxy.base : 'none'}\nchosen: ${S.chosen ? S.chosen.name + ' ' + S.chosen.lang : '(captions only)'}\n` +
    S.voices.map(v => `${tierOf(v) ? (ranked.includes(v) ? '#' + (ranked.indexOf(v) + 1) : '·') + ' t' + tierOf(v) : '✗'} ${v.name} · ${v.lang}`).join('\n');
}

/* Drop-in shim for pages with their own read-aloud code: every speechSynthesis.speak() goes through the picker.
 * A bad or unset voice is swapped for the picked one; with no allowlisted voice the utterance is dropped (captions only)
 * and a synthetic 'end' fires so read-along sequencing continues. Load with <script type="module" src="/sae-voice.js?shim=1">. */
export function installShim() {
  if (!ok || speechSynthesis.__sae) return; const orig = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.__sae = true;
  speechSynthesis.speak = (u) => {
    const go = () => {
      if (S.muted || store.get().off) return endSoon(u);
      const v = pick(u.__saeCharacter || 'narrator'); if (!v) return endSoon(u);
      u.voice = v; u.lang = v.lang; orig(u);
    };
    S.isReady ? go() : ready().then(go);   // synchronous once ready, so iOS keeps the user gesture
  };
}
function endSoon(u) { setTimeout(() => { try { u.dispatchEvent(new Event('end')); /* also runs the onend property, exactly once */ } catch (x) {} }, 0); }
if (/[?&]shim=1/.test(import.meta.url)) { installShim(); if (/[?&]gear=0/.test(import.meta.url)) ready(); else ready().then(() => mountSettings()); }
export const state = S;
const SaeVoice = { VERSION, installShim, ready, speak, pick, cancel, setMuted, mountSettings, state: S, _tierOf: tierOf, _rank: rank };
window.SaeVoice = SaeVoice;
export default SaeVoice;
