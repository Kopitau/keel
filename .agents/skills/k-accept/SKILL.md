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

1. `node tools/gate/gate.ts verify` then `check`.
2. Draft `gate new apr ...` if needed; fill artifact paths.
3. Ask the user to run `node tools/gate/gate.ts approve APR-nnn` with a **human** git identity (C-107). Agent identities are rejected.
4. Stop. Merge is F8 (`G-merge`): APR + fresh evidence + green trace + no blocking ISS (C-45).
