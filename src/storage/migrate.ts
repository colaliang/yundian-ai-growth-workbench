import {crmFamilies,validateCrmDataset} from '../crm/validation.ts';
import {validatePublicationPath} from './publication-path.ts';
import {validatePublishingDataset} from '../publishing/validation.ts';
import {validatePublishingRecord} from '../publishing/service.ts';
import {validateContentRecord} from '../content/service.ts';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WorkspaceStore } from './workspace-store.ts';
import type { MigrationResult } from '../domain/contracts.ts';
import { CONTRACT_VERSION } from '../domain/contracts.ts';
// v0.15's workspace schema 3 belongs to the legacy namespace, not the new contracts.
export function migrateWorkspace(root:string):MigrationResult {
 const store=new WorkspaceStore(root),file=store.checked(path.join(store.base,'workspace.json'));
 if(!fs.existsSync(store.base)) return {changed:false,backupPath:null,schemaVersion:3,contractVersion:CONTRACT_VERSION};
 const originals=new Map<string,Buffer>();
 const walk=(dir:string)=>{
  store.checked(dir);
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
   const target=store.checked(path.join(dir,entry.name));
   if(entry.name==='migration-backups') continue;
   validatePublicationPath('growth-workspace/'+path.relative(store.base,target).split(path.sep).join('/'));
   if(entry.isSymbolicLink()) throw Error('Invalid symlink in workspace');
   if(entry.isDirectory()) walk(target);
   else if(entry.isFile()) {
    const raw=fs.readFileSync(target); originals.set(target,raw);
    if(entry.name.endsWith('.json')) {
     const value=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
     const validate=(v:unknown):void=>{
      if(!v||typeof v!=='object') return;
      for(const [key,item] of Object.entries(v)) {
       if(['artifact','path','outputPath'].includes(key)&&typeof item==='string'&&item&&!/^https?:\/\//.test(item)) store.checked(path.resolve(store.base,item));
       else validate(item);
      }
     }; validate(value);
    }
   }
  }
 };
 walk(store.base);
 // Existing history must be validated even when metadata has not yet been created.
 if(!fs.existsSync(file)&&[...originals.keys()].some(file=>crmFamilies.includes(path.relative(store.base,file).split(path.sep)[0])))throw Error('CRM records require an existing workspace manifest before initialization');
 if(!fs.existsSync(file)) return {changed:false,backupPath:null,schemaVersion:3,contractVersion:CONTRACT_VERSION};
 const workspace=JSON.parse(originals.get(file)!.toString('utf8').replace(/^\uFEFF/,''));
 if(!workspace||typeof workspace!=='object'||Array.isArray(workspace)) throw Error('Invalid workspace');
 for(const [file,bytes] of originals)if(path.dirname(file)===path.join(store.base,'content-items'))validateContentRecord(JSON.parse(bytes.toString('utf8')),workspace.workspaceId);
 for(const [file,bytes] of originals){const family=path.basename(path.dirname(file));if(['publish-attempts','publish-confirmations'].includes(family))validatePublishingRecord(JSON.parse(bytes.toString('utf8')),workspace.workspaceId,family);}
 validatePublishingDataset([...originals].filter(([file])=>['content-items','publish-confirmations','publish-attempts'].includes(path.basename(path.dirname(file)))).map(([file,bytes])=>({family:path.basename(path.dirname(file)),filename:path.basename(file),value:JSON.parse(bytes.toString('utf8'))})),workspace.workspaceId);
 validateCrmDataset([...originals].filter(([file])=>file.endsWith('.json')&&[...crmFamilies,'tasks','artifacts','feedback','records'].includes(path.basename(path.dirname(file)))).map(([file,bytes])=>({family:path.basename(path.dirname(file)),filename:path.basename(file),value:JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''))})),workspace.workspaceId);
 if(workspace.contractVersion===2&&workspace.schemaVersion===3) return {changed:false,backupPath:null,schemaVersion:3,contractVersion:2};
 if(workspace.schemaVersion!==undefined&&![1,2,3].includes(workspace.schemaVersion)) throw Error('Unsupported workspace schema');
 const next={...workspace,schemaVersion:3,contractVersion:2,workspaceId:workspace.workspaceId||crypto.randomUUID(),projectRoot:store.root,backup:{...workspace.backup,enabled:false},legacySchemaVersion:workspace.schemaVersion??null};
 const serialized=JSON.stringify(next,null,2)+'\n';
 const temp=store.checked(file+'.'+crypto.randomUUID()+'.tmp');
 const backupPath=store.checked(path.join(store.base,'migration-backups',crypto.randomUUID()));
 try {
  fs.writeFileSync(temp,serialized,{flag:'wx'});
  const readback=JSON.parse(fs.readFileSync(temp,'utf8'));
  if(readback.schemaVersion!==3||readback.workspaceId!==next.workspaceId) throw Error('Migration readback failed');
  fs.mkdirSync(backupPath,{recursive:true});
  for(const [source,raw] of originals) {const dest=store.checked(path.join(backupPath,path.relative(store.base,source)));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,raw,{flag:'wx'});if(!fs.readFileSync(dest).equals(raw)) throw Error('Backup readback failed');}
  fs.renameSync(temp,file);
 } finally {if(fs.existsSync(temp)) fs.unlinkSync(temp);}
 return {changed:true,backupPath,schemaVersion:3,contractVersion:2};
}
