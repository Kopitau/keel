import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { inspectIssueProtocol } from "../tools/gate/issues.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");

function recurrenceFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-lessons-"));
  for (const rel of ["keel/issues", "keel/features/f01-x"]) mkdirSync(join(root, rel), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  for (let n = 1; n <= 3; n += 1) {
    const id = `ISS-${String(n).padStart(3, "0")}`;
    writeFileSync(
      join(root, "keel", "issues", `${id}-x.md`),
      `---\nid: ${id}\nschema: iss-v2\nstatus: open\nfeature: F1\nfingerprint: same-fp\nrecurrence_of: ${n > 1 ? "ISS-001" : ""}\nprior_defense_failure: ${n > 1 ? "old defense was too narrow" : ""}\ndefense_escalation: ${n > 1 ? "broader guard" : ""}\n---\n\n# ${id}\n\n## 现象\n\nx\n\n## 影响\n\ny\n\n复现命令：\n\`\`\`sh\nfalse\n\`\`\`\n\n## 待诊断防线\n\nz\n`,
      "utf8",
    );
  }
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# worklog\n", "utf8");
  return root;
}

test("REQ-013/AC-1 five signal types are one-line non-blocking worklog candidates", () => {
  const skill = read(".agents/skills/k-log/SKILL.md");
  for (const kind of ["user correction", "same fingerprint", "defense failed", "review pattern", "knowledge gap"]) assert.match(skill, new RegExp(kind));
  assert.match(skill, /Worklog line/);
  assert.match(skill, /Do not stop the current task/);
});

test("REQ-013/AC-2 third same-feature fingerprint is rejected until a candidate is appended", () => {
  const root = recurrenceFixture();
  const ctx = makeCtx(root);
  assert.match(inspectIssueProtocol(ctx).gaps.join("\n"), /third recurrence needs #经验候选/);
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# worklog\n\n- #经验候选 same fingerprint same-fp 第三次复发\n", "utf8");
  assert.doesNotMatch(inspectIssueProtocol(ctx).gaps.join("\n"), /third recurrence needs #经验候选/);
});

test("REQ-013/AC-3 LES template contains phenomenon lesson bounds counterexample and destination", () => {
  const template = read("keel/templates/LES.md");
  for (const heading of ["## 现象", "## 教训", "## 适用边界", "## 反例", "## 去向"]) assert.match(template, new RegExp(heading));
});

test("REQ-013/AC-4 planning and review gate output prompts relevant LES ids", () => {
  const out = runCheck(makeCtx(repo), ["--quick"]).stdout;
  const plan = out.split(/\n/).find((value) => value.includes(" G-plan  ")) ?? "";
  assert.match(plan, /relevant LES:/i);
  assert.match(plan, /LES-00[123]/);
});
