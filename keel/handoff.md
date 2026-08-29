# 当前交接 — 0.8.0 P1–P6 本地闭环完成，真实 GitHub 六格待执行

- date: 2026-08-29
- what/why: 围绕 requirements v4 / CHG-010 的 P1–P6 已完成本地实现、发布包验证、真实本地 consumer 更新和异构攻击式 review。按用户明确要求，P6 目前只做到本地闭环，尚未触发真实 GitHub Windows/macOS/Linux × Node 22/24 六格 CI。
- current: 已跟踪实现停在 HEAD `a5a7dd7210c4cc4c79e4aea9ab9a865ae30a4c9b`；该提交的干净树 hash 为 `23d1c2ee8396a3e10479b560f91266258dcef120`。P1–P6 的本地实施范围已完成，但不能表述为“28 条需求全部验收”：当前 trace 为 2/28 REQ claimed，仍有 11 个 proxy AC。异构 review 为 0 blocking、1 advisory；advisory 是 k-grill 的 REQ 字段说明与 REQ-001/实际行结构存在口径漂移，涉及已确认需求，等待用户决定是否另开 CHG / requirements 新版本处理。
- evidence boundary: 以下结果绑定上述 tracked commit，而不是本次尚未提交的 handoff 编辑。在干净 detached worktree `C:\Users\NF3317\AppData\Local\Temp\keel-p6-clean-140811b` 上，`gate verify` 为 PASS（321 passed、0 failed、0 skipped、dirty=false），完整 `gate check` exit 0、PASS_WITH_WARN（0 fail、2 warn）。两个 warning 分别是 8 份冻结的 pre-0.8 legacy RES 和尚未执行真实 GitHub 六格导致的 REQ-017/AC-4 proxy。
- release/consumer: `keel/features/f23-bootstrap/consumer-update-p6.md` 记录了本地 `npm pack`、安装及真实 consumer 更新；tarball SHA-256 为 `790515AE20E36B46BE9269B1EC825CCE955E105B820B52A1226450A289EFA686`。未发布到公共 npm，也未触发 GitHub CI。
- review: implementer 为 `openai-codex`，reviewer 为 `deepseek-via-opencode`，attack lens，round 1；reviewed pack hash 为 `0537631909ff8a1e902a5a386aacd18afbf2c9cdb8063640b8f56b7afc17fdd6`。本地 sidecar 在 `keel/evidence/review-opencode-deepseek-2026-08-28.json`（ignored，不属于 tracked commit），advisory 已记入 `keel/features/f17-gate/worklog.md`。

## 下一步

1. 先由用户审阅本次 handoff 更新，并决定是否提交；在决定前不暂存、不提交。若决定提交，必须对最终树重新运行与记录 `gate verify` / `gate check`，不能沿用上方旧树证据。
2. 用户以后明确授权时，再执行真实 GitHub 六格 CI，并记录仓库 URL、run ID、commit SHA、6 个 job、日期和 artifact hashes，随后才能清除 REQ-017/AC-4 的 proxy。
3. 单独决定是否为 k-grill 字段口径 advisory 新开 CHG 和 requirements 新版本；不能直接改已确认的 requirements v4 或把 skill 文案静默改成另一套需求结构。
4. 若目标是正式接受 0.8.0，还需继续收敛 trace 中未 claimed 的 REQ 与其 proxy/manual 证据；本地 P1–P6 完成不等于整份 requirements v4 已验收。

## 待用户决定 / 边界

- 是否提交这次 handoff 更新。
- 何时授权真实 GitHub 六格 CI；当前明确保持本地，不触发。
- 是否处理 k-grill 字段说明口径漂移；若处理，走新 CHG / 新需求版本。
- 本节以下是原有交接历史，完整保留，不覆盖、不删改。

## 继续时先读

1. `keel/plan/overview-v3.md`（P6 与完成边界）
2. `keel/features/f23-bootstrap/consumer-update-p6.md`
3. `keel/evidence/verify.json`
4. `keel/features/f17-gate/worklog.md`
5. 处理 advisory 时再读 `.agents/skills/k-grill/SKILL.md` 与 `keel/requirements/v4.md`

---

以下为原有历史交接，完整保留。

---

# 交接更新 — P1 的 verification 数组协议完成

- date: 2026-08-28
- what/why: requirements v4 虽写了 verification 数组，旧 gate 完全不读；现已让 G-req 检查每条 acceptance/verification 等长，类型只允许 `auto`、`machine-doc`、`manual`，并让 trace 复用同一 parser。
- current: F6，P1 verification parser 切片完成；P1 尚有 trace 类型/claimed scope/proxy 展示和 evidence stale 联动。
- evidence: 新黑盒红灯 1/4 后转绿 4/4；相关回归 27/27；quick PASS_WITH_WARN，真实 v4 报告 28 个 verification 数组有效；最终 verify 见 `keel/evidence/verify.json`。

