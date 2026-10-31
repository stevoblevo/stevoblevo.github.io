#!/usr/bin/env python3
"""Synthetic recognition against the real built AND SO, using a throwaway headless Chromium profile.
No live microphone, speech provider, credentials, or network. Run build.py first.
"""
import argparse, json, subprocess, tempfile
from pathlib import Path
TESTS = Path(__file__).resolve().parent
PAGE = (TESTS.parent / 'dist/and-so.html').read_text()
parser = argparse.ArgumentParser()
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
results = []
with tempfile.TemporaryDirectory(prefix='andso-commands-') as tmp:
    root = Path(tmp)
    # Suppress remote font/image loads; commands are mocked before app initialization.
    fixture = PAGE.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; media-src blob:">', 1)
    fixture = fixture.replace('<script id="sb-js">', '<script>' + (TESTS / 'browser-fixture.js').read_text() + '</script><script id="sb-js">', 1)
    before, after = fixture.rsplit('</body>', 1)
    fixture = before + '<script>' + (TESTS / 'browser-commands.js').read_text() + '</script></body>' + after
    file = root / 'fixture.html'; file.write_text(fixture)
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
        for name, width, height in [('desktop', 1366, 900), ('phone', 390, 844)]:
            subprocess.run(['node', str(TESTS / 'chromium-runner.cjs'), file.as_uri() + '?debug&visual', str(width), str(height),
                str((args.screenshots / (name + '.png')).resolve())], check=True, timeout=40)
        raise SystemExit(0)
    for case, width, height in [('desktop', 1366, 900), ('mobile', 390, 844), ('unsupported', 1024, 768)]:
        run = subprocess.run(['node', str(TESTS / 'chromium-runner.cjs'), file.as_uri() + '?debug&' + case,
            str(width), str(height)], capture_output=True, text=True, timeout=40)
        if run.returncode:
            raise RuntimeError(f'{case}: Chromium runner exit {run.returncode}. {run.stderr[-1800:]}')
        result = json.loads(run.stdout); result['case'] = case; results.append(result)
        print(json.dumps(result, ensure_ascii=False))
assert all(r['ok'] for r in results), 'Browser command checks failed'
