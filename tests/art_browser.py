"""Real browser acceptance of the existing gallery plus art-address projection.
ORIGINAL_PATH optionally exercises an exact owner-supplied PNG; it is never uploaded.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

root = Path(os.environ.get('SITE_ROOT', 'dist')).resolve()
out = Path(os.environ.get('ART_TEST_OUT', 'test-results/art-browser'))
out.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:' + str(server.server_port)
identity = 'art-sha256-236a027aba3c842f9a82fbd8021f1e320e297852a7361e06a128b40077a4477a'
uri = 'sae://art/sha256/236a027aba3c842f9a82fbd8021f1e320e297852a7361e06a128b40077a4477a'
checks = []
def ok(text): checks.append(text); print('PASS', text, flush=True)
try:
 with sync_playwright() as p:
    args = {'headless': True}
    if os.environ.get('BROWSER_EXECUTABLE'): args['executable_path'] = os.environ['BROWSER_EXECUTABLE']
    browser = p.chromium.launch(**args)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    external = []
    def restrict(route):
        if route.request.url.startswith(base + '/') or route.request.url.startswith(('data:', 'blob:')): route.continue_()
        else: external.append(route.request.url); route.abort()
    context.route('**/*', restrict)
    page = context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(base+'/anewgam-for-steven-cockpit/#library')
    page.wait_for_function('window.__saeArtReady === true')
    assert page.locator('#art-airport').is_visible()
    assert page.locator('#grid .card').count() > 20
    ok('original gallery remains and contains the additive art arrival')
    page.get_by_label('Art address', exact=True).fill(uri)
    page.get_by_role('button', name='Open art',exact=True).click()
    page.wait_for_function("!document.getElementById('ya-stage').hidden")
    assert page.locator('#ya-title').inner_text() == 'Art Airport · The memory wall'
    page.wait_for_function("document.getElementById('ya-img').complete && document.getElementById('ya-img').naturalWidth===160")
    assert 'not activated' in page.locator('#art-route-info').inner_text()
    ok('native art address opens the exact thumbnail in the existing viewer, without native-handler claim')
    page.reload();page.wait_for_function('window.__saeArtReady === true');assert page.locator('#ya-title').inner_text() == 'Art Airport · The memory wall'
    ok('gallery deep link survives reload without falling back to another picture')
    page.get_by_role('button',name='Follow thread · Protect the Lantern',exact=True).click()
    assert page.locator('#ya-title').inner_text() == 'Protect the Lantern'
    assert page.locator('#art-route-info').is_hidden()
    ok('semantic thread opens an existing related plate, not a duplicate gallery')
    page.get_by_role('button',name='close',exact=True).click()
    page.get_by_label('Art address',exact=True).fill('sae://art/sha256/'+'0'*64)
    page.get_by_role('button',name='Open art',exact=True).click()
    assert 'No matching' in page.locator('#art-airport [role=status]').inner_text()
    assert page.locator('#ya-stage').is_hidden()
    ok('unknown art address is rejected without opening the first plate')
    source=page.evaluate("window.__libraryItems.find(x=>x.art).art.sourceLinks[0].url")
    page.get_by_label('Art address',exact=True).fill(source)
    page.get_by_role('button',name='Open art',exact=True).click()
    assert 'bytes are not verified' in page.locator('#art-airport [role=status]').inner_text()
    ok('Grok source remains associated but is not silently substituted by the upload')
    relay=page.evaluate("SaeArtLinks.routes(window.__libraryItems.find(x=>x.art)).relay")
    page.get_by_label('Art address',exact=True).fill(relay)
    page.get_by_role('button',name='Open art',exact=True).click()
    assert page.locator('#ya-title').inner_text() == 'Art Airport · The memory wall'
    ok('proposed HTTPS route resolves inside the gallery without fetching an inactive relay')
    page.locator('#art-route-info input[type=file]').set_input_files({'name':'wrong.png','mimeType':'image/png','buffer':bytes(4158321)})
    page.wait_for_function("document.querySelector('#art-route-info [role=status]').textContent.includes('mismatch')")
    assert page.locator('#ya-img').evaluate('(im)=>im.naturalWidth')==160
    ok('same-size tampered original rejected; preview preserved')
    original=os.environ.get('ORIGINAL_PATH')
    if original:
      page.locator('#art-route-info input[type=file]').set_input_files(original)
      page.wait_for_function("document.querySelector('#art-route-info').textContent.includes('Exact uploaded original verified')")
      page.wait_for_function("document.getElementById('ya-img').naturalWidth===1568")
      ok('exact 4,158,321-byte uploaded PNG verified by SHA-256 and rendered locally at original resolution')
    page.screenshot(path=str(out/'art-airport-desktop.png'))
    page.get_by_role('button',name='close',exact=True).click()
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.get_by_label('Art address',exact=True).fill(uri)
    page.get_by_role('button',name='Open art',exact=True).click()
    assert page.locator('#art-route-info').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(out/'art-airport-mobile.png'))
    ok('390px mobile address input and art viewer do not overflow horizontally')
    assert not external,external
    assert not errors,errors
    ok('no external network requests or JavaScript page errors during the art test')
    (out/'results.json').write_text(json.dumps({'checks':checks,'passed':len(checks),'page_errors':errors,
      'external_requests':external,'actual_original_tested':bool(original),
      'live_relay_tested':False,'native_os_handler_tested':False,'authenticated_tunnel_tested':False},indent=2)+'\n')
    browser.close()
finally: server.shutdown();server.server_close()
