---
name: k-review
description: Use when reviewing implementation quality and functional evidence or running a formal plan review. Do not present a self-check as an independent review.
---

# k-review

F7 + REQ-027/028. Review the user's requested scope; a review-only request is read-only. For substantial implemented plans, use one independent review after the in-scope features are ready, not per slice. A small change may receive a clearly labeled self-check. An independent reviewer is a fresh-context subagent given relevant artifacts, not the implementation chat; same harness is fine. For formal plan acceptance or an existing loop, read [references/formal-review.md](references/formal-review.md). Ordinary review does not load that procedure.

## What the reviewer answers (REQ-028, DEC-191)

Answer these questions from the relevant scope, code and evidence. Reuse fresh evidence; run or repeat checks only when changes, failures or unresolved concerns justify them. Read `keel/review/checklist.md` for the review criteria.

1. **Standards and maintainability** — conventional, as simple as it can be, easy for someone else to change. Duplicate implementations, needless abstraction or complexity, changes outside the plan, stack traces where a plain error was due all count. Style and naming taste do not.
2. **Implemented** — the diff does what the plan's obligations and the REQ entries say, and nothing the plan forbids.
3. **Functional tests written and passing** — judge each AC by its verification type: auto needs behavioral tests at the public interface; machine-doc needs the relevant runnable protocol/document check; manual needs actual human/environment evidence or a clearly unresolved acceptance condition. A REQ-nnn/AC-i name is only a mapping, not proof of test quality or model behavior. Explain the feature evidence, proxy and missing checks; retain reasons for replaced/deleted tests.

Unchanged vendor/framework files are background, not an unsolicited audit. Review changed framework instructions/code when the task actually puts them in scope. The formal pack includes their content in keel's own repository (`review.self_hosted`); do not claim to have reviewed omitted content in a consumer pack.

**Blocking** is only a concrete unmet requirement or required evidence failing/missing for its verification type, with verifiable impact. Pure maintainability preferences are advisory (C-41). Do not require black-box model tests for prose. Use relevant requirement-boundary and failure evidence when warranted. No unsolicited fuzzing campaign, probe framework or mutation runs; do not rerun fresh full-suite evidence round after round.

## Report

Name actionable findings with their requirement impact, evidence and file location. Explain which behavior was verified and what remains unverified. A code review does not certify manual acceptance, remote CI or merge authorization. Record an ordinary review in the relevant worklog; only the formal workflow needs the loop products.

The existing G-done plan condition requires a formal loop once every active feature has a summary. An ordinary worklog review does not satisfy that condition. If it applies, use the formal reference for authorized plan acceptance; otherwise report that remaining condition without claiming the full gate passed or reopening unrelated features.
