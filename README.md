# 云店+ AI Growth Workbench

客户自主使用的 WorkBuddy 获客工作台与技能包。面向跨境 B2B 外贸工厂和跨境卖家。

**市场调研 → 产品机会 → 建站与内容 → 获客 → 客户背调 → 销售反馈 → 优化下一轮**

客户定制各阶段目标、渠道、工具和验收标准，简化版直接利用 WorkBuddy 执行。默认空白项目，无虚构客户或模拟执行数据。

## 快速启动

需要 Python 3.10+，服务端使用标准库，无需安装依赖。

```powershell
git clone https://github.com/colaliang/yundian-ai-growth-workbench.git
cd yundian-ai-growth-workbench
# 请先创建或选择你自己的客户项目目录
python server.py --root "D:\MyCustomerProject" --port 8767
```

打开 http://127.0.0.1:8767/ 。macOS/Linux 也可运行，使用 python3 和实际目录路径。--root 必须是已存在且获授权的目录。首次启动会生成 growth-workspace/；先填写企业知识，再创建阶段任务。

## 技能安装与 WorkBuddy

- 下载 [技能包 ZIP](dist/yundian-growth-workbench-v0.3.zip) 并按 WorkBuddy 的技能导入方式安装。
- 或将 skills/yundian-growth-workbench 放入客户项目的 .codebuddy/skills/。
- 在 WorkBuddy 当前项目首次调用：**初始化我的获客工作台，先创建企业知识库并关联当前项目资料。**
- 在网页任务详情复制 WorkBuddy 指令，交给原生项目对话执行。实际产物写入约定文件后刷新工作台可读回；也可在页面保存实际产物内容。客户填写验收依据后完成任务。

技能安装不会自动执行初始化。原生项目、资料库和空间关联需要 WorkBuddy 实际可用功能；录入名称或链接不代表关联已完成。

## 当前能力

七阶段导航、企业知识与来源录入、自定义任务与流程、项目文件保存、WorkBuddy任务指令、产物读回、客户验收、销售反馈。产物改变后旧验收失效。提供请求令牌、版本冲突检查与单文件原子替换。

仅监听本机127.0.0.1，不是公网/多人服务。不同客户使用独立目录；不提供账号租户隔离。不要把客户数据、凭据或 growth-workspace/ 上传到仓库。广告仅只读分析；当前不包含模型后台直连、供应商API接入、自动发信或发布。真实外部执行依赖客户授权和工具配置。

## 文档与检查

[规划方案](docs/project-plan.zh-CN.md) · [技能说明](skills/yundian-growth-workbench/SKILL.md)

```powershell
python -m unittest discover -s tests -v
node --check app-v03.js
```

## 开源许可

代码与技能采用 [MIT License](LICENSE)。云店+名称与logo为品牌标识，使用须遵守 [品牌说明](BRANDING.md)。欢迎通过 Issue 和 Pull Request 反馈改进。
