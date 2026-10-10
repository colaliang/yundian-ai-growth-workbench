# B：内容选题排期与直接多渠道发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 实现已确认的项目化工作台、直接发布和CRM中本计划对应的交付单元。
**Architecture:** 在工作台后端增加受保护的MCP适配与发布服务；网页只发送确认后的发布请求。内容计划和发布批次保存到客户目录，超时及部分成功依实际回执处理。
**Tech Stack:** Node.js/TypeScript、原生HTML/CSS/ES模块、node:test、现有文件存储；后端fetch访问JSON-RPC MCP。
**Spec:** ../specs/2026-10-09-module-workspace-publishing-crm-design.md
**Status:** 待用户审阅实施计划；设计已确认，尚未修改产品代码。
**Execution:** 已选择子代理实现与独立审查，沿用该方式。

## Global Constraints
- 基线main/9f87a7f；Node.js >=22.18.0、TypeScript、原生ES模块；保留schemaVersion=3/contractVersion=2，新增可选featureDataVersion=1。
- 每客户独立工作台、WorkBuddy执行技能；不新增网页模型执行依赖。
- 13项二级项目；market-research/product-opportunity/buyer-check/sales-feedback无专家咨询。
- 历史任务ID、成果ID、文件、稳定leadId与客户定制技能不静默覆盖。
- 发布只走后端固定https://socialmedia.ydjia.com/api/mcp；API Key不得进Git、浏览器存储、/api/state或普通快照。
- 无配置凭据或预算不发送；无回执不标记成功；原生WorkBuddy定时能力、真实线上认证与付费发布须分开验收。
- 试验只用临时目录及本地mock，真实发布需客户选定内容、渠道与数值预算；本次不自动部署公网。
- 沿用子代理逐任务实现＋独立审查；未获本次提交授权不commit/push。先创建新隔离工作树，不改动仍在运行的旧预览或其客户目录。

## 前置与类型
依赖A的模块规则和runtime同步。src/auth管单实例访问；src/content管排期；src/publishing管协议与副作用；web/views/content-plan.js是列表/周排期。
ContentItem包含设计全部字段；contentRevision为递增整数，reviewStatus='pending'|'approved'|'rejected'，approvedHash:string|null；assetRefs保存本地来源，remoteMediaIds:string[]独立记录真实远端素材。plannedAt为ISO UTC字符串或null，timezone为IANA标识。
ContentStatus='idea'|'draft'|'ready'|'scheduled'|'publishing'|'published'|'partial'|'failed'|'unknown'。
PublisherPort={listChannels():Promise<Channel[]>,getBalance():Promise<{balance:number}>,listMedia():Promise<Media[]>,createPost(input:RemotePostInput):Promise<RemotePost>,publishPost(postId:string):Promise<RemotePublishResult>,getPost(postId:string):Promise<RemotePost>}。
Channel={id:string,platform:string,name:string,isActive:boolean}；Media={id:string,mimeType:string,url:string}；RemotePostInput={content:string,channelIds:string[],mediaIds:string[],scheduledAt?:string}；RemotePost={id:string,status:string,scheduledAt:string|null,postChannels:ChannelResult[]}；ChannelResult={channelId:string,status:string,platformPostId?:string,url?:string,error?:string}；RemotePublishResult={postId:string,results:ChannelResult[]}。
PublishAttempt={id:string,workspaceId:string,contentItemId:string,contentHash:string,channelIds:string[],mode:'immediate'|'scheduled',plannedAt:string|null,confirmationId:string,idempotencyKey:string,status:ContentStatus,remotePostId:string|null,results:ChannelResult[],reservedCredits:number,actualCredits:number|null,error:string|null}；后续真实payload字段在adapter映射为上述类型，不假定原始provider字段名相同。


补充类型：ContentInput为ContentItem可编辑字段（title必填；productRef、purpose、contentType、language、keywords、text、assetRefs、remoteMediaIds、channelIds、plannedAt、timezone、cycleId、sourceTaskId可选），不接受id/workspaceId/status/approvedHash由客户端指定。ContentItem.createdAt/updatedAt为ISO时间，workspaceId由当前Store提供。
ImportPreview={id:string,workspaceId:string,candidates:{candidateId:string,input:ContentInput}[],errors:{row:number,message:string}[],conflicts:{candidateId:string,existingId:string}[]}；ImportDecision={candidateId:string,action:'create'|'keep-local'|'apply-new'}。冲突apply-new仍需expectedRevision校验，不绕过用户编辑保护。
AuthDecision={allowed:boolean,loginRequired:boolean,setupRequired:boolean}；PublisherConnection={connected:boolean,checkedAt:string,capabilities:string[],error:string|null}。PublisherPort与ContentService不把API Key放入返回类型。
## Review Focus
1. 匿名公网可以读取CRM或触发消耗积分、密钥出现在state/快照（Task1）。
2. 修改内容/素材/渠道后旧审核仍能发布（Task2、4）。
3. HTTP200但JSON-RPC/工具error被算成功（Task3）。
4. 并发点击、创建超时或部分成功造成重复发布/扣款（Task4）。
5. 本地图片假冒mediaId、渠道/素材不属于当前账号（Task3、5）。

