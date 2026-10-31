import * as THREE from './vendor/three.module.js?v=0.4.1';
import {mountTV} from '../tv.js?v=0.4.1';
const $=s=>document.querySelector(s),audio=$('#audio'),canvas=$('#world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const query=new URLSearchParams(location.search);
let quiet=reduced.matches||query.get('quiet')==='1',parked=true,seat='driver',captionOn=true,lookX=0,lookY=0,drag=null,ready=false,dirty=true,graphicsState='starting',software=false,quality='light',qualityChoice='auto',raf=0,slowFrames=0,frames=0,lastRenderMs=0,frameIntervals=[];
const budgets={light:{pixels:360000,fps:12,rain:120,hail:50},balanced:{pixels:1400000,fps:30,rain:420,hail:170}};
function graphicsFallback(message){ready=false;graphicsState='fallback';cancelAnimationFrame(raf);$('#loading').hidden=false;$('#loading-message').textContent=message;$('#reload').hidden=false;canvas.hidden=true;}
$('#reload').onclick=()=>location.reload();
const scene=new THREE.Scene();scene.background=new THREE.Color('#718e88');scene.fog=new THREE.FogExp2('#718e88',.027);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');software=!!debug&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));}catch(e){graphicsFallback('The 3D scene is unavailable in this browser. You can still play the radio below, or open the illustrated experience.');}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsFallback('The 3D scene paused after a graphics interruption. Your radio controls still work. Reload the scene or open the illustrated experience.');});
canvas.addEventListener('webglcontextrestored',()=>{graphicsState='starting';canvas.hidden=false;ready=false;dirty=true;applyQuality('light');raf=requestAnimationFrame(animate);});
const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.03,180);
const hemi=new THREE.HemisphereLight('#d4e3cb','#384333',1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d5',1.8);sun.position.set(-8,14,-12);scene.add(sun);
const cabinLight=new THREE.PointLight('#f9c47b',1.6,7,1.5);cabinLight.position.set(0,1.8,.8);scene.add(cabinLight);
const mats={};function mat(color){return mats[color]??=new THREE.MeshLambertMaterial({color,flatShading:true});}
const car=new THREE.Group(),land=new THREE.Group();scene.add(car,land);
function mesh(g,c,parent=car){const o=new THREE.Mesh(g,mat(c));parent.add(o);return o;}
function box(x,y,z,w,h,d,c,parent=car){const o=mesh(new THREE.BoxGeometry(w,h,d),c,parent);o.position.set(x,y,z);return o;}
function poly(v,c,parent=car){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return mesh(g,c,parent);}
function rod(a,b,r,c,parent=car,sides=6){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r,r,p.distanceTo(q),sides),c,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return o;}
function label(text,w,h,color='#e9ce9a',ground='#283d32',size=70){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle=ground;x.fillRect(0,0,512,256);x.fillStyle=color;x.font=`${size}px monospace`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,128);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));car.add(m);return m;}
// Folded sage shell, raised seams, kraft seats and a softly lit radio.
box(0,.14,.3,3.25,.16,4.9,'#4c6556');box(0,2.39,.1,3.38,.13,4.25,'#567464');
for(const x of [-1.61,1.61]){box(x,.74,.2,.13,1.12,4.6,'#6d8974');box(x,1.13,.3,.18,.09,4.5,'#adc0a0');box(x,1.38,.55,.16,.08,1.1,'#344d40');rod([x,1.19,-1.68],[x,2.34,-1.29],.085,'#a2b395');rod([x,1.2,1.3],[x,2.35,1.3],.07,'#9bad93');}
box(0,2.33,-1.32,3.3,.13,.12,'#9eaf91');box(0,1.18,-1.71,3.35,.12,.2,'#91a686');
box(0,1.05,-1.34,3.11,.35,.72,'#3d5546');const dash=box(0,1.24,-1.34,3.1,.12,.71,'#9a9f78');dash.rotation.x=-.08;
for(const x of [-1.2,1.2]){box(x,1.08,-.966,.38,.15,.025,'#253d32');for(let i=0;i<5;i++)box(x-.15+i*.075,1.08,-.944,.017,.12,.012,'#7d9277');}
box(.2,1.06,-.947,.83,.28,.06,'#c4b48a');const display=label('FM  ECCLESIASTES',.53,.12,'#fbd68a','#293f34',35);display.position.set(.2,1.09,-.907);
for(const x of [-.16,.56]){const k=mesh(new THREE.CylinderGeometry(.055,.06,.04,12),'#354c3d');k.rotation.x=Math.PI/2;k.position.set(x,1.02,-.89);}
const badge=label('RONCO',.58,.14,'#d5d1af','#4e6957',55);badge.position.set(1.05,1.11,-.955);
// A raised, faceted hood is visible through the open paper windshield.
poly([-1.55,1.15,-1.82, 0,1.26,-1.82, 0,.98,-4.1, -1.55,1.15,-1.82,0,.98,-4.1,-1.43,.91,-4.1],'#86a486');
poly([0,1.26,-1.82,1.55,1.15,-1.82,1.43,.91,-4.1,0,1.26,-1.82,1.43,.91,-4.1,0,.98,-4.1],'#6b8e73');
rod([0,1.263,-1.82],[0,.983,-4.1],.012,'#b3c1a0');
for(const x of [-.74,.74]){box(x,.59,.55,.99,.19,1.13,'#a49370');const back=box(x,1.05,1.03,.99,1.03,.18,'#b6a482');back.rotation.x=-.09;box(x,1.7,1.09,.52,.31,.14,'#bbaa86');for(let i=0;i<5;i++)box(x-.4+i*.2,1.03,.929,.016,.8,.014,'#8b896a');}
box(0,.64,1.92,2.7,.25,.76,'#9e9270');box(0,1.11,2.27,2.7,.85,.16,'#b4a480');
box(0,.64,.45,.37,.69,.88,'#50654d');rod([0,.92,.25],[.08,1.24,.11],.035,'#514d3b');mesh(new THREE.IcosahedronGeometry(.08,0),'#bca779').position.set(.08,1.24,.11);
const wheel=new THREE.Group();wheel.position.set(-.75,1.18,-.62);wheel.rotation.x=-.34;car.add(wheel);mesh(new THREE.TorusGeometry(.34,.034,5,14),'#b2a98a',wheel);mesh(new THREE.CylinderGeometry(.09,.09,.08,7),'#4c5c45',wheel).rotation.x=Math.PI/2;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([0,0,0],[Math.sin(a)*.32,Math.cos(a)*.32,0],.02,'#6f7e61',wheel);}
const gauges=label('0     40     80',.58,.18,'#ebd19a','#233d32',48);gauges.position.set(-.75,1.1,-.946);
// A small paper crane hangs under the mirror.
rod([.12,2.3,-1.1],[.12,1.81,-1.1],.006,'#d7c39b');box(.12,2.19,-1.1,.44,.15,.06,'#b3ae8a');box(.12,2.19,-1.061,.36,.1,.008,'#7a9891');
const crane=new THREE.Group();crane.position.set(.12,1.72,-1.1);car.add(crane);poly([0,0,0,-.2,.16,.04,-.04,.01,.09],'#c6d0ac',crane);poly([0,0,0,.2,.17,.02,.04,.01,.09],'#a3b897',crane);poly([0,0,0,.11,.03,-.03,.09,.12,-.03,0,0,0,.09,.12,-.03,.13,.11,-.03],'#d6d6b0',crane);
// Original stylized driver mesh, designed from the supplied reference cues.
const driver=new THREE.Group();driver.position.set(-.75,0,.45);car.add(driver);
const torso=box(0,1.13,0,.66,.71,.42,'#516e70',driver);torso.rotation.x=-.08;
for(let i=0;i<5;i++){box(-.3+i*.15,1.14,-.222,.045,.66,.012,i%2?'#9a8261':'#3c5056',driver);box(0,.86+i*.13,-.232,.62,.038,.014,'#9c8d6b',driver);}
for(const x of [-.2,.2]){box(x,.66,-.13,.26,.28,.71,'#394c4c',driver);rod([x,.65,-.39],[x,.28,-.79],.12,'#334548',driver);box(x,.23,-.85,.28,.15,.43,'#d7d4b7',driver);}
rod([-.29,1.31,-.03],[-.39,1.15,-.58],.115,'#5c7776',driver);rod([.29,1.31,-.03],[.28,1.15,-.58],.115,'#5c7776',driver);
for(const x of [-.38,.28])mesh(new THREE.IcosahedronGeometry(.105,0),'#d3b18a',driver).position.set(x,1.15,-.64);
const head=new THREE.Group();head.position.set(0,1.76,.01);driver.add(head);mesh(new THREE.IcosahedronGeometry(.27,1),'#d6b591',head).scale.set(.89,1.06,.86);
const beard=mesh(new THREE.IcosahedronGeometry(.23,0),'#715744',head);beard.position.set(0,-.11,-.105);beard.scale.set(1,.71,.75);
for(const x of [-.105,.105]){const glass=box(x,.025,-.228,.18,.105,.025,'#292f2c',head);box(x,.025,-.245,.125,.061,.006,'#78938c',head);}box(0,.025,-.251,.052,.018,.02,'#292f2c',head);
const nose=mesh(new THREE.ConeGeometry(.06,.11,4),'#bc9473',head);nose.rotation.x=-Math.PI/2;nose.position.set(0,-.025,-.28);
const hat=mesh(new THREE.IcosahedronGeometry(.3,0),'#8e7557',head);hat.position.y=.2;hat.scale.set(1,.4,.91);box(0,.159,-.2,.5,.045,.29,'#ac9370',head);
// Paper road, layered desert, folded vegetation. Motion is ambient, never a driving task.
box(0,-.08,-40,180,.1,180,'#8b9271',land);box(0,-.01,-40,5.8,.025,160,'#4a6862',land);
const moving=new THREE.Group();land.add(moving);
for(let i=0;i<25;i++){box(0,.014,-i*5,.09,.015,2.2,'#d5c9a1',moving);for(const x of [-2.85,2.85])box(x,.012,-i*5,.055,.015,5,'#a6b79b',moving);}
for(let i=0;i<24;i++){const side=i%2?-1:1,x=side*(7+(i*13%14)),z=-5-i*5;const hill=mesh(new THREE.ConeGeometry(5+i%5,3+i%4,4,1),'#a9a382',land);hill.position.set(x,1.4+i%4*.3,z);hill.rotation.y=i*.8;hill.scale.z=1.8;}
const shrubs=[];for(let i=0;i<24;i++){const g=new THREE.Group();g.position.set((i%2?-1:1)*(3.5+i%4),0,-3-i*4.2);land.add(g);g.userData.baseZ=g.position.z;for(let j=0;j<3;j++){const leaf=mesh(new THREE.ConeGeometry(.3,.85,3),'#8f9b75',g);leaf.position.set((j-1)*.2,.4,0);leaf.rotation.z=(j-1)*.55;}shrubs.push(g);}
const clouds=new THREE.Group();scene.add(clouds);for(let i=0;i<10;i++){const cl=mesh(new THREE.IcosahedronGeometry(5,0),'#b9c3ad',clouds);cl.scale.set(2,.3,1);cl.position.set((i%3-1)*16,12+i%2*3,-20-i*10);}
// Weather stays outside the cabin; no camera flashes or simulated cracked glass.
const rainCount=innerWidth<650?220:420,rainPos=new Float32Array(rainCount*6),rainSeed=[];
for(let i=0;i<rainCount;i++){rainSeed.push({x:(Math.random()-.5)*25,y:Math.random()*12,z:-2-Math.random()*55});}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#deebd5',transparent:true,opacity:.4}));scene.add(rain);
const hailCount=innerWidth<650?90:170,hail=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.048,0),mat('#e1e1c7'),hailCount),hailSeed=[];scene.add(hail);hail.visible=false;const dummy=new THREE.Object3D();for(let i=0;i<hailCount;i++)hailSeed.push({x:(Math.random()-.5)*17,y:Math.random()*9,z:-2.1-Math.random()*28,phase:Math.random()});
const wipers=[];for(const x of [-.72,.72]){const pivot=new THREE.Group();pivot.position.set(x,1.23,-1.72);car.add(pivot);rod([0,0,0],[0,.65,0],.016,'#30483a',pivot);rod([-.08,.65,0],[.08,.65,0],.022,'#223f31',pivot);wipers.push(pivot);}
// Batch static paper by material, retaining independent camera/driver/weather groups.
function batch(root,skip=[]){root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),byMaterial=new Map();function scan(o){if(skip.includes(o))return;if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));const a=byMaterial.get(o.material)||[];a.push({o,g});byMaterial.set(o.material,a);}for(const c of [...o.children])scan(c);}for(const c of [...root.children])scan(c);for(const [material,items] of byMaterial){if(items.length<2)continue;const geometry=new THREE.BufferGeometry();for(const key of ['position','normal','uv']){if(!items.every(x=>x.g.attributes[key]))continue;const arrays=items.map(x=>x.g.attributes[key].array),out=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){out.set(a,offset);offset+=a.length;}geometry.setAttribute(key,new THREE.BufferAttribute(out,items[0].g.attributes[key].itemSize));}for(const {o,g} of items){o.removeFromParent();g.dispose();}root.add(new THREE.Mesh(geometry,material));}}
for(const shrub of shrubs)batch(shrub);batch(driver);batch(car,[driver,crane,...wipers]);batch(moving);batch(land,[moving,...shrubs]);batch(clouds);
const views={driver:{p:new THREE.Vector3(-.72,1.82,.47),t:new THREE.Vector3(-.13,1.32,-5)},passenger:{p:new THREE.Vector3(.91,1.81,.62),t:new THREE.Vector3(-.55,1.3,-3.6)},rear:{p:new THREE.Vector3(.34,1.91,2.03),t:new THREE.Vector3(-.2,1.4,-4)}};
camera.position.copy(views.driver.p);let target=views.driver.t.clone();
function announce(t){$('#status').textContent=t;}function setSeat(s){if(!views[s])return;dirty=true;seat=s;lookX=lookY=0;driver.visible=s!=='driver';document.querySelectorAll('[data-seat]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.seat===s)));if(quiet){camera.position.copy(views[s].p);target.copy(views[s].t);}announce(`${s==='rear'?'Back':s} seat view.`);}
document.querySelectorAll('[data-seat]').forEach(b=>b.onclick=()=>setSeat(b.dataset.seat));
function syncQuiet(){dirty=true;if(!quiet)slowFrames=0;if(quiet)parked=true;$('#quiet').setAttribute('aria-pressed',String(quiet));$('#travel').setAttribute('aria-pressed',String(parked));$('#travel').textContent=parked?'Parked':'Slow ride';}
$('#quiet').onclick=()=>{quiet=!quiet;syncQuiet();};reduced.addEventListener('change',e=>{quiet=e.matches;syncQuiet();});$('#travel').onclick=()=>{if(quiet){announce('Turn off quiet motion to start the slow ride.');return;}parked=!parked;syncQuiet();};
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;dirty=true;lookX=THREE.MathUtils.clamp(lookX-(e.clientX-drag.x)*.006,-1.2,1.2);lookY=THREE.MathUtils.clamp(lookY+(e.clientY-drag.y)*.004,-.5,.5);drag={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||$('#about').open)return;if(['1','2','3'].includes(e.key)){setSeat(['driver','passenger','rear'][+e.key-1]);}if(e.key===' '&&e.target===document.body){e.preventDefault();$('#play').click();}});
let context,weatherGain;function weatherAudio(){if(context)return;context=new AudioContext();const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.65;const source=context.createBufferSource();source.buffer=buffer;source.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;weatherGain=context.createGain();weatherGain.gain.value=0;source.connect(filter).connect(weatherGain).connect(context.destination);source.start();}
function duck(){if(weatherGain)weatherGain.gain.setTargetAtTime((+$('#mix').value/100)*(audio.paused?.13:.035),context.currentTime,.3);}
$('#mix').oninput=()=>{weatherAudio();context.resume();duck();};
async function toggle(){try{if(audio.paused){await audio.play();}else audio.pause();}catch{announce('Use the native recording player in “The story behind it”.');$('#about').showModal();}}
$('#play').onclick=toggle;$('#restart').onclick=()=>{audio.currentTime=3.5;audio.play().catch(()=>announce('Press play to hear the storm story.'));};$('#seek').oninput=()=>audio.currentTime=+$('#seek').value;
audio.addEventListener('play',()=>{$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Pause original recording');$('#on-air').textContent='ON AIR';$('#on-air').classList.add('active');duck();});audio.addEventListener('pause',()=>{$('#play').textContent='▶';$('#play').setAttribute('aria-label','Play original sermon excerpts');$('#on-air').textContent='OFF AIR';$('#on-air').classList.remove('active');duck();});
const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
audio.addEventListener('timeupdate',()=>{const t=audio.currentTime;if((t>=3.72&&t<37.6)!==hail.visible)dirty=true;$('#elapsed').textContent=time(t);$('#seek').value=t;const c=window.SERMON.captions.find(c=>t>=c.start&&t<c.end);$('#caption').hidden=!captionOn||!c;$('#caption-text').textContent=c?.text||'';});
$('#captions').onclick=()=>{captionOn=!captionOn;$('#captions').textContent=captionOn?'CC on':'CC off';$('#captions').setAttribute('aria-pressed',String(captionOn));if(!captionOn)$('#caption').hidden=true;};
$('#about-open').onclick=()=>$('#about').showModal();$('#about-close').onclick=()=>$('#about').close();$('#about').addEventListener('close',()=>$('#about-open').focus());const fallback=$('#about audio');fallback.addEventListener('play',()=>audio.pause());audio.addEventListener('play',()=>fallback.pause());
mountTV({audio,canvas,title:'Rain on paper · Malachi’s radio'});
function applyQuality(value){quality=value;dirty=true;const b=budgets[value];renderer?.setPixelRatio(Math.min(devicePixelRatio,1.5,Math.sqrt(b.pixels/(innerWidth*innerHeight))));renderer?.setSize(innerWidth,innerHeight);rainGeo.setDrawRange(0,Math.min(b.rain,rainCount)*2);hail.count=Math.min(b.hail,hailCount);}
$('#quality').onchange=()=>{qualityChoice=$('#quality').value;applyQuality(qualityChoice==='auto'?(software?'light':'balanced'):qualityChoice);};
function resize(){dirty=true;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyQuality(quality);}addEventListener('resize',resize);resize();setSeat(query.get('seat')||'driver');syncQuiet();
let last=performance.now(),elapsed=0,distance=0,lastFrame=0;
function animate(now){if(graphicsState==='fallback'||!renderer)return;raf=requestAnimationFrame(animate);if(document.hidden){last=now;return;}if(quiet&&ready&&!dirty)return;const interval=now-lastFrame;if(interval<1000/budgets[quality].fps)return;const dt=Math.min((now-last)/1000,.1);last=lastFrame=now;if(!quiet)elapsed+=dt;
 if(!quiet&&frames>2){frameIntervals.push(interval);if(frameIntervals.length>60)frameIntervals.shift();if(interval>250)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>=5&&quality==='balanced'){qualityChoice='auto';$('#quality').value='auto';applyQuality('light');slowFrames=0;}if(slowFrames>=8&&quality==='light'){quiet=true;syncQuiet();$('#scene-note').textContent='Motion paused to keep your radio responsive.';announce('Motion paused for performance. All seats and audio remain available.');}}

 const t=audio.currentTime,storm=t>=3.72&&t<37.6,intensity=storm?(t>=12.95&&t<20.76?1:.65):.12;hail.visible=storm;
 if(!parked&&!quiet){distance+=dt*2.7;moving.position.z=distance%5;shrubs.forEach(g=>g.position.z=((g.userData.baseZ+distance+105)%105)-105);}
 const v=views[seat];camera.position.lerp(v.p,quiet?1:Math.min(1,dt*4));target.lerp(v.t,quiet?1:Math.min(1,dt*4));const look=target.clone();look.x+=lookX*3;look.y+=lookY*3;camera.lookAt(look);
 wipers.forEach((w,i)=>w.rotation.z=quiet?-.55:Math.sin(elapsed*(storm?3.2:1.4)+i*.15)*.8);crane.rotation.z=quiet?0:Math.sin(elapsed*.7)*.035;
 rainSeed.forEach((p,i)=>{const y=quiet?p.y:((p.y-elapsed*(5+intensity*4))%12+12)%12;rainPos.set([p.x,y,p.z,p.x-.07,y-.45,p.z+.035],i*6);});rainGeo.attributes.position.needsUpdate=true;
 if(storm)hailSeed.forEach((p,i)=>{const y=quiet?p.y:((p.y-elapsed*8)%9+9)%9;dummy.position.set(p.x,y,p.z);dummy.rotation.set(elapsed+p.phase,0,p.phase);dummy.updateMatrix();hail.setMatrixAt(i,dummy.matrix);});hail.instanceMatrix.needsUpdate=true;
 shrubs.forEach((p,i)=>p.rotation.z=quiet?0:Math.sin(elapsed*2+i)*.035*intensity);
 const cue=storm?'The hailstorm story · original 0:42–1:16':t>37.6?'The weather becomes a question.':'An imagined ride, grounded in the original sermon.';if($('#cue').textContent!==cue)$('#cue').textContent=cue;
 const start=performance.now();try{renderer.render(scene,camera);}catch{graphicsFallback('The 3D scene could not finish drawing. The radio and illustrated experience remain available.');return;}lastRenderMs=performance.now()-start;frames++;dirty=false;if(!ready){ready=true;graphicsState='ready';$('#loading').hidden=true;}if(frames===6&&qualityChoice==='auto'&&!software&&frameIntervals.every(n=>n<120))applyQuality('balanced');
}
if(renderer&&graphicsState!=='fallback')raf=requestAnimationFrame(animate);
window.paperRide={setSeat,state:()=>({ready,seat,quiet,parked,time:audio.currentTime,playing:!audio.paused,frames,graphicsState,software,quality,qualityChoice,budget:budgets[quality],pixels:renderer?renderer.domElement.width*renderer.domElement.height:0,lastRenderMs,averageIntervalMs:frameIntervals.length?frameIntervals.reduce((a,b)=>a+b,0)/frameIntervals.length:null,triangles:renderer?.info.render.triangles,calls:renderer?.info.render.calls,three:THREE.REVISION,hail:hail.visible,weatherMix:+$('#mix').value}),seek:t=>{audio.currentTime=t;dirty=true;},loseContext:()=>renderer?.forceContextLoss()};
