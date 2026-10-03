# 原标准与实际执行口径

Shopify标准为2026-09-30版本；WordPress原文件存在历史要求，保留原文以便核对，不直接判为现行平台强制规则。技术检查、约定目标和外部效果分别呈现，合同差异列待确认，不由技能改变双方约定。

| 原要求 | 执行规则 |
|---|---|
| Mobile-Friendly Test / 固定3G首屏3秒 | 使用当前浏览器/Lighthouse等实际可用测试；保留合同目标并注明测试条件，不伪造已停用工具报告 |
| 首选域/国际目标工具 | 核验平台域名、canonical/hreflang、Markets或WP语言配置及实际搜索工具能力 |
| sitemap频率/priority / 每月更新 | 核验可索引URL、XML、更新时间；Shopify自动地图不要改成人工静态地图；不把可选XML字段当收录保证 |
| 普通页面Google Indexing API | 不能用于普通产品或博客；按地图/内链/GSC及适用IndexNow验证；提交成功不等于已收录 |
| 固定Title/Description字符数 | 按当前约定审查显示与语义，不自动覆盖批准标题；长度建议不是通用判废条件 |
| 原创率90% | 明确原合同要求，另检查真实性、授权、差异与重复；检测分数不能代替质量 |
| 强制FAQPage/HowTo/Speakable | 可见内容/用途匹配才考虑，Rich Results与Schema语法分开；AI搜索没有必选特殊Schema |
| Knowledge Panel/Featured Snippet/PAA/AI引用 | 记录观察和内容准备，外部展示不作为即时保证；问题覆盖与实际搜索展示分开 |
| 全放行AI爬虫 | 搜索、用户访问和训练按客户意愿分别配置，不默认全放行 |
| llms.txt/agents.md | 约定才验收，核实实际公开路径、状态、内容与部署；本地文件或Files存储不能证明根路径可访问，也非Google生成式搜索必需 |
| EXIF品牌信息 | 核验真实资源、alt、正文和授权；CDN可能不保留EXIF，不冒充实拍/案例 |
| 停留2分钟/跳出60% | 按GA4事件定义、来源、时窗和实际基线观察，不机械认定增长效果 |

WordPress补充：核验设置→阅读的可见性、SEO插件/主题meta和Schema重复、缓存/CDN真实输出、多语言插件及重定向；迁移要保存旧路径映射、备份和回滚。插件配置正确不等于公开页正确。

官方核对入口（执行时复核最新规则）：
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/apis/indexing-api/v3/quickstart?hl=zh-CN
- https://help.shopify.com/en/manual/promoting-marketing/seo/find-site-map
- https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt

源文档条款需按客户实际项目适用，不能把示例EME品牌、美国/USD、吊灯规格、路径或合同法律表述自动套入其他客户。
