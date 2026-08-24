# 审计线 2：代码正确性与可绕过性

- 审计对象：`tools/gate/`（37 文件 / 约 2513 行 TS）、`tests/`（46 项）、`.githooks/`、`.github/workflows/gate.yml`
- 审计人：独立审计员（未参与 W1~W6 实施）
- 日期：2026-08-24　　Node：v22.19.0　　平台：Windows 10
- 方法：只读检查 `E:\program\en`；所有攻击在 scratchpad 的仓库副本（`en` / `en2` / `en3` / `en4` / `en5`）中实际执行，本文每条阻断级/重要级发现均附已跑通的复现命令与实测输出。未跑通的推断一律标注「存疑」。

---

## 0. 一句话结论

> **在一个测试套件确实是红的、hooks 被关掉、证据完全是手写编造的仓库里，`gate check` 的退出码是 0。**

实测（scratchpad/en）：

```
REAL TEST SUITE EXIT = 1  (红)
...
PASS G-done  fresh evidence matches current tree hash
PASS X-evidence  fresh tree e277ff41e871…
result: PASS_WITH_WARN  fail=0 warn=1
GATE EXIT=0
```

框架的存在理由是"不信自述、只认机器可核验的证据"。当前实现里，**证据既不是机器产生的，也没有被机器核验过**：`gate check` 从头到尾只做了一件事——把一个本地 JSON 文件里的 `tree_hash` 字段和 `git write-tree` 的输出做字符串相等比较。DESIGN.md:146 与 DESIGN.md:203 明确要求 G-完成 = "证据树哈希匹配 + 追溯全绿 + **实际重跑测试对账**"、"门禁重跑对账拦谎报（C-33）"，**这三件事里代码只做了第一件，且做得可绕过**。

---

## 阻断级（门禁可绕过 / 证据可造假 = 框架核心价值失效）

### B1　删掉证据文件，FAIL 直接变 PASS（证据门 fail-open）

**位置**：`tools/gate/check.ts:115-120`（`gDone`）、`tools/gate/check.ts:133`（`xEvidence`）

```ts
// check.ts:118-120  gDone
if (!ev) {
  return skip("G-done", `summary.md present (${summaries.join(", ")}); run gate verify (C-33)`);
}
// check.ts:133  xEvidence
if (!ev) return skip("X-evidence", "no verify.json; run gate verify before merge");
```

证据**过期**是 `fail`，证据**不存在**是 `skip`。`formatCheck`（`result.ts:42`）只在 `fails > 0` 时返回 1，`skip` 不计数。于是"最省事的绕过方式就是把证据删掉"。

**复现**（scratchpad 副本内实测）：

```bash
echo "// sabotage" >> tools/gate/hash.ts     # 改源码但不重跑验证
node tools/gate/gate.ts check                # → FAIL G-done / FAIL X-evidence, exit 1
rm -f keel/evidence/verify.json              # 唯一动作：删掉证据
node tools/gate/gate.ts check                # → result: PASS  fail=0 warn=0, exit 0
```

实测输出（删除后）：

```
SKIP G-done  summary.md present (f17-gate); run gate verify (C-33)
SKIP X-evidence  no verify.json; run gate verify before merge
result: PASS  fail=0 warn=0
```

**后果**：G-完成 / X-证据这两道门是整个框架唯一"机器裁决完成度"的地方，一条 `rm` 就让它们同时失声，且退出码是 0，CI 与 hook 都会放行。

**建议修法**：`skip` 只在"这个项目根本没有完成声明"时使用。一旦 `keel/features/*/summary.md` 存在（= 有人宣称完成）或存在已 approved 的 APR，缺失证据必须是 `fail` 而非 `skip`。`xEvidence` 同理：把"无 verify.json"降级为 `skip` 只在 `--quick` 模式下允许；完整 `check` 下应 `fail`。

---

### B2　证据 JSON 可以纯手写伪造，门禁只比对树哈希与退出码

**位置**：`tools/gate/check.ts:131-142`（`xEvidence`）、`tools/gate/evidence.ts:49-53`（`evidenceFresh`）

```ts
// evidence.ts:49-53
export function evidenceFresh(ctx: Ctx, ev: Evidence | null): boolean {
  if (!ev) return false;
  const tree = gitWriteTree(ctx);
  return Boolean(tree) && ev.tree_hash === tree && ev.exit_code === 0;
}
```

判定用到的字段只有 `tree_hash` 与 `exit_code`。`command`、`counts`、`report_hash`、`dirty`、`stdout_tail_2kb`、`junit.xml` 全都写进了证据但**没有任何检查函数读过它们**（`grep -rn report_hash tools/` 只命中写入侧）。而 `tree_hash` 是任何人都能在一行内算出来的公开值。

**复现**（scratchpad/en 实测，套件已被人为改红）：

