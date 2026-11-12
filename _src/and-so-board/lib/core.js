// AND SO leaderboard: the rules, in one place. No storage and no HTTP here, so the tests and the function share it.
//
// A player is a public key. In the browser that is either a device key (ECDSA P-256, made by WebCrypto and never
// exported) or a Solana wallet (ed25519, via the wallet's signMessage). Every write is a plain-text message signed by
// that key; the server rebuilds the same text from the fields it receives and checks the signature. So a score can
// travel any route (a radio relay included) without anyone on the way being able to change it.
import crypto from 'node:crypto';

export const LIMITS = { name: [2, 20], score: 20_000_000, finds: 400, stars: 100_000, rounds: 50_000, played: 10_000_000 };
export const WINDOW_SIGNIN = 10 * 60 * 1000;          // a sign-in must be fresh
export const WINDOW_SCORE = 30 * 24 * 3600 * 1000;    // a score may arrive late (carried by radio), but not from the future
export const SKEW = 10 * 60 * 1000;
export const TOKEN_DAYS = 30;
export const MIN_GAP = 8 * 1000;                       // between two accepted scores from one player

export const MSG = {
  signin: (name, at) => `AND SO leaderboard\nsign in as ${name}\nat ${at}`,
  score: p => `AND SO leaderboard\nsign my score: ${p.score} resonance, ${p.finds} finds, ${p.stars} stars, ${p.rounds} rounds, ${p.played}s played\nas ${p.name}\nat ${p.at}`,
  leave: (name, at) => `AND SO leaderboard\nremove ${name} from the board\nat ${at}`
};

export const b64u = buf => Buffer.from(buf).toString('base64url');
export const unb64u = s => Buffer.from(String(s || ''), 'base64url');

// base58 (bitcoin alphabet), for Solana addresses
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function unb58(s) {
  s = String(s || '');
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return null;
  let n = 0n; for (const c of s) n = n * 58n + BigInt(B58.indexOf(c));
  const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of s) { if (c !== '1') break; out.unshift(0); }
  return Buffer.from(out);
}

export function cleanName(raw) {
  const s = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const n = [...s].length;
  if (n < LIMITS.name[0] || n > LIMITS.name[1]) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(s)) return null;
  return s;
}
export const nameKey = s => s.normalize('NFKC').toLowerCase().replace(/[\s._'-]+/g, '');

// the key a player signs with, as raw public bytes, and a Node key object to verify with
export function readKey(alg, pk) {
  try {
    if (alg === 'p256') {
      if (!pk || pk.kty !== 'EC' || pk.crv !== 'P-256' || !pk.x || !pk.y) return null;
      const jwk = { kty: 'EC', crv: 'P-256', x: String(pk.x), y: String(pk.y) };
      const raw = Buffer.concat([Buffer.from([4]), unb64u(jwk.x), unb64u(jwk.y)]);
      if (raw.length !== 65) return null;
      return { raw, jwk, key: crypto.createPublicKey({ key: jwk, format: 'jwk' }) };
    }
    if (alg === 'ed25519') {
      const raw = unb58(pk); if (!raw || raw.length !== 32) return null;
      const jwk = { kty: 'OKP', crv: 'Ed25519', x: b64u(raw) };
      return { raw, jwk, key: crypto.createPublicKey({ key: jwk, format: 'jwk' }) };
    }
  } catch (e) { /* not a key */ }
  return null;
}
export const idOf = raw => b64u(crypto.createHash('sha256').update(raw).digest()).slice(0, 22);

export function verify(alg, key, text, sig) {
  try {
    const data = Buffer.from(text, 'utf8'), s = unb64u(sig);
    if (alg === 'p256') return s.length === 64 && crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, s);
    if (alg === 'ed25519') return s.length === 64 && crypto.verify(null, data, key, s);
  } catch (e) { /* bad signature */ }
  return false;
}

// session tokens: id.expiry.mac, keyed by a random key the board keeps in its own private document, so the deployment
// needs no secret of its own. Removing that key from the document signs everyone out.
export function tokenFor(secret, id, now) {
  const exp = Math.floor(now / 1000) + TOKEN_DAYS * 86400;
  return `${id}.${exp}.${mac(secret, `${id}.${exp}`)}`;
}
export function readToken(secret, token, now) {
  const [id, exp, m] = String(token || '').split('.');
  if (!secret || !id || !exp || !m || +exp * 1000 < now) return null;
  const want = mac(secret, `${id}.${exp}`);
  return want.length === m.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(m)) ? id : null;
}
function mac(secret, s) {
  const k = crypto.createHmac('sha256', String(secret)).update('and-so-board session v1').digest();
  return b64u(crypto.createHmac('sha256', k).update(s).digest()).slice(0, 32);
}

const int = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);
const when = s => { const ms = Date.parse(s); return typeof s === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(s) && Number.isFinite(ms) ? ms : null; };

export const emptyDoc = () => ({ v: 1, key: null, players: {}, names: {} });

