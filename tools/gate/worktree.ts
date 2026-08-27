import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { git, gitIdentity } from "./git.ts";
import { findFeatureDir, pad2 } from "./ids.ts";
import { overlapWith } from "./overlap.ts";
import { computeFrontier } from "./frontier.ts";
import { fail, ok, usage, type CmdResult } from "./result.ts";

function parseF(id: string): number | null {
  const m = /^F-?(\d+)$/i.exec(id.trim());
  if (!m) return null;
  return Number.parseInt(m[1] ?? "0", 10);
}

export function branchName(n: number, dirBase: string): string {
  const short = dirBase.replace(new RegExp(`^f0*${n}-`), "");
  return `keel/F-${n}-${short}`;
}

export function runWorktree(ctx: Ctx, args: string[]): CmdResult {
  const sub = (args[0] ?? "").toLowerCase();
  const fid = args[1] ?? "";
  if (sub !== "add" && sub !== "rm") {
    return usage("usage: gate worktree add|rm F24\n");
  }
  const n = parseF(fid);
  if (n === null) return usage("usage: gate worktree add|rm F24\n");
  const featureDir = findFeatureDir(ctx, `F${n}`);
  if (!featureDir) return fail(`feature dir not found for F${n}\n`);
  const base = basename(featureDir);
  const branch = branchName(n, base);
  const wt = join(ctx.root, ".keel-worktrees", `F-${pad2(n)}-${base.replace(/^f\d+-/, "")}`);
  if (sub === "rm") {
    const r = git(ctx, ["worktree", "remove", "--force", wt]);
    if (r.status !== 0 && existsSync(wt)) {
      return fail(`worktree rm failed: ${r.stderr || r.stdout}\n`);
    }
    return ok(`removed worktree ${wt}\n`);
  }
  const hits = overlapWith(ctx, featureDir);
  if (hits.length > 0) {
    return fail(
      `file overlap with claimed features; serialize or split the interface first (C-114):\n${hits.join("\n")}\n`,
    );
  }
  // DEC-169: a blocked feature may still be claimed — worktree is advice (DEC-155) — but say so.
  const blk = computeFrontier(ctx).blocked.find((b) => b.id === `F${n}`);
  const warnLine = blk
    ? `WARN F${n} is blocked by ${blk.by.join(", ")} (blocked_by in its plan, DEC-169); claiming anyway\n`
    : "";
  mkdirSync(join(ctx.root, ".keel-worktrees"), { recursive: true });
  const ident = gitIdentity(ctx);
  writeFileSync(
    join(featureDir, "claim.json"),
    JSON.stringify(
      { feature: `F${n}`, assignee: ident.name, email: ident.email, branch, worktree: wt },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  if (existsSync(wt)) return ok(`${warnLine}worktree already exists ${wt}\nbranch ${branch}\n`);
  const hasBranch = git(ctx, ["rev-parse", "--verify", branch]);
  const addArgs =
    hasBranch.status === 0
      ? ["worktree", "add", wt, branch]
      : ["worktree", "add", "-b", branch, wt];
  const r = git(ctx, addArgs);
  if (r.status !== 0) {
    return fail(`git worktree add failed: ${r.stderr || r.stdout}\n`);
  }
  return ok(`${warnLine}claimed F${n}\nbranch ${branch}\nworktree ${wt}\n`);
}
