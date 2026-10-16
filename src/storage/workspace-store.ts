import {publicationFamilies,validatePublicationPath} from './publication-path.ts';
import {contextFor,observe,observeDirectory,diskKind,directoryNames,safeRelative} from './transaction-context.ts';
import fs from 'node:fs';
import path from 'node:path';
type Data = Record<string, any>;
export class WorkspaceStore {
 root:string;
 base:string;
 constructor(root:string) { this.root=fs.realpathSync(root); if(!fs.statSync(this.root).isDirectory()) throw Error('Project root must be a directory'); this.base=path.join(this.root,'growth-workspace'); }
 checked(file:string):string{
  const absolute=path.resolve(file),relative=path.relative(this.root,absolute);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Path outside project');
  let current=this.root;for(const part of relative.split(path.sep)){current=path.join(current,part);if(fs.lstatSync(current,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Invalid symlink');}
  return absolute;
 }
 private guarded(file:string){const absolute=this.checked(file);if(contextFor(this.root))safeRelative(this.root,path.relative(this.root,absolute).split(path.sep).join('/'));return absolute;}
 readBytes(file:string):Buffer{file=this.guarded(file);const ctx=contextFor(this.root);if(ctx?.staged.has(file))return Buffer.from(ctx.staged.get(file)!);const kind=diskKind(file);if(kind!=='file'&&kind!=='missing')throw Error('Expected regular file bytes');if(ctx)observe(ctx,file);return fs.readFileSync(file);}
 exists(file:string):boolean{file=this.guarded(file);const ctx=contextFor(this.root);if(ctx){if(ctx.staged.has(file)||[...ctx.staged.keys()].some(p=>p.startsWith(file+path.sep)))return true;const kind=diskKind(file);if(!ctx.existence.has(file))ctx.existence.set(file,kind);if(kind==='file')observe(ctx,file);if(kind==='directory')observeDirectory(ctx,file);}return fs.existsSync(file);}
 read(file:string):string{return this.readBytes(file).toString('utf8').replace(/^\uFEFF/,'');}
 json(file:string):Data{return JSON.parse(this.read(file));}
 writeBytes(file:string,bytes:Buffer):void{
  file=this.guarded(file);const ctx=contextFor(this.root);
  if(ctx){if(!ctx.writable)throw Error('Read transaction cannot write');for(let dir=path.dirname(file);dir!==this.root;dir=path.dirname(dir))observeDirectory(ctx,dir);observe(ctx,file);ctx.staged.set(file,Buffer.from(bytes));return;}
  throw Error('Business writes require an active writable transaction context');
 }
 write(file:string,value:string){this.writeBytes(file,Buffer.from(value));}
 put(file:string,value:unknown){this.write(file,JSON.stringify(value,null,2));}
 listDirectory(file:string):{name:string;isDirectory:()=>boolean;isFile:()=>boolean;isSymbolicLink:()=>boolean}[]{
  file=this.guarded(file);const ctx=contextFor(this.root),names=directoryNames(file);if(ctx){observeDirectory(ctx,file);for(const staged of ctx.staged.keys()){const rel=path.relative(file,staged);if(rel&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel)){const name=rel.split(path.sep)[0];if(!names.includes(name))names.push(name);}}}
  return names.sort().map(name=>{const target=path.join(file,name),stagedFile=ctx?.staged.has(target),stagedDir=ctx&&[...ctx.staged.keys()].some(p=>p.startsWith(target+path.sep)),kind=stagedFile?'file':stagedDir?'directory':diskKind(target);return {name,isDirectory:()=>kind==='directory',isFile:()=>kind==='file',isSymbolicLink:()=>fs.lstatSync(target,{throwIfNoEntry:false})?.isSymbolicLink()??false};});
 }
 files(folder:string,ext:string):string[]{
  const dir=this.guarded(path.join(this.base,folder)),ctx=contextFor(this.root),names=directoryNames(dir);
  if(ctx){observeDirectory(ctx,dir);for(const file of ctx.staged.keys())if(path.dirname(file)===dir&&!names.includes(path.basename(file)))names.push(path.basename(file));}
  const known=publicationFamilies.includes(folder.toLowerCase());
  if(known){for(const name of directoryNames(this.base))validatePublicationPath('growth-workspace/'+name);const aliases=new Set<string>();for(const name of names){validatePublicationPath('growth-workspace/'+folder+'/'+name);const file=this.checked(path.join(dir,name)),value=this.json(file),key=name.toLowerCase();if(name!==value.id+'.json'||aliases.has(key))throw Error('Publication filename or alias mismatch');aliases.add(key);}}
  return names.filter(n=>n.endsWith(ext)).sort().map(n=>this.checked(path.join(dir,n)));
 }
}
