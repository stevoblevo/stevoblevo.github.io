const W=720,H=420;
const RUINS=[[118,92,46,86],[312,268,58,40],[508,78,42,120],[248,148,28,28],[572,248,70,36]];
const GHOST_KEY='anewgam-signal-run-ghost-v1';
const DB='anewgam-goober-v1';
const ROOT='0'.repeat(64);
const canvas=document.getElementById('field');
const ctx=canvas.getContext('2d');
const keys=new Set();
let pointer=null,running=false,paused=false,raf=0;
let x=180,y=230,vx=0,vy=0,elapsed=0,last=0,pulse=0;
let score=0,combo=0,comboMax=0,clean=0,hits=0,lanterns=0;
let target={x:520,y:210,kind:'spark'};
const trail=[],crumbs=[],ghostPath=[];
let ghost=[];
try{ghost=JSON.parse(localStorage.getItem(GHOST_KEY)||'[]');}catch{ghost=[];}

function $(id){return document.getElementById(id);}
function hud(){
  $('hud-score').textContent=score+' signals';
  $('hud-time').textContent=Math.max(0,Math.ceil(45-elapsed))+'s';
  const el=$('hud-combo');
  if(combo>1){el.textContent='COMBO ×'+combo;el.className='hot';}
  else{el.textContent='FIND YOUR LINE';el.className='';}
}

