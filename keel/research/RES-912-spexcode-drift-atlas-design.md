---
id: RES-912
title: SpexCode 漂移、总览与意图分层适配
date: 2026-09-15
depth: standard
features: [F25]
oss: []
source_revision: 778491766e6090c3c5e52abc0e52c5afbdac8fac
status: selected-approach
---

# RES-912 适配方案

## 来源与结论

CHG-020 选定三项，不再沿用 RES-911 “仅建议”的任务状态。访问 GitHub 官方 API、固定源码与规格；[7784917](https://github.com/shuxueshuxue/Spexcode/commit/778491766e6090c3c5e52abc0e52c5afbdac8fac) 提交时间 2026-09-14T19:33:29Z；完整树查询未截断。未安装运行上游。

- [lint/ack](https://github.com/shuxueshuxue/Spexcode/blob/778491766e6090c3c5e52abc0e52c5afbdac8fac/.spec/spexcode/spec-cli/source-of-truth/spec-lint/spec.md)：文件变动 advisory、函数锚点可阻断；ack 指定节点与理由，不吞掉其他节点变化。机械关系与语义判断分开。
- [归属/引用](https://github.com/shuxueshuxue/Spexcode/blob/778491766e6090c3c5e52abc0e52c5afbdac8fac/.spec/spexcode/spec-cli/source-of-truth/governed-related/spec.md)、[anchors 实现](https://github.com/shuxueshuxue/Spexcode/blob/778491766e6090c3c5e52abc0e52c5afbdac8fac/packages/spec-core/src/anchors.ts)：有关系解析、语言抽取与历史交集层；本轮不复制源码、不引入依赖。
- [意图分层](https://github.com/shuxueshuxue/Spexcode/blob/778491766e6090c3c5e52abc0e52c5afbdac8fac/.spec/spexcode/spec-cli/source-of-truth/three-part-body/spec.md)：可选双层兼容旧正文、标题解析识别代码块。keel 仍保留 handoff 事实与冻结历史。
- [atlas](https://github.com/shuxueshuxue/Spexcode/blob/778491766e6090c3c5e52abc0e52c5afbdac8fac/.spec/spexcode/.plugins/skills/atlas/spec.md)：选择有用节点绘图，图不能补画成未确认事实。适配为现有记录的只读投影，不新增 diagram.json 权威源。

## 采用与取舍

采用文件级 implementation/related、显式内容复核与单文件 HTML。trace/evidence 继续负责测试映射与真实报告对账；复核只绑定当时的规范/代码/证据内容与理由，不赋予审批身份。默认诊断、显式 --check 可严格检查已接入功能，不增加第九项门禁或强制旧项目补映射。

内容快照比移植 Git DAG/函数锚点更适合未提交工作、跨语言与内置库约束，维护成本低；只能比较当前与上次复核，不能证明期间从未出现又撤回的变化。理由及历史随仓库保留，哈希不裁决语义。若共享大文件噪声成为真实问题，再评估函数粒度，不预建。

图谱搜索、筛选和关联详情用于定位需求到实现，零服务/网络成本；导出实时性有限，明示生成时间与证据状态。未对上游运行、性能、跨平台或长期治理收益作实测结论；本地实现另做功能验证。
