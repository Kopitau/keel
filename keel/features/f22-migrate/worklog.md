# worklog — F22 f22-migrate

## 2026-08-21

- 进度：W1 开工。切片：Trellis/Superpowers 映射表 + 非结构化挖掘规则 + 本仓挖掘报告
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W4）

- 进度：`k-migrate` 技能指向 `keel/templates/migrate/` 映射表。语义映射仍由模型执行，gate 只做编号/索引。

## 2026-08-28（P4 / 迁移报告与源只读）

- 进度：新增中文 `templates/migrate/report.md`，固定保留已映射、未映射、冲突、存疑、无法归类、待确认六类；k-migrate 先后快照来源字节，并把独立 marker 新增与源字节未变分开记录。
- 边界：迁移产物仍是 `迁移初稿（未确认）`；缺理由 DEC 仍为 provisional，旧 Trellis/Superpowers 树不得删除或改写。
- 证据：真实 `keel init` Trellis fixture 的迁移前后逐文件 bytes 相同；报告与 updater legacy RES 不改写测试通过。
- C-34: ref=DEC-181 updater 的显式确认测试改名后同时承担 REQ-022/AC-6；旧测试名移除有本决策引用，行为没有删减。

## 2026-08-29（CHG-011 Q4 映射表并入技能）

- 进度：`keel/templates/migrate/`（trellis / superpowers / unstructured / report）删除，映射规则与报告结构并入 `k-migrate` 正文（55 行）；报告落点改为 `keel/migration-report.md`。`tests/chg010-migrate.test.ts` REQ-022/AC-1/2/4/5 改验技能正文。

## 2026-09-01（CHG-014 S7：REQ-022/AC-6 推平也是迁移）

- 进度：k-migrate 规则 5：用户选择推平时仍写 `keel/migration-report.md`，删除作为独立提交落地，旧框架的 SessionStart 注入与技能在同一提交里停用。来源：fmea-v3 213 个 trellis 删除在工作区躺了三天，`gate verify` 一直 `dirty: true`，G-done 永红；Cursor 里 Trellis 的 SessionStart 注入仍在。
- 证据：`tests/chg014-docs.test.ts` `REQ-022/AC-6`（machine-doc）。
