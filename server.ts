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
const id = () => crypto.randomUUID().replaceAll('-', '');
const validId = (v: string) => /^[a-f0-9]{32}$/.test(v);
const sha = (v: Buffer) => crypto.createHash('sha256').update(v).digest('hex');

export class FileWorkspace {
  root: string;
  base: string;
  constructor(root: string) {
    this.root=fs.realpathSync(root);
    if(!fs.statSync(this.root).isDirectory()) throw Error('Project root must be a directory');
    this.base=path.join(this.root,'growth-workspace'); this.initialize();
  }
  checked(file: string): string {
    const absolute=path.resolve(file); let ancestor=absolute;
    while(!fs.existsSync(ancestor)) {
      if(fs.lstatSync(ancestor,{throwIfNoEntry:false})?.isSymbolicLink()) throw Error('Invalid symlink');
      ancestor=path.dirname(ancestor);
    }
    const resolved=path.join(fs.realpathSync(ancestor),path.relative(ancestor,absolute));
    const rel=path.relative(this.root,resolved);
    if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)) throw Error('Path outside project');
    return absolute;
  }
  read(file: string): string { return fs.readFileSync(this.checked(file),'utf8').replace(/^\uFEFF/,''); }
  json(file: string): Data { return JSON.parse(this.read(file)); }
  write(file: string,value: string) {
    this.checked(file); fs.mkdirSync(path.dirname(file),{recursive:true}); this.checked(file);
    const temp=file+'.'+id()+'.tmp';
    try { fs.writeFileSync(temp,value,{flag:'wx'}); fs.renameSync(temp,file); }
    finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  put(file: string,value: unknown) { this.write(file,JSON.stringify(value,null,2)); }
  files(folder: string,ext: string): string[] {
    const dir=this.checked(path.join(this.base,folder));
    return fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>n.endsWith(ext)).sort().map(n=>this.checked(path.join(dir,n))):[];
  }
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
    return Object.fromEntries(Object.entries(this.registry()).map(([stage,entry]:[string,any])=>{
      const installed=this.checked(path.join(this.root,'.codebuddy/skills',entry.id,'SKILL.md'));
      const source=fs.readFileSync(path.join(APP,entry.path));
      return [stage,{...entry,status:!fs.existsSync(installed)?'not-installed':source.equals(fs.readFileSync(installed))?'installed':'different',installedPath:installed}];
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
    for(const [src,dst] of pairs) if(fs.existsSync(this.checked(dst))&&!fs.readFileSync(src).equals(fs.readFileSync(dst))) throw Error('已有同名技能内容不同，保留客户版本');
    for(const [src,dst] of pairs) if(!fs.existsSync(dst)) this.write(dst,fs.readFileSync(src,'utf8'));
  }
  digest(): string {
    const files=[path.join(this.base,'workbench.json'),...this.files('tasks','.json'),...this.files('artifacts','.md'),...this.files('knowledge','.md'),...this.files('records','.json'),...this.files('audits','.json')].sort();
    const h=crypto.createHash('sha256');
    for(const file of files) if(fs.existsSync(this.checked(file))) h.update(path.relative(this.base,file)).update(fs.readFileSync(file));
    return h.digest('hex');
  }
  load(): Data {
    const db=path.join(this.base,'workbench.json');
    const state=fs.existsSync(db)?this.json(db):{profile:{},tasks:[],feedback:[]};
    state.tasks=this.files('tasks','.json').map(f=>this.json(f)).filter(t=>STAGES.includes(t.stage)&&validId(t.id)).map(t=>{
      const file=this.checked(path.join(this.base,'artifacts',t.id+'.md'));
      if(fs.existsSync(file)) {
        t.artifact=path.relative(this.base,file);
        if(!['blocked','needs-input'].includes(t.status)&&(t.status!=='completed'||t.reviewedHash!==sha(fs.readFileSync(file)))) t.status='needs-review';
      }
      return t;
    });
    state.workspace=this.json(path.join(this.base,'workspace.json'));
    state.knowledge=this.files('knowledge','.md').map(f=>({path:path.relative(this.base,f),content:this.read(f)}));
    state.records=this.files('records','.json').map(f=>this.json(f));
    state.audits=this.files('audits','.json').map(f=>({id:path.basename(f,'.json'),...this.json(f)}));
    state.settings=state.settings??{}; state.version=VERSION; state.skills=this.skills(); state.revision=this.digest(); return state;
  }
  save(body: Data): Data {
    const current=this.load();
    if(body.revision!==current.revision) throw Error('资料已被其他操作更新，请刷新后重试');
    const p=body.payload??{},action=body.action;
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
      if(!STAGES.includes(p.stage)) throw Error('Invalid stage');
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
      if(!STAGES.includes(p.stage)||!text('name').trim()) throw Error('任务名称或阶段无效');
      const key=p.stage==='site-and-content'&&(p.skillId==='yundian-growth-seo-geo'||/SEO|GEO|AEO/.test(text('name').toUpperCase()))?'seo-geo':p.stage;
      const task={id:id(),cycleId:text('cycleId')||'cycle-1',stage:p.stage,name:text('name',500),instructions:text('instructions',20000),inputs:text('inputs'),acceptance:text('acceptance'),status:'ready',artifact:null,createdAt:now,skillId:this.registry()[key].id,skillPath:this.skills()[key].installedPath};
      state.tasks.push(task); saveTask(task);
      this.put(path.join(this.base,'workflows',task.id+'.json'),{id:task.id,version:1,stage:p.stage,goal:task.name,inputs:task.inputs,steps:task.instructions,acceptance:task.acceptance});
    } else if(action==='artifact'||action==='review') {
      const task=state.tasks.find((t:Data)=>t.id===p.id); if(!task) throw Error('任务不存在');
      const file=this.checked(path.join(this.base,'artifacts',task.id+'.md'));
      if(action==='artifact') {
        const content=text('content',900000).trim(); if(!content) throw Error('请输入实际产物内容');
        this.write(file,content+'\n'); if(this.read(file).trim()!==content) throw Error('产物读回失败');
        task.artifact=path.relative(this.base,file); task.status='needs-review';
      } else {
        if(!task.artifact||!fs.existsSync(file)) throw Error('需要先保存实际产物');
        if(!text('review').trim()) throw Error('请记录验收依据');
        Object.assign(task,{status:'completed',review:text('review'),finishedAt:now,reviewedHash:sha(fs.readFileSync(file))});
      }
      saveTask(task);
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
  return http.createServer(async(req,res)=>{
    const respond=(value:any,status=200,mime='application/json; charset=utf-8')=>{
      const data=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
      res.writeHead(status,{'Content-Type':mime,'Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(data);
    };
    if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host??'')) return respond({error:'Invalid host'},403);
    const pathname=(req.url??'/').split('?')[0];
    try {
      if(req.method==='GET') {
        if(pathname==='/healthz') return respond({ok:true});
        if(pathname==='/api/update') {
          try {
            const response=await fetch('https://raw.githubusercontent.com/colaliang/yundian-ai-growth-workbench/main/release.json',{signal:AbortSignal.timeout(5000)});
            if(!response.ok) throw Error('Release unavailable');
            return respond(releaseInfo(await response.json()));
          } catch { return respond({error:'版本检查失败，请稍后重试或在WorkBuddy检查仓库版本'},502); }
        }
        if(pathname==='/api/state') return respond({...store.load(),token,projectRoot:store.root});
        if(pathname.startsWith('/api/artifact/')) {
          const name=pathname.split('/').pop()!; if(!/^[a-f0-9]{32}\.md$/.test(name)) return respond({error:'Invalid artifact'},400);
          const file=store.checked(path.join(store.base,'artifacts',name));
          return fs.existsSync(file)?respond(fs.readFileSync(file),200,'text/plain; charset=utf-8'):respond({error:'Not found'},404);
        }
        const files:Data={'/':['index.html','text/html'],'/index.html':['index.html','text/html'],'/app-v03.js':['app-v03.js','text/javascript'],'/styles-v03.css':['styles-v03.css','text/css'],'/brand.jpg':['brand.jpg','image/jpeg']};
        if(!files[pathname]) return respond({error:'Not found'},404);
        return respond(fs.readFileSync(path.join(APP,files[pathname][0])),200,files[pathname][1]);
      }
      if(req.method!=='POST'||pathname!=='/api/save') return respond({error:'Not found'},404);
      if(req.headers['x-workspace-token']!==token) return respond({error:'授权校验失败，请刷新工作台'},403);
      if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)) return respond({error:'Invalid origin'},403);
      const chunks:Buffer[]=[]; let size=0;
      for await(const chunk of req) { size+=chunk.length; if(size>1000000) return respond({error:'请求过大'},413); chunks.push(chunk); }
      // Synchronous mutations serialize revision checks and writes within this process.
      return respond(store.save(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
    } catch(e:any) { return respond({error:e.code?'文件操作失败，请检查项目目录':e.message},e.code?500:400); }
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),option=(key:string)=>args[args.indexOf(key)+1];
  if(!args.includes('--root')) throw Error('Required --root CUSTOMER_PROJECT');
  if(process.env.HOST&&!['127.0.0.1','localhost'].includes(process.env.HOST)) throw Error('Cloud storage and authentication adapters are not configured; public bind disabled');
  const port=Number(args.includes('--port')?option('--port'):process.env.PORT??8767);
  if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid port');
  createServer(new FileWorkspace(option('--root')),port).listen(port,'127.0.0.1',()=>console.log('WorkBuddy workbench: http://127.0.0.1:'+port));
}
