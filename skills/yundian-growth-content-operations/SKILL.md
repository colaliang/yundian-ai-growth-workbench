---
name: yundian-growth-content-operations
description: 在WorkBuddy客户项目执行获客内容选题、制作、发布计划与效果复盘，使用企业事实及实际反馈。
---

# 内容运营

读取本地企业/品牌/产品知识、市场调研、产品机会和目标画像，核对taskId、cycleId、输入及验收标准。围绕采购问题定义内容目标、渠道、语言、选题、格式和日程。

生成真实内容文件：选题表、页面/博客/FAQ/社媒或视频脚本、依据引用、素材需求和发布计划。使用确认的规格、政策、案例和品牌规则，不虚构评论、资质、客户项目或效率数据。已有素材保留版本，去重并检查公开范围。

SEO/GEO验收交给yundian-growth-seo-geo技能，建站实施交给建站技能。内容发布计划不等于已发布；客户授权且工具实际可用时才发布并保存回执、公开URL和读回。缺少发布工具可交付真实草稿，注明未发布。

效果复盘按实际渠道/统计/销售反馈，记录时间窗、来源和缺失项，不能由内容生成数量推断获客增长。产物保存到客户项目，使用主技能submit_result.mjs回写待验收或阻塞原因；不自动外发或采购。

## 工作台模块契约（v0.13）

- 对应入口：内容运营（content-operations）；只负责本模块，跨模块工作交接到对应技能。
- 输入：品牌事实、买家问题、内容渠道/语言、素材、选题及实际效果数据。
- 执行：形成选题；制作并核验内容；制定发布计划；有实际授权和工具时发布并读回；按时间窗复盘。
- 产物：选题表、真实草稿/素材、发布计划、实际回执及效果复盘。
- 验收：草稿与已发布分开；公开声明有依据；效果有来源，不以生成数量代替获客结果。
- 交接：向 SEO与GEO 交接内容验收；向主动获客交接产品资料与沟通素材。

存在工作台任务时，核对 taskId/stage/cycleId，将真实产物保存为 Markdown，再用项目 .codebuddy/skills/yundian-growth-workbench/scripts/submit_result.mjs 的 --root、--task、--file 参数回写；脚本设为待验收，不代替客户验收。缺输入或权限时回写 needs-input/blocked 及原因。没有任务ID时独立执行并报告实际文件路径，不能虚构任务。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
## 结构化内容计划与发布回执

生成 content-plan.json：schemaVersion=1、当前 workspaceId、items；每项包含 title、text、productRef、language、contentType、channelIds、remoteMediaIds、assetRefs、plannedAt（ISO UTC 或 null）、timezone（IANA）、cycleId、sourceTaskId。稳定 ID 只用于已存在项；保存到客户 growth-workspace/artifacts 并通过真实主技能 submit_result 回写来源任务。由工作台导入预览及冲突确认录入，不直接写 content-items，不覆盖客户编辑。

本技能生成草稿与排期计划。客户在发布面板选择当前账号实际渠道和媒体、保存并批准当前摘要，再确认正文、素材、时间与数值积分预算；只有后端提交的真实逐渠道回执能证明发布。API Key 不得写入指令、剪贴板、产物、浏览器状态或备份。未配置密钥/预算仍可生成本地计划。

回执保留 itemId、attemptId、contentHash、postId、逐渠道状态、公开 URL、预留积分；actualCredits=null 表示供应商未提供实际扣费。unknown/partial/pending/scheduled 不算全部发布；只刷新 get_post，不自动重发，编辑不会取消旧排期。回执归属来源 task.stage，内容来源留在内容项目；仅真实 social-media 来源任务进入社媒成果。content-items/publish-attempts/publish-confirmations 已纳入普通备份，服务器私密配置须独立保护。
