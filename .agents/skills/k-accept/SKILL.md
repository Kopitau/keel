---
name: k-accept
description: Use when presenting completed work for human acceptance or recording an actual approval. Do not infer acceptance from implementation authorization.
---

# k-accept

F7.5/F18. Implementation complete, acceptance and merge are different states. AGENTS.md governs reuse of authorization.

## Present the result

Explain the requested features and acceptance results, current evidence/tree, review conclusion when applicable, and material limitations. A checklist is useful when there are multiple features; no fixed five-document package.

For a formal plan-level acceptance, check `node tools/gate/gate.ts loop status` and the full gate; do not call an incomplete or fused review passed. Reuse fresh verify/check evidence on an unchanged relevant tree. A normal local completion report does not require pretending a formal acceptance happened.

## Record what the user actually authorized

Create `node tools/gate/gate.ts new apr <title>` only when an APR is needed. Identify whether it records scope authorization, artifact confirmation, acceptance or merge; include only the artifacts and actions the user's words cover.

Record the verbatim words in `delegated:` with their date, then `gate approve APR-nnn` (`--approver` if needed). The tool hashes artifacts and snapshots available fresh evidence. Keep verify.json; do not invent evidence fields. Commit with the appropriate existing git identity; who commits does not prove approval (DEC-190).

Acceptance is not merge authorization. Conversely, if the user already authorized both and required gates are satisfied, carry out both without another question or a forced new turn. Separate actions may share one accurately scoped APR; no duplicate paperwork for the same permission.

When an actual acceptance decision is still missing, present the completed work and ask only for that decision. Continue other already-authorized actions that do not depend on it. Never write the user's acceptance for them.
