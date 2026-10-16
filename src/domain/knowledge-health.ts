import type {KnowledgeEntry} from './contracts.ts';
export interface KnowledgeHealth {mode:'local';projectRoot:string;files:number;confirmed:number;pending:number;withoutRegisteredSource:number;checkedAt:string}
export function summarizeKnowledgeHealth(entries:KnowledgeEntry[],projectRoot:string,checkedAt:string):KnowledgeHealth {
 const confirmed=entries.filter(entry=>entry.reviewStatus==='confirmed').length;
 return {mode:'local',projectRoot,files:entries.length,confirmed,pending:entries.length-confirmed,withoutRegisteredSource:entries.filter(entry=>!entry.sources.some(source=>source.trim())&&!(entry as KnowledgeEntry & {sourceLinks?:unknown[]}).sourceLinks?.length).length,checkedAt};
}
