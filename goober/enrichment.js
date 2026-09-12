// Enhance the existing world; do not replace its React state or browser records.
const BASE='/goober/';
const PEACH='/peachfall/';
function card(id,title,subtitle,image){const a=document.createElement('a');a.href=BASE+'gallery/#'+id;a.className='world-window';const img=document.createElement('img');img.src=BASE+'assets/rediscovered/'+image;img.alt=title;img.loading='lazy';const copy=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small');b.textContent=title;small.textContent=subtitle;copy.append(b,small);a.append(img,copy);return a;}
function wirePeach(frame){
  try{
    const doc=frame.contentDocument;if(!doc)return;
    const watch=doc.getElementById('watch-dream');
    const play=doc.getElementById('play-dream');
    if(frame.dataset.mode==='play')play?.click();else watch?.click();
  }catch(_err){}
}
function peachfallPanel(){
  if(document.getElementById('peachfall-approach'))return;
  const panel=document.createElement('section');
  panel.id='peachfall-approach';
  panel.className='peachfall-approach';
  panel.innerHTML='<div class="peach-top"><span class="eyebrow">PEACHFALL</span><h2>Watch the dream. Or play it.</h2><p>Default is Watch — the living film inside the mini-game. Play is for Aiden. No standalone clip is in the public atlas yet, so the video pane is a stub.</p><div class="peach-actions"><button type="button" data-mode="watch">Watch</button><button type="button" data-mode="play">Play</button><a href="'+PEACH+'">Open Peachfall ↗</a></div></div><div class="peach-stage"><iframe id="peachfall-frame" title="The Peachfall" src="'+PEACH+'" allow="autoplay" loading="lazy"></iframe><aside class="peach-stub"><b>Video stub</b><p>THE VIDEO HAS NOT BEEN RECOVERED as a separate file. Watch the Dream is the film we have: same GameState, played for you.</p><a href="'+PEACH+'">Use Watch the Dream ↗</a></aside></div>';
  const frame=panel.querySelector('#peachfall-frame');
  frame.addEventListener('load',()=>wirePeach(frame));
  panel.querySelectorAll('[data-mode]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      frame.dataset.mode=btn.getAttribute('data-mode');
      try{
        const doc=frame.contentDocument;
        if(doc){
          const reset=doc.getElementById('btn-reset');
          reset?.click();
          wirePeach(frame);
          return;
        }
      }catch(_err){}
      frame.src=PEACH;
    });
  });
  const host=document.getElementById('approach');
  if(host)host.appendChild(panel);
  else{
    const collection=document.getElementById('rediscovered-worlds');
    if(collection)collection.after(panel);
    else document.querySelector('main')?.appendChild(panel);
  }
}
function enhance(){const hero=document.querySelector('.hero');let collection=document.getElementById('rediscovered-worlds');if(!hero){collection?.remove();return;}
 if(!hero.dataset.enriched){const im=hero.querySelector('.hero-art');if(im){im.src=BASE+'assets/rediscovered/world-hero.webp';im.alt='Recovered concept: a traveler overlooking a luminous landscape in the earlier Anewgam world';}const credit=hero.querySelector('.art-credit');if(credit){credit.href=BASE+'gallery/#peachfall-03';credit.textContent='Recovered world art · Open the original ↗';}hero.dataset.enriched='true';}
 if(!collection){collection=document.createElement('section');collection.id='rediscovered-worlds';collection.className='rediscovered-worlds';const top=document.createElement('div');top.className='rediscovered-top';const text=document.createElement('div'),k=document.createElement('span'),h=document.createElement('h2'),a=document.createElement('a');k.textContent='THE WORLD IS GETTING BIGGER';k.className='eyebrow';h.textContent='A few more doors just opened.';text.append(k,h);a.href=BASE+'gallery/';a.textContent='Explore all 12 pictures ↗';top.append(text,a);const row=document.createElement('div');row.className='world-windows';row.append(card('peachfall-02','A constellation to collect','Astral assembly','peachfall-02.webp'),card('peachfall-06','Someone at the threshold','Sae and Knight','peachfall-06.webp'),card('peachfall-09','Play makes a place','The world-creation concept','peachfall-09.webp'));const last=document.createElement('p');last.className='rediscovered-last';last.append('Recovered from the earlier Anewgam story. ');const play=document.createElement('a');play.href=PEACH;play.textContent='Visit the playable Peachfall doorway →';last.append(play);collection.append(top,row,last);hero.after(collection);}
 const collectionHost=document.getElementById('rediscovered-worlds');if(collectionHost&&!collectionHost.querySelector('[data-obs-guide]')){const guide=document.createElement('a');guide.dataset.obsGuide='true';guide.href=BASE+'learn/obs-windows-11/';guide.className='recording-guide-door';const icon=document.createElement('span');icon.className='guide-rec-icon';icon.textContent='●';const copy=document.createElement('span'),k=document.createElement('small'),h=document.createElement('b');k.textContent='NEW FIELD GUIDE / WINDOWS 11';h.textContent='Keep the good play. Find the recording.';copy.append(k,h);const arrow=document.createElement('span');arrow.textContent='OBS setup →';guide.append(icon,copy,arrow);collectionHost.append(guide);}
 if(collectionHost&&!collectionHost.querySelector('[data-with-him]')){const door=document.createElement('a');door.dataset.withHim='true';door.href=BASE+'with-him/';door.className='recording-guide-door';const icon=document.createElement('span');icon.className='guide-rec-icon';icon.textContent='★';const copy=document.createElement('span'),k=document.createElement('small'),h=document.createElement('b');k.textContent='PHONE FIRST / WINDOWS STAYS';h.textContent='Aiden’s world goes with him.';copy.append(k,h);const arrow=document.createElement('span');arrow.textContent='Continue →';door.append(icon,copy,arrow);collectionHost.append(door);}
 const footer=document.querySelector('main footer');if(footer&&!footer.querySelector('[data-lattice]')){const link=document.createElement('a');link.dataset.lattice='true';link.href=BASE+'lattice/';link.textContent='One world · named doorways ◇';footer.append(link);}
 peachfallPanel();
}
let queued=false;const app=document.getElementById('app');new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}}).observe(app,{childList:true,subtree:true});enhance();
