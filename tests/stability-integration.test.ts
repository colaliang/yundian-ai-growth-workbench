import net from 'node:net';
import test from 'node:test';
import assert from 'node:assert/strict';
const validatorPath='../scripts/validate-skill-packages.mjs';
const {validateSkillPackages}=await import(validatorPath);
import path from 'node:path';
test('working-tree skill delivery matches current sources and complete registry',()=>{
 const result=validateSkillPackages(path.resolve('dist/skills-working-tree'));
 assert.equal(result.skills,17);assert.equal(result.packages,18);assert.ok(result.files>17);
});

import fs from 'node:fs';import os from 'node:os';import {execFile,fork} from 'node:child_process';import {promisify} from 'node:util';import {once} from 'node:events';
const execute=promisify(execFile);
test('compiled instance_transaction_bundle_receipt restores separate destination and recovers killed write',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-integration-')),source=path.join(root,'a'),target=path.join(root,'b'),privateBase=path.join(root,'fake-private');fs.mkdirSync(source);fs.mkdirSync(target);
 const cli=async(customer:string,command:string,args:string[]=[])=>JSON.parse((await execute(process.execPath,['scripts/workbench-compiled.mjs','--root',customer,'--private-base',privateBase,'--command',command,...args],{maxBuffer:8*1024*1024,timeout:300000})).stdout);
 let child:any;
 try{
 const original=await cli(source,'runtime-status');assert.equal((await cli(source,'runtime-status')).instanceId,original.instanceId);
 const knowledge=path.join(source,'growth-workspace/knowledge/e2.md');fs.writeFileSync(knowledge,'# Evidence\r\nSynthetic verified bytes\r\n');const binary=path.join(source,'growth-workspace/knowledge/e2.bin');fs.writeFileSync(binary,Buffer.from([0,1,255,13,10]));fs.mkdirSync(path.join(source,'.codebuddy/skills/custom'),{recursive:true});fs.writeFileSync(path.join(source,'.codebuddy/skills/custom/SKILL.md'),'customer-owned fixture');
 child=fork('tests/fixtures/write-pipeline-child.mjs',['kill-mutation',source,privateBase,'prepared','compiled'],{stdio:['ignore','pipe','pipe','ipc']});
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Compiled transaction boundary missing')),30000);child.on('message',(m:any)=>{if(m.event==='boundary'){clearTimeout(timer);resolve();}if(m.event==='error'){clearTimeout(timer);reject(Error(m.message));}});child.once('exit',()=>{clearTimeout(timer);reject(Error('Child exited before boundary'));});});const exited=once(child,'exit');child.kill('SIGKILL');const killed=await exited;assert.equal(killed[1],'SIGKILL');
 const modules=await Promise.all(['../src/runtime/workspace.js','../server.js','../src/crm/lead-record.js'].map(p=>import(p)));const {openFileWorkspace,runWorkspaceMutation}=modules[0],{createServer}=modules[1],{LeadRecordService}=modules[2];
 const store=await openFileWorkspace(source);await runWorkspaceMutation(source,{},(s:any)=>{const records=new LeadRecordService(s);for(let i=0;i<21;i++)records.create({company:{create:{name:'E2 company '+i,source:'fixture'}},contacts:[],lead:{source:'fixture'}});s.write(path.join(source,'result.md'),'E2 actual synthetic receipt bytes\n');});
 const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=(probe.address() as any).port;await new Promise<void>(r=>probe.close(()=>r()));const server=createServer(store,port,{publicMode:false,privateBase,legacyPrivateBase:path.join(root,'fake-legacy')});server.listen(port,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{let state:any=await(await fetch(base+'/api/state?crm=summary')).json();const get=async()=>state=await(await fetch(base+'/api/state?crm=summary')).json(),post=(route:string,body:any)=>fetch(base+route,{method:'POST',headers:{'content-type':'application/json','x-workspace-token':state.token},body:JSON.stringify({revision:state.revision,workspaceId:state.workspace.workspaceId,...body})});assert.equal(state.crm.leadCount,21);assert.equal(state.crm.leads.length,0);
 const response=await post('/api/crm/query',{filter:{source:'fixture'},page:1,pageSize:20});assert.equal(response.status,200);const first:any=await response.json();assert.equal(first.rows.length,20);assert.equal(first.total,21);const second:any=await(await post('/api/crm/query',{filter:{source:'fixture'},page:2,pageSize:20})).json();assert.equal(second.rows.length,1);assert.equal(second.scopeId,first.scopeId);
 const csv=await post('/api/crm/export',{filter:{source:'fixture'},mode:'selected',ids:[first.rows[0].lead.id,second.rows[0].lead.id],scopeId:first.scopeId,fields:['companyName']});assert.equal(csv.status,200);assert.equal((await csv.text()).split('\r\n').length,4);assert.equal((await post('/api/crm/funnel',{filter:{source:'fixture'},from:'2026-01-01',to:'2027-01-01'})).status,200);assert.equal((await post('/api/crm/query',{filter:{},revision:'stale'})).status,409);
 assert.equal((await post('/api/tasks',{payload:{stage:'market-research',name:'E2 receipt'}})).status,200);await get();const task=state.tasks[0];const receipt={receiptId:'e2-receipt',taskId:task.id,workspaceId:state.workspace.workspaceId,skillVersion:task.skillVersion,executor:'manual',status:'needs-review',artifacts:[{path:'result.md',summary:'Synthetic actual file',sources:[],gaps:[],nextSteps:[]}]};assert.equal((await post('/api/tasks/'+task.id+'/receipts',{receipt})).status,200);await get();assert.equal((await post('/api/tasks/'+task.id+'/reviews',{artifactId:state.artifacts[0].id,contentHash:state.artifacts[0].contentHash,decision:'accepted',evidence:'Actual fixture bytes reviewed'})).status,200);await get();assert.equal(state.tasks[0].status,'completed');assert.equal((await post('/api/save',{action:'feedback',payload:{leadId:first.rows[0].lead.id,source:'synthetic customer',result:'qualified',reason:'Owned fixture',next:'Review next cycle',cycleId:'cycle-e2'}})).status,200);await get();assert.equal(state.feedback.at(-1).next,'Review next cycle');assert.equal((await post('/api/tasks',{payload:{stage:'next-cycle',name:'E2 next cycle from actual feedback',inputs:JSON.stringify(state.feedback.at(-1))}})).status,200);await get();assert.ok(state.tasks.some((t:any)=>t.name==='E2 next cycle from actual feedback'));
 const k=state.knowledge.find((k:any)=>k.path.replaceAll('\\','/').endsWith('e2.md'));assert.ok(k);assert.equal((await post('/api/knowledge/confirm',{path:k.path,contentHash:k.contentHash})).status,200);await get();assert.equal(state.knowledge.find((entry:any)=>entry.path===k.path)?.reviewStatus,'confirmed');
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}

 const [{ContentService},{PublicationService}]=await Promise.all(['../src/content/service.js','../src/publishing/service.js'].map(p=>import(p)));const content=new ContentService(store);const item=await runWorkspaceMutation(source,{},()=>{const row=content.create({title:'E2 immutable',text:'immutable synthetic payload',channelIds:['fixture-channel']});return content.approve(row.id,row.contentHash);});let captured:any;const publisher={listChannels:async()=>[{id:'fixture-channel',name:'Fixture',platform:'facebook',isActive:true}],listMedia:async()=>[],getBalance:async()=>({balance:10}),createPost:async(input:any)=>{captured=structuredClone(input);throw Error('Synthetic mock outcome unknown');},publishPost:async()=>{throw Error('No provider');},getPost:async()=>{throw Error('No provider');}};const publications=new PublicationService(store,()=>({publisher,secrets:{apiKey:'synthetic-not-a-secret',maxCreditsPerPost:1,maxCreditsPerDay:1}}));const confirmation=await publications.preparePublish(item.id,{channelIds:['fixture-channel'],mode:'immediate',plannedAt:null});await publications.submitPublish(item.id,confirmation.id);const attempt=publications.listAttempts()[0];assert.deepEqual(attempt.submittedPayload,captured);assert.equal(captured.content,'immutable synthetic payload');

 const backup=await cli(source,'backup-full-export');assert.match(fs.readFileSync(path.join(source,'growth-workspace/workbench.json'),'utf8'),/Committed after kill/);
 fs.mkdirSync(path.join(target,'growth-workspace'));fs.copyFileSync(path.join(source,'growth-workspace/workspace.json'),path.join(target,'growth-workspace/workspace.json'));
 const preview=await cli(target,'backup-full-restore',['--directory',backup.directory]),targetIdentity=await cli(target,'runtime-status');assert.notEqual(targetIdentity.instanceId,original.instanceId);
 await cli(target,'backup-full-restore',['--directory',backup.directory,'--confirm','--fingerprint',preview.fingerprint]);assert.equal((await cli(target,'runtime-status')).instanceId,targetIdentity.instanceId);
 const restored=await openFileWorkspace(target);assert.deepEqual(new PublicationService(restored,()=>null).listAttempts()[0].submittedPayload,captured);
 for(const relative of ['growth-workspace/knowledge/e2.md','growth-workspace/knowledge/e2.bin','.codebuddy/skills/custom/SKILL.md'])assert.deepEqual(fs.readFileSync(path.join(target,relative)),fs.readFileSync(path.join(source,relative)));
 const manifest=path.join(backup.directory,'manifest.json'),saved=fs.readFileSync(manifest),bad=JSON.parse(saved.toString());bad.workspaceId='wrong-scope';fs.writeFileSync(manifest,JSON.stringify(bad));const before=businessTree(target);await assert.rejects(cli(target,'backup-full-restore',['--directory',backup.directory]));assert.deepEqual(businessTree(target),before);fs.writeFileSync(manifest,saved);
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill('SIGKILL');await done;}fs.rmSync(root,{recursive:true,force:true});}
});


