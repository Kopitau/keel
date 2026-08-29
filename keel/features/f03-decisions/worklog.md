# worklog — F3 f03-decisions

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W1-migrate/W2/W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-28（P5）

- 进度：新增 `X-decisions`，对当前状态枚举及 Git HEAD→工作树的 confirmed/superseded 非法回退失败；status 暂定计数和 DEC/ADR/worklog 协议逐 AC 覆盖。AC-3 同轮用户原话证据未实际演练，测试明确标 proxy。定向 P5：52 passed / 0 failed。

## 2026-08-29（CHG-011 Q5 决策复核）

- 进度：DEC-162 / 163 / 164 / 165 / 176 / 181 标 superseded → DEC-183（机制随门禁删除）；DEC-174 / 178 / 182 / 161 追加复核节（保留，161 部分失效、原则转技能规则）。ISS-021 防线指针改为 X-trace + 方案级评审（f10 worklog）。`gate index` 重建索引。
- CHG-011 影响评估对账：实际删除门禁 15 条（多 G-issues）；REQ-020 v4 已是想要；v5 另改了 REQ-001/003/004/018/023/025 措辞；REQ-018/AC-6（ISS-053 防线）新增——全部写在 v5「本版范围」与「未决问题」，待 APR-005 一并点头。

## 2026-08-29（DEC-184）

- DEC-184 confirmed（用户原话逐字）：评审不设攻击面视角、不强制异构，空白上下文子代理即可。DEC-159 / DEC-160 superseded → DEC-184；DEC-178 追加复核节。
