export function buildCrmReadContext(data) {
    const companiesById = new Map(data.companies.map(c => [c.id, c])), membersById = new Map((data.members ?? []).map(m => [m.id, m]));
    const contactsById = new Map(), contactOrder = new Map(), latestFollowupByLead = new Map();
    data.contacts.forEach((contact, index) => { contactsById.set(contact.id, contact); contactOrder.set(contact.id, index); });
    for (const followup of data.followups) {
        if (followup.kind !== 'followup' || followup.archivedAt)
            continue;
        const previous = latestFollowupByLead.get(followup.leadId);
        if (!previous || followup.time.localeCompare(previous.time) > 0 || followup.time === previous.time && (followup.createdAt.localeCompare(previous.createdAt) > 0 || followup.createdAt === previous.createdAt && followup.id.localeCompare(previous.id) > 0))
            latestFollowupByLead.set(followup.leadId, followup);
    }
    return { originalData: data, companiesById, membersById, contactsById, contactOrder, latestFollowupByLead };
}
