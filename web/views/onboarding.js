const facts=['company','products','markets','persona','goal'];
export function onboardingState(state){
 const missing=facts.filter(key=>!String(state.profile?.[key]||'').trim());
 const project=state.projectRoot&&state.workspace?.workspaceId?'ready':'missing';
 const confirmed=(state.knowledge||[]).some(k=>k.contentHash&&k.reviewStatus==='confirmed'&&/knowledge/i.test(k.path||'')&&(!k.confirmation||k.confirmation.contentHash===k.contentHash));
 if(!confirmed)missing.push('confirmedKnowledge');if(project==='missing')missing.push('project');
 const tasks=state.tasks||[],firstTask=tasks.some(t=>t.status==='needs-review')?'needs-review':tasks.length?'created':'ready';
 return {project,facts:missing.some(k=>k!=='project')?'missing':'ready',firstTask,missing};
}
export function onboardingView({state,button,esc}){const ready=onboardingState(state);return `<section class="panel onboarding" aria-label="首次使用三步"><h2>开始获客前的三步</h2><ol><li><strong>1 · 当前客户项目</strong><p>${ready.project==='ready'?'已读取当前客户的独立项目':'尚未读取实际项目，请检查项目目录与登录状态。填写项目引用不会连接项目。'}</p>${button('查看项目与设置','nav','settings')}</li><li><strong>2 · 企业事实与知识</strong><p>${ready.facts==='ready'?'五项企业事实与当前知识确认已准备':'待补：'+ready.missing.filter(k=>k!=='project').map(k=>({company:'企业名称',products:'产品',markets:'目标市场',persona:'买家画像',goal:'获客目标',confirmedKnowledge:'当前知识确认'}[k])).join('、')+'。资料保存在当前客户项目的企业知识库。'}</p>${button('整理企业知识','nav','knowledge')}</li><li><strong>3 · 创建第一项任务</strong><p>${ready.firstTask==='needs-review'?'已有产物等待客户核对与验收':ready.firstTask==='created'?'任务已创建；复制指令后在 WorkBuddy 执行，等待真实回执':'资料准备后创建任务，并复制指令到 WorkBuddy 当前项目。'}</p>${button('创建获客任务','new-task','market-research')}</li></ol><p class="note">安装文件、创建任务和复制指令均不表示宿主已执行或客户已验收。</p></section>`;}
