# 审计线 4：自动评审回路合规（REQ-027 / REQ-028）

- 审计对象：提交 `e75e356 CHG-008: auto review loop and lens by code kind`（2026-08-24）
- 主要产物：`tools/gate/reviewloop.ts`（370 行）、`gate loop` 子命令、`keel/review/{attack-surface,robustness,requirements}.md`、`tests/chg008-review.test.ts`（203 行）、`.agents|.claude/skills/k-review|k-impl|k-accept`
- 审计人：独立复审员（未参与 CHG-008 实施）
- 日期：2026-08-25　Node v22.19.0　Windows 10
- 方法：`E:\program\en` 只跑只读命令；所有攻击/实验在 scratchpad 的仓库副本（`git archive HEAD | tar -x`，`git init` 后自建历史）中真实执行。本文每条阻断级/重要级发现均附已跑通的复现命令与实测输出；未跑通的推断标注「存疑」。

---

## 0. 一句话结论

> **这是一套骨架，不是一条能跑的回路。**
> 一条命令 —— `node tools/gate/gate.ts loop ingest <内容为空数组的文件>` —— 就能把门禁的 `G-done` 从 `review loop not passed (REQ-027)` 变成 `PASS ... review loop passed`。没有派任何子代理、没有产生评审输入包、没有对 diff 做过任何分类、没有跑过任何复现命令、没有任何异构证明。而且这个 `passed` **不与任何 commit / tree 绑定**：标记之后再往 `tools/gate/check.ts` 里写代码、提交、重跑 `gate verify`，`G-done` 依然 PASS。

实测（scratchpad 副本，完整输出见 B1/B2）：

```
$ node tools/gate/gate.ts loop status
review loop: none

$ printf '[]' > empty-findings.json && node tools/gate/gate.ts loop ingest empty-findings.json
filed iss=- deferred=0

$ node tools/gate/gate.ts loop status
review loop: passed round=0 lens=requirements het_required=false blocking=-

$ node tools/gate/gate.ts verify >/dev/null && node tools/gate/gate.ts check | grep G-done
PASS G-done  evidence 对账 + claimed AC trace + review loop passed
```

CHG-008 的五个切片里，**切片 1（三类清单 + k-review 重写）和切片 3（ISS 落盘门槛）是真做完了**，且切片 3 有像样的负面测试。**切片 2（编排 / 输入裁剪）只做了一个键名白名单**；**切片 4（清零判定）和切片 5（熔断）的代码存在但没有任何生产入口**——`recordClear` / `bumpRounds` / `runReproCommand` 只被测试文件调用，CLI 打不到。

---

## 1. 逐条验收标准对照

### REQ-027（7 条）

| # | 验收标准 | 判定 | 依据 |
|---|---|---|---|
| AC-1 | 未经评审不得进入验收 | **形同虚设** | `check.ts:197-200` 确有门禁，但判据是 `state.json` 里一个自述布尔值，且可被空数组 ingest 一键置真、终身有效（B1、B2） |
| AC-2 | 只给五样输入、不给实现过程对话 | **弱实现** | `validatePack` 仅做键名白名单（`reviewloop.ts:103-116`）；`pack` 不生成任何内容、`pack.json` 无人读取；对话塞进 `worklog_summary` 全量通过（I1） |
| AC-3 | 触及门禁/证据/测试机制强制异构 | **未接线** | `classifyLens` 在生产路径从未对真实 diff 调用；`ingest` 恒写 `lens=requirements` / `het_required=false`（B3） |
| AC-4 | blocking + 有复现命令才自动开 ISS | **达成** ✅ | `fileFindings`（`reviewloop.ts:118-152`）复用 `runNew(ctx,["iss",...])` 编号；负面测试 `tests/chg008-review.test.ts:111-140`；实测见 §6.2 |
| AC-5 | 新子代理复审 + 实跑每条复现命令 + 结果写进证据 | **未实现** | `recordClear` 无 CLI 入口（`gate loop clear` 是永远失败的桩，`reviewloop.ts:320-329`）；`runReproCommand` 全仓零调用方；`gate verify` 会抹掉证据里的 `review` 字段（B4、B5、B6） |
| AC-6 | 同一 blocking 修 3 轮未清零则熔断 | **未接线** | `bumpRounds` 只被不可达的 `recordClear` 调用；生产路径 `rounds_on` 恒为空对象；`ingest` 每次重写 `blocking_iss`；重复上报每轮拿到新 ISS 号（B7） |
| AC-7 | 无原生子代理时顺序开新会话 | **仅散文** | 无代码；`gate trace` 显示 REQ-027 的 AC-7 未被任何测试覆盖（I4） |

### REQ-028（5 条）

