import type {Schedule} from '../domain/contracts.ts';
export interface SchedulerCapabilities {create:boolean;pause:boolean;verify:boolean;mode:'command-only';reason:string}
export interface ScheduleInput {workspaceId:string;skillId:string;stage:string;name:string;timezone?:string;time?:string;frequency?:string;inputs?:Record<string,unknown>;outputPath?:string;operation?:string;authorization?:Record<string,unknown>}
export interface HostReceipt {workspaceId:string;scheduleId:string;action:'create'|'pause';hostTaskId:string|null;source:string;evidence:string;status:'enabled'|'paused'|'failed'|'unsupported'|'pending-host';error?:string}
export interface SchedulerAdapter {capabilities():Promise<SchedulerCapabilities>;create(input:ScheduleInput):Promise<HostReceipt>;pause(hostId:string):Promise<HostReceipt>}
// No native WorkBuddy tool/API is available. A user supplied ID is never verified by this adapter.
export class CommandOnlyAdapter implements SchedulerAdapter {
 async capabilities():Promise<SchedulerCapabilities>{return {create:false,pause:false,verify:false,mode:'command-only',reason:'未发现可核验的 WorkBuddy 原生调度 API；请复制指令在宿主创建并核验。'};}
 async create(input:ScheduleInput):Promise<HostReceipt>{return {workspaceId:input.workspaceId,scheduleId:(input as unknown as Schedule).id||'',action:'create',hostTaskId:null,source:'command-only adapter',evidence:'native scheduler unavailable',status:'unsupported'};}
 async pause(hostId:string):Promise<HostReceipt>{return {workspaceId:'',scheduleId:'',action:'pause',hostTaskId:hostId,source:'command-only adapter',evidence:'pause requires native acknowledgement',status:'pending-host'};}
}
