import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileWorkspace,createServer} from '../server.ts';
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('native module shell replaces global script and cloud SDK',()=>{const html=read('index.html');assert.match(html,/type="module"/);assert.match(html,/web\/main.js/);assert.doesNotMatch(html,/workbuddy-cloud-sdk/);});
test('five primary areas and settings have explicit routes',()=>{assert.ok(fs.existsSync(new URL('../web/main.js',import.meta.url)),'module shell missing');const main=read('web/main.js');for(const name of ['工作台','企业知识库','获客技能','定时任务','设置'])assert.ok(main.includes(name),name);assert.match(main,/export function mountApp/);assert.match(main,/hashchange/);});
test('compatibility views retain local artifacts/avatar/releases but no AI execution or cloud merge',()=>{const app=read('app-v03.js');assert.doesNotMatch(app,/chat\.completions|ensureModels|generateDraft|loadCloudTasks|mirrorAfterSave|ai-run|profile-autofill/);for(const text of ['viewArtifact','avatar-file','checkUpdate','api/artifact/'])assert.ok(app.includes(text));});
test('historical draft is served without generating or modifying it',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'ui-shell-'));const store=new FileWorkspace(root);store.save({revision:store.load().revision,action:'profile',payload:{company:'客户',goal:'测试'}});store.save({revision:store.load().revision,action:'task',payload:{stage:'market-research',name:'历史草稿'}});const task=store.load().tasks[0];store.save({revision:store.load().revision,action:'artifact',payload:{id:task.id,content:'旧AI草稿：待核验'}});const server=createServer(store,18793);await new Promise<void>(r=>server.listen(18793,'127.0.0.1',r));try{assert.equal(await(await fetch('http://127.0.0.1:18793/api/artifact/'+task.id+'.md')).text(),'旧AI草稿：待核验\n');for(const asset of ['web/main.js','web/api.js','web/views/workbench.js','web/views/settings.js','web/views/skills.js'])assert.equal((await fetch('http://127.0.0.1:18793/'+asset)).status,200,asset);}finally{await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(root,{recursive:true,force:true});}});

test('heading escapes customer goal HTML before rendering',async()=>{const {heading}=await import(new URL('../app-v03.js',import.meta.url).href);const goal='<img src=x onerror=alert(1)>';const html=heading('工作台',goal);assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img'));});
