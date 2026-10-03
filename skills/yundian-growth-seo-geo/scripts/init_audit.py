"""Create an unverified acceptance ledger without overwriting an existing audit."""
import argparse
import json
from pathlib import Path

def initialize(platform, output):
    if platform not in ['shopify','wordpress']: raise ValueError('Unsupported platform')
    source=Path(__file__).resolve().parents[1]/'references/checklist.json'
    criteria=json.loads(source.read_text(encoding='utf-8'))
    rows=[{**x,'url':None,'resourceId':None,'executionRule':None,'result':'待验证',
           'evidence':[],'owner':None,'reason':None,'remediation':None,'deadline':None,
           'recheckDate':None,'recheckResult':None,'rollback':None} for x in criteria if x['platform']==platform]
    value={'schemaVersion':1,'platform':platform,'technicalConclusion':'待验证','observations':[], 'items':rows}
    path=Path(output); path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x',encoding='utf-8') as f: json.dump(value,f,ensure_ascii=False,indent=2)
    return value

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--platform',required=True,choices=['shopify','wordpress']); p.add_argument('--output',required=True)
    a=p.parse_args(); value=initialize(a.platform,a.output); print(f'Created {len(value["items"])} pending audit items')