function businessTree(root:string){const rows:Record<string,string>={};const walk=(dir:string)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.workbench-runtime','.workbench-backups'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory()){rows[path.relative(root,f)+'/']='<directory>';walk(f);}else if(e.isFile())rows[path.relative(root,f)]=fs.readFileSync(f).toString('base64');}};walk(root);return rows;}


import crypto from 'node:crypto';
test('delivery rejects corrupted ZIP even when outer package SHA is updated',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-zip-corruption-'));try{fs.cpSync('dist/skills-working-tree',root,{recursive:true});const mf=path.join(root,'manifest.json'),m=JSON.parse(fs.readFileSync(mf,'utf8')),p=m.packages[0],zip=path.join(root,p.file),bytes=fs.readFileSync(zip),start=30+bytes.readUInt16LE(26)+bytes.readUInt16LE(28);bytes[start]^=1;fs.writeFileSync(zip,bytes);p.sha256=crypto.createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(mf,JSON.stringify(m));assert.throws(()=>validateSkillPackages(root),/CRC/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});


for(const attack of ['duplicate-source-row','duplicate-package-identity','central-offset'])test('delivery rejects '+attack,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e2-package-attack-'));try{fs.cpSync('dist/skills-working-tree',root,{recursive:true});const file=path.join(root,'manifest.json'),m=JSON.parse(fs.readFileSync(file,'utf8'));
 if(attack==='duplicate-source-row'){const s=m.skills.find((s:any)=>s.files.length>1);s.files[1]=structuredClone(s.files[0]);}
 if(attack==='duplicate-package-identity'){m.packages[1].skillId=m.packages[0].skillId;}
 if(attack==='central-offset'){const p=m.packages[0],f=path.join(root,p.file),b=fs.readFileSync(f);let offset=0;while(b.readUInt32LE(offset)===0x04034b50)offset+=30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28)+b.readUInt32LE(offset+18);b.writeUInt32LE(999999,offset+42);fs.writeFileSync(f,b);p.sha256=crypto.createHash('sha256').update(b).digest('hex');}
 fs.writeFileSync(file,JSON.stringify(m));assert.throws(()=>validateSkillPackages(root));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

