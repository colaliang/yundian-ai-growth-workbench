import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSkills, buildInvocation } from '../src/skills/catalog.ts';
import { FileWorkspace } from '../server.ts';
const app=process.cwd();
test('enabled official skills resolve real entrypoints and explicit contracts',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'skills-'));try {
 const skills=loadSkills(app,root);for(const stage of ['seo','geo','social-media','facebook-ads','google-ads','email-outreach'])assert.ok(skills.some(s=>s.stage===stage));
 for(const skill of skills){assert.ok(fs.existsSync(skill.entry));assert.ok(skill.version);assert.ok(skill.inputs.length&&skill.outputs.length&&skill.acceptance.length);}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('customer variant is selectable without replacing official definition',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'skills-'));try{
 const dir=path.join(root,'.codebuddy/skills/yundian-growth-seo');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'SKILL.md'),'---\nname: yundian-growth-seo\ndescription: Customer SEO\n---\nCustom instructions');
 const list=loadSkills(app,root).filter(s=>s.skillId==='yundian-growth-seo');assert.equal(list.length,2);assert.ok(list.find(s=>s.origin==='official')!.entry.startsWith(app));assert.equal(list.find(s=>s.origin==='customer')!.version,'customer-'+list.find(s=>s.origin==='customer')!.contentHash.slice(0,12));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('expanded tasks persist real invocation identity paths and version',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'skills-'));try{
 const store=new FileWorkspace(root);let state=store.load();state=store.save({revision:state.revision,action:'profile',payload:{company:'Fixture',goal:'Inquiry'}});
 state=store.save({revision:state.revision,action:'task',payload:{stage:'seo',name:'Audit',inputs:'https://example.test',skillOrigin:'official'}});const task=state.tasks[0];assert.ok(task.skillVersion);assert.ok(task.inputSnapshotRef);
 const skill=loadSkills(app,root).find(s=>s.skillId===task.skillId&&s.origin==='official')!;const command=buildInvocation(skill,task,state.workspace);for(const text of [task.id,skill.skillId,skill.version,'https://example.test',root,'submit_result.mjs','--task','needs-review'])assert.ok(command.includes(text),text);
 assert.equal(store.load().tasks[0].stage,'seo');assert.equal(store.load().tasks[0].invocation,command);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('all dedicated stages and customer selection retain pending execution and custom bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'skills-'));try{
 const store=new FileWorkspace(root);const custom=path.join(root,'.codebuddy/skills/yundian-growth-seo/SKILL.md');fs.mkdirSync(path.dirname(custom),{recursive:true});fs.writeFileSync(custom,'---\nname: yundian-growth-seo\ndescription: Customer SEO\n---\nCustomer workflow');
 let state=store.load();state=store.save({revision:state.revision,action:'profile',payload:{company:'Fixture',goal:'Inquiry'}});
 for(const stage of ['seo','geo','social-media','facebook-ads','google-ads','email-outreach'])state=store.save({revision:state.revision,action:'task',payload:{stage,name:stage,inputs:'actual fixture input',skillOrigin:stage==='seo'?'customer':'official'}});
 assert.equal(state.tasks.length,6);assert.ok(state.tasks.every((t:any)=>t.status==='ready'));
 const task=state.tasks.find((t:any)=>t.stage==='seo');assert.equal(task.skillPath,custom);assert.match(task.skillVersion,/^customer-/);assert.ok(task.invocation.includes(custom));
 assert.throws(()=>store.save({revision:state.revision,action:'install-skills'}),/保留客户版本/);assert.match(fs.readFileSync(custom,'utf8'),/Customer workflow/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
