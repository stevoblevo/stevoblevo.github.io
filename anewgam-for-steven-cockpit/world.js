/* Quiet garden → archive → workshop. Reuses Storeybrook navigation; no remote collector. */
(()=>{
  const $=s=>document.querySelector(s), root=document.documentElement;
  const state=()=>window.__anewgam.getState();
  const save=()=>window.__anewgam.setState(state());
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  function stopMotion(){document.getAnimations?.().forEach(animation=>animation.cancel());window.scrollTo({left:window.scrollX,top:window.scrollY,behavior:'instant'});}
  function quiet(value){document.body.classList.toggle('quiet',value);root.classList.toggle('quiet',value);$('#quietToggle').setAttribute('aria-pressed',String(value));if(value)stopMotion();}
  motionPreference.addEventListener('change',()=>{if(motionPreference.matches)stopMotion();});
  quiet(!!state().quiet);
  $('#quietToggle').addEventListener('click',()=>{state().quiet=!state().quiet;quiet(state().quiet);save();});
  const settings=$('#settings');$('#settingsOpen').addEventListener('click',()=>settings.showModal());$('#settingsClose').addEventListener('click',()=>settings.close());
  const scenes=[{id:'gen2-dark',src:'gen2-dark.webp',alt:'Sae and Dora tend a warm bloom in a glasshouse at night.',title:'Sae × Dora'},{id:'gen2-light',src:'gen2-light.webp',alt:'Sae and Dora beside a shared bloom in the morning glasshouse.',title:'The same world, in daylight'},{id:'orig-garden',src:'/goober/assets/garden-original.png',alt:'EverDelve Garden Central.',title:'EverDelve · Garden Central'}];
  let scene=Number.isInteger(state().gardenScene)?state().gardenScene%scenes.length:0;
  function paint(){const s=scenes[scene];$('#gen2Hero').src=s.src;$('#gen2Hero').alt=s.alt;$('#heroOpen').replaceChildren(document.createTextNode(s.title),Object.assign(document.createElement('span'),{textContent:'View the whole artwork ↗'}));}
  $('#sceneToggle').addEventListener('click',()=>{scene=(scene+1)%scenes.length;state().gardenScene=scene;paint();save();});$('#heroOpen').addEventListener('click',()=>window.__openGallery(scenes[scene].id));paint();
  const nav=window.Storeybrook.nav;
  const originalCandidates=nav.candidates.bind(nav);
  nav.candidates=()=>{const modal=document.querySelector('dialog[open]');return originalCandidates().filter(el=>!modal||modal.contains(el));};
  const originalBack=nav.back.bind(nav);
  nav.back=()=>{if(originalBack())return true;if(location.hash&&location.hash!=='#garden'){location.hash='#garden';return true;}return false;};
  window.Storeybrook.density.init();
  function tv(value){root.dataset.density=value?'tv':'regular';$('#tvToggle').setAttribute('aria-pressed',String(value));nav.on=value;if(value)nav.enable();}
  // enable before assigning on so the shared gamepad listener is installed.
  nav.enable(); nav.on=root.dataset.density==='tv';
  try { if([...navigator.getGamepads()].some(Boolean)) window.dispatchEvent(new Event('gamepadconnected')); } catch {}
  $('#tvToggle').setAttribute('aria-pressed',String(root.dataset.density==='tv'));
  $('#tvToggle').addEventListener('click',()=>{const value=root.dataset.density!=='tv';window.Storeybrook.density.set(value?'tv':'regular');tv(value);});
  window.addEventListener('gamepadconnected',()=>{window.Storeybrook.density.set('tv');$('#tvToggle').setAttribute('aria-pressed','true');});
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(['Escape','BrowserBack','Backspace'].includes(e.key)&&!document.querySelector('dialog[open]')&&location.hash&&location.hash!=='#garden'){e.preventDefault();location.hash='#garden';}
  });
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{
    const target=document.getElementById(a.hash.slice(1));
    if(target&&!state().quiet&&!motionPreference.matches)target.animate?.([{opacity:.7},{opacity:1}],{duration:220,easing:'ease-out'});
  }));
  const place=()=>{let hash=location.hash||'#garden';if(['#cockpit','#attend','#colour'].includes(hash))hash='#workshop';if(hash.startsWith('#view=')||hash==='#gallery'||hash==='#hires')hash='#library';document.querySelectorAll('[data-nav]').forEach(a=>{if(a.hash===hash)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});};
  window.addEventListener('hashchange',place);window.addEventListener('popstate',place);place();
  // Reveal legacy anchors nested in details; keep older bookmarks useful.
  function oldDoor(){const hash=location.hash.slice(1);if((window.__anewDoors||[]).some(d=>d.hash.includes(hash))){$('.more-worlds').open=true;$('#library').scrollIntoView();}}
  window.addEventListener('hashchange',oldDoor);oldDoor();
})();
