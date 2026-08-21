<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# R7 — kunchenguid/no-mistakes 调研：合并/功能验证环节的借鉴与复用评估

> 调研日期：2026-08-21。来源：GitHub API 仓库元数据、README、docs 源码（concepts/pipeline.md、reference/pipeline-steps.md、guides/agents.md 等，均 raw.githubusercontent.com 直读）。本会话 WebSearch 配额耗尽，未做二手评论面调研（HN/Reddit 口碑 **[未核实]**）。

## 1. 项目档案

- **kunchenguid/no-mistakes**（"git push no-mistakes"），Go，MIT，★7,744 / fork 770 / open issues 225，创建 2026-04-05，**当天（2026-08-21）仍在推送**，Windows/macOS/Linux 全平台，文档站 + Discord。口号："Kill all the slop. Raise clean PR."
- 定位：**本地 git 代理门**。`no-mistakes init` 在真实 remote 前架一个本地 gate remote；`git push no-mistakes` 触发守护进程在**一次性 worktree**（不打扰你的工作区）里跑固定九步流水线，全绿才把分支转发到真正的 push 目标并自动开出干净 PR。

## 2. 核心机制

### 2.1 九步流水线（顺序固定，内容可配）

```
intent → rebase → review → test → document → lint → push → pr → ci
```

- **intent**：显式传入（`/no-mistakes <task>`）或从本地 agent 会话记录（Claude Code/Codex/OpenCode/Rovo/Pi/Copilot transcripts）推断作者意图，供后续所有步骤当验收上下文。
- **review**：AI 代码评审——**每轮都是无会话的新上下文调用**；fix 轮产生的代码在复审时被"当作流水线自产代码用同等对抗标准审"，先前 findings/修复摘要只当 claims 不当证据 → 正是"生成者/评估者分离 + 防自评"的产品化实现。
- **test**：`commands.test` 只做**定向本地验证**（明确不做全量回归——"remote CI owns broad regression"）；有 intent 时 agent 补采**行为证据**，可存本地或推送到孤儿证据分支（`test.evidence.store_in_repo`）。
- **document/lint**：文档缺口检查 + lint（`commands.lint` 可配确定性命令）。
- **push→pr→ci**：安全推送（防覆盖带外提交）、自动开/更新 PR、**盯 CI 并自动修失败**（GitHub `gh run view --log-failed`、GitLab `glab ci trace`、Forgejo/Bitbucket/Azure DevOps；**无 Gitee 支持**）、自动解合并冲突。
- **findings 模型**：severity（error/warning/info）+ action（auto-fix / ask-user / no-op）；每步 auto-fix 轮数上限（review 默认 0 = 必须人批）；人可 approve/fix/skip/abort；**决策历史持久化**——被人拒绝的 finding 后续轮次不得复报（除非代码引入实质新问题）。
- **反同义反复测试规则**（内置于测试/评审角色提示）：拒绝"唯一证据是与实现源码文本匹配"的测试，要求可执行接口或语义模型证明可观察行为——与 keel §7.5 的目标一致且已产品化。

### 2.2 Agent 无关

流水线 agent 可配 `claude / codex / grok / rovodev / opencode / pi / copilot / cursor(+acpx) / acp:<target>`，支持有序 fallback，`agent: auto` 自动选。**六个目标 harness 里除 dsh 外全部原生在列**。调用侧技能 `/no-mistakes`（init 时装到用户级）驱动非交互接口 `no-mistakes axi`，并有嵌套防护（流水线内的 agent 不得再开 gate）。

### 2.3 需要知道的边界

