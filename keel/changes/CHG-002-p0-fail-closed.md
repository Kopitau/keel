---
id: CHG-002
status: approved
date: 2026-08-24
requirements_from: v2.md
requirements_to: v2.md
---

# CHG-002 P0 返工：门禁 fail-closed（不改需求正文）

## 动机

独立评审（`docs/review/REWORK.md`）指出实现把已确认的 fail-closed 语义做成了缺失即 skip。P0 五条（ISS-001~005）把实现拉回 C-32 / C-33 / C-103 / C-104。需求书 v2 正文不改；改的是门禁裁决。

语义本身已在 C 记录里确认；本 CHG 只记录「纠正未走变更的实现偏离」。

## 新增

- `X-trace`：有 `summary.md` 的功能，其 `req:` 必须在 `tests/` 被点名（C-32 验收范围）
- `test_command` 白名单（ISS-001）
- hooks / `gate.sh` / `ci-trunk.sh` 在 index 中必须 `100755`（ISS-004）
- `gate-warn:` 必须 `ref=ISS-nnn|DEC-nnn` 且记录存在；高危项不可豁免（ISS-005）
- CI：独立 `node --test`；`verify` 先于 `check`

## 修改

- 有完成声明却无 `verify.json`：`G-done` / `X-evidence` **fail**，不再 skip（ISS-002）
- `counts.passed == 0 && failed == 0` 不得 PASS

## 删除

无需求条目删除。

## 影响评估

- 日常 `gate check`（全量）在未 `verify` 时会红；`--quick` 仍可在预提交用
- 旧测试「无证据也通过」改为负面用例
- 旧证据作废，须重跑 `gate verify`

## 批准

2026-08-24 用户原话：「CHG-002～006 批准」。提交身份 kopit <wwillmee@gmail.com>（C-107）。
