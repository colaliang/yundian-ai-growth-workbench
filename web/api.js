/* 云店+ 定制 2026-10-08（主线文件，拉取新版本后需确认本段是否保留）：
   1) 仅在有请求体时声明 Content-Type: application/json；GET 不带该头
   2) 先取文本判空再解析：空响应体给可读错误，避免抛 "Unexpected end of JSON input"
   3) 非 JSON 内容（如网关拦截页）一并给出可读错误 */
export const api={async request(path,options={}){const hasBody=options.body!=null;const headers=hasBody?{'Content-Type':'application/json',...options.headers}:{Accept:'application/json',...options.headers};const response=await fetch(path,{cache:'no-store',...options,headers});const text=await response.text();if(!text.trim())throw Error('服务端返回了空响应体（HTTP '+response.status+'）');let value;try{value=JSON.parse(text);}catch{throw Error('服务端返回了非 JSON 内容：'+text.slice(0,60));}if(response.status===401){window.dispatchEvent(new CustomEvent('owner-login-required'));const error=Error(value.error||'Owner login required');error.ownerAuth=true;throw error;}if(!response.ok)throw Error((value&&value.error)||'请求失败');return value;}};
