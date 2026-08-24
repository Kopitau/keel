# 审计线 1：决策合规性核查报告

- 审计对象：`E:\program\en`（keel 框架自身仓库）
- 审计基准：`keel/decisions/DEC-001` ~ `DEC-154`（154 条已确认决策）、`DESIGN.md`、`docs/features.md`
- 被审实施：W1~W6，9 个提交（`0bb57ad` ~ `76d4e7b`），`tools/gate/` 约 3.5k 行 TS + 16 个技能 + 6 个测试文件
- 审计员：独立第三方（未参与实施），只读核查，未修改任何文件
- 审计日期：2026-08-24
- 审计时仓库状态：`git status --porcelain` 为空（干净）；本次只运行了只读命令与 `gate verify`（其产物 `keel/evidence/*` 已被 `.gitignore` 忽略）

---

## 0. 一句话结论

**跨平台哈希、运行时选型、预算控制这三块（DEC-144、DEC-149~154、C-118/121）实施得扎实，可以放心。**
**但门禁本身有系统性缩水：六道门禁里有三道（G-完成/G-合并/G-复盘）的判据只实现了一小半，「追溯全绿」这条贯穿三道门禁的核心判据完全没进代码，实测 24 条需求里 10 条零测试引用而 `gate check` 依然全绿。** 另有 git hooks 可执行位缺失，导致 macOS/Linux 上整个 L2 强制层是死的。

严重度统计：**阻断级 3 条、重要 12 条、次要 6 条**；核查为「符合」的约 28 组决策点（见 §4）。

---

## 1. 阻断级问题（决策的核心机制没实现或形同虚设）

### B-1　追溯对账根本没进门禁，且粒度与决策不符（DEC-032/C-32，连带 DEC-037/C-37）

**决策原文**（`keel/decisions/DEC-032-C-32.md:30`）：

> 测试带需求编号标记…脚本生成追溯矩阵；**按验收标准逐条对账**，验收范围内零引用=门禁不过

`DESIGN.md:139-141` 的门禁表里，「追溯全绿」同时是 **G-完成** 和 **G-合并** 的判据。

**实际情况（三个独立缺陷叠加）**：

1. **粒度错了。** `tools/gate/trace.ts:20` 只用 `/## (REQ-\d{3})/g` 抓需求标题建行，从不解析每条需求下面 `- **acceptance**:` 里的逐条 GWT。而 `keel/requirements/v2.md` 里每条 REQ 有 5~6 条独立验收标准（例如 REQ-001 有 6 条）。决策要求的「按验收标准逐条对账」被降级成了「按需求整条对账」。

2. **矩阵不阻断。** `trace.ts:56-79` 的 `runTrace` 无论多少条 uncovered 都走 `return ok(...)`，退出码恒为 0。

3. **门禁里根本没有这一项。** `buildTrace` 全仓只有两个调用点：`trace.ts:57`（打印用）和 `verify.ts:106`（填 `req_coverage` 计数用）。`check.ts:382-403` 的检查项清单里没有任何追溯检查。

**实测证据**：

```
$ node tools/gate/gate.ts trace
...
uncovered: 10 / 24

$ node tools/gate/gate.ts check
...
result: PASS  fail=0  warn=0
```

10 条需求（REQ-002/003/005/007/008/009/010/013/014/022）一条测试引用都没有，门禁全绿放行。

4. **附带削弱**：`trace.ts:30` 的搜索根是 `["tests", "tools/gate"]` —— 只要在**源码注释**里写一句 `REQ-nnn`，这条需求就被算作「有测试」。REQ 覆盖判定因此可以被非测试文件伪造。

**建议修法**：
- 给 `v2.md` 每条验收标准编稳定号（如 `REQ-001/AC-3`），`buildTrace` 按 AC 行建矩阵；
- 新增 `G-trace` 检查项，或把「uncovered > 0 → fail」并进 `gDone` / `gMerge`；
- 搜索根收窄到测试目录（由 `config.profiles.<active>` 提供），源码不计入覆盖。

---

### B-2　G-完成 / G-合并 / G-复盘 三道门禁判据大面积缺失（DEC-103、DEC-045、DEC-056）

逐条对照 `DESIGN.md:134-141` 的门禁表与 `tools/gate/check.ts` 实现：

