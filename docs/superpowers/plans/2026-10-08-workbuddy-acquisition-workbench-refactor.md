# 外贸获客工作台重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 交付客户独立、由WorkBuddy执行的全域获客技能工作台，形成任务、成果、每日行动与陪跑闭环。
**Architecture:** 保留Node.js/TypeScript和原生网页，按领域拆分现有大文件。客户数据独立，官方技能与定制技能分离；定时任务与备份通过可核验的适配接口接入。
**Tech Stack:** Node.js >=22.18.0、TypeScript、原生ES模块、node:test；现有技能辅助脚本Python >=3.10。
**Spec:** ../specs/2026-10-08-workbuddy-acquisition-workbench-refactor-design.md
**Status:** 待用户审阅并选择执行方式。此文不是执行或上线验收。
**Baseline:** main/f2a6ebd，v0.15.0；保留未跟踪docs/presentation-outline.zh-CN.md。

## Global Constraints
- WorkBuddy负责实际执行，工作台负责资料、指令、任务、成果和反馈。
- 每客户独立实例与WorkBuddy项目，优先本地保存；在线同步备份默认关闭。
- 移除网页内AI助手、模型生成草稿与模型调用配置，历史产物保留。
- 每日3–5项优先任务，数据不足时不编造或凑数。
- 默认客户时区Asia/Shanghai、初始每日09:00，可在启用前修改。
- 发送开发消息、发布内容、修改广告及预算须显式授权。
- 无宿主创建回执不显示定时任务已启用；无客户认证隔离不启用在线备份。
- 根AGENTS要求未获明确授权不commit/push；各任务保存可审查diff，获授权后再分阶段提交。
- 不在设计/计划阶段安装依赖、修改产品代码或部署。

## Review Focus
1. 旧JSON损坏或中断迁移必须保留原数据（任务1）。
2. 重复回写、无文件和验收后修改不能误判完成（任务4）。
3. 定时时区切换、重复时点和暂停失败必须如实展示（任务6）。
4. 在线恢复含越界路径、错误客户编号和本地冲突必须拒绝或保留双方（任务8）。
5. 无资料、无专家和无WorkBuddy接口仍能浏览且不假装执行成功（任务3、5、7、9）。

## 文件布局与阶段
src/domain管契约与业务，src/storage管本地文件，src/skills管注册和指令，src/scheduling管宿主计划，src/backup管快照，src/updates管更新检查；web/views按页面拆分；config仅公开服务目录。
现有server.ts收敛为HTTP路由与静态入口，server.js由构建生成。编译前先核实现有相对导入规则，TypeScript模块采用NodeNext兼容导入路径。
任务1–4交付核心；任务5–6交付每日与定时；任务7交付专家陪跑；任务8交付备份安全骨架；任务9打包验收。在线提供方真实接入为任务8条件步骤，不阻塞本地核心。

### Task 1: 客户数据契约与安全迁移

**Files:** src/domain/contracts.ts、src/storage/workspace-store.ts、src/storage/migrate.ts；修改server.ts、tsconfig.json；tests/migration.test.ts。
**Interfaces:** migrateWorkspace(root:string): MigrationResult；MigrationResult={changed:boolean,backupPath:string|null,schemaVersion:number}；统一Workspace、TaskRun、Artifact、Schedule等类型，schemaVersion=2。

- [ ] **Step 1: 写失败测试。** 断言：迁移保留旧任务编号、旧AI草稿及待核验标记；第二次迁移changed=false；非法旧JSON不修改原文件；越界路径被拒绝。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/migration.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 先固化v0.15临时目录样本，再抽取现有Store；迁移写临时文件、校验、原子替换。保留旧stage映射，不删历史记录。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 2: 移除网页AI执行并建立模块化界面

**Files:** web/main.js、web/api.js、web/views/workbench.js、web/views/settings.js；修改index.html、app-v03.js、styles-v03.css、server.ts；tests/ui-shell.test.ts。
**Interfaces:** mountApp(root:HTMLElement):void；api.request(path:string,options?:object):Promise<object>；浏览器原生ES模块。

- [ ] **Step 1: 写失败测试。** 断言：导航五入口存在；AI聊天、ai-run、模型配置入口不存在；历史草稿仍可读取；头像和版本设置保留。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/ui-shell.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 以现有样式为起点拆视图，移除模型调用与云SDK对AI功能的依赖；只允许独立备份适配使用存储依赖。保持现有API兼容层直到迁移完成。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 3: 专业技能注册与全域技能扩展

