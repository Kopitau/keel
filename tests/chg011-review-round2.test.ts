// CHG-011 Q7 round 2: what the Codex review found (ISS-055/056, the waiver scope) and
// the plan's named acceptance obligations it showed missing (ISS-057).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runApprove } from "../tools/gate/approve.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { gitWriteTree } from "../tools/gate/git.ts";
import { sha256Body } from "../tools/gate/hash.ts";
import {
  completionReviewGaps,
  emptyLoop,
  packBodyHash,
  readLoopState,
  recordLoopEvent,
  runLoop,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";
import { SKILL_CATALOG } from "../tools/gate/skills.ts";
import { runStatus } from "../tools/gate/status.ts";
import { runSync } from "../tools/gate/sync.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function git(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
  return (r.stdout ?? "").trim();
}

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

/** Minimal keel project in a git repo: baseline, plan with coupling table, config with identities. */
function project(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-r2-${tag}-`));
  for (const d of ["features", "review", "plan", "requirements", "issues", "changes", "approvals", "decisions"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      identities: {
        humans: [{ name: "kopit", email: "wwillmee@gmail.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "overview-v1.md"), "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    "# r\n\n- status: confirmed\n- source: CHG-001\n- replaces: null\n- change: CHG-001\n\n## 未决问题\n\n无\n\n## REQ-001 X\n\n- **status**: confirmed\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "changes", "CHG-001-demo.md"), "---\nid: CHG-001\nstatus: approved\ndate: 2026-08-29\n---\n\n# CHG-001 demo\n\n正文。\n", "utf8");
  writeFileSync(join(root, ".gitignore"), "keel/review/pack.json\nkeel/evidence/*.json\n", "utf8");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "t"]);
  git(root, ["config", "user.email", "t@t.t"]);
  return root;
}

function aprFile(root: string, id: string, artifacts: Array<{ path: string; digest: string; quoted?: boolean; noHashLine?: boolean }>, status = "approved"): string {
  const body = artifacts
    .map((a) => `  - path: ${a.quoted ? `"${a.path}"` : a.path}\n    version: v1\n${a.noHashLine ? "" : `    content_sha256: ${a.digest}\n`}`)
    .join("");
  const file = join(root, "keel", "approvals", `${id}-demo.md`);
  writeFileSync(
    file,
    `---\nid: ${id}\nstatus: ${status}\ndate: 2026-08-29\napprover: "kopit"\ndelegated: "「由你提交」(2026-08-29)"\nartifacts:\n${body}---\n\n# ${id}\n`,
    "utf8",
  );
  return file;
}

function passedLoop(root: string, extra: { [k: string]: unknown } = {}, withRows = true): void {
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(root, "keel", "review", "pack.json"), body, "utf8");
  const ctx = makeCtx(root);
  const st = {
    ...emptyLoop("codex", "claude-code"),
    plan: "overview-v1.md",
    status: "passed" as const,
    round: 1,
    pack_hash: hash,
    tree_hash: gitWriteTree(ctx),
    ...extra,
  } as ReturnType<typeof emptyLoop>;
  writeLoopState(ctx, st);
  if (withRows) {
    recordLoopEvent(ctx, { ...st, round: 0 }, "pack", `plan=overview-v1.md base=HEAD lens=requirements files=1 pack=${hash.slice(0, 12)}`);
    recordLoopEvent(ctx, st, "verdict", "reviewer=claude-code still_open=- → passed");
  }
}

// ---------------------------------------------------------------- ISS-055

