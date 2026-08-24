---
id: ISS-018
status: closed
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: "tests/r2-rework.test.ts; tools/gate/testcmd.ts"
feature: f17-gate
fingerprint: "verify-runs-agent-writable-command"
date: 2026-08-24
source: 第二轮独立复审（C-42），复现命令由复审者实跑
severity: 阻断级
---

# ISS-018 test_command 范围未固定：ISS-001 关闭过早，同类绕过仍可穿透 CI

## 现象

ISS-001 的防线（`testcmd.ts` 白名单）只约束**命令形状**（是 node、含 `--test`、路径以 `tests/` 开头），不约束**测试范围**。把范围缩到一个必过的测试文件即可绕过：全量测试为红时，`gate verify` 仍 PASS 且 exit 0。**CI 工作流跑的正是 `gate verify`**，因此该绕过直通 L3 权威层。

**本条按 C-61 处理（同指纹再现）**：指纹与 ISS-001 相同，必须解释旧防线为何失效并升一级阶梯，不得简单重复上一次的修法。

复现命令：

```bash
node --test >/dev/null 2>&1; echo "全量测试 exit=$?"    # 1（红）
mkdir -p tests/fake
printf 'import { test } from "node:test";
test("always green", () => {});
' > tests/fake/x.test.ts
# 将 config 中 active profile 的 test_command 改为：node --test tests/fake/x.test.ts
git add -A && git commit -m tmp --no-verify   # 工作区须干净，否则被 dirty 检查拦下
rm -f keel/evidence/junit.xml
node tools/gate/gate.ts verify; echo "verify exit=$?"   # 实测：verify PASS，exit=0，counts passed=1 failed=0
```

## 根因

`testcmd.ts` 的 `testsPathOk()` 只要求路径以 `tests/` 开头，放行其下任意子路径与单个文件。ISS-001 的修复针对的是「换成完全不相干的命令」这一**字面复现**，未覆盖「保持命令形状、收窄测试范围」这一**同类攻击**。

## 修复

防线需升一级，二选一或叠加：
1. **范围钉死**：allowlist 只接受完整 `tests`/`tests/` 全量形式，拒绝任何子路径与单文件参数（最简单、最彻底）；
2. **纳入审批哈希**：把各 profile 的 `test_command` 连同 `keel/config.json` 的规范化哈希纳入审批工件（C-106），改动须走 CHG；
3. 附加交叉核对：证据中的 `command` 与受保护基线比对，不一致即 FAIL。

## 为何未被更早发现

ISS-001 的 guard 测试只断言「非白名单命令被拒」，没有「白名单形状但范围收窄」的负面用例；关闭时未做同类攻击面的穷举。

## 闭环选择与理由

**门禁逻辑修订 + 回归测试**：ISS-001 的形状白名单拦不住收窄范围（同类攻击）。本条升一级：**keel-gate 只接受完整 `node --test`，拒绝任何子路径**。ISS-001 保持 closed（形状层仍有效）；范围层由本条闭环。`tests/r2-rework.test.ts` 断言 `tests/fake/x.test.ts` 被拒。
