---
id: OSS-001
project: pytest
repo: https://github.com/pytest-dev/pytest
version: 9.1.1
license: MIT
reuse_kind: dependency
features: [F6, F21, F23]
review_days: 28
next_review: 2026-09-18
---

# OSS-001 pytest

## 复用点

本仓 python-cli 画像的测试运行器（C-126）。W1 格式测试 `tests/test_w1_skeleton.py` 通过 `python -m pytest` 调用。声明文件：`tests/requirements.txt`。gate 脚本本身零第三方依赖（C-101）。

## 本地差异

无 fork、无 vendoring。

## 追踪计划

关注发行说明与安全公告。只读复查，不自动升级。传递依赖（pluggy/packaging/iniconfig/pygments/colorama）不单独登记（C-89）。
