---
id: ISS-029
status: open
defense_kind: "回归测试"
defense_pointer: ""
feature: f07-review
fingerprint: "feature-plan-contradicts-decision"
date: 2026-08-25
source: 第四轮独立复审（C-42）
severity: 重要
requirements: [REQ-027]
---

# ISS-029 f07-review 的功能规划仍写「异构复审可选、默认关」，与 DEC-159 相反

## 现象

`keel/features/f07-review/plan/v1.md` 未随 CHG-008 更新，仍写着「异构复审是可选、默认关」——而 DEC-159 已确认：**触及门禁/证据/测试机制的改动强制异构**。

这条特别值得注意：**该规划正是 C-39 规定要交给评审者的五样输入之一**。也就是说，未来每一个评审子代理拿到的资料里，都写着一条与已确认决策相反的规则。

复现命令：

```bash
grep -n "异构\|heterogeneous" keel/features/f07-review/plan/v1.md
# 仍描述为可选、默认关；对照 DEC-159 的「强制异构」
```

## 根因

CHG-008 的联动更新漏了功能规划文件。C-65 要求变更批准后「受影响功能的规划出新版」，未执行。

## 修复

按 C-24 出 `plan/v2.md`（不改 v1，历史即审计链），写入 DEC-159 的强制异构规则与三类视角；并检查其余四样评审输入是否也存在同类过时描述。

## 为何未被更早发现

没有任何检查校验「功能规划与已确认决策是否一致」。这属于 spec 腐烂（社区失败模式 F6），框架有 S8 防腐的设计但没有对应的机器检查。

## 闭环选择与理由

**回归测试**：校验被 DEC 引用的功能规划文件中，不存在与该 DEC 相反的表述（至少对「异构」这类关键词做一致性断言）。若做不到语义级校验，退一步：规划文件必须声明它对齐到哪些 DEC 编号，且这些 DEC 均为 confirmed 且未被 superseded。
