// ===== the board: a name next to your resonance, signed by a key only this browser holds =====
// The board lives at and-so-board.vercel.app (its source is _src/and-so-board/ in this repository). A player is a
// key: this browser makes an ECDSA P-256 key with WebCrypto and keeps it in IndexedDB, where its private half can't
// be read back out, or a Solana wallet signs instead. Every write is one short line of text that key signed, so the
// board can tell it came from you whichever way it travelled: straight there, later when you're back online, or by
// radio through a relay. Nothing is sent anywhere until you sign in, and a wallet only ever signs text.
const BOARD_API = 'https://and-so-board.vercel.app/api/board';
const BOARD_SAVE = 'andso:board';   // the sign-in and any score waiting to go out: one per site, shared by every version
const BOARD_RELAY = 'https://github.com/stevoblevo/stevoblevo.github.io/blob/master/_tools/andso-rns-sidecar.py';
const BMSG = {   // word for word what the board rebuilds and checks (lib/core.js MSG)
  signin: (name, at) => `AND SO leaderboard\nsign in as ${name}\nat ${at}`,
  score: p => `AND SO leaderboard\nsign my score: ${p.score} resonance, ${p.finds} finds, ${p.stars} stars, ${p.rounds} rounds, ${p.played}s played\nas ${p.name}\nat ${p.at}`,
  leave: (name, at) => `AND SO leaderboard\nremove ${name} from the board\nat ${at}`
};
const BD = { open: false, busy: false, last: null, kp: null, volatile: false, leaving: 0 };

const bdB64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bdOrd = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
function bdState() { try { return JSON.parse(localStorage.getItem(BOARD_SAVE)) || {}; } catch (e) { return {}; } }
function bdKeep(s) { try { localStorage.setItem(BOARD_SAVE, JSON.stringify(s)); } catch (e) { /* private window: this visit only */ } }
function bdName(raw) {   // the board's own rule: 2 to 20 letters, numbers, spaces and . _ ' -, starting with a letter or number
  const s = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim(), n = [...s].length;
  return n >= 2 && n <= 20 && /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(s) ? s : '';
}
function bdNumbers() { return { score: Math.max(0, Math.floor(GAME.score)), finds: found.size, stars: GAME.stars | 0, rounds: GAME.rounds | 0, played: Math.round(GAME.played) }; }

