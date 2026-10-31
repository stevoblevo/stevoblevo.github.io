#!/usr/bin/env python3
"""Real sandboxed mirror regression with synthetic speech and denied microphone prompts."""
import argparse, functools, http.server, json, subprocess, tempfile, threading
from pathlib import Path
TESTS = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--page', type=Path, default=TESTS.parent / 'dist/and-so.html')
args = parser.parse_args()
page = args.page.read_text()
mocks = (TESTS / 'browser-fixture.js').read_text().replace('localStorage.clear();', 'try { localStorage.clear(); } catch (_) {}')
mocks = mocks.replace("Object.defineProperty(navigator.mediaDevices,", "if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {} });\nObject.defineProperty(navigator.mediaDevices,")
# Keep mock adapters inside captured sb-js so the actual mirror copies inherit them.
mocks += '\n' + (TESTS / 'mirror-fixture.js').read_text()
page = page.replace('<script id="sb-js">', '<script id="sb-js">\n' + mocks, 1)
# Test-only enablement of the existing debug window inside opaque srcdoc frames (no query string).
page = page.replace("if (/[?&]debug\\b/.test(location.search)) window.__andso", "if (window.qa) window.__andso")
page = page.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; frame-src \'self\' about:; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; media-src blob:">', 1)
before, after = page.rsplit('</body>', 1)
page = before + '<script>' + (TESTS / 'browser-mirrors.js').read_text() + '</script></body>' + after
with tempfile.TemporaryDirectory(prefix='andso-mirror-') as tmp:
    file = Path(tmp) / 'mirror.html'; file.write_text(page)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=tmp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        url = f'http://127.0.0.1:{server.server_port}/mirror.html?debug'
        run = subprocess.run(['node', str(TESTS / 'chromium-runner.cjs'), url, '1366', '900'], capture_output=True, text=True, timeout=40)
    finally:
        server.shutdown(); server.server_close()
    if run.returncode: raise RuntimeError(run.stderr)
    result = json.loads(run.stdout); print(json.dumps(result))
    assert result['ok'], 'Mirror full-output mute regression failed'
