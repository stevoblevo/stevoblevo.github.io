"""Actual browser link/draft tests; the remote response is an explicit fixture, NOT chat proof."""
from __future__ import annotations
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('SAELION_TEST_BASE', 'http://127.0.0.1:4317').rstrip('/')
TALK = json.loads((ROOT / 'saelion.workspace.json').read_text())['externalDoors']['talk']['url']
OUT = ROOT / 'test-results/browser/talk-door'
OUT.mkdir(parents=True, exist_ok=True)
results = []
errors = []

def passed(name: str) -> None:
    results.append(name)

def fixture(route) -> None:
    """Fulfil locally: never send fixtures, text or credentials to the user's private site."""
    if route.request.url != TALK or route.request.method != 'GET':
        route.abort()
        raise AssertionError('Unexpected private-site request')
    assert not route.request.post_data
    assert not route.request.all_headers().get('referer')
    route.fulfill(status=200, content_type='text/html', body='<title>Navigation fixture</title><p>LOCAL TEST FIXTURE — not the private Talk application.</p>')

with sync_playwright() as p:
    launch = {'headless': True}
    if os.environ.get('SAELION_CHROMIUM'):
        launch['executable_path'] = os.environ['SAELION_CHROMIUM']
    browser = p.chromium.launch(**launch)
    context = browser.new_context(viewport={'width':1280,'height':900})
    context.route('https://anewgam-steven-cockpit.stevoblevo.chatgpt.site/**', fixture)
    remote = []
    context.on('request', lambda r: remote.append(r.url) if r.url.startswith(TALK.split('/talk')[0]) else None)
    context.on('page', lambda page: page.on('pageerror', lambda err: errors.append(str(err))))
    page = context.new_page()
    try:
        page.goto(BASE+'/', wait_until='networkidle')
        assert not remote, 'No private-site prefetch before the owner clicks'
        expect(page.locator('[data-sae-talk]')).to_have_attribute('href', TALK)
        with page.expect_popup() as popup:
            page.locator('[data-sae-talk]').click()
        child = popup.value
        child.wait_for_load_state()
        expect(child).to_have_title('Navigation fixture')
        assert child.evaluate('window.opener === null')
        assert page.url == BASE+'/'
        child.close()
        passed('Home opens the exact selected URL in an isolated tab with no referrer (fixture)')

        page.goto(BASE+'/anewgam-for-steven-cockpit/', wait_until='networkidle')
        saved = '  Sae . lov\nkeep this peach & these exact words 🍑  '
        draft = '  an unsent thought stays here\nnot a message to the private site  '
        page.locator('#dropInput').fill(saved)
        page.locator('#dropForm button').click()
        page.locator('#holdBtn').click()
        page.locator('#dropInput').fill(draft)
        state = page.evaluate("localStorage.getItem('anewgam.steven.cockpit.v2')")
        assert json.loads(state)['threads'][0]['source'] == saved
        with page.expect_popup() as popup:
            page.locator('[data-sae-talk]').click()
        child = popup.value
        child.wait_for_load_state()
        assert child.url == TALK and child.evaluate('window.opener === null')
        child.close()
        assert page.locator('#dropInput').input_value() == draft
        assert page.evaluate("localStorage.getItem('anewgam.steven.cockpit.v2')") == state
        passed('Cockpit handoff leaves the exact saved thread and unsent textarea unchanged')

        page.evaluate('navigator.serviceWorker.ready')
        page.reload(wait_until='networkidle')
        assert page.evaluate("JSON.parse(localStorage.getItem('anewgam.steven.cockpit.v2')).threads[0].source") == saved
        context.set_offline(True)
        page.reload(wait_until='load')
        expect(page.locator('[data-sae-talk]')).to_have_attribute('href', TALK)
        expect(page.locator('#talk-door-note')).to_contain_text('requires a network connection')
        assert page.evaluate("JSON.parse(localStorage.getItem('anewgam.steven.cockpit.v2')).threads[0].source") == saved
        passed('Offline cockpit retains the link, network warning and saved thread; no offline Talk claimed')
        context.set_offline(False)
        page.set_viewport_size({'width':390,'height':844})
        page.locator('[data-sae-talk]').scroll_into_view_if_needed()
        bounds = page.locator('[data-sae-talk]').bounding_box()
        assert bounds and bounds['height'] >= 44 and bounds['x'] >= 0 and bounds['x']+bounds['width'] <= 390
        page.screenshot(path=str(OUT/'cockpit-talk-mobile.png'))
        passed('Private Talk is visible and touch-sized at a 390px mobile viewport')

        nojs = browser.new_context(java_script_enabled=False, viewport={'width':390,'height':844})
        nojs.route('https://anewgam-steven-cockpit.stevoblevo.chatgpt.site/**', fixture)
        plain = nojs.new_page()
        for route in ['/']:
            plain.goto(BASE+route, wait_until='load')
            expect(plain.locator('[data-sae-talk]')).to_be_visible()
            with plain.expect_popup() as popup:
                plain.locator('[data-sae-talk]').click()
            child = popup.value
            child.wait_for_load_state()
            expect(child).to_have_title('Navigation fixture')
            child.close()
        nojs.close()
        passed('The home Talk link works without client JavaScript (navigation fixture)')
        assert remote == [TALK,TALK]
        assert not errors, errors
    finally:
        (OUT/'results.json').write_text(json.dumps({'passed':results,'pageErrors':errors,'scope':'Candidate browser navigation and local-draft tests. Remote response is a labelled intercepted fixture; NOT authenticated Talk, chat, worker, deployment or cross-origin continuity proof.'},indent=2)+'\n')
        context.close()
        browser.close()
print(json.dumps({'passed':len(results),'pageErrors':errors}))
