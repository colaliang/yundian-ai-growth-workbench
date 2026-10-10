---
name: yundian-growth-email-outreach
description: Use when preparing or reviewing 邮件开发 work for B2B acquisition with evidence and actual authorization.
---

# 邮件开发

## 输入
名单来源/用途、公司与联系人、买家匹配、产品证据、发送域名准备及触达授权。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
核验公司/联系人关系、地址来源和适用发送要求，去重并关联leadId；未知邮箱不猜测可达。按采购场景设计短主题、事实依据、单一CTA和节奏，避免伪造双方关系、认证或客户案例。检查发送域SPF/DKIM/DMARC、退订及抑制名单等适用要求，以发送系统实际检查为证据；Gmail官方要求按发送量和消息类型判断，不把营销批量规则泛化为所有一对一邮件。默认只产草稿；实际发送核实范围、账号工具和授权，保存messageId/时间/收件主体，模糊失败先查回执不得重复发送。复盘送达、退信、回复、正向回复、退订与合格线索，打开率受隐私影响不能视作采购意图。

## 输出
名单核验、个性化邮件/跟进序列、发送准备清单与执行复盘。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
未授权不发送；不存在回执不写已发送；退订停止触达；未知送达与回复保持未知。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://support.google.com/mail/answer/81126（2026-10-08检查；执行前核对最新页面和具体平台条件）。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。

## CRM 私有任务契约
仅使用任务 inputSnapshot 中 crmLeadId/currentLead/company/contacts/source/外部 sourceLeadId/followups 与实际 task/artifact 引用。crmLeadId 为本工作区稳定 ID，外部 sourceLeadId 不改写。opportunityId 只指真实产品机会，不能填任务 ID。输出明确当前客户、线索、来源、证据日期、已核实/未知事实；缺失姓名、联系方式保持未知，不自动提取联系人或创建公司。背调/LinkedIn/邮件输出是核验或草稿，不代表实际发送。销售结果、反馈关联、去重和 won 必须客户确认；不要自动生成真实反馈。客户联系人不得进入公开知识、咨询分享或发布正文，跨客户禁止取用。
