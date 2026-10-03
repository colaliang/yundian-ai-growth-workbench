# 企业增长上下文规范

来自云店+完整规划 §2.10，按客户实际业务落地，不依赖WordPress或购买建站服务。

| 本地文件 | 业务对象与主要字段 |
|---|---|
| organization.md | Organization：法定/贸易名称、企业类型、地区、主营业务、授权负责人、可核验网站、外部系统引用；组织所有者是客户 |
| brand-profile.md | Brand Profile：品牌ID/所属组织、定位、差异点证据、语言、语气、术语、视觉规则、禁止表述与审核版本 |
| products.md | Products：产品/服务、所属品牌、规格、卖点证据、MOQ、认证、供货/交期约束 |
| websites.md | Website：AI建站/Shopify/WordPress/其他、网址、所属品牌、语言、页面和执行权限 |
| target-markets.md | Target Markets：国家、语言、行业、渠道、品牌与产品线、需求依据 |
| buyer-personas.md | Buyer Personas：采购角色、需求、异议、决策路径、产品/市场关联 |
| crm-and-leads.md | CRM and Leads：系统引用、leadId、来源、阶段、负责人、实际反馈；仅收集任务必要信息 |
| social-channels.md | Social Channels：渠道、账号引用、受众、语气与授权状态，不存密钥 |
| analytics.md | Analytics：流量、询盘、有效线索、归因、定义/时间窗/真实来源；未知不能填0 |
| growth-actions.md | Growth Actions：机会、cycleId、任务/产物引用、验收、结果与下一轮依据 |
| 00-index.md / sources.csv | 统一索引、来源记录、冲突和缺口；原始资料保留 |

现有 profile.md / goals-and-markets.md 保留兼容，不重写客户资料。新增文件为待补骨架，不代表档案已完成。事实引用至少记录来源ID、出处、日期、版本/哈希、适用品牌/市场、审核状态和公开范围；sources.csv旧表头不可直接覆盖，可扩列前备份或另建版本化表。

检索顺序：读取本地索引 → 按当前用途选本地确认资料 → 检查缺口与冲突 → 必要时查询获授权外部来源 → 引用结果并回写待审资料。输出中区分客户事实、外部资料与推断；只有经确认的公开事实用于页面、Schema、社媒或销售邮件。

Brand Profile跨建站、内容、SEO/GEO、商品优化、社媒、邮件和CRM共享。不要把它压成站点主题配置。销售反馈更新画像/渠道假设，不能覆盖产品技术事实。客户撤销来源或授权后，停用相关上下文和派生外发动作，保留必要审计引用。
