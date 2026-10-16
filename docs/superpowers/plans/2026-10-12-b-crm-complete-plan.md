# B：CRM完整业务操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完整新增与编辑、真实成员指派、共同筛选及范围明确的安全CSV导出。
**Architecture:** 扩展现有CRM实体和预检，不压扁Company/Contact/Lead；服务端批次保存、共同纯查询投影、受控名册导入。
**Tech Stack:** Node.js22.18+ / TypeScript / file workspace / browser modules。
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

src/crm/members.ts：名单及指派；src/crm/lead-record.ts：批次新增/编辑；src/crm/query.ts：同源筛选投影；src/crm/export.ts：CSV安全编码；web/views/crm-editor.js：分组表单；web/views/crm-members.js：名册预览；web/crm-query.js：构建生成的浏览器查询代码。现有crm.js仍为协调入口。

### Task B1：真实名单与负责人关联

**Files:** Create src/crm/members.ts、tests/crm-members.test.ts。Modify src/crm/contracts.ts/validation.ts/service.ts、server.ts、src/storage/migrate.ts、src/backup/service.ts、src/storage/publication-path.ts。
**Interfaces:** CrmMember={id,workspaceId,createdAt,updatedAt,archivedAt,name,externalMemberId:string|null,projectRef:string,source:'customer-import',verification:'customer-confirmed',active:boolean,role:string|null,confirmedAt:string}。crm-members纳入crmFamilies；Lead新增可缺省ownerMemberId:string|null，旧无该字段记录继续可读不反写。MemberService(store).preview(rows,projectRef)→{id,items,errors,conflicts}；confirm(previewId,decisions,confirmed:true)→CrmMember[]；setActive(id,active)→CrmMember。决策create/keep/update，update必须明确existingId且同workspace。GET /api/crm/members与POST members/import/preview、members/import/confirm、members/:id/status受保护；state.crm.members返回真实名单。

- [ ] Step1 tests“roster_scope_legacy_and_inactive”：同名不猜ID；旧owner原字节保留；错scope/伪造host-verified拒绝；重复外部ID+projectRef提示，不自动合并；只有name的重复须人工选择；停用不删除已有归属，不能新指派；非法导入/恢复失败原树不变。
- [ ] Step2 node --test tests/crm-members.test.ts验证红灯。
- [ ] Step3 实现纯客户确认名单，无虚构WorkBuddy同步。更新摘要、迁移、路径、FK及备份，允许旧Lead缺ownerMemberId；保留owner显示快照。普通客户输入不能设置verification、workspaceId、内部ID或confirmedAt。preview捕捉基线，期间名单变化确认拒绝；全批预检。
- [ ] Step4 测试/typecheck/build和实际HTTP401/跨scope/预览确认/停用读回；备份恢复到独立目录。此名单不提供用户登录/ACL。
- [ ] Step5 独立审查后进入B2，无提交。

### Task B2：统一新增与完整编辑的服务端批次

**Files:** Create src/crm/lead-record.ts、tests/crm-lead-record.test.ts。Modify src/crm/contracts.ts/service.ts/validation.ts、server.ts。
**Interfaces:** LeadRecordInput={company:{create:CompanyInput}|{id:string,patch?:Partial<CompanyInput>},contacts:({create:Omit<ContactInput,'companyId'>}|{id:string,patch?:Partial<ContactInput>})[],lead:Omit<LeadInput,'companyId'|'contactIds'> & {stage?:LeadStage,ownerMemberId?:string|null},nextFollowUpAt?:string|null,confirmedSharedChanges?:boolean,confirmedSourceChanges?:boolean}。编辑leadId由路由提供。LeadRecordService(store).create(input)与update(leadId,input)→{company,contacts,lead,followup?:CrmFollowUp}。POST /api/crm/lead-records、PATCH /api/crm/lead-records/:id；保持token/workspace/revision预检，冲突返回409供前端保留输入。旧单实体API兼容。