| # | 验收标准 | 判定 | 依据 |
|---|---|---|---|
| AC-1 | 门禁/证据/审批 → 攻击面清单 | **函数对、未接线、且覆盖不全** | `classifyLens` 单测通过，但生产恒为 `requirements`；`keel/evidence/`、`keel/config.json`、`keel/test-baseline.json`、`package.json`、`.agents/skills/` 全部被判为 `requirements`（B3、I2） |
| AC-2 | C-31 核心级 → 鲁棒性清单 | 同上 | `CORE_RE`（`reviewloop.ts:65`）逻辑正确但从不被调用 |
| AC-3 | C-31 辅助级 → 需求达成清单 | 同上 | 同上 |
| AC-4 | 三类都守 C-41 | **达成（散文）** | 三份清单末尾均写明；`gate trace` 显示 AC-4 无测试覆盖，属不可测条款，可接受 |
| AC-5 | 新攻击追加进清单 | **达成** ✅ | `gate loop append-attack`（`reviewloop.ts:248-253`、`330-335`）；测试 `tests/chg008-review.test.ts:75-82` |
| 边界 | **分类由被改动文件性质决定，不由实现方自述** | **实现反了** | 生产路径里 lens 与 het_required 100% 来自 `state.json` 中的自述字段（B3） |

**统计**：12 条验收标准中，**完整达成 3 条**（REQ-027/AC-4、REQ-028/AC-4、REQ-028/AC-5）；**部分达成 2 条**（REQ-027/AC-1、AC-2）；**未实现或形同虚设 7 条**。REQ-028 的边界条款被实现成了字面相反。

---

## 2. 先回答任务里的八个问题

**Q1　回路能端到端跑吗？谁派子代理？**

不能。`gate loop` 只有四个真子命令：`status`（读 `keel/review/state.json` 打一行字）、`pack`（校验一个**你自己写好的** JSON 的键名，抄进 `keel/review/pack.json`）、`ingest`（读 findings JSON，开 ISS 或写 worklog，改状态）、`append-attack`（往攻击面清单尾部追加一行）。

**没有任何代码派任何子代理**——`tools/` 下全部 `spawnSync` 调用点已逐一核对，只有 git / tsc / `gate` 自身 / `grok inspect`，没有一处是评审调用。派子代理这件事完全落在 `.agents/skills/k-impl/SKILL.md:42` 的散文里（"spawn a subagent that has not seen this chat"）。

"由宿主 agent 派"本身是合理的平台无关设计，**但当前实现连『准备一个包等宿主去派』都没做到**：`pack` 不生成 diff、不读 `plan/vN.md`、不抽 REQ 条目、不读 `verify.json`、不摘 worklog——它要求调用方把五样内容全部手工填好再交给它，然后写到一个**全仓无人读取**的 `pack.json`。所以「自动」目前自动在**零个**关键步骤上：分类不自动、派发不自动、跑复现命令不自动、熔断不自动；唯一自动的是「把 findings JSON 变成 ISS 文件」（切片 3，做得不错）。

**Q2　输入裁剪（C-39）做到了吗？**

只做到键名层。见 I1：把整段实现过程对话塞进 `worklog_summary` 字段，`gate loop pack` 全额接受并原样落盘。测试 `tests/chg008-review.test.ts:84-103` 只证明了一个**字面量叫 `transcript` 的键**会被拒。

**Q3　异构强制？失败是否显式报错？**

判定逻辑本身写对了（`completionReviewGaps` 在 `het_required && impl === reviewer` 时返回 `heterogeneous review required; will not silently use the implementer harness`，实测见 B3），**但它永远不会被触发**，因为没有任何生产路径会把 `het_required` 置真。「触及」的判定函数 `classifyLens` 在生产里唯一一次调用是 `classifyLens([])`（`reviewloop.ts:342`，空数组恒返回 `requirements`）。

「跨 harness 调用失败时显式报错而非静默降级」——**无从谈起，因为根本没有跨 harness 调用**。当前的异构判定只是比较两个自述字符串。

**Q4　落盘门槛？**

**这条真做到了**，且有负面测试。`blocking && repro.trim()` → `runNew(ctx,["iss",title])` 复用 `gate new iss` 的 `nextNumber` 编号分配（`tools/gate/new.ts:48`），符合变更单「不得另起编号逻辑」的要求；`blocking && !repro` → 只写 worklog 的「待核实」行，不开 ISS。实测见 §6.2。缺陷是次要级的（M1~M3）。

**Q5　清零判定？**

**没有实跑，纯自述。** `runReproCommand`（`reviewloop.ts:221-231`）是全仓唯一能跑复现命令的函数，**零调用方**（`grep -rn "runReproCommand"` 只命中定义行，连测试都没调过它）。`recordClear` 接收调用方**传进来的** `repro_runs` 数组并原样信任，只检查其中的 `refused` 布尔值。实测 B5：不跑任何命令、手工声明 `{exit_code:1, refused:true}`，直接得到 `review loop passed`。这正是 DEC-159「清零判定」一栏明确否决的「评审子代理声明即可」方案。

负面测试确实存在（`tests/chg008-review.test.ts:142-160`，`refused:false` 时不判 passed），但它守的是「声明值必须是 true」，不是「命令确实被拒」。

**Q6　熔断？**

计数在 `keel/review/state.json` 的 `rounds_on` 字段（明文 JSON、纳入 git、无哈希绑定）。**生产路径下它恒为空**，因为唯一写它的 `bumpRounds` 只被不可达的 `recordClear` 调用。实测中无论 `ingest` 多少轮，`gate loop status` 始终 `round=0`。

