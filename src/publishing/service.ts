import {runWorkspaceMutation,readWorkspaceSnapshot} from '../runtime/workspace.ts';
import type {WriteOptions} from '../storage/transaction.ts';
import crypto from 'node:crypto';
import path from 'node:path';
import {WorkspaceStore} from '../storage/workspace-store.ts';
import {ContentService,normalizeContent} from '../content/service.ts';
import type {ContentInput,ContentStatus} from '../content/contracts.ts';
import type {PublisherPort,ChannelResult,RemotePostInput} from './contracts.ts';
import {requirePublisherBudget} from './secrets.ts';
import type {PublisherSecrets} from './secrets.ts';
export interface PublishConfirmation {entityVersion?:number;id:string;workspaceId:string;itemId:string;contentHash:string;channelIds:string[];mode:'immediate'|'scheduled';plannedAt:string|null;maxCredits:number;balance:number;expiresAt:string;accountFingerprint:string;acknowledgedAttemptIds:string[];approvedContent?:Required<ContentInput>}
export interface PublishAttempt {entityVersion?:number;id:string;workspaceId:string;itemId:string;confirmationId:string;contentHash:string;channelIds:string[];mode:'immediate'|'scheduled';plannedAt:string|null;budgetDay:string;maxCredits:number;reservedCredits:number;actualCredits:null;idempotencyKey:string;status:ContentStatus;phase:'creating'|'publishing'|'settled';postId:string|null;scheduledAt:string|null;results:ChannelResult[];createdAt:string;updatedAt:string;error:string|null;approvedContent?:Required<ContentInput>;submittedPayload?:RemotePostInput}
const queues=new Map<string,Promise<unknown>>();
const fingerprint=(key:string|null)=>crypto.createHash('sha256').update(key??'').digest('hex');
const uuid=()=>crypto.randomUUID().replaceAll('-','');
export {validatePublishingRecord} from './validation.ts';
import {validatePublishingRecord,validateRemotePost,validateRemoteResults,scheduledEvidence,quotaTimezone} from './validation.ts';
const date=(v:any)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export class PublicationService {
 store:WorkspaceStore;content:ContentService;current:()=>{publisher:PublisherPort;secrets:PublisherSecrets};
 constructor(store:WorkspaceStore,current:()=>{publisher:PublisherPort;secrets:PublisherSecrets}){this.store=store;this.content=new ContentService(store);this.current=current;}
 private queued<T>(fn:()=>Promise<T>):Promise<T>{const key=this.store.root.toLowerCase(),before=queues.get(key)||Promise.resolve();const next=before.catch(()=>{}).then(fn);queues.set(key,next);return next;}
 private rows(family:string):any[]{return this.store.files(family,'.json').map(f=>validatePublishingRecord(this.store.json(f),this.content.workspaceId,family));}
 listAttempts():PublishAttempt[]{return this.rows('publish-attempts').map((a:PublishAttempt)=>({...a,...(a.phase!=='settled'?{status:'unknown' as const}:{})}));}
 private save(a:PublishAttempt){validatePublishingRecord(a,this.content.workspaceId,'publish-attempts');a.updatedAt=new Date().toISOString();this.store.put(path.join(this.store.base,'publish-attempts',a.id+'.json'),a);const item=this.content.get(a.itemId);this.content.write({...item,...(item.contentHash===a.contentHash?{status:a.status,publisherPostId:a.postId??item.publisherPostId}:{}),publishAttemptIds:[...new Set([...item.publishAttemptIds,a.id])],contentRevision:item.contentRevision+1,updatedAt:a.updatedAt});return a;}
 private approved(itemId:string){const item=this.content.get(itemId);if(item.archivedAt||item.reviewStatus!=='approved'||item.approvedHash!==item.contentHash)throw Error('Content must have current approval');return item;}
 private async targets(p:PublisherPort,ids:string[],mediaIds:string[]){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Invalid channels');const channels=await p.listChannels();if(ids.some(id=>!channels.some(c=>c.id===id&&c.isActive)))throw Error('Channel unavailable');const media=await p.listMedia();if(mediaIds.some(id=>!media.some(m=>m.id===id)))throw Error('Media unavailable');const selected=channels.filter(c=>ids.includes(c.id));if(selected.some(c=>['instagram','pinterest'].includes(c.platform.toLowerCase()))&&!mediaIds.length)throw Error('Media required');if(selected.some(c=>c.platform.toLowerCase()==='tiktok')&&!media.some(m=>mediaIds.includes(m.id)&&m.mimeType.startsWith('video/')))throw Error('Actual remote video required');}
 private budget(secrets:PublisherSecrets,count:number,day:string,balance:number){requirePublisherBudget(secrets,count);const rows=this.listAttempts(),dayUsed=rows.filter(a=>a.budgetDay===day).reduce((n,a)=>n+a.reservedCredits,0),allReserved=rows.reduce((n,a)=>n+a.reservedCredits,0);if(dayUsed+count>secrets.maxCreditsPerDay)throw Error('Daily credit limit exceeded');if(allReserved+count>balance)throw Error('Available credit balance exceeded');}
 private day(at:string,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
 private read<T>(work:()=>T|Promise<T>):Promise<T>{return readWorkspaceSnapshot(this.store.root,work);}
 private mutate<T>(work:()=>T|Promise<T>,options:WriteOptions={}):Promise<T>{return runWorkspaceMutation(this.store.root,options,work);}
 private persist(a:PublishAttempt,patch:Partial<PublishAttempt>):Promise<PublishAttempt>{return this.mutate(()=>{const current=this.rows('publish-attempts').find(x=>x.id===a.id);if(!current||current.idempotencyKey!==a.idempotencyKey)throw Error('Attempt changed');if((current.entityVersion??0)!==(a.entityVersion??0))return current as PublishAttempt;return this.save({...current,...patch});});}
 async preparePublish(itemId:string,input:{channelIds:string[];mode:'immediate'|'scheduled';plannedAt:string|null;acknowledgedAttemptIds?:string[]},options:WriteOptions={}):Promise<PublishConfirmation>{return this.queued(async()=>{
  const item=await this.read(()=>this.approved(itemId)),{publisher,secrets}=this.current();
  if(!['immediate','scheduled'].includes(input.mode)||input.mode==='immediate'&&input.plannedAt!==null||input.mode==='scheduled'&&(!input.plannedAt||!date(input.plannedAt)||Date.parse(input.plannedAt)<=Date.now()))throw Error('Invalid publishing schedule');
  if(input.channelIds.some(id=>!item.channelIds.includes(id)))throw Error('Channel not selected in approved content');
  await this.targets(publisher,input.channelIds,item.remoteMediaIds);const {balance}=await publisher.getBalance();
  return this.mutate(()=>{const fresh=this.current(),current=this.approved(itemId);if(fresh.secrets.apiKey!==secrets.apiKey||current.contentHash!==item.contentHash)throw Error('Confirmation context changed');
   if(input.mode==='scheduled'&&Date.parse(input.plannedAt!)<=Date.now())throw Error('Invalid publishing schedule');
   const ack=input.acknowledgedAttemptIds??[],old=this.listAttempts().filter(a=>a.itemId===itemId&&a.mode==='scheduled'&&a.postId&&a.status!=='failed');if(old.some(a=>!ack.includes(a.id)))throw Error('Acknowledge existing remote scheduled attempts');
   this.budget(fresh.secrets,input.channelIds.length,this.day(input.plannedAt??new Date().toISOString(),quotaTimezone),balance);
   const c:PublishConfirmation={id:uuid(),workspaceId:this.content.workspaceId,itemId,contentHash:item.contentHash,channelIds:[...input.channelIds],mode:input.mode,plannedAt:input.plannedAt,maxCredits:input.channelIds.length,balance,expiresAt:new Date(Date.now()+600000).toISOString(),accountFingerprint:fingerprint(secrets.apiKey),acknowledgedAttemptIds:[...ack],approvedContent:structuredClone(normalizeContent(item))};this.store.put(path.join(this.store.base,'publish-confirmations',c.id+'.json'),c);return c;
  },options);
 });}
 async submitPublish(itemId:string,confirmationId:string,options:WriteOptions={}):Promise<PublishAttempt>{return this.queued(async()=>{
  const pre=await this.read(()=>{const existing=this.listAttempts().find(a=>a.confirmationId===confirmationId&&a.itemId===itemId);if(existing)return {existing};const c=this.rows('publish-confirmations').find(c=>c.id===confirmationId&&c.itemId===itemId);if(!c||Date.parse(c.expiresAt)<=Date.now())throw Error('Confirmation expired or unavailable');return {c,item:this.approved(itemId)};});
  if(pre.existing)return pre.existing;const {c,item}=pre,{publisher,secrets}=this.current();
  if(fingerprint(secrets.apiKey)!==c.accountFingerprint)throw Error('Publisher configuration changed');await this.targets(publisher,c.channelIds,item!.remoteMediaIds);const {balance}=await publisher.getBalance();
  const reservation=await this.mutate(()=>{
   const existing=this.listAttempts().find(a=>a.confirmationId===confirmationId&&a.itemId===itemId);if(existing)return {a:existing,created:false};
   const latest=this.current(),current=this.approved(itemId);if(latest.secrets.apiKey!==secrets.apiKey)throw Error('Publisher configuration changed');if(current.contentHash!==c.contentHash)throw Error('Confirmed content changed');if(Date.parse(c.expiresAt)<=Date.now())throw Error('Confirmation expired');if(c.mode==='scheduled'&&Date.parse(c.plannedAt!)<=Date.now())throw Error('Invalid publishing schedule');
   const rows=this.listAttempts();if(rows.some(a=>a.itemId===itemId&&a.mode==='scheduled'&&a.postId&&a.status!=='failed'&&!c.acknowledgedAttemptIds.includes(a.id)))throw Error('Acknowledge existing remote scheduled attempts');
   const prior=rows.filter(a=>a.itemId===itemId&&a.contentHash===c.contentHash);if(c.channelIds.some((id:string)=>prior.some(a=>a.channelIds.includes(id)&&!(a.phase==='settled'&&a.results.find(r=>r.channelId===id)?.status==='failed'&&!a.results.find(r=>r.channelId===id)?.pending))))throw Error('Channel already submitted or unresolved');
   const day=this.day(c.plannedAt??new Date().toISOString(),quotaTimezone);this.budget(latest.secrets,c.maxCredits,day,balance);
   const approvedContent=structuredClone(c.approvedContent??normalizeContent(current)),submittedPayload:RemotePostInput={content:approvedContent.text,channelIds:[...c.channelIds],mediaIds:[...approvedContent.remoteMediaIds],...(c.mode==='scheduled'?{scheduledAt:c.plannedAt!}:{})};
   const a:PublishAttempt={approvedContent,submittedPayload:structuredClone(submittedPayload),id:uuid(),workspaceId:this.content.workspaceId,itemId,confirmationId,contentHash:c.contentHash,channelIds:[...c.channelIds],mode:c.mode,plannedAt:c.plannedAt,budgetDay:day,maxCredits:c.maxCredits,reservedCredits:c.maxCredits,actualCredits:null,idempotencyKey:crypto.createHash('sha256').update(JSON.stringify([this.content.workspaceId,c.contentHash,c.channelIds.slice().sort(),c.mode,c.plannedAt,c.id])).digest('hex'),status:'publishing',phase:'creating',postId:null,scheduledAt:null,results:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),error:null};return {a:this.save(a),created:true};
  },options);
  let a=reservation.a;if(!reservation.created)return a;
  try{
   const post=await publisher.createPost(structuredClone(a.submittedPayload!));validateRemotePost(post,c.channelIds);
   if(c.mode==='scheduled')return this.persist(a,{postId:post.id,scheduledAt:post.scheduledAt,results:post.postChannels,status:scheduledEvidence(post,c.channelIds,c.plannedAt)?'scheduled':'unknown',phase:'settled'});
   a=await this.persist(a,{postId:post.id,scheduledAt:post.scheduledAt,phase:'publishing'});if(a.phase==='settled')return a;
   const fresh=await this.read(()=>{const current=this.current();if(Date.parse(c.expiresAt)<=Date.now())throw Error('Confirmation expired');if(current.secrets.apiKey!==secrets.apiKey)throw Error('Publisher configuration changed');requirePublisherBudget(current.secrets,c.maxCredits);if(this.listAttempts().filter(x=>x.budgetDay===a.budgetDay).reduce((n,x)=>n+x.reservedCredits,0)>current.secrets.maxCreditsPerDay)throw Error('Daily credit limit changed');if(this.approved(itemId).contentHash!==c.contentHash)throw Error('Confirmed content changed');return current;});
   const result=await fresh.publisher.publishPost(a.postId!);if(result.postId!==a.postId)throw Error('Post mismatch');validateRemoteResults(result.results,a.channelIds);return this.persist(a,{results:result.results,phase:'settled',status:this.status({...a,results:result.results})});
  }catch{return this.persist(a,{status:'unknown',error:'Remote result unresolved; refresh only, no automatic resend'});}
 });}
 private status(a:PublishAttempt):ContentStatus{const selected=a.channelIds.map(id=>a.results.find(r=>r.channelId===id));const success=selected.filter(r=>r?.status==='published'&&!r.pending).length;if(success===selected.length)return 'published';if(success)return 'partial';if(selected.every(r=>r?.status==='failed'&&!r.pending))return 'failed';if(selected.some(r=>r?.pending||['processing','publishing'].includes(r?.status??'')))return 'publishing';return 'unknown';}
 async refreshAttempt(id:string,options:WriteOptions={}):Promise<PublishAttempt>{return this.queued(async()=>{
  const data=await this.read(()=>{const a=this.listAttempts().find(a=>a.id===id);if(!a)throw Error('Attempt unavailable');return {a,c:this.rows('publish-confirmations').find(c=>c.id===a.confirmationId)};});const {a,c}=data;if(!a.postId)return a;
  let patch:Partial<PublishAttempt>;try{const before=this.current();if(!c||fingerprint(before.secrets.apiKey)!==c.accountFingerprint)throw Error('Publisher account changed');const post=await before.publisher.getPost(a.postId);if(fingerprint(this.current().secrets.apiKey)!==c.accountFingerprint)throw Error('Publisher account changed');validateRemotePost(post,a.channelIds);if(post.id!==a.postId)throw Error('Post mismatch');patch={results:post.postChannels,scheduledAt:post.scheduledAt,status:a.mode==='scheduled'&&scheduledEvidence(post,a.channelIds,a.plannedAt)?'scheduled':this.status({...a,results:post.postChannels}),phase:'settled',error:null};}catch{patch={status:'unknown',error:'Remote lookup unresolved'};}return this.persist(a,patch);
 });}
}
