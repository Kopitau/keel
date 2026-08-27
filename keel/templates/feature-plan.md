---
feature: F00
slug: f00-name
plan_version: v1
replaces: null
change: null
wave: W1
req: [REQ-000]
blocked_by: []
---

# F00 标题 — 规划 v1

确认即冻结。迭代经 CHG 批准后新建完整版本并重索引（C-24）。

## 范围

## 非范围

## 测试义务

- 分级（C-31）：核心 / 辅助 / 豁免
- 功能级验收（C-37）：每条验收标准 ≥1 条可运行黑盒测试，测试名带 `REQ-nnn/AC-i`（DEC-168）
- 联动（C-38）：接口耦合表中本功能相关条目，测试名带 `I-nn`
- 缝（RES-904 §6）：黑盒测试挂在哪一层——尽量最高、尽量只一条；缝尚不存在的 AC 在此声明 proxy 与解除条件

| REQ/AC | 缝（黑盒测试挂在哪） | 状态（真验收 / proxy 至 Fnn） |
|---|---|---|
| REQ-000/AC-1 | | |

## 内部步骤

每一步是一个切片：单个新上下文装得下、可独立演示、纵向贯穿；一个会话做一步（k-impl）。

1. （verify: `一条命令`）

## 预计触碰文件

## 依赖

`blocked_by:` 列本功能开工前必须已完成（有 summary.md）的功能编号（DEC-169）；`gate status` 据此打印前沿。
