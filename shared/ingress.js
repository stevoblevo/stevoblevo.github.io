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
  const api = Object.freeze({KEY, MAX_SOURCE, MAX_THREADS, read, append});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.__saeIngress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
