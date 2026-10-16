import { createHash } from 'node:crypto';
import { projectCrmRows } from "./query.js";
const filterKeys = new Set(['query', 'country', 'stage', 'owner', 'ownerMemberId', 'source', 'tag', 'createdFrom', 'createdTo', 'nextFollowUpFrom', 'nextFollowUpTo', 'verificationStatus', 'due', 'overdue', 'archived', 'includeArchived']);
export function canonicalCrmFilter(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw Error('Invalid CRM filter');
    const result = {};
    for (const key of Object.keys(input).sort()) {
        const value = input[key];
        if (!filterKeys.has(key))
            throw Error('Invalid CRM filter');
        if (['due', 'overdue', 'archived', 'includeArchived'].includes(key)) {
            if (typeof value !== 'boolean')
                throw Error('Invalid CRM filter');
            if (value)
                result[key === 'overdue' ? 'due' : key === 'includeArchived' ? 'archived' : key] = true;
        }
        else if (key === 'ownerMemberId' && value === null)
            result[key] = null;
        else if (key === 'tag' && Array.isArray(value)) {
            if (value.some(v => typeof v !== 'string'))
                throw Error('Invalid CRM filter');
            const tags = [...new Set(value.filter(Boolean))].sort();
            if (tags.length)
                result[key] = tags;
        }
        else {
            if (typeof value !== 'string')
                throw Error('Invalid CRM filter');
            if (value)
                result[key] = key === 'tag' ? [value] : value;
        }
    }
    return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
export function crmScopeId(snapshot, filter = {}) { return createHash('sha256').update(JSON.stringify([snapshot.workspace.workspaceId, snapshot.revision, canonicalCrmFilter(filter)])).digest('hex'); }
export function pageRows(rows, page = 1, pageSize = 20) { if (!Number.isSafeInteger(page) || page < 1 || ![20, 50, 100].includes(pageSize))
    throw Error('Invalid CRM page'); const pages = Math.max(1, Math.ceil(rows.length / pageSize)); if (page > pages)
    throw Error('Invalid CRM page range'); return { rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: rows.length }; }
export function queryCrmPage(snapshot, request, now) { if (request.revision !== undefined && request.revision !== snapshot.revision)
    throw Error('revision conflict: 请刷新并重新确认选择范围'); const filter = canonicalCrmFilter(request.filter); return { ...pageRows(projectCrmRows(snapshot.crm, filter, now), request.page, request.pageSize), revision: snapshot.revision, scopeId: crmScopeId(snapshot, filter) }; }
export function crmSummary(snapshot) { const data = snapshot.crm; return { mode: 'summary', leadCount: data.leads.filter(l => !l.archivedAt).length, companyCount: data.companies.filter(c => !c.archivedAt).length, companies: [], contacts: [], leads: [], followups: [], members: [], feedbackLinks: [], facets: { source: [...new Set(data.leads.map(l => l.source).filter(Boolean))].sort(), country: [...new Set(data.companies.map(c => c.country).filter(Boolean))].sort(), owner: [...new Set(projectCrmRows(data, {}, Date.now()).map(r => r.owner).filter(Boolean))].sort() } }; }
export function queryEditorOptions(snapshot, request) {
    const kinds = { company: 'companies', contact: 'contacts', member: 'members', lead: 'leads' };
    if (!kinds[request.kind])
        throw Error('Invalid CRM option kind');
    const selected = request.selected ?? [];
    if (!Array.isArray(selected) || selected.length > 100 || selected.some(id => typeof id !== 'string'))
        throw Error('Invalid selected options');
    const collection = (snapshot.crm[kinds[request.kind]] ?? []);
    const query = (request.query ?? '').toLowerCase();
    if (request.kind === 'lead') {
        const companies = new Map(snapshot.crm.companies.map(c => [c.id, c]));
        const labels = collection.filter(l => !l.archivedAt && companies.has(l.companyId) && !companies.get(l.companyId)?.archivedAt).map(l => ({ id: l.id, name: [companies.get(l.companyId)?.name, l.source, l.sourceLeadId || l.id].join(' · ') }));
        return { ...pageRows(labels.filter(l => l.name.toLowerCase().includes(query)), request.page, 20), selected: labels.filter(l => selected.includes(l.id)), revision: snapshot.revision };
    }
    for (const flag of ['includeInactive', 'includeArchived'])
        if (request[flag] !== undefined && typeof request[flag] !== 'boolean')
            throw Error('Invalid CRM option flag');
    const allowed = collection.filter(v => ((request.includeArchived || !v.archivedAt) && (request.kind !== 'member' || request.includeInactive || v.active) || selected.includes(v.id)) && (!request.companyId || v.companyId === request.companyId));
    const matches = allowed.filter(v => String(v.name || v.email || '').toLowerCase().includes(query));
    const paged = pageRows(matches, request.page, 20);
    return { ...paged, selected: allowed.filter(v => selected.includes(v.id)), revision: snapshot.revision };
}
export function queryCrmFunnel(snapshot, request, now) {
    const boundary = (day) => { if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + 'T00:00:00Z')) || new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day)
        throw Error('Invalid CRM date'); return Date.parse(day + 'T00:00:00+08:00'); };
    const start = boundary(request.from), end = boundary(request.to) + 86400000;
    if (start >= end)
        throw Error('Invalid CRM date range');
    if (request.revision !== undefined && request.revision !== snapshot.revision)
        throw Error('revision conflict');
    const filter = canonicalCrmFilter({ ...request.filter, stage: '', due: false, overdue: false }), rows = projectCrmRows(snapshot.crm, filter, now), ids = new Set(rows.map(r => r.lead.id)), stages = [['new', '新线索'], ['contacted', '已联系'], ['replied', '有回复'], ['qualified', '有效需求'], ['quoted', '已报价'], ['negotiating', '谈判中'], ['won', '已成交'], ['lost', '已流失']], sets = new Map(stages.map(([id]) => [id, new Set()]));
    const valid = snapshot.crm.followups.filter(e => ids.has(e.leadId) && e.kind === 'stage-change' && !e.archivedAt && sets.has(e.toStage) && Number.isFinite(Date.parse(e.time)));
    const inside = (time) => Date.parse(time) >= start && Date.parse(time) < end;
    for (const r of rows)
        if (inside(r.lead.createdAt))
            sets.get('new').add(r.lead.id);
    for (const event of valid)
        if (inside(event.time))
            sets.get(event.toStage).add(event.leadId);
    const counts = stages.map(([id, label]) => ({ id, label, count: sets.get(id).size }));
    const stats = { stages: counts.slice(0, -1), lost: counts.at(-1), uniqueLeadCount: new Set([...sets.values()].flatMap(s => [...s])).size, historyMissingCount: rows.filter(r => r.lead.stage !== 'new' && !valid.some(e => e.leadId === r.lead.id)).length, timezone: 'Asia/Shanghai', from: request.from, to: request.to };
    if (request.stage && !sets.has(request.stage))
        throw Error('Invalid CRM stage');
    return { stats, ...pageRows(request.stage ? rows.filter(r => sets.get(request.stage).has(r.lead.id)) : [], request.page, request.pageSize), revision: snapshot.revision, scopeId: createHash('sha256').update(JSON.stringify([crmScopeId(snapshot, filter), request.from, request.to, request.stage ?? ''])).digest('hex') };
}
