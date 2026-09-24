/* One device-local ingress into the EXISTING Thread Loom. No network, authority or AI. */
(function (root) {
  'use strict';
  const KEY = 'anewgam.steven.cockpit.v2';
  const MAX_SOURCE = 4000, MAX_THREADS = 250;
  function read(storage) {
    const raw = storage.getItem(KEY);
    if (raw === null) return {threads: [], receipts: [], blooms: 7, fruit: 'rose-gold Peach'};
    let state;
    try { state = JSON.parse(raw); } catch { throw new Error('Existing local memory could not be read. Export or recover it; it was not overwritten.'); }
    if (!state || typeof state !== 'object' || Array.isArray(state) || (state.threads !== undefined && !Array.isArray(state.threads))) throw new Error('Existing local memory has an unexpected shape. Nothing was overwritten.');
    state.threads = state.threads || [];
    state.receipts = Array.isArray(state.receipts) ? state.receipts : [];
    if (!['rose-gold Peach', 'cyan Pear', 'violet Plum'].includes(state.fruit)) state.fruit = 'rose-gold Peach';
    return state;
  }
  function append(storage, source, {world = 'cockpit', id = root.crypto.randomUUID(), now = new Date().toISOString()} = {}) {
    if (typeof source !== 'string' || !source.trim()) throw new Error('Leave a few words first.');
    if (source.length > MAX_SOURCE) throw new Error('This local thread can hold 4,000 characters. Your words were not shortened or sent.');
    if (!['cockpit', 'peachfall'].includes(world)) throw new Error('Unknown scene. Nothing was saved.');
    const state = read(storage);
    const threads = state.threads || [];
    if (threads.some(t => t && t.id === id)) return {state, id, duplicate: true};
    if (threads.length >= MAX_THREADS) throw new Error('The local loom has 250 threads. Export before adding more.');
    const entry = {id, source, heldAt: now, updatedAt: now, status: 'held-local', proof: '', world, ingress: 'device-local', authorityEffect: 'none'};
    state.threads = [entry, ...threads];
    state.receipts = [{at: now, event: 'thread-held', threadId: id, world, authorityEffect: 'none'}, ...(Array.isArray(state.receipts) ? state.receipts : [])].slice(0, 500);
    state.blooms = (Number.isFinite(Number(state.blooms)) ? Number(state.blooms) : 7) + 1;
    storage.setItem(KEY, JSON.stringify(state)); // Quota/denial propagates: never claim a save succeeded.
    return {state, id, duplicate: false};
  }
  // Restore threads into the existing store, never truncate or choose a conflicting winner.
  // This is a synchronous single-key write, not a cross-tab transaction or cloud sync.
  function restore(storage, payload, {now = new Date().toISOString()} = {}) {
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!object(payload) || payload.format !== 'sae.anewgam.skein' || payload.version !== 3 ||
        !object(payload.state) || !Array.isArray(payload.state.threads) ||
        (payload.authorityEffect !== undefined && payload.authorityEffect !== 'none')) {
      throw new Error('Choose a version 3 .anewgam skein backup. Nothing was changed.');
    }
    const current = read(storage); // Read AFTER the asynchronous file read, not an old tab snapshot.
    if (current.threads.length > MAX_THREADS || payload.state.threads.length > MAX_THREADS) {
      throw new Error('This backup or loom exceeds 250 threads. Nothing was shortened or changed.');
    }
    // Preserve JSON metadata; compare without depending on object property order.
    function canonical(value) {
      if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
      if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
      return JSON.stringify(value);
    }
    function checked(thread) {
      if (!object(thread) || typeof thread.id !== 'string' || !thread.id || thread.id.length > 200 ||
          typeof thread.source !== 'string' || !thread.source.trim() || thread.source.length > MAX_SOURCE ||
          (thread.proof !== undefined && (typeof thread.proof !== 'string' || thread.proof.length > 2000)) ||
          (thread.status !== undefined && !['held-local', 'in-motion', 'proven'].includes(thread.status)) ||
          (thread.world !== undefined && !['cockpit', 'peachfall'].includes(thread.world)) ||
          (thread.ingress !== undefined && thread.ingress !== 'device-local') ||
          (thread.authorityEffect !== undefined && thread.authorityEffect !== 'none') ||
          ['heldAt', 'updatedAt'].some(key => thread[key] !== undefined &&
            (typeof thread[key] !== 'string' || !Number.isFinite(Date.parse(thread[key]))))) {
        throw new Error('A thread has invalid or oversized data. Nothing was shortened or changed.');
      }
      return canonical({...thread, status: thread.status || 'held-local', proof: thread.proof || '', authorityEffect: 'none'});
    }
    const known = new Map();
    for (const thread of current.threads) {
      const signature = checked(thread);
      if (known.has(thread.id)) throw new Error('The existing loom has duplicate thread IDs. Nothing was changed.');
      known.set(thread.id, signature);
    }
    const added = [];
    let duplicates = 0;
    for (const thread of payload.state.threads) {
      const signature = checked(thread);
      if (known.has(thread.id)) {
        if (known.get(thread.id) !== signature) throw new Error('Backup conflicts with an existing thread ID. Nothing was changed; keep both copies.');
        duplicates++;
      } else {
        known.set(thread.id, signature);
        added.push(JSON.parse(JSON.stringify(thread)));
      }
    }
    if (current.threads.length + added.length > MAX_THREADS) {
      throw new Error('Restore would exceed 250 threads. Existing threads and the backup were left unchanged.');
    }
    if (!added.length) return {state: current, added: 0, duplicates}; // Idempotent: no write or new receipt.
    current.threads = [...current.threads, ...added]; // Existing order and metadata remain intact.
    current.receipts = [{at: now, event: 'skein-imported', addedThreads: added.length,
      authorityEffect: 'none'}, ...current.receipts].slice(0, 500); // Existing bounded local journal.
    current.blooms = (Number.isFinite(Number(current.blooms)) ? Number(current.blooms) : 7) + added.length;
    try { storage.setItem(KEY, JSON.stringify(current)); }
    catch { throw new Error('Storage refused the restore. Existing saved threads were not changed. Keep the backup.'); }
    return {state: current, added: added.length, duplicates};
  }
  const api = Object.freeze({KEY, MAX_SOURCE, MAX_THREADS, read, append, restore});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.__saeIngress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