| 门禁 | 规范判据（DESIGN §4 / 决策原文） | 代码实际做的 | 缺什么 |
|---|---|---|---|
| G-需求 `check.ts:52-67` | 无未决澄清标记；未解分支落「未决问题」节 | 数标记 + 检查小节存在 | 基本符合（但有豁免通道，见 I-2） |
| G-调研 `check.ts:69-87` | 每个重大决策指向 RES 或书面豁免；**脚本查引用存在性** | 只看 `research` 数组非空 或 有 `research_exemption` | 引用存在性未查；作用面只有 2 条 adr（见 I-1） |
| G-规划 `check.ts:89-103` | 版本索引唯一；接口耦合表存在 | 两条都做了（`indexgen.ts:14-16` 双指报错） | **符合** |
| G-完成 `check.ts:105-129` | 树哈希匹配 **+ 追溯全绿 + 实际重跑测试对账** | 只有 `evidenceFresh()` | 追溯全绿、重跑对账 |
| G-合并 `check.ts:144-165` | 验收记录 + 证据有效 **+ 追溯全绿 + 无未闭环 blocking 问题** | APR `status: approved` 计数 + `evidenceFresh()` | 追溯全绿、blocking 问题闭环 |
| G-复盘 `check.ts:167-178` | 总结齐全 **+ 总览更新时间 ≥ 合并时间 + 问题全闭环 + 暂定销项有记录** | 数 summary.md + 判断 `OVERVIEW.md` 是否存在 | 时间比较、问题闭环、暂定销项 |

DEC-056 原话是「**缺一不许**」，实现只覆盖了 1.5 / 4 条 —— G-复盘 接近空壳（只要 `OVERVIEW.md` 这个文件存在就 PASS，内容和时间都不看）。

**讽刺的是修这个很便宜**：`status.ts:18-33` 已经在数 `provisional` 决策数和 open issues 数了，把这两个数接进 `gRetro` / `gMerge` 就能补上两条判据。

**建议修法**：
- `gMerge` 增加：open/in_progress 且 severity=blocking 的 ISS 数 > 0 → fail；追溯 uncovered > 0 → fail。
- `gRetro` 增加：`statSync(OVERVIEW.md).mtime` 与最近一次含 `Feature:` 尾注的合并提交时间比较；provisional 决策数 > 0 且复盘未记销项 → fail。

---

### B-3　git hooks 与 gate.sh 在仓库里是 100644，macOS/Linux 上 L2 层完全失效（DEC-146、C-102、DEC-148）

**证据**：

```
$ git ls-files -s | grep -E "githooks|\.sh$"
100644 aedf294... 0  .githooks/pre-commit
100644 d735c99... 0  .githooks/pre-push
100644 6d45ccc... 0  .githooks/prepare-commit-msg
100644 7a50cf5... 0  tools/gate/ci-trunk.sh
100644 a5f4752... 0  tools/gate/gate.sh
```

git 只执行带可执行位的 hook。新克隆到 macOS/Linux 后，三个 hook 会被**静默跳过**（不报错、不提示）。即便手工加了 hook 的可执行位也没用：`.githooks/pre-commit:3` 是 `exec "$root/tools/gate/gate.sh" check --quick`（直接执行而非 `sh gate.sh`），`gate.sh` 同样是 644 → `Permission denied`。

本机 `core.filemode=false`（Windows），所以这个缺陷在 Windows 上不暴露 —— 典型的「本地全绿、换平台就死」，正是 DEC-145/DEC-148 想防的那类 bug。

**为什么算阻断级**：
- DEC-146 的整个论点是「双启动器 + `#!/bin/sh` 薄壳，三平台都成立」。实际只有一个平台成立。
- 本仓当前是 **本地档**，而 DEC-104 定义本地档的权威就是「hooks + 合并前强制 gate」。在 Mac 上跑本地档等于零强制。
- DEC-148 的一致性 fixture 完全没覆盖 hooks，CI 也不跑 hooks，所以这个洞永远不会被现有测试发现。

**建议修法**：
```
git update-index --chmod=+x .githooks/pre-commit .githooks/pre-push \
  .githooks/prepare-commit-msg tools/gate/gate.sh tools/gate/ci-trunk.sh
```
并在 `w1-skeleton.test.ts` 加一条断言：`git ls-files -s` 里这五个路径的 mode 必须是 `100755`（这是纯文本断言，Windows 上也能跑）。

---

## 2. 重要问题（实现了但有缺口）

### I-1　G-调研不查 RES 引用是否真的存在，且作用面只剩 2 条决策（DEC-010/C-10）

**决策原文**：「每个重大决策必须指向调研报告，否则决策记录里写豁免理由；**脚本机器检查引用存在性**」。

`check.ts:69-87` 只判断 `readAttrList(attrs.research).length === 0 && !exemption`。**没有一行 `existsSync` 去验证被引用的 RES 文件真的在 `keel/research/` 下。** 写 `research: [RES-999-imaginary]` 一样通过 —— 而「查引用存在性」正是决策原文点名要求的那一件事。

第二个问题是作用面：`check.ts:74` 用 `if ((attrs.adr ?? "") !== "true") continue;` 把检查范围限定在 `adr: true` 的决策上。全仓 154 条里只有 **2 条** 是 adr（DEC-149、DEC-154）。其余 152 条中 142 条挂着同一句机器生成的样板豁免文本（W1 自举迁入时批量写入）。

把「重大决策」等同于 `adr: true` 是一个**未经决策的收窄**：C-16 定义 adr 是「同时满足三门槛」才打的标记，门槛明显高于 C-10 的「重大决策」。这个等价关系没有出现在任何 DEC 或 CHG 里。

