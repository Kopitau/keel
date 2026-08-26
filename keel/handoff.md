# 交接 — CHG-009 现场加固已批准落地

- date: 2026-08-26
- 本段：zhaoxi 首次真实使用暴露的执法缺口 → 三轮加固 → APR-002 批准入库（Claude）

## 状态：框架初步完成 + 首轮现场加固闭环

| | |
|---|---|
| 需求 | 28 条（gap-hunt-v3 独立猎取 34 条发现，6 条严重**待处置**） |
| 决策 | 167 条（DEC-161~167 为本轮，含用户原话） |
| 问题条目 | 43 条（ISS-036 open；037~043 本轮全闭环） |
| 测试 | 179 全绿（tests/r6-field-guards.test.ts 为现场加固守卫） |
| 门禁 | check --quick PASS；full check 剩 3 项均为既有状态（见下） |
| 变更单 | 9 张（CHG-009 已批准 → APR-002，哈希绑定 8 工件） |

## 本轮新增的防线（CHG-009 / DEC-161~167）

1. **G-req**：有 RES 而无 REQ 条目 → FAIL（顺序倒置）；confirmed 基线无缺口猎取记录 → FAIL（判实质不判格式，`gaphunt.ts`）
2. **X-oss**：每份 RES 必须表态 `oss:` 或 `oss_none:`，不再因缺 package.json 而 SKIP
3. **G-research**：开检 RES 实质（档位 + 四承重节 + 标准/深度须引用，`rescheck.ts`）
4. **经验候选有读取端了**（`candidates.ts`）：`gate status` 计数，G-retro 对已复盘功能提示；处置 = 标签行追加 `→`；KLES-001/002 为管道首两次端到端
5. **pre-commit**：框架敏感路径强制全量测试（DEC-162）；审批路径提交时守卫 `pre-commit-apr`（DEC-167）
6. **C-107 修订为记录在案的委托**（DEC-166）：APR `delegated:` 字段记用户原话；`Agent:` 尾注从环境自动填真（`harness.ts`）；approve / pre-commit / X-apr 三点执法。APR-002 是该协议首次实际执行

## 教训（都有守卫测试钉住）

- **新判据上线前必须拿现实中最好的样本实测**：缺口猎取判据初稿会误杀 zhaoxi 的高质量产出（ISS-038）；RES 判据初稿会误杀本仓 RES-901/902
- **git hook 导出的 GIT_* 会劫持测试里的 git 操作**，两个野提交曾落到真仓 HEAD（已救回；hook unset + 测试自净双防，KLES-002）
- Windows 上 Python `write_text` 默认写 CRLF，曾污染 27 文件（KLES-001）

## full check 剩余 3 项（均为既有状态，非本轮引入）

- `G-done: review loop not passed`（REQ-027 结构性要求外部评审者跑 pack→ingest→clear）
- `G-merge` / `G-retro`: ISS-036 open（评审回路 clear 复现命令固化，上轮遗留待办）

## 下一步候选（按价值排序）

1. **gap-hunt-v3 的 6 条严重发现处置**（REQ-019 与 DEC-155 冲突、`keel update` 静默覆盖无需求归属、20 条 confirmed 决策无 REQ 落点等）——需要用户逐条拍板
2. **zhaoxi 迁移**：3 份 RES 补 oss 表态；APR-001/002 补 `delegated:` 记录（新判据下会 FAIL，补一行即合规）
3. push 远端让 CI 首跑（跨平台哈希一致性至今只有 Windows 单点验证）
4. ISS-036 闭环 + 评审回路走完（需外部评审者）

## 记录索引

- `keel/changes/CHG-009-field-hardening.md` —— 本轮总账（三轮全记）
- `keel/research/RES-903-*` —— 现场调研实证（决策依据）
- `docs/review/A8-zhaoxi-field-lessons.md` —— zhaoxi 会话深挖报告（独立子代理产出，部分线索未处置）
- `keel/requirements/gap-hunt-v3.md` —— 需求书独立缺口猎取（34 条）