```bash
# 1) 把套件改红
cat >> tests/w1-skeleton.test.ts <<'EOF'
import { test as _t } from "node:test";
_t("deliberately failing test", () => { throw new Error("SABOTAGE"); });
EOF
node --test ; echo $?      # → 1，确实是红的

# 2) 手算树哈希（与 gitWriteTree 同算法），一次都不跑测试
T=.git/forge.idx; cp .git/index $T
GIT_INDEX_FILE=$T git add -A
GIT_INDEX_FILE=$T git reset -q -- keel/evidence
TREE=$(GIT_INDEX_FILE=$T git write-tree); rm -f $T

# 3) 手写证据
cat > keel/evidence/verify.json <<EOF
{"command":"i-never-ran-anything","exit_code":0,"started":"","finished":"",
 "git_commit":"deadbeef","tree_hash":"$TREE","dirty":true,"report_hash":"",
 "counts":{"passed":9999,"failed":0,"skipped":0},"req_coverage":{},
 "stdout_tail_2kb":"totally made up",
 "actor":{"harness":"","model":"","session":""}}
EOF

node tools/gate/gate.ts check
```

实测输出：

```
PASS G-done  fresh evidence matches current tree hash
PASS X-evidence  fresh tree 3f4e6cfdd3e7…
result: PASS  fail=0 warn=0
```

**后果**：DESIGN.md:203「门禁重跑对账拦谎报（C-33）」在代码里**完全不存在**。没有重跑、没有与 `junit.xml` 交叉核对、没有重算 `report_hash`、没有签名或哈希链。C-33 的核心要求未实现。

**建议修法**（按成本递增，至少做前两条）：

1. `xEvidence` 增加实质判定：`ev.counts.failed === 0 && ev.counts.passed > 0`、`ev.dirty === false`、`ev.command` 必须等于当前 profile 解析出的命令。
2. 交叉核对：要求 `keel/evidence/junit.xml` 存在，且 `sha256Normalized(junit.xml) === ev.report_hash`，并用 `parseJunit(junit.xml)` 重算 counts 与 `ev.counts` 比对——这样伪造成本从"改一个字段"升到"同时伪造一份自洽的 JUnit 报告"。
3. 真正的重跑对账：在 merge 门（`gMerge`）里直接调用 `runVerify` 而不是读 JSON。CI 权威档（C-45"CI 复算是权威"）必须走这条。

---

### B3　`test_command` 是 agent 自己能写的配置，`gate verify` 无条件信任它

**位置**：`tools/gate/verify.ts:19-25`（`activeProfile`）、`tools/gate/verify.ts:51-55`

```ts
const testCmd = typeof profile.test_command === "string"
  ? profile.test_command
  : `${process.execPath} --test tests`;
```

`profile` 来自 `keel/config.json`，是仓库里的普通文本文件。改一行即可让 `gate verify` 去跑一个必然成功的空命令，然后**照常写出一份 `exit_code: 0` 的证据**。

**复现**（scratchpad/en2 实测）：

```bash
node -e "const fs=require('fs'),p='keel/config.json',c=JSON.parse(fs.readFileSync(p,'utf8'));
         c.profiles['keel-gate'].test_command='git --version';
         fs.writeFileSync(p,JSON.stringify(c,null,2))"
node --test ; echo $?          # → 1（真实套件是红的）
node tools/gate/gate.ts verify # → verify PASS
node tools/gate/gate.ts check  # → PASS G-done / PASS X-evidence
```

更省事的版本：仓库自带的 `keel/config.json` 里已经有一个 `other` profile，其 `test_command` 是 `echo 'configure junit-compatible command'`。把 `profiles.active` 改成 `["other"]` 即可在 Linux/macOS 上一键绿灯（Windows 上 `echo` 非可执行文件会 ENOENT→退出码 1，反而拦住了）。

**后果**：这是**唯一能在 CI 里生效的绕过**。CI（`.github/workflows/gate.yml:29-30`）跑的正是 `node tools/gate/gate.ts verify`，它读同一份 `keel/config.json`。因此"CI 复算是权威"（C-45）也被这条击穿。

**建议修法**：把 `test_command` 的变更纳入门禁本身——`ci-trunk.sh` 已经在做"用 trunk 的 gate 判本 PR"，同理应当"用 trunk 的 `keel/config.json` 里的 `test_command` 跑本 PR 的测试"，或至少在 `xBypass` 里加一条：`keel/config.json` 的 `profiles.*.test_command` 与 `origin/main` 版本不一致时 `fail`，要求配 CHG 记录。

---

### B4　`gate verify` 复用上一轮遗留的 `junit.xml`，把旧计数写进本轮证据

**位置**：`tools/gate/verify.ts:85-93`

```ts
let xml = "";
if (existsSync(dest)) {          // dest = keel/evidence/junit.xml
  try { xml = readFileSync(dest, "utf8"); } catch { xml = ""; }
}
```

`runVerify` 在跑测试**之前从不删除 `dest`**。因此只要本轮命令没有产出 junit（命令被换掉、进程崩溃、reporter 参数没生效），读到的就是上一次运行留下的旧报告，并把旧的 `counts` 与 `report_hash` 当成本轮结果写进证据。

**复现**（接 B3 的现场，scratchpad/en2 实测）：

