---
id: ISS-048
status: closed
defense_kind: "需求修订"
defense_pointer: "keel/requirements/v4.md"
feature: "F2"
fingerprint: "v4-legacy-res-result-scope"
date: 2026-08-27
---

# ISS-048 legacy RES 的 PASS/WARN/FAIL 未限定为引用子判据

## 现象

复现命令：

```
node -e "const fs=require('node:fs');const s=fs.readFileSync('keel/requirements/v4.md','utf8');const bad=!s.includes('引用 URL 子检查')||!s.includes('G-research 总结果仍取全部研究子检查的最严重等级')||!s.includes('legacy 不豁免候选、报告结构、重大决策 RES、OSS 登记或其他义务');process.exit(bad?0:1)"
```

## 根因

AC-6 把 URL 子检查结果简称为 G-research 结果，遗漏了与其他研究子检查的聚合关系。

## 修复

REQ-002/AC-6 已限定 PASS/WARN/FAIL 只作用于引用 URL 子检查；总结果取全部子检查最严重等级，legacy 不豁免任何其他义务。

## 为何未被更早发现

此前复核聚焦 legacy 身份与哈希防重新盖章，没有检查门禁多子项的结果聚合语义。

## 闭环选择与理由

选择需求修订：歧义位于 proposed v4；以可运行文本探针复核即可，运行时代码守卫留到批准后的实现阶段。

可能复发的不许只留档。


按现有文字，含一个 URL 但缺少候选、日期、必要章节或 OSS 登记的 RES 可以被解释为 G-research 整体 PASS；反过来，manifest 匹配也可能把其他独立错误降成 WARN。这与 REQ-002 其余 AC 冲突，并会让实现者采用不同的聚合语义。应明确 AC-6 只产生『引用 URL 子检查』的 PASS/WARN/FAIL，G-research 总结果仍按所有子检查的最严重结果聚合；legacy 身份不得豁免其他研究义务。
