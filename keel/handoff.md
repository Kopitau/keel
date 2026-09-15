# handoff

- 当前任务：APR-012 授权的本地合并与 GitHub 推送已完成；CHG-020 / F25 实现与验证已完成。
- 范围：F25 / REQ-029～031；需求 v11、总览 v7、F25 计划均 working；不重做 F1～F24。
- 当前分支：codex/astra-instructions（GitHub 实际默认分支）；合并提交 e59a272 已到达远端，codex/safe-framework-update 也已推送至 72a3b74。版本 0.14.0；未改仓库可见性或默认分支。
- 已做：功能实现、独立审阅回修与本地合并推送。首次远端 CI 暴露一条旧测试依赖仓库缺证据的假设，已改为隔离场景；本地重新正式验证 338 过、类型检查通过，最新树 4629328986122f2737cf08653868e6353df34b1a。
- 界面证据：用户 2026-09-15 对搜索、Tab/Enter 切换、窄屏显示明确反馈正常；工具仅可定位 Chrome 标签，内容读取仍受 URL 限制，未绕过。按用户实测记录，不冒称 agent 直接观察。
- 本地状态：F25 summary 已补齐、内容复核 aligned，drift --check 退出 0；其余 24 个历史功能未接入。原 CI/manual/proxy/APR 提醒保持，不等于全项目验收。
- 远端证据：初次两个 refs 已核对；合并提交 Actions 34925747462 六格均为同一条旧测试失败，而非 F25 功能测试失败。保持失败历史，修复后以新提交对应的 Actions 结果为准。
- 交付收尾：测试隔离修复 67df440 已通过正常钩子推送到默认分支，源分支保留在 72a3b74。本轮合并上传操作完成；最新 CI 结果见仓库 Actions，不能从上传成功推断。
- 下一步：无需重复合并或推送；需要远端验证状态时查询最新提交的 Actions。不从历史 frontier 自动开工。
- 该读：keel/features/f25-spec-governance/summary.md、同目录 browser-check-2026-09-15.md；需要过程再读 worklog、plan/v1.md 与 RES-912。
- 边界：本次明确允许合并/推送；不发布发行版、不强推、不改保护设置或 taotie。需求/计划仍 working，CI 与完整人工验收不从上传成功推断。
