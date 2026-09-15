# handoff

- 当前任务：CHG-020，用户指定实施 spec 漂移治理、需求—功能—技术实现可视化与意图/解释分层；原话见 CHG。
- 范围：F25 / REQ-029～031；需求 v11、总览 v7、F25 计划均 working；不重做 F1～F24。
- 分支：codex/safe-framework-update；本轮版本 0.14.0，实现提交 162ae08，仅本地交付，未推送/发布。
- 已做：共同模型、文件级显式复核、离线交互总览、模板与根契约；0.14.0 本地代码已实现。独立审阅所见未关联需求不可见与下游来源预检缺口已修，完整 verify 338 过 / 0 失败、类型检查通过；详细证据见 F25 worklog。
- 当前阶段：代码、自动验证和独立代码复核已完成。未关联需求、来源预检与 hashchange 焦点问题均已修复并经新上下文复核；最新正式证据 338 过、类型检查通过。
- 本地检查：提交后完整 check 退出 0、保留 4 项旧提醒；drift --check 因 F25 unreviewed 退出 1，其余 24 个旧功能未接入。不得将前者当作后者或真实界面验收已完成。
- 下一步：用户在本机浏览器打开 keel/evidence/atlas.html，实际核对搜索、Tab/Enter 功能切换与窄屏布局。当前通道禁止本地 URL，不能绕过；未补齐前保留 F25 unreviewed、无 summary，不把提交/内容复核当作用户验收。
- 该读：keel/features/f25-spec-governance/plan/v1.md、keel/features/f25-spec-governance/worklog.md、keel/plan/overview-v7.md；需要来源再读 RES-912。
- 限制：没有新增运行依赖、编排器或服务，未改 taotie。真实浏览器键盘/布局/窄屏、远端 CI 和用户验收未完成，旧 CI/manual/proxy/APR 提醒保留；不扩到历史 frontier。
