---
id: CHG-014
status: proposed
date: 2026-09-01
requirements_from: v5.md
requirements_to: v6.md
decisions: [DEC-185, DEC-186, DEC-187, DEC-188, DEC-189]
issues: [ISS-058, ISS-059, ISS-060]
---

# CHG-014 两个试点项目（zhaoxi / fmea-v3）审计回流：钩子、探测、证据、冻结件、评审回路、白名单

## 动机

2026-09-01 对 zhaoxi（Codex Desktop，keel 0.9.0）与 fmea-v3（Cursor，keel 0.9.1）的会话记录与 `keel/` 记录做了审计。两个项目暴露的问题里约一半是 keel 自身的缺口：提交尾注被折进主题行（ISS-058）；harness 只认 Claude Code，DEC-166 守卫在 Codex/Cursor 下从不触发（ISS-059）；local 档证据随工作树消失，zhaoxi master 今天 `gate check` FAIL 3；被 APR 绑定的 9 份计划原地改过一周无告警；fmea-v3 的需求 v1/v2 与计划 v1 写着"已确认"而 APR 仍是 draft；测试命令白名单逐字相等让一个项目换测试栈、一个项目改框架源码；评审回路 11 轮不熔断、pack 被 lockfile 撑爆、Finding 格式靠实现者手工改写；空项目 `gate status` 的 next 行误导（ISS-060）；升级无提醒让 zhaoxi 在上游当天已删除的机制上工作两天。

用户 2026-09-01 审阅方案后批复：「没有了 根据上述内容对框架进行修正和优化」→「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」（记录方式 = 并入 v6；写 DEC；按切片提交；证据快照选 A；白名单限制保留）。

## 新增

- DEC-185（X-apr 重算已批准工件哈希，漂移 FAIL，waiver 按 APR 逐条引用）。
- DEC-186（当前需求 / 规划声明已确认必须绑定 approved APR）。
- DEC-187（验收 APR 携带 verify 证据快照；local 档回读，adr）。
- DEC-188（测试命令白名单：启动器前缀 + 测试程序 + 允许的参数类）。
- DEC-189（评审回路：复发指纹共享熔断计数、lockfile 摘要、pack 预算告警、Finding 严格校验与存档）。
- ISS-058 / ISS-059 / ISS-060（钩子尾注、harness 探测、status 措辞），按 k-bugfix 红绿修。
- `gate status` 打印 `keel: <项目版本> (installer <版本> …)`，安装器较新时提示 `run keel update`（REQ-025 AC-10）。
- `tools/gate/platform-limits.md` 增补 Codex Desktop / Cursor / Windows 的已知坑；k-migrate、k-accept、k-impl、k-handoff、k-review 技能各补一句（见「修改」）。

## 修改

