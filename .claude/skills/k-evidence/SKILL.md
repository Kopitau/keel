---
name: k-evidence
description: Use when verifying feature completion or checking evidence freshness. Do not confuse a successful local check with user acceptance or remote delivery.
---

# k-evidence

F6. Report what ran, its exit and the relevant tree hash; do not substitute a chat claim for evidence.

## Check at the right scale

During implementation run focused checks for the changed behavior and relevant integration/failure paths. Before code delivery use:

```
node tools/gate/gate.ts verify
node tools/gate/gate.ts trace
node tools/gate/gate.ts check
```

`verify` runs the configured test command and typecheck when configured, and writes `keel/evidence/verify.json`; never edit it by hand. Only that configured full command produces formal gate evidence. Targeted checks help diagnosis but do not replace it.

Reuse a passing result when its code tree and relevant requirements are unchanged; do not rerun the full suite separately for completion, review and merge. Rerun after meaningful code/config/test changes or unresolved failures. Record-only edits do not move the evidence tree (DEC-192), but changed acceptance still needs trace/review. Uncommitted verified content remains valid evidence; G-merge checks current uncommitted code separately. Committing identical content needs no new test run. Report stale review or delivery gaps accurately.

## Explain coverage honestly

Auto behavior and machine-doc checks name `REQ-nnn/AC-i` for mapping. Behavioral tests assert the promise through an appropriate public interface, including relevant boundary/failure inputs even when the requirement does not enumerate them. Core regressions should show the defect when practical; no blanket red-first, coverage or mutation gate. A documentation consistency check proves its narrow invariant, not that a model or person will behave correctly.

Scale tests to risk; do not add a test for every sentence or mirror implementation branches mechanically. When replacing or removing a test, record the superseded obligation and preserve meaningful coverage.

A `[proxy:<release condition>]` must name the real environment, feature, issue or interface needed to replace it. Proxy is WARN, not PASS. `trace` and `feature_coverage` are static mappings by verification type, not per-AC test results. Report actual run results from verify/JUnit; inspect the referenced real evidence for manual criteria separately. A helper test or summary cannot certify manual acceptance, and an unresolved manual condition is not a demand for a fake automated test. Distinguish implementation complete, local validation, remote CI and user acceptance.

`gate check --quick` is the pre-commit check, not the full gate. `gate hash <file>` hashes an approval body. Local APR evidence snapshots remain supported; never fabricate one.
