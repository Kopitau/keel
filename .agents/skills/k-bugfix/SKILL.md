---
name: k-bugfix
description: Use when starting k-bugfix, fixing a bug, reproducing a failure, or adding a regression test. Do not use for feature work or requirement changes.
---

# k-bugfix

F10. No reproduction → do not fix; only gather data (C-60).

## First

`node tools/gate/gate.ts status`. Open or create an ISS (`gate new iss <title>`). Write the **repro command** in the issue.

## Procedure

1. Reproduce. Record the command, hypotheses, and each check in the worklog (C-60).
2. Write a regression test that **fails without the patch and passes with it** (C-35). Red evidence for core bugs.
3. Minimal fix. Do not expand into a feature.
4. If the same fingerprint already has a defense, explain why it failed and step one level up the ladder (C-61).
5. Three failed fix attempts → stop and escalate architecture; do not keep guessing (C-60).
6. Close the ISS with the defense kind + pointer to a real file (C-62). Prefer: regression test, then lint, then gate/hook, then a short rule, then a DEC, else explicit wontfix + reason (C-59).

Same fingerprint, same feature, ≥3 times → tag `#经验候选` for k-log / F13 (C-61/C-78).

## Done

ISS has repro, root cause, fix, why-not-caught, and a defense pointer that exists on disk. `gate verify` includes the new test.