### Task 1: 私有配置与实例认证

**Files:** 新建src/auth/owner.ts、src/publishing/secrets.ts、web/views/login.js、scripts/configure-owner.mjs、tests/owner-auth.test.ts；修改server.ts、web/main.js、web/api.js、.gitignore、docs/workbuddy-deployment.zh-CN.md。
**Interfaces:** OwnerConfig={publicMode:boolean,passwordHash:string|null,sessionTtlSeconds:number}；authorizeOwner(req:IncomingMessage,config:OwnerConfig):AuthDecision（allowed、loginRequired、setupRequired）；PublisherSecrets={apiKey:string|null,maxCreditsPerPost:number,maxCreditsPerDay:number}；loadPublisherSecrets(appRoot:string):PublisherSecrets；savePublisherSecrets仅认证所有者调用；session TTL=86400秒。

- [ ] **Step 1: 写失败测试。** 在tests/owner-auth.test.ts验证：公网无认证不能读取/api/state私有内容、CRM或publisher配置/提交；登陆成功后访问正常，401显示login不进入唤醒重试；CSRF/origin/token仍检查；API Key在state、错误、导出、快照及日志中均不出现；额度默认0，拒绝付费操作。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/owner-auth.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 使用Node crypto scrypt保存带盐口令hash，随机会话标识服务端保存，cookie HttpOnly/SameSite=Strict，公网HTTPS使用Secure；重启会话失效但数据保留。配置初始口令由本地CLI读取指定环境变量，禁止匿名公网首访抢占设置。推荐API Key环境变量，允许服务端私密文件但路径必须在growth-workspace及Git之外并忽略；只展示configured/遮罩。默认localhost保持本地客户使用，公网未配置所有者显示setupRequired，不返回私有状态。无真实云身份隔离前，不把CRM/发布秘密写到匿名云表。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。实际HTTP未认证/登陆/退出/错误口令/重启回归；不创建真实线上账号。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 2: 内容列表、导入与审核

**Files:** 新建src/content/contracts.ts、src/content/service.ts、web/views/content-plan.js、tests/content-plan.test.ts；修改server.ts、app-v03.js、styles-v03.css、src/backup/service.ts、src/storage/migrate.ts；API /api/content/items、/api/content/import/preview、/api/content/import/confirm、/api/content/items/:id/approve。
**Interfaces:** ContentService={list(filters:ContentFilter):ContentItem[],create(input:ContentInput):ContentItem,update(id:string,input:ContentInput,expectedRevision:number):ContentItem,previewImport(raw:string,format:'json'|'csv'):ImportPreview,confirmImport(previewId:string,decisions:ImportDecision[]):ContentItem[],approve(id:string,contentHash:string):ContentItem}；ContentFilter={productRef?:string,status?:ContentStatus,channelId?:string,from?:string,to?:string}；ImportPreview保存候选/错误/冲突，不写客户业务；目录content-items。

- [ ] **Step 1: 写失败测试。** 在tests/content-plan.test.ts验证：结构化计划真实保存/重载/筛选；非法日期/时区/枚举/跨workspace/缺来源拒绝；重复ID先显示差异不覆盖客户编辑；修改正文、渠道、素材或排期后approvedHash失效；CSV公式字符只当文本，渲染escape；恢复前校验新family。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/content-plan.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 引用已有知识/产品名称，不伪造Products数据库。CSV模板列title,productRef,language,contentType,text,plannedAt,timezone,channelIds,remoteMediaIds，数组列为JSON数组；输出content-plan.json有schemaVersion、workspaceId和items。列表与周视图包含设计全部列，时区显示客户当地时间，来源成果可打开。删除为归档，不删除已发布历史；文件进入revision与备份验证。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。实际浏览器导入预览→确认→编辑→批准→改动失效→周排期；新静态module实际GET200。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 3: MCP协议适配与只读连接

**Files:** 新建src/publishing/mcp-client.ts、src/publishing/contracts.ts、tests/publisher-contract.test.ts；修改server.ts、web/views/settings.js；API /api/publisher/connect、/api/publisher/channels、/api/publisher/media、/api/publisher/balance。
**Interfaces:** McpPublisher implements PublisherPort；构造接收server-only API Key和可注入fetchFn；endpoint固定HTTPS；callTool<T>(name:string,args:Record<string,unknown>):Promise<T>；connect():Promise<PublisherConnection>，PublisherConnection包含connected、checkedAt、capabilities、error，不含key。

