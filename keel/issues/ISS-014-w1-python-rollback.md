---
id: ISS-014
status: closed
defense_kind: "回归测试"
defense_pointer: "tools/archive/w1-python-bootstrap.py; keel/lessons/LES-001-dont-ship-python-against-chg.md"
feature: f23-bootstrap
fingerprint: "user-ordered-w1-rollback"
date: 2026-08-24
---

# ISS-014 用户令回滚第一次 Python W1（C-76 用户纠正）

## 现象

用户 2026-08-21：「计划不完全，回滚重新实施 W1」。14 分钟内改动大量 Python 文件后整段作废。

## 闭环选择与理由

**经验 + 归档**：Python 运行时进 `tools/archive/`。CHG-001/DEC-149 之后不得再引入 gate 的 pip 依赖。LES-001。
