/** Guided visits use live paper-world scenes and clearly labeled ride stills.
 * Heavy WebGL runs only in the separate, explicitly opened live ride. */
export function mountTour({audio,chapters,setScene,quiet,style,getStyle,discover,pauseMedia,announce}){
 const $=s=>document.querySelector(s), body=document.body;
 const canRide=location.protocol!=='file:'&&!window.LOCAL_ASSETS;
 const steps=[
  {id:'welcome',title:'A little world, unfolding',chapter:0,from:0,to:8.8},
  {id:'driver',title:'Rain on paper · the driver’s view',chapter:0,from:8.8,to:18.4,seat:'driver'},
  {id:'passenger',title:'Watch the weather from the passenger seat',chapter:0,from:18.4,to:28,seat:'passenger'},
  {id:'rear',title:'A paper cabin · the view from the back',chapter:0,from:28,to:37.6,seat:'rear'},
  {id:'dent',title:'A fold in the story',chapter:0,seconds:8,discovery:true},
  {id:'map',title:'A map can guide you',chapter:1,from:37.95,to:67.45},
  {id:'map-fold',title:'Useful. And incomplete.',chapter:1,from:67.45,to:87.55,discovery:true},
  {id:'forecast',title:'Leave a little room for the weather',chapter:1,from:87.55,to:120.55},
  {id:'crown',title:'Even a crown has edges',chapter:2,from:120.9,to:143.3},
  {id:'wind',title:'Follow the wind',chapter:2,from:143.65,to:178,discovery:true},
  {id:'morning',title:'A cross. An open tomb.',chapter:3,from:178.35,to:207},
  {id:'hope',title:'The Christian centre of the sermon',chapter:3,from:207,to:237.8,discovery:true},
  {id:'return',title:'Questions remain. So do we.',chapter:4,from:238.15,to:277.62},
  {id:'reflection',title:'By the lantern · a thought for yourself',chapter:4,seconds:12,panel:'#notebook-dialog'},
  {id:'listening',title:'The listening room · ten original passages',chapter:4,seconds:10,panel:'#recording-dialog'},
  {id:'workshop',title:'The rehearsal room · original available, synthesis pending',chapter:4,seconds:12,panel:'#workshop-dialog'},
  {id:'storybook',title:'Another way to see · Storybook',chapter:1,seconds:10,style:'gen2'},
  {id:'evidence',title:'Another way to see · Evidence',chapter:2,seconds:10,style:'skeptic',discovery:true},
  {id:'symbols',title:'Another way to see · Symbols',chapter:3,seconds:10,style:'semiotic'},
  {id:'source',title:'The words behind the paper',chapter:4,seconds:10,panel:'#source-dialog',style:'gen4'},
  {id:'tv',title:'Make room · the big-screen options',chapter:4,seconds:10,panel:'#tv-dialog'},
  {id:'rest',title:'Stay a little. The world is yours to explore.',chapter:4,seconds:10}
 ];
 const entry=document.createElement('div');entry.className='tour-entry';entry.innerHTML='<button id="tour-start" class="tour-start">▶ Play the whole experience</button><button id="tour-silent" class="tour-silent">Take a silent tour</button><span>A guided visit through the art, storm and little rooms.</span>';
 $('.entry-actions').after(entry);
 const ui=document.createElement('section');ui.id='tour-ui';ui.hidden=true;ui.setAttribute('aria-label','Guided tour controls');ui.innerHTML='<div class="tour-heading"><span id="tour-count"></span><strong id="tour-title"></strong><span id="tour-state" role="status" aria-live="polite"></span></div><div class="tour-controls"><button id="tour-back" aria-label="Previous tour stop">←</button><button id="tour-pause">Pause tour</button><button id="tour-next" aria-label="Next tour stop">Next →</button><label class="tour-position"><span class="sr-only">Tour stop</span><select id="tour-position"></select></label><button id="tour-replay">Replay</button><button id="tour-exit">Exit tour ×</button></div><progress id="tour-progress" max="1" value="0" aria-label="Current tour stop progress"></progress>';
 body.append(ui);
 const preview=document.createElement('section');preview.id='tour-ride';preview.hidden=true;preview.setAttribute('aria-label','Paper cabin still preview');preview.innerHTML='<img id="tour-ride-image" alt=""><div class="tour-ride-shade"></div><div class="tour-ride-info"><p class="tour-ride-kicker">A STILL FROM THE PAPER CABIN</p><h2>Rain on <em>paper.</em></h2><p id="tour-seat-name"></p><a id="tour-ride-link" href="ride/" target="_blank" rel="noopener">Open the live 3D ride ↗</a><p class="tour-ride-hint">The tour pauses. Your live ride opens in a new tab.</p></div>';body.append(preview);
 const previewImage=$('#tour-ride-image');
 steps.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${s.title}`;$('#tour-position').append(o);});
 let active=false,running=false,silent=false,index=0,elapsed=0,last=performance.now(),timer=0,internal=false,imageTimer=0,previewToken=0,previewFallback=false,runId=0,savedStyle='gen4',completed=false,ignorePauseUntil=0;
 const duration=s=>silent&&s.from!==undefined?Math.min(14,s.to-s.from):s.seconds??s.to-s.from;
 const stateText=t=>$('#tour-state').textContent=t;
 const runInternal=fn=>{const prior=internal;internal=true;try{return fn();}finally{internal=prior;}};
 const pauseOwned=()=>{ignorePauseUntil=performance.now()+400;pauseMedia();};
 function closePanels(){runInternal(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('.tour-panel').forEach(d=>d.classList.remove('tour-panel'));});}
 function clearPreview(){clearTimeout(imageTimer);previewToken++;preview.hidden=true;body.classList.remove('tour-riding');previewImage.onload=previewImage.onerror=null;previewImage.removeAttribute('src');}
 function showRide(s){
  if(!s.seat){clearPreview();return;}
  const token=++previewToken;clearTimeout(imageTimer);previewFallback=false;preview.hidden=false;previewImage.hidden=false;body.classList.add('tour-riding');
  const path='art/ride-'+s.seat+'.png',src=window.LOCAL_ASSETS?.[path]||path;
  const fail=()=>{if(token!==previewToken)return;clearTimeout(imageTimer);previewFallback=true;preview.hidden=true;body.classList.remove('tour-riding');stateText('The cabin preview is unavailable. The paper story and tour controls continue.');};
  previewImage.onload=()=>{if(token===previewToken)clearTimeout(imageTimer);};previewImage.onerror=fail;
  previewImage.alt=`A rendered still from the actual Three.js paper cabin, ${s.seat==='rear'?'back':s.seat} seat. This preview is not interactive.`;
  $('#tour-seat-name').textContent=(s.seat==='rear'?'Back seat':s.seat==='driver'?'Driver’s view':'Passenger’s view')+' · rendered still';
  $('#tour-ride-link').hidden=!canRide;$('.tour-ride-hint').hidden=!canRide;
  $('#tour-ride-link').href='ride/?seat='+s.seat+(quiet()?'&quiet=1':'');
  imageTimer=setTimeout(fail,8000);previewImage.src=src;
 }
 function applyScene(){const s=steps[index];runInternal(()=>{closePanels();style(s.style||savedStyle);setScene(s.chapter);$('#reveal-note').hidden=true;if(s.discovery)discover();if(s.panel){const d=$(s.panel);if(d){d.classList.add('tour-panel');d.show();d.scrollTop=0;}}});showRide(s);}
 function update(){const s=steps[index];$('#tour-title').textContent=s.title;$('#tour-count').textContent=`${String(index+1).padStart(2,'0')} / ${steps.length}`;$('#tour-position').value=index;$('#tour-pause').textContent=running?'Pause tour':completed?'Tour finished':'Resume tour';$('#tour-pause').disabled=completed;$('#tour-progress').value=Math.min(1,elapsed/duration(s));$('#tour-back').disabled=index===0;$('#tour-next').disabled=index===steps.length-1;}
 async function playStep(){const token=runId,s=steps[index];if(silent||s.from===undefined){pauseOwned();return;}try{audio.currentTime=s.from+elapsed;await audio.play();if(token!==runId)return;if(!active||!running)audio.pause();}catch{if(token===runId){running=false;stateText('Press Resume tour to start the recording in this browser.');update();}}}
 function goto(i,{play=running}={}){runId++;index=Math.max(0,Math.min(steps.length-1,i));elapsed=0;completed=false;running=play;last=performance.now();stateText(silent?'Silent tour · no audio':running?'Original recording + quiet pauses':'Paused · resume returns to this stop');applyScene();if(running)playStep();else pauseOwned();update();}
 function start(isSilent=false){if(active)exit(false);savedStyle=getStyle();silent=isSilent;active=true;ui.hidden=false;body.classList.add('tour-active');pauseOwned();$('#tour-pause').focus({preventScroll:true});goto(0,{play:true});clearInterval(timer);timer=setInterval(tick,100);announce('Guided tour started. Pause, skip or exit at any time.');}
 function pause(reason='Paused · explore, then resume this stop'){if(!active)return;runId++;running=false;pauseOwned();stateText(reason);update();}
 function resume(){if(!active||completed)return;runId++;running=true;last=performance.now();applyScene();stateText(silent?'Silent tour · no audio':'Original recording + quiet pauses');playStep();update();}
 function finish(){pause('The tour is complete. Replay, or exit to explore.');completed=true;elapsed=duration(steps[index]);update();announce('Tour complete.');}
 function tick(){const now=performance.now(),delta=Math.max(0,(now-last)/1000);last=now;if(!active||!running||document.hidden)return;const s=steps[index];if(!silent&&s.from!==undefined){elapsed=Math.max(0,audio.currentTime-s.from);if(audio.paused&&performance.now()>ignorePauseUntil&&elapsed<duration(s)-.1){pause('Recording paused · resume when you’re ready');return;}}else elapsed+=delta;
  if(silent)$('#caption-well').hidden=true;update();if(elapsed>=duration(s)-.03){index===steps.length-1?finish():goto(index+1,{play:true});}
 }
 function exit(focus=true){if(!active)return;runId++;active=running=false;completed=false;pauseOwned();clearInterval(timer);closePanels();clearPreview();body.classList.remove('tour-active','tour-riding');ui.hidden=true;$('#reveal-note').hidden=true;runInternal(()=>style(savedStyle));$('#caption-well').hidden=true;if(focus)$('#tour-start').focus({preventScroll:true});announce('Tour ended. Explore at your own pace.');}
 $('#tour-start').onclick=()=>start(false);$('#tour-silent').onclick=()=>start(true);$('#tour-pause').onclick=()=>running?pause():resume();$('#tour-next').onclick=()=>goto(index+1);$('#tour-back').onclick=()=>goto(index-1);$('#tour-position').onchange=e=>goto(+e.target.value);$('#tour-replay').onclick=()=>{if(!active)start(silent);else goto(0,{play:true});};$('#tour-exit').onclick=()=>exit();
 // Manual interaction pauses the visit before the existing control acts. No form data is cleared.
 document.addEventListener('click',e=>{if(active&&running&&!internal&&!e.target.closest('#tour-ui,.tour-entry')&&e.target.closest('button,a,summary,input,select,textarea'))pause('Paused for exploring · resume returns to the tour');},true);
 document.addEventListener('input',e=>{if(active&&running&&!internal&&!e.target.closest('#tour-ui'))pause('Paused for your notes · nothing is sent');},true);
 document.addEventListener('play',e=>{if(active&&running&&e.target!==audio&&!internal){runId++;running=false;audio.pause();stateText('Paused for another recording · resume returns to the tour');update();}},true);
 audio.addEventListener('pause',()=>{if(active&&running&&!silent&&steps[index].from!==undefined&&audio.paused&&performance.now()>ignorePauseUntil)pause('Recording paused · resume when you’re ready');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&running)pause('Paused while you were away · resume when ready');});
 document.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();exit();}});
 window.paperTour={start,pause,resume,exit,goto,steps:steps.map(s=>({...s})),state:()=>({active,running,silent,index,id:steps[index].id,elapsed,duration:duration(steps[index]),completed,hasRide:canRide,ride:steps[index].seat?{mode:'rendered-still',seat:steps[index].seat,ready:previewImage.complete&&previewImage.naturalWidth>0,fallback:previewFallback}:null})};
}
