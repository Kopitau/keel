# worklog — F1 f01-requirements-interview

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W4）

- 进度：`k-grill` / `k-new` 技能落盘。无歧义测试=结构机检 + 技能正文可被未读过的模型按步骤执行；五家触发实测在 W5。

## 2026-08-28（P5）

- 进度：按 v4 逐 AC 补 `chg010-record-protocols.test.ts`；REQ 模板新增 verification 字段，访谈批次、自查事实、GWT、未决与 fresh-context gap hunt 均有 machine-doc 黑盒。定向 P5：52 passed / 0 failed。

## 2026-09-01（CHG-014 S3：REQ-001/AC-7 声明已确认必须能追到 APR）

- 进度：G-req 读当前需求版本的 `status`（YAML 前言或 `- status:` 列表两种写法）。含 confirmed / 已确认 时：直接绑定且匹配 → 通过；直接绑定但漂移 → WARN（`gate-warn: G-req ref=APR-nnn`）；未直接绑定但产生它的 CHG 已批准并绑 APR（既有链条）→ 通过；两者皆无 → FAIL 并提示 `gate approve` 或改回 proposed（DEC-186）。
- 实现决定：首版只认"直接绑定"让 5 条旧测试红了——chg010 / chg011 夹具的需求文件写 `- status: confirmed` 而 APR 只绑 CHG，这正是 G-req 一贯承认的确认路径；DEC-186 与 v6 AC-7 措辞同步改为"直接引用该文件或引用产生它的已批准 CHG"。fmea-v3 的 v1（无 CHG、APR 仍 draft）仍会红，这是目标。
- 证据：`tests/chg014-frozen-artifacts.test.ts` `REQ-001/AC-7`（fmea-v3 形状 FAIL → 批准后 PASS → 正文漂移 WARN/waiver）与 `DEC-186 …`（proposed 不判；两种表头写法）。
