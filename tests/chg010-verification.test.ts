import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runTrace } from "../tools/gate/trace.ts";

function fixture(
  tag: string,
  acceptanceCount: number,
  verification: string,
  options: { summary?: boolean; testName?: string } = {},
): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg010-verification-${tag}-`));
  for (const dir of [
    "requirements",
    "plan",
    "features/f06-evidence/plan",
    "issues",
    "decisions",
  ]) {
    mkdirSync(join(root, "keel", dir), { recursive: true });
  }
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", enforcement_tier: "local" }),
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "INDEX.md"),
    "# requirements index\n\n- current: v1.md\n",
    "utf8",
  );
  const acceptance = Array.from(
    { length: acceptanceCount },
    (_, index) => `  - Given input ${index + 1} When checked Then result ${index + 1}\n`,
  ).join("");
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    "# 需求书 v1\n\n" +
      "- status: confirmed\n\n" +
      "## 未决问题\n\n无\n\n" +
      "## 验证方式\n\n每条验收标准按顺序声明验证方式。\n\n" +
      "## REQ-006 测试与完成证据\n\n" +
      "- **status**: confirmed\n" +
      "- **acceptance**:\n" +
      acceptance +
      `- **verification**: ${verification}\n`,
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "gap-hunt-v1.md"),
    "# 缺口猎取\n\n- **hunter**: fresh context, did not interview\n\n## 发现\n\n无\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "plan", "overview-v1.md"),
    "# plan\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n|---|---|\n| I-01 | F1 → F6 |\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "features", "f06-evidence", "plan", "v1.md"),
    "---\nfeature: F6\nreq: [REQ-006]\nblocked_by: []\n---\n# F6\n",
    "utf8",
  );
  if (options.summary !== false) {
    writeFileSync(
      join(root, "keel", "features", "f06-evidence", "summary.md"),
      "# F6 summary\n",
      "utf8",
    );
  }
  if (options.testName) {
    mkdirSync(join(root, "tests"), { recursive: true });
    writeFileSync(
      join(root, "tests", "acceptance.test.ts"),
      `import { test } from "node:test";\ntest(${JSON.stringify(options.testName)}, () => {});\n`,
      "utf8",
    );
  }
  return root;
}

function gReqLine(root: string): string {
  const stdout = runCheck(makeCtx(root), ["--quick"]).stdout;
  return stdout.split(/\n/).find((line) => line.includes(" G-req  ")) ?? `<missing G-req>\n${stdout}`;
}

function inFixture(
  tag: string,
  acceptanceCount: number,
  verification: string,
  check: (line: string) => void,
): void {
  const root = fixture(tag, acceptanceCount, verification);
  try {
    check(gReqLine(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("REQ-006/AC-2 G-req rejects fewer verification entries than acceptance criteria", () => {
  inFixture("short", 2, "[auto]", (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /REQ-006.*acceptance 2.*verification 1/);
  });
});

test("REQ-006/AC-2 G-req rejects extra verification entries", () => {
  inFixture("long", 1, "[auto, manual]", (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /REQ-006.*acceptance 1.*verification 2/);
  });
});

test("REQ-006/AC-7 G-req rejects a verification type outside the three-value enum", () => {
  inFixture("invalid", 1, "[automated]", (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /REQ-006.*invalid verification type.*automated/);
  });
});

test("REQ-006/AC-7 G-req accepts an equal array containing all three verification types", () => {
  inFixture("valid", 3, "[auto, machine-doc, manual]", (line) => {
    assert.match(line, /^PASS G-req/);
  });
});

test("REQ-006/AC-2 gate trace shows verification per AC and whether the REQ is in claimed scope", () => {
  const claimed = fixture("trace-claimed", 3, "[auto, machine-doc, manual]");
  const unclaimed = fixture("trace-unclaimed", 1, "[auto]", { summary: false });
  try {
    const claimedOut = runTrace(makeCtx(claimed)).stdout;
    assert.match(claimedOut, /\| REQ-006 \| claimed \| AC-1=auto<br>AC-2=machine-doc<br>AC-3=manual \|/);
    assert.match(claimedOut, /claimed: 1 \/ 1 REQ\(s\)/);

    const unclaimedOut = runTrace(makeCtx(unclaimed)).stdout;
    assert.match(unclaimedOut, /\| REQ-006 \| not claimed \| AC-1=auto \|/);
    assert.match(unclaimedOut, /claimed: 0 \/ 1 REQ\(s\)/);
    assert.match(gReqLine(unclaimed), /^PASS G-req/);
  } finally {
    rmSync(claimed, { recursive: true, force: true });
    rmSync(unclaimed, { recursive: true, force: true });
  }
});

test("REQ-006/AC-7 a claimed manual proxy is visible in trace and keeps X-trace at WARN, never PASS", () => {
  const root = fixture("trace-proxy", 1, "[manual]", {
    testName: "REQ-006/AC-1 [proxy:real environment evidence missing] stand-in",
  });
  try {
    const trace = runTrace(makeCtx(root)).stdout;
    assert.match(trace, /\| REQ-006 \| claimed \| AC-1=manual \|.*AC-1 \[real environment evidence missing\] \|/);
    const xTrace = runCheck(makeCtx(root), ["--quick"]).stdout
      .split(/\n/)
      .find((line) => line.includes(" X-trace  ")) ?? "<missing X-trace>";
    assert.match(xTrace, /^WARN X-trace/);
    assert.doesNotMatch(xTrace, /^PASS/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