**Files:** src/skills/catalog.ts、web/views/skills.js；修改skills/registry.json、各业务SKILL.md；新增skills/yundian-growth-{seo,geo,social-media,facebook-ads,google-ads,email-outreach}/SKILL.md；tests/skills.test.ts。
**Interfaces:** loadSkills(appRoot:string,customerRoot:string):SkillDefinition[]；buildInvocation(skill:SkillDefinition,task:TaskRun,workspace:Workspace):string。

- [ ] **Step 1: 写失败测试。** 断言：所有启用技能文件真实存在且有输入输出验收；客户定制不覆盖官方版本；复制指令含taskId、skillId、版本、输入、保存目录与回写格式。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/skills.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 现有acquisition保留为LinkedIn兼容入口；seo-geo保留兼容入口并拆SEO/GEO。建站保留三平台选择。扩展技能需来源核验，先读writing-skills与skill-creator要求，禁止编造工具API能力。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 4: 知识库与任务成果闭环

**Files:** src/domain/tasks.ts、src/domain/artifacts.ts、src/domain/knowledge.ts、web/views/knowledge.js、web/views/results.js；修改scripts/workbench.mjs；tests/task-artifact.test.ts。
**Interfaces:** createTask(input:TaskInput):TaskRun；applyReceipt(task:TaskRun,receipt:ExecutionReceipt):TaskRun；reviewArtifact(taskId:string,hash:string,decision:string):Review。

- [ ] **Step 1: 写失败测试。** 断言：复制不改变待执行状态；错误任务编号、丢失文件和越界路径回写失败；重复receiptId幂等；验收后修改产物使验收失效；新批次不覆盖旧成果。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/task-artifact.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** POST /api/tasks、POST /api/tasks/:id/receipts、POST /api/tasks/:id/reviews；GET /api/artifacts/:id。回写支持文件和HTTP，记录执行者来源，链接成果标记未核验；知识库更新需客户确认。旧路由作为兼容适配。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 5: 每日推荐与新手引导

**Files:** src/domain/daily-actions.ts、web/views/daily-actions.js；修改web/views/workbench.js、workspace-defaults.json；tests/daily-actions.test.ts。
**Interfaces:** recommendDaily(input:DailyContext,now:string,limit:number=5):DailyAction[]；输入为知识缺口、到期跟进、任务、目标与销售反馈。

- [ ] **Step 1: 写失败测试。** 断言：同一输入输出稳定；优先到期跟进和资料缺口；有足够候选时3–5项，无候选不凑数；忽略或延期任务不重复推荐；每项有原因和技能。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/daily-actions.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 先处理阻塞资料缺口、已逾期跟进，再按阶段未完成任务、反馈优化排序；相同优先级按到期时间、id排序。首页首用知识库引导不阻止浏览技能。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 6: WorkBuddy定时配置与执行记录

**Files:** src/scheduling/adapter.ts、src/scheduling/service.ts、web/views/schedules.js；修改scripts/workbench.mjs；tests/schedules.test.ts。
**Interfaces:** SchedulerAdapter={capabilities():Promise<SchedulerCapabilities>,create(input:ScheduleInput):Promise<HostReceipt>,pause(hostId:string):Promise<HostReceipt>}；registerHostReceipt(id:string,receipt:HostReceipt):Schedule。

- [ ] **Step 1: 写失败测试。** 断言：无真实宿主任务编号或可核验回执不启用；不支持时显示可复制指令；timezone默认Asia/Shanghai、time默认09:00；同计划时点只建一个执行批次；未授权发布停在待确认。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/schedules.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 只实现实际宿主能力已核验的适配；没有API则提供指令和回执登记，不虚构桥接。按计划编号+计划时点去重；暂停未获宿主确认显示等待暂停。失败保留错误，无无限重试。验证跨时区与夏令时缺失/重复时点，跳过不存在时点、重复时点只执行一次。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 7: 专家与陪跑交付

**Files:** config/experts.json、config/services.json、config/delivery-programs.json、web/views/services.js、src/domain/delivery.ts；tests/delivery.test.ts。
**Interfaces:** getModuleServices(moduleId:string):ServiceOffering[]；createDeliveryProgram(templateId:string,workspaceId:string):DeliveryProgram。

