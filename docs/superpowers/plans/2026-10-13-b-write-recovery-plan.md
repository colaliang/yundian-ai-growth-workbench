# B 一致写入与崩溃恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 官方HTTP/CLI写入互斥，多文件事务在进程终止后可安全恢复。
**Architecture:** 客户独占lease＋持久化journal＋事务读写overlay；所有入口统一接线。远程发布不持锁。
**Tech Stack:** Node22.18+/TypeScript/fs/crypto/AsyncLocalStorage、真实Node子进程。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md

## Global Constraints

总计划与A上下文绑定。保留稳定ID、旧bytes、source/回执/发布不可变事实。私有runtime不进普通业务备份/API。旧HTTP/CLI协议保持，内部写接口可要求协调器context，不加测试绕过后门；迁移/初始化也在lease内。非官方文件编辑以hash冲突阻止，不宣称全电脑文件互斥。

## Review Focus

活PID/权限不明不抢锁；stale锁抢占竞争；外部编辑在半事务发生；CLI与HTTP/发布网络中断；读取不能看到半提交：B1-B3各有具体断言。

### Task B1：客户作用域lease

**Files:** Create src/storage/lease.ts、tests/workspace-lease.test.ts、tests/fixtures/lease-child.mjs。
**Interfaces:** WorkspaceLease={root,workspaceId:string|null,nonce,pid,createdAt,purpose:'read'|'write'|'recovery'}；withWorkspaceLease<T>(root,purpose,work:(lease)=>T|Promise<T>,options?:{waitMs?:number}):Promise<T>。默认最多等5000ms，25ms重试；位于.workbench-runtime/lock，原子mkdir及独占owner文件。同root所有purpose独占；AsyncLocalStorage允许同lease嵌套，不允许跨客户复用。释放检查nonce。inspectLease(root)只返回脱敏诊断。

- [ ] Step1 tests“real_process_lease_scope”：两child不能同时进入；不同客户不互锁；活PID过时也不抢；kill实际child后只有一个恢复者获锁；EPERM/PID重用不明为blocked；错误nonce不能释放；symlink/junction拒绝且原树不变。
- [ ] Step2 `node --test tests/workspace-lease.test.ts`，RED缺接口；child等待由IPC标记，不能用固定sleep冒充竞争。
- [ ] Step3 实现探测和有界等待，回收死进程锁须经独占恢复gate、重新核验owner及nonce；不凭年龄unlink。未知所有者要求显式本地恢复确认。
- [ ] Step4 focused真实子进程与typecheck，记录平台/kill方式，不将mock kill标实际。
- [ ] Step5 双审查，B2消费withWorkspaceLease。

### Task B2：持久事务与安全恢复

**Files:** Create src/storage/transaction.ts、tests/workspace-transaction.test.ts、tests/fixtures/transaction-child.mjs。Modify src/storage/workspace-store.ts。
**Interfaces:** withWorkspaceWrite<T>(root,{revision?:string,expectedEntityVersions?:Record<string,number|null>},work:()=>T|Promise<T>):Promise<T>；withWorkspaceRead<T>(root,work:()=>T|Promise<T>):Promise<T>；recoverWorkspace(root):Promise<{recovered:string[],blocked:{transactionId,paths:string[]}[]}>。事务context使read/json/files读到本批staged写，write/put先stage；expectedEntityVersions键为客户内规范逻辑路径，null表示预期不存在。实体新增entityVersion?:number，旧缺省0，仅实际修改递增，旧读取不重写；客户端不能直接设置版本，内部校验/备份兼容新增字段。journal formatVersion1，id/workspaceId/nonce/phase及relativePath、oldHash|null、newHash、before/after bytes、读取依赖hash；phase为preparing/prepared/committed/blocked。

- [ ] Step1 tests“kill_each_commit_boundary”：准备阶段不动业务；fsync准备完成后每文件替换/提交标记点kill真实child，重启恢复为完整新状态；提交前普通throw无业务变更；第三方未知bytes让恢复blocked且保留；错scope/校验失败/路径别名预检树不变；实体版本和全局revision在lease内检查；read lease不会看到中间态。
- [ ] Step2 `node --test tests/workspace-transaction.test.ts`，捕捉RED。
- [ ] Step3 journal和staged字节先完整持久化，再标prepared，然后应用并标committed；prepared只roll-forward已校验数据，目标须匹配old或new hash，第三方bytes不覆盖。context提交前核对所有读取依赖，包括实际成果hash。普通失败preparing不落业务；Windows目录fsync不支持须标能力，验收只称进程终止恢复不称断电保证。
- [ ] Step4 focused/typecheck；每kill点有IPC、退出、恢复与逐文件hash证据，无产品暴露故障注入HTTP参数。
- [ ] Step5 双审查，B3接全部入口。

### Task B3：HTTP、CLI、迁移与发布本地阶段统一接线

**Files:** Create src/runtime/workspace.ts、tests/write-pipeline.test.ts。Modify server.ts、scripts/workbench.mjs、src/storage/migrate.ts、src/crm/service.ts/members.ts/lead-record.ts、src/content/service.ts、src/publishing/service.ts、src/backup/service.ts、skills/yundian-growth-workbench/scripts/submit_result.mjs、src/crm/contracts.ts/validation.ts、src/domain/contracts.ts、相关测试fixture与CLI技能说明。
**Interfaces:** openFileWorkspace(root):Promise<FileWorkspace>在恢复/初始化lease内打开，恢复受阻不修改业务；runWorkspaceMutation(root,options,operation)消费B2；readWorkspaceSnapshot(root,operation)消费withWorkspaceRead。FileWorkspace原方法保持业务参数，写入需有效context。构造/读取不得偷偷迁移；现有load的历史文件/回执状态派生只在内存进行，不能顺手持久化伪造回执或成果；生产入口使用openFileWorkspace，单测使用同协调器fixture，不添加unsafe生产开关。

- [ ] Step1 tests“http_cli_and_publish_boundary”：真实HTTP与官方CLI竞争保存/回执/验收，陈旧revision409保留，重复回执不重复实体；初始化/迁移kill安全；请求读取不混半状态；publish预约及attempt先本地提交，释放lease再请求测试publisher，网络期间可查询；kill后unknown查询不补发/不释放不明已花额度。
- [ ] Step2 `node --test tests/write-pipeline.test.ts`，先证明未接线的竞争RED。
- [ ] Step3 穷举全部业务写入口，legacy恢复亦纳入事务；本地API先auth/Origin/token再lease及revision。发布只锁本地阶段，不能在网络await上持全客户锁；已有不可变payload/确认hash保留。源码/编译CLI均共享，支持现有submit_result调用形式。外部手工修改检测为受阻。
- [ ] Step4 focused与CRM/receipt/migration/publisher相关tests/type/build；实际编译HTTP＋CLI双进程，不接真实供应商。更新测试直接写fixture为协调器构建，避免遗漏旁路。保存入口覆盖清单。
- [ ] Step5 双审查；B完成后C/D复用同读取快照与事务，不提交。

