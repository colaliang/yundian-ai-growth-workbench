import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
const statuses = ['idea', 'draft', 'ready', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'unknown'];
const types = ['post', 'article', 'video', 'image', 'carousel', 'email', 'short-video', 'text'];
const fields = ['title', 'productRef', 'purpose', 'contentType', 'language', 'keywords', 'text', 'assetRefs', 'remoteMediaIds', 'channelIds', 'plannedAt', 'timezone', 'cycleId', 'sourceTaskId'];
const id = () => crypto.randomUUID().replaceAll('-', '');
export function hashContent(input) { return crypto.createHash('sha256').update(JSON.stringify(fields.map(k => input[k] ?? null))).digest('hex'); }
function date(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))
    throw Error('Invalid UTC date'); return value; }
export function normalizeContent(input) { if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Invalid content'); const out = { title: '', productRef: '', purpose: '', contentType: 'post', language: 'zh-CN', keywords: [], text: '', assetRefs: [], remoteMediaIds: [], channelIds: [], plannedAt: null, timezone: 'Asia/Shanghai', cycleId: 'cycle-1', sourceTaskId: null }; for (const k of fields)
    if (Object.hasOwn(input, k))
        out[k] = input[k]; for (const k of ['title', 'productRef', 'purpose', 'contentType', 'language', 'text', 'timezone', 'cycleId'])
    if (typeof out[k] !== 'string')
        throw Error('Invalid ' + k); if (!out.title.trim() || !out.language.trim() || !types.includes(out.contentType))
    throw Error('Invalid title, language or contentType'); for (const k of ['keywords', 'assetRefs', 'remoteMediaIds', 'channelIds'])
    if (!Array.isArray(out[k]) || out[k].some((x) => typeof x !== 'string' || !x.trim()) || new Set(out[k]).size !== out[k].length)
        throw Error('Invalid ' + k); if (out.plannedAt !== null)
    date(out.plannedAt); try {
    new Intl.DateTimeFormat('en', { timeZone: out.timezone });
}
catch {
    throw Error('Invalid timezone');
} if (out.sourceTaskId !== null && (typeof out.sourceTaskId !== 'string' || !out.sourceTaskId))
    throw Error('Invalid sourceTaskId'); return out; }
export function validateContentRecord(value, workspaceId) { if (!value || typeof value !== 'object' || Array.isArray(value) || fields.some(field => !Object.hasOwn(value, field)))
    throw Error('Missing required persisted content field'); const input = normalizeContent(value); if (value.workspaceId !== workspaceId || typeof value.id !== 'string' || !/^\w[\w-]{0,127}$/.test(value.id) || !Number.isInteger(value.contentRevision) || value.contentRevision < 1 || !statuses.includes(value.status) || !['pending', 'approved', 'rejected'].includes(value.reviewStatus) || value.contentHash !== hashContent(input) || !Array.isArray(value.publishAttemptIds) || value.publishAttemptIds.some((x) => typeof x !== 'string') || (value.publisherPostId !== null && typeof value.publisherPostId !== 'string'))
    throw Error('Invalid content record'); date(value.createdAt); date(value.updatedAt); if (value.archivedAt !== null)
    date(value.archivedAt); if (value.approvedHash !== null && value.approvedHash !== value.contentHash || value.reviewStatus === 'approved' && value.approvedHash !== value.contentHash || value.reviewStatus !== 'approved' && value.approvedHash !== null)
    throw Error('Invalid approval hash'); return value; }
