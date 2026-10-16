import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {loadUiContract} from '../src/navigation/ui-contract.ts';
import {MODULES} from '../src/navigation/modules.ts';
const root=path.resolve('.');
test('canonical_ui_and_generated_skill_brief_agree',()=>{
 const c=loadUiContract(root);
 assert.deepEqual(c.navigation.map(x=>x[0]),['overview','knowledge','skills','content-operations','crm','schedules','settings']);
 assert.deepEqual(c.promotionModuleIds,MODULES.filter(m=>m.id!=='content-operations').map(m=>m.id));
 assert.deepEqual(c.freeModuleIds,MODULES.filter(m=>m.free).map(m=>m.id));
 assert.equal(MODULES.length,13);assert.equal(MODULES.flatMap(m=>m.stages).length,15);
 assert.equal(spawnSync(process.execPath,['scripts/sync-workbench-contract.mjs','--check']).status,0);
});
test('unknown_ids_rejected_and_check_detects_drift_without_writing',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ui-contract-'));
 try {
  for(const file of ['config/workbench-ui.json','web/workbench-ui.js','skills/yundian-growth-workbench/references/BUILD_BRIEF.md','README.md','docs/module-workspace-guide.zh-CN.md']){fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(tmp,file));}
  const target=path.join(tmp,'web/workbench-ui.js');fs.appendFileSync(target,'// drift\n');const before=fs.readFileSync(target);
  assert.equal(spawnSync(process.execPath,['scripts/sync-workbench-contract.mjs','--check','--root',tmp]).status,1);assert.deepEqual(fs.readFileSync(target),before);
  const config=path.join(tmp,'config/workbench-ui.json');const c=JSON.parse(fs.readFileSync(config,'utf8'));c.promotionModuleIds[0]='unknown';fs.writeFileSync(config,JSON.stringify(c));assert.throws(()=>loadUiContract(tmp),/promotion/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('generation_preserves_manual_text_outside_markers',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ui-manual-'));
 try {
 for(const file of ['config/workbench-ui.json','web/workbench-ui.js','skills/yundian-growth-workbench/references/BUILD_BRIEF.md','README.md','docs/module-workspace-guide.zh-CN.md']){fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(tmp,file));}
 const file=path.join(tmp,'skills/yundian-growth-workbench/references/BUILD_BRIEF.md');const original=fs.readFileSync(file,'utf8');const before='Manual prefix\r\n'+original+'\r\nManual suffix\r\n';fs.writeFileSync(file,before.replace('一级导航：工作台','一级导航：漂移'));
 assert.equal(spawnSync(process.execPath,['scripts/sync-workbench-contract.mjs','--root',tmp]).status,0);assert.equal(fs.readFileSync(file,'utf8'),before);
 assert.equal(spawnSync(process.execPath,['scripts/sync-workbench-contract.mjs','--root',tmp,'--check']).status,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
