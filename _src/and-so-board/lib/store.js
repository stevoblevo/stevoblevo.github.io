// The whole board is one private JSON document in Vercel Blob. Reads skip the CDN cache; writes are conditional on the
// ETag that was read, so two players posting at once can't overwrite each other: the loser reads again and retries.
// With ANDSO_BOARD_FILE set (tests, local runs) the same contract is kept by a file on disk.
import { readFile, writeFile, rename } from 'node:fs/promises';
import crypto from 'node:crypto';
import { emptyDoc } from './core.js';

const PATH = 'board/v1.json';

export class Conflict extends Error {}

let lock = Promise.resolve();   // the file stand-in makes check-and-write atomic within one process, as Blob's ifMatch does
function fileStore(file) {
  const tagOf = s => crypto.createHash('sha1').update(s).digest('hex');
  return {
    async read() {
      try { const s = await readFile(file, 'utf8'); return { doc: JSON.parse(s), etag: tagOf(s) }; }
      catch (e) { if (e.code === 'ENOENT') return { doc: emptyDoc(), etag: null }; throw e; }
    },
    write(doc, etag) {
      const run = lock.then(async () => {
        let cur = null; try { cur = tagOf(await readFile(file, 'utf8')); } catch (e) { /* none yet */ }
        if (cur !== etag) throw new Conflict('changed underneath');
        const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
        await writeFile(tmp, JSON.stringify(doc)); await rename(tmp, file);
      });
      lock = run.catch(() => {});
      return run;
    }
  };
}

function blobStore() {
  // imported lazily so the tests never need the package
  const sdk = import('@vercel/blob');
  return {
    async read() {
      const { get } = await sdk;
      const r = await get(PATH, { access: 'private', useCache: false });
      if (!r || r.statusCode !== 200) return { doc: emptyDoc(), etag: null };
      return { doc: JSON.parse(await new Response(r.stream).text()), etag: r.blob.etag };
    },
    async write(doc, etag) {
      const { put, BlobPreconditionFailedError } = await sdk;
      const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 };
      try { await put(PATH, JSON.stringify(doc), etag ? { ...opts, ifMatch: etag } : opts); }
      catch (e) {
        if ((BlobPreconditionFailedError && e instanceof BlobPreconditionFailedError) || /already exists|precondition/i.test(String(e && e.message))) throw new Conflict('changed underneath');
        throw e;
      }
    }
  };
}

export const store = () => (process.env.ANDSO_BOARD_FILE ? fileStore(process.env.ANDSO_BOARD_FILE) : blobStore());
// a connected Blob store brings either a read-write token or a store id (OIDC); the SDK takes whichever is there
export const ready = () => Boolean(process.env.ANDSO_BOARD_FILE || process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
