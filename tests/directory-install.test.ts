import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renameDirectoryNoReplace,assertDirectoryInstallAvailable} from '../src/storage/directory-install.ts';
test('directory adapter preserves source identity and existing empty target',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wb-directory-adapter-'));
 try{const source=path.join(root,'literal ; source'),target=path.join(root,'literal $ target');fs.mkdirSync(source);fs.mkdirSync(target);const before=fs.statSync(source,{bigint:true}),other=fs.statSync(target,{bigint:true});assert.throws(()=>renameDirectoryNoReplace(source,target));assert.equal(fs.statSync(source,{bigint:true}).ino,before.ino);assert.equal(fs.statSync(target,{bigint:true}).ino,other.ino);fs.rmdirSync(target);assertDirectoryInstallAvailable(root);renameDirectoryNoReplace(source,target);const after=fs.statSync(target,{bigint:true});assert.equal(after.ino,before.ino);assert.equal(after.dev,before.dev);assert.equal(after.birthtimeNs,before.birthtimeNs);assert.equal(fs.existsSync(source),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

import childProcess from 'node:child_process';
import {withWorkspaceWrite,recoverWorkspace} from '../src/storage/transaction.ts';
import {WorkspaceStore} from '../src/storage/workspace-store.ts';
for(const failure of ['missing-helper','unsupported-filesystem','timeout'])test('Linux failure injection '+failure+' fails before business writes',{skip:process.platform!=='linux'},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wb-directory-unavailable-')),store=new WorkspaceStore(root);
 const originalSpawn=childProcess.spawnSync,originalStat=fs.lstatSync;
 try{
  if(failure==='missing-helper')(fs as any).lstatSync=((file:any,options:any)=>String(file).endsWith('/native/bin/rename-directory-noreplace')?undefined:originalStat(file,options)) as typeof fs.lstatSync;
  else childProcess.spawnSync=((...args:any[])=>String(args[0]).endsWith('/native/bin/rename-directory-noreplace')?{status:failure==='timeout'?null:69,signal:failure==='timeout'?'SIGKILL':null,error:undefined,stdout:'',stderr:''}:Reflect.apply(originalSpawn,childProcess,args)) as typeof childProcess.spawnSync;
  await assert.rejects(withWorkspaceWrite(root,{},()=>store.put(path.join(store.base,'workspace.json'),{workspaceId:'unavailable-fixture'})),/unavailable|unsupported|failed/);
  assert.equal(fs.existsSync(store.base),false);
  const transactions=path.join(root,'.workbench-runtime','transactions'),id=fs.readdirSync(transactions)[0];
  assert.equal(JSON.parse(fs.readFileSync(path.join(transactions,id,'journal.json'),'utf8')).phase,'preparing');
 }finally{childProcess.spawnSync=originalSpawn;(fs as any).lstatSync=originalStat;await recoverWorkspace(root);fs.rmSync(root,{recursive:true,force:true});}
});

