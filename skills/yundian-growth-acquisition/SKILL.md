---
name: yundian-growth-acquisition
description: 在WorkBuddy客户项目执行LinkedIn主动开发的买家筛选、联系人核验、个性化开发草稿和跟进计划。
---

# 主动获客 · LinkedIn

读取本地企业知识、产品机会、目标市场和买家画像，核对taskId/cycleId。当前主动获客聚焦LinkedIn，不包含Facebook报告、Google Ads报告或泛社媒获客菜单。

## 工作流程

1. 按市场、行业、采购场景、企业类型和决策角色形成ICP与实际查询词。区分公开检索、客户名单与已授权LinkedIn/Sales Navigator能力；不可用时明确缺口，不冒充已接入接口。
2. 基于实际可见企业页、职业资料和客户合法提供名单筛选目标，记录公司/联系人URL、来源日期、业务匹配、采购角色和待确认项。稳定leadId关联opportunityId、渠道LinkedIn及cycleId，去重不删除原始资料。
3. 官网/职业信息交叉核验，联系人当前任职、采购权限和需求分别记录；没有公开邮箱不编造，不以职位名推断采购意向。进一步主体风险交给客户背调技能。
4. 按真实公开信息和产品痛点写个性化连接备注、首条消息和跟进草稿；写价值与验证问题，不夸大案例或供货条件。输出联系人与文案逐条对应的真实文件。
5. 给跟进节奏、停止条件、客户负责人和反馈字段；不承诺回复率。不自动批量抓取、绕过平台限制、加好友或发消息。仅在用户实际授权、宿主工具及平台允许方式具备时执行，并记录真实回执；默认交付草稿与计划。
6. 实际回复、有效需求、拒绝或成交按leadId回流销售反馈，优化画像、产品和消息；名单或草稿存在不等于获客完成。

交付：ICP、查询/筛选依据、实际目标名单、证据与缺口、开发草稿、跟进计划。主技能submit_result.mjs回写实际报告待验收，缺少关键输入/工具记录needs-input/blocked。付费供应商未授权时不得伪造联系人或统计。

## 工作台模块契约（v0.13）

- 对应入口：主动获客 · LinkedIn（acquisition）；只负责本模块，跨模块工作交接到对应技能。
- 输入：目标市场、ICP、LinkedIn 来源/名单、产品资料、实际授权与跟进约束。
- 执行：筛选 LinkedIn 买家；核验公司和联系人关系；去重并建立 leadId；准备个性化连接/开发信草稿；制定跟进计划；只记录真实执行回执。
- 产物：买家清单、联系人核验、开发信草稿、跟进计划与实际触达记录。
- 验收：不能编造联系人、已发送状态或回复；不默认批量发送；不包含广告报告及泛社媒获客。
- 交接：按 leadId 向客户背调交接主体与来源，向销售反馈交接真实触达记录。

存在工作台任务时，核对 taskId/stage/cycleId，将真实产物保存为 Markdown，再用项目 .codebuddy/skills/yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 参数回写；脚本设为待验收，不代替客户验收。缺输入或权限时回写 needs-input/blocked 及原因。没有任务ID时独立执行并报告实际文件路径，不能虚构任务。

本入口继续兼容 LinkedIn 主动开发；邮件开发请使用 ../yundian-growth-email-outreach/SKILL.md，社媒运营及付费广告使用各自独立技能。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。

## CRM 私有任务契约
仅使用任务 inputSnapshot 中 crmLeadId/currentLead/company/contacts/source/外部 sourceLeadId/followups 与实际 task/artifact 引用。crmLeadId 为本工作区稳定 ID，外部 sourceLeadId 不改写。opportunityId 只指真实产品机会，不能填任务 ID。输出明确当前客户、线索、来源、证据日期、已核实/未知事实；缺失姓名、联系方式保持未知，不自动提取联系人或创建公司。背调/LinkedIn/邮件输出是核验或草稿，不代表实际发送。销售结果、反馈关联、去重和 won 必须客户确认；不要自动生成真实反馈。客户联系人不得进入公开知识、咨询分享或发布正文，跨客户禁止取用。
