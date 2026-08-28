// R6 field guards — defenses distilled from the first real project use of keel
// (zhaoxi, 2026-08-25). Each test pins a deviation the gate could not see at the
// time. These are negative guards: they must FAIL on the shape that slipped through.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

// Self-clean at load: when a git hook (or any caller) exports GIT_DIR /
// GIT_INDEX_FILE, both fixture `git` spawns AND the in-process gate git() calls
// under test get hijacked onto the real repo — two rogue commits landed on the
// real HEAD before this line existed (2026-08-26). The same hook also exports
// GIT_AUTHOR_* / GIT_COMMITTER_*, which turned every fixture commit below into a
// keel-agent commit and failed the X-apr guards for the wrong reason (ISS-045).
// Tests must not trust the inherited git environment — one shared pattern, not a list.
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";
scrubProcessGitEnv(process.env);

function fixture(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-r6-${tag}-`));
  for (const d of ["requirements", "research", "oss", "features", "decisions", "issues"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", keel_version: "0.8.0" }),
    "utf8",
  );
  return dir;
}

function res(dir: string, id: string, frontmatterTail: string): void {
  writeFileSync(
    join(dir, "keel", "research", `${id}-x.md`),
    `---\nid: ${id}\ntitle: t\ndepth: deep\ndate: 2026-08-26\nfeatures: []\n${frontmatterTail}---\n\n# ${id}\n`,
    "utf8",
  );
}

function reqs(dir: string, version: string, body: string): void {
  writeFileSync(
    join(dir, "keel", "requirements", "INDEX.md"),
    `# requirements index\n\n- current: ${version}\n`,
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", version), body, "utf8");
}

function line(stdout: string, id: string): string {
  const hit = stdout.split(/\n/).find((l) => l.includes(` ${id}  `));
  return hit ?? `<no ${id} line>`;
}

const ONE_REQ = "## REQ-001 t\n\n- **status**: proposed\n\n## 未决问题\n\n无\n";
const CONFIRMED_REQ = "## REQ-001 t\n\n- **status**: confirmed\n\n## 未决问题\n\n无\n";
const GOOD_HUNT = "# 缺口猎取\n\n- **hunter**: fresh context, did not interview\n\n## 发现\n\n无\n";

// --- Deviation 1: research ran before any requirement existed -----------------

test("R6 G-req: RES records with no requirements at all is order inversion", () => {
  const dir = fixture("order1");
  res(dir, "RES-001", "oss: []\noss_none: none\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^FAIL/, out);
  assert.match(line(out, "G-req"), /1 RES record\(s\) but no current requirements/);
});

test("R6 G-req: RES records with an empty requirements file is order inversion", () => {
  const dir = fixture("order2");
  res(dir, "RES-001", "oss: []\noss_none: none\n");
  res(dir, "RES-002", "oss: []\noss_none: none\n");
  reqs(dir, "v1.md", "# 需求 v1\n\n## 未决问题\n\n无\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^FAIL/, out);
  assert.match(line(out, "G-req"), /2 RES record\(s\) but 0 REQ entries in v1\.md/);
});

test("R6 G-req: requirements before research is the passing order", () => {
  const dir = fixture("order3");
  res(dir, "RES-001", "oss: []\noss_none: none\n");
  reqs(dir, "v1.md", ONE_REQ);
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "G-req"), /RES record/, out);
});

// --- Deviation 2: C-06 gap hunt promised in chat, never performed -------------

test("R6 G-req: a confirmed baseline with no gap-hunt record fails", () => {
  const dir = fixture("hunt1");
  reqs(dir, "v1.md", CONFIRMED_REQ);
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^FAIL/, out);
  assert.match(line(out, "G-req"), /no gap-hunt record \(C-06\)/);
});