可否单方面重置：可以。删文件即可（`readLoopState` 找不到就返回 `null`，`ingest` 随即用 `emptyLoop` 重建）；甚至不必删——**再 ingest 一次空数组就会把 `blocking_iss` 清空并置 `passed`**（B4 实测）。

**Q7　三类视角？**

三份清单内容**与 DEC-160 的表格逐格对得上**（攻击面：改配置 / 伪造证据 / 缩范围 / 删测试 / 消警告 / 绕 hooks；鲁棒性：边界输入 / 依赖不可用 / 脏数据 / 并发重跑 / 中途失败半成品；需求达成：AC 逐条 + 人话错误），这是本次实施质量最高的部分。跨类别取最严的逻辑也写对了（`.some()` 短路，`tests/chg008-review.test.ts:61-63`）。

但**分类在生产里由实现方自述决定**（B3），与 REQ-028 边界条款正好相反；且分类表漏掉了「证据」和「配置」两类（I2）。

**Q8　证据协议耦合？**

**两侧字段和校验都写了，也各有一条测试，但真实流程里这条链是断的**（B6）：`recordClear` 把 `review` 写进 `verify.json` 的同时也改了 `state.json`，导致 tree 变化 → 证据 stale → `G-done`/`X-evidence` FAIL → 必须重跑 `gate verify` → `tools/gate/verify.ts:146-161` 从零构造 `Evidence` 对象、**不含 `review` 字段** → `review` 连同 `repro_runs` 被抹掉。实测确认重跑后 `'review' in evidence === false`，而 `G-done` 照样 PASS。

变更单要求「清零判定的执行结果**须写进证据 JSON**」——写进去了，又被下一步流程删掉了。要求的「两侧配契约测试」缺的恰恰是那条会抓住这个 bug 的测试：**没有任何测试断言 `gate verify` 之后 `review` 字段仍在**。两份校验逻辑还是复制粘贴的，已经出现分歧（I3）。

---

## 3. 阻断级

### B1　空数组 ingest 即可让 `G-done` 通过（评审可被完全跳过）

`tools/gate/reviewloop.ts:302-319`：

```ts
const out = fileFindings(ctx, findings, worklogRel);
const st = readLoopState(ctx) ?? emptyLoop("requirements", "unknown", "unknown");
st.blocking_iss = out.iss;
st.status = out.iss.length ? "repairing" : "passed";
writeLoopState(ctx, st);
```

零 finding = 直接 `passed`。没有任何前置条件：不检查 pack 是否生成过、不检查评审者是谁、不检查是否有任何评审动作发生过。默认的 `implementer_harness` / `reviewer_harness` 是字符串 `"unknown"`，`lens` 是 `requirements`，`het_required` 是 `false`。

实测（scratchpad 副本，从 `review loop: none` 起）：

```
$ printf '[]' > empty-findings.json
$ node tools/gate/gate.ts loop ingest empty-findings.json
filed iss=- deferred=0
$ cat keel/review/state.json
{ "status": "passed", "round": 0, "lens": "requirements",
  "implementer_harness": "unknown", "reviewer_harness": "unknown",
  "heterogeneous_required": false, "blocking_iss": [], "rounds_on": {}, "fuse_threshold": 3 }
$ git add -A && git commit -qm x && node tools/gate/gate.ts verify   # PASS, 114 tests
$ node tools/gate/gate.ts check | grep -E "G-done|X-evidence"
PASS G-done  evidence 对账 + claimed AC trace + review loop passed
PASS X-evidence  fresh tree 5287d800548b…; junit 对账
```

这条把 REQ-027/AC-1「评审是完成的必经步骤」降级为「打一次卡」。

**建议修法**：`ingest` 不得直接置 `passed`。引入显式开局命令（如 `gate loop start`，见 B3）建立状态，`ingest` 只允许 `in_review → repairing / awaiting_clear`；`passed` 只能由做过实跑校验的清零命令产生（B4）。同时把「本轮 pack 的哈希 + 评审者 harness/session」作为 `ingest` 的必填参数写进状态，让「没人评审过」在数据上无法伪装成「评审无发现」。

### B2　`passed` 状态与 commit / tree 无绑定，一次通过终身有效

`LoopState`（`reviewloop.ts:34-44`）里没有 `tree_hash` 也没有 `git_commit`。`completionReviewGaps`（`175-182`）只看 `loop.status === "passed"`。对比 `evidenceGaps` 是有 `evidenceFresh` 树哈希校验的（`tools/gate/evidence.ts:69-73`）——评审状态没有对应的新鲜度概念。

实测：在上面已经 `passed` 的副本里，往门禁代码本体追加一行并提交，重跑 verify + check：

```
$ echo "// unreviewed change" >> tools/gate/check.ts
$ git add -A && git commit -qm "unreviewed change to gate code AFTER loop was marked passed"
$ node tools/gate/gate.ts verify >/dev/null && node tools/gate/gate.ts check | grep -E "G-done|X-evidence"
PASS G-done  evidence 对账 + claimed AC trace + review loop passed
PASS X-evidence  fresh tree ec7ed4902eca…; junit 对账
```

