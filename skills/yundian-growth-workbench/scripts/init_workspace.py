"""Create real, empty customer knowledge files without overwriting existing data."""
import argparse
import csv
import io
import json
from pathlib import Path
import uuid

def initialize(root):
    root = Path(root).resolve(strict=True)
    if not root.is_dir():
        raise ValueError('Project root must be an existing directory')
    base = root / 'growth-workspace'
    files = {
        'workspace.json': json.dumps({
            'schemaVersion': 3, 'workspaceId': str(uuid.uuid4()),
            'host': 'workbuddy', 'projectRoot': str(root),
            'nativeBinding': {'status': 'pending', 'projectRef': None, 'spaceRef': None},
            'knowledgeStatus': 'needs-input', 'goals': [], 'modules': [],
            'connectors': [], 'coreDirection': 'customer-acquisition',
            'stages': ['market-research', 'product-opportunity', 'site-and-content',
                       'acquisition', 'buyer-check', 'sales-feedback', 'next-cycle'],
            'currentStage': None, 'cycles': []}, ensure_ascii=False, indent=2) + '\n',
        'knowledge/00-index.md': '# 知识库索引\n\n状态：待客户提供资料；原生项目资料库关联待验证。\n\n记录每份资料的路径、来源、日期、审核状态和适用工作。\n',
        'knowledge/profile.md': '# 主体与品牌\n\n待补充：主体、品牌、业务、产品/服务、网站、品牌语气、禁止事项。\n',
        'knowledge/goals-and-markets.md': '# 目标与客户\n\n待补充：工作目标、市场、客户画像、约束、预算与验收标准。\n',
    }
    stream = io.StringIO(newline='')
    csv.writer(stream).writerow(['id', 'path_or_url', 'retrieved_at', 'review_status', 'notes'])
    files['knowledge/sources.csv'] = stream.getvalue()
    # Validate all locations before making mutations; reject existing symlink escapes.
    for rel in [*files, 'workflows', 'tasks', 'artifacts']:
        (base / rel).resolve().relative_to(root)
    created, preserved = [], []
    for rel, content in files.items():
        target = base / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            with target.open('x', encoding='utf-8', newline='') as out:
                out.write(content)
            created.append(rel)
        except FileExistsError:
            preserved.append(rel)
    for directory in ['workflows', 'tasks', 'artifacts']:
        (base / directory).mkdir(parents=True, exist_ok=True)
    return {'root': str(base), 'created': created, 'preserved': preserved,
            'nativeBinding': 'not-performed-by-this-script'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True)
    args = parser.parse_args()
    print(json.dumps(initialize(args.root), ensure_ascii=False, indent=2))
