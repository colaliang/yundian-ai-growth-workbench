import {readInstanceConfig,writeInstanceConfig} from '../runtime/instance.ts';
import type {InstanceContext} from '../domain/contracts.ts';
import type {AuthDecision} from '../auth/owner.ts';
export interface PublisherSecrets {apiKey:string|null;maxCreditsPerPost:number;maxCreditsPerDay:number}
const budget=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:0;
export function loadPublisherSecrets(ctx:InstanceContext):PublisherSecrets {const value=readInstanceConfig(ctx,'publisher');if(value.apiKey!=null&&typeof value.apiKey!=='string')throw Error('Invalid private publisher configuration');return {apiKey:process.env.WORKBENCH_PUBLISHER_API_KEY||value.apiKey||null,maxCreditsPerPost:budget(value.maxCreditsPerPost),maxCreditsPerDay:budget(value.maxCreditsPerDay)};}
export function publisherMetadata(value:PublisherSecrets){return {configured:Boolean(value.apiKey),masked:value.apiKey?'********':null,maxCreditsPerPost:value.maxCreditsPerPost,maxCreditsPerDay:value.maxCreditsPerDay};}
export function savePublisherSecrets(ctx:InstanceContext,value:PublisherSecrets,auth:AuthDecision):void {if(!auth.allowed)throw Error('Owner login required');if(value.apiKey!==null&&(typeof value.apiKey!=='string'||value.apiKey.length>4096))throw Error('Invalid publisher credentials');if(budget(value.maxCreditsPerPost)!==value.maxCreditsPerPost||budget(value.maxCreditsPerDay)!==value.maxCreditsPerDay)throw Error('Invalid publisher budget');writeInstanceConfig(ctx,'publisher',value);}
export function requirePublisherBudget(value:PublisherSecrets,credits:number):void {if(!value.apiKey||!Number.isSafeInteger(credits)||credits<1||value.maxCreditsPerPost<credits||value.maxCreditsPerDay<credits)throw Error('Publisher credentials and explicit credit budgets required');}
