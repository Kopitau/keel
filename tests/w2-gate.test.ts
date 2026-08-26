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
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runNew } from "../tools/gate/new.ts";
import { runIndex } from "../tools/gate/indexgen.ts";
import { runApprove } from "../tools/gate/approve.ts";
import { plannedFiles, overlapWith } from "../tools/gate/overlap.ts";
import { branchName } from "../tools/gate/worktree.ts";
import { nextNumber } from "../tools/gate/ids.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function gate(args: string[], cwd = repo): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ["tools/gate/gate.ts", ...args], {
    encoding: "utf8",
    cwd,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-w2-"));
  mkdirSync(join(dir, "keel", "templates"), { recursive: true });
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "keel", "research"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  mkdirSync(join(dir, "keel", "features"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      identities: {
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
        humans: [{ name: "Ada", email: "ada@example.com" }],
      },
      budget: { agents_md_max_lines: 150, agents_md_chain_max_bytes: 32768 },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "templates", "DEC.md"),
    "---\nid: DEC-000\ntitle: short title\nstatus: proposed\ndate: YYYY-MM-DD\n---\n# DEC-000 标题\n",
    "utf8",
  );
  writeFileSync(join(dir, "AGENTS.md"), "# keel\n".repeat(3), "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# req\n\n## 未决问题\n\n## REQ-001 Demo\n",
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "requirements", "INDEX.md"),
    "- current: v1.md\n",
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# plan\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n|---|---|\n| I-01 | F1 → F2 |\n",
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "plan", "INDEX.md"),
    "- current: overview-v1.md\n",
    "utf8",
  );
  return dir;
}

test("REQ-017 gate check --quick on this repo exits 0", () => {
  const r = gate(["check", "--quick"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS G-plan/);
  assert.match(r.stdout, /PASS G-req/);
  assert.match(r.stdout, /PASS X-casefold/);
});

test("REQ-017 G-plan fails when INDEX has two current pointers", () => {
  const dir = fixture();
  writeFileSync(
    join(dir, "keel", "plan", "INDEX.md"),
    "- current: overview-v1.md\n- current: overview-v2.md\n",
    "utf8",
  );
  const ctx = makeCtx(dir);
  const r = runCheck(ctx, ["--quick"]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /FAIL G-plan/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 gate new dec allocates the next id", () => {
  const dir = fixture();
  const ctx = makeCtx(dir);
  assert.equal(nextNumber(ctx, "dec"), 1);
  const r = runNew(ctx, ["dec", "pick a runtime"]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /DEC-001/);
  assert.equal(nextNumber(ctx, "dec"), 2);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-004 gate index writes a unique current pointer", () => {
  const dir = fixture();
  const ctx = makeCtx(dir);
  const r = runIndex(ctx);
  assert.equal(r.code, 0, r.stderr);
  const idx = readFileSync(join(dir, "keel", "plan", "INDEX.md"), "utf8");
  const currents = idx.split("\n").filter((l) => l.startsWith("- current:"));
  assert.equal(currents.length, 1);
  assert.match(idx, /overview-v1\.md/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-018 approve refuses an agent git identity", () => {
  const dir = fixture();
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001.md"),
    "---\nid: APR-001\nstatus: draft\napprover: \"\"\n---\n\n- path: AGENTS.md\n  content_sha256: pending\n",
    "utf8",
  );
  const ctx = makeCtx(dir, { name: "keel-agent", email: "agent@keel.local" });
  const r = runApprove(ctx, ["APR-001"]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /agent list/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-018 approve as a human fills a normalized hash", () => {
  const dir = fixture();
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001.md"),
    "---\nid: APR-001\nstatus: draft\napprover: \"\"\ndate: 2026-01-01\n---\n\n- path: AGENTS.md\n  content_sha256: pending\n",
    "utf8",
  );
  const ctx = makeCtx(dir, { name: "Ada", email: "ada@example.com" });
  // This test simulates a human at a plain terminal; the test process itself
  // runs inside a harness (CLAUDECODE=1 inherited), which DEC-166 rightly
  // refuses without a delegation record. Strip the markers for the call.
  const saved: { [k: string]: string | undefined } = {};
  for (const k of ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SESSION_ID", "AI_AGENT", "KEEL_AGENT"]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  let r;
  try {
    r = runApprove(ctx, ["APR-001"]);
  } finally {
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  }
  assert.equal(r.code, 0, r.stderr);
  const body = readFileSync(join(dir, "keel", "approvals", "APR-001.md"), "utf8");
  assert.match(body, /status: approved/);
  const digest = sha256Normalized(readFileSync(join(dir, "AGENTS.md")));
  assert.ok(body.includes(digest));
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-019 overlap detector finds shared planned files", () => {
  const dir = fixture();
  const a = join(dir, "keel", "features", "f01-one");
  const b = join(dir, "keel", "features", "f02-two");
  mkdirSync(join(a, "plan"), { recursive: true });
  mkdirSync(join(b, "plan"), { recursive: true });
  writeFileSync(
    join(a, "plan", "v1.md"),
    "## 预计触碰文件\n\n- `tools/gate/gate.ts`\n",
    "utf8",
  );
  writeFileSync(
    join(b, "plan", "v1.md"),
    "## 预计触碰文件\n\n- `tools/gate/gate.ts`\n",
    "utf8",
  );
  writeFileSync(join(b, "claim.json"), "{}\n", "utf8");
  const ctx = makeCtx(dir);
  const hits = overlapWith(ctx, a);
  assert.ok(hits.length >= 1);
  assert.ok(plannedFiles(readFileSync(join(a, "plan", "v1.md"), "utf8")).includes("tools/gate/gate.ts"));
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-019 branch name follows keel/F-n-slug", () => {
  assert.equal(branchName(24, "f24-cross-platform"), "keel/F-24-cross-platform");
});

test("REQ-012 status still prints handoff and runtime", () => {
  const r = gate(["status"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /handoff:/);
  assert.match(r.stdout, /node\+ts/);
  assert.match(r.stdout, /provisional_decisions:/);
});

test("REQ-016 sync copies skills rather than linking", () => {
  const r = gate(["sync"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /copy/);
  assert.equal(existsSync(join(repo, ".claude", "skills", ".gitkeep")), true);
});