## 下一步

1. 读 `keel/plan/overview-v3.md` P1、F6 plan v2/worklog 与本 journal。
2. 做 F6 plan v2 步骤 2：让 `gate trace` 逐 AC 输出 verification 类型和 claimed scope；补正反向测试证明 proxy 仍只 WARN、不能变成 PASS。
3. 同一会话只做该切片；evidence stale 后置。

## 未决与边界

- 用户要求 P6 暂时全部本地，不触发真实 GitHub 六格；REQ-017/AC-4 继续 proxy WARN。
- ISS-036 仍留 P2；旧格式兼容边界已记录在 F6 worklog，不在本轮改变 frozen requirements。
- 本文件更早的用户在途内容继续完整保留，本次提交仍不得暂存 `keel/handoff.md`。

## 该读文件

- `keel/features/f06-evidence/plan/v2.md`、`worklog.md`
- `tools/gate/trace.ts`
- `tools/gate/check.ts`
- `tests/chg010-verification.test.ts`

---

# 交接更新 — P1 的 CHG→REQ→APR 关系门禁完成

- date: 2026-08-28
- what/why: 旧 G-req 完全不读取 CHG/APR，导致 confirmed REQ 可由 proposed CHG 产生；现已加入当前版本新增 CHG 的状态、approved APR 与规范化工件 hash 关系检查。
- current: F11，P1 第一行为切片完成；P1 尚有 verification parser、trace 三类型展示和 evidence stale 两类切片。
- evidence: 新黑盒红灯 1/4 后转绿 4/4；相关回归 54/54；quick PASS_WITH_WARN，真实 v4 的 CHG-008/010 均显示 APR-bound；最终 verify 见 `keel/evidence/verify.json`。

## 下一步

1. 读 `keel/plan/overview-v3.md` 的 P1、F6 plan v2/worklog 和 F11 本日 worklog。
2. 做 F6 plan v2 步骤 1：requirements verification parser，检查 AC 数量等长与 `auto`/`machine-doc`/`manual` 枚举；先写 `tests/chg010-verification.test.ts` 红灯。
3. 同一会话只做该切片；trace 展示与 evidence stale 各自后置。

## 未决与边界

- 用户要求 P6 先全部留在本地：不触发真实 GitHub 六格；REQ-017/AC-4 保持 proxy WARN，不声称全项目完成。
- ISS-036 仍留 P2；当前唯一预期 quick WARN 是六格 proxy。
- 本文件更早的用户在途内容继续完整保留，本次提交仍不得暂存 `keel/handoff.md`。

## 该读文件

- `keel/features/f11-change/plan/v2.md`、`worklog.md`
- `keel/features/f06-evidence/plan/v2.md`、`worklog.md`
- `tools/gate/changechain.ts`
- `tests/chg010-change-chain.test.ts`

---

# 交接更新 — requirements v4 的 P0 规划基线完成

- date: 2026-08-28
- what/why: APR-003 后必须先有可实施的统一规划；已新建 `overview-v3.md` 和 F1～F24 全部最新计划版本，完整列出 owner、verification、测试缝、I-01～I-25 与 P0～P6 顺序。
- current: F4/F11，CHG-010 的 P0 规划切片完成；尚未开始 0.8.0 行为实现。
- evidence: 24 份 latest plan owner/frontmatter 审计 PASS；`gate check --quick` PASS_WITH_WARN（仅 REQ-017/AC-4 真实 CI proxy）；最终 `gate verify` 结果见 `keel/evidence/verify.json`。
- issue: overview 升 v3 暴露 plan current 测试硬编码，ISS-051 已以版本无关不变量关闭；ISS-036 留到 P2 review-loop；F4 worklog 新增一条待复盘经验候选。

## 下一步

1. 读 `keel/plan/overview-v3.md` 的 P1、`keel/features/f11-change/plan/v2.md` 与 worklog。
2. 先审计现有 G-req 是否已完整实现 confirmed REQ → approved CHG → approved APR/hash 四种关系；从缺口写 `tests/chg010-change-chain.test.ts` 黑盒红灯，再补实现。
3. 同一会话只做 P1 的一个切片；结束时 quick、verify、worklog、handoff。

## 未决与边界

- 不需要用户新决策才能开始 P1；若实现发现现有 APR 关系需要改变已确认字段或 hash 契约，按 C-21 停下。
- 外部消费项目和 GitHub 六格属于 P6，未取得真实证据前不得解除 proxy。
- 本文件原有 2026-08-27 内容是用户在途改动，以下完整保留；本次提交不得把它连同本更新一起误暂存。

## 该读文件

