# 云店+ AI Growth Workbench

面向跨境 B2B 外贸工厂和跨境卖家的开源获客工作台与 WorkBuddy 技能包。客户可以**通过技能生成自己的工作台**，也可以**直接使用开源工作台，并按业务需要扩展优化**。

**市场调研 → 产品机会 → 建站与内容 → 主动获客 → 客户背调 → 销售反馈 → 优化下一轮**

工作台管理知识、任务、产物和反馈；WorkBuddy 执行实际技能与工具操作。默认空白项目，客户定义目标、步骤和验收规则。

## 两种使用方式

| 路径 | 适合谁 | 如何开始 |
|---|---|---|
| 技能生成自定义工作台 | 希望按自己的业务、品牌和流程搭建 | 安装统筹与所需功能技能，在 WorkBuddy 项目中提供需求，生成并验证实际代码 |
| 直接使用开源工作台 | 希望先使用现成能力，再逐步修改 | 在 WorkBuddy 项目中发送部署指令，由 WorkBuddy 自动获取、配置、启动并验证 |

两条路径共用企业知识库、十个功能技能及任务回写契约。客户可以修改界面、增加模块、定制工作流或接入已授权工具；新增能力应同步定义输入、产物、验收与回写方式。

## 路径一：通过技能生成自定义工作台

1. 下载[完整技能包](dist/yundian-growth-skills-v0.14.zip)，或从[独立技能包目录](dist/skills-v0.14/)选择技能。
2. 在 WorkBuddy 导入 `yundian-growth-workbench` 统筹技能及所需业务技能；总包不被客户端识别时，分别导入独立包。
3. 创建或选择自己的 WorkBuddy 项目，先整理企业知识库。原生空间关联依赖客户端实际可用能力，不把本地文件创建当作云端关联完成。
4. 提供需求并要求生成代码、启动和验证。例如：

```text
使用 yundian-growth-workbench 和对应功能技能，为当前项目生成客户自定义获客工作台。
先建立企业、品牌、产品、市场和买家画像知识库，保留来源与缺口。
以云店+开源工作台为基础，保留知识库和九个业务模块，按我的业务调整品牌、字段和工作流。
采用 Node.js + TypeScript，数据保存到我指定的本地项目目录。
每个业务模块调用对应技能，保存真实任务、产物、验收和销售反馈。
提供一键本地启动入口，实际启动并检查页面、文件持久化及任务回写。
不能模拟工具接入或执行结果；缺少权限或资料时标记待补充。
```

技能是搭建与执行规范，不是已生成的应用。实际结果取决于客户需求、宿主工具与授权；生成后需要检查运行和数据回写。

## 路径二：通过 WorkBuddy 自动使用开源工作台

在 WorkBuddy 当前项目中发送以下指令，后续获取代码、检查运行环境、初始化目录、安装项目技能、启动服务和验证均由 WorkBuddy 自动完成。客户无需手动克隆、解压、执行命令或点击安装按钮；后续扩展优化也直接在 WorkBuddy 对话中提出。

```text
请自动部署并启动云店+开源获客工作台：
https://github.com/colaliang/yundian-ai-growth-workbench.git

以当前 WorkBuddy 项目为客户工作空间，自动完成以下工作：
1. 检查当前项目规则、授权目录和已有文件。将工作台代码放在独立子目录，保留已有客户资料；已有仓库有本地修改时不覆盖。
2. 自动获取开源项目，检查 Node.js 22.18+ 及技能辅助脚本所需的 Python 3.10+。缺少运行环境时，在实际授权范围内使用可用安装方式准备；无法完成时说明具体缺口，不要求我逐项手动执行部署命令。
3. 使用当前项目的客户目录保存数据，自动初始化知识库，整理现有企业、品牌、产品、市场和买家资料，保留真实来源。缺失资料标记待补充，不编造。
4. 自动安装统筹技能及十个功能技能到当前项目 .codebuddy/skills/，保留客户已有定制技能；内容冲突时记录缺口，不强制覆盖。
5. 自动选择可用的本地端口，用项目启动入口运行工作台并打开或提供访问地址。服务保持运行，不能只生成命令或静态预览。
6. 核验页面、知识库读回和技能路由；使用隔离测试目录验证任务保存与产物回写，不向客户数据写入测试记录。
7. 返回实际访问地址、客户数据目录、启动状态和未完成项。后续根据我的要求直接扩展界面、字段、技能和工作流。
```

