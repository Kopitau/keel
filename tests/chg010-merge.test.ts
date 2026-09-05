import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { gitWriteTree } from "../tools/gate/git.ts";
import { hashReport, writeEvidence } from "../tools/gate/evidence.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  assert.equal(r.status, 0, r.stderr || r.stdout || args.join(" "));
}

function line(stdout: string, id: string): string {
  return stdout.split(/\n/).find((value) => value.includes(` ${id}  `)) ?? "";
}

function mergeFixture(): { root: string; writeFreshEvidence: () => void } {
  const root = mkdtempSync(join(tmpdir(), "keel-merge-"));
  for (const rel of ["keel/approvals", "keel/evidence", "keel/requirements", "keel/plan", "keel/features", "keel/issues", "keel/decisions", "tests"]) {
    mkdirSync(join(root, rel), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel", enforcement_tier: "local" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(root, "source.txt"), "one\n", "utf8");
  writeFileSync(join(root, "keel", "approvals", "APR-001-x.md"), "---\nid: APR-001\nstatus: approved\n---\n", "utf8");
  git(root, ["init"]);
  git(root, ["config", "user.name", "fixture"]);
  git(root, ["config", "user.email", "fixture@example.com"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", "fixture"]);
  const writeFreshEvidence = (): void => {
    const ctx = makeCtx(root);
    const xml = '<testsuites tests="1" failures="0" skipped="0"><testcase name="ok"/></testsuites>\n';
    writeFileSync(join(root, "keel", "evidence", "junit.xml"), xml, "utf8");
    writeEvidence(ctx, {
      command: "node --test",
      exit_code: 0,
      started: "2026-08-28T00:00:00Z",
      finished: "2026-08-28T00:00:01Z",
      git_commit: "fixture",
      tree_hash: gitWriteTree(ctx),
      dirty: false,
      report_hash: hashReport(xml),
      counts: { passed: 1, failed: 0, skipped: 0 },
      req_coverage: {},
      stdout_tail_2kb: "ok",
      actor: { harness: "fixture", model: "fixture", session: "fixture" },
    });
  };
  return { root, writeFreshEvidence };
}

test("REQ-008/AC-1 G-merge requires approved APR fresh tree-bound evidence green trace and no open issues", () => {
  const fx = mergeFixture();
  // CHG-016: nothing built yet (no claim, summary or verify run) → the lane is not judged
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^SKIP.*nothing built/);
  fx.writeFreshEvidence();
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^PASS/);
  writeFileSync(join(fx.root, "keel", "issues", "ISS-001-x.md"), "---\nid: ISS-001\nstatus: open\n---\n", "utf8");
  fx.writeFreshEvidence();
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^FAIL.*open issues/);
});

test("REQ-008/AC-2 [proxy:real GitHub protection API export screenshot and squash PR evidence not recorded] platform contract names every required artifact", () => {
  const doc = readFileSync(join(repo, "tools", "gate", "enforcement-tiers.md"), "utf8");
  assert.match(doc, /required status check/i);
  assert.match(doc, /禁直推/);
  assert.match(doc, /要求 PR/);
  assert.match(doc, /squash/i);
  const req = readFileSync(join(repo, "keel", "requirements", "v4.md"), "utf8");
  assert.match(req, /保护规则 API 导出或截图/);
});

test("REQ-008/AC-3 local tier documents hooks full gate hash-bound APR merge record and degraded authority", () => {
  const doc = readFileSync(join(repo, "tools", "gate", "enforcement-tiers.md"), "utf8");
  assert.match(doc, /本地档/);
  assert.match(doc, /hooks/);
  assert.match(doc, /verify[\s\S]*check/);
  assert.match(doc, /APR.*用户原话和授权范围/);
  assert.match(doc, /防呆不防恶/);
});

test("REQ-008/AC-4 no-mistakes is optional and the merge gate still works without it", () => {
  const config = JSON.parse(readFileSync(join(repo, "keel", "config.json"), "utf8")) as { optional?: { no_mistakes?: unknown } };
  assert.equal(config.optional?.no_mistakes, false);
  const fx = mergeFixture();
  fx.writeFreshEvidence();
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^PASS/);
});

test("REQ-008/AC-5 a changed tree after prior integration invalidates old evidence and forces rerun", () => {
  const fx = mergeFixture();
  fx.writeFreshEvidence();
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^PASS/);
  writeFileSync(join(fx.root, "source.txt"), "two\n", "utf8");
  assert.match(line(runCheck(makeCtx(fx.root), []).stdout, "G-merge"), /^FAIL.*stale tree_hash/);
});
