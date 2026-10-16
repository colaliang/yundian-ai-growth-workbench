export interface FunnelLead {id:string;createdAt:string;stage:string}
export interface FunnelEvent {leadId:string;toStage:string|null;time:string;kind:string;archivedAt?:string|null}
export interface FunnelStage {id:string;label:string;count:number;leadIds:string[]}
export interface FunnelStats {stages:FunnelStage[];lost:FunnelStage;uniqueLeadCount:number;historyMissingCount:number;timezone:string;from:string;to:string}
export const funnelTimezone:string;
export function funnelToday(now?:number):string;
export function leadFunnel(leads:FunnelLead[],events:FunnelEvent[],range:{from:string;to:string}):FunnelStats;
export function funnelView(stats:FunnelStats,dates:{from:string;to:string},escape:(value:unknown)=>string):string;

export interface FunnelUiStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export function defaultFunnelRange():{from:string;to:string};
export function funnelRange(scope:string,storage?:FunnelUiStorage):{from:string;to:string};
export function saveFunnelRange(scope:string,range:{from:string;to:string},storage?:FunnelUiStorage):boolean;
