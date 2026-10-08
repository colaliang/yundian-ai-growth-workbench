import {createSnapshot,restoreSnapshot,setOnlineBackup} from './src/backup/service.ts';
import {inspectUpdate} from './src/updates/check.ts';
import {deliveryCatalog,createDeliveryProgram,deliveryProgress} from './src/domain/delivery.ts';
import {createSchedule,registerHostReceipt,requestPause,occurrenceKey,validateOccurrence,authorizationAllowed} from './src/scheduling/service.ts';
import {dailyContext,recommendDaily} from './src/domain/daily-actions.ts';
import {createTask as newTask,applyReceipt as validateReceipt} from './src/domain/tasks.ts';
import {safeArtifactUrl,contentHash,inspectArtifact,reviewArtifact as newReview} from './src/domain/artifacts.ts';
import {knowledgeEntry} from './src/domain/knowledge.ts';
import {loadSkills,buildInvocation} from './src/skills/catalog.ts';
import { WorkspaceStore } from './src/storage/workspace-store.ts';
import { migrateWorkspace } from './src/storage/migrate.ts';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

type Data = Record<string, any>;
const APP = path.dirname(fileURLToPath(import.meta.url));
const VERSION=JSON.parse(fs.readFileSync(path.join(APP,'package.json'),'utf8')).version;
export function releaseInfo(value: Data,current=VERSION): Data {
  if(!/^\d+\.\d+\.\d+$/.test(value.version)||value.tag!=='v'+value.version) throw Error('Invalid release metadata');
  const a=value.version.split('.').map(Number),b=current.split('.').map(Number);
  let available=false;for(let i=0;i<3;i++){if(a[i]!==b[i]){available=a[i]>b[i];break;}}
  return {current,latest:value.version,tag:value.tag,available,notes:String(value.notes??'').slice(0,4000),url:'https://github.com/colaliang/yundian-ai-growth-workbench/releases/tag/'+value.tag};
}
export const STAGES = ['market-research','product-opportunity','site-and-content','seo-geo','content-operations','acquisition','buyer-check','sales-feedback','next-cycle'];
const SUPPORTED_STAGES=[...STAGES,'seo','geo','social-media','facebook-ads','google-ads','email-outreach'];
const id = () => crypto.randomUUID().replaceAll('-', '');
const validId = (v: string) => /^[a-f0-9]{32}$/.test(v);
const sha = (v: Buffer) => crypto.createHash('sha256').update(v).digest('hex');

// 云服务公开配置：优先环境变量，其次应用根目录 cloud-config.json；未配置返回 null，前端自动降级为无云服务模式。
const loadCloudConfig = (): { endpoint: string; publishableKey: string } | null => {
  const fromEnv = (() => {
    const endpoint = process.env.WORKBENCH_CLOUD_ENDPOINT, publishableKey = process.env.WORKBENCH_CLOUD_KEY;
    return endpoint && publishableKey ? { endpoint, publishableKey } : null;
  })();
  if (fromEnv) return fromEnv;
  try {
    const file = path.join(APP, 'cloud-config.json');
    if (!fs.existsSync(file)) return null;
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (config && typeof config.endpoint === 'string' && typeof config.publishableKey === 'string') return { endpoint: config.endpoint, publishableKey: config.publishableKey };
  } catch {}
  return null;
};

