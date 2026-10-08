---
name: yundian-growth-seo
description: Use when preparing or reviewing SEO work for B2B acquisition with evidence and actual authorization.
---

# SEO

## 输入
站点 URL、平台、访问权限、关键词、Search Console 导出与企业事实。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
先确定 Shopify / WordPress / 其他站点；读取 ../yundian-growth-seo-geo/references/checklist.json 及该目录已有标准，保留38/26项适用范围。检查抓取、robots、canonical、索引、重定向、移动可用性与站内链接；逐页匹配搜索意图，核实标题、正文、结构化数据是否与可见事实一致。用 Search Console 实际时间窗分解展示/点击/CTR与查询，不将流量下降直接归因为技术缺陷。列修复优先级、负责人、证据、复查日期；获授权修改后复查原 URL；不可访问保持待验证。

## 输出
技术审计、关键词到页面映射、修复台账与复查证据。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
通过项须URL或读回证据；不适用给理由；索引、排名、转化分别记录，不承诺排名。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide（2026-10-08检查；执行前核对最新页面和具体平台条件）。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