- `keel/plan/overview-v3.md`
- `keel/features/f11-change/plan/v2.md`、`worklog.md`
- `keel/changes/CHG-010-requirements-v4-stabilization.md`
- `keel/issues/ISS-051-plan-index-current-version-hardcode.md`

---

# 历史交接 — RES-904 七条已落地并提交；zhaoxi 迁移已应用（zhaoxi 侧未提交）

- date: 2026-08-27
- 本段：RES-904（wayfinder 借鉴）→ DEC-169/170 实现、171/172 deferred → 提交 `7e5419c` → 用户「迁移」→ zhaoxi F-00 worktree 升级 gate 并整改存量（DEC-014）

## 状态（本仓）

| | |
|---|---|
| 需求 | 28 条（gap-hunt-v3 的 6 条严重发现仍**待处置**；DEC-169/170 行为在 v3 无 AC，v4 时补） |
| 决策 | 172 条（169/170 confirmed，171/172 deferred） |
| 问题条目 | 45 条（open：仅 ISS-036） |
| 测试 | 213 全绿 |
| 门禁 | `check --quick` → `PASS_WITH_WARN`（唯一 WARN = X-trace 的 REQ-017/AC-3 `[proxy]`） |
| 已提交 | `7e5419c`；本文件为提交后唯一改动 |

## zhaoxi 迁移（2026-08-27，未提交，见 zhaoxi F0 worklog 同日条目与 DEC-014）

- `keel update`：gate / hooks / skills / templates 更新（版本号仍 0.7.0——**上游未升版本号**，建议下次发布升 0.8.0）；16 份 `agents/openai.yaml` 落地。
- 六组代理测试按 DEC-168 标记（4 条 AC 进 proxy 列）；`REQ-002/AC-3` 删同义反复；egress 五条降为 `REQ-005 registry:`；常量对常量 → `fp:`。
- 九份计划前言补 `req:` / `blocked_by:`（按 overview-v2 交付顺序；APR-002 哈希按 C-106 视为非语义修订不重批）；`gate status` → `frontier: F0`、blocked 链完整。
- RES-001~008 补 oss 表态；五份 RES 补「引用」节（23 个链接全部 curl 核实）——**上游 G-research 新判据首次打在消费项目上，差点挡住其所有提交**（ISS-038 同类：新判据须先拿真实样本实测）。
- APR-001 补 `delegated:`「由你提交」；**APR-002/003 委托原话未找到，X-apr FAIL 待用户补**。
- zhaoxi 快检 PASS；六个改动测试文件 42/42；**全量 `node --test` 在 `tests/core/secrets.test.ts` 挂起**——该文件与 `secrets.ts` 是另一会话 round 5 的在途未提交改动，非本次引入，已通知（见下）。

## full check 当前项（本仓）

- `G-done` / `G-merge` / `X-evidence`：dirty working tree（只有本文件）
- `G-retro`：ISS-036 open
- `X-trace` WARN：REQ-017/AC-3 proxy

## 下一步候选（按价值排序）

1. **zhaoxi**：用户补 APR-002/003 的 `delegated:` 原话；在途会话确认 `secrets.test.ts` 挂起原因（round 5 未提交改动）；F0 写 summary 前跑 `gate trace` 看 proxy 4 条是否可解除。
2. **上游**：升版本号 0.8.0；G-research 判据对"来源已点名但无链接"的旧 RES 应给 WARN 而非 FAIL（本次差点挡住消费项目提交）——需 DEC；ISS-004（junit 只读第一个 suite）仍未修，zhaoxi 证据 counts 失真。
3. Codex 实测（DEC-170 唯一未核实项）。
4. REQ-017/AC-3 回 k-grill 改写；v4 需求书补 DEC-169/170 的 AC；gap-hunt-v3 六条处置；CI 首跑；ISS-036；KLES-002 措辞。

## 未决问题

- 前沿要不要下沉到功能内部切片（DEC-169 复审条款）。
- `[proxy]` 是否也该在 G-done 阻塞（现版：只在 X-trace 亮 WARN，`proxy_acs` 可读）。
- 白盒名挂 AC 何时从 WARN 升 FAIL（DEC-168）。
- `gate.ts` 的 root 取自脚本所在仓库而非 cwd：设计还是缺陷，待定。
- 消费项目前言元数据补行（`req:` / `blocked_by:`）是否算 C-106 的非语义修订——本次按"是"处理，用户可否决。

## 该读文件

- `keel/research/RES-904-*.md`、`keel/decisions/DEC-169..172`
- `keel/features/f17-gate/worklog.md` 2026-08-27 段
- zhaoxi：`E:\program\zhaoxi\.keel-worktrees\F-00-platform-base\keel\decisions\DEC-014-*.md`、同处 `keel/features/f00-platform-base/worklog.md` 2026-08-27 段