```bash
# 上一轮真实运行留下了 keel/evidence/junit.xml（46 个 testcase）
node tools/gate/gate.ts verify   # test_command 已被换成 git --version
```

实测输出：

```
verify PASS
counts: passed=46 failed=0 skipped=0
```

而证据里的 `command` 字段是 `git --version`。文件时间戳证明 `junit.xml` 早于 `verify.json` 1 分 44 秒：

```
2026-08-24 09:08:03  keel/evidence/junit.xml
2026-08-24 09:09:47  keel/evidence/verify.json
```

删掉 `junit.xml` 后同一条命令得到 `counts: passed=0 failed=0 skipped=0`，仍然 `verify PASS`、仍然 `PASS X-evidence`。

**后果**：证据里的 counts 可能来自**另一份代码**的运行结果，而这正是"树哈希绑定"想要杜绝的情形。同时说明 counts 完全没被门禁使用（见 B2）。

**建议修法**：`runVerify` 开头 `rmSync(dest, { force: true })`；跑完后若 `dest` 仍不存在，则视为"测试命令未产出可核验报告"，`exit_code` 强制置为非 0 或至少 `fail` 掉 X-evidence。

---

### B5　`--no-verify` 检测器结构性失效（它永远不会在真实配置下触发）

**位置**：`tools/gate/bypass.ts:69-80`、`.githooks/prepare-commit-msg`

```ts
const hp = gitHooksPath(ctx);
const hooksOn = hp === ".githooks" || hp.split("\\").join("/").endsWith("/.githooks");
if (hooksOn) {
  const body = git(ctx, ["log", "-1", "--format=%B"]).stdout;
  if (body && !/^Feature:\s/m.test(body)) { /* 报 no-verify */ }
}
```

检测逻辑是"HEAD 提交里没有 `Feature:` 尾注 ⇒ 可能用了 `--no-verify`"。但 `.githooks/prepare-commit-msg` 的注释自己写着"Not suppressed by `--no-verify` (C-102)"——这是事实：`git commit --no-verify` 只跳过 `pre-commit` 和 `commit-msg`，**`prepare-commit-msg` 照常运行并注入尾注**。于是：

| `core.hooksPath` | `--no-verify` 提交 | 检测结果 |
|---|---|---|
| `.githooks` | 尾注仍被注入 → 有 `Feature:` | **不触发** |
| 未设置 / 其它 | `hooksOn === false` | **整段跳过** |

**两种情况都检测不到**。C-102 的"尾注不受 `--no-verify` 抑制"这个正确设计，恰好把 C-105 的检测信号抹平了。

**复现**（scratchpad/en 实测，`core.hooksPath=.githooks`，套件为红）：

```bash
git add -A && git commit --no-verify -m "sabotage landed"
git log -1 --format=%B
#   sabotage landed
#
#   Feature: unknown          ← prepare-commit-msg 照常注入
#   Developer: attacker
node tools/gate/gate.ts check | grep X-bypass
#   PASS X-bypass  no --no-verify / CI / tests-dir reminders
```

唯一能触发的场景是 `git -c core.hooksPath=/dev/null commit`（连 `prepare-commit-msg` 都不跑），实测确实报了 `FAIL X-bypass`。但它**只看 `git log -1`**，一次后续提交就抹掉：

```bash
git -c core.hooksPath=/dev/null commit -m "no hooks at all"
node tools/gate/gate.ts check | grep X-bypass   # FAIL X-bypass ✓
echo z >> CONTEXT.md && git add -A
git commit --no-verify -m "cover up"
node tools/gate/gate.ts check | grep X-bypass   # PASS X-bypass  ← 被掩盖
```

顺带：`git push --no-verify` 会跳过整个 `pre-push`（即跳过 `gate verify` + 完整 `gate check`），代码里**没有任何地方检测推送侧绕过**。

**建议修法**：

1. 别用尾注在场与否做信号。在 `pre-commit` 里写一个"我跑过了"的标记（例如把 `HEAD` 树哈希 + 时间戳写进 `.git/keel-precommit-stamp`，该文件不入库），`xBypass` 检查最近 N 个提交是否都有对应标记。`--no-verify` 跳过 `pre-commit` 就必然缺标记。
2. 扫描区间从 `git log -1` 改为 `git log origin/main..HEAD`（或本功能分支全部提交），并对每个提交独立判定，避免"一次正常提交洗白全部"。
3. 推送侧：CI 才是唯一可信的推送后检查点——把这条明确写进 enforcement-tiers.md，不要让 `X-bypass` 给出"no --no-verify"这种会误导人的 PASS 文案。

---

### B6　任何 warn 都能被一行自己写的 worklog 消掉（自述即通过）

**位置**：`tools/gate/check.ts:360-380`（`warnWorklogCovered`）

```ts
const blob = logs.join("\n");                       // 所有 keel/features/*/worklog.md 拼接
return items.map((it) => {
  if (it.verdict !== "warn") return it;
  if (blob.includes(`gate-warn: ${it.id}`)) return it;   // ← 命中就保持 warn（= 退出码 0）
  return { ...it, verdict: "fail" as const, ... };
});
```

