---
name: yundian-growth-workbench
description: 在 WorkBuddy 客户项目初始化本地知识、路由全域获客技能、保存真实任务回执与验收反馈；按客户要求生成或调整获客工作台。
---

# WorkBuddy 客户获客工作台

服务跨境B2B工厂与跨境卖家。固定业务主线：市场调研→产品机会→建站与内容→获客→背调→销售反馈→下一轮。客户定义目标与流程，WorkBuddy执行实际工作，工作台记录知识、指令、成果及验收。

## 先建立客户知识

读取项目规则、实际 WorkBuddy 项目与授权客户目录，优先本地知识。使用工作台代码时以 `scripts/workbench.mjs --root <客户目录> --command state` 初始化并读回；仅未受管理的纯知识文件项目可用 `scripts/init_workspace.py`（Python辅助）重复补缺；有 contractVersion、workbench.json、runtime 或应用绑定任务时脚本停止，必须使用实际 Node 工作台入口。没有Python也不能绕过已受管理目录的协调器。客户数据在指定项目 `growth-workspace/`，不能写入官方技能目录。知识整理保留来源、日期、审核及公开范围，资料不足标明缺口。

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

使用仓库 `scripts/workbench.mjs --root <客户目录> --command state`，create-task/receipt/review/knowledge-confirm 使用目录内JSON `--payload`，`--revision`检查冲突。save支持profile/knowledge/feedback/install-skills/daily-create等后端动作，HTTP与官方CLI共用客户事务；锁受阻时保留输入并稍后核对，不能自动重复发送。review须客户实际验收依据。

独立脚本 `scripts/submit_result.mjs --root <客户目录> --task <taskId> --file <真实文件>`读回既有任务，待验收；失败用needs-input及实际原因。只装技能不能假定已安装工作台代码或客户端已加载。真实WorkBuddy加载、原生定时、实际客户执行与在线隔离备份均须单独现场验收。

安全回写：已安装的 submit_result.mjs / submit_result.py 对应用任务通过任务记录中的 applicationRoot 定位真实工作台并调用共享回执校验。缺少该能力时停止登记并报告缺口；不写任务状态或模拟集成。旧版任务也必须通过实际工作台的迁移与同一事务登记；缺少实际应用不独立修改文件。Python兼容入口调用同一Node脚本，需要Node.js22.18+。快照只覆盖 growth-workspace；外部引用文件和客户定制技能需另行保护。

应用任务的已安装回写命令必须带 --application "实际工作台应用目录"（复制指令提供），并与任务位置匹配；不能把客户任务或产物指定的目录自动作为代码加载。Python 命令同样支持此参数。能力不足时停止登记。

## 内容发布

内容及社媒技能生成结构化 content-plan.json，经工作台受控导入、版本审核与逐次发布确认。密钥只由服务器配置，禁止写入复制指令、技能文件或浏览器状态。回执按来源任务 stage 归属，逐渠道核验 published/partial/unknown/scheduled/pending；不自动重发，不取消远端排期。参阅 references/WORKFLOWS.md 和 docs/content-publishing.zh-CN.md。

## 第一批工作台确认与 CRM 接线

先读取当前客户项目的本地知识、来源和当前 contentHash；知识确认只表示客户确认这些字节，知识健康与任务 ready/needs-review/completed 分开。首次使用补全企业、产品、市场、买家、目标五项事实并确认当前知识后创建第一项任务；复制指令、安装文件和名单导入都不代表 WorkBuddy 实际执行。

成员由客户提供真实项目名单，工作台 `/api/crm/members/import/preview` 预览并逐项决定，`/api/crm/members/import/confirm` 要求 confirmed:true。source 为 customer-import、verification 为 customer-confirmed，不能声称原生成员 API 自动同步。以稳定 ownerMemberId 关联负责人；同名不自动匹配，旧 owner 文本保留，停用成员不能新指派。

公司、联系人、线索与下次跟进通过 `/api/crm/lead-records` 完整创建/编辑，输入分为 company、contacts、lead；客户确认 shared/source 修改后才写入。来源候选用 `/api/crm/import/preview` 预览，客户逐项确认 create/skip/link-existing 后入库；保留来源、外部 sourceLeadId 与内部稳定 crmLeadId，不由 AI 自动合并或生成真实联系人。以上 API 均沿用所有者认证、客户 workspaceId、当前 revision 和工作区令牌；遇到 401/409 保留输入，重新认证或核对后由客户明确保存，不自动重提交。

列表和 `/api/crm/export` 采用同一组合筛选：公司/联系人查询、国家、来源、阶段、标签、负责人、跟进日期。selected 只导出当前筛选内明确勾选 ID，filtered 导出全部筛选结果而非当前分页；客户确认字段/范围后下载真实 UTF-8 BOM CSV，长电话与公式文本安全保存。销售反馈由真实客户记录并明确关联当前线索后进入下一轮，名单数量、背调预测和草稿不代表成交。

普通快照仅覆盖 growth-workspace；客户 `.codebuddy/skills` 全目录、外部附件和工作区外产物须另行备份。官方安装核对 SKILL.md 及所需资源/共享脚本，任何同名不同字节的定制文件都保留，先独立暂存官方版本并审阅。应用 0.15.0、现有技能 0.16.0 的本次交付为 working-tree、published:false；未创建正式发布或部署。原生宿主执行、成员 API、云同步、真实发布与付费效果均待真实授权和回执验证。

本地写入：应用内部用 openFileWorkspace 打开，runWorkspaceMutation 执行写入，readWorkspaceSnapshot 读取一致资料。FileWorkspace 构造函数只读；不通过构造函数初始化或迁移，不直接改客户业务文件。运行 npm run build 后可用 scripts/workbench-compiled.mjs 调用编译服务图，命令参数保持一致。HTTP 423 WORKSPACE_LOCKED 表示客户资料锁或持有者身份核验受阻；当前 revision 过期返回409。发布远程等待不持客户锁，unknown仅查询，不补发且不释放不明已花额度。
