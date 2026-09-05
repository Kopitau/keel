---
name: k-grill
description: Use when turning a user need into testable requirements or resolving consequential ambiguity. Do not repeat answered questions or turn a clear request into an interview.
---

# k-grill

F1. Anchor the need before optimizing its implementation. Apply AGENTS.md's authorization and clarification rules.

## Discover the actual feature

Read the user's request and relevant existing requirements, code and usage evidence. Separate the desired outcome from a suggested implementation. Identify who uses it, the observable result, necessary constraints and what is out of scope. Do not ask facts you can inspect.

For a small change, a short scope in the worklog is enough. For a new project or substantial feature, write REQ entries in `keel/requirements/vN.md`: id, source, description, acceptance, bounds/counterexamples and non-goals. Write Given/When/Then where helpful; a simple checklist is fine.

## Clarify only what matters

Ask when plausible answers would materially change behavior, scope, cost, safety or an irreversible action. Group only independent blocking questions; use a recommendation with its consequence when useful. No fixed question count, punctuation test or exhaustive questionnaire.

Reuse prior answers and authorization. State safe reversible assumptions and proceed. A blocking uncertainty is `[NEEDS-CLARIFICATION: specific question]` on the affected branch in 未决问题, not a reason to stop unrelated work. Do not invent preferences or call assumptions confirmed.

Research may run before all details are settled when it helps establish feasibility or explain a choice. Do not force a finished requirement document before learning whether the feature is possible.

## Close

Summarize the need, smallest useful feature, acceptance and boundaries in plain language. If the user already asked for implementation and material choices are resolved, continue to it. For plan-only work, return the plan. Ask for one consolidated decision only when an unresolved choice actually requires it.

For a complex or consequential scope, an independent gap check can help; it is not mandatory for every baseline and cannot manufacture another approval round. Record useful findings with the requirements, not in another process layer.