设计意图是"未确认的 warn 升级为 fail"，实际效果是"**在任意一个 worklog 里写一行 `gate-warn: X-hooks`，这个检查项就对所有功能、永久失效**"。worklog 完全由 agent 自己撰写，这正是框架宣称要消灭的"自述即完成"。

可被这样静音的检查项：`X-hooks`、`X-bypass`、`X-types`、`X-budget`、`X-oss`、`X-knowledge`（所有 `warn` 出口）。

**复现**（scratchpad/en 实测）：

```bash
git config --unset core.hooksPath              # 彻底关掉 hooks
node tools/gate/gate.ts check | tail -3
#   FAIL X-hooks  core.hooksPath is unset (warn not acknowledged)
#   result: FAIL  fail=1

printf '\ngate-warn: X-hooks\n' >> keel/features/f01-requirements-interview/worklog.md
node tools/gate/gate.ts check | tail -3
#   WARN X-hooks  core.hooksPath is unset
#   result: PASS_WITH_WARN  fail=0 warn=1     ← exit 0
```

**组合成完整绕过**（scratchpad/en 端到端实测）：关掉 hooks + 套件为红 + 伪造证据 + 一行 `gate-warn:` ⇒

```
REAL TEST SUITE EXIT = 1
result: PASS_WITH_WARN  fail=0 warn=1
GATE EXIT=0
```

**建议修法**：确认凭据必须是机器不可自证的东西——最低限度要求 `gate-warn: <ID> @<tree_hash 前 12 位>`，树哈希变了就失效（强制每次重新确认，且确认这个动作本身会改变树哈希，形成可审计痕迹）；更好的做法是把确认写进 `keel/decisions/`（DEC 需要用户确认状态）或 APR，而不是 agent 单方面的 worklog。至少 `X-hooks` / `X-bypass` 这两条"门禁自身完整性"的检查不应可被确认豁免。

---

### B7　CI 里的证据门等于没有

**位置**：`.gitignore:14-15`、`.github/workflows/gate.yml:27-30`

```
# .gitignore
14: keel/evidence/*.json
15: keel/evidence/*.xml
```

```yaml
# gate.yml
27:      - name: check
28:        run: node tools/gate/gate.ts check
29:      - name: verify
30:        run: node tools/gate/gate.ts verify
```

`git ls-files keel/evidence/` 只返回 `.gitkeep` —— 证据从不入库。因此在 CI 的全新 checkout 上，`check` 这一步执行时 `keel/evidence/verify.json` **必然不存在** ⇒ 走 B1 的 `skip` 分支 ⇒ `G-done` / `X-evidence` 恒为 SKIP。随后 `verify` 步骤生成了证据，但**没有任何步骤再跑一次 `check`**，所以那份证据从未被任何门禁读取过，只是被 upload-artifact 存档。

**后果**：C-45"CI 复算是权威"在 CI 流水线的实际形状里落空——CI 只是"跑了一遍测试"，没有"用门禁核验证据"。这也意味着 B1 在 CI 上不需要任何操作就天然成立。

**建议修法**：workflow 顺序改为 `verify` → `check`（或在 `verify` 之后追加一步 `check`），并让 `check` 在 CI 环境（`GITHUB_ACTIONS`）下把"证据缺失"当作 `fail`。

---

## 重要（真实 bug，影响有限或需要特定条件）

### I1　worktree 里 `gitWriteTree` 恒返回空串——框架自己规定的工作方式下证据门永久红

**位置**：`tools/gate/git.ts:46-63`

```ts
const gitDir = join(ctx.root, ".git");
if (!existsSync(gitDir)) return "";
const tmp = join(gitDir, `keel-wt-${process.pid}.idx`);
```

在 `git worktree` 创建的链接工作树里，`.git` 是一个**文件**（内容 `gitdir: …`），不是目录。`existsSync` 对文件也返回 true，于是 `tmp` 变成 `<worktree>/.git/keel-wt-1234.idx` 这种 ENOTDIR 路径，`git add -A` 与 `git write-tree` 双双失败，函数返回 `""`。

而 C-112 要求"一个功能 = 一个分支 = 一个 worktree"，框架自带 `gate worktree add` 就是干这个的。

**复现**（scratchpad/en2 实测）：

```bash
node tools/gate/gate.ts worktree add F24
cd .keel-worktrees/F-24-cross-platform
cat .git          # gitdir: .../en2/.git/worktrees/F-24-cross-platform  ← 是文件
node tools/gate/gate.ts verify
#   verify FAIL
#   tree_hash: (none)          ← 空
node tools/gate/gate.ts check
#   FAIL G-done  summary.md present (f17-gate) but evidence stale
#   FAIL X-evidence  evidence has empty tree_hash
#   FAIL X-types  typescript package missing; tsc --noEmit not run
```

`X-evidence` 的修复提示是"run: gate verify"，但 `gate verify` 在这里**永远修不好它**（它自己也拿不到树哈希）——这是一个无法通过给出的 fix 走出的死锁状态。

