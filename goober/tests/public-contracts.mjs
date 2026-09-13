import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const read = relative => readFile(path.join(repo, relative));
const text = async relative => (await read(relative)).toString('utf8');
const json = async relative => JSON.parse(await text(relative));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({name, passed: true});
  } catch (error) {
    checks.push({name, passed: false, error: error.message});
  }
};
const checkAsync = async (name, fn) => {
  try {
    await fn();
    checks.push({name, passed: true});
  } catch (error) {
    checks.push({name, passed: false, error: error.message});
  }
};

const catalog = await json('goober/gallery/catalog.json');
const gallery = await text('goober/gallery/index.html');
const processSource = await text('goober/gallery/process.js');
const ids = new Set();
const allowedAssetRoots = ['/goober/assets/', '/peachfall/source/images/', '/goober/learn/obs-windows-11/cards/'];

for (const item of catalog.items) {
  check(`catalog shape: ${item.id}`, () => {
    assert.match(item.id, /^[a-z0-9][a-z0-9-]{0,79}$/);
    assert(!ids.has(item.id), 'duplicate catalog id');
    ids.add(item.id);
    for (const key of ['title', 'description', 'source_filename', 'original_url', 'preview_url', 'thumbnail_url']) {
      assert.equal(typeof item[key], 'string', `missing ${key}`);
    }
    assert.match(item.original_sha256, /^[a-f0-9]{64}$/);
    for (const key of ['original_url', 'preview_url', 'thumbnail_url']) {
      assert(allowedAssetRoots.some(root => item[key].startsWith(root)), `unapproved ${key}`);
      assert(!item[key].includes('..') && !item[key].includes('?') && !item[key].includes('#'), `unsafe ${key}`);
    }
  });
  if (typeof item.original_url === 'string' && item.original_url.startsWith('/')) {
    const bytes = await read(item.original_url.slice(1));
    check(`original hash: ${item.id}`, () => assert.equal(sha256(bytes), item.original_sha256));
  }
}