**建议修法**：`existsSync(join(records,"research", ref + ".md"))` 或按前缀匹配；「重大决策」的判据单独定义（例如 `features` 里含核心功能、或新增 `significance` 字段），并补一条 DEC 说明。

---

### I-2　G-需求的澄清标记检查开了一条自造的后门（DEC-005/C-05）

`check.ts:33-41`：

```ts
export function liveClarifications(text: string): number {
  let n = 0;
  for (const line of text.split(/\n/)) {
    if (!line.includes("[NEEDS-CLARIFICATION")) continue;
    if (/^\s*-\s+Given\b/.test(line)) continue;   // ← 这一行
    n += 1;
  }
  return n;
}
```

所有以 `- Given` 开头的行被无条件跳过。动机可以理解（`v2.md:35` 的验收标准正文里引用了这个标记字符串）。但验收标准全部是 GWT 写法、全部以 `- Given` 开头 —— 等于给**整个验收标准区**开了免检通道，而这恰恰是澄清标记最该出现、也最该被拦住的地方。

**建议修法**：只豁免被反引号包裹的字面量（`` `[NEEDS-CLARIFICATION: ...]` ``），或在需求书里把这个字符串写成转义形式。

---

### I-3　当前基线（v2）零审批记录；APR-001 仍是 draft 且指向已被取代的 v1（DEC-106、C-110、CHG-001 自陈欠账）

`keel/approvals/APR-001.md` frontmatter：

```yaml
status: draft
approver: ""
artifacts:
  - path: keel/requirements/v1.md      # 当前 current 是 v2.md
  - path: docs/decisions.md
  - path: keel/plan/overview-v1.md     # 当前 current 是 overview-v2.md
```

`CHG-001` 结尾白纸黑字写着「重确认（APR 哈希、人类身份提交）在 W2 补办：提出时 `gate approve` 尚未实现，属已知欠账」。W2 实现了 `gate approve`，但 **W2~W6 五轮都没有补办**。结果是：冻结级工件（需求 v2、规划 overview-v2、CHG-001 本身）目前**没有任何审批记录**。

根因是 `keel/config.json` 的 `identities.humans: []`（人类 git 身份未配），这一点 `OVERVIEW.md` 和 `f17-gate/summary.md` 都诚实记录了。但**门禁不会因此报警**：`check.ts:154-156` 在 approved APR 数为 0 时返回 `skip`，整体仍是 PASS。「没有审批」和「审批时机未到」在门禁眼里长得一样。

**建议修法**：`gMerge` 区分两种情况 —— 当 `requirements/INDEX.md` 指向的 current 文件没有任何 APR 覆盖时，至少给 warn（配合 C-103 的 worklog 记录机制，等于强制留痕）。

---

### I-4　DEC-107 明确要求的「CI 校验审批提交作者 ∉ agent 清单」没有实现

**决策原文**：「agent 与人分 git 身份（配置登记 agent 清单）；**CI 校验审批提交作者 ∉ agent 清单**；agent 起草、用户 `gate approve` 以本人身份提交」。

实现只做了一半：`approve.ts:40-45` 校验的是**执行 `gate approve` 时本地 git config 的当前身份**，不是**提交（commit）的作者**。

绕过路径很直白：不跑 `gate approve`，手工把 APR 文件的 `status: draft` 改成 `status: approved`，然后用 agent 身份 `git commit`。
- `.github/workflows/gate.yml` 全文没有任何作者校验步骤（已逐行核对 45 行）；
- `gate check` 里也没有对应检查项（`review.ts:13-30` 的 `CHECK_IDS` 全部 16 项无一相关）；
- `gMerge` 只看 `attrs.status === "approved"`，不看是谁提交的。

**建议修法**：CI 增加一步，对改动了 `keel/approvals/**` 的提交范围执行
`git log --format='%an|%ae' <base>..<head> -- keel/approvals/`，与 `config.identities.agents` 比对，命中即 fail。

---

### I-5　「门禁重跑对账」被拆成两个命令，`gate check` 本身只读 JSON（DEC-033/C-33）

**决策原文**：「树哈希不匹配旧证据自动作废；**门禁重跑对账拦谎报**」。`DESIGN.md:139` 的 G-完成 判据是「实际重跑测试对账」。

**符合的部分**：`gate verify` 是真的重跑。`verify.ts:81` `run(ctx, argv)` 会 spawn 真实测试命令，`verify.ts:60-65` 还先跑一遍 `tsc --noEmit`。实测 46 passed，`counts` 从真实 JUnit XML 解析。这点没有造假。

**缺口**：`gate check` 的 `gDone`（`check.ts:114`）和 `xEvidence`（`check.ts:132`）都是 `readEvidence(ctx)` —— 读 JSON、比树哈希，**不重跑，也不与任何声明对账**（系统里根本不存在机器可读的「声明」，`summary.md` 是散文）。

