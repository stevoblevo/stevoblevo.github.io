// POST /api/board — the AND SO leaderboard, as one serverless function.
//   { op: 'signin', name, alg: 'p256' | 'ed25519', pk, at, sig }   → { id, name, token }
//   { op: 'score', id, score, finds, stars, rounds, played, at, sig } → { kept, rank, of, best }
//   { op: 'board', token }                                           → { count, top: [...50], you }
// Bodies may be sent as text/plain so browsers skip the preflight. Nothing is readable without signing in.
import { signin, score, board, readToken } from '../lib/core.js';
import { store, ready, Conflict } from '../lib/store.js';

const ORIGINS = [/^https:\/\/stevoblevo\.github\.io$/, /^https:\/\/([a-z0-9-]+\.)?saelion\.co$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+\.claudeusercontent\.com$/, /^https:\/\/claude\.ai$/, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
let cache = null;   // { at, doc } for board reads, a few seconds at most

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ORIGINS.some(r => r.test(origin))) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b); else if (Buffer.isBuffer(b)) b = JSON.parse(b.toString('utf8')); } catch (e) { b = null; }
  if (!b || typeof b !== 'object') return res.status(400).json({ error: 'send JSON' });
  if (!ready()) return res.status(503).json({ error: 'the board is not set up yet' });
  const now = Date.now(), st = store();
  try {
    if (b.op === 'board') {   // the key never changes once made, so a few seconds of cache is safe unless it predates the key
      if (!cache || now - cache.at > 4000 || !cache.doc.key) cache = { at: now, doc: (await st.read()).doc };
      const id = readToken(cache.doc.key, b.token, now); if (!id) return res.status(401).json({ error: 'sign in to see the board' });
      return res.status(200).json(board(cache.doc, id));
    }
    if (b.op !== 'signin' && b.op !== 'score') return res.status(400).json({ error: 'unknown op' });
    for (let tries = 0; tries < 6; tries++) {   // read, apply, write if unchanged; on a race, read again
      const { doc, etag } = await st.read();
      const r = b.op === 'signin' ? signin(doc, b, now) : score(doc, b, now);
      if (r.doc) { try { await st.write(r.doc, etag); cache = { at: Date.now(), doc: r.doc }; } catch (e) { if (e instanceof Conflict) continue; throw e; } }
      return res.status(r.status).json(r.body);
    }
    return res.status(503).json({ error: 'busy; try again' });
  } catch (e) {
    console.error('board', b.op, e && e.message);
    return res.status(500).json({ error: 'the board could not be reached' });
  }
}
