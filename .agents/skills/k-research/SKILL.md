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

## Gates

Major DECs must point at a RES **or** a written exemption (C-10). Choosing an open-source component → k-log / OSS entry (C-11); `gate new oss`.

G-research opens every RES: tier declared (`depth:`), 调研问题/检索范围/证据/结论 sections present, and ≥ 1 citation for 标准/深度 (C-08/C-09). A filename is not research.
