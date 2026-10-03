# ima / 腾讯乐享可选扩展

默认 storageMode=local-first；外部源是客户选择的补充，不是安装前置条件。WorkBuddy原生资料管理与本地工作目录分别记录，不能把文件存在当RAG已索引。

ima适合引用客户已授权的个人/共享/订阅知识；乐享适合企业/团队已有知识。入口按实际客户端“资料库”中对应服务进行授权。没有当前工具时给客户操作路径，状态为未配置或待验证，不创建虚构ID或凭据。

外部源配置位于 knowledge/sources-config.json，仅记录 provider、knowledgeBaseRef、用途、状态及是否允许写回；不保存token。新增外部源须客户选择并核验实际读权限，记录实际查询和文档出处。检索失败可继续利用足够的本地资料，显示缺失项；不得返回伪造远程结果。

从外部获取资料：按任务最小范围查询 → 保留文档ID/链接、出处、日期和权限范围 → 摘要写回本地待审记录 → 客户确认后成为使用上下文。只经授权才缓存原文、上传文件或写回云端；有宿主成功回执及读回证据才标记已同步。禁止默认全量复制、自动双向覆盖或自动开放分享。

官方参考（2026-10-03核对）：
- [WorkBuddy资料库](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Library)
- [WorkBuddy × ima功能指引](https://free-plat-test.qcloudcdn.com/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Knowledge-Base/IMA%20Knowledge%20Base/01-Workbuddy-IMA-Basic-Guide)
- [WorkBuddy乐享知识库](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Knowledge-Base/Lexiang)

这些是宿主能力指引；本仓库没有独立ima/乐享API客户端，实际能力以当前账号授权与工具提供情况为准。
