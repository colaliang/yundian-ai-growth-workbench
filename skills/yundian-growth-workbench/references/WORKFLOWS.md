# 七步获客闭环与客户自定义工作流

工作流保存到 `growth-workspace/workflows/<slug>.json`：id、version、name、goal、inputs（来源/文件）、steps（工具/依赖/输出/验收）、externalActions、budget、feedback。由客户目标决定内容，工作流定义不等于已执行。

任务单独保存到 `tasks/<uuid>.json`，记录 workflowId/version、status（needs-input/ready/running/blocked/completed）、inputRefs、artifactRefs、evidenceRefs、startedAt、finishedAt、error。只有写入并读回产物、满足验收条件才 completed。失败和恢复保留历史，不凭空登记工具回执。

固定主线：市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮。具体任务可从客户当前阶段切入或并行。

各阶段流程：

- 市场研究：范围与来源 → 竞争/需求证据 → 结论与不确定性 → 研究报告。
- 产品机会：产品约束 → 需求/竞争/成本证据 → 机会评分与风险 → 待验证清单。不能保证爆款。
- 建站/SEO/GEO：企业事实 → 站点诊断/关键词 → 页面或内容草稿 → 验收；AI建站、Shopify、WordPress共用事实，执行工具分别配置。
- 主动开发：客户画像 → 真实可用名单来源 → 去重/背调 → 文案草稿 → 经授权发送及回执。未购买数据不编造联系人。
- 广告：官方只读数据 → 异常/归因分析 → 建议报告 → 官方后台链接，不执行投放操作。
- 质量复盘：客户实际跟进反馈 → 有效/无效原因 → 来源与画像关联 → 下一轮改进；区分预测评分和实际成交。

客户可自定义各阶段的目标、资料、渠道、步骤、工具、结果、验收和反馈，扩展应服务获客闭环。每个任务附带 cycleId、stage、upstreamArtifactRefs 和 downstreamTaskRefs。获客/背调/销售反馈按稳定 leadId 串联；销售反馈必须来自实际跟进，缺失时保持待反馈。优化下一轮输出有证据的改进假设及新任务，链接回上一轮来源，不以模型推测填充成交。完成后的确认事实进入知识索引，未证实推断保留来源和状态。
