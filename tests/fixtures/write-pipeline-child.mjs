import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {channel} from 'node:diagnostics_channel';
const [mode,root,privateBase,arg='',compiled='source']=process.argv.slice(2);
const suffix=compiled==='compiled'?'js':'ts';
const {openFileWorkspace,runWorkspaceMutation,readWorkspaceSnapshot}=await import('../../src/runtime/workspace.'+suffix);
const {createServer}=await import('../../server.'+suffix);
const {ContentService}=await import('../../src/content/service.'+suffix);
const {PublicationService}=await import('../../src/publishing/service.'+suffix);
const send=value=>process.send?.(value);
try{
 if(mode==='kill-mutation'){
  await openFileWorkspace(root);channel('workbench.transaction.boundary').subscribe(metadata=>{if(metadata.phase===arg){send({event:'boundary',metadata});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});await runWorkspaceMutation(root,{},store=>store.save({action:'profile',payload:{company:'Committed after kill',goal:'Evidence'},revision:store.digest()}));send({event:'done'});process.disconnect();
 }else if(mode==='kill-open'){
  channel('workbench.transaction.boundary').subscribe(metadata=>{if(metadata.phase===arg){send({event:'boundary',metadata});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}});
  await openFileWorkspace(root);send({event:'done'});process.disconnect();
 }else if(mode==='hold'){
  await runWorkspaceMutation(root,{},async()=>{send({event:'held'});await new Promise(resolve=>process.once('message',resolve));});send({event:'done'});process.disconnect();
 }else if(mode==='server'){
  const store=await openFileWorkspace(root),probe=net.createServer();probe.listen(0,'127.0.0.1');await new Promise(resolve=>probe.once('listening',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));const server=createServer(store,port,{publicMode:false,privateBase});server.listen(port,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));send({event:'server',port});process.once('message',()=>{server.closeAllConnections();server.close(()=>process.disconnect());});
 }else if(mode==='publish-outcome'){
  const store=await openFileWorkspace(root),[itemId,confirmationId]=arg.split(':');
  const publisher={listChannels:async()=>[{id:'a',name:'A',platform:'facebook',isActive:true}],listMedia:async()=>[],getBalance:async()=>({balance:10}),createPost:async()=>({id:'post',status:'draft',scheduledAt:null,postChannels:[]}),publishPost:async()=>{send({event:'publishing'});await new Promise(resolve=>process.once('message',resolve));throw Error('old network response unresolved');},getPost:async()=>{throw Error('not used');}};const service=new PublicationService(store,()=>({publisher,secrets:{apiKey:'fixture',maxCreditsPerPost:1,maxCreditsPerDay:1}}));const result=await service.submitPublish(itemId,confirmationId);send({event:'done',result});process.disconnect();
 }else if(mode==='publish-kill'){
  const store=await openFileWorkspace(root),[itemId,confirmationId]=arg.split(':');
  const publisher={listChannels:async()=>[{id:'a',name:'A',platform:'facebook',isActive:true}],listMedia:async()=>[],getBalance:async()=>({balance:10}),createPost:async input=>{send({event:'network',input});await new Promise(()=>{});},publishPost:async()=>{throw Error('must not publish');},getPost:async()=>{throw Error('must not query without post');}};
  const service=new PublicationService(store,()=>({publisher,secrets:{apiKey:'fixture',maxCreditsPerPost:1,maxCreditsPerDay:1}}));await service.submitPublish(itemId,confirmationId);
 }
}catch(error){send({event:'error',message:String(error),stack:error.stack});process.exitCode=1;process.disconnect?.();}
