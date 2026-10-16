# D CRM读取性能与分页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 正确处理500/5000线索，减少重复扫描与全库页面传输。
**Architecture:** 请求快照和纯索引共享投影，新增分页API；旧调用兼容，导出和漏斗口径不变。
**Tech Stack:** Node22.18+/TypeScript/原生DOM，B3 readWorkspaceSnapshot；不换SQLite。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md

## Global Constraints

总计划与B3协调器，联系人原顺序、最新跟进排序、owner null/缺省、Shanghai边界保留。全筛选导出10000上限不因分页变化；只使用假数据测量，不先填速度倍数。

## Review Focus

contactIds顺序与原数组不同、followup tie、分页后owner改名、选中范围revision变化、漏斗历史进入与当前阶段：D1/D2测试。

### Task D1：规模基准与请求内索引

**Files:** Create scripts/benchmark-crm.mjs、src/crm/read-context.ts、tests/crm-read-context.test.ts。Modify src/crm/query.ts/service.ts、server.ts、scripts/build.mjs。
**Interfaces:** buildCrmReadContext(data:CrmQueryData):CrmReadContext含companiesById/membersById/contactsById/contactOrder/latestFollowupByLead及originalData；projectCrmRows(data,filter,now,context?:CrmReadContext):CrmRow[]，原三参数保留。上下文只属于一次数据snapshot，不建无失效策略全局cache；复用B3读取结果。

- [ ] Step1 tests“indexed_equals_legacy”：把旧纯投影作为test-local参考，同时间/筛选逐行深等价，含company missing/archived、contactIds逆序/重复、latest time/createdAt/id tie、null/absentowner、多标签/上海跨日。索引构造次数及数据读取次数可计数证明非每lead扫描。
- [ ] Step2 `node --test tests/crm-read-context.test.ts`，RED新context；先跑benchmark隔离500/5000得到beforeJSON，不报告未测速度。
- [ ] Step3 一次建立联系人顺序与最新跟进索引；server同请求共享快照与context。benchmark两规模各含公司/联系人/跟进/阶段历史，5次warmup＋20次测量，记录median/p95、响应bytes、rss及读取计数、机器/Node/构造规则。分别测查询、详情、漏斗、导出、首页，before/after同机同数据，报告差异及绝对值。
- [ ] Step4 focused/query-export/CRM/funnel/type/build；生成web/crm-query.js和相关依赖无Node运行时import，浏览器/typed投影一致；after实际测量，不把内存fixture成绩冒充磁盘/HTTP。
- [ ] Step5 双审查与基准报告，未达实际目标给SQLite后续建议，不擅切库。

### Task D2：真正后端分页与选择范围

**Files:** Create src/crm/page.ts、tests/crm-pagination.test.ts。Modify server.ts、web/views/crm.js/crm-editor.js/workbench.js、app-v03.js、web/api.js、styles-v03.css。
**Interfaces:** queryCrmPage(snapshot,{filter,page,pageSize,revision?},now):{rows:CrmRow[],page,pageSize,total,revision,scopeId:string}。page>=1，pageSize20/50/100；scopeId绑定workspaceId/revision/规范化filter。POST /api/crm/query使用body workspaceId/token及revision；GET /api/state?crm=summary显式选择摘要，旧state仍完整。
GET /api/crm/editor-options支持按name/query查company/contact/opportunity/member，每页20；不能为了编辑把全库再下载。行详情/完整编辑获取既有context。选中ID只同scope跨页保存；revision变化提示重新确认选中，不静默合并。export原接口增加可选scopeId核验，旧filter/ids仍可用。服务端漏斗汇总＋下钻分页，复用原期间进入算法而非当前阶段计数。

- [ ] Step1 tests“paged_real_scope_exact_export”：5000条分页response含20行无隐藏完整CRM；page范围合法；筛选总数及全导出ID相同；跨页选中两条完整；scope/revision变拒绝；非当前页lead不会丢；owner/source/date/archived口径一致，漏斗包含已前进阶段的历史进入。
- [ ] Step2 `node --test tests/crm-pagination.test.ts`，RED缺API。
- [ ] Step3 接分页、摘要、选项检索、漏斗及导出。导航保留筛选和当前页；401/409保留表单，pending-save离开保护与无自动重提交不退化。请求只返回所需行，不能下载完整state再声称后端分页；首页/CRM源条件明确。
- [ ] Step4 focused/type/build＋真实编译浏览器1440/390/2K/4K；捕获网络payload确认非全库，实际跨页CSV下载解析；CRM create/edit/followup/feedback/成员选择正常。before/after HTTP基准记录。
- [ ] Step5 双审查，D完成，不提交。
