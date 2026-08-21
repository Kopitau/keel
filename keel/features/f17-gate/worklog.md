# worklog — F17 f17-gate

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W2，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W1 重做）

- 进度：按 CHG-001 回滚 `gate.py`/pytest；`gate.ts` W1 桩（status + hash）+ 启动器。规划见 plan/v2.md。
- 实现决定：运行时拆成 hash/config/paths/node-version 四个模块，便于 W2 加子命令且测哈希无需起全部门禁。

