# E 工程与稳定化交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 客户能看懂资料/备份/恢复状态，工程门槛可重复运行并交付真实证据。
**Architecture:** 渐进知识元数据和模块流程，CI与集成复用同一fixture与browser入口。
**Tech Stack:** Node22.18+/TypeScript/原生DOM；devDependency playwright固定1.62.1（当前bundled版本），不作产品运行依赖。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md

## Global Constraints

读取总计划与A/B/C/D接口。保留现有知识正文/来源/hash确认；手工元数据不变成已验证事实。设置普通中文，不暴露私有配置/事务字节。真实供应商/WorkBuddy原生成员/调度、云备份及5用户反馈仍需外部证据；本批不自动执行。

## Review Focus

同名知识不同路径、正文改变后的旧确认、缺失附件/外链、客户自定义技能、CI无真实密钥：E1/E2逐项测试。

### Task E1：知识分类、附件及技能下一步

**Files:** Create src/domain/knowledge-metadata.ts、tests/knowledge-metadata.test.ts。Modify server.ts、web/views/knowledge.js/skills.js/settings.js、src/domain/knowledge-health.ts、src/backup/service.ts/bundle.ts、skills/yundian-growth-workbench/references/WORKFLOWS.md。
**Interfaces:** KnowledgeMetadata={version:1,workspaceId,path,category:'company'|'product'|'market'|'buyer'|'marketing'|'research'|'other',sourceLinks:string[],attachments:{path?:string,url?:string}[],updatedAt}；loadKnowledgeMetadata(store):KnowledgeMetadata[]；saveKnowledgeMetadata(store,input,{revision}):KnowledgeMetadata。保存同B2事务，路径按客户范围；旧文件未分类显示other不重写。confirmedHash仍消费原正文当前哈希，元数据修改不自动重置/制造正文确认。

- [ ] Step1 tests“metadata_preserves_facts”：同名不同路径分开；原MD/旧sources/确认bytes保留；正文改仍待确认；附件缺失/外链明确状态；禁止越界/symlink；手填来源不升级verified；CRM/发布私有内容不自动进知识库；新元数据纳入旧Snapshot及完整bundle的scope/格式校验，跨workspace恢复失败原树不变。
- [ ] Step2 `node --test tests/knowledge-metadata.test.ts`，RED后实施。
- [ ] Step3 分类/来源/附件状态与搜索，不下载外链。技能页面沿用输入准备→指令→成果→验收→下一步真实状态；没有真实回执显示待WorkBuddy执行。设置消费实例/锁/完整备份/恢复预览实际数据，保留专家仅页尾按钮、无fakeQR、未保存/焦点保护。技能修改用skill-creator/writing-skills，明确新CLI与旧快照兼容。
- [ ] Step4 focused/type/build＋临时Edge核心操作；准备docs/target-user-feedback-template.md供5真实用户填，不预填成功率或耗时。未收集实测时标外部待完成。
- [ ] Step5 双审查，E2交付。

### Task E2：CI、编译集成、技能包与最终审查

**Files:** Create .github/workflows/quality.yml、scripts/validate-skill-packages.mjs、scripts/verify-stability-browser.mjs、tests/stability-integration.test.ts、docs/stability-acceptance.zh-CN.md。Modify package.json/package-lock.json、README.md、docs/workbuddy-deployment.zh-CN.md、scripts/package-skills.mjs（仅必要适配）、技能说明。
**Interfaces:** validateSkillPackages(outputDir):{skills,packages,files}校验CRC/manifestSHA/源码字节/无customer/秘密；verify-stability-browser消费编译server.js，浏览器路径由WORKBENCH_BROWSER_EXECUTABLE可注入，默认本地Edge，CI Chromium，分别标识，不硬写Codex缓存路径。dev playwright1.62.1支持CI安装，PyYAML只CI/隔离验证环境。

- [ ] Step1 tests“instance_transaction_bundle_paging_receipt”：临时客户A/B，换APP实例保持/隔离，HTTP+CLI写/kill恢复，知识真实产物/哈希回执/验收，完整CRM/member/filter/csv/funnel/反馈下一轮，完整备份和独立目的目录恢复。旧owner/SEO/GEO/MD/bin/定制技能/不可变发布payload保留；错scope/坏bundle失败树不变；publisher为本地mock，不真实发布。
- [ ] Step2 `node --test tests/stability-integration.test.ts`，先记录缺集成能力RED，修接线后GREEN，不引入自动供应商调用。
- [ ] Step3 CI ubuntu/windows Node22.18，checkout/setup-node使用明确受支持major，npm ci→check:ui→typecheck→test→build→package:skills→校验与官方quick_validate；独立Chromium烟测，失败保存fake-data日志截图。CI源码可本地核验，未push不称真实GitHub运行通过。app0.15.0/既有skills0.16.0维持working-tree/published:false，不虚构tag。
- [ ] Step4 全部最终gate只完整跑一次，17独立＋1总包18ZIP按实际registry核对，若目录增加技能不得用旧数量冒充；本地实际Edge编译服务1440/390/2K/4K，401/409/429/routeguard、备份范围与恢复及分页网络/实际CSV解析。基准报告给实测值，缺口按S1-S5列清，5用户/真实宿主/供应商/公网CI外部未验证。
- [ ] Step5 独立任务审查及最强全分支审查，一次集中修重要问题并复审，保存完整验收/迁移/回滚指南。只在客户迁移预检另获允许后更新实际实例；不commit/push/deploy或删现有工作树/客户資料。审查用快照与diff，证据先保留。

