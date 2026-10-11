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
