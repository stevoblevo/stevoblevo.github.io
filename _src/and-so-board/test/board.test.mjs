// The board, end to end through the function, with a file standing in for Vercel Blob.
// Keys are made the way the browser makes them: WebCrypto P-256 for the device key, ed25519 for a Solana wallet.
import assert from 'node:assert/strict';
import crypto, { webcrypto } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, readFile } from 'node:fs/promises';
import { MSG, tokenFor } from '../lib/core.js';

const FILE = join(tmpdir(), `andso-board-${process.pid}.json`);
process.env.ANDSO_BOARD_FILE = FILE;
const { default: handler } = await import('../api/board.js');
const subtle = webcrypto.subtle, b64u = b => Buffer.from(b).toString('base64url');
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58 = buf => { let n = BigInt('0x' + Buffer.from(buf).toString('hex')), s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const x of buf) { if (x) break; s = '1' + s; } return s; };

async function call(body, origin = 'https://stevoblevo.github.io') {
  let status = 0, json = null; const headers = {};
  const res = { setHeader: (k, v) => { headers[k.toLowerCase()] = v; }, status(c) { status = c; return this; }, json(o) { json = o; return this; }, end() { return this; } };
  await handler({ method: 'POST', headers: { origin }, body: JSON.stringify(body) }, res);
  return { status, json, headers };
}
async function deviceKey() {
  const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const jwk = await subtle.exportKey('jwk', kp.publicKey);
  return { alg: 'p256', pk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, sign: async t => b64u(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(t))) };
}
function wallet() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'jwk' }).x;
  return { alg: 'ed25519', pk: b58(Buffer.from(raw, 'base64url')), sign: async t => b64u(crypto.sign(null, Buffer.from(t), privateKey)) };
}
const iso = (ms = Date.now()) => new Date(ms).toISOString();
async function signin(k, name, at = iso()) { return call({ op: 'signin', name, alg: k.alg, pk: k.pk, at, sig: await k.sign(MSG.signin(name, at)) }); }
async function post(k, id, name, f, at = iso()) { const p = { ...f, name, at }; return call({ op: 'score', id, ...f, at, sig: await k.sign(MSG.score(p)) }); }

await rm(FILE, { force: true });
const a = await deviceKey(), b = await deviceKey(), w = wallet();
let r = await call({ op: 'board', token: 'x.9999999999.y' }); assert.equal(r.status, 401, 'an empty board has no key yet, so no token works');
r = await signin(a, 'Bleve');
assert.equal(r.status, 200, JSON.stringify(r.json)); const A = r.json; assert.ok(A.token && A.id);
assert.equal(r.headers['access-control-allow-origin'], 'https://stevoblevo.github.io');
r = await signin(b, 'bleve'); assert.equal(r.status, 409, 'a name differing only in case is taken');
r = await signin(b, 'Saelion'); assert.equal(r.status, 200); const B = r.json;
r = await signin(a, 'Bleve', iso(Date.now() - 20 * 60 * 1000)); assert.equal(r.status, 400, 'stale sign-in refused');
r = await call({ op: 'signin', name: 'Bleve', alg: a.alg, pk: a.pk, at: iso(), sig: await b.sign(MSG.signin('Bleve', iso())) }); assert.equal(r.status, 401, 'someone else signing for you');
r = await call({ op: 'board', token: 'nope' }); assert.equal(r.status, 401, 'no board without signing in');

const f1 = { score: 12345, finds: 40, stars: 3, rounds: 2, played: 600 };
r = await post(a, A.id, 'Bleve', f1); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.kept, true); assert.equal(r.json.rank, 1);
r = await post(a, A.id, 'Bleve', { ...f1, score: 99999 }); assert.equal(r.status, 429, 'too soon after the last one');
const tampered = { op: 'score', id: A.id, ...f1, score: 999999, at: iso(), sig: await a.sign(MSG.score({ ...f1, name: 'Bleve', at: iso() })) };
r = await call(tampered); assert.equal(r.status, 401, 'a changed number breaks the signature');
r = await post(b, B.id, 'Saelion', { score: 9_000_000, finds: 1, stars: 0, rounds: 0, played: 10 }); assert.equal(r.status, 422, 'implausible for ten seconds of play');
r = await post(b, B.id, 'Saelion', { score: 20000, finds: 55, stars: 9, rounds: 4, played: 900 }); assert.equal(r.status, 200); assert.equal(r.json.rank, 1);
r = await post(a, A.id, 'Bleve', f1, iso(Date.now() - 3600 * 1000)); assert.equal(r.json.kept, false, 'an older score, carried late, changes nothing');

r = await signin(w, 'Moonmint'); assert.equal(r.status, 200, JSON.stringify(r.json)); const Wl = r.json;
r = await post(w, Wl.id, 'Moonmint', { score: 15000, finds: 30, stars: 1, rounds: 1, played: 700 }); assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.rank, 2);

r = await call({ op: 'board', token: A.token }); assert.equal(r.status, 200);
assert.deepEqual(r.json.top.map(x => x.name), ['Saelion', 'Moonmint', 'Bleve']); assert.equal(r.json.you.rank, 3); assert.equal(r.json.count, 3);
assert.equal(r.json.top[1].wallet, true); assert.ok(!('pk' in r.json.top[0]) && !('id' in r.json.top[0]), 'no keys or ids of others on the board');
const disk = JSON.parse(await readFile(FILE, 'utf8'));
assert.ok(typeof disk.key === 'string' && disk.key.length >= 40, 'the board made its own key');
assert.ok(!JSON.stringify(r.json).includes(disk.key), 'and never shows it');
r = await call({ op: 'board', token: tokenFor('a guess', A.id, Date.now()) }); assert.equal(r.status, 401, 'a token made without the board key is refused');

r = await signin(a, 'Bleve Two'); assert.equal(r.status, 200); assert.equal(r.json.id, A.id, 'same key, new name');
r = await signin(b, 'Bleve'); assert.equal(r.status, 200, 'the old name is free again');

// two first sign-ins at the same moment: the file store refuses the stale write and the loser retries
const c = await deviceKey(), d = await deviceKey();
const [rc, rd] = await Promise.all([signin(c, 'Coin'), signin(d, 'Dime')]); assert.equal(rc.status, 200); assert.equal(rd.status, 200);
r = await call({ op: 'board', token: A.token }); assert.equal(r.status, 200);
r = await call({ op: 'score', id: 'nobody' }); assert.equal(r.status, 404);
r = await call({ op: 'constructor' }); assert.equal(r.status, 400, 'only the four ops');

// leaving: only your own key can take you off, and then your name is free
let at = iso();
r = await call({ op: 'leave', id: Wl.id, at, sig: await a.sign(MSG.leave('Moonmint', at)) }); assert.equal(r.status, 401, 'nobody else can remove you');
r = await call({ op: 'leave', id: Wl.id, at, sig: await w.sign(MSG.leave('Moonmint', at)) }); assert.equal(r.status, 200); assert.equal(r.json.left, true);
r = await call({ op: 'board', token: A.token }); assert.ok(!r.json.top.some(x => x.name === 'Moonmint'), 'gone from the board');
r = await signin(c, 'Moonmint'); assert.equal(r.status, 200, 'and the name is free');
r = await call({ op: 'board', token: A.token }, 'https://evil.example'); assert.equal(r.headers['access-control-allow-origin'], undefined, 'no CORS for strangers');
await rm(FILE, { force: true });
console.log('board: all checks passed');
