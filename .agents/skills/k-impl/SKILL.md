---
name: k-impl
description: Use when starting k-impl, implementing a confirmed feature, claiming a feature branch, or entering the autonomous implementation zone. Do not use before the unified plan is confirmed.
---

# k-impl

Autonomous implementation of one confirmed feature (C-20/C-21). Work unit = feature, not a task ticket.

## First

```
node tools/gate/gate.ts status
```

Branch policy (DEC-155):

- Daily / solo local work: trunk is allowed.
- **New major feature: recommend** `node tools/gate/gate.ts worktree add Fnn` (not enforced).
- Second feature in parallel, or a second person: **must** `worktree add Fnn` (C-112).

Read that feature’s `plan/vN.md` and `worklog.md`. Read the coupling table in the current overview.

## Loop

1. Append the worklog as you go (decomposition, progress, non-obvious choices). Do not rewrite history (C-20).
2. Stay inside the planned file set. Overlap with another claimed feature → serialize (C-114).
3. Core logic: tests before code. Auxiliary: tests before you call it done (C-31).
4. Two kinds of test, two kinds of name (DEC-168). A REQ id in a comment or a fixture string is not coverage; `gate trace` reads test names only.
   - **Black-box acceptance** — name carries `REQ-nnn/AC-i`. Input is only what the requirement names; assertion is only what the AC promises. Write it from the AC before the code, ideally in a context that has not seen the implementation; the implementer may add assertions, never weaken them. Only this kind certifies an AC (C-32/C-37).
   - **White-box regression / guard** — name starts with `ISS-nnn`, `DEC-nnn` or `fp:<fingerprint>`; it never carries an AC marker. Before you commit it: revert the fix, watch the test go red, restore (C-35); one worklog line.
   - **Interface contract** — name starts with `I-nn` from the coupling table (C-38).
   - **Stand-in** — an AC you cannot test black-box yet: `REQ-nnn/AC-i [proxy:<release condition>] …`. X-trace shows it as WARN, never PASS. Drop the marker when the real test lands.
5. `node tools/gate/gate.ts check --quick` often; `verify` before you claim done (C-33).

## Quality evidence (C-69/C-127)

- Longform expansion uses the same model at medium reasoning. Record model, reasoning level, artifact path, and date in the worklog; short records stay inline.
- For a token-saving candidate, record the candidate, the identified quality or functional loss, and the rejection. Never save framework tokens by weakening intelligence or function.
- A notebook is exploration, not a pipeline module. Before notebook logic enters a pipeline, move it into a module and add a core test.

## Slices (RES-904 §5–6)

The plan's 内部步骤 are slices. Every slice: verifiable by one command (`verify:` in the plan), fits one fresh context, cuts through every layer it touches (schema → API → UI → tests) so it can be demonstrated alone.

**Keep going (DEC-183).** Implement → tests → one worklog line with the evidence → `gate check --quick` → next slice. When the feature's last slice passes: `gate verify`, compress the worklog into `summary.md` (four sections), refresh `keel/handoff.md` (≤10 lines), then start the next frontier feature from `gate status`. A new context reads only summary / plan / handoff, never the compressed worklog. Stop only for C-21, a fused review, or final acceptance.

**Seams.** The plan's 测试义务 names the seam each black-box acceptance test attaches to (CLI, HTTP route, command, module API) — the highest one available, as few as possible. Write the black-box test at that seam. If the seam does not exist yet, the plan says so and the test carries `[proxy:<seam> lands in Fnn]` with exactly that release condition (DEC-168).

## Stop and ask (C-21)

Confirmed interface or data contract; requirement boundary; unplanned major dependency; confirmed test obligation.

Internal small adjustments: log an implementation decision in the worklog (C-17/C-22). Cross-feature or interface change: k-change, do not silently edit the plan.

## Done

`gate verify` green on this tree; worklog current; no undocumented interface drift.

**A finished feature does not trigger a review (CHG-011).** Write `summary.md` and move to the next frontier feature. The plan-level review loop (k-review) runs **once per plan**, after every feature of the plan is implemented; k-accept needs `node tools/gate/gate.ts loop status` = `passed`. You never review your own implementation.
