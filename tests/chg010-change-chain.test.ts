import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";

type ChainOptions = {
  changeStatus: "proposed" | "approved";
  apr?: "missing" | "mismatch" | "matching";
};

function fixture(tag: string, options: ChainOptions): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg010-${tag}-`));
  for (const dir of ["requirements", "changes", "approvals"]) {
    mkdirSync(join(root, "keel", dir), { recursive: true });
  }
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", enforcement_tier: "local" }),
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "INDEX.md"),
    "# requirements index\n\n- current: v2.md\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    "# 需求书 v1\n\n- status: confirmed\n- source: docs/features.md\n- replaces: null\n- change: null\n\n## 未决问题\n\n无\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "v2.md"),
    "# 需求书 v2\n\n" +
      "- status: confirmed\n" +
      "- source: docs/features.md + CHG-010\n" +
      "- replaces: v1.md\n" +
      "- change: CHG-010\n\n" +
      "## 未决问题\n\n无\n\n" +
      "## REQ-011 需求变更管理\n\n" +
      "- **status**: confirmed\n" +
      "- **source**: CHG-010\n" +
      "- **acceptance**:\n" +
      "  - Given confirmed REQ 声称来自某 CHG When G-req 检查 Then CHG approved 且可追到 APR\n" +
      "- **verification**: [auto]\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "gap-hunt-v2.md"),
    "# 缺口猎取\n\n- **hunter**: fresh context, did not interview\n\n## 发现\n\n无\n",
    "utf8",
  );

  const changePath = join(root, "keel", "changes", "CHG-010-demo.md");
  writeFileSync(
    changePath,
    `---\nid: CHG-010\nstatus: ${options.changeStatus}\ndate: 2026-08-28\n---\n\n# CHG-010 demo\n`,
    "utf8",
  );

  if (options.apr && options.apr !== "missing") {
    const digest =
      options.apr === "matching"
        ? sha256Normalized(readFileSync(changePath))
        : "0".repeat(64);
    writeFileSync(
      join(root, "keel", "approvals", "APR-001-demo.md"),
      "---\n" +
        "id: APR-001\n" +
        "status: approved\n" +
        "date: 2026-08-28\n" +
        "artifacts:\n" +
        "  - path: keel/changes/CHG-010-demo.md\n" +
        "    version: v1\n" +
        `    content_sha256: ${digest}\n` +
        "---\n\n# APR-001\n",
      "utf8",
    );
  }
  return root;
}

function gReqLine(root: string): string {
  const out = runCheck(makeCtx(root), ["--quick"]).stdout;
  return out.split(/\n/).find((line) => line.includes(" G-req  ")) ?? `<missing G-req>\n${out}`;
}

function inFixture(tag: string, options: ChainOptions, check: (line: string) => void): void {
  const root = fixture(tag, options);
  try {
    check(gReqLine(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("REQ-011/AC-5 G-req rejects a confirmed baseline produced by a proposed CHG", () => {
  inFixture("proposed", { changeStatus: "proposed", apr: "missing" }, (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /CHG-010.*proposed/);
  });
});

test("REQ-011/AC-5 G-req rejects an approved CHG with no approved APR artifact", () => {
  inFixture("no-apr", { changeStatus: "approved", apr: "missing" }, (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /CHG-010.*approved APR/);
  });
});

test("REQ-011/AC-5 G-req rejects an approved APR whose CHG artifact hash is stale", () => {
  inFixture("bad-hash", { changeStatus: "approved", apr: "mismatch" }, (line) => {
    assert.match(line, /^FAIL G-req/);
    assert.match(line, /CHG-010.*hash mismatch/);
  });
});

test("REQ-011/AC-5 G-req accepts an approved CHG bound by a matching approved APR", () => {
  inFixture("complete", { changeStatus: "approved", apr: "matching" }, (line) => {
    assert.match(line, /^PASS G-req/);
  });
});
