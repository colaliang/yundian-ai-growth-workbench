import {moduleForStage} from '../modules.js';
export function skillProgress(state,stage){
 const tasks=(state.tasks||[]).filter(t=>t.stage===stage).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),task=tasks.at(-1);
 if(!task)return {task:null,result:'待 WorkBuddy 执行',acceptance:'尚无当前成果可验收',next:'准备输入资料，创建任务后在 WorkBuddy 执行。',artifacts:[]};
 const artifacts=(state.artifacts||[]).filter(a=>a.taskId===task.id),receipt=task.executionReceipt,actual=receipt&&receipt.executor!=='manual';
 const latest=a=>(state.reviews||[]).filter(r=>r.artifactId===a.id).sort((a,b)=>(a.sequence||0)-(b.sequence||0)||String(a.reviewedAt).localeCompare(String(b.reviewedAt))).at(-1);
 const accepted=artifacts.length>0&&artifacts.every(a=>{const r=latest(a);return a.contentHash&&r?.valid&&r.decision==='accepted';});
 let result=!receipt?'待 WorkBuddy 执行':!actual?'人工登记，待核对执行来源':receipt.status==='running'?'已有执行中回执':receipt.status==='failed'?'执行失败，请核对原因':receipt.status==='needs-input'?'回执提示缺少输入':receipt.status==='cancelled'?'执行已取消':artifacts.length?'成果已登记，请核对实际文件与来源':'回执暂无成果';
 const acceptance=accepted?'当前成果已按内容验收':artifacts.length?'当前成果待验收或需整改':'尚无当前成果可验收';
 const nextSteps=artifacts.flatMap(a=>Array.isArray(a.nextSteps)?a.nextSteps:[]).filter(x=>typeof x==='string'&&x.trim());
 return {task,result,acceptance,artifacts,next:nextSteps.length?nextSteps.join('；'):accepted?'依据已验收成果创建下一项任务。':artifacts.length?'打开成果核对当前内容，再记录验收。':actual?'核对当前回执；补齐输入或在 WorkBuddy 继续执行。':'复制任务指令，在 WorkBuddy 当前项目执行并回写实际回执。'};
}
export function skillsView({state,heading,button,esc,moduleId}){
 return heading('营销推广','浏览真实技能，选择版本后创建 WorkBuddy 任务。',button('安装项目技能','install-skills','',true))+Object.entries(state.skills).filter(([stage])=>!moduleId||moduleForStage(stage)===moduleId).map(([stage,skill])=>{const progress=skillProgress(state,stage);return `<section class="panel"><h2>${esc(skill.title)}</h2><p>用途与步骤：${esc(skill.instructions)}</p><p>1. 输入准备：${esc(skill.inputs)}</p><p>2. 执行指令：${esc(progress.task?.instructions||'创建任务后复制指令，在 WorkBuddy 执行。')}</p><p>3. 成果：${esc(progress.result)}<br>预期输出：${esc(skill.outputs)}</p><p>4. 验收：${esc(progress.acceptance)}<br>标准：${esc(skill.acceptance)}</p><p>5. 下一步：${esc(progress.next)}</p>${progress.task?`<p>当前任务：${esc(progress.task.name)}${progress.task.executionReceipt?`；回执：${esc(progress.task.executionReceipt.receiptId)}；执行来源：${esc(progress.task.executionReceipt.executor)}`:''}</p>${button('查看任务指令','task',progress.task.id)}${progress.artifacts.map(a=>a.contentHash?button('查看当前成果','view-result',a.id)+button('记录验收','review-result',a.id):'').join('')}`:''}${(skill.variants||[]).map(v=>`<p>${v.origin==='official'?'官方':'客户定制'} · ${esc(v.version)} · ${esc(v.status)}<br><span class="note">${esc(v.entry)}</span></p>`).join('')}<p>历史任务：${state.tasks.filter(t=>t.stage===stage).length}</p>${stage==='knowledge'?button('知识整理指令','knowledge-skill','',true):button('创建任务','new-task',stage,true)}</section>`;}).join('');
}
