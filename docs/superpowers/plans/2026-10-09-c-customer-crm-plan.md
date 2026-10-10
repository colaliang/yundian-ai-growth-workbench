# C：客户CRM与最终集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 实现已确认的项目化工作台、直接发布和CRM中本计划对应的交付单元。
**Architecture:** 在客户工作区增加公司、联系人、线索和跟进记录，使用稳定ID链接已有背调与反馈。复用B的实例认证与安全存储；新实体纳入备份、每日清单与专业技能回写。
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

## 前置与类型
依赖A项目归属、B1私有访问门（C本地数据开发可独立测试，未完成认证不开放公网）。
src/crm/contracts.ts定义CrmCompany/CrmContact/CrmLead/CrmFollowUp，与设计字段一致。文件ID为32位hex；外部leadId保存在sourceLeadId，禁止用外部字符串当路径。新线索id即新流程稳定leadId；旧feedback.leadId原文不改，通过显式crmLeadId/FeedbackLink确认关联。
LeadStage='new'|'contacted'|'replied'|'qualified'|'quoted'|'negotiating'|'won'|'lost'；页面中文为新线索/已联系/有回复/有效需求/已报价/谈判中/已成交/已流失。
FeedbackLink={id:string,workspaceId:string,feedbackId:string,crmLeadId:string,confirmedAt:string}；只有实际已存在双方记录可确认。


补充输入类型：CompanyInput以name/source为必填，其他设计字段可选；ContactInput以companyId/source为必填，其余事实字段可缺失；LeadInput以companyId/source为必填，contactIds/sourceLeadId/opportunityId/owner可选，初始stage=new；LeadPatch仅允许stage/owner/标签/兴趣更新，stage写历史；FollowUpInput以leadId/time/方式/内容为必填，实际结果、下一步、nextFollowUpAt和来源成果可选。id/workspaceId/createdAt由服务端生成，不接受客户端跨空间指定。
CrmFilter={query?:string,country?:string,stage?:LeadStage,owner?:string,overdue?:boolean}。CrmImportPreview={id:string,workspaceId:string,candidates:{candidateId:string,company:CompanyInput,contacts:ContactInput[],lead:LeadInput}[],errors:{row:number,message:string}[],duplicates:{candidateId:string,existingLeadId:string}[]}；CrmImportDecision={candidateId:string,action:'create'|'skip'|'link-existing',existingLeadId?:string}。link-existing仅建立客户确认的来源关联，不覆盖已有客户字段。
## Review Focus
1. 导入外部leadId成为路径、跨workspace关联或孤儿company/contact（Task1）。
2. 同企业多个联系人被误合并、导入覆盖用户编辑（Task1、2）。
3. 跟进结果被模型假设为成交、旧feedback被重写（Task2）。
4. 到期日跨时区错误/每日推荐重复、备份恢复缺CRM记录（Task2、3）。
5. 客户资料经咨询链接/公网/发布正文意外外泄，ZIP带入客户文件（Task2、3）。

### Task 1: CRM持久化、关联与导入

**Files:** 新建src/crm/contracts.ts、src/crm/service.ts、tests/crm-store.test.ts；修改server.ts、src/backup/service.ts、src/storage/migrate.ts；目录crm-companies/crm-contacts/crm-leads/crm-followups/crm-feedback-links。
**Interfaces:** CrmService={listCompanies(filter:CrmFilter):CrmCompany[],createCompany(input:CompanyInput):CrmCompany,updateCompany(id:string,input:Partial<CompanyInput>):CrmCompany,createContact(input:ContactInput):CrmContact,updateContact(id:string,input:Partial<ContactInput>):CrmContact,archiveEntity(kind:'company'|'contact'|'lead',id:string):void,createLead(input:LeadInput):CrmLead,updateLead(id:string,input:LeadPatch):CrmLead,recordFollowUp(input:FollowUpInput):CrmFollowUp,previewImport(rows:unknown[]):CrmImportPreview,confirmImport(id:string,decisions:CrmImportDecision[]):CrmLead[]}；API /api/crm/companies、contacts、leads、followups、import/preview、import/confirm；所有CRUD需workspace/revision校验。

