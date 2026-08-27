---
name: k-research
description: Use when starting k-research, writing a RES report, comparing implementation options, or researching before a technical decision. Do not claim research was done without a file.
---

# k-research

F2. Declare the depth you picked (C-08):

- **Deep** — new architecture, key dependency, data model, security, public API, cross-platform, high uncertainty: 2–3 candidates, primary sources, seek counterexamples, spike if needed.
- **Standard** — local evidence + official docs + ≥1 alternative.
- **Local** — no web, but write the rationale.

Offline is not a skip: use dated, sourced offline material or stop (C-12).

## File (C-09)

`node tools/gate/gate.ts new res <title>` then fill, in plain Chinese:

question → search scope → candidate comparison → evidence (citation + access date; mark `[未核实]`) → conclusion (decision / why / alternatives) → remaining uncertainty.

Cite; do not paste whole pages (C-69).

## Parallel research (RES-904 §4)

Two or more questions that do not depend on each other → one fresh-context subagent per question, at the same time. Each subagent runs `gate new res`, writes its own file, and returns only the RES id. The parent reads `keel/research/INDEX.md`, not the bodies (C-120). Sequential research in the main context spends the interview's context on reading.

## Sources (标准 / 深度)

Facts come from primary sources: official docs, source code, specs, the vendor's own pages. Secondary write-ups (blog posts, summaries, forum answers) only for dates and outside opinion — and say so next to the citation. Quote short; paraphrase in your own structure (C-69).

## Gates

Major DECs must point at a RES **or** a written exemption (C-10). Choosing an open-source component → k-log / OSS entry (C-11); `gate new oss`.

G-research opens every RES: tier declared (`depth:`), 调研问题/检索范围/证据/结论 sections present, and ≥ 1 citation for 标准/深度 (C-08/C-09). A filename is not research.