export class FileWorkspace extends WorkspaceStore {
  constructor(root:string) { super(root); migrateWorkspace(root); this.initialize(); migrateWorkspace(root); }
  initialize() {
    const templates=JSON.parse(fs.readFileSync(path.join(APP,'workspace-defaults.json'),'utf8'));
    const workspace=JSON.parse(templates['workspace.json']);
    workspace.workspaceId=crypto.randomUUID(); workspace.projectRoot=this.root;
    templates['workspace.json']=JSON.stringify(workspace,null,2)+'\n';
    const pairs=Object.entries(templates).map(([rel,value])=>[this.checked(path.join(this.base,rel)),value as string]);
    for(const [file,value] of pairs) {
      fs.mkdirSync(path.dirname(file),{recursive:true});
      try { fs.writeFileSync(file,value,{flag:'wx'}); } catch(e:any) { if(e.code!=='EEXIST') throw e; }
    }
    for(const name of ['tasks','artifacts','workflows','feedback','records','audits']) fs.mkdirSync(this.checked(path.join(this.base,name)),{recursive:true});
  }
  registry(): Data { return JSON.parse(fs.readFileSync(path.join(APP,'skills/registry.json'),'utf8')); }
  skills(): Data {
    const catalog=loadSkills(APP,this.root);
    return Object.fromEntries(Object.entries(this.registry()).map(([stage,entry]:[string,any])=>{
      const variants=catalog.filter(skill=>skill.stage===stage);
      return [stage,{...entry,status:variants[0].status,installedPath:this.checked(path.join(this.root,'.codebuddy/skills',entry.id,'SKILL.md')),variants}];
    }));
  }
  install() {
    const pairs: [string,string][]=[[path.join(APP,'skills/registry.json'),path.join(this.root,'.codebuddy/skills/registry.json')]];
    const walk=(src:string,dst:string)=>{
      for(const ent of fs.readdirSync(src,{withFileTypes:true})) {
        if(ent.name==='__pycache__') continue;
        const source=path.join(src,ent.name),target=this.checked(path.join(dst,ent.name));
        if(ent.isDirectory()) walk(source,target); else if(ent.isFile()) pairs.push([source,target]);
      }
    };
    for(const ent of fs.readdirSync(path.join(APP,'skills'),{withFileTypes:true})) if(ent.isDirectory()&&fs.existsSync(path.join(APP,'skills',ent.name,'SKILL.md'))) walk(path.join(APP,'skills',ent.name),path.join(this.root,'.codebuddy/skills',ent.name));
    for(const [src,dst] of pairs) if(fs.existsSync(this.checked(dst))&&!fs.readFileSync(src).equals(fs.readFileSync(dst))) throw Error('已有同名技能内容不同，保留客户版本；请按新包 manifest 的版本和 SHA-256 比较，先在独立官方版本目录暂存并审阅差异，再选择版本或合并，不覆盖客户定制');
    for(const [src,dst] of pairs) if(!fs.existsSync(dst)) this.write(dst,fs.readFileSync(src,'utf8'));
  }
  digest(): string {
    const files=[path.join(this.base,'workbench.json'),...this.files('tasks','.json'),...this.files('artifacts','.md'),...this.files('artifacts','.json'),...this.files('reviews','.json'),...this.files('receipts','.json'),...this.files('knowledge-confirmations','.json'),...this.files('knowledge','.md'),...this.files('records','.json'),...this.files('audits','.json'),...this.files('daily-decisions','.json'),...this.files('schedules','.json'),...this.files('schedule-occurrences','.json'),...this.files('delivery-programs','.json')].sort();
    const h=crypto.createHash('sha256');
    for(const file of files) if(fs.existsSync(this.checked(file))) h.update(path.relative(this.base,file)).update(fs.readFileSync(file));
    for(const f of this.files('artifacts','.json')){const a=this.json(f);if(a.path){try{h.update(a.path).update(fs.readFileSync(this.checked(path.resolve(this.root,a.path))));}catch{h.update('missing:'+a.path);}}}
    return h.digest('hex');
  }
  load(): Data {
    const db=path.join(this.base,'workbench.json');
    const state=fs.existsSync(db)?this.json(db):{profile:{},tasks:[],feedback:[]};
    state.tasks=this.files('tasks','.json').map(f=>this.json(f)).filter(t=>SUPPORTED_STAGES.includes(t.stage)&&validId(t.id)).map(t=>{
      const file=this.checked(path.join(this.base,'artifacts',t.id+'.md'));
      if(!t.workspaceId&&!t.inputSnapshotRef&&!t.applicationRoot&&!t.scheduleId&&fs.existsSync(file)) {
        t.artifact=path.relative(this.base,file);
        if(!['blocked','needs-input','failed','cancelled'].includes(t.status)&&(t.status!=='completed'||t.reviewedHash!==sha(fs.readFileSync(file)))) t.status='needs-review';
      }
      return t;
    });
    state.workspace=this.json(path.join(this.base,'workspace.json'));
    state.artifacts=this.files('artifacts','.json').map(f=>{const a=this.json(f);try{return inspectArtifact(this,a as any);}catch{return {...a,verification:'unverified',contentHash:null,error:'实际文件丢失或无法读取'};}});
    for(const t of state.tasks){const file=this.checked(path.join(this.base,'artifacts',t.id+'.md'));if(!t.workspaceId&&!t.inputSnapshotRef&&!t.applicationRoot&&!t.scheduleId&&fs.existsSync(file)&&!state.artifacts.some((a:Data)=>a.taskId===t.id&&a.path===path.relative(this.root,file))){state.artifacts.push({id:t.id,workspaceId:state.workspace.workspaceId,taskId:t.id,module:t.stage,skillVersion:t.skillVersion||'legacy',inputSnapshotRef:t.inputSnapshotRef||'',path:path.relative(this.root,file),summary:t.name,sources:[],gaps:['历史文件，执行来源未核验'],nextSteps:[],executedAt:null,verification:'unverified',contentHash:contentHash(fs.readFileSync(file)),executor:'legacy'});}}
    state.reviews=this.files('reviews','.json').map(f=>this.json(f)).map(r=>({...r,valid:state.artifacts.some((a:Data)=>a.id===r.artifactId&&a.contentHash===r.contentHash&&a.contentHash!==null)}));
    for(const t of state.tasks){if(t.reviewedHash&&!state.reviews.some((r:Data)=>r.taskId===t.id)){const a=state.artifacts.find((a:Data)=>a.taskId===t.id&&a.id===t.id);if(a)state.reviews.push({id:'legacy-'+t.id,workspaceId:state.workspace.workspaceId,taskId:t.id,artifactId:a.id,contentHash:t.reviewedHash,reviewedAt:t.finishedAt||'',evidence:t.review||'历史验收',decision:'accepted',valid:a.contentHash===t.reviewedHash});}}
    for(const t of state.tasks){const artifacts=state.artifacts.filter((a:Data)=>a.taskId===t.id);if(artifacts.length){t.artifactIds=artifacts.map((a:Data)=>a.id);const all=artifacts.every((a:Data)=>a.contentHash&&(()=>{const latest=state.reviews.filter((r:Data)=>r.artifactId===a.id).sort((x:Data,y:Data)=>(x.sequence||0)-(y.sequence||0)||String(x.reviewedAt).localeCompare(String(y.reviewedAt))).at(-1);return latest?.valid&&latest.decision==='accepted';})());t.status=all&&['completed','needs-review'].includes(t.status)?'completed':(t.status==='completed'||t.status==='needs-review')?'needs-review':t.status;}}
    state.serviceCatalog=deliveryCatalog();
    state.deliveryPrograms=this.files('delivery-programs','.json').map(f=>this.json(f)).filter(p=>p.workspaceId===state.workspace.workspaceId).map(p=>{const progress=deliveryProgress(p as any,state.tasks,state.artifacts,state.reviews);return {...p,artifactIds:progress.artifactIds,progress};});
    const confirmations=this.files('knowledge-confirmations','.json').map(f=>this.json(f));
    state.knowledge=this.files('knowledge','.md').map(f=>knowledgeEntry(path.relative(this.base,f),this.read(f),state.workspace.workspaceId,confirmations.find(c=>c.path===path.relative(this.base,f))));
    state.records=this.files('records','.json').map(f=>this.json(f));
    state.audits=this.files('audits','.json').map(f=>({id:path.basename(f,'.json'),...this.json(f)}));
    state.dailyDecisions=this.files('daily-decisions','.json').reduce((all:Data,f)=>{const row=this.json(f);if(row.workspaceId===state.workspace.workspaceId)all[row.id]=row;return all;},{});
    state.schedules=this.files('schedules','.json').map(f=>this.json(f)).filter(s=>s.workspaceId===state.workspace.workspaceId);
    state.scheduleOccurrences=this.files('schedule-occurrences','.json').map(f=>this.json(f)).filter(s=>s.workspaceId===state.workspace.workspaceId);
    const taskReceipts=this.files('receipts','.json').map(f=>this.json(f));
    state.scheduleOccurrences=state.scheduleOccurrences.map((o:Data)=>{
      if(!o.taskId||o.status==='pending-confirmation')return o;
      const task=state.tasks.find((t:Data)=>t.id===o.taskId);
      if(!task)return o;
      // The task's exact current receipt reference is registration ordered, never filename/execution-time ordered.
      const record=task.latestReceiptKey&&taskReceipts.find((r:Data)=>r.taskId===o.taskId&&r.receiptKey===task.latestReceiptKey);
      const last=record?.receipt;
      return last?{...o,status:task.status,result:last.receiptId,error:last.reason||null,actualAt:last.executedAt||null}:o;
    });
    state.schedulerCapabilities={create:false,pause:false,verify:false,mode:'command-only',reason:'未发现可核验的 WorkBuddy 原生调度 API；复制指令后在宿主创建。'};
    state.settings=state.settings??{}; state.version=VERSION; state.skills=this.skills(); state.dailyActions=recommendDaily(dailyContext(state),new Date().toISOString()); state.revision=this.digest(); return state;
  }
  checkRevision(revision:string){if(revision!==this.digest())throw Error('资料已被其他操作更新，请刷新后重试');}
  createTask(input:Data,revision:string):Data{const before=this.load().tasks.map((t:Data)=>t.id);const state=this.save({action:'task',payload:input,revision});return state.tasks.find((t:Data)=>!before.includes(t.id));}
  task(taskId:string):Data{if(!validId(taskId))throw Error('Invalid task');const file=path.join(this.base,'tasks',taskId+'.json');if(!fs.existsSync(file))throw Error('任务不存在');const task=this.json(file);if(task.id!==taskId)throw Error('任务文件编号不匹配');if(task.workspaceId&&task.workspaceId!==this.json(path.join(this.base,'workspace.json')).workspaceId)throw Error('任务客户不匹配');return task;}
  registerManual(task:Data,file:string):Data{
    const artifactId=task.id;const artifact={id:artifactId,workspaceId:this.load().workspace.workspaceId,taskId:task.id,module:task.stage,skillVersion:task.skillVersion||'legacy',inputSnapshotRef:task.inputSnapshotRef||'',executedAt:null,path:path.relative(this.root,file),summary:task.name,sources:[],gaps:['手动保存，执行来源未核验'],nextSteps:[],verification:'unverified',contentHash:contentHash(fs.readFileSync(file)),executor:'manual'};
    this.put(path.join(this.base,'artifacts',artifactId+'.json'),artifact);Object.assign(task,{artifact:path.relative(this.base,file),artifactIds:[...new Set([...(task.artifactIds||[]),artifactId])],status:'needs-review'});this.put(path.join(this.base,'tasks',task.id+'.json'),task);return artifact;
  }
  applyReceipt(taskId:string,receipt:Data,revision:string):Data{
    this.checkRevision(revision);const task=this.task(taskId),workspaceId=this.load().workspace.workspaceId;
    const normalized={...task,workspaceId:task.workspaceId||workspaceId,skillVersion:task.skillVersion||'legacy'};
    if(receipt.taskId!==taskId)throw Error('回执任务不匹配');
    const updated:any=validateReceipt(normalized as any,receipt as any);
    const receiptKey=contentHash(taskId+'\n'+receipt.receiptId),receiptFile=path.join(this.base,'receipts',receiptKey+'.json'),fingerprint=contentHash(JSON.stringify(receipt));
    if(fs.existsSync(receiptFile)){if(this.json(receiptFile).fingerprint!==fingerprint)throw Error('receiptId 已存在且内容不同');return this.load().tasks.find((t:Data)=>t.id===taskId);}
    if(task.scheduleId){
      const state=this.load(),schedule=state.schedules.find((s:Data)=>s.id===task.scheduleId);
      const occurrence=state.scheduleOccurrences.find((o:Data)=>o.scheduleId===task.scheduleId&&o.taskId===taskId&&o.scheduledAt===task.scheduledAt);
      if(!schedule||!occurrence)throw Error('定时任务计划或执行批次不匹配');
      if(occurrence.status==='pending-confirmation'||!authorizationAllowed(schedule as any)||!authorizationAllowed({...schedule,operation:task.operation,authorization:task.authorization} as any))throw Error('外部动作待确认，不能登记已执行');
      if(['failed','cancelled','needs-review','completed'].includes(task.status)||['failed','cancelled','needs-review','completed'].includes(occurrence.status))throw Error('执行批次已结束，请核验原回执，禁止自动重试');
    }
    const registrationSequence=Math.max(0,...this.files('receipts','.json').map(f=>Number(this.json(f).registrationSequence)||0))+1;
    if(receipt.executedAt&&Number.isNaN(Date.parse(receipt.executedAt)))throw Error('执行时间无效');
    const rows=(receipt.artifacts||[]).map((input:Data,i:number)=>{
      for(const key of ['sources','gaps','nextSteps'])if(input[key]!==undefined&&(!Array.isArray(input[key])||!input[key].every((value:unknown)=>typeof value==='string')))throw Error('产物 '+key+' 必须为字符串数组，请使用 ["内容"] 或 []');
      if(Boolean(input.path)===Boolean(input.url))throw Error('产物需要一个文件或链接');
      if(input.url&&!safeArtifactUrl(input.url))throw Error('链接协议无效');
      const a:any={id:contentHash(receiptKey+':'+i).slice(0,32),workspaceId,taskId,module:task.stage,skillVersion:normalized.skillVersion,inputSnapshotRef:task.inputSnapshotRef||'',executedAt:receipt.executor==='manual'?null:receipt.executedAt||new Date().toISOString(),summary:String(input.summary||''),sources:input.sources||[],gaps:input.gaps||[],nextSteps:input.nextSteps||[],executor:receipt.executor,verification:input.path&&receipt.executor!=='manual'?'verified':'unverified',contentHash:null,...(input.path?{path:path.relative(this.root,this.checked(path.resolve(this.root,input.path)))}:{url:input.url})};
      return inspectArtifact(this,a);
    });
    for(const a of rows)this.put(path.join(this.base,'artifacts',a.id+'.json'),a);
    delete updated.reviewedHash;delete updated.finishedAt;updated.latestReceiptKey=receiptKey;updated.artifactIds=[...new Set([...(task.artifactIds||[]),...rows.map((a:Data)=>a.id)])];updated.executor=receipt.executor;updated.reason=receipt.reason||'';
    this.put(path.join(this.base,'tasks',taskId+'.json'),updated);this.put(receiptFile,{workspaceId,taskId,receiptId:receipt.receiptId,receiptKey,registrationSequence,registeredAt:new Date().toISOString(),fingerprint,receipt});return this.load().tasks.find((t:Data)=>t.id===taskId);
  }
  reviewArtifact(taskId:string,hash:string,decision:string,evidence:string,revision:string,artifactId?:string):Data{
    this.checkRevision(revision);const task=this.task(taskId),state=this.load(),a=state.artifacts.find((a:Data)=>a.taskId===taskId&&a.contentHash===hash&&hash!==null&&(!artifactId||a.id===artifactId));
    if(!a)throw Error('产物不存在或内容已变化，请刷新');if(!evidence?.trim())throw Error('请记录验收依据');
    const review={...newReview(taskId,hash,decision),workspaceId:state.workspace.workspaceId,artifactId:a.id,evidence,sequence:state.reviews.filter((r:Data)=>r.artifactId===a.id).length+1};this.put(path.join(this.base,'reviews',review.id+'.json'),review);
    const overall=this.load().tasks.find((t:Data)=>t.id===taskId).status;
    Object.assign(task,{status:decision==='accepted'?overall:'needs-review',review:evidence,reviewedHash:hash,finishedAt:review.reviewedAt});this.put(path.join(this.base,'tasks',taskId+'.json'),task);return review;
  }
  confirmKnowledge(relative:string,hash:string,revision:string):Data{
    this.checkRevision(revision);const entry=this.load().knowledge.find((k:Data)=>k.path===relative);if(!entry||entry.contentHash!==hash)throw Error('知识内容已变化，请刷新后确认');
    const confirmation={path:relative,contentHash:hash,confirmedAt:new Date().toISOString(),workspaceId:entry.workspaceId};this.put(path.join(this.base,'knowledge-confirmations',entry.id+'.json'),confirmation);return confirmation;
  }
  artifact(artifactId:string):Data{if(!validId(artifactId))throw Error('Invalid artifact');const a=this.load().artifacts.find((a:Data)=>a.id===artifactId);if(!a)throw Error('产物不存在');return a;}
  save(body: Data): Data {
    const current=this.load();
    if(body.revision!==current.revision) throw Error('资料已被其他操作更新，请刷新后重试');
    const p=body.payload??{},action=body.action;
    if(action==='schedule-create'){
      if(!SUPPORTED_STAGES.includes(p.stage))throw Error('计划技能阶段无效');
      const outputPath=path.relative(this.root,this.checked(path.resolve(this.root,String(p.outputPath||'growth-workspace/artifacts'))));
      const inputs=typeof p.inputs==='string'?{source:p.inputs}:p.inputs||{};
      const authorization={approved:p.approved==='yes',operation:p.operation||'draft',scope:String(p.scope||''),evidence:String(p.evidence||'')};
      const schedule=createSchedule({...p,inputs,authorization,outputPath,workspaceId:current.workspace.workspaceId,skillId:this.registry()[p.stage].id});
      schedule.command+='\n应用 CLI：'+path.join(APP,'scripts/workbench.mjs')+'\n客户根目录：'+this.root+'\n宿主创建回执：node "'+path.join(APP,'scripts/workbench.mjs')+'" --root "'+this.root+'" --command schedule-receipt --payload "客户项目内回执JSON绝对路径"\n执行批次：同一 CLI 使用 --command schedule-occurrence --payload（{id:计划编号,scheduledAt:含时区ISO计划时点}）。回执尚未核验时会拒绝执行。登记来源不会自动启用。';
      this.put(path.join(this.base,'schedules',schedule.id+'.json'),schedule);return this.load();
    }
    if(['schedule-receipt','schedule-pause','schedule-occurrence','schedule-result'].includes(action)){
      if(!validId(p.id))throw Error('计划编号无效');
      const schedule=current.schedules.find((s:Data)=>s.id===p.id);if(!schedule)throw Error('计划不存在');
      const scheduleFile=path.join(this.base,'schedules',schedule.id+'.json');
      if(action==='schedule-receipt'){
        // No trusted native verification exists. All external registrations remain pending, even with a claimed ID.
        this.put(scheduleFile,registerHostReceipt(schedule as any,p.receipt));return this.load();
      }
      if(action==='schedule-pause'){this.put(scheduleFile,requestPause(schedule as any));return this.load();}
      if(action==='schedule-occurrence'){
        const scheduledAt=validateOccurrence(schedule as any,p.scheduledAt),key=occurrenceKey(schedule.id,scheduledAt),file=path.join(this.base,'schedule-occurrences',key+'.json');
        if(fs.existsSync(file))return this.load();
        const allowed=authorizationAllowed(schedule as any),row:Data={id:key,workspaceId:current.workspace.workspaceId,scheduleId:schedule.id,scheduledAt,actualAt:null,createdAt:new Date().toISOString(),hostTaskId:schedule.hostTaskId,status:'preparing',taskId:null,result:null,error:null,retryAllowed:false};
        // Reserve before task creation: a failed attempt is retained and never automatically retried.
        this.put(file,row);
        try{
          const task=this.createTask({name:schedule.name,stage:schedule.stage,inputs:JSON.stringify(schedule.inputs),scheduleId:schedule.id,scheduledAt,operation:schedule.operation,authorization:schedule.authorization,outputPath:schedule.outputPath,instructions:allowed?'输出目录：'+schedule.outputPath+'；操作：'+schedule.operation+'；授权范围：'+JSON.stringify(schedule.authorization)+'。按技能生成实际产物；外部动作须核验配置授权及宿主回执，禁止自动重试。':'授权不足：只整理草稿和待确认事项，禁止发送、发布、修改广告及预算。'},this.load().revision);
          if(!allowed){task.status='needs-input';task.reason='外部动作待明确授权';this.put(path.join(this.base,'tasks',task.id+'.json'),task);}
          Object.assign(row,{taskId:task.id,status:allowed?'ready':'pending-confirmation'});
        }catch(error:any){Object.assign(row,{status:'failed',error:error.message});}
        this.put(file,row);return this.load();
      }
      const key=occurrenceKey(schedule.id,p.scheduledAt),file=path.join(this.base,'schedule-occurrences',key+'.json');
      if(!fs.existsSync(file))throw Error('执行批次不存在');const row=this.json(file);
      if(!row.taskId||p.receipt?.taskId!==row.taskId)throw Error('执行回执批次不匹配');
      const existingReceiptFile=path.join(this.base,'receipts',contentHash(row.taskId+'\n'+p.receipt.receiptId)+'.json');
      if(fs.existsSync(existingReceiptFile)){
        if(this.json(existingReceiptFile).fingerprint!==contentHash(JSON.stringify(p.receipt)))throw Error('receiptId 已存在且内容不同');
        return this.load(); // Exact replay is read-only, including terminal outcomes.
      }
      if(row.status==='pending-confirmation')throw Error('外部动作待确认，不能登记已执行');
      if(['failed','cancelled','needs-review','completed'].includes(current.scheduleOccurrences.find((o:Data)=>o.id===row.id)?.status)||['failed','cancelled','needs-review','completed'].includes(this.task(row.taskId).status))throw Error('执行批次已结束，请核验原回执，禁止自动重试');
      const task=this.applyReceipt(row.taskId,p.receipt,current.revision);
      Object.assign(row,{status:task.status,result:p.receipt.receiptId,error:p.receipt.reason||null,actualAt:p.receipt.executedAt||null});this.put(file,row);return this.load();
    }
    if(['daily-ignore','daily-defer','daily-create'].includes(action)){
      const suggestion=recommendDaily(dailyContext(current),new Date().toISOString()).find(a=>a.id===p.id);
      if(!suggestion)throw Error('建议已变化，请刷新后重试');
      let decision:Data={id:suggestion.id,workspaceId:current.workspace.workspaceId,status:action==='daily-ignore'?'ignored':'deferred',updatedAt:new Date().toISOString()};
      if(action==='daily-defer')decision.until=new Date(Date.now()+86400000).toISOString();
      if(action==='daily-create'){
        if(suggestion.taskId||suggestion.stage==='knowledge')throw Error('请使用现有任务或补充企业资料');
        const skill=current.skills[suggestion.stage];
        const task=this.createTask({name:suggestion.name,stage:suggestion.stage,inputs:suggestion.inputs,instructions:skill.instructions,acceptance:skill.acceptance,cycleId:suggestion.id.startsWith('feedback:')?JSON.parse(suggestion.inputs).cycleId||'cycle-1':'cycle-1'},current.revision);
        decision={...decision,status:'created',taskId:task.id};
      }
      this.put(path.join(this.base,'daily-decisions',sha(Buffer.from(suggestion.id))+'.json'),decision);return this.load();
    }
    if(action==='delivery-create'){
      if(!current.profile.company)throw Error('请先创建企业知识库');
      const program=createDeliveryProgram(String(p.templateId),current.workspace.workspaceId);
      for(const template of program.taskTemplates){if(!current.skills[template.moduleId])throw Error('阶段技能未配置');}
      for(const template of program.taskTemplates){const skill=current.skills[template.moduleId];const task=this.createTask({name:template.name,stage:template.moduleId,deliveryProgramId:program.id,inputs:'读取当前客户知识库及计划上游实际成果',instructions:skill.instructions,acceptance:template.acceptance},this.load().revision);program.taskIds.push(task.id);}
      this.put(path.join(this.base,'delivery-programs',program.id+'.json'),program);return this.load();
    }
    if(action==='receipt'){this.applyReceipt(p.taskId,p,current.revision);return this.load();}
    if(action==='knowledge-confirm'){this.confirmKnowledge(p.path,p.contentHash,current.revision);return this.load();}
    if(action==='review'){const t=current.tasks.find((t:Data)=>t.id===p.id);if(!t)throw Error('任务不存在');let a=current.artifacts.find((a:Data)=>a.taskId===t.id);if(!a){const file=this.checked(path.join(this.base,'artifacts',t.id+'.md'));if(!fs.existsSync(file))throw Error('需要先保存实际产物');a=this.registerManual(t,file);}this.reviewArtifact(t.id,p.contentHash||a.contentHash,p.decision||'accepted',String(p.review??''),this.load().revision,p.artifactId);return this.load();}
    if(action==='artifact'){const t=current.tasks.find((t:Data)=>t.id===p.id);if(!t)throw Error('任务不存在');const content=String(p.content??'').trim();if(!content||content.length>900000)throw Error('请输入实际产物内容');const file=this.checked(path.join(this.base,'artifacts',t.id+'.md'));this.write(file,content+'\n');this.registerManual(t,file);return this.load();}

    const state={profile:current.profile,tasks:current.tasks,feedback:current.feedback,settings:current.settings};
    const now=new Date().toISOString(),text=(k:string,max=10000)=>String(p[k]??'').slice(0,max);
    const saveTask=(t:Data)=>this.put(path.join(this.base,'tasks',t.id+'.json'),t);
    if(action==='avatar') {
      const avatar=text('avatar',500000);
      if(avatar) {
        const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(avatar);
        if(!match) throw Error('头像仅支持 PNG/JPEG/WebP');
        const bytes=Buffer.from(match[2],'base64');
        const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
        if(!valid||bytes.length>262144||bytes.length<12) throw Error('头像格式无效或超过256KB');
      }
      state.settings.avatar=avatar;
    } else if(action==='install-skills') this.install();
    else if(action==='record') {
      if(!SUPPORTED_STAGES.includes(p.stage)) throw Error('Invalid stage');
      if(!text('name').trim()||!text('source').trim()) throw Error('请填写名称和真实来源');
      const fields=['stage','name','source','market','product','buyer','hypothesis','constraints','leadId','opportunityId','cycleId','result','next','url','platform','owner','status'];
      const row={...Object.fromEntries(fields.filter(k=>k in p).map(k=>[k,text(k,20000)])),id:id(),createdAt:now};
      this.put(path.join(this.base,'records',row.id+'.json'),row);
    } else if(action==='audit-create') {
      if(!['shopify','wordpress'].includes(p.platform)) throw Error('请选择站点平台');
      const criteria=JSON.parse(fs.readFileSync(path.join(APP,'skills/yundian-growth-seo-geo/references/checklist.json'),'utf8'));
      const items=criteria.filter((x:Data)=>x.platform===p.platform).map((x:Data)=>({...x,url:null,resourceId:null,executionRule:null,result:'待验证',evidence:[],owner:null,reason:null,remediation:null,deadline:null,recheckDate:null,recheckResult:null,rollback:null}));
      this.put(path.join(this.base,'audits',id()+'.json'),{schemaVersion:1,platform:p.platform,technicalConclusion:'待验证',observations:[],items});
    } else if(action==='audit-item') {
      if(!validId(text('auditId'))) throw Error('Invalid audit');
      const file=path.join(this.base,'audits',p.auditId+'.json'),ledger=this.json(file);
      const item=ledger.items.find((x:Data)=>x.id===p.itemId);
      if(!item) throw Error('检查项不存在');
      if(!['通过','未通过','不适用','待验证'].includes(p.result)) throw Error('Invalid result');
      const evidence=text('evidence').trim(),reason=text('reason').trim();
      if(p.result==='通过'&&!evidence) throw Error('通过必须填写实际证据');
      if(p.result==='不适用'&&!reason) throw Error('不适用必须填写理由');
      Object.assign(item,{result:p.result,evidence:evidence?[evidence]:[],reason,owner:text('owner'),remediation:text('remediation'),recheckDate:text('recheckDate')});
      ledger.technicalConclusion='待客户验收'; this.put(file,ledger);
    } else if(action==='profile') {
      const profile=Object.fromEntries(['company','products','markets','persona','goal','brand','source','projectRef','spaceRef'].map(k=>[k,text(k,12000).trim()]));
      if(!profile.company||!profile.goal) throw Error('请填写企业名称和获客目标'); state.profile=profile;
      this.write(path.join(this.base,'knowledge/profile.md'),'# 企业与品牌\n\n'+Object.entries(profile).map(([k,v])=>'## '+k+'\n'+(v||'待补充')).join('\n\n')+'\n\n审核状态：客户录入；原生资料关联尚待宿主验证。\n');
    } else if(action==='knowledge') {
      if(!text('title').trim()||!text('content').trim()||!text('source').trim()) throw Error('请填写资料标题、实际内容和来源');
      this.write(path.join(this.base,'knowledge',id()+'.md'),'# '+text('title').trim()+'\n\n'+text('content',900000).trim()+'\n\n来源：'+text('source').trim()+'\n日期：'+now+'\n审核状态：待确认\n');
    } else if(action==='task') {
      if(!state.profile.company) throw Error('请先创建企业知识库');
      if(!SUPPORTED_STAGES.includes(p.stage)||!text('name').trim()) throw Error('任务名称或阶段无效');
      const key=p.stage==='site-and-content'&&(p.skillId==='yundian-growth-seo-geo'||/SEO|GEO|AEO/.test(text('name').toUpperCase()))?'seo-geo':p.stage;
      const task:any=newTask({...p,applicationRoot:APP,workspaceId:current.workspace.workspaceId,stage:p.stage,name:text('name',500),skillId:this.registry()[key].id,skillVersion:'pending'});
      const candidates=loadSkills(APP,this.root).filter(skill=>skill.stage===key);
      const selected=candidates.find(skill=>skill.origin===(p.skillOrigin||'official'));
      if(!selected)throw Error('所选技能版本不存在');
      Object.assign(task,{workspaceId:current.workspace.workspaceId,skillVersion:selected.version,skillOrigin:selected.origin,skillPath:selected.entry,inputSnapshotRef:'growth-workspace/workflows/'+task.id+'.json',artifactIds:[]});
      Object.assign(task,{invocation:buildInvocation(selected,task as any,current.workspace as any)});
      task.receiptInstructions='\n结构化回执：在客户项目内保存 JSON，含 receiptId（唯一编号）、taskId、workspaceId、skillVersion、executor（实际执行者）、status（running / needs-review / failed / needs-input / cancelled）、artifacts（[{path:实际文件路径,summary:摘要,sources:来源数组,gaps:缺口数组,nextSteps:下一步数组}]）。文件必须真实存在且位于客户项目内；HTTP/HTTPS 链接用 url，仅登记未核验结果。\n通过同一存储回写：node "'+path.join(APP,'scripts/workbench.mjs')+'" --root "'+this.root+'" --command receipt --payload "客户项目内回执JSON绝对路径"。不代替客户验收；知识变更需要客户确认。';
      state.tasks.push(task); saveTask(task);
      this.put(path.join(this.base,'workflows',task.id+'.json'),{id:task.id,version:1,stage:p.stage,goal:task.name,inputs:task.inputs,steps:task.instructions,acceptance:task.acceptance,workspaceId:current.workspace.workspaceId,skillId:task.skillId,skillVersion:task.skillVersion,profile:current.profile,knowledge:current.knowledge.map((k:Data)=>({path:k.path,contentHash:k.contentHash,reviewStatus:k.reviewStatus}))});
    } else if(action==='feedback') {
      if(!text('leadId').trim()||!text('result').trim()) throw Error('请填写线索标识和实际结果');
      const row={...Object.fromEntries(['leadId','source','result','reason','next','cycleId'].map(k=>[k,text(k)])),id:id(),createdAt:now};
      state.feedback.push(row); this.put(path.join(this.base,'feedback',row.id+'.json'),row);
    } else throw Error('不支持的操作');
    this.put(path.join(this.base,'workbench.json'),state);
    this.write(path.join(this.base,'knowledge/00-index.md'),'# 知识库与工作产物索引\n\n原生项目资料库关联：待 WorkBuddy 验证。\n\n'+state.tasks.filter((t:Data)=>t.artifact).map((t:Data)=>'- '+t.name+'：'+t.artifact).join('\n')+'\n');
    return this.load();
  }
}

