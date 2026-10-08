import {WorkspaceStore} from '../src/storage/workspace-store.ts';
import {createSnapshot,restoreSnapshot} from '../src/backup/service.ts';
import {inspectUpdate} from '../src/updates/check.ts';
import fs from 'node:fs';
import path from 'node:path';
import { FileWorkspace } from '../server.ts';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
try {
  if(!args.includes('--root')) throw Error('Required --root CUSTOMER_PROJECT');
  const command=option('--command','state');
  const store=['backup-export','backup-restore','update-inspect'].includes(command)?new WorkspaceStore(option('--root')):new FileWorkspace(option('--root'));
  if(command==='state') console.log(JSON.stringify({...store.load(),projectRoot:store.root},null,2));
  else if(command==='backup-export'){const output=option('--output');if(!output)throw Error('Required --output CUSTOMER_PROJECT_SNAPSHOT_JSON');const file=store.checked(path.resolve(output));fs.writeFileSync(file,JSON.stringify(createSnapshot(store.root),null,2),{flag:'wx'});console.log(JSON.stringify({file}));}
  else if(command==='backup-restore'){const file=option('--payload');if(!file)throw Error('Required --payload SNAPSHOT_JSON');console.log(JSON.stringify(restoreSnapshot(store.root,JSON.parse(fs.readFileSync(path.resolve(file),'utf8').replace(/^\uFEFF/,''))),null,2));}
  else if(command==='update-inspect')console.log(JSON.stringify(inspectUpdate(store.root),null,2));
  else if(['create-task','receipt','review','knowledge-confirm'].includes(command)){
    const file=option('--payload');if(!file)throw Error('Required --payload JSON_FILE');const payload=JSON.parse(store.read(path.resolve(file))),revision=option('--revision',store.load().revision);
    const result=command==='create-task'?store.createTask(payload,revision):command==='receipt'?store.applyReceipt(payload.taskId,payload,revision):command==='review'?store.reviewArtifact(payload.taskId,payload.contentHash,payload.decision,payload.evidence,revision,payload.artifactId):store.confirmKnowledge(payload.path,payload.contentHash,revision);
    console.log(JSON.stringify({result,revision:store.load().revision},null,2));
  }
  else if(['schedule-create','schedule-receipt','schedule-pause','schedule-occurrence','schedule-result'].includes(command)){
    const file=option('--payload');if(!file)throw Error('Required --payload JSON_FILE');const payload=JSON.parse(store.read(path.resolve(file)));
    console.log(JSON.stringify(store.save({action:command,payload,revision:option('--revision',store.load().revision)}),null,2));
  }
  else if(command==='save') {
    const action=option('--action');
    if(!action) throw Error('Required --action');
    const file=option('--payload');
    const payload=file?JSON.parse(store.read(path.resolve(file))):{};
    const revision=option('--revision',store.load().revision);
    console.log(JSON.stringify(store.save({action,payload,revision}),null,2));
  } else throw Error('Unknown command; use state, save, create-task, receipt, review, knowledge-confirm, schedule-create, schedule-receipt, schedule-pause, schedule-occurrence, schedule-result');
} catch(error) { console.error(error.code?'文件操作失败，请检查客户目录与文件权限':error.message); process.exitCode=1; }
