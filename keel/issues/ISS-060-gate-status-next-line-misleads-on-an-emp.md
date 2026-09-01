---
id: ISS-060
schema: iss-v2
status: closed
defense_kind: "regression-test + status wording"
defense_pointer: "tools/gate/status.ts (nextLine); tests/chg014-status.test.ts"
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

（已诊断，见下）

## 根因

`humanLines` 只看 frontier 是否为空来选 `next:` 的两句话之一；空项目、有基线无规划、全部功能已完成三种状态的 frontier 都是空的，于是都落到"no unblocked feature left — plan-level review"。

## 修复

`status.ts` 新增 `nextLine(shape)`：无需求基线 → run k-new；有基线无当前规划 → finish k-new step 4；有前沿 → start Fnn；全部功能有 summary → k-review 再 k-accept；只剩被阻塞功能 → 列出 blocker；有规划无功能 → 补功能计划。同一切片顺手加了 `keel: <项目版本> (installer <版本>)` 行（REQ-025/AC-10）。

## 为何未被更早发现

本仓自己的 frontier 从未为空过（24 个功能都没有 summary），`gate status` 的 next 行在本仓只走过"start Fnn"这一支；REQ-012/AC-2 的测试只断言前三行的前缀，不断言内容。

## 闭环选择与理由

回归测试 + 措辞：`tests/chg014-status.test.ts` `ISS-060 …`（空项目不出现 review/acceptance 字样）与 `REQ-012/AC-5 …`（四种状态各自的句子）。这是输出措辞缺陷，不涉及规则。

