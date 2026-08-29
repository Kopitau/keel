---
name: k-retro
description: Use when starting k-retro, a feature just finished (tests green, evidence on disk), a summary must be written, OVERVIEW updated, or provisional decisions and lesson candidates closed. Do not skip the summary to mark a feature complete.
---

# k-retro

F9. Trigger: the feature is finished — its tests pass and `gate verify` evidence is on disk — or a manual project retro (C-51, CHG-011). Merge is not the trigger; after a merge only update OVERVIEW's in-flight state.

## Feature summary (`keel/features/<slug>/summary.md`) — once

Fixed sections, Chinese, no cost notes (C-52):

1. What / why (against REQs)
2. Technical route (architecture, data flow, why) citing DEC/RES
3. Key decisions and rejected options
4. Test and evidence pointers
5. Debt and known limits

Compress the worklog into it: the summary carries what the next context needs; the worklog stays as the raw process record and is not read again (DEC-183). Writing `summary.md` is the completion claim G-done judges (C-56).

## OVERVIEW

Update `keel/OVERVIEW.md` in place (living doc, C-54): what the project is, route, capability list, in-flight work, risks, provisional count.

## Close-out (C-55)

- Provisional DECs: confirm / supersede / refresh the trigger.
- ISS of this feature: closed, or wontfix with a reason.
- `#经验候选` lines in the worklog: verify and append on the same line `→ 经验：<phenomenon / lesson / bounds>` or `→ 弃 <reason>`. This arrow is the one sanctioned in-place worklog amendment (C-20 still bans rewriting anything else). No LES files, nothing machine-checked (CHG-011).

Then k-handoff (≤10 lines) and the next frontier feature from `gate status`.
