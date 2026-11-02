const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../src/z-cover-gate.js'),'utf8');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/grok-cover-gate.txt'),'utf8');
if(code.trim()!==fixture.split('function T(x)',1)[0].trim())throw Error('Provider function changed');
vm.runInNewContext(fixture,Object.create(null),{timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});
// Provider text was inspected first: only pure reducer and synthetic assertions.
const ctx=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
vm.runInContext(code,ctx,{timeout:1000});
const tests=`
let n=0;function ok(x){n++;if(!x)throw Error('check '+n)}
let a=coverGate(undefined,{});ok(!a.playing&&!a.eligible&&!a.revealed);
let b=coverGate(a,{type:'select',id:'own',allowed:true});
ok(!b.playing&&!b.eligible&&!b.revealed&&b.allowed);
let p=coverGate(b,{type:'play'});ok(p.playing&&!b.playing);
let e=coverGate(p,{type:'check',predicate:()=>true});ok(e.eligible&&!e.revealed&&e.playing);
let v=coverGate(e,{type:'reveal'});ok(v.revealed);
let z=coverGate(v,{type:'pause'});ok(!z.playing&&z.revealed);
let r=coverGate(v,{type:'select',id:'own',allowed:true});ok(!r.playing&&!r.eligible&&!r.revealed);
for(let predicate of [undefined,()=>1,()=>false,()=>{throw Error('x')}]){let l=coverGate(v,{type:'check',predicate});ok(!l.eligible&&!l.revealed)}
for(let allowed of [false,undefined,1,'true']){let d=coverGate(v,{type:'select',id:'youtube',allowed});d=coverGate(d,{type:'play'});d=coverGate(d,{type:'check',predicate:()=>true});d=coverGate(d,{type:'reveal'});ok(!d.allowed&&!d.playing&&!d.eligible&&!d.revealed)}
let frozen=Object.freeze({...b});let event=Object.freeze({type:'play'});ok(coverGate(frozen,event).playing);ok(!frozen.playing);
ok(coverGate(v,{type:'unknown'})===v);
let facts=Object.freeze({yes:true});ok(coverGate(b,{type:'check',facts,predicate:x=>x.yes}).eligible);
n`;
const checks=vm.runInContext(tests,ctx,{timeout:1000});
console.log(JSON.stringify({status:'pass',provider_assertions:'pass',independent_checks:checks,code_bytes:Buffer.byteLength(code.trimEnd()),isolation:'empty VM context, dynamic code disabled, timeouts; no network APIs supplied to reducer context',scope:'provider-preserved source candidate; no browser/audio integration'}));