在本地档下的后果：手写一份 `keel/evidence/verify.json`，填上 `git write-tree` 的当前值和 `exit_code: 0`，`gate check` 就全绿。而且 `verify.json` 既被 `.gitignore` 忽略、又被树哈希显式排除（`git.ts:55-58` 的 `git reset -q -- keel/evidence`），伪造完全不留痕。

CI 档位不受影响（`gate.yml:27-30` 先 check 再 verify，verify 自己重跑），`enforcement-tiers.md` 也诚实标注了「防呆不防恶」。但 `DESIGN.md` 的门禁表把「实际重跑测试对账」写成了 **G-完成 这道门禁本身的判据**，实现把它挪到了另一个命令 —— 这是规范与实现的实质分歧。

**建议修法（低成本）**：`gDone` 增加一条时序检查 —— 证据 `finished` 时间早于 `tests/` 与源码目录的最新 mtime 时 fail；或提供 `gate check --strict` 内联调用 `runVerify`。

---

### I-6　声称完成但没跑 verify 时，G-完成 是 SKIP 不是 FAIL —— 且这是一次未走变更单的决策改动

`check.ts:118-120`：

```ts
if (!ev) {
  return skip("G-done", `summary.md present (${summaries.join(", ")}); run gate verify (C-33)`);
}
```

有完成声明（`summary.md`）、没有证据 → `skip`，`formatCheck`（`result.ts:36-42`）只统计 fail 和 warn，skip 不影响结论。

**实测本仓正处于这个状态**：

```
SKIP G-done  summary.md present (f17-gate); run gate verify (C-33)
result: PASS  fail=0 warn=0
```

这与 DEC-033「完成只认机器可核验证据」和 `DESIGN.md` G-完成 的意图正好相反。

**更关键的是它的落地方式**。`keel/features/f17-gate/summary.md` 的「关键决策与被否方案」一节写着：

> 无证据时 G-done skip 而不是 fail，避免一写 summary 就让日常 `gate check` 红灯。

这是一条**偏离 DESIGN §4 的实质性决策**，却只落在功能总结里 —— 没有 DEC 文件、没有 CHG 变更单，也没有出现在决策索引里。按 C-15/C-17，这类触碰已确认门禁判据的选择应当升级为决策记录。这是本次审计发现的**「决策被悄悄改了却没走变更单」的最典型一例**。

（同一节的另一条「提醒级不阻断」是符合的 —— C-105 原文就写着「提醒级」。）

**建议修法**：二选一，走正式流程 —— 要么补一条 DEC 把「无证据时 skip」正式化并说明理由，要么改成 fail 并给 `--quick` 免检。

---

### I-7　「运行时零第三方依赖」与「devDependency 白名单只有 typescript」没有任何机器检查（DEC-154）

**当前状态是符合的**，已逐一核对：
- `tools/` + `tests/` 共 71 处 import，全部是 `node:*` 内置模块或相对 `.ts` 路径，**0 个裸包名**；
- `package.json` `devDependencies` 只有 `typescript`，`dependencies` 不存在；
- `package-lock.json` `packages` 下只有 `node_modules/typescript` 一项。

**但没有任何门禁项会在有人破坏它时报警**：
- `X-oss`（`check.ts:227-255`）只要求每个直接依赖有对应的 OSS 登记文件。加一个 `dependencies` 条目 + 建一个 OSS 文件 = 顺利通过，运行时零依赖原则被击穿而门禁全绿；
- DEC-154 明写「新增任何 devDependency 须走决策记录」，无任何检查；
- 「运行时仅用 Node 内置模块」这条 DEC-154 的正式定义，同样无检查。

**建议修法**：`X-oss` 或新增 `X-deps` 加两条 —— (a) `package.json.dependencies` 非空即 fail；(b) `devDependencies` 的键集合超出 `config` 里的白名单即 fail。再加一条静态扫描：`tools/gate/**/*.ts` 的 import 说明符必须匹配 `^node:` 或 `^\.`。

---

### I-8　DEC-037 / DEC-038 的测试义务完全没有进门禁

- **DEC-037（功能级验收测试）**：「每条验收标准 ≥1 条可运行验收测试；不全绿不得进验收」。无任何实现（与 B-1 同源：粒度是 REQ 不是 AC，且不阻断）。全仓活跃实现（`tools/`、`tests/`、`.agents/skills/`、CI、AGENTS.md）中 `DEC-037` / `C-37` 一次都没被引用。

- **DEC-038（功能间联动测试）**：「以 F4 接口耦合表为义务来源，每条已声明接口 ≥1 条契约/集成测试」。`check.ts:99-101` 里 `C-38` 确实被引用了，但它守的是：

  ```ts
  if (!body.includes("接口与耦合") && !body.includes("| I-")) {
    return fail("G-plan", "current overview has no coupling table", "add 接口与耦合 (C-24/C-38)");
  }
  ```

  这只检查耦合表**这个小节存在**，从不解析出 `I-01`..`I-nn` 再去对账测试。决策要求的「每条接口 ≥1 测试」这层义务一行代码都没有。

