# 云店+外贸获客工作台

面向跨境 B2B 外贸工厂和跨境卖家的开源客户工作台。客户自主定制流程，WorkBuddy 执行实际技能与工具操作；工作台管理企业知识、任务、成果、验收与销售反馈。

**市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮**

本地客户独立目录是默认数据来源。网页提供工作台、13个项目模块、客户CRM、企业知识库、获客技能及设置，成果在各项目内查看；每日清单和定时计划按真实数据管理。网页不提供模型聊天或 AI 草稿调用。

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

业务区包含13个项目模块，SEO与GEO项目统一展示历史seo-geo以及独立seo/geo三个执行阶段，共15个执行阶段；企业知识库、客户CRM、技能目录与设置是工作台公共入口；成果在各业务项目内查看。保留历史 `seo-geo` 与 `site-and-content` 标识。技能目录提供官方版本、客户定制版本、用途、输入、成果和验收规则。完整注册表见 [registry.json](skills/registry.json)。

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

构建编译完整 `src/**/*.ts` 与 `server.ts`，入口保持 `server.js`；统一测试涵盖 `tests/*.test.ts` 和 `tests/*.test.mjs`，兼容测试需要 Python。开发和验收指南见[迁移与能力边界](docs/migration-v2.zh-CN.md)。客户运行本地服务不需要开发依赖。

Linux 事务创建新目录需要在开发或镜像构建阶段执行 `npm run build:native`；`npm run build` 已包含此步骤。编译器仅构建时需要，运行包须包含目标平台辅助程序，详见[Linux 原子目录安装](docs/linux-directory-install.md)。

本次是 **0.15.0 工作树构建**，未创建发布。`dist/skills-working-tree/` 生成17个独立 ZIP、1个总包及 `manifest.json`；每项记录技能声明版本、SHA-256、文件清单与 working-tree 标记，技能0.16.0声明不表示工作台0.16.0已发布。构建后选择[完整技能包](dist/skills-working-tree/yundian-growth-skills-v0.15.0-working-tree.zip)或[独立包目录](dist/skills-working-tree/)。同名定制技能不会被安装覆盖；更新官方内容必须先比较和保留客户版本。

## 公网展示与私有客户数据

