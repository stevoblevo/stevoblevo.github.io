/** $aveBambi local slice: preserve context, never execute it or create another work queue. */
export const PROJECT='saelion://anewgam/goober';
const ORIGIN='https://stevoblevo.github.io';
const ROOTS=['/goober/assets/','/goober/learn/','/peachfall/source/images/'];
export function sourcePath(path){
 if(typeof path!=='string'||path.length>800||!path.startsWith('/')||path.startsWith('//')||/[\\?#%]/.test(path)||path.split('/').includes('..'))throw Error('This source is not a permitted public image.');
 const url=new URL(path,ORIGIN);if(url.origin!==ORIGIN||!ROOTS.some(root=>url.pathname.startsWith(root)))throw Error('This source is not a permitted public image.');return path;
}
export function choosePicture(catalog,query=''){
 if(!catalog||!Array.isArray(catalog.items)||catalog.items.length>500)throw Error('The public picture catalog is unavailable.');
 const params=new URLSearchParams(query);if(params.getAll('project').length>1||(params.has('project')&&params.get('project')!=='goober'))throw Error('This page is scoped to Goober’s project.');if(params.getAll('picture').length>1)throw Error('Choose one picture, not several conflicting references.');
 const id=params.get('picture')??'smell-device-reference';
 if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id))throw Error('That picture reference is not supported.');
 const matching=catalog.items.filter(a=>a?.id===id);if(matching.length!==1)throw Error('That picture is not in this public collection. No other image has been substituted.');
 const item=matching[0];if(typeof item.title!=='string'||item.title.length>500||typeof item.description!=='string'||!/^[0-9a-f]{64}$/.test(item.original_sha256))throw Error('The source record is incomplete.');
 return Object.freeze({id:item.id,title:item.title,description:item.description,original:sourcePath(item.original_url),thumbnail:sourcePath(item.thumbnail_url),hash:item.original_sha256,publicCrop:item.public_derivative===true,link:ORIGIN+'/goober/gallery/#'+item.id});
}
const THREADS=Object.freeze({
 path:Object.freeze({id:'path',title:'Tower thread · Leave a path',note:'I chose to mark a route the next player can recognize.',why:'Discovery becomes history when the choice is deliberately kept.',next:'Continue Peachfall and look for a trace another player could inherit.'}),
 seam:Object.freeze({id:'seam',title:'Tower thread · Mend a seam',note:'I chose to repair one broken connection and name what changed.',why:'A mended seam lets the world remember how separate pieces became one path.',next:'Name the connection, then test whether the next player can follow it.'}),
 tool:Object.freeze({id:'tool',title:'Tower thread · Shape a tool',note:'I chose to shape one useful thing the next player can inherit.',why:'A tool turns one player’s answer into another player’s possibility.',next:'Make the smallest version and leave one clue for how to use it.'})
});
export function chooseThread(query=''){
 const params=new URLSearchParams(query);if(params.getAll('thread').length>1)throw Error('Choose one Tower thread, not several conflicting choices.');
 const id=params.get('thread');if(id===null)return null;if(!Object.hasOwn(THREADS,id))throw Error('That Tower thread is not supported.');return THREADS[id];
}
function field(value,max,label,required=false){if(typeof value!=='string'||value.length>max)throw Error(label+' is too long or invalid.');const clean=value.trim();if(required&&!clean)throw Error('Add '+label.toLowerCase()+' before keeping this thread.');return clean;}
export function makeDraft(values,picture){
 const title=field(values.title,600,'Title',true),note=field(values.note,6000,'Note'),why=field(values.why,600,'Why it matters',true),next=field(values.next,600,'Next step');
 if(!['note','idea','request'].includes(values.kind))throw Error('Choose a supported kind of note.');
 if(!picture||typeof picture.id!=='string'||!/^[a-f0-9]{64}$/.test(picture.hash))throw Error('The selected picture is unavailable.');
 return {kind:values.kind,state:values.kind==='idea'?'imagined':values.kind==='request'?'candidate':'explored',title,body:[note,'Reference: '+picture.title,picture.link,'Source SHA-256: '+picture.hash,'Kept with Goober’s project; not an instruction sent to an agent.'].filter(Boolean).join('\n\n'),why,next_proof:next,source:'saelion://art/sha256/'+picture.hash};
}
export function sameDraft(entry,draft){return ['kind','state','title','body','why','next_proof','source'].every(key=>entry[key]===draft[key]);}
/** Uses the existing append-only field log. Sequential exact retries reuse a receipt. */
export async function keepInExistingLog(draft,store){
 const entries=await store.verify(await store.load());
 const previous=entries.find(e=>sameDraft(e,draft));if(previous)return {entry:previous,reused:true};
 const next=await store.append(draft);return {entry:next.at(-1),reused:false};
}
