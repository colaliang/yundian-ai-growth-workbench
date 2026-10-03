---
name: yundian-growth-workbench
description: 在 WorkBuddy 客户项目中初始化知识库、定义和执行获客工作流，保存真实任务产物；也用于按配套规格搭建获客工作台。
---

# WorkBuddy 客户自定义工作台

服务跨境 B2B 外贸工厂和跨境卖家，固定主线：市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮。客户自主定制每步流程与工具，由 WorkBuddy 执行；不按顾问交付定位，也不泛化为无边界办公工作台。

## 首次调用：先建立知识库

1. 读取当前项目规则，确认 WorkBuddy 项目及授权工作目录。没有原生项目时指导客户从“项目”创建；有工具能力才实际创建并读取验证。不要把技能目录作为客户数据目录。
2. 使用原生项目资料库；按需要关联团队空间。只记录实际取得的名称、链接或标识。缺少宿主操作工具时说明客户端操作路径并保持待关联，不能宣称云端空间创建完成。
3. 在客户授权目录运行 `python <技能目录>/scripts/init_workspace.py --root <项目目录>`。没有 Python 时按同样结构创建文件，不安装依赖或覆盖已有知识。读取生成的 `growth-workspace/workspace.json` 和 `knowledge/00-index.md`。
4. 将客户提供的资料整理到知识库，登记文件/URL、日期、审核状态，保留原文件。优先记录主体、产品/服务、目标、市场、画像、品牌和禁止事项；缺失信息询问或标记待补充，禁止编造。
5. 默认保留并使用 WorkBuddy 本地项目知识，不强制上传。客户选择原生项目资料库、ima或腾讯乐享时，按知识技能的外部来源规范授权并验证；不能将本地文件创建等同云端索引完成。

安装不会自动执行本流程；首次启用必须先执行。每次业务任务先检查本地知识是否足够；原生或云端绑定未完成不阻塞使用已确认的本地知识，缺少任务必需资料时先补足。独立文件任务可使用客户明确提供的输入，说明当前原生关联状态。

## 定义与执行工作

客户提出目标后读取 [工作流规范](references/WORKFLOWS.md)。保持七步获客主线，允许客户自定义各阶段的目标、渠道、步骤、工具和输出，先保存定义，再执行真实工具操作。根据现有业务选择切入阶段，已有站点无需重建。WorkBuddy 对话是主入口，不需要自建模拟大模型聊天。

任务记录 cycleId、stage、上游产物、输入来源、状态、产物路径、执行结果和失败原因；用稳定 leadId 将线索、背调和销售反馈关联。没有销售反馈时标记待反馈，不宣布一轮闭环已完成。产物必须写入并读回；缺少工具、权限或证据时标记 blocked/needs-input，不填充模拟结果。结束更新知识索引；事实审核与任务完成分开记录。

外部发布、发信、采购按客户实际授权执行。广告仅只读报告及官方后台跳转。供应商密钥留在宿主授权或安全凭据中，不写入知识文件。已有授权无需反复确认，未知能力不冒充已接入。

## 搭建或调整 UI

仅在客户要求开发界面时读取 [BUILD_BRIEF.md](references/BUILD_BRIEF.md)。沿用现有代码和客户选择，先检查目录与修改状态。交付需区分实际实现、验证结果和未实现项，不将静态预览称为原生集成。

## 功能技能路由

每个阶段必须读取并调用 配套 registry.json 中的对应技能（项目安装后为 .codebuddy/skills/registry.json）（安装后位于项目 .codebuddy/skills/）。知识库使用 yundian-growth-knowledge；九个业务阶段各自对应独立业务技能。不能只生成指令而宣称已经执行。执行实际工作后调用 scripts/submit_result.mjs 回写文件与状态，待客户验收。安装或使用状态与供应商连接器授权分别说明。

## v0.10 功能拆分

建站与内容拆为建站（保留site-and-content标识兼容历史）、SEO与GEO（seo-geo）、内容运营（content-operations）；获客改为主动获客（acquisition），聚焦LinkedIn主动开发，不包含Facebook/Google Ads报告及泛社媒获客。分别调用registry.json中的对应技能。七步业务闭环不变，页面把其中一阶段拆为三个工作入口；已有任务不删除。

## v0.13 模块分工

统筹技能负责首次初始化、客户工作流定义、技能路由和任务回写。企业知识库与九个业务模块的输入、执行步骤、产物、验收和交接见配套 registry.json；执行业务必须读取对应独立技能。增长总览/工作产物/项目设置由本技能维护，不代替业务执行。工作台使用 Node.js 22.18+：npm start -- --root <客户项目目录> --port 8767；Python仅保留技能辅助脚本和旧后端回退。

独立安装统筹技能时，读取 references/MODULES.json 获取功能路由；该文件只用于发现技能，不代表对应业务技能已经安装。项目已有 .codebuddy/skills/registry.json 时优先读取项目注册表。缺少对应技能则安装其独立包，不能用统筹技能假装完成业务执行。

## WorkBuddy 直接操作工作台

使用开源代码工作台时，无需手动复制网页任务：调用仓库 scripts/workbench.mjs。state 读取真实状态；save 使用 --action 和 --payload <客户目录内的JSON文件> 复用后端校验，支持 profile、knowledge、task、record、audit-create、audit-item、feedback、install-skills、artifact、review。review 仅在客户已给出明确验收依据时调用。缺失资料不填造数据。CLI 与网页不要同时写入同一客户目录；先完成单次操作再刷新网页，并可传 --revision 检测旧状态。

node <工作台代码目录>/scripts/workbench.mjs --root <客户目录> --command state

node <工作台代码目录>/scripts/workbench.mjs --root <客户目录> --command save --action task --payload <客户目录内的任务JSON>

生成自己的工作台时可复用这些接口；只安装技能时不能假设已安装工作台代码。独立 Node.js submit_result.mjs 无需工作台代码或 Python 即可回写已有任务。
