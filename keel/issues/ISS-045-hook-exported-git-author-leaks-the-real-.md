---
id: ISS-045
status: closed
defense_kind: "回归测试 + hook + 共享清洗器（C-61 比 KLES-002 上一级：从手写清单到统一模式）"
defense_pointer: "tests/iss045-hook-git-env.test.ts"
feature: "F17"
fingerprint: "git-hook-env-hijacks-fixture-git"
date: 2026-08-27
---

# ISS-045 hook 导出的 `GIT_AUTHOR_*` 让 fixture 提交冠上真仓的 agent 身份，X-apr 守卫因错误原因变红

## 现象

复现命令：

```
GIT_AUTHOR_NAME=keel-agent GIT_AUTHOR_EMAIL=agent@keel.local node --test tests/r6-field-guards.test.ts
# not ok - R6c X-apr: an agent-trailer APR commit without delegation fails post-hoc
# not ok - R6c X-apr: the same commit with a recorded delegation passes
# 实际输出：FAIL X-apr  APR-001-x.md last commit author keel-agent <agent@keel.local> is an agent
node --test tests/r6-field-guards.test.ts     # 对照：40/40
```

真实触发：2026-08-27 提交 DEC-168 批次（触碰 `tools/gate/`），pre-commit 按 DEC-162 跑全量，
185/187，提交被挡；终端里同一棵树 187/187。

## 根因

`git commit` 在运行 hook 前把 `GIT_AUTHOR_NAME/EMAIL/DATE`（以及 committer 三项）导出到环境。
fixture 里 `git config user.name kopit` 写的是仓库配置，环境变量优先级更高，于是 fixture 的
提交作者是真仓的 `keel-agent <agent@keel.local>`，X-apr 如实判定「agent 身份」。

KLES-002 那次修的是同一指纹（hook 环境劫持测试里的 git），但修法是**手写四个变量名**
（`GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX`）——只列了当天出事的那几个，
没有对照 git 实际导出给 hook 的全集。断言作者身份的 R6c 测试在那之后才加进来，
而 DEC-162 的全量跑只在 `tools/gate/` 等路径入库时触发，所以直到下一次触碰门禁才炸。

## 修复

C-61：同一指纹第二次，比上一级——从手写清单改成**一个共享模式**：

- `tests/fixtures/git-env.ts`：`HOOK_LEAKED_GIT_ENV = /^GIT_(DIR|INDEX_FILE|WORK_TREE|PREFIX|AUTHOR_|COMMITTER_)/`，
  `scrubHookGitEnv(env)`（fixture spawn 用）与 `scrubProcessGitEnv(process.env)`（进程内 gate 的 git 调用用）。
- `tests/r6-field-guards.test.ts`、`tests/dec168-test-kinds.test.ts`：模块加载即 `scrubProcessGitEnv`，fixture git 走 `scrubHookGitEnv`。
- `.githooks/pre-commit`：`unset` 补 author/committer 六个变量（双层防护，同 KLES-002 的形态）。
- 回归测试 `tests/iss045-hook-git-env.test.ts`：先证明泄漏是真的（不清洗时 fixture 提交确实是 keel-agent），再证明清洗后保留 fixture 身份；清洗器只删 hook 导出项不误伤 `GIT_EXEC_PATH`；hook 文本含六个变量；三个碰 git 的测试文件都在加载时清洗。

红灯证据：修复前 `GIT_AUTHOR_NAME=keel-agent … node --test tests/r6-field-guards.test.ts` → 2 fail（上文）；
修复后同命令 40/40，`tests/iss045-hook-git-env.test.ts` 5/5。突变验证（DEC-013/DEC-168）：把清洗模式改回不含
`AUTHOR_|COMMITTER_` → iss045 的「keeps the fixture's own identity」与「strips everything」两条变红，
r6 在 hook 式环境下回到 2 fail；还原后全绿。记录见 f17-gate worklog 2026-08-27。

## 为何未被更早发现

上一次的修复是照着症状列变量，不是照着 git 的导出清单；受害测试（R6c）与全量触发条件（DEC-162）
之间隔着一次「不碰门禁」的提交，绿灯期把问题盖住了。CI 从未跑过，也没有第二个环境暴露它。

## 闭环选择与理由

回归测试 + hook + 共享清洗器。不选「只补四个变量名」：那正是上一次失效的做法（C-61 不许同一级重修）。
不选 `env -i` 全清：会连 `PATH`、`GIT_EXEC_PATH` 一起丢，hook 里的 git 反而跑不起来。
同一指纹已两次，第三次触发 `#经验候选`（C-61/C-78）；KLES-002 的措辞应从「GIT_DIR」改为「git 导出给 hook 的全部变量」，
用户库文件不在本仓，留待用户处理。

## 关闭

2026-08-27，防线指针 `tests/iss045-hook-git-env.test.ts` 在盘。
