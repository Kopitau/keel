// DEC-168 guards: X-trace counts black-box test names only. A stand-in is WARN,
// a white-box name carrying an AC marker is WARN, a comment is nothing.
// Also the black-box acceptance tests for REQ-017/AC-1 and AC-2 that replaced the
// r2-rework placeholders (C-34: ref=DEC-168, worklog f06-evidence 2026-08-26).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { classifyTestName, runTrace, testNamesIn } from "../tools/gate/trace.ts";
import { scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

// Never trust the git environment a hook exports (KLES-002 / ISS-045).
scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split(/\n/).find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

/** A project with one feature (claimed done unless summary:false) and REQ-001 with n ACs. */
function project(
  tag: string,
  tests: { [file: string]: string },
  opts: { summary?: boolean; acs?: number } = {},
): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-dec168-${tag}-`));
  for (const d of ["requirements", "plan", "features/f01-x/plan", "issues", "decisions"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const acs = opts.acs ?? 1;
  const given = Array.from({ length: acs }, (_, i) => `  - Given a${i + 1} When b Then c\n`).join("");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    `# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n${given}`,
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(dir, "keel", "features", "f01-x", "plan", "v1.md"), "---\nreq: REQ-001\n---\n# p\n", "utf8");
  if (opts.summary !== false) {
    writeFileSync(join(dir, "keel", "features", "f01-x", "summary.md"), "# done\n", "utf8");
  }
  for (const [file, body] of Object.entries(tests)) writeFileSync(join(dir, "tests", file), body, "utf8");
  return dir;
}

test("DEC-168 classifyTestName: [proxy:] beats the prefix; ISS-/DEC-/fp: are white-box; the rest is black-box", () => {
  assert.equal(classifyTestName("REQ-001/AC-1 restores every byte").kind, "blackbox");
  assert.equal(classifyTestName("ISS-006 backup has no total-size ceiling").kind, "whitebox");
  assert.equal(classifyTestName("DEC-012 killing the holder frees the vault").kind, "whitebox");
  assert.equal(classifyTestName("fp:job-cancel-clobbered cancel keeps completedSteps").kind, "whitebox");
  const p = classifyTestName("REQ-006/AC-1 [proxy:F2 pipeline] wrapper marks text untrusted");
  assert.equal(p.kind, "proxy");
  assert.equal(p.proxyNote, "F2 pipeline");
  assert.equal(classifyTestName("ISS-009 REQ-001/AC-1 [proxy:x] y").kind, "proxy");
});

