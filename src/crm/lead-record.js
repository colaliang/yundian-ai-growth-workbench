import { CrmService } from "./service.js";
import { object, normalize, stages, utc } from "./validation.js";
const keys = (v, allowed) => { if (!object(v) || Object.keys(v).some(k => !allowed.includes(k)))
    throw Error('Invalid structured lead record input'); };
export class LeadRecordService {
    crm;
    constructor(store) { this.crm = new CrmService(store); }
    create(input) { return this.save(input); }
    update(id, input) { return this.save(input, this.crm.active('crm-leads', id)); }
    save(input, old) {
        keys(input, ['company', 'contacts', 'lead', 'nextFollowUpAt', 'confirmedSharedChanges', 'confirmedSourceChanges']);
        if (!Array.isArray(input.contacts) || input.contacts.length > 1000)
            throw Error('Invalid contacts');
        for (const flag of ['confirmedSharedChanges', 'confirmedSourceChanges'])
            if (Object.hasOwn(input, flag) && typeof input[flag] !== 'boolean')
                throw Error('Invalid confirmation');
        keys(input.lead, ['source', 'sourceLeadId', 'sourceProjectId', 'opportunityId', 'owner', 'ownerMemberId', 'tags', 'productInterests', 'stage']);
        const crm = this.crm, rows = crm.dataset(), jobs = [], time = new Date().toISOString();
        const impactScope = [];
        const resolve = (family, selection, parent) => {
            keys(selection, ['create', 'id', 'patch']);
            if (Object.hasOwn(selection, 'create')) {
                if (Object.hasOwn(selection, 'id') || Object.hasOwn(selection, 'patch'))
                    throw Error('Ambiguous record selection');
                if (parent) {
                    keys(selection.create, ['source', 'name', 'title', 'email', 'phone', 'whatsapp', 'linkedin', 'verificationStatus']);
                    if (!['name', 'email', 'phone', 'whatsapp', 'linkedin'].some(k => typeof selection.create[k] === 'string' && selection.create[k].trim()))
                        throw Error('New contact needs real identity');
                }
                const value = { ...crm.input(family, { ...selection.create, ...(parent ? { companyId: parent } : {}) }), ...crm.base() };
                jobs.push(crm.row(family, value));
                return value;
            }
            const existing = crm.active(family, selection.id);
            if (parent && existing.companyId !== parent)
                throw Error('Contact belongs to another company');
            if (!Object.hasOwn(selection, 'patch'))
                return existing;
            if (!object(selection.patch))
                throw Error('Invalid patch');
            if (parent && Object.hasOwn(selection.patch, 'companyId') && selection.patch.companyId !== existing.companyId)
                throw Error('Contact belongs to another company');
            const normalized = crm.input(family, { ...normalize(family, existing), ...selection.patch });
            if (JSON.stringify(normalized) === JSON.stringify(normalize(family, existing)))
                return existing;
            const leadIds = rows.filter(r => r.family === 'crm-leads' && (family === 'crm-companies' ? r.value.companyId === existing.id : r.value.contactIds.includes(existing.id))).map(r => r.value.id);
            if (leadIds.some(id => id !== old?.id) && input.confirmedSharedChanges !== true)
                throw Error('Shared CRM changes require confirmation; affected leads: ' + leadIds.join(','));
            impactScope.push({ family, id: existing.id, leadIds });
            const value = { ...existing, ...normalized, updatedAt: time };
            jobs.push(crm.row(family, value));
            return value;
        };
        const company = resolve('crm-companies', input.company);
        if (old)
            crm.active('crm-companies', old.companyId);
        const contacts = input.contacts.map(c => resolve('crm-contacts', c, company.id));
        if (new Set(contacts.map(c => c.id)).size !== contacts.length)
            throw Error('Duplicate contact selection');
        const { stage, ...leadInput } = input.lead;
        if (stage !== undefined && !stages.includes(stage))
            throw Error('Invalid stage');
        const n = crm.input('crm-leads', { ...(old ? normalize('crm-leads', old) : {}), ...leadInput, companyId: company.id, contactIds: contacts.map(c => c.id) });
        if (Object.hasOwn(n, 'ownerMemberId'))
            n.owner = crm.resolveOwner(n.ownerMemberId, old);
        const sourceChanged = old && (n.source !== old.source || n.sourceLeadId !== old.sourceLeadId);
        if (sourceChanged && input.confirmedSourceChanges !== true)
            throw Error('Source correction requires confirmation');
        const lead = { ...(old ?? crm.base()), ...n, stage: stage ?? old?.stage ?? 'new', sourceLinks: [...(old?.sourceLinks ?? []), ...(sourceChanged ? [{ source: old.source, sourceLeadId: old.sourceLeadId, confirmedAt: time }] : [])], updatedAt: time };
        jobs.push(crm.row('crm-leads', lead));
        if (lead.stage !== (old?.stage ?? 'new')) {
            const event = { ...normalize('crm-followups', { leadId: lead.id, time, method: 'stage-change', content: 'Customer confirmed current stage: ' + lead.stage }), ...crm.base(), kind: 'stage-change', fromStage: old?.stage ?? 'new', toStage: lead.stage };
            jobs.push(crm.row('crm-followups', event));
        }
        let followup;
        if (input.nextFollowUpAt !== undefined) {
            if (input.nextFollowUpAt !== null)
                utc(input.nextFollowUpAt);
            followup = { ...normalize('crm-followups', { leadId: lead.id, time, method: 'customer-plan', content: 'Customer saved follow-up plan', nextFollowUpAt: input.nextFollowUpAt }), ...crm.base(), kind: 'followup', fromStage: null, toStage: null };
            jobs.push(crm.row('crm-followups', followup));
        }
        crm.commit(jobs);
        return { company, contacts, lead, ...(followup ? { followup } : {}), impactScope };
    }
}