**建议修法**：`buildTrace` 扩展成同时抓 `| I-\d+ |` 行，建 接口↔测试 矩阵，uncovered 进 `gMerge`。

---

### I-9　C-113 双认领检测没有实现

**决策原文**：「assignee 字段 + 建分支 = 认领；**脚本检测双认领报警**；换手须释放或显式接管留记录」。

`worktree.ts:48-56` 无条件 `writeFileSync(claim.json, ...)`，用当前身份直接覆盖。已有别人认领时：不报警、不要求释放、不要求显式接管、不留旧 assignee 的记录。

（同组的 C-114 重叠检查倒是实现得很好：`overlap.ts` + `worktree.ts:40-45`，重叠即阻断认领，`w2-gate.test.ts:163-185` 有测试。**这条符合。**）

**建议修法**：`runWorktree add` 前先读 `claim.json`，assignee 不同则要求 `--takeover` 显式参数，并把旧 assignee 追加进 `worklog.md`。

---

### I-10　「AGENTS.md 链合并 ≤32KiB」实际测的是单文件字节数（DEC-118、C-122）

`check.ts:191-203`：

```ts
const raw = readFileSync(agents);      // 只读根 AGENTS.md
const bytes = raw.byteLength;
if (bytes > maxBytes) { return fail("X-budget", `AGENTS.md ${bytes} bytes > ${maxBytes} hard`, ...); }
```

DEC-118 和 `platform-limits.md:7` 说的是 **Codex 的 AGENTS.md 链**（仓库根 + 各层子目录的 AGENTS.md + 用户级 `~/.codex/AGENTS.md`，合并后 32 KiB 硬截断）。配置键名 `agents_md_chain_max_bytes` 也在明示它测的是「链」。

本仓只有一个 AGENTS.md（3176 字节），所以今天数值上等价；但语义不等价 —— 一旦任何子目录出现 AGENTS.md，这条**硬限**检查就会静默漏测，而 C-119 明确说「超平台硬限 = 不通过（静默截断等于规则失效）」。

**建议修法**：`measureAutoload` 已经在递归遍历技能目录，扩成同时收集全仓所有 `AGENTS.md` + `CLAUDE.md` 求和后再比 32 KiB。

---

### I-11　DEC-148 的「三平台一致性」只测到了哈希一项，且只有 1 个 fixture

**决策原文**：「同一组 fixture 在 Windows 与 macOS 上必须产出**相同的门禁结论、相同的规范化哈希、相同的追溯矩阵**；CI 矩阵增加 macOS runner」。

**符合的部分**：CI 矩阵完整（`gate.yml:9-14`，3 OS × Node 22/24 = 6 格，外加 `gate-ok` 汇总 job）。

**缺口**：
1. `tests/fixtures/` 下只有 **1 个文件** `dec148-lf.txt`；
2. `w5-smoke.test.ts:157-162` 唯一的断言是 `sha256Normalized(磁盘内容) === sha256Normalized("keel-dec148-fixture\n")` —— 只覆盖「相同的规范化哈希」这一项；
3. **「相同的门禁结论」和「相同的追溯矩阵」完全没测**。CI 六格各跑各的 `check` / `verify`，只要每格自己 PASS 就算过，**从不把六格的产出拿来互相 diff**。仓库里没有任何 committed golden 文件；
4. 没有 CRLF fixture。`.gitattributes` 强制 LF 意味着无法用一个仓库内文件去真实模拟 CRLF 检出（`w1-skeleton.test.ts:76-82` 用内存字符串测了归一化，但那是单元测试，不是跨平台 fixture）。

结论：DEC-148 想防的「三平台一致只是一句声明」这件事，目前**仍然只是一句声明** —— B-3 的 hooks 可执行位问题就是这个测试缺口漏掉的活例子。

**建议修法**：
- committed `tests/fixtures/expected-check.txt`（逐项 verdict）与 `expected-trace.md`；三平台各自 diff；
- 加一个 `.gitattributes` 标 `-text` 的 CRLF fixture，证明归一化真的在磁盘字节层面生效；
- CI 各格上传 `check`/`trace` 输出，末尾加一个 job 做六路 diff。

---

### I-12　C-14 非法状态迁移没有脚本拒绝

**决策原文**：「状态迁移非法（如 confirmed→proposed）脚本拒绝」。

`tools/gate/*.ts` 全文没有任何状态机校验（`grep "proposed|superseded|transition"` 在 `.ts` 里 0 命中）。`gate new`（`new.ts`）只是套模板写文件，`gate index`（`indexgen.ts:58`）只是把 `status` 抄进索引表。任何人（包括 agent）可以把一条 `confirmed` 决策直接改回 `proposed`，或把 `draft` 的 APR 直接改成 `approved`（这一条同时是 I-4 的攻击面）。