test("DEC-168 X-trace: a REQ/AC marker in a comment or a fixture string is not coverage", () => {
  const dir = project("comment", {
    "a.test.js":
      "// REQ-001/AC-1 is handled below\nconst note = \"REQ-001/AC-1 in a string\";\ntest('unrelated name', () => {});\n",
  });
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(line(r.stdout, "X-trace"), /^FAIL/);
  assert.match(line(r.stdout, "X-trace"), /REQ-001\/AC-1/);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-168 X-trace: a black-box name certifies the AC", () => {
  const dir = project("black", { "a.test.js": "test('REQ-001/AC-1 behaves as promised', () => {});\n" });
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 0, r.stdout);
  assert.match(line(r.stdout, "X-trace"), /^PASS/);
  assert.match(line(r.stdout, "X-trace"), /black-box/);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-168 X-trace: a [proxy:...] name is WARN, never PASS, and is not escalated to FAIL", () => {
  const dir = project("proxy", {
    "a.test.js": "test('REQ-001/AC-1 [proxy:F2 pipeline] stand-in', () => {});\n",
  });
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 0, r.stdout);
  const l = line(r.stdout, "X-trace");
  assert.match(l, /^WARN/, l);
  assert.match(l, /proxy/);
  assert.match(l, /REQ-001\/AC-1 \[F2 pipeline\]/);
  assert.doesNotMatch(l, /warn not acknowledged/);
  assert.match(r.stdout, /result: PASS_WITH_WARN/);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-168 X-trace: a white-box name carrying an AC marker is WARN this version, wherever it sits", () => {
  for (const prefix of ["ISS-001", "DEC-001", "fp:lock-race"]) {
    const dir = project(
      `white-${prefix.replace(/[^a-z]/gi, "")}`,
      { "a.test.js": `test('${prefix} REQ-001/AC-1 regression', () => {});\n` },
      { summary: false },
    );
    const r = runCheck(makeCtx(dir), ["--quick"]);
    assert.equal(r.code, 0, r.stdout);
    const l = line(r.stdout, "X-trace");
    assert.match(l, /^WARN/, `${prefix}: ${l}`);
    assert.match(l, /white-box/);
    assert.ok(l.includes(`${prefix} REQ-001/AC-1 regression`), l);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("DEC-168 X-trace: python names count via def test_ and pytest.mark lines, comments do not", () => {
  assert.deepEqual(
    testNamesIn("t.py", "# REQ-001/AC-1 comment\n@pytest.mark.req(\"REQ-001/AC-1\")\ndef test_a():\n    pass\n"),
    ['@pytest.mark.req("REQ-001/AC-1")', "def test_a():"],
  );
  const bad = project("py-comment", { "test_a.py": "# REQ-001/AC-1 only in a comment\ndef test_a():\n    pass\n" });
  assert.match(line(runCheck(makeCtx(bad), ["--quick"]).stdout, "X-trace"), /^FAIL/);
  rmSync(bad, { recursive: true, force: true });
  const good = project("py-mark", {
    "test_a.py": "import pytest\n\n@pytest.mark.req(\"REQ-001/AC-1\")\ndef test_a():\n    pass\n",
  });
  assert.match(line(runCheck(makeCtx(good), ["--quick"]).stdout, "X-trace"), /^PASS/);
  rmSync(good, { recursive: true, force: true });
});

test("DEC-168 gate trace: the matrix has a proxy column and lists white-box names carrying AC markers", () => {
  const dir = project(
    "matrix",
    {
      "a.test.js":
        "test('REQ-001/AC-1 [proxy:F2 pipeline] stand-in', () => {});\ntest('ISS-001 REQ-001/AC-2 regression', () => {});\n",
    },
    { acs: 2 },
  );
  const r = runTrace(makeCtx(dir));
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /\| proxy AC \|/);
  assert.match(r.stdout, /\| REQ-001 \|.*\| 2 \| — \| AC-1 \[F2 pipeline\] \|/);
  assert.match(r.stdout, /proxy: 1 AC\(s\)/);
  assert.match(r.stdout, /white-box names carrying an AC marker/);
  assert.match(r.stdout, /ISS-001 REQ-001\/AC-2 regression/);
  rmSync(dir, { recursive: true, force: true });
});

// Positive control (ISS-038 lesson): the judge must not punish the repo that carries it.
test("DEC-168 this repo: X-trace is PASS or a proxy-only WARN under the new judge", () => {
  const l = line(runCheck(makeCtx(repo), ["--quick"]).stdout, "X-trace");
  assert.match(l, /^(PASS|WARN)/, l);
  assert.doesNotMatch(l, /white-box/, l);
});

