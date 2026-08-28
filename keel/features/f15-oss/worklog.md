# worklog — F15 f15-oss

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W2/W4。W1 因测试画像引入直接依赖 pytest，按 C-89 登记 OSS-001。
- 内部分解：见 plan/v1.md
- 实现决定：pytest 只作测试运行器，不进 gate 运行时（C-101 零依赖）。版本 9.1.1，MIT。

## 2026-08-21（W6）

- 进度：`X-oss` 对账 package.json 直接依赖 ↔ OSS 表（C-89）；到期日与 lock 版本不符为警告（C-90）。不在 check 里拉上游。28 天 KEEP。

## 2026-08-28（P5）

- 进度：X-oss 现在拒绝缺 repo/version/license/reuse_kind/review_days/next_review 或三正文节的空壳记录；OSS 模板补到期复查证据，k-log 补 GPL/AGPL 复用前用户 DEC。未做上游到期复查，仓内也无 GPL/AGPL 复用，两项 manual 均保留 proxy。定向 P5：52 passed / 0 failed。
