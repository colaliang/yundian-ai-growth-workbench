# WorkBuddy 部署与真实现场验收

README 两条自动路径均由 WorkBuddy 在客户项目中获取代码、准备环境、保留客户文件、安装技能并实际启动。第一条按技能生成定制应用，第二条直接运行开源工作台。缺宿主授权、业务事实或凭据时记录实际缺口；不要声称常规命令已经执行。

## 本地默认

Node.js 22.18+ 运行 `npm run setup -- --root <客户目录> --port <可用端口>`；无桌面环境追加 `--no-open`。本地默认监听127.0.0.1。编译后可用 `node server.js --root <客户目录> --port <端口>`。数据目录与代码、官方技能独立；客户原生 WorkBuddy 项目优先，资料库/空间绑定由实际宿主能力核验，本地知识文件创建不等于原生上传。

技能安装先检查 `.codebuddy/skills/`，同名不同内容停止并保留定制。`npm run package:skills` 生成工作树 ZIP；manifest 的技能版本、文件 SHA-256 用于比较。冲突更新指令：备份当前目录，分别保存旧官方/新官方/客户版本，先在独立官方版本目录暂存，再展示差异；客户版作为可选技能继续使用，安全合并和验证后才切换。没有共同基线则保留当前，不强制覆盖注册表。下载包和安装文件不是客户端已加载证据。

## 调用与回写

仓库 `scripts/workbench.mjs --root <客户目录> --command state` 读真实状态。`create-task`、`receipt`、`review`、`knowledge-confirm` 使用客户目录内 JSON `--payload`，可传 `--revision` 检查冲突。复制任务指令不写状态。实际文件回执含 receiptId、taskId、workspaceId、skillVersion、executor、status及 artifacts 路径/来源，读回后待验收；review 必须有客户实际认可依据、artifactId及当前 contentHash。

独立技能的 `scripts/submit_result.mjs` 只向既有任务回写真实文件。不要伪造宿主执行时间、连接器成功、发送/发布结果。重跑创建新任务，失败登记实际缺口。外部动作须客户授权、真实工具与读回证据。

## 定时与备份

当前原生调度适配 command-only，create/pause/verify 均不可用。`schedule-create` 保存计划并生成宿主指令；手填编号或登记计划不是宿主创建成功。实际 WorkBuddy 验收须记录宿主版本、项目、任务编号、执行时间及可核验查询结果；未取得原生证据保持待创建/不支持。外部发送/发布失败不自动重试。

本地快照 export/restore 可用，恢复前保存现状并校验客户空间、文件哈希和版本；冲突保留本地及incoming双方。在线备份默认关闭，暂无实际认证、客户隔离和存储提供者。不能用公网 endpoint 或旧匿名云表冒充私有同步。

## 公网与演示

公共监听启用单客户所有者认证：未配置不得首访认领，未登录不得访问客户状态、资料、CRM和发布接口；该认证不提供跨客户多租户隔离。演示必须用隔离的空白/公开数据，禁止客户资料进入公共服务。用户确认演示 URL 为 https://yundian-growth-workbench.app.workbuddy.host/；现有地址未在本次改动中部署、更新或验证。私有上线需单独验证完整认证与隔离并取得部署授权。

## 现场验收单

记录实际 WorkBuddy 版本/项目、代码版本及构建标签、客户目录、技能加载结果、服务地址、任务ID、真实产物路径和读回、客户验收、销售反馈及下一轮关联。另记录原生定时创建/暂停/执行和在线备份隔离结果。无法访问的能力填写“未验证”，本地测试不能代替这些结果。

本地快速检查：运行 `npm test`、`npm run typecheck`、`npm run build`、`npm run package:skills`；在独立临时目录和端口启动server.js，打开桌面/390px页面，点击技能创建、复制、成果和错误反馈；用ZIP读取器验证每个文件CRC与manifest哈希。所有测试数据在临时目录，停止后清理，不写客户目录。

## 公网单实例所有者认证与发布私密配置
默认绑定127.0.0.1，继续用于一个客户的本地项目。公网启动前在服务器本地设置指定口令环境变量，执行 `node scripts/configure-owner.mjs WORKBENCH_OWNER_PASSWORD`，随后清除口令环境变量并重启。CLI仅保存scrypt带盐哈希，不输出口令；未配置公网显示setupRequired，不能通过首访认领。会话24小时、HttpOnly、SameSite=Strict；退出、过期及进程重启后需重新登录。
HTTPS直连使用Secure cookie。受可信TLS反向代理保护时，配置WORKBENCH_TRUST_PROXY=1；代理必须覆盖X-Forwarded-Proto并隔离后端直连。未开启时不信任转发头。
所有者与发布配置默认保存到用户主目录 `.workbench-private/instances/<instanceUUID>/`，不在客户 growth-workspace、源码或备份中。客户根目录内 `.workbench-runtime/instance.json` 绑定稳定实例 UUID；只更换 APP 代码目录会继续使用该客户实例的配置，不需重新配置。旧按代码路径保存的配置只通过本地 CLI 显式预览并确认迁移，不会静默复制。复制客户目录到另一路径不能绕过根目录绑定；独立目的实例保留自己的身份与凭据。实例为单客户工作台，不提供跨客户云身份注册。API读取缺配置不创建文件。发布Key优先服务端WORKBENCH_PUBLISHER_API_KEY，网页只返回configured/固定遮罩和预算。单次/日预算默认0，真实积分消耗还需后续发布服务确认和日累计预留校验。本次未进行真实发布或云身份注册。

