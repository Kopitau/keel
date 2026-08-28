import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { emptyLoop, packBodyHash, runLoop, writeLoopState } from "../tools/gate/reviewloop.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function fixture(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg010-issues-${tag}-`));
  for (const dir of ["issues", "features/f10-issues", "review"]) {
    mkdirSync(join(root, "keel", dir), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  return root;
}

function issue(options: {
  id: string;
  status?: "open" | "closed" | "wontfix";
  pointer?: string;
  feature?: string;
  fingerprint?: string;
  recurrenceOf?: string;
  priorFailure?: string;
  escalation?: string;
  repro?: string;
  root?: string;
  fix?: string;
  why?: string;
  closure?: string;
}): string {
  const o = {
    status: "open",
    pointer: "",
    feature: "f10-issues",
    fingerprint: `fp-${options.id}`,
    recurrenceOf: "",
    priorFailure: "",
    escalation: "",
    repro: "node -e \"process.exit(0)\"",
    root: "",
    fix: "",
    why: "",
    closure: "",
    ...options,
  };
  return (
    `---\nid: ${o.id}\nschema: iss-v2\nstatus: ${o.status}\n` +
    `defense_kind: \"\"\ndefense_pointer: \"${o.pointer}\"\n` +
    `feature: ${o.feature}\nfingerprint: \"${o.fingerprint}\"\nsource: manual\n` +
    `recurrence_of: \"${o.recurrenceOf}\"\n` +
    `prior_defense_failure: \"${o.priorFailure}\"\n` +
    `defense_escalation: \"${o.escalation}\"\n---\n\n` +
    `# ${o.id} fixture\n\n## 现象\n\n可观察故障。\n\n## 影响\n\n阻断正确交付。\n\n` +
    `复现命令：\n\n\`\`\`\n${o.repro}\n\`\`\`\n\n## 待诊断防线\n\n待诊断，不猜根因。\n\n` +
    `## 根因\n\n${o.root}\n\n## 修复\n\n${o.fix}\n\n## 为何未被更早发现\n\n${o.why}\n\n` +
    `## 闭环选择与理由\n\n${o.closure}\n`
  );
}

function writeIssue(root: string, id: string, text: string): void {
  writeFileSync(join(root, "keel", "issues", `${id}.md`), text, "utf8");
}

function checkLine(root: string): string {
  return runCheck(makeCtx(root), ["--quick"]).stdout
    .split("\n")
    .find((line) => line.includes("G-issues")) ?? "";
}

function assertCheck(root: string, expected: RegExp): void {
  const line = checkLine(root);
  assert.match(line, expected, line);
}

test("REQ-010/AC-1 machine-doc keeps trivial friction in one worklog line and names every ISS promotion trigger", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-log", "SKILL.md"), "utf8");
  assert.match(skill, /Trivial: one worklog line/);
  for (const trigger of ["changes behavior", "fails a gate", "needs investigation", "may recur", "caused rework", "came from review"]) {
    assert.match(skill, new RegExp(trigger));
  }
});

