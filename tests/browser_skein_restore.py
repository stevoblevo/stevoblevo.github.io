"""Real candidate UI + storage tests using labelled synthetic backups; no private data or remote chat."""
from __future__ import annotations
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('SAELION_TEST_BASE', 'http://127.0.0.1:4317').rstrip('/')
KEY = 'anewgam.steven.cockpit.v2'
OUT = ROOT / 'test-results/browser/skein-restore'
OUT.mkdir(parents=True, exist_ok=True)
results, errors = [], []
AT = '2026-09-19T11:00:00.000Z'

def thread(identity, **changes):
    return dict(id=identity, source='fixture ' + identity, heldAt=AT, updatedAt=AT,
                status='held-local', proof='', authorityEffect='none', **changes)

def backup(threads):
    return dict(format='sae.anewgam.skein', version=3, authorityEffect='none', state=dict(threads=threads))

def read(page):
    return page.evaluate('(key) => localStorage.getItem(key)', KEY)

def choose(page, payload):
    content = json.dumps(payload, ensure_ascii=False).encode() if not isinstance(payload, bytes) else payload
    page.locator('#importFile').set_input_files(dict(name='synthetic-backup.json', mimeType='application/json', buffer=content))

def seed(page, threads):
    page.evaluate('([key, value]) => localStorage.setItem(key, JSON.stringify(value))',
                  [KEY, dict(threads=threads, receipts=[], blooms=7, fruit='rose-gold Peach')])
    page.reload(wait_until='networkidle')

with sync_playwright() as p:
    launch = dict(headless=True)
    if os.environ.get('SAELION_CHROMIUM'):
        launch['executable_path'] = os.environ['SAELION_CHROMIUM']
    browser = p.chromium.launch(**launch)
    context = browser.new_context(viewport=dict(width=1280, height=900))
    context.on('page', lambda pg: pg.on('pageerror', lambda error: errors.append(str(error))))
    page = context.new_page()
    try:
        page.goto(BASE+'/anewgam-for-steven-cockpit/', wait_until='networkidle')
        exact = '  Sae . lov\nkeep the peach & these exact words 🍑\t  '
        page.locator('#dropInput').fill(exact)
        page.locator('#dropForm button').click()
        page.locator('#holdBtn').click()
        with page.expect_download() as download:
            page.locator('#exportState').click()
        payload = json.loads(Path(download.value.path()).read_text())
        assert payload['state']['threads'][0]['source'] == exact
        original = payload['state']['threads'][0]
        seed(page, [])  # Simulated empty profile, not a change to an actual user's data.
        choose(page, payload)
        expect(page.locator('#toast')).to_contain_text('Restored 1 thread')
        assert json.loads(read(page))['threads'][0] == original
        page.reload(wait_until='networkidle')
        assert json.loads(read(page))['threads'][0] == original
        results.append('Actual export/file-input restore/reload preserves exact source and provenance')

        before = read(page)
        choose(page, payload)
        expect(page.locator('#toast')).to_contain_text('already here')
        assert read(page) == before
        results.append('Identical replay makes no new thread, receipt or storage write')

        conflict = dict(original, source='conflicting synthetic words')
        choose(page, backup([thread('must-not-partially-import'), conflict]))
        expect(page.locator('#toast')).to_contain_text('conflicts')
        assert read(page) == before
        results.append('Conflicting ID blocks entire restore, including earlier valid input')

        full = [thread('kept-'+str(i)) for i in range(250)]
        seed(page, full)
        draft = '  this unsent draft stays right here  '
        page.locator('#dropInput').fill(draft)
        before = read(page)
        choose(page, backup([thread('overflow')]))
        expect(page.locator('#toast')).to_contain_text('exceed 250')
        assert read(page) == before
        assert page.locator('#dropInput').input_value() == draft
        assert json.loads(read(page))['threads'] == full
        results.append('Full loom keeps all 250 old threads and unsent draft instead of evicting one')

        seed(page, [original])
        before = read(page)
        memory = page.evaluate('JSON.stringify(window.__anewgam.getState())')
        page.evaluate('''(key) => {
          const oldSet = Storage.prototype.setItem;
          Storage.prototype.setItem = function(k, v) {
            if (k === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
            return oldSet.call(this, k, v);
          };
        }''', KEY)
        choose(page, backup([thread('quota-new')]))
        expect(page.locator('#toast')).to_contain_text('Storage refused')
        assert read(page) == before
        assert page.evaluate('JSON.stringify(window.__anewgam.getState())') == memory
        page.reload(wait_until='networkidle')
        assert read(page) == before
        results.append('Injected quota failure changes neither stored bytes nor in-memory state; no success toast')

        invalid = dict(original, id='oversized', source='x'*4001)
        for payload_bad, message in [(backup([invalid]), 'invalid or oversized'),
                                     (dict(backup([]), version=99), 'version 3'),
                                     (b'{broken', 'could not be read')]:
            choose(page, payload_bad)
            expect(page.locator('#toast')).to_contain_text(message)
            assert read(page) == before
        results.append('Oversized words, future version and malformed JSON fail without clipping or writing')

        other = context.new_page()
        other.goto(BASE+'/anewgam-for-steven-cockpit/', wait_until='networkidle')
        other.locator('#dropInput').fill('synthetic words from the other tab')
        other.locator('#dropForm button').click()
        other.locator('#holdBtn').click()
        expect(page.locator('#threadList')).to_contain_text('synthetic words from the other tab')
        choose(page, backup([thread('incoming-after-other-tab')]))
        expect(page.locator('#toast')).to_contain_text('Restored 1 thread')
        expect(other.locator('#threadList')).to_contain_text('fixture incoming-after-other-tab')
        assert len(json.loads(read(page))['threads']) == 3
        other.close()
        results.append('Already-open tabs read back the restored thread; an earlier other-tab save is retained')

        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle')
        context.set_offline(True)
        page.reload(wait_until='load')
        choose(page, backup([thread('offline-peach')]))
        expect(page.locator('#toast')).to_contain_text('Restored 1 thread')
        page.reload(wait_until='load')
        assert any(t['id']=='offline-peach' for t in json.loads(read(page))['threads'])
        results.append('Offline shell restores a local backup and retains it after offline reload')

        # Screen captures are real candidate UI populated only with these synthetic fixtures.
        page.locator('#loom').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/'restore-desktop.png'))
        page.set_viewport_size(dict(width=390,height=844))
        page.locator('#importState').scroll_into_view_if_needed()
        choose(page, backup([dict(original, source='different fixture')]))
        expect(page.locator('#toast')).to_contain_text('conflicts')
        page.screenshot(path=str(OUT/'restore-phone.png'))
        results.append('Phone-width existing import controls remain usable; conflict warning is visible')
        assert not errors, errors
    finally:
        (OUT/'results.json').write_text(json.dumps(dict(passed=results,pageErrors=errors,
            scope='Hosted/local browser candidate tests with synthetic local backups. Not real user data, cross-domain migration, authenticated Talk, Saedo, deployment or independent review.'),indent=2)+'\n')
        context.close()
        browser.close()
print(json.dumps(dict(passed=len(results),pageErrors=errors)))
