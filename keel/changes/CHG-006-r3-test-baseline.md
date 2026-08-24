---
id: CHG-006
status: approved
date: 2026-08-24
requirements_from: v2.md
requirements_to: v2.md
---

# CHG-006 R3：测试名称基线（C-34 删/skip 须引用）

## 动机

第三轮复审 ISS-021：删掉或跳过测试后门禁全绿，可让已破坏的核心机制（DEC-144 换行规范化）不被发现。需求书 v2 已有 C-34 验收标准；此前从未执法。不改需求正文。

语义本身已在 C-34 确认；本 CHG 记录「此前未执法的实现补齐」。

## 新增

- 入仓锁文件 `keel/test-baseline.json`（测试名称集合；不 gitignore）
- 检查项 `X-tests`（`--quick` 也跑，预提交可拦删测试）
- 判据：相对 HEAD 基线名称净消失，或 `test.skip` / 证据 `skipped>0`，须 worklog **本轮新增行** `C-34: ref=ISS-nnn|DEC-nnn` 且记录在盘（ISS-005 同一套引用存在性校验）
- 三条负面 guard：删测试完整 check FAIL；skip 不靠 tsc FAIL；引用真实 ISS 后放行

## 修改

- `X-tests` 加入 `NO_WAIVE`（不得 `gate-warn:` 消除）
- 门禁年检清单加入 `X-tests`

## 删除

无需求条目删除。

## 影响评估

- 加测试须同步更新 `keel/test-baseline.json`（与名称集合一致）
- 重命名/合并测试视为名称消失，须引用 ISS/DEC（避免同计数替换真测试）
- 尚无基线文件时：无 skip 则 `X-tests` skip（未武装）；有 skip 仍 FAIL
- 旧证据不强制含测试名称字段

## 批准

2026-08-24 用户原话：「CHG-002～006 批准」。提交身份 kopit <wwillmee@gmail.com>（C-107）。
