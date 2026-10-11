import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {IncomingMessage} from 'node:http';
export interface OwnerConfig {publicMode:boolean;passwordHash:string|null;sessionTtlSeconds:number}
export interface AuthDecision {allowed:boolean;loginRequired:boolean;setupRequired:boolean}
const sessions=new WeakMap<OwnerConfig,Map<string,number>>();
export function createOwnerConfig(publicMode:boolean,passwordHash:string|null,sessionTtlSeconds=86400):OwnerConfig {const config={publicMode,passwordHash,sessionTtlSeconds};sessions.set(config,new Map());return config;}
export function hashPassword(password:string):string {if(!password||password.length>1024)throw Error('Invalid owner password');const salt=crypto.randomBytes(16).toString('hex');return 'scrypt$'+salt+'$'+crypto.scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password:string,hash:string):boolean {if(typeof password!=='string'||password.length>1024)return false;const match=/^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);if(!match)return false;return crypto.timingSafeEqual(crypto.scryptSync(password,match[1],64),Buffer.from(match[2],'hex'));}
const cookie=(req:IncomingMessage)=>(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('wb_owner='))?.slice(9)||'';
export function authorizeOwner(req:IncomingMessage,config:OwnerConfig):AuthDecision {if(!config.publicMode)return {allowed:true,loginRequired:false,setupRequired:false};if(!config.passwordHash)return {allowed:false,loginRequired:false,setupRequired:true};const key=cookie(req),map=sessions.get(config),expires=map?.get(key)||0;const allowed=expires>Date.now();if(!allowed)map?.delete(key);return {allowed,loginRequired:!allowed,setupRequired:false};}
export function issueOwnerSession(config:OwnerConfig):string {let map=sessions.get(config);if(!map){map=new Map();sessions.set(config,map);}const key=crypto.randomBytes(32).toString('base64url');map.set(key,Date.now()+config.sessionTtlSeconds*1000);return key;}
export function revokeOwnerSession(req:IncomingMessage,config:OwnerConfig):void {sessions.get(config)?.delete(cookie(req));}
export function privateConfigDirectory(appRoot:string):string {const value=path.join(os.homedir(),'.workbench-private',crypto.createHash('sha256').update(path.resolve(appRoot)).digest('hex'));return value;}
export function loadOwnerConfig(appRoot:string,publicMode:boolean):OwnerConfig {const file=path.join(privateConfigDirectory(appRoot),'owner.json');let hash:string|null=null;if(fs.existsSync(file)){const value=JSON.parse(fs.readFileSync(file,'utf8'));if(typeof value.passwordHash==='string')hash=value.passwordHash;}return createOwnerConfig(publicMode,hash);}
export function saveOwnerPassword(appRoot:string,password:string):void {const dir=privateConfigDirectory(appRoot);fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.writeFileSync(path.join(dir,'owner.json'),JSON.stringify({passwordHash:hashPassword(password)}),{mode:0o600});}
