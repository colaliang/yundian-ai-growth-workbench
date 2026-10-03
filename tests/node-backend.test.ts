import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FileWorkspace, createServer, STAGES } from '../server.ts';

function fixture(run:(store:FileWorkspace)=>void) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yundian-node-'));
  try { run(new FileWorkspace(root)); } finally { fs.rmSync(root,{recursive:true,force:true}); }
}
test('customer files survive initialization and restart; paths stay inside project',()=>fixture(store=>{
  const file=path.join(store.base,'knowledge/profile.md'); fs.writeFileSync(file,'客户原文');
  const again=new FileWorkspace(store.root); assert.equal(again.read(file),'客户原文');
  assert.deepEqual(again.load().workspace.stages,STAGES);
  assert.throws(()=>store.write(path.join(store.root,'../escape.md'),'bad'),/outside/);
}));
test('all nine skills, records, audits, feedback and result review persist',()=>fixture(store=>{
  const save=(action:string,payload:any={})=>store.save({revision:store.load().revision,action,payload});
  save('profile',{company:'测试工厂',goal:'真实获客'}); save('knowledge',{title:'产品',content:'客户资料',source:'客户文件'});
  save('install-skills'); assert.equal(store.load().skills.acquisition.status,'installed');
  for(const stage of STAGES) save('task',{stage,name:stage});
  assert.equal(store.load().tasks.length,9);
  save('record',{stage:'product-opportunity',name:'候选产品',source:'调研报告'});
  for(const platform of ['shopify','wordpress']) save('audit-create',{platform});
  const audits=store.load().audits; assert.equal(audits.find((x:any)=>x.platform==='shopify').items.length,38); assert.equal(audits.find((x:any)=>x.platform==='wordpress').items.length,26);
  const audit=audits[0]; assert.throws(()=>save('audit-item',{auditId:audit.id,itemId:audit.items[0].id,result:'通过'}),/证据/);
  save('audit-item',{auditId:audit.id,itemId:audit.items[0].id,result:'通过',evidence:'实际检查URL'});
  const task=store.load().tasks[0]; assert.throws(()=>save('review',{id:task.id,review:'验收'}),/产物/);
  save('artifact',{id:task.id,content:'真实产物'}); save('review',{id:task.id,review:'检查实际来源'});
  assert.equal(store.load().tasks.find((x:any)=>x.id===task.id).status,'completed');
  fs.appendFileSync(path.join(store.base,'artifacts',task.id+'.md'),'更新');
  assert.equal(store.load().tasks.find((x:any)=>x.id===task.id).status,'needs-review');
  save('feedback',{leadId:'L1',result:'有效',next:'优化'});
  const restart=new FileWorkspace(store.root).load(); assert.equal(restart.feedback.length,1); assert.equal(restart.records.length,1);
  const stale=restart.revision; save('record',{stage:'buyer-check',name:'公司',source:'官网'});
  assert.throws(()=>store.save({revision:stale,action:'install-skills'}),/刷新/);
  const installed=path.join(store.root,'.codebuddy/skills/yundian-growth-acquisition/SKILL.md'); fs.appendFileSync(installed,'客户定制');
  assert.throws(()=>save('install-skills'),/保留客户版本/); assert.match(fs.readFileSync(installed,'utf8'),/客户定制/);
}));
test('existing Python workspace and external skill result are readable',()=>fixture(store=>{
  const action=(action:string,payload:any)=>store.save({revision:store.load().revision,action,payload});
  action('profile',{company:'客户',goal:'获客'}); action('task',{stage:'market-research',name:'调研'});
  const task=store.load().tasks[0],file=path.join(store.root,'report.md'); fs.writeFileSync(file,'# 真实报告');
  execFileSync('python',['skills/yundian-growth-workbench/scripts/submit_result.py','--root',store.root,'--task',task.id,'--file',file]);
  assert.equal(store.load().tasks[0].status,'needs-review');
}));
test('HTTP API enforces host, origin, token and revision; static UI works',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yundian-http-')),store=new FileWorkspace(root);
  const probe=createServer(store,0); await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=(probe.address() as any).port; await new Promise<void>(resolve=>probe.close(()=>resolve()));
  const server=createServer(store,port); await new Promise<void>(resolve=>server.listen(port,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+port;
  try {
    assert.equal((await fetch(base+'/')).status,200);
    assert.deepEqual(await (await fetch(base+'/healthz')).json(),{ok:true});
    const badHost=await new Promise<number>(resolve=>http.get(base+'/api/state',{headers:{Host:'evil.test'}},res=>{res.resume();resolve(res.statusCode!);})); assert.equal(badHost,403);
    const state:any=await (await fetch(base+'/api/state')).json();
    const body=JSON.stringify({revision:state.revision,action:'profile',payload:{company:'客户',goal:'获客'}});
    assert.equal((await fetch(base+'/api/save',{method:'POST',body})).status,403);
    assert.equal((await fetch(base+'/api/save',{method:'POST',body,headers:{'X-Workspace-Token':state.token,Origin:'https://evil.test'}})).status,403);
    assert.equal((await fetch(base+'/api/save',{method:'POST',body,headers:{'X-Workspace-Token':state.token}})).status,200);
    assert.equal((await fetch(base+'/api/save',{method:'POST',body,headers:{'X-Workspace-Token':state.token}})).status,400);
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve())); fs.rmSync(root,{recursive:true,force:true}); }
});

