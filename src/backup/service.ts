import {validateKnowledgeMetadata,knowledgeMetadataFilename} from '../domain/knowledge-metadata.ts';
import {decodeBase64Bytes} from '../storage/base64.ts';
import {authorizeValidatedRestoreCopy} from '../storage/restore-authorization.ts';
import {crmFamilies,validateCrmRecord,validateCrmDataset} from '../crm/validation.ts';
import {validatePublicationPath} from '../storage/publication-path.ts';
import {validatePublishingDataset} from '../publishing/validation.ts';
import {validatePublishingRecord} from '../publishing/service.ts';
import {validateContentRecord} from '../content/service.ts';
import {safeArtifactUrl} from '../domain/artifacts.ts';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {WorkspaceStore} from '../storage/workspace-store.ts';
import type {Snapshot,BackupAdapter} from './adapter.ts';
const hash=(bytes:Buffer)=>crypto.createHash('sha256').update(bytes).digest('hex');
function workspace(store:WorkspaceStore){const w=store.json(path.join(store.base,'workspace.json'));if(w.schemaVersion!==3||w.contractVersion!==2||typeof w.workspaceId!=='string'||!w.workspaceId)throw Error('Unsupported workspace schema');return w;}
function safe(store:WorkspaceStore,relative:string){if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||relative.split('/').some(x=>!x||x==='.'||x==='..'||/[. ]$/.test(x)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(x))||!relative.startsWith('growth-workspace/'))throw Error('Invalid snapshot path');validatePublicationPath(relative);const result=path.join(store.root,relative);let cursor=store.root;for(const part of relative.split('/')){cursor=path.join(cursor,part);const stat=fs.lstatSync(cursor,{throwIfNoEntry:false});if(stat?.isSymbolicLink())throw Error('Snapshot symlink rejected');}return store.checked(result);}
export function createSnapshot(root:string):Snapshot{const store=new WorkspaceStore(root),w=workspace(store),files:Snapshot['files']=[];function walk(folder:string){for(const entry of store.listDirectory(folder)){const file=path.join(folder,entry.name),relative=path.relative(store.root,file).split(path.sep).join('/');safe(store,relative);if(entry.isDirectory())walk(file);else if(entry.isFile()){const bytes=store.readBytes(file);files.push({path:relative,checksum:hash(bytes),data:bytes.toString('base64')});}else throw Error('Unsupported snapshot file');}}walk(store.base);return {id:crypto.randomUUID(),workspaceId:w.workspaceId,schemaVersion:3,contractVersion:2,createdAt:new Date().toISOString(),files:files.sort((a,b)=>a.path.localeCompare(b.path))};}
type Row=Record<string,any>;
const object=(value:any):value is Row=>!!value&&typeof value==='object'&&!Array.isArray(value);
function structured(value:any,family:string,workspaceId:string,legacy=false):void {
 if(!object(value))throw Error('Invalid structured '+family+' record');if(value.entityVersion!==undefined&&(!Number.isSafeInteger(value.entityVersion)||value.entityVersion<0))throw Error('Invalid restored entity version');
 const strings=(...fields:string[])=>{for(const field of fields)if(typeof value[field]!=='string'||!value[field].trim())throw Error('Invalid '+family+' '+field);};
 const arrays=(...fields:string[])=>{for(const field of fields)if(!Array.isArray(value[field]))throw Error('Invalid '+family+' '+field);};
 // Every explicit scope, including receipt envelopes and serialized host receipts, must agree.
 const scopes=(item:any):void=>{if(!item||typeof item!=='object')return;if(Object.hasOwn(item,'workspaceId')&&item.workspaceId!==workspaceId)throw Error('Snapshot record belongs to another workspace');for(const nested of Object.values(item))scopes(nested);};scopes(value);
 const unscoped=['workbench','records','feedback','audits'];
 if(!unscoped.includes(family)&&!Object.hasOwn(value,'workspaceId')&&!legacy)throw Error('Missing workspaceId in '+family);
 if(['publish-attempts','publish-confirmations'].includes(family)){validatePublishingRecord(value,workspaceId,family);return;}
 if(crmFamilies.includes(family)){validateCrmRecord(value,workspaceId,family);return;}
 if(family==='content-items'){validateContentRecord(value,workspaceId);return;}
 if(family==='workbench'){if(!object(value.profile))throw Error('Invalid workbench profile');arrays('tasks','feedback');if(value.settings!==undefined&&!object(value.settings))throw Error('Invalid settings');for(const row of value.tasks)structured(row,'tasks',workspaceId,legacy);for(const row of value.feedback)structured(row,'feedback',workspaceId,legacy);return;}
 if(family==='audits'){if(value.schemaVersion!==1)throw Error('Invalid audit schema');strings('platform','technicalConclusion');arrays('items','observations');for(const item of value.items)if(!object(item)||typeof item.id!=='string'||typeof item.title!=='string')throw Error('Invalid audit item');return;}
 if(family==='knowledge-metadata'){validateKnowledgeMetadata(value,workspaceId);return;}
 if(family==='knowledge-confirmations'){strings('path','contentHash','confirmedAt');return;}
 if(family==='receipts'){strings('taskId','receiptId','receiptKey','registeredAt','fingerprint');if(!object(value.receipt))throw Error('Invalid receipt envelope');const r=value.receipt;if(r.workspaceId!==workspaceId||r.taskId!==value.taskId||r.receiptId!==value.receiptId)throw Error('Invalid receipt identity');for(const field of ['skillVersion','executor','status'])if(typeof r[field]!=='string'||!r[field])throw Error('Invalid execution receipt');if(r.artifacts!==undefined&&!Array.isArray(r.artifacts))throw Error('Invalid receipt artifacts');return;}
 strings('id');
 if(family==='tasks'){strings('stage','name','status','createdAt');if(!legacy){strings('skillId','skillVersion','inputSnapshotRef');arrays('artifactIds');}}
 else if(family==='workflows'){strings('stage','goal');if(!legacy){strings('skillId','skillVersion');if(value.version!==1)throw Error('Invalid workflow version');}}
 else if(family==='artifacts'){if(value.url!==undefined&&!safeArtifactUrl(value.url))throw Error('Invalid artifact URL protocol');strings('taskId','module','skillVersion');arrays('sources','gaps','nextSteps');if(typeof value.summary!=='string'||!['verified','unverified'].includes(value.verification))throw Error('Invalid artifact shape');}
 else if(family==='reviews')strings('taskId','artifactId','contentHash','reviewedAt','evidence');
 else if(family==='records')strings('stage','name','source','createdAt');
 else if(family==='feedback')strings('leadId','result','createdAt');
 else if(family==='daily-decisions')strings('status','updatedAt');
 else if(family==='schedule-occurrences')strings('scheduleId','scheduledAt','createdAt','status');
 else if(family==='delivery-programs'){arrays('goals','stages','taskIds','artifactIds');strings('templateId','title','createdAt');}
 else if(family==='schedules'){strings('skillId','timezone','frequency','outputPath','status');if(!object(value.inputs)||!object(value.authorization))throw Error('Invalid schedule shape');if(value.hostReceipt!==undefined){if(!object(value.hostReceipt)||value.hostReceipt.workspaceId!==workspaceId)throw Error('Invalid host receipt');}if(typeof value.receipt==='string'&&value.receipt){const r=JSON.parse(value.receipt);if(!object(r)||r.workspaceId!==workspaceId)throw Error('Invalid serialized host receipt');scopes(r);}}
}
function validatedSnapshot(root:string,snapshot:Snapshot,limit:number){const store=new WorkspaceStore(root),w=workspace(store);if(!snapshot||snapshot.workspaceId!==w.workspaceId)throw Error('Snapshot belongs to another workspace');if(snapshot.schemaVersion!==3||snapshot.contractVersion!==2||!Array.isArray(snapshot.files)||snapshot.files.length>limit)throw Error('Unsupported snapshot schema');const seen=new Set<string>();const rows=snapshot.files.map(f=>{const file=safe(store,f.path),key=f.path.toLowerCase();if(seen.has(key))throw Error('Duplicate snapshot path');seen.add(key);const bytes=decodeBase64Bytes(f.data);if(hash(bytes)!==f.checksum)throw Error('Snapshot checksum mismatch');const stat=fs.lstatSync(file,{throwIfNoEntry:false});if(stat&&!stat.isFile())throw Error('Restore destination is not a file');return {file,bytes,relative:f.path};});const manifest=rows.find(r=>r.relative.toLowerCase()==='growth-workspace/workspace.json');if(!manifest)throw Error('Missing workspace manifest');
 const original=JSON.parse(manifest.bytes.toString('utf8').replace(/^\uFEFF/,''));if(original?.entityVersion!==undefined&&(!Number.isSafeInteger(original.entityVersion)||original.entityVersion<0))throw Error('Invalid restored entity version');if(!object(original)||original.workspaceId!==w.workspaceId||original.schemaVersion!==3||original.contractVersion!==2||original.backup?.enabled!==false)throw Error('Invalid workspace manifest or enabled legacy backup');
 const allPaths=new Set(rows.map(row=>row.relative.toLowerCase()));for(const row of rows){const parts=row.relative.toLowerCase().split('/');for(let i=1;i<parts.length;i++)if(allPaths.has(parts.slice(0,i).join('/')))throw Error('Conflicting snapshot file paths');}
 for(const row of rows){
  const canonical=row.relative.toLowerCase();
  const match=/^growth-workspace\/(workbench\.json|(?:tasks|receipts|reviews|records|feedback|schedules|artifacts|workflows|audits|knowledge-confirmations|knowledge-metadata|daily-decisions|schedule-occurrences|delivery-programs|content-items|publish-attempts|publish-confirmations|crm-members|crm-companies|crm-contacts|crm-leads|crm-followups|crm-feedback-links)\/[^/]+\.json)$/.exec(canonical);
  if(!match)continue;
  const family=canonical==='growth-workspace/workbench.json'?'workbench':canonical.split('/')[1];
  // A missing scope is legacy only with exact original bytes in a captured migration backup
  // and an old manifest matching the explicit legacySchemaVersion of this same customer.
  const legacy=[1,2,3].includes(original.legacySchemaVersion)&&rows.some(old=>{
   const m=/^growth-workspace\/migration-backups\/([^/]+)\/(.+)$/.exec(old.relative.toLowerCase());
   if(!m||m[2]!==canonical.slice('growth-workspace/'.length)||!old.bytes.equals(row.bytes))return false;
   const oldManifest=rows.find(r=>r.relative.toLowerCase()==='growth-workspace/migration-backups/'+m[1]+'/workspace.json');if(!oldManifest)return false;
   const before=JSON.parse(oldManifest.bytes.toString('utf8').replace(/^\uFEFF/,''));return object(before)&&before.contractVersion===undefined&&before.schemaVersion===original.legacySchemaVersion&&(!Object.hasOwn(before,'workspaceId')||before.workspaceId===w.workspaceId);
  });
  const parsed=JSON.parse(row.bytes.toString('utf8').replace(/^\uFEFF/,''));structured(parsed,family,w.workspaceId,legacy);
  if(family==='knowledge-metadata'){if(path.basename(row.file)!==knowledgeMetadataFilename(parsed.path))throw Error('Knowledge metadata filename mismatch');safe(store,'growth-workspace/'+parsed.path);for(const a of parsed.attachments)if(a.path){store.checked(path.join(store.root,a.path));}}
 }
 const local=new Map<string,any>();for(const family of ['content-items','publish-confirmations','publish-attempts'])for(const file of store.files(family,'.json'))local.set(path.relative(store.root,file).split(path.sep).join('/'),{family,filename:path.basename(file),value:store.json(file)});
 const incoming=new Map(local),effective=new Map(local);for(const row of rows){const family=row.relative.split('/')[1];if(['content-items','publish-confirmations','publish-attempts'].includes(family)&&row.relative.split('/').length===3){const v={family,filename:path.basename(row.file),value:JSON.parse(row.bytes.toString('utf8'))};incoming.set(row.relative,v);if(!local.has(row.relative))effective.set(row.relative,v);}}
 validatePublishingDataset([...incoming.values()],w.workspaceId);validatePublishingDataset([...effective.values()],w.workspaceId);
 const related=[...crmFamilies,'tasks','artifacts','feedback','records'];const crmLocal=new Map<string,any>();for(const family of related)for(const file of store.files(family,'.json'))crmLocal.set(path.relative(store.root,file).split(path.sep).join('/'),{family,filename:path.basename(file),value:store.json(file)});const crmIncoming=new Map(crmLocal),crmEffective=new Map(crmLocal);for(const row of rows){const family=row.relative.split('/')[1];if(related.includes(family)&&row.relative.split('/').length===3&&row.relative.endsWith('.json')){const record={family,filename:path.basename(row.file),value:JSON.parse(row.bytes.toString('utf8'))};crmIncoming.set(row.relative,record);if(!crmLocal.has(row.relative))crmEffective.set(row.relative,record);}}validateCrmDataset([...crmIncoming.values()],w.workspaceId);validateCrmDataset([...crmEffective.values()],w.workspaceId);
 for(const row of rows){let cursor=path.dirname(row.file);while(cursor!==store.root){const stat=fs.lstatSync(cursor,{throwIfNoEntry:false});if(stat&&!stat.isDirectory())throw Error('Restore parent is not directory');cursor=path.dirname(cursor);}}return {store,rows};}