test("DEC-168 k-impl states the two naming kinds, the stand-in marker and the mutation rule", () => {
  const t = readFileSync(join(repo, ".agents", "skills", "k-impl", "SKILL.md"), "utf8");
  assert.match(t, /Black-box acceptance/);
  assert.match(t, /White-box regression/);
  assert.match(t, /\[proxy:/);
  assert.match(t, /ISS-nnn`, `DEC-nnn` or `fp:/);
  assert.match(t, /revert the fix/i);
  assert.match(t, /comment .* is not coverage/i);
});

// --- REQ-017 black-box acceptance (replacing the r2-rework placeholders) -------

test("REQ-017/AC-1 gate.ts runs under bare Node with builtins only when copied outside any node_modules", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-dec168-bare-"));
  cpSync(join(repo, "tools", "gate"), join(dir, "tools", "gate"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const r = spawnSync(process.execPath, ["tools/gate/gate.ts", "status"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, NODE_PATH: "" },
  });
  assert.equal(r.status, 0, (r.stdout ?? "") + (r.stderr ?? ""));
  assert.match(r.stdout, /runtime: node\+ts/);
  assert.match(r.stdout, /handoff:/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017/AC-1 I-16 the launcher refuses a Node below 22.18.0 with a human message and never reaches gate.ts", () => {
  const shim = mkdtempSync(join(tmpdir(), "keel-dec168-shim-"));
  const env: { [k: string]: string | undefined } = { ...process.env };
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[pathKey] = `${shim}${delimiter}${env[pathKey] ?? ""}`;
  let r;
  if (process.platform === "win32") {
    writeFileSync(
      join(shim, "node.cmd"),
      "@echo off\r\nif \"%~1\"==\"-p\" (echo 20.0.0& exit /b 0)\r\nif \"%~1\"==\"-e\" (exit /b 2)\r\nexit /b 99\r\n",
      "utf8",
    );
    r = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", join(repo, "tools", "gate", "gate.ps1"), "status"],
      { encoding: "utf8", env, cwd: repo },
    );
  } else {
    writeFileSync(
      join(shim, "node"),
      "#!/bin/sh\ncase \"$1\" in\n  -p) echo 20.0.0 ;;\n  -e) exit 2 ;;\n  *) exit 99 ;;\nesac\n",
      "utf8",
    );
    chmodSync(join(shim, "node"), 0o755);
    r = spawnSync("sh", [join(repo, "tools", "gate", "gate.sh"), "status"], { encoding: "utf8", env, cwd: repo });
  }
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  assert.notEqual(r.status, 0, out);
  assert.match(out, /22\.18\.0/);
  assert.match(out, /20\.0\.0/);
  assert.doesNotMatch(out, /keel status/);
  rmSync(shim, { recursive: true, force: true });
});

test("REQ-017/AC-2 gate check prints PASS/WARN/FAIL with a reason and a fix line, and a warn stands only with a worklog reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-dec168-ac2-"));
  for (const d of ["requirements", "plan", "issues", "features/f01-x"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  // WARN: a requirements file without a 未决问题 section. FAIL: two current plan pointers.
  writeFileSync(join(dir, "keel", "requirements", "v1.md"), "# r\n\n## REQ-001 X\n\n- **status**: proposed\n", "utf8");
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  const planIndex = join(dir, "keel", "plan", "INDEX.md");
  writeFileSync(planIndex, "- current: overview-v1.md\n- current: overview-v2.md\n", "utf8");
  const ctx = makeCtx(dir);

  const first = runCheck(ctx, ["--quick"]);
  assert.equal(first.code, 1, first.stdout);
  const lines = first.stdout.split(/\n/);
  const failAt = lines.findIndex((l) => /^FAIL G-plan  .+/.test(l));
  assert.ok(failAt >= 0, first.stdout);
  assert.match(lines[failAt + 1] ?? "", /^\s+fix: .+/, "a FAIL carries a fix line");
  assert.match(line(first.stdout, "G-req"), /^FAIL G-req  no 未决问题 section \(warn not acknowledged\)/);
  assert.ok(lines.some((l) => /^PASS \S+  .+/.test(l)), "a PASS carries its reason too");

  // C-103: a worklog line citing an open ISS lets the warn stand as WARN.
  writeFileSync(join(dir, "keel", "issues", "ISS-001.md"), "---\nid: ISS-001\nstatus: open\n---\n# ISS-001 open\n", "utf8");
  writeFileSync(join(dir, "keel", "features", "f01-x", "worklog.md"), "gate-warn: G-req ref=ISS-001\n", "utf8");
  const second = runCheck(ctx, ["--quick"]);
  assert.match(line(second.stdout, "G-req"), /^WARN G-req  no 未决问题 section$/);
  assert.match(second.stdout, /fix: add the section/);
  assert.equal(second.code, 1, "G-plan still fails");

  writeFileSync(planIndex, "- current: overview-v1.md\n", "utf8");
  const third = runCheck(ctx, ["--quick"]);
  assert.equal(third.code, 0, third.stdout);
  assert.match(third.stdout, /result: PASS_WITH_WARN  fail=0/);
  rmSync(dir, { recursive: true, force: true });
});
