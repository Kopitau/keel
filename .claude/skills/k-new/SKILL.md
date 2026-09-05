---
name: k-new
description: Use when planning a new project or feature from a user need. Do not stop at a plan when the user requested implementation.
---

# k-new

F1–F4. Use the smallest planning artifact that makes the feature and its acceptance clear. AGENTS.md governs authorization, clarification and continuation.

1. Inspect existing requirements, decisions and code. Use k-grill only for missing consequential requirements.
2. Establish the actual feature and non-goals. Research material technology choices with k-research; prefer compatible, maintained solutions over novelty alone.
3. Resolve durable trade-offs with k-decide. Routine reversible choices are implementation work, not a user decision queue.
4. For substantial work, write the current requirement version and `plan/overview-vN.md`, with feature plans only where independent slices help. Map acceptance to functional tests and real coupling interfaces. Small changes can use a short scope + test obligation in the worklog.
5. Present a concise decision brief when a user choice is needed: desired result, proposed approach, consequence and the exact unresolved decision. Record applicable existing authorization instead of requesting it again.

A new confirmed baseline is versioned and APR-bound using the user's actual words. Drafts are honest working artifacts, not a ban on authorized implementation. Do not call an unseen generated plan user-confirmed.

If the request is plan-only, this round ends with the plan. If it includes building, fixing or optimizing and there is no material blocker, continue with k-impl in this turn. The end of a document is not the end of the task.
