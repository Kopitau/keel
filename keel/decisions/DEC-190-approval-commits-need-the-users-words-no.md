---
id: DEC-190
title: 审批提交不再要求人类 git 身份：APR 里有用户原话即可，谁提交都行
status: confirmed
date: 2026-09-01
features: [F18, F17]
research: []
research_exemption: "对 C-107 / DEC-166 / DEC-167 既有规则的取舍；候选只有'保留身份要求'与'只留原话要求'，证据来自本仓与两个试点仓库的实际审批过程。"
adr: true
source_id: "REQ-018"
change: CHG-014
supersedes: DEC-166
---

# DEC-190 审批提交不再要求人类 git 身份

## 问题

C-107 要求审批文件必须在人类 git 身份的提交里；DEC-166 放宽为"agent 可在记录了委托原话的前提下代提交"，DEC-167 在 pre-commit 里拒绝 agent 身份的审批提交。实际发生的是：本仓每次审批都要 agent 切换 git 身份或让用户自己敲命令；fmea-v3 的 APR-001/002 因为用户没有亲自跑 `gate approve`、也没说"委托"二字而在 draft 上停了三天；zhaoxi 的 agent 干脆一直用用户的 git 身份提交，尾注 `Agent: unknown`——身份要求既没挡住谁，又成了每次审批的卡点。用户 2026-09-01："这个也是卡点，把只能由我的身份提交去掉"。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 保留：审批提交必须人类身份（或 agent 身份 + 委托原话） | 提交作者字段"看起来"是人 | 作者字段本来就可自报（ISS-034），防不了恶；每次审批多一道身份切换；两个试点都被它卡过 |
| **B 只留原话：approved 的 APR 前言必须有 `delegated:`（用户原话 + 日期）与 `approver:`（identities.humans 里的人）；提交者的 git 身份不限，agent 身份直接提交** | 审批的**判断**仍然只能来自用户且可溯（原话）；卡点消失；X-apr / pre-commit / `gate approve` 三处只核一件事：有没有原话 | 原话是自由文本，可被伪造——与 DEC-166 一样属本地档"防误记谎报、不防恶"（C-111）；GitHub 档仍有 CODEOWNERS + PR 评审 |

## 推荐理由

选 B。C-107 的目的是"审批的判断来自用户本人"，而不是"git 作者字段等于用户"——后者既不可信也不可用。把"谁提交"从规则里去掉，把"用户说了什么"留下，规则就和两个试点的真实工作方式一致了。

## 用户决定原话

2026-09-01：「这个也是卡点，把只能由我的身份提交去掉」；同轮「批准V6和三份变更单。并以我的身份提交。」（对 APR-006 的批准与提交委托）。

## 影响

- `gate approve`：不再核 git 身份；approved 前必须有非空 `delegated:`，否则拒绝并给出"把用户原话写进 delegated 再跑"的指引；`approver:` 取 `--approver` 参数，否则取 `identities.humans[0]`（config 无 humans 时拒绝）。
- `gate hook pre-commit-apr`：只拒绝一种情况——暂存了 `status: approved` 却没有 `delegated:` 的 APR；不再看提交者身份，也不再区分 harness / 宿主。
- X-apr：approved 且 `delegated:` 为空 → FAIL；不再比对最后提交作者是否 agent；`content_sha256: pending`、工件缺失 / 漂移的判定不变（DEC-185）。
- REQ-018 描述与 AC-2 重写（需求 v6 / CHG-014）；AGENTS.md「Do not」行、CONTEXT.md APR 词条、APR 模板「提交纪律」、k-new 第 5 步、k-accept 第 4 步同步。
- DEC-166 由本决策 supersede（其第 1、2 条——harness 探测与尾注——保留在 ISS-059 的实现里；第 3、4 条的"agent 身份无条件拒绝"作废）；DEC-167 的守卫改为只核原话；C-107 的"人类 git 身份"条款自本决策起不再执行，C-111 信任模型不变。
- 消费项目：更新后 agent 可直接用自己的 git 身份提交审批；fmea-v3 的 APR-001/002 只要补上用户当时的原话即可批准。

## 后果与复审条款

难逆转：一旦按本决策批准的 APR 入库，回到身份要求会让它们追溯非法。无上下文会意外："为什么审批提交的作者是 keel-agent"——答案在 APR 的 `delegated:` 里。真权衡：伪造一行原话的成本很低，本地档接受这一点（C-48/C-111）。复审触发：出现一次伪造原话的真实事故，或接入远端后首次多人协作（届时以 PR 评审 / CODEOWNERS 作防伪层）。
