import {AsyncLocalStorage} from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validatePublicationPath} from './publication-path.ts';
export type TransactionContext={root:string;open:boolean;writable:boolean;staged:Map<string,Buffer>;reads:Map<string,string|null>;lists:Map<string,string>;existence:Map<string,string>};
export const transactionContext=new AsyncLocalStorage<TransactionContext>();
export const byteHash=(bytes:Buffer)=>crypto.createHash('sha256').update(bytes).digest('hex');
export function diskKind(file:string):'missing'|'file'|'directory'|'other'{try{const stat=fs.lstatSync(file,{throwIfNoEntry:false});return !stat?'missing':stat.isFile()?'file':stat.isDirectory()?'directory':'other';}catch(e){if((e as NodeJS.ErrnoException).code==='ENOTDIR')return 'other';throw e;}}
export function diskBytes(file:string):Buffer|null{try{if(diskKind(file)==='directory')throw Error('Expected file bytes, found directory');return fs.readFileSync(file);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
export function diskHash(file:string){const kind=diskKind(file);if(kind==='directory'||kind==='other')return kind;const bytes=diskBytes(file);return bytes===null?null:byteHash(bytes);}
export function safeRelative(root:string,relative:string):string{
 if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/[<>:"|?*\x00-\x1f]/.test(p)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)))throw Error('Invalid transaction path');
 if(relative.split('/').some((p,i)=>p.startsWith('.')&&!(i===0&&(p==='.codebuddy'||p==='.workbench-backups')))||relative.startsWith('.codebuddy/')&&relative!=='.codebuddy/skills'&&!relative.startsWith('.codebuddy/skills/'))throw Error('Private transaction path rejected');
 validatePublicationPath(relative);
 let current=root;
 for(const part of relative.split('/')){
  if(fs.existsSync(current))for(const name of fs.readdirSync(current))if(name.toLowerCase()===part.toLowerCase()&&name!==part)throw Error('Transaction path alias');
  current=path.join(current,part);const stat=fs.lstatSync(current,{throwIfNoEntry:false});if(stat?.isSymbolicLink())throw Error('Transaction path symlink rejected');
 }
 return current;
}
export function contextFor(root:string):TransactionContext|undefined{
 const ctx=transactionContext.getStore();if(!ctx)return;
 if(!ctx.open)throw Error('Transaction context closed');
 if(ctx.root!==root)throw Error('Transaction scope mismatch');
 return ctx;
}
export function observe(ctx:TransactionContext,file:string){if(!ctx.reads.has(file))ctx.reads.set(file,diskHash(file));}
export function directoryNames(file:string):string[]{try{return fs.readdirSync(file).sort();}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}

export function observeDirectory(ctx:TransactionContext,file:string){if(!ctx.lists.has(file)){const kind=diskKind(file);if(kind!=='missing'&&kind!=='directory')throw Error('Expected directory dependency');ctx.lists.set(file,JSON.stringify({existed:kind==='directory',names:directoryNames(file)}));}}
