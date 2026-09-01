# keel — 项目总览

活文档，复盘时原地更新（C-54）。开场必读。

## 项目是什么

keel 是装进仓库的跨 Agent 开发流程层：带稳定编号的中文记录 + 英文技能 + 零运行时依赖的门禁 + 平台薄桥。不是 CLI 产品，不接管编排，不绑定厂商。

本仓库是框架自身（F23 自举）。消费项目稍后用 tag + 复制文件接入。

## 整体技术路线图

确认规范在 `DESIGN.md` §5（C-01~C-154，含 CHG-001）。实施按 `keel/plan/overview-v2.md`：W1 骨架（Node+TS）→ W2 gate → W3 证据/CI 三平台矩阵 → W4 技能 → W5 五平台实测 → W6 试点校准。

权威执法在 CI 复算；本仓目前是 **本地档**。OS 矩阵：Windows + macOS + Linux（DEC-143）。

## 能力清单

| 功能 | 状态 | 总结 |
|---|---|---|
| F17 | W1–W6 已实现（本地档） | `features/f17-gate/summary.md` |
| F1–F16, F18–F23 | 规范已确认；记录已迁入 | 尚未有 `summary.md` |
| F24 | 规范已确认（CHG-001）；哈希/启动器/CI 矩阵 | 尚未有 `summary.md` |

## 在途功能

版本 0.9.2（2026-09-01）。requirements **current = v5.md**（APR-005）；**v6 proposed**，携带 CHG-012（Cursor 兼容档）、CHG-013（评审去攻击面 / 不强制异构）、CHG-014（zhaoxi / fmea-v3 审计回流：DEC-185～189、ISS-058～060 已闭环），三份变更单与 v6 待 **APR-006** 一次点头（含提交委托原话）。规划 current = overview-v4.md（APR-005）。

CHG-014 八个切片已全部落地并提交（S0 记录 → S1 钩子/探测 → S3 冻结件与基线复核 → S4 证据快照 → S5 白名单 → S6 评审回路 → S2 status → S7 文档技能 → S8 发布）；每个切片有红绿测试与 worklog 节，证据见 `RELEASE-0.9.2.md` 与各功能 worklog 2026-09-01 节。

## 风险与暂定

- 暂定决策计数：0
- 人类身份已配 kopit <wwillmee@gmail.com>；APR-001 仍 draft（bootstrap）；APR-006 待点头
- Codex 的环境变量名未实测（本机 Codex CLI 登录失效）：`CODEX_*` 前缀规则 + 父进程名兜底，ISS-059 注明待钉死
- 本仓 10 个 DEC（APR-002 ×5、APR-003 ×5）在 CHG-011 复核时正文被追加，X-apr 以 F3 worklog 的两行 waiver 放行（DEC-185）
- REQ-017/AC-4 GitHub Actions 六格真实运行仍为 proxy
- §8/9 未进 C 记录

## 主要外部依赖

gate **运行时**零第三方依赖（DEC-154）。开发/CI 唯一白名单 devDependency：typescript（OSS-002）。pytest 曾用于第一次 W1，已退役（OSS-001）。映射表引用 Trellis（AGPL-3.0-only，不复制代码）与 Superpowers（MIT，不复制技能正文）。
