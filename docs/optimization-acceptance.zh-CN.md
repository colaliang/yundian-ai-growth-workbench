# 第一批优化交付验收（2026-10-12）

本次是应用 0.15.0 / 既有技能 0.16.0 的本地 working-tree 交付，published:false，无正式 release/tag、合并、push 或部署。目标代码目录为 I:/Yundian+/opensource/workbench-ui-20261011。自动化测试仅写隔离临时目录，不向原客户/default 写入测试资料；最终本地预览更新见下文。

## 实际自动化证据

- `npm run check:ui`：exit 0，A1 标记的导航/技能片段保持生成一致。
- `npm run typecheck`：exit 0；初次 test fixture ContentInput 缺 title 已修正。
- `npm test`：177/177，0 fail/skip，exit 0。
- `npm run build`：exit 0，生成实际 server.js 和完整 TypeScript 图。
- `npm run package:skills`：exit 0，17 单技能＋1 总包，共18 ZIP。
- Python zipfile：全部 CRC 通过；每包 SHA-256/大小、manifest 每文件 SHA-256/大小、ZIP 和 skills 源码逐字节一致，81 源文件条目核对，LF 通过。
- 官方 `C:/Users/KEJIE/.codex/skills/.system/skill-creator/scripts/quick_validate.py`：17/17 exit 0。系统及 bundled Python 缺 PyYAML，使用临时独立 `--target`，Python `-X utf8` 避免 GBK；未更改产品依赖。

`tests/optimization-integration.test.ts` 使用真实临时文件验证：客户知识当前哈希确认 → 市场任务 → 文件回执与变更哈希拒绝/当前字节验收 → 客户确认成员及来源候选 → 完整 CRM 与稳定成员关联 → 跟进/阶段/组合筛选 CSV → 实际测试反馈关联 → 下一轮。独立目的目录恢复保留稳定实体、旧 owner 文本、SEO/GEO/历史 seo-geo、旧 MD/bin 原字节、批准内容和不可变提交历史；损坏校验/错误 workspace/路径在写入前拒绝，整目录树及字节保持不变。发布历史仅由本地测试端口生成，未连接供应商。

技能一致性 RED 复现 SKILL.md 相同、引用 WORKFLOWS 不同仍误报 installed；修复检查阶段资源及共享主技能资源，差异产生独立 customer 候选身份，修改资源改变候选版本，同名定制字节始终保留。独立 C2 审查随后发现客户独有引用文件未进入候选哈希，已补充实际客户所选技能及共享主技能两目录的确定性资源清单；不跟随正文 URL、绝对路径或越界引用，目录内外符号链接均拒绝。新增回归验证修改 custom-input.md 改变候选版本/哈希、全文件字节不变、安装保留定制与路径隔离。修复后既有相关6例通过、新回归1/1通过、类型和重新编译 exit 0；全套177例和四尺寸浏览器为修复前基线，未因这个窄修复重复全套。技能字节未修改，打包证据保持有效。技能更新前参考检索契约缺少 customer-confirmed/ownerMemberId/完整 API 路由，修改后通过；这不是真实 WorkBuddy 执行验收。

## 浏览器证据

使用 `node scripts/verify-optimization-browser.mjs`，导入编译 server.js、实际 owner 认证和固定独立端口 19862。Browser 插件未提供，使用 Playwright + Microsoft Edge。最终结果和截图/实际 CSV 在 `.superpowers/sdd/2026-10-12-c-ux-delivery-plan/c2-browser-evidence/`；运行日志为同目录上级 c2-browser.log。最终脚本 exit 0：1440×1000、2560×1440、3840×2160、390×844 全部通过。实际私有数据/新 CRM 资源未登录401，公开固定标签资产200；实际所有者登录、知识当前哈希确认、任务创建/复制、客户确认名单与 ownerMemberId、客户创建/编辑/跟进/阶段筛选、CSV 下载并按完整引号规则解析、漏斗及首页无横向溢出、控制台无未处理错误。实际注销触发401、手动重新认证保留原 DOM 和输入并不自动保存；实际服务端资料更新产生 revision409，保留输入且记录数量不变，客户刷新核对后明确保存。四个 CSV 依次解析1/2/3/4个筛选客户，均为 qualified。

## 数据与能力边界

普通快照仅覆盖 growth-workspace，客户 `.codebuddy/skills` 全目录、外部附件/工作区外已登记产物须另备；未扩展第二批备份。普通异常回滚测试不表示跨进程锁或崩溃恢复 journal。复制指令、安装、回执登记、名单 customer-confirmed 与真实宿主执行是不同状态。

未验证：真实 WorkBuddy 执行/原生成员 API/原生调度/在线资料库或云备份、社媒供应商真实发布与付费调用、五位目标用户试用。C1 原先409/500浏览器回执为 mocked，保持该标签；C2 使用实际服务端修订变化409。未做实际公网部署或原客户资料迁移。独立 C2 审查及全分支最终复审已通过；8767 本地更新见最终收尾。

## 更新步骤

先分别备份 growth-workspace 和客户 `.codebuddy/skills`/外部附件；使用 ZIP manifest 核对 SHA-256/版本，在独立官方目录暂存并审阅同名差异。安装不会覆盖不同字节。所有者认证后核对当前客户 workspaceId、知识当前哈希、旧 owner 与新成员，遇401/409保留输入并由客户明确重新保存。确认真实文件成果后按当前哈希验收；不把本地验收当作部署或供应商验收。

## 协调者最终收尾（2026-10-12）

- 七项任务及其独立审查完成；全分支审查发现 CRM 草稿未接入主导航保护，集中修复后最强模型范围复审 APPROVED，无剩余 Critical/Important。
- 修复后的完整状态重新执行 `npm test`：179/179，0 fail/skip，exit 0；类型检查、界面契约及重新构建 exit 0。该结果更新此前 C2 的177项全套记录；保留原阶段证据而不混写。
- 技能源码未因最终导航修复变化：既有17技能/18 ZIP的CRC/SHA/源码字节/LF/官方校验仍对应当前技能；工作树未发布，无commit、merge、push、tag或生产部署。
- 核对原8767监听PID44084及准确命令/客户目录后，隐藏窗口重启为PID45536；运行当前编译 `server.js`，客户根仍为 `I:/Yundian+/opensource/yundian-ai-growth-workbench/customer-data/default`。
- 更新后的真实本地编译服务在1440/390通过导航取消保留相同DOM、输入、页面及hash，确认丢弃才离开；0 pageerror，0客户写请求。验收脚本先遇Windows ESM URL格式问题，改用file URL后exit0，未改产品来绕过。
- 原客户增长目录32个既有文件，重启及浏览器验证后逐一SHA-256核对，0变更、0删除。只读服务返回原workspaceId、正确projectRoot、13份知识记录；未插入示例客户。
- 最终证据：`.superpowers/sdd/2026-10-12-workbench-optimization-implementation-plan/coordinator/` 中final-full-test.log、final-typecheck.log、final-check-ui.log、final-build.log、final-rereview.md、final-preview-readback.json、final-preview-browser.json与截图。审查及验收目录保留，未删除客户或工作树。

本地地址：http://127.0.0.1:8767/?v=optimization-final-20261012#/overview 。真实WorkBuddy执行、宿主成员API/调度、供应商发布、云备份和目标用户试用仍未验收。