`X-evidence` 认出了新 tree（哈希已变），`G-done` 的评审部分完全没反应。另外 `gDone`（`check.ts:169-177`）是**全仓一个布尔**：只要 `keel/features/*/summary.md` 存在任意一个就触发，而评审状态不分 feature，所以一次 `passed` 对所有功能同时生效。

**建议修法**：`LoopState` 增加 `tree_hash` + `feature`；`completionReviewGaps` 在 `gitWriteTree(ctx) !== loop.tree_hash` 时判为「评审已过期，需重新评审」，并按 feature 分别记录状态。

### B3　lens 与「是否强制异构」在生产里 100% 来自实现方自述，`classifyLens` 从未对真实 diff 运行

`classifyLens` 在生产代码里唯一的调用点是 `reviewloop.ts:342`：

```ts
const st = readLoopState(ctx) ?? emptyLoop(classifyLens([]), impl, reviewer);
```

空数组恒返回 `"requirements"`。`ingest` 那条路径（`314`）连调用都没有，直接硬编码 `emptyLoop("requirements", "unknown", "unknown")`。全仓**没有任何一处**执行 `git diff --name-only` 之类的取变更文件列表再喂给 `classifyLens`。

判定逻辑本身写对了，且拒绝静默降级的报错也写对了——实测：

```
状态 lens=attack, impl=grok-build, reviewer=grok-build, status=passed
→ completionReviewGaps: ["heterogeneous review required; will not silently use the implementer harness (DEC-159)"]

同一状态把 heterogeneous_required 手工改成 false
→ completionReviewGaps: []
```

第二行就是问题所在：`het_required` 是状态文件里一个可写布尔，`completionReviewGaps` 从不按当前 diff 重算 `needsHeterogeneous(classifyLens(...))`。这等于把「改配置绕过门禁」——本仓 `keel/review/attack-surface.md:19` 自己列在必查清单第一位的攻击手法——原封不动地重新引入了一次。REQ-028 的边界条款「分类由被改动文件的性质决定，不由实现方自述」被实现成了字面相反。

**建议修法**：`completionReviewGaps` 每次都用 `git diff --name-only <review_base>..HEAD` 重算 lens，与状态里记录的值不一致就判 FAIL；`heterogeneous_required` 改为**派生值**，不从 `state.json` 读取。

### B4　清零路径没有 CLI 入口：`gate loop clear` 是永远失败的桩，`recordClear` 只有测试能调

`reviewloop.ts:320-329`：

```ts
if (sub === "clear") {
  const st = readLoopState(ctx);
  if (!st) return fail("no loop state; ingest first\n");
  const runs: ReproRun[] = [];
  for (const id of st.blocking_iss) {
    const cmd = args.includes("--") ? args.slice(args.indexOf("--") + 1).join(" ") : "";
    void cmd;                        // ← 循环体什么都不做
  }
  return fail("usage: gate loop clear is driven from tests/reviewer via recordClear\n");
}
```

`runs` 声明后未使用，`for` 循环体是 `void cmd`，函数无条件 `fail`。实测：

```
$ node tools/gate/gate.ts loop clear;             exit=1  "usage: gate loop clear is driven from tests/reviewer via recordClear"
$ node tools/gate/gate.ts loop clear -- "echo x"; exit=1  同上
$ node tools/gate/gate.ts loop
usage: gate loop status|pack <json>|ingest <findings.json>|append-attack <line>   ← clear 连帮助里都没有
```

后果不只是「少一个命令」，而是**回路一旦真的发现问题就走进死胡同**：`ingest` 把状态置为 `repairing` 之后，CLI 上没有任何办法回到 `passed`。唯一的出路是（a）手改 `state.json`，或（b）再 ingest 一次空数组——后者就是那个把 `blocking_iss` 清空、而 ISS 仍然 open 的路径：

```
$ node tools/gate/gate.ts loop ingest f1.json     # 一条 blocking + repro
filed iss=ISS-022 deferred=1
$ node tools/gate/gate.ts loop status
review loop: repairing round=0 lens=requirements het_required=false blocking=ISS-022
$ printf '[]' > f2.json && node tools/gate/gate.ts loop ingest f2.json
filed iss=- deferred=0
$ node tools/gate/gate.ts loop status
review loop: passed round=0 lens=requirements het_required=false blocking=-
$ grep '^status' keel/issues/ISS-022-gate-check-can-be-bypassed.md
status: open                                     ← 问题还开着，回路已判「清零」
```

**建议修法**：实现真正的 `gate loop clear`：从 `keel/issues/` 读出 `blocking_iss` 每条的复现命令 → 用 `runReproCommand` 实跑 → 用实测的 `exit_code` / `refused` 构造 `ReproRun[]` → 调 `recordClear`。同时 `ingest` 必须与已 open 的 blocking ISS 求并集而非覆盖。

### B5　`recordClear` 信任调用方递交的执行结果，从不实跑（`runReproCommand` 是死代码）

