export function knowledgeView({state,heading,button,esc,setup}){
 return heading('企业知识库','保留来源与缺口；客户确认绑定当前内容，资料变化后需要重新确认。',button('添加知识资料','knowledge','',true)+button('编辑企业资料','profile')+button('知识整理指令','knowledge-skill'))+setup+state.knowledge.map(k=>`<section class="panel"><h2>${esc(k.title||k.path)}</h2><p>${esc(k.path)} · ${k.reviewStatus==='confirmed'?'客户已确认':'待客户确认'}</p><p>来源：${esc(k.sources?.join('；')||'待补来源')}</p><div class="knowledge">${esc(k.content)}</div>${k.reviewStatus==='confirmed'?'':button('确认当前内容','knowledge-confirm',k.id,true)}</section>`).join('');
}
