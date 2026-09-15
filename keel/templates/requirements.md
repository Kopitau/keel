# 需求书 vN

- status: working
- source: 真实用户请求的日期与定位
- replaces: null
- change: null

## 原始意图

记录用户逐字原话和来源、已有决定与边界，或引用保存原话的 CHG。不能猜造用户引语或把 agent 推导标为用户确认。

## 工作解释

agent 对当前目标、可逆假设和最小有用功能的理解；不是用户批准。实现细节进入计划的技术实现，完成事实进入 handoff/证据。冻结需求或验收语义改变仍用 CHG 与新版本。

## 未决问题

仅保留实质缺口、影响与可继续部分，不把未验收当成撤销实施授权。

## REQ-000 标题

- **status**: working
- **source**: 原始请求与必要 CHG
- **feature**: F00
- **must**: 必需
- **description**: 可观察的承诺，不是框架流程
- **acceptance**:
  - Given 输入与条件 When 用户操作 Then 可观察结果
- **verification**: [auto]
- **bounds_and_counterexamples**: 必要边界
- **non_goals**: 非目标