---

## 3. 次要问题（措辞或细节偏差）

### M-1　`tail2kb` 按字符数而非字节数截断
`evidence.ts:78-82` 用 `text.length`（UTF-16 code unit）。C-33 写的是「输出尾 **2KB**」。测试输出含中文时实际会存到约 6KB。同类：`w1-skeleton.test.ts:23` 把 `text.length <= 32768` 当字节用（该测试与 `check.ts` 的 `byteLength` 口径不一致，虽然当前都过）。

### M-2　`actor` 三个字段本地跑时全空，且无检查
`verify.ts:112-116` 依赖 `KEEL_HARNESS` / `KEEL_MODEL` / `KEEL_SESSION` 环境变量；CI 里只能回退到 `harness: "github-actions"` + `session: GITHUB_RUN_ID`，`model` 恒为空。本次实测 `keel/evidence/verify.json` 的 `actor` 是 `{"harness":"","model":"","session":""}`。C-33 把「执行者（harness/模型/会话）」列为证据必填字段，但没有任何检查会拒绝空 actor。

### M-3　证据 `command` 字段记录了绝对解释器路径
实测值：`"D:\\app\\node\\node.exe --test --test-reporter=junit --test-reporter-destination=keel\\evidence\\junit.xml"` —— 含盘符、含反斜杠，天然三平台不同。跨平台证据对账（DEC-148）时这个字段永远对不上。建议规范化成 `node` + POSIX 分隔符。

### M-4　文档里的 Python 残留
- `DESIGN.md:392`（§8 路线图）仍写「W2 gate 核心：… + 自身 **pytest**（Windows 优先）」。§8 标注为「建议，非确认项」，但它是 DEC-152 落地后应当同步的表述。
- `keel/plan/overview-v1.md:31/56/64` 同样有 pytest 字样 —— 但 v1 是已被 v2 取代的冻结版本，按 C-24「历史版本保留作审计链」**不改是对的**。
- **活跃路径干净**：`git ls-files | grep .py` 唯一命中 `tools/archive/w1-python-bootstrap.py`（已归档，任务书明确不算问题）。
- 工作区残留一个未跟踪的 `.pytest_cache/` 目录（已在 `.gitignore` 里），删掉即可。

### M-5　技能镜像是复制（符合），但没有漂移门禁
DEC-147 **符合**：逐文件核对 `.agents/skills`（17 文件）与 `.claude/skills`（17 文件），内容哈希全等，`lstat().isSymbolicLink()` 全为 false，`.claude/skills` 目录本身也不是符号链接。`sync.ts:13` 用 `cpSync(..., { recursive: true, force: true })`。
缺口：没有门禁项检查两边是否漂移。唯一相关的 `w4-skills.test.ts:26-35` 是**先跑 `runSync` 再比对** —— 先同步再比，必然相等，断言是空的。

顺带一提：该测试在**真实仓库**上执行写操作（`runSync(makeCtx(root))`，root 就是仓库根）。测试写被测仓库本身不是好实践，虽然本例幂等无害。

### M-6　少量 SKILL.md 含中文（判定为符合，附说明）
7 个 SKILL.md 出现 CJK 字符，逐一查看后确认都是**引用中文记录里的字面量**：`#经验候选`（k-bugfix/k-log/k-retro）、`迁移初稿（未确认）`（k-migrate）、`未决问题`（k-grill）等。按 C-124「记录 = 字段名英文 + 正文中文」，技能里引用中文记录的字段值是合理的。
`triggers.ts:133-138` 生成的触发账本整篇中文 —— 但它产出的是**记录文件**而非门禁机器输出，同样符合 C-124。
AGENTS.md 全英文 ✓。`keel/` 下 256 个 `.md` 里 252 个含中文，4 个例外（`issues/INDEX.md`、`lessons/INDEX.md`、`plan/INDEX.md`、`requirements/INDEX.md`）全是 `gate index` 生成的机器索引，英文表头正确 ✓。

---

## 4. 核查为「符合」的决策点（不展开）

以下每条都实际验证过（文件:行号 或 命令输出），确认与决策一致：

**跨平台组（DEC-143~148）**
1. **DEC-144 哈希规范化** —— `hash.ts:5-14` 先 UTF-8 解码、去 BOM、CRLF/CR→LF，再 SHA-256；三个调用点全部走 `sha256Normalized`：`gate.ts:58`（`gate hash`）、`approve.ts:60`（APR 内容哈希）、`evidence.ts:86`（报告哈希）。**没有任何一处直接哈希磁盘字节。**
2. **DEC-144 `.gitattributes`** —— `* text=auto eol=lf` 存在且生效（`git check-attr text eol` 对 md/ts 文件均返回 `text: auto` / `eol: lf`）。
3. **DEC-145 大小写冲突检查** —— `check.ts:296-310` `X-casefold` 全仓遍历、小写归一后比对；在 `gate check` 里 → 在 CI 里。
4. **DEC-146 双启动器** —— `gate.sh`（POSIX，探测 node + 卡 22.18.0）与 `gate.ps1`（Windows，同逻辑）都在；`gate.ts:30-36` 运行时再卡一次，双保险。（可执行位缺陷另计为 B-3。）
5. **DEC-147 三平台一律复制** —— 见 M-5，实测 0 符号链接。
6. **DEC-143 OS 矩阵** —— `config.json` `os_matrix: [windows, macos, linux]`；CI 三 OS 齐备。

