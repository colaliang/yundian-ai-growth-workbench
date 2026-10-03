# 云店+ AI Growth Workbench

客户自主使用的 WorkBuddy 获客工作台与技能包。面向跨境 B2B 外贸工厂和跨境卖家。

**市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮**

客户定制各阶段目标、渠道、工具和验收标准，简化版直接利用 WorkBuddy 执行。默认空白项目，无虚构客户或模拟执行数据。

## 关于云店+与搞跨境的可乐哥

[云店+官网](https://www.ydjia.com/zh)专注 B2B 外贸企业的建站与数字营销，围绕公域引流、独立站承接和私域转化提供出海业务服务。业务包括 AI建站、WordPress定制建站、SEO/GEO、Google Ads、Facebook/TikTok 社媒营销、内容与数据分析；本项目还统一规划 Shopify独立站等建站路径。

“搞跨境的可乐哥”（Cola）是云店+的跨境外贸营销实践者与内容分享者。按[官网介绍](https://www.ydjia.com/zh)，拥有10年以上跨境电商与外贸实战经验，专注 AI+B2B独立站建设及营销推广，擅长 AI建站、WordPress、SEO、Google Ads、Facebook营销与数据分析。本项目将这些线上获客经验沉淀为客户可重复使用和定制的技能、工作流与知识结构。业务服务介绍不表示开源工作台已自动接入广告投放或第三方付费工具。

## 快速启动

需要 Python 3.10+，服务端使用标准库，无需安装依赖。

```powershell
git clone https://github.com/colaliang/yundian-ai-growth-workbench.git
cd yundian-ai-growth-workbench
# 请先创建或选择你自己的客户项目目录
python server.py --root "D:\MyCustomerProject" --port 8767
```

打开 http://127.0.0.1:8767/ 。macOS/Linux 也可运行，使用 python3 和实际目录路径。--root 必须是已存在且获授权的目录。首次启动会生成 growth-workspace/；先填写企业知识，再创建阶段任务。

## 技能安装与 WorkBuddy

- 下载 [完整技能包 ZIP](dist/yundian-growth-skills-v0.10.zip) 并按 WorkBuddy 的技能导入方式安装。
- 在工作台“项目与设置”点击“安装项目技能”，将主技能及八个功能技能写入客户项目 .codebuddy/skills/；同名已有不同内容时拒绝覆盖。也可手工复制技能目录。完整ZIP包含多个技能目录，客户端只支持单技能导入时请分别导入对应目录。
- 在 WorkBuddy 当前项目首次调用：**初始化我的获客工作台，先创建企业知识库并关联当前项目资料。**
- 在网页任务详情复制 WorkBuddy 指令，交给原生项目对话执行。实际产物写入约定文件后刷新工作台可读回；也可在页面保存实际产物内容。客户填写验收依据后完成任务。

技能安装不会自动执行初始化。原生项目、资料库和空间关联需要 WorkBuddy 实际可用功能；录入名称或链接不代表关联已完成。

## 当前能力

七阶段导航、企业知识与来源录入、自定义任务与流程、项目文件保存、WorkBuddy任务指令、产物读回、客户验收、销售反馈。产物改变后旧验收失效。提供请求令牌、版本冲突检查与单文件原子替换。

仅监听本机127.0.0.1，不是公网/多人服务。不同客户使用独立目录；不提供账号租户隔离。不要把客户数据、凭据或 growth-workspace/ 上传到仓库。广告仅只读分析；当前不包含模型后台直连、供应商API接入、自动发信或发布。真实外部执行依赖客户授权和工具配置。

## 文档与检查

[规划方案](docs/project-plan.zh-CN.md) · [技能说明](skills/yundian-growth-workbench/SKILL.md)

```powershell
python -m unittest discover -s tests -v
node --check app-v03.js
```

## 开源许可

代码与技能采用 [MIT License](LICENSE)。云店+名称与logo为品牌标识，使用须遵守 [品牌说明](BRANDING.md)。欢迎通过 Issue 和 Pull Request 反馈改进。

## 真实技能绑定

企业知识库与七个阶段分别绑定专用技能，任务保存 skillId 与实际技能路径。页面显示“待安装 / 项目文件已安装 / 版本不同”，这只说明文件存在，不声称 WorkBuddy 已载入或执行。任务指令要求读取对应SKILL.md并使用实际工具；主技能 submit_result.py 负责可验证回写。供应商API仍须另外配置授权。

| 功能 | 专用技能 |
|---|---|
| 企业知识库 | `yundian-growth-knowledge` |
| 市场调研 | `yundian-growth-market-research` |
| 产品机会 | `yundian-growth-product-opportunity` |
| 建站与内容 | `yundian-growth-site-and-content` |
| 获客 | `yundian-growth-acquisition` |
| 客户背调 | `yundian-growth-buyer-check` |
| 销售反馈 | `yundian-growth-sales-feedback` |
| 优化下一轮 | `yundian-growth-next-cycle` |

## 企业知识库：WorkBuddy本地优先

默认以客户项目 growth-workspace/knowledge/ 为主要知识库，无需开通云端服务。初始化覆盖 Organization、Brand Profile、产品、站点、目标市场、买家画像、CRM/线索、社媒、统计及增长动作；重复运行只补缺文件。事实按来源、日期、审核、公开范围及品牌/市场使用，企业资料不依附WordPress。

ima与腾讯乐享作为按需扩展，使用WorkBuddy宿主实际授权能力；不自动上传、全量缓存或双向同步。本仓库尚未提供独立云端API客户端。详见[知识技能](skills/yundian-growth-knowledge/SKILL.md)与[扩展来源规范](skills/yundian-growth-knowledge/references/EXTERNAL_SOURCES.md)。

## 市场调研技能 v0.6

支持快速出海诊断与深度调研，包含资产盘点、市场/贸易需求、国内及目标市场竞品、可比价格、画像、渠道与90/180天计划。报告产物按证据和待验证项交接至后续七步闭环。方法根据客户提供的 B2B调研技能包重新适配，不包含其联合署名、私人联系人、固定收费升级或效果承诺。

## 产品机会技能 v0.7

支持现有产品筛选和新机会发现，按B2B主推产品/跨境卖家潜在爆款分别分析。候选绑定市场、买家和实际来源，评分同时显示证据覆盖与缺口，输出价格成本情景、风险门槛、小规模验证及下游内容/获客交接。机会不是销量或利润保证，实际销售反馈用于下一轮修订。

## 客户背调技能 v0.8

支持Facebook表单、截图、CSV/Excel、网站询盘和主动开发线索，分别核验主体、联系人关系、采购匹配、需求与风险。按采购场景形成有依据的跟进优先级，保留未知和重复候选；提供三部分报告规范及按宿主能力生成Excel的验收要求，并衔接leadId、产品机会及销售反馈。

## SEO/GEO/AEO技能 v0.9

独立技能绑定建站与内容中的SEO/GEO/AEO任务，包含Shopify 38项及WordPress 26项原条款映射。生成待验证台账，逐项填证据、责任人、整改和复查；技术通过与收录/AI引用/转化观察分开，平台历史规则列差异待确认。

## v0.10 导航与技能

建站、SEO与GEO、内容运营为独立入口；主动获客聚焦LinkedIn买家/联系人筛选、个性化草稿及跟进，删除原Facebook报告、Google Ads报告、社媒获客入口。旧任务ID与记录保留。新增内容运营技能并同步主技能路由。LinkedIn实际查询/发送依赖客户授权与可用工具，不模拟接口接入。

## v0.11 工作功能
各阶段支持真实业务记录、来源和结果保存，并能据此创建对应技能任务。SEO与GEO支持完整38/26项台账及逐项证据、责任人、整改和复查，缺少证据拒绝标通过。所有数据保存在客户项目文件，实际模型与外部工具执行仍由WorkBuddy宿主完成。

