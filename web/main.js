import {moduleForStage} from './modules.js';
import {mountLogin} from './views/login.js';
import {bootstrapOwner} from './auth-bootstrap.js';
export const navigation=[['overview','工作台'],['crm','客户 CRM'],['knowledge','企业知识库'],['skills','获客技能'],['schedules','定时任务'],['settings','设置']];
export function route(hash){const value=hash.replace(/^#\/?/,'');if(value==='experts')return 'skills';if(value==='seo'||value==='geo')return 'seo-geo/'+value;if(value==='artifacts')return value;const [id,category]=value.split('/');if(moduleForStage(id)===id&&(!category||['seo','geo'].includes(category)&&id==='seo-geo'))return value;return navigation.some(x=>x[0]===value)?value:'overview';}
export function mountApp(root){return boot(root).catch(()=>{const target=root.querySelector('#main')||root;target.textContent='自动重连未成功。请确认工作台已启动，然后刷新页面重试。';});}
async function boot(root){
 const {auth,loaded}=await bootstrapOwner({loadApp:attempt=>import('../app-v03.js?ownerBoot='+attempt),onProgress(at,total){const target=root.querySelector('#main')||root;target.textContent='正在连接工作台（'+at+'/'+total+'），服务唤醒可能需要十几秒…';}});
 if(!auth.allowed){mountLogin(root,auth);return;}
 const app=loaded.mountLegacy(root,{navigation,initialPage:route(location.hash),navigate(id){location.hash='/'+id;}});
 window.addEventListener('hashchange',()=>app.setPage(route(location.hash)));
 window.addEventListener('owner-login-required',event=>mountLogin(root,{loginRequired:true,...event.detail}));
 await app.refresh();
 if(auth.publicMode){const logout=document.createElement('button');logout.textContent='退出登录';logout.id='owner-logout';logout.onclick=async()=>{const {api}=await import('./api.js');try{const state=await api.request('/api/state');const {logoutOwner}=await import('./views/login.js');await logoutOwner(state.token);}catch{}};(root.querySelector('header')||root).append(logout);}
}
if(typeof document!=='undefined')void mountApp(document.body);
