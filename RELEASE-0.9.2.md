# keel 0.9.2 release notes

发布日期：2026-09-01。补丁版。变更单 CHG-014（两个试点项目 zhaoxi / fmea-v3 的审计回流：DEC-185～189、ISS-058～060）；CHG-012 / CHG-013 / CHG-014 与需求 v6 仍待 APR-006 一次点头。

## 破坏点

- **门禁会对以前静默的东西变红**（DEC-185 / DEC-186）：
  - X-apr 重算每份 approved APR 引用工件的正文哈希：文件缺失 → FAIL；正文漂移 → FAIL，除非某功能 worklog 有 `gate-warn: X-apr ref=APR-nnn`（错字级修订）；语义变化须新版本 + 新 APR。计划类工件（`plan/overview-vN.md`、`features/*/plan/vN.md`）在 G-plan（quick、pre-commit）里同样判。
  - 当前需求版本 / 当前规划总览的前言 `status` 含 confirmed / approved / 已确认 / 已批准 时，必须能追到 approved APR（直接绑定且哈希匹配，需求还可经产生它的已批准 CHG）；否则 G-req / G-plan FAIL。历史版本不追溯。
- **树哈希不再包含 `keel/approvals/` 与 `keel/review/raw/`**（DEC-187）：批准动作不再让 verify 证据失效；旧 evidence 的 `tree_hash` 会与新算法不同，更新后需重跑一次 `gate verify`。
- **`gate loop ingest` 只接受形状合格的 `Finding[]`**（DEC-189）：非数组、项非对象、缺 `title`、`blocking` 非布尔、字符串字段类型错 → 整体拒绝并存档 `keel/review/raw/`；实现者不得改写 reviewer 输出。`recurrence_of` 链共享熔断计数：以前每次换指纹就重新计数的回路，现在第三轮就会熔断。
- **测试命令白名单改为形状**（DEC-188）：`keel-gate` 画像仍只认 `node --test`；其他画像接受"启动器前缀 + pytest / `vitest run` / jest / `node --test` + marker/report 类参数"，仍拒 `-k`、路径、名称过滤；`verify` 自动补 junit 输出。以前逐字相等的 `python -m pytest -q` / `npx vitest run` 继续有效。
- **提交尾注独立成段**（ISS-058）：新提交的 `git log --oneline` 只显示主题；依赖旧的"尾注在主题行里"的脚本要改读 `%(trailers:key=Feature)`。
- **harness 探测**（ISS-059）：`Agent:` 会由 `CODEX_*` 环境变量或父进程名（codex / claude / opencode / grok / dsh）识别；Cursor / VS Code 只记 `Host:`。DEC-166 的"approved APR 无 `delegated:` 即拒绝"守卫在识别出的任一 agent 环境都触发，不再只对 Claude Code 生效；`KEEL_ANCESTRY=0` 关闭父进程探测，`KEEL_AGENT` 覆盖。
- 措辞：代码与技能里的"攻击探针 / attack probe"改为"复现探针 / probe"；`tools/gate/PLATFORM-LIMITS.md` 改名小写 `platform-limits.md`。

## 变化

- `gate approve` 在盘上有与当前树一致、退出码 0 的 `verify.json` 时把 `evidence_*` 八个字段写进 APR 前言；local 档合并、工作树删除后 G-done / G-merge / X-evidence 回读它（树必须仍一致）。
- `gate status` 的 `next:` 按项目状态四选一（run k-new / finish k-new step 4 / start Fnn / k-review 再 k-accept），并新增 `keel: <项目版本> (installer <版本>)` 行，安装器较新时提示 `run keel update`（`KEEL_INSTALLER_ROOT` 可指定或 `none` 跳过）。
- `gate loop pack`：lockfile（pnpm-lock.yaml / package-lock.json / yarn.lock / uv.lock / poetry.lock / Cargo.lock / go.sum / Gemfile.lock / composer.lock）只留"文件名 + sha256 + 行数"摘要；pack 字段超过 reviewer 预算（默认 120000 字符，config `review.pack_budget`）打印 `warn:` 并指出最大来源文件。
- **每轮工作收尾要让人看懂**（REQ-012/AC-6）：AGENTS.md 规定 agent 完成一轮工作的回复用通俗话说清做了什么、现在什么状态、还剩什么，最后一段是 `下一步：<一条推荐动作>` 并点明只有用户能定的事；编号与门禁名只能作括号补充；`gate status` 的 `next:` 行是它的机器来源。
- `platform-limits.md` 记录 Codex Desktop / Cursor / Windows 的已知坑与对策；k-migrate（推平也是迁移：报告 + 独立删除提交 + 停用旧框架注入）、k-accept（验收与合并两个 APR、保留 verify.json 供快照）、k-impl（0 ISS / 0 经验候选收口前回看 worklog）、k-handoff、k-review、k-log、k-evidence 各补一句。

## 消费项目要做的事

1. `keel update`，看预览后输入 `y`；然后在主干跑一次 `node tools/gate/gate.ts verify`（树哈希算法变了）。
2. 跑 `node tools/gate/gate.ts check`：
   - X-apr / G-plan 红 → 逐个看是"错字级修订"（worklog 加 `gate-warn: X-apr ref=APR-nnn` / `gate-warn: G-plan ref=APR-nnn`）还是语义变化（出新版本 + 新 APR）。zhaoxi 被 APR-002 绑定的 9 份功能计划会在这里红。
   - G-req / G-plan 报"declares … but no approved APR binds it" → 让人跑 `gate approve`（或记录委托后由 agent 跑），或把状态改回 proposed。fmea-v3 的 APR-001 / APR-002 属此类（其 v3 已由 APR-003 绑定，当前版本不红，但两份 draft 该补签）。
3. 验收过的功能在 local 档要留证据：对验收 APR 重新 `gate approve`（有新鲜 verify.json 时会写入快照），或在主干重跑 verify。zhaoxi master 目前 `verify.json missing`。
4. 本地改过 `tools/gate/` 的项目（zhaoxi 的 reviewloop / changechain / check；fmea-v3 的 testcmd / verify）：update 会覆盖这些文件，原来的本地补丁在 0.9.2 里已有对应实现，可以放弃。
5. Codex Desktop 用户：更新后提交尾注会自动写 `Agent: codex` 与 `Session: <CODEX_THREAD_ID>`（2026-09-01 实测的 `CODEX_*` 变量）；只有完全不导出标记的 harness 才需要 `KEEL_AGENT`。
