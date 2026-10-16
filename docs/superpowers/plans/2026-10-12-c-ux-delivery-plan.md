# C：UI/UX与第一批交付验收 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新手路径、反馈、键盘与响应式可用，交付技能与应用有完整验证记录。
**Architecture:** 复用既有UI，用小组件统一反馈与表单行为；任务仍由WorkBuddy执行，验收与运行状态分离。
**Tech Stack:** Node.js22.18+ / browser modules / Playwright fallback when Browser plugin absent。
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

web/ui/feedback.js：等待/失败/成功；web/ui/dialog.js：焦点与未保存关闭；web/views/onboarding.js：三步首次使用。不增加前端大框架。scripts/verify-optimization-browser.mjs是隔离浏览器验证；docs/optimization-acceptance.zh-CN.md是实际交付证据。

### Task C1：新手路径与一致交互

**Files:** Create web/ui/feedback.js、web/ui/dialog.js、web/views/onboarding.js、tests/optimization-ux.test.ts。Modify app-v03.js、web/views/workbench.js/knowledge.js/content-plan.js/crm-editor.js/crm.js、styles-v03.css、server.ts。
**Interfaces:** setFormBusy(form,boolean)、showFeedback(host,message,tone:'info'|'success'|'error')；bindDialogBehavior(element,{requestClose,restoreFocus,hasUnsavedChanges}):()=>void。onboardingState(state)→{project:'ready'|'missing',facts:'ready'|'missing',firstTask:'ready'|'created'|'needs-review',missing:string[]}；project以实际projectRoot/workspaceId为依据，不把填写projectRef当已连接；facts需要profile.company/products/markets/persona/goal填写及至少一份相关知识当前hash确认；firstTask只表示创建/等待，不表示执行完成。

- [ ] Step1 tests/browsercase“onboarding_and_preserved_edit”：空项目给正确三步，旧项目不覆盖；未安装/未核验不报执行；提交后读回才成功；冲突/401/失败保留内存表单并说明重新认证/核对，未经确认不自动重提交；取消未保存关闭保留输入；Esc/Tab/关闭焦点返回正确；未知发布只查询，不补发。
- [ ] Step2 跑tests观察缺少组件/状态造成失败，环境失败先定位。
- [ ] Step3 拆共享反馈和对话框行为，CRM使用分组中文字段与就地错误；保留旧事件和付费确认。知识长正文摘要/搜索、专家与内容预览按需打开；来源/安装/执行/回执状态一致。只有表格容器横向滚动，主页面不溢出；首页漏斗与定时同一行两列、窄屏单列。
- [ ] Step4 types/tests及真实浏览器两条新手路径：知识→创建任务/复制、客户→编辑/跟进/导出；1440、2560、3840、390。没有真实宿主时测试创建/复制/受控回写，明确宿主执行未验收。5位目标用户试用作为后续外部反馈任务，不编造结果或作为本地已通过证据。
- [ ] Step5 独立审查通过，记录剩余能力界限，不提交。

### Task C2：集成、打包与审阅交付

**Files:** Create tests/optimization-integration.test.ts、scripts/verify-optimization-browser.mjs、docs/optimization-acceptance.zh-CN.md。Modify README.md、docs/workbuddy-deployment.zh-CN.md、docs/module-workspace-guide.zh-CN.md、skills/yundian-growth-workbench/SKILL.md/references/WORKFLOWS.md、skills/yundian-growth-buyer-check/SKILL.md、skills/yundian-growth-sales-feedback/SKILL.md、scripts/package-skills.mjs（只必要适配）。
**Interfaces:** 消费A契约/知识健康、B名册/批次/查询/CSV、C1交互。任务共享receipt管线不变；官方技能仅提出带来源候选，名单确认/入库仍需客户。package版本0.15.0和既有技能版本暂不擅改，build标working-tree、published:false。

- [ ] Step1 integrationcase“knowledge_receipt_crm_export_restore”：临时客户知识→市场任务→真实文件回执与当前hash验收→候选客户确认→完整记录+真实名册关联→跟进/阶段→导出与销售反馈→下一轮；新名册、旧owner/SEO/GEO/MD/bin/发布不可变历史备份恢复独立目的目录；损坏/跨scope恢复失败树与字节不变。先写新能力尚不完整的红灯。
- [ ] Step2 实施最小接线和文档/技能同步，校验生成/开源两路径一致。普通快照范围及客户定制另备说明清楚；第一批不声称已修复第二批外部产物备份扩展。保留订单外部已发布事实。
- [ ] Step3 npm run check:ui、typecheck、npm test、build、package:skills。17独立+1总包18ZIP，CRC/SHA与源码字节一致，LF稳定，无客户/密钥；官方quick_validate逐技能。若依赖缺失只用隔离临时环境，不改产品依赖来绕过验收。
- [ ] Step4 编译server.js实际HTTP/Browser：初始化、登录/401、知识、名册/CRM完整流程、导出、漏斗、更新冲突、失败恢复。原客户目录不写测试；8767现有服务保留或核验身份后更新，新空白预览单独端口，不停止不明进程。实测文件/脚本/退出码/截图保存，缺供应商能力写明未验证。
- [ ] Step5 C任务独立审查后全分支最强审查；修复重要问题与复审。保存可审阅差异和交付指南，用户选择合并/push/部署后再执行。没授权不提交、不删除现有工作树或客户资料。
