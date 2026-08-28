import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";

function fixture(tier: "local" | "github" | "gitee", codeowners?: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-owners-${tier}-`));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: tier,
      identities: {
        humans: [{ name: "Ada", email: "ada@example.test" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
  if (codeowners !== undefined) {
    mkdirSync(join(root, ".github"), { recursive: true });
    writeFileSync(join(root, ".github", "CODEOWNERS"), codeowners, "utf8");
  }
  return root;
}

function ownersLine(root: string): string {
  const output = runCheck(makeCtx(root), ["--quick"]).stdout;
  return output.split(/\r?\n/).find((line) => line.includes(" X-owners  ")) ?? output;
}

test("REQ-018/AC-5 local tier explicitly downgrades approval ownership to documentation-only", () => {
  const root = fixture("local");
  try {
    assert.match(ownersLine(root), /^SKIP X-owners.*documentation only/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-018/AC-5 GitHub and Gitee tiers require an active approvals rule with an owner on that same line", () => {
  for (const tier of ["github", "gitee"] as const) {
    const missing = fixture(tier);
    const commentOnly = fixture(tier, "# keel/approvals/ @Ada\nsrc/ @Ada\n");
    const split = fixture(tier, "keel/approvals/\nsrc/ @Ada\n");
    const valid = fixture(tier, "/keel/approvals/** @Ada\n");
    try {
      assert.match(ownersLine(missing), /^FAIL X-owners.*missing/i);
      assert.match(ownersLine(commentOnly), /^FAIL X-owners/);
      assert.match(ownersLine(split), /^FAIL X-owners/);
      assert.match(ownersLine(valid), /^PASS X-owners/);
    } finally {
      for (const root of [missing, commentOnly, split, valid]) rmSync(root, { recursive: true, force: true });
    }
  }
});

test("REQ-018/AC-5 placeholder and configured agent handles never count as a real approval owner", () => {
  const placeholder = fixture("github", "keel/approvals/ @YOUR-GITHUB-USERNAME\n");
  const agent = fixture("github", "keel/approvals/ @keel-agent\n");
  try {
    assert.match(ownersLine(placeholder), /^FAIL X-owners.*placeholder/i);
    assert.match(ownersLine(agent), /^FAIL X-owners.*agent/i);
  } finally {
    rmSync(placeholder, { recursive: true, force: true });
    rmSync(agent, { recursive: true, force: true });
  }
});
