/* Closed, view-only postcard contract. No storage, network, identity or execution. */
(function(root){
 'use strict';
 const SCHEMA='magwena.peachfall.postcard.v1';
 function read(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Not a garden postcard.');
  const keys=Object.keys(value).sort().join(',');
  if(keys!=='permission,place,schema,showPeach,showReturnGreeting'||value.schema!==SCHEMA||value.place!=='meadow-gate'||value.permission!=='view-only'||typeof value.showPeach!=='boolean'||typeof value.showReturnGreeting!=='boolean')throw Error('Not a garden postcard.');
  return {schema:SCHEMA,place:'meadow-gate',showPeach:value.showPeach,showReturnGreeting:value.showReturnGreeting,permission:'view-only'};
 }
 function parse(text){
  if(typeof text!=='string'||text.length>2048)throw Error('Postcard exceeds its small, closed format.');
  const value=JSON.parse(text),card=read(value);
  // Accepted field names and string values contain no whitespace or escapes.
  // Require a lossless JSON round trip: duplicate keys and escaped spellings fail.
  if(text.replace(/\s/g,'')!==JSON.stringify(value))throw Error('Noncanonical or repeated postcard fields.');
  return card;
 }
 function fromCode(code){
  if(typeof code!=='string'||!/^pf1\.[01]{2}$/.test(code))throw Error('That is not a postcard address.');
  return {schema:SCHEMA,place:'meadow-gate',showPeach:code[4]==='1',showReturnGreeting:code[5]==='1',permission:'view-only'};
 }
 function toCode(value){const p=read(value);return 'pf1.'+Number(p.showPeach)+Number(p.showReturnGreeting);}
 const api=Object.freeze({SCHEMA,read,parse,fromCode,toCode});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MagwenaPostcard=api;
})(typeof globalThis!=='undefined'?globalThis:this);
