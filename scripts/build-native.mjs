import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
if(process.platform!=='linux'){console.log('Native directory helper is Linux-only; no build needed');process.exit(0);}
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'native','bin');fs.mkdirSync(dir,{recursive:true});
const output=path.join(dir,'rename-directory-noreplace');
const temporary=output+'.'+process.pid+'.tmp';
try{
 const result=spawnSync('cc',['-std=c11','-O2','-Wall','-Wextra','-Werror',path.join(root,'native','rename-directory-noreplace.c'),'-o',temporary],{stdio:'inherit',timeout:60000,shell:false});
 if(result.error||result.status!==0)throw Error('Linux helper build requires a C compiler and Linux libc headers');
 fs.chmodSync(temporary,0o755);fs.renameSync(temporary,output);
 console.log('Built Linux atomic directory helper');
}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
