# 全域获客流程与回执

七步主线保持市场→机会→建站与内容→获客→背调→反馈→下一轮，业务阶段从registry/MODULES读取。建站、SEO、GEO、内容与社媒分别保存任务；Facebook和Google Ads支持策略、素材、只读分析，客户明确授权且真实工具可用时才实际编辑或投放。LinkedIn及邮件默认草稿，发送与结果须真实回执。

客户自行定义目标、输入来源、工具、步骤、依赖、产物、验收和外部动作范围。任务绑定workspaceId、taskId、技能版本、输入快照、cycleId；workflow定义不是已执行。初始化只补缺文件。上游成果、leadId及源轮次关系可追溯，下一轮建议保留反馈来源，不自行代填成交。

ready为待执行，复制不改变状态；running须宿主实际回写。真实文件receipt校验路径、任务、workspace与版本，读回后needs-review，客户按artifactId与当前hash验收才completed。缺输入needs-input、实际失败failed，历史blocked须保留解释。链接和人工上传不代表宿主执行，文件改动使旧验收失效；重跑创建新批次。

定时仅管理配置/指令和真实结果，不以本地定时器冒充原生WorkBuddy。当前无原生创建/验证/暂停接口；手填ID不表示已启用。计划ID+计划时间去重，外部动作失败不自动重试。知识确认与任务验收分开；在线备份无认证隔离存储时保持关闭，本地恢复冲突保留双方。

## 内容计划与发布回执（B5）

内容/社媒任务生成 content-plan.json（schemaVersion:1、workspaceId、items，sourceTaskId 关联真实任务）；使用主技能 submit_result 回写来源，工作台通过导入预览/冲突确认录入。不可由宿主直接调用网页私密配置或写入发布真相。API Key 不写技能产物、知识库、剪贴板或普通备份。

发布必须经过当前内容 hash 审核及正文/渠道/实际远端素材/时间/数值预算确认；发布记录及逐渠道回执由服务器受保护管线保存。内容来源成果属于 content-operations；social-media 成果仅在真实 task.stage 属于该项目时展示。unknown、partial、scheduled、pending 分开，不自动补发，不取消旧远端排期。content-items/publish-attempts/publish-confirmations 纳入备份，服务器密钥配置独立保护。部署与回滚见 docs/content-publishing.zh-CN.md。

## 模块与执行阶段
业务区13个项目对应15个执行阶段；SEO与GEO统一seo-geo历史阶段、seo及geo。MODULES.json的executionStage是任务阶段，uiModule是成果归属；knowledge另属企业知识库入口。成果依据真实任务stage归属，不凭宿主声明module移到其他项目。市场调研、产品机会、背调、销售反馈不显示专家咨询。

CRM仅使用当前客户已存在company/contact/lead；导入先预览再确认去重，sourceLeadId不作为文件路径。背调/开发/反馈任务绑定当前crmLeadId并走同一receipt流程；真实跟进和反馈经客户确认关联，下一轮引用原cycleId与证据，模型不能推断成交。客户选定可公开事实进入内容，联系人不自动进入公共知识或发布正文。
