import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
try {
  if(!args.includes('--root')) throw Error('Required --root');
  const root=fs.realpathSync(option('--root'));
  const checked=file=>{
    const absolute=path.resolve(file);let ancestor=absolute;
    while(!fs.existsSync(ancestor)){if(fs.lstatSync(ancestor,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Invalid symlink');ancestor=path.dirname(ancestor);}
    const resolved=path.join(fs.realpathSync(ancestor),path.relative(ancestor,absolute));
    const relative=path.relative(root,resolved);
    if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Path outside project');
    return absolute;
  };
  const taskId=option('--task',''),status=option('--status','needs-review'),reason=option('--reason','');
  if(!/^[a-f0-9]{32}$/.test(taskId))throw Error('Invalid task id');
  if(!['needs-review','blocked','needs-input'].includes(status))throw Error('Invalid status');
  const base=path.join(root,'growth-workspace'),file=checked(path.join(base,'tasks',taskId+'.json'));
  const task=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  if(task.id!==taskId)throw Error('Task id mismatch');
  const write=(target,value)=>{
    checked(target);fs.mkdirSync(path.dirname(target),{recursive:true});checked(target);
    const temp=target+'.'+crypto.randomUUID()+'.tmp';
    try{fs.writeFileSync(temp,value,{flag:'wx'});fs.renameSync(temp,target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  };
  if(status==='needs-review') {
    if(!args.includes('--file'))throw Error('Actual output file required');
    const source=checked(fs.realpathSync(option('--file'))),content=fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'');
    if(!content.trim())throw Error('Empty output');
    const output=checked(path.join(base,'artifacts',taskId+'.md'));write(output,content);
    if(fs.readFileSync(output,'utf8')!==content)throw Error('Readback failed');
    task.artifact=path.relative(base,output);
  }else if(!reason.trim())throw Error('A blocked task requires a reason');
  Object.assign(task,{status,error:reason,updatedAt:new Date().toISOString()});delete task.reviewedHash;delete task.finishedAt;
  write(file,JSON.stringify(task,null,2));
  console.log(JSON.stringify({taskId,status,artifact:task.artifact,readback:true}));
}catch(error){console.error(error.code?'文件操作失败，请检查项目目录与文件权限':error.message);process.exitCode=1;}
