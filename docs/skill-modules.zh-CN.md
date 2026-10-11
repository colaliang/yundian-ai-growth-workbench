# 工作台与技能分工（v0.13）

统筹技能 yundian-growth-workbench 只负责初始化、路由、任务定义和回写，不代替业务技能。十个功能模块各有独立技能；增长总览、工作产物和项目设置属于工作台管理入口，由统筹技能负责，不重复创建业务技能。

| 工作台入口 | 模块标识 | 技能 | 核心产物 |
|---|---|---|---|
| 企业知识库 | `knowledge` | `yundian-growth-knowledge` | 知识文件、来源索引、冲突及缺口清单 |
| 市场调研 | `market-research` | `yundian-growth-market-research` | 市场研究报告、证据表、细分市场及买家需求清单 |
| 产品机会 | `product-opportunity` | `yundian-growth-product-opportunity` | 候选机会表、评分依据、风险清单、验证计划及 opportunityId |
| 建站 | `site-and-content` | `yundian-growth-site-and-content` | 真实页面/代码、预览路径、测试记录、部署缺口及回退说明 |
| 主动获客 · LinkedIn | `acquisition` | `yundian-growth-acquisition` | 买家清单、联系人核验、开发信草稿、跟进计划与实际触达记录 |
| 客户背调 | `buyer-check` | `yundian-growth-buyer-check` | 主体证据、匹配判断、风险与未知项、核验问题及 leadId |
| 销售反馈 | `sales-feedback` | `yundian-growth-sales-feedback` | 线索反馈表、质量原因、样本/时间窗、待反馈清单与下一步 |
| 优化下一轮 | `next-cycle` | `yundian-growth-next-cycle` | 复盘报告、改进假设、优先级、验证指标及下一轮任务定义 |
| SEO与GEO | `seo-geo` | `yundian-growth-seo-geo` | 逐项验收台账、证据、负责人、修复措施、复查日期与待验证项 |
| 内容运营 | `content-operations` | `yundian-growth-content-operations` | 选题表、真实草稿/素材、发布计划、实际回执及效果复盘 |

建站模块保留 site-and-content 与原技能ID兼容历史，仅承担建站；SEO与GEO、内容运营已经独立。主线仍为七步获客闭环，具体业务执行展开为九个阶段。菜单内 AI/Shopify/WordPress 等是该模块的执行模式，不重复安装三套技能。

独立安装：在 dist/skills-v0.13/ 下载对应ZIP；业务技能使用任务回写时同时安装统筹技能。总包 dist/yundian-growth-skills-v0.13.zip 包含注册表和全部技能。已有客户定制技能不会被工作台安装按钮覆盖，应对比后由客户选择合并；旧任务保持原ID和路径。

## 项目内专家咨询
四个免费项目（市场调研、产品机会、客户背调、销售反馈）不展示咨询。其余九个项目展示统一专家咨询联系卡，电话微信同号 13631179943，唯一官网 https://www.ydjia.com。未提供真实微信二维码前显示图片占位。咨询不自动发送客户资料或发起付款；历史交付计划与验收数据继续保留。
