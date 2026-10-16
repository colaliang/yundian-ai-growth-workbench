# 云店+工作台第一批优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成设计第一批P0及UI/UX，形成真实可用、可审阅的CRM和技能一致性交付。
**Architecture:** A公共界面/知识 → B CRM → C UX与集成，按相邻接口顺序实施，独立任务审查。不整体替换架构或覆盖既有客户数据。
**Tech Stack:** Node22.18+、TypeScript、原生浏览器模块、文件客户空间。
**Spec:** docs/superpowers/specs/2026-10-12-workbench-optimization-design.md（含UI/UX，用户已确认）。

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

## 实施单元与顺序

1. A：docs/superpowers/plans/2026-10-12-a-ui-knowledge-consistency-plan.md，A1/A2。
2. B：docs/superpowers/plans/2026-10-12-b-crm-complete-plan.md，B1/B2/B3。
3. C：docs/superpowers/plans/2026-10-12-c-ux-delivery-plan.md，C1/C2。

共7项任务。用户此前明确选择过子代理分工实施与独立审查，本计划建议沿用；先请用户审阅书面计划确认范围，之后才进入实施。

每项新实现者与独立审查者，不并行写共享文件；C完成后全分支审查。报告/基线写当前计划隔离记录，压缩后按ledger恢复，不重复已通过任务。开始时保留现有UI未提交状态，并做基线/字节记录。不要使用reset/clean掩盖用户已有工作。

## 依赖矩阵

|产出|消费者|共享边界|
|---|---|---|
|A1契约/生成|A2、C1、C2|主导航、静态白名单、技能建设规则|
|A2知识健康|C1、C2|state.knowledgeHealth/旧kbCheck兼容|
|B1名册|B2、B3、C2|crm-members、ownerMemberId、迁移/摘要/恢复|
|B2批次|B3、C1、C2|lead-records API与保存/冲突读回|
|B3查询/CSV/表单|C1、C2|同源筛选投影、导出范围、表单状态|
|C1统一反馈|C2|键盘、空态、错误、未保存保护|

## 保留的第二、三批

性能索引/后端分页、实体并发与崩溃事务、本地自动备份/外部产物覆盖、认证稳定实例配置、CI、知识分类及附件治理，按已确认设计第二批继续形成计划。真实WorkBuddy成员接口/原生调度、在线备份与发布供应商验收按第三批真实能力和授权推进；第一批不宣称这些已接通。

## 自审记录

- Spec3.1/3.2 → A1/A2；3.3/3.4 → B2/B3；3.5 → B3；3.6 → B1；3.7 UI/UX → A2/B3/C1；3.8交付 → C2。
- review五类失效均在对应任务有明确测试；JS生成模块静态入口由所在任务接线，不依赖人工遗漏。
- ownerMemberId缺省兼容老数据；名册停用可保留历史关系，但新指派拒绝；共享编辑和导出用服务端真实数据。
- 单元A/B/C的接口名字与前置定义一致；代码正文不放入计划，写具体函数签名/用例/验收命令。
- 五位外部用户试用及供应商验收不能在本地模拟完成；阻塞第三批时仍完成其他已授权工作。
- 计划仅实现第一批，第二/三批明确保留；不擅自合并、推送、tag或付费调用。
