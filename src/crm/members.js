import { CrmService } from "./service.js";
export class MemberService {
    crm;
    previews = new Map();
    constructor(store) { this.crm = new CrmService(store); }
    list() { return this.crm.list('crm-members', { includeArchived: true }); }
    preview(rows, projectRef) { if (!Array.isArray(rows) || rows.length > 1000 || typeof projectRef !== 'string' || !projectRef.trim())
        throw Error('Actual customer project reference required'); const preview = { id: this.crm.base().id, items: [], errors: [], conflicts: [] }; const existing = this.list(); rows.forEach((raw, index) => { try {
        const input = this.crm.input('crm-members', raw);
        const item = { candidateId: this.crm.base().id, input };
        preview.items.push(item);
        for (const m of existing) {
            const external = input.externalMemberId !== null && input.externalMemberId === m.externalMemberId && projectRef === m.projectRef;
            if (external || input.name.trim().toLowerCase() === m.name.trim().toLowerCase())
                preview.conflicts.push({ candidateId: item.candidateId, existingId: m.id, reason: external ? 'external-id-and-project' : 'same-name' });
        }
        for (const other of preview.items.slice(0, -1)) {
            const external = input.externalMemberId !== null && input.externalMemberId === other.input.externalMemberId;
            if (external || input.name.trim().toLowerCase() === other.input.name.trim().toLowerCase())
                preview.conflicts.push({ candidateId: item.candidateId, otherCandidateId: other.candidateId, reason: external ? 'external-id-and-project' : 'same-name' });
        }
    }
    catch (e) {
        preview.errors.push({ row: index + 1, message: e.message });
    } }); this.previews.set(preview.id, { preview: structuredClone(preview), projectRef, digest: this.crm.fingerprint() }); return preview; }
    confirm(previewId, decisions, confirmed) { const saved = this.previews.get(previewId); if (confirmed !== true)
        throw Error('Customer confirmation required'); if (!saved || saved.preview.errors.length)
        throw Error('Member preview unavailable or has errors'); if (saved.digest !== this.crm.fingerprint())
        throw Error('Workspace changed since member preview'); const p = saved.preview; if (!Array.isArray(decisions) || decisions.length !== p.items.length || new Set(decisions.map(d => d.candidateId)).size !== decisions.length)
        throw Error('Every member needs an explicit decision'); const jobs = [], result = []; const updated = new Set(); for (const d of decisions) {
        if (!d || Object.keys(d).some(k => !['candidateId', 'action', 'existingId'].includes(k)) || !['create', 'keep', 'update'].includes(d.action))
            throw Error('Invalid member decision');
        const item = p.items.find(i => i.candidateId === d.candidateId);
        if (!item)
            throw Error('Unknown member candidate');
        if (d.action === 'create') {
            if (d.existingId !== undefined)
                throw Error('Create cannot supply internal identity');
            const value = { ...item.input, ...this.crm.base(), projectRef: saved.projectRef, source: 'customer-import', verification: 'customer-confirmed', confirmedAt: new Date().toISOString() };
            jobs.push(this.crm.row('crm-members', value));
            result.push(value);
        }
        else {
            const old = this.crm.get('crm-members', d.existingId);
            if (d.action === 'keep') {
                result.push(old);
                continue;
            }
            if (updated.has(old.id))
                throw Error('Repeated update target');
            updated.add(old.id);
            const value = { ...old, ...item.input, projectRef: saved.projectRef, updatedAt: new Date().toISOString(), confirmedAt: new Date().toISOString() };
            jobs.push(this.crm.row('crm-members', value));
            result.push(value);
        }
    } this.crm.commit(jobs); this.previews.delete(previewId); return result; }
    setActive(id, active) { if (typeof active !== 'boolean')
        throw Error('Invalid member status'); const old = this.crm.get('crm-members', id), value = { ...old, active, updatedAt: new Date().toISOString() }; this.crm.commit([this.crm.row('crm-members', value)]); return value; }
}
