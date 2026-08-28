# worklog — F11 f11-change

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-24（CHG-007 批准）

- 进度：用户批准 CHG-007，requirements INDEX current 切到 v3.md。C-34: ref=DEC-157 测试名 REQ-011 current 指针 v2→v3。
- CHG-008 仍 proposed；v3 文件中含 REQ-027/028。

## 2026-08-21（W5）

- 进度：冒烟走 CHG + 需求 v2（空名抛错）+ `gate index` 保持唯一 current。

## 2026-08-28（CHG-010 批准联动）

- 进度：按已批准 CHG-010/APR-003，把 requirements v4 的 owner 与验证义务联动到 overview v3 和 24 份功能计划新版；plan INDEX 切到 overview-v3。
- 规划顺序：P0 规划 → P1 CHG/verification/trace → P2 review/ISS-036 → P3 updater/legacy/0.8.0 → P4 平台治理 → P5 其余 owner → P6 消费项目与真实 CI。
- 未开始：任何 gate/installer/skill 行为实现；旧 evidence 将在本规划树上重跑后作废更新。
