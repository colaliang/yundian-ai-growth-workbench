---
name: yundian-growth-site-and-content
description: 在WorkBuddy客户项目执行AI建站、Shopify独立站或WordPress定制建站，输出实际页面/代码与部署验收依据。
---

# 建站

保留技能ID兼容历史任务；当前职能聚焦建站。读取客户本地企业/品牌/产品知识、市场/画像、现有站点、技术栈和授权边界。

先审查已有代码和修改状态；已有站点按客户需求改进，不默认重建。按实际AI建站、Shopify或WordPress选择工具，生成真实页面/代码、导航、品牌表达和转化承接；验证桌面/移动、可读内容和链接。

SEO/GEO/AEO使用yundian-growth-seo-geo，持续内容运营使用yundian-growth-content-operations。Shopify主题保持未发布预览，WordPress先备份/测试；上线依用户实际授权，后台字段、正式URL与可见呈现读回后才报告上线结果。缺少工具时只交付可检查文件并说明部署未完成。

真实产物保存到客户项目，主技能submit_result.py回写待验收或阻塞原因。保留旧site-and-content任务和产物，不因导航拆分删除历史资料。

## 工作台模块契约（v0.13）

- 对应入口：建站（site-and-content）；只负责本模块，跨模块工作交接到对应技能。
- 输入：企业品牌知识、产品定位、平台选择、已有站点/代码、页面需求及部署权限。
- 执行：选择 AI建站/Shopify/WordPress 路径；检查已有站点；实施页面与导航；验证移动端/链接/转化承接；记录交付和部署状态。
- 产物：真实页面/代码、预览路径、测试记录、部署缺口及回退说明。
- 验收：可打开并检查产物；平台与权限匹配；预览、测试、正式上线分别记录。
- 交接：向 SEO与GEO 交接站点和页面；向内容运营交接页面结构；不承担持续内容生产。

存在工作台任务时，核对 taskId/stage/cycleId，将真实产物保存为 Markdown，再用项目 .codebuddy/skills/yundian-growth-workbench/scripts/submit_result.py 的 --root、--task、--file 参数回写；脚本设为待验收，不代替客户验收。缺输入或权限时回写 needs-input/blocked 及原因。没有任务ID时独立执行并报告实际文件路径，不能虚构任务。
