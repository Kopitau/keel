---
id: DEC-170
title: Codex 元数据：gate sync 为每个 k-* 技能生成 agents/openai.yaml，用户技能禁隐式调用
status: confirmed
date: 2026-08-27
features: [F16, F17]
research: [RES-904]
adr: true
source_id: "REQ-016"
---

# DEC-170 Codex 元数据：`gate sync` 为每个 k-* 技能生成 `agents/openai.yaml`，用户技能禁隐式调用

## 问题

AGENTS.md 把 16 个技能分成 User（k-init / k-new / k-impl / k-bugfix / k-change / k-review / k-accept / k-retro / k-handoff / k-status / k-migrate）与 Model（k-grill / k-research / k-decide / k-evidence / k-log）。Claude Code 侧这个区分靠技能描述与 AGENTS.md 文字；Codex（F16 的 primary 平台）侧则要看 SKILL.md 旁的 `agents/openai.yaml`：`policy.allow_implicit_invocation` 默认 true，false 时模型不会自行调用，只能 `$skill-name` 显式调（OpenAI Codex skills 文档；mattpocock/skills issue #516 实证 Codex 不认 SKILL.md 前言的 `disable-model-invocation`）。keel 没有这个文件——在 Codex 上 k-accept、k-change、k-init 这类"必须由人发起"的动作可被模型隐式触发。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A. `gate sync` 从 SKILL.md 生成 `agents/openai.yaml`（User → false，Model → true），X-skills 校验存在且与生成结果一致** | 单一来源（SKILL.md 描述）派生，不会漂；镜像照常复制；消费项目 `gate sync` 一次即得 | 技能目录多一个子目录；升级后的消费项目在 `gate sync` 前 X-skills 会 FAIL（fix 行已写命令） |
| B. 手写 16 个 yaml 入库 | 简单 | 与 SKILL.md 描述分叉；C-95 只允许 name/description 两个前言字段的精神是"单一来源" |
| C. 不做 | 无 | Codex 上人类动作技能可被模型自启 |

## 推荐理由

A。分类表进代码（`USER_SKILLS` / `MODEL_SKILLS`）后，AGENTS.md 的两行清单与 Codex 元数据从同一常量派生；`gate sync` 已是镜像的唯一入口（DEC-147），加一步生成不增加新命令。

## 用户决定原话

> 按你说的全做

（2026-08-27，对 RES-904「借鉴清单详述」七条与建议顺序的答复；本决定的形状即该详述第 7 条。）

## 影响

- `tools/gate/skills.ts`：`USER_SKILLS` / `MODEL_SKILLS`（并集 = SKILL_CATALOG，测试钉住）；`openaiYamlFor(name, description)`——display_name = 技能名，short_description = 描述第一句，引号转义。
- `tools/gate/sync.ts`：`writeOpenaiYaml(root)` 先生成再复制；输出行报生成数量。
- X-skills（`inspectSkills`）：缺失 → `agents/openai.yaml missing — run: gate sync`；与生成结果不一致 → `stale`。
- 本仓 `.agents/skills/k-*/agents/openai.yaml` 16 份入库，`.claude/skills` 镜像同步。
- 测试 `tests/dec170-openai-yaml.test.ts`（5 条）。
- **未实测**：本机未装 Codex，效果只有 OpenAI 文档与 issue #516 为证；按 F16 的 W5 触发台账，下次 Codex 实测时验证 `$k-accept` 显式可调、隐式不出现。

## 后果与复审条款

- 难逆转：低——删文件即回退；但消费项目一旦依赖 Codex 侧的显式约束，撤掉等于放开人类动作。
- 无上下文会意外：为什么 yaml 不能手改——X-skills 会判 stale；来源只有 SKILL.md。
- 真权衡：多一个派生文件 ⇄ Codex 上的调用边界。
- 复审触发：OpenAI 改变该文件的约定；或其他 primary 平台（opencode / grok / dsh）出现同类元数据文件，届时 `gate sync` 统一生成。