// ---- the three things a player can do. Each takes the document and returns { status, body, doc? } (doc when it changed)
export function signin(doc, b, now) {
  const name = cleanName(b.name);
  if (!name) return fail(400, 'pick a name of 2 to 20 letters or numbers');
  const k = readKey(b.alg, b.pk); if (!k) return fail(400, 'that key could not be read');
  const at = when(b.at); if (at == null || Math.abs(now - at) > WINDOW_SIGNIN) return fail(400, "the sign-in is out of date; check this device's clock");
  if (!verify(b.alg, k.key, MSG.signin(name, b.at), b.sig)) return fail(401, 'the signature does not match');
  const id = idOf(k.raw), nk = nameKey(name), holder = doc.names[nk];
  if (holder && holder !== id) return fail(409, 'that name is taken');
  const p = doc.players[id];
  let changed = false;
  if (!doc.key) { doc.key = b64u(crypto.randomBytes(32)); changed = true; }   // the first sign-in ever makes the board's key
  if (!p) {
    doc.players[id] = { name, alg: b.alg, pk: b.alg === 'p256' ? k.jwk : String(b.pk), joined: new Date(now).toISOString(), score: 0, finds: 0, stars: 0, rounds: 0, played: 0, at: null, posted: 0 };
    doc.names[nk] = id; changed = true;
  } else if (p.name !== name) {   // signing in under a new name renames you
    delete doc.names[nameKey(p.name)]; p.name = name; doc.names[nk] = id; changed = true;
  }
  return { status: 200, body: { id, name, token: tokenFor(doc.key, id, now) }, doc: changed ? doc : null };
}

export function score(doc, b, now) {
  const p = doc.players[b.id]; if (!p) return fail(404, 'sign in first');
  const f = { score: int(b.score, LIMITS.score), finds: int(b.finds, LIMITS.finds), stars: int(b.stars, LIMITS.stars), rounds: int(b.rounds, LIMITS.rounds), played: int(b.played, LIMITS.played) };
  if (Object.values(f).some(v => v == null)) return fail(400, 'those numbers are out of range');
  const at = when(b.at); if (at == null || at > now + SKEW || at < now - WINDOW_SCORE) return fail(400, 'that score is too old, or from the future');
  const k = readKey(p.alg, p.pk); if (!k) return fail(500, 'the stored key could not be read');
  if (!verify(p.alg, k.key, MSG.score({ ...f, name: p.name, at: b.at }), b.sig)) return fail(401, 'the signature does not match');
  if (f.score > 5000 + 400 * f.played) return fail(422, 'more resonance than that much playing can make');
  if (p.at && at <= Date.parse(p.at)) return { status: 200, body: { kept: false, ...rankOf(doc, b.id) } };   // older than what we have: nothing to do
  if (now - (p.posted || 0) < MIN_GAP) return fail(429, 'one score every few seconds');
  const better = f.score > p.score || (f.score === p.score && f.finds > p.finds);
  Object.assign(p, { finds: Math.max(p.finds, f.finds), stars: Math.max(p.stars, f.stars), rounds: Math.max(p.rounds, f.rounds), played: Math.max(p.played, f.played), at: b.at, posted: now });
  if (better) p.score = f.score;
  return { status: 200, body: { kept: better, ...rankOf(doc, b.id) }, doc };
}

// a player can take themselves off the board: their row, their name and their key are gone
export function leave(doc, b, now) {
  const p = doc.players[b.id]; if (!p) return fail(404, 'not on the board');
  const at = when(b.at); if (at == null || Math.abs(now - at) > WINDOW_SIGNIN) return fail(400, "that request is out of date; check this device's clock");
  const k = readKey(p.alg, p.pk); if (!k || !verify(p.alg, k.key, MSG.leave(p.name, b.at), b.sig)) return fail(401, 'the signature does not match');
  delete doc.names[nameKey(p.name)]; delete doc.players[b.id];
  return { status: 200, body: { left: true }, doc };
}

export function board(doc, id, n = 50) {
  const all = sorted(doc), me = all.findIndex(([pid]) => pid === id);
  const row = ([, p], i) => ({ rank: i + 1, name: p.name, score: p.score, finds: p.finds, stars: p.stars, rounds: p.rounds, wallet: p.alg === 'ed25519' || undefined, at: p.at });
  return { count: all.length, top: all.slice(0, n).map(row), you: me >= 0 ? { ...row(all[me], me), id } : null };
}
function sorted(doc) {
  return Object.entries(doc.players).filter(([, p]) => p.at).sort(([, a], [, b]) => b.score - a.score || b.finds - a.finds || Date.parse(a.at) - Date.parse(b.at));
}
function rankOf(doc, id) { const all = sorted(doc), i = all.findIndex(([pid]) => pid === id); return { rank: i + 1, of: all.length, best: doc.players[id].score }; }
const fail = (status, error) => ({ status, body: { error } });
