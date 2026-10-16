const busyControls=new WeakMap();
export function setFormBusy(form,busy){
 if(busy){if(busyControls.has(form))return;const controls=[...form.querySelectorAll('input,textarea,select,button')];busyControls.set(form,controls.map(control=>[control,control.disabled]));for(const control of controls)control.disabled=true;form.setAttribute('aria-busy','true');}
 else{for(const [control,disabled] of busyControls.get(form)||[])control.disabled=disabled;busyControls.delete(form);form.removeAttribute('aria-busy');}
}
export function showFeedback(host,message,tone='info'){if(!host)return;host.textContent=message;host.dataset.tone=tone;host.setAttribute('role',tone==='error'?'alert':'status');host.setAttribute('aria-live',tone==='error'?'assertive':'polite');}
export function failureMessage(error){const reason=error?.message||String(error);if(error?.ownerAuth||error?.status===401)return '登录已过期，请重新认证后核对并手动保存；输入已保留。'+reason;if(error?.status===409)return '版本冲突：项目已变化，请核对最新资料后再手动保存；输入已保留。'+reason;return '操作失败；输入已保留，请核对原因后手动重试。'+reason;}
