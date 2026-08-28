import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { measureAutoload } from "../tools/gate/autoload.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { inspectSkills } from "../tools/gate/skills.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const line = (stdout: string, id: string): string => stdout.split(/\n/).find((value) => value.includes(` ${id}  `)) ?? "";

test("REQ-020/AC-1 AGENTS line budget is checked and a chain over 32 KiB hard-fails", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-budget-"));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel", budget: { agents_md_max_lines: 150, agents_md_chain_max_bytes: 32768 } }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "x".repeat(32_769), "utf8");
  assert.match(line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-budget"), /^FAIL.*32769 bytes > 32768 hard/);
  const actual = readFileSync(join(repo, "AGENTS.md"), "utf8").trimEnd().split(/\n/).length;
  assert.ok(actual <= 150, String(actual));
});

test("REQ-020/AC-2 records directory content is never part of root autoload measurement", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-autoload-"));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "root\n", "utf8");
  const before = measureAutoload(root);
  writeFileSync(join(root, "keel", "large-secret-record.md"), "secret".repeat(100_000), "utf8");
  assert.deepEqual(measureAutoload(root), before);
});

test("REQ-020/AC-3 skill count over cap is a machine failure that calls for sinking or config plus DEC", () => {
  const issues = inspectSkills(repo, 500, 1024, 15);
  assert.ok(issues.some((issue) => /skills > cap 15/.test(issue.message)), JSON.stringify(issues));
  assert.match(readFileSync(join(repo, "tools", "gate", "platform-limits.md"), "utf8"), /Skill count/);
});

test("REQ-020/AC-4 every hard-limit number has a dated source", () => {
  const doc = readFileSync(join(repo, "tools", "gate", "platform-limits.md"), "utf8");
  assert.match(doc, /Source \(retrieved \d{4}-\d{2}-\d{2}/);
  assert.match(doc, /32 KiB hard/);
  assert.match(doc, /DEC-150/);
});
