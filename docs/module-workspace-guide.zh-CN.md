# 模块工作台操作指南

当前为0.15.0 unpublished working-tree构建。WorkBuddy实际执行技能，网页管理任务、成果、验收及客户记录；网页无需AI助手或模型服务。

## 项目与成果

从工作台选择13个业务项目。SEO与GEO包含seo-geo历史任务、seo和geo，共同归属同一项目；全部业务共15个执行阶段。项目内新建任务，选择官方或客户定制技能，填写来源和验收条件；复制指令后任务仍待执行。在WorkBuddy当前客户项目执行，保存真实文件，用技能submit_result.mjs回写同一workspaceId/taskId/skillVersion及来源。成果读回后进入待验收，客户核对文件与当前contentHash后验收；改动文件使旧验收失效。

项目内成果只显示该项目真实任务的成果。历史SEO/GEO、交付计划、markdown及二进制文件仍可读取。市场调研、产品机会、客户背调和销售反馈提供免费技能入口；其他项目按实际专家配置显示咨询。专家复制指令来自项目技能目录；复制或点击联系方式不分享客户资料，选择成果后才产生授权范围。

## 内容列表、排期及媒体

内容运营打开内容列表：填写产品、目的、语言、关键词、正文、内容类型、来源任务和轮次。关联本地素材仅作为来源；实际发布需选择已在远端媒体库存在的mediaId。按渠道、状态和时间筛选，可在列表与排期视图查看。导入content-plan.json/CSV先预览错误及冲突，再逐项保留本地或应用新版本；导入不恢复已发布或已批准状态。

批准针对当前内容hash。修改正文、渠道、素材或时间后重新审核。配置所有者保护的发布Key和单次/日数值预算，默认0禁止付费动作；固定服务端endpoint为https://socialmedia.ydjia.com/api/mcp。确认正文、渠道、远端素材、立即/未来UTC时间及预算再提交。时区Asia/Shanghai用于日预留；actualCredits=null表示实际收费未知。published须逐渠道实际回执，scheduled是远端排期证据。partial、pending和unknown分别保留；超时先刷新回执，不能自动补发，旧远端排期需显式知悉。本次只通过mock验证，没有真实Key、收费发布或平台结果验收。

## 客户CRM及业务闭环

客户CRM新增公司，记录来源；为同一公司新增多个联系人，不凭邮箱/域名提示自动合并。新增线索关联真实公司和联系人，来源项目可追溯；opportunityId须使用已存在的产品机会业务记录ID。外部sourceLeadId仅保存在字段，服务器生成独立文件ID。

选择线索查看来源与时间线，记录实际跟进方法、内容、结果、下一步及下次时间。创建背调、LinkedIn或邮件任务时传入当前线索，继续用既有任务/receipt回写。导入先看错误行和重复建议，再明确创建、跳过或关联已有记录；不覆盖已有客户字段。反馈仅记录真实回复/拒绝等事实，客户确认关联到已存在CRM线索；下一轮任务继承源cycleId并引用反馈。阶段改变留历史，模型报告不能代填won。到期提醒只看最新实际跟进，完成或归档后不重复推荐。

## 所有者部署与备份

每客户独立目录，默认127.0.0.1本地运行。公网单客户单实例先在服务器本地设置指定口令环境变量，运行node scripts/configure-owner.mjs WORKBENCH_OWNER_PASSWORD，清除口令变量并重启。配置保存在真实用户主目录私密目录，不进入源码/客户快照；缺配置显示setupRequired，未登录返回401。HTTPS或受可信TLS代理保护，WORKBENCH_TRUST_PROXY=1仅在代理覆盖转发头且隔离后端直连时启用。保持setup启动与宿主唤醒流程，服务在线和WorkBuddy原生定时各自验证。

快照覆盖content-items、publish-attempts、publish-confirmations、crm-companies、crm-contacts、crm-leads、crm-followups、crm-feedback-links。恢复前校验空间、哈希和实体引用，保留冲突双方。代码回滚保留新目录及外部发布事实；回滚不撤回远端已发内容。技能17个独立ZIP和总包18件仅从skills目录打包，manifest按原文件SHA-256比较；同名客户定制保留，先独立暂存官方更新。本地构建与浏览器验证不能冒充公网部署、原生宿主执行或真实收费验收。

<!-- workbench-ui:begin -->
一级导航：工作台、企业知识库、营销推广、内容运营、客户管理、定时任务、设置。
营销推广包含12个子项目，各占一行；内容运营只在一级出现。保留13个项目、15个执行阶段及历史SEO/GEO入口。
免费项目：市场调研、产品机会、客户背调、销售反馈，无专家咨询窗口；其余项目页末按钮按需打开，二维码仍为占位，不自动发送客户资料。
<!-- workbench-ui:end -->

## 第一批工作台确认与 CRM 接线

先读取当前客户项目的本地知识、来源和当前 contentHash；知识确认只表示客户确认这些字节，知识健康与任务 ready/needs-review/completed 分开。首次使用补全企业、产品、市场、买家、目标五项事实并确认当前知识后创建第一项任务；复制指令、安装文件和名单导入都不代表 WorkBuddy 实际执行。

成员由客户提供真实项目名单，工作台 `/api/crm/members/import/preview` 预览并逐项决定，`/api/crm/members/import/confirm` 要求 confirmed:true。source 为 customer-import、verification 为 customer-confirmed，不能声称原生成员 API 自动同步。以稳定 ownerMemberId 关联负责人；同名不自动匹配，旧 owner 文本保留，停用成员不能新指派。

公司、联系人、线索与下次跟进通过 `/api/crm/lead-records` 完整创建/编辑，输入分为 company、contacts、lead；客户确认 shared/source 修改后才写入。来源候选用 `/api/crm/import/preview` 预览，客户逐项确认 create/skip/link-existing 后入库；保留来源、外部 sourceLeadId 与内部稳定 crmLeadId，不由 AI 自动合并或生成真实联系人。以上 API 均沿用所有者认证、客户 workspaceId、当前 revision 和工作区令牌；遇到 401/409 保留输入，重新认证或核对后由客户明确保存，不自动重提交。

列表和 `/api/crm/export` 采用同一组合筛选：公司/联系人查询、国家、来源、阶段、标签、负责人、跟进日期。selected 只导出当前筛选内明确勾选 ID，filtered 导出全部筛选结果而非当前分页；客户确认字段/范围后下载真实 UTF-8 BOM CSV，长电话与公式文本安全保存。销售反馈由真实客户记录并明确关联当前线索后进入下一轮，名单数量、背调预测和草稿不代表成交。

普通快照仅覆盖 growth-workspace；客户 `.codebuddy/skills` 全目录、外部附件和工作区外产物须另行备份。官方安装核对 SKILL.md 及所需资源/共享脚本，任何同名不同字节的定制文件都保留，先独立暂存官方版本并审阅。应用 0.15.0、现有技能 0.16.0 的本次交付为 working-tree、published:false；未创建正式发布或部署。原生宿主执行、成员 API、云同步、真实发布与付费效果均待真实授权和回执验证。