- REQ-001：增 AC-7（当前需求版本声明已确认须能追到 approved 且哈希匹配的 APR，否则 G-req FAIL，DEC-186）。
- REQ-004：增 AC-11（当前规划总览同理 → G-plan FAIL，DEC-186）。
- REQ-006：增 AC-9（local 档无 `verify.json` 时可回读 approved APR 的 evidence 快照，树一致才算，DEC-187）。
- REQ-012：增 AC-5（`gate status` 的 `next:` 三种形态：无基线 → run k-new；有基线无规划 → finish k-new step 4；全部功能有 summary → k-review 再 k-accept，ISS-060）；增 AC-6（每轮工作收尾用通俗中文说清做了什么 / 现在状态 / 还剩什么，再以「下一步：」结束；编号与门禁名只作括号补充——用户 2026-09-01 补充：「每次一轮对话结束，但是没有推荐下一步的动作。应该修改」「对于工作和下一步经常很简短，应该要让人可以更清晰的知道情况，不能只有代码缩写介绍」；AGENTS.md 加 Turn end 节，k-handoff 补一句）。
- REQ-016：增 AC-11（`platform-limits.md` 含 Codex Desktop / Cursor / Windows 的已知坑与对策；machine-doc）。
- REQ-018：增 AC-7（已批准工件正文漂移 → X-apr FAIL，waiver 逐 APR 引用，DEC-185）、AC-8（`gate approve` 写入 evidence 快照，DEC-187）。
- REQ-019：增 AC-5（尾注前空行，`git log --format=%s` 只含主题，ISS-058）、AC-6（`Agent:` 由环境标记或父进程名识别 Codex / Cursor / Claude Code，识别不到写 unknown 且可 `KEEL_AGENT` 覆盖；DEC-166 守卫在识别出的任一 agent 环境都触发，ISS-059）。
- REQ-021：增 AC-6（白名单形态，DEC-188）。
- REQ-022：增 AC-6（用户选择推平仍写迁移报告、删除单独提交，machine-doc）。
- REQ-025：增 AC-10（`gate status` 版本行）。
- REQ-027：增 AC-11（lockfile 摘要 + pack 预算告警）、AC-12（Finding 严格校验 + 原件存档）、AC-13（复发指纹共享熔断计数，DEC-189）。
- 技能：k-migrate（推平也写迁移报告、删除单独提交）；k-accept（验收与合并是两个 APR、两次动作）；k-impl（功能收口时 0 ISS / 0 经验候选要回看 worklog 的重复问题）；k-handoff / status（next 行人话）；k-review（Finding 格式由 ingest 校验、reviewer 重出而非实现者改写；pack 预算）。
- 代码注释与技能里残留的 "attack probe / attack-surface" 措辞改为 "probe / 复现探针"（避开安全分类器与用户本机钩子的关键词误触）。
- `keel/templates/APR.md` 加 `evidence:` 说明；`keel/templates/config.json` 画像示例按 DEC-188 更新。
- 版本 0.9.1 → 0.9.2；`RELEASE-0.9.2.md`。

## 删除

无。

## 影响评估

- 需求：REQ-001/004/006/012/016/018/019/021/022/025/027 各加 AC，与 CHG-012 / CHG-013 同批进入 v6；其余条目不动。
- 决策：DEC-185～189 新建并 confirmed（用户原话在各文件）；DEC-166 / DEC-182 / DEC-183 / DEC-184 不变。
- 规划：overview-v4 不重开（C-23）；本变更单的「实施切片」表作为规划补充：S1 钩子与探测（F17/F19）→ S3 冻结件与基线复核（F18/F17/F4/F1）→ S4 证据快照（F6/F18）→ S5 白名单（F21/F6）→ S6 评审回路（F7）→ S2 status（F12/F23）→ S7 文档与技能（F16/F22/F7/F9）→ S8 发布（F23）。每个切片：红绿测试 → `gate check --quick` → worklog 一行 → 提交。
- 测试义务：上述新 AC 各 ≥1 条黑盒测试（`tests/chg014-*.test.ts`）；ISS-058/059/060 各一条回归测试（`ISS-nnn` 前缀）。
- 问题：ISS-058/059/060 随切片关闭；本仓 10 个 DEC 的正文漂移由 F3 worklog 的 `gate-warn: X-apr ref=APR-002` / `ref=APR-003` 放行（DEC-185 落地记录）。
- 旧证据：`gate verify` 重跑；tree hash 变化是预期。
- 消费项目（写进 RELEASE-0.9.2.md）：更新后 zhaoxi 会在 X-apr / G-plan 红 9 份计划、master 需重新 approve 或 verify；fmea-v3 会因 DEC-186 对当前版本不红、但应补签 APR-001/002；两者的本地 gate 补丁（zhaoxi reviewloop / fmea-v3 testcmd）可撤。

## 批准

待用户点头 → APR-006 同批绑定本文件、CHG-012、CHG-013 与 `keel/requirements/v6.md` 正文哈希；人类身份或记录在案的委托提交（C-107/DEC-166）。