WorkBuddy 在同一轮任务中完成可执行的准备、部署与验证，不把常规安装和启动步骤交给客户。只有宿主强制授权、必要凭据或无法从项目取得的业务资料需要客户补充；缺少这些条件时如实报告，不宣称已自动完成。

工作台的一键启动入口供 WorkBuddy 调用：`npm run setup -- --root <客户项目目录> --port <可用端口>`；无桌面环境追加 `--no-open`。该入口负责初始化文件和启动服务，运行环境准备及技能安装由 WorkBuddy 按项目实际情况完成。

部署后，客户继续在 WorkBuddy 中提出业务目标，由对应技能创建或读取任务、执行实际工作、保存产物并回写。网页用于查看进度、资料和验收，不需要客户反复复制命令。业务事实、必要授权和客户验收仍由客户提供；WorkBuddy 不能代填成交结果或验收结论。

### 腾讯云部署状态

目前支持的是**一键本地初始化与启动**。腾讯云公网一键部署尚未实现：需要先接入持久化数据库、对象存储、客户认证与空间隔离，并建立 WorkBuddy 本地任务连接层。当前后端仅监听本机，不能直接作为公网多客户服务。详见[云端扩展方案](docs/cloud-deployment.zh-CN.md)。

## 工作台与技能分工

统筹技能负责初始化、路由、工作流定义及任务回写；企业知识库与九个业务模块各有独立技能。

| 工作台入口 | 对应技能 | 主要工作 |
|---|---|---|
| 企业知识库 | `yundian-growth-knowledge` | 企业事实、来源、审核、资料缺口 |
| 市场调研 | `yundian-growth-market-research` | 需求、竞争、市场与买家研究 |
| 产品机会 | `yundian-growth-product-opportunity` | 潜在爆款、机会评分、风险与验证 |
| 建站 | `yundian-growth-site-and-content` | AI建站、Shopify、WordPress；保留旧ID兼容 |
| SEO与GEO | `yundian-growth-seo-geo` | SEO/GEO/AEO、Shopify38项与WordPress26项验收 |
| 内容运营 | `yundian-growth-content-operations` | 选题、制作、发布计划与效果复盘 |
| 主动获客 | `yundian-growth-acquisition` | LinkedIn买家筛选、联系人核验、草稿与跟进 |
| 客户背调 | `yundian-growth-buyer-check` | 主体、联系人关系、采购匹配与风险 |
| 销售反馈 | `yundian-growth-sales-feedback` | 真实联系、报价、成交或拒绝信息 |
| 优化下一轮 | `yundian-growth-next-cycle` | 反馈驱动的改进与下一轮任务 |

[模块契约](docs/skill-modules.zh-CN.md)列明输入、执行步骤、产物、验收及交接。增长总览、工作产物和项目设置由统筹技能维护。新任务预填模块要求，客户可修改；提示字段不代表实际数据。

技能文件安装、宿主加载和外部工具授权是不同状态。页面不直接调用大模型，不能把复制任务指令当作执行完成。`submit_result.mjs` 将实际产物回写为待验收；客户验收后才完成任务，产物改变会使旧验收失效。

## 知识库与数据

以客户项目 `growth-workspace/knowledge/` 为主要知识库，覆盖组织、品牌、产品、站点、市场、画像、CRM/线索、社媒、统计与增长动作。初始化只补缺文件，保留已有资料。原始证据、审核状态、公开范围与任务使用范围应可追溯。

