# A：界面、技能与知识库一致性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 技能生成路径与开源应用采用相同导航规则，知识库维护指令可实际使用。
**Architecture:** 配置声明生成前端元数据，校验统筹技能建设摘要；知识健康状态只读当前客户资料。
**Tech Stack:** Node.js22.18+ / TypeScript / native JS modules。
**Spec:** docs/superpowers/specs/2026-10-12-workbench-optimization-design.md

## Global Constraints

- Spec: docs/superpowers/specs/2026-10-12-workbench-optimization-design.md，用户已确认，含3.7 UI/UX。
- Node.js 22.18+，TypeScript与原生浏览器模块；当前代码I:/Yundian+/opensource/workbench-ui-20261011，已有未提交UI保留。
- 客户目录/workspaceId、稳定ID、旧报告、SEO/GEO阶段及客户定制技能保留；测试仅使用隔离临时目录。
- 一级顺序：工作台、企业知识库、营销推广、内容运营、客户管理、定时任务、设置。13项目/15执行阶段；内容运营不重复在二级出现。
- 四个免费项目无专家窗口，其余页尾按钮按需打开；不发送客户资料；真实二维码尚无，继续占位。
- 名单导入是customer-confirmed，不宣称WorkBuddy API自动同步；不存在的宿主/API能力明确未验证。
- 任何新API沿用owner认证、Origin/CSRF、workspaceId/revision及路径预检；旧数据兼容不能绕过隔离。
- 发布审批哈希、不可变提交快照、未知不重发及额度限制保持；不做真实发布/收费/部署/合并/push/tag。
- UI/UX与数据保存同时验收，1440/2560×1440/3840×2160/390px；文件安装与复制不代表执行。
- 每任务保存报告与审查证据，审查通过后推进。AGENTS要求未授权不commit/push，替代模板默认提交步骤。

## Review Focus

1. 同名成员/旧owner/停用成员不能误指派或跨workspace；由B1/B2覆盖。
2. 共享公司/联系人修改、多实体写到中途失败，不能覆盖其他关系或留下半个客户；由B2覆盖。
3. 分页后的全筛选导出、长手机号/公式/换行不能漏行、变值或执行公式；由B3覆盖。
4. 首次使用、过期/冲突/保存失败、关闭未保存表单不能虚报成功或丢输入；由A2/C1覆盖。
5. 旧MD/bin、同名定制、新名册及新静态入口恢复/升级时不能丢失、绕认证或漂移；由A1/B1/C2覆盖。

## File Structure

config/workbench-ui.json：公共导航与规则；src/navigation/ui-contract.ts：校验；scripts/sync-workbench-contract.mjs：生成/只读核对；web/workbench-ui.js：生成给浏览器的元数据。src/domain/knowledge-health.ts：当前知识元数据健康汇总。其余仍沿现有模块，不另建Agent引擎。

### Task A1：公共界面契约与技能建设规范

**Files:** Create config/workbench-ui.json、src/navigation/ui-contract.ts、scripts/sync-workbench-contract.mjs、web/workbench-ui.js、tests/ui-contract.test.ts。Modify web/main.js、app-v03.js、server.ts、scripts/build.mjs、package.json、skills/yundian-growth-workbench/references/BUILD_BRIEF.md、README.md、docs/module-workspace-guide.zh-CN.md。
**Interfaces:** loadUiContract(appRoot:string):UiContract；UiContract={navigation:[string,string][],promotionModuleIds:string[],freeModuleIds:string[]}。消费MODULES13/stages15；产生WORKBENCH_NAVIGATION与PROMOTION_MODULE_IDS浏览器常量。脚本默认生成、--check仅检查，不写客户目录。npm sync:ui与check:ui调用该脚本。

- [ ] Step1 写test“canonical_ui_and_generated_skill_brief_agree”：navigation的ID严格overview/knowledge/skills/content-operations/crm/schedules/settings，promotion排除content-operations，free四与MODULES一致；脚本check检测人为漂移；未知ID拒绝。
- [ ] Step2 node --test tests/ui-contract.test.ts，观察缺少契约/漂移检查的红灯，不把工具环境错误当红灯。
- [ ] Step3 实现契约及确定性生成。官方BUILD_BRIEF首次替换旧导航，后续只更新明确标记段；保留其余人工内容。前端使用常量，静态白名单增加新文件并维持认证；构建先sync/check。不改客户已安装技能或覆盖同名定制。
- [ ] Step4 跑同测试、npm run check:ui、typecheck/build和真实浏览器导航；旧alias13/15与咨询规则不变。新文件在公网未登录401（公开无客户信息的启动元数据按既有shell规则处理并记录理由）。
- [ ] Step5 独立审查、报告后推进，无commit/push。

### Task A2：本地知识健康与可执行维护说明

**Files:** Create src/domain/knowledge-health.ts、tests/knowledge-health.test.ts。Modify server.ts、web/views/settings.js、web/views/knowledge.js、docs/workbuddy-deployment.zh-CN.md、tests/ui-shell.test.ts。
**Interfaces:** summarizeKnowledgeHealth(entries:KnowledgeEntry[],projectRoot:string,checkedAt:string):KnowledgeHealth；KnowledgeHealth={mode:'local',projectRoot,files,confirmed,pending,withoutRegisteredSource,checkedAt}。API/state增加knowledgeHealth，保留必要kbCheck兼容。不把withoutRegisteredSource说成正文一定无来源。

- [ ] Step1 test“actual_files_confirmation_and_legacy_sync_copy”：当前知识文件/确认hash变化读回正确；空项目0；源文有URL但未登记sources时只提示元数据缺口；settings不再输出sync-knowledge.mjs和wb-public固定指令；旧知识原字节不改。
- [ ] Step2 node --test tests/knowledge-health.test.ts，确认新汇总接口/旧文案造成失败。
- [ ] Step3 增加只读汇总与当前目录展示；删不可执行指令，原生WorkBuddy/ima/乐享保持未验证状态。知识页加搜索与长正文展开、明确确认当前内容入口；保存状态以API读回为准，不造同步实现。
- [ ] Step4 tests/typecheck/build；临时项目浏览器知识创建/搜索/确认/文件变更重新待确认、空态和错误反馈；公开状态不泄漏私有资料。
- [ ] Step5 独立审查通过后交付A，不提交。
