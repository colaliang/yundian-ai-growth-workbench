import test from 'node:test';
import assert from 'node:assert/strict';
import {queryCrmPage,queryEditorOptions} from '../src/crm/page.ts';
test('lead import options resolve off-page IDs with bounded labels and search',()=>{
 const snapshot:any={workspace:{workspaceId:'fake-workspace'},revision:'fake-revision',crm:{companies:[{id:'company',name:'Fake company'}],contacts:[],members:[],followups:[],leads:Array.from({length:25},(_,i)=>({id:'lead-'+String(i).padStart(2,'0'),companyId:'company',contactIds:[],source:'fixture',sourceLeadId:'external-'+i,createdAt:'2026-10-16T00:00:00Z',tags:[],stage:'new',archivedAt:i===24?'2026-10-16T00:00:00Z':null}))}};
 assert.equal(queryCrmPage(snapshot,{page:1,pageSize:20},Date.now()).rows.some(r=>r.lead.id==='lead-23'),false);
 const options=queryEditorOptions(snapshot,{kind:'lead',selected:['lead-23','lead-24','forged']});
 assert.equal(options.rows.length,20);assert.equal(options.total,24);
 assert.deepEqual(options.selected,[{id:'lead-23',name:'Fake company · fixture · external-23'}]);
 assert.deepEqual(queryEditorOptions(snapshot,{kind:'lead',query:'external-23'}).rows,options.selected);
 assert.deepEqual(queryEditorOptions(snapshot,{kind:'lead',query:'no match',selected:['lead-23']}).selected,options.selected);
 assert.throws(()=>queryEditorOptions(snapshot,{kind:'lead',selected:Array(101).fill('lead-23')}),/selected/);
});

