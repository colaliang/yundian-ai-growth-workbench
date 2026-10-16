import type {CrmCompany,CrmContact,CrmFollowUp,CrmMember} from './contracts.ts';
import type {CrmQueryData} from './query.ts';
/** Owned by one immutable data snapshot. Never retain across requests or writes. */
export interface CrmReadContext {
 readonly originalData:CrmQueryData;
 readonly companiesById:ReadonlyMap<string,CrmCompany>;
 readonly membersById:ReadonlyMap<string,CrmMember>;
 readonly contactsById:ReadonlyMap<string,CrmContact>;
 readonly contactOrder:ReadonlyMap<string,number>;
 readonly latestFollowupByLead:ReadonlyMap<string,CrmFollowUp>;
}
export function buildCrmReadContext(data:CrmQueryData):CrmReadContext {
 const companiesById=new Map(data.companies.map(c=>[c.id,c])),membersById=new Map((data.members??[]).map(m=>[m.id,m]));
 const contactsById=new Map<string,CrmContact>(),contactOrder=new Map<string,number>(),latestFollowupByLead=new Map<string,CrmFollowUp>();
 data.contacts.forEach((contact,index)=>{contactsById.set(contact.id,contact);contactOrder.set(contact.id,index);});
 for(const followup of data.followups){if(followup.kind!=='followup'||followup.archivedAt)continue;const previous=latestFollowupByLead.get(followup.leadId);if(!previous||followup.time.localeCompare(previous.time)>0||followup.time===previous.time&&(followup.createdAt.localeCompare(previous.createdAt)>0||followup.createdAt===previous.createdAt&&followup.id.localeCompare(previous.id)>0))latestFollowupByLead.set(followup.leadId,followup);}
 return {originalData:data,companiesById,membersById,contactsById,contactOrder,latestFollowupByLead};
}
