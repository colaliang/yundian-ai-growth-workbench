import {resolveInstance} from '../src/runtime/instance.ts';
import {openFileWorkspace} from '../src/runtime/workspace.ts';
import {saveOwnerPassword} from '../src/auth/owner.ts';
const args=process.argv.slice(2),index=args.indexOf('--root');
if(index<0||!args[index+1]){console.error('Required --root CUSTOMER_PROJECT. Legacy APP credentials are not reused automatically; use workbench config-migration preview.');process.exit(1);}
const privateAt=args.indexOf('--private-base');
const name=args.find((v,i)=>v!=='--root'&&i!==index+1&&v!=='--private-base'&&(privateAt<0||i!==privateAt+1))||'WORKBENCH_OWNER_PASSWORD';
if(!/^[A-Z][A-Z0-9_]*$/.test(name)||!process.env[name]){console.error('Set the named owner password environment variable before running this local CLI.');process.exit(1);}
if(privateAt>=0&&(!args[privateAt+1]||args[privateAt+1].startsWith('--')))throw Error('Invalid private base');
const store=await openFileWorkspace(args[index+1]);
saveOwnerPassword(resolveInstance(store.root,{privateBase:privateAt<0?process.env.WORKBENCH_PRIVATE_BASE:args[privateAt+1]}),process.env[name]);
console.log('Owner password configured. Restart the workbench to invalidate existing sessions.');
