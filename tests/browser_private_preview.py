"""Real browser checks for `npm run dev -- --peachfall` after its selected build.
Requires an explicitly supplied loopback preview URL. Uses synthetic local saves;
never targets a public release, changes a real account, or claims device proof.
"""
import json, os, traceback
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('SAELION_PREVIEW_URL', '')
parsed = urlparse(BASE)
if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password:
    raise SystemExit('Set SAELION_PREVIEW_URL to the loopback development home, not a public service.')
OUT = Path(os.environ.get('SAELION_PREVIEW_EVIDENCE', 'test-results/private-preview'))
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, failures = [], [], []
def ok(name):
    checks.append(name)
    print('PASS', name, flush=True)
def button(frame, name): return frame.get_by_role('button', name=name, exact=True)
def game(page):
    page.wait_for_selector('iframe[title="Peachfall selected game"]')
    f = page.frame_locator('iframe[title="Peachfall selected game"]')
    expect(button(f, 'Accessibility & controls')).to_be_visible(timeout=20000)
    # Menu DOM renders before the async art/loop is ready, especially on return.
    # Wait for the existing read-only QA handle instead of throwing in a predicate.
    frame_obj(page).wait_for_function('Boolean(window.__peachfall?.getState)', timeout=30000)
    return f
def frame_obj(page): return page.locator('iframe').element_handle().content_frame()
def enter(page):
    f = game(page)
    button(f, 'Enter the dream').click()
    button(f, 'Play the Dream').click()
    for _ in range(5): button(f, 'Continue').click()
    frame_obj(page).wait_for_function("window.__peachfall?.getState().scene === 'field'")
    return f

def run():
    passed = False
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.getenv('SAELION_CHROMIUM_EXECUTABLE'))
        ctx = browser.new_context(viewport={'width':1280,'height':850})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('requestfailed', lambda r: failures.append({'url':r.url,'error':r.failure}))
        try:
            page.goto(BASE)
            page.get_by_role('link',name='Enter the existing Peachfall dream',exact=True).click()
            assert '?preview=' in page.url
            f = enter(page)
            assert page.url.startswith(BASE.rstrip('/')+'/peachfall/')
            assert frame_obj(page).evaluate('location.origin') == page.evaluate('location.origin')
            ok('same home opens the selected real game at /peachfall/ with the same save origin')
            page.screenshot(path=str(OUT/'unified-desktop-meadow.png'))
            button(f,'Meet the meadow gate').click()
            button(f,'Leave a peach here').click()
            page.wait_for_timeout(1000)
            expect(f.locator('[data-gate-phase=offered]')).to_be_visible()
            assert frame_obj(page).evaluate('window.__peachfall.getState().gateMemory.peachLeft')
            ok('real Play/Continue and leave-peach inputs change the selected game, not a debug scene')
            page.get_by_role('link',name='My loom',exact=True).click()
            page.locator('#dropInput').fill('  a preview thread\nkeep my exact words  ')
            page.locator('#dropForm button').click()
            page.locator('#holdBtn').click()
            source = page.evaluate("window.__anewgam.getState().threads[0].source")
            assert source == '  a preview thread\nkeep my exact words  '
            ok('existing cockpit accepts an exact-word thread after leaving the selected game')
            page.locator('a[data-door="peachfall"]').click()
            assert '?preview=' in page.url
            f = game(page); button(f,'Continue').click()
            frame_obj(page).wait_for_function("window.__peachfall?.getState().scene === 'field'")
            button(f,'Meet the meadow gate').click()
            expect(f.get_by_role('dialog',name='The meadow gate',exact=True).get_by_text('Welcome back. The peach you left is still here.',exact=True)).to_be_visible()
            page.screenshot(path=str(OUT/'unified-desktop-return.png'))
            ok('cockpit doorway returns to selected game with the peach and greeting intact')
            page.reload(); f = game(page); button(f,'Continue').click()
            frame_obj(page).wait_for_function("window.__peachfall?.getState().scene === 'field'")
            button(f,'Meet the meadow gate').click()
            expect(f.locator('[data-gate-phase=return]')).to_be_visible()
            assert page.evaluate("JSON.parse(localStorage.getItem('anewgam.steven.cockpit.v2')).threads[0].source") == source
            ok('full-page reload preserves game choice and the same local Thread Loom')
            mobile = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            m = mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
            m.goto(BASE);m.get_by_role('link',name='Enter the existing Peachfall dream',exact=True).click()
            mf = enter(m)
            button(mf,'Accessibility & controls').click()
            mf.get_by_role('checkbox',name='Assisted play').check()
            button(mf,'Close accessibility & controls').click()
            for name in ['Sae · home','My loom']:
                box=m.get_by_role('link',name=name,exact=True).bounding_box()
                assert box and box['height']>=44
            assert m.evaluate('document.documentElement.scrollWidth <= innerWidth')
            m.screenshot(path=str(OUT/'unified-phone-meadow.png'))
            button(mf,'Meet the meadow gate').click();button(mf,'Leave a peach here').click();m.wait_for_timeout(1000)
            m.screenshot(path=str(OUT/'unified-phone-gate.png'))
            button(mf,'Back to the meadow').click()
            ok('390px touch viewport keeps home/loom operable and the real gate choice/back usable')
            mobile.close()
            for route in ['/.worktrees/peachfall/live-slice/src/standalone.tsx','/peachfall/sw.js','/assets/missing.js']:
                assert ctx.request.get(BASE.rstrip('/')+route).status in (403,404)
            ok('private source, missing assets and historical game SW are not exposed by preview server')
            assert not errors,errors
            assert not failures,failures
            ok('zero JavaScript page errors or failed network requests in the exercised path')
            passed = True
        except Exception:
            (OUT/'failure.txt').write_text(traceback.format_exc())
            page.screenshot(path=str(OUT/'failure.png'))
            raise
        finally:
            (OUT/'results.json').write_text(json.dumps({'passed':passed,'checks':checks,'pageErrors':errors,'requestFailures':failures,'method':'Actual Chromium + same-origin iframe game; synthetic browser profiles and desktop/touch viewports, not a physical-device or fresh private npm-build claim.'},indent=2))
            ctx.close();browser.close()
if __name__ == '__main__': run()