- [ ] **Step 1: 写失败测试。** 在tests/crm-store.test.ts验证：公司及联系人创建、更新、软归档读回；公司多联系人/来源/线索创建更新读回；跨客户/不存在company/contact拒绝且无写；非法外部ID不当文件名；官网域名和邮箱检测重复只提示不合并；错误行预览可定位，无部分导入覆盖原记录；历史备注保留。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/crm-store.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 公司、联系人、线索、跟进各自文件；contacts不能通过改companyId伪造新任职，新增关系需新记录与来源。PATCH公司/联系人及POST相应/:id/archive使用相同权限/revision检查；软归档保留关联历史，不级联删除；stage改变追加跟进事件，不能仅靠生成报告自动won。导入有固定schema、来源及客户确认，先全量校验再持久化；本轮不做OCR或自动群发。新增记录进入FileWorkspace.load/revision/备份完整预检。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。重载及备份恢复实际fixture，确认电话邮箱不出现在咨询或公开响应。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 2: CRM页面与业务闭环

**Files:** 新建web/views/crm.js、tests/crm-feedback.test.ts；修改web/main.js、app-v03.js、styles-v03.css、src/domain/daily-actions.ts、src/domain/delivery.ts；更新客户背调/销售反馈/LinkedIn/邮件技能。
**Interfaces:** linkFeedback(feedbackId:string,crmLeadId:string):FeedbackLink；crmLeadContext(id:string):{lead:CrmLead,company:CrmCompany,contacts:CrmContact[],followups:CrmFollowUp[],artifactIds:string[]}；dailyContext加入crmFollowUps；UI只对确有数据的关联展示链接。

- [ ] **Step 1: 写失败测试。** 在tests/crm-feedback.test.ts验证：已存在leadId正常关联；未匹配旧反馈列待关联，不创建虚构公司；多联系人/背调/真实销售反馈可打开来源；nextFollowUpAt到期进入每日任务，完成/归档不重复推荐；去重建议人工确认；字段escape安全网址过滤。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/crm-feedback.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 列表、详情、跟进时间线、筛选和到期视图；创建背调或开发任务带入当前leadId与来源，通过既有任务/receipt回写。跟进生成反馈引用须客户确认真实结果，FeedbackLink不改旧文件。客户联系人不自动进入公共知识或发布正文。只在CRM就绪后启用一级导航入口。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。实际浏览器新增→跟进→任务关联→反馈→到期提醒，以及未经认证公网拒绝和390px。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 3: 全量交付与技能打包

**Files:** 新建tests/module-content-crm-integration.test.ts、docs/module-workspace-guide.zh-CN.md；修改README.md、docs/workbuddy-deployment.zh-CN.md、skills/yundian-growth-workbench/references/MODULES.json/WORKFLOWS.md、scripts/package-skills.mjs（仅必要适配）、部署验收说明。
**Interfaces:** 消费A MODULES、B ContentService/PublisherPort和C CrmService；npm test包括全部*.test.ts，既有*.test.mjs单独或纳入同一自动测试入口；npm run build与package:skills；manifest/source/ZIP哈希一致。

- [ ] **Step 1: 写失败测试。** 在tests/module-content-crm-integration.test.ts验证：临时客户：技能任务→项目成果→内容计划批准→mock发布回执→CRM来源/跟进→销售反馈→下一轮；旧SEO/GEO和delivery数据仍可读；新增目录全部备份恢复；未认证/无预算/超时不假成功；包中无客户数据/密钥。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/module-content-crm-integration.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 保留README两条WorkBuddy自动搭建路径；把导航、项目内成果、媒体关联、CRM和owner认证写成可实际执行步骤。技能脚本继续使用共同receipt管线，不新增裸写状态捷径。新包先标未发布build，不提前改GitHubrelease。部署适配须保留9f87a7f唤醒行为，明确线上凭据及正式发布未验证时的缺口。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。完整测试/typecheck/build/包CRC与SHA、compiledserver实际浏览器桌面/390px。真实收费发布最后单独由客户确认内容/渠道/数值预算再验收。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

## C回滚与最终审查
备份新增CRM/内容/发布目录，回滚代码保留记录；旧版不会识别新实体，但不删除它们。线上已有发帖/排期属于外部事实，不因回滚代码宣称撤回。A/B/C均审查通过后，最强可用独立审查者完成跨模块审查，先处理重要问题再交付预览；用户选择提交/合并或部署之后才执行相应发布。
