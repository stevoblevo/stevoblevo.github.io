/* Outward-only viewer: deliberately does not import cockpit code or touch storage. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), codec=window.MagwenaPostcard;
 let current=null, generation=0;
 function show(card,source){
  current=codec.read(card);$('#peach').hidden=!current.showPeach;
  $('#greeting').textContent=current.showReturnGreeting?'Still here, for you.':'A little place to return to.';
  $('#sceneNote').textContent=current.showPeach?'One kindness, chosen to travel.':'A place shared. Nothing more inferred.';
  $('#viewLabel').textContent='The view they chose to give';$('#viewTag').textContent='Chosen appearance · not a full dream or identity';
  $('#payload').textContent=JSON.stringify(current,null,2);$('#included').replaceChildren();
  for(const text of ['Meadow gate',...(current.showPeach?['Peach']:[]),...(current.showReturnGreeting?['Return greeting']:[]),'View only']){const span=document.createElement('span');span.textContent=text;$('#included').append(span);}
  $('#download').disabled=false;$('#copy').disabled=!/^https?:$/.test(location.protocol);
  $('#status').textContent=source+' No private save was read or changed.';
 }
 function route(){generation++;if(!location.hash)return;try{show(codec.fromCode(location.hash.slice(1)),'Postcard address opened.');}catch{$('#status').textContent='Unknown postcard address. The previous view is unchanged; nothing imported.';}}
 $('#open').onclick=()=>$('#file').click();
 $('#file').onchange=async()=>{const f=$('#file').files[0];$('#file').value='';if(!f)return;const ticket=++generation;try{if(f.size>2048)throw Error('oversized');const card=codec.parse(await f.text());if(ticket!==generation)return;show(card,'Selected postcard opened.');}catch{if(ticket!==generation)return;$('#status').textContent='Not a valid garden postcard. The current view is unchanged.';}};
 $('#download').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Magwena_Garden_Postcard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#status').textContent='Postcard file prepared. Nothing sent to another person.';};
 $('#copy').onclick=async()=>{if(!current)return;const url=new URL(location.pathname,location.origin);url.hash=codec.toCode(current);try{await navigator.clipboard.writeText(url.href);$('#status').textContent='This view’s link copied. Nothing posted or sent.';}catch{$('#status').textContent='Clipboard unavailable. Save the postcard file instead.';}};
 $('#peach').onclick=()=>{$('#peach').classList.add('touched');$('#sceneNote').textContent='You can meet a moment without taking its whole world.';setTimeout(()=>$('#peach').classList.remove('touched'),700);};
 addEventListener('hashchange',route);route();
})();