`grep -rn "runReproCommand"` 全仓只命中定义行 `tools/gate/reviewloop.ts:221`——**连测试都没调过它**。`recordClear(ctx, runs, impl, reviewer)` 的 `runs` 完全由调用方提供（`341-368`），函数内部只做 `runs.some(r => r.iss === id && r.refused)` 的布尔筛选。

实测（在副本里直驱 `recordClear`，**一条命令都没跑**，只是把 `refused: true` 声明出去）：

```
recordClear: {"code":0,"stdout":"review loop passed\n","stderr":""}
evidence.review: {"status":"passed","lens":"attack","implementer_harness":"grok-build",
  "reviewer_harness":"claude-code","heterogeneous_required":true,"heterogeneous_ok":true,
  "blocking_iss":[],"repro_runs":[{"iss":"ISS-022","command":"node tools/gate/gate.ts check",
  "exit_code":1,"refused":true}],"round":1}
```

`heterogeneous_ok: true` 同样是两个自述字符串比出来的，没有任何证据表明第二个 harness 参与过。DEC-159 在「清零判定」上二选一并选了「实跑」，实现落在了被否决的那一侧。

**建议修法**：`recordClear` 不接受外部 `runs`，改为内部对每条 ISS 调 `runReproCommand` 并记录真实 `exit_code` 与 stdout 摘要；`repro_runs` 补 `ran_at` 与 `tree_hash`，使结果无法从旧轮次搬运。

### B6　证据里的 `review` 字段被 `gate verify` 抹掉，两侧契约在真实流程中失效

`tools/gate/verify.ts:146-161` 从零构造 `Evidence`，字段列表里没有 `review`，也不读旧的 `verify.json`。而 `recordClear` 写完 `review` 的同时改了 `state.json`（`gitWriteTree` 会 `git add -A`，见 `tools/gate/git.ts:99`），tree 立刻变化 → 证据 stale。

实测完整链路：

```
（recordClear 之后，未重跑 verify）
$ node tools/gate/gate.ts check | grep -E "G-done|X-evidence"
FAIL G-done  stale tree_hash or nonzero exit_code
FAIL X-evidence  stale tree_hash or nonzero exit_code

（按提示 commit + 重跑 verify）
$ git add -A && git commit -qm x && node tools/gate/gate.ts verify >/dev/null
$ node -e "const e=require('./keel/evidence/verify.json'); console.log('review key present:', 'review' in e)"
review key present: false
$ node tools/gate/gate.ts check | grep -E "G-done|X-evidence"
PASS G-done  evidence 对账 + claimed AC trace + review loop passed
PASS X-evidence  fresh tree 78ebe2c3547c…; junit 对账
```

于是 `check.ts:201-206` 的 `if (ev.review) { reviewClearGaps(...) }` 永远进不去，`evidence.ts:105-118` 里那段 `review` 校验也永远不会在真实流程中执行。缺的那条契约测试正是「`gate verify` 之后 `review` 仍在」。

**建议修法**：`verify.ts` 在重建证据时把上一份 `verify.json` 的 `review` 字段（若其来自同一评审轮）搬运过来；或把 `review` 移出 `verify.json`、单独落 `keel/evidence/review.json` 并在 `evidenceGaps` 里交叉校验。补一条端到端契约测试：`recordClear → gate verify → evidenceGaps`。

### B7　熔断在生产路径下永不触发；计数口径本身也有洞

`bumpRounds`（`188-201`）是唯一写 `rounds_on` 的地方，只被 `recordClear` 调用（B4：不可达）。实测中无论 `ingest` 多少轮，`gate loop status` 始终 `round=0`，`rounds_on` 始终为空。

即使把 `recordClear` 接上，计数口径也有洞：`rounds_on` 以 **ISS 编号**为键，而 `fileFindings` 每次都走 `runNew` 拿**新编号**（`tools/gate/new.ts:48` `nextNumber`，无按 fingerprint / title 去重）。同一个缺陷在第 2、3 轮被重新上报时会变成 ISS-024、ISS-025，`rounds_on` 里三个键各计 1，永远到不了阈值 3。加上 `ingest` 会覆盖 `blocking_iss`（B4 实测），旧 ISS 直接从计数视野里消失。

重置方式：删 `keel/review/state.json`、手改 `rounds_on`、或再 ingest 一次空数组。三条路都没有任何审计痕迹（该文件纳入 git，是唯一的弱约束）。

**建议修法**：`rounds_on` 改为按 ISS 的 `fingerprint` 计数（ISS 模板已有该字段，目前为空）；`ingest` 对已 open 的 blocking ISS 做指纹去重、复用旧编号而非新开；把 `rounds_on` 与熔断报告一并写进证据，使删状态文件不足以洗掉计数。

---

## 4. 重要

### I1　输入裁剪只挡住「字段名叫 transcript」，对话内容可整段塞进 `worklog_summary`

`validatePack`（`103-116`）做两件事：拒绝白名单外的键、要求五个键都是 string。**没有任何内容层判据**。

实测：

```
$ cat p.json
{"diff":"whatever","plan":"whatever","reqs":"whatever","evidence":"{}",
 "worklog_summary":"USER: fix it\nAGENT: I patched foo.ts then ran tests\nUSER: are you sure?\nAGENT: yes"}
$ node tools/gate/gate.ts loop pack p.json
wrote keel/review/pack.json          ← 全额接受，原样落盘
```

