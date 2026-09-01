// CHG-014 / REQ-006 AC-10: the gate says what the tests proved, by feature and in
// words — never "N passed" alone.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { featureCoverageLines } from "../tools/gate/trace.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function gate(root: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  return spawnSync(process.execPath, [join(repo, "tools", "gate", "gate.ts"), "--root", root, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...scrubHookGitEnv(process.env), KEEL_INSTALLER_ROOT: "none" },
  });
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-chg014-evsum-"));
  const w = (rel: string, t: string): void => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), t, "utf8");
  };
  w("keel/config.json", JSON.stringify({ records_dir: "keel", profiles: { active: ["node-test"], "node-test": { language: "typescript", test_command: "node --test" } } }));
  w("AGENTS.md", "# k\n");
  w("keel/requirements/INDEX.md", "- current: v1.md\n");
  w(
    "keel/requirements/v1.md",
    "# 需求书 v1\n\n- status: proposed\n\n## 未决问题\n\n无\n\n## REQ-001 登录\n\n- **acceptance**:\n  - Given a When b Then c\n  - Given d When e Then f\n- **verification**: [auto, auto]\n\n## REQ-002 导出\n\n- **acceptance**:\n  - Given g When h Then i\n- **verification**: [auto]\n",
  );
  w("keel/plan/INDEX.md", "- current: overview-v1.md\n");
  w("keel/plan/overview-v1.md", "---\nstatus: 工作规划\n---\n\n# p\n\n## 接口与耦合\n\n| I-01 | A |\n");
  w("keel/features/f01-login/plan/v1.md", "---\nfeature: F1\nslug: f01-login\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1\n");
  w("keel/features/f01-login/summary.md", "# s\n");
  w("keel/features/f02-export/plan/v1.md", "---\nfeature: F2\nslug: f02-export\nplan_version: v1\nreq: [REQ-002]\nblocked_by: [F1]\n---\n\n# F2\n");
  w("tests/login.test.ts", 'import { test } from "node:test";\ntest("REQ-001/AC-1 c happens", () => {});\ntest("REQ-001/AC-2 [proxy:real backend lands in F2] f happens", () => {});\n');
  const g = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  };
  g(["init", "-q", "-b", "main"]);
  g(["config", "user.name", "t"]);
  g(["config", "user.email", "t@t.t"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "base"]);
  return root;
}

test("REQ-006/AC-10 gate trace opens with a per-feature summary in words: requirement titles, criteria counted as black-box / stand-in / missing, and the test files", () => {
  const root = fixture();
  const lines = featureCoverageLines(makeCtx(root));
  assert.deepEqual(lines, [
    "F1 f01-login（已 summary）— REQ-001 登录：2 条验收，黑盒 1，替身 1（AC-2）；测试 tests/login.test.ts",
    "F2 f02-export（施工中）— REQ-002 导出：1 条验收，黑盒 0，缺 1（AC-1）；无测试",
  ]);
  const r = gate(root, ["trace"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^## 按功能（人话，REQ-006\/AC-10）$/m);
  assert.match(r.stdout, /^- F1 f01-login（已 summary）— REQ-001 登录：2 条验收，黑盒 1，替身 1（AC-2）；测试 tests\/login\.test\.ts$/m);
  assert.match(r.stdout, /^- F2 f02-export（施工中）— REQ-002 导出：1 条验收，黑盒 0，缺 1（AC-1）；无测试$/m);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-006/AC-10 gate verify ends with the same coverage-by-feature lines next to its counts", () => {
  const root = fixture();
  const r = gate(root, ["verify"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /^counts: passed=2 failed=0 skipped=0$/m);
  assert.match(r.stdout, /^coverage by feature:$/m);
  assert.match(r.stdout, /^  F1 f01-login（已 summary）— REQ-001 登录：2 条验收，黑盒 1，替身 1（AC-2）/m);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-006/AC-10 keel's own trace names its gate feature and requirement in words", () => {
  const r = gate(repo, ["trace"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^- F17 f17-gate（已 summary）— REQ-017 门禁强制层：\d+ 条验收/m);
});
