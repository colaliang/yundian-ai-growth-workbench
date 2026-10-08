export const safeWebUrl=value=>{if(typeof value!=='string')return false;try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
