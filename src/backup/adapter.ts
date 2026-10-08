import type {BackupRecord} from '../domain/contracts.ts';
export interface Snapshot { id:string;workspaceId:string;schemaVersion:3;contractVersion:2;createdAt:string;files:{path:string;checksum:string;data:string}[] }
// Implementations must authenticate the account and prove its customer scope before returning true.
export interface BackupAdapter { verifyIsolation(workspaceId:string):Promise<boolean>;upload(snapshot:Snapshot):Promise<BackupRecord>;download(id:string):Promise<Snapshot> }