顺带两个同现场问题：
- `gate worktree add` 不装 `node_modules`（被 gitignore），所以 worktree 里 `X-types` 必红、`tsc` 从不运行。
- 在 worktree 里跑套件是 44/46 而不是 46/46（见 I9）。

**建议修法**：`gitWriteTree` 用 `git rev-parse --git-dir`（或 `--git-path index`）拿真实 git 目录，而不是拼 `join(root, ".git")`；临时索引写到 `os.tmpdir()` 更稳妥。修完后为 worktree 场景补一条测试。

---

### I2　C-33/C-45 要求的"追溯全绿"从未被任何门禁检查；当前 10/24 需求零测试仍然 PASS

**位置**：`tools/gate/check.ts`（`gDone` / `gMerge` 均未引用 `buildTrace`）、`tools/gate/trace.ts:30`

DESIGN.md:146 定义 G-完成 = "证据树哈希匹配 + 追溯全绿 + 实际重跑测试对账"；DESIGN.md:221 定义 G-合并前置四条件含"追溯全绿"。`grep -n "buildTrace\|req_coverage" tools/gate/check.ts` 无命中——**没有任何门禁读过追溯矩阵**。`req_coverage` 只在 `verify.ts:105-109` 被写进证据，之后无人问津。

**复现**（`E:\program\en` 只读）：

```bash
node tools/gate/gate.ts trace | tail -2
#   uncovered: 10 / 24
node tools/gate/gate.ts check | tail -1
#   result: PASS  fail=0 warn=0
```

**追溯本身也偏弱**：`trace.ts:30` 的 `testRoots = [tests/, tools/gate/]`，判定条件是文件文本里出现 `REQ-\d{3}` 子串。也就是说**在 `tools/gate/` 的一句源码注释里写上 `REQ-022` 就算这条需求"被覆盖"了**，与是否真有断言无关。

**建议修法**：`gDone` / `gMerge` 增加 `uncovered === 0` 判定（可配置豁免清单，豁免需 DEC）。追溯改为只扫 `tests/`，并要求 REQ id 出现在 `test("REQ-xxx …")` 的标题位置而非任意位置。

---

### I3　`X-casefold` 在 Windows / macOS 上恒为 PASS（读文件系统而非 git 索引）

**位置**：`tools/gate/check.ts:296-310`、`tools/gate/walk.ts:16-41`

`xCasefold` 遍历的是 `listFiles(ctx.root)`（真实文件系统）。在大小写不敏感的文件系统上，两个仅大小写不同的文件**根本无法同时存在于工作区**，所以这个检查在 Windows 与默认配置的 macOS 上是恒真的。而它要防的恰恰是"提交进 git 索引、在 Linux 上 checkout 才炸"的情形（DEC-145）。

**复现**（scratchpad/en3 实测）：

```bash
BLOB=$(git hash-object -w AGENTS.md)
git update-index --add --cacheinfo 100644,$BLOB,agents.md
git ls-files | grep -i '^agents.md$'
#   AGENTS.md
#   agents.md                  ← 索引里确实有碰撞
node tools/gate/gate.ts check | grep X-casefold
#   PASS X-casefold  no case-only filename collisions
```

`tests/w1-skeleton.test.ts:104-114` 用同样的方式（`readdirSync` + `toLowerCase`）重写了一遍，因此有同样的盲区（见 I9 的同义反复问题）。

**建议修法**：改用 `git ls-files -z`（索引/HEAD 视角）而不是 `readdirSync`，这样在三个平台上判定一致。

---

### I4　内置默认 `test_command` 在目标 Node 上跑不起来

**位置**：`tools/gate/verify.ts:55`

```ts
: `${process.execPath} --test tests`;
```

Node 22.19 下 `node --test tests` 会把 `tests` 当作要加载的模块，报 `Cannot find module '<abs>/tests'`（实测）。仓库自己的 `keel/config.json` 用的是 `node --test`（无位置参数）所以没暴露，但**任何未配置 profile 的消费项目**都会撞上这个默认值。

**复现**（scratchpad/en3 实测）：

```bash
node -e "const fs=require('fs'),p='keel/config.json',c=JSON.parse(fs.readFileSync(p,'utf8'));
         delete c.profiles; fs.writeFileSync(p,JSON.stringify(c,null,2))"
rm -f keel/evidence/junit.xml
node tools/gate/gate.ts verify
#   verify FAIL
#   counts: passed=0 failed=1 skipped=0
```

且 `stdout_tail_2kb` 为空字符串——错误信息没被保留下来（`run()` 拿到的是 spawn 成功但脚本报错的输出，被 `tail2kb` 截断逻辑与 reporter 改写共同吃掉），排障时看不到 `Cannot find module` 这个真正原因。

**建议修法**：默认值改为 `${process.execPath} --test`（无位置参数，走 Node 自带的 test 文件发现），或显式 `--test "tests/**/*.test.*"`。同时在 `verify` 失败时把 `combined` 的**头部**也保留一段（现在只留尾部 2KB，而模块加载错误出现在最前面）。