const tileIds = [...gallery.matchAll(/<article class="tile" data-id="([^"]+)"/g)].map(match => match[1]);
const processIds = [...processSource.matchAll(/\['([a-z0-9-]+)','[^']+','(?:png|jpg)'\]/g)].map(match => match[1]);
check('every catalog item has exactly one wall tile', () => {
  const allTileIds = [...tileIds, ...processIds];
  assert.equal(allTileIds.length, catalog.items.length);
  assert.deepEqual(new Set(allTileIds), ids);
});

const routes = await json('goober/lattice/routes.json');
const resolverSource = await text('goober/lattice/resolve.js');
const resolver = await import(`data:text/javascript;base64,${Buffer.from(resolverSource).toString('base64')}`);
for (const route of routes.routes) {
  check(`route resolves: ${route.id}`, () => assert.equal(resolver.resolvePublicName(route.id, routes), route.url));
}
check('unknown route rejects', () => assert.throws(() => resolver.resolvePublicName('saelion://private/device', routes)));
check('route substitution rejects', () => {
  const changed = structuredClone(routes);
  changed.routes[0].url = '/goober/not-the-world';
  assert.throws(() => resolver.resolvePublicName(changed.routes[0].id, changed));
});

const keepCoreSource = await text('goober/project$/keep-core.js');
const keepCore = await import(`data:text/javascript;base64,${Buffer.from(keepCoreSource).toString('base64')}`);
for (const item of catalog.items) {
  check(`project handoff accepts catalog item: ${item.id}`, () => {
    assert.equal(keepCore.choosePicture(catalog, `?project=goober&picture=${item.id}`).hash, item.original_sha256);
  });
}
for (const thread of ['path', 'seam', 'tool']) {
  check(`Tower thread is explicit: ${thread}`, () => {
    const selected = keepCore.chooseThread(`?thread=${thread}`);
    assert.equal(selected.id, thread);
    assert(selected.title.startsWith('Tower thread'));
  });
}
check('unknown or ambiguous Tower thread rejects', () => {
  assert.throws(() => keepCore.chooseThread('?thread=unknown'));
  assert.throws(() => keepCore.chooseThread('?thread=path&thread=tool'));
  for (const inherited of ['__proto__', 'constructor', 'toString', 'valueOf']) {
    assert.throws(() => keepCore.chooseThread(`?thread=${encodeURIComponent(inherited)}`));
  }
});

const contract = await json('goober/source/anewgam-world-thread.v1.json');
await checkAsync('world-thread contract binds canonical poster bytes', async () => {
  const original = await read(contract.source.canonical_original.slice(1));
  const display = await read(contract.source.display.slice(1));
  assert.equal(sha256(original), contract.source.canonical_original_sha256);
  assert.equal(sha256(display), contract.source.display_sha256);
  assert.equal(contract.browser_projection.route, '/goober/#tower');
  assert.equal(contract.browser_projection.automatic_save, false);
  assert.equal(contract.browser_projection.automatic_dispatch, false);
});

await checkAsync('historical release hashes stay archived and byte-bound', async () => {
  await assert.rejects(read('goober/receipts/static-file-hashes.json'));
  const archived = await read('goober/receipts/archive/89185c985927/static-file-hashes.json');
  assert.equal(sha256(archived), '02fa23b9ac1bf2a30442c7033b60c106e12c8d0a2aee3b8589fe472ac87aa3b9');
});

const enrichment = await text('goober/enrichment.js');
const worker = await text('goober/sw.js');
const workflow = await text('.github/workflows/goober-public.yml');
const historicalImporter = await text('.github/scripts/publish-goober.py');
check('Tower uses existing field-log doorway without automatic save', () => {
  assert(enrichment.includes("BASE + 'project$/?'"));
  assert(!enrichment.includes('indexedDB'));
  assert(enrichment.includes('Nothing is saved yet'));
});
check('Peachfall iframe waits for a user choice', () => {
  assert(!enrichment.includes('<iframe'));
  assert(enrichment.includes("button.addEventListener('click'"));
  assert(enrichment.includes("PEACH + '?embedded=goober'"));
});
await checkAsync('Peachfall ships without the retired heat beacon', async () => {
  for (const entry of ['peachfall/index.html', 'peachfall/play.html']) {
    assert(!(await text(entry)).includes('heat-beacon.js'));
  }
  await assert.rejects(read('peachfall/heat-beacon.js'));
});
for (const required of ['enrichment.js', 'enrichment.css', 'assets/rediscovered/peachfall-09.webp', 'project$/keep-core.js', 'source/anewgam-world-thread.v1.json']) {
  check(`offline shell includes ${required}`, () => assert(worker.includes(`'${required}'`)));
}
check('new public files contain no local workspace path', () => {
  const joined = [enrichment, worker, JSON.stringify(contract), keepCoreSource].join('\n');
  assert(!joined.includes('/workspace/'));
  assert(!joined.includes('libfile_'));
});
check('CI verifies checked-in Goober without rewriting or pushing it', () => {
  assert(workflow.includes('node goober/tests/public-contracts.mjs'));
  assert(workflow.includes('contents: read'));
  assert(!workflow.includes('run: python3 .github/scripts/publish-goober.py'));
  assert(!workflow.includes('git push'));
  assert(!workflow.includes('deploy-pages'));
  assert(historicalImporter.includes("--replace-checked-in-goober"));
  assert(historicalImporter.includes("branch.startswith('import/')"));
  assert(historicalImporter.includes("'status', '--porcelain=v1', '--untracked-files=all'"));
  assert(workflow.includes("'.github/scripts/publish-goober.py'"));
  assert(workflow.includes("'goober-release.json'"));
});

const failed = checks.filter(result => !result.passed);
console.log(JSON.stringify({checks: checks.length, passed: checks.length - failed.length, failed}, null, 2));
if (failed.length) process.exitCode = 1;
