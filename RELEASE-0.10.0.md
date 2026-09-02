# keel 0.10.0 release notes

发布日期：2026-09-02。评审契约变了，所以升次版本号。变更单 CHG-015（决策 DEC-191）：评审只答三问。来源：用户看到 zhaoxi 里评审子代理"疯狂在测试"（F0 评审 12 轮、F6 评审 14 轮、每轮 160 次突变）。

## 破坏点

- **评审者不再造输入、不再写攻击探针。** `keel/review/robustness.md` 与 `requirements.md` 删除，`keel/review/checklist.md` 取代（三问 / 三种阻塞 / 不做清单），随 `keel init` / `keel update` 分发。旧的攻击面清单（0.9.0 项目里的 `attack-surface.md`）自行删除。
- **阻塞发现的凭据反过来了。** 以前 `repro` 是"缺口在时退出 0 的探针"；现在 `repro` 是会失败的测试或检查命令——在当前树上退出非 0 且输出含测试失败，修好后退出 0；或只填 `ac`（REQ-nnn/AC-i）表示该验收标准没有黑盒测试（`gate trace` 核）。`gate loop ingest` / `clear` 按新约定判定；旧处置表里的历史行不改。
- ISS 前言多一个 `ac:` 字段；`probe_result` 取值改为 `failing-test` / `test-missing`，另有 `probe_check`。
- 证据 JSON（verify.json、审批快照来源）多一个 `feature_coverage` 数组；pack 的 `evidence` 随之带上按功能的验收覆盖。

## 变化

- REQ-028（需求 v7，待 APR-007）：评审三问——代码是否规范、尽量简单、方便维护；是否实现了规划与需求说的功能；对应的功能测试是否写了、是否通过。方法：读代码、读证据、最多跑一次测试。阻塞只有三种：功能未实现或与需求相悖；某条验收标准没有黑盒测试或测试不过；代码明显不可维护。
- REQ-027 AC-4 / AC-5 / AC-12、REQ-010 的 ISS 内容条：凭据改为上面的形状；DEC-182 由 DEC-191 取代。
- k-review 技能重写；`headless.md` 的 finding 契约同步；AGENTS.md 确认规则加一句；CONTEXT.md 术语。
- 不变：方案级一轮、空白上下文子代理、三轮熔断、pack 五样输入、两份评审产物。

## 消费项目要做的事

1. `keel update --yes`（或终端里输入 y）；删除项目里残留的 `keel/review/attack-surface.md` / `robustness.md` / `requirements.md`。
2. 正在跑的评审回路：本轮按旧约定收尾即可；下一轮 pack 起，评审者只按 `checklist.md` 三问出发现，`repro` 写成会失败的测试。
3. 项目自己定过"修复类测试必须突变验证"之类规则的（如 zhaoxi DEC-013），按自己的决策流程决定去留；keel 的 C-35（去补丁变红、恢复变绿一次）不变。
