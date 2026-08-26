---
id: ISS-041
status: closed
defense_kind: 回归测试
defense_pointer: tests/p2-rework.test.ts, tests/w1-skeleton.test.ts
feature: F17
fingerprint: config-change-without-full-suite
date: 2026-08-26
---

# ISS-041 测试套件从 2026-08-25 起一直是红的，交接文件却写着「139 全绿」

## 现象

`keel/handoff.md` 写着「测试 139 全绿」。2026-08-26 实测：

```
node --test
# tests 155 / pass 151 / fail 4
```

其中两条与当天的改动无关：

- `REQ-018 P2-7 local tier skips CODEOWNERS enforcement` —— 断言 `SKIP X-owners`
- `REQ-021 config.json has required keys and keel-gate profile` —— 断言 `enforcement_tier === "local"`

两条都在提交 `b74b4a0`（2026-08-25「接入 GitHub 远端：执法档升 github」）时被打破，**红了一整天没有任何人或机器发现**。

## 根因

两层：

1. **测试写法**：两条测试断言的是**本仓当前的配置值**，而不是**规则**。`REQ-018` 想验证的是"local 档跳过 CODEOWNERS 执法"，却拿本仓自己的 config 当输入——配置一改，测试就红，而规则本身完全没变。
2. **没有任何环节会跑全量**：pre-commit hook 只跑 `gate check --quick`；`gate check` 不跑测试；`gate verify` 跑测试但要手工调用；CI 会跑，但**远端从未 push 过**。于是"改配置"这个动作全程没有碰到过测试套件。

## 修复

- `REQ-018` 改为用 `enforcement_tier: "local"` 的临时 fixture 测规则，与本仓配置解耦
- `REQ-021` 改为断言档位取值合法（`local | gitee | github` 三选一），不再钉死某一个值
- 两处都留了注释说明为什么不能断言当前配置

改后：`node --test` → 156/156。

## 为何未被更早发现

`b74b4a0` 那次改动是收尾性质的配置接入，没写代码，直觉上"不需要跑测试"。而框架里**没有一条规则说"改配置也要跑全量"**，也没有任何自动环节兜底。

更深一层：本仓 `enforcement_tier` 长期是 `local`，pre-commit 只跑 `--quick`，CI 从未运行过——**这三件事叠加，等于全量测试从来只在有人手动想起时才跑**。

## 闭环选择与理由

症状用**回归测试**闭环（两条测试改为测规则、与本仓配置解耦）。

根因于 2026-08-26 由用户拍板闭环（原话「4 可以」→ [[DEC-162]]）：pre-commit 检测到框架敏感路径（`keel/config.json`、`tools/gate/`、`.agents/skills/`、`.githooks/`）staged 时强制跑全量 `node --test`，红则拒绝提交。守卫测试断言 hook 文本含该触发器。

残余风险收窄为：绕过 hook 的提交（`--no-verify`，X-bypass 监视）与非提交型漂移，仍待首次 CI 兜底。
