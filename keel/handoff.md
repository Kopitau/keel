# handoff

- 当前任务：CHG-018，用户已允许 agent 修改框架相关内容、保留项目自身内容；只修复更新器和旧指令迁移，不重开历史功能。
- 已做：0.12.1 更新器区分完整/部分完成与无变化；唯一标记段内更新、段外字节保留；根契约和 k-impl 已对齐，定向回归通过。
- taotie：已实际迁移旧框架 AGENTS.md 并更新至 0.12.1；再次更新无变化，quick 无失败或提醒；195 个其它文件与 Git 暂存区保持不变，已有未提交改动未替用户提交。
- 当前分支：codex/safe-framework-update；当前增量尚未推送 GitHub。上一轮 f45dcc9 已推送至 origin/codex/astra-instructions。
- 下一步：完成本轮干净代码树的正式验证和完整检查，保存本地交付结果；不自动实施 taotie 的产品功能。
- 该读：keel/changes/CHG-018-safe-framework-update.md、keel/features/f23-bootstrap/worklog.md；working 需求 v9 / 规划 v5 按本次反馈迭代，旧确认版本不动。
- 证据：定向 CLI / 技能 / 安装更新检查及 taotie 实跑；最终正式验证见 keel/evidence/verify.json，当前增量不冒称远程 CI 或用户验收通过。
