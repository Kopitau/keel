// CHG-016: second audit of the pilots (zhaoxi 09-01…09-04, taotie k-new). Each test
// names the pilot event that exposed the gap.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { overviewStale, runCheck } from "../tools/gate/check.ts";
import { runIndex } from "../tools/gate/indexgen.ts";
import { runNew } from "../tools/gate/new.ts";
import { asciiSlug, duplicateRecordIds, nextNumber } from "../tools/gate/ids.ts";
import { baseDiff, fileFindings, lockfileDeltas } from "../tools/gate/reviewloop.ts";
import { claimPlanFiles } from "../tools/gate/trace.ts";
import { gitDirty, gitWriteTree } from "../tools/gate/git.ts";
import { sha256Body } from "../tools/gate/hash.ts";
import { runCli } from "../tools/cli/main.js";
import { buildCleanConfig } from "../tools/cli/init.js";
import { scrubHookGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...scrubHookGitEnv(process.env), KEEL_ANCESTRY: "0", KEEL_INSTALLER_ROOT: "none" };

function g(root: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  return (r.stdout ?? "").trim();
}

function w(root: string, rel: string, text: string): void {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text, "utf8");
}

const REQ_V1 = "# 需求书 v1\n\n- status: proposed\n\n## 未决问题\n\n无\n\n## REQ-001 登录\n\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n";