- [ ] **Step 1: 写失败测试。** 在tests/publisher-contract.test.ts验证：初始化及tools/list/list_channels/get_balance/list_media请求正确；HTTP401/非JSON/JSON-RPC error/result.isError/畸形结果拒绝；余额从{balance}解析；拒绝重定向到其他主机或用户任意endpoint；当前账户渠道/媒体归属重新核验。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/publisher-contract.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 遵守本地核对的JSON-RPC与content[].text JSON协议，正常解析后映射RemotePost/ChannelResult；存储原始脱敏回执以便查验。首次连接只读，不create_post、publish_post、ai_rewrite。图片渠道的素材MIME/个数根据provider返回能力和当前可见规则核验，不编造通用阈值。线上缺Key显示未配置；不存在能力不能显示已连接。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。测试本地mockserver实际HTTP序列；真实Key尚未提供时报告线上连接未验证。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 4: 确认、发布批次与结果

**Files:** 新建src/publishing/service.ts、tests/publisher-flow.test.ts；修改server.ts、src/backup/service.ts、src/storage/migrate.ts；API /api/content/items/:id/prepare-publish、/api/content/items/:id/publish、/api/publisher/attempts/:id/refresh。
**Interfaces:** preparePublish(itemId:string,input:{channelIds:string[],mode:'immediate'|'scheduled',plannedAt:string|null}):PublishConfirmation；PublishConfirmation={id:string,contentHash:string,maxCredits:number,balance:number,expiresAt:string}，TTL600秒；submitPublish(itemId:string,confirmationId:string):Promise<PublishAttempt>；refreshAttempt(id:string):Promise<PublishAttempt>；消费PublisherPort。

- [ ] **Step 1: 写失败测试。** 在tests/publisher-flow.test.ts验证：余额、单次及日上限同时检查；未审核/变更/过期确认拒绝；并发2请求只create一次且只publish一次；create超时unknown不重试；已postId后超时只get_post；部分成功逐渠道partial；仅全成功published；排期返回真实postId/scheduledAt才scheduled；新版本留原发布记录。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/publisher-flow.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 发布意图和额度预留先持久化，使用每workspace队列/锁进行确认与额度原子校验；idempotencyKey由客户空间+内容hash+目标集合+模式+时点+确认ID生成，恢复时查已有attempt不盲目重试。最多积分按所选渠道数，日界按客户timezone；不确定结果保留额度预留，只有可核验失败才释放，防止并发超额。失败重试须新确认且仅选择已确定失败渠道；成功渠道不再发送。服务部分成功顶层published必须由逐渠道结果纠正。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。实际mock HTTP并发、连接中断及重启恢复；禁止把provider create成功当已发布。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

### Task 5: 发布面板、技能与单元B交付

**Files:** 修改web/views/content-plan.js、web/views/settings.js、app-v03.js、skills/yundian-growth-content-operations/SKILL.md、skills/yundian-growth-social-media/SKILL.md及统筹references；新建tests/content-publish-ui.test.ts、docs/content-publishing.zh-CN.md。
**Interfaces:** publishDialog(item:ContentItem,confirmation:PublishConfirmation):string；UI消费既有prepare/submit/refresh接口；技能content-plan.json走受控导入及来源回写，不直接调用网页私密配置。

- [ ] **Step 1: 写失败测试。** 在tests/content-publish-ui.test.ts验证：显示正文/渠道/媒体、余额/最高积分、单次与日上限、确认按钮；提交后按钮禁用；unknown/partial/scheduled/published显示不同；本地素材无远端ID阻止图片发布；密钥始终遮罩且不在剪贴板/复制技能指令。
- [ ] **Step 2: 验证失败。** 运行 `node --test tests/content-publish-ui.test.ts`，预计缺少新接口或具体行为断言失败；环境错误不算红灯。
- [ ] **Step 3: 实现最小功能。** 列表可一键打开确认并提交发布；可选provider已有媒体，打开socialmedia网页上传后刷新关联。明确本轮不实现APIKey图片上传工具，不将本地文件路径冒充远端mediaId。技能只保存草稿/计划，发布回执进入内容项目成果，社媒项目仅在该任务stage确实所属时显示。新目录和回执进入备份。更新部署说明尤其public认证和缺凭据状态。
- [ ] **Step 4: 验证通过。** 同一测试命令全部PASS，`npm run typecheck`与`npm run build`退出0。本地mock配合实际浏览器完成列表到逐渠道结果和390px；线上只读/付费验证分别记录，未授权不自动执行。
- [ ] **Step 5: 独立审查。** 保存本任务基线、差异、报告和实际命令结果；规格与质量审查均通过再推进，不提交或推送。

## B回滚与交付
暂停所有未确认的新发布请求；已远端提交的post必须保留postId/回执，不删除排期或重发。备份当前业务目录后回滚代码，不倒退删除content-items/publish-attempts；待确认远端状态留unknown并核对。缺凭据或预算不阻止本地排期与CRM开发，只禁止真实发布。
