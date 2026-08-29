---
id: ISS-052
schema: iss-v2
status: closed
defense_kind: regression-test
defense_pointer: tests/chg008-review.test.ts
feature: F7
fingerprint: loop-pack-staged-diff-duplicated
source: P6-local-review
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-08-28
---

# ISS-052 loop-pack-重复暂存差异导致误报超限

## 现象

`gate loop pack` 面对一份实际约 340 KB、全部已暂存的评审差异时，返回 `pack field 'diff' exceeds 400000 bytes (ISS-028)`。同一差异由 `git diff --cached` 单独读取时低于上限。

## 影响

合法的攻击面变更无法生成 C-39 五样评审包，`G-done` 因此不能取得异构评审证据；若用手改状态绕过，又会破坏 REQ-027 的完成语义。

复现命令：

```pwsh
node --test --test-name-pattern="ISS-052" tests/chg010-review-loop.test.ts
```

## 待诊断防线

已由回归测试接管；见 `tests/chg008-review.test.ts` 的 ISS-052 用例。

## 根因

`buildPack` 先调用 `git diff HEAD`，该命令已经返回工作树相对 HEAD 的全部变化（包括 staged）；随后又拼接 `git diff --cached`，于是 staged 内容被完整追加第二次。字段长度检查看到的是重复后的 payload，而不是 reviewer 实际需要的一份差异。

## 修复

把两个来源改成互不重叠的 `git diff`（仅 unstaged）与 `git diff --cached`（仅 staged），并由单一 `PACK_DIFF_ARGS` 常量供实现和回归断言共同使用。

## 为何未被更早发现

原测试覆盖了 pack 字段白名单、聊天污染与单字段上限，却没有覆盖“同一 staged patch 在最终 pack 中只能出现一次”；日常小差异即使翻倍也未越过 400 KB，因此直到完整 0.8 实现包才显现。

## 闭环选择与理由

选择最高优先级的回归测试：它直接固定两个 Git diff 来源必须互斥，并且真实 340149 字符 staged 差异已重新用于集成打包。无需新增 lint、门禁或 DEC；这是既有 C-39/ISS-028 实现中的局部错误，不改变接口或需求边界。

可能复发的不许只留档。

## 2026-08-29 CHG-011 备注

评审 pack 改为只按 `--base` 范围取 diff（`git diff <base>` 本身覆盖已提交、已暂存、未暂存且不重叠），工作树两段 diff 与 `PACK_DIFF_ARGS` 随之删除（ISS-055）；本条的防线（不重叠）由范围 diff 天然满足，原守卫测试删除。
