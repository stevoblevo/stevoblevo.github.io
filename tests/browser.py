"""Actual Chromium acceptance. pip install playwright; playwright install chromium.
Run against npm run dev using SAELION_BASE_URL (default loopback :4317).
Screenshots and JSON are local test evidence, not live deployment or Saedo receipts.
"""
from pathlib import Path
import os, json, shutil, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get('SAELION_BASE_URL', 'http://127.0.0.1:4317').rstrip('/')
OUT = Path(os.environ.get('SAELION_BROWSER_ARTIFACTS', 'test-results/browser'))
OUT.mkdir(parents=True, exist_ok=True)
results = []
def ok(name):
    results.append({'test':name,'passed':True}); print('PASS',name,flush=True)
with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_EXECUTABLE_PATH') or shutil.which('chromium')
    browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox'])
    ctx = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
    page=ctx.new_page(); errors=[]; page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE+'/'); page.get_by_role('heading',name='Stay you. Come play.').wait_for()
    assert page.locator('body').evaluate('(e)=>e.scrollWidth') <= 1440
    page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True); ok('existing-site front door renders without overflow')
    page.get_by_role('link',name='Come home to Sae').click()
    page.wait_for_function('!!window.__anewgam && !!window.__saeIngress')
    cockpit=page; page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/peachfall/');page.wait_for_function('!!window.__PEACHFALL__')
    original=page.evaluate('window.__PEACHFALL__.getState()')
    page.get_by_role('button',name='PLAY THE DREAM',exact=True).click();page.wait_for_timeout(400)
    played=page.evaluate('window.__PEACHFALL__.getState()')
    assert played != original; ok('original Play action changes actual game state')
    game_before=page.evaluate('localStorage.getItem("peachfall-playable-v1")')
    page.get_by_role('button',name='Hold a thought',exact=True).click()
    source='  [TEST FIXTURE] sae gento 🌱\nkeep this exact strand  '
    page.locator('#sae-thought-input').fill(source)
    page.get_by_role('button',name='Hold in my loom',exact=True).click()
    assert 'Nothing sent' in page.locator('#sae-thought-status').inner_text()
    cockpit.wait_for_function('(text)=>window.__anewgam.getState().threads.some(t=>t.source===text)',arg=source)
    state=cockpit.evaluate('window.__anewgam.getState()')
    assert state['threads'][0]['source']==source and state['threads'][0]['world']=='peachfall'
    assert state['threads'][0]['status']=='held-local';ok('Peachfall exact-source ingress read back in already-open cockpit')
    cockpit.goto(BASE+'/anewgam-for-steven-cockpit/#loom');cockpit.wait_for_function('!!window.__anewgam')
    assert cockpit.evaluate('window.__anewgam.getState().threads[0].source')==source
    assert cockpit.locator('.thread-source').first.text_content()==source;ok('same thread survives cockpit refresh and renders in existing loom')
    page.screenshot(path=str(OUT/'peachfall-thought.png'),full_page=True)
    page.get_by_role('button',name='Back to play',exact=True).click()
    page.wait_for_function('navigator.serviceWorker.controller !== null',timeout=20000)
    page.get_by_role('button',name='Keep this dream',exact=True).click()
    # Chromium may support a native installation event; show the details if not open.
    if not page.locator('#sae-install-dialog').is_visible(): page.evaluate('document.querySelector("#sae-install-dialog").showModal()')
    assert 'Offline game ready' in page.locator('#sae-offline-status').inner_text();ok('offline ready shown only after a successful worker installation')
    page.locator('#sae-install-close').click()
    cockpit.wait_for_function('navigator.serviceWorker.controller !== null', timeout=30000)
    print('COCKPIT OFFLINE', cockpit.locator('#offlineStatus').inner_text(), flush=True)
    ctx.set_offline(True);page.reload();page.wait_for_function('!!window.__PEACHFALL__ && !!window.__saeIngress')
    assert page.locator('#game').is_visible();assert page.locator('#sae-thought').is_visible();ok('Peachfall game engine and companion reload with networking disabled')
    cockpit.reload();cockpit.wait_for_function('!!window.__anewgam');assert cockpit.evaluate('window.__anewgam.getState().threads[0].source')==source;ok('cockpit and shared ingress reload offline with the same thread')
    ctx.set_offline(False)
    page.goto(BASE+'/peachfall/play.html');page.wait_for_function('!!window.__PEACHFALL__')
    page.get_by_role('button',name='Reset save',exact=True).click()
    page.get_by_role('button',name='WATCH THE DREAM',exact=True).click();page.wait_for_timeout(350)
    assert page.evaluate('window.__PEACHFALL__.getState().mode')=='watch';ok('original Watch controller still runs from play.html')
    page.get_by_role('button',name='Hold a thought',exact=True).click()
    oversized='x'*4001
    page.locator('#sae-thought-input').fill(oversized)
    page.get_by_role('button',name='Hold in my loom',exact=True).click()
    assert page.locator('#sae-thought-input').input_value()==oversized
    assert '4,000' in page.locator('#sae-thought-status').inner_text()
    page.get_by_role('button',name='Back to play',exact=True).click();ok('oversized original is retained, not silently truncated by textarea')
    # Failure fixture affects only this disposable test browser; it is not production state.
    page.get_by_role('button',name='Hold a thought',exact=True).click();page.locator('#sae-thought-input').fill('[TEST FIXTURE] keep me after quota failure')
    page.evaluate('() => { Storage.prototype.setItem = function(){throw new DOMException("QuotaExceeded", "QuotaExceededError")}; }')
    page.get_by_role('button',name='Hold in my loom',exact=True).click()
    assert page.locator('#sae-thought-input').input_value()=='[TEST FIXTURE] keep me after quota failure'
    assert 'Quota' in page.locator('#sae-thought-status').inner_text();ok('storage failure keeps input and does not report success')
    ctx.close()
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    page=mobile.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE+'/');assert page.locator('body').evaluate('(e)=>e.scrollWidth')<=390
    page.screenshot(path=str(OUT/'home-mobile.png'),full_page=True);ok('mobile front door fits 390px viewport')
    page.goto(BASE+'/peachfall/');page.wait_for_function('!!window.__PEACHFALL__');page.get_by_role('button',name='PLAY THE DREAM',exact=True).click()
    page.get_by_role('button',name='Hold a thought',exact=True).click();assert page.locator('#sae-thought-input').is_visible()
    page.screenshot(path=str(OUT/'peachfall-mobile.png'),full_page=True);ok('mobile play and thought controls remain reachable')
    assert not errors, errors;ok('no JavaScript page errors in the acceptance flow')
    browser.close()
(OUT/'results.json').write_text(json.dumps({'environment':'local Chromium; synthetic thought and quota fixtures','base':BASE,'results':results,'pageErrors':errors,'notProved':['production deployment','DNS/TLS','Saedo dispatch','cross-device sync','private engine-source build']},indent=2))
print(json.dumps({'passed':len(results),'failed':0}),flush=True)
