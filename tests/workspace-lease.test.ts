import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';
import {withWorkspaceLease,inspectLease} from '../src/storage/lease.ts';
const roots:string[]=[];const children:ReturnType<typeof fork>[]=[];
function root(){const r=fs.mkdtempSync(path.join(os.tmpdir(),'lease-'));roots.push(r);return r;}
function child(r:string,purpose='write'){const c=fork(new URL('./fixtures/lease-child.mjs',import.meta.url),[r,purpose],{stdio:['ignore','ignore','inherit','ipc']});children.push(c);const messages:any[]=[];c.on('message',m=>messages.push(m));return {c,messages,next:(type:string)=>new Promise<any>((resolve,reject)=>{const found=messages.find(m=>m.type===type);if(found)return resolve(found);const blocked=messages.find(m=>m.type==='blocked');if(blocked&&type==='acquired')return reject(Error('child blocked: '+blocked.error));const timer=setTimeout(()=>reject(Error('IPC timeout '+type)),15000);const listener=(m:any)=>{if(m.type==='blocked'&&type==='acquired'){clearTimeout(timer);c.off('message',listener);reject(Error('child blocked: '+m.error));return;}if(m.type===type){clearTimeout(timer);c.off('message',listener);resolve(m);}};c.on('message',listener);})};}
test.after(()=>{for(const c of children)if(c.exitCode===null)c.kill('SIGKILL');for(const r of roots)fs.rmSync(r,{recursive:true,force:true});});
test('real_process_lease_scope and killed owner competing recovery',async()=>{
 const r=root(),a=child(r);await a.next('acquired');const b=child(r,'read'),c=child(r,'recovery');await Promise.all([b.next('observed-owner'),c.next('observed-owner')]);
 assert.equal(b.messages.some(x=>x.type==='acquired'),false);assert.equal(c.messages.some(x=>x.type==='acquired'),false);
 const exit=new Promise(resolve=>a.c.once('exit',resolve));a.c.kill('SIGKILL');await exit;
 const winner=await Promise.race([b.next('acquired').then(()=>b),c.next('acquired').then(()=>c)]);const loser=winner===b?c:b;
 assert.equal(loser.messages.some(x=>x.type==='acquired'),false);winner.c.send('release');await winner.next('released');await loser.next('acquired');loser.c.send('release');await loser.next('released');
});
test('different roots and reentrant canonical aliases',async()=>{await withWorkspaceLease(root(),'read',async a=>{await withWorkspaceLease(path.join(a.root,'.'),'write',b=>assert.equal(a,b));await withWorkspaceLease(root(),'recovery',b=>assert.notEqual(a.nonce,b.nonce));});});
test('alive stale, missing and foreign owner blocked; checked release',async()=>{
 const r=root();await withWorkspaceLease(r,'write',async()=>{const f=path.join(r,'.workbench-runtime/lock/owner.json');const owner=JSON.parse(fs.readFileSync(f,'utf8'));owner.createdAt='2000-01-01';fs.writeFileSync(f,JSON.stringify(owner));const c=child(r);await c.next('attempting');await c.next('blocked');});
 const lock=path.join(r,'.workbench-runtime/lock');fs.mkdirSync(lock);await assert.rejects(withWorkspaceLease(r,'read',()=>{}, {waitMs:0}),/blocked/);fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:999999,nonce:'foreign',hostname:'foreign'}));await assert.rejects(withWorkspaceLease(r,'read',()=>{}, {waitMs:0}),/blocked/);fs.rmSync(lock,{recursive:true});
 await assert.rejects(withWorkspaceLease(r,'write',lease=>{const f=path.join(lock,'owner.json');const o=JSON.parse(fs.readFileSync(f,'utf8'));o.nonce='wrong';fs.writeFileSync(f,JSON.stringify(o));}),/nonce/);assert.equal(inspectLease(r).status,'alive');
});
test('junction paths rejected without touching target',async()=>{const r=root(),target=root();fs.symlinkSync(target,path.join(r,'.workbench-runtime'),'junction');await assert.rejects(withWorkspaceLease(r,'write',()=>{}),/symlink|junction/);assert.deepEqual(fs.readdirSync(target),[]);});
test('wait options bounded',async()=>{for(const waitMs of [NaN,Infinity,-1,5001])await assert.rejects(withWorkspaceLease(root(),'read',()=>{}, {waitMs}),/waitMs/);});

test('EPERM and reused PID never reclaim',async()=>{
 const r=root();await withWorkspaceLease(r,'write',async()=>{
 const ownerFile=path.join(r,'.workbench-runtime/lock/owner.json');const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));owner.processIdentity='other-process-start';fs.writeFileSync(ownerFile,JSON.stringify(owner));
 // AsyncLocalStorage makes local calls reentrant, so assert denial in an actual child.
 const c=child(r);await c.next('attempting');await c.next('blocked');assert.equal(inspectLease(r).status,'blocked');
 const original=process.kill;process.kill=(()=>{throw Object.assign(Error('denied'),{code:'EPERM'});}) as typeof process.kill;
 try{assert.equal(inspectLease(r).status,'blocked');assert.equal(fs.readFileSync(ownerFile,'utf8'),JSON.stringify(owner));}finally{process.kill=original;}
 });
});

