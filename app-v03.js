import {crmView,mountCrm} from './web/views/crm.js';
import {contentPlanView,mountContentPlan,mountPublicationResults} from './web/views/content-plan.js';
import {MODULES,moduleForStage} from './web/modules.js';
import {consultationForModule,moduleConsultationView,expertDetail} from './web/views/services.js';
import {schedulesView,scheduleSummary} from './web/views/schedules.js';
import {knowledgeView} from './web/views/knowledge.js';
import {resultsView} from './web/views/results.js';
import {skillsView} from './web/views/skills.js';
export function heading(title,desc,actions=''){const text=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<div class="heading"><div><div class="eyebrow">YUNDIAN+ / AI GROWTH</div><h1>${text(title)}</h1><p>${text(desc)}</p></div><div class="actions">${actions}</div></div>`;}
import {api} from './web/api.js';
import {workbenchView} from './web/views/workbench.js';
import {settingsView} from './web/views/settings.js';
export function mountLegacy(root,{navigation,navigate,initialPage='overview'}){
const artifactContents={};
root.addEventListener('input',e=>{if(!e.target.matches('[data-result-filter]'))return;const f=Object.fromEntries([...root.querySelectorAll('[data-result-filter]')].map(x=>[x.dataset.resultFilter,x.value]));let count=0;for(const row of root.querySelectorAll('[data-result-search]')){const d=row.dataset;row.hidden=!!((f.search&&!d.resultSearch.includes(f.search.toLowerCase()))||(f.type&&f.type!==d.resultType)||(f.cycle&&f.cycle!==d.resultCycle)||(f.review&&f.review!==d.resultReview)||(f.from&&(!d.resultDate||d.resultDate<f.from))||(f.to&&(!d.resultDate||d.resultDate>f.to)));if(!row.hidden)count++;}const empty=root.querySelector('[data-results-empty]');if(empty)empty.hidden=count>0;});
'use strict';
const stages=MODULES.map(m=>[m.id,m.title,'专业技能、任务记录与本项目成果']);
const scheduleStages=MODULES.flatMap(m=>m.stages.map(stage=>[stage,stage===m.id?m.title:stage.toUpperCase()+' 专业技能']));
let expanded=false;try{expanded=localStorage.getItem('yundian-ui-skills-expanded')==='true';}catch{}
let category='';
let updateProtection='';let updateInfo=null;let state,token,page='overview';const $=s=>root.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,id='',primary=false)=>`<button type="button" data-action="${action}" data-id="${esc(id)}" class="${primary?'primary':''}">${esc(text)}</button>`;
const label=s=>stages.find(x=>x[0]===s)?.[1]||s;const statuses={'running':'执行中','failed':'执行失败','cancelled':'已取消','ready':'待执行','needs-review':'待验收','completed':'已验收','blocked':'执行受阻','needs-input':'待补资料'};
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4000);}
/* ---- 知识取用与受限信息保护（2026-10-06/08 定制，随主线 v0.15.0 移植）----
   1) 企业事实为所有阶段共用，另按阶段追加该阶段相关资料，让内容生成 / SEO·GEO 能吃到对应知识
   2) 送进模型前强制脱敏：知识库含对外口径记录（含真实号码），仅靠提示词约束不够，
      在上下文出口拦一道，保证号码、微信号、二维码不会被模型复述进对外正文。
      对外公开的服务价格属于可引用事实，不脱敏。 */
const BASE_KB=/organization|brand-profile|products|target-markets|buyer-personas|profile\.md|websites|企业事实|品牌|governance|治理/;
const STAGE_KB={'market-research':['market','competitor','竞品','市场','调研'],'product-opportunity':['product','产品','机会','竞品'],'site-and-content':['site','website','内容','content','建站','页面'],'seo-geo':['seo','geo','keyword','关键词','页面','事实卡','fact','内容'],'seo':['seo','keyword','关键词','页面','站内','技术'],'geo':['geo','aigc','ai','事实卡','引用','ai搜索','Prompt'],'content-operations':['content','选题','内容','发布','素材','表现'],'social-media':['social','社媒','tiktok','youtube','linkedin','pinterest','内容','发布'],'facebook-ads':['facebook','fb','ads','广告','投放','素材'],'google-ads':['google','ads','广告','投放','关键词','追踪'],'email-outreach':['email','邮件','outreach','开发信','名单','跟进'],'acquisition':['buyer','linkedin','获客','线索','lead','客户'],'buyer-check':['buyer','客户','背调','线索','customer'],'sales-feedback':['feedback','销售','crm','反馈'],'next-cycle':['复盘','反馈','sop','总结','cases','案例']};
const CASE_KB=/cases-and-results|案例/;
function redactForModel(s){return String(s??'')
 .replace(/1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/g,'[手机号已脱敏]')
 .replace(/(?<!\d)0\d{2,3}[-\s]?\d{7,8}(?!\d)/g,'[座机已脱敏]')
 .replace(/(微信|vx|weixin|wechat)[\s:：]*[A-Za-z][-_A-Za-z0-9]{5,19}/gi,'$1：[账号已脱敏]')
 .replace(/(邮箱|email)[\s:：]*[\w.+-]+@[\w.-]+\.\w+/gi,'$1：[邮箱已脱敏]')
 .replace(/二维码/g,'[二维码]');}
/* 上下文分配：企业事实文件优先，再按阶段追加；每份按剩余预算动态取额，
   避免固定字符上限把价格表后半段、治理规则尾段砍掉。 */
const KB_BUDGET=20000,KB_MIN=1400,KB_MAX=6000;
function knowledgeBrief(stage){const keys=STAGE_KB[stage]||[];
 const hit=k=>keys.some(x=>String(k.path).toLowerCase().indexOf(x.toLowerCase())>=0)||(stage!=='knowledge'&&CASE_KB.test(k.path));
 const files=(state.knowledge||[]).filter(k=>BASE_KB.test(k.path)||hit(k));
 const ordered=files.filter(k=>BASE_KB.test(k.path)).concat(files.filter(k=>!BASE_KB.test(k.path)));
 const parts=[];let left=KB_BUDGET;
 ordered.forEach((k,i)=>{
  if(left<=0||!k)return;
  const cap=Math.max(KB_MIN,Math.min(KB_MAX,Math.floor(left/(ordered.length-i))));
  const raw=String(k.content||'');
  const body=raw.length>cap?raw.slice(0,cap)+'\n（本文件较长已截断，完整内容见 '+k.path+'）':raw;
  const chunk='【'+k.path+'】\n'+body;
  parts.push(chunk);left-=chunk.length;});
 return redactForModel(parts.join('\n\n'));}
/* 知识库同步自检：比对线上文件与同步基线，发现漏同步或线上被改坏 */
function kbStatusHtml(){const k=state.kbCheck||{};
 if(k.status==='ok')return '<span class="pill">一致</span> 线上 '+k.present+' 份知识文件与基线一致'+(k.at?'（同步于 '+esc(String(k.at).slice(0,19).replace('T',' '))+'）':'');
 if(k.status==='drift')return '<span class="pill">不一致</span> '+k.drifted.length+' 份与基线不符：'+esc(k.drifted.join('、'))+'。本地运行 node scripts/sync-knowledge.mjs 同步后重新发布';
 if(k.status==='no-baseline')return '<span class="pill">无基线</span> 未找到 .sync-manifest.json，运行 node scripts/sync-knowledge.mjs 生成';
 return '<span class="pill">未知</span> 尚未校验';}
/* 产物 / 草稿导出 PDF：新开窗口打印，内容留在浏览器侧，不上传 */

async function exportPdf(id){await readArtifact(id);const content=artifactContents[id]||'';const t=(state.tasks||[]).find(x=>x.id===id);printPdf(t?t.name:'工作产物',content);}

async function readArtifact(id){const t=(state.tasks||[]).find(x=>x.id===id);let content=artifactContents[id]||'';
  try{const r=await fetch('/api/artifact/'+encodeURIComponent(id)+'.md');if(!r.ok)throw Error('产物读取失败（'+r.status+'）');content=await r.text();artifactContents[id]=content;}catch(e){toast(e.message);if(!content)throw e;}
  return content;}
async function viewArtifact(id){const t=state.tasks.find(x=>x.id===id);const content=await readArtifact(id);modal('工作产物'+(t?'：'+t.name:''),content?`<div class="knowledge">${esc(content)}</div><div class="actions">${button('导出 PDF','pdf',id,true)}</div>`:'<div class="empty">该任务还没有产物内容。</div>');}

function tasks(rows){return rows.length?rows.map(t=>`<div class="row"><div><h3>${esc(t.name)}</h3><p>${esc(label(t.stage))} · ${esc(t.cycleId)}</p></div><div class="actions"><span class="pill ${t.status==='completed'?'done':''}">${esc(statuses[t.status]||t.status)}</span>${button('查看任务','task',t.id)}</div></div>`).join(''):'<div class="empty">还没有任务<br>根据当前业务阶段，创建第一项获客工作。</div>';}
const recordFields={
'market-research':[['market','国家/细分市场'],['buyer','目标买家'],['hypothesis','需求结论 / 待验证假设']],
'product-opportunity':[['product','产品/规格'],['market','国家'],['buyer','应用/买家'],['hypothesis','机会假设'],['constraints','成本/认证/供货缺口'],['opportunityId','稳定机会ID']],
'site-and-content':[['platform','AI / Shopify / WordPress'],['url','站点/预览URL'],['constraints','部署权限与验收缺口']],
'content-operations':[['product','产品/主题'],['buyer','目标读者'],['platform','渠道/格式'],['url','实际内容文件/发布URL'],['status','草稿/已发布/待验证']],
'acquisition':[['leadId','稳定线索ID'],['url','LinkedIn企业/联系人URL'],['buyer','采购角色'],['opportunityId','关联机会ID'],['next','开发草稿/下一步']],
'buyer-check':[['leadId','稳定线索ID'],['url','主体官网/职业资料'],['buyer','主体/采购关系'],['result','核验/匹配/意向结论'],['next','待核问题与跟进']],
'sales-feedback':[['leadId','稳定线索ID'],['result','实际联系/报价/成交结果'],['next','下一轮建议']],
'next-cycle':[['hypothesis','改进假设'],['result','实际销售反馈依据'],['next','验证任务与停止标准']]
};
/* ---- 连接容错（云店+ 定制 2026-10-08/09；放在本文件而非 web/api.js，避免主线更新被覆盖）----
   现象：页面报「Failed to execute 'json' on 'Response': Unexpected end of JSON input」，
        或停在「项目资料未连接」。
   根因：线上应用空闲后会休眠。唤醒期间网关先给出不可用响应 —— 实测撞到过两种：
         「200 + 空响应体」和「404 + 空响应体」，应用起来之后才恢复 200。
         唤醒本身要十几秒，而最初实现只重试约 4 秒就放弃，用户必须手点「重新连接」。
   处理：
     1) GET 不带 JSON Content-Type；先取文本判空再解析；网关状态码单独识别并说人话
     2) 前台退避重试（0 / 0.8s / 2s / 4s）
     3) 仍失败则进入后台自动重连：每 4 秒一次、最多 10 次，成功后自动渲染，
        全程不需要用户点任何按钮（这才是「休眠唤醒」场景该有的行为）
     4) 保留手动「重新连接」按钮兜底
     5) 只有自动重连也失败，才提示本地/线上启动命令 —— 那属于部署问题，不是唤醒问题 */
const STATE_RETRY=[0,800,2000,4000];
const GATEWAY_STATUS=[404,502,503,504];
const gatewayHint=s=>s===404?'应用尚未就绪（网关返回 404）：线上空闲后会休眠，唤醒通常需要十几秒':('应用暂时不可用（网关返回 '+s+'）：正在自动重连');
async function fetchStateOnce(){
 const r=await fetch('/api/state',{cache:'no-store',headers:{Accept:'application/json'}});
 const text=await r.text();
 if(!r.ok&&GATEWAY_STATUS.includes(r.status)){const e=Error(gatewayHint(r.status));e.gateway=true;throw e;}
 if(!text.trim())throw Error('服务端返回了空响应体（HTTP '+r.status+'）');
 let value;try{value=JSON.parse(text);}catch{throw Error('服务端返回了非 JSON 内容：'+text.slice(0,60));}
 if(r.status===401){const e=Error(value.error||'Owner login required');e.ownerAuth=true;e.setupRequired=value.setupRequired;throw e;}
 if(!r.ok)throw Error((value&&value.error)||('请求失败（HTTP '+r.status+'）'));
 return value;}
async function fetchState(onProgress){let last;
 for(let i=0;i<STATE_RETRY.length;i++){
  if(STATE_RETRY[i]){if(onProgress)onProgress(i);await new Promise(r=>setTimeout(r,STATE_RETRY[i]));}
  try{return await fetchStateOnce();}catch(e){if(e.ownerAuth)throw e;last=e;}}
 throw last;}
async function appAlive(){try{const r=await fetch('/healthz',{cache:'no-store'});return r.ok;}catch{return false;}}
let recoverTimer=null;
function stopRecover(){if(recoverTimer){clearInterval(recoverTimer);recoverTimer=null;}}
function errorPanel(e,tip,status){return `<div class="panel"><h1>项目资料未连接</h1><p>${esc(e.message)}</p><p>${esc(tip)}</p><p id="recover-note" class="note">${esc(status)}</p><p class="note">若长时间无法恢复，通常属于部署问题，而不是唤醒：<br>本地启动（在 wb-public 目录下）：<code>node server.js --root 客户项目目录 --port 8767</code><br>注意不要用 <code>npm start</code>：它执行的是 <code>node server.ts</code>，而发布目录里只有编译产物 server.js，会直接报 Cannot find module。<br>线上部署：启动命令须为 <code>node server.js --root /workspace --public</code></p><div class="actions">${button('立即重新连接','retry-state','',true)}</div></div>`;}
async function refresh(){const m=$('#main');stopRecover();
 try{state=await fetchState(i=>{if(m)m.innerHTML=`<div class="panel"><h1>正在连接项目资料…</h1><p>第 ${i+1} 次尝试，线上应用唤醒可能需要十几秒。</p></div>`;});token=state.token;render();return;}
 catch(e){
  if(e.ownerAuth){window.dispatchEvent(new CustomEvent('owner-login-required'));return;}
  const alive=await appAlive();
  const tip=alive?'应用已在线，但读取项目资料失败。':'应用正在唤醒或暂时不可用 —— 线上空闲后会休眠，唤醒需要十几秒。';
  if(m)m.innerHTML=errorPanel(e,tip,'正在自动重连，请稍候（通常十几秒内自动恢复，无需任何操作）…');
  startRecover();}}
/* 后台自动重连：每 4 秒一次、最多 10 次（约 40 秒）。成功即自动渲染并提示，用户不用点按钮。 */
function startRecover(){
 stopRecover();let n=0;
 recoverTimer=setInterval(async()=>{
  n++;
  try{
   const s=await fetchStateOnce();state=s;token=s.token;stopRecover();render();toast('已重新连接，项目资料已加载');
  }catch(e){
   if(e.ownerAuth){stopRecover();window.dispatchEvent(new CustomEvent('owner-login-required'));return;}
   const note=$('#recover-note');
   if(note)note.textContent='已自动重连 '+n+'/10 次：'+e.message;
   if(n>=10){stopRecover();if(note)note.textContent='自动重连未成功。请点「立即重新连接」，或按下方命令确认服务是否已启动。';}
  }
 },4000);}
/* ---- save：移植到 v0.15.0 时遗漏，但被 8 处写操作引用（表单、产物、头像、任务、技能安装…），
   缺失会让线上所有保存动作抛 ReferenceError，且页面上看不出原因。补回时按新版调整：
   /api/save 只回 store.load()，不含 token / projectRoot / cloud / kbCheck，需就地保留；
   旧版依赖的 旧版云任务合并 在新版不存在，已去掉；
   同样先取文本判空再解析，避免网关空响应体导致 "Unexpected end of JSON input"。 */
async function save(action,payload){
 const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json','X-Workspace-Token':token},body:JSON.stringify({action,payload,revision:state.revision})});
 const text=await r.text();
 if(!text.trim())throw Error('保存失败：服务端返回了空响应体（HTTP '+r.status+'）');
 let value;try{value=JSON.parse(text);}catch{throw Error('保存失败：服务端返回了非 JSON 内容：'+text.slice(0,60));}
 if(!r.ok)throw Error((value&&value.error)||('保存失败（HTTP '+r.status+'）'));
 state={...value,token,projectRoot:state.projectRoot,cloud:state.cloud,kbCheck:state.kbCheck};
 render();toast('已保存到项目文件');}
function stageRecords(stage){return (state.records||[]).filter(r=>r.stage===stage).slice(-5).map(r=>JSON.stringify(r)).join('\n').slice(0,2000);}
function printPdf(title,content){const w=window.open('','_blank');if(!w){toast('请允许弹出窗口后再导出 PDF');return;}w.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:"Microsoft YaHei",sans-serif;line-height:1.9;padding:36px;color:#24344b}h1{font-size:20px;margin:0 0 8px}.meta{font-size:12px;color:#7a8aa0;margin:0 0 18px}pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;margin:0}</style></head><body><h1>${esc(title)}</h1><p class="meta">企业：${esc(state.profile.company||'未填写')} ｜ 生成时间：${new Date().toLocaleString('zh-CN')}</p><pre>${esc(content)}</pre></body></html>`);w.document.close();setTimeout(()=>{w.focus();w.print();},300);}
function businessPanel(){if(page==='seo-geo')return `<section class="panel"><div class="heading"><h2>SEO / GEO 验收台账</h2>${button('创建完整验收台账','audit-new','',true)}</div>${(state.audits||[]).map(a=>`<h3>${esc(a.platform)} · ${a.items.length} 项</h3>${a.items.map(i=>`<div class="row"><div><strong>${esc(i.id)} ${esc(i.title)}</strong><p>${esc(i.level)} · ${esc(i.result)} · ${esc(i.evidence?.join('；')||'无证据')}</p></div>${button('填写检查结果','audit-item',a.id+':'+i.id)}</div>`).join('')}`).join('')||'<div class="empty">先选择Shopify或WordPress，生成全部待验证检查项。</div>'}</section>`;return `<section class="panel"><div class="heading"><h2>阶段资料与实际结果</h2>${button('添加业务记录','record','',true)}</div>${(state.records||[]).filter(r=>r.stage===page).map(r=>`<div class="row"><div><h3>${esc(r.name)}</h3><p>${Object.entries(r).filter(([k,v])=>!['id','stage','name','createdAt'].includes(k)&&v).map(([k,v])=>esc(k)+': '+esc(v)).join('<br>')}</p></div>${button('据此创建任务','record-task',r.id)}</div>`).join('')||'<div class="empty">保存真实输入、来源和结果，再交给对应技能处理。</div>'}</section>`;}
function render(){if(!state)return;const nav=navigation;$('#sidebar').innerHTML=`<div class="brand"><img src="${esc(state.settings?.avatar||'brand.jpg')}" alt="项目头像"><div><strong>云店+</strong><small>AI GROWTH</small></div></div><div class="project-label"><span class="muted">当前项目</span><strong>${esc(state.profile.company||'待创建企业知识库')}</strong><span class="muted">WorkBuddy 获客工作台</span></div><nav>${nav.map(([id,name],i)=>`<button data-action="${id==='skills'?'toggle-skills':'nav'}" data-id="${id}" aria-expanded="${id==='skills'?expanded:''}" aria-current="${page===id?'page':'false'}" class="${page===id?'active':''}">${name}</button>${id==='skills'&&expanded?'<div class="module-submenu">'+MODULES.map(m=>'<button data-action="nav" data-id="'+m.id+'" class="'+(page===m.id?'active':'')+'">'+String(m.number).padStart(2,'0')+' '+m.title+'</button>').join('')+'</div>':''}`).join('')}</nav><footer>知识驱动 · 客户自主定制<br>真实文件保存 / ${esc(state.version)}</footer>`;
const setup=!state.profile.company?`<section class="panel setup"><div><h2>先建立企业知识库</h2><p>关联项目 → 添加企业资料 → 明确获客目标 → 启动第一项工作</p></div>${button('创建知识库','profile','',true)}</section>`:'';
let html='';
if(page==='overview'){html=workbenchView({state,heading,button,tasks,stages,setup,esc})+scheduleSummary({state,button,esc});}
else if(page==='crm'){html=crmView();}
else if(page==='knowledge'){html=knowledgeView({state,heading,button,esc,setup});}
else if(page==='schedules'){html=schedulesView({state,heading,button,esc});}
else if(page==='settings'){html=settingsView({state,updateInfo,heading,button,esc});}
else if(page==='skills'){html=skillsView({state,heading,button,esc});}

else if(page==='artifacts'){html=heading('选择成果所属项目','进入项目查看对应成果。')+MODULES.map(m=>button(m.title,'nav',m.id)).join('');}
else{html=heading(label(page),stages.find(x=>x[0]===page)?.[2]||'',button('定制阶段任务','new-task',category||page,true))+setup;if(page==='site-and-content'||page==='acquisition'||page==='content-operations')html+=`<div class="service-links">${(page==='site-and-content'?['AI建站','Shopify独立站','WordPress定制建站']:page==='content-operations'?['内容选题','内容制作','内容发布计划','内容效果复盘']:['LinkedIn 买家筛选','LinkedIn 联系人核验','LinkedIn 开发信草稿','LinkedIn 跟进计划']).map(s=>button(s,'service',s)).join('')}</div>`;html+=moduleConsultationView(page,esc);html+=skillsView({state,moduleId:page,heading:()=>'',button,esc});if(page==='seo-geo')html+='<section class="panel">'+['seo-geo','seo','geo'].map(s=>button(s==='seo-geo'?'全部技能':s.toUpperCase(),'nav',s==='seo-geo'?s:'seo-geo/'+s)).join('')+'</section>';if(page==='content-operations')html+=contentPlanView();html+=businessPanel();html+=`<section class="panel"><h2>阶段工作</h2><p class="note">技能：${esc(state.skills[page]?.id||'')} · ${state.skills[page]?.status==='installed'?'项目文件已安装（宿主加载待验证）':'待安装或版本不同'}</p>${tasks(state.tasks.filter(t=>moduleForStage(t.stage)===page&&(!category||t.stage===category)))}</section>`;html+=resultsView({state,moduleId:page,heading,button,esc});if(page==="content-operations"||page==="social-media")html+=`<section class="panel"><h2>本项目发布回执成果</h2><div id="publication-results">加载实际回执…</div></section>`;if(page==='sales-feedback')html+=`<section class="panel"><div class="heading"><h2>真实销售反馈</h2>${button('记录反馈','feedback','',true)}</div>${state.feedback.map(f=>`<div class="row"><div><h3>${esc(f.leadId)} · ${esc(f.result)}</h3><p>${esc(f.source)} / ${esc(f.reason)}</p><p>下一步：${esc(f.next||'待定')}</p></div></div>`).join('')||'<div class="empty">暂无实际反馈。记录联系、报价、成交或拒绝原因。</div>'}</section>`;
if(page==='next-cycle')html+=`<section class="panel"><h2>下一轮优化依据</h2><p>${state.feedback.length?`已有 ${state.feedback.length} 条客户反馈，可关联渠道与线索调整下一轮任务。`:'等待实际线索及销售反馈。可以建立验证假设，不以预测冒充获客结果。'}</p></section>`;}
$('#main').innerHTML=html+'<p class="footer-note">市场调研 → 产品机会 → 建站 / SEO与GEO / 内容运营 → 主动获客 → 客户背调 → 销售反馈 → 优化下一轮</p>';if(page==='crm')mountCrm($('#crm-root'),{state,token,onRevision(value){state.revision=value;},onState(value){state=value;}});if(page==='content-operations')mountContentPlan($('#content-plan-root'),{token,revision:state.revision,onRevision(value){state.revision=value;},artifacts:state.artifacts});if(page==="content-operations"||page==="social-media")mountPublicationResults($("#publication-results"),{moduleId:page,tasks:state.tasks,token,onRevision(value){state.revision=value;}});}
function modal(title,body){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog').showModal();}
function field(name,title,value='',area=false){return `<label>${esc(title)}${area?`<textarea name="${name}">${esc(value)}</textarea>`:`<input name="${name}" value="${esc(value)}">`}</label>`;}
function form(title,body,action,extra={},onSaved){modal(title,`<form>${body}<div class="error" role="alert"></div><div class="actions"><button type="submit" class="primary">保存</button></div></form>`);$('#dialog-body form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button[type=submit]');b.disabled=true;try{const payload={...Object.fromEntries(new FormData(e.target)),...extra};await save(action,payload);$('#dialog').close();if(onSaved)onSaved(payload);}catch(err){e.target.querySelector('.error').textContent=err.message;}finally{b.disabled=false;}};}
function prompt(t){if(t.invocation)return t.invocation+(t.receiptInstructions||'');return `必须读取并使用对应功能技能：${t.skillId||state.skills[t.stage].id}\n技能文件：${t.skillPath||state.skills[t.stage].installedPath}\n若未安装，先在工作台项目与设置安装技能。\n使用 yundian-growth-workbench 主技能，在当前 WorkBuddy 客户项目执行真实任务。\n项目目录：${state.projectRoot}\n企业：${state.profile.company}\n获客目标：${state.profile.goal}\n阶段：${label(t.stage)}\n轮次：${t.cycleId}\n任务：${t.name}\n输入/上游产物：${t.inputs||'先读取 knowledge 目录，缺失则补资料'}\n步骤/工具：${t.instructions||'按客户目标定制实际工作流'}\n验收：${t.acceptance||'产物可读、来源可追溯；未知事实标记待确认'}\n将实际产物写入 growth-workspace/artifacts/${t.id}.md，并更新任务记录。执行失败不得模拟成功。广告只读；外部动作按实际授权。默认读取本地知识；使用外部来源时核验宿主授权和出处。\n完成实际工作后运行：node \"${state.projectRoot}/.codebuddy/skills/yundian-growth-workbench/scripts/submit_result.mjs\" --root \"${state.projectRoot}\" --task ${t.id} --file \"${state.projectRoot}/growth-workspace/artifacts/${t.id}.md\"。受阻时用 --status blocked --reason 说明。然后刷新工作台并记录客户验收。`;}
root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;
if(action==='retry-state'){refresh();return;}
if(action==='expert-detail'){const expert=id==='cola'?consultationForModule('site-and-content'):state.serviceCatalog.experts.find(e=>e.id===id);if(expert)modal('专家服务',expertDetail(expert,esc)+button('复制联系电话','expert-copy',id));}
if(action==='expert-copy'){const expert=state.serviceCatalog.experts.find(e=>e.id===id);if(expert)navigator.clipboard.writeText(expert.contact).then(()=>toast('联系电话已复制')).catch(()=>modal('手动复制联系电话',`<pre>${esc(expert.contact)}</pre>`));}
if(action==='delivery-create')save('delivery-create',{templateId:id}).catch(e=>toast(e.message));
if(action==='delivery-share'){const program=state.deliveryPrograms.find(p=>p.id===id);const artifacts=state.artifacts.filter(a=>a.workspaceId===state.workspace.workspaceId&&program.artifactIds.includes(a.id));modal('客户主动选择成果',`<form id="share-form"><p>仅导出所选成果的登记摘要、路径与验收状态。请自行核对内容后手动分享，不自动联系专家。</p>${artifacts.map(a=>`<label><input type="checkbox" name="artifact" value="${esc(a.id)}">${esc(a.summary||a.id)}</label>`).join('')||'<p>暂无实际成果可选择。</p>'}<p class="error" role="alert"></p><button type="submit">导出所选成果</button></form>`);$('#share-form').onsubmit=e=>{e.preventDefault();const ids=new FormData(e.target).getAll('artifact');if(!ids.length){e.target.querySelector('.error').textContent='请主动选择至少一项成果';return;}const selected=artifacts.filter(a=>ids.includes(a.id)).map(a=>({id:a.id,summary:a.summary,path:a.path,url:a.url,verification:a.verification,accepted:state.reviews.filter(r=>r.artifactId===a.id).sort((a,b)=>(a.sequence||0)-(b.sequence||0)||String(a.reviewedAt).localeCompare(String(b.reviewedAt))).at(-1)?.valid===true&&state.reviews.filter(r=>r.artifactId===a.id).sort((a,b)=>(a.sequence||0)-(b.sequence||0)||String(a.reviewedAt).localeCompare(String(b.reviewedAt))).at(-1)?.decision==='accepted'}));const url=URL.createObjectURL(new Blob([JSON.stringify({artifacts:selected},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='selected-delivery-artifacts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('所选成果摘要已导出，请自行核对后分享');};}
if(action==='schedule-create')form('创建定时配置',`${field('name','计划名称')}<label>技能阶段<select name="stage">${scheduleStages.map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</select></label>${field('time','每日时间','09:00')}${field('timezone','时区','Asia/Shanghai')}${field('inputs','输入来源','knowledge',true)}${field('outputPath','输出目录','growth-workspace/artifacts')}<label>操作范围<select name="operation"><option value="draft">草稿</option><option value="plan">计划</option><option value="report">报告</option><option value="analysis">分析</option><option value="send">发送开发消息</option><option value="publish">发布内容</option><option value="ads">修改广告</option><option value="budget">修改预算</option></select></label><label>外部动作授权<select name="approved"><option value="no">未授权，停在待确认</option><option value="yes">已明确授权下述范围</option></select></label>${field('scope','授权范围')}${field('evidence','客户授权依据', '',true)}`,'schedule-create');
if(action==='schedule-copy'){const schedule=state.schedules.find(s=>s.id===id);navigator.clipboard.writeText(schedule.command).then(()=>toast('定时创建指令已复制，待宿主创建并核验')).catch(()=>modal('手动复制定时创建指令',`<pre class="prompt">${esc(schedule.command)}</pre>`));}
if(action==='schedule-pause')save('schedule-pause',{id}).catch(e=>toast(e.message));
if(action==='schedule-receipt'){
 const s=state.schedules.find(s=>s.id===id);
 form('登记外部宿主回执（待验证）',`<p>来源登记不会自动启用。当前原生核验接口不可用。</p>${field('hostTaskId','宿主任务编号',s.hostTaskId||'')}${field('source','回执来源')}${field('evidence','实际回执内容或证据路径','',true)}<label>动作<select name="receiptAction"><option value="create">创建</option><option value="pause" ${s.pauseRequested?'selected':''}>暂停</option></select></label>`,'schedule-receipt-form',{id});
}
if(['daily-ignore','daily-defer','daily-create'].includes(action))save(action,{id}).catch(e=>toast(e.message));
if(action==='avatar-reset')save('avatar',{avatar:''}).catch(e=>toast(e.message));
if(action==='backup-export'){api.request('/api/backup/snapshot',{headers:{'X-Workspace-Token':token}}).then(snapshot=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='workspace-snapshot-'+snapshot.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('本地快照已导出（含二进制产物），请妥善保存');}).catch(e=>toast(e.message));}
if(action==='backup-restore'){const file=$('#snapshot-file').files?.[0];if(!file){toast('请选择本客户的快照 JSON');return;}if(file.size>64000000){toast('快照过大，请使用本地 CLI 恢复');return;}file.text().then(text=>api.request('/api/backup/restore',{method:'POST',headers:{'X-Workspace-Token':token},body:JSON.stringify({snapshot:JSON.parse(text),revision:state.revision})})).then(result=>{modal('恢复结果',`<p>恢复新增文件：${result.restored.length}；冲突：${result.conflicts.length}</p><p>恢复前备份：${esc(result.backupPath)}</p>${result.conflicts.map(c=>`<p>本地保留：${esc(c.local)}<br>快照版本：${esc(c.incoming)}</p>`).join('')}<p>请在 WorkBuddy 比较双方内容后主动选择；当前文件未被冲突版本覆盖。</p>`);refresh();}).catch(e=>toast(e.message));}
if(action==='update-inspect'){api.request('/api/update/inspect').then(value=>{updateProtection=value.guidance+'\n代码目录：'+value.repository+'\n客户目录：'+state.projectRoot;modal('本地更新保护',`<p>${esc(value.guidance)}</p><p>代码目录：${esc(value.repository)}</p><p>Git状态：${value.gitAvailable?'已读取':'不可用，需要人工检查'}</p><div class="knowledge">${esc(value.modifiedFiles.join('\n')||'无Git修改记录')}</div><p>客户资料：${esc(value.customerPaths.join('、'))}<br>客户技能：${esc(value.customSkills.join('、')||'无')}</p>${button('复制更新保护指令','update-inspect-copy')}`);}).catch(e=>toast(e.message));}
if(action==='update-inspect-copy'){navigator.clipboard.writeText(updateProtection).then(()=>toast('更新保护指令已复制')).catch(()=>toast('请手动选中并复制保护说明'));}
if(action==='publisher-connect'){const target=$('#publisher-read-status');target.textContent='正在只读验证连接…';api.request('/api/publisher/connect').then(async c=>{if(!c.connected){target.textContent=c.error||'连接未通过验证';return;}const [channels,balance,media]=await Promise.all([api.request('/api/publisher/channels'),api.request('/api/publisher/balance'),api.request('/api/publisher/media')]);target.textContent=`已连接（${c.checkedAt}）；渠道 ${channels.channels.length}；余额 ${balance.balance}；可见媒体 ${media.media.length}`;}).catch(()=>{target.textContent='发布服务连接未通过验证';});}
if(action==='publisher-budget'){modal('积分上限',`<form id="publisher-budget-form"><label>单次最高积分<input name="maxCreditsPerPost" type="number" min="0" step="1" value="${esc(state.publisher?.maxCreditsPerPost||0)}"></label><label>每日最高积分<input name="maxCreditsPerDay" type="number" min="0" step="1" value="${esc(state.publisher?.maxCreditsPerDay||0)}"></label><p>0 禁止真实发布。</p><p class="error" role="alert"></p><button type="submit">保存</button></form>`);$('#publisher-budget-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const f=new FormData(e.target);await api.request('/api/publisher/config',{method:'POST',headers:{'X-Workspace-Token':token},body:JSON.stringify({revision:state.revision,config:{maxCreditsPerPost:Number(f.get('maxCreditsPerPost')),maxCreditsPerDay:Number(f.get('maxCreditsPerDay'))}})});$('#dialog').close();await refresh();}catch{e.target.querySelector('.error').textContent='私有配置保存失败，请刷新后重试';}finally{b.disabled=false;}};}
if(action==='check-update')checkUpdate();
if(action==='update-guide')modal('WorkBuddy 更新部署',`<div class="prompt">${esc(updatePrompt())}</div><p class="note">交给当前项目 WorkBuddy 执行；此页面不会直接更新代码。</p>`);
if(action==='install-skills'){save('install-skills',{}).catch(e=>toast(e.message));}
if(action==='toggle-skills'){expanded=!expanded;try{localStorage.setItem('yundian-ui-skills-expanded',String(expanded));}catch{}render();return;}
if(action==='nav'){navigate(id);[page,category='']=id.split('/');if(moduleForStage(page))expanded=true;render();$('#sidebar').classList.remove('open');if(page==='settings'&&!updateInfo)checkUpdate();}
if(action==='profile'){const p=state.profile;form('企业知识库与项目资料',`<div class="form-grid">${[['company','企业名称'],['products','产品 / 服务'],['markets','目标市场'],['persona','买家画像'],['goal','获客目标'],['brand','品牌与业务约束'],['source','资料来源 / 文件路径'],['projectRef','WorkBuddy 项目名称 / 链接'],['spaceRef','关联空间名称 / 链接']].map(([k,v])=>field(k,v,p[k]||'',k==='goal'||k==='source')).join('')}</div><p class="note">填写名称/链接不会自动关联云端空间；需在 WorkBuddy 中完成并验证。</p>`,'profile');}
if(action==='record'){form('保存阶段业务记录',field('name','记录名称')+field('source','真实来源URL / 文件 / 客户反馈')+field('cycleId','轮次ID','cycle-1')+(recordFields[page]||[]).map(([k,n])=>field(k,n,'',true)).join(''),'record',{stage:page});}
if(action==='record-task'){const r=state.records.find(x=>x.id===id);form('从业务记录创建技能任务',field('name','任务名称',r.name)+field('inputs','实际输入与上游资料',JSON.stringify(r,null,2),true)+field('instructions','具体工作步骤','读取对应技能，核对输入、证据与缺口，保存真实报告。',true)+field('acceptance','验收标准','来源可追溯，事实与假设分开，缺项明确，实际产物可读回。',true),'task',{stage:r.stage,cycleId:r.cycleId||'cycle-1'});}
if(action==='audit-new'){form('创建全量验收台账','<label>站点平台<select name="platform"><option value="shopify">Shopify · 38项</option><option value="wordpress">WordPress · 26项</option></select></label>','audit-create');}
if(action==='audit-item'){const [auditId,itemId]=id.split(':');const a=state.audits.find(x=>x.id===auditId);const i=a.items.find(x=>x.id===itemId);form(itemId+' '+i.title,`<p class="note">${esc(i.requirement)}</p><label>结果<select name="result">${['待验证','通过','未通过','不适用'].map(x=>`<option ${x===i.result?'selected':''}>${x}</option>`).join('')}</select></label>`+field('evidence','实际证据URL / 文件 / 测试记录',i.evidence?.join('；')||'',true)+field('reason','原因 / 不适用理由',i.reason||'',true)+field('owner','责任人',i.owner||'')+field('remediation','整改动作',i.remediation||'',true)+field('recheckDate','复查日期',i.recheckDate||''),'audit-item',{auditId,itemId});}
if(action==='new-task'||action==='service'){const stage=moduleForStage(id)?id:stages.some(x=>x[0]===page)?page:'market-research';form('定制获客任务',`${field('name','任务名称',action==='service'?id:'')}<label>获客阶段<select name="stage">${stages.flatMap(x=>x[0]==='seo-geo'&&moduleForStage(stage)==='seo-geo'?[x,['seo','SEO 专业技能'],['geo','GEO 专业技能']]:[x]).map(([k,n])=>`<option value="${k}" ${k===stage?'selected':''}>${n}</option>`).join('')}</select></label><label>技能版本<select name="skillOrigin"><option value="official">官方技能</option>${state.skills[stage]?.variants?.some(v=>v.origin==='customer')?'<option value="customer">客户定制（仅当前阶段存在时可用）</option>':''}</select></label>${field('cycleId','轮次标识','cycle-1')}${field('inputs','输入来源 / 上游产物',state.skills[stage]?.inputs?'待提供：'+state.skills[stage].inputs:'',true)}${field('instructions','工作步骤 / 所需工具',state.skills[stage]?.instructions||'',true)}${field('acceptance','验收规则',state.skills[stage]?.acceptance||'',true)}`,'task');const selector=root.querySelector('dialog select[name=stage]');selector.dataset.defaultStage=stage;selector.addEventListener('change',()=>{const before=state.skills[selector.dataset.defaultStage],after=state.skills[selector.value];const origin=root.querySelector('dialog [name=skillOrigin]');origin.innerHTML='<option value="official">官方技能</option>'+(after.variants?.some(v=>v.origin==='customer')?'<option value="customer">客户定制</option>':'');for(const [name,key] of [['inputs','inputs'],['instructions','instructions'],['acceptance','acceptance']]){const control=root.querySelector('dialog [name='+name+']');const previous=name==='inputs'?'待提供：'+before.inputs:before[key];if(control.value===previous)control.value=name==='inputs'?'待提供：'+after.inputs:after[key];}selector.dataset.defaultStage=selector.value;});}
if(action==='knowledge-confirm'){const k=state.knowledge.find(k=>k.id===id);form('客户确认知识内容',`<p>请核对来源与当前内容，保存后记录本次确认。</p><div class="knowledge">${esc(k.content)}</div>`,'knowledge-confirm',{path:k.path,contentHash:k.contentHash});}
if(action==='view-result'){const a=state.artifacts.find(a=>a.id===id);fetch('/api/artifacts/'+encodeURIComponent(id)+'/file').then(async r=>{if(!r.ok)throw Error('文件读取失败');const supported=/\.(md|txt|json|csv|tsv|html|xml|log)$/i.test(a.path);if(supported)modal('实际成果',`<div class="knowledge">${esc(await r.text())}</div>`);else modal('实际成果',`<p>${esc(a.path)}</p><a href="/api/artifacts/${encodeURIComponent(id)}/file" download>下载文件查看</a>`);}).catch(e=>toast(e.message));}
if(action==='review-result'){const a=state.artifacts.find(a=>a.id===id);form('客户验收当前成果',field('review','实际验收依据','',true)+'<label>验收决定<select name="decision"><option value="accepted">接受</option><option value="rejected">需整改</option></select></label>','review',{id:a.taskId,artifactId:a.id,contentHash:a.contentHash});}
if(action==='rerun'){const t=state.tasks.find(t=>t.id===id);form('创建新执行批次',field('name','任务名称',t.name)+field('cycleId','新批次名称',t.cycleId+'-next')+field('inputs','输入资料',t.inputs||'',true),'task',{stage:t.stage,skillOrigin:t.skillOrigin||'official',instructions:t.instructions,acceptance:t.acceptance});}
if(action==='result-knowledge'){const a=state.artifacts.find(a=>a.id===id);form('整理成果为待确认知识',field('title','知识标题',a.summary)+field('content','提取的企业事实（保存后需客户确认）','',true)+field('source','来源',a.path||a.url),'knowledge');}
if(action==='artifact-link'){const t=state.tasks.find(t=>t.id===id);form('登记未核验网站链接',field('url','HTTP / HTTPS 链接')+field('summary','成果摘要'),'receipt-link',{taskId:t.id,workspaceId:t.workspaceId||state.workspace.workspaceId,skillVersion:t.skillVersion||'legacy'});}
if(action==='knowledge-skill'){const instruction=`读取并调用 ${state.skills.knowledge.installedPath}，使用 yundian-growth-knowledge 技能。项目目录：${state.projectRoot}。整理 growth-workspace/knowledge/ 中的真实企业资料、来源、审核状态与缺口，保留原资料；优先使用当前本地知识库；客户需要外部资料时再关联ima或腾讯乐享并核验授权。没有工具时说明缺口，不伪造关联成功。实际更新知识文件和索引，然后刷新工作台。`;modal('企业知识库技能',`<div class="prompt">${esc(instruction)}</div><p class="note">在 WorkBuddy 当前项目执行。技能文件状态：${state.skills.knowledge.status==='installed'?'已安装，宿主加载待验证':'待安装或版本不同'}。</p>`);}
if(action==='knowledge')form('添加真实知识资料',field('title','资料标题')+field('content','实际资料内容','',true)+field('source','来源 URL / 文件路径'),'knowledge');
if(action==='feedback')form('记录真实销售反馈',`${field('leadId','稳定线索标识')}${field('source','获客渠道 / 上游产物')}${field('cycleId','轮次标识','cycle-1')}${field('result','实际联系 / 报价 / 成交结果')}${field('reason','有效或无效原因','',true)}${field('next','下一轮改进建议','',true)}`,'feedback');
if(action==='task'){const t=state.tasks.find(t=>t.id===id);modal(t.name,`<p>${esc(label(t.stage))} · ${esc(statuses[t.status])}</p><div class="prompt">${esc(prompt(t))}</div><p class="note">复制指令到 WorkBuddy 当前项目执行；这里不会模拟调用模型。WorkBuddy 执行后将实际产物回写到客户本地目录，再刷新查看。</p><div class="actions">${button('复制 WorkBuddy 指令','copy',id,true)}${button('保存实际产物','artifact',id)}${button('登记网站链接','artifact-link',id)}${(t.artifact)?button('查看产物','view-artifact',id):''}${t.artifact?button('记录验收','review',id):''}</div>`);}
if(action==='view-artifact')viewArtifact(id).catch(e=>toast(e.message));
if(action==='pdf')exportPdf(id).catch(e=>toast(e.message));
/* 页面内草稿相关 action（2026-10-06 定制，随主线 v0.15.0 移植） */
if(action==='copy'){navigator.clipboard.writeText(prompt(state.tasks.find(t=>t.id===id))).then(()=>toast('指令已复制，请在 WorkBuddy 当前项目执行')).catch(()=>toast('请手动选中并复制任务指令'));}
if(action==='artifact'){form('保存实际工作产物',field('content','产物内容（含来源与结果）','',true),'artifact',{id});}
if(action==='review'){const a=state.artifacts.find(a=>a.taskId===id&&a.path===('growth-workspace/artifacts/'+id+'.md').replaceAll('/',String.fromCharCode(92)))||state.artifacts.find(a=>a.taskId===id);form('记录客户验收',field('review','实际验收依据','',true),'review',{id,contentHash:a?.contentHash});}
});$('#close').onclick=()=>$('#dialog').close();$('#menu').onclick=()=>$('#sidebar').classList.toggle('open');$('#refresh').onclick=refresh;

async function checkUpdate(){try{const r=await fetch('/api/update');updateInfo=await r.json();if(!r.ok)throw Error(updateInfo.error);}catch(e){updateInfo={error:e.message};}if(page==='settings')render();}
function updatePrompt(){return `请在当前 WorkBuddy 项目更新云店+工作台，从 ${state.version} 更新到已检测的发布标签 ${updateInfo?.tag}。代码仓库：https://github.com/colaliang/yundian-ai-growth-workbench.git。客户数据目录：${state.projectRoot}。
先定位当前实际代码目录，读取规则和Git状态，核对新标签。备份工作台代码、客户growth-workspace和.codebuddy/skills及现有运行配置。不要读取或外传凭据。
在独立目录/分支获取新版本；对干净官方仓库先验证祖先关系再快进。存在本地提交或未提交改动时，先保存可恢复快照，在独立分支三方合并。不要reset --hard、强制覆盖或删除客户资料。
逐项比较技能，保留客户定制；已存在不同内容的技能不直接覆盖。非Git或缺少共同基线时，在独立目录验证新版本，仅迁移可明确识别的客户配置；无法判定的改动列出冲突并保留当前运行版本。
核查数据格式迁移，运行类型检查和回归测试，再切换并启动、读取客户数据验证。失败恢复原版本。已有本地版本高于目标时不要降级。只有客户已授权的代码更新可执行，无法安全合并时报告文件与原因，不宣称更新成功。最后报告旧/新版本、保留改动、备份位置和实际运行状态。`;}
root.addEventListener('change',e=>{if(e.target.id!=='avatar-file')return;const file=e.target.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>262144){toast('请选择256KB以内的PNG/JPEG/WebP图片');return;}const reader=new FileReader();reader.onload=()=>save('avatar',{avatar:reader.result}).catch(e=>toast(e.message));reader.readAsDataURL(file);});
[page,category='']=initialPage.split('/');if(moduleForStage(page))expanded=true;return {refresh,setPage(value){[page,category='']=value.split('/');if(moduleForStage(page))expanded=true;render();}};
}
