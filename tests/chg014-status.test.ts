// CHG-014 S2 (ISS-060 / REQ-012 AC-5 / REQ-025 AC-10): `gate status` tells a fresh
// session the true next step on an empty project, a baselined one, a planned one and
// a finished one, and says when a newer keel is installed.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { installerVersion, nextLine, versionLine } from "../tools/gate/status.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function status(root: string, extraEnv: { [k: string]: string } = {}): string {
  const r = spawnSync(process.execPath, [join(repo, "tools", "gate", "gate.ts"), "--root", root, "status"], {
    cwd: root,
    encoding: "utf8",
    env: { ...scrubHookGitEnv(process.env), KEEL_INSTALLER_ROOT: "none", ...extraEnv },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

function lineOf(out: string, key: string): string {
  return out.split("\n").find((l) => l.startsWith(`${key}: `)) ?? `<no ${key} line>`;
}

function project(tag: string, stage: "empty" | "baseline" | "planned" | "done"): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-status-${tag}-`));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel", keel_version: "0.9.1" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  if (stage === "empty") return root;
  mkdirSync(join(root, "keel", "requirements"), { recursive: true });
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "v1.md"), "# 需求书 v1\n\n- status: proposed\n\n## 未决问题\n\n无\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n", "utf8");
  if (stage === "baseline") return root;
  mkdirSync(join(root, "keel", "plan"), { recursive: true });
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "overview-v1.md"), "---\nplan_version: v1\nstatus: 工作规划\n---\n\n# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n", "utf8");
  mkdirSync(join(root, "keel", "features", "f01-x", "plan"), { recursive: true });
  writeFileSync(join(root, "keel", "features", "f01-x", "plan", "v1.md"), "---\nfeature: F1\nslug: f01-x\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1\n", "utf8");
  if (stage === "planned") return root;
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# 功能总结 — F1\n", "utf8");
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(join(root, "tests", "req001.test.ts"), 'import { test } from "node:test";\ntest("REQ-001/AC-1 c", () => {});\n', "utf8");
  return root;
}

test("ISS-060 an empty project's next line says run k-new and never mentions a plan-level review", () => {
  const root = project("empty", "empty");
  const next = lineOf(status(root), "next");
  assert.match(next, /^next: no baseline yet — run k-new/);
  assert.doesNotMatch(next, /review|acceptance/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-012/AC-5 next: says finish k-new step 4 with a baseline but no plan, start the frontier feature with a plan, and k-review then k-accept once every feature has its summary", () => {
  const baseline = project("baseline", "baseline");
  assert.match(lineOf(status(baseline), "next"), /^next: requirements baselined, plan missing — finish k-new step 4/);
  rmSync(baseline, { recursive: true, force: true });
  const planned = project("planned", "planned");
  assert.match(lineOf(status(planned), "next"), /^next: start F1 \(frontier\); then read /);
  rmSync(planned, { recursive: true, force: true });
  const done = project("done", "done");
  assert.match(lineOf(status(done), "next"), /^next: all features have summary\.md — plan-level review \(k-review\), then acceptance \(k-accept\)/);
  rmSync(done, { recursive: true, force: true });
  const handoff = "keel/handoff.md";
  assert.match(nextLine({ hasBaseline: true, hasPlan: true, frontier: [], blocked: [{ id: "F2", by: ["F1"] }], planDone: false }, handoff), /waiting on blockers: F2 \(by F1\)/);
  assert.match(nextLine({ hasBaseline: true, hasPlan: true, frontier: [], blocked: [], planDone: false }, handoff), /no feature planned yet/);
});

test("REQ-025/AC-10 gate status prints the project keel_version next to the installer's and says run keel update when the installer is newer", () => {
  const installer = mkdtempSync(join(tmpdir(), "keel-chg014-installer-"));
  writeFileSync(join(installer, "package.json"), JSON.stringify({ name: "keel", version: "9.9.9" }), "utf8");
  assert.equal(installerVersion({ KEEL_INSTALLER_ROOT: installer }), "9.9.9");
  assert.equal(installerVersion({ KEEL_INSTALLER_ROOT: "none" }), "");
  assert.equal(installerVersion({ KEEL_INSTALLER_ROOT: join(installer, "missing") }), "");
  assert.equal(versionLine("0.9.1", "9.9.9"), "keel: 0.9.1 (installer 9.9.9 — run keel update)");
  assert.equal(versionLine("9.9.9", "9.9.9"), "keel: 9.9.9 (installer 9.9.9)");
  assert.equal(versionLine("9.9.10", "9.9.9"), "keel: 9.9.10 (installer 9.9.9)");
  assert.equal(versionLine("0.9.1", ""), "keel: 0.9.1");
  assert.equal(versionLine("", ""), "keel: unknown");
  const root = project("version", "planned");
  assert.equal(lineOf(status(root, { KEEL_INSTALLER_ROOT: installer }), "keel"), "keel: 0.9.1 (installer 9.9.9 — run keel update)");
  assert.equal(lineOf(status(root), "keel"), "keel: 0.9.1");
  rmSync(root, { recursive: true, force: true });
  rmSync(installer, { recursive: true, force: true });
});
