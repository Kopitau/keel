import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { scanCandidates } from "../tools/gate/candidates.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");
const line = (stdout: string, id: string): string => stdout.split(/\n/).find((value) => value.includes(` ${id}  `)) ?? "";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-retro-"));
  for (const rel of ["keel/features/f01-x", "keel/issues", "keel/decisions", "keel/requirements", "keel/plan"]) mkdirSync(join(root, rel), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# summary\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# worklog\n\n- #经验候选 knowledge gap 一条未销项\n", "utf8");
  return root;
}

test("REQ-009/AC-1 feature summary template has all five fixed sections", () => {
  const template = read("keel/templates/summary.md");
  for (const heading of ["做了什么 / 为什么", "技术路线说明", "关键决策与被否方案", "测试与证据指针", "遗留债务与已知限制"]) assert.match(template, new RegExp(heading));
});

test("REQ-009/AC-2 retro updates OVERVIEW in place with project route capabilities in-flight risks and provisional count", () => {
  const skill = read(".agents/skills/k-retro/SKILL.md");
  assert.match(skill, /Update `keel\/OVERVIEW\.md` in place/i);
  for (const marker of ["what the project is", "route", "capability list", "in-flight work", "risks", "provisional count"]) assert.match(skill, new RegExp(marker, "i"));
});

test("REQ-009/AC-3 retro records disposition of provisional decisions issues and every friction candidate", () => {
  const skill = read(".agents/skills/k-retro/SKILL.md");
  assert.match(skill, /Provisional DECs/);
  assert.match(skill, /ISS: all closed or wontfix/);
  assert.match(skill, /→ LES-nnn.*→ KLES.*→ 弃/s);
});

test("REQ-009/AC-4 G-retro rejects missing overview open issue and an undisposed candidate", () => {
  const root = fixture();
  const ctx = makeCtx(root);
  assert.match(line(runCheck(ctx, []).stdout, "G-retro"), /^FAIL.*OVERVIEW\.md missing/);
  writeFileSync(join(root, "keel", "OVERVIEW.md"), "# overview\n", "utf8");
  writeFileSync(join(root, "keel", "issues", "ISS-001-x.md"), "---\nid: ISS-001\nstatus: open\n---\n", "utf8");
  assert.match(line(runCheck(ctx, []).stdout, "G-retro"), /^FAIL.*open issues/);
  writeFileSync(join(root, "keel", "issues", "ISS-001-x.md"), "---\nid: ISS-001\nstatus: closed\n---\n", "utf8");
  assert.match(line(runCheck(ctx, []).stdout, "G-retro"), /^FAIL.*经验候选 undisposed/);
});

test("REQ-009/AC-3 an unrelated arrow is not a disposition but LES KLES and 弃 with reason are", () => {
  const root = fixture();
  const path = join(root, "keel", "features", "f01-x", "worklog.md");
  writeFileSync(path, "# worklog\n\n- #经验候选 defense failed ISS-1→ISS-2 仍未处理\n", "utf8");
  assert.equal(scanCandidates(makeCtx(root))[0]?.disposed, false);
  for (const disposition of ["→ LES-001", "→ KLES", "→ 弃 已由 DEC-001 吸收"]) {
    writeFileSync(path, `# worklog\n\n- #经验候选 knowledge gap 示例 ${disposition}\n`, "utf8");
    assert.equal(scanCandidates(makeCtx(root))[0]?.disposed, true, disposition);
  }
});
