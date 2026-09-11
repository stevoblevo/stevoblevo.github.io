// Generated from the existing SaeDow module; same database, schema, and append checks.
export const VERSION = 'saedow/0.1';
const DB = 'anewgam-goober-v1';
export const ROOT = '0'.repeat(64);
export function canonical(value) {
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (value !== null && typeof value === 'object')
        return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
}
export async function digest(value) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
}
export function validateDraft(d) {
    if (!d || typeof d !== 'object')
        throw Error('This entry is not an object.');
    const x = d;
    for (const key of ['title', 'body', 'why', 'next_proof', 'source'])
        if (typeof x[key] !== 'string' || x[key].length > (key === 'body' ? 8000 : 600))
            throw Error('Entry fields must be text within the size limit.');
    if (!x.title.trim() || !['note', 'idea', 'quest', 'request', 'practice'].includes(String(x.kind)) || !['imagined', 'explored', 'candidate', 'completed', 'superseded'].includes(String(x.state)))
        throw Error('Choose a title, entry type, and supported state.');
    return { kind: x.kind, state: x.state, title: x.title.trim(), body: x.body, why: x.why, next_proof: x.next_proof, source: x.source };
}
export async function makeEntry(draft, previous = ROOT) {
    const clean = validateDraft(draft);
    const unsigned = { ...clean, id: crypto.randomUUID(), created_at: new Date().toISOString(), scope: 'device-local', authority: 'none', acceptance: 'self-reported', previous };
    return { ...unsigned, hash: await digest(canonical(unsigned)) };
}
export async function verify(entries) {
    if (!Array.isArray(entries) || entries.length > 1000)
        throw Error('A log must contain at most 1,000 entries.');
    let previous = ROOT;
    const ids = new Set();
    for (const entry of entries) {
        validateDraft(entry);
        if (typeof entry.id !== 'string' || entry.id.length > 100 || ids.has(entry.id) || typeof entry.created_at !== 'string' || !Number.isFinite(Date.parse(entry.created_at)) || entry.scope !== 'device-local' || entry.authority !== 'none' || entry.acceptance !== 'self-reported' || entry.previous !== previous || typeof entry.hash !== 'string')
            throw Error('Entry identity, scope, or chain is invalid.');
        const { hash, ...unsigned } = entry;
        if (hash !== await digest(canonical(unsigned)))
            throw Error('An entry has changed. Import stopped without replacing your log.');
        ids.add(entry.id);
        previous = hash;
    }
    return entries;
}
function open() {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('log');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(Error('Browser storage is unavailable. Nothing was saved.'));
        r.onblocked = () => reject(Error('Close older Anewgam tabs, then retry.'));
    });
}
export async function load() {
    const db = await open();
    try {
        return await new Promise((resolve, reject) => { const r = db.transaction('log').objectStore('log').get('entries'); r.onsuccess = () => resolve(r.result ?? []); r.onerror = () => reject(r.error); });
    }
    finally {
        db.close();
    }
}
async function replace(next, expected) {
    const db = await open();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction('log', 'readwrite'), store = tx.objectStore('log');
            let message = 'Could not save. Your previous log is unchanged.';
            const read = store.get('entries');
            read.onsuccess = () => { const current = read.result ?? []; if ((current.at(-1)?.hash ?? ROOT) !== expected) {
                message = 'Another tab updated your log. Reload and try again.';
                tx.abort();
                return;
            } store.put(next, 'entries'); };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(Error(message));
            tx.onabort = () => reject(Error(message));
        });
    }
    finally {
        db.close();
    }
}
export async function append(draft) {
    const current = await verify(await load());
    if (current.length >= 1000)
        throw Error('Export your log before starting a fresh one.');
    const head = current.at(-1)?.hash ?? ROOT, next = [...current, await makeEntry(draft, head)];
    await replace(next, head);
    return next;
}
export async function importLog(text) {
    if (text.length > 12_000_000)
        throw Error('Import is too large.');
    const packet = JSON.parse(text);
    if (packet.schema !== VERSION)
        throw Error('Unsupported SaeDow format.');
    const entries = await verify(packet.entries), current = await load();
    if (current.length)
        throw Error('Import is allowed only into an empty log. Export your current log first; nothing was replaced.');
    await replace(entries, ROOT);
    return entries;
}
export async function clear(expected) { await replace([], expected); }
export function download(name, data) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function envelope(entries) { return { schema: VERSION, exported_at: new Date().toISOString(), scope: 'device-local', identity: 'not-enrolled', skein_acceptance: 'not-submitted', entries }; }
