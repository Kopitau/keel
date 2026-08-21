---
id: OSS-002
project: typescript
repo: https://github.com/microsoft/TypeScript
version: 5.8.3
license: Apache-2.0
reuse_kind: dependency
features: [F17, F24]
review_days: 28
next_review: 2026-09-18
---

# OSS-002 typescript

## 复用点

唯一允许的 **devDependency**（DEC-154）。用于 `tsc --noEmit` 门禁，不进入 gate 运行时。声明：根 `package.json`。

## 本地差异

无 fork。不把 tsc 编进运行路径。

## 追踪计划

关注 erasableSyntaxOnly 与 Node 类型剥离兼容性。不自动升级。
