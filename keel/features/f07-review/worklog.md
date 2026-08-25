# worklog — F7 f07-review

## 2026-08-25（R4 ISS-023~029）

- 进度：pack-first、tree_hash、真实路径 lens、`gate loop clear` 实跑复现、verify 保留 review、熔断指纹 + rounds.json、doctor 机器件、ATTACK_RE 补漏、plan/v2.md。Guard 在 `tests/r4-rework.test.ts`。
- 问题链接：ISS-023 ISS-024 ISS-025 ISS-026 ISS-027 ISS-028 ISS-029 CHG-008 DEC-159 DEC-160
- C-34: ref=ISS-028 renamed REQ-028/AC-3 (skills paths are attack-lens, not auxiliary)

## 2026-08-24（CHG-008）

- 进度：自动评审回路 `tools/gate/reviewloop.ts` + `gate loop`；三类清单在 `keel/review/`；k-review/k-impl/k-accept 已接 REQ-027/028。G-done 在有 summary 时要求 loop status=passed。异构在攻击面镜头强制，不得静默同源。
- 问题链接：CHG-008 DEC-159 DEC-160

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md
