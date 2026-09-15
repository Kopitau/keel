# handoff

- 当前任务：用户新增授权本地合并当前改动并上传 GitHub，范围与原话见 APR-012；CHG-020 / F25 实现与验证已完成。
- 范围：F25 / REQ-029～031；需求 v11、总览 v7、F25 计划均 working；不重做 F1～F24。
- 交付分支：codex/safe-framework-update → GitHub 实际默认分支 codex/astra-instructions；版本 0.14.0，实现提交 162ae08。仓库当前公开、目标无保护规则，不改可见性或默认分支。
- 已做：共同模型、文件级复核、离线总览、模板/根契约及独立审阅回修；正式验证 338 过 / 0 失败、类型检查通过，代码树未变，复用有效证据。
- 界面证据：用户 2026-09-15 对搜索、Tab/Enter 切换、窄屏显示明确反馈正常；工具仅可定位 Chrome 标签，内容读取仍受 URL 限制，未绕过。按用户实测记录，不冒称 agent 直接观察。
- 本地状态：F25 summary 已补齐、内容复核 aligned，drift --check 退出 0；其余 24 个历史功能未接入。原 CI/manual/proxy/APR 提醒保持，不等于全项目验收。
- 下一步：按 APR-012 记录授权、完成本地合并，正常钩子推送既有分支，再核对远端 refs 与 CI 状态。不从历史 frontier 开工。
- 该读：keel/features/f25-spec-governance/summary.md、同目录 browser-check-2026-09-15.md；需要过程再读 worklog、plan/v1.md 与 RES-912。
- 边界：本次明确允许合并/推送；不发布发行版、不强推、不改保护设置或 taotie。需求/计划仍 working，CI 与完整人工验收不从上传成功推断。
