import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export interface UpdateCheck {automaticUpdateAllowed:false;repository:string;gitAvailable:boolean;modifiedFiles:string[];customerPaths:string[];customSkills:string[];guidance:string}
export function inspectUpdate(root:string):UpdateCheck{const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');let modifiedFiles:string[]=[],gitAvailable=false;try{modifiedFiles=execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:repository,encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/).filter(Boolean);gitAvailable=true;}catch{}const skills=path.join(root,'.codebuddy/skills');if(fs.lstatSync(skills,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Custom skills symlink rejected');return {automaticUpdateAllowed:false,repository,gitAvailable,modifiedFiles,customerPaths:['growth-workspace','.workbench-backups'],customSkills:fs.existsSync(skills)?fs.readdirSync(skills):[],guidance:'先导出客户快照，并另行备份 .codebuddy/skills 客户定制；查看本地修改和官方发布差异，在新目录验证后人工合并。不要自动 git pull 或 hard reset。'};}
