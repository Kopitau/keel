---
name: k-grill
description: Use when starting k-grill, interviewing the user for requirements, asking clarifying questions with recommended answers, or writing REQ entries. Do not guess. Do not ask facts you can look up.
---

# k-grill

F1. Default: **batch every currently askable question** in one round, numbered, each with a recommended answer. Dependent questions wait. The user may switch to one-at-a-time (C-02).

## Facts vs decisions (C-03)

- Code, docs, network → you look it up. Do not ask.
- Trade-offs → user. Always attach your recommendation.

## Writing REQs (C-04/C-07)

`gate new` is not used for REQ rows; they live in `keel/requirements/vN.md`:

id, status, source, description, acceptance (GWT primary; short checklists allowed), bounds and counterexamples, non-goals.

Fuzzy → `[NEEDS-CLARIFICATION: concrete question]`. Unresolved forks go in the `未决问题` section, not only in chat (C-05).

## Baseline

One nod on the whole requirements file (C-06). Large/new work: a **different** fresh-context agent hunts gaps first. Then APR (human).
