---
id: ISS-016
status: wontfix
defense_kind: "显式不修"
defense_pointer: "keel/lessons/LES-003-tdd-and-ci-need-remote.md; tests/p2-rework.test.ts golden hash"
feature: f24-cross-platform
fingerprint: "ci-never-ran-no-remote"
date: 2026-08-24
---

# ISS-016 无远端因此 CI 从未运行（P2-6）；CODEOWNERS 无真人（P2-7）

## 现象

用户确认 2A 本地档。workflow 矩阵只是文件。CODEOWNERS 仍是 `@YOUR-GITHUB-USERNAME`。

## 闭环选择与理由

**显式不修直到远端与 GitHub 用户名**。本波补 DEC-148 golden digest + CRLF 内存对账；local 档 `X-owners` skip。不编造用户名、不假装 Actions 跑过。
