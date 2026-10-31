// ===== the narrator: a clear English accent from outside the listener's region, plus an optional ElevenLabs reading =====
// The key, when someone pastes one, stays in localStorage. Nothing in the repo holds a key.
const EL_ON = 'andso:el:on', EL_KEY = 'andso:el:key', EL_ID = 'andso:el:id';
let elAudio = null, voiceFilled = false;

function elOn() { try { return localStorage.getItem(EL_ON) === '1'; } catch (e) { return false; } }
function elKey() { try { return localStorage.getItem(EL_KEY) || ''; } catch (e) { return ''; } }
function elId() { try { return (localStorage.getItem(EL_ID) || '').trim(); } catch (e) { return ''; } }
function elSave(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }

function voiceNote(v) {
  const el = $('sVoiceNote'); if (!el) return;
  const R = window.Storeybrook && Storeybrook.read;
  if (elOn() && elKey() && elId()) { el.textContent = 'ElevenLabs is on. if it fails, the system voice speaks.'; return; }
  if (!v) { el.textContent = 'no English voice yet. some browsers load them a moment after the page.'; return; }
  if (R && R.compactOnly && R.compactOnly()) { el.textContent = R.tip(); return; }
  const tier = R && R.tier ? R.tier(v) : '';
  el.textContent = `${v.name} (${v.lang})${tier ? ' · ' + tier : ''}.`;
}
function voiceOption(sel, value, label, selected) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  if (selected) o.selected = true;
  sel.appendChild(o);
}
function fillVoiceSelect() {
  const sel = $('sVoice'); if (!sel) return;
  const R = window.Storeybrook && Storeybrook.read;
  sel.textContent = '';
  if (!R || !R.supported) { voiceOption(sel, '', 'this browser has no voices', true); voiceNote(null); return; }
  try { speechSynthesis.getVoices(); } catch (e) { /* late */ }
  const rows = (R.inspect ? R.inspect() : []).filter(r => r.ok);
  const cur = R.pick();
  const saved = (() => { try { const raw = localStorage.getItem('sb:voice'); return raw ? JSON.parse(raw) : ''; } catch (e) { return ''; } })();
  voiceOption(sel, '', 'automatic', !saved);
  rows.forEach(r => voiceOption(sel, r.name, r.name + ' · ' + r.lang + ' · ' + r.tierName, saved === r.name));
  voiceNote(cur);
  voiceFilled = rows.length > 0;
  voiceDebug();
}
function voiceDebug() {
  if (!/[?&]voices=1(?:&|$)/.test(location.search)) return;
  const R = window.Storeybrook && Storeybrook.read;
  if (!R || !R.inspect) return;
  let box = $('voiceDebug');
  if (!box) { box = document.createElement('pre'); box.id = 'voiceDebug'; document.body.appendChild(box); }
  const plat = R.readUA();
  const rows = R.inspect();
  const chosen = R.choose();
  const lines = [
    `ua: ${plat.browser} on ${plat.os}`,
    plat.ua,
    `locale: ${R.homeRegion()} (navigator, then html lang, then en)`,
    `chosen: ${chosen ? chosen.name + ' · ' + chosen.tierName + ' · ' + chosen.score : 'none'}`
  ];
  rows.forEach(r => lines.push(`${r.score}\t${r.stepName || ''}\t${r.tierName}\t${r.lang || '-'}\t${r.name}`));
  box.textContent = lines.join('\n');
}
function stopEleven() {
  if (elAudio) { try { elAudio.pause(); } catch (e) { /* already stopped */ } elAudio = null; }
}
function speakEleven(text) {
  const key = elKey(), id = elId();
  if (!elOn() || !key || !id) return Promise.reject(new Error('off'));
  stopEleven();
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}/stream?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: String(text || '').slice(0, 2500), model_id: 'eleven_turbo_v2_5' })
  }).then(res => { if (!res.ok) throw new Error('el'); return res.blob(); }).then(blob => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), a = new Audio(url);
    elAudio = a;
    a.onended = () => { URL.revokeObjectURL(url); if (elAudio === a) elAudio = null; resolve(); };
    a.onerror = () => { URL.revokeObjectURL(url); reject(new Error('play')); };
    const p = a.play(); if (p && p.catch) p.catch(reject);
  }));
}
function hookEleven() {
  const R = window.Storeybrook && Storeybrook.read;
  if (!R || R._elHook) return;
  R._elHook = true;
  const next = R._next.bind(R);
  R._next = function () {
    if (!(elOn() && elKey() && elId()) || R.state === 'idle') return next();
    if (R._i >= R._chunks.length) { R._done(); return; }
    const c = R._chunks[R._i];
    speakEleven(c.text.slice(R._at || 0)).then(() => {
      if (R.state !== 'speaking') return;
      R._at = 0; R._i++; R._next();
    }).catch(() => { if (R.state === 'speaking') next(); });
  };
  const stop = R.stop.bind(R);
  R.stop = function (quiet) { stopEleven(); return stop(quiet); };
  const pause = R.pause.bind(R);
  R.pause = function () { stopEleven(); return pause(); };
}
function voiceMuted() {
  try { return localStorage.getItem('andso:voice:mute') === '1' || (typeof muted !== 'undefined' && muted); } catch (e) { return typeof muted !== 'undefined' && muted; }
}
function voiceCaption(text) {
  const line = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (typeof caption === 'function') caption(line || 'The words stay on the page.', 4800);
}
window.andsoVoiceCaption = voiceCaption;
window.andsoElReady = () => !!(elOn() && elKey() && elId());
function voiceTest() {
  const R = window.Storeybrook && Storeybrook.read;
  const line = 'Here is a voice from somewhere else.';
  if (voiceMuted()) { voiceCaption(line); return; }
  if (!R || !R.supported) { voiceCaption("This browser can't read aloud. The words stay on the page."); return; }
  if (elOn() && elKey() && elId()) {
    speakEleven(line).catch(() => R.speak(line, { rate: 0.96, pitch: 1.02 }));
    return;
  }
  R.speak(line, { rate: 0.96, pitch: 1.02 });
  voiceNote(R.pick());
}
function voiceUnlock() {
  const R = window.Storeybrook && Storeybrook.read;
  const plat = R && R.readUA && R.readUA();
  if (!plat || plat.os !== 'ios' || voiceUnlock.done) return;
  const SY = window.speechSynthesis;
  if (!SY) return;
  voiceUnlock.done = true;
  try { SY.resume(); const u = new SpeechSynthesisUtterance('\u200b'); u.volume = 0; SY.speak(u); } catch (e) { /* already unlocked */ }
}
function voiceBoot() {
  hookEleven();
  fillVoiceSelect();
  const sel = $('sVoice'), test = $('sVoiceTest'), on = $('sElOn'), key = $('sElKey'), id = $('sElId');
  if (sel && !sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', () => {
      try {
        if (sel.value) localStorage.setItem('sb:voice', JSON.stringify(sel.value));
        else localStorage.removeItem('sb:voice');
      } catch (e) { /* storage blocked */ }
      const R = window.Storeybrook && Storeybrook.read;
      if (R && R.state !== 'idle') R.speak(R._el || 'Here is a voice from somewhere else.');
      fillVoiceSelect();
    });
  }
  if (test && !test.dataset.bound) { test.dataset.bound = '1'; test.addEventListener('click', voiceTest); }
  if (on && !on.dataset.bound) {
    on.dataset.bound = '1';
    on.checked = elOn();
    on.addEventListener('change', () => { elSave(EL_ON, on.checked ? '1' : ''); fillVoiceSelect(); });
  }
  if (key && !key.dataset.bound) {
    key.dataset.bound = '1';
    key.value = elKey();
    key.addEventListener('change', () => { elSave(EL_KEY, key.value.trim()); fillVoiceSelect(); });
  }
  if (id && !id.dataset.bound) {
    id.dataset.bound = '1';
    id.value = elId();
    id.addEventListener('change', () => { elSave(EL_ID, id.value.trim()); fillVoiceSelect(); });
  }
  const mute = $('sVoiceMute');
  if (mute && !mute.dataset.bound) {
    mute.dataset.bound = '1';
    try { mute.checked = localStorage.getItem('andso:voice:mute') === '1'; } catch (e) { /* storage blocked */ }
    mute.addEventListener('change', () => {
      elSave('andso:voice:mute', mute.checked ? '1' : '');
      const R = window.Storeybrook && Storeybrook.read;
      if (mute.checked && R) R.stop();
    });
  }
  const R = window.Storeybrook && Storeybrook.read;
  if (R) R.muted = voiceMuted;
  const SY = window.speechSynthesis;
  if (SY) {
    const again = () => fillVoiceSelect();
    if (SY.addEventListener) SY.addEventListener('voiceschanged', again);
    else SY.onvoiceschanged = again;
    if (R && R.whenReady) R.whenReady(again);
    else setTimeout(again, 1500);
  }
  window.addEventListener('pointerdown', voiceUnlock, { capture: true });
  if (typeof devApply === 'function') devApply();
}
voiceBoot();
