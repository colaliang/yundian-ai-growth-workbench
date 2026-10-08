import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const app=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
const option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<18)) throw Error('需要 Node.js 22.18+，请先安装或升级 Node.js。');
const requested=option('--root',null);
const root=path.resolve(requested??path.join(app,'customer-data','default'));
if(!requested) fs.mkdirSync(root,{recursive:true});
if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()) throw Error('指定的客户目录必须已存在：'+root);
const port=Number(option('--port','8767'));
if(!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid port');
const url='http://127.0.0.1:'+port;
const child=spawn(process.execPath,[path.join(app,'server.ts'),'--root',root,'--port',String(port)],{cwd:app,stdio:'inherit',windowsHide:true});
let exited=false;
child.on('error',()=>{console.error('工作台启动失败，请检查 Node.js 与目录权限。');process.exitCode=1;exited=true;});
child.on('exit',code=>{exited=true;process.exitCode=code??1;});
process.on('SIGINT',()=>child.kill());
process.on('SIGTERM',()=>child.kill());
for(let attempt=0;attempt<40&&!exited;attempt++) {
  await new Promise(resolve=>setTimeout(resolve,250));
  try {
    const response=await fetch(url+'/api/state',{signal:AbortSignal.timeout(1000)});
    if(!response.ok) continue;
    const state=await response.json();
    if(path.resolve(state.projectRoot)!==fs.realpathSync(root)) continue;
    // Let bind failures finish before opening an existing server on the same port.
    await new Promise(resolve=>setTimeout(resolve,250));
    if(exited) break;
    console.log('客户目录：'+root+'\n工作台：'+url+'\n关闭此进程停止服务；首次使用先创建企业知识库。设置可导出本地快照；在线备份未配置，保持关闭。更新前检查本地修改并单独保留客户技能。');
    if(!args.includes('--no-open')) {
      const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
      const parameters=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
      const browser=spawn(command,parameters,{stdio:'ignore',detached:true,windowsHide:true});
      browser.on('error',()=>console.log('请手动打开：'+url));browser.unref();
    }
    break;
  } catch {}
  if(attempt===39) console.error('暂未确认服务就绪，请查看启动日志。');
}