---

### I5　「删掉输入就跳过」是系统性模式

**位置**：`check.ts:277`（X-skills）、`check.ts:229/231`（X-oss）、`check.ts:260`（X-knowledge）、`check.ts:154`（G-merge）、`check.ts:169/174`（G-retro）、B1 中的 G-done / X-evidence

八个检查项里有六个的第一分支是"输入不存在 ⇒ `skip`"。`skip` 不计入退出码。

**复现**（scratchpad/en5 实测，一次性拆掉三处输入）：

```bash
mv .agents/skills .agents/skills.bak
node -e "const fs=require('fs'),c=JSON.parse(fs.readFileSync('package.json','utf8'));
         delete c.devDependencies; fs.writeFileSync('package.json',JSON.stringify(c,null,2))"
rm -f keel/evidence/verify.json
node tools/gate/gate.ts check
```

实测：

```
SKIP X-skills  no k-* skills installed yet
SKIP X-oss  no direct npm dependencies
SKIP G-done  ... / SKIP X-evidence  no verify.json
```

只有 `X-types` 顶住了（因为它走 warn→fail 升级路径），而它又能被 B6 的一行 worklog 消掉。

**建议修法**：区分"这个项目不适用"（配置里显式声明，需 DEC）与"输入被移除"（`fail`）。例如 `X-skills`：`.agents/skills` 缺失但 `.claude/skills` 或 `keel/config.json` 里存在 skill 预算配置 ⇒ `fail` 而非 `skip`。

---

### I6　C-107「人类身份审批」= 两条 `git config`

**位置**：`tools/gate/approve.ts:17-25`、`approve.ts:41-45`

```ts
function isAgent(ident, agents) {
  return agents.some(a => (a.email && a.email.toLowerCase() === email)
                       || (a.name  && a.name.toLowerCase()  === name));
}
```

判定依据是 `keel/config.json` 里 `identities.agents` 这个**agent 自己可写的名单**，比对的是**agent 自己可设的 git 身份**。

**复现**（scratchpad/en4 实测）：

```bash
git config user.name "keel-agent"; git config user.email "agent@keel.local"
node tools/gate/gate.ts approve APR-900
#   refuse: git identity keel-agent <agent@keel.local> is on the agent list (C-107).  exit=1

git config user.name "Ada Lovelace"; git config user.email "ada@example.com"
node tools/gate/gate.ts approve APR-900
#   approved APR-900 as Ada Lovelace <ada@example.com>   exit=0
```

`keel/config.json` 里的自述"local = 阻挡失误，不阻挡恶意（C-48）"承认了这一点，所以不列为阻断级；但 DESIGN.md:307 写的是"CI 校验作者∉清单"——**CI 里并没有这个校验**（`.github/workflows/gate.yml` 无任何 APR 作者检查），所以即使升到 github 档也不成立。

另有一个独立 bug：`approve.ts:68` `next.replace(/status:\s+\S+/, "status: approved")` 替换的是**全文件第一个** `status:`，若正文里先出现 `status:`（例如引用别的记录），frontmatter 不会被改而正文被改坏。

**建议修法**：CI 增加一步 `git log -1 --format=%ae` 与 agent 名单比对（对触及 `keel/approvals/` 的提交），并要求 APR 提交带签名（`git commit -S`）；`approve.ts:68` 的替换限定在 frontmatter 块内。

---

### I7　`ci-trunk.sh` 的防自我削弱只覆盖 `--quick` 子集

**位置**：`tools/gate/ci-trunk.sh:13`

```bash
git checkout origin/main -- tools/gate
node tools/gate/gate.ts check --quick        # ← 只跑 quick
git checkout HEAD -- tools/gate
```

DEC-138 的意图是"用 trunk 的门禁判这棵树"，防止 PR 顺手把门禁改松。但 `--quick`（`check.ts:395-402`）**排除的正是**：`G-done`、`G-merge`、`G-retro`、`X-evidence`、`X-types`、`X-hooks`。也就是说，一个把 `xEvidence` 函数体删空的 PR，只会被它自己那份（已被删空的）代码审判。

**建议修法**：trunk gate 跑完整 `check`（性能代价主要是 `tsc --noEmit`，CI 上可接受）；或至少把 `X-evidence` / `X-types` 加进 trunk 这一步。

---

### I8　`verify.ts:103` 死三元 + 「0 个测试」照样算通过

**位置**：`tools/gate/verify.ts:103`

```ts
: { passed: exitCode === 0 ? 0 : 0, failed: exitCode === 0 ? 0 : 1, skipped: 0 };
//            ^^^^^^^^^^^^^^^^^^^^^ 两个分支都是 0
```

`passed` 的三元恒为 0，是写错的（大概率想写 `exitCode === 0 ? 1 : 0` 或干脆不该有这个兜底）。更关键的是：**没有任何地方要求 `counts.passed > 0`**。

**复现**（接 B4，scratchpad/en2 实测）：

```
counts= {"passed":0,"failed":0,"skipped":0}
exit_code= 0
→ PASS G-done / PASS X-evidence / result: PASS
```

