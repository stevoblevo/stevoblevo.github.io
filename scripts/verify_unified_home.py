#!/usr/bin/env python3
"""Check declared public shell files; optionally compare served bytes to this checkout.

No deployment, credentials, browser storage, JavaScript execution, or host operations.
A source PASS is NOT a live, installed, offline, authenticated, or end-to-end PASS.
Run: python3 scripts/verify_unified_home.py --root . --require-pwa
Live: add --site https://example.com (repository deployed at that origin's root).
Only HTML-declared files, local links, manifests/icons/start pages, and the conventional
sibling sw.js are checked. CSS/JS dynamic dependencies and worker behavior need browser tests.
"""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ORIGIN = 'https://source.invalid'
ENTRIES = ('anewgam-for-steven-cockpit/index.html', 'peachfall/index.html')


class References(HTMLParser):
    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.files, self.links, self.manifests = [], [], []
        self.has_base = False
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'base':
            self.has_base = True
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag in ('script', 'img', 'source', 'video', 'audio', 'iframe') and a.get('src'):
            self.files.append(a['src'])
        if tag == 'video' and a.get('poster'):
            self.files.append(a['poster'])
        rel = set((a.get('rel') or '').lower().split())
        if tag == 'link' and a.get('href'):
            if 'manifest' in rel:
                self.manifests.append(a['href'])
            elif rel & {'stylesheet', 'icon', 'apple-touch-icon', 'preload', 'modulepreload'}:
                self.files.append(a['href'])


def local_path(root: Path, parent: str, reference: str) -> Path | None:
    """Resolve like a URL; never read outside root or through an escaping symlink."""
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError('empty or non-string reference')
    decoded = unquote(reference)
    if '\\' in decoded or any(ord(c) < 32 for c in decoded):
        raise ValueError('unsafe URL characters')
    # Reject literal/encoded traversal rather than silently checking a different resource.
    path_part = urlsplit(decoded).path
    if any(part == '..' for part in path_part.split('/')):
        # Ordinary ../ sibling navigation is allowed, but must stay inside the root.
        depth = len(Path(parent).parent.parts)
        if path_part.startswith('/'):
            depth = 0
        for part in path_part.split('/'):
            if part == '..':
                depth -= 1
                if depth < 0:
                    raise ValueError('reference escapes repository root')
            elif part not in ('', '.'):
                depth += 1
        if unquote(reference) != reference and '..' in path_part.split('/'):
            raise ValueError('encoded traversal')
    url = urlsplit(urljoin(ORIGIN + '/' + parent, reference))
    if url.scheme != 'https' or url.netloc != 'source.invalid':
        return None
    path = root / unquote(url.path).lstrip('/')
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError('reference escapes repository root')
    if path.is_dir() or url.path.endswith('/'):
        path = path / 'index.html'
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('reference escapes repository root')
    return path


