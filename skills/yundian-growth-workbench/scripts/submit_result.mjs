import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

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
  // Application-created tasks must use the actual shared receipt implementation.
  // An installed skill lives in a customer project; never resolve a relative repo import.
  const manifestFile=checked(path.join(base,'workspace.json'));
  const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8').replace(/^\uFEFF/,'')):{};
  {
    const ownApplication=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
    const requested=option('--application',fs.existsSync(path.join(ownApplication,'package.json'))?ownApplication:null);
    if(!requested)throw Error('Required --application ACTUAL_WORKBENCH_DIRECTORY: installed standalone skills cannot infer an executable application from customer task data');
    const application=fs.realpathSync(requested);
    if(task.applicationRoot&&application!==fs.realpathSync(task.applicationRoot))throw Error('Task application location differs from explicitly selected actual workbench');
    const inData=path.relative(base,application);if(!inData.startsWith('..')&&!path.isAbsolute(inData))throw Error('Customer artifacts cannot be an executable application');
    const module=path.join(application,'server.ts');
    if(!fs.existsSync(module)||fs.lstatSync(module).isSymbolicLink())throw Error('Actual workbench application is unavailable; no result registered');
    const appPackage=JSON.parse(fs.readFileSync(path.join(application,'package.json'),'utf8'));
    if(appPackage.name!=='yundian-ai-growth-workbench'||!fs.existsSync(path.join(application,'src/domain/tasks.ts')))throw Error('Actual application receipt capability is unavailable');
    const runtime=path.join(application,'src/runtime/workspace.ts');
    const {openFileWorkspace,runWorkspaceMutation}=await import(pathToFileURL(runtime).href);
    const store=await openFileWorkspace(root);
    let artifacts=[];
    if(status==='needs-review') {
      if(!args.includes('--file'))throw Error('Actual output file required');
      const source=checked(fs.realpathSync(option('--file'))),content=fs.readFileSync(source);
      if(!content.toString('utf8').trim())throw Error('Empty output');
      artifacts=[{path:path.relative(root,source),summary:task.name||'实际报告',sources:[],gaps:['文件由技能手动提交，执行来源未核验'],nextSteps:[]}];
    }else if(!reason.trim())throw Error('A blocked task requires a reason');
    const receipt={taskId,workspaceId:task.workspaceId??store.json(manifestFile).workspaceId,skillVersion:task.skillVersion??'legacy',executor:'manual',status:status==='blocked'?'needs-input':status,reason,artifacts};
    receipt.receiptId=crypto.createHash('sha256').update(JSON.stringify(receipt)+(artifacts.length?fs.readFileSync(path.resolve(root,artifacts[0].path)): '')).digest('hex');
    const result=await runWorkspaceMutation(root,{},current=>current.applyReceipt(taskId,receipt,current.load().revision),current=>current.task(taskId));
    console.log(JSON.stringify({taskId,status:result.status,artifactIds:result.artifactIds,receiptId:receipt.receiptId,readback:true}));
    process.exit(0);
  }
}catch(error){console.error(error.code?'文件操作失败，请检查项目目录与文件权限':error.message);process.exitCode=1;}
