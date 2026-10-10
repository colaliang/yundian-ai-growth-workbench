import {moduleForStage} from '../navigation/modules.ts';
import type {LeadStage} from './contracts.ts';
export const crmFamilies=['crm-companies','crm-contacts','crm-leads','crm-followups','crm-feedback-links'];
export const stages:LeadStage[]=['new','contacted','replied','qualified','quoted','negotiating','won','lost'];
export const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export function utc(v:unknown):string {if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('Invalid UTC date');return v;}
export function object(v:any):v is Record<string,any>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
export function normalize(family:string,input:any):any {
 if(!object(input))throw Error('Invalid CRM input');
 const defaults:Record<string,any>={
 'crm-companies':{name:'',source:'',country:'',website:'',industry:'',productInterests:[],owner:'',tags:[]},
 'crm-contacts':{companyId:'',source:'',name:'',title:'',email:'',phone:'',whatsapp:'',linkedin:'',verificationStatus:'unverified'},
 'crm-leads':{companyId:'',source:'',contactIds:[],sourceLeadId:'',opportunityId:null,sourceProjectId:null,owner:'',tags:[],productInterests:[]},
 'crm-followups':{leadId:'',time:'',method:'',content:'',result:'',nextStep:'',nextFollowUpAt:null,artifactIds:[],taskIds:[]}};
 const out={...defaults[family]};if(!defaults[family])throw Error('Unknown CRM family');
 for(const key of Object.keys(out))if(Object.hasOwn(input,key))out[key]=input[key];
 for(const [key,value] of Object.entries(defaults[family])) {
  const actual=out[key];if(Array.isArray(value)){if(!Array.isArray(actual)||actual.some((x:any)=>typeof x!=='string'||!x.trim())||new Set(actual).size!==actual.length)throw Error('Invalid '+key);}
  else if(value===null){if(actual!==null&&(typeof actual!=='string'||!actual.trim()))throw Error('Invalid '+key);}
  else if(typeof actual!=='string')throw Error('Invalid '+key);
 }
 for(const key of family==='crm-companies'?['name','source']:family==='crm-followups'?['leadId','time','method','content']:['companyId','source'])if(!out[key].trim())throw Error('Missing '+key);
 if(out.companyId&&!validId(out.companyId)||out.leadId&&!validId(out.leadId))throw Error('Invalid relationship ID');
 if(out.sourceProjectId!==undefined&&out.sourceProjectId!==null){const canonical=moduleForStage(out.sourceProjectId);if(!canonical)throw Error('Unknown source project; use null with factual source text');out.sourceProjectId=canonical;}
 if(out.contactIds?.some((v:any)=>!validId(v)))throw Error('Invalid contact ID');
 for(const key of ['website','linkedin'])if(out[key]){let url;try{url=new URL(out[key]);}catch{throw Error('Invalid '+key);}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid '+key);}
 if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email.trim()))throw Error('Invalid email');
 if(out.verificationStatus&&!['unverified','verified'].includes(out.verificationStatus))throw Error('Invalid verificationStatus');
 if(family==='crm-followups'){utc(out.time);if(out.nextFollowUpAt!==null)utc(out.nextFollowUpAt);}
 return out;
}
export function validateCrmRecord(v:any,workspaceId:string,family:string):any {
 if(typeof workspaceId!=='string'||!workspaceId||!object(v)||!validId(v.id)||v.workspaceId!==workspaceId)throw Error('Invalid CRM identity or scope');
 if(family==='crm-feedback-links'){if(Object.keys(v).some(k=>!['id','workspaceId','feedbackId','crmLeadId','confirmedAt'].includes(k)))throw Error('Unknown feedback link field');if(typeof v.feedbackId!=='string'||!v.feedbackId||!validId(v.crmLeadId))throw Error('Invalid feedback link');utc(v.confirmedAt);return v;}
 const normalized=normalize(family,v);const allowed=[...Object.keys(normalized),'id','workspaceId','createdAt','updatedAt','archivedAt',...(family==='crm-leads'?['stage','sourceLinks']:family==='crm-followups'?['kind','fromStage','toStage']:[])];if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Unknown persisted CRM field');for(const key of Object.keys(normalized))if(!Object.hasOwn(v,key))throw Error('Missing persisted CRM '+key);
 if(family==='crm-leads'&&v.sourceProjectId!==normalized.sourceProjectId)throw Error('Noncanonical source project');
 utc(v.createdAt);utc(v.updatedAt);if(!Object.hasOwn(v,'archivedAt'))throw Error('Missing archivedAt');if(v.archivedAt!==null)utc(v.archivedAt);
 if(family==='crm-leads'){if(!stages.includes(v.stage)||!Array.isArray(v.sourceLinks))throw Error('Invalid lead stage or sources');for(const s of v.sourceLinks){if(!object(s)||Object.keys(s).some(k=>!['source','sourceLeadId','confirmedAt'].includes(k))||typeof s.source!=='string'||!s.source.trim()||typeof s.sourceLeadId!=='string')throw Error('Invalid source link');utc(s.confirmedAt);}}
 if(family==='crm-followups'){if(!['followup','stage-change'].includes(v.kind)||!Object.hasOwn(v,'fromStage')||!Object.hasOwn(v,'toStage'))throw Error('Invalid followup kind');if(v.kind==='stage-change'){if(!stages.includes(v.fromStage)||!stages.includes(v.toStage)||v.fromStage===v.toStage)throw Error('Invalid stage event');}else if(v.fromStage!==null||v.toStage!==null)throw Error('Unexpected stage event');}
 return v;
}
export interface DatasetRow {family:string;filename:string;value:any}
export function validateCrmDataset(rows:DatasetRow[],workspaceId:string):void {
 const records=rows.filter(r=>crmFamilies.includes(r.family));const seen=new Set<string>();
 for(const r of records){validateCrmRecord(r.value,workspaceId,r.family);const key=r.family+'/'+r.filename;if(r.filename!==r.value.id+'.json'||seen.has(key))throw Error('Noncanonical CRM filename');seen.add(key);}
 const find=(family:string,id:string)=>rows.find(r=>r.family===family&&r.value.id===id&&r.value.workspaceId===workspaceId)?.value;
 const require=(family:string,id:string)=>{const v=find(family,id)??(family==='tasks'&&validId(id)?rows.find(r=>r.family==='tasks'&&r.filename===id+'.json'&&r.value.id===id&&!['workspaceId','inputSnapshotRef','applicationRoot','scheduleId','skillId','skillVersion','artifactIds','skillOrigin','skillPath','receiptInstructions','invocation'].some(k=>Object.hasOwn(r.value,k))&&!!moduleForStage(r.value.stage)&&typeof r.value.name==='string'&&!!r.value.name.trim())?.value:undefined);if(!v)throw Error('Missing CRM related '+family);return v;};
 for(const r of rows.filter(r=>r.family==='tasks'&&r.value.sourceLeadId!==undefined)){if(r.value.workspaceId!==workspaceId)throw Error('CRM task workspace mismatch');require('crm-leads',r.value.sourceLeadId);if(!['buyer-check','acquisition','email-outreach','sales-feedback'].includes(r.value.stage))throw Error('CRM task stage is not private acquisition');}
 for(const {family,value:v} of records){
  if(family==='crm-contacts'||family==='crm-leads')require('crm-companies',v.companyId);
  if(family==='crm-leads'&&v.opportunityId!==null&&!rows.some(r=>r.family==='records'&&r.value.stage==='product-opportunity'&&r.value.opportunityId===v.opportunityId&&(r.value.workspaceId===undefined||r.value.workspaceId===workspaceId)))throw Error('Opportunity not established in this workspace');
  if(family==='crm-leads')for(const id of v.contactIds){const contact=require('crm-contacts',id);if(contact.companyId!==v.companyId)throw Error('Contact belongs to another company');}
  if(family==='crm-followups'){require('crm-leads',v.leadId);for(const id of v.taskIds)require('tasks',id);for(const id of v.artifactIds)require('artifacts',id);}
  if(family==='crm-feedback-links'){require('crm-leads',v.crmLeadId);const feedback=rows.find(r=>r.family==='feedback'&&r.value.id===v.feedbackId&&(r.value.workspaceId===undefined||r.value.workspaceId===workspaceId));if(!feedback)throw Error('Feedback not found');}
 }
}