test("ISS-055 pack refuses to run without a base when no earlier review of the plan can lend one", () => {
  const root = project("nobase");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  writeFileSync(join(root, "src.txt"), "x\n", "utf8");
  const r = runLoop(makeCtx(root), ["pack", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /--base/);
  assert.equal(existsSync(join(root, "keel", "review", "pack.json")), false);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-055 pack refuses an empty range and a base that is not in the repository", () => {
  const root = project("empty");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const ctx = makeCtx(root);
  const empty = runLoop(ctx, ["pack", "--base", "HEAD", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(empty.code, 1);
  assert.match(empty.stderr, /nothing to review/);
  const bogus = runLoop(ctx, ["pack", "--base", "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(bogus.code, 1);
  assert.match(bogus.stderr, /not a commit or tree/);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-055 a re-pack of the same plan inherits its base, so the review range never shrinks", () => {
  const root = project("inherit");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  writeFileSync(join(root, "tools-a.txt"), "a\n", "utf8");
  const ctx = makeCtx(root);
  assert.equal(runLoop(ctx, ["pack", "--base", base, "--implementer", "codex", "--reviewer", "claude-code"]).code, 0);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "first slice"]);
  writeFileSync(join(root, "tools-b.txt"), "b\n", "utf8");
  const again = runLoop(ctx, ["pack", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(again.code, 0, again.stderr);
  assert.equal(readLoopState(ctx)?.base, base);
  const pack = JSON.parse(readFileSync(join(root, "keel", "review", "pack.json"), "utf8")) as { diff: string };
  assert.match(pack.diff, /tools-a\.txt/, "the earlier slice stays in the reviewed range");
  assert.match(pack.diff, /tools-b\.txt/);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-055 once every active feature has its summary, a review that passed on an older tree is a G-done FAIL, not a warning", () => {
  const root = project("late");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const ctx = makeCtx(root);
  mkdirSync(join(root, "keel", "features", "f01-x"), { recursive: true });
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# w\n", "utf8");
  passedLoop(root);
  assert.deepEqual(completionReviewGaps(ctx), [], "in progress: an old pass is only a warning");
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# done after the review\n", "utf8");
  const gaps = completionReviewGaps(ctx);
  assert.ok(gaps.some((g) => /implemented after the review passed/.test(g)), gaps.join("; "));
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-056

test("ISS-056 a hand-written passed front matter with no loop history is a G-done FAIL", () => {
  const root = project("forged");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const ctx = makeCtx(root);
  passedLoop(root, {}, false);
  const gaps = completionReviewGaps(ctx);
  assert.ok(gaps.some((g) => /ISS-056/.test(g)), gaps.join("; "));
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^FAIL.*ISS-056/);
  passedLoop(root, {}, true);
  assert.deepEqual(completionReviewGaps(ctx), []);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-056 an unknown status in the front matter is never a pass", () => {
  const root = project("badstatus");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const ctx = makeCtx(root);
  passedLoop(root);
  const p = join(root, "keel", "review", "disposition.md");
  writeFileSync(p, readFileSync(p, "utf8").replace(/^status: passed$/m, "status: approved"), "utf8");
  assert.equal(readLoopState(ctx)?.status, "none");
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^FAIL.*invalid status/);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- waiver scope (round-1 finding, probe unverified)

test("fp:g-req-apr-waiver a worklog line citing an unrelated APR does not waive a body-hash mismatch", () => {
  const root = project("waiver");
  const change = join(root, "keel", "changes", "CHG-001-demo.md");
  aprFile(root, "APR-001", [{ path: "keel/changes/CHG-001-demo.md", digest: sha256Body(readFileSync(change)) }]);
  aprFile(root, "APR-002", [{ path: "keel/plan/overview-v1.md", digest: sha256Body(readFileSync(join(root, "keel", "plan", "overview-v1.md"))) }]);
  const ctx = makeCtx(root);
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^PASS/);
  writeFileSync(change, readFileSync(change, "utf8").replace("正文。", "正文（改了）。"), "utf8");
  mkdirSync(join(root, "keel", "features", "f01-x"), { recursive: true });
  const worklog = join(root, "keel", "features", "f01-x", "worklog.md");
  writeFileSync(worklog, "- gate-warn: G-req ref=APR-002\n", "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^FAIL.*APR-001/);
  writeFileSync(worklog, "- gate-warn: G-req ref=APR-001\n", "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^WARN/);
  rmSync(root, { recursive: true, force: true });
});

test("fp:g-req-apr-waiver two changed approved artifacts need two waiver lines, one per binding APR", () => {
  const root = project("waiver2");
  writeFileSync(join(root, "keel", "changes", "CHG-002-demo.md"), "---\nid: CHG-002\nstatus: approved\ndate: 2026-08-29\n---\n\n# CHG-002\n\n二。\n", "utf8");
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    readFileSync(join(root, "keel", "requirements", "v1.md"), "utf8").replace("- source: CHG-001", "- source: CHG-001 CHG-002").replace("- change: CHG-001", "- change: CHG-001 CHG-002"),
    "utf8",
  );
  const c1 = join(root, "keel", "changes", "CHG-001-demo.md");
  const c2 = join(root, "keel", "changes", "CHG-002-demo.md");
  aprFile(root, "APR-001", [{ path: "keel/changes/CHG-001-demo.md", digest: sha256Body(readFileSync(c1)) }]);
  aprFile(root, "APR-002", [{ path: "keel/changes/CHG-002-demo.md", digest: sha256Body(readFileSync(c2)) }]);
  const ctx = makeCtx(root);
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^PASS/);
  writeFileSync(c1, readFileSync(c1, "utf8").replace("正文。", "正文 x。"), "utf8");
  writeFileSync(c2, readFileSync(c2, "utf8").replace("二。", "二 x。"), "utf8");
  mkdirSync(join(root, "keel", "features", "f01-x"), { recursive: true });
  const worklog = join(root, "keel", "features", "f01-x", "worklog.md");
  writeFileSync(worklog, "- gate-warn: G-req ref=APR-001\n", "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^FAIL/);
  writeFileSync(worklog, "- gate-warn: G-req ref=APR-001\n- gate-warn: G-req ref=APR-002\n", "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^WARN/);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-057: the plan's named obligations

test("REQ-018/AC-6 gate approve fills the hash for a quoted artifact path and refuses when the hash line is missing", () => {
  const root = project("approve");
  const change = join(root, "keel", "changes", "CHG-001-demo.md");
  const quoted = aprFile(root, "APR-001", [{ path: "keel/changes/CHG-001-demo.md", digest: "pending", quoted: true }], "draft");
  const ok = runApprove(makeCtx(root, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(ok.code, 0, ok.stderr);
  const text = readFileSync(quoted, "utf8");
  assert.match(text, /status: approved/);
  assert.equal(text.match(/content_sha256: (\S+)/)?.[1], sha256Body(readFileSync(change)));
  const broken = aprFile(root, "APR-002", [{ path: "keel/changes/CHG-001-demo.md", digest: "", noHashLine: true }], "draft");
  const refused = runApprove(makeCtx(root, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-002"]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /content_sha256/);
  assert.match(readFileSync(broken, "utf8"), /status: draft/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-009/AC-4 a feature that calls itself finished without summary.md is not complete: G-done stays in progress and the frontier still lists it", () => {
  const root = project("nosummary");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  mkdirSync(join(root, "keel", "features", "f01-x", "plan"), { recursive: true });
  writeFileSync(join(root, "keel", "features", "f01-x", "plan", "v1.md"), "---\nfeature: F1\nreq: [REQ-001]\nblocked_by: []\n---\n# p\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# w\n\n- 进度：全部完成，测试通过。\n", "utf8");
  const ctx = makeCtx(root);
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^PASS.*in progress/);
  assert.match(runStatus(ctx).stdout, /^frontier: .*\bF1\b/m);
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# done\n", "utf8");
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^FAIL.*verify\.json missing/, "a real completion claim now demands evidence");
  assert.doesNotMatch(runStatus(ctx).stdout, /^frontier: .*\bF1\b/m);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-016/AC-3 every catalog skill stays within 80 lines and names no deleted gate or record kind", () => {
  const banned = /G-research|G-retro|G-issues|X-(budget|skills|casefold|ids|types|hooks|oss|knowledge|tests|full|owners|decisions)\b|test-baseline|keel\/journal|\bLES-|KLES|gate new (oss|les)/;
  for (const name of SKILL_CATALOG) {
    const text = readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8");
    const lines = text.split(/\r?\n/).length;
    assert.ok(lines <= 80, `${name}: ${lines} lines`);
    const hit = text.match(banned);
    assert.equal(hit, null, `${name} still mentions ${hit?.[0]}`);
  }
});

test("REQ-016/AC-9 gate sync generates agents/openai.yaml for every catalog skill present and mirrors it to .claude/skills", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-r2-sync-"));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  for (const name of ["k-status", "k-log"]) {
    mkdirSync(join(root, ".agents", "skills", name), { recursive: true });
    writeFileSync(join(root, ".agents", "skills", name, "SKILL.md"), readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8"), "utf8");
  }
  // gate.ts acts on the tree it lives in (each project runs its own copy), so drive sync through the API with an explicit root.
  const r = runSync(makeCtx(root));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  for (const name of ["k-status", "k-log"]) {
    const yaml = join(root, ".agents", "skills", name, "agents", "openai.yaml");
    assert.ok(existsSync(yaml), `${name}: openai.yaml generated`);
    assert.equal(readFileSync(join(root, ".claude", "skills", name, "agents", "openai.yaml"), "utf8"), readFileSync(yaml, "utf8"));
  }
  assert.match(readFileSync(join(root, ".agents", "skills", "k-status", "agents", "openai.yaml"), "utf8"), /allow_implicit_invocation:\s*true/);
  assert.match(readFileSync(join(root, ".agents", "skills", "k-log", "agents", "openai.yaml"), "utf8"), /allow_implicit_invocation:\s*true/);
  assert.deepEqual(readdirSync(join(root, ".claude", "skills")).sort(), ["k-log", "k-status"]);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-004/AC-10 documentary contract scopes continuation to authorized work, not historical frontier", () => {
  const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
  const impl = readFileSync(join(repo, ".agents", "skills", "k-impl", "SKILL.md"), "utf8");
  // A document invariant, not a model-behavior test.
  assert.match(agents, /Relevant earlier requirements and authorization remain valid/);
  assert.match(impl, /next in-scope slice/);
  assert.doesNotMatch(agents + impl, /Stop only for C-21|One slice per session/);
});

test("REQ-009/AC-1 the summary template allows evidence-backed iteration and preserves raw worklog", () => {
  const template = readFileSync(join(repo, "keel", "templates", "summary.md"), "utf8");
  assert.match(template, /重要迭代后更新/);
  assert.match(template, /保留原始 worklog/);
  assert.doesNotMatch(template, /完成时写一次/);
});

test("REQ-002/AC-4 a chosen open-source component is registered in the RES oss field, never in a separate OSS file", () => {
  const res = readFileSync(join(repo, "keel", "templates", "RES.md"), "utf8");
  assert.match(res, /^oss: \[\]$/m);
  assert.doesNotMatch(res, /oss_none|gate new oss/);
  const research = readFileSync(join(repo, ".agents", "skills", "k-research", "SKILL.md"), "utf8");
  assert.match(research, /record `oss:`/);
  assert.match(research, /No additional OSS file/);
  assert.equal(existsSync(join(repo, "keel", "templates", "OSS.md")), false);
});

test("REQ-003/AC-5 gate status counts provisional decisions at session start", () => {
  const root = project("provisional");
  writeFileSync(join(root, "keel", "decisions", "DEC-001-x.md"), "---\nid: DEC-001\nstatus: provisional\n---\n# d\n", "utf8");
  writeFileSync(join(root, "keel", "decisions", "DEC-002-y.md"), "---\nid: DEC-002\nstatus: confirmed\n---\n# d\n", "utf8");
  assert.match(runStatus(makeCtx(root)).stdout, /^provisional_decisions: 1$/m);
  rmSync(root, { recursive: true, force: true });
});
