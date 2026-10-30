/* Existing art IDs and #view= links; actual public source bytes, native modal, reversible history. */
(()=>{
  'use strict';
  const $=s=>document.querySelector(s), stage=$('#ya-stage'), image=$('#ya-img');
  const items=()=>window.__libraryItems||[];
  let sequence=[], current=null, returnFocus=null, previousHash='#library', zoom=1, pan={x:0,y:0}, pointers=new Map(), gesture=null, timer;
  const announce=message=>{$('#ya-announcement').textContent=message;};
  function reset(){zoom=1;pan={x:0,y:0};pointers.clear();gesture=null;transform();}
  function transform(){image.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;$('#ya-reset').textContent=zoom===1?'Fit':Math.round(zoom*100)+'%';}
  function scale(value){zoom=current?.previewOnly?1:Math.min(5,Math.max(1,value));if(zoom===1)pan={x:0,y:0};transform();}
  function fail(){clearTimeout(timer);image.hidden=true;$('#ya-error').hidden=false;announce('Artwork unavailable. Try again or browse another work.');}
  function load(){
    clearTimeout(timer);image.hidden=false;$('#ya-error').hidden=true;
    image.onload=()=>{clearTimeout(timer);announce(`${current.title}. ${current.width} by ${current.height} pixels${current.previewOnly?'. Preview only.':''}`);};
    image.onerror=fail;image.src=current.image||current.thumbnail;
    timer=setTimeout(()=>{if(!image.complete)fail();},20000);
  }
  function paint(id){
    const work=items().find(x=>x.id===id);if(!work)return false;
    current=work;reset();stage.dataset.preview=String(!!work.previewOnly);
    $('#ya-title').textContent=work.title;
    $('#ya-count').textContent=`${sequence.findIndex(x=>x.id===id)+1} / ${sequence.length}`;
    $('#ya-caption').textContent=work.caption||'';
    $('#ya-meta').textContent=work.previewOnly?'100 × 75 preview · original unavailable':`${work.width} × ${work.height} · ${work.image.endsWith('.webp')?'Published WebP':'Public original'} · ${Math.round(work.bytes/1024)} KB`;
    $('#ya-provenance').textContent=work.provenance||'Published source artwork. Earlier generation details unverified.';
    image.alt=work.alt||work.title;image.width=work.width;image.height=work.height;
    const source=$('#ya-original');source.hidden=!!work.previewOnly;source.href=work.previewOnly?'#':work.image;
    $('#ya-in').disabled=$('#ya-out').disabled=!!work.previewOnly;
    $('#ya-prev').disabled=$('#ya-next').disabled=sequence.length<2;
    load();window.dispatchEvent(new CustomEvent('sae:art-open',{detail:{id}}));return true;
  }
  function open(id,push=true){
    if(!items().some(x=>x.id===id)){window.__anewgam?.toast('That artwork is not in this public archive.');return;}
    if(!stage.open){
      returnFocus=document.activeElement;previousHash=/^#view=|^#gallery$|^#hires$/.test(location.hash)?'#library':location.hash||'#garden';
      const visible=window.__visibleArt||[];sequence=visible.some(x=>x.id===id)?visible.slice():items().slice();
      stage.showModal();document.body.classList.add('ya-open');
    }
    paint(id);
    if(push)history.pushState({artView:true,returnHash:previousHash},'',`#view=${encodeURIComponent(id)}`);
    $('#ya-close').focus();
  }
  function close(){
    if(!stage.open)return;
    if(history.state?.artView)history.back();
    else {history.replaceState(null,'',previousHash);finishClose();}
  }
  function finishClose(){
    clearTimeout(timer);if(stage.open)stage.close();document.body.classList.remove('ya-open');
    if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
  function step(delta){if(!current||!sequence.length)return;const i=sequence.findIndex(x=>x.id===current.id);const next=sequence[(i+delta+sequence.length)%sequence.length];paint(next.id);history.replaceState(history.state,'',`#view=${encodeURIComponent(next.id)}`);}
  window.__openGallery=id=>open(id||(window.__visibleArt||items())[0]?.id);
  $('#grid').addEventListener('click',e=>{const card=e.target.closest('.card');if(card)open(card.dataset.id);});
  $('#ya-close').addEventListener('click',close);stage.addEventListener('cancel',e=>{e.preventDefault();close();});
  // Storeybrook B/back may close the native dialog directly; preserve URL and return focus too.
  stage.addEventListener('close',()=>{if(document.body.classList.contains('ya-open')){document.body.classList.remove('ya-open');if(/^#view=|^#gallery$|^#hires$/.test(location.hash)){if(history.state?.artView)history.back();else history.replaceState(null,'',previousHash);}returnFocus?.focus({preventScroll:true});}});
  $('#ya-prev').addEventListener('click',()=>step(-1));$('#ya-next').addEventListener('click',()=>step(1));
  $('#ya-in').addEventListener('click',()=>scale(zoom+.5));$('#ya-out').addEventListener('click',()=>scale(zoom-.5));$('#ya-reset').addEventListener('click',reset);$('#ya-retry').addEventListener('click',load);
  $('#ya-full').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else announce('Fullscreen is unavailable in this browser.');}catch{announce('Fullscreen is unavailable in this browser.');}});
  stage.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    // At TV density arrows move focus between real buttons; their A/Enter actions browse.
    if(document.documentElement.dataset.density!=='tv'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();step(e.key==='ArrowLeft'?-1:1);}
    if(['+','=','-','0'].includes(e.key)){e.preventDefault();e.stopPropagation();e.key==='0'?reset():scale(zoom+(['+','='].includes(e.key)?.5:-.5));}
  });
  image.addEventListener('wheel',e=>{e.preventDefault();scale(zoom+(e.deltaY<0?.2:-.2));},{passive:false});image.addEventListener('dblclick',reset);
  const frame=$('.ya-frame');
  frame.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;frame.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1)gesture={startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};
    if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}
  });
  frame.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2&&gesture?.distance){const [a,b]=[...pointers.values()];scale(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance);}
    else if(zoom>1){pan.x+=e.clientX-old.x;pan.y+=e.clientY-old.y;transform();}
  });
  function end(e){if(pointers.size===1&&zoom===1&&gesture?.startX!=null){const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);}pointers.delete(e.pointerId);if(!pointers.size)gesture=null;}
  frame.addEventListener('pointerup',end);frame.addEventListener('pointercancel',()=>{pointers.clear();gesture=null;});
  function route(){
    let hash;try{hash=decodeURIComponent(location.hash);}catch{finishClose();return;}
    if(hash.startsWith('#view=')){const id=hash.slice(6);if(items().some(x=>x.id===id))open(id,false);else{finishClose();window.__anewgam?.toast('That artwork is not in this public archive.');}}
    else if(hash==='#gallery')open((window.__visibleArt||items())[0]?.id,false);
    else if(hash==='#hires'){window.__setLibraryFilter?.('hires');open((window.__visibleArt||[])[0]?.id,false);}
    else finishClose();
  }
  window.addEventListener('hashchange',route);window.addEventListener('popstate',route);route();
})();
