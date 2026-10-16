export function createNavigationGuard({location,history,route,setPage}){
 let committedHash=location.hash,committedPage=route(committedHash);
 function apply(hash){const next=route(hash);if(next===committedPage)return true;if(setPage(next)===false)return false;committedPage=next;committedHash=hash;return true;}
 return {navigate(id){const hash='#/'+id;if(!apply(hash))return false;location.hash='/'+id;return true;},hashChanged(){const hash=location.hash;if(hash===committedHash)return true;if(!apply(hash)){history.replaceState(history.state,'',committedHash||'#/'+committedPage);return false;}committedHash=hash;return true;}};
}
import {WORKBENCH_NAVIGATION} from './workbench-ui.js';
import {moduleForStage} from './modules.js';
import {mountLogin,mountReauthentication} from './views/login.js';
import {bootstrapOwner} from './auth-bootstrap.js';
export const navigation=WORKBENCH_NAVIGATION;
export function route(hash){const value=hash.replace(/^#\/?/,'');if(value==='experts')return 'skills';if(value==='seo'||value==='geo')return 'seo-geo/'+value;if(value==='artifacts')return value;const [id,category]=value.split('/');if(moduleForStage(id)===id&&(!category||['seo','geo'].includes(category)&&id==='seo-geo'))return value;return navigation.some(x=>x[0]===value)?value:'overview';}
export function mountApp(root){return boot(root).catch(()=>{const target=root.querySelector('#main')||root;target.textContent='自动重连未成功。请确认工作台已启动，然后刷新页面重试。';});}
async function boot(root){
 const {auth,loaded}=await bootstrapOwner({loadApp:attempt=>import('../app-v03.js?ownerBoot='+attempt),onProgress(at,total){const target=root.querySelector('#main')||root;target.textContent='正在连接工作台（'+at+'/'+total+'），服务唤醒可能需要十几秒…';}});
 if(!auth.allowed){mountLogin(root,auth);return;}
 let guard;
 const app=loaded.mountLegacy(root,{navigation,initialPage:route(location.hash),navigate(id){return guard.navigate(id);}});
 guard=createNavigationGuard({location,history,route,setPage:value=>app.setPage(value)});
 window.addEventListener('hashchange',()=>guard.hashChanged());
 window.addEventListener('owner-login-required',()=>mountReauthentication(root,{onAuthenticated:()=>app.reauthenticate()}));
 await app.refresh();
 if(auth.publicMode){const logout=document.createElement('button');logout.textContent='退出登录';logout.id='owner-logout';logout.onclick=async()=>{const {api}=await import('./api.js');try{const state=await api.request('/api/state?crm=summary');const {logoutOwner}=await import('./views/login.js');await logoutOwner(state.token);}catch{}};(root.querySelector('header')||root).append(logout);}
}
if(typeof document!=='undefined')void mountApp(document.body);



