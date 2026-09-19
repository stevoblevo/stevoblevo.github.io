'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const api = require('../anewgam-for-steven-cockpit/art-links.js');
const plate = require('../anewgam-for-steven-cockpit/art-arrival.js');
const routes = api.routes(plate), items = [plate];
test('native, relay and existing gallery resolve to exactly one existing identity', () => {
 for (const value of [routes.native, routes.relay, routes.gallery]) {
  assert.equal(api.resolve(value,items).id,plate.id); assert.equal(api.resolve(value,items).authorityEffect,'none');
 }
});
test('the co-submitted Grok source is NOT silently aliased to the uploaded image',()=>{
 assert.throws(()=>api.resolve(plate.art.sourceLinks[0].url,items),/bytes are not verified/);
});
test('unknown digest never opens the first or any other gallery image',()=>{
 assert.throws(()=>api.resolve('sae://art/sha256/'+'0'.repeat(64),items),/No matching/);
});
test('query, fragment, userinfo, alternate host, port, traversal and executable schemes fail closed',()=>{
 for(const value of [routes.native+'?run=1', routes.native+'#go', routes.relay+'?go=1', routes.relay.replace('https://','https://user:pass@'), routes.relay.replace('.co/','.co.evil/'), routes.relay.replace('.co/','.co:444/'), 'sae://art/../'+routes.sha256, 'javascript:alert(1)','data:text/html,hi','file:///etc/passwd', routes.native+'\n'])
  assert.throws(()=>api.resolve(value,items));
});
test('ambiguous digests and duplicate entries are refused',()=>{
 assert.throws(()=>api.resolve(routes.native,[plate,{...plate,id:'another'}]),/Ambiguous/);
});
test('invalid IDs/digests and oversized non-string input are rejected',()=>{
 assert.throws(()=>api.routes({...plate,id:'../private'}));assert.throws(()=>api.routes({id:'one',art:{originalSha256:'bad'}}));
 for(const x of [null,{},'x'.repeat(2049)])assert.throws(()=>api.resolve(x,items));
});
test('relationships require an existing target and retain their interpretation basis',()=>{
 assert.equal(api.related(plate,items).length,0);
 const r=api.related(plate,[plate,{id:'pf-06',title:'Existing plate'}]);
 assert.equal(r.length,1);assert.equal(r[0].type,'proposed-story');assert.match(r[0].basis,/not a character-identity/);
});
test('original byte verification accepts exact synthetic fixture and rejects same-size tampering',async()=>{
 const bytes=new Uint8Array([1,2,3]).buffer;
 const digest=crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
 const fixture={id:'fixture',art:{originalSha256:digest,originalBytes:3}};
 assert.equal(await api.verifyBytes(fixture,bytes,crypto.webcrypto.subtle),digest);
 await assert.rejects(api.verifyBytes(fixture,new Uint8Array([1,2,4]).buffer,crypto.webcrypto.subtle),/mismatch/);
 await assert.rejects(api.verifyBytes(fixture,new Uint8Array([1]).buffer,crypto.webcrypto.subtle),/Wrong original size/);
});
test('original and preview fingerprints remain distinct; source failure does not mint custody',()=>{
 assert.notEqual(plate.art.originalSha256,plate.art.previewSha256);
 assert.equal(plate.art.originalPublished,false);assert.equal(plate.art.sourceLinks[0].observedStatus,403);
});