模块项目和内容/CRM操作见[模块工作台指南](module-workspace-guide.zh-CN.md)。验收必须包含所有新增content-items/publish-attempts/publish-confirmations及crm-*目录的快照恢复，旧SEO/GEO markdown与二进制成果按原字节保留。unknown回执先查远端状态，不能重发；actualCredits=null表示实际收费未知。工作树包不代表线上版本，当前未发布0.15.0，不创建release或tag。

本地知识健康来自当前 --root 客户目录的实际文件及当前内容哈希确认，设置显示检查时间、确认数量和来源元数据缺口。缺少登记不证明正文没有引用；请到企业知识库搜索、展开正文并核对来源，再确认当前内容。WorkBuddy 原生资料库、ima、乐享关联均需实际宿主验证；本地文件保存不证明在线关联或同步完成。

## 第一批工作台确认与 CRM 接线

先读取当前客户项目的本地知识、来源和当前 contentHash；知识确认只表示客户确认这些字节，知识健康与任务 ready/needs-review/completed 分开。首次使用补全企业、产品、市场、买家、目标五项事实并确认当前知识后创建第一项任务；复制指令、安装文件和名单导入都不代表 WorkBuddy 实际执行。

成员由客户提供真实项目名单，工作台 `/api/crm/members/import/preview` 预览并逐项决定，`/api/crm/members/import/confirm` 要求 confirmed:true。source 为 customer-import、verification 为 customer-confirmed，不能声称原生成员 API 自动同步。以稳定 ownerMemberId 关联负责人；同名不自动匹配，旧 owner 文本保留，停用成员不能新指派。

公司、联系人、线索与下次跟进通过 `/api/crm/lead-records` 完整创建/编辑，输入分为 company、contacts、lead；客户确认 shared/source 修改后才写入。来源候选用 `/api/crm/import/preview` 预览，客户逐项确认 create/skip/link-existing 后入库；保留来源、外部 sourceLeadId 与内部稳定 crmLeadId，不由 AI 自动合并或生成真实联系人。以上 API 均沿用所有者认证、客户 workspaceId、当前 revision 和工作区令牌；遇到 401/409 保留输入，重新认证或核对后由客户明确保存，不自动重提交。

列表和 `/api/crm/export` 采用同一组合筛选：公司/联系人查询、国家、来源、阶段、标签、负责人、跟进日期。selected 只导出当前筛选内明确勾选 ID，filtered 导出全部筛选结果而非当前分页；客户确认字段/范围后下载真实 UTF-8 BOM CSV，长电话与公式文本安全保存。销售反馈由真实客户记录并明确关联当前线索后进入下一轮，名单数量、背调预测和草稿不代表成交。

普通快照仅覆盖 growth-workspace；客户 `.codebuddy/skills` 全目录、外部附件和工作区外产物须另行备份。官方安装核对 SKILL.md 及所需资源/共享脚本，任何同名不同字节的定制文件都保留，先独立暂存官方版本并审阅。应用 0.15.0、现有技能 0.16.0 的本次交付为 working-tree、published:false；未创建正式发布或部署。原生宿主执行、成员 API、云同步、真实发布与付费效果均待真实授权和回执验证。

Official local startup and configuration CLIs support --private-base PRIVATE_CONFIG_BASE (or WORKBENCH_PRIVATE_BASE). The argument only selects the existing instance-isolated private config base; omitted retains the existing OS-home default. HTTP bodies cannot select this location. For local isolated verification, pass an OS-temp private base explicitly; never change HOME/USERPROFILE/CODEX_HOME to redirect credentials. workbench config-migration additionally supports --legacy-private-base for an explicitly selected legacy preview source.

## 稳定化交付边界

升级前按 [稳定化验收与回滚](stability-acceptance.zh-CN.md) 执行只读预检和独立目录恢复演练。此次没有升级实际客户，默认每日备份仍关闭。Windows/Ubuntu CI 是待远程执行的配置，不能作为真实宿主或云备份验收证据。CRM 5000 条实际 POST 在 600 秒期限内无响应，容量门槛仍未满足；详见存储性能评估。客户技能差异、私有配置和不可变发布 payload 必须保留，恢复不可复制 source instance 凭据或自动重新发布。

