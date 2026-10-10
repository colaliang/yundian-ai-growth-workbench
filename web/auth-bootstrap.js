// Auth bootstrap must recover before the legacy state loader can start.
const RETRY_DELAYS=[0,800,2000,4000,4000,4000,4000,4000,4000,4000];
async function ownerDecision(fetchFn){
 const response=await fetchFn('/api/auth/status',{cache:'no-store',headers:{Accept:'application/json'}});
 const text=await response.text();let value=null;
 try{value=text.trim()?JSON.parse(text):null;}catch{}
 // An actual auth denial is terminal, including an empty gateway 401 body.
 if(response.status===401)return {allowed:false,loginRequired:!value?.setupRequired,setupRequired:!!value?.setupRequired};
 if(!response.ok)throw Error('工作台正在唤醒（HTTP '+response.status+'）');
 if(!value||typeof value.allowed!=='boolean')throw Error('认证服务返回了空内容或无效响应');
 if(!value.allowed&&!value.loginRequired&&!value.setupRequired)throw Error('认证状态无效');
 return value;
}
export async function bootstrapOwner({fetchFn=fetch,loadApp,onProgress=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delays=RETRY_DELAYS}={}){
 let last;
 for(let i=0;i<delays.length;i++){
  onProgress(i+1,delays.length,last);
  if(delays[i])await wait(delays[i]);
  try{const auth=await ownerDecision(fetchFn);if(!auth.allowed)return {auth,loaded:null};const loaded=await loadApp(i+1);return {auth,loaded};}catch(error){last=error;}
 }
 throw last||Error('无法连接工作台');
}

