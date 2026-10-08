import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileWorkspace} from '../server.ts';
import {migrateWorkspace} from '../src/storage/migrate.ts';
import {spawnSync} from 'node:child_process';
const temporary=(run:(root:string)=>void)=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'integration-'));try{run(root);}finally{fs.rmSync(root,{recursive:true,force:true});}};
test('blank customer knowledge to invocation, real receipt, review, feedback and next cycle',()=>temporary(root=>{
 const s=new FileWorkspace(root);const save=(action:string,payload:any)=>s.save({action,payload,revision:s.load().revision});
 save('profile',{company:'Test factory',products:'Test component',markets:'Test market',persona:'Test buyer',goal:'Test inquiry'});
 save('knowledge',{title:'Customer fact',content:'Customer supplied fact',source:'isolated integration fixture'});
 const t=s.createTask({stage:'acquisition',name:'Verify fixture buyer',cycleId:'cycle-7'},s.load().revision);
 const revision=s.load().revision;assert.ok(s.load().tasks[0].invocation.includes(t.id));assert.equal(s.load().revision,revision);assert.equal(t.status,'ready');
 fs.writeFileSync(path.join(root,'result.md'),'Actual isolated fixture output');
 s.applyReceipt(t.id,{receiptId:'fixture-receipt',taskId:t.id,workspaceId:t.workspaceId,skillVersion:t.skillVersion,executor:'WorkBuddy',status:'needs-review',artifacts:[{path:'result.md',sources:['isolated fixture']}]},s.load().revision);
 const a=s.load().artifacts[0];assert.equal(fs.readFileSync(path.resolve(root,a.path),'utf8'),'Actual isolated fixture output');
 s.reviewArtifact(t.id,a.contentHash,'accepted','Fixture explicit customer acceptance',s.load().revision,a.id);
 save('feedback',{leadId:'fixture-lead',cycleId:'cycle-7',result:'Fixture refusal',reason:'Fixture delivery issue',source:'isolated fixture',next:'Verify delivery constraint'});
 const suggestion=s.load().dailyActions.find((row:any)=>row.id.startsWith('feedback:'));save('daily-create',{id:suggestion.id});
 const restored=new FileWorkspace(root);assert.equal(restored.load().tasks.length,2);assert.equal(restored.load().tasks.find((row:any)=>row.id!==t.id).cycleId,'cycle-7');assert.equal(restored.load().tasks.find((row:any)=>row.id===t.id).status,'completed');
}));
test('migration readback and repeated installs retain custom bytes',()=>temporary(root=>{
 const base=path.join(root,'growth-workspace');fs.mkdirSync(path.join(base,'tasks'),{recursive:true});fs.writeFileSync(path.join(base,'workspace.json'),JSON.stringify({schemaVersion:3,workspaceId:'fixture-legacy'}));
 fs.writeFileSync(path.join(base,'tasks/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json'),JSON.stringify({id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',stage:'seo-geo',status:'ready',aiDraft:'historical draft',verified:false}));
 assert.equal(migrateWorkspace(root).changed,true);const s=new FileWorkspace(root);assert.equal(s.load().tasks[0].aiDraft,'historical draft');s.install();s.install();
 const custom=path.join(root,'.codebuddy/skills/yundian-growth-seo/SKILL.md');fs.writeFileSync(custom,'Customer custom bytes');assert.throws(()=>s.install(),/保留客户版本/);assert.equal(fs.readFileSync(custom,'utf8'),'Customer custom bytes');
}));
test('packaging entrypoint produces a real ZIP and manifest in an isolated output',()=>temporary(root=>{
 const result=spawnSync(process.execPath,['scripts/package-skills.mjs','--output',root],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));assert.equal(manifest.releaseVersion,'0.15.0');assert.equal(manifest.buildLabel,'working-tree');assert.ok(manifest.skills.length>=17);
 for(const item of manifest.packages){const file=fs.readFileSync(path.join(root,item.file));assert.equal(file.readUInt32LE(0),0x04034b50);assert.ok(item.sha256);}
 assert.equal(manifest.aliases['seo-geo'],'yundian-growth-seo-geo');
}));
