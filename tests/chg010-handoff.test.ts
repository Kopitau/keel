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

test("REQ-012/AC-1 handoff template carries what why current phase next steps open questions and files to read", () => {
  const template = read("keel/templates/handoff.md");
  for (const heading of ["做了什么 / 为什么", "当前功能与阶段", "下一步", "未决问题", "该读文件"]) assert.match(template, new RegExp(heading));
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

test("REQ-012/AC-3 [proxy:independent harness recovery transcript not recorded] journal contract binds harness version date paths recovered next step and transcript", () => {
  const template = read("keel/templates/journal.md");
  for (const marker of ["harness", "version", "date", "paths", "next_step", "transcript"]) assert.match(template, new RegExp(marker, "i"));
});

test("REQ-012/AC-4 append-only worklog is sufficient to rebuild a skipped handoff", () => {
  assert.match(read("keel/templates/worklog.md"), /追加式，不重写历史/);
  assert.match(read(".agents/skills/k-handoff/SKILL.md"), /later agent rebuilds from worklogs/i);
});
