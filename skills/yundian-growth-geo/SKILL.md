---
name: yundian-growth-geo
description: Use when preparing or reviewing GEO work for B2B acquisition with evidence and actual authorization.
---

# GEO

## 输入
企业事实及来源、目标买家问题、站点页面、目标AI搜索产品和可重复观察条件。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
将认证、规格、适用场景、交期等事实连接可追溯来源；整理买家比较/应用/采购问题，建立简明回答与证据链接。检查正文可访问性、来源日期、作者与实体一致性，结构化数据须匹配可见内容。按指定AI搜索产品、日期、地区、账号条件记录实际回答及引用 URL，多次观察区分波动；未观察不写已被引用。制定基线/改动/复查实验，同时检查搜索可索引与片段资格。Google官方说明现有SEO基础仍适用，不要求特殊AI schema，不保证AI引用。

## 输出
事实卡、问题到证据映射、引用观察表及优化实验。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
事实与推断分开；引用记录附条件和实际证据；优化计划不冒充AI收录。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://developers.google.com/search/docs/appearance/ai-features（2026-10-08检查；执行前核对最新页面和具体平台条件）。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