test("R6 G-req: an unattributed hunt warns — it does not kill a real hunt", () => {
  const dir = fixture("hunt2");
  reqs(dir, "v1.md", CONFIRMED_REQ);
  writeFileSync(
    join(dir, "keel", "requirements", "gap-hunt-v1.md"),
    "# 缺口猎取\n\n- 缺口一 → 已改 REQ-001\n- 缺口二 → 待用户\n- 缺口三 → 判定可接受\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "G-req"), /lists no findings/, out);
  assert.match(line(out, "G-req"), /does not say who hunted/, out);
});

test("R6 G-req: a gap-hunt record listing nothing is a thin hunt and fails", () => {
  const dir = fixture("hunt3");
  reqs(dir, "v1.md", CONFIRMED_REQ);
  writeFileSync(
    join(dir, "keel", "requirements", "gap-hunt-v1.md"),
    "# 缺口猎取\n\n- **hunter**: fresh context\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^FAIL/, out);
  assert.match(line(out, "G-req"), /lists no findings/);
});

// The regression that matters most: the best real gap hunt this rule has seen
// used a different filename, no hunter field, and a table instead of a heading.
// A guard that punishes the practice it exists to require is a broken guard.
test("R6 G-req: the field artifact shape (vN-gaps.md, table, prose attribution) passes", () => {
  const dir = fixture("hunt7");
  reqs(dir, "v1.md", CONFIRMED_REQ);
  writeFileSync(
    join(dir, "keel", "requirements", "v1-gaps.md"),
    "# 需求 v1 缺口猎取结果（C-06）\n\n" +
      "由一个未见过访谈对话的子代理只读审查 v1.md 后产出；按严重度排序。\n\n" +
      "| # | 级 | 缺口 | 处理 |\n|---|---|---|---|\n" +
      "| 1 | 高 | 关键动作清单不存在 | 待用户 Q2-1 → DEC |\n" +
      "| 2 | 高 | 引文锚点无共享模型 | 已新增 REQ-026 |\n" +
      "| 3 | 中 | 配额遗忘未定义 | 已改 REQ-051 |\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^PASS/, out);
});

test("R6 G-req: a complete gap-hunt for the current version clears the check", () => {
  const dir = fixture("hunt4");
  reqs(dir, "v1.md", CONFIRMED_REQ);
  writeFileSync(join(dir, "keel", "requirements", "gap-hunt-v1.md"), GOOD_HUNT, "utf8");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-req"), /^PASS/, out);
});

test("R6 G-req: a hunt for an older version never silently passes", () => {
  const dir = fixture("hunt5");
  reqs(dir, "v2.md", CONFIRMED_REQ);
  writeFileSync(join(dir, "keel", "requirements", "gap-hunt-v1.md"), GOOD_HUNT, "utf8");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  // Raised as WARN so a version bump does not force a re-hunt outright — but an
  // unacknowledged warn is escalated to FAIL by C-103/ISS-005, so the only quiet
  // way past it is a worklog line citing an open ISS. Either way: not a PASS.
  assert.match(line(out, "G-req"), /^(WARN|FAIL)/, out);
  assert.match(line(out, "G-req"), /none names v2/);
});

test("R6 G-req: proposed-only requirements need no hunt yet", () => {
  const dir = fixture("hunt6");
  reqs(dir, "v1.md", ONE_REQ);
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "G-req"), /gap-hunt/, out);
});

// --- Deviation 3: research picked a dependency, OSS ledger never heard of it --

test("R6 X-oss: a RES that takes no OSS stance fails even with no package.json", () => {
  const dir = fixture("oss1");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: []\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "X-oss"), /^FAIL/, out);
  assert.match(line(out, "X-oss"), /take no OSS stance: RES-001/);
});

test("R6 X-oss: an empty oss_none value is still silence", () => {
  const dir = fixture("oss2");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: []\noss_none:\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "X-oss"), /^FAIL/, out);
});

test("R6 X-oss: an explicit oss_none reason is a valid stance", () => {
  const dir = fixture("oss3");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: []\noss_none: evaluated no-mistakes, not adopted; revisit if the flag flips\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "X-oss"), /^FAIL/, out);
});

