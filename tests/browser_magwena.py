"""View-only doorway acceptance. Actual exported synthetic postcard, no private save."""
import json,os,traceback,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('MAGWENA_TEST_URL','http://127.0.0.1:4317/').rstrip('/')
VIEW=BASE+'/anewgam-for-steven-cockpit/magwena/'
OUT=Path(os.environ.get('MAGWENA_EVIDENCE_DIR','test-results/magwena'));OUT.mkdir(parents=True,exist_ok=True)
FIXTURE=Path(__file__).parent/'fixtures/magwena-chosen-peach.json'
checks=[];errors=[]
def ok(name):checks.append(name);print('PASS',name,flush=True)
def payload(p):return json.loads(p.locator('#payload').text_content())
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 ctx=browser.new_context(viewport={'width':1280,'height':950},permissions=['clipboard-read','clipboard-write'])
 ctx.add_init_script("""(() => {const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
 set.call(localStorage,'private-test-note','NOT-FOR-THE-POSTCARD');window.__nativeNote=()=>get.call(localStorage,'private-test-note');window.__storageCalls=[];
 for(const k of ['getItem','setItem','removeItem','clear','key'])Storage.prototype[k]=function(){window.__storageCalls.push(k);throw Error('Viewer attempted private storage');};})();""")
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));requests=[];p.on('request',lambda r:requests.append(r.url));passed=False
 try:
  p.goto(VIEW);expect(p.locator('#open')).to_be_enabled();expect(p.locator('#peach')).to_be_hidden();expect(p.locator('#download')).to_be_disabled()
  assert p.evaluate('window.__storageCalls')==[];ok('unopened page neither invents a shared peach nor reads private storage')
  p.locator('#file').set_input_files(str(FIXTURE));expect(p.locator('#peach')).to_be_visible();assert payload(p)==json.loads(FIXTURE.read_text())
  p.screenshot(path=str(OUT/'01-chosen-view.png'));ok('opens exact five-field synthetic postcard exported from the game')
  p.locator('#peach').click();expect(p.locator('#sceneNote')).to_contain_text('without taking');ok('touch answers visually without importing game state')
  with p.expect_download() as ev:p.locator('#download').click()
  saved=OUT/'roundtrip.json';ev.value.save_as(saved);assert saved.read_bytes()==FIXTURE.read_bytes();ok('real download preserves the exact chosen postcard bytes')
  p.locator('#copy').click();expect(p.locator('#status')).to_contain_text('link copied')
  copied=p.evaluate('navigator.clipboard.readText()');assert copied==VIEW+'#pf1.10';ok('copies only the fixed place and chosen flags, without posting')
  p.goto(copied);expect(p.locator('#peach')).to_be_visible();assert payload(p)['showReturnGreeting'] is False
  p.goto(VIEW+'#pf1.01');expect(p.locator('#peach')).to_be_hidden();expect(p.locator('#greeting')).to_have_text('Still here, for you.');ok('greeting-only address does not disclose a peach')
  previous=payload(p);p.locator('#file').set_input_files({'name':'unsafe.json','mimeType':'application/json','buffer':json.dumps(dict(previous,privateNote='<script>bad</script>')).encode()});expect(p.locator('#status')).to_contain_text('not a valid',ignore_case=True);assert payload(p)==previous
  p.locator('#file').set_input_files({'name':'duplicate.json','mimeType':'application/json','buffer':FIXTURE.read_bytes().replace(b'{',b'{"showPeach":false,',1)});expect(p.locator('#status')).to_contain_text('not a valid',ignore_case=True);assert payload(p)==previous;ok('private, executable-looking and duplicate fields are rejected without replacing the view')
  p.goto(VIEW+'#javascript:bad');expect(p.locator('#status')).to_contain_text('previous view is unchanged');assert payload(p)==previous
  p.reload();expect(p.locator('#status')).to_contain_text('Unknown');expect(p.locator('#download')).to_be_disabled();ok('invalid hash preserves a labelled prior view, but a fresh invalid page stays unopened')
  assert p.evaluate('window.__storageCalls')==[] and p.evaluate('window.__nativeNote()')=='NOT-FOR-THE-POSTCARD'
  assert not any('/app.js' in r or '/ingress.js' in r for r in requests);assert all(r.startswith(BASE) for r in requests);ok('viewer makes no storage calls and loads no private cockpit runtime or external service')
  phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');q=phone.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.goto(VIEW+'#pf1.10');expect(q.locator('#peach')).to_be_visible();q.locator('#peach').tap();assert q.evaluate('document.documentElement.scrollWidth<=innerWidth');q.screenshot(path=str(OUT/'02-phone-window.png'),full_page=True);phone.close();ok('390px touch and reduced-motion presentation remain usable')
  home=browser.new_context(viewport={'width':1280,'height':900});h=home.new_page();h.on('pageerror',lambda e:errors.append(str(e)));h.goto(BASE+'/');h.get_by_role('link',name='Magwena ↗',exact=True).click();expect(h.locator('#open')).to_be_visible()
  h.goto(BASE+'/anewgam-for-steven-cockpit/');h.wait_for_function('!!window.__anewgam');h.get_by_role('link',name='Magwena ↗',exact=True).click();expect(h.locator('#open')).to_be_visible();ok('existing shared home and cockpit both open the same outward doorway')
  h.goto(BASE+'/anewgam-for-steven-cockpit/');h.wait_for_function('!!navigator.serviceWorker.controller');h.evaluate('navigator.serviceWorker.ready');h.goto(VIEW+'#pf1.10');home.set_offline(True);h.reload();expect(h.locator('#peach')).to_be_visible();home.set_offline(False);home.close();ok('existing scoped cockpit cache reloads the postcard view offline')
  assert not errors,errors;ok('no page errors in the exercised doorway and viewer paths');passed=True
 except Exception:
  (OUT/'failure.txt').write_text(traceback.format_exc());p.screenshot(path=str(OUT/'failure.png'));raise
 finally:
  (OUT/'results.json').write_text(json.dumps({'passed':passed,'checks':checks,'errors':errors,'fixture_sha256':hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),'scope':'Hosted Chromium, synthetic postcard and phone viewport; not delivery to a person or physical-device proof.'},indent=2));ctx.close();browser.close()