// Separate internal full-bundle validator; no caller-selected cap on the legacy Snapshot API.
export function validateSnapshot(root:string,snapshot:Snapshot){return validatedSnapshot(root,snapshot,10000);}
export function validateFullBackupSnapshot(root:string,snapshot:Snapshot){return validatedSnapshot(root,snapshot,100000);}
export interface RestoreResult {backupPath:string;restored:string[];conflicts:{path:string;local:string;incoming:string}[]}
export function restoreSnapshot(root:string,snapshot:Snapshot):RestoreResult{const {store,rows}=validateSnapshot(root,snapshot);const backupRoot=path.join(store.root,'.workbench-backups');if(fs.lstatSync(backupRoot,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Backup directory symlink rejected');const current=createSnapshot(root);const folder=store.checked(path.join(store.root,'.workbench-backups',crypto.randomUUID()));const backupPath=path.join(folder,'before-restore.json');const backupBytes=Buffer.from(JSON.stringify(current));authorizeValidatedRestoreCopy(store.root,backupPath,backupBytes,'archive');store.writeBytes(backupPath,backupBytes);const result:RestoreResult={backupPath,restored:[],conflicts:[]};for(const row of rows){if(row.relative==='growth-workspace/backup-sources.json'){const incoming=store.checked(path.join(folder,'incoming',row.relative));authorizeValidatedRestoreCopy(store.root,incoming,row.bytes,'archive');store.writeBytes(incoming,row.bytes);result.restored.push(path.relative(store.root,incoming).split(path.sep).join('/'));continue;}if(store.exists(row.file)){if(store.readBytes(row.file).equals(row.bytes))continue;const incoming=store.checked(path.join(folder,'incoming',row.relative));authorizeValidatedRestoreCopy(store.root,incoming,row.bytes,'archive');store.writeBytes(incoming,row.bytes);result.conflicts.push({path:row.relative,local:row.file,incoming});}else{authorizeValidatedRestoreCopy(store.root,row.file,row.bytes,row.relative.startsWith('growth-workspace/migration-backups/')?'archive':'entity');store.writeBytes(row.file,row.bytes);result.restored.push(row.relative);}}return result;}
export async function setOnlineBackup(root:string,enabled:boolean,adapter?:BackupAdapter){const store=new WorkspaceStore(root),w=workspace(store);if(enabled&&(!adapter||!await adapter.verifyIsolation(w.workspaceId)))throw Error('在线备份不可用：尚未验证认证和客户空间隔离');store.put(path.join(store.base,'workspace.json'),{...w,backup:{...w.backup,enabled}});return {enabled};}

