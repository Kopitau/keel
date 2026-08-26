---
id: ISS-043
status: closed
defense_kind: 回归测试
defense_pointer: tests/r6-field-guards.test.ts
feature: F2
fingerprint: existence-checked-content-not
date: 2026-08-26
---

# ISS-043 G-research 只判文件存在，从不打开看

## 现象

改动前，一个空的 `RES-001.md` 就能满足 G-research 对 DEC 调研指针的全部要求。C-08 的档位声明、C-09 的报告结构与引用要求，没有任何机器判据。

复现命令（改动前）：

```
printf -- '---\nid: RES-001\n---\n' > keel/research/RES-001-x.md
# DEC 指向它 → G-research PASS
```

## 根因

与 [[ISS-037]] 同族：判据停在"存在性"。文件存在被当作调研发生的证据，而这两者之间没有必然联系。

## 修复

`tools/gate/rescheck.ts`：档位（`depth:`/`level:` 双字段名）必须声明且为三档之一；四个承重节前缀匹配（调研问题 / 检索范围|方法 / (逐项)?证据 / 结论）；标准与深度档正文至少一条 http 引用；bootstrap 包装文件改验 source_path 存在且 ≥1KB。

**判据校准过程**（ISS-038 教训的执行记录）：初稿按模板六节严格判——上线前拿本仓 RES-901/902 实测，发现真实记录用 `level:` 不用 `depth:`、用 `## 检索范围与方法` 不用 `## 检索范围`、RES-901 无候选对比节但对比在正文。按六节判会误杀两份高质量真报告，遂收敛为四承重节 + 前缀匹配。守卫测试专门有一条：**本仓全部 RES 必须通过自己施加给别人的底线**。

## 为何未被更早发现

同 [[ISS-037]] 的自举盲区：keel 自己的 RES 都是真报告，"空壳 RES"在自举仓库从未出现。

## 闭环选择与理由

选**回归测试**：六条 fixture 测试（空壳 FAIL / 真实变体 PASS / 无引用 FAIL / 本地档豁免引用 / 包装文件按源判 / 本仓自检），判据后续被改松或改严都会被测试钉住。
