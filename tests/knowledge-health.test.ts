import {openFileWorkspace} from '../src/runtime/workspace.ts';
import {fixtureMutation} from './fixtures/coordinated-workspace.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileWorkspace} from '../server.ts';
import {summarizeKnowledgeHealth} from '../src/domain/knowledge-health.ts';
test('actual_files_confirmation_and_legacy_sync_copy',async ()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'knowledge-health-'));
 try {const store=(await openFileWorkspace(root));const target=path.join(store.base,'knowledge','legacy.md');fs.mkdirSync(path.dirname(target),{recursive:true});const bytes=Buffer.from('# Legacy\r\nhttps://example.org/evidence\r\n');fs.writeFileSync(target,bytes);
 let state=store.load();let health=summarizeKnowledgeHealth(state.knowledge,root,'now');assert.equal(health.files,state.knowledge.length);assert.equal(health.withoutRegisteredSource,state.knowledge.filter((x:any)=>!x.sources.some((s:string)=>s.trim())).length);assert.equal(health.confirmed,0);
 const entry=state.knowledge.find((x:any)=>x.path===path.join('knowledge','legacy.md'));await fixtureMutation(store.root,()=>store.confirmKnowledge(entry.path,entry.contentHash,state.revision));state=store.load();assert.equal(summarizeKnowledgeHealth(state.knowledge,root,'now').confirmed,1);assert.deepEqual(fs.readFileSync(target),bytes);fs.appendFileSync(target,'Changed');assert.equal(summarizeKnowledgeHealth(store.load().knowledge,root,'now').confirmed,0);
 assert.deepEqual(summarizeKnowledgeHealth([],root,'now'),{mode:'local',projectRoot:root,files:0,confirmed:0,pending:0,withoutRegisteredSource:0,checkedAt:'now'});
 const settings=fs.readFileSync(new URL('../web/views/settings.js',import.meta.url),'utf8');assert.doesNotMatch(settings,/sync-knowledge\.mjs|wb-public/);assert.match(settings,/knowledgeHealth/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

