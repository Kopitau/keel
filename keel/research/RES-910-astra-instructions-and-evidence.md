---
id: RES-910
title: Astra 指令精简与 taotie 证据问题
depth: standard
date: 2026-09-14
features: [F1, F2, F6, F7, F8, F12, F16]
oss: []
---

# RES-910 Astra 指令精简与 taotie 证据问题

## 调研问题

保持需求、充分选型、技术记录与功能验证目标时，哪些旧约束会妨碍强模型推进？哪些工具输出会夸大或否定证据？不做模型成功率对照实验，不复制外部实现。

## 检索范围

2026-09-14 检索并读取 OpenAI 官方 Astra 指南、技能编写说明与 2026-09-11 开发者文章；读取 keel 0.12.2 源码，核对 taotie 可访问对话及其需求、计划、授权和实际诊断材料。部分历史轮次无完整正文，不声称完整对话审计。

## 逐项证据

- [官方文章](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)：技能描述短且精确、按需披露、移除过细步骤和不必要的全量阅读，重检旧强限制与首次实现后的停点。
- [模型指南](https://developers.openai.com/api/docs/guides/latest-model)：Astra 对 skill/AGENTS 冲突敏感；延续已有授权；必要测试通过后仅按变化、失败和疑点复验。
- [技能说明](https://learn.chatgpt.com/docs/build-skills)：单一任务、清楚的输入输出及触发验证。访问日期均为 2026-09-14。
- taotie APR-006 已替代设计阶段限制，但需求 v5 与计划 v6 仍保留旧“尚未开工”段；当前顶部补充可澄清，但更适合职责分离与清理 living 状态。
- taotie 2026-09-14 原值查询实测报告与同目录 gate-check.log：功能查询成功、原件核对、qualified=false 得到保留；三项失败均来自 dirty。keel evidence.ts 把 ev.dirty 作为缺口且提示重复 verify。
- taotie REQ-033 的 verification 含 manual，feature_coverage 却显示黑盒六条；trace.ts 按总数减替身减缺失推算，未按类型分类。
- 9 月 12 日对话中的原值口径未知曾阻断工程接入，后续保留原值和资格限制即可继续。9 月 8 日下载对话曾未核对正确客户端操作即交给人工；局部失败不应泛化，实际访问限制不可绕过。
- DEC-017 已处理候选运行时基准和未采用引擎测试等历史过度设计，本轮不把它们当未修复现状。

## 结论

保留七个目标及内容完整性，以 CHG-019 实现证据/交付分离、类型化静态映射、manual 独立核验、current 状态职责、候选与选定义务分开、正式循环按需读取。使用既有 Node + TypeScript 与现有字段，无新依赖或门禁。

## 剩余不确定性

程序只能核对测试映射与运行报告，不能从名称验证测试质量或真实人工验收；对此持续明确提醒，审阅原始材料。对话案例只能指出可复核的执行偏差，不能证明全部由 keel 或某个模型造成。实际长期效果需后续真实任务观察。
