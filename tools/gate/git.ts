import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import type { Ctx } from "./ctx.ts";
import type { Identity } from "./ctx.ts";

export function git(
  ctx: Ctx,
  args: string[],
  extraEnv?: { [k: string]: string | undefined },
): { status: number; stdout: string; stderr: string } {
  const env = extraEnv ? { ...process.env, ...extraEnv } : process.env;
  const r = spawnSync("git", args, { encoding: "utf8", cwd: ctx.root, env });
  return {
    status: r.status ?? 1,
    stdout: (r.stdout ?? "").trim(),
    stderr: (r.stderr ?? "").trim(),
  };
}

export function gitIdentity(ctx: Ctx): Identity {
  if (ctx.identity) return ctx.identity;
  const name = git(ctx, ["config", "user.name"]).stdout || "unknown";
  const email = git(ctx, ["config", "user.email"]).stdout || "unknown";
  return { name, email };
}

export function gitBranch(ctx: Ctx): string {
  return git(ctx, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout;
}

export function gitHooksPath(ctx: Ctx): string {
  return git(ctx, ["config", "core.hooksPath"]).stdout;
}

export function gitHead(ctx: Ctx): string {
  return git(ctx, ["rev-parse", "HEAD"]).stdout;
}

export function gitDirty(ctx: Ctx): boolean {
  return git(ctx, ["status", "--porcelain"]).stdout !== "";
}

/** Tree hash of the would-be commit, excluding keel/evidence (C-33). */
export function gitWriteTree(ctx: Ctx): string {
  const gitDir = join(ctx.root, ".git");
  if (!existsSync(gitDir)) return "";
  const tmp = join(gitDir, `keel-wt-${process.pid}.idx`);
  const env = { GIT_INDEX_FILE: tmp };
  try {
    const headIdx = join(gitDir, "index");
    if (existsSync(headIdx)) copyFileSync(headIdx, tmp);
    git(ctx, ["add", "-A"], env);
    const ev = join("keel", "evidence");
    if (existsSync(join(ctx.root, ev))) {
      git(ctx, ["reset", "-q", "--", ev], env);
    }
    const r = git(ctx, ["write-tree"], env);
    return r.status === 0 ? r.stdout : "";
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}
