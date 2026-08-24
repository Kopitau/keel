---
id: ISS-002
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/p0-rework.test.ts (ISS-002); tools/gate/check.ts G-done/X-evidence"
feature: f17-gate
fingerprint: "missing-input-skips-instead-of-fails"
date: 2026-08-24
source: 独立评审 A1/A2/A3（docs/review/），由 Claude 复核实测
---

# ISS-002 「缺失即跳过」的 fail-open 模式，删掉输入即可消除失败

## 现象

证据文件**过期**时门禁失败，但证据文件**不存在**时返回 SKIP，而 SKIP 不计入退出码。于是「删掉证据」比「保留过期证据」更容易通过。A2 指出这是系统性模式（8 项检查中 6 项如此），非孤例。

复现命令：

```bash
echo "// sabotage" >> tools/gate/hash.ts
node tools/gate/gate.ts check; echo "exit=$?"     # FAIL, exit 1
rm keel/evidence/verify.json
node tools/gate/gate.ts check; echo "exit=$?"     # G-done/X-evidence 变 SKIP
```

## 根因

`check.ts:115-120` 无证据时 `skip()`；`check.ts:133` SKIP 不计入失败计数。该行为在 `f17-gate/summary.md` 里被记为一条「实现决定」（理由：避免日常 check 红灯），但它**削弱了已确认的门禁语义**（C-45/C-56），按 C-21 属于应停下问用户的边界，既无 DEC 也无 CHG。

## 修复

1. 有 `summary.md`（= 完成声明）却无证据 → **fail**，不是 skip；
2. 全面复查 8 项检查的缺输入分支，统一改为 fail-closed；确需宽松的，必须有 DEC 记录理由；
3. 若要保留「日常 check 不红灯」的体验，用 `--quick` 或显式的 `--pre-work` 模式区分，而不是弱化正式门禁语义。

## 为何未被更早发现

测试套件把该行为**写成了合格断言**：`tests/w3-verify.test.ts` 中 `REQ-017 this repo check still passes without committed evidence` 明确断言「无证据也通过」。漏洞被测试保护起来，因此不会被发现。

## 闭环选择与理由

**回归测试**：把上述断言改成负面用例（无证据 + 有完成声明 → 必须 FAIL）。同时在 DEC 层记录一条决策修订，说明 fail-closed 是正式语义，避免下次又被当作体验问题改回去。

闭环：`tests/p0-rework.test.ts` + 原 `w3-verify.test.ts` 改为「本仓无证据全量 check 必须 FAIL」。CHG-002 proposed 记录此次纠正。日常红灯用 `--quick`。
