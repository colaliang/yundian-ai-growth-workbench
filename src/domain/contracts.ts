export const SCHEMA_VERSION = 3 as const;
export const CONTRACT_VERSION = 2 as const;
export type TaskStatus = 'needs-input' | 'ready' | 'running' | 'needs-review' | 'completed' | 'failed' | 'cancelled';
export type ScheduleStatus = 'draft' | 'pending-host' | 'enabled' | 'paused' | 'failed' | 'unsupported';
export interface Scoped { workspaceId: string }
export interface Workspace extends Scoped { schemaVersion: 3; contractVersion:2; projectRoot: string; backup: { enabled: boolean }; [key:string]: unknown }
export interface KnowledgeEntry extends Scoped { id:string; title:string; path:string; sources:string[]; reviewStatus:string }
export interface SkillDefinition { skillId:string; version:string; entry:string; inputs:string[]; outputs:string[]; acceptance:string[] }
export interface TaskRun extends Scoped { sourceLeadId?:string; id:string; stage:string; skillId:string; skillVersion:string; status:TaskStatus; inputSnapshotRef:string; createdAt:string; artifactIds:string[] }
export interface Artifact extends Scoped { id:string; taskId:string; module:string; skillVersion:string; inputSnapshotRef:string; executedAt:string|null; path?:string; url?:string; summary:string; sources:string[]; gaps:string[]; nextSteps:string[]; verification:'unverified'|'verified'; contentHash:string|null }
export interface Review extends Scoped { id:string; taskId:string; artifactId:string; contentHash:string; reviewedAt:string; evidence:string }
export interface Schedule extends Scoped { id:string; skillId:string; timezone:string; frequency:string; inputs:Record<string,unknown>; outputPath:string; authorization:Record<string,unknown>; status:ScheduleStatus; hostTaskId:string|null; receipt:string|null }
export interface DailyAction extends Scoped { id:string; reason:string; taskId:string|null; skillId:string; missingInputs:string[] }
export interface Expert { id:string; name:string; modules:string[]; contact:string; website?:string; description?:string; websites?:string[]; projectLinks?:{title:string;url:string}[]; qrImage?:string|null }
export interface ServiceOffering { id:string; expertId:string; scope:string; paid:boolean }
export interface DeliveryProgram extends Scoped { id:string; goals:string[]; stages:string[]; taskIds:string[]; artifactIds:string[] }
export interface BackupRecord extends Scoped { id:string; createdAt:string; schemaVersion:number; files:{path:string;checksum:string}[]; status:'pending'|'completed'|'failed'; error?:string }
export interface MigrationResult { changed:boolean; backupPath:string|null; schemaVersion:number; contractVersion:2 }