ima、腾讯乐享和其他工具可按需扩展，使用宿主实际可用且已授权的能力。目前没有独立云端知识库API客户端，不自动上传或双向同步。详见[知识技能](skills/yundian-growth-knowledge/SKILL.md)及[外部来源规范](skills/yundian-growth-knowledge/references/EXTERNAL_SOURCES.md)。

客户数据保存于授权项目目录；不同客户使用独立目录。不要把 `growth-workspace/`、`customer-data/` 或凭据提交到 Git。文件版提供单进程版本冲突检查和单文件原子替换，不提供多人租户隔离。Python旧后端暂供回退；不得与 Node.js 后端同时写入同一目录。

当前提供真实资料、任务、产物、台账、验收与反馈管理。模型和外部工作由 WorkBuddy 执行；供应商API、实际发信、发布与采购依赖客户授权及工具配置。主动获客默认聚焦 LinkedIn；不包含广告投放操作。

## 扩展与开发

- 修改界面：`app-v03.js`、`styles-v03.css`、`index.html`。
- 修改后端：`server.ts`；保持任务、状态、数据和回写兼容。
- 扩展技能：在 `skills/` 添加或更新技能，并维护 `skills/registry.json`；新增阶段还需同步后端阶段、前端导航和初始化结构。
- 修改后验证真实文件读写、技能路由和产物验收；不要用静态预览代替功能验证。

```sh
npm ci
npm run typecheck
npm test
python -m unittest discover -s tests -v
node --check app-v03.js
```

Node.js回归测试中包含 Python 技能回写兼容检查，因此运行完整测试需要 Python。客户运行工作台本身不需要安装开发依赖。

## 关于云店+与搞跨境的可乐哥

[云店+官网](https://www.ydjia.com/zh)专注 B2B 外贸企业的建站与数字营销，围绕公域引流、独立站承接和私域转化提供出海服务。业务包括 AI建站、WordPress定制建站、SEO/GEO、Google Ads、Facebook/TikTok 社媒营销、内容与数据分析；工作台统一规划 Shopify独立站等建站路径。

“搞跨境的可乐哥”（Cola）是云店+的跨境外贸营销实践者与内容分享者。按[官网介绍](https://www.ydjia.com/zh)，拥有10年以上跨境电商与外贸实战经验，专注 AI+B2B独立站及营销推广。本项目将线上获客经验沉淀为可复用、可定制的技能与工作流。业务服务介绍不表示开源项目已经自动接入相关平台。

## 文档与许可

[项目规划](docs/project-plan.zh-CN.md) · [统筹技能](skills/yundian-growth-workbench/SKILL.md) · [技能分工](docs/skill-modules.zh-CN.md) · [部署准备](docs/cloud-deployment.zh-CN.md)

代码与技能采用 [MIT License](LICENSE)。云店+名称与logo遵守[品牌说明](BRANDING.md)。欢迎提交 Issue、Pull Request，或 Fork 后针对自己的客户业务扩展。

## WorkBuddy 自动操作接口（v0.14）

WorkBuddy 可使用 scripts/workbench.mjs 直接读取状态、安装技能、创建任务、保存业务记录/知识/验收台账与销售反馈；各动作复用后端校验。任务产物可由独立 submit_result.mjs 回写，不再依赖 Python。CLI 不执行模型、不直接发送 LinkedIn 消息；执行实际业务仍由宿主完成。操作应串行进行，避免与网页同时写入；完整测试仍包含旧 Python 兼容检查。

```sh
node scripts/workbench.mjs --root <客户目录> --command state
node scripts/workbench.mjs --root <客户目录> --command save --action install-skills
node scripts/workbench.mjs --root <客户目录> --command save --action task --payload <客户目录内的任务JSON文件>
```

[实现核对与后续方向](docs/implementation-review.zh-CN.md)逐项说明当前真实功能及外部执行边界。