用户确认的[演示地址](https://yundian-growth-workbench.app.workbuddy.host/)仍为外部现有实例。本次没有部署或核验该地址运行当前工作树代码。

公网监听启用所有者认证：未配置返回setupRequired，未登录受保护读取和写入返回401。部署前必须通过服务器本地CLI配置所有者，并验证HTTPS会话和后端直连隔离；该模式仅服务单客户单实例。公开演示只用隔离空白/公开资料目录；客户名单、联系方式、知识、成果和凭据不得放入公共演示实例。腾讯云私有托管需另行验证认证、客户隔离、存储与备份。旧匿名云表 SQL 和网页模型入口不适用当前工作台。

## 云店+与搞跨境的可乐哥

[云店+](https://www.ydjia.com/zh)围绕公域引流、独立站承接与私域转化，提供 AI建站、WordPress定制建站、SEO/GEO、Google Ads、Facebook/TikTok 社媒营销及内容数据服务；本工作台也支持 Shopify 建站路径。

搞跨境的可乐哥（Cola）为已确认的专家入口，支持配置中已匹配模块，联系方式与服务范围见[专家配置](config/experts.json)。专家与陪跑标明付费属性，未虚构价格；免费技能持续可用。联系和服务官网不授予专家读取客户资料的权限，分享成果须客户主动选择。

## 数据与扩展

客户对象保存到指定项目 `growth-workspace/`，定制技能位于客户 `.codebuddy/skills/`；不同客户使用独立目录。不要提交客户数据和凭据，Python旧后端不得与 Node 后端同时写入同一目录。

前端组件在 `web/views/`，领域、调度、技能和备份代码在 `src/`；扩展入口维护 registry、真实技能、输入/产物/验收及回写契约。迁移前完整预检并备份，失败保留原字节与目录树。详见[迁移说明](docs/migration-v2.zh-CN.md)、[统筹技能](skills/yundian-growth-workbench/SKILL.md)。代码与技能采用 [MIT](LICENSE)，名称和logo遵守[品牌说明](BRANDING.md)。

项目内成果、专家入口、内容列表/排期/远端媒体关联、CRM跟进和所有者部署步骤见[模块工作台指南](docs/module-workspace-guide.zh-CN.md)。当前包为未发布工作树，真实发布需要客户确认正文、渠道、远端mediaId、时间和数值预算。

<!-- workbench-ui:begin -->
一级导航：工作台、企业知识库、营销推广、内容运营、客户管理、定时任务、设置。
营销推广包含12个子项目，各占一行；内容运营只在一级出现。保留13个项目、15个执行阶段及历史SEO/GEO入口。
免费项目：市场调研、产品机会、客户背调、销售反馈，无专家咨询窗口；其余项目页末按钮按需打开，二维码仍为占位，不自动发送客户资料。
<!-- workbench-ui:end -->

## 第一批工作台确认与 CRM 接线

先读取当前客户项目的本地知识、来源和当前 contentHash；知识确认只表示客户确认这些字节，知识健康与任务 ready/needs-review/completed 分开。首次使用补全企业、产品、市场、买家、目标五项事实并确认当前知识后创建第一项任务；复制指令、安装文件和名单导入都不代表 WorkBuddy 实际执行。

成员由客户提供真实项目名单，工作台 `/api/crm/members/import/preview` 预览并逐项决定，`/api/crm/members/import/confirm` 要求 confirmed:true。source 为 customer-import、verification 为 customer-confirmed，不能声称原生成员 API 自动同步。以稳定 ownerMemberId 关联负责人；同名不自动匹配，旧 owner 文本保留，停用成员不能新指派。

公司、联系人、线索与下次跟进通过 `/api/crm/lead-records` 完整创建/编辑，输入分为 company、contacts、lead；客户确认 shared/source 修改后才写入。来源候选用 `/api/crm/import/preview` 预览，客户逐项确认 create/skip/link-existing 后入库；保留来源、外部 sourceLeadId 与内部稳定 crmLeadId，不由 AI 自动合并或生成真实联系人。以上 API 均沿用所有者认证、客户 workspaceId、当前 revision 和工作区令牌；遇到 401/409 保留输入，重新认证或核对后由客户明确保存，不自动重提交。

列表和 `/api/crm/export` 采用同一组合筛选：公司/联系人查询、国家、来源、阶段、标签、负责人、跟进日期。selected 只导出当前筛选内明确勾选 ID，filtered 导出全部筛选结果而非当前分页；客户确认字段/范围后下载真实 UTF-8 BOM CSV，长电话与公式文本安全保存。销售反馈由真实客户记录并明确关联当前线索后进入下一轮，名单数量、背调预测和草稿不代表成交。

普通快照仅覆盖 growth-workspace；客户 `.codebuddy/skills` 全目录、外部附件和工作区外产物须另行备份。官方安装核对 SKILL.md 及所需资源/共享脚本，任何同名不同字节的定制文件都保留，先独立暂存官方版本并审阅。应用 0.15.0、现有技能 0.16.0 的本次交付为 working-tree、published:false；未创建正式发布或部署。原生宿主执行、成员 API、云同步、真实发布与付费效果均待真实授权和回执验证。


稳定化开发验收与客户升级预检见 [stability-acceptance.zh-CN.md](docs/stability-acceptance.zh-CN.md)。CRM 5000 条交互容量门槛仍未通过；本地工程检查不代表生产或云端已验收。

工程复核：`npm ci` → `npm run check:ui` → `npm run typecheck` → `npm run build` → `npm test` → `npm run package:skills` → `npm run validate:skills`。先编译再跑集成测试，避免使用陈旧 server.js。`npm run verify:stability` 使用本机 Edge；`WORKBENCH_BROWSER_EXECUTABLE=chromium` 使用 Playwright 管理的 Chromium，也可设置实际浏览器可执行文件绝对路径。所有浏览器资料均在临时合成客户中，不使用当前客户实例。
