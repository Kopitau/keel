// CHG-014 / DEC-190: an approval is the user's decision, recorded verbatim in the APR
// (`delegated:`). Who commits it is no longer a rule — an agent git identity lands it
// directly. gate approve, the pre-commit guard and X-apr all check one thing: the words.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { runApprove } from "../tools/gate/approve.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { precommitAprGaps } from "../tools/gate/hook.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>\n${stdout}`;
}

function repo(tag: string, identity: { name: string; email: string }): { root: string; git: (a: string[]) => string; apr: (words: string, status?: string) => string } {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-words-${tag}-`));
  mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
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
  const git = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
    return r.stdout.trim();
  };
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", identity.name]);
  git(["config", "user.email", identity.email]);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "base"]);
  const apr = (words: string, status = "draft"): string => {
    const p = join(root, "keel", "approvals", "APR-001-demo.md");
    writeFileSync(
      p,
      `---\nid: APR-001\nstatus: ${status}\ndate: 2026-09-01\napprover: ""\ndelegated: "${words}"\nscope: "demo"\nartifacts:\n  - path: AGENTS.md\n    version: v1\n    content_sha256: pending\n---\n\n# APR-001 demo\n`,
      "utf8",
    );
    return p;
  };
  return { root, git, apr };
}

test("REQ-018/AC-2 gate approve under an agent git identity succeeds when the APR carries the user's words, names the human approver, and refuses without the words", () => {
  const f = repo("approve", { name: "keel-agent", email: "agent@keel.local" });
  const agentCtx = makeCtx(f.root, { name: "keel-agent", email: "agent@keel.local" });
  f.apr("");
  const refused = runApprove(agentCtx, ["APR-001"]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /records no user words.*delegated/s);
  assert.match(readFileSync(join(f.root, "keel", "approvals", "APR-001-demo.md"), "utf8"), /status: draft/);
  f.apr("「批准，以我的身份提交」(2026-09-01)");
  const ok = runApprove(agentCtx, ["APR-001"]);
  assert.equal(ok.code, 0, ok.stderr);
  assert.match(ok.stdout, /approved APR-001 for kopit <wwillmee@gmail.com>/);
  const text = readFileSync(join(f.root, "keel", "approvals", "APR-001-demo.md"), "utf8");
  assert.match(text, /^status: approved$/m);
  assert.match(text, /^approver: "kopit <wwillmee@gmail.com>"$/m);
  assert.match(text, /content_sha256: [0-9a-f]{64}/);
  // --approver overrides the config default
  f.apr("「批准」(2026-09-01)");
  assert.equal(runApprove(agentCtx, ["APR-001", "--approver", "Ada <ada@example.com>"]).code, 0);
  assert.match(readFileSync(join(f.root, "keel", "approvals", "APR-001-demo.md"), "utf8"), /^approver: "Ada <ada@example.com>"$/m);
  rmSync(f.root, { recursive: true, force: true });
});

test("REQ-018/AC-2 the pre-commit guard refuses an approved APR without the user's words whatever the identity or harness, and accepts it with them", () => {
  const f = repo("hook", { name: "keel-agent", email: "agent@keel.local" });
  f.apr("", "approved");
  f.git(["add", "-A"]);
  const ctx = makeCtx(f.root);
  for (const env of [{}, { CLAUDECODE: "1" }, { CODEX_THREAD_ID: "t" }, { CURSOR_TRACE_ID: "c" }]) {
    const gaps = precommitAprGaps(ctx, { ...env, KEEL_ANCESTRY: "0" }, { ancestors: () => [] });
    assert.equal(gaps.length, 1, JSON.stringify(env));
    assert.match(gaps[0] ?? "", /records no delegation.*DEC-190/);
  }
  f.apr("「以我的身份提交」(2026-09-01)", "approved");
  f.git(["add", "-A"]);
  for (const env of [{}, { CLAUDECODE: "1" }, { CODEX_THREAD_ID: "t" }]) {
    assert.deepEqual(precommitAprGaps(ctx, { ...env, KEEL_ANCESTRY: "0" }, { ancestors: () => [] }), [], JSON.stringify(env));
  }
  rmSync(f.root, { recursive: true, force: true });
});

test("REQ-018/AC-2 X-apr passes an APR committed by the agent identity when the words are recorded, and fails when they are empty", () => {
  const f = repo("xapr", { name: "keel-agent", email: "agent@keel.local" });
  f.apr("「批准」(2026-09-01)");
  const agentCtx = makeCtx(f.root, { name: "keel-agent", email: "agent@keel.local" });
  assert.equal(runApprove(agentCtx, ["APR-001"]).code, 0);
  f.git(["add", "-A"]);
  f.git(["commit", "-q", "-m", "APR-001 approved by the agent on the user's words\n\nAgent: codex\nSession: t-1"]);
  assert.equal(f.git(["log", "-1", "--format=%an"]), "keel-agent");
  const ctx = makeCtx(f.root);
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^PASS X-apr/);
  const p = join(f.root, "keel", "approvals", "APR-001-demo.md");
  writeFileSync(p, readFileSync(p, "utf8").replace(/delegated: ".*"/, 'delegated: ""'), "utf8");
  f.git(["add", "-A"]);
  f.git(["commit", "-q", "-m", "words removed"]);
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^FAIL X-apr.*records no delegation/);
  rmSync(f.root, { recursive: true, force: true });
});
