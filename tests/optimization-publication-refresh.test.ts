import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore browser native module
import {mountPublicationResults} from '../web/views/content-plan.js';
// @ts-ignore browser native module
import {api} from '../web/api.js';
const attempt={id:'unknown-attempt',itemId:'item',status:'unknown',postId:'remote-known-id',reservedCredits:1,actualCredits:null,channelIds:['c'],results:[{channelId:'c',status:'unknown'}]};
for(const failed of [false,true])test('actual publication refresh handler '+(failed?'failure':'success')+' reenables button without resending',async()=>{
 const original=api.request,calls:string[]=[];let current:any;
 const note:any={textContent:'',dataset:{},setAttribute(){}};
 const host:any={set innerHTML(_html:string){current={disabled:false,dataset:{publishRefresh:attempt.id},onclick:null};},querySelectorAll:()=>[current],querySelector:()=>note};
 api.request=async(path:string)=>{calls.push(path);if(path.endsWith('/refresh')){if(failed)throw Error('fixture query unavailable');return {revision:'updated'};}return path==='/api/content/items'?{items:[{id:'item'}]}:{attempts:[attempt],revision:'initial'};};
 try{await mountPublicationResults(host,{moduleId:'content-operations',tasks:[],token:'fixture-token',onRevision(){}});const clicked=current;const pending=clicked.onclick();assert.equal(clicked.disabled,true);await pending;assert.equal(clicked.disabled,false);assert.equal(current.disabled,false);if(failed)assert.match(note.textContent,/fixture query unavailable/);assert.equal(calls.filter(p=>p.endsWith('/refresh')).length,1);assert.ok(calls.every(p=>p==='/api/content/items'||p==='/api/publisher/attempts'||p==='/api/publisher/attempts/'+attempt.id+'/refresh'));}
 finally{api.request=original;}
});
