---
id: ISS-015
status: closed
defense_kind: "项目规则"
defense_pointer: "keel/lessons/LES-002-git-stdout-bad-file-descriptor.md"
feature: f17-gate
fingerprint: "git-stdout-bad-file-descriptor"
date: 2026-08-24
---

# ISS-015 本环境 git 写 stdout 报 Bad file descriptor

## 现象

实施期多次 `git status`/`log` 对当前 shell 的 stdout 失败，提交其实成功。连试多条命令才改用 Python `capture_output`。

## 闭环选择与理由

**经验**：本环境读 git 用 Python subprocess 捕获，并以 `.git/refs/heads/master` 核对 HEAD。不把空 stdout 当成失败。LES-002。
