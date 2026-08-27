---
id: CHG-010
status: approved
date: 2026-08-27
requirements_from: v3.md
requirements_to: v4.md
decisions: [DEC-169, DEC-170, DEC-173, DEC-174, DEC-175, DEC-176, DEC-177, DEC-178, DEC-179, DEC-180, DEC-181, DEC-182]
---

# CHG-010 requirements v4 稳定化与 0.8.0 收口

## 动机

`gap-hunt-v3.md` 找到 34 条缺口，其中 6 条严重项会让已确认规则失去约束力、让未批准内容先行生效，或带来升级覆盖风险。随后 DEC-169/170 已实现但没有需求 AC；REQ-017/AC-3 只能以 proxy 存在；真实消费项目又暴露旧 RES 被新判据阻断与 `gate loop clear` 抹除审计记录的问题。

本单把这些事项收束为一份新的完整 requirements v4。v3 冻结不改。

## 新增

- 为每条 AC 增加可机读验证方式：`auto` / `machine-doc` / `manual`（DEC-174）。
- 增加 CHG 状态不得弱于其产生的 confirmed REQ 的门禁判据，防止再次出现 CHG proposed、REQ confirmed。
- 增加 headless 跨 harness 配方页要求，使 REQ-027 的异构复审可执行。
- 明确攻击面清单的位置、最小结构与追加责任。
- 将 DEC-169 的 `req:` / `blocked_by:` / frontier 判据纳入 REQ-004。
- 将 DEC-170 的 `agents/openai.yaml` 生成、镜像和 stale 检查纳入 REQ-016。

## 修改

- **REQ-002**：标准/深度 RES 的 URL 判据采用“旧记录 WARN；新建或实质修改 FAIL”，legacy 身份必须持久可机检（DEC-176）。
- **REQ-006**：验收范围按已声明完成的功能收口；每条 AC 必须声明验证方式；auto 只认黑盒验收测试，proxy 仍为 WARN（DEC-174）。
- **REQ-010 / REQ-027**：区分 ISS 打开时的最小字段与关闭时的完整诊断字段；blocking finding 仍须有复现命令。
- **REQ-010 / REQ-027 复现协议**：自动评审使用攻击探针；问题存在退出 `0`，修复/拒绝后退出非 `0`；ingest 先验真、clear 再验拒绝（DEC-182）。
- **REQ-017**：CI 验收拆为本地 workflow 契约测试与真实 GitHub 六格运行证据（DEC-175）。
- **REQ-018**：补审批目录保护——GitHub/Gitee 档 CODEOWNERS 指向真人，本地档明确降级（C-108）。
- **REQ-019**：按 DEC-155 改为三档：日常单人可在 trunk；新增大功能推荐 worktree；并行功能或第二人出现时强制。
- **REQ-023**：补破坏性变更须 adr DEC + 已批准 CHG + release 说明（C-140）。
- **REQ-025**：`keel update` 先列完整覆盖清单，再直接询问 `y/N`；默认 N，确认前零写入（DEC-141/173）。
- **REQ owner**：REQ-025 唯一归 F23、F16 仅为关联；REQ-027/028 归 F7；文末映射覆盖 28 条 REQ（DEC-180）。
- **legacy RES**：身份固定在 `<records_dir>/migrations/res-citation-legacy.json`，以 ID、相对路径与规范化全文 SHA-256 绑定；不改写旧 RES（DEC-181）。
- **REQ-027/028**：按 DEC-178 保留核心方向，补 headless、证据绑定、finding 生命周期和攻击面清单缺口；如实记录 CHG-008 实现早于批准。
- **评审证据协议**：`gate loop clear` 的 `repro_runs` 改为追加式历史，不得被重复 clear 清空（DEC-177 / ISS-036）。

## 删除

无。历史 requirements v1～v3、CHG-008 及旧 DEC 均保留，不重写审计链。

## 影响评估

### 当前追溯事实

`gate trace`（2026-08-27）显示 v3 共 28 条 REQ：26 条存在未覆盖 AC；REQ-017/AC-3 是唯一 proxy。按 DEC-174，这不等于 26 条功能立即失败：只有已有 `summary.md` 的功能进入完成验收范围，但所有缺口继续在 trace 中可见。

### 决策复核

- DEC-159/160 保留，由 DEC-178 明确批准核心方向；CHG-008 的顺序偏差不抹除。
- DEC-169/170、DEC-173～181 进入 v4 来源。
- C-32/C-37 的表面冲突由 DEC-174 收束；C-108/C-140/C-141 与 DEC-155 恢复需求落点。

### 规划与测试义务

- 统一规划需要 overview v3 补充 0.8.0 稳定化切片和受影响耦合。
- F1～F24 的 AC 全部新增 verification 义务，因此 24 份 owner 功能计划都须出新版、补 `req:` 与验证方式，只写变化，不改旧版。其中行为/边界实质变化的重点计划是 F2、F4、F6、F7、F10、F11、F16、F17、F18、F19、F22、F23、F24；其余计划至少对账 verification 与人工证据义务。
- F10 计划必须新增正反向黑盒验收：review ingest 在攻击探针退出 `0` 时开单，缺命令或首次非 `0` 时拒绝开 blocking ISS；clear 只接受同一探针由 `0` 变为非 `0`。F7 计划复用同一组契约验证自动评审回路。
- 其余重点重测：installer update 的预览/`y/N`/零写入；trace 三种验证方式；workflow 六格契约；CHG→REQ 状态关系；CODEOWNERS；frontier；openai.yaml；review loop 追加历史；legacy RES WARN/FAIL。
- REQ-017、REQ-025、REQ-027/028 的 AC 编号或语义变化会使现有测试标记需要对账；C-34 基线随测试名变化更新并引用本单/相关 DEC。
- 全量 `node --test`、`npx tsc --noEmit`、`gate verify`、`gate check` 必须重跑；旧 evidence tree hash 作废。

### 谁必须复测

- keel 自仓：Windows 本地全量；GitHub Actions Windows/macOS/Linux × Node 22/24。
- 至少一个消费项目：运行 `keel update` 的交互确认、legacy RES 警告和新 RES 失败、技能元数据同步、frontier/trace。

## 批准

用户已逐项确认方向与取舍（DEC-173～182，原话逐条记录）。完整 v4 已由未参与本轮访谈的新上下文产出 `gap-hunt-v4.md`，正式评审回路达到 passed，随后用户对整份基线点头；本单由 APR-003 与 CHG-008、requirements v4 一次性哈希批准。批准后才编写规划新版和实施本单，避免再次出现未批准先实现。

2026-08-27，用户回复「先A」，确认本单所列范围，授权先编写完整 requirements v4 草案。该原话是施工范围确认，不替代 v4 完成后的整份基线确认与 APR。

2026-08-27，用户回复「1 A」，选择 DEC-179 的合并批准方案：CHG-008、CHG-010 与最终 requirements v4 在完整草案和独立复核完成、用户整份点头后，由同一份 APR 一次批准；两张 CHG 的历史与“CHG-008 实现早于正式批准”的事实不得改写。

同轮用户回复「2 A」「3A」，分别确认 REQ owner 映射（DEC-180）和旧 RES 外置迁移清单（DEC-181）。这些是 v4 的已确认输入，不等于对 v4 整份基线的最终点头。

2026-08-27，用户回复「Y」，确认正式评审修订后的完整 requirements v4，并明确委托生成、批准和提交 DEC-179 规定的合并 APR；本次不合并、不开始实现。
