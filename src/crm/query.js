import { buildCrmReadContext } from "./read-context.js";
function boundary(value, end = false) { if (!value)
    return undefined; if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw Error('Invalid CRM date'); const n = Date.parse(value + 'T00:00:00.000+08:00'); if (!Number.isFinite(n) || new Date(n + 8 * 3600000).toISOString().slice(0, 10) !== value)
    throw Error('Invalid CRM date'); return n + (end ? 86400000 - 1 : 0); }
export function projectCrmRows(data, filter = {}, now, context) {
    const from = boundary(filter.createdFrom), to = boundary(filter.createdTo, true), nextFrom = boundary(filter.nextFollowUpFrom), nextTo = boundary(filter.nextFollowUpTo, true);
    if ((from !== undefined && to !== undefined && from > to) || (nextFrom !== undefined && nextTo !== undefined && nextFrom > nextTo))
        throw Error('Invalid CRM date range');
    const tags = Array.isArray(filter.tag) ? filter.tag : filter.tag ? [filter.tag] : [];
    const indexed = context ?? buildCrmReadContext(data);
    if (indexed.originalData !== data)
        throw Error('CRM context belongs to another snapshot');
    const companies = indexed.companiesById, members = indexed.membersById;
    const inRange = (value, start, end) => start === undefined && end === undefined || !!value && Number.isFinite(Date.parse(value)) && (start === undefined || Date.parse(value) >= start) && (end === undefined || Date.parse(value) <= end);
    return data.leads.map(lead => { const company = companies.get(lead.companyId), contacts = [...new Set(lead.contactIds)].map(id => indexed.contactsById.get(id)).filter((c) => !!c && !c.archivedAt).sort((a, b) => indexed.contactOrder.get(a.id) - indexed.contactOrder.get(b.id)), followup = indexed.latestFollowupByLead.get(lead.id); const owner = Object.hasOwn(lead, 'ownerMemberId') ? (lead.ownerMemberId === null ? '' : members.get(lead.ownerMemberId)?.name ?? lead.owner) : (lead.owner || company?.owner || ''); const isDue = !lead.archivedAt && !company?.archivedAt && !['won', 'lost'].includes(lead.stage) && !!followup?.nextFollowUpAt && Date.parse(followup.nextFollowUpAt) <= now; return { lead, company, contacts, followup, owner, isDue }; }).filter(r => (filter.archived || filter.includeArchived || !r.lead.archivedAt) && (!filter.query || JSON.stringify([r.lead, r.company, r.contacts, r.owner]).toLowerCase().includes(filter.query.toLowerCase())) && (!filter.country || r.company?.country === filter.country) && (!filter.owner || r.owner === filter.owner) && (!Object.hasOwn(filter, 'ownerMemberId') || r.lead.ownerMemberId === filter.ownerMemberId) && (!filter.source || r.lead.source === filter.source) && (!filter.stage || r.lead.stage === filter.stage) && (!(filter.due || filter.overdue) || r.isDue) && tags.every(t => [...(r.company?.tags ?? []), ...r.lead.tags].includes(t)) && (!filter.verificationStatus || r.contacts.some(c => c.verificationStatus === filter.verificationStatus)) && inRange(r.lead.createdAt, from, to) && inRange(r.followup?.nextFollowUpAt ?? undefined, nextFrom, nextTo)).sort((a, b) => b.lead.createdAt.localeCompare(a.lead.createdAt) || a.lead.id.localeCompare(b.lead.id));
}
