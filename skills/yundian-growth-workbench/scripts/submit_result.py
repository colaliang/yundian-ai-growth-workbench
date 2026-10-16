"""Register an actual WorkBuddy result through the canonical coordinated Node receipt CLI."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

def submit(root, task_id, file=None, status='needs-review', reason='', application=None):
    node = shutil.which('node')
    if not node:
        raise ValueError('Node.js 22.18+ and the actual workbench application are required; no result registered')
    script = Path(__file__).with_suffix('.mjs').resolve(strict=True)
    args = [node, str(script), '--root', str(root), '--task', str(task_id), '--status', status, '--reason', reason]
    if file is not None:
        args.extend(['--file', str(file)])
    if application is not None:
        args.extend(['--application', str(application)])
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', check=False)
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'Canonical receipt registration failed; no standalone write fallback')
    return json.loads(result.stdout)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--root',required=True); p.add_argument('--task',required=True)
    p.add_argument('--application'); p.add_argument('--file'); p.add_argument('--status',default='needs-review'); p.add_argument('--reason',default='')
    a=p.parse_args(); print(json.dumps(submit(a.root,a.task,a.file,a.status,a.reason,a.application),ensure_ascii=False))
