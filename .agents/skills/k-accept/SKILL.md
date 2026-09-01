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
2. `node tools/gate/gate.ts verify` then `check`. Keep that verify.json on disk: `gate approve` freezes its tree hash, command and counts into the APR as `evidence_*` (DEC-187), which is what proves the feature on the local tier after the worktree is gone.
3. Draft `gate new apr ...` if needed; fill artifact paths. **Acceptance and merge are two APRs and two actions** (C-44): the acceptance APR binds `summary.md`; merging happens afterwards under G-merge, never in the same turn.
4. Approval commit (DEC-190): record the user's verbatim nod in the APR first (`delegated: "「原话」(date)"`), run `gate approve APR-nnn` (it names the approver from `identities.humans`, or `--approver`), then commit with **your own** git identity — who commits is not a rule, the words are. Without the words, `gate approve`, pre-commit and X-apr all refuse.
5. Stop. Merge is F8 (`G-merge`): APR + fresh evidence + green trace + no blocking ISS (C-45).
