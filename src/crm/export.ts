import type {CrmRow} from './query.ts';
export const crmExportFields=['companyName','contactName','country','industry','website','stage','tags','source','ownerName','email','phone','whatsapp','linkedin','createdAt','nextFollowUpAt'] as const;
export type CrmExportField=typeof crmExportFields[number];
export function selectExportRows(rows:CrmRow[],mode:'selected'|'filtered',ids?:string[]):CrmRow[]{if(mode==='filtered')return rows;if(mode!=='selected'||!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('Invalid selected export scope');const available=new Set(rows.map(r=>r.lead.id));if(ids.some(id=>!available.has(id)))throw Error('Selected records no longer match this filter; select again');return rows.filter(r=>ids.includes(r.lead.id));}
export function exportCrmCsv(rows:CrmRow[],fields:CrmExportField[]):string {
 if(rows.length>10000)throw Error('Export exceeds 10000 rows; narrow filters and export in batches');
 if(!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||fields.some(f=>!crmExportFields.includes(f)))throw Error('Invalid CRM export fields');
 const cell=(value:unknown,text=false)=>{let s=String(value??'');if(s&&(text||/^[\s\u0000-\u001f\u007f-\u009f\ufeff]*[=+\-@]/u.test(s)||/^\d{12,}$/.test(s)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const value=(r:CrmRow,f:CrmExportField):unknown=>{switch(f){case 'companyName':return r.company?.name;case 'contactName':return r.contacts.map(c=>c.name).join('\n');case 'ownerName':return r.owner;case 'tags':return [...new Set([...(r.company?.tags??[]),...r.lead.tags])].join(', ');case 'nextFollowUpAt':return r.followup?.nextFollowUpAt;case 'email':case 'phone':case 'whatsapp':case 'linkedin':return r.contacts.map(c=>c[f]).filter(Boolean).join('\n');case 'country':case 'industry':case 'website':return r.company?.[f];default:return r.lead[f];}};
 return '\uFEFF'+[fields.map(f=>cell(f)).join(','),...rows.map(r=>fields.map(f=>cell(value(r,f),f==='phone'||f==='whatsapp')).join(','))].join('\r\n')+'\r\n';
}
