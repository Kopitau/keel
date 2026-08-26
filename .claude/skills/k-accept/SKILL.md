---
name: k-accept
description: Use when starting k-accept, presenting a feature for human acceptance, or drafting an APR after review. Do not merge; acceptance is not merge (C-44).
---

# k-accept

F7.5 + F18. The user nods; you do not.

## Pack these five (C-43)

1. Requirement-by-requirement checklist
2. Feature + linkage test results (`gate verify` / `gate trace`)
3. Evidence pointer (`keel/evidence/verify.json` after verify; tree hash must match)
4. Review conclusion and leftovers
5. Known limits and provisional DECs

## Procedure

1. `node tools/gate/gate.ts loop status` must be `passed`. If not, stop — review is required before acceptance (REQ-027). **Do not automate the human nod.**
2. `node tools/gate/gate.ts verify` then `check`.
3. Draft `gate new apr ...` if needed; fill artifact paths.
4. Approval commit, two legal paths (C-107/DEC-166): the user runs `gate approve APR-nnn` + commits themselves; **or** the user explicitly tells you to do it — then record their verbatim words in the APR first (`delegated: "「原话」(date)"`), and only then approve + commit under their git identity. Without that record, `gate approve` and pre-commit refuse in an agent environment. Never use an agent git identity for the commit.
5. Stop. Merge is F8 (`G-merge`): APR + fresh evidence + green trace + no blocking ISS (C-45).
