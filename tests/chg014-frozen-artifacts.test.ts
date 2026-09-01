// CHG-014 S3 (DEC-185 / DEC-186): a frozen artifact edited after its approval reddens
// the gate (X-apr always; G-plan in --quick for plan files), and a current baseline
// that calls itself confirmed must be able to point at an approved APR that binds it.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { runCheck } from "../tools/gate/check.ts";
import { declaredStatusOf, declaresConfirmed, inspectApprovedArtifacts, isPlanArtifact } from "../tools/gate/changechain.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { sha256Body } from "../tools/gate/hash.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>\n${stdout}`;
}

type Fixture = {
  root: string;
  reqs: string;
  overview: string;
  featurePlan: string;
  dec: string;
  apr: string;
  git: (args: string[]) => string;
};

/** A local-tier project: confirmed v1 requirements, a confirmed overview, one feature plan, one DEC — all bound by APR-001. */
function fixture(tag: string, opts: { reqStatus?: string; frontMatter?: boolean; aprStatus?: string } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-frozen-${tag}-`));
  for (const d of ["requirements", "approvals", "plan", "decisions", "features/f01-x/plan"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
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
  const status = opts.reqStatus ?? "confirmed";
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  const reqs = join(root, "keel", "requirements", "v1.md");
  const reqHeader = opts.frontMatter
    ? `---\nversion: v1\nstatus: ${status}\n---\n\n# 需求书 v1\n\n`
    : `# 需求书 v1\n\n- status: ${status}\n- source: interview\n- replaces: null\n- change: null\n\n`;
  writeFileSync(
    reqs,
    reqHeader + "## 未决问题\n\n无\n\n## REQ-001 X\n\n- **status**: confirmed\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  const overview = join(root, "keel", "plan", "overview-v1.md");
  writeFileSync(
    overview,
    "---\nplan_version: v1\nstatus: 已确认（APR-001）\n---\n\n# 统一规划 v1\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  const featurePlan = join(root, "keel", "features", "f01-x", "plan", "v1.md");
  writeFileSync(featurePlan, "---\nfeature: F1\nslug: f01-x\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1 规划 v1\n\n范围：x。\n", "utf8");
  const dec = join(root, "keel", "decisions", "DEC-001-demo.md");
  writeFileSync(dec, "---\nid: DEC-001\nstatus: confirmed\n---\n\n# DEC-001 demo\n\n选 A。\n", "utf8");
  const apr = join(root, "keel", "approvals", "APR-001-baseline.md");
  const art = (rel: string, abs: string): string =>
    `  - path: ${rel}\n    version: v1\n    content_sha256: ${opts.aprStatus === "draft" ? "pending" : sha256Body(readFileSync(abs))}\n`;
  writeFileSync(
    apr,
    "---\nid: APR-001\n" +
      `status: ${opts.aprStatus ?? "approved"}\n` +
      "date: 2026-09-01\napprover: \"kopit <wwillmee@gmail.com>\"\ndelegated: \"「由你提交」(2026-09-01)\"\nartifacts:\n" +
      art("keel/requirements/v1.md", reqs) +
      art("keel/plan/overview-v1.md", overview) +
      art("keel/features/f01-x/plan/v1.md", featurePlan) +
      art("keel/decisions/DEC-001-demo.md", dec) +
      "---\n\n# APR-001 baseline\n",
    "utf8",
  );
  const git = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
    return r.stdout.trim();
  };
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", "kopit"]);
  git(["config", "user.email", "wwillmee@gmail.com"]);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "baseline"]);
  return { root, reqs, overview, featurePlan, dec, apr, git };
}

function waiver(root: string, check: string, apr: string): void {
  const wl = join(root, "keel", "features", "f01-x", "worklog.md");
  const prev = existsSync(wl) ? readFileSync(wl, "utf8") : "# worklog\n";
  writeFileSync(wl, `${prev}\n- 2026-09-01 错字修正，语义未变。gate-warn: ${check} ref=${apr}\n`, "utf8");
}

test("REQ-018/AC-7 X-apr fails when an approved artifact's body drifted and stands down only with a worklog line citing that APR; a missing artifact always fails", () => {
  const f = fixture("xapr");
  const ctx = makeCtx(f.root);
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^PASS.*unchanged/);
  assert.deepEqual(inspectApprovedArtifacts(ctx).map((d) => d.state), ["ok", "ok", "ok", "ok"]);
  writeFileSync(f.dec, readFileSync(f.dec, "utf8").replace("选 A。", "选 A（补充理由）。"), "utf8");
  const red = line(runCheck(ctx, []).stdout, "X-apr");
  assert.match(red, /^FAIL X-apr.*DEC-001-demo\.md \(APR-001\).*warn not acknowledged/);
  waiver(f.root, "X-apr", "APR-001");
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^WARN X-apr.*edited after approval/);
  rmSync(f.dec);
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^FAIL X-apr.*approved artifact missing: keel\/decisions\/DEC-001-demo\.md/);
  rmSync(f.root, { recursive: true, force: true });
});

