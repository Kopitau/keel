# 交接 — CHG-007 全局安装器已实施

- date: 2026-08-24
- harness: Grok Build
- model: grok-4.6
- session: CHG-007 impl

## 做了什么 / 为什么

实施 CHG-007：`keel init/update/uninstall/doctor`（当前目录）+ 纯 JS `bin/keel.js` 先查 Node 再 import `.ts`；init 写干净 config、`writeTestBaseline`、hooks 可执行位；G-req/G-plan 真空 SKIP（DEC-158）；verify 在 `profiles.active=unset` 时明确失败。`private: true` 保留（git URL / `file:` 分发，不公开发布）。

## 当前功能与阶段

- 阶段：`CHG-007`
- 开场：`node tools/gate/gate.ts status`

## 下一步

1. 人类批准 CHG-007（kopit）后把 requirements `current:` 切到 v3.md（C-63）。
2. 远端 URL 以便 `npm i -g git+https://...`。
3. APR-001 仍 draft。

## 未决问题

- CHG-007 仍 proposed（实现已落地，批准未做）
- 远端 URL
- APR-001 draft

## 该读文件

1. 本文件
2. `keel/changes/CHG-007-global-installer.md`
3. `tests/chg007-installer.test.ts`
4. `bin/keel.js` `tools/cli/`
