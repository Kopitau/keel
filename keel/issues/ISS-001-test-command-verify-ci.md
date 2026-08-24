---
id: ISS-001
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/p0-rework.test.ts (ISS-001); tools/gate/testcmd.ts; .github/workflows/gate.yml"
feature: f17-gate
fingerprint: "verify-runs-agent-writable-command"
date: 2026-08-24
source: 独立评审 A1/A2/A3（docs/review/），由 Claude 复核实测
---

# ISS-001 test_command 可篡改，使 verify 与 CI 复算同时失效

## 现象

`gate verify` 执行的测试命令来自 `keel/config.json` 的 `profiles.<active>.test_command`，该文件在 agent 可写范围内且无任何校验。把它改成一条必然成功的命令后，即使测试套件全红，`verify` 仍 PASS 且 exit 0。**CI 工作流跑的正是 `gate verify`**，因此这是唯一能穿透 L3 权威层的绕过——配好远端与分支保护也依然存在。

复现命令：

```bash
node --test; echo "真实测试 exit=$?"        # 1（红）
# 将 keel/config.json 中 active profile 的 test_command 改为 git --version
rm -f keel/evidence/junit.xml
node tools/gate/gate.ts verify; echo "verify exit=$?"   # verify PASS，exit=0，counts 0/0
```

## 根因

`verify.ts:51-55` 无条件信任配置里的命令字符串；证据 JSON 虽然记录了 `command` 字段，但**没有任何检查函数读它**，也不与任何基线比对。附带 `verify.ts:103` 的死三元 `exitCode === 0 ? 0 : 0` 使「0 个测试 + exit 0」同样判为 PASS。

## 修复

1. 证据里的 `command` 必须与受保护基线比对：把各 profile 的 `test_command` 连同 `keel/config.json` 的规范化哈希纳入审批工件（C-106），或在 gate 内置白名单校验；改动须走 CHG。
2. `counts.passed == 0` 时不得判 PASS（除非配置显式声明该 profile 无测试并有 DEC 依据）。
3. 修掉 `verify.ts:103` 的死三元，退出码真实反映测试结果。
4. CI 增设一步：用**仓库外固定命令**（不读 config）独立跑一次测试，与 verify 结果交叉核对。

## 为何未被更早发现

门禁从不校验自身配置；测试套件里没有任何「配置被篡改时 verify 应当失败」的负面用例。C-33 原文写的「门禁重跑对账拦谎报」中的**对账**部分在代码里完全没有实现——只有重跑，没有比对。

## 闭环选择与理由

**回归测试**（最高一级）：新增负面测试——篡改 test_command 后 `verify` 必须 FAIL；`counts.passed == 0` 时必须 FAIL。仅靠规则文档不够，因为这是 CI 层唯一的信任根。

闭环：`tests/p0-rework.test.ts` 断言 `git --version` 被拒；CI 增加不读 config 的 `node --test`，且 `verify` 先于 `check`。

同指纹再现见 **ISS-018**（收窄 `tests/` 子路径）。本条形状层保留；范围层升到 ISS-018。
