---
id: ISS-060
schema: iss-v2
status: open
defense_kind: ""
defense_pointer: ""
feature: "F12"
fingerprint: "status-next-line-empty-project-review-wording"
source: "audit 2026-09-01 (fmea-v3 Cursor 08-29 15:36)"
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-060 空项目上 `gate status` 的 `next:` 行误导为"计划完成待评审"

## 现象

`status.ts humanLines` 只看 frontier 是否为空：没有需求基线、没有任何功能计划时 frontier 也是空的，于是 `next:` 打印 `no unblocked feature left — plan-level review (k-review), then acceptance`。fmea-v3 在 Cursor 里 `/k-new` 刚开始时读到这一行，模型先判断"当前计划已完成等待评审"，随后自己纠正"不是做完了，是还没有基线"。

## 影响

开场三跳的第一跳给出错误导航；在没有技能自动触发的兼容档（Cursor）上，这行字是模型唯一的流程提示。

复现命令：

```
cd "$(mktemp -d)" && git init -q . && mkdir -p keel && echo '{"records_dir":"keel"}' > keel/config.json && node "E:/program/en/tools/gate/gate.ts" --root "$PWD" status | grep -q 'plan-level review'
```

（探针在缺陷存在时退出 0：空项目的 next 行含"plan-level review"。）

## 待诊断防线

打开态只写"待诊断"，未知根因和修复不得编造。

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。