**建议修法**：删掉死三元；`runVerify` 在 `counts.passed === 0 && counts.failed === 0` 时判定为"未采集到任何测试结果"，`exitCode` 置 1。

---

### I9　测试质量：同义反复 + 几乎没有"门禁应当拒绝"的负面用例 + 不自洽（违反 DEC-034/C-34）

**同义反复（用与实现相同的逻辑算期望值，或断言恒真）**

| 位置 | 问题 |
|---|---|
| `tests/w4-skills.test.ts:13` | `assert.equal(SKILL_CATALOG.length, 16)` —— 常量对字面量，恒真 |
| `tests/w6-pilot.test.ts:111` | `assert.equal(CHECK_IDS.length, 16)` —— 同上 |
| `tests/w6-pilot.test.ts:108-112` | `reviewMentionsAllIds(formatReview(...))` 恒为 `[]`：`formatReview`（`review.ts:59`）就是遍历 `CHECK_IDS` 逐条打印，`reviewMentionsAllIds`（`review.ts:78`）就是筛出没打印的。**结构上不可能失败** |
| `tests/w1-skeleton.test.ts:18-24` | 逐字重写了 `check.ts:193-194` 的行数算法；且用 `text.length`（字符）而实现用 `raw.byteLength`（字节），两边测的不是同一个量 |
| `tests/w1-skeleton.test.ts:104-114` | 逐字重写 `xCasefold`，连同 I3 的平台盲区一起复制 |
| `tests/w1-skeleton.test.ts:48-64` | 重写 `readCurrent` 的 `startsWith("- current:")` 过滤 |
| `tests/w4-skills.test.ts:16-24` | `inspectSkills` 断言为空后，又手工重复它已经检查过的 `name: <dir>` |
| `tests/w1-skeleton.test.ts:92-97` | "launchers exist" 只断言 `gate.sh` / `gate.ps1` 文本里出现 `22.18.0`，**从不执行它们**。这两个脚本里各自内嵌了一份版本比较实现（`gate.sh:9`、`gate.ps1:10`），是 `isAtLeast` 的重复实现，且完全无测试 |

**测试固化了缺陷**

- `tests/w3-verify.test.ts:186-193`：`assert.match(r.stdout, /SKIP X-evidence|PASS X-evidence/)` —— **把 B1 的 fail-open 当成合格行为写进了断言**。测试名"this repo check still passes without committed evidence"直白地承认了这件事。
- `tests/w6-pilot.test.ts:47-64`：唯一一条 `--no-verify` 检测的正向测试，其 fixture 设了 `core.hooksPath=.githooks` 却**根本没有创建 `.githooks` 目录和 `prepare-commit-msg`**。所以它验证的是一条真实仓库里不可达的路径（真实仓库里钩子存在 ⇒ 尾注一定在 ⇒ 检测永不触发，见 B5）。测试通过，能力为零。

**完全没有测试的关键路径**

`warnWorklogCovered`（B6 的入口）、伪造证据是否被拒、红套件 ⇒ `verify` 退出码 1、`junit.xml` 陈旧复用、`gitWriteTree` 在 worktree 下、`--quick` 覆盖集合、`gate check` 在证据缺失时的退出码。46 项测试里**没有一条**是"给一个应当被拒的输入，断言 gate 返回非 0"针对证据/绕过这两类的（`w2:95` 的双 current 指针与 `w6:66/75` 的 CI 缺口是仅有的三条负面用例）。

**测试不自洽（依赖本机状态，非 hermetic）**

`w2-gate.test.ts:87` 与 `w3-verify.test.ts:186` 都对着**真实仓库**跑 `gate check` 并断言 exit 0，依赖：本地未入库的 `keel/evidence/verify.json` 是否新鲜、`node_modules/typescript` 是否在、`core.hooksPath` 配了什么。实测在 `gate worktree add` 创建的 worktree 里：

```
not ok 13 - REQ-017 gate check on this repo exits 0
not ok 28 - REQ-017 this repo check still passes without committed evidence
# tests 46  # pass 44  # fail 2
```

所以"46 项全通过"是**某台机器某个瞬间状态**的属性，不是代码的属性。

**建议修法**：删掉恒真断言；把重写实现逻辑的断言换成固定期望值（写死 `59` 行 / `3176` 字节这类快照，或换成"给一个 200 行的临时 AGENTS.md，断言 fail"这样的行为断言）；补齐上面列出的负面用例；把对真实仓库取样的两条测试改成 fixture 驱动。

---

## 次要

