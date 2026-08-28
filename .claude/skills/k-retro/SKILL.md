---
name: k-retro
description: Use when starting k-retro, writing a feature summary after merge, updating OVERVIEW, or closing provisional decisions and lesson candidates. Do not skip the summary to mark a feature complete.
---

# k-retro

F9. Trigger: feature merged, or a manual project retro (C-51).

## Feature summary (`keel/features/<slug>/summary.md`)

Fixed sections, Chinese, no cost notes (C-52):

1. What / why (against REQs)
2. Technical route (architecture, data flow, why) citing DEC/RES
3. Key decisions and rejected options
4. Test and evidence pointers
5. Debt and known limits

## OVERVIEW

Update `keel/OVERVIEW.md` in place (living doc, C-54): what the project is, route, capability list, in-flight work, risks, provisional count.

## Close-out (C-55)

- Provisional DECs: confirm / supersede / refresh the trigger
- ISS: all closed or wontfix with reason
- `#经验候选` in worklogs: keep or discard by annotating the tag line itself — `→ LES-nnn` / `→ KLES` / `→ 弃 <reason>` (F13/C-77). `gate status` counts pending tags; G-retro fails on undisposed tags in summarized features. This arrow is the one sanctioned in-place worklog amendment (C-20 still bans rewriting anything else).

`G-retro` requires summary present, OVERVIEW newer than merge, issues closed, close-out recorded (C-56).
