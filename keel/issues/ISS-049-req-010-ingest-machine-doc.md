---
id: ISS-049
status: closed
defense_kind: "需求修订"
defense_pointer: "keel/requirements/v4.md; keel/changes/CHG-010-requirements-v4-stabilization.md"
feature: "F10"
fingerprint: "v4-req010-ingest-verification-kind"
date: 2026-08-27
---

# ISS-049 REQ-010 的 ingest 攻击探针行为被错误标为 machine-doc

## 现象

复现命令：

```
node -e "const fs=require('node:fs');const s=fs.readFileSync('keel/requirements/v4.md','utf8');const c=fs.readFileSync('keel/changes/CHG-010-requirements-v4-stabilization.md','utf8');const b=(s.match(/## REQ-010[^\n]*\n[\s\S]*?(?=\n## )/)||[])[0]||'';const v=((b.match(/\*\*verification\*\*: \[([^\]]+)\]/)||[])[1]||'').split(',').map(x=>x.trim());const bad=v[1]!=='auto'||!c.includes('F10 计划必须新增正反向黑盒验收')||!c.includes('review ingest')||!c.includes('clear 只接受同一探针');process.exit(bad?0:1)"
```

## 根因

DEC-182 扩写了 AC 行为，但 verification 数组仍沿用修改前“只验记录结构”的 machine-doc 分类。

## 修复

REQ-010/AC-2 改为 auto；CHG-010 明确写出“F10 计划必须新增正反向黑盒验收”，覆盖 ingest 首次实跑、拒绝开单与 clear 的退出码状态转换；本 ISS 探针同时检查两份工件，不能只修一半。

## 为何未被更早发现

上一轮只核对 AC 与 verification 数量等长，没有在 AC 语义变化后重新分类对应验证方式。

## 闭环选择与理由

选择需求修订：错误位于 proposed v4 的 verification 分类；以可运行探针复核，批准后的实现计划再落黑盒守卫，无需现在修改 gate。

可能复发的不许只留档。


REQ-010/AC-2 已因 DEC-182 扩展为可观察的运行时行为：ingest 必须在未修复树实跑攻击探针，并且只在退出 0 时开 blocking ISS；但该 AC 对应的 verification[1] 仍是 machine-doc。v4 自己规定 auto 用黑盒验收测试证明行为，而 machine-doc 只验证流程/记录协议的结构或一致性，因此当前类型允许 F10 仅检查文字或结构而不证明 ingest 真的执行先验真。REQ-027 的同一行为已经正确标为 auto，更凸显两个 owner 义务不一致。应把 REQ-010/AC-2 的 verification 改为 auto，并让 CHG-010 的 F10 规划/测试义务明确覆盖 ingest 的正反向黑盒探针。
