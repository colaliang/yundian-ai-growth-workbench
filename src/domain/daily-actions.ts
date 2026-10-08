import {createHash} from 'node:crypto';
import type {DailyAction as ContractAction} from './contracts.ts';
type Row=Record<string,any>;
export interface DailyDecision {status:'ignored'|'deferred'|'created';until?:string;taskId?:string}
export interface DailyContext {workspaceId:string;profile:Row;tasks:Row[];knowledge:Row[];artifacts:Row[];feedback:Row[];skills:Row;decisions:Record<string,DailyDecision>}
export interface DailyAction extends ContractAction {name:string;stage:string;priority:number;dueAt:string;inputs:string}
export function dailyContext(state:Row):DailyContext{return {workspaceId:state.workspace.workspaceId,profile:state.profile||{},tasks:state.tasks||[],knowledge:state.knowledge||[],artifacts:state.artifacts||[],feedback:state.feedback||[],skills:state.skills||{},decisions:state.dailyDecisions||{}};}
export function recommendDaily(input:DailyContext,now:string,limit:number=5):DailyAction[]{
 const rows:DailyAction[]=[];
 const add=(id:string,name:string,stage:string,reason:string,priority:number,taskId:string|null=null,missingInputs:string[]=[],dueAt='',inputs='')=>{const skill=input.skills[stage];if(skill)rows.push({id,workspaceId:input.workspaceId,name,stage,reason,priority,taskId,skillId:skill.id,missingInputs,dueAt,inputs});};
 const missing=['company','products','markets','persona','goal'].filter(k=>!String(input.profile[k]||'').trim());
 if(missing.length)add('knowledge:profile','补充企业知识库资料','knowledge','企业资料缺口影响技能输入，请先补充已知事实。',0,null,missing,'',JSON.stringify(input.profile));
 if(!missing.length&&!input.tasks.length&&!input.feedback.length)add('profile:market-research','开展目标市场调研','market-research','根据企业产品、目标市场与获客目标，先核对实际市场机会。',2,null,[],'',JSON.stringify({profile:input.profile,recentArtifacts:input.artifacts.slice(-3).map(a=>({summary:a.summary,nextSteps:a.nextSteps}))}));
 for(const t of input.tasks){if(['completed','cancelled'].includes(t.status))continue;const gaps=Array.isArray(t.missingInputs)?t.missingInputs:[];const blocked=['needs-input','blocked'].includes(t.status);const due=Date.parse(t.followUpAt||t.dueAt||'');const overdue=Number.isFinite(due)&&due<=Date.parse(now);add('task:'+t.id,t.name,t.stage,blocked?'任务受阻，需要补充输入。':overdue?'任务跟进已到期，请核对实际结果并推进。':t.status==='needs-review'?'已有产物等待客户验收。':'当前阶段仍有未完成任务。',blocked?0:overdue?1:2,t.id,gaps,t.followUpAt||t.dueAt||'',t.inputs||'');}
 for(const f of input.feedback){if(typeof f.next==='string'&&f.next.trim()){const key=typeof f.id==='string'&&f.id?f.id:createHash('sha256').update(JSON.stringify(f)).digest('hex');add('feedback:'+key,'根据销售反馈优化下一轮','next-cycle','实际销售反馈提出下一步：'+f.next,3,null,[],'',JSON.stringify(f));}}
 return [...new Map(rows.map(r=>[r.id,r])).values()].filter(r=>{const d=input.decisions[r.id];return !d||d.status==='deferred'&&Date.parse(d.until||'')<=Date.parse(now);}).sort((a,b)=>a.priority-b.priority||(a.dueAt||'9999').localeCompare(b.dueAt||'9999')||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(5,Number.isFinite(limit)?Math.floor(limit):5)));
}
