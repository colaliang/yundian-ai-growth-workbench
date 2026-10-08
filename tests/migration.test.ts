import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateWorkspace } from '../src/storage/migrate.ts';
import { FileWorkspace } from '../server.ts';
function fixture(run:(root:string,base:string)=>void) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-migration-'));
 const base=path.join(root,'growth-workspace'); fs.mkdirSync(path.join(base,'tasks'),{recursive:true});
 fs.writeFileSync(path.join(base,'workspace.json'),JSON.stringify({schemaVersion:3,workspaceId:'old-space',stages:['acquisition']}));
 try {run(root,base);} finally {fs.rmSync(root,{recursive:true,force:true});}
}
test('v0.15 history, drafts and pending verification survive; migration is idempotent',()=>fixture((root,base)=>{
 const task={id:'a'.repeat(32),stage:'acquisition',status:'ready',aiDraft:'历史 AI 草稿',verified:false};
 fs.writeFileSync(path.join(base,'tasks',task.id+'.json'),JSON.stringify(task));
 const before=fs.readFileSync(path.join(base,'tasks',task.id+'.json'),'utf8');
 const result=migrateWorkspace(root); assert.equal(result.changed,true); assert.equal(result.schemaVersion,3); assert.equal(result.contractVersion,2);
 assert.ok(result.backupPath); assert.equal(JSON.parse(fs.readFileSync(path.join(base,'workspace.json'),'utf8')).schemaVersion,3);
 assert.equal(fs.readFileSync(path.join(base,'tasks',task.id+'.json'),'utf8'),before);
 assert.equal(migrateWorkspace(root).changed,false);
 assert.equal(new FileWorkspace(root).load().workspace.schemaVersion,3);
}));
test('invalid legacy JSON leaves every original unchanged',()=>fixture((root,base)=>{
 const file=path.join(base,'workspace.json'),before=fs.readFileSync(file,'utf8');
 fs.writeFileSync(path.join(base,'tasks/broken.json'),'{invalid');
 assert.throws(()=>migrateWorkspace(root)); assert.equal(fs.readFileSync(file,'utf8'),before);
}));
test('outside artifact paths are rejected without rewriting workspace',()=>fixture((root,base)=>{
 const file=path.join(base,'workspace.json'),before=fs.readFileSync(file,'utf8');
 fs.writeFileSync(path.join(base,'tasks/escape.json'),JSON.stringify({id:'legacy',artifact:'../../escape.md'}));
 assert.throws(()=>migrateWorkspace(root),/outside/); assert.equal(fs.readFileSync(file,'utf8'),before);
}));
test('backup preserves binary files byte for byte and startup refuses corrupt history',()=>fixture((root,base)=>{
 const bytes=Buffer.from([0,255,254,128,1]); fs.mkdirSync(path.join(base,'artifacts'));fs.writeFileSync(path.join(base,'artifacts/image.png'),bytes);
 const result=migrateWorkspace(root);assert.ok(result.backupPath);assert.deepEqual(fs.readFileSync(path.join(result.backupPath,'artifacts/image.png')),bytes);
 fs.writeFileSync(path.join(base,'tasks/broken.json'),'{invalid');
 assert.throws(()=>new FileWorkspace(root)); assert.equal(fs.existsSync(path.join(base,'knowledge')),false);
}));
test('missing metadata with corrupt history leaves the entire directory tree unchanged',()=>fixture((root,base)=>{
 fs.unlinkSync(path.join(base,'workspace.json')); fs.writeFileSync(path.join(base,'tasks/broken.json'),'{invalid');
 const snapshot=(dir:string):unknown[]=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).map(entry=>entry.isDirectory()?{name:entry.name,children:snapshot(path.join(dir,entry.name))}:{name:entry.name,bytes:fs.readFileSync(path.join(dir,entry.name)).toString('hex')});
 const before=snapshot(root);assert.throws(()=>new FileWorkspace(root));assert.deepEqual(snapshot(root),before);
}));
