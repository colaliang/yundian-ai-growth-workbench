import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openFileWorkspace,runWorkspaceMutation,readWorkspaceSnapshot} from '../src/runtime/workspace.ts';
import {loadKnowledgeMetadata,saveKnowledgeMetadata,knowledgeDetails} from '../src/domain/knowledge-metadata.ts';
import {createSnapshot,restoreSnapshot,validateSnapshot} from '../src/backup/service.ts';
import {exportFullBackup,previewFullRestore} from '../src/backup/bundle.ts';
import {resolveInstance} from '../src/runtime/instance.ts';
import crypto from 'node:crypto';
const tree=(root:string):string=>{const rows:string[]=[];function walk(dir:string){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.workbench-runtime')continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.isFile())rows.push(path.relative(root,f)+':'+hash(fs.readFileSync(f)));}}walk(root);return rows.sort().join('\n');};
const hash=(b:Buffer)=>crypto.createHash('sha256').update(b).digest('hex');
test('metadata_preserves_facts_and_scope',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-knowledge-'));
 try{
 const store=await openFileWorkspace(root);const w=store.load().workspace.workspaceId;
 const put=(relative:string,body:string)=>{const f=path.join(store.base,relative);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,body);return f;};
 const a=put('knowledge/a/same.md','# A\r\n来源：旧来源\r\n'),b=put('knowledge/b/same.md','# B\n');
 let state=store.load();assert.equal(state.knowledge.filter((x:any)=>x.path.replaceAll('\\','/').endsWith('/same.md')).length,2);
 const entry=state.knowledge.find((x:any)=>x.title.trim()==='A');await runWorkspaceMutation(root,{},()=>store.confirmKnowledge(entry.path,entry.contentHash,state.revision));
 const original=fs.readFileSync(a),confirmation=fs.readFileSync(store.files('knowledge-confirmations','.json')[0]);
 const input={workspaceId:w,path:'knowledge/a/same.md',category:'company',sourceLinks:['https://example.test/source'],attachments:[{path:'assets/missing.pdf'},{url:'https://example.test/file'}]};
 const revision=store.digest();await runWorkspaceMutation(root,{revision},()=>saveKnowledgeMetadata(store,input,{revision}));
 assert.notEqual(store.digest(),revision);await assert.rejects(runWorkspaceMutation(root,{revision},()=>saveKnowledgeMetadata(store,input,{revision})),/revision/i);
 assert.deepEqual(fs.readFileSync(a),original);assert.deepEqual(fs.readFileSync(store.files('knowledge-confirmations','.json')[0]),confirmation);
 const rows=loadKnowledgeMetadata(store);assert.equal(rows.length,1);assert.equal(rows[0].category,'company');assert.equal(knowledgeDetails(store,'knowledge/b/same.md').category,'other');
 const details=knowledgeDetails(store,input.path);assert.deepEqual(details.attachments.map(x=>x.status),['missing','external-link']);assert.equal(details.sourceLinks[0].status,'external-link');
 assert.equal(store.load().knowledge.find((x:any)=>x.title.trim()==='A').reviewStatus,'confirmed');fs.appendFileSync(a,'changed');assert.equal(store.load().knowledge.find((x:any)=>x.title.trim()==='A').reviewStatus,'pending');
 for(const bad of [{workspaceId:'wrong'}, {path:'../private.md'}, {path:'knowledge/../a.md'}, {path:'crm-leads/a.json'}, {sourceLinks:['javascript:alert(1)']}, {attachments:[{path:'.env'}]}, {attachments:[{path:'growth-workspace/crm-leads/a.json'}]}, {attachments:[{path:'x',url:'https://example.test'}]}, {verified:true}]){
 const before=store.digest();await assert.rejects(runWorkspaceMutation(root,{},()=>saveKnowledgeMetadata(store,{...input,...bad},{})));assert.equal(store.digest(),before);
 }
 const target=put('assets/ok.pdf','PDF');await runWorkspaceMutation(root,{},()=>saveKnowledgeMetadata(store,{...input,attachments:[{path:'growth-workspace/assets/ok.pdf'}]},{}));assert.equal(knowledgeDetails(store,input.path).attachments[0].status,'local-file');
 const snapshot=createSnapshot(root);const legacy={...snapshot,files:snapshot.files.filter(x=>!x.path.startsWith('growth-workspace/knowledge-metadata/'))};assert.doesNotThrow(()=>validateSnapshot(root,legacy));await runWorkspaceMutation(root,{},()=>restoreSnapshot(root,legacy));assert.deepEqual(fs.readFileSync(store.files('knowledge-confirmations','.json')[0]),confirmation);assert.ok(snapshot.files.some(x=>x.path.startsWith('growth-workspace/knowledge-metadata/')));
 const damaged=structuredClone(snapshot),row=damaged.files.find(x=>x.path.startsWith('growth-workspace/knowledge-metadata/'))!;const value=JSON.parse(Buffer.from(row.data,'base64').toString());value.workspaceId='wrong';const bytes=Buffer.from(JSON.stringify(value));row.data=bytes.toString('base64');row.checksum=hash(bytes);
 const before=store.digest();await assert.rejects(runWorkspaceMutation(root,{},()=>restoreSnapshot(root,damaged)),/workspace/i);assert.equal(store.digest(),before);
 resolveInstance(root,{privateBase:path.join(root,'fake-private')});const bundle=await exportFullBackup(root);assert.ok(bundle.manifest.files.some(x=>x.logicalPath.startsWith('growth-workspace/knowledge-metadata/')));await previewFullRestore(root,bundle.directory);assert.ok(!bundle.manifest.coverage.missing.some(x=>x.reference.includes('growth-workspace/growth-workspace/')||x.reference==='knowledge/a/same.md'),JSON.stringify(bundle.manifest.coverage.missing));assert.ok(bundle.manifest.coverage.missing.some(x=>x.reference==='https://example.test/source'));
 const manifestPath=path.join(bundle.directory,'manifest.json'),manifestBytes=fs.readFileSync(manifestPath),metadataRow=bundle.manifest.files.find(x=>x.logicalPath.startsWith('growth-workspace/knowledge-metadata/'))!,metadata=JSON.parse(fs.readFileSync(path.join(bundle.directory,metadataRow.blob),'utf8'));
 for(const patch of [{workspaceId:'wrong'},{version:2},{path:'../escape.md'},{category:'invented'},{verified:true}]){const changed=Buffer.from(JSON.stringify({...metadata,...patch})),digest=hash(changed),bad=structuredClone(bundle.manifest),row=bad.files.find(x=>x.logicalPath===metadataRow.logicalPath)!;row.sha256=digest;row.blob='blobs/'+digest;row.size=changed.length;fs.writeFileSync(path.join(bundle.directory,row.blob),changed);fs.writeFileSync(manifestPath,JSON.stringify(bad));const beforeTree=tree(root);await assert.rejects(previewFullRestore(root,bundle.directory));assert.equal(tree(root),beforeTree);fs.writeFileSync(manifestPath,manifestBytes);}
 const another=fs.mkdtempSync(path.join(os.tmpdir(),'e1-other-'));try{await openFileWorkspace(another);resolveInstance(another,{privateBase:path.join(another,'fake-private')});const beforeTree=tree(another);await assert.rejects(previewFullRestore(another,bundle.directory),/workspace/i);assert.equal(tree(another),beforeTree);}finally{fs.rmSync(another,{recursive:true,force:true});}
 const attachmentLink=path.join(root,'assets','linked');fs.mkdirSync(path.dirname(attachmentLink),{recursive:true});try{fs.symlinkSync(path.join(store.base,'assets'),attachmentLink,'junction');await assert.rejects(runWorkspaceMutation(root,{},()=>saveKnowledgeMetadata(store,{...input,attachments:[{path:'assets/linked/ok.pdf'}]},{})),/symlink/i);}finally{if(fs.lstatSync(attachmentLink,{throwIfNoEntry:false})?.isSymbolicLink())fs.unlinkSync(attachmentLink);}

 // A real symlink is rejected for both metadata target and attachment resolution.
 const link=path.join(store.base,'knowledge','link');try{fs.symlinkSync(path.dirname(b),link,'junction');await assert.rejects(runWorkspaceMutation(root,{},()=>saveKnowledgeMetadata(store,{...input,path:'knowledge/link/same.md'},{})),/symlink/i);}finally{if(fs.lstatSync(link,{throwIfNoEntry:false})?.isSymbolicLink())fs.unlinkSync(link);}
 assert.equal(fs.readFileSync(target,'utf8'),'PDF');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

