import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runStatus } from "../tools/gate/status.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function text(rel: string): string {
  return readFileSync(join(repo, rel), "utf8");
}

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  assert.equal(r.status, 0, r.stderr || r.stdout || args.join(" "));
}

function decisionFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-decisions-"));
  for (const rel of ["keel/decisions", "keel/requirements", "keel/plan", "keel/features"]) {
    mkdirSync(join(root, rel), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "keel", "decisions", "DEC-001-x.md"), "---\nid: DEC-001\nstatus: confirmed\n---\n\n# DEC-001\n", "utf8");
  git(root, ["init"]);
  git(root, ["config", "user.name", "fixture"]);
  git(root, ["config", "user.email", "fixture@example.com"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", "confirmed decision"]);
  return root;
}

function checkLine(stdout: string, id: string): string {
  return stdout.split(/\n/).find((line) => line.includes(` ${id}  `)) ?? "";
}

test("REQ-001/AC-1 interview batches numbered recommended questions, defers dependencies, and allows one-at-a-time", () => {
  const skill = text(".agents/skills/k-grill/SKILL.md");
  assert.match(skill, /batch every currently askable question/i);
  assert.match(skill, /numbered, each with a recommended answer/i);
  assert.match(skill, /Dependent questions wait/i);
  assert.match(skill, /one-at-a-time/i);
});

test("REQ-001/AC-2 facts from code docs and network are looked up instead of asked", () => {
  const skill = text(".agents/skills/k-grill/SKILL.md");
  assert.match(skill, /Code, docs, network.*look it up/i);
  assert.match(skill, /Do not ask/i);
});

test("REQ-001/AC-3 requirement entry carries every machine field including verification", () => {
  const template = text("keel/templates/requirements-entry.md");
  for (const marker of ["REQ-000", "status", "source", "description", "acceptance", "verification", "bounds_and_counterexamples", "non_goals"]) {
    assert.match(template, new RegExp(marker));
  }
});

test("REQ-001/AC-4 acceptance contract names GWT as primary and checklist for simple criteria", () => {
  assert.match(text("keel/templates/requirements-entry.md"), /GWT.*checklist/i);
  assert.match(text(".agents/skills/k-grill/SKILL.md"), /GWT primary; short checklists allowed/i);
});

test("REQ-001/AC-5 fuzzy requirements carry NEEDS-CLARIFICATION and unresolved forks enter 未决问题", () => {
  const skill = text(".agents/skills/k-grill/SKILL.md");
  assert.match(skill, /\[NEEDS-CLARIFICATION: concrete question\]/);
  assert.match(skill, /未决问题/);
});

test("REQ-001/AC-6 fresh-context gap hunt records scope method findings disposition before one baseline nod", () => {
  const template = text("keel/templates/GAPHUNT.md");
  for (const marker of ["hunter", "date", "scope", "method", "## 发现", "## 去向"]) assert.match(template, new RegExp(marker));
  assert.match(text(".agents/skills/k-grill/SKILL.md"), /different.*fresh-context agent/i);
  assert.match(text(".agents/skills/k-grill/SKILL.md"), /One nod on the whole requirements file/i);
});

test("REQ-003/AC-1 one DEC file has machine header and plain-language decision sections", () => {
  const template = text("keel/templates/DEC.md");
  for (const marker of ["id:", "title:", "status:", "date:", "features:", "research:", "adr:", "## 问题", "## 选项对比", "## 推荐理由", "## 用户决定原话", "## 影响"]) {
    assert.match(template, new RegExp(marker));
  }
});

test("REQ-003/AC-2 gate rejects a confirmed decision rolled back to proposed", () => {
  const root = decisionFixture();
  writeFileSync(join(root, "keel", "decisions", "DEC-001-x.md"), "---\nid: DEC-001\nstatus: proposed\n---\n\n# DEC-001\n", "utf8");
  const line = checkLine(runCheck(makeCtx(root), ["--quick"]).stdout, "X-decisions");
  assert.match(line, /^FAIL/);
  assert.match(line, /confirmed.*proposed/i);
});

test("REQ-003/AC-3 [proxy:same-round user decision transcript evidence not recorded] contract binds id date verbatim words and worklog pointer", () => {
  const skill = text(".agents/skills/k-decide/SKILL.md");
  assert.match(skill, /same round/i);
  assert.match(skill, /verbatim/i);
  assert.match(skill, /worklog/i);
  assert.match(skill, /date/i);
});

test("REQ-003/AC-4 ADR is a DEC flag with three thresholds consequences and review terms, not a second directory", () => {
  const skill = text(".agents/skills/k-decide/SKILL.md");
  assert.match(skill, /hard to reverse.*surprising without context.*real trade-off/is);
  assert.match(skill, /consequences \+ review terms/i);
  assert.match(skill, /No second ADR directory/i);
});

test("REQ-003/AC-5 reversible implementation decisions stay in worklog and confirmed boundaries escalate", () => {
  const skill = text(".agents/skills/k-decide/SKILL.md");
  assert.match(skill, /Low-level reversible implementation choices: worklog/i);
  assert.match(skill, /confirmed boundary: stop/i);
});

test("REQ-003/AC-6 status reports provisional decision count for session start and retro", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-provisional-"));
  mkdirSync(join(root, "keel", "decisions"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "keel", "decisions", "DEC-001-x.md"), "---\nid: DEC-001\nstatus: provisional\n---\n", "utf8");
  assert.match(runStatus(makeCtx(root)).stdout, /^provisional_decisions: 1$/m);
});
