---
id: ISS-050
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/dec168-test-kinds.test.ts; tests/w1-skeleton.test.ts; tests/w6-pilot.test.ts"
feature: "F17"
fingerprint: "requirements-baseline-ac-renumbering-test-label-drift"
date: 2026-08-27
---

# ISS-050 v4-req017-ac-numbering-stale-test-labels

## 现象

复现命令：

```
node tools/gate/gate.ts verify
```

requirements INDEX 从 v3 切到已批准 v4 后退出 1，结果为 210 passed / 3 failed：REQ-011 测试仍硬编码 `current: v3.md`；REQ-017 的旧 AC-4 绕过测试被 v4 错读成“真实六格 CI”覆盖，导致新的 AC-5 显示未覆盖，并连带使本仓 X-trace 正控与 `check --quick` 正控失败。

## 根因

CHG-010 已预告 REQ-017 AC 编号和语义变化需要对账，但正式评审使用 requirements lens，批准前首轮 verify 又仍以 v3 为 current；只有 APR 批准并切换 current 后，trace 才按 v4 解释旧测试名。测试标签与硬编码基线没有随批准事务同步迁移。

## 修复

- REQ-011 current 断言及读取文件改为 v4。
- 原 AC-4 绕过检测测试改标 AC-5。
- 本地 workflow 契约测试从旧 AC-3 proxy 改为 v4 AC-3 黑盒；现有 workflow 缺 verify 的负向测试明确标作 AC-4 proxy，直到真实 GitHub 六格证据存在。
- 以 DEC-175 为 C-34 引用更新测试名基线，不改 gate 行为，也不伪造真实 CI 证据。

## 为何未被更早发现

独立 gap-hunt 和正式评审核对的是 v4 的需求语义、AC/verification 数量与一致性，没有在 proposed 状态提前把 INDEX 指向 v4；审批前验证因此仍按 v3 跑。最终批准后的第二次 verify 正是捕获这种切换缺口的防线。

## 闭环选择与理由

选择回归测试与 C-34 基线：`DEC-168 this repo: X-trace is PASS or a proxy-only WARN under the new judge` 和 `REQ-017 gate check --quick on this repo exits 0` 已能稳定阻止错误编号造成的假覆盖/缺覆盖；REQ-011 断言固定 current。问题不在 gate 算法或需求决策，无需增加更高级门禁或修改 DEC；真实 CI 仍保留 proxy，不冒充完成。

可能复发的不许只留档。

## 关闭证据

2026-08-27：

```
node --test tests/w1-skeleton.test.ts tests/p0-rework.test.ts tests/w6-pilot.test.ts tests/dec168-test-kinds.test.ts tests/w2-gate.test.ts
```

exit 0，52 passed / 0 failed；本仓 `check --quick` 正控恢复通过，X-trace 只对 REQ-017/AC-4 报一个明确 proxy。
