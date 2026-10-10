# 工作台模块优化实施总计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 实现已确认的项目化工作台、直接发布和CRM中本计划对应的交付单元。
**Architecture:** 按A→B→C三个可独立验收单元推进，避免导航、发布副作用和CRM同时混改。三个计划共用已确认设计及客户数据边界。
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

## 计划文件
1. [A：项目化导航与项目内成果](2026-10-09-a-module-navigation-plan.md) —— 3项任务。
2. [B：内容选题排期与直接发布](2026-10-09-b-content-publishing-plan.md) —— 5项任务。
3. [C：客户CRM与最终集成](2026-10-09-c-customer-crm-plan.md) —— 3项任务。

共11项实现任务，每项红绿验证后独立规格/质量审查。记录进度到本计划专属SDD ledger；不要再派发上轮已完成的9项任务。

## Review Focus
- A源码/编译/静态图同步；旧stage、成果与路由迁移。
- B公网认证和密钥边界；余额、额度、确认和未知结果。
- B先持久化意图与去重；部分成功禁止全渠道重发。
- C稳定ID、客户隔离、历史反馈和到期跟进。
- 全部新记录的revision、备份预检、技能契约及源码/ZIP一致性。

## 依赖与执行裁决
- A先完成，B1保护公开实例；C领域测试可以不依赖真实发布账号，但上线CRM必须完成B1。
- 社媒项目只读核对；本轮不修改SocialMedia服务，不创建不存在的APIKey上传接口。
- 首轮媒体支持已上传远端库；本地图片未关联mediaId时明确待上传，提供工具上传入口。
- API Key与数值额度由客户在产品配置时提供；缺少它们不是本地代码交付阻塞，只是实际线上发布不能验收。
- 认证是消费积分和存储客户信息的必要访问控制，不引入多租户账号系统。
- 既有main已新增云草稿/SDK功能：保持WorkBuddy专业执行主线，不依赖这些功能实现发布；保留必要云存储/唤醒兼容，不以匿名云存储承载新增私有CRM。
- 版本号/提交/远端push/公网部署需要交付阶段授权；之前一次“提交到main”不自动授权本轮未审查的产品发布。

## 执行前检查
- [ ] 重新核验main最新Git状态、根/仓库AGENTS和本地修改；保留presentation-outline与已运行8783预览。
- [ ] 读取本轮设计及A/B/C计划，建立新隔离工作树和ledger，记录基线测试/构建证据。
- [ ] 建立共享接口清单；每个后续代理收到任务简报、前序实际接口及审查记录，不继承整个会话。
- [ ] 不在计划阶段安装产品依赖、修改产品代码、创建CRM或提交真实帖子。

## 计划自查
设计1–3节→A；4–5节→B；6节→C1/C2；7节→A1/B1/B2/B4/C1；8节→B5/C2/C3；9节→各任务测试及C3；10节→本总计划。
名词/ID统一为ModuleDefinition.id、ContentItem.id、PublishAttempt.remotePostId、CrmLead.id及FeedbackLink.crmLeadId；provider原始字段在adapter转换，不能越层假定。
目前无占位凭据、默认付费或自动外部操作；单次和日额度初始为0。新的错误页和401不能被误当休眠而无限重试。

## 审阅与后续
用户确认本实施计划后，按此前已选的子代理方式开始A，再按独立审查结果推进B/C；不再重新询问执行方式。实施过程中保持具体阶段进度，遇到权限或真实外部操作缺口如实记录，不停在普通实施选择上。