test("REQ-004/AC-11 G-plan in --quick fails when an approved feature plan is edited in place, and when the current overview says 已确认 without an approved APR", () => {
  const f = fixture("gplan");
  const ctx = makeCtx(f.root);
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-plan"), /^PASS/);
  writeFileSync(f.featurePlan, readFileSync(f.featurePlan, "utf8") + "\n步骤 9：新增的测试义务。\n", "utf8");
  assert.match(
    line(runCheck(ctx, ["--quick"]).stdout, "G-plan"),
    /^FAIL G-plan.*edited in place: keel\/features\/f01-x\/plan\/v1\.md \(APR-001\).*warn not acknowledged/,
  );
  waiver(f.root, "G-plan", "APR-001");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-plan"), /^WARN G-plan.*edited in place/);
  rmSync(f.root, { recursive: true, force: true });

  const g = fixture("gplan-noapr", { aprStatus: "draft" });
  const full = runCheck(makeCtx(g.root), ["--quick"]).stdout;
  assert.match(line(full, "G-plan"), /^FAIL G-plan.*overview-v1\.md declares "已确认（APR-001）" but no approved APR binds it/);
  assert.match(full, /DEC-186/);
  rmSync(g.root, { recursive: true, force: true });
});

test("REQ-001/AC-7 G-req fails when the current requirements declare 已确认 while the only APR is still a draft (the fmea-v3 shape), and passes once an approved APR binds the body", () => {
  const f = fixture("greq", { reqStatus: "已确认（2026-08-29 用户「可以」；APR-001）", frontMatter: true, aprStatus: "draft" });
  const ctx = makeCtx(f.root);
  assert.match(
    line(runCheck(ctx, ["--quick"]).stdout, "G-req"),
    /^FAIL G-req.*v1\.md declares "已确认（2026-08-29 用户「可以」；APR-001）" but no approved APR binds it/,
  );
  // the human runs gate approve → approved + real hashes → green
  let aprText = readFileSync(f.apr, "utf8").replace("status: draft", "status: approved");
  for (const [rel, abs] of [
    ["keel/requirements/v1.md", f.reqs],
    ["keel/plan/overview-v1.md", f.overview],
    ["keel/features/f01-x/plan/v1.md", f.featurePlan],
    ["keel/decisions/DEC-001-demo.md", f.dec],
  ] as const) {
    aprText = aprText.replace(`path: ${rel}\n    version: v1\n    content_sha256: pending`, `path: ${rel}\n    version: v1\n    content_sha256: ${sha256Body(readFileSync(abs))}`);
  }
  writeFileSync(f.apr, aprText, "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^PASS/);
  // a body edit after approval is the DEC-185 WARN, escalated until the worklog cites the APR
  writeFileSync(f.reqs, readFileSync(f.reqs, "utf8").replace("Then c", "Then c（措辞）"), "utf8");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^FAIL G-req.*v1\.md body changed after its approval APR-001.*warn not acknowledged/);
  waiver(f.root, "G-req", "APR-001");
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^WARN G-req.*body changed after its approval APR-001/);
  rmSync(f.root, { recursive: true, force: true });
});

test("DEC-186 a current baseline that says proposed is never judged for a binding, and the status is read from both header styles", () => {
  const f = fixture("proposed", { reqStatus: "proposed（待用户点头）", aprStatus: "draft" });
  assert.doesNotMatch(line(runCheck(makeCtx(f.root), ["--quick"]).stdout, "G-req"), /no approved APR binds/);
  rmSync(f.root, { recursive: true, force: true });
  assert.equal(declaredStatusOf("---\nversion: v3\nstatus: 已确认（APR-003）\n---\n\n# x\n"), "已确认（APR-003）");
  assert.equal(declaredStatusOf("# 需求书 v5\n\n- version: v5\n- status: confirmed（经 APR-005 确认）\n\n## REQ-001\n\n- **status**: confirmed\n"), "confirmed（经 APR-005 确认）");
  assert.equal(declaredStatusOf("# plain\n\n## REQ-001\n\n- **status**: confirmed\n"), "");
  assert.ok(declaresConfirmed("工作规划（CHG-011 / APR-004 已批准）"));
  assert.ok(!declaresConfirmed("工作规划"));
  assert.ok(!declaresConfirmed("proposed（待 APR-006 点头）"));
  assert.ok(isPlanArtifact("keel/plan/overview-v4.md"));
  assert.ok(isPlanArtifact("keel/features/f07-review/plan/v4.md"));
  assert.ok(!isPlanArtifact("keel/decisions/DEC-001-x.md"));
  assert.ok(!isPlanArtifact("keel/requirements/v6.md"));
});