叠加两个问题：

1. `pack` **不生成**五样中的任何一样，全靠调用方手填，所以「diff 是不是真 diff」「evidence 是不是真 `verify.json`」完全不受控——实现方可以给评审者一份修饰过的 diff；
2. `pack.json` 写完之后**全仓无人读取**（`grep -rn "pack.json"` 只命中 k-review 散文和 `reviewloop.ts` 自己的写入），所以这一步是纯仪式，跳过它对回路状态毫无影响。

**建议修法**：`pack` 自己生成——`diff` 取 `git diff <base>..HEAD`、`evidence` 直接读 `verify.json`、`reqs` 按 feature 的 `req` 字段抽取、`worklog_summary` 从 worklog 取最近 N 条 bullet，并对内容做启发式拒绝（出现 `USER:` / `AGENT:` / `Human:` / `Assistant:` 等对话标记即 fail）。把 `pack.json` 的哈希写进 `LoopState`，`ingest` 要求引用该哈希，使「没打包就上报」不成立。

### I2　攻击面分类漏掉「证据」「配置」「测试基线」「技能」四类

DEC-160 表格第一行是「门禁 / **证据** / 审批」，检查项含「**改配置**、伪造证据、**删测试**」。但 `ATTACK_RE`（`reviewloop.ts:55-63`）只有 `tools/gate/`、`tools/cli/`、`.githooks/`、`bin/`、`.github/workflows/`、`keel/approvals/`、`tests/`。实测分类结果：

```
requirements  keel/evidence/verify.json         ← 证据本体
requirements  keel/config.json                  ← 门禁配置（test_command 等，ISS-001 的原案发地）
requirements  keel/test-baseline.json           ← C-34 删测试防线的基线
requirements  package.json                      ← test 脚本 / 命令白名单入口
requirements  .agents/skills/k-review/SKILL.md  ← 执法规则本体
requirements  keel/review/state.json            ← 评审回路自己的状态与熔断计数
attack        tools/gate/check.ts / .githooks/pre-commit / .github/workflows/ci.yml / keel/approvals/APR-001.md
robustness    samples/greet/greet.js / tools/other/x.ts
```

前六行按 DEC-160 都应是 attack。`keel/review/state.json` 尤其讽刺：改这个文件就能绕过整条回路（B3 / B7），而它自己被归为「辅助级、只查需求达成」。

**建议修法**：`ATTACK_RE` 补 `^keel/evidence/`、`^keel/config\.json$`、`^keel/test-baseline\.json$`、`^package\.json$`、`^keel/review/`、`^\.agents/skills/`、`^\.claude/skills/`。并把这张表与 `keel/review/attack-surface.md` 做一致性测试，避免两处各改各的。

### I3　`reviewClearGaps` 与 `evidenceGaps` 是两份复制粘贴的校验，已经出现分歧，且无一致性契约测试

`reviewloop.ts:154-173` 与 `evidence.ts:105-118` 逻辑几乎相同，但 `evidenceGaps` 多一段：

```ts
for (const run of ev.review.repro_runs ?? []) {
  if (run.refused === false || run.exit_code === 0) gaps.push(`${run.iss} repro exit=...; not refused`);
}
```

`reviewClearGaps` 没有这段。于是同一份 review 对象在 `recordClear` 里可以判 `passed`、在 `evidenceGaps` 里却是 gap（当 `repro_runs` 里含不在 `blocking_iss` 中的失败记录时）。CHG-008「两侧配契约测试」的本意就是防这种漂移；现有测试 `tests/chg008-review.test.ts:185-203` 只单测了 `evidenceGaps` 一侧。

**建议修法**：`evidence.ts` 直接复用 `reviewloop.ts` 导出的单一实现（或反向），并补一条契约测试：对同一组 review 对象断言两个函数判定一致。

### I4　REQ-027/AC-7 与 REQ-028/AC-4 无实现、无测试覆盖

`node tools/gate/gate.ts trace` 实测输出（末列为未覆盖 AC）：

```
| REQ-027 | `tests/chg008-review.test.ts` | 7 | AC-7 |
| REQ-028 | `tests/chg008-review.test.ts` | 5 | AC-4 |
```

AC-7「无原生子代理时顺序开新会话」只在 `k-review/SKILL.md:28` 有散文；AC-4「守 C-41」不可测，可接受。

目前 `X-trace` 没有报警，是因为 `keel/features/f07-review/` **没有 `summary.md`**（`gDone` 与 `uncoveredClaimed` 都以 summary 为触发条件）——也就是说 CHG-008 的实施尚未「声称完成」，追溯门禁对 REQ-027/028 还没生效。这一点在下一次给 F7 写 summary 时会立刻暴露。

**建议修法**：AC-7 至少落一条可验证形态——例如 `gate loop pack` 额外输出一份可直接粘贴进新会话的 `pack.md`，并对「无子代理能力的平台」路径做一条集成测试。