function hitRuin(px,py){
  for(const [rx,ry,rw,rh] of RUINS){
    if(px>rx-16&&px<rx+rw+16&&py>ry-16&&py<ry+rh+16)return [rx,ry,rw,rh];
  }
  return null;
}
function placeTarget(kind){
  for(let n=0;n<24;n++){
    const nx=70+Math.random()*580,ny=70+Math.random()*280;
    if(Math.hypot(nx-x,ny-y)<90)continue;
    if(hitRuin(nx,ny))continue;
    target={x:nx,y:ny,kind};return;
  }
  target={x:360,y:200,kind};
}
function bounce(){
  combo=0;hits++;hud();
  const ruin=hitRuin(x,y);
  if(ruin){
    const [rx,ry,rw,rh]=ruin,cx=rx+rw/2,cy=ry+rh/2,dx=x-cx,dy=y-cy;
    if(Math.abs(dx/rw)>Math.abs(dy/rh))vx*=-.62;else vy*=-.62;
    x+=Math.sign(dx||1)*10;y+=Math.sign(dy||1)*10;
  }
}
function draw(){
  ctx.fillStyle='#10131c';ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(target.x,target.y,10,360,210,420);
  g.addColorStop(0,'rgba(234,195,125,0.07)');g.addColorStop(1,'#10131c');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#24303c';ctx.lineWidth=1;
  for(let i=0;i<W;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke();}
  for(let j=0;j<H;j+=40){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(W,j);ctx.stroke();}
  ctx.strokeStyle='#7d6a4b';ctx.lineWidth=3;ctx.strokeRect(16,16,688,388);
  for(const [rx,ry,rw,rh] of RUINS){
    ctx.fillStyle='#1c2430';ctx.fillRect(rx,ry,rw,rh);
    ctx.strokeStyle='#4a3d55';ctx.lineWidth=2;ctx.strokeRect(rx+.5,ry+.5,rw,rh);
    ctx.fillStyle='rgba(234,195,125,0.12)';ctx.fillRect(rx+6,ry+6,8,8);
  }
  ghost.forEach((p,i)=>{ctx.fillStyle=`rgba(182,147,244,${.06+i/Math.max(ghost.length,1)*.12})`;ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,7);ctx.fill();});
  trail.forEach((p,i)=>{ctx.fillStyle=`rgba(217,197,143,${i/Math.max(trail.length,1)*.34})`;ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fill();});
  crumbs.forEach(p=>{ctx.fillStyle=`rgba(182,147,244,${p.life})`;ctx.beginPath();ctx.arc(p.x,p.y,2.4,0,7);ctx.fill();});
  ctx.strokeStyle='rgba(234,195,125,0.28)';ctx.lineWidth=1.5;ctx.setLineDash([6,8]);
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);
  const glow=1+Math.sin(pulse)*0.18;
  ctx.strokeStyle=target.kind==='lantern'?'#b693f4':'#eac37d';
  ctx.lineWidth=3;ctx.beginPath();ctx.arc(target.x,target.y,18*glow,0,7);ctx.stroke();
  ctx.beginPath();ctx.arc(target.x,target.y,5,0,7);ctx.stroke();
  if(target.kind==='lantern'){ctx.fillStyle='rgba(182,147,244,0.18)';ctx.beginPath();ctx.arc(target.x,target.y,28*glow,0,7);ctx.fill();}
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(vy,vx)||0);
  ctx.fillStyle='#f3eee6';ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-12,-10);ctx.lineTo(-6,0);ctx.lineTo(-12,10);ctx.closePath();ctx.fill();
  ctx.restore();
}
function tick(now){
  const step=last?Math.max(0,(now-last)/1000):0;
  const dt=Math.min(step,.05);last=now;pulse+=dt*6;
  if(running&&!paused){
    elapsed+=step;
    let ax=0,ay=0;
    if(keys.has('ArrowLeft')||keys.has('a'))ax--;
    if(keys.has('ArrowRight')||keys.has('d'))ax++;
    if(keys.has('ArrowUp')||keys.has('w'))ay--;
    if(keys.has('ArrowDown')||keys.has('s'))ay++;
    if(pointer){const dx=pointer.x-x,dy=pointer.y-y,len=Math.hypot(dx,dy)||1;ax+=dx/len;ay+=dy/len;}
    const boost=keys.has(' ')?2.05:1;
    const length=Math.hypot(ax,ay)||1;
    if(ax||ay||pointer){vx+=(ax/length)*400*boost*dt;vy+(ay/length)*400*boost*dt;vx+=(ax/length)*400*boost*dt;vy+=(ay/length)*400*boost*dt;}
    const drag=Math.pow(keys.has('Shift')?.16:.42,dt);
    vx*=drag;vy*=drag;x+=vx*dt;y+=vy*dt;
    if(x<30||x>690){vx*=-.65;x=Math.max(30,Math.min(690,x));bounce();}
    if(y<30||y>390){vy*=-.65;y=Math.max(30,Math.min(390,y));bounce();}
    if(hitRuin(x,y))bounce();
    trail.push({x,y});if(trail.length>36)trail.shift();
    if(!ghostPath.length||Math.hypot(x-ghostPath[ghostPath.length-1].x,y-ghostPath[ghostPath.length-1].y)>14)ghostPath.push({x,y});
    crumbs.forEach(p=>p.life-=dt*1.4);
    for(let i=crumbs.length-1;i>=0;i--)if(crumbs[i].life<=0)crumbs.splice(i,1);
    if(Math.hypot(x-target.x,y-target.y)<28){
      const lantern=target.kind==='lantern';
      score+=lantern?2+Math.min(combo,4):1;
      if(lantern)lanterns++;
      combo++;if(combo>comboMax)comboMax=combo;
      if(combo>=2)clean++;
      const steps=6;
      for(let i=1;i<=steps;i++)crumbs.push({x:x+(target.x-x)*i/(steps+1),y:y+(target.y-y)*i/(steps+1),life:1});
      placeTarget(combo>0&&combo%4===0?'lantern':'spark');
      hud();
    }
    hud();
    if(elapsed>=45)finish();
  }
  draw();
  raf=requestAnimationFrame(tick);
}
function reset(){
  x=180;y=230;vx=0;vy=0;elapsed=0;last=0;score=0;combo=0;comboMax=0;clean=0;hits=0;lanterns=0;
  trail.length=0;crumbs.length=0;ghostPath.length=0;target={x:520,y:210,kind:'spark'};
  $('line').textContent='Collect gold signals. Keep a clean line through the ruins. Drag to steer.';
  $('start').textContent='Start 45-second run \u2197';
  $('status').textContent='';
  hud();
}
function start(){
  reset();running=true;paused=false;last=performance.now();canvas.focus();
  $('start').style.display='none';
}
async function finish(){
  running=false;
  $('start').style.display='inline-block';
  $('start').textContent='Run it back \u2197';
  $('line').textContent=score+' signals \u00b7 clean '+clean+' \u00b7 combo '+comboMax+' \u00b7 lanterns '+lanterns+'. Local report only.';
  try{if(ghostPath.length>8)localStorage.setItem(GHOST_KEY,JSON.stringify(ghostPath.slice(-80)));}catch{}
  ghost=ghostPath.slice(-80);
  await keepLog();
}
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
async function digest(value){
  const bytes=new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function openDB(){return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>r.result.createObjectStore('log');
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(Error('Browser storage is unavailable.'));
});}
async function loadEntries(){
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{const r=db.transaction('log').objectStore('log').get('entries');r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
  finally{db.close();}
}
async function keepLog(){
  try{
    const current=await loadEntries();
    const previous=current.at(-1)?.hash||ROOT;
    const unsigned={
      kind:'practice',state:'completed',
      title:'Signal Run \u00b7 '+score+' signals',
      body:'A 45-second Crossing run. '+score+' signals, '+lanterns+' lanterns, clean '+clean+', best combo '+comboMax+', wall hits '+hits+'. Local report, not a competitive result.',
      why:'Play can be part of the record, too.',
      next_proof:clean>=3?'Hold the line one collect longer.':'Find a cleaner line next time.',
      source:'anewgam:signal-run',
      id:crypto.randomUUID(),created_at:new Date().toISOString(),
      scope:'device-local',authority:'none',acceptance:'self-reported',previous
    };
    const entry={...unsigned,hash:await digest(canonical(unsigned))};
    const next=[...current,entry];
    const db=await openDB();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('log','readwrite');
        tx.objectStore('log').put(next,'entries');
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
      });
    }finally{db.close();}
    $('status').textContent='Kept in this browser\u2019s Crossing field log. Open Field log to see it.';
  }catch(err){
    $('status').textContent='Run finished. Could not keep it in the field log: '+(err&&err.message?err.message:'storage blocked')+'.';
  }
}
function toLocal(e){
  const box=canvas.getBoundingClientRect();
  return {x:(e.clientX-box.left)*(W/box.width),y:(e.clientY-box.top)*(H/box.height)};
}
document.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','Shift'].includes(e.key)){e.preventDefault();keys.add(e.key);}
});
document.addEventListener('keyup',e=>keys.delete(e.key));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&running){paused=true;$('line').textContent='Paused while this tab is hidden.';}
  else if(running){paused=false;last=performance.now();$('line').textContent='Collect gold signals. Keep a clean line through the ruins.';}
});
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointer=toLocal(e);});
canvas.addEventListener('pointermove',e=>{if(pointer)pointer=toLocal(e);});
canvas.addEventListener('pointerup',()=>{pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;});
document.querySelectorAll('.touch-controls button').forEach(btn=>{
  const key=btn.getAttribute('data-key');
  btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(key);});
  btn.addEventListener('pointerup',()=>keys.delete(key));
  btn.addEventListener('pointercancel',()=>keys.delete(key));
});
$('start').addEventListener('click',start);
hud();draw();raf=requestAnimationFrame(tick);
