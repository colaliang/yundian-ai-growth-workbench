# 云店+外贸获客工作台

面向跨境 B2B 外贸工厂和跨境卖家的开源客户工作台。客户自主定制流程，WorkBuddy 执行实际技能与工具操作；工作台管理企业知识、任务、成果、验收与销售反馈。

**市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮**

本地客户独立目录是默认数据来源。网页提供工作台、企业知识库、获客技能、成果中心、专家与陪跑及设置；每日清单和定时计划按真实数据管理。网页不提供模型聊天或 AI 草稿调用。

## 路径一：由 WorkBuddy 技能生成自定义工作台

在自己的 WorkBuddy 项目发送：

```text
请自动获取 https://github.com/colaliang/yundian-ai-growth-workbench.git 的获客技能，读取统筹技能 yundian-growth-workbench 及配套 registry.json。
先检查当前项目规则、授权目录和已有定制，安装实际技能到本项目 .codebuddy/skills；冲突保留客户原文件，按 manifest 比较版本与 SHA-256，先在独立官方版本目录暂存再审阅合并。
为我的业务生成可运行的客户自定义获客工作台，以当前项目本地目录保存资料。先建立企业、品牌、产品、网站、市场、画像和来源知识库，资料不足标记待补充。
保留市场调研、产品机会、建站、SEO、GEO、内容运营、社媒运营、Facebook广告、Google Ads、LinkedIn主动开发、邮件开发、客户背调、销售反馈和增长复盘技能入口。
自动准备运行环境、生成代码并实际启动，检查页面、窄屏、真实文件持久化、回执与验收；隔离测试不写入我的客户数据。
复制指令只表示待执行，真实工具结果须文件回写、读回并待我验收；缺能力如实报告。
返回实际地址、客户目录、验证结果与未完成项，后续由 WorkBuddy 按我的要求扩展。
```

技能是执行和建设规范，生成的应用须独立验收。支持按需导入独立技能包或总包；客户端安装、加载、实际执行分别验证。

## 路径二：由 WorkBuddy 自动部署开源工作台

在自己的 WorkBuddy 项目发送：

```text
请自动部署并启动云店+开源获客工作台：
https://github.com/colaliang/yundian-ai-growth-workbench.git
1. 读取项目规则和已有文件，在独立代码子目录获取项目；保留本地修改、客户资料与定制技能。
2. 检查 Node.js 22.18+，在授权范围自动准备实际运行环境；Python 仅旧辅助脚本/兼容测试需要。缺少权限或凭据时报告具体缺口。
3. 使用当前客户项目目录初始化本地知识库，整理已有事实与来源，只补缺文件。原生 WorkBuddy 项目/资料库关联须宿主实际验证。
4. 读取 registry.json 安装统筹及业务技能；内容冲突保留原文件，按 manifest SHA-256 和版本生成差异及更新指令，不能强制覆盖。
5. 自动选择可用本地端口，调用 npm run setup -- --root <客户目录> --port <可用端口>，保持真实服务运行并打开或返回地址。
6. 检查页面、知识读回、技能路由；在隔离临时目录验证知识→任务→真实文件回执→验收→销售反馈→下一轮。不要在客户目录写测试数据。
7. 返回实际本地访问地址、客户数据目录、启动状态与未验证项。定时只保存配置，原生创建/暂停必须分别取得宿主验证；在线备份无认证隔离时保持关闭。
```

WorkBuddy 执行可用的安装、启动和检查步骤。宿主授权、必要凭据、未知业务事实须据实补充；无法访问宿主不等于已部署。详见[部署与现场验收](docs/workbuddy-deployment.zh-CN.md)。

## 技能与成果

企业知识库及14个业务入口共15个当前模块；保留历史 `seo-geo` 与 `site-and-content` 标识。技能目录提供官方版本、客户定制版本、用途、输入、成果和验收规则。完整注册表见 [registry.json](skills/registry.json)。

