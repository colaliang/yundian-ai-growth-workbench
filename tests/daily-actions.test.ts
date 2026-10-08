import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyContext,recommendDaily} from '../src/domain/daily-actions.ts';
const skills={knowledge:{id:'knowledge'},acquisition:{id:'acquisition'},'next-cycle':{id:'next'}};
test('real candidates stable priority, no padding, decisions filter',()=>{
 const state:any={workspace:{workspaceId:'w'},profile:{company:'A',products:'B',markets:'C',persona:'D',goal:'E'},skills,tasks:[{id:'b',name:'Later',stage:'acquisition',status:'ready'},{id:'a',name:'Due',stage:'acquisition',status:'ready',dueAt:'2026-10-01'}],knowledge:[],feedback:[{id:'f',next:'改善报价',result:'拒绝'}]};
 const c=dailyContext(state);const rows=recommendDaily(c,'2026-10-08T00:00:00Z');assert.deepEqual(rows,recommendDaily(c,'2026-10-08T00:00:00Z'));assert.equal(rows.length,3);assert.equal(rows[0].taskId,'a');assert.ok(rows.every(r=>r.reason&&r.skillId));
 c.decisions={'task:a':{status:'ignored'},'task:b':{status:'deferred',until:'2026-10-09T00:00:00Z'}};assert.equal(recommendDaily(c,'2026-10-08T00:00:00Z').length,1);assert.equal(recommendDaily(c,'2026-10-10T00:00:00Z').length,2);
});
test('gaps precede tasks; empty does not manufacture counts',()=>{const c=dailyContext({workspace:{workspaceId:'w'},profile:{},skills,tasks:[],feedback:[]});assert.equal(recommendDaily(c,'2026-10-08').length,1);assert.ok(recommendDaily(c,'2026-10-08')[0].missingInputs.includes('company'));c.profile={company:'A',products:'B',markets:'C',persona:'D',goal:'E'};assert.equal(recommendDaily(c,'2026-10-08').length,0);});
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileWorkspace} from '../server.ts';
test('workspace decisions survive restart; feedback creates one real ready task',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'daily-actions-'));
 try{let store=new FileWorkspace(root);const save=(action:string,payload:any)=>store.save({action,payload,revision:store.load().revision});
 save('daily-ignore',{id:'knowledge:profile'});store=new FileWorkspace(root);assert.equal(store.load().dailyActions.length,0);
 save('profile',{company:'A',products:'B',markets:'C',persona:'D',goal:'E'});save('feedback',{leadId:'lead-1',source:'actual-call',cycleId:'cycle-1',result:'客户拒绝报价',reason:'交期',next:'核对交期信息'});
 const action=store.load().dailyActions[0];save('daily-defer',{id:action.id});assert.equal(new FileWorkspace(root).load().dailyActions.length,0);
 const decisionFile=store.files('daily-decisions','.json').find(f=>store.json(f).id===action.id)!;const d=store.json(decisionFile);store.put(decisionFile,{...d,until:'2000-01-01T00:00:00Z'});
 save('daily-create',{id:action.id});const state=new FileWorkspace(root).load();assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].status,'ready');assert.ok(state.tasks[0].invocation.includes(state.tasks[0].id));assert.ok(state.tasks[0].inputs.includes('交期'));assert.equal(state.dailyDecisions[action.id].taskId,state.tasks[0].id);assert.throws(()=>save('daily-create',{id:action.id}),/建议已变化/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('sufficient candidates capped at five, completed and cancelled excluded',()=>{const c=dailyContext({workspace:{workspaceId:'w'},profile:{company:'A',products:'B',markets:'C',persona:'D',goal:'E'},skills,tasks:Array.from({length:8},(_,i)=>({id:String(i),name:'任务'+i,stage:'acquisition',status:i===0?'completed':i===1?'cancelled':'ready'}))});assert.equal(recommendDaily(c,'2026-10-08').length,5);assert.equal(recommendDaily(c,'2026-10-08',3).length,3);assert.equal(recommendDaily(c,'2026-10-08',0).length,0);});
test('legacy feedback has stable distinct identities and malformed next is skipped',()=>{const c=dailyContext({workspace:{workspaceId:'w'},profile:{company:'A',products:'B',markets:'C',persona:'D',goal:'E'},skills,feedback:[{leadId:'one',next:'核验来源'},{leadId:'two',next:'核验价格'},{next:12},{next:{bad:true}}]});const a=recommendDaily(c,'2026-10-08');assert.equal(a.length,2);assert.notEqual(a[0].id,a[1].id);c.feedback.reverse();assert.deepEqual(recommendDaily(c,'2026-10-08'),a);c.decisions={[a[0].id]:{status:'ignored'}};assert.equal(recommendDaily(c,'2026-10-08').length,1);});
