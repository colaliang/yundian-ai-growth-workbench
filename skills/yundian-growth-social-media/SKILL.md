---
name: yundian-growth-social-media
description: Use when preparing or reviewing 社媒运营 work for B2B acquisition with evidence and actual authorization.
---

# 社媒运营

## 输入
平台/账号、买家画像、品牌事实、素材授权、发布范围与实际统计。缺少必需资料时说明实际缺口，不能用示例冒充客户事实。

## 工作流程
按买家活跃平台和采购问题选择渠道；区分自然运营与付费广告。建立主题、格式、语言、CTA、承接页面与负责人日历；同一素材按平台规格和受众重写，核对版权及商业声明。先交付可审阅草稿；实际发布需可用账号工具和明确授权，回读公开链接或平台postId及时间；工具失败先核实回执，避免重复发布。用固定时间窗记录曝光、互动、点击及可识别询盘，说明统计口径与跨渠道归因局限；互动不等于销售线索。

## 输出
渠道方案、内容日历、平台适配稿、发布回执与复盘。报告保留 taskId、leadId/机会标识（适用时）、来源 URL/文件、来源日期、事实/假设、未执行项与下一步。

## 验收
计划、草稿、已发布状态分开；无发布回执不得已发布；询盘与互动分别计数。

## 任务回写
存在任务时读取实际任务文件，核对 taskId、skillId、skillVersion、workspaceId 与输入快照；按复制指令中的真实目录保存 Markdown 报告及附件索引，再使用已安装的 yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 回写待验收。受阻使用 --status needs-input --reason。独立使用而没有任务编号时报告实际路径，不虚构任务。宿主加载或外部执行未验证须明确说明。

## 官方来源
- https://www.facebook.com/business/help/（2026-10-08检查；执行前核对最新页面和具体平台条件）。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
