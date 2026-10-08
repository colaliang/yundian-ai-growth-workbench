---
name: yundian-growth-facebook-ads
description: Use when preparing or reviewing Facebook广告 work for B2B acquisition with evidence and actual authorization.
---

# Facebook广告

## 输入
账户导出、时区币种、业务目标、落地页、创意、事件与归因设置、预算授权。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
先核对数据时间窗、币种、账户/campaign/adset/ad层级和归因窗口；检查目标、转化事件与B2B合格线索定义，核实Pixel/Conversions API去重与实际测试证据，不能由事件名称推定追踪正确。按买家需求组织受众、创意角度、落地页与询盘表单；避免碎片化样本造成误判。分析花费、展示、点击、CTR、CPC、线索与合格率，区分平台线索成本和CRM销售质量；记录学习状态，重大变更可能影响学习，不硬编码平台阈值。提出单变量测试、停止标准和预算上限；默认只读方案，账户编辑/投放/预算需逐项授权及真实工具，读回变更回执。

## 输出
广告结构/创意方案、事件核验表、效果报告与实验计划。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
无转化证据保持待验证；未知指标不补零；报告列分母及归因窗口；没有授权不投放。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://www.facebook.com/business/help/112167992830700（2026-10-08检查；执行前核对最新页面和具体平台条件）。
Meta帮助页本次访问被登录/自动化限制阻挡，学习阶段具体阈值未核验；不依据二手文章设置固定阈值。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
