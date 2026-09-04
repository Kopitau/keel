# worklog — F11 f11-change

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-24（CHG-007 批准）

- 进度：用户批准 CHG-007，requirements INDEX current 切到 v3.md。C-34: ref=DEC-157 测试名 REQ-011 current 指针 v2→v3。
- CHG-008 仍 proposed；v3 文件中含 REQ-027/028。

## 2026-08-21（W5）

- 进度：冒烟走 CHG + 需求 v2（空名抛错）+ `gate index` 保持唯一 current。

## 2026-08-28（CHG-010 批准联动）

- 进度：按已批准 CHG-010/APR-003，把 requirements v4 的 owner 与验证义务联动到 overview v3 和 24 份功能计划新版；plan INDEX 切到 overview-v3。
- 规划顺序：P0 规划 → P1 CHG/verification/trace → P2 review/ISS-036 → P3 updater/legacy/0.8.0 → P4 平台治理 → P5 其余 owner → P6 消费项目与真实 CI。
- 未开始：任何 gate/installer/skill 行为实现；旧 evidence 将在本规划树上重跑后作废更新。

## 2026-08-28（P1 / CHG→REQ→APR 关系切片）

- 内部分解：本会话只做 plan v2 步骤 2——先以 `gate check --quick` 的 G-req 黑盒覆盖 proposed CHG、approved 但无 APR、APR hash 不匹配、完整链通过；verification/trace 与 evidence stale 分留后续会话。
- 开工审计：现有 G-req 只检查 REQ 数、NEEDS-CLARIFICATION 与 gap-hunt，不读取 CHG/APR，故三条负向关系目前会被静默放行。
- 执行边界：用户要求 P6 暂不触发真实 GitHub 六格；该外部 AC 不取消，继续保留 proxy WARN，本轮只做本地实现与验证。
- 红灯：`node --test tests/chg010-change-chain.test.ts` 为 1 pass / 3 fail；proposed、无 APR、hash stale 三种非法链均被旧 G-req 报 PASS，完整链为唯一既有 PASS。
- 实现决定：只检查当前 requirements 相对 `replaces:` 基线新引入的 CHG，再并入显式 `change:`；v4 因而检查 CHG-008/010，同时不把继承的 CHG-001/007 历史欠账伪装成需重写的当前变更。
- C-34: ref=DEC-179 新增四条 REQ-011/AC-5 黑盒关系测试并更新测试名基线。
- 绿灯：新增测试 4/4；连同既有 G-req/approve 回归为 54/54；`npx tsc --noEmit` exit 0；`gate check --quick` 为 PASS_WITH_WARN，G-req 报告 `2 producing CHG(s) APR-bound`，唯一 WARN 仍是用户明确延期的 REQ-017/AC-4 六格 proxy。
- 追溯：`gate trace` 已把 REQ-011/AC-5 绑定到 `tests/chg010-change-chain.test.ts`；AC-1～4 未在本切片冒充覆盖，留给后续 P1 子切片。

## 2026-09-01（需求 v6 确认）

- CHG-012 / CHG-013 / CHG-014 由用户 2026-09-01「批准V6和三份变更单。并以我的身份提交。」一次批准，APR-006 绑定三份变更单与 `requirements/v6.md` 正文哈希；v6 `status: confirmed`，`requirements/INDEX.md` current → v6.md；v5 冻结不改。提交按 DEC-190 由 agent 身份完成。

## 2026-09-03（需求 v7 确认）

- CHG-015 由用户 2026-09-02「A 可以 B 废掉 C 现在升级」批准，需求 v7 文本由用户 2026-09-03「批准V7」批准；APR-007 绑定两者正文哈希，v7 `status: confirmed`，`requirements/INDEX.md` current → v7.md；v6 冻结不改。提交按 DEC-190 由 agent 身份完成。

## 2026-09-04（CHG-016 / DEC-193）

- CHG-016 由用户原话批准；DEC-193 方案级变更在主干版本化（k-change 第 7 步）；需求 v8 proposed 待 APR-008。
