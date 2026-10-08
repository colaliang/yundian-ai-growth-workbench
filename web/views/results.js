import {safeWebUrl as safeResultUrl} from '../safe-url.js';
function metadataText(value,fallback){
 if(value==null)return fallback;
 if(typeof value==='string')return value+'（历史字段格式待修正）';
 if(!Array.isArray(value))return fallback+'（历史字段格式待修正）';
 const strings=value.filter(item=>typeof item==='string');
 return (strings.join('；')||fallback)+(strings.length===value.length?'':'（历史字段格式待修正）');
}
export function resultsView({state,heading,button,esc}){
 const rows=state.artifacts||[];
 return heading('成果中心','每个批次保留来源、缺口与验收；手动保存和网站链接标记未核验。')+`<section class="panel">${rows.map(a=>{const t=state.tasks.find(t=>t.id===a.taskId);const reviews=(state.reviews||[]).filter(r=>r.artifactId===a.id);return `<div class="row result-row"><div><h3>${esc(a.summary||t?.name||a.id)}</h3><p>${esc(a.module)} · ${esc(a.skillVersion)} · 批次 ${esc(t?.cycleId||'历史')}<br>任务 ${esc(a.taskId)}</p><p>输入快照：${esc(a.inputSnapshotRef||'历史记录未提供')}<br>执行来源：${esc(a.executor||'未知')} · ${esc(a.executedAt||'未核验执行时间')}<br>${a.verification==='verified'?'文件已核验':'未核验'} · ${esc(a.path||a.url)}${a.error?'<br>'+esc(a.error):''}</p><p>来源：${esc(metadataText(a.sources,'待补'))}<br>缺口：${esc(metadataText(a.gaps,'未记录'))}<br>下一步：${esc(metadataText(a.nextSteps,'待定'))}</p>${reviews.map(r=>`<p>验收：${r.valid?(r.decision==='accepted'?'已接受':'需整改'):'已失效（内容变化）'} · ${esc(r.evidence)}</p>`).join('')}</div><div class="actions">${a.path&&a.contentHash?button('查看成果','view-result',a.id,true)+`<a href="/api/artifacts/${encodeURIComponent(a.id)}/file" download>下载实际文件</a>`:''}${a.url&&safeResultUrl(a.url)?`<a href="${esc(a.url)}" target="_blank" rel="noopener">网站链接 ↗</a>`:''}${a.contentHash?button('记录验收','review-result',a.id):''}${button('重新执行新批次','rerun',a.taskId)}${button('整理为知识资料','result-knowledge',a.id)}</div></div>`;}).join('')||'<div class="empty">暂无成果。执行真实任务后回写文件，或手动保存内容与网站链接。</div>'}</section>`;
}
