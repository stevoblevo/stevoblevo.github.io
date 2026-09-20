"""Real browser run-throughs of the integrated games. No mocked game outcomes.
Use SAELION_BASE_URL and optionally SAELION_CHROMIUM for an installed browser.
The browser clock accelerates actual requestAnimationFrame/timer execution.
"""
from pathlib import Path
import os, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SAELION_BASE_URL', 'http://127.0.0.1:4317').rstrip('/')
OUT = Path('test-results/browser/worlds'); OUT.mkdir(parents=True, exist_ok=True)
results, errors = [], []
def ok(name):
    results.append({'test': name, 'passed': True}); print('PASS', name, flush=True)

with sync_playwright() as p:
    kwargs = {'headless':True}
    if os.environ.get('SAELION_CHROMIUM'): kwargs['executable_path'] = os.environ['SAELION_CHROMIUM']
    browser = p.chromium.launch(**kwargs)
    context = browser.new_context(viewport={'width':1440,'height':960}, reduced_motion='reduce', service_workers='block')
    page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    # Install before any application schedules timers/animation frames. Installing
    # midway through a document leaves native callbacks outside the test clock.
    page.clock.install()
    try:
        page.goto(BASE+'/anewgam-for-steven-cockpit/')
        page.locator('#sae-worlds-open').click()
        assert page.locator('#sae-world-dialog').is_visible()
        assert page.locator('#sae-world-dialog').get_by_text('#everfallen',exact=True).is_visible()
        page.locator('#sae-world-dialog li').filter(has_text='The Nougat Thread').get_by_role('link',name='Play',exact=True).click()
        page.wait_for_function('() => !!window.game && !!window.__saeJourney')
        page.locator('[data-action="light"]').click()
        before = page.evaluate('game.getEvents()')
        page.locator('#sae-worlds-open').click()
        page.locator('#sae-world-dialog li').filter(has_text='The Nougat Thread').get_by_role('link',name='Watch',exact=True).click()
        page.clock.run_for(4000)
        assert page.evaluate('game.getEvents().length') == 2
        page.locator('#sae-pause').click(); paused = page.evaluate('game.getEvents()'); page.clock.run_for(4000)
        assert page.evaluate('game.getEvents()') == paused
        page.locator('#sae-stop').click()
        assert page.evaluate('game.getEvents()') == before
        ok('Same-world Watch keeps unsaved choices; Pause freezes; Stop restores the prior scene')
        page.locator('#sae-watch').click(); page.clock.run_for(4000); page.locator('#sae-takeover').click()
        taken = page.evaluate('game.getEvents()'); page.clock.run_for(4000)
        assert page.evaluate('game.getEvents()') == taken
        page.locator('[data-action="handoff"]').click()
        assert page.evaluate('game.getState().role') == 'knight'
        ok('Take over retains the current moment and accepts the next player choice')
        page.locator('#sae-watch').click(); page.clock.run_for(13000)
        assert page.evaluate('game.getState().ended && game.getState().gift')
        assert page.evaluate('localStorage.getItem("anewgam.nougat.v1")') is None
        page.screenshot(path=str(OUT/'nougat-ended.png'), full_page=True)
        page.locator('#sae-stop').click()
        page.get_by_role('link', name='Back to my path').click()
        assert '/anewgam-for-steven-cockpit/' in page.url
        ok('Nougat completes its actual ending, leaves the kept save alone and returns to cockpit')

        page.goto(BASE+'/peachfall/play.html'); page.wait_for_function('() => !!window.__PEACHFALL__ && !document.querySelector("#sae-watch").hidden')
        original = page.evaluate('structuredClone(__PEACHFALL__.getState())')
        saved = page.evaluate('localStorage.getItem("peachfall-playable-v1")')
        page.locator('#sae-watch').click(); page.clock.run_for(9000)
        assert page.evaluate('__PEACHFALL__.getState().scene') not in ('title', 'tower')
        page.locator('#sae-takeover').click()
        assert page.evaluate('__PEACHFALL__.getState().mode') == 'play'
        ok('Peachfall Watch drives the preserved engine and Take over keeps its current scene')
        prior_watch = page.evaluate('structuredClone(__PEACHFALL__.getState())')
        page.locator('#sae-watch').click()
        # Exercise the real rendered animation/controller, not a claimed prerecorded video.
        for _ in range(16):
            page.clock.run_for(30000)
            if page.evaluate('__PEACHFALL__.getState().ending') == 'to_be_continued': break
        assert page.evaluate('__PEACHFALL__.getState().ending') == 'to_be_continued', page.evaluate('__PEACHFALL__.getState()')
        assert page.evaluate('Object.values(__PEACHFALL__.getState().gifts).every(Boolean)')
        assert page.evaluate('localStorage.getItem("peachfall-playable-v1")') == saved
        page.locator('#btn-mute').click()
        page.locator('#volume').fill('0.2')
        preferences_saved = page.evaluate('JSON.parse(localStorage.getItem("peachfall-playable-v1"))')
        assert preferences_saved['mode'] == 'play'
        assert preferences_saved['scene'] == prior_watch['scene']
        assert preferences_saved['gifts'] == prior_watch['gifts']
        assert preferences_saved['volume'] == 0.2
        assert page.evaluate('__PEACHFALL__.getState().ending') == 'to_be_continued'
        ok('Native sound controls save only the earlier player scene while Watch continues')
        page.screenshot(path=str(OUT/'peachfall-ended.png'), full_page=True)
        page.locator('#sae-stop').click()
        ok('Peachfall rendered Watch reaches the ending with all gifts and leaves the stored save unchanged')

        page.goto(BASE+'/peachfall/'); page.wait_for_function('() => !!window.__saeJourney')
        page.locator('#sae-worlds-open').focus(); page.keyboard.press('Enter')
        assert page.locator('#sae-world-dialog').is_visible()
        page.locator('#sae-world-dialog li').filter(has_text='Signal Run').get_by_role('link',name='Play',exact=True).click()
        page.wait_for_function('() => !!window.__SIGNAL_RUN__')
        assert page.get_by_role('link', name='Back to my path').get_attribute('href') == '/peachfall/'
        ok('Peachfall keyboard navigation works; its existing root route is retained as the return path')
        before = page.evaluate('__SIGNAL_RUN__.getState()')
        page.locator('#sae-watch').click(); page.clock.run_for(5000)
        assert page.evaluate('__SIGNAL_RUN__.getState().elapsed') > 4
        page.locator('#sae-pause').click(); paused = page.evaluate('__SIGNAL_RUN__.getState()'); page.clock.run_for(5000)
        assert page.evaluate('__SIGNAL_RUN__.getState()') == paused
        page.locator('#sae-stop').click(); assert page.evaluate('__SIGNAL_RUN__.getState()') == before
        page.locator('#sae-watch').click(); page.clock.run_for(47000)
        state = page.evaluate('__SIGNAL_RUN__.getState()')
        assert not state['running'] and state['score'] > 0, state
        assert page.evaluate('localStorage.getItem("anewgam-signal-run-ghost-v1")') is None
        assert 'unchanged' in page.locator('#status').inner_text()
        page.screenshot(path=str(OUT/'signal-run-ended.png'), full_page=True)
        ok('Signal Run follows the real physics to a scored finish; pause/restore work; demo does not write player results')
        page.locator('#sae-stop').click(); page.locator('#sae-watch').click(); page.clock.run_for(1500)
        page.keyboard.press('ArrowRight')
        assert page.evaluate('__saeJourney.getMode()') == 'idle'
        assert not page.evaluate('__SIGNAL_RUN__.getState().autopilot')
        ok('Real player input interrupts Signal Run autoplay')

        for url in ['/anewgam-for-steven-cockpit/','/peachfall/play.html','/goober/run/','/anewgam-for-steven-cockpit/chapters/nougat/preview.html']:
            page.set_viewport_size({'width':390,'height':844}); page.goto(BASE+url)
            page.locator('#sae-worlds-open').click()
            assert page.locator('#sae-world-dialog').is_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#sae-world-dialog').get_by_role('button',name='Back',exact=True).click()
        page.screenshot(path=str(OUT/'phone.png'), full_page=True)
        ok('Cockpit and all three game entrances keep the shared paths usable at phone width')
        assert not errors, errors
        ok('No uncaught page errors during the exercised journeys')
    finally:
        (OUT/'results.json').write_text(json.dumps({'results':results,'pageErrors':errors,'scope':'Candidate Chromium execution; real game mechanics with accelerated browser clock. Not production, physical device, private/external-game adapter coverage, or Skein acceptance.'},indent=2)+'\n')
        browser.close()
