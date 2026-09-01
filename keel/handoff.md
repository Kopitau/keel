# handoff

- 下一步（agent）：无待办。可选：对 DEC-190 与「按功能证据」这两处评审之后的改动补跑一轮方案级评审（用户 2026-09-01 说「不用评审」，G-done 的黄可保留）。
- 下一步（人）：三件只有你能定的事——(1) zhaoxi 的 `pnpm-lock.yaml` 未提交改动已 stash（stash@{0}，被 `.tmp-dsh-f6-host` 污染），留还是弃；(2) zhaoxi 九份 plan v1 的语义漂移（DEC-010 / DEC-013 落到计划正文）现按发布说明记豁免，若要严格版本化就出 plan v2 + 新 APR（需你原话）；(3) fmea-v3 工作区里 Cursor 会话留下的 15 个未提交 F19 文件，提交或丢弃后主干门禁即全绿。
- 刚发生（0.9.3）：清理两个试点仓库时撞到两处卡点并修掉——verify 把 junit 第一个 suite 的数当整场（ISS-068）、`keel update` 没有非交互的 `--yes`（ISS-069）、认领标记让主干永远"脏"（ISS-070）；两仓已升到 0.9.3。
- 刚发生：2026-09-01 用户「批准V6和三份变更单。并以我的身份提交。」→ APR-006 approved（绑定 CHG-012 / CHG-013 / CHG-014 与 `requirements/v6.md` 正文哈希），requirements current = v6.md；同轮 DEC-190 去掉"审批只能由人类 git 身份提交"（原话即审批，谁提交都行），REQ-006/AC-10 让 `gate verify` / `gate trace` 按功能说明证据。
- 试点仓库状态（2026-09-01）：zhaoxi 0.9.3——主干 verify 201 过 / 2 跳、树干净，APR-001～005 均记有用户原话，APR-005 带证据快照，全门禁 0 红 4 黄（计划漂移豁免 ×2、替身验收、评审树已过期）；fmea-v3 0.9.3——trellis 整体删除（一笔 213 文件），APR-001 / APR-002 按 2026-08-29 原话补签并绑哈希，主干 verify 1378 过 / 21 跳，全门禁只剩「树脏」三红（等 F19 未提交文件）。
- 该读：`RELEASE-0.9.3.md`、`keel/issues/ISS-068…070`、`keel/features/f06-evidence/worklog.md`、`f19-parallel/worklog.md`、`f23-bootstrap/worklog.md` 的 2026-09-01 节。
- 阻塞问题：无。
