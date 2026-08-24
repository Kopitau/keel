---
id: LES-001
date: 2026-08-24
features: [F17, F23]
destination: project
source_candidates: [ISS-014]
---

# LES-001 已批准的运行时变更未读完就开工会整波作废

## 现象

第一次 W1 按 Python/pytest 写了代码。CHG-001 / DEC-149 已经把 gate 改成 Node+TS。用户令回滚。

## 教训

开工第一读物是 handoff **和未关闭的 CHG**。运行时/语言选择已经拍板就不要用旧栈「先写着」。

## 适用边界

自举仓、运行时变更单已批准。

## 反例

消费项目仍可用 python-cli 画像；那是用户项目测试，不是 gate 运行时。

## 去向

本项目正式规则：gate 运行时只允许 Node 内置模块（DEC-149/154）。
