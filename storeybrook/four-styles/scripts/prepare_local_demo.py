#!/usr/bin/env python3
"""Build a private, self-contained local preview from an explicitly supplied crop pack.
No uploads. The source checkout is never edited. Run from any directory.
"""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--manifest',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
args=p.parse_args()
manifest=json.loads(args.manifest.read_text())
package=Path(__file__).resolve().parents[1]
root=package.parents[1]
output=args.output.resolve()
if output==root or root in output.parents: raise SystemExit('Use a private destination outside the source checkout.')
if output.exists() and any(output.iterdir()): raise SystemExit('Choose a new empty private preview directory.')
output.mkdir(parents=True,exist_ok=True);output.chmod(0o700)
styles={x:{} for x in ('gen4','gen2','skeptic','semiotic')}
assets=output/'assets';assets.mkdir()
for item in manifest['crops']:
 name=item['file'];source=(args.manifest.parent/name).resolve()
 if source.parent!=args.manifest.parent.resolve():raise SystemExit('Crop paths must stay within the manifest folder.')
 if hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:raise SystemExit('Crop hash mismatch: '+name)
 if item['style'] not in styles or item['kind'] not in ('scene','column','keyframes','symbols'):raise SystemExit('Unexpected crop role.')
 shutil.copy2(source,assets/name)
 styles[item['style']][item['kind']]='/assets/'+name
for key,row in styles.items():
 if set(row)!=set(('scene','column','keyframes','symbols')):raise SystemExit('Incomplete style: '+key)
dest=output/'storeybrook/four-styles'
shutil.copytree(package,dest,ignore=shutil.ignore_patterns('.gitignore','scripts','*.test.mjs'))
embed=output/'storeybrook/dist/embed';embed.mkdir(parents=True)
for name in ('storeybrook-tokens.css','storeybrook.js'):shutil.copy2(root/'storeybrook/dist/embed'/name,embed/name)
(dest/'demo-assets.js').write_text('window.FOUR_STYLES_DEMO_ASSETS = '+json.dumps(styles,indent=2)+';\n')
shutil.copy2(args.manifest,output/'manifest.private.json')
(output/'README.txt').write_text('PRIVATE preview. No publication permission is implied.\nServe this directory on loopback and open /storeybrook/four-styles/.\nThe public source package contains no attached image bytes.\n')
print(json.dumps({'directory':str(output),'demo_path':'/storeybrook/four-styles/','verified_crops':len(manifest['crops'])}))
