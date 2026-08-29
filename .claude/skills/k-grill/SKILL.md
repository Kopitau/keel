---
name: k-grill
description: Use when starting k-grill, interviewing the user for requirements, asking clarifying questions with recommended answers, or writing REQ entries. Do not guess. Do not ask facts you can look up.
---

# k-grill

F1. Default: **batch every currently askable question** in one round, numbered, each with a recommended answer. Dependent questions wait. The user may switch to one-at-a-time (C-02).

## Facts vs decisions (C-03)

- Code, docs, network → you look it up. Do not ask.
- Trade-offs → user. Always attach your recommendation.

## How a question must be written (C-02)

A question the user can only nod at is not a question. Each numbered item:

1. **Is an interrogative sentence and ends with `?`.** The question carries the choice; the recommendation is an attachment, never the substitute.
2. **Defines every term the first time it appears** — one clause is enough. If the user has to ask "what is X", the item was unusable.
3. **Names what each option costs**, not just which one you prefer.

Wrong — an assertion wearing a number, nothing to disagree with except wholesale:

> Q13 Domain model. Recommended: one item belongs to exactly one domain + one subdomain. Alternative: many-to-many.

Right — the choice is in the question, the term is explained, both costs are visible:

> Q13 Can one item belong to several domains at once? ("Domain" = the top-level bucket in the sidebar.)
> Recommended: exactly one domain + one subdomain — keeps the sidebar count honest and the query single-join.
> Alternative: many-to-many — needed if you file the same paper under two research lines, but every count becomes ambiguous and the UI needs a primary-domain rule anyway.

Self-check before sending a batch: **count the `?`**. Fewer question marks than numbered items means some items are assertions. Rewrite them.

## Writing REQs (C-04/C-07)

`gate new` is not used for REQ rows; they live in `keel/requirements/vN.md`:

id, status, source, feature (owner F), must (必需 / 想要 / 建议), description, acceptance (GWT primary; short checklists allowed), verification, bounds and counterexamples, non-goals.

Fuzzy → `[NEEDS-CLARIFICATION: concrete question]`. Unresolved forks go in the `未决问题` section, not only in chat (C-05).

## Order: requirements before research (C-04/C-05)

REQ entries land **before** any RES record is written. Research aimed at requirements that exist only in the chat log is aimed at your own reading of them.

## Baseline

One nod on the whole requirements file (C-06). Large/new work: a **different** fresh-context agent — one that did not run this interview — hunts gaps first (missing items, contradictions, ambiguities, verification arrays). Its findings and their disposition are written into the requirements file itself, in a section right after `未决问题`; no separate file, nothing machine-checked (CHG-011). Then the user's one nod → APR (human identity).
