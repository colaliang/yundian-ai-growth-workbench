# 云店+ AI Growth Workbench

面向跨境 B2B 外贸工厂和跨境卖家的开源获客工作台与 WorkBuddy 技能包。客户可以**通过技能生成自己的工作台**，也可以**直接使用开源工作台，并按业务需要扩展优化**。

**市场调研 → 产品机会 → 建站与内容 → 主动获客 → 客户背调 → 销售反馈 → 优化下一轮**

工作台管理知识、任务、产物和反馈；WorkBuddy 执行实际技能与工具操作。默认空白项目，客户定义目标、步骤和验收规则。

## 两种使用方式

| 路径 | 适合谁 | 如何开始 |
|---|---|---|
| 技能生成自定义工作台 | 希望按自己的业务、品牌和流程搭建 | 安装统筹与所需功能技能，在 WorkBuddy 项目中提供需求，生成并验证实际代码 |
| 直接使用开源工作台 | 希望先使用现成能力，再逐步修改 | 下载或克隆项目，一键本地启动，再安装项目技能 |

两条路径共用企业知识库、十个功能技能及任务回写契约。客户可以修改界面、增加模块、定制工作流或接入已授权工具；新增能力应同步定义输入、产物、验收与回写方式。

## 路径一：通过技能生成自定义工作台

1. 下载[完整技能包](dist/yundian-growth-skills-v0.13.zip)，或从[独立技能包目录](dist/skills-v0.13/)选择技能。
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

## 路径二：直接使用开源工作台

先安装 **Node.js 22.18+**。工作台运行使用内置模块，无需安装 npm 依赖。技能中的部分初始化、结果回写辅助脚本需要 Python 3.10+。

从 GitHub 下载 ZIP 并解压，或克隆项目：

```powershell
git clone https://github.com/colaliang/yundian-ai-growth-workbench.git
cd yundian-ai-growth-workbench
```

### 一键本地启动

**Windows：双击项目根目录的 `start-workbench.cmd`。** 首次自动创建 `customer-data/default/` 客户目录，初始化工作台文件并尝试打开浏览器。

**Windows / macOS / Linux：**

```sh
npm run setup
```

使用自己已有的客户项目目录：

```powershell
npm run setup -- --root "D:\MyCustomerProject" --port 8767
```

`--root` 指定的目录必须已存在且获授权。默认端口为 8767；端口被占用时改用其他端口。无桌面环境可追加 `--no-open`。启动入口不自动安装 Node.js 或 Python，不自动更新客户技能。

打开 http://127.0.0.1:8767/，关闭启动进程即可停止服务。首次启动后：

1. 填写企业知识、产品、目标市场和来源。
2. 在“项目与设置”安装项目技能；客户已有同名定制技能时保留，不覆盖。
3. 在对应模块创建任务，复制指令到 WorkBuddy 当前项目执行。
4. 保存真实产物并刷新工作台，记录客户验收和销售反馈。

只需启动服务、不打开浏览器时，也可运行：

```powershell
npm start -- --root "D:\MyCustomerProject" --port 8767
```

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

技能文件安装、宿主加载和外部工具授权是不同状态。页面不直接调用大模型，不能把复制任务指令当作执行完成。`submit_result.py` 将实际产物回写为待验收；客户验收后才完成任务，产物改变会使旧验收失效。

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
