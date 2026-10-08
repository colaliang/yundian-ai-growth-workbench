import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const contentHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export function inspectArtifact(store, artifact) {
    if (!artifact.path)
        return { ...artifact, verification: 'unverified', contentHash: null };
    const file = store.checked(path.resolve(store.root, artifact.path));
    if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        throw Error('实际产物文件不存在');
    return { ...artifact, contentHash: contentHash(fs.readFileSync(file)) };
}
export function reviewArtifact(taskId, hash, decision) {
    if (!/^[a-f0-9]{32}$/.test(taskId) || !/^[a-f0-9]{64}$/.test(hash) || !['accepted', 'rejected'].includes(decision))
        throw Error('验收任务、内容哈希或决定无效');
    return { id: crypto.randomUUID().replaceAll('-', ''), workspaceId: '', taskId, artifactId: '', contentHash: hash, decision, reviewedAt: new Date().toISOString(), evidence: '' };
}
export function safeArtifactUrl(value) { if (typeof value !== 'string')
    return false; try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
}
catch {
    return false;
} }
