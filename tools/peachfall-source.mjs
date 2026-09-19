/** Private engine stays inside the existing home and is never copied into public output. */
import {lstat, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export function enginePlan(root, engine) {
  if (engine.sourceDirectory !== '.worktrees/peachfall' || engine.buildDirectory !== 'live-slice')
    throw new Error('Peachfall requires its private .worktrees/peachfall/live-slice build root.');
  if (engine.repository !== 'stevoblevo/peachfall-playable' || !/^[a-f0-9]{40}$/.test(engine.selectedSourceRef || ''))
    throw new Error('Select an explicit Peachfall source commit; observedMain is historical, not a build selection.');
  return {checkout: path.join(root, engine.sourceDirectory), build: path.join(root, engine.sourceDirectory, engine.buildDirectory),
    sourceRef: engine.selectedSourceRef, repository: engine.repository};
}
async function noLinks(root, relative) {
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const info = await lstat(current).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (info?.isSymbolicLink()) throw new Error('Refusing a symlink in the private engine path.');
  }
}
function execute(command, args, cwd) {
  const result = spawnSync(command, args, {cwd, stdio:'inherit', shell:false});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}
export async function privateEngine(command, root, engine, run = execute, platform = process.platform) {
  if (!['source','engine'].includes(command)) throw new Error('Unknown private engine command.');
  const plan = enginePlan(root, engine);
  await noLinks(root, engine.sourceDirectory + '/' + engine.buildDirectory);
  if (command === 'source') {
    if (await lstat(plan.checkout).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e)))
      throw new Error('Existing Peachfall checkout preserved. Inspect it rather than resetting it.');
    await mkdir(path.dirname(plan.checkout), {recursive:true});
    run('git', ['clone','--no-checkout',`https://github.com/${plan.repository}.git`,plan.checkout], root);
    run('git', ['checkout','--detach',plan.sourceRef], plan.checkout);
    console.log('Selected live-slice development candidate opened privately. No published game replaced.');
    return plan;
  }
  await noLinks(root, engine.sourceDirectory + '/' + engine.buildDirectory + '/package.json');
  const pkg = await readFile(path.join(plan.build,'package.json'),'utf8').then(JSON.parse)
    .catch(() => {throw new Error('The selected live-slice package is missing. The older root game will not be built instead.');});
  if (pkg.name !== 'peachfall-live-slice') throw new Error('Unexpected game package; refusing the older root or another engine.');
  // Dependencies are intentionally not installed automatically. Dirty source is not reset.
  if (platform === 'win32') run('cmd.exe',['/d','/s','/c','npm test && npm run build'],plan.build);
  else {run('npm',['test'],plan.build); run('npm',['run','build'],plan.build);}
  console.log('Private live-slice tested and built. Public game, domain and deployment unchanged.');
  return plan;
}
