---
name: k-review
description: Use when starting k-review, independently reviewing a feature diff, or checking correctness against requirements and the feature plan. Do not use if you wrote the implementation in this context.
---

# k-review

F7. Fresh context only. You report; you do not patch (C-39/C-41).

## Input (give the reviewer only these)

- Diff
- Feature `plan/vN.md` and its test obligations
- REQ entries in scope
- Evidence JSON from `gate verify`
- Worklog **summary**, not the implementation chat (C-39)

## Two axes

1. **Spec** — every acceptance criterion has a real test (not a tautology). Flag skipped/deleted tests without ISS/DEC (C-34).
2. **Engineering** — only issues that affect correctness or meeting the requirement. No nitpicking (C-41).

Label blocking vs advisory. Blocking returns to k-impl; re-review in a **new** clean context (C-42). Advisory does not block.

Heterogeneous-harness review is optional and off by default (C-40).