- [ ] Step1 tests“full_record_atomic_shared_and_source_preserved”：一次新建公司/联系人/线索完整读回；复用已有公司不改字节；联系人跨公司拒绝；共享字段修改未经确认拒绝；中途第二次put模拟异常时所有原文件恢复且新增撤回；源task/feedback/createdAt/leadId保留；成员无效/停用的新指派拒绝、保持旧指派可编辑其他字段。
- [ ] Step2 node --test tests/crm-lead-record.test.ts确认尚无批次接口失败。
- [ ] Step3 实现规范化及全部关系预检，统一提交jobs、异常回滚。成员名由服务端解析，旧文本不匹配名单。创建初始new；客户选择其他当前阶段时留下客户确认记录与记录时间，不填过去日期或补跳过阶段。公司与联系人内部ID、lead.companyId/contactIds由服务器解析生成，不让新建表单猜测尚不存在的ID。nextFollowUpAt表单标明Asia/Shanghai，墙上时间显式+08:00转ISO，不依赖浏览器操作系统时区；保存为明确的客户计划记录，不造已联系事实。更正来源需要客户确认，并追加sourceLinks保留原source/sourceLeadId及确认时间，不改稳定leadId或旧任务。编辑共享字段对影响范围提示并检查确认。
- [ ] Step4 单测/HTTP/types/build；两窗口陈旧revision返回冲突，后台数据不覆盖。进程被杀后的事务恢复属于第二批，不把异常回滚宣称为跨进程事务。
- [ ] Step5 独立审查后进入B3，不提交。

### Task B3：共同筛选、CSV与完整CRM界面

**Files:** Create src/crm/query.ts、src/crm/export.ts、web/views/crm-editor.js、web/views/crm-members.js、web/crm-query.js、tests/crm-query-export.test.ts、scripts/verify-crm-complete-browser.mjs。Modify web/views/crm.js、web/views/workbench.js、styles-v03.css、scripts/build.mjs、server.ts。
**Interfaces:** projectCrmRows(data:{companies,contacts,leads,followups,members},filter:CrmLeadFilter,now:number):CrmRow[]；扩展source/tag/createdFrom/createdTo/nextFollowUpFrom/nextFollowUpTo/verificationStatus/ownerMemberId，保留旧query/country/stage/owner/due/archived。日期按Asia/Shanghai结束日整日；verificationStatus为至少一个当前联系人匹配。筛选范围改变清除原选择，跨页选择在同一范围保留；selected IDs与当前筛选不一致时提示重新选择而非悄悄省略。构建将纯query编译到web/crm-query.js，同一逻辑用于浏览器列表和服务器导出。
exportCrmCsv(rows:CrmRow[],fields:CrmExportField[]):string，BOM+CRLF，允许字段companyName/contactName/country/industry/website/stage/tags/source/ownerName/email/phone/whatsapp/linkedin/createdAt/nextFollowUpAt；不默认含私密跟进内容。POST /api/crm/export {workspaceId,revision,mode:'selected'|'filtered',filter,ids?:string[],fields}。范围基于当前服务端数据、最大10000行；超限明确提示分批，不截断冒充完整。返回text/csv和安全固定下载文件名。
mountCrmEditor(host,{record,members,crm,onSave,onCancel})与mountCrmMembers(host,{members,onPreview,onConfirm,onStatus})；用户操作调用B1/B2接口，不裸写文件。

- [ ] Step1 tests“query_export_exact_scope”：过滤与导出ID集相等，匹配超过20条全部导出而非当前页；多标签/联系人核实口径、上海跨日边界正确；selected未知/错scope拒绝；中文、引号、换行正确；长数字/电话保留文本；=+-@及前导空白/制表符等公式触发值加安全文本前缀，原存储不改；导出>10000拒绝；渲染所有客户文本转义。
- [ ] Step2 node --test tests/crm-query-export.test.ts确认缺少共同投影/导出能力失败。
- [ ] Step3 实现纯投影与CSV编码并生成浏览器模块，扩展静态白名单。统一分组表单、公司/联系人选择、共享字段影响提示、每行编辑按钮、名册导入预览及成员来源标签、多条件筛选/选择/明确导出对话框。分页和详情返回保留筛选；失配编辑保存给读回结果及当前筛选解释。CSV仅客户下载，不发供应商。
- [ ] Step4 tests/types/build和真实浏览器：完整新建/编辑→成员指派→跟进→组合筛选→跨页选中/全部结果下载→漏斗/旧反馈关联；1440/390无页面溢出，公共401，无真实付费请求。下载解析验证文件与UI数量，不以按钮存在为完成。
- [ ] Step5 独立审查通过后交付B，不提交。
