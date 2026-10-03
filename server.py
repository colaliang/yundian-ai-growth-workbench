"""Local file-backed WorkBuddy workbench. Run with --root CUSTOMER_PROJECT."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
import uuid
from datetime import datetime, timezone

APP = Path(__file__).resolve().parent
STAGES = ['market-research','product-opportunity','site-and-content','acquisition','buyer-check','sales-feedback','next-cycle']
LOCK = Lock()
TOKEN = secrets.token_urlsafe(32)

def atomic(path, value):
    path.resolve().relative_to(ROOT)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        tmp.write_text(value, encoding='utf-8')
        os.replace(tmp, path)
    finally:
        if tmp.exists(): tmp.unlink()

def digest():
    h=hashlib.sha256()
    for p in sorted([DB, * (BASE/'tasks').glob('*.json'), * (BASE/'artifacts').glob('*.md'), * (BASE/'knowledge').glob('*.md')]):
        p.resolve().relative_to(ROOT)
        if p.is_file(): h.update(str(p.relative_to(BASE)).encode()); h.update(p.read_bytes())
    return h.hexdigest()

def load():
    state = json.loads(DB.read_text(encoding='utf-8')) if DB.exists() else {'profile': {}, 'tasks': [], 'feedback': []}
    # Task files are the shared contract with WorkBuddy; read external results back.
    state['tasks']=[]
    for p in sorted((BASE/'tasks').glob('*.json')):
        p.resolve().relative_to(ROOT)
        task=json.loads(p.read_text(encoding='utf-8'))
        if task.get('stage') not in STAGES: continue
        ident=task.get('id','')
        if len(ident)!=32 or any(c not in '0123456789abcdef' for c in ident): continue
        artifact=BASE/'artifacts'/f'{ident}.md'
        artifact.resolve().relative_to(ROOT)
        if artifact.is_file():
            task['artifact']=str(artifact.relative_to(BASE))
            if task.get('status')!='completed' or task.get('reviewedHash')!=hashlib.sha256(artifact.read_bytes()).hexdigest(): task['status']='needs-review'
        state['tasks'].append(task)
    state['workspace'] = json.loads((BASE/'workspace.json').read_text(encoding='utf-8'))
    state['knowledge'] = [{'path': str(p.relative_to(BASE)), 'content':p.read_text(encoding='utf-8')} for p in sorted((BASE/'knowledge').glob('*.md'))]
    state['revision'] = digest()
    return state

def save(body):
    with LOCK:
        current = load()
        if body.get('revision') != current['revision']: raise ValueError('资料已被其他操作更新，请刷新后重试')
        action, payload = body.get('action'), body.get('payload', {})
        state = {k:current[k] for k in ['profile','tasks','feedback']}
        now = datetime.now(timezone.utc).isoformat()
        if action == 'profile':
            fields=['company','products','markets','persona','goal','brand','source','projectRef','spaceRef']
            profile={k:str(payload.get(k,'')).strip()[:12000] for k in fields}
            if not profile['company'] or not profile['goal']: raise ValueError('请填写企业名称和获客目标')
            state['profile']=profile
            atomic(BASE/'knowledge/profile.md', '# 企业与品牌\n\n'+'\n\n'.join(f'## {k}\n{v or "待补充"}' for k,v in profile.items())+'\n\n审核状态：客户录入；原生资料关联尚待宿主验证。\n')
        elif action == 'knowledge':
            title=str(payload.get('title','')).strip(); content=str(payload.get('content','')).strip(); source=str(payload.get('source','')).strip()
            if not title or not content or not source: raise ValueError('请填写资料标题、实际内容和来源')
            atomic(BASE/'knowledge'/f'{uuid.uuid4().hex}.md',f'# {title}\n\n{content}\n\n来源：{source}\n日期：{now}\n审核状态：待确认\n')
        elif action == 'task':
            if not state['profile'].get('company'): raise ValueError('请先创建企业知识库')
            stage=payload.get('stage')
            if stage not in STAGES or not str(payload.get('name','')).strip(): raise ValueError('任务名称或阶段无效')
            task={'id':uuid.uuid4().hex,'cycleId':str(payload.get('cycleId') or 'cycle-1'), 'stage':stage,
                  'name':str(payload['name'])[:500], 'instructions':str(payload.get('instructions',''))[:20000],
                  'inputs':str(payload.get('inputs',''))[:10000], 'acceptance':str(payload.get('acceptance',''))[:10000],
                  'status':'ready', 'artifact':None, 'createdAt':now}
            state['tasks'].append(task)
            atomic(BASE/'tasks'/f'{task["id"]}.json',json.dumps(task,ensure_ascii=False,indent=2))
            atomic(BASE/'workflows'/f'{task["id"]}.json',json.dumps({'id':task['id'],'version':1,'stage':stage,'goal':task['name'],'inputs':task['inputs'],'steps':task['instructions'],'acceptance':task['acceptance']},ensure_ascii=False,indent=2))
        elif action == 'artifact':
            task=next((x for x in state['tasks'] if x['id']==payload.get('id')),None)
            if not task: raise ValueError('任务不存在')
            content=str(payload.get('content','')).strip()
            if not content: raise ValueError('请输入实际产物内容')
            path=BASE/'artifacts'/f'{task["id"]}.md'
            atomic(path,content+'\n')
            if path.read_text(encoding='utf-8').strip()!=content: raise ValueError('产物读回失败')
            task['artifact']=str(path.relative_to(BASE)); task['status']='needs-review'
            atomic(BASE/'tasks'/f'{task["id"]}.json',json.dumps(task,ensure_ascii=False,indent=2))
        elif action == 'review':
            task=next((x for x in state['tasks'] if x['id']==payload.get('id')),None)
            if not task or not task.get('artifact') or not (BASE/task['artifact']).is_file(): raise ValueError('需要先保存实际产物')
            if not str(payload.get('review','')).strip(): raise ValueError('请记录验收依据')
            task.update(status='completed',review=str(payload['review'])[:10000],finishedAt=now,reviewedHash=hashlib.sha256((BASE/task['artifact']).read_bytes()).hexdigest())
            atomic(BASE/'tasks'/f'{task["id"]}.json',json.dumps(task,ensure_ascii=False,indent=2))
        elif action == 'feedback':
            if not str(payload.get('leadId','')).strip() or not str(payload.get('result','')).strip(): raise ValueError('请填写线索标识和实际结果')
            row={k:str(payload.get(k,''))[:10000] for k in ['leadId','source','result','reason','next','cycleId']}
            row.update(id=uuid.uuid4().hex,createdAt=now)
            state['feedback'].append(row)
            atomic(BASE/'feedback'/f'{row["id"]}.json',json.dumps(row,ensure_ascii=False,indent=2))
        else: raise ValueError('不支持的操作')
        atomic(DB,json.dumps(state,ensure_ascii=False,indent=2))
        index='# 知识库与工作产物索引\n\n原生项目资料库关联：待 WorkBuddy 验证。\n\n'
        index+='\n'.join(f'- {x["name"]}：{x["artifact"]}' for x in state['tasks'] if x.get('artifact'))
        atomic(BASE/'knowledge/00-index.md',index+'\n')
        return load()

class Handler(BaseHTTPRequestHandler):
    def respond(self, value, status=200, mime='application/json; charset=utf-8'):
        data=json.dumps(value,ensure_ascii=False).encode() if not isinstance(value,bytes) else value
        self.send_response(status); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data)
    def valid_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{PORT}',f'localhost:{PORT}'}
    def do_GET(self):
        if not self.valid_host(): return self.respond({'error':'Invalid host'},403)
        path=self.path.split('?')[0]
        if path=='/api/state':
            with LOCK: return self.respond({**load(),'token':TOKEN,'projectRoot':str(ROOT)})
        if path.startswith('/api/artifact/'):
            name=path.rsplit('/',1)[-1]
            if len(name)!=35 or not name.endswith('.md') or any(c not in '0123456789abcdef' for c in name[:-3]): return self.respond({'error':'Invalid artifact'},400)
            p=BASE/'artifacts'/name
            return self.respond(p.read_bytes(),mime='text/plain; charset=utf-8') if p.is_file() else self.respond({'error':'Not found'},404)
        files={'/':'index.html','/index.html':'index.html','/app-v03.js':'app-v03.js','/styles-v03.css':'styles-v03.css','/brand.jpg':'brand.jpg'}
        if path not in files: return self.respond({'error':'Not found'},404)
        p=APP/files[path]; mime={'html':'text/html','js':'text/javascript','css':'text/css','jpg':'image/jpeg'}[p.suffix[1:]]
        self.respond(p.read_bytes(),mime=mime+'; charset=utf-8')
    def do_POST(self):
        if not self.valid_host() or self.headers.get('X-Workspace-Token')!=TOKEN: return self.respond({'error':'授权校验失败，请刷新工作台'},403)
        origin=self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}'}: return self.respond({'error':'Invalid origin'},403)
        if self.path!='/api/save': return self.respond({'error':'Not found'},404)
        try:
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=1000000: raise ValueError('请求过大或为空')
            self.respond(save(json.loads(self.rfile.read(n))))
        except (ValueError,KeyError,TypeError) as e: self.respond({'error':str(e)},400)
        except Exception: self.respond({'error':'文件写入失败，请检查目录权限后刷新'},500)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--root',required=True); parser.add_argument('--port',type=int,default=8767)
    args=parser.parse_args(); ROOT=Path(args.root).resolve(strict=True); PORT=args.port; BASE=ROOT/'growth-workspace'; DB=BASE/'workbench.json'
    spec=importlib.util.spec_from_file_location('init',APP/'skills/yundian-growth-workbench/scripts/init_workspace.py')
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); module.initialize(ROOT)
    for child in ['workbench.json','knowledge','tasks','artifacts','workflows','feedback']:
        (BASE/child).resolve().relative_to(ROOT)
    print(f'WorkBuddy workbench: http://127.0.0.1:{PORT} | project: {ROOT}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()

