import {readBackupPlan,setBackupPlan,tickBackup} from '../src/backup/scheduler.js';
import {previewBackupPrune,confirmBackupPrune} from '../src/backup/retention.js';
import {withWorkspaceLease} from '../src/storage/lease.js';
import {exportFullBackup,previewFullRestore,confirmFullRestore} from '../src/backup/bundle.js';
import {previewBackupSources,confirmBackupSources} from '../src/backup/sources.js';
import {resolveInstance,instanceMetadata,previewLegacyConfigMigration,confirmLegacyConfigMigration} from '../src/runtime/instance.js';
import {WorkspaceStore} from '../src/storage/workspace-store.js';
import {createSnapshot,restoreSnapshot} from '../src/backup/service.js';
import {inspectUpdate} from '../src/updates/check.js';
import fs from 'node:fs';
import path from 'node:path';
import {openFileWorkspace,runWorkspaceMutation,readWorkspaceSnapshot,committedResult} from '../src/runtime/workspace.js';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
try {
  if(!args.includes('--root')) throw Error('Required --root CUSTOMER_PROJECT');
  if(args.includes('--private-base')&&(!option('--private-base')||option('--private-base').startsWith('--')))throw Error('Invalid private base');
  const command=option('--command','state');
  const store=await openFileWorkspace(option('--root'));
  let output;const emit=value=>{output=value;};
  const execute=async()=>{
  if(command==='backup-plan'){const enabled=option('--enabled');if(enabled===undefined)emit(JSON.stringify(await readBackupPlan(store.root)));else{if(!['true','false'].includes(enabled))throw Error('Use --enabled true or false');emit(JSON.stringify(await setBackupPlan(store.root,enabled==='true',{revision:option('--revision')})));}}
  else if(command==='backup-tick')emit(JSON.stringify(await tickBackup(store.root,new Date().toISOString())));
  else if(command==='backup-prune'){const preview=await previewBackupPrune(store.root);if(args.includes('--confirm')){if(option('--fingerprint')!==preview.fingerprint)throw Error('Prune preview changed; preview first');emit(JSON.stringify(await confirmBackupPrune(store.root,preview.id,{confirmed:true})));}else emit(JSON.stringify(preview));}
  else if(command==='backup-full-export')emit(JSON.stringify(await exportFullBackup(store.root)));
  else if(command==='backup-full-restore'){const directory=option('--directory');if(!directory)throw Error('Required --directory BUNDLE');const preview=await previewFullRestore(store.root,directory);if(args.includes('--confirm')){if(option('--fingerprint')!==preview.fingerprint)throw Error('Restore preview fingerprint changed; preview first');emit(JSON.stringify(await confirmFullRestore(store.root,preview.previewId,{confirmed:true})));}else emit(JSON.stringify(preview));}
  else if(['backup-sources','backup-plan','backup-prune'].includes(command)){const payload=option('--payload');if(!payload)throw Error('Required --payload SOURCE_ROWS_JSON');const rows=JSON.parse(fs.readFileSync(path.resolve(payload),'utf8').replace(/^\uFEFF/,'')),preview=await previewBackupSources(store.root,rows);if(args.includes('--confirm')){if(option('--fingerprint')!==preview.fingerprint)throw Error('Source fingerprint changed; preview first');emit(JSON.stringify(await confirmBackupSources(store.root,preview.previewId,{confirmed:true})));}else emit(JSON.stringify(preview));}
  else if(command==='runtime-status')emit(JSON.stringify(instanceMetadata(resolveInstance(store.root,{privateBase:option('--private-base',process.env.WORKBENCH_PRIVATE_BASE)}))));
  else if(command==='config-migration'){const app=option('--legacy-app');if(!app)throw Error('Required --legacy-app OLD_APP_DIRECTORY; legacy credentials never load automatically');const ctx=resolveInstance(store.root,{privateBase:option('--private-base',process.env.WORKBENCH_PRIVATE_BASE)}),preview=previewLegacyConfigMigration(ctx,app,{legacyPrivateBase:option('--legacy-private-base')});if(args.includes('--confirm')){if(option('--fingerprint')!==preview.fingerprint)throw Error('Preview fingerprint changed; review local preview before --confirm');emit(JSON.stringify(confirmLegacyConfigMigration(ctx,preview.id,{confirmed:true})));}else emit(JSON.stringify(preview));}
  else if(command==='state') emit(JSON.stringify({...store.load(),projectRoot:store.root},null,2));
  else if(command==='backup-export'){const output=option('--output');if(!output)throw Error('Required --output CUSTOMER_PROJECT_SNAPSHOT_JSON');const file=store.checked(path.resolve(output));if(store.exists(file))throw Error('Snapshot output already exists; choose a new file');store.write(file,JSON.stringify(createSnapshot(store.root),null,2));emit(JSON.stringify({file}));}
  else if(command==='backup-restore'){const file=option('--payload');if(!file)throw Error('Required --payload SNAPSHOT_JSON');const source=path.resolve(file),relative=path.relative(store.root,source),external=relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative);const raw=external?fs.readFileSync(source,'utf8'):store.read(source);emit(JSON.stringify(restoreSnapshot(store.root,JSON.parse(raw.replace(/^\uFEFF/,''))),null,2));}
  else if(command==='update-inspect')emit(JSON.stringify(inspectUpdate(store.root),null,2));
  else if(['create-task','receipt','review','knowledge-confirm'].includes(command)){
    const file=option('--payload');if(!file)throw Error('Required --payload JSON_FILE');const payload=JSON.parse(store.read(path.resolve(file))),revision=option('--revision',store.load().revision);
    const result=command==='create-task'?store.createTask(payload,revision):command==='receipt'?store.applyReceipt(payload.taskId,payload,revision):command==='review'?store.reviewArtifact(payload.taskId,payload.contentHash,payload.decision,payload.evidence,revision,payload.artifactId):store.confirmKnowledge(payload.path,payload.contentHash,revision);
    emit(JSON.stringify({result,revision:store.load().revision},null,2));
  }
  else if(['schedule-create','schedule-receipt','schedule-pause','schedule-occurrence','schedule-result'].includes(command)){
    const file=option('--payload');if(!file)throw Error('Required --payload JSON_FILE');const payload=JSON.parse(store.read(path.resolve(file)));
    emit(JSON.stringify(store.save({action:command,payload,revision:option('--revision',store.load().revision)}),null,2));
  }
  else if(command==='save') {
    const action=option('--action');
    if(!action) throw Error('Required --action');
    const file=option('--payload');
    const payload=file?JSON.parse(store.read(path.resolve(file))):{};
    const revision=option('--revision',store.load().revision);
    emit(JSON.stringify(store.save({action,payload,revision}),null,2));
  } else throw Error('Unknown command; use state, save, create-task, receipt, review, knowledge-confirm, schedule-create, schedule-receipt, schedule-pause, schedule-occurrence, schedule-result');
  };
  // Output is collected locally and printed only after committed readback.
  if(['backup-full-export','backup-full-restore','backup-tick'].includes(command))await withWorkspaceLease(store.root,'write',async()=>{resolveInstance(store.root,{privateBase:option('--private-base',process.env.WORKBENCH_PRIVATE_BASE)});await execute();});
  else if(['backup-sources','backup-plan','backup-prune'].includes(command))await execute();
  else if(['state','runtime-status','config-migration','update-inspect'].includes(command))await readWorkspaceSnapshot(store.root,execute);
  else await runWorkspaceMutation(store.root,{revision:option('--revision')},execute,current=>{if(output)output=JSON.stringify(committedResult(current,JSON.parse(output)),null,2);});
  if(output!==undefined)console.log(output);
} catch(error) { console.error(error.code?'文件操作失败，请检查客户目录与文件权限':error.message); process.exitCode=1; }

