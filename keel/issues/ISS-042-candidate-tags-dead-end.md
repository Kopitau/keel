---
id: ISS-042
status: closed
defense_kind: 门禁或 hook
defense_pointer: tools/gate/candidates.ts
feature: F13
fingerprint: convention-without-a-reader
date: 2026-08-26
---

# ISS-042 `#经验候选` 标签没有读取端：写了等于没写

## 现象

C-77 承诺「worklog 一行打标签（`#经验候选`），脚本汇集」。实况：

- zhaoxi worktree 有 2 条规范捕获（defense failed / knowledge gap），无人读取
- 本仓自己也躺着 2 条 W 轮标签（f17 2026-08-22 前后、f19），从未被任何环节看到
- `gate` 源码对该标签零匹配——**汇集脚本从未存在**

复现命令：

```
grep -rn "#经验候选" keel/features/*/worklog.md | grep -v "类型 一句话"
# 改动前：有输出，但没有任何工具会产生这个输出
```

## 根因

约定只写了"怎么打标签"，没定义"谁来读、什么时候读、读到之后判什么"。没有读取端的写入约定必然退化为死胡同——与 [[ISS-038]]（没有产出物的规则不可执法）同一族。

## 修复

`tools/gate/candidates.ts`：`gate status` 每次开场显示 `lesson_candidates: N`；G-retro 对**已复盘功能**里未处置的标签 WARN（进行中功能不打扰——候选挂着是正确状态）。处置记号 = 标签行追加 `→ LES-nnn / → KLES / → 弃 <理由>`。判据两处防误报（模板占位行、裸反引号散文提及）均有回归测试，第二处是上线当天在本仓实测出的。

## 为何未被更早发现

「脚本汇集」写进了 C-77 却没进任何 REQ 的验收标准，六轮复审全部检查"已实现的东西对不对"，没有一轮检查"承诺要建的东西建没建"。这是 gap-hunt-v3 第 6 类发现（REQ 无法映射到检查）的一个实例。

## 闭环选择与理由

选**门禁或 hook**（status + G-retro）而非更高档：标签的"未处置"是一个会自然存在的中间状态，回归测试守判据本身（已写 5 条），但强制时点必须由流程检查把握，测试无法替代。本仓 2 条存量已处置，新增 1 条已沉淀为 KLES-001——管道首次端到端走通。
