# 线上发布参数（务必照抄，不要凭记忆重发）

## 一句话结论

发布 `wb-public` 目录时，`installCmd` 留空、`startCmd` 必须是这一行：

```
node server.js --root /workspace --public
```

> **不要再依赖环境变量**。环境变量写法是 `WORKBENCH_PUBLIC=1 node server.js …`，
> 但 `WORKBENCH` / `WORKBUDDY` 两个名字极易手误（2026-10-08 就因为敲成 `WORKBUDDY_PUBLIC`
> 导致线上 403 Invalid host），且部署端不一定用 shell 解析 `VAR=1 node …` 这类前缀。
> 现已在 `server.js` 增加显式开关 `--public`，不依赖环境变量名、不依赖 shell 解析。
> 本地 A/B 实测：带 `--public` → 200；不带 → `403 {"error":"Invalid host"}`。

## 四个已踩过的坑

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 用了 `package.json` 的 start | `ERR_UNKNOWN_FILE_EXTENSION ".ts"`，端口不监听 | 必须显式传 `startCmd: node server.js`，云端不编译 TypeScript |
| 公网开关没生效 | 发布返回 `verified: true`，但页面报 `403 Invalid host` | startCmd 用 `--public` 参数，不要依赖环境变量 |
| `--root` 传了 `wb-public` 本身 | 服务内部会再拼一层 `growth-workspace`，知识库读不到 | `--root` 传部署根目录（云端为 `/workspace`），服务自己拼 `/workspace/growth-workspace` |
| 误信 `verified: true` | 以为发布成功，实际页面 403 | 发布后必须按文末判据实际请求一次 |

## 另外两个已踩过的坑（2026-10-08 补充）

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 移植时漏掉函数定义 | 页面白屏，或功能点了没反应且**页面上看不出原因** | 发布前必跑 `node scripts/fe-smoke.mjs`（见下） |
| 网关后应用休眠，唤醒期拿不到数据 | 页面停在「项目资料未连接」，报 `Unexpected end of JSON input` 或「空响应体（HTTP 404）」 | 前端已加退避重试 + 后台自动重连（约 40 秒内自愈，无需操作）；唤醒实测首请求 7 秒，属正常 |

### 休眠唤醒的根因（含实测证据）

**为什么会这样**：应用空闲后会休眠，唤醒要十几秒。唤醒期间网关先给出不可用响应，
应用起来后才恢复 200。实测撞到过**两种**形态，别只按一种去排查：

| 形态 | 表现 | 触发场景 |
|---|---|---|
| 200 + 空响应体 | `response.json()` 抛 `Unexpected end of JSON input` | 第一次遇到（10-08） |
| **404 + 空响应体** | 前端报「服务端返回了空响应体（HTTP 404）」 | 第二次遇到（10-09） |

两种形态下 `/healthz` 也同样失败。**判别要点：`curl` 间隔一会儿再打就是 200，说明服务没坏，只是没醒。**

**前端现在的行为**（三段时间共约 47 秒，全程不需要用户点按钮）：
1. 前台退避重试 4 次（0 / 0.8s / 2s / 4s）
2. 仍失败 → 显示错误页，同时**后台每 4 秒自动重连一次，最多 10 次**
3. 成功即自动渲染并提示「已重新连接」；10 次都失败才提示去查部署

网关状态码（404 / 502 / 503 / 504）会被单独识别，文案说「应用尚未就绪，唤醒需要十几秒」，
不再和「真的连不上项目」混为一谈。

**自愈逻辑有测试覆盖**，别凭感觉改：

```bash
node scripts/fe-smoke.mjs --simulate-wake 6
```

模拟前 6 次请求返回「404 + 空响应体」再恢复。期望输出
`✅ 自动恢复成功，用时 xx 秒，期间无需任何用户操作`（当前约 19 秒）。

### 移植漏函数的三个先例（都是运行时才暴露）

- `refresh` → 白屏（已修）
- `printPdf` / `stageRecords` → 导出 PDF、生成草稿静默失败（已修）
- `save` → **8 处写操作全部 `ReferenceError`，线上所有保存都是坏的**（已修）

