---
name: yundian-growth-google-ads
description: Use when preparing or reviewing Google Ads work for B2B acquisition with evidence and actual authorization.
---

# Google Ads

## 输入
目标国家语言、关键词/搜索词、账户导出、落地页、转化目标与预算限制。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
核对时区、币种、日期、归因窗口及主要/次要转化；用实际触发测试和导出核实追踪、重复转化与离线合格线索口径。按采购意图分组关键词、匹配类型与否词，检查真实搜索词及地域/语言/网络流量；广告承诺与落地页事实一致。分析花费、点击、转化、CPA及合格率，零/缺失/延迟转化分开；Smart Bidding依赖转化追踪，样本和目标不可靠时先解决测量而非直接切策略。制定创意、落地页或出价实验与停止标准，避免多变量同时修改；默认分析/草稿，实际预算与投放仅在工具可用且明确授权后执行并读回。

## 输出
关键词/否词表、账户结构、广告草稿、追踪审计与效果报告。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
关键词和效果有导出依据；缺追踪不宣称优化有效；方案与账户已变更分开。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://support.google.com/google-ads/answer/7065882（2026-10-08检查；执行前核对最新页面和具体平台条件）。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