### I5　`keel/features/f07-review/plan/v1.md` 未随 CHG-008 更新，且与 DEC-159 直接矛盾

现状：`req: REQ-007`、`change: null`、非范围一节仍写「**异构复审是可选配置，默认关（C-40）**」、测试义务仍写「分级：辅助」、预计触碰文件只列两个 `SKILL.md`，不含 `tools/gate/reviewloop.ts`。CHG-008 已把 C-40 在门禁类改动上升为**强制**，并把切片与测试义务写在变更单里，但没有生成 `plan/v2.md`。

这不是文书洁癖：`plan/vN.md` 是 C-39 规定的五样评审输入之一。评审子代理拿到的「功能规划与测试义务」目前会告诉它「异构是可选的、这是辅助级代码」——**与它要核查的决策正好相反**。

**建议修法**：出 `plan/v2.md`（`change: CHG-008`、`req: [REQ-007, REQ-027, REQ-028]`），把变更单里的 5 切片测试义务搬进去，分级由「辅助」改为「核心 / 门禁」。

### I6　CHG-008 仍 `proposed`，实现已提交

`keel/changes/INDEX.md:15` 记 `CHG-008 ... proposed`；`keel/requirements/v3.md:16` 自述「CHG-008 仍 proposed，尚未单独批准实施」；但 `v3.md` 里 REQ-027/028 的 `status` 已是 `confirmed`，INDEX 的 current 已切到 v3（`c62eef7`），代码也已在 `e75e356` 落盘。CHG-002~007 都走了 `811fe9d` / `c62eef7` 的 kopit 批准，CHG-008 没有。

严格说这属于流程线（A3 / A5）的范围，此处只作记录：**变更单未批准即实施**，且被实施的正是「决定何时算完成」的门禁本身。

---

## 5. 次要

### M1　缺 `repro` **键**（而非空串）会让 `ingest` 抛未捕获 TypeError，并留下半成品状态

`reviewloop.ts:126` 的 `if (f.blocking && f.repro.trim())` 未做存在性判断。负面测试只覆盖了 `repro: ""`，没覆盖「字段缺失」——而后者才是真实评审者最可能产出的形状（「这条我给不出复现命令」通常写成不带该键）。实测：

```
$ printf '[{"title":"x","blocking":true}]' > t.json
$ node tools/gate/gate.ts loop ingest t.json; echo exit=$?
TypeError: Cannot read properties of undefined (reading 'trim')
    at fileFindings (...reviewloop.ts:126)
exit=1
```

同样崩的还有 `{"findings":[...]}`（对象包裹）和 `null`——`for (const f of findings)` 直接抛，输出是裸栈而非人话（`keel/review/requirements.md:8` 自己要求「参数缺失、格式错误时是否给出人话错误（非裸堆栈）」）。

更麻烦的是**部分写入**：崩溃发生在循环中途时，前面的 ISS 已经落盘，`writeLoopState` 却没执行。实测：

```
22 issues before
$ printf '[{"title":"real hole A","blocking":true,"repro":"node -e 1"},{"title":"crasher","blocking":true}]' > t.json
$ node tools/gate/gate.ts loop ingest t.json; echo exit=$?      exit=1
23 issues after        ← ISS-023-real-hole-a.md 已创建
$ node tools/gate/gate.ts loop status
review loop: repairing round=1 ... blocking=ISS-022     ← 状态里没有 ISS-023
```

ISS-023 从此是个「开着但回路不认识」的孤儿：不会阻止清零，也不会进熔断计数。这正是 `keel/review/robustness.md:11`「中途失败是否留下半成品状态」要查的东西。

**建议修法**：`ingest` 先整体校验 findings 结构（是数组、每项有 title/blocking、repro 缺失按空串处理），失败给人话错误；文件操作与状态写入做成先收集后一次性提交。

### M2　非 blocking 的 finding 被静默丢弃

`fileFindings`（`125-150`）的分支是 `if (blocking && repro)` / `else if (blocking)`，`blocking === false` 的 finding 既不开 ISS 也不进 worklog，`ingest` 的回显里也不计数（只报 `filed` 与 `deferred`）。实测三条 finding 输入（1 条 blocking+repro、1 条 blocking 无 repro、1 条非 blocking）回显为 `filed iss=ISS-022 deferred=1`——第三条无声消失。`k-review/SKILL.md:35` 要求「Label blocking vs advisory」，advisory 标了之后没有去处。

**建议修法**：advisory finding 也追加进 worklog（标记为「建议」），至少留痕。

### M3　`runNew` 失败时 finding 被静默吞掉，且可能把状态推向 `passed`

`reviewloop.ts:128-141`：正则 `/created\s+(ISS-\d+[^\s]*)/` 匹配不上或 `runNew` 返回 fail 时，代码既不 push 进 `iss`、也不 push 进 `deferred`、也不报错。若一批 findings 全部如此，`out.iss.length === 0` → `ingest` 写 `status: "passed"`（`316`）。**一次开 ISS 失败会被呈现为「评审无发现」。** 未构造出稳定复现路径（`runNew` 只在目标文件已存在时返回 fail），标注「存疑」，但代码路径确凿。