export function createServer(store: FileWorkspace,port: number) {
  const token=crypto.randomBytes(32).toString('base64url');
  const isPublic=process.env.WORKBENCH_PUBLIC==='1';
  const cloudConfig=loadCloudConfig();
  return http.createServer(async(req,res)=>{
    const respond=(value:any,status=200,mime='application/json; charset=utf-8')=>{
      const data=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
      res.writeHead(status,{'Content-Type':mime,'Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(data);
    };
    if(!isPublic&&!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host??'')) return respond({error:'Invalid host'},403);
    const pathname=(req.url??'/').split('?')[0];
    try {
      if(req.method==='GET') {
        if(pathname==='/healthz') return respond({ok:true});
        if(pathname==='/api/update/inspect') return respond(inspectUpdate(store.root));
        if(pathname==='/api/backup/snapshot'){if(req.headers['x-workspace-token']!==token)return respond({error:'授权校验失败，请刷新工作台'},403);return respond(createSnapshot(store.root));}
        if(pathname==='/api/update') {
          try {
            const response=await fetch('https://raw.githubusercontent.com/colaliang/yundian-ai-growth-workbench/main/release.json',{signal:AbortSignal.timeout(5000)});
            if(!response.ok) throw Error('Release unavailable');
            return respond(releaseInfo(await response.json()));
          } catch { return respond({error:'版本检查失败，请稍后重试或在WorkBuddy检查仓库版本'},502); }
        }
        if(pathname==='/api/state') return respond({...store.load(),token,projectRoot:store.root,cloud:cloudConfig});
        if(pathname.startsWith('/api/artifacts/')){const parts=pathname.split('/'),a=store.artifact(parts[3]);if(parts[4]==='file'){if(!a.path||!a.contentHash)return respond({error:'实际文件无法读取'},404);const file=store.checked(path.resolve(store.root,a.path));return respond(fs.readFileSync(file),200,'application/octet-stream');}return respond(a);}
        if(pathname.startsWith('/api/artifact/')) {
          const name=pathname.split('/').pop()!; if(!/^[a-f0-9]{32}\.md$/.test(name)) return respond({error:'Invalid artifact'},400);
          const file=store.checked(path.join(store.base,'artifacts',name));
          return fs.existsSync(file)?respond(fs.readFileSync(file),200,'text/plain; charset=utf-8'):respond({error:'Not found'},404);
        }
        const files:Data={'/':['index.html','text/html'],'/index.html':['index.html','text/html'],'/app-v03.js':['app-v03.js','text/javascript'],'/styles-v03.css':['styles-v03.css','text/css'],'/brand.jpg':['brand.jpg','image/jpeg'], ...Object.fromEntries(['main.js','api.js','safe-url.js','views/workbench.js','views/settings.js','views/skills.js','views/knowledge.js','views/results.js','views/daily-actions.js','views/schedules.js','views/services.js','views/backup.js'].map(file=>['/web/'+file,['web/'+file,'text/javascript']]))};
        if(!files[pathname]) return respond({error:'Not found'},404);
        return respond(fs.readFileSync(path.join(APP,files[pathname][0])),200,files[pathname][1]);
      }
      if(req.method!=='POST'||!(pathname==='/api/backup/restore'||pathname==='/api/backup/online'||pathname==='/api/save'||pathname==='/api/tasks'||/^\/api\/tasks\/[a-f0-9]{32}\/(receipts|reviews)$/.test(pathname)||pathname==='/api/knowledge/confirm')) return respond({error:'Not found'},404);
      if(req.headers['x-workspace-token']!==token) return respond({error:'授权校验失败，请刷新工作台'},403);
      if(!isPublic&&req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)) return respond({error:'Invalid origin'},403);
      const chunks:Buffer[]=[]; let size=0;
      for await(const chunk of req) { size+=chunk.length; if(size>(pathname==='/api/backup/restore'?64000000:1000000)) return respond({error:'请求过大'},413); chunks.push(chunk); }
      // Synchronous mutations serialize revision checks and writes within this process.
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(pathname.startsWith('/api/backup/')){if(body.revision!==store.load().revision)throw Error('项目已变化，请刷新后再恢复');if(pathname==='/api/backup/online')return respond(await setOnlineBackup(store.root,body.enabled===true));return respond(restoreSnapshot(store.root,body.snapshot));}
      if(pathname==='/api/tasks')return respond({task:store.createTask(body.payload??body.input,body.revision),...store.load()});
      if(pathname==='/api/knowledge/confirm'){store.confirmKnowledge(body.path,body.contentHash,body.revision);return respond(store.load());}
      const match=/^\/api\/tasks\/([a-f0-9]{32})\/(receipts|reviews)$/.exec(pathname);
      if(match){if(match[2]==='receipts')store.applyReceipt(match[1],body.receipt??body.payload,body.revision);else store.reviewArtifact(match[1],body.contentHash,body.decision,body.evidence,body.revision,body.artifactId);return respond(store.load());}
      return respond(store.save(body));
    } catch(e:any) { return respond({error:e.code?'文件操作失败，请检查项目目录':e.message},e.code?500:400); }
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),option=(key:string)=>args[args.indexOf(key)+1];
  if(!args.includes('--root')) throw Error('Required --root CUSTOMER_PROJECT');
  const isPublic=process.env.WORKBENCH_PUBLIC==='1';
  const port=Number(args.includes('--port')?option('--port'):process.env.PORT??8767);
  if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid port');
  createServer(new FileWorkspace(option('--root')),port).listen(port,isPublic?'0.0.0.0':'127.0.0.1',()=>console.log('WorkBuddy workbench: http://127.0.0.1:'+port+(isPublic?' (public bind)':'')));
}
