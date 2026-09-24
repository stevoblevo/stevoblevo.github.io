"""Off-box fixtures, not a claim about any deployed cockpit or browser behavior."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError
from urllib.request import Request

MODULE = Path(__file__).resolve().parents[1] / 'scripts' / 'verify_unified_home.py'
spec = importlib.util.spec_from_file_location('verify_unified_home', MODULE)
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


class UnifiedHomeChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.entries = ('cockpit/index.html', 'peachfall/index.html')
        for name, sibling in (('cockpit', 'peachfall'), ('peachfall', 'cockpit')):
            self.write(name + '/index.html', '<!doctype html><title>Fixture</title>'
                       '<link rel="manifest" href="./manifest.webmanifest">'
                       '<script src="./app.js?v=1"></script>'
                       f'<a href="../{sibling}/#scene">Other scene</a>')
            self.write(name + '/app.js', '// fixture, not a deployed application\n')
            self.write(name + '/sw.js', '// file-presence fixture; not offline proof\n')
            self.write(name + '/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')
            self.manifest(name, {'name': 'Fixture', 'start_url': './#scene', 'scope': './',
                                 'icons': [{'src': './icon.svg', 'sizes': 'any'}]})

    def write(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')

    def manifest(self, name, data):
        self.write(name + '/manifest.webmanifest', json.dumps(data))

    def report(self):
        return v.inspect_source(self.root, self.entries, require_pwa=True)

    def assertBroken(self, text):
        report = self.report()
        self.assertFalse(report['source_ok'])
        self.assertIn(text, '\n'.join(report['errors']))

    def fake_loader(self, url, size, timeout):
        return (self.root / url.split('https://example.com/', 1)[1]).read_bytes()

    def test_valid_source_has_no_implied_live_status(self):
        report = self.report()
        self.assertTrue(report['source_ok'], report['errors'])
        self.assertIsNone(report['live'])
        self.assertEqual(len(report['files']), 10)

    def test_source_hashes_exact_bytes(self):
        self.assertEqual(self.report()['files']['cockpit/app.js'],
                         hashlib.sha256((self.root / 'cockpit/app.js').read_bytes()).hexdigest())

    def test_missing_script(self):
        (self.root / 'peachfall/app.js').unlink()
        self.assertBroken('file missing')

    def test_broken_local_link(self):
        self.write('cockpit/index.html', '<a href="../missing/">Broken</a>')
        self.assertBroken('../missing/')

    def test_missing_manifest(self):
        self.write('peachfall/index.html', '<title>No manifest yet</title>')
        self.assertBroken('expected exactly one local PWA manifest')

    def test_malformed_manifest(self):
        self.write('peachfall/manifest.webmanifest', '{oops')
        self.assertBroken('manifest.webmanifest')

    def test_manifest_array_is_rejected(self):
        self.manifest('peachfall', [])
        self.assertBroken('manifest must be an object')

    def test_manifest_external_scope_is_rejected(self):
        self.manifest('peachfall', {'scope': 'https://other.invalid/', 'icons': [{'src': 'icon.svg'}]})
        self.assertBroken('same-origin')

    def test_manifest_external_start_is_rejected(self):
        self.manifest('peachfall', {'start_url': 'https://other.invalid/', 'icons': [{'src': 'icon.svg'}]})
        self.assertBroken('same-origin')

    def test_start_outside_scope(self):
        self.manifest('peachfall', {'start_url': '../cockpit/', 'scope': './', 'icons': [{'src': 'icon.svg'}]})
        self.assertBroken('outside manifest scope')

    def test_missing_icon(self):
        (self.root / 'peachfall/icon.svg').unlink()
        self.assertBroken('icon.svg')

    def test_empty_icons(self):
        self.manifest('peachfall', {'icons': []})
        self.assertBroken('at least one icon')

    def test_missing_worker(self):
        (self.root / 'peachfall/sw.js').unlink()
        self.assertBroken('./sw.js')

    def test_encoded_traversal_is_rejected(self):
        with self.assertRaises(ValueError):
            v.local_path(self.root, 'cockpit/index.html', '%2e%2e/secret')

    def test_above_root_is_rejected(self):
        with self.assertRaises(ValueError):
            v.local_path(self.root, 'cockpit/index.html', '../../outside')

    def test_symlink_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as outside:
            (Path(outside) / 'secret').write_text('not public')
            (self.root / 'escape').symlink_to(outside, target_is_directory=True)
            with self.assertRaises(ValueError):
                v.local_path(self.root, 'cockpit/index.html', '../escape/secret')

    def test_backslash_is_rejected(self):
        with self.assertRaises(ValueError):
            v.local_path(self.root, 'cockpit/index.html', '..\\secret')

    def test_external_reference_is_reported_not_fetched(self):
        with (self.root / 'cockpit/index.html').open('a') as f:
            f.write('<script src="https://external.invalid/a.js"></script>')
        report = self.report()
        self.assertTrue(report['source_ok'])
        self.assertEqual(len(report['external_references']), 1)

    def test_base_element_fails_explicitly(self):
        self.write('cockpit/index.html', '<base href="https://external.invalid/">')
        self.assertBroken('<base> is unsupported')

    def test_non_string_start_is_rejected(self):
        self.manifest('peachfall', {'start_url': 42, 'icons': [{'src': './icon.svg'}]})
        self.assertBroken('must be strings')

    def test_exact_served_files_match(self):
        report = v.compare_live(self.report(), self.root, 'https://example.com', loader=self.fake_loader)
        self.assertTrue(report['live']['served_bytes_match'])
        self.assertEqual(report['live']['checked'], 10)

    def test_stale_200_response_does_not_pass(self):
        report = v.compare_live(self.report(), self.root, 'https://example.com', loader=lambda *a: b'old shell')
        self.assertFalse(report['live']['served_bytes_match'])
        self.assertEqual(len(report['live']['errors']), 10)

    def test_network_failure_does_not_pass(self):
        def broken(*args):
            raise OSError('network unavailable')
        report = v.compare_live(self.report(), self.root, 'https://example.com', loader=broken)
        self.assertFalse(report['live']['served_bytes_match'])
        self.assertEqual(report['live']['checked'], 0)

    def test_http_error_does_not_pass(self):
        def denied(*args):
            raise HTTPError(args[0], 403, 'Forbidden', {}, None)
        report = v.compare_live(self.report(), self.root, 'https://example.com', loader=denied)
        self.assertFalse(report['live']['served_bytes_match'])

    def test_redirect_handler_never_follows_login(self):
        self.assertIsNone(v.NoRedirect().redirect_request(Request('https://example.com'),
                          None, 302, '', {}, 'https://login.invalid/'))

    def test_source_error_blocks_all_network_requests(self):
        (self.root / 'peachfall/app.js').unlink()
        def unexpected(*args):
            self.fail('network must not be called')
        report = v.compare_live(self.report(), self.root, 'https://example.com', loader=unexpected)
        self.assertFalse(report['live']['served_bytes_match'])

    def test_source_change_after_preflight_is_rejected(self):
        report = self.report()
        self.write('cockpit/app.js', '// changed after hashing\n')
        v.compare_live(report, self.root, 'https://example.com', loader=self.fake_loader)
        self.assertFalse(report['live']['served_bytes_match'])
        self.assertTrue(any('source changed' in e for e in report['live']['errors']))

    def test_invalid_site_targets_are_rejected(self):
        for site in ('http://example.com', 'https://user:secret@example.com',
                     'https://example.com/path', 'https://example.com/?token=secret',
                     'https://example.com/#scene'):
            with self.subTest(site=site), self.assertRaises(ValueError):
                v.compare_live(self.report(), self.root, site, loader=self.fake_loader)

    def test_cli_success_and_failure_exit_codes(self):
        args = ['--root', str(self.root), '--require-pwa']
        for entry in self.entries:
            args += ['--entry', entry]
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(v.main(args), 0)
        self.assertIsNone(json.loads(out.getvalue())['live'])
        (self.root / 'peachfall/sw.js').unlink()
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(v.main(args), 1)

    def test_no_entries_does_not_pass(self):
        self.assertFalse(v.inspect_source(self.root, [])['source_ok'])


if __name__ == '__main__':
    unittest.main()
