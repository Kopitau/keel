// CHG-014 S1 (ISS-058 / ISS-059): commit trailers live in their own paragraph, and
// the harness behind a commit is recognized beyond Claude Code — by environment
// markers first, by the process ancestry as the fallback, with editor hosts
// (Cursor / VS Code) reported as `Host:` instead of being mistaken for an agent.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { agentFromAncestry, detectHarness, detectHost } from "../tools/gate/harness.ts";
import { insertTrailers, precommitAprGaps } from "../tools/gate/hook.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

scrubProcessGitEnv(process.env);

/** The process environment without any harness / host marker, so each test adds its own. */
function cleanEnv(extra: { [k: string]: string } = {}): { [k: string]: string | undefined } {
  const out: { [k: string]: string | undefined } = {};
  for (const [k, v] of Object.entries(scrubHookGitEnv(process.env))) {
    if (/^(CLAUDE|AI_AGENT|KEEL_|CODEX_|CURSOR_|TERM_PROGRAM)/.test(k)) continue;
    out[k] = v;
  }
  return { ...out, ...extra };
}

function tempRepo(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-${tag}-`));
  const g = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: cleanEnv() });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
    return r.stdout.trim();
  };
  g(["init", "-q", "-b", "main"]);
  g(["config", "user.name", "kopit"]);
  g(["config", "user.email", "wwillmee@gmail.com"]);
  mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      identities: {
        humans: [{ name: "kopit", email: "wwillmee@gmail.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "init"]);
  return root;
}

function hook(root: string, msgFile: string, env: { [k: string]: string | undefined }): string {
  const r = spawnSync(
    process.execPath,
    [join(repo, "tools", "gate", "gate.ts"), "--root", root, "hook", "prepare-commit-msg", msgFile],
    { cwd: root, encoding: "utf8", env },
  );
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(msgFile, "utf8");
}

test("ISS-058 insertTrailers puts the trailer block in its own paragraph and keeps git's comment block last", () => {
  const t = ["Keel-Precommit: ok", "Feature: F1"];
  assert.equal(insertTrailers("subject only\n", t), "subject only\n\nKeel-Precommit: ok\nFeature: F1\n");
  assert.equal(insertTrailers("subject\n\nbody line\n", t), "subject\n\nbody line\n\nKeel-Precommit: ok\nFeature: F1\n");
  // an author-written trailer paragraph is extended, not pushed into the body
  assert.equal(
    insertTrailers("subject\n\nSigned-off-by: a <a@b>\n", t),
    "subject\n\nSigned-off-by: a <a@b>\nKeel-Precommit: ok\nFeature: F1\n",
  );
  // git's interactive template: comments stay after our trailers
  assert.equal(
    insertTrailers("subject\n\n# Please enter the commit message\n# Lines starting with '#' are ignored\n", t),
    "subject\n\nKeel-Precommit: ok\nFeature: F1\n\n# Please enter the commit message\n# Lines starting with '#' are ignored\n",
  );
  assert.equal(insertTrailers("x\n", []), "x\n");
});

test("REQ-019/AC-5 a one-line commit message keeps its subject alone after the hook, and git parses the trailers", () => {
  const root = tempRepo("subject");
  const msg = join(root, "msg.txt");
  writeFileSync(msg, "fix: keep the subject clean\n", "utf8");
  const out = hook(root, msg, cleanEnv({ KEEL_AGENT: "codex", KEEL_SESSION: "s-1" }));
  const lines = out.split("\n");
  assert.equal(lines[0], "fix: keep the subject clean");
  assert.equal(lines[1], "", out);
  assert.match(out, /^Keel-Precommit: (ok|skipped)$/m);
  writeFileSync(join(root, "a.txt"), "a\n", "utf8");
  const g = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: cleanEnv() });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  g(["add", "-A"]);
  g(["commit", "-q", "-F", msg]);
  assert.equal(g(["log", "-1", "--format=%s"]), "fix: keep the subject clean");
  assert.equal(g(["log", "-1", "--format=%(trailers:key=Feature,valueonly)"]), "trunk");
  assert.equal(g(["log", "-1", "--format=%(trailers:key=Agent,valueonly)"]), "codex");
  assert.equal(g(["log", "-1", "--format=%(trailers:key=Session,valueonly)"]), "s-1");
  rmSync(root, { recursive: true, force: true });
});

test("ISS-059 detectHarness recognizes Codex by environment prefix and agents by process ancestry; editor hosts are not agents", () => {
  assert.equal(detectHarness(cleanEnv())?.agent, undefined);
  assert.equal(detectHarness(cleanEnv({ CODEX_SANDBOX_NETWORK_DISABLED: "1" }))?.agent, "codex");
  assert.equal(detectHarness(cleanEnv({ CODEX_THREAD_ID: "t-9", CODEX_HOME: "x" }))?.session, "t-9");
  // the environment Codex Desktop actually exports (user dump, 2026-09-01)
  const codexDesktop = cleanEnv({
    CODEX_APP_TOOLS_PIPE_PATH: "\\\\.\\pipe\\codex-browser-use-52deea64",
    CODEX_CI: "1",
    CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "Codex Desktop",
    CODEX_MCP_NODE_PATH: "C:\\Users\\x\\AppData\\Local\\OpenAI\\Codex\\runtimes\\cua_node\\node.exe",
    CODEX_SANDBOX_NETWORK_DISABLED: "1",
    CODEX_SESSION_ID: "01a05b9f-638b-7cd3-8121-3fe7c3935793",
    CODEX_THREAD_ID: "01a05b9f-638b-7cd3-8121-3fe7c3935793",
  });
  assert.deepEqual(detectHarness(codexDesktop), { agent: "codex", session: "01a05b9f-638b-7cd3-8121-3fe7c3935793" });
  assert.equal(detectHarness(cleanEnv({ CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "c-1" }))?.session, "c-1");
  assert.equal(detectHarness(cleanEnv({ KEEL_AGENT: "opencode" }))?.agent, "opencode");
  assert.equal(detectHarness(cleanEnv(), { ancestors: () => ["node.exe", "sh.exe", "git.exe", "Codex.exe"] })?.agent, "codex");
  assert.equal(detectHarness(cleanEnv(), { ancestors: () => ["bash.exe", "claude.exe", "pwsh.exe"] })?.agent, "claude-code");
  assert.equal(agentFromAncestry(["git", "sh", "opencode"]), "opencode");
  // Cursor / VS Code: a human may be typing in that terminal → host, never an agent
  const cursorProc = { ancestors: () => ["git.exe", "sh.exe", "Cursor.exe", "explorer.exe"] };
  assert.equal(detectHarness(cleanEnv(), cursorProc), null);
  assert.deepEqual(detectHost(cleanEnv(), cursorProc), { host: "cursor", via: "process" });
  assert.deepEqual(detectHost(cleanEnv({ CURSOR_TRACE_ID: "abc" })), { host: "cursor", via: "env" });
  assert.deepEqual(detectHost(cleanEnv({ TERM_PROGRAM: "vscode" })), { host: "vscode", via: "env" });
  assert.equal(detectHost(cleanEnv()), null);
});

test("REQ-019/AC-6 the Agent trailer names codex under a CODEX_ environment and Host names cursor when no agent is known", () => {
  const root = tempRepo("agent");
  const msg = join(root, "msg.txt");
  writeFileSync(msg, "subject\n", "utf8");
  // KEEL_ANCESTRY=0: this test itself runs under a harness whose process would otherwise be found
  const codex = hook(root, msg, cleanEnv({ CODEX_SANDBOX_NETWORK_DISABLED: "1", KEEL_ANCESTRY: "0" }));
  assert.match(codex, /^Agent: codex$/m);
  assert.doesNotMatch(codex, /^Host:/m);
  writeFileSync(msg, "subject\n", "utf8");
  const cursor = hook(root, msg, cleanEnv({ CURSOR_TRACE_ID: "abc", KEEL_ANCESTRY: "0" }));
  assert.match(cursor, /^Agent: unknown$/m);
  assert.match(cursor, /^Host: cursor$/m);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-019/AC-6 the approval guard asks for the user's words in every environment — codex, cursor or none — and is satisfied by them alone (DEC-190)", () => {
  const root = tempRepo("guard");
  const apr = join(root, "keel", "approvals", "APR-001-demo.md");
  writeFileSync(
    apr,
    "---\nid: APR-001\nstatus: approved\ndate: 2026-09-01\napprover: \"kopit\"\ndelegated: \"\"\nartifacts:\n  - path: AGENTS.md\n    version: v1\n    content_sha256: 0\n---\n\n# APR-001\n",
    "utf8",
  );
  const r = spawnSync("git", ["add", "-A"], { cwd: root, encoding: "utf8", env: cleanEnv() });
  assert.equal(r.status, 0, r.stderr);
  const ctx = makeCtx(root);
  const none = { ancestors: () => [] as string[] };
  for (const env of [cleanEnv({ CODEX_SANDBOX_NETWORK_DISABLED: "1" }), cleanEnv({ CURSOR_TRACE_ID: "abc" }), cleanEnv()]) {
    const gaps = precommitAprGaps(ctx, env, none);
    assert.equal(gaps.length, 1, gaps.join("; "));
    assert.match(gaps[0] ?? "", /records no delegation.*DEC-190/);
  }
  writeFileSync(apr, readFileSync(apr, "utf8").replace('delegated: ""', 'delegated: "「批准提交」(2026-09-01)"'), "utf8");
  spawnSync("git", ["add", "-A"], { cwd: root, encoding: "utf8", env: cleanEnv() });
  for (const env of [cleanEnv({ CODEX_SANDBOX_NETWORK_DISABLED: "1" }), cleanEnv({ CURSOR_TRACE_ID: "abc" }), cleanEnv()]) {
    assert.deepEqual(precommitAprGaps(ctx, env, none), []);
  }
  rmSync(root, { recursive: true, force: true });
});
