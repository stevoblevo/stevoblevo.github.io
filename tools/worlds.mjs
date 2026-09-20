import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export function validateWorlds(worlds) {
  if (!Array.isArray(worlds) || !worlds.length) throw new Error('Worlds are required.');
  const ids = new Set();
  for (const world of worlds) {
    if (!/^[a-z0-9-]+$/.test(world.id) || ids.has(world.id)) throw new Error('World identity is invalid or repeated.');
    ids.add(world.id);
    if (!world.title || !world.kind || !world.note) throw new Error('Every world needs a title, kind and honest status.');
    if (world.href && !/^\/(?!\/)/.test(world.href) && !/^https:\/\//.test(world.href)) throw new Error('Unsafe world route.');
    if (world.watch && (world.kind !== 'game' || !world.href?.startsWith('/'))) throw new Error('Watch requires a local game adapter.');
  }
  if (!ids.has('cockpit')) throw new Error('The way home is missing.');
  return worlds;
}

export async function prepareWorlds(root) {
  const {worlds} = JSON.parse(await readFile(path.join(root, 'saelion.workspace.json'), 'utf8'));
  validateWorlds(worlds);
  // Do not project private source locations or credentials into the public surface.
  const publicWorlds = worlds.map(({repository, ...world}) => world);
  await writeFile(path.join(root, 'shared/worlds.js'), '/* Generated from saelion.workspace.json by tools/worlds.mjs. */\nwindow.__saeWorlds = ' + JSON.stringify(publicWorlds, null, 2) + ';\n');
  return publicWorlds;
}
