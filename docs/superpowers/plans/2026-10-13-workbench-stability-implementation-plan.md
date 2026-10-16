# 第二批稳定性与交付保障 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 客户工作台可安全升级、并发写入、备份恢复，并支持较大CRM数据量。
**Architecture:** 沿用Node与JSON，统一客户实例、写入协调器及请求快照；分五个子计划，共11项可独立验收任务。
**Tech Stack:** Node.js >=22.18.0、TypeScript、原生浏览器模块、Node内置fs/crypto/async_hooks；Playwright仅开发验收。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md（用户2026-10-13确认）。

## Global Constraints

- 代码：I:/Yundian+/opensource/workbench-ui-20261011，保留第一批未提交成果；运行客户目录及workspaceId不变。
- 不commit/merge/push/tag、部署、收费或真实发布；客户配置迁移/启用备份等动作提供预览和客户确认，不在开发时实际执行。
- schemaVersion=3/contractVersion=2保持；新字段向后兼容，完整备份另设formatVersion=2。旧Snapshot与旧API继续可用。
- 一级工作台/企业知识库/营销推广/内容运营/客户管理/定时任务/设置、13项目15阶段、4免费项目及专家规则保留。
- 凭据不进普通备份、Git、日志、技能包；在线备份关闭；复制、安装、创建和实际执行保持区分。
- 所有故障注入及生成数据只在临时目录；真实客户更新需预检；Windows symlink/junction/大小写别名均防护。
- 执行方式沿用子代理逐任务实施和独立审查；不并行编辑共享文件。替代技能默认commit步骤，使用快照/diff审查。

## Review Focus

1. 客户复制目录或共用代码路径导致instance碰撞/误用密钥：A1绑定与冲突测试。
2. PID重用、活进程锁或无权限探测不能抢锁：B1真实子进程及blocked测试。
3. 第三方手工编辑、CLI与HTTP、发布进行中断：B2/B3哈希冲突、kill及unknown不补发测试。
4. 外部成果、定制技能、凭据样本及半备份：C1范围/缺口/拒绝凭据/恢复原树测试。
5. 跨页选择遇revision变化、旧联系人顺序、手机草稿丢失：D1/D2等价及实际浏览器；E2最终集成。

## 执行顺序与文件

|顺序|子计划|任务|可审查交付|
|---|---|---|---|
|A|2026-10-13-a-instance-auth-plan.md|A1、A2|稳定客户配置与登录保护|
|B|2026-10-13-b-write-recovery-plan.md|B1、B2、B3|跨进程锁、事务及HTTP/CLI统一写入|
|C|2026-10-13-c-complete-backup-plan.md|C1、C2|完整目录备份、恢复预览及可选定时|
|D|2026-10-13-d-crm-performance-plan.md|D1、D2|实测索引优化和真正后端分页|
|E|2026-10-13-e-stability-delivery-plan.md|E1、E2|知识/技能状态、CI和最终验收|

各子计划必须读取Spec与本文件，再读取前置任务Interfaces。A→B→C→D→E顺序执行；每项通过双审查后推进。备份与分页都消费B3请求一致快照，不各做一套锁。具体配置常量在所属计划给定。

## 规划决定

- 完整备份首版为可搬运目录bundle（manifest.json＋二进制blobs），不引入ZIP解析依赖；旧JSON快照保留。创建目录不伪装“已下载备份”。
- 普通成果API仍拒绝工作区外路径。外部备份登记是独立、客户确认的来源清单；不扩大回执读取权限。
- 协调器只约束本应用和官方CLI；WorkBuddy直接文件写入/人工编辑属于非协调写入，以依赖哈希检测，不宣称强制控制全部工具。
- 发布远程请求不持客户锁；只将预约额度/不可变attempt/结果等本地阶段纳入事务；中断仍unknown查询，不重新发送。
- 使用现有工作树，暂不重构全前端或换SQLite。500/5000基准不预填耗时，真实用户反馈另收集。

## 自检与验收

覆盖Spec S1→A，S2→B，S3→C，S4→D，S5→E。11项任务均有RED/GREEN、接口、文件及独立审查；接口引用与前置任务匹配。恢复/并发/发布边界分开验证。

最终只执行必要完整门槛：check:ui、typecheck、test、build、package:skills及17技能/18ZIP校验；编译服务实际HTTP/CLI/Edge1440/390/2K/4K。新旧数据恢复、配置升级、真实child kill、无真实供应商写入。独立全分支最强审查；修复重要问题后复审。保存docs/stability-acceptance.zh-CN.md。

计划状态：用户2026-10-13已确认；已完成基线核验，按子代理实施与独立审查执行。

