# handoff

- 当前任务：用户要求本地与 GitHub 主线统一为 master，分支迁移与默认分支设置已完成；原合并交付、CHG-020 / F25 实现与验证均已完成。
- 范围：F25 / REQ-029～031；需求 v11、总览 v7、F25 计划均 working；不重做 F1～F24。
- 当前分支：master，跟踪 origin/master；GitHub 默认分支与本地 origin/HEAD 均已设为 master，refs 已核对。旧 codex/astra-instructions、codex/safe-framework-update 保留，未删除或强推。版本 0.14.0。
- 已做：本地 master 快进接纳原主线，CI 显式选择 origin/master；四项公开 shell 回归通过，最终正式验证 342 过、类型检查通过，最新树 b545313d84ff7f36410136bded7ad97a5afacc23。原 F25 运行代码、需求/计划与用户界面实测未变化。
- 界面证据：用户 2026-09-15 对搜索、Tab/Enter 切换、窄屏显示明确反馈正常；工具仅可定位 Chrome 标签，内容读取仍受 URL 限制，未绕过。按用户实测记录，不冒称 agent 直接观察。
- 本地状态：F25 summary 已补齐、内容复核 aligned，drift --check 退出 0；其余 24 个历史功能未接入。原 CI/manual/proxy/APR 提醒保持，不等于全项目验收。
- 远端证据：迁移前 49eb13e 的 Actions 34926374071 六格和 gate-ok 已全部通过；master 的配套提交 c3a1296 已推送，后续记录提交与它使用相同代码树。当前 CI 结果以 master 对应 Actions 为准，不从改名或上传成功推断。
- 交付收尾：本次主线命名与必要 CI 联动操作完成；不再把 codex/astra-instructions 当作当前默认分支。
- 下一步：无需重复改名或合并；需要远端验证状态时查询 master 最新提交的 Actions。不从历史 frontier 自动开工。
- 该读：keel/features/f25-spec-governance/worklog.md 的主线迁移段、同目录 summary.md；原界面证据见 browser-check-2026-09-15.md，需要方案再读 plan/v1.md 与 RES-912。
- 边界：本次明确允许统一主线及其提交/推送、默认分支设置；不发布发行版、不强推、不改保护或可见性设置、不动 taotie。需求/计划仍 working，CI 与完整人工验收分开报告。
