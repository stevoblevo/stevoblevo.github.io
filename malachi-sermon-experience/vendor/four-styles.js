/* Four visual languages over one semantic DOM. No collector, remote storage or router. */
export const MODES = Object.freeze(['gen4', 'gen2', 'skeptic', 'semiotic']);
export const NAMES = Object.freeze({gen4:'Gen 4', gen2:'Gen 2', skeptic:'Skeptic', semiotic:'Semiotic strict'});
export const STORAGE_KEY = 'storeybrook.four-styles.preferences.v1';
export function preferences(value = {}) {
  if (!value || typeof value !== "object") value = {};
  return {
    style: MODES.includes(value.style) ? value.style : 'gen4',
    theme: ['system','light','dark'].includes(value.theme) ? value.theme : 'system',
    quiet: value.quiet === true, words: value.words === true,
    density: value.density === 'tv' ? 'tv' : 'regular', remember: value.remember === true,
  };
}
export function resolveTheme(choice, dark) { return choice === 'system' ? (dark ? 'dark' : 'light') : choice; }
export function assetMap(input, base) {
  const out = {};
  for (const mode of MODES) {
    out[mode] = {};
    for (const kind of ['scene','keyframes','symbols','column']) {
      const entry = input?.[mode]?.[kind], value = typeof entry === 'string' ? entry : entry?.url;
      if (!value) continue;
      try {
        const url = new URL(value, base);
        if (url.origin !== new URL(base).origin && url.protocol !== 'blob:') continue;
        if (!['http:','https:','blob:','file:'].includes(url.protocol)) continue;
        out[mode][kind] = url.href;
      } catch { /* An absent or invalid source stays an honest placeholder. */ }
    }
  }
  return out;
}

