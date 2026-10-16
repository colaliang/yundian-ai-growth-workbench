import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {SkillDefinition,TaskRun,Workspace} from '../domain/contracts.ts';
import {WorkspaceStore} from '../storage/workspace-store.ts';
export interface CatalogSkill extends SkillDefinition {stage:string;title:string;origin:'official'|'customer';contentHash:string;instructions:string;status:string}
const hash=(body:Buffer)=>crypto.createHash('sha256').update(body).digest('hex');
export function loadSkills(appRoot:string,customerRoot:string):CatalogSkill[]{
 const guard=new WorkspaceStore(customerRoot);
 const customerFile=(file:string)=>{const target=guard.checked(file);let cursor=target;while(cursor!==guard.root){if(fs.lstatSync(cursor,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Customer skill symlink rejected');const parent=path.dirname(cursor);if(parent===cursor)throw Error('Customer skill path outside project');cursor=parent;}return target;};
 const registry=JSON.parse(fs.readFileSync(path.join(appRoot,'skills/registry.json'),'utf8'));const list:CatalogSkill[]=[];
 for(const [stage,entry] of Object.entries(registry) as [string,any][]){
 const official=path.resolve(appRoot,entry.path);const rel=path.relative(appRoot,official);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Invalid official skill path');
 const content=fs.readFileSync(official);const installed=customerFile(path.join(guard.root,'.codebuddy/skills',entry.id,'SKILL.md'));const custom=guard.exists(installed)?guard.readBytes(installed):null;
 // Shared submission helpers and referenced briefs are part of the executable contract.
 const required:string[]=[];
 const walk=(folder:string)=>{for(const ent of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(ent.name==='__pycache__'||ent.name.endsWith('.pyc'))continue;const file=path.join(folder,ent.name);if(ent.isSymbolicLink())throw Error('Official skill symlink rejected');if(ent.isDirectory())walk(file);else if(ent.isFile())required.push(file);}};
 walk(path.dirname(official));const shared=path.join(appRoot,'skills/yundian-growth-workbench');if(path.dirname(official)!==shared)walk(shared);
 const identity=crypto.createHash('sha256');let same=!!custom;const accounted=new Set<string>();
 for(const source of required){const relative=path.relative(path.join(appRoot,'skills'),source);const target=customerFile(path.join(guard.root,'.codebuddy/skills',relative));accounted.add(target);const bytes=guard.exists(target)?guard.readBytes(target):null;if(!bytes||!bytes.equals(fs.readFileSync(source)))same=false;identity.update(relative.split(path.sep).join('/')+'\0');identity.update(bytes??Buffer.from('MISSING'));identity.update('\0');}
 // Custom-only references belong to the selected skill or the shared helper skill.
 // Inventory those bounded folders, never resolve prose URLs/absolute/traversal paths.
 const customWalk=(folder:string)=>{const dir=customerFile(folder);if(!guard.exists(dir))return;for(const ent of guard.listDirectory(dir).sort((a,b)=>a.name.localeCompare(b.name))){if(ent.name==='__pycache__'||ent.name.endsWith('.pyc'))continue;const file=customerFile(path.join(dir,ent.name));if(ent.isDirectory())customWalk(file);else if(ent.isFile()&&!accounted.has(file)){accounted.add(file);identity.update(path.relative(path.join(guard.root,'.codebuddy/skills'),file).split(path.sep).join('/')+'\0');identity.update(guard.readBytes(file));identity.update('\0');}}};
 customWalk(path.dirname(installed));const customShared=path.join(guard.root,'.codebuddy/skills/yundian-growth-workbench');if(path.dirname(installed)!==customShared)customWalk(customShared);
 const customerHash=identity.digest('hex');const definition:CatalogSkill={stage,title:entry.title,skillId:entry.id,version:entry.version,entry:official,inputs:[entry.inputs],outputs:[entry.outputs],acceptance:[entry.acceptance],instructions:entry.instructions,origin:'official',contentHash:hash(content),status:same?'installed':custom?'different':'not-installed'};
 if(!definition.version||!definition.inputs[0]||!definition.outputs[0]||!definition.acceptance[0])throw Error('Incomplete skill contract: '+entry.id);
 list.push(definition);
 if(custom&&!same)list.push({...definition,origin:'customer',entry:installed,version:'customer-'+customerHash.slice(0,12),contentHash:customerHash,status:'custom'});
 }
 return list;
}
export function buildInvocation(skill:SkillDefinition,task:TaskRun,workspace:Workspace):string{
 if(task.workspaceId!==workspace.workspaceId||task.skillId!==skill.skillId||task.skillVersion!==skill.version)throw Error('Task skill/workspace mismatch');
 const root=workspace.projectRoot.replaceAll('\\','/');const output=root+'/growth-workspace/artifacts/'+task.id+'.md';const data=task as TaskRun&{inputs?:string;instructions?:string;name?:string;acceptance?:string};
 return `在当前 WorkBuddy 客户项目读取并使用技能文件：${skill.entry}\n任务编号 taskId：${task.id}\nworkspaceId：${workspace.workspaceId}\n技能 skillId：${skill.skillId}\n版本 skillVersion：${skill.version}\n阶段：${task.stage}\n目标：${data.name||''}\n客户项目：${workspace.projectRoot}\n知识库：${root}/growth-workspace/knowledge/\n输入快照：${task.inputSnapshotRef}\n业务输入：${data.inputs||'缺少业务输入，先核对知识库并补资料'}\n执行步骤：${data.instructions||'按技能流程执行，记录缺口'}\n产物要求：${skill.outputs.join('；')}\n验收：${data.acceptance||skill.acceptance.join('；')}\n成果目录：${root}/growth-workspace/artifacts/\n保存实际 Markdown 结果：${output}\n复制仅表示待执行；缺工具或授权时输出方案及未执行项。发送、发布、广告与预算修改须核验明确授权；不能编造宿主或外部 API。\n回写格式：使用已安装的真实脚本（未安装先安装并核验）；通过任务 applicationRoot 指向的真实应用共享回执管线校验；能力不可用则停止并报告缺口。成功返回 taskId、status:"needs-review"、artifactIds、receiptId、readback:true，不代替客户验收。\nnode "${root}/.codebuddy/skills/yundian-growth-workbench/scripts/submit_result.mjs" --root "${root}" --task ${task.id} --file "${output}" --application "${String((task as any).applicationRoot||'').replaceAll('\\','/')}"\n受阻用同脚本 --status needs-input --reason "实际缺口"（不带 --file），不得模拟成功。`;
}
