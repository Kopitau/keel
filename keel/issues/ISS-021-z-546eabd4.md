---
id: ISS-021
status: closed
defense_kind: "回归测试 + 门禁判据"
defense_pointer: "tests/r3-rework.test.ts; tools/gate/testbase.ts; tools/gate/check.ts xTests; keel/test-baseline.json"
feature: f17-gate
fingerprint: "tests-can-vanish-unnoticed"
date: 2026-08-24
source: 第三轮独立复审（C-42），完整攻击链由复审者实跑
severity: 阻断级
---

# ISS-021 删除或跳过测试无人检测，可让门禁对已破坏的核心机制全绿

## 现象

门禁没有「测试基线」概念——它只看**本次跑了多少测试、有没有失败**，不看**上次有哪些测试、这次是不是少了**。因此把挡路的测试删掉即可让门禁转绿。

实测完整攻击链（干净副本，走**正常提交流程**，hooks 全开，未用 `--no-verify`）：

1. 删除 `REQ-024 DEC-144 CRLF and LF hash to the same digest` → 提交成功，`verify exit=0`、`check exit=0`，门禁无任何异议；
2. 破坏 `tools/gate/hash.ts` 的换行规范化（DEC-144，CHG-001 自陈的**最高风险项**）→ 被另一条测试（DEC-148 golden digest）抓到，`verify exit=1`（纵深防御生效一次）；
3. 再删除该条 golden digest 测试 → 提交成功，**`verify exit=0`、`check result: PASS fail=0`、`check exit=0`**。

最终状态：跨平台哈希规范化已损坏（`hash.ts` 中 `replace` 归零），**门禁全绿**。

复现命令：

```bash
# 干净副本，core.hooksPath=.githooks，exec 位已设，基线 verify+check 均绿
# 1) 删掉 tests/w1-skeleton.test.ts 里的 "REQ-024 DEC-144 CRLF and LF hash to the same digest" 整个 test 块
git add -A && git commit -m "delete crlf test"     # 成功，门禁不拦
node tools/gate/gate.ts verify; echo $?            # 0
node tools/gate/gate.ts check;  echo $?            # 0

# 2) 破坏 hash.ts：把 normalizeText 的 return 改成 `return noBom;`
git add -A && git commit -m "break normalization"
node tools/gate/gate.ts verify; echo $?            # 1  ← 被 DEC-148 golden digest 测试抓到

# 3) 再删掉 tests/p2-rework.test.ts 里的 "REQ-024 P2-6 DEC-148 LF fixture has a golden digest"
git add -A && git commit -m "delete golden digest test"
node tools/gate/gate.ts verify; echo $?            # 0  ← 全绿
node tools/gate/gate.ts check;  echo $?            # 0  ← result: PASS fail=0
grep -c replace tools/gate/hash.ts                 # 0  ← 规范化确实已损坏
```

## 根因

1. **C-34 完全未实现**。已确认决策原文：「skip/删除测试须引用决策或问题编号否则门禁报错」。全仓库搜索无任何检测跳过或删除测试的代码；`counts.skipped` 只被记录与打印，从不参与裁决（`evidence.ts` 的 `evidenceGaps` 只判 `passed===0 && failed===0` 与 `failed>0`）。
2. **X-trace 拦不住这一类**：它只要求「被声明完成的 REQ 的每条验收标准**至少有一处命中**」。一条验收标准有多个测试时删掉其中一部分，仍然算覆盖；上述攻击中被删的两条测试对应的 REQ 未被声明完成，更不在其射程内。
3. **`test.skip` 变体只是偶然被拦**：拦它的是 `tsc --noEmit`——项目的精简类型声明 `node-min.d.ts` 里 `test` 没有 `.skip` 属性。这是副作用不是规则；把测试注释掉，或补上该类型声明，同样可穿。

## 修复

建议方向（具体方案由实施方调研后定，触及门禁语义须走 CHG）：

1. **测试基线纳入证据**：证据 JSON 记录本次测试的名称集合（或稳定摘要 + 计数）；`check` 比对**当前基线与上一份已通过证据**，测试**减少**时 FAIL。
2. **减少必须有据**：允许减少，但要求 worklog 或提交信息引用真实存在的 DEC/ISS 说明原因——**直接复用 ISS-005 已建成的「豁免必须引用真实记录」校验机制**，不必另造轮子。
3. **`skipped` 进判据**：`counts.skipped > 0` 时同样要求引用记录，否则 FAIL（覆盖 `test.skip` 这条路，不再依赖类型声明的偶然拦截）。
4. 注意别把正常重构（重命名、合并测试）变成寸步难行：判据应针对「净减少且无引用」，重命名可用计数 + 覆盖矩阵不回退来判定。

## 为何未被更早发现

前三轮攻防集中在三个面——**能不能改跑什么命令**（ISS-001/018）、**能不能伪造或删掉证据**（ISS-002/019）、**能不能缩小测试范围**（ISS-018）。这三扇门被逐一关上后，**「测试集合本身的完整性」**成为唯一没上锁的门，而它从未被当作受保护对象。C-34 在设计阶段就预见了这一点，但实现时从未落地，也没有任何检查项会因为它缺失而报警。

## 闭环选择与理由

**回归测试 + 门禁判据**（阶梯最高两级，不接受只写规则文档）：

- 负面测试一：在夹具仓库中删除一条测试后，完整 `check` 必须 FAIL；
- 负面测试二：把一条测试标记为跳过后，`verify`/`check` 必须 FAIL（不依赖 tsc 的偶然拦截）；
- 负面测试三：删除并**引用真实 ISS/DEC** 说明原因时，必须放行（防止修过头让正常重构无法进行）。

落地：`X-tests` 进 `--quick`；锁文件 `keel/test-baseline.json`；相对 HEAD 名称消失或 skip 须 **本轮新增** worklog 行 `C-34: ref=ISS-nnn|DEC-nnn`（记录须在盘）。重命名视为删除名称，须引用，堵住同计数替换。verify 不改锁文件。CHG-006 proposed。

可能复发，不许只留档。