function project(tag: string, opts: { git?: boolean; approvals?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg016-${tag}-`));
  w(root, "keel/config.json", JSON.stringify({ records_dir: "keel", enforcement_tier: "local", profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test" } } }) + "\n");
  w(root, "AGENTS.md", "# k\n");
  w(root, "CLAUDE.md", "@AGENTS.md\n");
  w(root, "keel/templates/ISS.md", readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"));
  w(root, "keel/templates/DEC.md", readFileSync(join(repo, "keel", "templates", "DEC.md"), "utf8"));
  w(root, "keel/requirements/INDEX.md", "- current: v1.md\n");
  w(root, "keel/requirements/v1.md", REQ_V1);
  w(root, "keel/plan/INDEX.md", "- current: overview-v1.md\n");
  w(root, "keel/plan/overview-v1.md", "---\nplan_version: v1\nstatus: 工作规划\n---\n\n# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n");
  w(root, "keel/features/f01-login/plan/v1.md", "---\nfeature: F1\nslug: f01-login\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1 — 规划 v1\n");
  w(root, "keel/features/f01-login/worklog.md", "# F1\n");
  w(root, "keel/issues/.gitkeep", "");
  w(root, "keel/decisions/.gitkeep", "");
  w(root, "tests/login.test.js", "const { test } = require('node:test');\ntest('REQ-001/AC-1 login works', () => {});\n");
  w(root, ".gitignore", "keel/evidence/*.json\nkeel/evidence/*.xml\nkeel/review/pack.json\n");
  if (opts.approvals) mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  if (opts.git) {
    g(root, ["init", "-q", "-b", "main"]);
    g(root, ["config", "user.name", "h"]);
    g(root, ["config", "user.email", "h@x"]);
    g(root, ["add", "-A"]);
    g(root, ["commit", "-q", "-m", "base"]);
  }
  return root;
}

/** An approved APR binding `rel` by body hash (what k-new step 5 leaves behind). */
function approve(root: string, id: string, rels: string[]): void {
  const artifacts = rels.map((rel) => `  - path: "${rel}"\n    version: "v1"\n    content_sha256: ${sha256Body(readFileSync(join(root, rel)))}`).join("\n");
  w(root, `keel/approvals/${id}-x.md`, `---\nid: ${id}\nstatus: approved\napprover: "h <h@x>"\ndelegated: "「可以」(2026-09-04)"\nartifacts:\n${artifacts}\n---\n\n# ${id}\n`);
}

function line(out: string, id: string): string {
  return out.split(/\n/).find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

function status(root: string): string {
  const r = spawnSync(process.execPath, [join(repo, "tools", "gate", "gate.ts"), "--root", root, "status"], { cwd: root, encoding: "utf8", env });
  return r.stdout;
}

// ---------------------------------------------------------------- ISS-071: draft plan versions

test("REQ-006/AC-11 a draft plan version citing unbaselined requirements only warns; the approved version defines the claim (zhaoxi wt-F2, 43 files stuck)", () => {
  const root = project("draft", { git: true, approvals: true });
  approve(root, "APR-001", ["keel/requirements/v1.md", "keel/features/f01-login/plan/v1.md"]);
  w(root, "keel/features/f01-login/summary.md", "# done\n");
  // a change in flight: plan v2 cites REQ-017, which the current baseline does not have
  w(root, "keel/features/f01-login/plan/v2.md", "---\nfeature: F1\nslug: f01-login\nplan_version: v2\nreq: [REQ-001, REQ-017]\nblocked_by: []\n---\n\n# F1 — 规划 v2\n");
  const ctx = makeCtx(root);
  assert.deepEqual(claimPlanFiles(ctx, join(root, "keel", "features", "f01-login")).map((p) => p.replace(/\\/g, "/").split("/").pop()), ["v1.md"]);
  const l = line(runCheck(ctx, ["--quick"]).stdout, "X-trace");
  assert.doesNotMatch(l, /^FAIL/, l);
  // and even with no bound version the unknown id is a warning, not a red light
  rmSync(join(root, "keel", "approvals"), { recursive: true, force: true });
  const l2 = line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-trace");
  assert.match(l2, /^WARN.*outside the current baseline.*REQ-017/, l2);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-072: ids across worktrees and branches

test("REQ-019/AC-7 gate new allocates ids across keel/* branches and other worktrees, and gate index refuses duplicates (zhaoxi merge: two DEC-021, two APR-006, two ISS-032)", () => {
  const root = project("ids", { git: true });
  w(root, "keel/decisions/DEC-001-a.md", "---\nid: DEC-001\n---\n# a\n");
  g(root, ["add", "-A"]);
  g(root, ["commit", "-q", "-m", "dec1"]);
  // a feature branch that allocated DEC-005 and, in its worktree, an uncommitted ISS-009
  g(root, ["worktree", "add", "-q", "-b", "keel/F-2-x", join(root, ".keel-worktrees", "F-02-x")]);
  const wt = join(root, ".keel-worktrees", "F-02-x");
  w(wt, "keel/decisions/DEC-005-branch.md", "---\nid: DEC-005\n---\n# b\n");
  g(wt, ["add", "-A"]);
  g(wt, ["commit", "-q", "-m", "dec5 on branch"]);
  w(wt, "keel/issues/ISS-009-uncommitted.md", "---\nid: ISS-009\n---\n# u\n");
  const ctx = makeCtx(root);
  assert.equal(nextNumber(ctx, "dec"), 6);
  assert.equal(nextNumber(ctx, "iss"), 10);
  // duplicates after a merge that kept both sides
  w(root, "keel/decisions/DEC-001-other.md", "---\nid: DEC-001\n---\n# dup\n");
  assert.deepEqual(duplicateRecordIds(ctx), ["DEC-001"]);
  const r = runIndex(ctx);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /duplicate record ids: DEC-001/);
  g(root, ["worktree", "remove", "--force", wt]);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-076: file names

test("REQ-010/AC-7 a Chinese title gets a readable file name via --slug, and a cut slug never ends in a hyphen", () => {
  assert.equal(asciiSlug("F6 activity stream and typed withdrawal contract for hosts", "z").endsWith("-"), false);
  assert.equal(asciiSlug("主机门可被绕过", "z").startsWith("z-"), true);
  const root = project("slug");
  const r = runNew(makeCtx(root), ["iss", "主机门可被解释器写入绕过", "--slug", "host-gate-interpreter-bypass"]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(readdirSync(join(root, "keel", "issues")).includes("ISS-001-host-gate-interpreter-bypass.md"));
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-077: review-opened ISS carry their feature and the finding body

test("REQ-010/AC-8 an ISS opened by the review loop is named by its fingerprint, owned by the criterion's feature, and carries the finding body as 现象", () => {
  const root = project("owner", { git: true });
  w(root, "keel/requirements/v1.md", REQ_V1.replace("  - Given a When b Then c\n", "  - Given a When b Then c\n  - Given d When e Then f\n").replace("[auto]", "[auto, auto]"));
  const out = fileFindings(makeCtx(root), [
    { title: "第二条路径没有测试", blocking: true, repro: "", impact: "x", ac: "REQ-001/AC-2", fingerprint: "login-second-path-untested", body: "详细现象：第二条登录路径没有任何黑盒测试。" },
  ]);
  assert.equal(out.iss.length, 1, JSON.stringify(out));
  const files = readdirSync(join(root, "keel", "issues")).filter((n) => n.startsWith("ISS-"));
  assert.deepEqual(files, ["ISS-001-login-second-path-untested.md"]);
  const body = readFileSync(join(root, "keel", "issues", files[0] ?? ""), "utf8");
  assert.match(body, /feature: "F1"/);
  assert.match(body, /## 现象\s+详细现象：第二条登录路径没有任何黑盒测试。/);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- proxy without release condition

test("REQ-006/AC-12 a [proxy:…] note without a feature or record that releases it is warned about", () => {
  const root = project("proxy", { git: true });
  w(root, "keel/features/f01-login/summary.md", "# done\n");
  w(root, "tests/login.test.js", "const { test } = require('node:test');\ntest('REQ-001/AC-1 [proxy:real host browser evidence pending] login works', () => {});\n");
  const l = line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-trace");
  assert.match(l, /proxy without a release condition.*REQ-001\/AC-1/, l);
  w(root, "tests/login.test.js", "const { test } = require('node:test');\ntest('REQ-001/AC-1 [proxy:F2 管道] login works', () => {});\n");
  const l2 = line(runCheck(makeCtx(root), ["--quick"]).stdout, "X-trace");
  assert.doesNotMatch(l2, /without a release condition/, l2);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-075: a fresh project's verdicts

test("REQ-026/AC-5 G-merge stays SKIP until something is built; status says the baseline is unapproved; a scaffold plan warns (taotie day one)", () => {
  const root = project("fresh", { git: true, approvals: true });
  approve(root, "APR-001", ["keel/requirements/v1.md"]);
  w(root, "keel/features/f02-scaffold/plan/v1.md", "---\nfeature: F2\nslug: f02-scaffold\nplan_version: v1\nreq: [REQ-000]\nblocked_by: []\n---\n\n# F2 标题 — 规划 v1\n");
  const ctx = makeCtx(root);
  const full = runCheck(ctx, []).stdout;
  assert.match(line(full, "G-merge"), /^SKIP.*nothing built/, full);
  assert.match(line(full, "G-plan"), /^WARN.*template plan.*f02-scaffold/, full);
  // the overview is still proposed and unbound → next: does not say "start F1"
  w(root, "keel/plan/overview-v1.md", "---\nplan_version: v1\nstatus: proposed\n---\n\n# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n");
  assert.match(status(root).split("\n").find((l) => l.startsWith("next: ")) ?? "", /^next: requirements\/plan drafted but not approved — finish k-new step 5/);
  // a claim starts the merge lane
  w(root, "keel/features/f01-login/claim.json", "{}\n");
  assert.doesNotMatch(line(runCheck(ctx, []).stdout, "G-merge"), /^SKIP/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-012/AC-7 status condenses the proxy list to a count and names a missing human identity", () => {
  const root = project("missing", { git: true });
  w(root, "keel/features/f01-login/summary.md", "# done\n");
  w(root, "tests/login.test.js", "const { test } = require('node:test');\ntest('REQ-001/AC-1 [proxy:F2 管道] login works', () => {});\n");
  const out = status(root);
  const missing = out.split("\n").find((l) => l.startsWith("missing: ")) ?? "";
  assert.match(missing, /humans: none in config identities\.humans/);
  assert.match(missing, /proxy coverage: 1 AC\(s\) are stand-ins/);
  assert.doesNotMatch(missing, /\[proxy:F2/);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- DEC-192: records never move the evidence tree

test("REQ-006/AC-13 editing records leaves the evidence tree and the dirty flag alone; code and the test-command config still count (DEC-192)", () => {
  const root = project("tree", { git: true });
  const ctx = makeCtx(root);
  const before = gitWriteTree(ctx);
  assert.equal(gitDirty(ctx), false);
  w(root, "keel/decisions/DEC-001-x.md", "---\nid: DEC-001\n---\n# d\n");
  w(root, "keel/features/f01-login/worklog.md", "# F1\n\n- one more line\n");
  w(root, "keel/features/f01-login/summary.md", "# done\n");
  assert.equal(gitWriteTree(ctx), before, "records moved the tree");
  assert.equal(gitDirty(ctx), false, "records made the tree dirty");
  w(root, "src.txt", "code\n");
  assert.notEqual(gitWriteTree(ctx), before);
  assert.equal(gitDirty(ctx), true);
  rmSync(join(root, "src.txt"));
  w(root, "keel/config.json", JSON.stringify({ records_dir: "keel", enforcement_tier: "local", profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test --test-concurrency=1" } } }) + "\n");
  assert.notEqual(gitWriteTree(ctx), before, "the test-command config is part of what verify means");
  assert.equal(gitDirty(ctx), true);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- REQ-009: retro not skipped silently

test("REQ-009/AC-5 OVERVIEW.md older than the newest summary is reported as a skipped retro", () => {
  const root = project("retro");
  w(root, "keel/OVERVIEW.md", "# o\n");
  w(root, "keel/features/f01-login/summary.md", "# done\n");
  const old = new Date(Date.now() - 86400000);
  utimesSync(join(root, "keel", "OVERVIEW.md"), old, old);
  assert.match(overviewStale(makeCtx(root), ["f01-login"]), /OVERVIEW\.md is older than f01-login\/summary\.md/);
  utimesSync(join(root, "keel", "features", "f01-login", "summary.md"), old, old);
  assert.equal(overviewStale(makeCtx(root), ["f01-login"]), "");
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- BRIEF

test("REQ-004/AC-11 a decision brief lives beside the decisions, has a template, and is listed by gate index without becoming a DEC", () => {
  assert.ok(existsSync(join(repo, "keel", "templates", "BRIEF.md")));
  const root = project("brief");
  w(root, "keel/decisions/BRIEF-2026-09-04-pending.md", "# 待表态说明\n");
  const r = runIndex(makeCtx(root));
  assert.equal(r.code, 0, r.stderr);
  const idx = readFileSync(join(root, "keel", "decisions", "INDEX.md"), "utf8");
  assert.match(idx, /## briefs/);
  assert.match(idx, /BRIEF-2026-09-04-pending\.md/);
  assert.doesNotMatch(idx, /\| BRIEF/);
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- framework files in the pack

test("REQ-028/AC-4 the pack lists keel-managed files by name only, diffs product files, and shows lockfile deltas when configured", () => {
  const root = project("pack", { git: true });
  w(root, "tools/gate/check.ts", "export const a = 1;\n");
  w(root, "src/b.ts", "export const b = 1;\n");
  g(root, ["add", "-A"]);
  g(root, ["commit", "-q", "-m", "base2"]);
  const base = g(root, ["rev-parse", "HEAD"]);
  w(root, "tools/gate/check.ts", "export const a = 2; // FRAMEWORK-BODY\n");
  w(root, "src/b.ts", "export const b = 2; // PRODUCT-BODY\n");
  const diff = baseDiff(makeCtx(root), base);
  assert.match(diff, /PRODUCT-BODY/);
  assert.doesNotMatch(diff, /FRAMEWORK-BODY/);
  assert.match(diff, /# framework files changed[\s\S]*- tools\/gate\/check\.ts/);
  // keel's own repository reviews its gate as product code
  w(root, "keel/config.json", JSON.stringify({ records_dir: "keel", review: { self_hosted: true } }) + "\n");
  assert.match(baseDiff(makeCtx(root), base), /FRAMEWORK-BODY/);
  const before = "lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n      left-pad:\n        specifier: ^1.0.0\n        version: 1.0.0\n\npackages:\n\n  left-pad@1.0.0:\n    resolution: {integrity: sha512-a}\n";
  const after = before.replace("version: 1.0.0", "version: 1.3.0").replace("left-pad@1.0.0:", "left-pad@1.3.0:") + "\n  right-pad@2.0.0:\n    resolution: {integrity: sha512-b}\n";
  const rows = lockfileDeltas(before, after);
  assert.ok(rows.some((r) => /~ \. \| dependencies \| left-pad: specifier=\^1\.0\.0; version=1\.0\.0 -> specifier=\^1\.0\.0; version=1\.3\.0/.test(r)), rows.join("\n"));
  assert.ok(rows.some((r) => /\+ packages \| right-pad@2\.0\.0/.test(r)), rows.join("\n"));
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------- ISS-073 / ISS-074: installer

test("REQ-025/AC-11 keel update rewrites only the keel section of AGENTS.md, writes an install manifest, and names a local patch before overwriting it", () => {
  const source = mkdtempSync(join(tmpdir(), "keel-chg016-src-"));
  const mk = (version: string, gate: string) => {
    w(source, "package.json", JSON.stringify({ name: "keel", version }));
    w(source, "tools/gate/gate.ts", gate);
    w(source, "keel/templates/DEC.md", "# t\n");
    w(source, ".githooks/pre-commit", "#!/bin/sh\n");
    w(source, "CLAUDE.md", "@AGENTS.md\n");
    w(source, ".gitattributes", "* text=auto eol=lf\n");
    w(source, ".agents/skills/k-a/SKILL.md", "# a\n");
    w(source, "AGENTS.md", `<!-- keel:begin -->\n# keel ${version}\n<!-- keel:end -->\n`);
  };
  mk("0.9.0", "export const v = 1;\n");
  const root = mkdtempSync(join(tmpdir(), "keel-chg016-proj-"));
  w(root, "keel/config.json", JSON.stringify({ records_dir: "keel", keel_version: "0.8.0" }) + "\n");
  w(root, "AGENTS.md", "<!-- keel:begin -->\n# keel 0.8.0\n<!-- keel:end -->\n\n## Project rules\n\nkeep me\n");
  const first = runCli(["update", "--yes"], { cwd: root, source, confirmUpdate: () => null });
  assert.equal(first.code, 0, first.stderr);
  const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /# keel 0\.9\.0/);
  assert.match(agents, /keep me/);
  assert.doesNotMatch(agents, /# keel 0\.8\.0/);
  const manifest = JSON.parse(readFileSync(join(root, "keel", "installed.json"), "utf8")) as { keel_version: string; files: { [k: string]: string } };
  assert.equal(manifest.keel_version, "0.9.0");
  assert.ok(manifest.files["tools/gate/gate.ts"]);
  // a local patch to a managed file is named in the next preview
  w(root, "tools/gate/gate.ts", "export const v = 1; // patched locally\n");
  mk("0.9.1", "export const v = 2;\n");
  const second = runCli(["update"], { cwd: root, source, confirmUpdate: () => null });
  assert.equal(second.code, 0, second.stderr);
  assert.match(second.stdout, /OVERWRITE tools\/gate\/gate\.ts  \(LOCAL PATCH/);
  // a project whose AGENTS.md has no markers keeps it and is told why
  w(root, "AGENTS.md", "# my own file\n");
  const third = runCli(["update"], { cwd: root, source, confirmUpdate: () => null });
  assert.equal(third.code, 0, third.stderr);
  assert.match(third.stdout, /note: AGENTS\.md has no <!-- keel:begin -->/);
  rmSync(root, { recursive: true, force: true });
  rmSync(source, { recursive: true, force: true });
});

test("REQ-025/AC-12 keel init no longer copies keel's platform note into the project config, and keel's own AGENTS.md carries the markers", () => {
  const cfg = buildCleanConfig({ source: repo, cwd: tmpdir(), name: "x" });
  assert.doesNotMatch(cfg, /deepseek_harness_windows/);
  assert.doesNotMatch(readFileSync(join(repo, "keel", "templates", "config.json"), "utf8"), /deepseek_harness_windows/);
  const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
  assert.ok(agents.startsWith("<!-- keel:begin -->"));
  assert.ok(agents.trimEnd().endsWith("<!-- keel:end -->"));
});

// ---------------------------------------------------------------- skills and docs

test("REQ-004/AC-12 k-new ends its round at the approval, k-impl runs k-retro, k-change keeps plan-level changes on the trunk, k-log names ISS sources", () => {
  const skill = (n: string) => readFileSync(join(repo, ".agents", "skills", n, "SKILL.md"), "utf8");
  assert.match(skill("k-new"), /This round ends here/);
  assert.match(skill("k-new"), /BRIEF/);
  assert.match(skill("k-impl"), /k-retro/);
  assert.match(skill("k-change"), /on the trunk/);
  assert.match(skill("k-log"), /self-check/);
  assert.match(skill("k-evidence"), /release condition/);
  assert.match(skill("k-grill"), /only writer/);
  assert.match(skill("k-review"), /Framework files/);
  assert.match(readFileSync(join(repo, "keel", "review", "checklist.md"), "utf8"), /不审 keel 自己的文件/);
  assert.match(readFileSync(join(repo, "CONTEXT.md"), "utf8"), /BRIEF/);
});
