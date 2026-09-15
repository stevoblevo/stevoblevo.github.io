/* Shared visual language only. No cross-person state or authority. */
(() => {
  const owner = location.pathname.startsWith('/goober/') ? 'aiden' : 'steven';
  const key = 'sae.family.scene.' + owner + '.v1';
  const scenes = owner === 'aiden' ? [
    {name:'The Crossing',image:'/goober/assets/crossing.webp'},
    {name:'Tower sanctuary',image:'/goober/assets/sanctuary.webp'},
    {name:'Garden return',image:'/goober/assets/garden.webp'}
  ] : [
    {name:'Garden of possibilities',image:'/goober/assets/garden.webp'},
    {name:'The night sanctuary',image:'/goober/assets/sanctuary.webp'},
    {name:'Sae × Dora · greenhouse',image:'gen2-light.webp'}
  ];
  let index = 0;
  try { const saved = Number(localStorage.getItem(key)); if (Number.isInteger(saved) && saved >= 0 && saved < scenes.length) index = saved; } catch {}
  document.body.classList.add('sae-family'); document.body.dataset.owner = owner;
  const mark = () => { const a = document.createElement('a'); a.className='sae-family-wordmark'; a.href=owner==='aiden'?'/goober/':'/anewgam-for-steven-cockpit/'; a.innerHTML='<b>Sae ·</b><span>.anewgam</span>'; a.setAttribute('aria-label','Sae · .anewgam — home'); return a; };
  const head = document.createElement('header'); head.className='sae-family-header';
  const tools = document.createElement('div');tools.className='sae-family-tools';
  const person = document.createElement('span');person.className='sae-family-owner';person.textContent=owner==='aiden'?'Aiden · Goober’s world':'Steven · your living world';
  const control = document.createElement('div'); const button = document.createElement('button');button.type='button';button.textContent='✧ Change scene';
  const caption = document.createElement('output');caption.className='sae-scene-caption';caption.setAttribute('aria-live','polite');
  function paint(){document.body.style.setProperty('--world-image',`url("${scenes[index].image}")`);caption.textContent=scenes[index].name;button.setAttribute('aria-label',`Change scene: ${scenes[index].name}`);}
  button.addEventListener('click',()=>{index=(index+1)%scenes.length;paint();try{localStorage.setItem(key,String(index));}catch{caption.textContent+=' · this visit only';}});
  const play = document.createElement('a'); play.className='sae-play-link'; play.href=owner==='aiden'?'/goober/run/':'/peachfall/'; play.textContent='▷ Play';
  control.append(button,caption);tools.append(person,play,control);head.append(mark(),tools);document.body.prepend(head);
  const foot=document.createElement('footer');foot.className='sae-family-footer';foot.append(mark());
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Sae family worlds');
  for(const [label,url] of [['Steven','/anewgam-for-steven-cockpit/'],['Aiden · Goober','/goober/'],['Meema','https://anewgam-for-meema.stevoblevo.chatgpt.site'],['Play · Peachfall','/peachfall/']]){const a=document.createElement('a');a.href=url;a.textContent=label;a.rel='noreferrer';nav.append(a);}
  const note=document.createElement('small');note.textContent='One family of worlds. Your own way through. Each world keeps its own saves.';foot.append(nav,note);document.body.append(foot);paint();
  if(document.body.classList.contains('ya-open')) { head.inert=true; foot.inert=true; }
})();
