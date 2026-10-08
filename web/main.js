import {mountLegacy} from '../app-v03.js';
export const navigation=[['overview','工作台'],['knowledge','企业知识库'],['skills','获客技能'],['artifacts','成果中心'],['schedules','定时任务'],['experts','专家与陪跑'],['settings','设置']];
const stages=['market-research','product-opportunity','site-and-content','seo-geo','content-operations','acquisition','buyer-check','sales-feedback','next-cycle','seo','geo','social-media','facebook-ads','google-ads','email-outreach'];
export function route(hash){const value=hash.replace(/^#\/?/,'');return [...navigation.map(x=>x[0]),...stages].includes(value)?value:'overview';}
export function mountApp(root){const initialPage=route(location.hash);const app=mountLegacy(root,{navigation,initialPage,navigate(id){location.hash='/'+id;}});window.addEventListener('hashchange',()=>app.setPage(route(location.hash)));void app.refresh();}
if(typeof document!=='undefined')mountApp(document.body);