def inspect_source(root: Path, entries=ENTRIES, require_pwa=False) -> dict:
    root = root.resolve()
    report = {'schema': 'unified-home-check-v1', 'source_ok': False,
              'checkout_head': None, 'files': {}, 'errors': [], 'external_references': [],
              'live': None, 'limits': 'Declared shell bytes only; no JS/CSS dependency graph, '
              'rendering, installation, offline behavior, bridge, auth, or outcome proof.'}
    try:
        top = subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--show-toplevel'],
                                      stderr=subprocess.DEVNULL, text=True).strip()
        if Path(top).resolve() == root:
            report['checkout_head'] = subprocess.check_output(
                ['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        pass

    def add(parent, ref, required=False):
        try:
            path = local_path(root, parent, ref)
            if path is None:
                if required:
                    raise ValueError('must be same-origin')
                report['external_references'].append({'page': parent, 'reference': ref})
                return None
            if not path.is_file():
                raise ValueError('file missing')
            name = path.relative_to(root).as_posix()
            report['files'][name] = hashlib.sha256(path.read_bytes()).hexdigest()
            return path
        except (OSError, ValueError) as exc:
            report['errors'].append(f'{parent}: {ref!r}: {exc}')
            return None

    if not entries:
        report['errors'].append('at least one entry is required')
    for entry in entries:
        page = add('index.html', '/' + entry, required=True)
        if page is None:
            continue
        try:
            parsed = References(page.read_text(encoding='utf-8'))
            if parsed.has_base:
                raise ValueError('<base> is unsupported; cannot verify its URL semantics')
        except (OSError, UnicodeError, ValueError) as exc:
            report['errors'].append(f'{entry}: {exc}')
            continue
        for ref in parsed.files + parsed.links:
            if ref.startswith('#') or ref.partition(':')[0].lower() in ('data', 'mailto', 'tel'):
                continue
            add(entry, ref)
        if require_pwa:
            if len(parsed.manifests) != 1:
                report['errors'].append(f'{entry}: expected exactly one local PWA manifest')
            add(entry, './sw.js', required=True)
        for ref in parsed.manifests:
            manifest_path = add(entry, ref, required=True)
            if manifest_path is None:
                continue
            name = manifest_path.relative_to(root).as_posix()
            try:
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
                if not isinstance(manifest, dict):
                    raise ValueError('manifest must be an object')
                start = manifest.get('start_url', './')
                scope = manifest.get('scope', './')
                if not isinstance(start, str) or not isinstance(scope, str):
                    raise ValueError('start_url and scope must be strings')
                start_url = urlsplit(urljoin(ORIGIN + '/' + name, start))
                scope_url = urlsplit(urljoin(ORIGIN + '/' + name, scope))
                if any(u.scheme != 'https' or u.netloc != 'source.invalid'
                       for u in (start_url, scope_url)):
                    raise ValueError('start_url and scope must be same-origin')
                if not start_url.path.startswith(scope_url.path):
                    raise ValueError('start_url is outside manifest scope')
                add(name, start, required=True)
                icons = manifest.get('icons', [])
                if not isinstance(icons, list) or not icons:
                    raise ValueError('manifest needs at least one icon')
                for icon in icons:
                    if not isinstance(icon, dict) or not icon.get('src'):
                        raise ValueError('icon needs src')
                    add(name, icon['src'], required=True)
            except (OSError, UnicodeError, ValueError, TypeError) as exc:
                report['errors'].append(f'{name}: {exc}')
    report['files'] = dict(sorted(report['files'].items()))
    report['source_ok'] = not report['errors']
    return report


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_bytes(url: str, expected_size: int, timeout: float) -> bytes:
    request = Request(url, headers={'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity'})
    with build_opener(NoRedirect).open(request, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError(f'HTTP {response.status}')
        return response.read(expected_size + 1)


def compare_live(report: dict, root: Path, site: str, timeout=8, loader=fetch_bytes) -> dict:
    url = urlsplit(site)
    if (url.scheme != 'https' or not url.hostname or url.username or url.password
            or url.path not in ('', '/') or url.query or url.fragment):
        raise ValueError('--site must be an HTTPS origin, without credentials/path/query/fragment')
    result = {'site': site.rstrip('/'), 'checked': 0, 'served_bytes_match': False, 'errors': []}
    if not report['source_ok']:
        result['errors'].append('Source preflight failed; live comparison not attempted.')
    else:
        for name, expected_hash in report['files'].items():
            try:
                path = local_path(root.resolve(), 'index.html', '/' + name)
                if path is None or hashlib.sha256(path.read_bytes()).hexdigest() != expected_hash:
                    raise ValueError('source changed after preflight')
                data = loader(result['site'] + '/' + quote(name, safe='/'), path.stat().st_size, timeout)
                result['checked'] += 1
                if hashlib.sha256(data).hexdigest() != expected_hash:
                    raise ValueError('served bytes do not match checked source')
            except (OSError, ValueError) as exc:
                result['errors'].append(f'{name}: {type(exc).__name__}: {exc}')
        result['served_bytes_match'] = not result['errors'] and result['checked'] > 0
    report['live'] = result
    return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--entry', action='append', help='HTML entry path, repeatable')
    parser.add_argument('--require-pwa', action='store_true')
    parser.add_argument('--site', help='explicit HTTPS origin to compare; no request without this')
    parser.add_argument('--timeout', type=float, default=8)
    args = parser.parse_args(argv)
    if not args.root.is_dir() or args.timeout <= 0:
        parser.error('root must exist and timeout must be positive')
    report = inspect_source(args.root, args.entry or ENTRIES, args.require_pwa)
    if args.site:
        try:
            compare_live(report, args.root, args.site, args.timeout)
        except ValueError as exc:
            parser.error(str(exc))
    print(json.dumps(report, indent=2))
    return 0 if report['source_ok'] and (report['live'] is None or report['live']['served_bytes_match']) else 1


if __name__ == '__main__':
    sys.exit(main())
