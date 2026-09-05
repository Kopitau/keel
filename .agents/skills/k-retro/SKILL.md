---
name: k-retro
description: Use when summarizing a completed feature or meaningful iteration for future work. Do not invent issues, decisions or lessons to fill a template.
---

# k-retro

F9. Preserve the useful outcome, not another ceremony. A small change may need only a worklog entry; a feature completion claim needs its evidence-backed summary.

## Feature summary

Use `keel/features/<slug>/summary.md` and `keel/templates/summary.md` when the feature is actually complete. Update it for later iterations; do not freeze a living summary forever.

Explain what/why, the technical route, significant decisions, functional evidence and known limits. Cite DEC/RES when they exist. Omit empty discussion; rejected alternatives and cost notes are not quotas.

Compress the worklog's useful conclusions into the summary while preserving the raw worklog. Later sessions start from the summary and inspect earlier entries only when needed. A summary is a completion claim G-done checks, not proof on its own.

## Close relevant loose ends

Update `keel/OVERVIEW.md` if project capabilities or in-flight work changed. Close verified ISS or mark justified wontfix; revisit a provisional DEC only when its trigger occurs. Do not confirm decisions on the user's behalf.

For an existing `#经验候选`, append a bounded lesson or rejection to its worklog line (`→ 经验：` / `→ 弃`). No LES files and no requirement to find a lesson in every change.

Update k-handoff when continuity requires it, then continue only the next slice authorized by the current task. A historical frontier is not a backlog assignment.
