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

## 第一批工作台确认与 CRM 接线

先读取当前客户项目的本地知识、来源和当前 contentHash；知识确认只表示客户确认这些字节，知识健康与任务 ready/needs-review/completed 分开。首次使用补全企业、产品、市场、买家、目标五项事实并确认当前知识后创建第一项任务；复制指令、安装文件和名单导入都不代表 WorkBuddy 实际执行。

成员由客户提供真实项目名单，工作台 `/api/crm/members/import/preview` 预览并逐项决定，`/api/crm/members/import/confirm` 要求 confirmed:true。source 为 customer-import、verification 为 customer-confirmed，不能声称原生成员 API 自动同步。以稳定 ownerMemberId 关联负责人；同名不自动匹配，旧 owner 文本保留，停用成员不能新指派。

公司、联系人、线索与下次跟进通过 `/api/crm/lead-records` 完整创建/编辑，输入分为 company、contacts、lead；客户确认 shared/source 修改后才写入。来源候选用 `/api/crm/import/preview` 预览，客户逐项确认 create/skip/link-existing 后入库；保留来源、外部 sourceLeadId 与内部稳定 crmLeadId，不由 AI 自动合并或生成真实联系人。以上 API 均沿用所有者认证、客户 workspaceId、当前 revision 和工作区令牌；遇到 401/409 保留输入，重新认证或核对后由客户明确保存，不自动重提交。

列表和 `/api/crm/export` 采用同一组合筛选：公司/联系人查询、国家、来源、阶段、标签、负责人、跟进日期。selected 只导出当前筛选内明确勾选 ID，filtered 导出全部筛选结果而非当前分页；客户确认字段/范围后下载真实 UTF-8 BOM CSV，长电话与公式文本安全保存。销售反馈由真实客户记录并明确关联当前线索后进入下一轮，名单数量、背调预测和草稿不代表成交。

普通快照仅覆盖 growth-workspace；客户 `.codebuddy/skills` 全目录、外部附件和工作区外产物须另行备份。官方安装核对 SKILL.md 及所需资源/共享脚本，任何同名不同字节的定制文件都保留，先独立暂存官方版本并审阅。应用 0.15.0、现有技能 0.16.0 的本次交付为 working-tree、published:false；未创建正式发布或部署。原生宿主执行、成员 API、云同步、真实发布与付费效果均待真实授权和回执验证。


## 知识分类与附件登记（E1）

先读取实际知识正文和当前 hash。分类及附件登记使用 `node scripts/workbench.mjs --root <客户目录> --command save --action knowledge-metadata --payload <客户目录内JSON> --revision <当前revision>`，由应用的 B3 写入管线处理。JSON 字段为 workspaceId、path（例如 knowledge/products/lighting.md）、category（company/product/market/buyer/marketing/research/other）、sourceLinks（HTTP/HTTPS 字符串数组）、attachments（每项只能有 path 或 url）。本地附件路径从客户项目根目录开始，使用 assets/、attachments/、documents/ 或 growth-workspace/knowledge/、growth-workspace/assets/、growth-workspace/artifacts/；禁止私有配置和 CRM 记录。元数据单独存储，不直接改写 JSON；不能填写 version、updatedAt、verified 或确认状态。修改前读取 revision，409 后重新核对，不自动重提。

同名不同路径是不同资料；历史未分类显示“其他”，不重写旧正文、来源和确认。手工来源登记只表示引用，外链不下载、不推定核验；本地文件存在也不证明内容真实。知识确认仍使用 knowledge-confirm 与当前正文 hash。无真实回执时为待 WorkBuddy 执行，人工登记不等于宿主执行；成果验收及下一步引用实际文件、当前 hash 和客户记录。

旧 Snapshot API 与 schemaVersion=3/contractVersion=2 保持兼容：快照继续保存 growth-workspace，新增元数据一起校验客户及格式；旧快照无元数据仍可预览/恢复，不为旧文件补造登记。完整目录备份额外覆盖定制技能与已登记可读取的本地附件；外链、缺失文件保留覆盖缺口，恢复前预览新增和冲突，客户明确确认后执行。
