// ===== the narrator: a clear English accent from outside the listener's region, plus an optional ElevenLabs reading =====
// The key, when someone pastes one, stays in localStorage. Nothing in the repo holds a key.
const EL_ON = 'andso:el:on', EL_KEY = 'andso:el:key', EL_ID = 'andso:el:id';
let elAudio = null, voiceFilled = false, elPending = false, elGeneration = 0, elRequest = null, elUrl = null, elReject = null;

function elOn() { try { return localStorage.getItem(EL_ON) === '1'; } catch (e) { return false; } }
function elKey() { try { return localStorage.getItem(EL_KEY) || ''; } catch (e) { return ''; } }
function elId() { try { return (localStorage.getItem(EL_ID) || '').trim(); } catch (e) { return ''; } }
function elSave(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }

function voiceNote(v) {
  const el = $('sVoiceNote'); if (!el) return;
  const R = window.Storeybrook && Storeybrook.read;
  const home = R && R.homeRegion ? R.homeRegion() : '';
  if (elOn() && elKey() && elId()) { el.textContent = 'ElevenLabs is on. if it fails, the system voice speaks.'; return; }
  if (!v) { el.textContent = 'no English voice yet. some browsers load them a moment after the page.'; return; }
  const away = home && v.lang && v.lang.toUpperCase().indexOf(home) < 0;
  el.textContent = `${v.name} (${v.lang})${home ? `, outside ${home}` : ''}${away ? '' : ', the only English voice here'}.`;
}
function fillVoiceSelect() {
  const sel = $('sVoice'); if (!sel) return;
  const R = window.Storeybrook && Storeybrook.read;
  if (!R || !R.supported) { sel.innerHTML = '<option value="">this browser has no voices</option>'; voiceNote(null); return; }
  try { speechSynthesis.getVoices(); } catch (e) { /* late */ }
  const vs = R.voices(), cur = R.pick();
  const saved = (() => { try { const raw = localStorage.getItem('sb:voice'); return raw ? JSON.parse(raw) : ''; } catch (e) { return ''; } })();
  const opts = ['<option value="">automatic</option>'].concat(vs.map(v => `<option value="${String(v.name).replace(/"/g, '&quot;')}"${saved === v.name ? ' selected' : ''}>${v.name} · ${v.lang}</option>`));
  sel.innerHTML = opts.join('');
  if (!saved) sel.value = '';
  voiceNote(cur);
  voiceFilled = vs.length > 0;
}
function stopEleven() {
  elGeneration++; elPending = false;
  if (elRequest) { elRequest.abort(); elRequest = null; }
  if (elReject) { const reject = elReject; elReject = null; reject(Object.assign(new Error('cancelled'), { cancelled: true })); }
  if (elUrl) { URL.revokeObjectURL(elUrl); elUrl = null; }
  if (elAudio) { try { elAudio.pause(); } catch (e) { /* already stopped */ } elAudio = null; }
}
function speakEleven(text) {
  voiceCommandsStop('Voice commands off while narration plays.');
  const key = elKey(), id = elId();
  if (!elOn() || !key || !id) return Promise.reject(new Error('off'));
  stopEleven();
  const generation = elGeneration, request = new AbortController();
  elRequest = request; elPending = true;
  const cancelled = () => Object.assign(new Error('cancelled'), { cancelled: true });
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}/stream?output_format=mp3_44100_128`, {
    method: 'POST', signal: request.signal,
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: String(text || '').slice(0, 2500), model_id: 'eleven_turbo_v2_5' })
  }).then(res => { if (!res.ok) throw new Error('el'); return res.blob(); }).then(blob => new Promise((resolve, reject) => {
    if (generation !== elGeneration) { reject(cancelled()); return; }
    elPending = false; elRequest = null; elReject = reject;
    const url = URL.createObjectURL(blob), a = new Audio(url); elUrl = url;
    elAudio = a;
    a.onended = () => { if (generation !== elGeneration) { reject(cancelled()); return; } elReject = null; elUrl = null; URL.revokeObjectURL(url); if (elAudio === a) elAudio = null; resolve(); };
    a.onerror = () => { if (generation !== elGeneration) { reject(cancelled()); return; } elReject = null; elUrl = null; elAudio = null; URL.revokeObjectURL(url); reject(new Error('play')); };
    const p = a.play(); if (p && p.catch) p.catch(error => {
      URL.revokeObjectURL(url);
      if (elAudio === a) { elAudio = null; elUrl = null; elReject = null; }
      reject(error);
    });
  })).catch(error => {
    if (generation !== elGeneration) throw cancelled();
    elPending = false; elRequest = null;
    throw error;
  });
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
    speakEleven(c.text).then(() => {
      if (R.state === 'idle') return;
      R._i++; R._next();
    }).catch(error => { if (!error.cancelled && R.state !== 'idle') next(); });
  };
  const stop = R.stop.bind(R);
  R.stop = function (quiet) { stopEleven(); return stop(quiet); };
}
function voiceTest() {
  const R = window.Storeybrook && Storeybrook.read;
  if (!R || !R.supported) { caption("this browser can't read aloud.", 2200); return; }
  const line = 'Here is a voice from somewhere else.';
  if (elOn() && elKey() && elId()) {
    speakEleven(line).catch(error => { if (!error.cancelled) R.speak(line, { rate: 0.96, pitch: 1.02 }); });
    return;
  }
  R.speak(line, { rate: 0.96, pitch: 1.02 });
  voiceNote(R.pick());
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
  const SY = window.speechSynthesis;
  if (SY) {
    const again = () => fillVoiceSelect();
    if (SY.addEventListener) SY.addEventListener('voiceschanged', again);
    else SY.onvoiceschanged = again;
    // Chrome, Safari and Firefox often hand the list over after the first paint
    setTimeout(again, 250); setTimeout(again, 1200);
  }
  if (typeof devApply === 'function') devApply();
}
voiceBoot();
