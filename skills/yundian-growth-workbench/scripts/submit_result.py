"""Register an actual WorkBuddy result; never synthesizes or accepts the work."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import uuid
import subprocess

def submit(root, task_id, file=None, status='needs-review', reason='', application=None):
    root=Path(root).resolve(strict=True)
    if len(task_id)!=32 or any(c not in '0123456789abcdef' for c in task_id): raise ValueError('Invalid task id')
    if status not in ['needs-review','blocked','needs-input']: raise ValueError('Invalid result status')
    base=root/'growth-workspace'; path=base/'tasks'/f'{task_id}.json'
    path.resolve().relative_to(root)
    task=json.loads(path.read_text(encoding='utf-8'))
    if task['id']!=task_id: raise ValueError('Task id mismatch')
    manifest_path=base/'workspace.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8-sig')) if manifest_path.exists() else {}
    if manifest.get('contractVersion')==2 or any(task.get(k) for k in ['applicationRoot','workspaceId','inputSnapshotRef','skillVersion','scheduleId','scheduledAt']):
        command=['node',str(Path(__file__).with_name('submit_result.mjs')),'--root',str(root),'--task',task_id,'--status',status,'--reason',reason]
        if file is not None: command += ['--file',str(file)]
        if application is not None: command += ['--application',str(application)]
        return json.loads(subprocess.check_output(command,text=True,encoding='utf-8'))
    if task.get('status') in ['failed','cancelled','completed']: raise ValueError('Terminal standalone task cannot accept a novel result')
    def atomic(target, text):
        target.resolve().relative_to(root)
        target.parent.mkdir(parents=True,exist_ok=True)
        temp=target.with_name(target.name+'.'+uuid.uuid4().hex+'.tmp')
        try:
            temp.write_text(text,encoding='utf-8'); os.replace(temp,target)
        finally:
            if temp.exists(): temp.unlink()
    if status=='needs-review':
        if file is None: raise ValueError('Actual output file required')
        source=Path(file).resolve(strict=True); source.relative_to(root)
        content=source.read_text(encoding='utf-8-sig')
        if not content.strip(): raise ValueError('Empty output')
        output=base/'artifacts'/f'{task_id}.md'; atomic(output,content)
        if output.read_text(encoding='utf-8')!=content: raise ValueError('Readback failed')
        task['artifact']=str(output.relative_to(base))
    elif not reason.strip(): raise ValueError('A blocked task requires a reason')
    task.update(status=status,error=reason,updatedAt=datetime.now(timezone.utc).isoformat())
    task.pop('reviewedHash',None); task.pop('finishedAt',None)
    atomic(path,json.dumps(task,ensure_ascii=False,indent=2))
    return {'taskId':task_id,'status':status,'artifact':task.get('artifact'),'readback':True}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--root',required=True); p.add_argument('--task',required=True)
    p.add_argument('--application'); p.add_argument('--file'); p.add_argument('--status',default='needs-review'); p.add_argument('--reason',default='')
    a=p.parse_args(); print(json.dumps(submit(a.root,a.task,a.file,a.status,a.reason,a.application),ensure_ascii=False))
