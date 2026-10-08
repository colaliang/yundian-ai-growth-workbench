import {contentHash} from './artifacts.ts';
export function knowledgeEntry(path:string,content:string,workspaceId:string,confirmation?:Record<string,any>){
 const hash=contentHash(content);
 return {id:contentHash(path).slice(0,32),workspaceId,path,title:content.split('\n')[0].replace(/^#+\s*/,''),content,contentHash:hash,sources:[...content.matchAll(/来源[：:]([^\n]+)/g)].map(m=>m[1].trim()),reviewStatus:confirmation?.contentHash===hash?'confirmed':'pending'};
}
