import fs from 'node:fs';
import path from 'node:path';
import { FileWorkspace } from '../server.ts';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
try {
  if(!args.includes('--root')) throw Error('Required --root CUSTOMER_PROJECT');
  const store=new FileWorkspace(option('--root'));
  const command=option('--command','state');
  if(command==='state') console.log(JSON.stringify({...store.load(),projectRoot:store.root},null,2));
  else if(command==='save') {
    const action=option('--action');
    if(!action) throw Error('Required --action');
    const file=option('--payload');
    const payload=file?JSON.parse(store.read(path.resolve(file))):{};
    const revision=option('--revision',store.load().revision);
    console.log(JSON.stringify(store.save({action,payload,revision}),null,2));
  } else throw Error('Unknown command; use state or save');
} catch(error) { console.error(error.code?'文件操作失败，请检查客户目录与文件权限':error.message); process.exitCode=1; }
