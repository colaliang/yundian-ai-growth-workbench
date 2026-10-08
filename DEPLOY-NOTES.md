# 线上发布参数（务必照抄，不要凭记忆重发）

## 一句话结论

发布 `wb-public` 目录时，`installCmd` 留空、`startCmd` 必须是这一行：

```
WORKBENCH_PUBLIC=1 node server.js --root /workspace
```

## 三个已踩过的坑

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 用了 `package.json` 的 start | `ERR_UNKNOWN_FILE_EXTENSION ".ts"`，端口不监听 | 必须显式传 `startCmd: node server.js`，云端不编译 TypeScript |
| 没设 `WORKBENCH_PUBLIC=1` | 发布返回 `verified: true`，但页面报 `403 Invalid host` | startCmd 前缀 `WORKBENCH_PUBLIC=1`，让服务绑 `0.0.0.0` 并跳过 host 校验 |
| `--root` 传了 `wb-public` 本身 | 服务内部会再拼一层 `growth-workspace`，知识库读不到 | `--root` 传部署根目录（云端为 `/workspace`），服务自己拼 `/workspace/growth-workspace` |

## 另外两个已踩过的坑（2026-10-08 补充）

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 移植时漏掉函数定义 | 页面白屏，或功能点了没反应且**页面上看不出原因** | 发布前必跑 `node scripts/fe-smoke.mjs`（见下） |
| 网关后应用休眠，冷启动空响应 | 页面报「项目资料未连接 / Unexpected end of JSON input」，但 curl 一直是 200 | 前端已加退避重试 + `/healthz` 判定 + 「重新连接」按钮；冷启动实测首请求 7 秒，属正常 |

### 冷启动空响应的根因

实测首请求 **7.18 秒**，后续 0.5~1.6 秒 —— 应用空闲后休眠。冷启动期间网关会返回 `200 + 空响应体`，
此时 `response.json()` 抛 `Unexpected end of JSON input`，而旧实现只请求一次且不重试，
页面就永久停在错误页。已改为：GET 不带 JSON `Content-Type` → 先取文本判空 → 退避重试 3 次
→ 用 `/healthz` 区分「冷启动中」与「接口异常」→ 提供可点的重连按钮。

### 移植漏函数的三个先例（都是运行时才暴露）

- `refresh` → 白屏（已修）
- `printPdf` / `stageRecords` → 导出 PDF、生成草稿静默失败（已修）
- `save` → **8 处写操作全部 `ReferenceError`，线上所有保存都是坏的**（已修）

静态检查查不出这类问题，所以发布流程第 3 步固化了运行时冒烟测试。

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