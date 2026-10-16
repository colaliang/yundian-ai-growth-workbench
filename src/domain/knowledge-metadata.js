import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { safeRelative, contextFor } from "../storage/transaction-context.js";
import { computeWorkspaceRevision } from "../storage/revision.js";
export const knowledgeCategories = ['company', 'product', 'market', 'buyer', 'marketing', 'research', 'other'];
const privatePart = /^(?:\..*|owner(?:\.json)?|publisher(?:\.json)?|sessions?|credentials?|import-credentials|backup-sources\.json)$|\.(?:pem|key|p12|pfx)$/i;
function relative(value) { if (typeof value !== 'string' || !value || value.length > 2048 || value.includes('\\') || value.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /[<>:"|?*\x00-\x1f]/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p) || privatePart.test(p)))
    throw Error('Invalid or private knowledge path'); return value; }
export function knowledgePath(value) { const p = relative(value); if (!p.startsWith('knowledge/') || !p.endsWith('.md'))
    throw Error('Knowledge path must name a knowledge Markdown file'); return p; }
function attachmentPath(value) { const p = relative(value); if (p.startsWith('growth-workspace/') && !/^growth-workspace\/(?:knowledge|assets|artifacts)\//.test(p))
    throw Error('Private business data cannot be a knowledge attachment'); if (!p.startsWith('growth-workspace/') && !/^(?:assets|attachments|documents)\//.test(p))
    throw Error('Attachment must be an explicit local asset'); return p; }
function link(value) { if (typeof value !== 'string' || value.length > 4096 || /[\x00-\x20]/.test(value))
    throw Error('Invalid source link'); let u; try {
    u = new URL(value);
}
catch {
    throw Error('Invalid source link');
} if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password)
    throw Error('Only public HTTP source links are allowed'); return value; }
export const knowledgeMetadataFilename = (p) => crypto.createHash('sha256').update(knowledgePath(p)).digest('hex') + '.json';
export function validateKnowledgeMetadata(value, workspaceId) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['version', 'workspaceId', 'path', 'category', 'sourceLinks', 'attachments', 'updatedAt'].includes(k)) || value.version !== 1 || value.workspaceId !== workspaceId)
        throw Error('Invalid knowledge metadata workspace or format');
    knowledgePath(value.path);
    if (!knowledgeCategories.includes(value.category) || !Array.isArray(value.sourceLinks) || value.sourceLinks.length > 100 || !Array.isArray(value.attachments) || value.attachments.length > 100 || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)))
        throw Error('Invalid knowledge metadata');
    for (const url of value.sourceLinks)
        link(url);
    for (const a of value.attachments) {
        if (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).some(k => !['path', 'url'].includes(k)) || !!a.path === !!a.url)
            throw Error('Invalid knowledge attachment');
        if (a.path)
            attachmentPath(a.path);
        else
            link(a.url);
    }
}
export function knowledgeFiles(store) { const files = []; function walk(dir) { for (const e of store.listDirectory(dir)) {
    const file = store.checked(path.join(dir, e.name));
    if (e.isSymbolicLink())
        throw Error('Knowledge symlink rejected');
    if (e.isDirectory())
        walk(file);
    else if (e.isFile() && e.name.endsWith('.md')) {
        knowledgePath(path.relative(store.base, file).split(path.sep).join('/'));
        files.push(file);
    }
} } walk(path.join(store.base, 'knowledge')); return files.sort(); }
export function loadKnowledgeMetadata(store) { const workspaceId = store.json(path.join(store.base, 'workspace.json')).workspaceId; return store.files('knowledge-metadata', '.json').map(file => { const v = store.json(file); validateKnowledgeMetadata(v, workspaceId); if (path.basename(file) !== knowledgeMetadataFilename(v.path))
    throw Error('Knowledge metadata filename mismatch'); safeRelative(store.root, 'growth-workspace/' + v.path); for (const a of v.attachments)
    if (a.path)
        safeRelative(store.root, a.path); return v; }); }
export function saveKnowledgeMetadata(store, input, options = {}) {
    if (!contextFor(store.root)?.writable)
        throw Error('Knowledge metadata requires managed write transaction');
    if (options.revision !== undefined && options.revision !== computeWorkspaceRevision(store))
        throw Error('Workspace revision conflict');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['workspaceId', 'path', 'category', 'sourceLinks', 'attachments'].includes(k)))
        throw Error('Unexpected knowledge metadata fields');
    const workspaceId = store.json(path.join(store.base, 'workspace.json')).workspaceId, value = { ...input, version: 1, updatedAt: new Date().toISOString() };
    validateKnowledgeMetadata(value, workspaceId);
    const file = safeRelative(store.root, 'growth-workspace/' + value.path);
    if (!store.exists(file) || !fs.statSync(file).isFile())
        throw Error('Knowledge file missing');
    for (const a of value.attachments)
        if (a.path) {
            const file = safeRelative(store.root, a.path);
            if (store.exists(file) && !fs.statSync(file).isFile())
                throw Error('Attachment is not a regular file');
        }
    store.put(path.join(store.base, 'knowledge-metadata', knowledgeMetadataFilename(value.path)), value);
    return value;
}
export function knowledgeDetails(store, p, rows = loadKnowledgeMetadata(store)) {
    const canonical = p.split(path.sep).join('/'), meta = rows.find(v => v.path === canonical);
    return { category: meta?.category ?? 'other', metadataUpdatedAt: meta?.updatedAt ?? null, sourceLinks: (meta?.sourceLinks ?? []).map(url => ({ url, status: 'external-link' })), attachments: (meta?.attachments ?? []).map(a => { if (a.url)
            return { ...a, status: 'external-link' }; const file = safeRelative(store.root, a.path); return { ...a, status: store.exists(file) && fs.statSync(file).isFile() ? 'local-file' : 'missing' }; }) };
}
