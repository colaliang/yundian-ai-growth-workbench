import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 公网发布模式：绑 0.0.0.0 并放行反代域名（本地默认仍走 server.ts 的严格校验）。
// 云服务配置走环境变量 WORKBENCH_CLOUD_ENDPOINT / WORKBENCH_CLOUD_KEY 或应用根目录 cloud-config.json。
process.env.WORKBENCH_PUBLIC='1';
const app=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { createServer,parseRuntimeOptions } = await import('../server.js');
const {openFileWorkspace}=await import('../src/runtime/workspace.js');
const root=process.argv[2];if(!root)throw Error('Required CUSTOMER_PROJECT; application directory is not a customer workspace');
const port=Number(process.env.PORT??8767);
if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid port');
const runtime=parseRuntimeOptions(['--root',root,'--port',String(port),...process.argv.slice(3)],process.env);
createServer(await openFileWorkspace(root),port,{privateBase:runtime.privateBase,legacyPrivateBase:runtime.legacyPrivateBase}).listen(port,'0.0.0.0',()=>console.log('Yundian+ workbench (public): port '+port+', root '+root));