统筹技能路由业务工作。新批次保留 taskId、workspaceId、skillId/skillVersion、输入快照、cycleId 与成果路径。WorkBuddy 保存真实文件并提交结构化回执，后端校验目录、版本和任务；客户按当前文件哈希验收。文件变化使旧验收失效，重跑创建新批次。销售反馈以 leadId、cycleId 保存，下一轮建议保留源轮次关联。复制、安装、上传链接均不能冒充执行完成。

定时适配目前为 command-only：无可核验原生 API，未实现宿主创建、查询或暂停。用户手填 hostTaskId 不能变成已启用。在线备份默认关闭且暂无认证隔离存储提供者；本地快照、校验及冲突恢复真实可用，冲突保留双方文件。更新先检查本地改动、快照和技能差异，不自动覆盖。

## 本地运行、构建与技能包

```sh
npm ci
npm run setup -- --root <客户项目目录> --port 8767
npm test
npm run typecheck
npm run build
npm run package:skills
```

构建编译完整 `src/**/*.ts` 与 `server.ts`，入口保持 `server.js`；测试涵盖 `tests/*.test.ts`，兼容测试需要 Python。开发和验收指南见[迁移与能力边界](docs/migration-v2.zh-CN.md)。客户运行本地服务不需要开发依赖。

本次是 **0.15.0 工作树构建**，未创建发布。`dist/skills-working-tree/` 生成17个独立 ZIP、1个总包及 `manifest.json`；每项记录技能声明版本、SHA-256、文件清单与 working-tree 标记，技能0.16.0声明不表示工作台0.16.0已发布。构建后选择[完整技能包](dist/skills-working-tree/yundian-growth-skills-v0.15.0-working-tree.zip)或[独立包目录](dist/skills-working-tree/)。同名定制技能不会被安装覆盖；更新官方内容必须先比较和保留客户版本。

## 公网展示与私有客户数据

用户确认的[演示地址](https://yundian-growth-workbench.app.workbuddy.host/)仍为外部现有实例。本次没有部署或核验该地址运行当前工作树代码。

`scripts/serve-public.mjs` 仅提供公共监听模式，**不是经认证的客户私有托管**。请求令牌与路径校验不构成公网用户认证或多租户隔离。公开演示只用隔离空白/公开资料目录；客户名单、联系方式、知识、成果和凭据不得放入公共演示实例。腾讯云私有托管需另行验证认证、客户隔离、存储与备份。旧匿名云表 SQL 和网页模型入口不适用当前工作台。

## 云店+与搞跨境的可乐哥

[云店+](https://www.ydjia.com/zh)围绕公域引流、独立站承接与私域转化，提供 AI建站、WordPress定制建站、SEO/GEO、Google Ads、Facebook/TikTok 社媒营销及内容数据服务；本工作台也支持 Shopify 建站路径。

搞跨境的可乐哥（Cola）为已确认的专家入口，支持配置中已匹配模块，联系方式与服务范围见[专家配置](config/experts.json)。专家与陪跑标明付费属性，未虚构价格；免费技能持续可用。联系和服务官网不授予专家读取客户资料的权限，分享成果须客户主动选择。

## 数据与扩展

客户对象保存到指定项目 `growth-workspace/`，定制技能位于客户 `.codebuddy/skills/`；不同客户使用独立目录。不要提交客户数据和凭据，Python旧后端不得与 Node 后端同时写入同一目录。

前端组件在 `web/views/`，领域、调度、技能和备份代码在 `src/`；扩展入口维护 registry、真实技能、输入/产物/验收及回写契约。迁移前完整预检并备份，失败保留原字节与目录树。详见[迁移说明](docs/migration-v2.zh-CN.md)、[统筹技能](skills/yundian-growth-workbench/SKILL.md)。代码与技能采用 [MIT](LICENSE)，名称和logo遵守[品牌说明](BRANDING.md)。
