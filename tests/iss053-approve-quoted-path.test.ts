// ISS-053: `gate approve` resolved quoted artifact paths (path: "keel/x.md") for
// hashing but the replace regex only matched unquoted ones, so content_sha256
// stayed "pending" while the APR flipped to approved — an approval with no hash
// binding. zhaoxi hit it first (its ISS-002); keel's own APR-004 hit it today.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { runApprove } from "../tools/gate/approve.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function project(tag: string, artifactLine: string): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-iss053-${tag}-`));
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  mkdirSync(join(dir, "keel", "changes"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      identities: {
        humans: [{ name: "Ada", email: "ada@example.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
  writeFileSync(join(dir, "keel", "changes", "CHG-001-x.md"), "# CHG-001\n\n正文。\n", "utf8");
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001-x.md"),
    `---\nid: APR-001\nstatus: draft\ndate: 2026-08-29\napprover: ""\ndelegated: "「由你提交」(2026-08-29)"\nartifacts:\n${artifactLine}    version: "v1"\n    content_sha256: pending\n---\n\n# APR-001\n`,
    "utf8",
  );
  return dir;
}

test("ISS-053 approve fills content_sha256 when the artifact path is quoted", () => {
  const dir = project("quoted", '  - path: "keel/changes/CHG-001-x.md"\n');
  const r = runApprove(makeCtx(dir, { name: "Ada", email: "ada@example.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  const apr = readFileSync(join(dir, "keel", "approvals", "APR-001-x.md"), "utf8");
  const digest = sha256Normalized(readFileSync(join(dir, "keel", "changes", "CHG-001-x.md")));
  assert.match(apr, /status: approved/);
  assert.doesNotMatch(apr, /content_sha256: pending/, "an approval without a hash binding is not an approval");
  assert.ok(apr.includes(`content_sha256: ${digest}`), apr);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-053 approve still fills content_sha256 for an unquoted path (control)", () => {
  const dir = project("bare", "  - path: keel/changes/CHG-001-x.md\n");
  const r = runApprove(makeCtx(dir, { name: "Ada", email: "ada@example.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  const apr = readFileSync(join(dir, "keel", "approvals", "APR-001-x.md"), "utf8");
  assert.doesNotMatch(apr, /content_sha256: pending/);
  rmSync(dir, { recursive: true, force: true });
});
