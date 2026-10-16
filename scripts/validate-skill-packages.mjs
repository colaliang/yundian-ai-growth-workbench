import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const v of b)c=table[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function zipEntries(bytes){
 const rows=new Map(),local=new Map();let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const flags=bytes.readUInt16LE(offset+6),method=bytes.readUInt16LE(offset+8),checksum=bytes.readUInt32LE(offset+14),size=bytes.readUInt32LE(offset+18),plain=bytes.readUInt32LE(offset+22),nl=bytes.readUInt16LE(offset+26),el=bytes.readUInt16LE(offset+28),name=bytes.subarray(offset+30,offset+30+nl).toString();
  if(flags!==0x800||method!==0||size!==plain||!name||name.includes('\0')||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>p==='..'||p==='.')||rows.has(name))throw Error('Invalid ZIP entry '+name);
  const body=bytes.subarray(offset+30+nl+el,offset+30+nl+el+size);if(body.length!==size||crc(body)!==checksum)throw Error('ZIP CRC/size mismatch '+name);
  rows.set(name,body);local.set(name,{offset,flags,method,checksum,size});offset+=30+nl+el+size;
 }
 const centralStart=offset,centralNames=new Set();
 while(bytes.readUInt32LE(offset)===0x02014b50){
  const nl=bytes.readUInt16LE(offset+28),el=bytes.readUInt16LE(offset+30),cl=bytes.readUInt16LE(offset+32),name=bytes.subarray(offset+46,offset+46+nl).toString(),record=local.get(name);
  if(!record||centralNames.has(name)||record.offset!==bytes.readUInt32LE(offset+42)||record.flags!==bytes.readUInt16LE(offset+8)||record.method!==bytes.readUInt16LE(offset+10)||record.checksum!==bytes.readUInt32LE(offset+16)||record.size!==bytes.readUInt32LE(offset+20)||record.size!==bytes.readUInt32LE(offset+24)||bytes.readUInt16LE(offset+34)!==0)throw Error('ZIP central/local mismatch '+name);
  centralNames.add(name);offset+=46+nl+el+cl;
 }
 if(bytes.readUInt32LE(offset)!==0x06054b50||offset+22!==bytes.length||bytes.readUInt16LE(offset+4)!==0||bytes.readUInt16LE(offset+6)!==0||bytes.readUInt16LE(offset+8)!==rows.size||bytes.readUInt16LE(offset+10)!==rows.size||centralNames.size!==rows.size||bytes.readUInt16LE(offset+20)!==0||bytes.readUInt32LE(offset+12)!==offset-centralStart||bytes.readUInt32LE(offset+16)!==centralStart)throw Error('ZIP directory mismatch');return rows;
}
export function validateSkillPackages(outputDir){
 const manifest=JSON.parse(fs.readFileSync(path.join(outputDir,'manifest.json'))),registry=JSON.parse(fs.readFileSync(path.join(root,'skills/registry.json'))),dirs=fs.readdirSync(path.join(root,'skills')).filter(n=>fs.existsSync(path.join(root,'skills',n,'SKILL.md'))).sort();
 if(manifest.releaseVersion!==JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version||manifest.published!==false||manifest.buildLabel!=='working-tree'||manifest.skills.length!==dirs.length||manifest.packages.length!==dirs.length+1)throw Error('Delivery inventory mismatch');
 if(JSON.stringify(manifest.skills.map(s=>s.skillId).sort())!==JSON.stringify(dirs))throw Error('Skill identity inventory mismatch');if(JSON.stringify(manifest.aliases)!==JSON.stringify(Object.fromEntries(Object.entries(registry).map(([stage,v])=>[stage,v.id]))))throw Error('Alias mismatch');
 if(manifest.packages.filter(p=>p.skillId===null).length!==1||JSON.stringify(manifest.packages.filter(p=>p.skillId!==null).map(p=>p.skillId).sort())!==JSON.stringify(dirs)||new Set(manifest.packages.map(p=>p.file)).size!==manifest.packages.length)throw Error('Package identity inventory mismatch');
 const expected=new Map();let files=0;
 for(const skill of manifest.skills){if(!dirs.includes(skill.skillId))throw Error('Unknown skill');const registered=Object.values(registry).find(v=>v.id===skill.skillId);if(skill.version!==(registered?.version||manifest.releaseVersion)||skill.buildLabel!=='working-tree')throw Error('Skill version mismatch');const disk=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='__pycache__'||e.name.endsWith('.pyc'))continue;const f=path.join(d,e.name);if(e.isSymbolicLink())throw Error('Symbolic source');if(e.isDirectory())walk(f);else disk.push(path.relative(path.join(root,'skills'),f).replaceAll('\\','/'));}};walk(path.join(root,'skills',skill.skillId));if(JSON.stringify(disk.sort())!==JSON.stringify(skill.files.map(f=>f.path).sort()))throw Error('Source inventory mismatch');
 for(const row of skill.files){if(!disk.includes(row.path)||/(^|\/)(customer-data|\.env(?:\..*)?|credentials?|\.git|\.workbench-runtime)(\/|$)/i.test(row.path))throw Error('Private/unexpected packaged path');const body=fs.readFileSync(path.join(root,'skills',row.path));if(/sk-proj-[A-Za-z0-9_-]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[A-Z0-9]{16}/.test(body.toString()))throw Error('Possible live secret in skill source');if(sha(body)!==row.sha256||body.length!==row.size)throw Error('Source manifest mismatch');expected.set(row.path,body);files++;}
 }
 for(const id of Object.values(registry).map(x=>x.id))if(!dirs.includes(id))throw Error('Registry missing skill');
 const zipFiles=fs.readdirSync(outputDir).filter(x=>x.endsWith('.zip')).sort();if(JSON.stringify(zipFiles)!==JSON.stringify(manifest.packages.map(x=>x.file).sort()))throw Error('Unexpected ZIP inventory');
 for(const p of manifest.packages){if(path.basename(p.file)!==p.file)throw Error('Unsafe package');const bytes=fs.readFileSync(path.join(outputDir,p.file));if(sha(bytes)!==p.sha256||bytes.length!==p.size)throw Error('Package SHA mismatch');const rows=zipEntries(bytes),wanted=[...expected].filter(([n])=>!p.skillId||n.startsWith(p.skillId+'/'));
 for(const[n,b]of wanted)if(!rows.has(n)||!rows.get(n).equals(b))throw Error('ZIP source bytes mismatch '+n);
 const allowed=new Set(wanted.map(([n])=>n));for(const skill of manifest.skills.filter(s=>!p.skillId||s.skillId===p.skillId)){const name=skill.skillId+'/manifest.json',local=JSON.parse(rows.get(name));if(JSON.stringify(local)!==JSON.stringify({...skill,releaseVersion:manifest.releaseVersion,published:false,installPolicy:manifest.installPolicy}))throw Error('Inner manifest mismatch');allowed.add(name);}
 if(!p.skillId){allowed.add('registry.json');allowed.add('manifest.json');if(!rows.get('registry.json').equals(fs.readFileSync(path.join(root,'skills/registry.json'))))throw Error('Registry bytes mismatch');const inner=JSON.parse(rows.get('manifest.json'));if(JSON.stringify(inner)!==JSON.stringify({...manifest,packages:manifest.packages.filter(p=>p.skillId!==null)}))throw Error('Aggregate manifest mismatch');}
 if(rows.size!==allowed.size||[...rows.keys()].some(n=>!allowed.has(n)))throw Error('Unregistered ZIP content');
 }
 return{skills:dirs.length,packages:zipFiles.length,files};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(validateSkillPackages(path.resolve(process.argv[2]||'dist/skills-working-tree'))));



