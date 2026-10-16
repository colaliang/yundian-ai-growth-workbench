export type LeadStage='new'|'contacted'|'replied'|'qualified'|'quoted'|'negotiating'|'won'|'lost';
export interface CompanyInput {name:string;source:string;country?:string;website?:string;industry?:string;productInterests?:string[];owner?:string;tags?:string[]}
export interface ContactInput {companyId:string;source:string;name?:string;title?:string;email?:string;phone?:string;whatsapp?:string;linkedin?:string;verificationStatus?:'unverified'|'verified'}
export interface LeadInput {ownerMemberId?:string|null;companyId:string;source:string;contactIds?:string[];sourceLeadId?:string;opportunityId?:string|null;owner?:string;tags?:string[];productInterests?:string[];sourceProjectId?:string|null}
export interface LeadPatch {ownerMemberId?:string|null;stage?:LeadStage;owner?:string;tags?:string[];productInterests?:string[]}
export interface FollowUpInput {leadId:string;time:string;method:string;content:string;result?:string;nextStep?:string;nextFollowUpAt?:string|null;artifactIds?:string[];taskIds?:string[]}
export interface CrmBase {entityVersion?:number;id:string;workspaceId:string;createdAt:string;updatedAt:string;archivedAt:string|null}
export interface CrmCompany extends CrmBase,Required<CompanyInput> {}
export interface CrmContact extends CrmBase,Required<ContactInput> {}
export interface CrmLead extends CrmBase,Required<Omit<LeadInput,'ownerMemberId'>> {ownerMemberId?:string|null;stage:LeadStage;sourceLinks:{source:string;sourceLeadId:string;confirmedAt:string}[]}
export interface CrmFollowUp extends CrmBase,Required<FollowUpInput> {kind:'followup'|'stage-change';fromStage:LeadStage|null;toStage:LeadStage|null}
export interface FeedbackLink {entityVersion?:number;id:string;workspaceId:string;feedbackId:string;crmLeadId:string;confirmedAt:string}
export interface CrmFilter {query?:string;country?:string;stage?:LeadStage;owner?:string;overdue?:boolean;includeArchived?:boolean;companyId?:string;leadId?:string}
export interface CrmImportPreview {id:string;workspaceId:string;schemaVersion:1;candidates:{candidateId:string;company:CompanyInput;contacts:ContactInput[];lead:LeadInput}[];errors:{row:number;message:string}[];duplicates:{candidateId:string;existingLeadId?:string;existingCompanyId?:string;existingContactId?:string}[]}
export interface CrmImportDecision {candidateId:string;action:'create'|'skip'|'link-existing';existingLeadId?:string}

export interface CrmLeadContext {lead:CrmLead;company:CrmCompany;contacts:CrmContact[];followups:CrmFollowUp[];artifactIds:string[];tasks:Record<string,any>[]}

export interface CrmMember extends CrmBase {name:string;externalMemberId:string|null;projectRef:string;source:"customer-import";verification:"customer-confirmed";active:boolean;role:string|null;confirmedAt:string}
export interface LeadRecordInput {company:{create:CompanyInput}|{id:string;patch?:Partial<CompanyInput>};contacts:({create:Omit<ContactInput,'companyId'>}|{id:string;patch?:Partial<ContactInput>})[];lead:Omit<LeadInput,'companyId'|'contactIds'> & {stage?:LeadStage};nextFollowUpAt?:string|null;confirmedSharedChanges?:boolean;confirmedSourceChanges?:boolean}
export interface LeadRecordResult {company:CrmCompany;contacts:CrmContact[];lead:CrmLead;followup?:CrmFollowUp;impactScope:{family:string;id:string;leadIds:string[]}[]}
