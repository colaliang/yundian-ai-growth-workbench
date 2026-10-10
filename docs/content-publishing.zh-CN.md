# 内容发布面板使用与部署

内容运营 → 选题与排期 → 发布/回执。先读取服务端配置、账号渠道/媒体及余额；选择实际渠道和远端媒体、立即或 ISO UTC 排期时间，保存选择并送审，然后批准当前版本。正文、渠道、素材、时间变化均需重新批准。prepare 后展示准确正文、摘要、渠道、素材、时间、余额和最高积分；勾选本次授权后提交，按钮立即禁用。

密钥默认未配置，预算默认 0；在服务器通过 WORKBENCH_PUBLISHER_API_KEY 配置，设置中只展示遮罩并保存数值预算。真实发布要求正整数单次/每日上限。公网部署需 B1 所有者认证及 HTTPS；匿名者不可读取私有工作区或触发付费动作。线上认证、真实工具能力、真实扣费和设备证据尚须单独验收，本轮只有本地 mock。

在 https://socialmedia.ydjia.com/media 上传素材，刷新账号媒体后选择 ID。没有本轮 API Key 上传功能。本地图片路径不能冒充 remoteMediaIds；图片渠道需要远端素材，TikTok 需要视频。未声明媒体上限不会阻止纯文本渠道，供应商最终平台验证仍具权威性。

确认绑定正文/目标/媒体/时间摘要及当前账号，上限与余额在 prepare 和 submit 重新检查。内容显示使用项目 IANA 时区；积分日界线固定 Asia/Shanghai。服务未提供扣费明细，actualCredits=null；保守预留目标渠道数，不称作实际费用。以逐渠道证据展示 published/failed/pending，顶层 partial/unknown/scheduled 不能当作全部发布。

刷新回执使用工作台 POST /api/publisher/attempts/:id/refresh（带工作区 token 与 revision），后端只调用远端 get_post；这是只读核对，不重新 create_post/publish_post。错误不自动重发。刷新会更新工作区 revision。已有远端排期需逐批勾选 acknowledgement；编辑、归档及本地排期改变均不会取消远端帖子。

技能生成 schemaVersion=1、workspaceId、items 的 content-plan.json，通过主技能真实回写再受控导入并解决冲突，sourceTaskId 保持真实归属。回执保留在 content-items/publish-attempts/publish-confirmations，纳入普通备份；凭据不进快照、技能、剪贴板或浏览器存储。回滚代码前备份，不删除已提交 postId/回执或未知状态记录。

## 发布版本存档与媒体准备

新确认记录保存完整已批准内容的 hash 输入；新提交批次在任何远端创建之前保存同一版本及实际 createPost 载荷。回执展示当时标题、正文、本地素材关联、远端素材 ID 与完整输入，后续编辑不会覆盖该历史。备份/恢复校验存档内容摘要、载荷和确认关联。旧批次没有存档时明确提示历史内容不可恢复，不用当前正文补填。处理中编辑后仍保留批次关联；后续发布检查阻止继续，不自动重发。

服务器在准备和提交两阶段重新读取当前发布账号的渠道和媒体：Instagram/Pinterest 必须关联实际远端素材，TikTok 必须关联 mimeType 为 video/ 的远端视频；本地素材路径不能代替远端 ID。支持文字的渠道可无媒体。此检查不新增平台数量限制或上传能力。
