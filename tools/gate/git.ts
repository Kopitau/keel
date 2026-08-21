import { spawnSync } from "node:child_process";
import type { Ctx } from "./ctx.ts";
import type { Identity } from "./ctx.ts";

export function git(
  ctx: Ctx,
  args: string[],
): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("git", args, { encoding: "utf8", cwd: ctx.root });
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