1. **本地门不是权威门**：它跑在开发者机器上，绕过 = 直接 `git push origin`。作者的模型是"clean PR 生产器"，服务器端仍需分支保护 + required check（与 keel L3 互补，不替代）。
2. **流水线自产的修正提交显式绕过本地 hooks**（`--no-verify` + 空 hooksPath，文档写明理由：一次性 worktree 缺 hook 运行时文件）——keel 的 trailer 注入若依赖 prepare-commit-msg，会在这类修正提交上缺失（需在 PR 层补 Task 标注，keel 已有"PR 标题带 Task"规则，兼容）。
3. **工作区边界是提示词转向不是 OS 沙箱**（文档自认）。
4. **每次过门都花 agent token**（review 必开 + 各步 fix 轮）；`commands.test` 定向而非全量，成本有界但非零。
5. **无 Gitee**：Gitee 仓库上 push/pr/ci 三步按"unsupported host"跳过或仅推送，本地六步照跑（具体行为 **[未核实]**，落地时实测）。
6. 需守护进程 + 必须有可运行的 pipeline agent（没有 agent 时整个 gate 拒绝启动，不静默降级——设计上诚实）。

## 3. 对 keel/kk 的借鉴与复用建议

### 3.1 复用（作为可选组件，不进核心依赖）

**把 no-mistakes 作为"合并车道"的默认执行器**（keel §9.3 / kk §14 Integration 的落地件）：

- keel 的 `gate check all`（G 门禁 + 追溯 + 上下文预算）配进 `commands.lint`（确定性命令位），`gate verify --targeted` 配进 `commands.test` → **每次 gated push 都在一次性 worktree 里复算我们自己的门禁**，然后才是它的 AI review/document/lint；
- 它的 review 步直接充当 keel §7.4 的"新上下文独立评审"（甚至比自建强：决策历史、对抗性复审、反同义反复规则都是现成的）；配 `review.path_instructions` 注入我们的评审重点（tests/** diff 单独过目、只报正确性 gap）；
- 证据分支（`test.evidence.store_in_repo`）与 keel evidence/ 并存：keel 管"REQ↔测试↔证据"的机器账，no-mistakes 管"这次 push 的行为证据"；
- 服务器端不变：GitHub required check 仍跑同一 gate.py（权威），no-mistakes 只是把"到达 PR 前的返工"前置消化掉。

**收益**：A5 合并车道（rebase/推送安全/PR 生成/CI 盯梢/冲突修复）零自建；独立评审零自建；与六 harness 的兼容天然齐（除 dsh）。**成本**：Go 守护进程一个外部依赖（MIT，可退出——不装它时 keel 流程完整无损，这是"可选组件"的判据）。

### 3.2 只借鉴（若不想引入依赖）

值得抄进 keel 规范的机制：findings 的 severity×action 二维模型与 per-step auto-fix 轮数上限；**finding 决策历史**（拒过的不复报）；对抗性复审（fix 轮代码按同标准重审、先前结论只当 claims）；反同义反复测试的角色级禁令；意图（intent）作为全流水线上下文的做法；"targeted test 本地、全量回归归 CI"的分工原则。

### 3.3 明确不建议的用法

- 不用它替代 CI 权威门（它是本地便利层）；
- 不在 Gitee-only 仓库上指望 pr/ci 两步；
- 不把它的 review 当唯一验收依据（keel 的 A4 人工验收与 REQ 追溯仍是必需——它不认识 REQ ID）。

## 4. 与用户 R-20（token 不对称）的关系

no-mistakes 把 token 花在**边界**（push 时一次性 review+fix），而不是写码过程中——与"设计阶段大投入、实现阶段克制"的意图同构；其"targeted test + CI 管全量"也压低了本地循环成本。纳入后对实现期 token 的净效应：多一笔可预算的过门开销，换掉的是 PR 后往返返工（社区共识里最贵的环节，R3b F12）。

## References

- https://github.com/kunchenguid/no-mistakes （API 元数据 + README，accessed 2026-08-21）
- https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/src/content/docs/concepts/pipeline.md （accessed 2026-08-21）
- https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/src/content/docs/reference/pipeline-steps.md （accessed 2026-08-21）
- https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/src/content/docs/guides/agents.md （accessed 2026-08-21）
- 未核实项：社区口碑/失败报告（WebSearch 配额耗尽未查）；Gitee 上 push/pr/ci 步的确切降级行为；`repo-config` 全字段（只读了节选）。
