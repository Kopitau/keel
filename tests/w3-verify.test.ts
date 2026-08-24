import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import {
  evidenceFresh,
  parseJunit,
  tail2kb,
  writeEvidence,
  type Evidence,
} from "../tools/gate/evidence.ts";
import { gitWriteTree } from "../tools/gate/git.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runVerify } from "../tools/gate/verify.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) {
    throw new Error(r.stderr || r.stdout || args.join(" "));
  }
}

function miniGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-w3-"));
  mkdirSync(join(dir, "keel", "evidence"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "keel", "features"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      profiles: {
        active: ["keel-gate"],
        "keel-gate": { test_command: "node --test" },
      },
      budget: { agents_md_max_lines: 150, agents_md_chain_max_bytes: 32768 },
    }),
    "utf8",
  );
  writeFileSync(join(dir, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "src.txt"), "a\n", "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(
    join(dir, "tests", "ok.test.js"),
    "const { test } = require('node:test');\ntest('ok', () => {});\n",
    "utf8",
  );
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "t@example.com"]);
  git(dir, ["config", "user.name", "t"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "t"]);
  return dir;
}

test("REQ-006 parseJunit reads counts", () => {
  const xml = `<testsuites tests="4" failures="1" skipped="1" errors="0"></testsuites>`;
  assert.deepEqual(parseJunit(xml), { passed: 2, failed: 1, skipped: 1 });
  const nodeXml = `<?xml version="1.0"?><testsuites><testcase name="ok"/></testsuites><!-- pass 1 --><!-- fail 0 -->`;
  assert.equal(parseJunit(nodeXml).passed, 1);
});

test("REQ-006 tail2kb keeps the end", () => {
  const s = "a".repeat(3000);
  const t = tail2kb(s);
  assert.equal(t.length, 2048);
  assert.equal(t.endsWith("a"), true);
});

test("REQ-006 tree hash ignores evidence and moves when source changes", () => {
  const dir = miniGitRepo();
  const ctx = makeCtx(dir);
  const a = gitWriteTree(ctx);
  assert.match(a, /^[0-9a-f]{40}$/);
  writeEvidence(ctx, {
    command: "x",
    exit_code: 0,
    started: "",
    finished: "",
    git_commit: "",
    tree_hash: a,
    dirty: false,
    report_hash: "",
    counts: { passed: 0, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "",
    actor: { harness: "", model: "", session: "" },
  } satisfies Evidence);
  const b = gitWriteTree(ctx);
  assert.equal(a, b);
  writeFileSync(join(dir, "src.txt"), "b\n", "utf8");
  const c = gitWriteTree(ctx);
  assert.ok(a !== c);
  assert.equal(evidenceFresh(ctx, { tree_hash: a, exit_code: 0 } as Evidence), false);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 gate verify writes evidence with required keys", () => {
  const dir = miniGitRepo();
  const ctx = makeCtx(dir);
  const r = runVerify(ctx);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const ev = JSON.parse(
    readFileSync(join(dir, "keel", "evidence", "verify.json"), "utf8"),
  ) as Evidence;
  for (const k of [
    "command",
    "exit_code",
    "started",
    "finished",
    "git_commit",
    "tree_hash",
    "dirty",
    "report_hash",
    "counts",
    "req_coverage",
    "stdout_tail_2kb",
    "actor",
  ]) {
    assert.ok(k in ev, k);
  }
  assert.equal(ev.exit_code, 0);
  assert.match(ev.tree_hash, /^[0-9a-f]{40}$/);
  const junit = join(dir, "keel", "evidence", "junit.xml");
  const junitHead = existsSync(junit) ? readFileSync(junit, "utf8").slice(0, 400) : "no-junit";
  assert.ok(
    ev.counts.passed >= 1,
    `${JSON.stringify(ev.counts)}\ncmd=${ev.command}\njunit=${junitHead}\ntail=${ev.stdout_tail_2kb.slice(0, 400)}`,
  );
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 stale evidence fails X-evidence", () => {
  const dir = miniGitRepo();
  const ctx = makeCtx(dir);
  writeEvidence(ctx, {
    command: "x",
    exit_code: 0,
    started: "",
    finished: "",
    git_commit: "x",
    tree_hash: "0".repeat(40),
    dirty: false,
    report_hash: "",
    counts: { passed: 1, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "",
    actor: { harness: "", model: "", session: "" },
  });
  const r = runCheck(ctx, []);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /FAIL X-evidence/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 this repo full check fails without evidence (ISS-002)", () => {
  const r = spawnSync(process.execPath, ["tools/gate/gate.ts", "check"], {
    encoding: "utf8",
    cwd: repo,
  });
  assert.equal(r.status, 1, (r.stdout ?? "") + (r.stderr ?? ""));
  assert.match(r.stdout ?? "", /FAIL X-evidence|FAIL G-done/);
});
