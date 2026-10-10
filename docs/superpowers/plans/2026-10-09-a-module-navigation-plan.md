# A：项目化导航与项目内成果 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 实现已确认的项目化工作台、直接发布和CRM中本计划对应的交付单元。
**Architecture:** 复用现有Store与业务stage，在展示层定义统一模块映射；后台成果索引不变。先同步远端运行差异，再整合页面归属，交付一个可独立使用的模块工作台。
**Tech Stack:** Node.js/TypeScript、原生HTML/CSS/ES模块、node:test、现有文件存储；后端fetch访问JSON-RPC MCP。
**Spec:** ../specs/2026-10-09-module-workspace-publishing-crm-design.md
**Status:** 待用户审阅实施计划；设计已确认，尚未修改产品代码。
**Execution:** 已选择子代理实现与独立审查，沿用该方式。

## Global Constraints
- 基线main/9f87a7f；Node.js >=22.18.0、TypeScript、原生ES模块；保留schemaVersion=3/contractVersion=2，新增可选featureDataVersion=1。
- 每客户独立工作台、WorkBuddy执行技能；不新增网页模型执行依赖。
- 13项二级项目；market-research/product-opportunity/buyer-check/sales-feedback无专家咨询。
- 历史任务ID、成果ID、文件、稳定leadId与客户定制技能不静默覆盖。
- 发布只走后端固定https://socialmedia.ydjia.com/api/mcp；API Key不得进Git、浏览器存储、/api/state或普通快照。
- 无配置凭据或预算不发送；无回执不标记成功；原生WorkBuddy定时能力、真实线上认证与付费发布须分开验收。
- 试验只用临时目录及本地mock，真实发布需客户选定内容、渠道与数值预算；本次不自动部署公网。
- 沿用子代理逐任务实现＋独立审查；未获本次提交授权不commit/push。先创建新隔离工作树，不改动仍在运行的旧预览或其客户目录。

## 文件与接口布局
src/navigation/modules.ts是唯一模块归属规则；web/modules.js是对应展示常量，测试保证一致。
server.ts是后端源，server.js由scripts/build.mjs生成；app-v03.js继续只作视图协调，不复制业务状态。
web/views/results.js接受moduleId过滤，web/views/services.js提供模块咨询卡；旧delivery数据仍可读。

## Review Focus
1. server.ts重新编译丢失9f87a7f公网/KB响应差异（Task1）。
2. seo/geo历史成果归属错误或重编号改变skillId（Task2）。
3. 不同项目成果混显、旧路由丢失历史（Task2）。
4. 四免费项目出现咨询、危险官网/电话链接被点击（Task3）。
5. 手机二级菜单不可访问或当前模块展开状态失效（Task2、3）。

### Task 1: 同步运行源码与云适配

**Files:** 修改server.ts、scripts/build.mjs、web/api.js、DEPLOY-NOTES.md；新建tests/runtime-parity.test.ts。
**Interfaces:** RuntimeOptions={projectRoot:string,port:number,publicMode:boolean}；parseRuntimeOptions(argv:string[],env:Record<string,string|undefined>):RuntimeOptions；后续B1对publicMode增加认证门。保持已有FileWorkspace/createServer API。

- [ ] **Step 1: 写失败测试。** 在tests/runtime-parity.test.ts验证：`assert.equal(parseRuntimeOptions(['--root',tmp,'--public'],{}).publicMode,true)`；编译后server.js与TS入口/api/state同字段（token、projectRoot、cloud、kbCheck），本地默认127.0.0.1；空体/非JSON/休眠响应仍可读错误或重连。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/runtime-parity.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 逐项比较9f87a7f的server.js与server.ts，仅把必要启动开关、KB检查与云配置传递同步进TS；保留已有前端唤醒重试。真实云服务凭据不读取、不启用。发布业务不依赖远端新增的模型草稿功能；云存储适配和专业技能回写分别保留。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。实际启动编译后服务验证字段及静态模块；不调用线上发布。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 2: 二级导航与按项目成果

**Files:** 新建src/navigation/modules.ts、web/modules.js、tests/module-navigation.test.ts；修改web/main.js、web/views/skills.js、web/views/workbench.js、web/views/results.js、app-v03.js、styles-v03.css、skills/registry.json。
**Interfaces:** ModuleDefinition={id:string,number:number,title:string,stages:string[],free:boolean}；MODULES:ModuleDefinition[]；moduleForStage(stage:string):string|null；artifactsForModule(state:Record<string,unknown>,moduleId:string):Artifact[]；resultsView支持moduleId。

- [ ] **Step 1: 写失败测试。** 在tests/module-navigation.test.ts验证：`assert.equal(MODULES.length,13)`；moduleForStage('seo')与moduleForStage('geo')均='seo-geo'；免费集合恰好4项；其他项目成果不出现在当前列表；旧/artifacts路由能选择项目，旧/experts引导到skills；历史TaskRun/Artifact字节不改。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/module-navigation.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 模块顺序固定：market-research、product-opportunity、site-and-content、seo-geo、content-operations、acquisition、buyer-check、sales-feedback、next-cycle、social-media、facebook-ads、google-ads、email-outreach。knowledge单独一级。导航移除artifacts/experts入口，保留overview/knowledge/skills/crm/schedules/settings；crm未交付前不显示可用入口。业务项目展示技能、任务、成果子区域；SEO/GEO分类仍调用对应技能。二级展开状态只保存界面偏好，不存客户资料；直接打开子路由自动展开。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。Playwright实际点击二级菜单、旧路由和项目筛选，在390px检查菜单可达与无溢出。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 3: 统一咨询卡与单元A交付

**Files:** 修改config/experts.json、config/services.json、web/views/services.js、web/views/skills.js、app-v03.js；新建tests/module-consultation.test.ts；更新docs/skill-modules.zh-CN.md。
**Interfaces:** consultationForModule(moduleId:string):Expert|null；moduleConsultationView(moduleId:string,esc:(value:unknown)=>string):string；消费Task2 MODULES.free及existing安全链接函数。

- [ ] **Step 1: 写失败测试。** 在tests/module-consultation.test.ts验证：4免费模块返回null；其余9均出现“专家咨询联系”、指定文案、微信同号电话、单一ydjia官网及二维码占位；无自动发送客户资料；javascript/data链接不产生href。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/module-consultation.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 固定文案照设计，二维码保留真实图片占位。删除全局servicesView入口，但保留已有交付计划文件及有效验收数据；不通过迁移删除它们。咨询仅展示联系，不新增付款。统一项目标题与结果操作后完成A的真实浏览器验收。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。运行A测试和现有UI/成果回归；验收13模块、专家卡、报告查看/验收、桌面与手机。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

## A回滚与交付
执行前记录Git基线；A不变更业务数据结构。回滚只恢复代码/导航映射，历史数据和用户界面偏好保留。交付审查通过后再进入B，单元A无需发布账号或CRM数据即可独立运行。
