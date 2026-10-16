# A 客户实例与认证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 换代码目录不丢客户配置，不同客户不误用同一配置。
**Architecture:** 客户实例描述与用户私有凭据分离，旧配置先预览再确认迁移；登录退避有界。
**Tech Stack:** Node22.18+/TypeScript/fs/crypto，环境注入用于临时测试。
**Spec:** docs/superpowers/specs/2026-10-13-workbench-stability-design.md

## Global Constraints

读取总计划Global Constraints。只新增兼容字段，不自动导入旧凭据，不改当前客户或8767；APP路径旧配置保留。实例绑定不是多租户ACL。所有owner与publisher函数消费同一实例上下文，环境覆盖不落盘。

## Review Focus

客户复制目录/同APP多客户、旧目标冲突、私有目录junction、来源在预览后改变、可信代理伪造：归A1/A2测试。

### Task A1：稳定实例、配置与迁移预览

**Files:** Create src/runtime/instance.ts、tests/instance-config.test.ts。Modify src/domain/contracts.ts、src/auth/owner.ts、src/publishing/secrets.ts、server.ts、scripts/configure-owner.mjs、scripts/launch.mjs、scripts/workbench.mjs、web/views/settings.js。
**Interfaces:** InstanceContext={instanceId:string,workspaceId:string,projectRoot:string,privateDirectory:string}；resolveInstance(root:string,options?:{privateBase?:string,create?:boolean}):InstanceContext；实例描述为客户根.workbench-runtime/instance.json，formatVersion=1，随机UUID且绑定workspaceId；描述同时记录realpath后的projectRoot；同目录已有描述只核验不重写。复制描述到另一客户目录（即使workspaceId相同）不自动继承私有配置，须另走明确的绑定迁移；本批只保证客户根不变、代码目录升级。privateBase默认用户主目录/.workbench-private/instances，privateDirectory由instanceId生成，owner/publisher文件内必须有workspaceId+instanceId绑定。loadOwnerConfig/loadPublisherSecrets等新增接受InstanceContext，旧APP入口仅用于迁移预览，不静默回落。
previewLegacyConfigMigration(ctx,legacyAppRoot):{id,files:{kind:'owner'|'publisher',present:boolean,conflict:boolean}[],fingerprint:string}；confirmLegacyConfigMigration(ctx,id,{confirmed:true}):{migrated:string[],preserved:string[]}。预览绑定目标及来源哈希，确认前不复制；旧文件永久保留，目标不同字节拒绝。私有内容从不返回。环境变量优先且无迁移读回时不宣称盘上已配置。

- [ ] Step1 tests“instance_binding_and_confirmed_migration”：同客户两APP上下文相同；两个workspace不同；复制instance描述到另workspace或另root拒绝；旧凭据不自动可用；确认迁移后原bytes相同；源变化/目标冲突/路径junction失败树不变；temp privateBase隔离，HTTP元数据与普通快照无密钥。
- [ ] Step2 `node --test tests/instance-config.test.ts`，记录缺实例模块的RED；环境权限错误不当产品RED。
- [ ] Step3 实现实例/预览/确认及所有owner/publisher/CLI调用接线。新增GET /api/runtime/status、POST /api/runtime/config-migration/preview与confirm，owner、Origin、token、workspace/revision预检保持；确认路径含来源APP由本地CLI或用户明确选择，不允许公网任意浏览主机路径。状态只返归属/存在/冲突信息。Windows私有目录权限能力诚实标识。
- [ ] Step4 focused与owner-auth/publisher-contract/typecheck；实际临时客户HTTP及换代码目录测试，无真实API Key。验证旧CLI提供可理解迁移提示而非静默失效。
- [ ] Step5 自检与独立审查，保存报告/diff；不提交，A2消费InstanceContext。

### Task A2：登录退避和会话清理

**Files:** Create src/auth/rate-limit.ts、tests/auth-rate-limit.test.ts。Modify src/auth/owner.ts、server.ts、web/views/login.js。
**Interfaces:** LoginLimiter.check(instanceId,clientKey,nowMs):{allowed:boolean,retryAfterSeconds:number}；failure(...)、success(...)、prune(nowMs)。每IP5次失败/5分钟后冷却1秒，继续失败指数增长上限60秒；实例30次失败/5分钟同样冷却，防旋转IP绕过。最多1000个IP桶，20分钟空闲过期，超额先清过期而不删除活跃桶来绕过限流。注入时钟，无真实sleep；会话同样定期删除过期项并限制每实例1000项。

- [ ] Step1 tests“bounded_login_and_expiry”：第5次触发、第6次期间429/Retry-After且不做scrypt；不同实例独立，旋转IP触发实例限制；超限有界；冷却后正确登录清当前IP，不能抹掉其他IP/实例累计；过期session不可用；默认忽略X-Forwarded-For，显式trustProxy才取校验后的地址。
- [ ] Step2 `node --test tests/auth-rate-limit.test.ts`，RED后实施。
- [ ] Step3 接入密码验证前检查、失败计数、成功与清理，保留cookie安全属性/原本地模式；UI显示冷却秒数并保留输入，不自动重登录/重提交。可信代理选项只由部署配置提供。
- [ ] Step4 focused、owner-auth、owner-bootstrap/typecheck及真实本地公共模式HTTP401/429/重新登录；不操作实际客户密码。
- [ ] Step5 双审查与报告，A交付；不提交。

