import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import {withWorkspaceWrite,withWorkspaceRead} from '../../src/storage/transaction.ts';
import {WorkspaceStore} from '../../src/storage/workspace-store.ts';
const [root,boundary,mode='write']=process.argv.slice(2);
const store=new WorkspaceStore(root);
// Fault injection is entirely in this fixture: no runtime option or HTTP route.
function pauseDirectory(file){if(boundary==='directory-before-file'&&(String(file)===store.base||String(file).startsWith(store.base+path.sep))){process.send?.({event:'boundary',point:'directory-before-file',pid:process.pid,path:String(file)});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}}
const spawn=childProcess.spawnSync;childProcess.spawnSync=function(file,args,options){const result=spawn(file,args,options);if(process.platform==='linux'&&String(file).endsWith('/rename-directory-noreplace')&&result.status===0)pauseDirectory(args[1]);return result;};
const mkdir=fs.mkdirSync;fs.mkdirSync=function(file,...args){const absent=!fs.existsSync(file);const result=mkdir(file,...args);if(absent)pauseDirectory(file);return result;};
const rename=fs.renameSync;let applied=0;
fs.renameSync=function(from,to){if(boundary==='file-before-rename'&&String(to).startsWith(store.base+path.sep)&&fs.statSync(from).isFile()){process.send?.({event:'boundary',point:'file-before-rename',pid:process.pid,source:String(from),target:String(to)});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}rename(from,to);if(fs.statSync(to).isDirectory()){pauseDirectory(to);return;}let point;
 if(String(to).endsWith('journal.json'))point=JSON.parse(fs.readFileSync(to,'utf8')).phase;
 else if(String(to).includes(path.sep+'growth-workspace'+path.sep))point='replace-'+(++applied);
 if(point===boundary){process.send?.({event:'boundary',point,pid:process.pid});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}
};
try{
 if(mode==='read'){process.send?.({event:'reader-started'});await withWorkspaceRead(root,()=>process.send?.({event:'read',values:['a.txt','b.txt'].map(n=>store.read(path.join(store.base,n)))}));}
 else if(mode==='bootstrap-directory')await withWorkspaceWrite(root,{},()=>{store.put(path.join(store.base,'workspace.json'),{workspaceId:'bootstrap-fixture'});store.write(path.join(store.base,'new-folder','nested','a.txt'),'new-a');});
 else if(mode==='directory')await withWorkspaceWrite(root,{},()=>{store.exists(path.join(store.base,'new-folder'));store.files('new-folder','.txt');store.write(path.join(store.base,'new-folder','nested','a.txt'),'new-a');store.write(path.join(store.base,'new-folder','nested','b.txt'),'new-b');});
 else await withWorkspaceWrite(root,{},()=>{store.write(path.join(store.base,'a.txt'),'new-a');store.write(path.join(store.base,'b.txt'),'new-b');});
 process.send?.({event:'done'});
}catch(error){process.send?.({event:'error',message:String(error)});process.exitCode=1;}
process.disconnect?.();