test('WorkBuddy CLI creates data and Node skill writes real results without Python',()=>fixture(store=>{
  const input=path.join(store.root,'payload.json');
  const save=(action:string,payload:any={})=>{fs.writeFileSync(input,JSON.stringify(payload));return JSON.parse(execFileSync(process.execPath,['scripts/workbench.mjs','--root',store.root,'--command','save','--action',action,'--payload',input],{encoding:'utf8'}));};
  save('profile',{company:'CLI客户',goal:'获客'});save('install-skills');
  const state=save('task',{stage:'acquisition',name:'LinkedIn买家筛选',inputs:'客户ICP'}),task=state.tasks[0];
  assert.equal(task.skillId,'yundian-growth-acquisition');
  const report=path.join(store.root,'actual-report.md');fs.writeFileSync(report,'# 真实候选买家与来源');
  const script=path.join(store.root,'.codebuddy/skills/yundian-growth-workbench/scripts/submit_result.mjs');
  execFileSync(process.execPath,[script,'--root',store.root,'--task',task.id,'--file',report]);
  assert.equal(store.load().tasks[0].status,'needs-review');
  save('review',{id:task.id,review:'客户确认来源'});
  execFileSync(process.execPath,[script,'--root',store.root,'--task',task.id,'--status','needs-input','--reason','缺少授权名单']);
  assert.equal(store.load().tasks[0].status,'needs-input');assert.equal(store.load().tasks[0].reviewedHash,undefined);
  save('record',{stage:'buyer-check',name:'真实公司',source:'客户提供URL',leadId:'L1'});
  save('feedback',{leadId:'L1',result:'待跟进'});
  assert.equal(store.load().records.length,1);assert.equal(store.load().feedback.length,1);
  const old=store.load().revision;save('knowledge',{title:'新资料',content:'客户事实',source:'客户'});
  assert.throws(()=>execFileSync(process.execPath,['scripts/workbench.mjs','--root',store.root,'--command','save','--action','install-skills','--revision',old],{stdio:'pipe'}));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'yundian-outside-'));
  try {const external=path.join(outside,'payload.json');fs.writeFileSync(external,'{}');assert.throws(()=>execFileSync(process.execPath,['scripts/workbench.mjs','--root',store.root,'--command','save','--action','task','--payload',external],{stdio:'pipe'}));}finally{fs.rmSync(outside,{recursive:true,force:true});}
}));
