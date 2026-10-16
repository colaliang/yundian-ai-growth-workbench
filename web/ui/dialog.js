const focusable='button,input,textarea,select,a[href],[tabindex]:not([tabindex="-1"])';
export function bindDialogBehavior(element,{requestClose,restoreFocus,hasUnsavedChanges=()=>false}){
 const origin=restoreFocus||element.ownerDocument.activeElement;let disposed=false;
 const identity=origin?.getAttribute?['id','data-crm','data-action','data-id','data-cp','name'].map(key=>[key,origin.getAttribute(key)]).filter(([,value])=>value!==null):[];
 const returnFocus=()=>{if(origin?.isConnected){origin.focus();return;}if(!identity.length)return;const candidate=[...element.ownerDocument.querySelectorAll('button,input,textarea,select,a[href]')].find(node=>identity.every(([key,value])=>node.getAttribute(key)===value));candidate?.focus();};
 const controls=()=>[...element.querySelectorAll(focusable)].filter(e=>!e.disabled&&!e.hidden&&e.getClientRects().length);
 const close=event=>{event?.preventDefault();if(element.querySelector('[aria-busy="true"]'))return;if(hasUnsavedChanges()&&!element.ownerDocument.defaultView.confirm('关闭并放弃当前未保存输入？'))return;requestClose();returnFocus();};
 const key=event=>{if(event.key==='Escape'){event.stopPropagation();close(event);}if(event.key==='Tab'){const items=controls();if(!items.length){event.preventDefault();element.focus();return;}const first=items[0],last=items.at(-1),active=element.ownerDocument.activeElement;if(event.shiftKey&&(active===first||!element.contains(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!element.contains(active))){event.preventDefault();first.focus();}}};
 const cancel=event=>close(event);
 const click=event=>{if(event.target.closest('[data-dialog-close]'))close(event);};
 const nativeClose=()=>{returnFocus();};
 element.addEventListener('keydown',key);element.addEventListener('cancel',cancel);element.addEventListener('click',click);element.addEventListener('close',nativeClose);
 element.setAttribute('tabindex','-1');if(element.tagName!=='DIALOG'){element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');}
 queueMicrotask(()=>{if(!disposed&&!element.hidden)(controls()[0]||element).focus();});
 return ()=>{disposed=true;element.removeEventListener('keydown',key);element.removeEventListener('cancel',cancel);element.removeEventListener('click',click);element.removeEventListener('close',nativeClose);};
}
export function formSnapshot(form){return JSON.stringify([...form.elements].filter(e=>e.name).map(e=>[e.name,e.value,e.checked]));}
