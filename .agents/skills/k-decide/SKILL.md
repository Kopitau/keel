---
name: k-decide
description: Use when starting k-decide, recording a technical decision, presenting options to the user, or writing a DEC file. Do not mark a decision confirmed yourself.
---

# k-decide

F3. One decision, one file (C-13). `node tools/gate/gate.ts new dec <title>`.

## Body

Machine header: id, title, status, date, features, research, adr flag.

Chinese body: question → options → recommendation → **user’s words verbatim** → impact.

Status: `proposed` → `confirmed` / `provisional` (reason + review trigger) / `deferred`. Overturn → `superseded` pointing at the new DEC (C-14).

Write in the same round as the user’s answer (C-15). Do not batch confirmations to the session end.

## ADR mark

If all three hold — hard to reverse, surprising without context, a real trade-off — set `adr: true` and add consequences + review terms. No second ADR directory (C-16).

Low-level reversible implementation choices: worklog, not a DEC (C-17). Touching a confirmed boundary: stop (C-21).
