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
所有者与发布配置保存到用户主目录 `.workbench-private/<代码绝对路径SHA256>/`，不在客户growth-workspace、源码或普通备份中。换代码目录不会自动搬迁配置，需管理员主动重新配置；实例为单客户工作台，不提供跨客户云身份注册。API读取缺配置不创建文件。发布Key优先服务端WORKBENCH_PUBLISHER_API_KEY，网页只返回configured/固定遮罩和预算。单次/日预算默认0，真实积分消耗还需后续发布服务确认和日累计预留校验。本次未进行真实发布或云身份注册。

模块项目和内容/CRM操作见[模块工作台指南](module-workspace-guide.zh-CN.md)。验收必须包含所有新增content-items/publish-attempts/publish-confirmations及crm-*目录的快照恢复，旧SEO/GEO markdown与二进制成果按原字节保留。unknown回执先查远端状态，不能重发；actualCredits=null表示实际收费未知。工作树包不代表线上版本，当前未发布0.15.0，不创建release或tag。