export function mount(root, options = {}) {
  if (!root || root.dataset.fsMounted) throw new Error('Mount one controller per four-styles root.');
  root.dataset.fsMounted = 'true';
  const doc = root.ownerDocument, win = doc.defaultView, $ = s => root.querySelector(s);
  const abort = new AbortController(), listen = (el, kind, fn) => el?.addEventListener(kind, fn, {signal:abort.signal});
  const media = {dark:win.matchMedia('(prefers-color-scheme: dark)'), reduced:win.matchMedia('(prefers-reduced-motion: reduce)')};
  const key = options.storageKey || STORAGE_KEY;
  let saved;
  try { saved = JSON.parse(win.localStorage.getItem(key)); } catch { /* local choice remains usable */ }
  let prefs = preferences(saved?.remember ? saved : options.preferences), assets = assetMap(options.assets, doc.baseURI);
  let view = 'scene', epoch = 0, pending = null, ownedURLs = [], lastFocus = null;
  const image = $('[data-fs-image]'), empty = $('[data-fs-empty]'), status = $('[data-fs-status]');
  const reduced = () => prefs.quiet || media.reduced.matches;
  const announce = text => { if (status) status.textContent = text; };
  function save() {
    try {
      prefs.remember ? win.localStorage.setItem(key, JSON.stringify(prefs)) : win.localStorage.removeItem(key);
      return '';
    } catch {
      const message = prefs.remember
        ? 'This choice works for this visit, but the browser could not save it.'
        : 'This choice works for this visit, but the browser could not clear its saved preferences.';
      announce(message);
      return message;
    }
  }
  function stopMotion() {
    root.getAnimations?.({subtree:true}).forEach(a => a.cancel());
    win.scrollTo({left:win.scrollX, top:win.scrollY, behavior:'instant'});
  }
  function apply() {
    const theme = resolveTheme(prefs.theme, media.dark.matches);
    root.dataset.fsStyle = prefs.style; root.dataset.fsTheme = theme;
    root.dataset.fsQuiet = String(prefs.quiet); root.dataset.fsWords = String(prefs.words);
    root.dataset.density = prefs.density; root.dataset.fsReduced = String(reduced());
    if (prefs.style === 'gen4') { root.removeAttribute('data-sb'); root.dataset.df = theme === 'dark' ? 'peach-night' : 'day'; }
    else { root.removeAttribute('data-df'); root.dataset.sb = theme === 'dark' ? 'knight' : 'daylight'; }
    root.querySelectorAll('[data-fs-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fsMode === prefs.style)));
    if ($('[data-fs-theme]')) $('[data-fs-theme]').value = prefs.theme;
    for (const name of ['quiet','words','density']) {
      const on = name === 'density' ? prefs.density === 'tv' : prefs[name];
      $('[data-fs-'+name+']')?.setAttribute('aria-pressed', String(on));
    }
    if ($('[data-fs-remember]')) $('[data-fs-remember]').checked = prefs.remember;
    if ($('[data-fs-mode-name]')) $('[data-fs-mode-name]').textContent = NAMES[prefs.style];
    if (reduced()) stopMotion();
  }
  function showArt() {
    const mine = ++epoch, url = assets[prefs.style]?.[view];
    if (pending) pending.onload = pending.onerror = null;
    image.hidden = true; image.removeAttribute('src'); image.setAttribute('aria-busy', String(!!url));
    empty.hidden = false;
    $('[data-fs-empty-message]').textContent = url ? 'Opening the picture…' : 'Choose the cropped artwork to enter this story.';
    $('[data-fs-source]')?.toggleAttribute('hidden', !assets[prefs.style]?.column);
    if (assets[prefs.style]?.column) $('[data-fs-source]').href = assets[prefs.style].column;
    if (!url) return;
    const request = new win.Image(); pending = request;
    request.onload = () => {
      if (mine !== epoch) return;
      image.src = request.src; image.hidden = false; image.setAttribute('aria-busy','false'); empty.hidden = true;
    };
    request.onerror = () => {
      if (mine !== epoch) return;
      image.setAttribute('aria-busy','false');
      $('[data-fs-empty-message]').textContent = 'That picture could not be opened. Choose the local crop pack again.';
      announce('Artwork unavailable. The story and controls are still here.');
    };
    image.alt = options.imageAlt || `${NAMES[prefs.style]} story artwork.`;
    request.src = url;
  }
  function changeStyle(mode) {
    if (!MODES.includes(mode) || mode === prefs.style) return;
    const position = {left:win.scrollX, top:win.scrollY};
    prefs.style = mode; apply(); showArt(); const saveError = save();
    // The semantic DOM, open details, note, bookmark and focused control survive.
    win.scrollTo({...position, behavior:'instant'});
    announce([`${NAMES[mode]}. Same story; your place is kept.`, saveError].filter(Boolean).join(' '));
    root.dispatchEvent(new CustomEvent('fourstyles:change',{bubbles:true,detail:{style:mode,theme:prefs.theme,view}}));
  }
  root.querySelectorAll('[data-fs-mode]').forEach(button => {
    listen(button,'click',()=>changeStyle(button.dataset.fsMode));
    listen(button,'keydown',e=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const index = MODES.indexOf(button.dataset.fsMode);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (index + (e.key === 'ArrowRight' ? 1 : 3)) % 4;
      const target = root.querySelector(`[data-fs-mode="${MODES[next]}"]`);
      target.focus({preventScroll:true}); changeStyle(MODES[next]);
    });
  });
  root.querySelectorAll('[data-fs-view]').forEach(button=>listen(button,'click',()=>{
    view = button.dataset.fsView;
    root.querySelectorAll('[data-fs-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    showArt(); announce(`${view === 'scene' ? 'Garden scene' : view === 'keyframes' ? 'Story key frames' : 'Source symbols'}.`);
  }));
  listen($('[data-fs-theme]'),'change',e=>{prefs.theme=e.target.value;apply();save();});
  for (const name of ['quiet','words','density']) listen($('[data-fs-'+name+']'),'click',()=>{
    if (name==='density') prefs.density=prefs.density==='tv'?'regular':'tv'; else prefs[name]=!prefs[name];
    apply(); save();
  });
  listen($('[data-fs-remember]'),'change',e=>{prefs.remember=e.target.checked;save();});
  listen(media.dark,'change',apply); listen(media.reduced,'change',apply);
  listen($('[data-fs-retry]'),'click',showArt);
  listen($('[data-fs-files]'),'change',e=>{
    const next = {}, urls = [];
    for (const file of e.target.files) {
      const match = /^(gen4|gen2|skeptic|semiotic)-(scene|keyframes|symbols|column)\.(png|webp|jpe?g)$/i.exec(file.name);
      if (!match || !file.type.startsWith('image/')) continue;
      const url = win.URL.createObjectURL(file); urls.push(url);
      (next[match[1]] ||= {})[match[2]] = url;
    }
    if (!urls.length) { announce('Choose files named gen4-scene.png, gen2-scene.png, skeptic-scene.png and semiotic-scene.png, with optional strips.'); return; }
    const old = ownedURLs; ownedURLs = urls; assets = assetMap(next, doc.baseURI); showArt();
    old.forEach(url=>win.URL.revokeObjectURL(url));
    announce(`${urls.length} local crop files ready. Nothing was uploaded.`);
  });
  const settings = $('[data-fs-settings]');
  listen($('[data-fs-settings-open]'),'click',()=>{lastFocus=doc.activeElement;settings.showModal();});
  listen($('[data-fs-settings-close]'),'click',()=>settings.close());
  listen(settings,'close',()=>lastFocus?.focus({preventScroll:true}));
  options.storeybrook?.mountIcons(root);
  const input = installInput(root, options.storeybrook, reduced, () => prefs.density, abort.signal, announce);
  apply(); showArt();
  root.dataset.fsReady = 'true';
  return {
    setStyle:changeStyle,
    setAssets(value) { assets=assetMap(value,doc.baseURI);showArt(); },
    getState() { return {...prefs,view}; },
    destroy() { epoch++;if(pending)pending.onload=pending.onerror=null;abort.abort();input?.();ownedURLs.forEach(url=>win.URL.revokeObjectURL(url));delete root.dataset.fsMounted;delete root.dataset.fsReady; },
  };
}

/* Storeybrook spatial scoring and controller mapping, scoped to this component.
   Its nav.candidates supplies shared input semantics; the adapter adds summaries,
   modal containment, runtime Quiet, and cleans up its own listeners. */
function installInput(root, storeybrook, reduced, density, signal, announce) {
  if (!storeybrook?.nav) return;
  const doc=root.ownerDocument, win=doc.defaultView;
  root.querySelectorAll('summary').forEach(s=>s.setAttribute('data-sb-focus',''));
  let editing = null;
  const field = target => target.closest('input,textarea,select,[contenteditable=true]');
  const editable = el => el && (['TEXTAREA','SELECT'].includes(el.tagName) || el.isContentEditable ||
    (el.tagName === 'INPUT' && !['checkbox','radio','button','submit','reset','file','range','color'].includes(el.type)));
  function edit(el) {
    editing?.removeAttribute('data-fs-editing');
    editing = el;
    if (el) {
      el.setAttribute('data-fs-editing','true');
      announce('Editing this field. Escape or Back returns to navigation; your changes stay.');
    }
  }
  function candidates() {
    const modal=root.querySelector('dialog[open]');
    return storeybrook.nav.candidates().filter(el=>root.contains(el)&&(!modal||modal.contains(el)));
  }
  function move(dir) {
    edit(null);
    const list=candidates(), current=doc.activeElement;if(!list.length)return;
    if(!list.includes(current)){list[0].focus({preventScroll:true});return;}
    const a=current.getBoundingClientRect(), ax=a.left+a.width/2, ay=a.top+a.height/2;
    let best=null, score=Infinity;
    for(const el of list){if(el===current)continue;const b=el.getBoundingClientRect(), dx=b.left+b.width/2-ax, dy=b.top+b.height/2-ay;
      const main=dir==='left'?-dx:dir==='right'?dx:dir==='up'?-dy:dy, side=dir==='left'||dir==='right'?Math.abs(dy):Math.abs(dx);
      if(main>4&&main+side*2.2<score){best=el;score=main+side*2.2;}}
    if(best){best.focus({preventScroll:true});best.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced()?'instant':'smooth'});}
  }
  function back(){
    if(editing){const el=editing;edit(null);el.focus({preventScroll:true});announce('Navigation. D-pad moves to another control; Enter edits this field.');return true;}
    const details=doc.activeElement.closest?.('details[open]');
    if(details&&root.contains(details)){details.open=false;details.querySelector('summary')?.focus({preventScroll:true});return true;}
    const dialog=root.querySelector('dialog[open]');if(dialog){dialog.close();return true;}return false;
  }
  root.addEventListener('focusin',e=>{if(editing&&e.target!==editing)edit(null);},{signal});
  root.addEventListener('pointerdown',e=>{const el=field(e.target);if(density()==='tv'&&editable(el))edit(el);},{signal});
  root.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
    const el=field(e.target), tv=density()==='tv';
    if(!tv&&editing)edit(null);
    // Backspace is text editing, not a navigation command, inside form fields.
    if(['Escape','BrowserBack'].includes(e.key)||(e.key==='Backspace'&&!el)){
      if(back()){e.preventDefault();e.stopPropagation();}return;
    }
    if(tv&&editable(el)){
      if(editing===el)return; // Native arrows, typing and select behavior while editing.
      if(e.key==='Enter'||e.key==='F2'){
        edit(el);
        if(el.tagName!=='SELECT'||e.key==='F2')e.preventDefault();
        return;
      }
      if(e.key.length===1){edit(el);return;} // Typing also enters edit mode.
    }
    const dir={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];
    if(dir&&tv){e.preventDefault();e.stopPropagation();move(dir);}
    if(tv&&el?.tagName==='INPUT'&&['checkbox','radio'].includes(el.type)&&e.key==='Enter'){e.preventDefault();el.click();}
  },{signal});
  function padMove(dir){
    if(editing?.tagName==='SELECT'&&['up','down'].includes(dir)){
      const el=editing, step=dir==='down'?1:-1;
      let index=el.selectedIndex+step;
      while(index>=0&&index<el.options.length&&el.options[index].disabled)index+=step;
      if(index>=0&&index<el.options.length){el.selectedIndex=index;el.dispatchEvent(new Event('change',{bubbles:true}));}
    }else move(dir);
  }
  function activate(){const el=field(doc.activeElement);if(editable(el)){edit(el);el.focus({preventScroll:true});}else doc.activeElement.click();}
  let raf=0, prev={}, repeated=0;
  function poll(time){
    if(signal.aborted)return;
    const pad=[...(win.navigator.getGamepads?.()||[])].find(Boolean);
    if(pad&&density()==='tv'&&root.contains(doc.activeElement)){
      const b=n=>!!pad.buttons[n]?.pressed, now={up:b(12)||pad.axes[1]<-.6,down:b(13)||pad.axes[1]>.6,left:b(14)||pad.axes[0]<-.6,right:b(15)||pad.axes[0]>.6,a:b(0),b:b(1)};
      for(const dir of ['up','down','left','right'])if(now[dir]&&(!prev[dir]||time-repeated>240)){padMove(dir);repeated=time;}
      if(now.a&&!prev.a)activate();if(now.b&&!prev.b)back();prev=now;
    }
    raf=win.requestAnimationFrame(poll);
  }
  const start=()=>{if(!raf)raf=win.requestAnimationFrame(poll);};
  win.addEventListener('gamepadconnected',start,{signal});
  if([...(win.navigator.getGamepads?.()||[])].some(Boolean))start();
  return ()=>win.cancelAnimationFrame(raf);
}
