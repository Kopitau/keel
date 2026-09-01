---
id: ISS-058
schema: iss-v2
status: closed
defense_kind: "regression-test + hook"
defense_pointer: "tools/gate/hook.ts (insertTrailers); tests/chg014-hook-harness.test.ts"
feature: "F17"
fingerprint: "hook-trailer-folds-into-subject"
source: "audit 2026-09-01 (zhaoxi / fmea-v3 git history)"
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-058 提交尾注紧贴主题行追加，被 git 折进主题

## 现象

`prepare-commit-msg` 钩子（`tools/gate/hook.ts` 的 `applyPrecommitTrailer` 与其后的 Feature/Developer/Agent/Session 段）只保证消息以换行结尾，不保证尾注前有一个空行。git 把「第一个空行之前的所有行」当作主题段，所以单行提交信息会变成
`chore: record F0 acceptance review Keel-Precommit: ok Feature: F0 Developer: kopitau Agent: unknown Session: unknown`。

两个试点仓库的每一条 agent 提交都是这个形状（zhaoxi `d428651`、fmea-v3 `20695e8` 等；`git log --format=%B` 可见主题行后紧跟 `Keel-Precommit: ok`，无空行）。

## 影响

C-115 的尾注不是 git trailer：`git interpret-trailers --parse` 取不到；`git log --oneline` / PR 标题被污染；按功能或会话过滤历史做不到。

复现命令：

```
cd "$(mktemp -d)" && git init -q . && git config user.name t && git config user.email t@t.t && mkdir -p keel && echo '{"records_dir":"keel"}' > keel/config.json && printf 'subject only\n' > msg && node "E:/program/en/tools/gate/gate.ts" --root "$PWD" hook prepare-commit-msg msg && awk 'NR==2 && $0!="" {exit 0} NR==2 {exit 1}' msg
```

（探针在缺陷存在时退出 0：第二行不是空行。）

## 待诊断防线

（已诊断，见下）

## 根因

`applyPrecommitTrailer` 与身份尾注段各自 `if (!text.endsWith("\n")) text += "\n"` 后直接追加，只保证"换行"，没有保证"空行"。git 把第一个空行之前的全部行当主题段，单行提交信息因此把尾注折进主题。本仓 `7238be8`（CHG-014 记录提交）也是这个形状。

## 修复

`hook.ts` 新增 `insertTrailers(text, trailers)`：尾注单独成段（前置一个空行）；若作者自己的最后一段已经是 `Key: value` 尾注段则直接追加；git 交互模板的 `#` 注释块保持在最后；`Keel-Precommit` 与 Feature/Developer/Agent/Session 合并为一次插入。

## 为何未被更早发现

钩子测试（ISS-045、r6）只断言尾注行存在（`^Feature:` 多行匹配），从未断言 `git log --format=%s`；本仓自己的提交信息多为多段落，主题段之后本来就有空行，缺陷只在单行提交信息上显形，而试点项目的 agent 提交几乎全是单行。

## 闭环选择与理由

回归测试 + 钩子实现：`tests/chg014-hook-harness.test.ts` 的 `ISS-058 …` 对 `insertTrailers` 四种形态断言；`REQ-019/AC-5 …` 在临时仓库真实提交后断言 `%s` 只含主题、`%(trailers:key=Feature)` 可解析。不需要更高一级：这是实现缺陷，不涉及规则。

