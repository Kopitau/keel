---
id: OSS-001
project: pytest
repo: https://github.com/pytest-dev/pytest
version: 9.1.1
license: MIT
reuse_kind: dependency
status: retired
retired_reason: CHG-001 / DEC-152. keel gate tests use node:test. Consumer python-cli profile may still use pytest; this repo no longer depends on it.
features: [F6, F21, F23]
review_days: 28
next_review: none
---

# OSS-001 pytest（已退役）

## 复用点

第一次 W1 曾用 pytest 跑 `tests/test_w1_skeleton.py`。CHG-001 后该测试已删除，本仓不再声明 pytest。

## 本地差异

无。

## 追踪计划

不再复查。消费项目若选 python-cli 画像，在该项目自己的 OSS 表登记。
