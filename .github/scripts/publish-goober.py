#!/usr/bin/env python3
"""Install only the owner-requested static Goober subtree from a pinned artifact."""
from pathlib import Path, PurePosixPath
import hashlib, io, json, shutil, stat, tempfile, urllib.request, zipfile

root = Path.cwd()
release = json.loads((root / 'goober-release.json').read_text())
url = release['archive_url']
if not url.startswith('https://d2ol7oe51mr4n9.cloudfront.net/user_3IqvSDNTF5Df9TPdkEhMgmcixLc/'):
    raise SystemExit('Unexpected artifact origin')
with urllib.request.urlopen(url, timeout=60) as response:
    data = response.read(25_000_001)
if len(data) > 25_000_000 or hashlib.sha256(data).hexdigest() != release['archive_sha256']:
    raise SystemExit('Artifact size or SHA256 mismatch')
with tempfile.TemporaryDirectory(prefix='goober-verified-') as temp:
    stage = Path(temp)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist()) > 150 or sum(i.file_size for i in archive.infolist()) > 40_000_000:
            raise SystemExit('Unexpected archive size')
        for item in archive.infolist():
            path = PurePosixPath(item.filename)
            if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'goober':
                raise SystemExit('Archive path is outside the Goober subtree')
            if stat.S_ISLNK(item.external_attr >> 16):
                raise SystemExit('Symlinks are not accepted')
            dest = stage.joinpath(*path.parts)
            if item.is_dir():
                dest.mkdir(parents=True, exist_ok=True)
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(archive.read(item))
    manifest = json.loads((stage / 'goober/receipts/static-file-hashes.json').read_text())
    for relative, expected in manifest.items():
        path = PurePosixPath(relative)
        if path.is_absolute() or '..' in path.parts or path.parts[0] != 'goober':
            raise SystemExit('Unsafe manifest path')
        if hashlib.sha256(stage.joinpath(*path.parts).read_bytes()).hexdigest() != expected:
            raise SystemExit('Static file mismatch: ' + relative)
    target = root / 'goober'
    if target.exists():
        if target.is_symlink() or not (target / 'receipts/public-delivery.json').is_file():
            raise SystemExit('Refusing to overwrite an unrecognized existing Goober directory')
        shutil.rmtree(target)
    shutil.copytree(stage / 'goober', target)
print('Verified and installed', len(manifest), 'files under goober/ only')