test("REQ-010/AC-3 machine-doc allows unknown diagnosis while open but requires every closure field before closed", () => {
  const root = fixture("state");
  try {
    writeIssue(root, "ISS-001", issue({ id: "ISS-001" }));
    assertCheck(root, /^PASS\s+G-issues/);

    writeIssue(root, "ISS-001", issue({ id: "ISS-001", status: "closed" }));
    const bad = checkLine(root);
    for (const field of ["根因", "修复", "为何未被更早发现", "闭环选择与理由", "defense_pointer"]) {
      assert.match(bad, new RegExp(field), bad);
    }

    mkdirSync(join(root, "tests"), { recursive: true });
    writeFileSync(join(root, "tests", "iss-001.test.ts"), "// defense\n", "utf8");
    writeIssue(root, "ISS-001", issue({
      id: "ISS-001",
      status: "closed",
      pointer: "tests/iss-001.test.ts",
      root: "解析器漏检状态。",
      fix: "补状态读取端。",
      why: "旧测试只检查模板字段。",
      closure: "选择门禁与回归测试，因为可自动阻断。",
    }));
    assertCheck(root, /^PASS\s+G-issues/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-4 no runnable repro is rejected and the same unresolved attack probe fuses on the third clear", () => {
  const root = fixture("repro-fuse");
  try {
    writeIssue(root, "ISS-001", issue({ id: "ISS-001", repro: "" }));
    assertCheck(root, /^FAIL\s+G-issues.*复现命令/);

    writeIssue(root, "ISS-001", issue({ id: "ISS-001" }));
    const pack = packBodyHash({ diff: "d", plan: "p", reqs: "r", evidence: "e", worklog_summary: "w" });
    writeFileSync(join(root, "keel", "review", "pack.json"), pack.body, "utf8");
    const state = emptyLoop("robustness", "codex", "claude-code");
    state.pack_hash = pack.hash;
    state.blocking_iss = ["ISS-001"];
    state.iss_fp = { "ISS-001": "stable-fingerprint" };
    writeLoopState(makeCtx(root), state);

    assert.match(runLoop(makeCtx(root), ["clear", "--implementer", "codex", "--reviewer", "claude-code"]).stderr, /still_open/);
    assert.match(runLoop(makeCtx(root), ["clear", "--implementer", "codex", "--reviewer", "claude-code"]).stderr, /still_open/);
    assert.match(runLoop(makeCtx(root), ["clear", "--implementer", "codex", "--reviewer", "claude-code"]).stderr, /fused after 3 rounds/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-5 recurrence explains the failed defense, escalates it, and the third same-feature fingerprint creates an F13 candidate", () => {
  const root = fixture("recurrence");
  try {
    mkdirSync(join(root, "tests"), { recursive: true });
    writeFileSync(join(root, "tests", "recurrence.test.ts"), "// defense\n", "utf8");
    const closed = { status: "closed" as const, pointer: "tests/recurrence.test.ts", root: "r", fix: "f", why: "w", closure: "c" };
    writeIssue(root, "ISS-001", issue({ id: "ISS-001", fingerprint: "same-fp", ...closed }));
    writeIssue(root, "ISS-002", issue({ id: "ISS-002", fingerprint: "same-fp", ...closed }));
    assertCheck(root, /^FAIL\s+G-issues.*recurrence_of/);

    writeIssue(root, "ISS-002", issue({
      id: "ISS-002", fingerprint: "same-fp", recurrenceOf: "ISS-001",
      priorFailure: "回归测试只覆盖形状。", escalation: "升级为 gate 门禁。", ...closed,
    }));
    assertCheck(root, /^PASS\s+G-issues/);

    writeIssue(root, "ISS-003", issue({
      id: "ISS-003", fingerprint: "same-fp", recurrenceOf: "ISS-002",
      priorFailure: "门禁未覆盖范围。", escalation: "升级为 CI 权威检查。", ...closed,
    }));
    assertCheck(root, /^FAIL\s+G-issues.*#经验候选/);
    writeFileSync(
      join(root, "keel", "features", "f10-issues", "worklog.md"),
      "# worklog\n\n#经验候选 same fingerprint same-fp 第三次再现，交给 F13。\n",
      "utf8",
    );
    assertCheck(root, /^PASS\s+G-issues/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-6 every closed defense_pointer resolves to an existing repository file", () => {
  const root = fixture("pointer");
  try {
    const closed = { status: "closed" as const, root: "r", fix: "f", why: "w", closure: "c" };
    writeIssue(root, "ISS-001", issue({ id: "ISS-001", pointer: "tests/missing.test.ts", ...closed }));
    assertCheck(root, /^FAIL\s+G-issues.*tests\/missing\.test\.ts/);
    mkdirSync(join(root, "tests"), { recursive: true });
    writeFileSync(join(root, "tests", "guard.test.ts"), "// defense\n", "utf8");
    writeIssue(root, "ISS-001", issue({ id: "ISS-001", pointer: "tests/guard.test.ts", ...closed }));
    assertCheck(root, /^PASS\s+G-issues/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
