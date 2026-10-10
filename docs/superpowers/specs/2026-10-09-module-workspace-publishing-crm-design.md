# 工作台项目化导航、内容发布与客户CRM设计

日期：2026-10-09
状态：待用户审阅。本文描述目标，不代表已实现或上线。
基线：main/9f87a7f，2026-10-09已git pull --ff-only；保留本地未跟踪的课件大纲。

## 1. 已确认目标与实施边界

工作台继续服务客户独立的外贸获客项目，WorkBuddy执行专业技能；网页管理任务、成果、排期和客户。全部原01–15项目归入“获客技能”二级导航，重复SEO、GEO入口合并后保留13项。成果归属各项目，专家咨询嵌入付费项目。内容运营直接对接socialmedia.ydjia.com提交发布；新增当前企业自己的买家CRM。

本次分三个交付单元：A导航与项目内成果；B内容选题排期与发布适配；C客户CRM与背调、销售反馈关联。共享客户空间、任务、产物和回执契约，保留旧数据。不是统一多客户SaaS改造。市场调研、产品机会、客户背调、销售反馈四个免费项目不展示专家咨询入口。

## 2. 导航与项目页面

一级导航：工作台、企业知识库、获客技能（展开/折叠）、客户管理、定时任务、设置。

获客技能二级列表按以下顺序重新编号：
01市场调研；02产品机会；03建站；04SEO与GEO；05内容运营；06LinkedIn主动获客；07客户背调；08销售反馈；09优化下一轮；10社媒运营；11Facebook广告；12Google Ads；13邮件开发。

首页保留每日行动和总体进度，业务卡片点击进入对应项目。删除独立“成果中心”和“专家与陪跑”导航。成果中心旧URL引导用户选择成果所属项目；专家页旧URL引导到获客技能。历史SEO/GEO路由定位到SEO与GEO页面对应分类。

项目内区域：技能与操作、任务记录、本项目成果、专家咨询（适用时）。产物按真实task.stage归属并支持搜索、类型、时间、轮次与验收状态筛选。任务ID、产物ID和原文件不变；后台全量索引用于每日行动、CRM和备份，网页展示按项目过滤。

SEO与GEO保留现有seo-geo、seo、geo技能及历史stage别名，以页面内SEO/GEO分类调用相应专业技能；只去除重复展示，不删除技能文件和历史产物。已有交付计划及workflow继续可读，项目进度从实际任务验收计算，删除全局陪跑页不销毁交付数据。

## 3. 项目内专家咨询

免费项目集合：market-research、product-opportunity、buyer-check、sales-feedback。其余9项目均展示“专家咨询联系”。这是服务咨询窗口，不宣称每项付费代运营已购买或已开始。

固定展示文案：
- 搞跨境的可乐哥
- AI建站、WordPress、SEO、Google Ads、Facebook广告、数据分析
- 付费服务；具体范围与费用联系确认。免费技能持续可用。
- 联系电话（微信同号）：13631179943
- https://www.ydjia.com
- 微信二维码图片占位；未提供真实图片前显示占位，不生成假的微信二维码。

官网仅允许HTTP/HTTPS；电话单独验证。咨询按钮不得自动发送客户名单、报告或企业资料。保留后台专家/服务配置能力，首轮不用支付、订单或专家跨客户访问。

## 4. 内容运营列表与排期

内容运营05新增“选题与排期”主列表，以及任务/成果区域。一个ContentItem记录：id、workspaceId、cycleId、sourceTaskId、productRef、title、purpose、contentType、language、keywords、text、assetRefs、channelIds、plannedAt、timezone、reviewStatus、contentRevision、status、publisherPostId、publishAttemptIds、createdAt、updatedAt。

列表列：选题/标题、关联产品、内容类型、目标渠道、计划时间、素材完成情况、审核状态、发布状态、操作。提供列表与周排期视图；支持按产品、渠道、日期、状态筛选，编辑、预览、批量导入选题、打开来源成果。首轮导入接受经过校验的结构化JSON或CSV，Markdown报告保留为成果，不能把任意文本自动解析结果当作客户已审核内容。

WorkBuddy内容技能生成content-plan.json，写入客户growth-workspace内并通过受控回写导入ContentItem。来源任务与技能版本可追溯；重复导入按稳定ID和内容版本提示差异，客户编辑不被静默覆盖。导入完成不等于发布。

