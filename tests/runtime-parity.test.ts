import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import * as runtime from '../server.ts';

test('runtime options preserve CLI and documented public environment flag',()=>{
 const parse=(runtime as any).parseRuntimeOptions;
 assert.equal(typeof parse,'function');
 for(const env of [{},{WORKBENCH_PUBLIC:'1'},{WORKBUDDY_PUBLIC:'1'}]) {
  assert.equal(parse(['--root','fixture','--public'],env).publicMode,true);
 }
 assert.equal(parse(['--root','fixture'],{}).publicMode,false);
 assert.equal(parse(['--root','fixture'],{WORKBUDDY_PUBLIC:'1'}).publicMode,false);
 assert.equal(parse(['--root','fixture'],{PORT:'9123'}).port,9123);
 assert.equal(parse(['--root','fixture','--port','9000'],{PORT:'9123'}).port,9000);
 assert.throws(()=>parse(['--root'],{}),/root/i);
 assert.throws(()=>parse(['--root','fixture','--port','0'],{}),/port/i);
});

test('state exposes runtime fields and KB baseline while local host protection stays enabled',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-runtime-'));
 const server=runtime.createServer(new runtime.FileWorkspace(tmp),0);
 try {
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=(server.address() as any).port;
  // createServer host checks the supplied port, so use the expected host header.
  const state=await new Promise<any>((resolve,reject)=>{http.get({hostname:'127.0.0.1',port,path:'/api/state',headers:{host:'127.0.0.1:0'}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{try {assert.equal(res.statusCode,200);resolve(JSON.parse(text));}catch(error){reject(error);}});}).on('error',reject);});
  assert.equal(state.projectRoot,tmp);
  assert.equal(typeof state.token,'string');
  assert.ok(Object.hasOwn(state,'cloud'));
  assert.ok(Object.hasOwn(state,'kbCheck'));
  assert.ok(['ok','drift','no-baseline'].includes(state.kbCheck.status));
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/state`,{headers:{host:'untrusted.test'}})).status,403);
 } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));fs.rmSync(tmp,{recursive:true,force:true});}
});

test('compiled JS entry launches locally and retains state and static modules',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-compiled-'));
 const reservation=http.createServer();
 await new Promise<void>(resolve=>reservation.listen(0,'127.0.0.1',resolve));
 const port=(reservation.address() as any).port;
 await new Promise<void>(resolve=>reservation.close(()=>resolve()));
 const env={...process.env};delete env.WORKBENCH_PUBLIC;delete env.WORKBUDDY_PUBLIC;
 const child=spawn(process.execPath,['server.js','--root',tmp,'--port',String(port)],{cwd:path.resolve(import.meta.dirname,'..'),env});
 try {
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Launch timeout')),5000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Early exit '+code));});child.stdout.once('data',()=>{clearTimeout(timer);resolve();});});
  const state=await (await fetch(`http://127.0.0.1:${port}/api/state`)).json();
  assert.equal(state.projectRoot,tmp);assert.equal(typeof state.token,'string');
  assert.ok(Object.hasOwn(state,'cloud'));assert.ok(Object.hasOwn(state,'kbCheck'));
  assert.equal((await fetch(`http://127.0.0.1:${port}/web/main.js`)).status,200);
 } finally {const closed=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill();await closed;fs.rmSync(tmp,{recursive:true,force:true});}
});
