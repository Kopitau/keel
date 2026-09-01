---
id: ISS-058
schema: iss-v2
status: open
defense_kind: ""
defense_pointer: ""
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

打开态只写"待诊断"，未知根因和修复不得编造。

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。
