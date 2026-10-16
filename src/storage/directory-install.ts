import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Source and compiled modules both live in src/storage. Never resolve from customer cwd or PATH.
const helper=fileURLToPath(new URL('../../native/bin/rename-directory-noreplace',import.meta.url));
export const atomicDirectoryInstall=process.platform==='win32'||process.platform==='linux';
export function renameDirectoryNoReplace(source:string,target:string):void{
 if(!path.isAbsolute(source)||!path.isAbsolute(target))throw Error('Absolute directory paths required');
 if(process.platform==='win32'){fs.renameSync(source,target);return;}
 if(process.platform!=='linux')throw Error('Atomic directory installation unavailable on this platform');
 const stat=fs.lstatSync(helper,{throwIfNoEntry:false});
 if(!stat?.isFile()||stat.isSymbolicLink())throw Error('Linux atomic directory helper unavailable; run npm run build:native');
 const result=childProcess.spawnSync(helper,[source,target,String(process.pid)],{shell:false,timeout:5000,killSignal:'SIGKILL',maxBuffer:4096,encoding:'utf8',windowsHide:true});
 if(result.error||result.signal||result.status!==0){
  const error=Error(result.status===17?'Atomic directory target already exists':result.status===69?'Atomic directory installation unsupported by filesystem/kernel':'Atomic directory installation failed') as Error & {code?:string};
  error.code=result.status===17?'EEXIST':result.status===69?'ENOTSUP':'EIO';throw error;
 }
}
// Probe only private journal storage, before prepared or any business directory/file is installed.
// No cache: mount/kernel support or the packaged helper can change between transactions.
export function assertDirectoryInstallAvailable(privateDirectory:string):void{
 if(process.platform==='win32')return;
 if(process.platform!=='linux')throw Error('Atomic directory installation unavailable on this platform');
 const source=path.join(privateDirectory,'probe-source-'+crypto.randomUUID()),target=path.join(privateDirectory,'probe-target-'+crypto.randomUUID());
 fs.mkdirSync(source);fs.mkdirSync(target);
 try{
  const before=fs.statSync(source,{bigint:true}),other=fs.statSync(target,{bigint:true});
  let rejected=false;try{renameDirectoryNoReplace(source,target);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;rejected=true;}
  if(!rejected||fs.statSync(source,{bigint:true}).ino!==before.ino||fs.statSync(target,{bigint:true}).ino!==other.ino)throw Error('Atomic no-replace capability unavailable');
  fs.rmdirSync(target);renameDirectoryNoReplace(source,target);
  const after=fs.statSync(target,{bigint:true});
  if(before.ino!==after.ino||before.dev!==after.dev||before.birthtimeNs!==after.birthtimeNs)throw Error('Stable directory identity unavailable');
 }finally{for(const file of [source,target])if(fs.existsSync(file))fs.rmdirSync(file);}
}