test("R6 X-oss: naming an unregistered OSS id fails as dangling", () => {
  const dir = fixture("oss4");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: [OSS-007]\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "X-oss"), /^FAIL/, out);
  assert.match(line(out, "X-oss"), /RES-001 references OSS-007 with no OSS record/);
});

test("R6 X-oss: a registered OSS id resolves", () => {
  const dir = fixture("oss5");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: [OSS-007]\n");
  writeFileSync(
    join(dir, "keel", "oss", "OSS-007-thing.md"),
    "---\nid: OSS-007\nproject: thing\nversion: 1.0.0\nstatus: active\nnext_review: none\n---\n\n# OSS-007\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "X-oss"), /^FAIL/, out);
});

// --- Deviation 4: interview questions written as assertions -------------------
// No machine judge exists (the interview never lands on disk), so the rule lives
// in skill text. This guard stops the rule from being quietly deleted.

test("R6 k-grill states the interrogative rule with a worked counterexample", () => {
  const t = readFileSync(join(repo, ".agents", "skills", "k-grill", "SKILL.md"), "utf8");
  assert.match(t, /interrogative sentence and ends with/, "the question-form rule must be stated");
  assert.match(t, /count the `\?`/, "the self-check must be stated");
  assert.match(t, /Defines every term the first time it appears/, "the term rule must be stated");
  assert.match(t, /Wrong —/, "a counterexample must be shown");
  assert.match(t, /Right —/, "a corrected example must be shown");
});

test("R6 k-grill states the order rule and the gap-hunt artifact", () => {
  const t = readFileSync(join(repo, ".agents", "skills", "k-grill", "SKILL.md"), "utf8");
  assert.match(t, /requirements before research/i);
  assert.match(t, /gap-hunt-vN\.md/);
  assert.match(t, /did not run this interview/);
});

// --- Round 2 (2026-08-26 user decisions): RES substance, candidate scan, hook -

import { inspectResSubstance } from "../tools/gate/rescheck.ts";
import { pendingCandidates, scanCandidates } from "../tools/gate/candidates.ts";
import { runStatus } from "../tools/gate/status.ts";
import { runApprove } from "../tools/gate/approve.ts";
import { rmSync } from "node:fs";

test("R6b G-research: a RES with no sections and no tier is a filename, not research", () => {
  const dir = fixture("res1");
  reqs(dir, "v1.md", ONE_REQ);
  res(dir, "RES-001", "oss: []\noss_none: none\n");
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-research"), /^FAIL/, out);
  assert.match(line(out, "G-research"), /RES substance gaps/);
});

test("R6b G-research: the real variant shape (level:, 检索范围与方法, 证据) passes", () => {
  // Mirrors RES-901 as it actually exists: level not depth, merged headings.
  const dir = fixture("res2");
  reqs(dir, "v1.md", ONE_REQ);
  writeFileSync(
    join(dir, "keel", "research", "RES-001-x.md"),
    "---\nid: RES-001\ntitle: t\nlevel: standard\ndate: 2026-08-26\noss: []\noss_none: none\n---\n\n" +
      "# RES-001\n\n## 调研问题\n\nq\n\n## 检索范围与方法\n\ns\n\n## 证据\n\nhttps://example.com (accessed 2026-08-26)\n\n## 结论（决定／理由／备选）\n\nc\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "G-research"), /^FAIL/, out);
});

test("R6b G-research: 标准 tier with zero citations fails", () => {
  const dir = fixture("res3");
  reqs(dir, "v1.md", ONE_REQ);
  writeFileSync(
    join(dir, "keel", "research", "RES-001-x.md"),
    "---\nid: RES-001\ntitle: t\ndepth: 标准\ndate: 2026-08-26\noss: []\noss_none: none\n---\n\n" +
      "# RES-001\n\n## 调研问题\n\nq\n\n## 检索范围\n\ns\n\n## 逐项证据\n\ne\n\n## 结论\n\nc\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out, "G-research"), /legacy citation manifest is missing/, out);
});

test("R6b G-research: 本地 tier needs no web citations", () => {
  const dir = fixture("res4");
  reqs(dir, "v1.md", ONE_REQ);
  writeFileSync(
    join(dir, "keel", "research", "RES-001-x.md"),
    "---\nid: RES-001\ntitle: t\ndepth: 本地\ndate: 2026-08-26\noss: []\noss_none: none\n---\n\n" +
      "# RES-001\n\n## 调研问题\n\nq\n\n## 检索范围\n\ns\n\n## 逐项证据\n\n$ node -v\n\n## 结论\n\nc\n",
    "utf8",
  );
  const out = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out, "G-research"), /^FAIL/, out);
});

test("R6b G-research: a bootstrap wrapper is judged by its source, not its body", () => {
  const dir = fixture("res5");
  reqs(dir, "v1.md", ONE_REQ);
  const wrapper =
    "---\nid: RES-001\ntitle: t\ndepth: 深度\ndate: 2026-08-26\nbootstrap: true\nsource_path: docs/research/R9.md\noss: []\noss_none: none\n---\n\n# wrapper\n";
  writeFileSync(
    join(dir, "keel", "research", "RES-001-x.md"),
    wrapper,
    "utf8",
  );
  const out1 = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.match(line(out1, "G-research"), /source_path missing on disk/, out1);
  mkdirSync(join(dir, "docs", "research"), { recursive: true });
  writeFileSync(join(dir, "docs", "research", "R9.md"), "# R9\n" + "内容行。\n".repeat(400), "utf8");
  mkdirSync(join(dir, "keel", "migrations"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "migrations", "res-citation-legacy.json"),
    JSON.stringify(
      {
        schema_version: 1,
        source_keel_version: "0.7.0",
        target_keel_version: "0.8.0",
        generated_at: "2026-08-28",
        entries: [
          {
            id: "RES-001",
            path: "keel/research/RES-001-x.md",
            sha256: sha256Normalized(wrapper),
          },
        ],
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  const out2 = runCheck(makeCtx(dir), ["--quick"]).stdout;
  assert.doesNotMatch(line(out2, "G-research"), /^FAIL/, out2);
});

function worklogFeature(dir: string, name: string, worklog: string, done: boolean): void {
  mkdirSync(join(dir, "keel", "features", name), { recursive: true });
  writeFileSync(join(dir, "keel", "features", name, "worklog.md"), worklog, "utf8");
  if (done) writeFileSync(join(dir, "keel", "features", name, "summary.md"), "# summary\n", "utf8");
}

test("R6b candidates: template placeholder lines are not captures", () => {
  const dir = fixture("cand1");
  worklogFeature(dir, "f01-x", "# worklog\n\n- `#经验候选` 类型 一句话\n", false);
  assert.equal(scanCandidates(makeCtx(dir)).length, 0);
});

test("R6b candidates: a live tag is pending until the line carries a → disposition", () => {
  const dir = fixture("cand2");
  worklogFeature(dir, "f01-x", "# worklog\n\n- #经验候选 类型=知识缺口 某个真实教训\n", false);
  const ctx = makeCtx(dir);
  assert.equal(pendingCandidates(ctx).length, 1);
  writeFileSync(
    join(dir, "keel", "features", "f01-x", "worklog.md"),
    "# worklog\n\n- #经验候选 类型=知识缺口 某个真实教训 → 弃 已由 DEC-nnn 吸收\n",
    "utf8",
  );
  assert.equal(pendingCandidates(ctx).length, 0);
});

test("R6b G-retro: undisposed tags in a summarized feature do not pass silently", () => {
  const dir = fixture("cand3");
  reqs(dir, "v1.md", ONE_REQ);
  writeFileSync(join(dir, "keel", "OVERVIEW.md"), "# overview\n", "utf8");
  worklogFeature(dir, "f01-x", "# worklog\n\n- #经验候选 类型=复盘 未处置的教训\n", true);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.match(line(out, "G-retro"), /^(WARN|FAIL)/, out);
  assert.match(line(out, "G-retro"), /经验候选 undisposed/);
});

test("R6b G-retro: tags in a feature still in flight are left alone", () => {
  const dir = fixture("cand4");
  reqs(dir, "v1.md", ONE_REQ);
  writeFileSync(join(dir, "keel", "OVERVIEW.md"), "# overview\n", "utf8");
  worklogFeature(dir, "f01-x", "# worklog\n\n- #经验候选 类型=复盘 进行中的功能\n", false);
  worklogFeature(dir, "f02-y", "# worklog\n", true);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.doesNotMatch(line(out, "G-retro"), /经验候选/, out);
});

test("R6b status: pending candidates are counted at session start", () => {
  const dir = fixture("cand5");
  worklogFeature(dir, "f01-x", "# worklog\n\n- #经验候选 类型=复盘 一条\n", false);
  const st = runStatus(makeCtx(dir));
  assert.match(st.stdout, /^lesson_candidates: 1$/m, st.stdout);
});

test("R6b pre-commit: framework-shaping paths trigger the full suite (DEC-162)", () => {
  const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
  assert.match(hook, /git diff --cached --name-only/);
  assert.match(hook, /keel\/config\\.json/);
  assert.match(hook, /tools\/gate\//);
  assert.match(hook, /agents\/skills\//);
  assert.match(hook, /node --test/);
});

test("R6b this repo: every RES passes the substance floor it imposes on others", () => {
  assert.deepEqual(inspectResSubstance(makeCtx(repo)), []);
});

test("R6b candidates: prose mentioning the bare backticked tag is not a capture", () => {
  const dir = fixture("cand6");
  worklogFeature(
    dir,
    "f01-x",
    "# worklog\n\n- 进度：`#经验候选` 首次有了读取端（candidates.ts）\n" +
      "- `#经验候选 defense failed` 反引号里带内容的仍是真实捕获\n",
    false,
  );
  const found = scanCandidates(makeCtx(dir));
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.match(found[0]?.text ?? "", /defense failed/);
});

// --- Round 3 (DEC-166): C-107 as recorded delegation, not an author string ----

import { spawnSync } from "node:child_process";
import { commitLooksAgentMade, detectHarness } from "../tools/gate/harness.ts";
import { precommitAprGaps } from "../tools/gate/hook.ts";

test("R6c harness: claude-code env is detected, bare env is not", () => {
  assert.deepEqual(detectHarness({ CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "s-123" }), {
    agent: "claude-code",
    session: "s-123",
  });
  assert.equal(detectHarness({ PATH: "/usr/bin" }), null);
  assert.equal(detectHarness({ KEEL_AGENT: "grok-build" })?.agent, "grok-build");
});

test("R6c harness: the zhaoxi trailer shape reads as agent-made", () => {
  // Exactly what APR-001's commit carried: keel said unknown, the harness told the truth.
  const zhaoxi =
    "keel: requirements v1 baseline (APR-001)\n\nKeel-Precommit: ok\nDeveloper: kopitau\nAgent: unknown\nSession: unknown\nClaude-Session: https://claude.ai/code/session_x\n";
  assert.equal(commitLooksAgentMade(zhaoxi), true);
  assert.equal(commitLooksAgentMade("fix: typo\n\nDeveloper: kopit\nAgent: unknown\n"), false);
  assert.equal(commitLooksAgentMade("msg\n\nAgent: claude-code\n"), true);
});

/**
 * Env for git inside fixtures. When these tests run from a git hook, git has
 * exported GIT_DIR / GIT_INDEX_FILE pointing at the REAL repo — a fixture
 * `git commit` then lands on the real HEAD (it did, 2026-08-26, two rogue
 * commits) — and GIT_AUTHOR_* / GIT_COMMITTER_* naming the real committer
 * (ISS-045). Fixture git must never inherit any of them.
 */
function cleanGitEnv(): { [k: string]: string | undefined } {
  return scrubHookGitEnv(process.env);
}

function fixtureGit(dir: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: cleanGitEnv() });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
}

function gitRepo(tag: string): string {
  const dir = fixture(tag);
  fixtureGit(dir, ["init", "-q"]);
  fixtureGit(dir, ["config", "user.name", "kopit"]);
  fixtureGit(dir, ["config", "user.email", "wwillmee@gmail.com"]);
  return dir;
}

function aprFile(dir: string, delegated: string): void {
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001-x.md"),
    `---\nid: APR-001\nstatus: approved\napprover: "kopit"\ndelegated: ${delegated}\n---\n\n# APR-001\n`,
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      identities: {
        humans: [{ name: "kopit", email: "wwillmee@gmail.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
}

test("R6c pre-commit-apr: agent env + no delegation record blocks the commit", () => {
  const dir = gitRepo("apr1");
  aprFile(dir, '""');
  fixtureGit(dir, ["add", "-A"]);
  const gaps = precommitAprGaps(makeCtx(dir), { CLAUDECODE: "1" });
  assert.equal(gaps.length, 1, JSON.stringify(gaps));
  assert.match(gaps[0] ?? "", /records no delegation/);
});

test("R6c pre-commit-apr: a recorded delegation clears the agent path", () => {
  const dir = gitRepo("apr2");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  fixtureGit(dir, ["add", "-A"]);
  assert.deepEqual(precommitAprGaps(makeCtx(dir), { CLAUDECODE: "1" }), []);
});

test("R6c pre-commit-apr: a human outside any harness needs nothing", () => {
  const dir = gitRepo("apr3");
  aprFile(dir, '""');
  fixtureGit(dir, ["add", "-A"]);
  assert.deepEqual(precommitAprGaps(makeCtx(dir), { PATH: "/usr/bin" }), []);
});

test("R6c pre-commit-apr: an agent git identity is refused regardless of delegation", () => {
  const dir = gitRepo("apr4");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["config", "user.name", "keel-agent"]);
  g(["config", "user.email", "agent@keel.local"]);
  g(["add", "-A"]);
  const gaps = precommitAprGaps(makeCtx(dir), {});
  assert.equal(gaps.length, 1, JSON.stringify(gaps));
  assert.match(gaps[0] ?? "", /agent git identity/);
});

test("R6c X-apr: an agent-trailer APR commit without delegation fails post-hoc", () => {
  const dir = gitRepo("apr5");
  aprFile(dir, '""');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "apr\n\nAgent: claude-code\nSession: s-1"]);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.match(line(out, "X-apr"), /^FAIL/, out);
  assert.match(line(out, "X-apr"), /records no delegation/);
});

test("R6c X-apr: the same commit with a recorded delegation passes", () => {
  const dir = gitRepo("apr6");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "apr\n\nAgent: claude-code\nSession: s-1"]);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.doesNotMatch(line(out, "X-apr"), /^FAIL/, out);
});

test("R6c pre-commit hook wires the approvals guard (DEC-166)", () => {
  const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
  assert.match(hook, /keel\/approvals\//);
  assert.match(hook, /pre-commit-apr/);
});

test("R6c approve resolves the scaffold's APR-nnn-<slug>.md naming", () => {
  // gate new apr writes slugged names; approve only matched the bare name and
  // refused its own scaffold's output (first live approval, 2026-08-26).
  const dir = gitRepo("apr7");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const renamed = join(dir, "keel", "approvals", "APR-001-some-slug.md");
  writeFileSync(
    renamed,
    readFileSync(join(dir, "keel", "approvals", "APR-001-x.md"), "utf8").replace(
      "status: approved",
      "status: draft",
    ) + "\n- path: keel/config.json\n  content_sha256: pending\n",
    "utf8",
  );
  rmSync(join(dir, "keel", "approvals", "APR-001-x.md"));
  const r = runApprove(makeCtx(dir, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(readFileSync(renamed, "utf8"), /status: approved/);
});
