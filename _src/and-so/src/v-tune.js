// ===== tune together: one clock, one key, one chord, roles, and a gentler level as copies arrive =====
var ENS = { id: '', born: Date.now() + Math.random(), on: false, want: null, n: 1, role: 'full', peers: {}, master: true, gain: 1, lastSend: 0, wired: false };
ENS.id = Math.random().toString(36).slice(2, 8) + ((Math.random() * 36) | 0).toString(36);
var ensCh = null;
try { ensCh = new BroadcastChannel('andso-8-together'); ensCh.onmessage = e => ensRecv(e.data, null); } catch (e) { ensCh = null; }

function ensWire() {
  if (!A.ac || ENS.wired) return;
  const ac = A.ac;
  A.ensBus = ac.createGain(); A.ensBus.gain.value = 1;
  A.ensFilter = ac.createBiquadFilter(); A.ensFilter.type = 'allpass'; A.ensFilter.frequency.value = 1000;
  A.ensLim = ac.createDynamicsCompressor();
  A.ensLim.threshold.value = -18; A.ensLim.knee.value = 10; A.ensLim.ratio.value = 3.2; A.ensLim.attack.value = 0.012; A.ensLim.release.value = 0.22;
  A.ensBus.connect(A.ensFilter); A.ensFilter.connect(A.ensLim); A.ensLim.connect(A.lp);
  A.roleF = ac.createBiquadFilter(); A.roleF.type = 'allpass'; A.roleF.frequency.value = 1000; A.roleF.Q.value = 0.5;
  try { A.bus.disconnect(A.lp); A.bus.connect(A.roleF); A.roleF.connect(A.lp); } catch (err) {}
  ENS.wired = true;
  ensStage();
}
function ensAlive() {
  const now = performance.now();
  Object.keys(ENS.peers).forEach(id => { if (now - ENS.peers[id].t > 2500) delete ENS.peers[id]; });
  return Object.keys(ENS.peers).length + (ensPlaying() ? 1 : 0);
}
function ensPlaying() { return !!(entered && !paused && !muted && A.ac); }
function ensIds() {
  const rows = Object.keys(ENS.peers).map(id => ({ id, born: +ENS.peers[id].born || 0 }));
  if (ensPlaying()) rows.push({ id: ENS.id, born: ENS.born });
  const seen = new Set();
  return rows.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true))).sort((a, b) => a.born - b.born || (a.id < b.id ? -1 : 1)).map(r => r.id);
}
function ensAssign() {
  const ids = ensIds();
  const i = ids.indexOf(ENS.id);
  ENS.n = Math.max(1, ids.length);
  ENS.master = !ids.length || ids[0] === ENS.id;
  if (!ensPlaying() || ENS.n < 2) ENS.role = 'full';
  else if (i <= 0) ENS.role = 'bass';
  else if (i === 1) ENS.role = 'comp';
  else if (i === 2) ENS.role = 'melody';
  else if (i < 5) ENS.role = 'pad';
  else ENS.role = 'silent';
}
function ensShould() {
  if (ENS.want === false) return false;
  if (ENS.want === true) return ENS.n >= 1 && ensPlaying();
  return ensPlaying() && ENS.n >= 2;
}
function ensRefresh() {
  ensAlive();
  ensAssign();
  const next = ensShould();
  const rose = next && !ENS.on;
  ENS.on = next;
  ensStage();
  ensPaint();
  if (rose && ENS.n >= 2 && typeof wingTick === 'function') { /* wingTick watches ENS.on */ }
}
function ensStage() {
  if (!A.ac) return;
  ensAssign();
  const n = ENS.on && ENS.n > 1 ? ENS.n : 1;
  const lv = ENS.on && n > 1 ? 0.82 / Math.pow(n, 0.55) : 1;
  ENS.gain = lv;
  const now = A.ac.currentTime;
  if (A.vol) A.vol.gain.setTargetAtTime(muted ? 0 : 0.95 * SET.vol * lv, now, 0.18);
  if (A.bus && ENS.wired) {
    let bg = 0.85;
    if (ENS.on && n > 1) bg = { bass: 0.32, comp: 0.26, melody: 0.2, pad: 0.14, silent: 0.05, full: 0.4 }[ENS.role] || 0.3;
    else if (BOOK.open && BOOK.onPlay) bg = 0.4;
    A.bus.gain.setTargetAtTime(bg, now, 0.2);
  }
  if (A.drumBus) {
    let dg = 0.9;
    if (ENS.on && n > 1) dg = ENS.role === 'bass' ? 0.75 : ENS.role === 'comp' ? 0.12 : 0.02;
    A.drumBus.gain.setTargetAtTime(dg, now, 0.2);
  }
  const carve = (f, role) => {
    if (!f) return;
    if (!ENS.on || n < 2 || role === 'full') { f.type = 'allpass'; f.frequency.setTargetAtTime(1000, now, 0.1); return; }
    if (role === 'bass') { f.type = 'lowpass'; f.frequency.setTargetAtTime(460, now, 0.12); f.Q.value = 0.45; }
    else if (role === 'comp') { f.type = 'bandpass'; f.frequency.setTargetAtTime(880, now, 0.12); f.Q.value = 0.4; }
    else if (role === 'melody') { f.type = 'highpass'; f.frequency.setTargetAtTime(300, now, 0.12); f.Q.value = 0.45; }
    else if (role === 'pad') { f.type = 'lowpass'; f.frequency.setTargetAtTime(620, now, 0.12); f.Q.value = 0.35; }
    else { f.type = 'lowpass'; f.frequency.setTargetAtTime(180, now, 0.12); }
  };
  carve(A.roleF, ENS.role);
  carve(A.ensFilter, ENS.role === 'full' ? 'full' : ENS.role);
  if (A.lim && ENS.on && n > 1) { A.lim.threshold.setTargetAtTime(-20, now, 0.2); A.lim.ratio.setTargetAtTime(6, now, 0.2); }
}
function ensPack(kind) {
  return { andso: 'ens', id: ENS.id, born: ENS.born, kind, t: performance.now(), perf: performance.now(), bpm: BOOK.bpm, semi: BOOK.semi, abs: BOOK.onPlay ? BOOK.abs : null, chart: BOOK.onPlay ? BOOK.id : '', kindChart: BOOK.kind, chord: BOOK.sym || '', role: ENS.role };
}
function ensSend(kind) {
  if (!ensPlaying() && kind !== 'bye') return;
  const msg = ensPack(kind || 'hi');
  if (ensCh) { try { ensCh.postMessage(msg); } catch (e) {} }
  try { localStorage.setItem('andso:v8:ens', JSON.stringify(msg)); } catch (e) {}
  try { if (window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {}
  if (typeof MIR !== 'undefined' && MIR.wins) MIR.wins.forEach(w => { try { if (w.frame && w.frame.contentWindow) w.frame.contentWindow.postMessage(Object.assign({ relay: 1 }, msg), '*'); } catch (e) {} });
}
function ensRecv(d, source) {
  if (!d || d.andso !== 'ens' || d.id === ENS.id) return;
  if (d.kind === 'bye') { delete ENS.peers[d.id]; ensRefresh(); return; }
  ENS.peers[d.id] = d; d.t = performance.now();
  ensRefresh();
  if (!ENS.master && d.bpm && typeof d.abs === 'number' && d.chart) ensFollow(d);
  if (!d.relay && typeof MIR !== 'undefined' && MIR.depth === 0 && MIR.wins && MIR.wins.length) {
    const msg = Object.assign({ relay: 1 }, d);
    MIR.wins.forEach(w => { if (w.frame && w.frame.contentWindow && w.frame.contentWindow !== source) { try { w.frame.contentWindow.postMessage(msg, '*'); } catch (e) {} } });
  }
}
function ensFollow(d) {
  if (!ensPlaying() || !ENS.on) return;
  if (d.chart && d.chart !== BOOK.id && d.chart !== 'yours' && chartById(d.chart)) bookOpen(d.chart, { play: true });
  if (d.bpm) BOOK.bpm = clamp(d.bpm, 40, 240);
  if (typeof d.semi === 'number') BOOK.semi = ((d.semi % 12) + 12) % 12;
  if (A.ac && typeof d.abs === 'number') {
    const spb = 60 / Math.max(40, BOOK.bpm);
    const late = Math.max(0, (performance.now() - (d.perf || d.t)) / 1000);
    const absF = d.abs + late / spb;
    BOOK.abs = Math.floor(absF);
    bookNext = A.ac.currentTime + (1 - (absF - BOOK.abs)) * spb;
    if (!BOOK.onPlay) bookPlay();
  }
  bookPaint();
}
function ensTick() {
  const now = performance.now();
  if (!ensPlaying()) {
    if (ENS.on) { ensSend('bye'); ENS.on = false; ensStage(); ensPaint(); }
    return;
  }
  if (now - ENS.lastSend > (ENS.master ? 360 : 800)) { ENS.lastSend = now; ensSend(BOOK.onPlay ? 'beat' : 'hi'); ensRefresh(); }
}
function ensToggle() {
  ENS.want = ENS.on ? false : true;
  if (ENS.want === false) { ENS.on = false; ensSend('bye'); }
  ensRefresh();
}
function ensPaint() {
  const b = $('ensClasp'); if (!b) return;
  const show = ENS.n >= 2 || ENS.on || ENS.want === true;
  b.hidden = !show;
  b.setAttribute('aria-pressed', ENS.on ? 'true' : 'false');
  b.classList.toggle('is-on', !!ENS.on);
  const label = ENS.on ? 'tune together, ' + ENS.role + ', ' + ENS.n : 'tune together';
  b.setAttribute('aria-label', label);
  const t = $('ensRead'); if (t) t.textContent = ENS.on ? (shownKey() + ' · ' + (BOOK.bpm | 0)) : '';
}
function ensSaveTake() {
  try {
    localStorage.setItem('andso:v8:take', JSON.stringify({ bpm: BOOK.bpm, semi: BOOK.semi, chart: BOOK.id, key: shownKey(), at: Date.now() }));
    caption('kept this take.', 2200);
  } catch (e) {}
  const chip = $('ensSave'); if (chip) chip.hidden = false;
}
window.addEventListener('message', e => { const d = e.data; if (d && d.andso === 'ens') ensRecv(d, e.source); });
window.addEventListener('storage', e => { if (e.key === 'andso:v8:ens' && e.newValue) { try { ensRecv(JSON.parse(e.newValue), null); } catch (err) {} } });
on('ensClasp', ensToggle);