**建议修法**：`runNew` 非零返回时 `ingest` 整体 fail 并保持原状态。

### M4　`append-attack` 追加位置落在「## 每轮必做」节下

`appendAttackSurface`（`248-253`）无条件 `appendFileSync` 到文件尾。`attack-surface.md` 的结构是「## 已知攻击」在前、「## 每轮必做」在后，所以新发现的攻击会被追加到「每轮必做」里，读起来像是新增了一条操作指令而非一条已知攻击。文件自己第 3 行写的是「新发现追加到文末」，属自洽，但语义位置不对。

**建议修法**：插入到「## 已知攻击」节末尾，或把「## 每轮必做」上移。

---

## 6. 符合项（做对的部分）

**6.1　三份清单与 DEC-160 逐格对应**——`keel/review/attack-surface.md` / `robustness.md` / `requirements.md` 三份内容与 DEC-160「影响」表完全对得上，且攻击面清单把 ISS-001~021 的历史攻击都固化了下来，确实起到了「子代理无跨轮记忆、清单是唯一经验载体」的作用。切片 1 完成度最高。

**6.2　落盘门槛（REQ-027/AC-4）真实可用，且复用了 `gate new iss` 的编号分配**——`fileFindings` → `runNew` → `nextNumber`，符合变更单「不得另起编号逻辑」。实测：

```
$ node tools/gate/gate.ts loop ingest f1.json --worklog keel/features/f17-gate/worklog.md
filed iss=ISS-022 deferred=1
$ cat keel/issues/ISS-022-gate-check-can-be-bypassed.md   （节选）
## 现象
复现命令：
```
node tools/gate/gate.ts check
```
$ tail -1 keel/features/f17-gate/worklog.md
- 待核实（无复现命令，未开 ISS）：vague smell
$ ls keel/issues | grep -c "vague"        → 0    ← 无复现命令的 finding 确未开 ISS
```

负面测试 `tests/chg008-review.test.ts:111-140` 断言到位（含 `readdirSync` 目录计数断言，不是只看返回值）。

**6.3　`classifyLens` 的跨类别取最严逻辑正确**——`.some()` 短路，attack > robustness > requirements，有测试覆盖（`:61-63`）。问题只在于没接线（B3）与覆盖不全（I2），判定函数本身写对了。

**6.4　拒绝静默降级的报错文案与判据写对了**——`completionReviewGaps:178-181`、`evidenceGaps:106-108`，实测能在 `lens=attack + 同 harness` 时正确报出 `will not silently use the implementer harness (DEC-159)`。只是永远到不了这个分支。

**6.5　`gate loop append-attack` 可用**（REQ-028/AC-5 达成），有测试。

**6.6　`G-done` 确实新增了评审门禁**（`check.ts:197-206`），`state.json` 缺失时给出 `review loop not passed (REQ-027)` 并 FAIL——门禁挂上去了，问题是判据太软。

**6.7　`checklistExists` 虽未接入门禁，但测试从真实仓库根读取三份清单**（`tests/chg008-review.test.ts:65-73`），所以删掉清单会让 `node --test` 变红、进而卡住 `gate verify` / `X-evidence`。这是一条有效的间接防线。

**6.8　`X-skills` 通过**，`.agents/skills` 与 `.claude/skills` 两份 k-review / k-impl / k-accept 内容一致，无漂移。

---

## 7. 修法优先级建议

| 序 | 动作 | 解决 |
|---|---|---|
| 1 | `LoopState` 增加 `tree_hash` + `feature`，`completionReviewGaps` 校验新鲜度 | B2 |
| 2 | 新增 `gate loop start`：从 `git diff --name-only` 算 lens、记录双方 harness；`het_required` 改为派生值，不再从状态读 | B3、B1 |
| 3 | 实现真正的 `gate loop clear`：读 ISS 复现命令 → `runReproCommand` 实跑 → 用实测结果调 `recordClear`；`recordClear` 不再接受外部 `runs` | B4、B5 |
| 4 | `ingest` 不得直接置 `passed`；对已 open 的 blocking ISS 做指纹去重与并集 | B1、B7 |
| 5 | `verify.ts` 保留 / 搬运 `review` 字段，并补 `recordClear → verify → evidenceGaps` 全链契约测试 | B6、I3 |
| 6 | `rounds_on` 改按 ISS `fingerprint` 计数，熔断计数进证据 | B7 |
| 7 | `pack` 自己生成五样输入 + 对话标记启发式拒绝；`pack.json` 哈希写进状态并被 `ingest` 引用 | I1 |
| 8 | `ATTACK_RE` 补 evidence / config.json / test-baseline.json / package.json / review / skills | I2 |
| 9 | 出 `plan/v2.md`，修正「异构可选」「辅助级」的过期表述 | I5 |
| 10 | `ingest` 输入结构校验 + 原子写；advisory finding 留痕；`runNew` 失败即 fail | M1~M3 |

---

*本报告只覆盖 REQ-027 / REQ-028 的验收合规。CHG-008 未批准即实施（I6）属流程线范围，此处仅记录。所有实验在 scratchpad 的仓库副本中执行，`E:\program\en` 未被修改。*
