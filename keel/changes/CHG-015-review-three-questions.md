---
id: CHG-015
status: approved
date: 2026-09-02
requirements_from: v6.md
requirements_to: v7.md
decisions: [DEC-191]
issues: []
---

# CHG-015 评审只答三问：代码规范可维护、功能是否实现、功能测试是否写了且通过

## 动机

用户 2026-09-02：「这个子agent审阅好像还是有问题。朝夕项目中依然疯狂在测试。子agent的审阅的功能应该定义为：代码是否规范，尽量简单方便维护。是否实现了相应的功能，以及编写相应的功能测试是否通过了。」(2026-09-02)

诊断（见 DEC-191）：zhaoxi F6 工作树停在 0.9.0（每功能评审 + 攻击面视角）；zhaoxi 自己的 DEC-013 要求每个修复做突变验证（每轮 160 次）；keel 0.9.3 的评审定义仍要求核心代码"实际构造边界输入运行"、每条阻塞附"未修复树退出 0 的攻击探针"。

用户审阅七条改法后批复：「A 可以 B 废掉 C 现在升级」(2026-09-02)——A 按 1～6 条改 keel；B zhaoxi 的突变验证废掉；C F6 工作树现在升级。

## 删除

- REQ-028/AC-1 的鲁棒性清单与"须实际构造这些输入运行"；`keel/review/robustness.md`、`keel/review/requirements.md`。
- DEC-182 的探针约定（退出 0 = 缺口在）；`gate loop ingest` 的"探针退出 0 才开 ISS"、`clear` 的"变成非 0 才可清"。

## 修改

- REQ-028：评审三问；阻塞只有三种（功能未实现 / 验收标准无黑盒测试或测试不过 / 明显不可维护），每条带 `ac` 与 / 或 `repro` 凭据；不做清单。
- REQ-027 AC-4 / AC-5 / AC-12、REQ-010 ISS 内容条：凭据改为"会失败的测试或检查命令（本树非 0 且输出含测试失败，修好后 0）"或"trace 显示无黑盒测试的验收标准"。
- k-review 技能、`keel/review/headless.md` 的 finding 契约、ISS 模板（前言 `ac:`、复现命令说明）、AGENTS.md 确认规则一句、CONTEXT.md 术语。

## 新增

- `keel/review/checklist.md`（三问 / 三种阻塞 / 不做），进 `keel init` 与 `keel update` 的管理清单。
- Finding 可选字段 `ac`（REQ-nnn/AC-i）与 `kind`；ISS 前言 `ac:`；`probe_result: failing-test | test-missing`、`probe_check`。
- 证据 JSON `feature_coverage`（REQ-006/AC-10 的按功能行进 pack）。
- 版本 0.10.0（评审契约变了，破坏性）。

## 影响评估

- 不变：方案级一轮、空白上下文子代理、三轮熔断、pack 五样输入、findings.md / disposition.md 两份产物。
- 代价（用户已接受）：边界输入、并发、中途失败这类缺陷不再由评审者去造输入验证，只能靠实现者的黑盒测试与验收覆盖抓。
- 试点：zhaoxi 主干、F6 工作树、fmea-v3 升到 0.10.0；zhaoxi 另出决定废止 DEC-013。

## 批准

2026-09-02 用户「A 可以 B 废掉 C 现在升级」(2026-09-02) → 本单 approved；需求 v7 待 APR-007 与本单同批绑定（DEC-190：原话在 APR 前言，谁提交都可以）。