- `tools/gate/check.ts:33-41` `liveClarifications` 豁免 `^\s*-\s+Given\b` 开头的行。实测 `liveClarifications("- Given [NEEDS-CLARIFICATION] the API is undecided")` 返回 `0`，而同样内容不加 `- Given` 返回 `1`。若是为 Given/When/Then 验收模板留的口子可以理解，但它同时是一个"把未决问题藏起来过 G-req"的现成办法。建议改为只豁免"`- Given` 行内**不含**方括号标记"，或要求标记必须同时出现在 `未决问题` 小节。
- `tools/gate/check.ts:99-101` `gPlan` 只做 `body.includes("接口与耦合") || body.includes("| I-")` 子串匹配——写个空标题即可通过，不检查表里有没有行。
- `tools/gate/check.ts:196-201` `CLAUDE.md` 必须恰为 `@AGENTS.md` 的规则，在 `CLAUDE.md` **不存在**时不生效（`claude` 为空字符串走 falsy 分支）。
- `tools/gate/check.ts:286` `pass("X-skills", "16 k-* skills within …")` 把 `16` 写死在输出文案里，与实际数量/上限无关——报告会说谎。
- `tools/gate/check.ts:191-192` 同一个 `AGENTS.md` 连读两次（一次 Buffer 一次 utf8）。
- `tools/gate/evidence.ts:78-82` `tail2kb` 用 `text.length`（UTF-16 code unit）当字节数，名字与行为不符；`slice` 可能把代理对切断。
- `tools/gate/evidence.ts:56` `parseJunit` 取全文**第一个** `tests="N"`。Node 当前的 junit reporter 根节点 `<testsuites>` 无属性（实测），所以走的是数 `<testcase>` 的分支，眼下正确；但换成任何会在嵌套 `<testsuite>` 上写 `tests=` 的 reporter 就会读到第一个子套件的数字。
- `tools/gate/config.ts:9` `JSON.parse` 无保护。`keel/config.json` 语法错误时抛未捕获异常，输出一大段 ESM loader 栈（实测 exit 1，fail-closed，但用户看不到"你的 config.json 坏了"）。`gate.ts:105-116` 的 `main` 也没有顶层 try/catch。
- `tools/gate/hook.ts:47` `if (/^Feature:\s/m.test(text)) return ok("")` —— 提交信息正文里任何一行以 `Feature: ` 开头（例如引用别人的提交）都会让尾注注入静默跳过。
- `tools/gate/hook.ts:8-11` `featureFromBranch` 的 `/F-?(\d+)/i` 会在词中命中：分支 `wf-12-x` ⇒ `Feature: F12`；分支 `master` ⇒ `Feature: unknown`。没有任何地方校验这个 feature 编号真实存在。
- `tools/gate/ids.ts:46-48` `nextNumber` 是 read-then-write 的 TOCTOU，无锁。本机 6 路并发 `gate new iss` 实测未复现冲突（进程启动被序列化了）——**单机场景标注为「存疑」**；但两个 `gate worktree add` 出来的 worktree 各有一份 `keel/` checkout，两个 agent 同时 `gate new dec` 必然分到同一个号，合并时才由 `xIds` 发现。
- `tools/gate/git.ts:49,61-63` 临时索引 `.git/keel-wt-<pid>.idx`：`finally` 只在正常/异常展开时执行，进程被 kill 会在 `.git/` 里留垃圾文件。
- `.githooks/pre-push:4` `… hook pre-push || true` —— 强推提醒即使脚本崩溃也无人知晓；且 force-push 检测本身只打印不阻断（C-105 明示是提醒级，但 `X-bypass` 的 PASS 文案"no --no-verify / CI / tests-dir reminders"容易被读成"没有绕过"）。
- `tools/gate/verify.ts:82` 把 stdout 与 stderr 合并后存进名为 `stdout_tail_2kb` 的字段。
- `tools/gate/verify.ts:27-28` `splitCmd` 只处理双引号、不处理转义与单引号，含空格路径的 `test_command` 会被切错。
- `tools/gate/trace.ts:73` 用 `t.replace(ctx.root, "")` + 手工换分隔符构造相对路径，而同仓库已有 `posixRel`（`walk.ts:12`）；若 `ctx.root` 含正则元字符不受影响（`String.replace` 用字符串参数），但仓库根出现在路径中间时会误替换。

---

## 修复优先级建议

| 顺序 | 做什么 | 挡住哪些 |
|---|---|---|
| 1 | 证据缺失 ⇒ `fail`（有 summary/APR 时）；CI 里 `verify` 先于 `check` | B1、B7 |
| 2 | `xEvidence` 增加实质判定：counts 非零且 failed=0、`report_hash` 与 `junit.xml` 对得上、`command` 与当前 profile 一致；`runVerify` 先删 `junit.xml` | B2、B4、I8 |
| 3 | `warnWorklogCovered` 的确认凭据绑定树哈希；`X-hooks` / `X-bypass` 不可豁免 | B6 |
| 4 | `test_command` 与 `origin/main` 不一致时 `fail`（或用 trunk 的 config 跑 CI 测试） | B3 |
| 5 | `gitWriteTree` 用 `git rev-parse --git-dir` | I1 |
| 6 | `xCasefold` 改用 `git ls-files`；`gDone`/`gMerge` 接入追溯全绿 | I2、I3 |
| 7 | `--no-verify` 改用 pre-commit 落戳 + 扫 `origin/main..HEAD` | B5 |
| 8 | 补负面测试（每条上表都配一条"应当拒绝"的用例），清掉恒真断言 | I9 |
