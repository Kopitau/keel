---
name: k-bugfix
description: Use when diagnosing and fixing an authorized defect with regression evidence. Do not expand a diagnosis-only request into implementation.
---

# k-bugfix

F10. Establish the cause from a reproducible failure or concrete code/log evidence. AGENTS.md governs scope and persistence.

Inspect the relevant issue and behavior. A trivial defect can use the worklog; use `gate new iss <title>` when an issue needs durable tracking. Record the actual symptom and evidence, not a fabricated repro.

1. Reproduce when feasible. If environment-dependent, narrow the cause with logs, code and checks; explain what could not be reproduced.
2. Add a meaningful regression at the public interface when practical. Prefer evidence that fails before the fix and passes after, without reverting unrelated user work or adding mutation infrastructure.
3. Make the smallest coherent fix, run relevant tests, and investigate unexpected failures.
4. After repeated failed attempts, change the hypothesis or gather different evidence. Stop only for a concrete need for user input/authority, not an arbitrary attempt count. An existing formal review fuse remains a real gate.
5. Record root cause, fix, validation and relevant remaining limits. Close an ISS with the existing schema's defense kind/pointer, or justified wontfix.

For recurrence, retain the original fingerprint/`recurrence_of` and explain why the earlier remedy failed. Choose a proportionate improvement; do not automatically escalate a regression test into a hook, gate or permanent instruction.

Use k-evidence at delivery. If the user only requested diagnosis, report the evidence-backed cause and proposed remedy without applying it.