function csv(raw) { let rows = [], row = [], cell = '', quoted = false; for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
        if (quoted && raw[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else if (quoted || !cell)
            quoted = !quoted;
        else
            throw Error('Invalid CSV quote');
    }
    else if (!quoted && (c === ',' || c === '\n')) {
        row.push(cell.replace(/\r$/, ''));
        cell = '';
        if (c === '\n') {
            rows.push(row);
            row = [];
        }
    }
    else
        cell += c;
} if (quoted)
    throw Error('Unclosed CSV quote'); if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
} return rows; }
export class ContentService {
    store;
    workspaceId;
    previews = new Map();
    constructor(store) { this.store = store; this.workspaceId = store.json(path.join(store.base, 'workspace.json')).workspaceId; }
    list(filters = {}) { if (filters.status && !statuses.includes(filters.status))
        throw Error('Invalid status'); for (const k of ['from', 'to'])
        if (filters[k])
            date(filters[k]); return this.store.files('content-items', '.json').map(f => validateContentRecord(this.store.json(f), this.workspaceId)).filter(x => (filters.includeArchived || !x.archivedAt) && (!filters.productRef || x.productRef === filters.productRef) && (!filters.status || x.status === filters.status) && (!filters.channelId || x.channelIds.includes(filters.channelId)) && (!filters.from || !!x.plannedAt && x.plannedAt >= filters.from) && (!filters.to || !!x.plannedAt && x.plannedAt <= filters.to)); }
    get(itemId) { const item = this.list({ includeArchived: true }).find(x => x.id === itemId); if (!item)
        throw Error('Content not found'); return item; }
    input(input) { for (const k of ['id', 'workspaceId', 'status', 'approvedHash', 'reviewStatus', 'contentRevision'])
        if (Object.hasOwn(input, k))
            throw Error('Server-owned field ' + k); const n = normalizeContent(input); if (n.sourceTaskId && !this.store.files('tasks', '.json').some(f => { const t = this.store.json(f); return t.id === n.sourceTaskId && t.workspaceId === this.workspaceId; }))
        throw Error('Source task not found in workspace'); for (const ref of n.assetRefs) {
        if (/^https?:\/\//.test(ref))
            continue;
        this.store.checked(path.resolve(this.store.root, ref));
    } return n; }
    write(item) { this.store.put(path.join(this.store.base, 'content-items', item.id + '.json'), item); return item; }
    create(input) { const n = this.input(input), now = new Date().toISOString(); return this.write({ ...n, id: id(), workspaceId: this.workspaceId, contentRevision: 1, reviewStatus: 'pending', approvedHash: null, contentHash: hashContent(n), status: 'draft', publisherPostId: null, publishAttemptIds: [], createdAt: now, updatedAt: now, archivedAt: null }); }
    update(itemId, input, expectedRevision) { const old = this.get(itemId); if (old.contentRevision !== expectedRevision)
        throw Error('Content revision changed'); const n = this.input({ ...Object.fromEntries(fields.map(k => [k, old[k]])), ...input }), hash = hashContent(n), changed = hash !== old.contentHash; return this.write({ ...old, ...n, contentHash: hash, contentRevision: old.contentRevision + 1, updatedAt: new Date().toISOString(), ...(changed ? { reviewStatus: 'pending', approvedHash: null, status: 'draft' } : {}) }); }
    approve(itemId, hash) { const old = this.get(itemId); if (old.archivedAt || hash !== old.contentHash)
        throw Error('Content changed or archived'); return this.write({ ...old, reviewStatus: 'approved', approvedHash: hash, contentRevision: old.contentRevision + 1, updatedAt: new Date().toISOString() }); }
    archive(itemId, revision) { const old = this.get(itemId); if (old.contentRevision !== revision)
        throw Error('Content revision changed'); return this.write({ ...old, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), contentRevision: old.contentRevision + 1 }); }
    exportPlan() { return { schemaVersion: 1, workspaceId: this.workspaceId, items: this.list({ includeArchived: true }) }; }
    previewImport(raw, format) { if (typeof raw !== 'string' || raw.length > 1000000)
        throw Error('Invalid import'); let items; if (format === 'json') {
        const p = JSON.parse(raw);
        if (p.schemaVersion !== 1 || p.workspaceId !== this.workspaceId || !Array.isArray(p.items))
            throw Error('Invalid plan schema or workspace');
        items = p.items;
    }
    else if (format === 'csv') {
        const [headers, ...rows] = csv(raw);
        if (!headers?.includes('title') || headers.some(x => !fields.includes(x) && x !== 'id'))
            throw Error('Invalid CSV headers');
        items = rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
    }
    else
        throw Error('Invalid format'); const p = { id: id(), workspaceId: this.workspaceId, candidates: [], errors: [], conflicts: [] }; const seen = new Set(); items.forEach((row, i) => { try {
        if (row.status !== undefined && !statuses.includes(row.status))
            throw Error('Invalid status');
        if (row.reviewStatus !== undefined && !['pending', 'approved', 'rejected'].includes(row.reviewStatus))
            throw Error('Invalid reviewStatus');
        if (row.workspaceId !== undefined && row.workspaceId !== this.workspaceId)
            throw Error('Cross-workspace content');
        if (row.id !== undefined && (typeof row.id !== 'string' || !/^\w[\w-]{0,127}$/.test(row.id) || seen.has(row.id)))
            throw Error('Invalid or duplicate ID');
        if (row.id)
            seen.add(row.id);
        const stripped = Object.fromEntries(fields.filter(k => Object.hasOwn(row, k)).map(k => [k, row[k]]));
        if (format === 'csv') {
            for (const k of ['keywords', 'assetRefs', 'remoteMediaIds', 'channelIds'])
                if (stripped[k] !== undefined)
                    stripped[k] = stripped[k] ? JSON.parse(stripped[k]) : [];
            if (stripped.plannedAt === '')
                stripped.plannedAt = null;
            if (stripped.sourceTaskId === '')
                stripped.sourceTaskId = null;
        }
        const input = this.input(stripped), existing = row.id ? this.list({ includeArchived: true }).find(x => x.id === row.id) : undefined;
        const candidate = { candidateId: id(), input, existingId: row.id, expectedRevision: existing?.contentRevision };
        p.candidates.push(candidate);
        if (existing)
            p.conflicts.push({ candidateId: candidate.candidateId, existingId: existing.id, local: existing, incoming: input });
    }
    catch (e) {
        p.errors.push({ row: i + 2, message: e.message });
    } }); this.previews.set(p.id, p); return p; }
    confirmImport(previewId, decisions) { const p = this.previews.get(previewId); if (!p || p.workspaceId !== this.workspaceId)
        throw Error('Preview unavailable'); if (!Array.isArray(decisions) || new Set(decisions.map(d => d.candidateId)).size !== decisions.length)
        throw Error('Invalid decisions'); const jobs = decisions.map(d => { const c = p.candidates.find(c => c.candidateId === d.candidateId); if (!c || !['create', 'keep-local', 'apply-new'].includes(d.action))
        throw Error('Invalid decision'); this.input(c.input); const existing = c.existingId ? this.list({ includeArchived: true }).find(x => x.id === c.existingId) : undefined; if (d.action === 'apply-new' && (!existing || existing.contentRevision !== c.expectedRevision || d.expectedRevision !== undefined && d.expectedRevision !== c.expectedRevision))
        throw Error('Content revision changed'); if (d.action === 'create' && existing)
        throw Error('Conflict requires explicit apply-new or keep-local'); return { d, c, existing }; }); const result = []; for (const { d, c } of jobs) {
        if (d.action === 'keep-local')
            continue;
        if (d.action === 'apply-new')
            result.push(this.update(c.existingId, c.input, c.expectedRevision));
        else {
            let item = this.create(c.input);
            if (c.existingId) {
                const generated = path.join(this.store.base, 'content-items', item.id + '.json');
                item = { ...item, id: c.existingId };
                this.write(item);
                fs.unlinkSync(generated);
            }
            result.push(item);
        }
    } this.previews.delete(previewId); return result; }
}
