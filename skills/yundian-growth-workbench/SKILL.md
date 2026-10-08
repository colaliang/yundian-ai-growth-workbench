---
name: yundian-growth-workbench
description: 在 WorkBuddy 客户项目初始化本地知识、路由全域获客技能、保存真实任务回执与验收反馈；按客户要求生成或调整获客工作台。
---

# WorkBuddy 客户获客工作台

服务跨境B2B工厂与跨境卖家。固定业务主线：市场调研→产品机会→建站与内容→获客→背调→销售反馈→下一轮。客户定义目标与流程，WorkBuddy执行实际工作，工作台记录知识、指令、成果及验收。

## 先建立客户知识

读取项目规则、实际 WorkBuddy 项目与授权客户目录，优先本地知识。使用工作台代码时以 `scripts/workbench.mjs --root <客户目录> --command state` 初始化并读回；仅独立安装技能时可用 `scripts/init_workspace.py`（Python辅助），没有Python按同样结构只补缺文件。客户数据在指定项目 `growth-workspace/`，不能写入官方技能目录。知识整理保留来源、日期、审核及公开范围，资料不足标明缺口。

原生项目/资料库/空间仅在宿主工具实际创建并读回后登记已关联；本地文件不等于上传或云端索引。ima/腾讯乐享等按知识技能 references/EXTERNAL_SOURCES.md 实际授权核验，默认不上传。

## 路由与业务闭环

读取项目 `.codebuddy/skills/registry.json`，独立安装时读 [MODULES.json](references/MODULES.json)。后者只用于发现，不表示其他技能已安装。当前覆盖知识库、市场研究、产品机会、建站、SEO、GEO、内容运营、社媒、Facebook广告、Google Ads、LinkedIn主动开发、邮件开发、背调、销售反馈及增长复盘。历史seo-geo、site-and-content标识保留，不删除旧批次。

实际业务必须读取对应技能入口，选择官方或客户定制版本。不存在技能不能假装执行。安装预检所有文件，同名不同内容保留客户版；按包manifest比较版本/SHA-256，新官方内容先在独立版本目录暂存，报告差异和更新指令，不覆盖定制注册表或文件。

读取 [WORKFLOWS.md](references/WORKFLOWS.md) 定义输入、步骤、工具、产物和验收。任务包含taskId/workspaceId、skillId/skillVersion、输入快照及cycleId。复制指令仅表示ready。缺工具/授权保持needs-input，实际执行通过回执登记。保存真实文件和结构化receipt后读回，进入needs-review；客户按当前artifactId和contentHash验收才完成。文件改变使旧验收失效，重跑创建新批次。leadId和源cycleId连接真实销售反馈及下一轮，不用预测冒充成交。

发送、发布、广告编辑和预算修改须实际客户授权及工具，保存真实回执；没有工具只做方案/草稿并记录未执行。禁止填造联系人、效果、宿主任务和认证。

## 调度、备份和构建

定时配置和宿主创建分开。当前 command-only 无可核验原生create/pause/verify API，只生成指令；手填hostTaskId不代表已启用。实际执行另记录宿主证据、计划时间与产物，外部动作失败不得自动重试。

本地快照真实可用，恢复先备份现状、校验客户空间及文件哈希，冲突保留双方。在线备份默认关闭，无认证隔离存储提供者不能启用。公共监听不是私有托管，不把客户资料放入公开演示。

客户要求开发界面时读 [BUILD_BRIEF.md](references/BUILD_BRIEF.md)，检查当前代码及改动后实施。WorkBuddy自动获取/准备环境/启动/验证，不把命令生成当部署。Node.js22.18+；Python仅旧辅助/兼容路径。整个TS图编译并保留server.js入口，ZIP标明工作树及manifest版本，不提前发布。

## 真实操作接口

使用仓库 `scripts/workbench.mjs --root <客户目录> --command state`，create-task/receipt/review/knowledge-confirm 使用目录内JSON `--payload`，`--revision`检查冲突。save支持profile/knowledge/feedback/install-skills/daily-create等后端动作，串行操作避免网页同时写。review须客户实际验收依据。

独立脚本 `scripts/submit_result.mjs --root <客户目录> --task <taskId> --file <真实文件>`读回既有任务，待验收；失败用needs-input及实际原因。只装技能不能假定已安装工作台代码或客户端已加载。真实WorkBuddy加载、原生定时、实际客户执行与在线隔离备份均须单独现场验收。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。仅旧版无工作台元数据且非定时的未终结任务保留独立回写。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。
