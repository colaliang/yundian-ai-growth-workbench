# C 完整备份与恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 覆盖客户定制技能/附件/成果，恢复先预检与预览；可选择每天本地备份。
**Architecture:** 兼容旧Snapshot，新增可搬运目录bundle，manifest及哈希blobs分离，不将绝对来源路径当恢复目的路径。
**Tech Stack:** Node22.18+/TypeScript/fs流/hash；消费B3一致快照和写事务。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md

## Global Constraints

总计划及A/B接口。旧JSON快照保持，不改线上备份默认关闭。目录bundle创建成功不等于浏览器已下载。只读取客户明确登记文件，凭据与内部journal/session排除；任何无法覆盖文件有缺口清单。普通Artifact/receipt仍拒绝越界。

## Review Focus

目录搬家/未知文件/同名不同bytes、外部登记被修改、密码样本/半bundle、保留最后成功备份与误删除：C1/C2测试。

### Task C1：完整bundle与恢复预览/确认

**Files:** Create src/backup/bundle.ts、src/backup/sources.ts、tests/backup-bundle.test.ts。Modify src/backup/adapter.ts/service.ts、server.ts、scripts/workbench.mjs、web/views/backup.js、web/views/settings.js。
**Interfaces:** FullBackupManifest={formatVersion:2,id,workspaceId,sourceInstanceId,createdAt,files:{logicalPath:string,sha256:string,size:number,blob:string}[],coverage:{complete:boolean,missing:{reference,reason}[]}}。完整bundle位于客户.workbench-backups/full/<id>/，manifest.json＋blobs/<sha256>；每文件最大64MiB，总512MiB，最多100000项，超限失败不静默截断。exportFullBackup(root):Promise<{id,directory,manifest}>；previewFullRestore(root,directory):Promise<{previewId,additions:string[],conflicts:string[],missing:{reference:string,reason:string}[],fingerprint:string}>；confirmFullRestore(root,previewId,{confirmed:true}):Promise<RestoreResult>，保留旧RestoreResult恢复/冲突语义。
外部来源清单为growth-workspace/backup-sources.json；previewBackupSources(root,rows)及confirmBackupSources(root,previewId,{confirmed:true})，行含固定sourceId、客户选定目录和已登记文件相对路径。绝对目录只能本地CLI/客户选择，不由未授权网页自由读取。外部恢复逻辑路径为external/<sourceId>/<relative>，先存incoming，不自动写回原外部目录。

- [ ] Step1 tests“complete_scope_and_non_destructive_restore”：知识/CRM/定制技能/二进制字节完整，迁到独立目录workspace匹配后可恢复，目标instanceId保留而非克隆凭据；旧Snapshot仍过；缺外部确认仅列缺口；HTTPURL只列引用；已确认外部文件只读登记项。wrongscope/hash/大小/别名/隐藏secret/junction/中途写失败原树不变，原批准payload保持。
- [ ] Step2 `node --test tests/backup-bundle.test.ts`，RED范围遗漏。
- [ ] Step3 在read快照中流式复制/校验、源清单前后校验，写临时目录后原子标可用。排除.env、私钥/证书/owner/publisher/session及内部runtime；检测已知credential文本的文件整份排除并标缺口，不改原bytes。不能承诺识别任意未知嵌入秘密；UI提醒核对定制文件。恢复先全部格式/引用/路径/哈希预检，sourceDirectory只读；差异文件保留incoming，新增业务经B2事务写入。preview后任何目标/来源变化拒绝应用。实例描述仅备份元数据，不自动覆盖目标instance或恢复私有凭据；FullBackupManifest每个blob只允许blobs/<64hex>、大小和SHA一致。
- [ ] Step4 focused、legacy backup/CRM/发布不变测试/type/build，实际HTTP/CLI目录导出及恢复；URL来源不请求下载、不含密钥，不对实际客户恢复。
- [ ] Step5 双审查，C2消费exportFullBackup和manifest覆盖信息。

### Task C2：默认关闭的本地备份计划及保留预览

**Files:** Create src/backup/scheduler.ts、src/backup/retention.ts、tests/local-backup-plan.test.ts。Modify server.ts、web/views/backup.js/settings.js、scripts/workbench.mjs。
**Interfaces:** BackupPlan={version:1,enabled:boolean,timezone:'Asia/Shanghai',time:'02:00',dailyKeep:7,weeklyKeep:4,lastAttemptDay:string|null,nextRunAt:string|null}；tickBackup(root,nowISO):Promise<{status:'disabled'|'not-due'|'running'|'completed'|'partial'|'failed',backupId?:string}>；previewBackupPrune(root):{id,deleteIds:string[],keepIds:string[],fingerprint}；confirmBackupPrune(root,id,{confirmed:true}):Promise<{deleted:string[]}>。配置属于客户，默认false。

- [ ] Step1 tests“daily_service_not_host_and_safe_prune”：Shanghai跨日/重启最多每日一次，两个服务只一份；失败不每tick自动补跑；关闭无动作，停服next状态诚实；残缺backup不报完整；unknown/partial/最后成功不删；预览后变化或symlink阻止删除整批；只temp受控备份ID。
- [ ] Step2 `node --test tests/local-backup-plan.test.ts`，RED后实现。
- [ ] Step3 定时器仅当服务存活且客户enabled运行，attempt-day在同lease事务登记，archive失败如实记录；应用关闭不称WorkBuddy后台运行。7日/4周按manifest时间和校验生成预览，默认不自动prune；确认前重验目录/nonce/manifest，删除仅预览内本客户完整bundle，最后成功不可删。设置列最近成功/失败/覆盖缺口/次次时间，操作有等待/读回及未保存保护。
- [ ] Step4 focused/type/build；临时编译服务实际启用/禁用/创建与清理预览，不删除实际备份；明确CLI本地能力和宿主原生调度区别。
- [ ] Step5 双审查，C完成，不提交。