**运行时组（DEC-149~154）**
7. **DEC-149 Node+TS 直接跑 .ts** —— 无构建步骤，`gate.sh:13` / `package.json` scripts 全部 `node tools/gate/gate.ts`。
8. **DEC-150 版本基线** —— `package.json` `engines.node: ">=22.18.0"`；`node-version.ts:1` `MIN_NODE = "22.18.0"`；启动器与 `gate.ts` 双卡；CI matrix `node: [22, 24]`。
9. **DEC-151 免构建 + 语法子集机器强制** —— `tsconfig.json:9` `"erasableSyntaxOnly": true`，另有 `verbatimModuleSyntax` 与 `allowImportingTsExtensions`，`noEmit: true`。
10. **DEC-152 内置 node:test** —— `"test": "node --test"`；`verify.ts:73-79` 加 `--test-reporter=junit`；实测 `node --test` → **46 pass / 0 fail**。
11. **DEC-153 vendored 分发** —— `private: true`，无发布配置。
12. **DEC-154 tsc --noEmit 进门禁** —— `check.ts:327-346` `X-types` 真的 spawn `node_modules/typescript/lib/tsc.js --noEmit`（实测 `PASS X-types tsc --noEmit clean`）；`verify.ts:60-65` 也跑一遍；CI 通过 `gate check` / `gate verify` 间接执行。devDependencies 确实只有 typescript。（无机器检查另计为 I-7。）

**证据与门禁组**
13. **C-33 证据字段齐全** —— 12 个字段（command / exit_code / started / finished / git_commit / tree_hash / dirty / report_hash / counts / req_coverage / stdout_tail_2kb / actor）全部落盘，`w3-verify.test.ts:136-151` 有断言。
14. **C-33 树哈希不匹配旧证据作废** —— `evidence.ts:49-53` `evidenceFresh`；`w3-verify.test.ts:100-126` 验证改源码后 tree hash 变化、`w3-verify.test.ts:163-184` 验证陈旧证据让 `X-evidence` FAIL（实测 `r.code === 1`）。**这条实现得很扎实。**
15. **C-33 树哈希排除证据目录** —— `git.ts:46-63` 用临时 `GIT_INDEX_FILE` + `git add -A` + `git reset -- keel/evidence` + `git write-tree`，不污染真实索引。
16. **C-24 版本索引唯一** —— `indexgen.ts:9-20` 缺失 / 无指针 / 双指针 / 空指针 四种情况都报错；`check.ts:89-103` G-规划 消费它；`w2-gate.test.ts:95-107` 有双指针测试。
17. **C-103 警告放行须 worklog 记理由** —— `check.ts:360-380`，未在 feature worklog 写 `gate-warn: <id>` 的 warn 会被**升级成 fail**。实现比决策原文更严，方向正确。
18. **C-105 五类反绕过全实现** —— `--no-verify`（`bypass.ts:71-80` 查 HEAD 的 `Feature:` 尾注）、强推（`hook.ts:22-36` + `bypass.ts:11-15`）、改 hooksPath（`check.ts:348-358` `X-hooks`）、改 CI（`bypass.ts:33-48` `ciWorkflowGaps`）、改测试目录（`bypass.ts:61-67`）。全部提醒级，符合决策原文。
19. **C-105 门禁清单年检** —— `review.ts` + `keel/features/f17-gate/gate-review-2026.md`，16 项检查逐一过目。
20. **C-102 hooks 与尾注** —— `.githooks/` 三个 `#!/bin/sh` 薄壳 + `core.hooksPath=.githooks`（实测已配）；`hook.ts:53-60` 注入 Feature/Developer/Agent/Session 四行尾注（同时落实 C-115）。
21. **C-138 自举悖论防护** —— `ci-trunk.sh` 用 `origin/main` 的 gate 先裁决本分支，再还原；`gate.yml:24-26` 在 check/verify 之前执行。

