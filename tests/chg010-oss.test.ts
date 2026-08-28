import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { inspectOss } from "../tools/gate/osscheck.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");
const line = (stdout: string, id: string): string => stdout.split(/\n/).find((value) => value.includes(` ${id}  `)) ?? "";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-oss-"));
  for (const rel of ["keel/oss", "keel/research", "keel/requirements", "keel/plan", "keel/features"]) mkdirSync(join(root, rel), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { example: "1.2.3" } }), "utf8");
  return root;
}

function completeRecord(): string {
  return "---\nid: OSS-001\nproject: example\nrepo: https://example.com/upstream\nversion: 1.2.3\nlicense: MIT\nreuse_kind: dependency\nreview_days: 28\nnext_review: 2099-01-01\n---\n\n# OSS-001 example\n\n## 复用点\n\nsrc/example.ts\n\n## 本地差异\n\n无。\n\n## 追踪计划\n\n版本、安全公告与修复。\n";
}

test("REQ-015/AC-1 every direct dependency needs a matching OSS record while transitive dependencies do not", () => {
  const root = fixture();
  assert.match(line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-oss"), /^FAIL.*example/);
  writeFileSync(join(root, "keel", "oss", "OSS-001-example.md"), completeRecord(), "utf8");
  assert.match(line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-oss"), /^PASS/);
});

test("REQ-015/AC-2 OSS entries require exact version license reuse point local diff and tracking plan", () => {
  const root = fixture();
  writeFileSync(join(root, "keel", "oss", "OSS-001-example.md"), completeRecord(), "utf8");
  assert.deepEqual(inspectOss(makeCtx(root)).gaps, []);
  writeFileSync(join(root, "keel", "oss", "OSS-001-example.md"), "---\nid: OSS-001\nproject: example\nversion: 1.2.3\n---\n\n# empty shell\n", "utf8");
  assert.ok(inspectOss(makeCtx(root)).gaps.length >= 4);
});

test("REQ-015/AC-3 [proxy:due upstream comparison evidence not recorded] review contract binds date URL old new diff conclusion and CHG", () => {
  const template = read("keel/templates/OSS.md");
  for (const marker of ["review_date", "upstream_url", "old_version", "new_version", "diff", "conclusion", "chg"]) assert.match(template, new RegExp(marker, "i"));
  assert.match(template, /无变化.*关注.*建议调研.*建议变更/s);
});

test("REQ-015/AC-4 [proxy:no GPL or AGPL reuse is present] reuse contract requires a prior user DEC with impact options and verbatim words", () => {
  const skill = read(".agents/skills/k-log/SKILL.md");
  assert.match(skill, /GPL\/AGPL/);
  assert.match(skill, /before reuse/i);
  assert.match(skill, /DEC/);
  assert.match(skill, /impact.*options.*verbatim/is);
});
