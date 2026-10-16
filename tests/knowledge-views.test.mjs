import {test} from 'node:test';
import assert from 'node:assert/strict';
import {skillProgress,skillsView} from '../web/views/skills.js';
import {knowledgeView} from '../web/views/knowledge.js';
import {settingsView} from '../web/views/settings.js';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const base={skills:{'market-research':{title:'调研',inputs:'真实输入',outputs:'来源文件',acceptance:'当前内容',variants:[{origin:'customer',version:'custom-1',status:'different',entry:'custom.md'}]}},profile:{},projectRoot:'fixture',tasks:[],artifacts:[],reviews:[]};
test('skill flow distinguishes absent manual and actual receipt and current acceptance',()=>{
 assert.match(skillProgress(base,'market-research').result,/待 WorkBuddy 执行/);
 const task={id:'t',stage:'market-research',name:'真实任务',createdAt:'2026-10-16',status:'completed'},artifact={id:'a',taskId:'t',contentHash:'old',nextSteps:['核对下一市场']},review={artifactId:'a',contentHash:'old',valid:true,decision:'accepted',sequence:1};
 const state={...base,tasks:[task],artifacts:[artifact],reviews:[review]};assert.match(skillProgress(state,'market-research').result,/待 WorkBuddy 执行/);
 task.executionReceipt={receiptId:'manual-1',executor:'manual',status:'needs-review'};assert.match(skillProgress(state,'market-research').result,/人工登记/);
 task.executionReceipt={receiptId:'actual-1',executor:'fixture-workbuddy',status:'needs-review'};assert.match(skillProgress(state,'market-research').result,/成果已登记/);assert.match(skillProgress(state,'market-research').acceptance,/已按内容验收/);
 review.valid=false;artifact.contentHash='changed';assert.match(skillProgress(state,'market-research').acceptance,/待验收/);assert.equal(skillProgress(state,'market-research').next,'核对下一市场');
 const html=skillsView({state,heading:()=>'',button:t=>t,esc});for(const label of ['输入准备','执行指令','成果','验收','下一步','客户定制','custom-1','actual-1'])assert.ok(html.includes(label));
});
test('knowledge and settings show actual metadata and conservative status',()=>{
 const html=knowledgeView({state:{knowledge:[{id:'k',path:'knowledge/a.md',title:'<unsafe>',content:'fact',sources:[],reviewStatus:'pending',category:'product',sourceLinks:[{url:'https://example.test'}],attachments:[{path:'assets/missing',status:'missing'},{url:'https://example.test/file',status:'external-link'}]}]},heading:()=>'',button:t=>t,esc,setup:''});assert.ok(html.includes('data-knowledge-category="product"'));assert.ok(html.includes('本地文件缺失'));assert.ok(html.includes('未下载'));assert.ok(html.includes('仅登记，未核验'));assert.ok(!html.includes('<unsafe>'));
 const settings=settingsView({state:{...base,runtime:{workspaceId:'w',instanceId:'i',projectRoot:'fake',owner:{},publisher:{},lock:{status:'blocked'},checkedAt:'fixture-check'},backupPlan:{enabled:false,lastResult:'partial',lastSuccessAt:null,missing:[{reference:'missing'}]}},heading:()=>'',button:t=>t,esc});assert.ok(settings.includes('锁状态待核对，暂停写入'));assert.ok(settings.includes('存在覆盖缺口'));assert.ok(settings.includes('覆盖缺口：1'));assert.ok(!settings.includes('最近结果：完整成功'));
});