// ---------- the device key: made once, kept in IndexedDB, never exported ----------
function bdIdb() {
  return new Promise((ok, no) => { const r = indexedDB.open('andso-board', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
}
async function bdDeviceKey(make) {
  if (BD.kp) return BD.kp;
  try {
    const db = await bdIdb();
    BD.kp = await new Promise((ok, no) => { const q = db.transaction('keys').objectStore('keys').get('device'); q.onsuccess = () => ok(q.result || null); q.onerror = () => no(q.error); });
    if (!BD.kp && make) {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
      await new Promise((ok, no) => { const tx = db.transaction('keys', 'readwrite'); tx.objectStore('keys').put(kp, 'device'); tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
      BD.kp = kp;
    }
  } catch (e) {   // no IndexedDB here (some private windows): a key for this visit only
    if (make) { BD.kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']); BD.volatile = true; }
  }
  return BD.kp;
}
async function bdDevicePk(kp) { const j = await crypto.subtle.exportKey('jwk', kp.publicKey); return { kty: j.kty, crv: j.crv, x: j.x, y: j.y }; }
async function bdDeviceSign(kp, text) { return bdB64u(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(text)))); }

// ---------- a Solana wallet, if this browser has one: it signs the same line of text, and nothing else ----------
function bdWallet() {
  try {
    const w = window;
    return (w.phantom && w.phantom.solana && w.phantom.solana.isPhantom && w.phantom.solana) || (w.solflare && w.solflare.isSolflare && w.solflare)
      || (w.backpack && w.backpack.isBackpack && w.backpack) || (w.solana && typeof w.solana.signMessage === 'function' && w.solana) || null;
  } catch (e) { return null; }
}
async function bdWalletSign(text) {
  const w = bdWallet(); if (!w) throw new Error('no Solana wallet in this browser');
  const r = await w.connect(); const pk = (r && r.publicKey) || w.publicKey; if (!pk) throw new Error("the wallet didn't share an address");
  const out = await w.signMessage(new TextEncoder().encode(text), 'utf8');
  const sig = out instanceof Uint8Array ? out : out && out.signature; if (!sig) throw new Error("the wallet didn't sign");
  return { addr: pk.toString(), sig: bdB64u(new Uint8Array(sig)) };
}
async function bdSignAs(st, text) {   // with whichever key this player signed in with
  if (st.alg === 'ed25519') {
    const w = await bdWalletSign(text);
    if (w.addr !== st.addr) throw new Error('the wallet is on a different account from the one on the board');
    return w.sig;
  }
  const kp = await bdDeviceKey(false); if (!kp) throw new Error("this browser no longer has the key for that name");
  return bdDeviceSign(kp, text);
}

// ---------- talking to the board ----------
async function bdCall(body) {
  // text/plain keeps it a simple request, so browsers send it without asking the board first
  const r = await fetch(BOARD_API, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body), cache: 'no-store', keepalive: body.op === 'score' });
  let json = {}; try { json = await r.json(); } catch (e) { /* not JSON */ }
  return { status: r.status, json };
}
function bdUnreachable() {
  if (navigator.onLine === false) return "you're offline. your score stays here and goes out when you're back.";
  return VER_ON_PAGES ? "the board can't be reached right now. try again in a moment." : "the board can't be reached from here. it works at stevoblevo.github.io/and-so.";
}
async function bdScoreBody(st) {
  const n = bdNumbers(), at = new Date().toISOString();
  return { op: 'score', id: st.id, ...n, at, sig: await bdSignAs(st, BMSG.score({ ...n, name: st.name, at })) };
}
async function bdFlush() {   // a score signed while offline goes out once there is a way
  const st = bdState(); if (!st.pending || navigator.onLine === false) return;
  try {
    const r = await bdCall(st.pending);
    if (r.status === 429) { setTimeout(bdFlush, 9000); return; }   // the board takes one score every 8 seconds: wait and send it again
    if (r.status < 500) { const s = bdState(); if (s.pending && s.pending.at === st.pending.at) delete s.pending; bdKeep(s); if (BD.open) bdRefresh(); }
  } catch (e) { /* still no way */ }
}

async function bdSignIn(via) {
  if (BD.busy) return;
  const name = bdName($('bdName').value);
  if (!name) { bdSay('pick a name of 2 to 20 letters or numbers.', true); $('bdName').focus(); return; }
  bdBusy(true, via === 'wallet' ? 'waiting for the wallet…' : 'signing in…');
  try {
    const at = new Date().toISOString(); let body;
    if (via === 'wallet') { const w = await bdWalletSign(BMSG.signin(name, at)); body = { op: 'signin', name, alg: 'ed25519', pk: w.addr, at, sig: w.sig }; }
    else { const kp = await bdDeviceKey(true); body = { op: 'signin', name, alg: 'p256', pk: await bdDevicePk(kp), at, sig: await bdDeviceSign(kp, BMSG.signin(name, at)) }; }
    let r; try { r = await bdCall(body); } catch (e) { bdBusy(false); bdSay(bdUnreachable(), true); return; }
    if (r.status !== 200) { bdBusy(false); bdSay((r.json.error || 'the board said no') + '.', true); return; }
    bdKeep({ ...bdState(), id: r.json.id, name: r.json.name, token: r.json.token, alg: body.alg, addr: body.alg === 'ed25519' ? body.pk : undefined });
    jlog(`signed in to the board as ${r.json.name}`);
    bdBusy(false); await bdRefresh(true);
  } catch (e) { bdBusy(false); bdSay(String(e && e.message || e).replace(/\.?$/, '.'), true); }
}

async function bdSignScore(quiet) {
  if (BD.busy) return;
  const st = bdState(); if (!st.token) return;
  bdBusy(true, quiet ? '' : st.alg === 'ed25519' ? 'waiting for the wallet…' : 'signing…');   // signing by itself says nothing until it lands
  let body;
  try { body = await bdScoreBody(st); } catch (e) { bdBusy(false); if (!quiet) bdSay(String(e && e.message || e).replace(/\.?$/, '.'), true); return; }
  let r;
  try { r = await bdCall(body); }
  catch (e) { const s = bdState(); s.pending = body; bdKeep(s); bdBusy(false); bdSay(bdUnreachable(), true); bdPaint(); return; }
  bdBusy(false);
  if (r.status === 200) {
    jlog(`signed a score: ${body.score} resonance`);
    bdSay(r.json.kept ? `signed. you're ${bdOrd(r.json.rank)} of ${r.json.of}.` : `signed. your best is still ${(+r.json.best || 0).toLocaleString()}.`);
    await bdRefresh();
  } else if (!(quiet && r.status === 429)) bdSay((r.json.error || 'the board said no') + '.', true);
}

async function bdRefresh(signedNow) {
  const st = bdState(); if (!st.token) { BD.last = null; bdPaint(); return; }
  let r; try { r = await bdCall({ op: 'board', token: st.token }); } catch (e) { bdPaint(); bdSay(bdUnreachable(), true); return; }
  if (r.status === 401) {   // the sign-in ran out (30 days): a device key signs in again on its own; a wallet asks once
    const s = bdState(); delete s.token; bdKeep(s);
    if (st.alg === 'p256' && st.name && !signedNow) { $('bdName').value = st.name; await bdSignIn('device'); return; }
    bdPaint(); bdSay('sign in again to see the board.'); return;
  }
  if (r.status !== 200) { bdPaint(); bdSay((r.json.error || "the board didn't answer") + '.', true); return; }
  BD.last = r.json; bdPaint();
  // a device key keeps the board up to date by itself: if this browser has played past what the board shows, sign it
  const you = r.json.you;
  if (st.alg === 'p256' && GAME.score > 0 && (!you || GAME.score > you.score || found.size > you.finds) && !BD.busy) bdSignScore(true);
}

async function bdLeave() {
  const st = bdState(); if (!st.id || BD.busy) return;
  if (Date.now() - BD.leaving > 5000) { BD.leaving = Date.now(); $('bdLeave').textContent = 'press again to take your name and scores off'; return; }
  BD.leaving = 0; bdBusy(true, 'taking you off…');
  try {
    const at = new Date().toISOString(), sig = await bdSignAs(st, BMSG.leave(st.name, at));
    const r = await bdCall({ op: 'leave', id: st.id, at, sig });
    bdBusy(false);
    if (r.status !== 200 && r.status !== 404) { bdSay((r.json.error || 'the board said no') + '.', true); return; }
    bdKeep({}); BD.last = null; jlog('left the board'); bdPaint(); bdSay('your name and scores are off the board.');
  } catch (e) { bdBusy(false); bdSay(e instanceof TypeError ? bdUnreachable() : String(e && e.message || e).replace(/\.?$/, '.'), true); }
}
function bdSignOut() { const s = bdState(); bdKeep(s.pending ? { pending: s.pending } : {}); BD.last = null; bdPaint(); bdSay('signed out. sign in with the same name to pick up where you were.'); }

async function bdCopyForRadio() {
  const st = bdState(); if (!st.token || BD.busy) return;
  bdBusy(true, st.alg === 'ed25519' ? 'waiting for the wallet…' : 'signing…');
  try {
    const text = JSON.stringify(await bdScoreBody(st)); bdBusy(false);
    let ok = false; try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { /* no clipboard: show it to copy by hand */ }
    const box = $('bdRadioText'); box.value = text; box.classList.toggle('hidden', ok); if (!ok) { box.focus(); box.select(); }
    bdSay(ok ? 'copied. it stays good for 30 days.' : 'select it and copy. it stays good for 30 days.');
  } catch (e) { bdBusy(false); bdSay(String(e && e.message || e).replace(/\.?$/, '.'), true); }
}

// ---------- the sheet ----------
function bdSay(text, bad) { const m = $('bdMsg'); m.textContent = text || ''; m.classList.toggle('bad', !!bad); }
function bdBusy(on, text) {
  BD.busy = on; document.querySelectorAll('#board .bd-b').forEach(b => { b.disabled = on; });
  if (on && text) bdSay(text);
}
function bdPaint() {
  const st = bdState(), inn = !!st.token, b = BD.last;
  $('bdGuest').classList.toggle('hidden', inn); $('bdSigned').classList.toggle('hidden', !inn); $('bdBoardPart').classList.toggle('hidden', !inn);
  const w = !!bdWallet(); $('bdWallet').classList.toggle('hidden', !w); $('bdWalletNote').classList.toggle('hidden', !w);
  $('bdVolatile').classList.toggle('hidden', !BD.volatile);
  const n = bdNumbers();
  $('bdNow').textContent = `this browser: ${n.score.toLocaleString()} resonance · ${n.finds} finds · ${n.stars} stars · ${n.rounds} rounds`;
  $('bdPending').classList.toggle('hidden', !st.pending);
  if (!inn) return;
  $('bdMe').textContent = st.name || '';
  $('bdMeKey').textContent = st.alg === 'ed25519' ? 'signs with a wallet' : 'signs with this browser';
  const you = b && b.you;
  $('bdRank').textContent = !b ? '' : you ? `${bdOrd(you.rank)} of ${b.count}` : 'not on the board yet';
  const list = $('bdList'); list.textContent = '';
  if (!b) return;
  for (const row of b.top) list.appendChild(bdRow(row, you && row.rank === you.rank));
  if (you && you.rank > b.top.length) { const gap = document.createElement('li'); gap.className = 'bd-gap'; gap.textContent = '⋯'; gap.setAttribute('aria-hidden', 'true'); list.append(gap, bdRow(you, true)); }
}
function bdRow(row, mine) {
  const li = document.createElement('li'); li.className = 'bd-row'; if (mine) li.setAttribute('aria-current', 'true');
  const rank = document.createElement('span'); rank.className = 'bd-rank'; rank.textContent = row.rank;
  const name = document.createElement('span'); name.className = 'bd-name'; name.textContent = row.name;
  if (row.wallet) { const i = document.createElement('i'); i.textContent = 'wallet'; name.appendChild(i); }
  const score = document.createElement('span'); score.className = 'bd-score'; score.textContent = (+row.score || 0).toLocaleString();
  const sub = document.createElement('span'); sub.className = 'bd-sub'; sub.textContent = `${row.finds} finds · ${row.stars} stars · ${row.rounds} rounds`;
  li.append(rank, name, score, sub); return li;
}
function boardOpen() {
  if (MIR.depth > 0) return;
  BD.open = true; BD.leaving = 0; $('bdLeave').textContent = 'take me off the board';
  $('board').classList.add('on'); $('board').setAttribute('aria-hidden', 'false');
  const st = bdState(); if (st.name) $('bdName').value = st.name;
  bdSay(''); bdPaint(); jlog('opened the board');
  setTimeout(() => { const f = st.token ? $('bdSign') : $('bdName'); if (f) f.focus(); }, 30);
  bdFlush().then(() => bdRefresh());
}
function boardClose() { BD.open = false; $('board').classList.remove('on'); $('board').setAttribute('aria-hidden', 'true'); }

$('bdForm').addEventListener('submit', e => { e.preventDefault(); bdSignIn('device'); });
$('bdWallet').addEventListener('click', () => bdSignIn('wallet'));
$('bdSign').addEventListener('click', () => bdSignScore(false));
$('bdOutBtn').addEventListener('click', bdSignOut);
$('bdLeave').addEventListener('click', bdLeave);
$('bdCopy').addEventListener('click', bdCopyForRadio);
$('bdRelay').href = BOARD_RELAY;
on('boardClose', boardClose);
on('gBoard', boardOpen);
on('bBoard', boardOpen);
$('board').addEventListener('click', e => { if (e.target === $('board')) boardClose(); });
// while the sheet is open, keys belong to it (typing a name included): Escape closes it, and the instrument hears nothing
window.addEventListener('keydown', e => { if (!BD.open) return; e.stopImmediatePropagation(); if (e.key === 'Escape') boardClose(); }, true);
window.addEventListener('online', bdFlush);
if (MIR.depth > 0) { $('gBoard').closest('.btns').classList.add('hidden'); $('gBoardNote').classList.add('hidden'); $('bBoard').classList.add('hidden'); }
else setTimeout(bdFlush, 4000);
