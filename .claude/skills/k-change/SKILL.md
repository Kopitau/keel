---
name: k-change
description: Use when an authorized change alters frozen requirements or plans. Do not edit a confirmed version's semantics in place or ask again for the same authorization.
---

# k-change

F11. Preserve history while allowing the user to change direction. Apply AGENTS.md's working contract.

1. Read the relevant current requirements/plan and the user's change request. Existing authorization applies to the scope it actually covers.
2. `node tools/gate/gate.ts new chg <title>`. Briefly record why, the semantic change, affected features and functional checks. A request to optimize these rules authorizes implementation of that scope; it is not acceptance of unseen results.
3. Version affected frozen artifacts rather than rewriting them: a complete requirements/overview version and affected feature plans when necessary. Use replaces/change metadata. Small changes need no unrelated replanning.
4. Keep generated detail proposed/working unless the user's words actually confirm it. An authorization APR may bind the requested scope; do not call it artifact acceptance. Ask only if the change requires a new material decision or authority.
5. `node tools/gate/gate.ts index`; update current pointers deliberately. Review only affected decisions and test obligations. Records alone do not stale verify; changed acceptance still needs review.
6. A plan-level change belongs on the trunk or its own change branch, not inside an unrelated feature worktree. Retain cross-worktree id allocation; rebase affected worktrees when appropriate.

Metadata and genuine typo fixes may be edited with the existing APR reference; changing acceptance meaning needs a new version. An emergency can use a short CHG, not a second full design process.

Continue implementation when requested and authorized. Neither writing a CHG nor a draft warning is an automatic stopping point.
