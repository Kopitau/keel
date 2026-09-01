# keel 0.9.3 release notes

发布日期：2026-09-01。补丁版。来源：CHG-014 之后两个试点仓库（zhaoxi / fmea-v3）按 `RELEASE-0.9.2.md` 清理时暴露的三处卡点（ISS-068、ISS-069、ISS-070）。

## 破坏点

无。`keel update` 只覆盖 `tools/gate/evidence.ts`、`tools/gate/git.ts`、`tools/cli/update.js` 与技能镜像；记录、模板、钩子的行为不变。

## 变化

- **verify 计数**（ISS-068）：解析 junit 只认根元素 `<testsuites>` 上的总数；根上没有就逐个数 `<testcase>` 与它们的 `<failure>` / `<error>` / `<skipped>` 子元素。以前取全文第一个 `tests="n"`，凡用 `describe()` 分组的 node:test 项目都只数到第一组（zhaoxi：193 条只数到 5），文件级加载失败也不计入失败。pytest / vitest 不受影响。验收快照（DEC-187）里的 `evidence_passed` 从此才是真数。
- **`keel update --yes`**（ISS-069）：更新器原来只在交互终端里接受 `y`，管道喂 `y` 会被当成取消，agent 会话（Claude Code / Codex / Cursor）没法替人跑更新。加 `--yes` 跳过确认（预览照常打印）；没有 `--yes` 又不在终端里时，提示语点名这个开关。
- **认领标记不再让主干"脏"**（ISS-070）：`gate worktree F<n>` 写在主干的 `keel/features/<slug>/claim.json` 以前被 `verify` 当成未提交改动，只要有人在工作树里施工，主干就出不了干净树的证据、验收快照也写不进去。现在认领标记与证据、审批一样不进树哈希、不算脏；真实改动照旧算。

## 消费项目要做的事

1. `keel update`（终端里输入 `y`；agent 跑用 `keel update --yes`）；主干重跑一次 `node tools/gate/gate.ts verify`，确认 `counts:` 与测试框架自己汇总的数一致。
2. 若某个验收 APR 的证据快照是在 0.9.2 上写的、且项目用 describe 分组，重新 `gate approve` 一次让快照带上真数（需要一份新鲜、干净树的 verify.json）。