**审批与预算组**
22. **C-106 APR 含内容哈希** —— `approve.ts:57-66` 按 `path:` 逐个回填 `content_sha256`，用的是规范化哈希；`w2-gate.test.ts:146-161` 有断言。
23. **C-107 `gate approve` 拒绝 agent 身份** —— `approve.ts:41-45`，`w2-gate.test.ts:132-144` 验证返回 code 1 + `agent list` 提示。（CI 侧缺失另计为 I-4。）
24. **C-118 预算全部达标** —— AGENTS.md **59 行**（≤150）/ 3176 字节（≤32 KiB）；`CLAUDE.md` 恰好一行 `@AGENTS.md` 且 `check.ts:196-201` 强制；SKILL.md 最大 **44 行**（≤500）；description 最长 **209 字符**（≤1024）；自动装载 **6427 / 10240 字节**。
25. **C-119 软/硬预算区分** —— `check.ts:202-215`：超 32 KiB 硬限 → `fail`；超 150 行、超 10 KB 装载 → `warn`。与决策一致。
26. **C-121 技能数封顶** —— `skills.ts:5-22` 目录 16 个，`skills.ts:51-52` cap 16 强制，`.agents/skills` 实际 16 个。
27. **C-114 并行重叠串行** —— `overlap.ts` 解析「预计触碰文件」小节，`worktree.ts:40-45` 重叠即拒绝认领。
28. **C-18 暂定决策计数** —— `status.ts:18-23` 统计 `status: provisional` 并在 `gate status` 输出（实测 `provisional_decisions: 0`）。

**其他观察**：154 条决策中，有 **112 条**能在活跃实现（`tools/gate/`、`.agents/skills/`、`tests/`、`.github/`、`AGENTS.md`、`.githooks/`、`keel/config.json`）里找到显式的 `DEC-nnn` / `C-nn` 引用；42 条无引用。**无引用不等于未实现**（例如 DEC-106 的内容哈希在 `approve.ts` 里实现了但只标了 C-107，DEC-115 的尾注在 `hook.ts` 里实现了但没标号），但也确实包含真实空白（DEC-037、DEC-113、DEC-141 等）。建议后续在代码里补齐决策标号，让这个统计变成可用的覆盖率指标。

---

## 5. 存疑项（证据不足，未下结论）

- **`gate verify` 的「对账」对象是什么，规范本身可能不可实现。** DEC-033 说「重跑对账拦谎报」，但系统里不存在机器可读的「声明」（`summary.md` 是散文，`counts` 只有 verify 自己产出的一份）。现有的替代机制（树哈希绑定 + CI 复算）在工程上是合理的，但它和决策原文的字面要求不是一回事。**这条需要用户裁定**：是补一条 DEC 把当前实现正式化，还是引入机器可读的完成声明字段（例如 `summary.md` frontmatter 里写 `claimed_tests: 46`）供对账。

- **`adr: true` 是否等于 C-10 的「重大决策」。** 见 I-1。这个等价关系可能是实施者的合理简化，也可能是无意收窄。需要用户确认口径后再定 I-1 的严重度。

- **DEC-139「五平台触发实测」的完成度。** W5 做了 harness 探测（`triggers.ts`），账本里 Pi 标注「未实测」，`f17-gate/summary.md` 也把 dsh / pi 列为遗留债务。这是**诚实标注的已知欠账**，不是隐瞒，因此未计入不符合项；但 DEC-139 的验收条件尚未满足这一点应当在复盘时销项。

---

## 6. 修复优先级建议

| 序 | 问题 | 成本 | 理由 |
|---|---|---|---|
| 1 | **B-3** hooks 可执行位 | 一条 `git update-index --chmod=+x` + 一条测试 | 五分钟修完，不修则 macOS/Linux 上零本地强制 |
| 2 | **B-1** 追溯进门禁 | 中（需给 AC 编号） | 决策里说了「零引用=门禁不过」，现在 10/24 零引用还全绿 |
| 3 | **B-2** 补齐 G-完成/合并/复盘判据 | 低（数据源 `status.ts` 已有） | 三道门禁里两道半是摆设 |
| 4 | **I-6** G-done skip vs fail | 低 | 这是未走流程的决策改动，必须补记录或改回来 |
| 5 | **I-4** CI 校验 APR 作者 | 低（一个 workflow step） | DEC-107 点名要求，且 I-12 让它可被绕过 |
| 6 | **I-7** 依赖白名单机器检查 | 低 | 保护 DEC-154 这条「零依赖」立身之本 |
| 7 | **I-1 / I-2** 门禁自造的两个豁免通道 | 低 | 都是几行代码 |
| 8 | **I-11** DEC-148 golden 对账 | 中 | 没它，B-3 这类跨平台缺陷还会再发生 |
| 9 | **I-3** 补办 v2 基线 APR | 需用户配 git 身份 | 阻塞项在用户侧 |
| 10 | I-5 / I-8 / I-9 / I-10 / I-12 | 中 | 按功能波次排入 |

---

*本报告所有结论均基于只读核查，未修改任何被审文件。审计过程中执行的写操作仅有：`node tools/gate/gate.ts verify`（产出 `keel/evidence/verify.json` 与 `junit.xml`，二者均在 `.gitignore` 中）与 `node --test`（其 `w4-skills.test.ts` 会对 `.claude/skills` 做一次幂等同步）。审计结束时 `git status --porcelain` 为空。*