静态检查查不出这类问题，所以发布流程第 3 步固化了运行时冒烟测试。

## 本地怎么起（和线上是两套）

线上：`node server.js --root /workspace --public`
本地：**`sh scripts/start-local.sh`**（默认 8767 端口，可加参数改端口）

```bash
sh scripts/start-local.sh          # http://127.0.0.1:8767/
sh scripts/start-local.sh 8801     # 换端口
```

等价的完整命令（在 `wb-public` 目录下执行，`--root` 指**客户项目根目录**，不是 wb-public 本身）：

```bash
node server.js --root /c/Users/KEJIE/WorkBuddy/2026-10-04-23-14-55 --port 8767
```

**不要用 `npm start` 的历史印象判断**：`package.json` 的 start 原本是 `node server.ts`，
而发布目录里只有编译产物 `server.js`、没有 `server.ts`，所以旧版 `npm start` 必然报
`Cannot find module '...\wb-public\server.ts'`。
之前错误页上印的「请运行 npm start -- ...」就是这条坏命令，用户照着敲一定失败。
现已把 `wb-public/package.json` 的 start 改为 `node server.js`，`npm start -- --root ... --port ...`
也可用；但更省事的是直接用 `start-local.sh`。

> **两处 package.json 的 start 不一致是有意为之，不要统一**：
> 代码仓库里有 `server.ts` 源码，且 Node 22.18+ 支持直接执行 `.ts`，所以主线保持 `node server.ts`；
> 发布目录 `wb-public` 只有编译产物 `server.js`，必须改成 `node server.js`。
> 同步文件到仓库时**跳过 `wb-public/package.json`**。

## 为什么必须显式传 startCmd

`package.json` 里：

```json
"scripts": { "start": "node server.ts" }
```

`.ts` 只能靠 `npm run build`（tsc）编译成 `server.js`。发布沙箱不执行 build，所以 `npm start` 一定失败。
`server.js` 是已编译产物，直接 `node server.js` 即可。

## 校验发布是否真的成功

`verified: true` **不代表可用**（WORKBENCH_PUBLIC 缺失时依然返回 true）。发布后必须实际请求一次：

```bash
curl -s "https://yundian-growth-workbench.app.workbuddy.host/api/state"
```

判据：

- `error` 字段为 `undefined`（不是 `Invalid host`）
- `projectRoot` 为 `/workspace`
- `knowledge` 数组长度为 15
- `profile.company` 为「云店+ / Yundian+」

## 还要验证前端代码是否真的更新

服务端验证通过不代表前端是新版本（可能被浏览器缓存）：

```bash
curl -s "https://yundian-growth-workbench.app.workbuddy.host/app-v03.js" | grep -o "redactForModel" | wc -l
```

改动 `app-v03.js` 后该值应大于 0（当前为 4）。

## 发布后跑一遍运行时冒烟（线上只读校验）

```bash
node scripts/fe-smoke.mjs
```

会拉取线上真实 `/api/state`（只读 GET，POST 全部本地兜底，**不会写线上数据**），
真实渲染 22 个页面并模拟点击页面上出现的每一个按钮（当前 83 个），
捕获 `ReferenceError` / `TypeError`。期望输出 `✅ 未发现运行时错误`。

要校验某个历史版本（例如怀疑线上跑的不是最新代码）：

```bash
node scripts/fe-smoke.mjs --app yundian-ai-growth-workbench/app-v03.js
```
## Runtime source parity (2026-10-09)

`server.ts` is the runtime source; run `npm run build` to generate `server.js` and the complete source graph. Both entrypoints require `--root CUSTOMER_PROJECT`, default to port 8767 (or `PORT`), and accept `--port`. Local bind defaults to `127.0.0.1`; `--public` or `WORKBENCH_PUBLIC=1` enables `0.0.0.0`. Public bind is not owner authentication; CRM/publishing authentication remains a separate acceptance requirement.

`/api/state` retains `token`, `projectRoot`, the existing public `cloud` configuration, and `kbCheck` (`ok`, `drift`, or `no-baseline`). Cloud configuration alone does not prove cloud connection or customer isolation. Runtime parity validation uses only temporary local projects and does not enable live cloud services.
