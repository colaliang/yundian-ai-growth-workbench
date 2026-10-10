import {saveOwnerPassword} from '../src/auth/owner.ts';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const name=process.argv[2]||'WORKBENCH_OWNER_PASSWORD';
if(!/^[A-Z][A-Z0-9_]*$/.test(name)||!process.env[name]){console.error('Set the named owner password environment variable before running this local CLI.');process.exit(1);}
saveOwnerPassword(path.dirname(path.dirname(fileURLToPath(import.meta.url))),process.env[name]);
console.log('Owner password configured. Restart the workbench to invalidate existing sessions.');
