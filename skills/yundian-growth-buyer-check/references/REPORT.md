# 报告与字段

三部分/可选Excel三表：
1. Cover：实际日期、客户、渠道/批次、输入记录数、唯一个体数（仅确认去重后）、核验状态、优先级分布和局限。
2. Lead Analysis：leadId、originalLeadIds、cycleId、opportunityId、渠道、原始姓名/邮箱/电话/公司、官网、国家及依据、行业、规模及证据、主体状态、联系人关系、产品匹配、需求/意向、风险、priority（1–5/null）、来源引用、查询日期、duplicateOf/待合并、中文摘要、下一问题/动作。
3. Priority Summary：按高/中/低/待确认分组，显示leadId、理由、尚缺字段和建议动作；汇总数与明细一致。

默认把来源表包含在Markdown或单独JSON/CSV。structured JSON含schemaVersion、batchId、taskId、generatedAt、inputRefs、leads、sources；未知为null/待核，联系方式按字符串保存。taskId有实际记录才填。

Excel可由WorkBuddy当前表格技能生成：文本字段强制文本，避免公式注入、电话科学计数和前导零丢失；颜色只辅助展示，不用红色暗示未核验者是诈骗。交付前重新读取工作表、行数、枚举、优先级计数、空值和引用；无表格能力先交Markdown/JSON，不假称已生成xlsx。

原始个人联系方式仅留在授权客户项目，不上传开源仓库、公开分享或无关云端知识库；回写公开企业知识只包含允许范围。联系、CRM更新或外发报告需实际授权。销售反馈保留稳定leadId及渠道/机会关系，验证最初优先级并修订规则，不能把人工评分称为实际获客质量。
