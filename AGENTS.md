<!-- keel:begin -->
# keel

keel keeps requirements, decisions and evidence beside the code. It is not a model orchestrator. Prefer capable-model judgment over procedural detail.

## Working contract

Serve these outcomes: anchor the user's need; identify the smallest useful feature; research a current, mature solution; write clear code; verify behavior; keep iteration and extension straightforward; explain the result plainly.

- The current user request defines the task. Relevant earlier requirements and authorization remain valid until changed or revoked. A request to build, fix or optimize includes implementation and proportionate verification; a request only to review, diagnose or plan does not.
- User instructions take precedence over this file and skills. Within repo guidance, this working contract resolves conflicts; current requirements and plans supply project-specific scope. Historical DESIGN / DEC / CHG text is context, not another active checklist. Do not restart a completed phase because an older record says to.
- Continue through the authorized outcome, not just the next document. Routine, reversible implementation choices are yours. Do not ask again for permission already given, and do not treat skill discovery, a plan or an approval as permission for unrelated external actions.
- Ask only when missing information materially changes the required behavior, scope, cost, data safety or an irreversible/external action and cannot be established from available evidence. Ask the smallest useful question, explain the consequence and recommend an answer when useful. Continue unaffected work.
- A safe, reversible assumption may be stated and used. Never invent a user requirement, approval, research result, test result or acceptance.

## Start and navigate

At a new session or after losing context, run `tools/gate/gate.sh status` (Windows: `tools/gate/gate.ps1 status`; direct: `node tools/gate/gate.ts status`). Read its handoff, then only the current task's plan and worklog/summary. Do not repeat these reads every turn or bulk-load records.

`gate status` is an index, not a task assignment. A frontier or missing summary does not authorize starting historical work; reconcile it with the user's request and handoff. If navigation is stale, inspect the relevant code and correct the handoff.

## Work at the right scale

- Small, clear changes need a short scope and a meaningful check, not a new project ceremony. Larger work needs a concise requirement → feature → technical approach → implementation plan. Reuse decisions and ask only for unresolved material choices; do not collect separate confirmations for each document.
- Research consequential technology choices with current primary sources: compatibility, maintenance, production maturity, costs and relevant advances. Prefer the existing stack when it meets the need. Record significant findings in RES; a narrow check can live in the worklog. Do not manufacture alternatives or dependencies.
- Implement → test → fix → record a useful summary → continue the next in-scope slice. Do not stop just because a skill, feature or planning phase ended; do not expand to unrelated frontier features.
- Verify observable behavior at the public interface. Test the changed feature and relevant integration/failure paths; scale effort to risk. A wording change needs review, not a test per sentence. Use fresh passing evidence for an unchanged code tree; rerun after relevant changes.
- Stop when the requested outcome is delivered, the user pauses/changes it, or a concrete blocker needs new information/authority. If blocked, report the exact missing piece and completed unaffected work. A failed attempt calls for a better diagnosis, not an automatic stop or a new permanent gate.

## Records and safety

`CONTEXT.md` maps the records. Skills add task-specific mechanics, not additional authorization barriers.

- Preserve confirmed history: a semantic change gets a new version and a short CHG; metadata and genuine typo fixes may be edited with the existing APR reference. An explicit request to change a rule authorizes that change's implementation, not a claim that the user has accepted its unseen result.
- Record authorization once, in scope, using the user's verbatim words. Never mark a proposed artifact or an APR approved without applicable user authorization; formal acceptance and merge remain distinct actions, but already-authorized actions need no repeat question.
- Write a DEC only for a consequential, durable trade-off; ordinary implementation choices need no decision file. Records explain work, not generate it. No issue, lesson, alternative or document quotas.
- In parallel work, use one feature per branch/worktree and serialize overlapping files. Solo work may stay on the current branch; use isolation when it is useful. Preserve unrelated user changes.
- For keel itself: Node ≥22.18.0; TypeScript runs directly with Node builtins only at runtime. No runtime npm dependencies. A new dev dependency must have a concrete need and a recorded trade-off; adding one is not a prerequisite for this workflow. OS matrix: Windows + macOS (dev) + Linux (CI).
- Hash normalized UTF-8 / no BOM / LF. Approved-artifact integrity and actual functional evidence remain required. Records do not move the evidence tree. Do not hand-edit verification JSON or bypass a failing check.

## Skills and checks

Load a matching skill when its workflow helps the task; do not chain the entire catalog. Implementation, research and verification can be selected naturally. Existing explicit-entry skills remain `k-init`, `k-migrate`, `k-accept`; invocation is not authorization.

`gate check --quick` runs in pre-commit. Before delivering code, review or merge, use `gate verify` and the full `gate check`; reuse their passing evidence if the relevant tree and requirements are unchanged. CI reruns checks and is authoritative for CI claims. A local pass is not a claim that remote CI or manual acceptance happened.

Other commands: `gate new`, `index`, `trace`, `sync`, `worktree`, `approve`, `hash`, `loop`, `review`. Do not invent platform-private process commands. Skills live in `.agents/skills/k-*/SKILL.md`; `gate sync` generates the Claude mirror. `CLAUDE.md` is exactly `@AGENTS.md`.

## Hand off clearly

Explain what changed and why, which requested features have passing functional evidence, and what remains unverified or blocked. Separate implementation complete, local checks passed, remote delivery and user acceptance. Do not substitute gate names or a bare test count for meaning.

A work-closing reply ends with a paragraph beginning `下一步：`: one useful next action, or state that no action is required. Ask for a decision only if it is genuinely still missing. Keep records in Chinese; skill bodies, field names and script output in English.
<!-- keel:end -->