test('different customers acquire in actual children; descriptor preserved',async()=>{
 const r=root(),runtime=path.join(r,'.workbench-runtime');fs.mkdirSync(runtime);const descriptor='{"formatVersion":1,"sentinel":"A1"}';fs.writeFileSync(path.join(runtime,'instance.json'),descriptor);
 const a=child(r),b=child(root());await Promise.all([a.next('acquired'),b.next('acquired')]);a.c.send('release');b.c.send('release');await Promise.all([a.next('released'),b.next('released')]);assert.equal(fs.readFileSync(path.join(runtime,'instance.json'),'utf8'),descriptor);
});



test('entered nested callback drains after rejecting peer before physical release',async()=>{
 const r=root();let finish!:()=>void,rejectPeer!:(e:Error)=>void,entered!:()=>void,settled!:()=>void;
 const held=new Promise<void>(resolve=>finish=resolve),entry=new Promise<void>(resolve=>entered=resolve),callbackSettled=new Promise<void>(resolve=>settled=resolve);
 const peer=new Promise<never>((_,reject)=>rejectPeer=reject);let nestedDone=false;
 const outer=withWorkspaceLease(r,'write',async()=>{try{await Promise.all([withWorkspaceLease(r,'read',async()=>{await withWorkspaceLease(r,'recovery',async()=>{entered();await held;});nestedDone=true;}),peer]);}finally{settled();}});
 const outcome=outer.then(()=>null,e=>e);await entry;const contender=child(r);await contender.next('observed-owner');rejectPeer(Error('peer rejected'));await callbackSettled;
 try{contender.c.send('probe');const probe=await contender.next('probe');assert.equal(probe.status,'alive');assert.equal(contender.messages.some(m=>m.type==='acquired'),false);assert.equal(nestedDone,false);}finally{finish();}
 assert.match((await outcome).message,/peer rejected/);assert.equal(nestedDone,true);await contender.next('acquired');contender.c.send('release');await contender.next('released');
});
test('growth workspace junction rejected without leaving lock and safe subsequent acquire',async()=>{
 const r=root(),target=root();fs.mkdirSync(path.join(r,'.workbench-runtime'));fs.writeFileSync(path.join(target,'workspace.json'),'{"workspaceId":"external"}');const before=fs.readFileSync(path.join(target,'workspace.json'),'utf8');const link=path.join(r,'growth-workspace');fs.symlinkSync(target,link,'junction');
 await assert.rejects(withWorkspaceLease(r,'write',()=>{}),/junction|symlink/);assert.equal(fs.existsSync(path.join(r,'.workbench-runtime/lock')),false);assert.deepEqual(fs.readdirSync(path.join(r,'.workbench-runtime')),[]);assert.equal(fs.readFileSync(path.join(target,'workspace.json'),'utf8'),before);
 fs.unlinkSync(link);await withWorkspaceLease(r,'write',()=>{});assert.equal(inspectLease(r).status,'free');
});


test('complete foreign-host owner blocks even when PID absent',async()=>{
 const r=root();await withWorkspaceLease(r,'write',()=>{
 const file=path.join(r,'.workbench-runtime/lock/owner.json'),original=fs.readFileSync(file,'utf8'),owner=JSON.parse(original);
 fs.writeFileSync(file,JSON.stringify({...owner,pid:999999,hostname:os.hostname()+'-foreign'}));
 try{assert.equal(inspectLease(r).status,'blocked');}finally{fs.writeFileSync(file,original);}
 });
});


test('each nested invocation resolves only after entered grandchildren settle',async()=>{
 const r=root();let finish!:()=>void,parentReturned!:()=>void;
 const held=new Promise<void>(resolve=>finish=resolve),returned=new Promise<void>(resolve=>parentReturned=resolve);let commitMarker=false,grandchildDone=false;
 const operation=withWorkspaceLease(r,'write',async()=>{
  await withWorkspaceLease(r,'write',()=>{
   void withWorkspaceLease(r,'read',async()=>{await held;grandchildDone=true;});
   parentReturned();return 'parent result';
  });
  assert.equal(grandchildDone,true);commitMarker=true;
 });
 let operationSettled=false;const outcome=operation.then(()=>{operationSettled=true;return null;},error=>{operationSettled=true;return error;});
 await returned;await new Promise<void>(resolve=>setImmediate(resolve));
 try{assert.equal(operationSettled,false);assert.equal(commitMarker,false);}finally{finish();}
 assert.equal(await outcome,null);assert.equal(commitMarker,true);
});