状态：idea、draft、ready、scheduled、publishing、published、partial、failed、unknown。审核独立：pending/approved/rejected；批准绑定内容、素材和渠道的版本摘要，修改后需重新确认。已发布版本留档，编辑产生新版本不覆盖原发布记录。

## 5. 直接多渠道发布适配

### 5.1 已核对的接口

来源：SocialMedia本地src/app/api/mcp/route.ts与src/lib/mcp/tools.ts、docs/mcp-integration.md；未携带凭据调用线上，不把本地源码能力当作线上验收。

目标固定为https://socialmedia.ydjia.com/api/mcp；工作台Node后端使用Bearer API Key和JSON-RPC tools/call，不将密钥交给浏览器。首次只读验证tools/list、list_channels、get_balance、list_media，界面记录实际连接状态。

调用：create_post({content,channelIds,mediaIds,scheduledAt?})；立即发布随后publish_post({postId})；通过get_post({postId})读取逐渠道回执。必须识别JSON-RPC error及result.isError，HTTP200不等于工具成功。

现有发布服务本地实现：每个成功渠道扣1积分，提交前余额校验按全部目标渠道数量。返回部分成功时帖子顶层可能仍是published，所以工作台必须依据postChannels/results的逐渠道状态计算partial，不依赖顶层状态。

### 5.2 交互与费用

设置中按当前客户配置账号API Key、实例连接和发布额度。密钥保存在服务端私密配置，不写入Git、知识库、技能ZIP、普通快照、浏览器localStorage或/api/state；只返回已配置/遮罩状态。

客户先选择真实已连接渠道、内容和素材，审核后“发布”打开确认：逐渠道预览、立即/按排期、目标数量、余额、最多可能消耗积分、单次和日累计上限。客户明确确认后按钮提交。没有有效额度配置、余额不足、内容过期未审核或素材缺失时不提交。默认不执行付费操作；客户设置数值上限后才可启用。首轮不调用ai_rewrite或自动开通付费供应商。

发布成功必须有对应渠道的实际结果及平台链接/标识（服务返回时保存）；有postId但回执未到显示提交中/待确认，不标记全部成功。定时发布只有create_post确实返回有效scheduledAt和postId后才显示已排期；实际触发由发布服务完成，不依赖网页常驻。

### 5.3 重复提交、失败与更新

PublishAttempt绑定workspaceId、contentItemId、内容版本、渠道、模式、计划时点与确认编号，先持久化请求意图；同一请求只提交一次，按钮禁用并保留可读状态。

create_post尚未取得postId时超时，由于现有接口未确认提供幂等键，标记unknown并提示核对远端，不自动再次创建或发送。已取得postId后超时只查询结果，不自动再publish。部分成功不重发全部渠道；首轮失败渠道显式核对后建立仅失败渠道的新批次，保留原回执；无法确认失败则不重试。内容更新不可沿用旧审核或旧发布确认。

### 5.4 素材边界

首轮直接支持文字及同账号媒体库中实际可用mediaIds，后端重新验证目标渠道和媒体归属。用户可关联远端素材和本地原稿，二者状态分别显示。

MCP当前只有list_media，现有/api/media/upload-url依赖网页用户登录，未验证接受API Key。因此本地图片仅有文件路径时显示“待上传/关联”，阻止图片渠道发布，不能把本地路径或臆造mediaId提交到工具。可提供打开发布工具上传素材后刷新关联的入口。自动上传本地素材需后续单独增加受API Key保护的上传票据能力并验证，不在本轮冒充已有接口。

## 6. 客户CRM

每个客户工作台管理自身潜在买家，workspaceId与企业空间隔离。

Company：id、workspaceId、名称、国家/地区、官网、行业、来源、产品兴趣、负责人、标签。
Contact：id、workspaceId、companyId、姓名、职务、email、电话/WhatsApp、LinkedIn、来源、核验状态。
Lead：id（兼容稳定leadId）、workspaceId、companyId、contactIds、来源项目、opportunityId、stage、owner、createdAt、updatedAt。
FollowUp：id、workspaceId、leadId、时间、方式、内容、结果、下一步、nextFollowUpAt、关联成果/任务。

阶段：新线索、已联系、有回复、有效需求、已报价、谈判中、已成交、已流失；阶段改变写历史，不能由生成报告直接假设成交。

