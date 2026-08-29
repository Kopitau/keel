import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runStatus } from "../tools/gate/status.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");

test("REQ-012/AC-1 the handoff is at most ten lines of next step and files to read, and this repo's handoff obeys it", () => {
  const skill = read(".agents/skills/k-handoff/SKILL.md");
  assert.match(skill, /at most 10 lines/i);
  assert.match(skill, /Next step/);
  assert.match(skill, /Files to read/);
  assert.doesNotMatch(skill, /keel\/journal/);
  const handoff = read("keel/handoff.md");
  const lines = handoff.split(/\r?\n/).filter((l) => l.trim().length > 0);
  assert.ok(lines.length <= 10, `handoff has ${lines.length} non-empty lines`);
  assert.match(handoff, /keel\//, "files to read are repository paths");
});

test("REQ-012/AC-2 status exposes three-jump paths overview unresolved and provisional counts", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-handoff-"));
  for (const rel of ["keel/requirements", "keel/plan", "keel/decisions", "keel/features"]) mkdirSync(join(root, rel), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "v1.md"), "[NEEDS-CLARIFICATION: choose one]\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "decisions", "DEC-001-x.md"), "---\nid: DEC-001\nstatus: provisional\n---\n", "utf8");
  const out = runStatus(makeCtx(root)).stdout;
  for (const marker of ["handoff:", "overview:", "plan_current: overview-v1.md", "provisional_decisions: 1", "needs_clarification: 1"]) assert.match(out, new RegExp(marker));
});

test("REQ-012/AC-3 [proxy:independent harness recovery transcript not recorded] the recovery drill is recorded in the worklog with harness version date paths next step and tree hash", () => {
  const skill = read(".agents/skills/k-handoff/SKILL.md");
  assert.match(skill, /worklog/);
  for (const marker of ["harness name and version", "date", "three paths read", "next step recovered", "tree hash"]) {
    assert.match(skill, new RegExp(marker, "i"));
  }
  assert.match(skill, /never a platform session file/);
});

test("REQ-012/AC-4 append-only worklog is sufficient to rebuild a skipped handoff", () => {
  assert.match(read("keel/templates/worklog.md"), /追加式，不重写历史/);
  assert.match(read(".agents/skills/k-handoff/SKILL.md"), /next agent rebuilds from the worklogs/i);
});
