---
name: k-decide
description: Use when recording a consequential durable technical trade-off or an actual user decision. Do not turn routine implementation choices into approval requests.
---

# k-decide

F3. Separate deciding how to implement from deciding what the user wants. AGENTS.md supplies the boundary.

A DEC is useful when a choice is hard to reverse, would surprise someone without context, and involves a real trade-off. Otherwise implement within scope; record a non-obvious choice briefly in the worklog if it helps the next maintainer. Do not create a DEC for every user answer.

## Record a durable decision

`node tools/gate/gate.ts new dec <title>`

Use `keel/templates/DEC.md`: problem, genuine options, recommendation and rationale, consequences and review trigger. Link research when the choice depends on external evidence. Do not manufacture alternatives or request confirmation of low-level choices.

A material choice reserved to the user needs a concise question. Reuse an applicable previous answer: record its date and verbatim words once, with the scope it authorizes. Do not mark a decision confirmed yourself or invent a quote.

An agent-selected implementation choice is not a user-confirmed DEC. When a durable choice is reasonably provisional within authorization, label it proposed/provisional, explain reversibility and the condition for revisiting it. Do not present an already-settled decision as unresolved merely because it was not in this file.

Only revisit when a changed requirement or new evidence matters. Status counts and old proposed records are navigation, not instructions to reopen all past choices.