- [ ] **Step 1: 写失败测试。** 断言：无联系人不显示虚构信息；每模块可关联专家；付费标记清晰；无专家仍可使用技能；陪跑按真实验收计进度。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/delivery.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 仅录入用户已确认的介绍和联系方式；阶段模板关联TaskRun和Review。分享成果显示客户选择，不默认授予专家数据权限。不实现支付。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 8: 更新保护与可选备份边界

**Files:** src/backup/adapter.ts、src/backup/service.ts、src/updates/check.ts、web/views/backup.js；修改scripts/launch.mjs；tests/backup-update.test.ts。
**Interfaces:** BackupAdapter={verifyIsolation(workspaceId:string):Promise<boolean>,upload(snapshot:Snapshot):Promise<BackupRecord>,download(id:string):Promise<Snapshot>}；restoreSnapshot(root:string,snapshot:Snapshot):RestoreResult；inspectUpdate(root:string):UpdateCheck。

- [ ] **Step 1: 写失败测试。** 断言：默认关闭；无认证隔离不能启用；校验失败不恢复；路径穿越和其他workspaceId拒绝；冲突保留双方；关闭不删除远端；官方更新不覆盖客户定制。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/backup-update.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 先实现本地快照、恢复和适配契约；真实在线提供方单列条件任务：取得客户选择、认证与存储后实现并验证适配，未完成界面明确未启用。移除现有自动匿名云合并路径，保留原云资料导出恢复入口。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

### Task 9: 技能打包、部署入口与交付验证

**Files:** scripts/package-skills.mjs、docs/workbuddy-deployment.zh-CN.md、docs/migration-v2.zh-CN.md；修改README.md、package.json、release.json、tsconfig.json、构建脚本；tests/integration.test.ts。
**Interfaces:** npm test覆盖tests/*.test.ts；npm run build编译src与server并保持入口server.js；npm run package:skills生成带manifest与版本的独立包及总包。

- [ ] **Step 1: 写失败测试。** 断言：空白项目完成知识库→复制→真实文件回写→验收→反馈→下一轮；旧数据迁移读回成功；重复安装保留定制；编译产物能启动；部署缺口准确报告。
- [ ] **Step 2: 验证失败。** 使用该任务Files列出的tests文件运行 `node --test tests/integration.test.ts`；预计新接口未定义或行为断言失败。不得将环境缺失当作红灯证据。
- [ ] **Step 3: 最小实现。** 完成临时目录端到端及浏览器桌面/手机验证；实际WorkBuddy部署、技能安装、定时创建、回写须独立验收。无宿主访问则明确未验证；不以测试适配器通过代替真实接入。保留README两条自动部署路径，更新品牌业务与专家入口。
- [ ] **Step 4: 验证通过。** 运行同一测试文件，预期全部通过；执行 `npm run typecheck`，预期退出码0。页面任务另核验实际点击、复制、错误提示与窄屏布局。
- [ ] **Step 5: 审查交付。** 核对 `git diff --check` 及本任务文件差异，记录通过与未验证项；发现接口偏差先修复再进入下一任务。未经授权不提交或推送。

## 发布、回滚与真实环境验收
- [ ] 执行前使用using-git-worktrees技能创建隔离工作树；保留主目录本地文件。先跑现有npm test/typecheck，基线失败需记录并处理具体影响。
- [ ] 数据迁移仅对明确选择的客户目录进行，先生成完整备份；演练用临时目录，不向客户目录写测试任务。
- [ ] 任务完成后运行npm test、npm run typecheck、npm run build、git diff --check；构建产物在独立端口启动并验证API及网页。
- [ ] 真实WorkBuddy验收单独记录版本、项目、实际任务标识、保存目录及回读结果；能力不可访问则保持未验证。
- [ ] 回滚使用迁移前快照恢复客户目录并返回原工作台版本；云端备份默认不删除；需先确认没有运行中的外部定时任务，失败则显式提示等待宿主处理。
- [ ] release.json与package.json同步，技能manifest记录各技能版本。发布号在实际交付确认后确定，不提前创建release或部署。
- [ ] 自查：设计第1–4节→任务1–4；第5节→任务5–6；第6节→任务1–2；第7节→任务8；第8节→任务7；第9节→任务1、8、9；第10节→各测试与最终验收。无独立AI引擎、支付或多租户范围扩张。

## 执行方式
用户审阅计划后选择：
1. 本会话直接实施：主代理按任务推进，最后独立审查整体验收。
2. 子代理逐任务实施与审查：每个任务实现后独立审查，再推进下一项。
优先推荐第一种，现有存储和UI接口连带修改较多，集中实施更易保持兼容；第二种提供更密集独立审查。
