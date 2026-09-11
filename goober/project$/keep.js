import {choosePicture,makeDraft,keepInExistingLog} from './keep-core.js';
import {append,load,verify} from './saedow-store.js';
const byId=id=>document.getElementById(id),form=byId('keep-form'),status=byId('status'),submit=byId('keep-submit');
let picture=null,busy=false,dirty=false,ready=false;
const store={append,load,verify};
function fields(){const d=new FormData(form);return {title:d.get('title'),note:d.get('note'),why:d.get('why'),next:d.get('next'),kind:d.get('kind')};}
form.addEventListener('input',()=>{dirty=true;byId('result').hidden=true;if(ready&&!busy){submit.disabled=false;submit.textContent='Keep with this project';}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!ready||busy||!picture)return;let draft;try{draft=makeDraft(fields(),picture);}catch(error){status.textContent=error.message;return;}busy=true;submit.disabled=true;for(const control of form.querySelectorAll('input,textarea,select'))control.disabled=true;status.textContent='Keeping this thread in your existing field log…';
 try{
  const result=await keepInExistingLog(draft,store);
  dirty=false;byId('saved-hash').textContent=result.entry.hash;byId('result').hidden=false;byId('result').dataset.entryId=result.entry.id;
  status.textContent=result.reused?'This exact thread is already in your field log. No duplicate was added.':'Kept in your field log. The picture, why it matters, and your next step stay together.';
  submit.textContent='Kept ✓';byId('result-title').focus();
 }catch(error){status.textContent=(error instanceof Error?error.message:'Could not save.')+' Your text is still here.';submit.disabled=false;}
 finally{busy=false;for(const control of form.querySelectorAll('input,textarea,select'))control.disabled=false;}
});
try{
 const response=await fetch('../gallery/catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('The public picture catalog could not be opened.');
 picture=choosePicture(await response.json(),location.search);
 byId('picture').src=picture.thumbnail;byId('picture').alt=picture.title;byId('picture-title').textContent=picture.title;byId('picture-description').textContent=picture.description;byId('picture-link').href=picture.link;byId('original-link').href=picture.original;
 byId('source-type').textContent=picture.publicCrop?'Public crop · complete source remains private':'Selected public artwork / source';
 byId('title').value=picture.title+' · keep the thread';byId('source-hash').textContent=picture.hash;
 await verify(await load());ready=true;submit.disabled=false;status.textContent='Nothing has been saved yet. Add why this matters, then choose Keep with this project.';document.body.dataset.keepReady='true';
}catch(error){status.textContent=error instanceof Error?error.message:'This project could not be opened.';byId('picture-block').hidden=true;submit.disabled=true;document.body.dataset.keepReady='error';}
