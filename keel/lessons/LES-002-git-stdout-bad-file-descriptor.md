---
id: LES-002
date: 2026-08-24
features: [F17]
destination: project
source_candidates: [ISS-015]
---

# LES-002 本环境 git 的 stdout 可能是坏的，提交仍可能成功

## 现象

`git status`/`log` 对当前 agent shell 报 `Bad file descriptor`，`.git/refs/heads/master` 已经更新。

## 教训

不要用空 stdout 当失败。用能捕获的 subprocess，并用 ref 文件核对 HEAD。

## 适用边界

本机 + 本 agent 包装的 git。换环境可能消失。

## 反例

测试里的 `spawnSync("git", …)` 在 node:test 下是好的。

## 去向

本项目实施笔记。不上升为全仓 hook。