页面包含客户列表、条件筛选、详情、联系人、跟进时间线、下次跟进、关联报告与销售反馈。支持手动新增及确认后的结构化导入；LinkedIn、邮件开发、背调技能可提出带来源的候选数据，由客户确认入库。首轮不增加自动群发、报价支付或图片OCR功能。

重复检测基于规范化官网域名/企业名和联系人邮箱、来源身份，先提示候选，不自动合并或删除原记录。多个联系人可关联同公司，联系人缺失不阻止保留公司线索。

CRM、客户背调和销售反馈共用稳定leadId。现有有真实leadId的反馈关联已有记录；未匹配项列为待关联，不编造公司或联系人。CRM跟进保存可生成销售反馈引用；销售反馈仍保留原始文件和来源。每日清单纳入真实nextFollowUpAt；知识库只吸收客户确认的业务洞察，不自动公开联系人信息。

## 7. 数据、认证与升级

复用Node.js/TypeScript存储与WorkspaceStore、TaskRun、Artifact、Review契约，新增content-items、publish-attempts、crm-companies、crm-contacts、crm-leads、crm-followups等独立数据目录。ID关系与workspaceId在写入前校验，所有新增记录纳入备份、恢复预检、摘要/revision和迁移。旧任务、成果、审核记录和客户自定义技能保留。

目前公网模式的workspace token/origin检查仅用于请求保护，不是客户登录；/api/state可返回token。新增客户联系人与可消费积分的发布能力不能凭此开放公网。

本地仍默认127.0.0.1单客户使用。公网实例启用CRM与发布时需受验证的实例所有者会话/网关认证，保护私有读取和写入接口；认证不可用时禁用这些私有能力并明确提示，不从公开页面提供客户名单或API Key。首次实现选择最小单实例所有者认证，不扩展多租户账号平台；云端存储只有客户认证及空间权限核验后才同步CRM。本次不沿用匿名全开放云表作为客户隐私隔离。

最新9f87a7f改动存在server.js与server.ts运行信息/--public行为差异，实施时把必要云适配、KB检查和启动参数同步进TypeScript源码，再由构建生成server.js；保留已修正的唤醒重试。不得编译后丢失已有线上行为。此前已确认的WorkBuddy负责技能执行定位继续有效，网页AI草稿不作为本轮内容发布的依赖；远端重新加入的相关入口需在实施计划中单独核对并按该定位处理。

## 8. 页面与技能同步

官方技能注册表增加presentationGroup/hiddenAlias映射，业务skillId不因导航重编号而改变。更新统筹、内容运营、社媒运营、客户背调、销售反馈及主动开发技能的输入输出回写约定。

内容技能只生成并保存草稿及计划，未经确认不能自动发布；CRM技能不能把缺失联系方式或采购意图编造成事实。由网页对接发布服务产生Publisher回执，专业技能及UI沿用同一成果与事实来源。

README、部署文档、MODULES/WORKFLOWS、总包与独立包同步更新；用户自定义包遇到冲突保留并比较。未连接工具、未提交、排期成功、发布部分成功和已发布应有不同文案。

## 9. 验收与分阶段交付

A：13项二级导航、折叠状态和手机菜单可用；无全局成果/陪跑入口；历史SEO/GEO路由和任务归入正确项目；跨项目成果不混显；四免费项目无咨询入口，其余文案/电话/官网/二维码占位符合要求。

B：结构化计划导入、编辑、筛选与周排期可读回；审核版本变化失效；真实接口契约的本地fixture覆盖渠道归属、余额/上限、工具error、部分成功、超时unknown、重复点击、定时提交和素材缺口。实际工具仅在客户提供API Key后做只读连通验证；收费发布验收需要客户明确预算和选定内容渠道后进行，不能用fixture代替线上成功。

C：公司/联系人/线索/跟进CRUD与来源关系可读回；重复建议不删除记录；稳定leadId关联背调和反馈；到期跟进进入每日清单；跨workspace写入、未认证公网访问、非法导入和危险链接被拒绝；CRM与内容/发布记录能正确备份恢复。

整体：类型检查、构建、完整测试与实际浏览器验证；关键破坏性迁移失败保留原资料；测试使用临时目录；不向客户目录写模拟报告。版本和公网部署在交付确认后执行，不将设计文档或配置保存当作上线。

## 10. 后续步骤

用户审阅本设计后，按A/B/C三个实施单元编写任务计划，并沿用之前选择的子代理实现与独立审查方式；计划审阅通过后实施。当前尚未修改产品代码、发布内容或创建客户CRM记录。
