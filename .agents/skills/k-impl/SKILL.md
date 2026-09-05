---
name: k-impl
description: Use when implementing an authorized feature or change through functional verification. Do not expand the task to unrelated planned work.
---

# k-impl

F4/F6. Deliver the user's requested outcome. The current request, applicable requirements and AGENTS.md's working contract define scope; a plan is a tool for delivery, not a second authorization requirement.

## Start

Read the relevant plan and worklog/summary, not every historical feature. Resolve missing consequential requirements; reuse existing answers and research. A clear small change needs only scope and a meaningful test.

Daily solo work may stay on the current branch (trunk). A new feature's worktree is recommended when isolation helps; a second concurrent feature must use a separate worktree. Never overlap writes; do not create isolation merely to edit one sentence.

## Loop within the requested scope

1. Implement a useful vertical slice with simple, conventional code. Reuse established boundaries; add abstractions only for a concrete present need. Keep future iteration easy without building speculative infrastructure.
2. Test the promised behavior through its public interface and relevant integration/failure paths. A regression should demonstrate the defect when feasible; do not revert working user code or run mutation tools just to manufacture a red result. Record the actual before/after evidence.
3. Diagnose failures and repair in scope. If the same attempt fails repeatedly, change the hypothesis or gather better evidence. Continue useful work unless a concrete blocker needs user input. An existing fused formal review is not silently bypassed.
4. Record meaningful choices, outcomes and remaining risks in the worklog. Use k-log for a real issue; do not create problems, lessons or rejected alternatives to fill a quota.
5. At delivery, use k-evidence for the changed feature and affected integrations. A passing verify/check on the same relevant tree can be reused for review and authorized delivery.
6. Update the feature summary with k-retro when it helps continuity; keep prior evidence available. Continue the next in-scope slice without waiting for a new prompt.

## Review and finish

For a substantial plan, review once after its in-scope features are implemented (k-review), not once per slice. A small change can receive a proportionate self-check; label it honestly, never call it an independent review.

Do not stop at a phase boundary or start an unrelated frontier feature. If only part is blocked, finish the rest and identify the exact missing input. If delivery is complete, explain the result and verification; user acceptance is not fabricated.

For a notebook-to-pipeline change, move reusable logic into a module and add a core test.

Read `keel/templates/feature-plan.md` only when creating or versioning a feature plan. Read k-change when an authorized request changes frozen semantics; that skill must reuse the current authorization.
